
import RG from './rg';
import {Random} from './random';
import {Geometry} from './geometry';
import {Evaluator} from './evaluators';

import {Placer} from './placer';
import {FactoryItem} from './factory.items';
import {FactoryActor} from './factory.actors';
import * as Component from './component';
import {WorldShop} from './world';
import * as Item from './item';
import * as Element from './element';
import {ObjectShell} from './objectshellparser';
import {BaseActor, SentientActor} from './actor';
import {BrainGoalOriented} from './brain/brain.goaloriented';
import {ItemGen} from '../data/item-gen';
import {ActorGen} from '../data/actor-gen';
import {Names} from '../data/name-gen';
import {BBox} from './bbox';

const MIN_ACTORS_ROOM = 2;
const RNG = Random.getRNG();

import {TCoord, TShellFunc, IShell, ItemConf, ActorConf} from './interfaces';
type Level = import('./level').Level;
type House = import('./generator').House;

const popOptions = ['NOTHING', 'LOOT', 'GOLD', 'GUARDIAN', 'ELEMENT', 'CORPSE',
    'TIP'];

interface PopulConf {
    theme?: string;
    maxDanger?: number;
    maxValue?: number;
    actorFunc?: TShellFunc;
}

const probSpecialItem = 0.5;

export class DungeonPopulate {

    public actorFunc: TShellFunc;

    private theme: string;
    private maxDanger: number;
    private maxValue: number;

    private _itemFact: FactoryItem;
    private _actorFact: any;

    constructor(conf: PopulConf = {}) {
        this.theme = conf.theme ||  '';
        this.maxDanger = conf.maxDanger || 5;
        this.maxValue = conf.maxValue || 50;

        this._itemFact = new FactoryItem();
        this._actorFact = new FactoryActor();
        if (conf.actorFunc) {
            this.actorFunc = conf.actorFunc;
        }
        else {
            this.actorFunc = (actor) => !!actor && true;
        }
    }

    /* Populates the level with actors and items. Some potential features to use
    * here in extras:
    *   1. startPoint: No monsters spawn in vicinity
    *   2. terms: Good items, tough monsters
    *   3. bigRooms: spawn depending on theme
    *   4. Critical path: Gold coins?
    */
    public populateLevel(level: Level): void {
        const extras = level.getExtras();
        const maxDanger = this.maxDanger;
        const maxValue = this.maxValue;

        let mainLootAdded = false;
        const roomsDone: {[key: number]: boolean} = {}; // Keep track of finished rooms

        if (extras.bigRooms) {
            extras.bigRooms.forEach(bigRoom => {
                const {room, type} = bigRoom;
                const bbox: BBox = BBox.fromBBox(room.getBbox());
                const areaSize = room.getAreaSize();
                const actorConf: ActorConf = {
                    maxDanger,
                    actor: actor => actor.danger <= maxDanger + 2,
                    nActors: 0 // To be set later
                };

                let addOk = false;
                if (/cross/.test(type)) {
                    // Cross has lower density as its huge
                    actorConf.nActors = Math.floor(areaSize / 6);
                    addOk = this.addActorsToBbox(level, bbox, actorConf);
                }
                else {
                    actorConf.nActors = Math.floor(areaSize / 3);
                    addOk = this.addActorsToBbox(level, bbox, actorConf);
                }

                if (!addOk) {
                    const msg = 'Failed to add actors to bbox ';
                    RG.warn('DungeonPopulate', 'populateLevel',
                        msg + JSON.stringify(bbox));
                }

                // Add main loot
                if (!mainLootAdded) {
                    const center = room.getCenter();
                    mainLootAdded = this.addMainLoot(level, center, maxValue);
                }

                roomsDone[room.getID()] = true;
            });
        }

        // Add something nasty into terminal room
        // Some possible design patterns:
        //   1. Stairs + guardian
        //   2. Guardian + strong item
        //   3. Special feature
        //   4. Pack or group of actors
        if (extras.terms) {
            extras.terms.forEach(room => {
                // Don't populate stairs Up room
                if (!room.hasStairsUp()) {
                    const bbox = room.getBbox();

                    if (!mainLootAdded) {
                        const center = room.getCenter();
                        mainLootAdded = this.addMainLoot(level, center, maxValue);
                    }

                    // Add optional, less potent loot stuff
                    const areaSize = room.getAreaSize();
                    const nItems = Math.ceil(areaSize / 10);
                    const itemConf: ItemConf = {maxValue, itemsPerLevel: nItems,
                        item: item => item.value <= maxValue
                    };
                    this.addItemsToBbox(level, bbox, itemConf);

                    const coord = Geometry.getCoordBbox(bbox);
                    coord.forEach((xy: TCoord) => {
                        const enemy = new Element.ElementMarker('e');
                        enemy.setTag('enemy');
                        level.addElement(enemy, xy[0], xy[1]);
                    });
                }
                roomsDone[room.getID()] = true;
            });
        }

        // Process rest of the rooms
        if (extras.rooms) {
            extras.rooms.forEach(room => {
                const bbox = room.getBbox();
                const areaSize = room.getAreaSize();

                // Add actors into the room
                const actorConf: ActorConf = {
                    maxDanger,
                    actor: actor => actor.danger <= maxDanger,
                    nActors: Math.floor(areaSize / 6)
                };
                if (actorConf.nActors < MIN_ACTORS_ROOM) {
                    actorConf.nActors = MIN_ACTORS_ROOM;
                }
                this.addActorsToBbox(level, bbox, actorConf);

                // Add items into the room
                const nItems = Math.ceil(areaSize / 20);
                const itemConf: ItemConf = {maxValue, itemsPerLevel: nItems,
                    item: item => item.value <= maxValue
                };
                this.addItemsToBbox(level, bbox, itemConf);

                roomsDone[room.getID()] = true;
            });
        }

        // Add an endpoint guardian
        if (extras.endPoint) {
            this.addPointGuardian(level, extras.endPoint, maxDanger);
        }
    }

    public setActorFunc(func: TShellFunc): void {
        if (typeof func === 'function') {
            this.actorFunc = func;
        }
        else {
            RG.err('DungeonPopulate', 'setActorFunc',
                `Tried to set non-function ${func} as actorFunc`);
        }
    }

    public addPointGuardian(level: Level, point: TCoord, maxDanger: number): boolean {
        const eXY = point;
        if (RG.isNullOrUndef([maxDanger]) || maxDanger < 1) {
            RG.err('DungeonPopulate', 'addPointGuardian',
                `maxDanger must be > 0. Got: |${maxDanger}|`);
        }

        const guardian = this.getEndPointGuardian(maxDanger);
        if (guardian) {
            const brain = guardian.getBrain() as BrainGoalOriented;
            if (brain.getGoal) {
                const guardEval = new Evaluator.Guard(RG.BIAS.Guard, eXY);
                brain.getGoal().addEvaluator(guardEval);
            }
            return level.addActor(guardian, eXY[0], eXY[1]);
        }
        else {
            const msg = `Could not get guardian for endpoint: ${point}`;
            RG.warn('DungeonPopulate', 'addPointGuardian', msg);
        }
        return false;
    }

    public getEndPointGuardian(maxDanger: number): SentientActor {
        let currDanger = maxDanger;
        let guardian = null;

        // Constraint func with min/max danger limits
        let createActorFunc = minDanger => actor => (
            actor.danger <= maxDanger && actor.danger >= minDanger);
        if (this.actorFunc) {
            createActorFunc = minDanger => actor => (
                this.actorFunc(actor) && actor.danger <= currDanger
                && actor.danger >= minDanger
            );
        }

        // Try to create actor with highest danger possible (within maxDanger).
        // If not possible, gradually reduce the currDanger level, and always
        // create a new constraint function using createActorFunc
        while (!guardian && currDanger > 0) {
            // TODO add some theming for the guardian
            guardian = this._actorFact.createRandomActor({
                func: createActorFunc(currDanger)});
            --currDanger;
        }
        return guardian;
    }

    /* Adds a loot item to the given coord. This item will be higher in value
     * than the normal values of items in this level. Note that maxValue given
     * will be internally scaled in the function from the given number.
     */
    public addMainLoot(level: Level, center: TCoord, maxValue: number): boolean {
        const [cx, cy] = center;
        // Add main loot
        // 1. Scale is from 2-4 normal value, this scales the
        // guardian danger as well
        const scaleLoot = RNG.getUniformInt(2, 3);
        const maxPrizeValue = scaleLoot * maxValue;
        const minPrizeValue = (scaleLoot - 1) * maxValue;

        const lootFunc = item => (item.value >= minPrizeValue
            && item.value <= maxPrizeValue);

        let lootPrize = null;
        if (RG.isSuccess(probSpecialItem)) {
            const parser = ObjectShell.getParser();
            const shell = ItemGen.genRandShellWith(lootFunc);
            lootPrize = parser.createFromShell(RG.TYPE_ITEM, shell);
        }
        else {
            lootPrize = this._itemFact.createItem({func: lootFunc});
        }
        if (lootPrize) {
            level.addItem(lootPrize, cx, cy);
            return true;
        }
        return false;
    }

    /* Given level and x,y coordinate, tries to populate that point with content. */
    public populatePoint(level: Level, point: TCoord, conf): void {
        const {maxDanger} = conf;
        const type = RNG.arrayGetRand(popOptions);
        // const [pX, pY] = point;
        switch (type) {
            case 'NOTHING': break;
            case 'LOOT': this.addLootToPoint(level, point); break;
            case 'GUARDIAN':
                this.addPointGuardian(level, point, maxDanger);
                break;
            case 'ELEMENT': this.addElementToPoint(level, point, conf); break;
            case 'CORPSE': this.addCorpseToPoint(level, point, conf); break;
            case 'GOLD': this.addGoldToPoint(level, point); break;
            case 'TIP': this.addTipToPoint(level, point, conf); break;
            default: break;
        }
    }

    /* DungeonPopulate.prototype.addActorGroup = function(level, point, conf) {

    };*/

    /* Adds an element into the given point. */
    public addElementToPoint(level: Level, point: TCoord, conf) {
        if (conf.true) {
            // console.log('DungeonPopulate', level, conf, point); // TODO
        }
    }

    /* Creates a corpse to the given point, and adds some related loot there. */
    public addCorpseToPoint(level: Level, point: TCoord, conf) {
        if (conf.true) {
            // console.log('DungeonPopulate', level, conf, point); // TODO
        }
    }

    public addLootToPoint(level: Level, point: TCoord) {
        const maxValue = this.maxValue;
        const lootTypes = [RG.ITEM.POTION, RG.ITEM.SPIRITGEM, RG.ITEM.AMMUNITION,
            RG.ITEM.POTION, RG.ITEM.RUNE];
        const generatedType = RNG.arrayGetRand(lootTypes);

        const parser = ObjectShell.getParser();
        const lootPrize = parser.createRandomItem(
            {func: item => item.type >= generatedType
                && item.value <= maxValue}
        );
        if (lootPrize) {
            const [cx, cy] = point;
            level.addItem(lootPrize, cx, cy);
            return true;
        }
        return false;
    }

    public addGoldToPoint(level: Level, point: TCoord): boolean {
        const numCoins = this.maxValue;
        const gold = new Item.GoldCoin();
        gold.setCount(numCoins);
        const [cx, cy] = point;
        return level.addItem(gold, cx, cy);
    }

    /* Adds a tip/hint to the given point. These hints can reveal information
     * about world map etc. */
    public addTipToPoint(level, point, conf) {
        if (conf.true) {
            // console.log('DungeonPopulate', level, conf, point); // TODO
        }
    }

    /* Creates shops to the current level based on the config, and returns the
     * House objects for these shops. */
    public createShops(level: Level, conf): House[] {
        const extras = level.getExtras();
        const shopHouses: House[] = [];
        if (!extras.hasOwnProperty('houses')) {
            RG.err('DungeonPopulate', 'createShops', 'No houses in extras.');
            return shopHouses;
        }

        const houses = extras.houses!; // Has been checked already above

        const usedHouses: number[] = [];
        let watchDog = 0;
        extras.shops = [];
        for (let n = 0; n < conf.nShops; n++) {
            const shopObj = new WorldShop();

            // Find the next (unused) index for a house
            let index = RNG.randIndex(houses);
            while (usedHouses.indexOf(index) >= 0) {
                index = RNG.randIndex(houses);
                ++watchDog;
                if (watchDog === (2 * houses.length)) {
                    RG.err('DungeonPopulate', 'createShops',
                        'WatchDog reached max houses');
                }
            }
            usedHouses.push(index);

            const house = extras.houses![index]; // Index is keyof houses
            shopHouses.push(house);
            const floor = house.floor;
            const [doorX, doorY] = house.door;
            const doorCell = level.getMap().getCell(doorX, doorY);
            if (!doorCell.hasDoor()) {
                const door = new Element.ElementDoor(true);
                level.addElement(door, doorX, doorY);
            }

            const keeper = this.createShopkeeper(conf);
            const shopCoord = [];
            let keeperAdded = false;
            for (let i = 0; i < floor.length; i++) {
                const xy = floor[i];

                const shopElem = new Element.ElementShop();
                shopElem.setShopkeeper(keeper);
                level.addElement(shopElem, xy[0], xy[1]);

                if (i === 0) {
                    keeperAdded = true;
                    level.addActor(keeper, xy[0], xy[1]);
                }

                if (!conf.parser) {
                    conf.parser = ObjectShell.getParser();
                }
                const item = this._itemFact.getShopItem(n, conf);
                if (!item) {
                    const msg = 'item null. ' +
                        `conf: ${JSON.stringify(conf)}`;
                    RG.err('DungeonPopulate', 'createShop',
                        `${msg} shopFunc/type${n} not well defined.`);
                }
                else {
                    item.add(new Component.Unpaid());
                    level.addItem(item, xy[0], xy[1]);
                    shopCoord.push(xy);
                }
            }

            if (!keeperAdded) {
                const json = JSON.stringify(house);
                RG.err('DungeonPopulate', 'createShops',
                    'Could not add keeper to ' + json);
            }

            if (keeper.has('Shopkeeper')) {
                const shopKeep = keeper.get('Shopkeeper');
                shopKeep.setCells(shopCoord);
                shopKeep.setLevelID(level.getID());
                shopKeep.setDoorXY(doorCell.getXY());
                const name = keeper.getType() + ' shopkeeper';
                keeper.setName(name);
                RG.addCellStyle(RG.TYPE_ACTOR, name,
                    'cell-actor-shopkeeper');
                const randXY = RNG.arrayGetRand(shopCoord);
                if ((keeper.getBrain() as BrainGoalOriented).getGoal) {
                    const evalShop = new Evaluator.Shopkeeper(1.5);
                    evalShop.setArgs({xy: randXY});
                    (keeper.getBrain() as BrainGoalOriented).getGoal().addEvaluator(evalShop);
                }
            }

            this.addShopLoreItem(level, keeper);

            shopObj.setShopkeeper(keeper);
            shopObj.setLevel(level);
            shopObj.setCoord(shopCoord);
            extras.shops.push(shopObj);
        }
        return shopHouses;
    }

    /* Creates a shopkeeper actor. */
    public createShopkeeper(conf): SentientActor {
        let keeper = null;
        if (conf.parser) {
            if (conf.actor) {
                keeper = conf.parser.createRandomActor({
                    func: conf.actor});
                if (!keeper) {
                    let msg = 'conf.actor given but no actor found';
                    if (typeof conf.actor === 'function') {
                        msg += ' conf.actor |\n' + conf.actor.toString() + '|';
                    }
                    else {
                        msg += ' conf.actor must be function';
                    }
                    RG.err('Factory', 'createShopkeeper', msg);
                }
                const name = keeper.getType() + ' shopkeeper';
                keeper.setName(name);
                RG.addCellStyle(RG.TYPE_ACTOR, name, 'cell-actor-shopkeeper');
            }
            else {
                keeper = conf.parser.createActor('shopkeeper');
            }
        }
        else {
            keeper = this._actorFact.createActor('shopkeeper', {brain: 'Human'});
        }

        keeper.add(new Component.Shopkeeper());
        const gold = new Item.GoldCoin(RG.GOLD_COIN_NAME);
        gold.setCount(RNG.getUniformInt(50, 200));
        keeper.getInvEq().addItem(gold);

        const named = keeper.get('Named');
        named.setUniqueName(Names.getActorName());

        let keeperLevel = 10;
        if (conf.maxDanger >= 6) {
            keeperLevel = 2 * conf.maxDanger;
        }
        RG.levelUpActor(keeper, keeperLevel);
        return keeper;
    }

    public addShopLoreItem(level: Level, keeper: SentientActor): void {
        const nameComp = keeper.get('Named');
        const lore = level.get('Lore');
        const shopKeep = keeper.get('Shopkeeper');
        const msg = {
            name: nameComp.getFullName(),
            xy: shopKeep.getDoorXY()
        };
        lore.addTopic('shops', msg);
    }

    public createTrainers(level, conf) {
        const houses: House[] = level.getExtras().houses;
        if (RG.isSuccess(RG.TRAINER_PROB)) {
            let trainer = null;
            if (conf.parser) {
                trainer = conf.parser.createActor('trainer');
            }
            else {
                const trainerConf = {
                    maxDanger: 5,
                    actorFunc: actor => RG.ALL_RACES.indexOf(actor.type) >= 0
                };
                trainer = this.createActor(trainerConf);
            }
            const trainComp = new Component.Trainer();
            trainer.add(trainComp);
            const cell = level.getFreeRandCell();
            level.addActor(trainer, cell.getX(), cell.getY());
            if (houses) {
                const house = RNG.arrayGetRand(houses);
                if (trainer.getBrain().getGoal) {
                    const evalHome = new Evaluator.GoHome(1.5);
                    const xy = house.getCenter();
                    evalHome.setArgs({xy});
                    trainer.getBrain().getGoal().addEvaluator(evalHome);
                    return [house];
                }
            }
        }
        return [];
    }

    public populateHouse(level: Level, house: House, conf): void {
        const floorPerActor = 9;
        const numFloor = house.numFloor;
        let numActors = Math.round(numFloor / floorPerActor);
        if (numActors === 0) {numActors = 1;}

        for (let i = 0; i < numActors; i++) {
            const actor = this.createActor(conf);
            const brain = actor.getBrain() as BrainGoalOriented;
            if (brain.getGoal) {
                const evalHome = new Evaluator.GoHome(1.5);
                const xy = house.getFloorCenter();
                evalHome.setArgs({xy});
                brain.getGoal().addEvaluator(evalHome);

                const homeMarker = new Element.ElementMarker('H');
                homeMarker.setTag('home');
                level.addElement(homeMarker, xy[0], xy[1]);
            }
            const floorXY = RNG.arrayGetRand(house.floor);
            level.addActor(actor, floorXY[0], floorXY[1]);
        }
    }

    public createActor(conf): BaseActor {
        const parser = ObjectShell.getParser();
        const maxDanger = conf.maxDanger || this.maxDanger;
        let actor = null;
        if (maxDanger > 0) {
            let actorFunc = aa => aa.danger <= maxDanger;
            if (this.actorFunc) {
                actorFunc = aa => (
                    this.actorFunc(aa) && aa.danger <= maxDanger
                );
            }
            else if (conf.actorFunc) {
                actorFunc = aa => (
                    conf.actorFunc(aa) && aa.danger <= maxDanger
                );
            }
            actor = parser.createRandomActor({func: actorFunc});
        }
        else {
            RG.err('DungeonPopulate', 'createActor',
                'maxDanger must be > 0');
        }
        return actor;
    }

    public addActorsToBbox(level: Level, bbox: BBox, conf: ActorConf): boolean {
        const nActors = conf.nActors || 4;
        const {maxDanger} = conf;
        const func = conf.actor;
        let actors = conf.actors;
        if (!actors) {
            actors = this._actorFact.generateNActors(nActors, func, maxDanger);
        }
        return Placer.addActorsToBbox(level, bbox, actors);
    }

    /* Adds N items to the given level in bounding box coordinates. */
    public addItemsToBbox(level: Level, bbox: BBox, conf): boolean {
        const nItems = conf.nItems || 4;
        const itemConf = Object.assign({itemsPerLevel: nItems}, conf);
        const items = this._itemFact.generateItems(itemConf);
        return Placer.addItemsToBbox(level, bbox, items);
    }

    /* Adds a unique adventurer to the given level. */
    public addToughAdventurer(level: Level, point: TCoord, conf): boolean {
        const {maxDanger} = conf.maxDanger;
        const minDanger = maxDanger - 1;
        const actorFunc: TShellFunc = (shell: IShell) => (
            shell.danger <= (maxDanger + 4) && shell.danger >= minDanger
        );
        const advShell = ActorGen.genRandShellWith(actorFunc);
        if (advShell) {
            const [aX, aY] = point;
            const parser = ObjectShell.getParser();
            const actor = parser.createFromShell(RG.TYPE_ACTOR, advShell);
            if (actor && level.addActor(actor, aX, aY)) {
                return true;
            }
        }
        return false;
    }
}


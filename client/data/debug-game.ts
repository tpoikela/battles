/* For debugging various features of the game. Basically everything
 * requiring
 * manual testing is added to the end of create() function.
 */

import RG from '../src/rg';
import * as Component from '../src/component';
import * as Element from '../src/element';
import * as Item from '../src/item';
import * as Time from '../src/time';
import {Ability} from '../src/abilities';
import {ActorsData} from './actors';
import {BrainSpawner} from '../src/brain/brain.virtual';
import {Battle, Army} from '../src/game.battle';
import {CityGenerator} from '../src/city-generator';
import {EquipSlot} from '../src/equipment';
import {ItemRandomizer} from '../src/factory.items';
import {MapGenerator} from '../src/map.generator';
import {Cell} from '../src/map.cell';
import {Random} from '../src/random';
import {Spell} from '../src/spell';
import {Texts} from '../data/texts';
import {VirtualActor, WeatherActor} from '../src/actor.virtual';
import {ELEM} from '../data/elem-constants';
import {ItemGen} from '../data/item-gen';
import * as IF from '../src/interfaces';

import {Quest, QuestPopulate} from '../src/quest';

import {EventPool} from '../src/eventpool';
import {Factory} from '../src/factory';
import {FactoryLevel} from '../src/factory.level';
import {FactoryWorld} from '../src/factory.world';
import {World} from '../src/world';
import {WorldCreator} from '../src/world.creator';
import {WinCondition} from '../src/win-condition';
import {Room} from '../../lib/bsp';

const POOL = EventPool.getPool();

const RNG = Random.getRNG();
const Stairs = Element.ElementStairs;

export const DebugGame = function(fact, parser) {
    this._fact = fact;
    this._parser = parser;
};

DebugGame.prototype.createArena = function(obj, game, player) {
    Room.rng = RNG;
    const parser = this._parser;
    const sqrPerItem = obj.sqrPerItem;
    obj.cols = 100;
    obj.rows = 100;
    const [pX, pY] = [50, 50];
    const level = this.createLastBattle(game, obj);
    // game.addLevel(level);
    level.addActor(player, pX, pY);

    const cityQuarter = new World.CityQuarter('Debug quarter');
    cityQuarter.addLevel(level);

    const extras = level.getExtras();
    extras.shops.forEach(shop => {
        cityQuarter.addShop(shop);
    });

    const city = new World.City('Wrapper city for Debug quarter');
    city.addQuarter(cityQuarter);
    city.tileX = 0;
    city.tileY = 0;
    const area = new World.Area('Wrapper area', 2, 2, 10, 10);
    area.addZone('City', city);
    const world = new World.WorldTop('Wrapper world');
    world.addArea(area);
    game.addPlace(world);

    const spirit = this._parser.createActor('Wolf spirit');
    spirit.get('Stats').setStrength(500);
    level.addActor(spirit, 2, 1);

    const gem = new Item.SpiritGem('Lesser gem');
    level.addItem(gem);

    const pickaxe = this._parser.createActualObj('items', 'Pick-axe');
    level.addItem(pickaxe, 2, 2);

    const poison = this._parser.createActualObj('items',
        'Potion of frost poison');
    poison.setCount(5);
    level.addItem(poison, 2, 2);
    const curePoison = this._parser.createActualObj('items',
        'Potion of cure poison');
    level.addItem(curePoison, 3, 2);

    const rifle = this._parser.createActualObj('items', 'Rifle');
    const ammo = this._parser.createActualObj('items', 'Steel bullet');
    ammo.setCount(100);
    level.addItem(rifle, 1, 1);
    level.addItem(ammo, 1, 1);

    // Test for shops
    const keeper = this._parser.createActualObj('actors', 'shopkeeper');
    const gold = new Item.GoldCoin();
    gold.setCount(50);
    keeper.getInvEq().addItem(gold);
    level.addActor(keeper, 2, 2);

    const numFree = level.getMap().getFree().length;
    const itemsPerLevel = Math.round(numFree / sqrPerItem);

    const itemConf = {
        itemsPerLevel,
        func: (item) => (item.value <= 2500),
        maxValue: 2500,
        food: () => true,
        gold: () => false
    };
    this._fact.addNRandItems(level, this._parser, itemConf);

    const cols = level.getMap().cols;
    const rows = level.getMap().rows;

    const boss = this._parser.createActor('Thabba, Son of Ice');
    level.addActor(boss, cols - 2, rows - 2);

    const cryomancer = this._parser.createActor('Cryomancer');
    level.addActor(cryomancer, 1, rows - 2);

    const spiritPot = this._parser.createActualObj(
        'items', 'Potion of spirit form');
    player.getInvEq().addItem(spiritPot);

    const potStr = this._parser.createItem('Potion of strength');
    player.getInvEq().addItem(potStr);

    // BladeMaster components
    player.add(new Component.Attacker());
    player.add(new Component.Defender());
    player.add(new Component.MasterEquipper());
    player.add(new Component.BiDirStrike());
    player.add(new Component.BiDirStrike());

    // Marksman components
    player.add(new Component.ThroughShot());

    const winCond = new WinCondition('Kill a keeper', game.getPool());
    winCond.addActorKilled(keeper);

    game.addPlayer(player);

    const eq = player.getInvEq().getEquipment();
    eq.addSlot('spiritgem', new EquipSlot('spiritgem'));
    const gem1 = this._parser.createItem('Lesser spirit gem');
    const gem2 = this._parser.createItem('Greater spirit gem');
    player.getInvEq().addItem(gem1);
    player.getInvEq().addItem(gem2);
    player.add(new Component.SpiritItemCrafter());

    const exploreElem = new Element.ElementExploration();
    exploreElem.setExp(100);
    level.addElement(exploreElem, 1, 20);

    const trainer = this.createTrainer();
    level.addActor(trainer, 1, 2);

    const coins = new Item.GoldCoin();
    coins.setCount(600);
    player.getInvEq().addItem(coins);

    // if (!player.getBook()) {
    const spellbook = new Spell.SpellBook(player);
    player.setBook(spellbook);
    Spell.addAllSpells(spellbook);
    player.add(new Component.SpellPower());
    player.get('SpellPower').setPP(100);
    // }

    const vActor = new VirtualActor('spawner');
    const spawnBrain = new BrainSpawner(vActor);
    spawnBrain.setConstraint({op: 'lt', prop: 'danger', value: 10});
    vActor.setBrain(spawnBrain);
    level.addVirtualProp(RG.TYPE_ACTOR, vActor);

    const fire = this._parser.createActor('Fire');
    const fadingComp = new Component.Fading();
    fadingComp.setDuration(20);
    fire.add(fadingComp);
    level.addActor(fire, 7, 1);

    const thunderbird = this._parser.createActor('thunderbird');
    level.addActor(thunderbird, 20, 1);

    const firekit = parser.createEntity('firemaking kit');
    player.getInvEq().addItem(firekit);

    player.get('SpellPower').setPP(100);
    player.get('SpellPower').setMaxPP(100);

    const itemRand = new ItemRandomizer();
    const runeProt = parser.createItem('rune of protection');
    itemRand.adjustItem(runeProt, 100);
    player.getInvEq().addItem(runeProt);

    const runeDig = parser.createItem('rune of tunneling');
    itemRand.adjustItem(runeDig, 100);
    player.getInvEq().addItem(runeDig);

    const runeForce = parser.createItem('rune of force');
    itemRand.adjustItem(runeForce, 100);
    player.getInvEq().addItem(runeForce);

    const lever = new Element.ElementLever();
    level.addElement(lever, 2, 1);
    for (let i = 0; i < 3; i++) {
        const leverDoor = new Element.ElementLeverDoor();
        lever.addTarget(leverDoor);
        level.addElement(leverDoor, 3 + i, 1);
    }

    // For testing actor abilities and camouflage
    const abilities = player.get('Abilities');
    const camouflage = new Ability.Camouflage();
    abilities.addAbility(camouflage);
    const sharpener = new Ability.Sharpener();
    abilities.addAbility(sharpener);

    this.addGoblinWithLoot(level);

    const runeOfCtrl = parser.createItem('rune of control');
    itemRand.adjustItem(runeOfCtrl, 250);
    player.getInvEq().addItem(runeOfCtrl);

    const runeOfVenom = parser.createItem('rune of venom');
    itemRand.adjustItem(runeOfVenom, 150);
    player.getInvEq().addItem(runeOfVenom);

    const runeOfPoisonClouds = parser.createItem('rune of poison clouds');
    itemRand.adjustItem(runeOfPoisonClouds, 150);
    player.getInvEq().addItem(runeOfPoisonClouds);

    const voidDagger = parser.createItem('Void dagger');
    player.getInvEq().addItem(voidDagger);

    player.getInvEq().unequipItem('hand', 1, 0);
    player.getInvEq().equipItem(voidDagger);

    const shovel = parser.createItem('shovel');
    player.getInvEq().addItem(shovel);
    const machete = parser.createItem('machete');
    player.getInvEq().addItem(machete);

    const webRune = parser.createItem('rune of webs');
    player.getInvEq().addItem(webRune);

    /* const voidElem = parser.createActor('void elemental');
    level.addActor(voidElem, pX + 1, pY + 1);*/

    const thief = parser.createActor('bearfolk thief');
    level.addActor(thief, pX + 1, pY + 1);

    player.getInvEq().addItem(parser.createItem('Boots of flying'));

    const regen = new Component.RegenEffect();
    regen.setPP(2);
    regen.setWaitPP(0);
    regen.setMaxWaitPP(0);
    player.add(regen);

    level.getMap().setBaseElemXY(pX - 1, pY - 1, ELEM.WATER);

    const uniques = ActorsData.filter(item => (
        item.base === 'UniqueBase'
    ));
    uniques.forEach(uniqShell => {
        const {name} = uniqShell;
        const uniqueActor = parser.createActor(name);
        if (uniqueActor) {
            level.addActorToFreeCell(uniqueActor);
        }
        else {
            RG.warn('DebugGame', 'creating uniques',
                'Failed to create unique actor: ' + name);
        }
    });

    /* const assassin = parser.createActor('dark assassin');
    level.addActor(assassin, pX + 10, pY + 10);
    */

    // Add some quests into the city
    const questPopul = new QuestPopulate();
    /* const taskList = ['<goto>already_there', '<kill>kill'];
    const quest = new Quest('Kill an actor', taskList);
    questPopul.mapQuestToResources(quest, city, null);
    questPopul.addQuestComponents(city);
    */

    const newBook = new Item.Book('Book of shadows');
    newBook.addText('In the land of mordor where shadows lie...');
    player.getInvEq().addItem(newBook);

    const reportQuestTasks = ['<goto>already_there', '<report>listen',
        '<goto>already_there', 'report'];
    const reportQuest = new Quest('Report info to actor', reportQuestTasks);
    questPopul.mapQuestToResources(reportQuest, city, null);
    questPopul.addQuestComponents(city);

    const actors = level.getActors();

    const giver = actors.find(actor => actor.has('QuestGiver'));
    const giverComp = giver.get('QuestGiver');
    giverComp.setReward({type: 'item', name: 'Ruby glass mace'});
    level.moveActorTo(giver, pX + 1, pY);
    giver.add(new Component.Trainer());

    // Move all quest targets close to player for easier access and make them
    // slow
    const qTargets = actors.filter(actor => actor.has('QuestTarget'));
    qTargets.forEach((target, i) => {
        level.moveActorTo(target, pX, pY + 1 + i);
        target.get('Stats').setSpeed(10);
    });

    // Test the weather system here
    const weatherComp = new Component.Weather();
    weatherComp.setWeatherType('snowStorm');
    level.add(weatherComp);
    const weatherActor = new WeatherActor('Weather actor');
    level.addVirtualProp(RG.TYPE_ACTOR, weatherActor);

    // Testing the trap elements such as web
    const freeCells: Cell[] = level.getMap().getCells(c => c.isFree());
    for (let i = 0; i < 200; i++) {
        const cell = RNG.arrayGetRand(freeCells);
        const [xx, yy] = cell.getXY();
        level.addElement(new Element.ElementWeb(), xx, yy);
        if (level.getMap().hasXY(xx + 1, yy + 1)) {
            level.addElement(new Element.ElementSlime(), xx + 1, yy + 1);
        }
    }

    const floorCells: Cell[] = level.getMap().getCells(c => (
        c.hasPropType('floorhouse')));
    for (let i = 0; i < 40; i++) {
        const cell: Cell = RNG.arrayGetRand(floorCells);
        cell.setBaseElem(ELEM.BED);
    }

    // Testing of Charm
    const charmComp = new Component.Charm({level: 10});
    player.add(charmComp);

    const loreComp = new Component.Lore({});
    loreComp.addTopic('quests',
        giver.getName() + ' is looking for someone.');
    level.add(loreComp);

    const necrowurm = parser.createActor('necrowurm');
    level.addActor(necrowurm, player.getX() - 1, player.getY());

    const necroSwordShell = ItemGen.buildShell({
        type: 'weapon', name: 'sword', material: 'steel', suffix: 'ofNecropotence'
    });
    const necroSword = parser.createFromShell(RG.TYPE_ITEM, necroSwordShell);
    player.getInvEq().addItem(necroSword);

    return game;
};

/* Creates a debugging game for checking that quests work as planned. */
DebugGame.prototype.createQuestsDebug = function(obj, game, player) {
    const creator = new WorldCreator();
    const areaConf = {maxX: 2, maxY: 2};
    const worldConf: IF.WorldConf = {
        name: 'Quest test world',
        nAreas: 1,
        area: [creator.createSingleAreaConf(0, areaConf)]
    };
    const factWorld = new FactoryWorld();
    const world = factWorld.createWorld(worldConf);

    const level = world.getZones('City')[0].getLevels()[0];
    const pX = Math.floor(level.getMap().cols / 2);
    const pY = Math.floor(level.getMap().rows / 2);
    level.addActor(player, pX, pY);
    game.addPlace(world);
    game.addPlayer(player);
    return game;
};

DebugGame.prototype.createTrainer = function() {
    const human = this._parser.createActor('fighter');
    human.setName('Old trainer');
    const trainComp = new Component.Trainer();
    trainComp.getChatObj().setTrainer(human);
    human.add(trainComp);
    return human;
};

DebugGame.prototype.addGoblinWithLoot = function(level) {
    const goblin = this._parser.createActor('goblin');
    goblin.setName('goblin with loot');
    const loot = new Component.Loot(new Item.Weapon('sword'));
    goblin.add(loot);

    /* Should fix this TODO
    const ssCorner = new RG.Element.Stairs('stairs', level, level);
    level.addStairs(ssCorner, level.getMap().cols - 2, level.getMap().rows - 2);
    const ssLoot = new RG.Element.Stairs('stairs', level, level);
    const lootCompStairs = new Component.Loot(ssLoot);
    goblin.add(lootCompStairs );
    ssLoot.connect(ssCorner);
    */
    level.addActor(goblin, 2, 10);
};


DebugGame.prototype.createDebugBattle = function(obj, game, player) {
    const battle = new Battle('Battle of ice kingdoms');
    const army1 = new Army('Blue army');
    const army2 = new Army('Red army');
    this.addActorsToArmy(army1, 10, 'warlord');
    this.addActorsToArmy(army2, 10, 'Winter demon');

    const factLevel = new FactoryLevel();
    const battleLevel = factLevel.createLevel('arena', 60, 30);
    battle.setLevel(battleLevel);
    battle.addArmy(army1, 1, 1, {});
    battle.addArmy(army2, 1, 2, {});
    game.addBattle(battle);

    game.addPlayer(player);
    return game;
};

DebugGame.prototype.addActorsToArmy = (army, num, name) => {
    for (let i = 0; i < num; i++) {
        const actor = this._parser.createActualObj('actors', name);
        actor.setFOVRange(10);
        army.addActor(actor);
    }
};

DebugGame.prototype.createOneDungeonAndBoss = function(obj, game, player) {
    const {cols, rows, nLevels, sqrPerActor, sqrPerItem} = obj;
    let levelCount = 1;
    const levels = ['rooms', 'rogue', 'digger'];

    // For storing stairs and levels
    const allStairsDown = [];
    const allLevels = [];

    const branch = new World.Branch('StartBranch');

    const itemConstraint = maxValue => item => item.value <= maxValue;
    // Generate all game levels
    for (let nl = 0; nl < nLevels; nl++) {

        const nLevelType = RNG.randIndex(levels);
        let levelType = levels[nLevelType];
        if (nl === 0) {levelType = 'ruins';}
        const level = this._fact.createLevel(levelType, cols, rows);
        branch.addLevel(level);

        const numFree = level.getMap().getFree().length;
        const actorsPerLevel = Math.round(numFree / sqrPerActor);
        const itemsPerLevel = Math.round(numFree / sqrPerItem);

        const potion = new Item.Potion('Healing potion');
        level.addItem(potion);
        const missile = this._parser.createActualObj('items', 'Shuriken');
        missile.setCount(20);
        level.addItem(missile);

        const maxValue = 20 * (nl + 1);
        const itemConf = {
            itemsPerLevel, func: itemConstraint(maxValue),
            maxValue,
            food: () => true
        };
        this._fact.addNRandItems(level, this._parser, itemConf);

        const actorConf = {
            actorsPerLevel,
            maxDanger: nl + 1
        };
        this._fact.addNRandActors(level, this._parser, actorConf);

        allLevels.push(level);
    }

    // Create the final boss
    const lastLevel = allLevels.slice(-1)[0];
    const bossCell = lastLevel.getFreeRandCell();
    const summoner = this._fact.createActor('Summoner',
        {hp: 100, att: 10, def: 10});
    summoner.setType('summoner');
    summoner.get('Experience').setExpLevel(10);
    lastLevel.addActor(summoner, bossCell.getX(), bossCell.getY());

    const townLevel = this.createLastBattle(game, {cols: 80, rows: 60});
    game.addLevel(townLevel);
    townLevel.setLevelNumber(levelCount++);

    branch.connectLevels();
    game.addPlace(branch);

    const finalStairs = new Stairs(true, allLevels[nLevels - 1], townLevel);
    const stairsLoot = new Component.Loot(finalStairs);
    summoner.add(stairsLoot);
    allStairsDown.push(finalStairs);

    const lastStairsDown = allStairsDown.slice(-1)[0];
    const townStairsUp = new Stairs(false, townLevel, lastLevel);
    const rStairCell = townLevel.getFreeRandCell();
    townLevel.addStairs(townStairsUp, rStairCell.getX(), rStairCell.getY());
    townStairsUp.setTargetStairs(lastStairsDown);
    lastStairsDown.setTargetStairs(townStairsUp);

    // Create townsfolk for the extra level
    for (let i = 0; i < 10; i++) {
        const name = 'Townsman';
        const human = this._fact.createActor(name, {brain: 'Human'});
        human.setType('human');
        const cell = townLevel.getFreeRandCell();
        townLevel.addActor(human, cell.getX(), cell.getY());
    }

    // Restore player position or start from beginning
    if (obj.loadedLevel !== null) {
        const loadLevel = obj.loadedLevel;
        if (loadLevel <= nLevels) {
            allLevels[loadLevel - 1].addActorToFreeCell(player);
        }
        else {
            allLevels[0].addActorToFreeCell(player);
        }
    }
    game.addPlayer(player, {place: 'StartBranch'});
    return game;
};

DebugGame.prototype.createLastBattle = function(game, obj) {
    const levelConf = Factory.cityConfBase({});
    levelConf.parser = this._parser;

    levelConf.nShops = 5;
    const shopFunc = item => item.type === RNG.arrayGetRand(RG.SHOP_TYPES);
    for (let i = 0; i < levelConf.nShops - 1; i++) {
        levelConf.shopFunc.push(shopFunc);
    }

    levelConf.actorFunc = actor => actor.type === 'bearfolk';
    levelConf.hasWall = false;

    const cityGen = new CityGenerator();
    const level = cityGen.create(obj.cols, obj.rows, levelConf);

    // const level = this._fact.createLevel('town',
    // obj.cols, obj.rows, levelConf);
    this._listener = new ActorKillListener(this, game, level);

    this._fact.createHumanArmy(level, this._parser);

    level.setOnFirstEnter(() => {
        const demonEvent = new Time.OneShotEvent(
            this._fact.createDemonArmy.bind(this._fact, level, this._parser),
            100 * 20,
            'Demon hordes are unleashed from the unsilent abyss!');
        game.addEvent(demonEvent);
    });

    level.setOnEnter( () => {
        this._savedPlayerFOV = game.getPlayer().getFOVRange();
        game.getPlayer().setFOVRange(20);
    });
    level.setOnExit( () => {
        game.getPlayer().setFOVRange(this._savedPlayerFOV);
    });

    return level;
};

const ActorKillListener = function(parent, game, level) {

    // Needed for adding monsters and events
    this._game = game;
    this._level = level;

    this._maxBeasts = 0;
    this._maxDemons = 0;
    this._beastsKilled = 0;
    this._demonsKilled = 0;

    this.hasNotify = true;
    this.notify = function(evtName, obj) {
        if (evtName === RG.EVT_ACTOR_CREATED) {
            if (obj.hasOwnProperty('msg') && obj.msg === 'DemonSpawn') {
                const actorCreated = obj.actor;
                if (actorCreated.getName() === 'Winter demon') {
                    ++this._maxDemons;
                }
                if (actorCreated.getName() === 'Blizzard beast') {
                    ++this._maxBeasts;
                }
            }
        }
        else if (evtName === RG.EVT_ACTOR_KILLED) {
            const actor = obj.actor;
            if (actor.getName() === 'Winter demon') {
                ++this._demonsKilled;
                if (this._demonsKilled === this._maxDemons) {
                    this.allDemonsKilled();
                }
                RG.debug(this,
                    'A winter demon was slain! #' + this._demonsKilled);
                RG.debug(this, 'Max demons: ' + this._maxDemons);
            }
            else if (actor.getName() === 'Blizzard beast') {
                ++this._beastsKilled;
                if (this._beastsKilled === this._maxBeasts) {
                    this.allBeastsKilled();
                }
            }
        }
    };
    POOL.listenEvent(RG.EVT_ACTOR_CREATED, this);
    POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);

    this.addSnow = (lev, ratio) => {
        const map = lev.getMap();
        MapGenerator.addRandomSnow(map, ratio);
    };

    /* Called after all winter demons have been slain.*/
    this.allDemonsKilled = () => {
        RG.gameMsg(
            'Humans have vanquished all demons! But it\'s not over..');
        const windsEvent = new Time.OneShotEvent(
            this.addSnow.bind(this, this._level, 0.2), 20 * 100,
            'Winds are blowing stronger. You feel it\'s getting colder'
        );
        this._game.addEvent(windsEvent);
        const stormEvent = new Time.OneShotEvent(
            () => {}, 35 * 100, Texts.battle.eyeOfStorm);
        this._game.addEvent(stormEvent);
        const beastEvent = new Time.OneShotEvent(
            parent.createBeastArmy.bind(parent, this._level, this._parser),
            50 * 100,
            'Winter spread by Blizzard Beasts! Hell seems to freeze.');
        this._game.addEvent(beastEvent);
    };

    this.allBeastsKilled = () => {
        RG.gameMsg(Texts.battle.beastsSlain);
        // DO a final message of game over
        // Add random people to celebrate
        const msgEvent = new Time.OneShotEvent(() => {}, 10 * 100,
            Texts.battle.enemiesDead);
        this._game.addEvent(msgEvent);
        const msgEvent2 = new Time.OneShotEvent(() => {}, 20 * 100,
            'Battles in the North will continue soon in larger scale...');
        this._game.addEvent(msgEvent2);
    };
}; // const ActorKillListener

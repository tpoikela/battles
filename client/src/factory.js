
import LevelFactory from '../data/level-factory';
import Constraints from './constraints';

const RG = require('./rg.js');
const debug = require('debug')('bitn:factory');

RG.Actor = require('./actor');
RG.Component = require('./component.js');
RG.Brain = require('./brain.js');
RG.Map = require('./map.js');
RG.Map.Generator = require('./map.generator');
RG.Verify = require('./verify');
RG.World = require('./world');

const GoalsTop = require('./goals-top');

const Stairs = RG.Element.Stairs;

RG.Factory = {};

/* Returns a basic configuration for a city level. */
RG.Factory.cityConfBase = conf => {
    const userConf = conf || {};
    const obj = {
        nHouses: 10, minHouseX: 5, maxHouseX: 10, minHouseY: 5,
        maxHouseY: 10, nShops: 1,
        shopFunc: [
            item => item.type === RG.RAND.arrayGetRand(RG.SHOP_TYPES)
        ],
        shopType: '', levelType: 'arena'
    };
    const result = Object.assign(obj, userConf);
    return result;
};

/* Determines the x-y sizes for different types of levels. */
const levelSizes = {
    tile: {
        Small: {x: 40, y: 20},
        Medium: {x: 60, y: 30},
        Large: {x: 80, y: 40},
        Huge: {x: 140, y: 60}
    },
    mountain: {
        Small: {x: 40, y: 20},
        Medium: {x: 60, y: 30},
        Large: {x: 80, y: 40},
        Huge: {x: 140, y: 60}
    },
    dungeon: {
        Small: {x: RG.LEVEL_SMALL_X, y: RG.LEVEL_SMALL_Y},
        Medium: {x: RG.LEVEL_MEDIUM_X, y: RG.LEVEL_MEDIUM_Y},
        Large: {x: RG.LEVEL_LARGE_X, y: RG.LEVEL_LARGE_Y},
        Huge: {x: RG.LEVEL_HUGE_X, y: RG.LEVEL_HUGE_Y}
    },
    city: {
        Small: {x: 40, y: 20},
        Medium: {x: 60, y: 30},
        Large: {x: 80, y: 40},
        Huge: {x: 140, y: 60}
    }
};


RG.Factory.addPropsToFreeCells = function(level, props, type) {
    const freeCells = level.getMap().getFree();
    RG.Factory.addPropsToCells(level, freeCells, props, type);
};

/* Adds to the given level, and its cells, all props given in the list. Assumes
 * that all props are of given type (placement function is different for
 * different types. */
RG.Factory.addPropsToCells = function(level, cells, props, type) {
    for (let i = 0; i < props.length; i++) {
        if (cells.length > 0) {
            const index = RG.RAND.randIndex(cells);
            const cell = cells[index];
            if (type === RG.TYPE_ACTOR) {
                level.addActor(props[i], cell.getX(), cell.getY());
            }
            else if (type === RG.TYPE_ITEM) {
                level.addItem(props[i], cell.getX(), cell.getY());
            }
            else {
                RG.err('RG.Factory', 'addPropsToCells',
                    `Type ${type} not supported`);
            }
            cells.splice(index, 1); // remove used cell
        }
    }
};


//---------------------------------------------------------------------------
// FACTORY OBJECTS
//---------------------------------------------------------------------------

/* This object is used to randomize item properties during procedural
 * generation.*/
RG.Factory.ItemRandomizer = function() {

    /* Only public function. All logic is deferred to private functions.
     * Adjusts the properties of given item, based also on maxValue.*/
    this.adjustItem = (item, val) => {
        const itemType = item.getType();
        if (_adjustFunctions.hasOwnProperty(itemType)) {
            _adjustFunctions[itemType](item, val);
        }
    };

    /* Distr. of food weights.*/
    const _foodWeights = RG.getFoodWeightDistr();

    const _adjustFoodItem = food => {
        const weight = RG.RAND.getWeighted(_foodWeights);
        food.setWeight(weight);
    };

    const _adjustGoldCoin = (gold, nLevel) => {
        if (!RG.isNullOrUndef([nLevel])) {
            const goldWeights = RG.getGoldCoinCountDistr(nLevel);
            const count = RG.RAND.getWeighted(goldWeights);
            gold.setCount(parseInt(count, 10));
        }
        else {
            RG.err('Factory.ItemRandomizer', '_adjustGoldCoin',
                'nLevel is not defined.');
        }
    };

    const _adjustMissile = missile => {
        const count = RG.RAND.getUniformInt(5, 15);
        missile.setCount(count);
    };

    const _isCombatMod = val => val >= 0.0 && val <= 0.02;
    const _isStatsMod = val => val >= 0.1 && val <= 0.12;

    const _getRandStat = () => RG.RAND.arrayGetRand(RG.STATS);

    /* Adjust damage, attack, defense and value of a weapon. */
    const _adjustWeapon = weapon => {
        const randVal = RG.RAND.getUniform();
        if (_isCombatMod(randVal)) {
            const bonus = RG.RAND.getUniformInt(1, 5);
            const type = RG.RAND.getUniformInt(0, 4);
            switch (type) {
                case 0: // Fall through
                case 1: {
                    weapon.setAttack(weapon.getAttack() + bonus);
                    break;
                }
                case 2: // Fall through
                case 3: {
                    weapon.setDefense(weapon.getDefense() + bonus);
                    break;
                }
                case 4: {
                    weapon.setProtection(weapon.getProtection() + bonus);
                    break;
                }
                default: break;
            }
            RG.scaleItemValue('combat', bonus, weapon);
        }
        else if (_isStatsMod(randVal)) {
            const bonus = RG.RAND.getUniformInt(1, 3);
            let stats = null;
            if (weapon.has('Stats')) {
                stats = weapon.get('Stats');
            }
            else {
                stats = new RG.Component.Stats();
                weapon.add(stats);
            }
            const randStat = _getRandStat();
            const getName = 'get' + randStat;
            const setName = 'set' + randStat;
            stats[setName](stats[getName]() + bonus);
            RG.scaleItemValue('stats', bonus, weapon);
        }
    };

    const _adjustArmour = armour => {
        _adjustWeapon(armour); // The same function works fine for this
    };

    /* LUT for functions to call on specific items.*/
    const _adjustFunctions = {
        food: _adjustFoodItem,
        goldcoin: _adjustGoldCoin,
        missile: _adjustMissile,
        weapon: _adjustWeapon,
        armour: _adjustArmour,
        ammo: _adjustMissile
    };

};

/* Factory object for creating actors. */
RG.Factory.Actor = function() {

    const _initCombatant = (comb, obj) => {
        const {hp, att, def, prot} = obj;

        if (!RG.isNullOrUndef([hp])) {
            const hComp = comb.get('Health');
            hComp.setHP(hp);
            hComp.setMaxHP(hp);
        }

        let combatComp = null;
        if (!comb.has('Combat')) {
            combatComp = new RG.Component.Combat();
            comb.add('Combat', combatComp);
        }
        else {
            combatComp = comb.get('Combat');
        }

        if (!RG.isNullOrUndef([att])) {combatComp.setAttack(att);}
        if (!RG.isNullOrUndef([def])) {combatComp.setDefense(def);}
        if (!RG.isNullOrUndef([prot])) {combatComp.setProtection(prot);}

    };

    /* Creates a player actor. */
    this.createPlayer = (name, obj) => {
        const player = new RG.Actor.Rogue(name);
        player.setIsPlayer(true);
        _initCombatant(player, obj);
        return player;
    };

    /* Factory method for non-player actors. */
    this.createActor = function(name, obj = {}) {
        const actor = new RG.Actor.Rogue(name);
        actor.setType(name);

        const brain = obj.brain;
        _initCombatant(actor, obj);
        if (!RG.isNullOrUndef([brain])) {
            if (typeof brain === 'object') {
                actor.setBrain(brain);
            }
            else { // If brain is string, use factory to create a new one
                const newBrain = this.createBrain(actor, brain);
                actor.setBrain(newBrain);
            }
        }
        return actor;
    };

    /* Factory method for AI brain creation.*/
    this.createBrain = (actor, brainName) => {
        switch (brainName) {
            case 'Animal': return new RG.Brain.Animal(actor);
            case 'Archer': return new RG.Brain.Archer(actor);
            case 'Demon': return new RG.Brain.Demon(actor);
            case 'GoalOriented': return new RG.Brain.GoalOriented(actor);
            // case 'Goblin': return new RG.Brain.Goblin(actor);
            case 'Human': return new RG.Brain.Human(actor);
            // case 'SpellCaster': return new RG.Brain.SpellCaster(actor);
            case 'SpellCaster': {
                const brain = new RG.Brain.GoalOriented(actor);
                const topGoal = new GoalsTop.ThinkSpellcaster(actor);
                brain.setGoal(topGoal);
                return brain;
            }
            case 'Summoner': return new RG.Brain.Summoner(actor);
            case 'Undead': return new RG.Brain.Undead(actor);
            case 'Zombie': return new RG.Brain.Zombie(actor);
            default: return new RG.Brain.Rogue(actor);
        }
    };

    this.createSpell = spellName => {
        if (RG.Spell.hasOwnProperty(spellName)) {
            return new RG.Spell[spellName]();
        }
        return null;
    };

};

/* Factory object for creating items. */
RG.Factory.Item = function() {
    const _itemRandomizer = new RG.Factory.ItemRandomizer();

    /* Called for random items. Adjusts some of their attributes randomly.*/
    const _doItemSpecificAdjustments = (item, val) => {
        _itemRandomizer.adjustItem(item, val);
    };

    this.addNRandItems = (level, parser, conf) => {
        const items = this.generateItems(parser, conf);

        if (conf.food) {
            const food = parser.createRandomItem({
                func: item => item.type === 'food'
            });

            if (food) {
                _doItemSpecificAdjustments(food, conf.maxValue);
                items.push(food);
            }
            else {
                RG.warn('Factory.Item', 'addNRandItems',
                    'Item.Food was not created properly.');
            }
        }
        RG.Factory.addPropsToFreeCells(level, items, RG.TYPE_ITEM);
    };

    this.generateItems = function(parser, conf) {
        const items = [];
        for (let j = 0; j < conf.itemsPerLevel; j++) {
            const item = parser.createRandomItem({func: conf.func});
            if (item) {
                _doItemSpecificAdjustments(item, conf.maxValue);
                items.push(item);
            }
        }
        return items;
    };

    /* Adds a random number of gold coins to the level. */
    this.addRandomGold = (level, parser, conf) => {
        const goldItems = [];
        for (let i = 0; i < conf.goldPerLevel; i++) {
            const gold = parser.createActualObj(RG.TYPE_ITEM,
                RG.GOLD_COIN_NAME);
            _doItemSpecificAdjustments(gold, conf.nLevel);
            goldItems.push(gold);
        }
        RG.Factory.addPropsToFreeCells(level, goldItems, RG.TYPE_ITEM);
    };

    /* Returns a shop item based on the configuration. */
    this.getShopItem = (n, conf) => {
        let item = null;
        if (conf.shopFunc) {
            if (typeof conf.shopFunc[n] === 'function') {
                item = conf.parser.createRandomItem({
                    func: conf.shopFunc[n]
                });
            }
            else {
                RG.err('Factory.Base', 'createShop -> getShopItem',
                    'shopFunc must be a function.');
            }
        }
        else if (Array.isArray(conf.shopType)) {
            item = conf.parser.createRandomItem({
                func: item => item.type === conf.shopType[n]
            });
        }
        else if (typeof conf.shopType === 'string') {
            item = conf.parser.createRandomItem({
                func: item => item.type === conf.shopType
            });
        }
        else { // Fallback, if no config
            item = conf.parser.createRandomItem({
                func: item => item.value <= 50 + n * 100
            });
        }
        _doItemSpecificAdjustments(item, 50 + n * 100);
        return item;
    };

    this.addItemsToCells = function(level, parser, cells, conf) {
        if (!conf.maxValue) {
            RG.err('Factory.Item', 'addItemsToCells',
                'conf is missing maxValue');
        }
        const items = this.generateItems(parser, conf);
        RG.Factory.addPropsToCells(level, cells, items, RG.TYPE_ITEM);
    };
};

/* Factory object for creating some commonly used objects. Because this is a
* global object RG.FACT, no state should be used. */
RG.Factory.Base = function() { // {{{2
    const _verif = new RG.Verify.Conf('Factory.Base');

    const _actorFact = new RG.Factory.Actor();
    const _itemFact = new RG.Factory.Item();

    /* Creates a new die object from array or die expression '2d4 + 3' etc.*/
    this.createDie = strOrArray => {
        const numDiceMod = RG.parseDieSpec(strOrArray);
        if (numDiceMod.length === 3) {
            return new RG.Die(numDiceMod[0], numDiceMod[1], numDiceMod[2]);
        }
        return null;
    };

    /* Factory method for players.*/
    this.createPlayer = (name, obj) => _actorFact.createPlayer(name, obj);

    /* Factory method for monsters.*/
    this.createActor = (name, obj = {}) => _actorFact.createActor(name, obj);

    /* Factory method for AI brain creation.*/
    this.createBrain = (actor, brainName) =>
        _actorFact.createBrain(actor, brainName);

    /* Factory method for AI brain creation.*/
    this.createSpell = name => _actorFact.createSpell(name);

    this.createElement = elemType => {
        if (RG.elemTypeToObj[elemType]) {
            return RG.elemTypeToObj[elemType];
        }
        switch (elemType) {
            case 'door' : return new RG.Element.Door(true);
            case 'opendoor' : return new RG.Element.Door(false);
            default: return null;
        }
    };

    this.createFloorCell = (x, y) =>
        new RG.Map.Cell(x, y, new RG.Element.Base('floor'));

    this.createWallCell = (x, y) =>
        new RG.Map.Cell(x, y, new RG.Element.Base('wall'));

    this.createSnowCell = (x, y) =>
        new RG.Map.Cell(x, y, new RG.Element.Base('snow'));

    /* Factory method for creating levels.*/
    this.createLevel = function(levelType, cols, rows, conf) {
        const mapgen = new RG.Map.Generator();
        let mapObj = null;
        const level = new RG.Map.Level(cols, rows);

        mapgen.setGen(levelType, cols, rows);
        if (levelType === 'town') {
            mapObj = mapgen.createTown(cols, rows, conf);
            level.setMap(mapObj.map);
            this.createHouseElements(level, mapObj, conf);
            this.createShops(level, mapObj, conf);
            this.createTrainers(level, conf);
        }
        else if (levelType === 'townwithwall') {
            mapObj = mapgen.createTownWithWall(cols, rows, conf);
            level.setMap(mapObj.map);
            this.createHouseElements(level, mapObj, conf);
            this.createShops(level, mapObj, conf);
            this.createTrainers(level, conf);
        }
        else if (levelType === 'forest') {
            mapObj = mapgen.createForest(conf);
        }
        else if (levelType === 'lakes') {
            mapObj = mapgen.createLakes(conf);
        }
        else if (levelType === 'mountain') {
            mapObj = mapgen.createMountain(conf);
        }
        else if (levelType === 'crypt') {
            mapObj = mapgen.createCryptNew(cols, rows, conf);
        }
        else if (levelType === 'cave') {
            mapObj = mapgen.createCave(cols, rows, conf);
        }
        else if (levelType === 'castle') {
            mapObj = mapgen.createCastle(cols, rows, conf);
        }
        else if (levelType === 'wall') {
            mapObj = mapgen.createWall(cols, rows, conf);
        }
        else if (levelType === 'arctic') {
            mapObj = mapgen.createArctic(cols, rows, conf);
        }
        else {
            mapObj = mapgen.getMap();
        }

        if (mapObj) {
            level.setMap(mapObj.map);
        }
        else {
            const msg = JSON.stringify(conf);
            RG.err('Factory.Base', 'createLevel',
                `mapObj is null. type: ${levelType}. ${msg}`);
        }

        return level;
    };

    this.createHouseElements = (level, mapObj) => {
        if (!mapObj.hasOwnProperty('houses')) {return;}
        const houses = mapObj.houses;
        for (let i = 0; i < houses.length; i++) {
            const doorXY = houses[i].door;
            const door = new RG.Element.Door(true);
            level.addElement(door, doorXY[0], doorXY[1]);
        }
    };

    /* Creates a shop and a shopkeeper into a random house in the given level.
     * Level should already contain empty houses where the shop is created at
     * random. */
    this.createShops = function(level, mapObj, conf) {
        _verif.verifyConf('createShops', conf, ['nShops']);
        if (mapObj.hasOwnProperty('houses')) {
            const houses = mapObj.houses;

            const usedHouses = [];
            let watchDog = 0;
            level.shops = [];
            for (let n = 0; n < conf.nShops; n++) {
                const shopObj = new RG.World.Shop();

                // Find the next (unused) index for a house
                let index = RG.RAND.randIndex(houses);
                while (usedHouses.indexOf(index) >= 0) {
                    index = RG.RAND.randIndex(houses);
                    ++watchDog;
                    if (watchDog === (2 * houses.length)) {
                        RG.err('Factory.Base', 'createShops',
                            'WatchDog reached max houses');
                    }
                }

                const house = mapObj.houses[index];
                const floor = house.floor;
                const doorXY = house.door;
                const door = new RG.Element.Door(true);
                level.addElement(door, doorXY[0], doorXY[1]);

                let keeper = null;
                if (conf.parser) {
                    keeper = conf.parser.createActor('shopkeeper');
                }
                else {
                    keeper = this.createActor('shopkeeper', {brain: 'Human'});
                }

                const gold = new RG.Item.GoldCoin(RG.GOLD_COIN_NAME);
                gold.count = RG.RAND.getUniformInt(50, 200);
                keeper.getInvEq().addItem(gold);

                const shopCoord = [];
                for (let i = 0; i < floor.length; i++) {
                    const xy = floor[i];

                    const shopElem = new RG.Element.Shop();
                    shopElem.setShopkeeper(keeper);
                    level.addElement(shopElem, xy[0], xy[1]);

                    if (i === 0) {
                        level.addActor(keeper, xy[0], xy[1]);
                    }

                    if (conf.hasOwnProperty('parser')) {
                        const item = _itemFact.getShopItem(n, conf);

                        if (!item) {
                            const msg = 'item null. ' +
                                `conf: ${JSON.stringify(conf)}`;
                            RG.err('Factory.Base', 'createShop',
                                `${msg} shopFunc/type${n} not well defined.`);
                        }
                        else {
                            item.add('Unpaid', new RG.Component.Unpaid());
                            level.addItem(item, xy[0], xy[1]);
                            shopCoord.push(xy);
                        }
                    }
                }

                shopObj.setShopkeeper(keeper);
                shopObj.setLevel(level);
                shopObj.setCoord(shopCoord);
                level.shops.push(shopObj);
            }
        }
        else {
            RG.err('Factory.Base', 'createShops', 'No houses in mapObj.');
        }

    };

    /* Creates trainers for the given level. */
    this.createTrainers = function(level, conf) {
        if (RG.RAND.getUniform() < RG.TRAINER_PROB) {
            let trainer = null;
            if (conf.parser) {
                trainer = conf.parser.createActor('trainer');
            }
            else {
                trainer = this.createActor('trainer', {brain: 'Human'});
                const trainComp = new RG.Component.Trainer();
                trainer.add(trainComp);
            }
            const cell = level.getFreeRandCell();
            level.addActor(trainer, cell.getX(), cell.getY());
        }
    };

    /* Creates a randomized level for the game. Danger level controls how the
     * randomization is done. */
    this.createRandLevel = function(cols, rows) {
        const levelType = RG.Map.Generator.getRandType();
        const level = this.createLevel(levelType, cols, rows);
        return level;
    };

    /* Adds N random items to the level based on maximum value.*/
    this.addNRandItems = (level, parser, conf) => {
        _verif.verifyConf('addNRandItems', conf, ['func', 'maxValue']);
        // Generate the items randomly for this level
        _itemFact.addNRandItems(level, parser, conf);

    };

    /* Adds N random monsters to the level based on given danger level.*/
    this.addNRandActors = (level, parser, conf) => {
        _verif.verifyConf('addNRandActors', conf,
            ['maxDanger', 'actorsPerLevel']);
        // Generate the enemies randomly for this level
        const maxDanger = conf.maxDanger;

        const actors = [];
        for (let i = 0; i < conf.actorsPerLevel; i++) {

            // Generic randomization with danger level
            let actor = null;
            if (!conf.func) {
                actor = parser.createRandomActorWeighted(1, maxDanger,
                    {func: function(actor) {return actor.danger <= maxDanger;}}
                );
            }
            else {
                actor = parser.createRandomActor({
                    func: actor => (conf.func(actor) &&
                        actor.danger <= maxDanger)
                });
            }

            if (actor) {
                // This levels up the actor to match current danger level
                const objShell = parser.dbGet('actors', actor.getName());
                const expLevel = maxDanger - objShell.danger;
                if (expLevel > 1) {
                    RG.levelUpActor(actor, expLevel);
                }
                actors.push(actor);
            }
            else {
                RG.diag('RG.Factory Could not meet constraints for actor gen');
                return false;
                // RG.err('Factory.Base', 'addNRandActors',
                    // `Generated actor null. Conf: ${JSON.stringify(conf)}`);
            }

        }
        RG.Factory.addPropsToFreeCells(level, actors, RG.TYPE_ACTOR);
        return true;
    };


    /* Adds a random number of gold coins to the level. */
    this.addRandomGold = (level, parser, conf) => {
        _itemFact.addRandomGold(level, parser, conf);
    };


    this.createHumanArmy = (level, parser) => {
        for (let y = 0; y < 2; y++) {
            for (let x = 0; x < 20; x++) {
                const human = parser.createActualObj('actors', 'fighter');
                level.addActor(human, x + 1, 4 + y);
            }

            const warlord = parser.createActualObj('actors', 'warlord');
            level.addActor(warlord, 10, y + 7);
        }

    };

    this.createDemonArmy = (level, parser) => {
        for (let y = 0; y < 2; y++) {
            for (let i = 0; i < 10; i++) {
                const demon = parser.createActualObj('actors', 'Winter demon');
                level.addActor(demon, i + 10, 14 + y);
                RG.POOL.emitEvent(RG.EVT_ACTOR_CREATED, {actor: demon,
                    level, msg: 'DemonSpawn'});
            }
        }
    };

    this.createBeastArmy = function(level, parser) {
        const x0 = level.getMap().cols / 2;
        const y0 = level.getMap().rows / 2;
        for (let y = y0; y < y0 + 2; y++) {
            for (let x = x0; x < x0 + 10; x++) {
                const beast = parser.createActualObj('actors',
                    'Blizzard beast');
                const xAct = x + 10;
                const yAct = y + 14;
                if (level.getMap().hasXY(xAct, yAct)) {
                    level.addActor(beast, xAct, yAct);
                    RG.POOL.emitEvent(RG.EVT_ACTOR_CREATED, {actor: beast,
                        level, msg: 'DemonSpawn'});
                }
                else {
                    RG.warn('Factory.Base', 'createBeastArmy',
                        `Cannot put beast to ${xAct}, ${yAct}.`);
                }
            }
        }
        RG.debug(this, 'Blizzard beasts should now appear.');
    };

};

RG.FACT = new RG.Factory.Base();
// }}}

RG.Factory.Zone = function() {
    RG.Factory.Base.call(this);

    const _verif = new RG.Verify.Conf('Factory.Zone');
    const _parser = RG.ObjectShell.getParser();

    this.getRandLevelType = () => {
        const type = ['rooms', 'rogue', 'digger'];
        const nLevelType = RG.RAND.randIndex(type);
        return type[nLevelType];
    };

    this.addItemsAndActors = function(level, conf) {
        _verif.verifyConf('addItemsAndActors', conf,
            ['nLevel', 'sqrPerItem', 'sqrPerActor', 'maxValue']);

        const numFree = level.getMap().getFree().length;
        const actorsPerLevel = Math.round(numFree / conf.sqrPerActor);
        const itemsPerLevel = Math.round(numFree / conf.sqrPerItem);
        const goldPerLevel = itemsPerLevel;

        debug(`Adding ${actorsPerLevel} monsters and items ` +
            `${itemsPerLevel} to the level`);

        const itemConstraint = maxValue => item => item.value <= maxValue;

        const itemConf = {
            nLevel: conf.nLevel,
            itemsPerLevel,
            func: itemConstraint(conf.maxValue),
            maxValue: conf.maxValue,
            food: true,
            gold: true
        };
        if (conf.hasOwnProperty('food')) {
            itemConf.food = conf.food;
        }
        if (conf.hasOwnProperty('gold')) {
            itemConf.gold = conf.gold;
        }
        if (conf.item) {
            itemConf.func = conf.item;
            debug(`Set itemConf.func to ${conf.item.toString()}`);
        }
        this.addNRandItems(level, _parser, itemConf);

        const actorConf = {
            actorsPerLevel: conf.actorsPerLevel || actorsPerLevel,
            maxDanger: conf.maxDanger || conf.nLevel + 1
        };
        if (conf.actor) {
            if (typeof conf.actor === 'function') {
                actorConf.func = conf.actor;
            }
            else {
                RG.err('Factory.Zone', 'addItemsAndActors',
                    'conf.actor must be a function');
            }
        }
        this.addNRandActors(level, _parser, actorConf);

        if (itemConf.gold) {
            const goldConf = {
                goldPerLevel,
                nLevel: conf.nLevel + 1
            };
            this.addRandomGold(level, _parser, goldConf);
        }
    };

    /* Creates dungeon level. Unless levelType is given, chooses the type
     * randomly. */
    this.createDungeonLevel = function(conf) {
        let level = null;
        let levelType = this.getRandLevelType();
        if (conf.dungeonType) {
            levelType = conf.dungeonType;
        }
        debug(`dungeonLevel: ${levelType}, ${JSON.stringify(conf)}`);
        level = this.createLevel(levelType, conf.x, conf.y, conf);
        this.addItemsAndActors(level, conf);
        return level;
    };


    this.createMountainLevel = function(conf) {
        const mountConf = {
            maxValue: 100,
            sqrPerActor: 50,
            sqrPerItem: 200,
            nLevel: 4
        };
        debug(`Creating mountain level with ${conf}`);
        const mountainLevel = this.createLevel('mountain',
            conf.x, conf.y, mountConf);
        this.addItemsAndActors(mountainLevel, mountConf);
        return mountainLevel;
    };

    //---------------------------
    // CITY LEVELS
    //---------------------------

    /* Called for each nLevels of city quarter. Delegates the task to other
    * functions based on the type of city and quarter. */
    this.createCityLevel = function(nLevel, conf) {
        const levelConf = RG.Factory.cityConfBase(conf);
        levelConf.parser = _parser;
        let cityLevel = null;

        const {x, y} = conf;
        if (levelConf.groupType) {
            switch (levelConf.groupType) {
                case 'village': {
                    cityLevel = this.createVillageLevel(x, y, levelConf);
                    break;
                }
                case 'capital': {
                    cityLevel = this.createCapitalLevel(
                        nLevel, x, y, levelConf);
                    break;
                }
                case 'stronghold': {
                    cityLevel = this.createStrongholdLevel(x, y, levelConf);
                    break;
                }
                case 'fort': {
                    cityLevel = this.createFortLevel(x, y, levelConf);
                    break;
                }
                default: {
                    break;
                }
            }
        }

        // Fall back to the default method
        if (cityLevel === null) {
            cityLevel = this.createLevel('town', x, y, levelConf);
        }
        return cityLevel;
    };

    this.createVillageLevel = function(cols, rows, levelConf) {
        levelConf.levelType = 'empty';
        levelConf.wallType = 'wooden';
        const level = this.createLevel('town', cols, rows, levelConf);
        if (!levelConf.actorsPerLevel) {
            levelConf.actorsPerLevel = 30;
        }
        if (!levelConf.maxDanger) {
            levelConf.maxDanger = 3;
        }
        if (!levelConf.itemsPerLevel) {
            levelConf.itemsPerLevel = levelConf.maxDanger * 2;
        }
        this.populateCityLevel(level, levelConf);
        this.addItemsToCityLevel(level, levelConf);
        return level;
    };

    this.createFortLevel = function(cols, rows, levelConf) {
        levelConf.levelType = 'miner';
        const level = this.createLevel('town', 100, 84, levelConf);
        this.populateCityLevel(level, levelConf);
        return level;
    };

    this.createCapitalLevel = function(nLevel, cols, rows, levelConf) {
        levelConf.levelType = 'miner';
        let level = null;
        if (nLevel === 0) {
            levelConf.levelType = 'townwithwall';
            level = this.createLevel('townwithwall', 200, 84, levelConf);
        }
        else {
            level = this.createLevel('town', 100, 84, levelConf);
        }
        this.populateCityLevel(level, levelConf);
        return level;
    };

    this.createStrongholdLevel = function(cols, rows, levelConf) {
        levelConf.levelType = 'miner';
        const level = this.createLevel('town', 100, 84, levelConf);
        this.populateCityLevel(level, levelConf);
        return level;
    };

    this.populateCityLevel = function(level, levelConf) {
        let alignment = levelConf.alignment;
        if (!alignment) {
            alignment = RG.RAND.arrayGetRand(RG.ALIGNMENTS);
        }

        if (alignment === RG.ALIGN_GOOD) {
            this.populateWithHumans(level, levelConf);
        }
        else if (alignment === RG.ALIGN_EVIL) {
            this.populateWithEvil(level, levelConf);
        }
        else {
            this.populateWithNeutral(level, levelConf);
        }
    };

    /* Adds items to the city level in a reasonable way. */
    this.addItemsToCityLevel = function(level, levelConf) {
        const map = level.getMap();
        const floorCells = map.getCells(cell => (
            cell.getBaseElem().getType() === 'floorhouse'
        ));
        const factItem = new RG.Factory.Item();
        const parser = RG.ObjectShell.getParser();
        const itemConf = {
            func: item => item.value <= (levelConf.maxDanger * 10),
            maxValue: levelConf.maxDanger * 50
        };
        if (!RG.isNullOrUndef([levelConf.itemsPerLevel])) {
            itemConf.itemsPerLevel = levelConf.itemsPerLevel;
        }

        factItem.addItemsToCells(level, parser, floorCells, itemConf);
    };

    this.populateWithHumans = function(level, levelConf) {
        const actorConf = {
            actorsPerLevel: levelConf.actorsPerLevel || 100,
            maxDanger: levelConf.maxDanger || 10,
            func: actor => (
                actor.type === 'human' &&
                actor.name !== 'shopkeeper'
            )
        };
        if (levelConf.func) {actorConf.func = levelConf.func;}
        this.addNRandActors(level, _parser, actorConf);
    };

    this.populateWithEvil = function(level, levelConf) {
        let allOK = false;
        while (!allOK) {
            const raceType = RG.RAND.arrayGetRand(RG.EVIL_RACES);
            const actorConf = {
                actorsPerLevel: levelConf.actorsPerLevel || 100,
                maxDanger: levelConf.maxDanger || 10,
                func: actor => (
                    actor.type === raceType
                )
            };
            if (levelConf.func) {actorConf.func = levelConf.func;}
            allOK = this.addNRandActors(level, _parser, actorConf);
        }
    };

    this.populateWithNeutral = function(level, levelConf) {
        const raceType = RG.RAND.arrayGetRand(RG.NEUTRAL_RACES);
        const actorConf = {
            actorsPerLevel: levelConf.actorsPerLevel || 100,
            maxDanger: levelConf.maxDanger || 10,
            func: actor => (
                actor.type === raceType
            )
        };
        if (levelConf.func) {actorConf.func = levelConf.func;}
        this.addNRandActors(level, _parser, actorConf);
    };

    this.addActorToLevel = (actorName, level) => {
        const actor = _parser.createActor(actorName);
        const cell = level.getFreeRandCell();
        level.addActor(actor, cell.getX(), cell.getY());
    };

};
RG.extend2(RG.Factory.Zone, RG.Factory.Base);

/* Factory object for creating worlds and zones. Uses conf object which is
 * somewhat involved. For an example, see ../data/conf.world.js. This Factory
 * does not have any procedural generation. The configuration object can be
 * generated procedurally, and the factory will then use the configuration for
 * building the world. Separation of concerns, you know.
 */
RG.Factory.World = function() {
    const _verif = new RG.Verify.Conf('Factory.World');
    this.factZone = new RG.Factory.Zone();

    // Creates all zones when the area is created if true. Setting it to true
    // makes creation of game very slow, as the full game is built in one go
    this.createAllZones = true;
    this.worldElemByID = {}; // Stores world elements by ID

    // Used for generating levels, if more specific settings not given
    this.globalConf = {
        dungeonX: RG.LEVEL_MEDIUM_X,
        dungeonY: RG.LEVEL_MEDIUM_Y
    };

    this.presetLevels = {};

    this.scope = []; // Keeps track of hierarchical names of places
    this.confStack = [];

    // Can be used to pass already created levels to different zones. For
    // example, after restore game, no new levels should be created
    this.id2level = {};
    this.id2levelSet = false;

    //----------------------------------------------------------------------
    // FUNCTIONS
    //----------------------------------------------------------------------

    this.setPresetLevels = function(levels) {
        this.presetLevels = levels;
    };

    /* If id2level is set, factory does not construct any levels. It uses
     * id2level as a lookup table instead. This is mainly used when restoring a
     * saved game. */
    this.setId2Level = function(id2level) {
        this.id2level = id2level;
        this.id2levelSet = true;
    };

    /* Pushes the hier name and configuration on the stack. Config can be
    * queried with getConf(). */
    this.pushScope = function(conf) {
        this.scope.push(conf.name);
        this.confStack.push(conf);
    };

    /* Removes given config and the name it contains from stacks. Reports an
    * error if removed name does not match the name in conf. */
    this.popScope = function(conf) {
        const name = conf.name;
        const poppedName = this.scope.pop();
        if (poppedName !== name) {
            RG.err('Factory.World', 'popScope',
                `Popped: ${poppedName}, Expected: ${name}`);
        }
        else {
            const currConf = this.confStack.pop();
            this.debug('Popped scope: ' + currConf.name);
        }
    };

    /* Initializes the global configuration such as level size. */
    this.setGlobalConf = function(conf) {
        const levelSize = conf.levelSize || 'Medium';
        const sqrPerActor = conf.sqrPerActor || RG.ACTOR_MEDIUM_SQR;
        this.globalConf.levelSize = levelSize;
        this.globalConf.dungeonX = levelSizes.dungeon[levelSize].x;
        this.globalConf.dungeonY = levelSizes.dungeon[levelSize].y;
        this.globalConf.sqrPerActor = sqrPerActor;
        this.globalConf.sqrPerItem = conf.sqrPerItem || RG.LOOT_MEDIUM_SQR;
        this.globalConf.set = true;
        this.debug('globalConf set to ' + JSON.stringify(this.globalConf));
    };

    /* Returns a config value. */
    this.getConf = function(keys) {
        // First travel the config stack from the top
        for (let i = this.confStack.length - 1; i >= 0; i--) {
            if (this.confStack[i].hasOwnProperty(keys)) {
                return this.confStack[i][keys];
            }
        }

        // If nothing found, try the global configuration
        if (this.globalConf.hasOwnProperty(keys)) {
            return this.globalConf[keys];
        }

        return null;
    };

    /* Returns the full hierarchical name of the zone. */
    this.getHierName = () => this.scope.join('.');

    /* Creates a world using given configuration. */
    this.createWorld = function(conf) {
        _verif.verifyConf('createWorld', conf, ['name', 'nAreas']);
        if (!this.globalConf.set) {
            this.setGlobalConf({});
        }
        if (conf.hasOwnProperty('createAllZones')) {
            this.createAllZones = conf.createAllZones;
            debug('createAllZones set to ' + this.createAllZones);
        }
        this.pushScope(conf);
        const world = new RG.World.Top(conf.name);
        world.setConf(conf);
        for (let i = 0; i < conf.nAreas; i++) {
            const areaConf = conf.area[i];
            const area = this.createArea(areaConf);
            if (areaConf.zonesCreated) { // Only during restore game
                this.restoreCreatedZones(world, area, areaConf);
            }
            world.addArea(area);
            this.addWorldID(areaConf, area);
        }
        this.popScope(conf);
        this.addWorldID(conf, world);
        return world;
    };

    /* Creates an area which can be added to a world. */
    this.createArea = function(conf) {
        _verif.verifyConf('createArea', conf,
            ['name', 'maxX', 'maxY']);
        this.pushScope(conf);

        const hierName = this.getHierName();

        let areaLevels = null;
        let needsConnect = false;
        if (this.id2levelSet) {
            areaLevels = this.getAreaLevels(conf);
        }
        else {
            areaLevels = this.getPresetLevels(hierName);
            if (areaLevels.length === 0) {
                areaLevels = null;
            }
            else {
                needsConnect = true;
            }
        }

        const area = new RG.World.Area(conf.name, conf.maxX, conf.maxY,
            conf.cols, conf.rows, areaLevels);
        area.setConf(conf);
        if (needsConnect) {
            area.connectTiles();
        }
        area.setHierName(this.getHierName());

        // When player enters a given area tile, create zones for that tile
        if (this.createAllZones) {
            this._createAllZones(area, conf);
            area.markAllZonesCreated();
        }
        else {
            debug('Skipping the zone creating due to createZones=false');
        }
        this.popScope(conf);
        return area;
    };

    this.restoreCreatedZones = (world, area, areaConf) => {
        Object.keys(areaConf.zonesCreated).forEach(xy => {
            const [xStr, yStr] = xy.split(',');
            const [x, y] = [parseInt(xStr, 10), parseInt(yStr, 10)];
            if (areaConf.zonesCreated[xy]) {
                debug(`\tRestoring created zones for tile ${x},${y}`);
                this.createZonesForTile(world, area, x, y);
            }
        });
    };

    /* Creates zones for given area tile x,y with located in area areaName. */
    this.createZonesForTile = function(world, area, x, y) {
        // Setup the scope & conf stacks
        if (!area.tileHasZonesCreated(x, y)) {
            const worldConf = world.getConf();
            this.pushScope(worldConf);
            const areaConf = area.getConf();
            this.pushScope(areaConf);

            this._createAllZones(area, areaConf, x, y);
            area.markTileZonesCreated(x, y);

            // Cleanup the scope & conf stacks
            this.popScope(areaConf);
            this.popScope(worldConf);
        }
    };

    this._createAllZones = function(area, conf, tx = -1, ty = -1) {
        const types = ['City', 'Mountain', 'Dungeon'];
        debug(`Factory _createAllZones ${tx}, ${ty}`);
        types.forEach(type => {
            const typeLc = type.toLowerCase();
            let nZones = 0;
            if (Array.isArray(conf[typeLc])) {
                nZones = conf[typeLc].length;
            }
            debug(`\tnZones (${type}) is now ${nZones}`);
            for (let i = 0; i < nZones; i++) {
                const zoneConf = conf[typeLc][i];
                const createFunc = 'create' + type;
                const {x, y} = zoneConf;

                // If tx,ty given, create only zones for tile tx,ty
                // Otherwise, create zones for all tiles
                if ((tx === -1 || tx === x) && (ty === -1 || ty === y)) {
                    const zone = this[createFunc](zoneConf);
                    zone.setTileXY(x, y);
                    area.addZone(type, zone);
                    this.addWorldID(zoneConf, zone);
                    if (!this.id2levelSet) {
                        this.createAreaZoneConnection(area, zone, zoneConf);
                    }
                }
            }

        });
    };

    /* Used when creating area from existing levels. Uses id2level lookup table
     * to construct 2-d array of levels.*/
    this.getAreaLevels = function(conf) {
        const levels = [];
        if (conf.tiles) {
            conf.tiles.forEach(tileCol => {
                const levelCol = [];
                tileCol.forEach(tile => {
                    const level = this.id2level[tile.level];
                    if (level) {
                        levelCol.push(level);
                    }
                    else {
                        RG.err('Factory.World', 'getAreaLevels',
                            `No level ID ${tile.level} in id2level`);
                    }
                });
                levels.push(levelCol);
            });
        }
        else {
            RG.err('Factory.World', 'getAreaLevels',
                'conf.tiles null/undefined, but id2levelSet true');

        }
        return levels;
    };

    this.createDungeon = function(conf) {
        _verif.verifyConf('createDungeon', conf,
            ['name', 'nBranches']);
        this.pushScope(conf);

        const dungeon = new RG.World.Dungeon(conf.name);
        dungeon.setHierName(this.getHierName());

        if (conf.nBranches !== conf.branch.length) {
            const len = conf.branch.length;
            RG.err('Factory.World', 'createDungeon',
                `Branch number mismatch [] = ${len}, n: ${conf.nBranches}`);
        }

        for (let i = 0; i < conf.nBranches; i++) {
            const branchConf = conf.branch[i];
            const branch = this.createBranch(branchConf);
            dungeon.addBranch(branch);
            this.addWorldID(branchConf, branch);
        }

        if (conf.entrance) {
            dungeon.setEntrance(conf.entrance);
        }

        // Connect branches according to configuration
        if (!this.id2levelSet) {
            if (conf.nBranches > 1) {
                if (conf.connectLevels) {
                    conf.connectLevels.forEach(conn => {
                        if (conn.length === 4) {
                            // conn has len 4, spread it out
                            dungeon.connectSubZones(...conn);
                        }
                        else {
                            RG.err('Factory.World', 'createDungeon',
                                'Each connection.length must be 4.');
                        }
                    });
                }
                else {
                    RG.err('Factory.World', 'createDungeon',
                        'nBranches > 1, but no conf.connectLevels.');
                }
            }
        }

        this.popScope(conf);
        return dungeon;
    };

    /* Creates one dungeon branch and all levels inside it. */
    this.createBranch = function(conf) {
        _verif.verifyConf('createBranch', conf,
            ['name', 'nLevels']);
        this.pushScope(conf);

        const branch = new RG.World.Branch(conf.name);
        const hierName = this.getHierName();
        branch.setHierName(hierName);

        const presetLevels = this.getPresetLevels(hierName);

        for (let i = 0; i < conf.nLevels; i++) {
            const maxDanger = this.getConf('maxDanger');
            const maxValue = this.getConf('maxValue');

            const levelConf = {
                x: this.getConf('dungeonX'),
                y: this.getConf('dungeonY'),
                sqrPerActor: this.getConf('sqrPerActor'),
                sqrPerItem: this.getConf('sqrPerItem'),
                maxValue: maxValue || 20 * (i + 1),
                maxDanger: maxDanger || 2,
                nLevel: i
            };

            const dungeonType = this.getConf('dungeonType');
            if (dungeonType) {
                levelConf.dungeonType = dungeonType;
            }

            this.setLevelConstraints(levelConf);

            // First try to find a preset level
            let level = this.getFromPresetLevels(i, presetLevels);

            // If preset not found, either restore or create a new one
            if (!level) {
                if (conf.levels) { // Restore level
                    level = this.id2level[conf.levels[i]];
                }
                else {
                    level = this.factZone.createDungeonLevel(levelConf);
                    // For creating 'fixed' items and actors
                    this.addFixedFeatures(i, level, branch);
                    if (i === (conf.nLevels - 1)) {
                        this.addLastLevelFeatures(i, level, levelConf);
                    }
                }
            }

            branch.addLevel(level);
        }

        // Do connecting only if not restoring the branch
        if (!this.id2levelSet) {
            branch.connectLevels();
            if (conf.hasOwnProperty('entranceLevel')) {
                branch.addEntrance(conf.entranceLevel);
            }
        }
        else if (conf.hasOwnProperty('entrance')) {
            branch.setEntranceLocation(conf.entrance);
        }

        this.popScope(conf);
        return branch;
    };

    /* Returns a level from presetLevels if any exist for the current level
     * number. */
    this.getFromPresetLevels = function(i, presetLevels) {
        let level = null;
        if (presetLevels.length > 0) {
            const levelObj = presetLevels.find(lv => lv.nLevel === i);
            if (levelObj) {
                level = levelObj.level;
            }
        }
        return level;
    };

    const _errorOnFunc = val => {
        if (typeof val === 'function') {
            RG.err('Factory', '_errorOnFunc',
                `Function constraint not supported anymore: ${val.toString}`);
        }
    };

    /* Sets the randomization constraints for the level based on current
     * configuration. */
    this.setLevelConstraints = function(levelConf) {
        const constraint = this.getConf('constraint');
        const constrFact = new Constraints();
        if (constraint) {
            const hierName = this.getHierName();
            if (constraint.actor) {
                _errorOnFunc(constraint.actor);
                levelConf.actor = constrFact.getConstraints(constraint.actor);
                const str = constraint.actor.toString();
                debug(`Found actor constraint for ${hierName}: ${str}`);
            }
            if (constraint.item) {
                _errorOnFunc(constraint.item);
                levelConf.item = constrFact.getConstraints(constraint.item);
                const str = constraint.item.toString();
                debug(`Found item constraint for ${hierName}: ${str}`);
            }
            if (constraint.food) {
                _errorOnFunc(constraint.food);
                levelConf.food = constrFact.getConstraints(constraint.food);
                const str = constraint.food.toString();
                debug(`Found food constraint for ${hierName}: ${str}`);
            }
            if (constraint.gold) {
                _errorOnFunc(constraint.gold);
                levelConf.gold = constrFact.getConstraints(constraint.gold);
                const str = constraint.gold.toString();
                debug(`Found gold constraint for ${hierName}: ${str}`);
            }
            if (constraint.shop) {
                const shopFunc = [];
                constraint.shop.forEach(con => {
                    shopFunc.push(constrFact.getConstraints(con));
                });
                levelConf.shopFunc = shopFunc;
                const str = JSON.stringify(constraint.shop);
                debug(`Found shop constraint for ${hierName}: ${str}`);
            }
        }

        const groupType = this.getConf('groupType');
        const cityType = this.getConf('cityType');
        const quarterType = this.getConf('quarterType');
        const alignment = this.getConf('alignment');
        const wallType = this.getConf('wallType');
        const floorType = this.getConf('floorType');
        if (groupType) {levelConf.groupType = groupType;}
        if (cityType) {levelConf.cityType = cityType;}
        if (quarterType) {levelConf.cityType = quarterType;}
        if (alignment) {levelConf.alignment = alignment;}
        if (wallType) {levelConf.wallType = wallType;}
        if (floorType) {levelConf.floorType = floorType;}
    };

    /* Adds fixed features such as stairs, actors and items into the level. */
    this.addFixedFeatures = function(nLevel, level, zone) {
        const create = this.getConf('create');

        // Actor creation
        if (create && create.actor) {
            const createActors = create.actor;
            createActors.forEach(createActor => {
                if (createActor.nLevel === nLevel) {
                    const actorName = createActor.name;
                    if (createActor.hasOwnProperty('target') &&
                        zone.getName() === createActor.target) {
                        this.factZone.addActorToLevel(actorName, level);
                    }
                    else {
                        this.factZone.addActorToLevel(actorName, level);
                    }
                }
            });
        }

        // Stairs creation
        if (create && create.stairs) {
            const createStairs = create.stairs;
            createStairs.forEach(sConf => {
                if (sConf.nLevel === nLevel) {
                    const {x, y, isDown} = sConf;
                    const name = isDown ? 'stairsDown' : 'stairsUp';
                    const stairs = new Stairs(name, level);
                    level.addStairs(stairs, x, y);
                }
            });
        }
    };

    /* Adds special features to the last level of the zone. */
    this.addLastLevelFeatures = function(nLevel, level, conf) {
        const exploreElem = new RG.Element.Exploration();
        const expPoints = 10 * (nLevel + 1) * conf.maxDanger;
        exploreElem.setExp(expPoints);
        level.addElement(exploreElem);

        const parser = RG.ObjectShell.getParser();
        const bossDanger = conf.maxDanger + 2;
        const bossActor = parser.createRandomActor(
            {func: actor => (
                actor.danger <= bossDanger && actor.danger >= conf.maxDanger
            )}
        );
        if (bossActor) {
            level.addActorToFreeCell(bossActor);

            const prizeValue = conf.maxValue * 2;
            const prizeItem = parser.createRandomItem(
                {func: item => item.value <= prizeValue}
            );
            bossActor.getInvEq().addItem(prizeItem);
        }
        else {
            let msg = `Failed to created boss. nLevel: ${nLevel}`;
            msg += ` Level parent: ${level.getParent()}`;
            RG.debug({}, msg);
        }

    };

    /* Returns preset levels (if any) for the current zone. */
    this.getPresetLevels = function(hierName) {

        // First check the configuration
        const presetLevels = this.getConf('presetLevels');
        if (presetLevels) {
            const names = Object.keys(presetLevels);
            foundKey = names.find(item => {
                return new RegExp(item + '$').test(hierName);
            });
            if (foundKey) {
                return presetLevels[foundKey];
            }
        }

        // Then check the global preset levels
        const keys = Object.keys(this.presetLevels);
        let foundKey = keys.find(item => new RegExp(item + '$').test(hierName));
        if (foundKey) {
            return this.presetLevels[foundKey];
        }

        return [];
    };

    this.createMountain = function(conf) {
        _verif.verifyConf('createMountain', conf, ['name', 'nFaces']);
        this.pushScope(conf);

        const mountain = new RG.World.Mountain(conf.name);
        mountain.setHierName(this.getHierName());

        if (conf.nFaces !== conf.face.length) {
            const len = conf.face.length;
            RG.err('Factory.World', 'createMountain',
                `Face number mismatch [] = ${len}, n: ${conf.nFaces}`);
        }

        for (let i = 0; i < conf.nFaces; i++) {
            const faceConf = conf.face[i];
            const mountainFace = this.createMountainFace(faceConf);
            mountain.addSubZone(mountainFace);
            this.addWorldID(faceConf, mountainFace);
        }

        if (!this.id2levelSet) {
            if (conf.nFaces > 1) {
                if (conf.connectLevels) {
                    conf.connectLevels.forEach(conn => {
                        if (conn.length === 4) {
                            // conn has len 4, spread it out
                            mountain.connectSubZones(...conn);
                        }
                        else {
                            RG.err('Factory.World', 'createMountain',
                                'Each connection.length must be 4.');
                        }
                    });

                    // TODO verify that levels are passable
                }
                else {
                    RG.err('Factory.World', 'createMountain',
                        'nFaces > 1, but no conf.connectLevels.');
                }
            }
        }

        this.popScope(conf);
        return mountain;
    };

    this.createMountainFace = function(conf) {
        if (this.id2levelSet) {
            _verif.verifyConf('createMountainFace', conf, ['name', 'nLevels']);
        }
        else {
            _verif.verifyConf('createMountainFace',
                conf, ['name', 'nLevels', 'x', 'y']);
        }

        const faceName = conf.name;
        this.pushScope(conf);
        const face = new RG.World.MountainFace(faceName);
        const mLevelConf = { x: conf.x, y: conf.y};

        this.setLevelConstraints(mLevelConf);

        for (let i = 0; i < conf.nLevels; i++) {
            let level = null;
            if (!this.id2levelSet) {
                level = this.factZone.createMountainLevel(mLevelConf);
            }
            else {
                const id = conf.levels[i];
                level = this.id2level[id];
            }
            face.addLevel(level);
        }

        if (conf.hasOwnProperty('entranceLevel')) {
            face.addEntrance(conf.entranceLevel);
        }
        else if (conf.hasOwnProperty('entrance')) {
            face.setEntranceLocation(conf.entrance);
        }

        this.popScope(conf);
        return face;
    };

    /* Creates a City and all its sub-zones. */
    this.createCity = function(conf) {
        _verif.verifyConf('createCity',
            conf, ['name', 'nQuarters']);
        this.pushScope(conf);

        const city = new RG.World.City(conf.name);
        city.setHierName(this.getHierName());

        if (conf.nQuarters !== conf.quarter.length) {
            const len = conf.quarter.length;
            RG.err('Factory.World', 'createCity',
                `Quarter number mismatch [] = ${len}, n: ${conf.nQuarters}`);
        }

        for (let i = 0; i < conf.nQuarters; i++) {
            const qConf = conf.quarter[i];
            const quarter = this.createCityQuarter(qConf);
            city.addSubZone(quarter);
            this.addWorldID(qConf, quarter);
        }

        // Connect city quarters according to configuration
        if (!this.id2levelSet) {
            if (conf.nQuarters > 1) {
                if (conf.connectLevels) {
                    conf.connectLevels.forEach(conn => {
                        if (conn.length === 4) {
                            // conn has len 4, spread it out
                            // city.connectSubZones(...conn);
                            city.abutQuarters(...conn);
                        }
                        else {
                            RG.err('Factory.World', 'createCity',
                                'Each connection.length must be 4.');
                        }
                    });
                }
                else {
                    RG.err('Factory.World', 'createCity',
                        'nQuarters > 1, but no conf.connectLevels.');
                }
            }
        }

        this.popScope(conf);
        return city;
    };

    /* Createa CityQuarter which can be added to a city. */
    this.createCityQuarter = function(conf) {
        _verif.verifyConf('createCityQuarter',
            conf, ['name', 'nLevels']);
        this.pushScope(conf);

        const quarter = new RG.World.CityQuarter(conf.name);
        const hierName = this.getHierName();
        quarter.setHierName(hierName);

        const presetLevels = this.getPresetLevels(hierName);

        // const randType = RG.RAND.arrayGetRand(RG.SHOP_TYPES);
        const cityLevelConf = {
            x: conf.x || 80, y: conf.y || 40,
            nShops: conf.nShops || 1,
            shopFunc: conf.shop ||
                [item => (item.value <= (50 + 50 * conf.nLevels))]
        };
        if (conf.nShops === 0) {cityLevelConf.nShops = 0;}

        // This bunch of data must be passed in conf because featFact does not
        // have access to it via getConf
        this.setLevelConstraints(cityLevelConf);

        for (let i = 0; i < conf.nLevels; i++) {
            let level = this.getFromPresetLevels(i, presetLevels);

            if (!level) {

                if (!this.id2levelSet) {
                    level = this.factZone.createCityLevel(i, cityLevelConf);
                    this.addFixedFeatures(i, level, quarter);
                }
                else {
                    const id = conf.levels[i];
                    level = this.id2level[id];
                }
            }
            else if (level.stub) {
                const levelFact = new LevelFactory(this);
                level = levelFact.create(level.new, level.args);
                if (!level) {
                    RG.err('Factory', 'createCityQuarter',
                        'Stub found but cannot create level');
                }
               debug('Creating level from stub ' + JSON.stringify(level.stub));
            }
            else {
                debug(`cityQuarter ${hierName} ${i} from preset level`);
            }

            // Need to add the shops to the quarter
            if (!this.id2levelSet) {
                if (level.shops) {
                    level.shops.forEach(shop => {
                        quarter.addShop(shop);
                    });
                }
            }
            quarter.addLevel(level);
        }

        if (!this.id2levelSet) {
            quarter.connectLevels();
        }

        if (conf.hasOwnProperty('entranceLevel')) {
            quarter.addEntrance(conf.entranceLevel);
        }
        else if (conf.hasOwnProperty('entrance')) {
            quarter.setEntranceLocation(conf.entrance);
        }
        this.popScope(conf);
        return quarter;
    };

    /* Creates a connection between an area and a zone such as city, mountain
     * or dungeon. Unless configured, connects the zone entrance to a random
     * location in the area. */
    this.createAreaZoneConnection = (area, zone, conf) => {
        _verif.verifyConf('createAreaZoneConnection', conf, ['x', 'y']);
        this.debug('Creating area-zone connections');

        const x = conf.x;
        const y = conf.y;
        const tile = area.getTileXY(x, y);
        const tileLevel = tile.getLevel();

        let tileStairsX = -1;
        let tileStairsY = -1;

        if (RG.isNullOrUndef([conf.levelX, conf.levelY])) {
            const freeAreaCell = tileLevel.getEmptyRandCell();
            tileStairsX = freeAreaCell.getX();
            tileStairsY = freeAreaCell.getY();
        }
        else {
            tileStairsX = conf.levelX;
            tileStairsY = conf.levelY;
        }

        if (typeof zone.getEntrances === 'function') {
            const entrances = zone.getEntrances();
            if (entrances.length > 0) {
                let entryStairs = entrances[0];
                const entryLevel = entryStairs.getSrcLevel();
                const zoneType = zone.getType();

                this.debug('Connecting area-zone by entrance');

                let conns = null;
                if (zoneType === 'city' || zoneType === 'mountain') {

                    if (debug.enabled) {
                        conns = entryLevel.getConnections();
                        this.debug(`conn length before: ${conns.length}`);
                    }

                    const zoneStairs = this.createNewZoneConnects(zone,
                        entryLevel);
                    // Connection OK, remove the stairs, otherwise use the
                    // existing entrance
                    if (zoneStairs.length > 0) {
                        const sX = entryStairs.getX();
                        const sY = entryStairs.getY();
                        if (entryLevel.removeElement(entryStairs, sX, sY)) {
                            entryStairs = zoneStairs;
                        }
                        else {
                            RG.err('Factory.World', 'createAreaZoneConnection',
                                'Cannot remove entryStairs');
                        }
                    }
                }

                let name = '';
                if (zoneType === 'city') {name = 'town';}
                else if (zoneType === 'mountain') {name = 'mountain';}
                else {
                    const isDown = !entryStairs.isDown();
                    name = isDown ? 'stairsDown' : 'stairsUp';
                }

                const tileStairs = new Stairs(name, tileLevel, entryLevel);
                tileLevel.addStairs(tileStairs, tileStairsX, tileStairsY);
                tileStairs.connect(entryStairs);

                if (debug.enabled && zoneType === 'city') {
                    conns = entryLevel.getConnections();
                    const jsonStr = JSON.stringify(conns, null, 1);
                    this.debug(jsonStr);
                    this.debug(`conn length after: ${conns.length}`);
                }
            }
            else if (!conf.hasOwnProperty('connectToAreaXY')) {
                const msg = `No entrances in ${zone.getHierName()}.`;
                RG.err('Factory.World', 'createAreaZoneConnection',
                    `${msg}. Cannot connect to tile.`);
            }
        }
        else { // No entrance for zone, error out
            RG.err('Factory.World', 'createAreaZoneConnection',
                'No getEntrances method for zone.');
        }

        // Make extra connections between the area and zone. This is useful
        // if city/dungeon needs to have 2 or more entrances
        if (conf.hasOwnProperty('connectToXY')) {
            // Obsolete feature
            RG.err('Factory.World', 'createAreaZoneConnection',
              'Deprecated! connectToXY not supported. Use connectToAreaXY');
        }
        else if (conf.hasOwnProperty('connectToAreaXY')) {
            const connectionsXY = conf.connectToAreaXY;
            connectionsXY.forEach(conn => {
                this.processConnObject(conn, zone, tileLevel);
            });
        }

    };


    /* Processes each 'connectToAreaXY' object. Requires current zone and tile
     * level we are connecting to. Connection type depends on the type of zone.
     */
    this.processConnObject = (conn, zone, tileLevel) => {
        const nLevel = conn.nLevel;
        const x = conn.levelX;
        const y = conn.levelY;
        const name = conn.name;
        this.debug(`Processing connection obj ${name}: ${x},${y}`);

        const zoneLevel = zone.findLevel(name, nLevel);
        if (zoneLevel) {

            // Create new stairs for zone, unless connect obj has stairs
            // property.
            let zoneStairs = conn.stairs || null;

            // zoneStairs is either Element.Stairs or object telling
            // where stairs are found
            if (zoneStairs && !RG.isNullOrUndef([zoneStairs.getStairs])) {
                const stairsIndex = zoneStairs.getStairs;
                zoneStairs = zoneLevel.getStairs()[stairsIndex];
                if (!zoneStairs) {
                    RG.err('xxx', 'yyy', 'kkk');
                }
                else {
                    this.debug('conn found via getStairs connObject');
                }
            }

            if (!zoneStairs) {
                zoneStairs = this.createNewZoneConnects(zone, zoneLevel);
            }
            else if (typeof zoneStairs.getSrcLevel !== 'function') {
                const json = JSON.stringify(zoneStairs);
                RG.err('Factory.World', 'createAreaZoneConnection',
                    `zoneStairs not a proper stairs object ${json}`);
            }

            // Create stairs for tileLevel and connect them to the zone
            // stairs
            let name = 'stairsDown'; // Default for dungeon
            if (zone.getType() === 'city') {name = 'town';}
            else if (zone.getType() === 'mountain') {name = 'mountain';}
            const tileStairs = new Stairs(name, tileLevel, zoneLevel);
            tileLevel.addStairs(tileStairs, x, y);

            // zoneStairs can be either a single connection or an array of
            // connections (for example for a city)
            try {
                tileStairs.connect(zoneStairs);
            }
            catch (e) {
                console.error(e);
                const jsonStr = JSON.stringify(zoneLevel, null, 1);
                let msg = `zoneLevel: ${jsonStr}`;
                msg += `\n\tzoneStairs: ${JSON.stringify(zoneStairs)}`;
                RG.err('Factory.World', 'createAreaZoneConnection',
                    msg);
            }
        }
        else {
            let msg = `connectToAreaXY: ${JSON.stringify(conn)}`;
            msg += `zone: ${JSON.stringify(zone)}`;
            RG.err('Factory.World', 'createAreaZoneConnection',
                `No level found. ${msg}`);
        }

    };

    /* Creates the actual connection objects such as stairs or passages, and
     * adds them into the zone level. Returns the created objects for connecting
     * them into the tile level. */
    this.createNewZoneConnects = (zone, zoneLevel) => {
        let zoneStairs = null;
        if (zone.getType() === 'dungeon') {
            this.debug('Creating dungeon connection');
            const freeCell = zoneLevel.getFreeRandCell();
            const zoneX = freeCell.getX();
            const zoneY = freeCell.getY();
            zoneStairs = new Stairs('stairsUp', zoneLevel);
            zoneLevel.addStairs(zoneStairs, zoneX, zoneY);
        }
        else if (zone.getType() === 'city') {
            this.debug('Creating new city edge connection');
            let allEdgeExits = [];
            RG.CARDINAL_DIR.forEach(dir => {
                if (!RG.World.edgeHasConnections(zoneLevel, dir)) {
                    const exits = RG.World.addExitsToEdge(zoneLevel,
                        'passage', dir);
                    if (exits.length > 0) {
                        allEdgeExits = allEdgeExits.concat(exits);
                    }
                }
            });
            zoneStairs = allEdgeExits;
            // Connection failed, resort to single point connection
            if (zoneStairs.length === 0) {
                zoneLevel.getMap().debugPrintInASCII();

                // XXX this one is shaky
                const freeCell = zoneLevel.getFreeRandCell();
                const zoneX = freeCell.getX();
                const zoneY = freeCell.getY();
                zoneStairs = new Stairs('stairsUp', zoneLevel);
                zoneLevel.addStairs(zoneStairs, zoneX, zoneY);
                zoneStairs = [zoneStairs];

                this.debug('City edge connection failed. Added stairs');
            }
        }
        else if (zone.getType() === 'mountain') {
            this.debug('Creating new mountain south connection');
            zoneStairs = RG.World.addExitsToEdge(zoneLevel,
                'passage', 'south', true);
        }
        return zoneStairs;
    };

    this.addWorldID = function(conf, worldElem) {
      if (!RG.isNullOrUndef([conf.id])) {
          worldElem.setID(conf.id);
      }
      this.worldElemByID[worldElem.getID()] = worldElem;
    };

    this.debug = msg => {
        if (debug.enabled) {
            const scope = this.getHierName();
            debug(`|${scope}| ${msg}`);
        }
    };
};

module.exports = RG.Factory;

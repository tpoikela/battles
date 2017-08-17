
const RG = require('./rg.js');
const debug = require('debug')('bitn:factory');

RG.Component = require('./component.js');
RG.Brain = require('./brain.js');
RG.Map = require('./map.js');
RG.Map.Generator = require('./map.generator');

const RGObjects = require('../data/battles_objects.js');
RG.Effects = require('../data/effects.js');

const Stairs = RG.Element.Stairs;

RG.Factory = {};

/* Returns a basic configuration for a city level. */
RG.Factory.cityConfBase = function(conf) {
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


//---------------------------------------------------------------------------
// FACTORY OBJECTS
//---------------------------------------------------------------------------


/* This object is used to randomize item properties during procedural
 * generation.*/
RG.Factory.ItemRandomizer = function() {

    /* Only public function. All logic is deferred to private functions.
     * Adjusts the properties of given item, based also on maxValue.*/
    this.adjustItem = function(item, val) {
        const itemType = item.getType();
        if (_adjustFunctions.hasOwnProperty(itemType)) {
            _adjustFunctions[itemType](item, val);
        }
    };

    /* Distr. of food weights.*/
    const _foodWeights = RG.getFoodWeightDistr();

    const _adjustFoodItem = function(food) {
        const weight = RG.RAND.getWeighted(_foodWeights);
        food.setWeight(weight);
    };

    const _adjustGoldCoin = function(gold, nLevel) {
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

    const _adjustMissile = function(missile, nLevel) {
        if (!RG.isNullOrUndef([nLevel])) {
            // TODO use distribution to generate the count
            missile.setCount(10);
        }
        else {
            RG.err('Factory.ItemRandomizer', '_adjustMissile',
                'nLevel is not defined.');
        }
    };

    /* LUT for functions to call on specific items.*/
    const _adjustFunctions = {
        food: _adjustFoodItem,
        goldcoin: _adjustGoldCoin,
        missile: _adjustMissile
    };

};

/* Factory object for creating some commonly used objects. Because this is a
* global object RG.FACT, no state should be used. */
RG.Factory.Base = function() { // {{{2
    const _verif = new RG.Verify.Conf('Factory.Base');
    const _itemRandomizer = new RG.Factory.ItemRandomizer();

    const _initCombatant = function(comb, obj) {
        const hp = obj.hp;
        const att = obj.att;
        const def = obj.def;
        const prot = obj.prot;

        if (!RG.isNullOrUndef([hp])) {
            comb.add('Health', new RG.Component.Health(hp));
        }
        const combatComp = new RG.Component.Combat();

        if (!RG.isNullOrUndef([att])) {combatComp.setAttack(att);}
        if (!RG.isNullOrUndef([def])) {combatComp.setDefense(def);}
        if (!RG.isNullOrUndef([prot])) {combatComp.setProtection(prot);}

        comb.add('Combat', combatComp);
    };

    /* Creates a new die object from array or die expression '2d4 + 3' etc.*/
    this.createDie = function(strOrArray) {
        const numDiceMod = RG.parseDieSpec(strOrArray);
        if (numDiceMod.length === 3) {
            return new RG.Die(numDiceMod[0], numDiceMod[1], numDiceMod[2]);
        }
        return null;
    };

    /* Factory method for players.*/
    this.createPlayer = function(name, obj) {
        const player = new RG.Actor.Rogue(name);
        player.setIsPlayer(true);
        _initCombatant(player, obj);
        return player;
    };

    /* Factory method for monsters.*/
    this.createActor = function(name, obj) {
        const monster = new RG.Actor.Rogue(name);
        monster.setType(name);
        if (RG.isNullOrUndef([obj])) {obj = {};}

        const brain = obj.brain;
        _initCombatant(monster, obj);
        if (!RG.isNullOrUndef([brain])) {
            if (typeof brain === 'object') {
                monster.setBrain(brain);
            }
            else { // If brain is string, use factory to create a new one
                const newBrain = this.createBrain(monster, brain);
                monster.setBrain(newBrain);
            }
        }
        return monster;
    };

    /* Factory method for AI brain creation.*/
    this.createBrain = function(actor, brainName) {
        switch (brainName) {
            case 'Animal': return new RG.Brain.Animal(actor);
            case 'Archer': return new RG.Brain.Archer(actor);
            case 'Demon': return new RG.Brain.Demon(actor);
            // case 'Goblin': return new RG.Brain.Goblin(actor);
            case 'Human': return new RG.Brain.Human(actor);
            case 'Summoner': return new RG.Brain.Summoner(actor);
            case 'Undead': return new RG.Brain.Undead(actor);
            case 'Zombie': return new RG.Brain.Zombie(actor);
            default: return new RG.Brain.Rogue(actor);
        }
    };

    this.createElement = function(elemType) {
        switch (elemType) {
            case 'chasm': return RG.CHASM_ELEM;
            case 'door' : return new RG.Element.Door(true);
            case 'floor': return RG.FLOOR_ELEM;
            case 'floorcave': return RG.FLOOR_CAVE_ELEM;
            case 'floorcrypt': return RG.FLOOR_CRYPT_ELEM;
            case 'grass': return RG.GRASS_ELEM;
            case 'highrock': return RG.HIGH_ROCK_ELEM;
            case 'opendoor' : return new RG.Element.Door(false);
            case 'snow': return RG.SNOW_ELEM;
            case 'stone': return RG.STONE_ELEM;
            case 'tree': return RG.TREE_ELEM;
            case 'wall': return RG.WALL_ELEM;
            case 'wallcave': return RG.WALL_CAVE_ELEM;
            case 'wallcrypt': return RG.WALL_CRYPT_ELEM;
            case 'wallice': return RG.ICE_WALL_ELEM;
            case 'wallwooden': return RG.WALL_WOODEN_ELEM;
            case 'water': return RG.WATER_ELEM;
            default: return null;
        }
    };

    this.createFloorCell = function(x, y) {
        return new RG.Map.Cell(x, y, new RG.Element.Base('floor'));
    };

    this.createWallCell = function(x, y) {
        return new RG.Map.Cell(x, y, new RG.Element.Base('wall'));
    };

    this.createSnowCell = function(x, y) {
        return new RG.Map.Cell(x, y, new RG.Element.Base('snow'));
    };

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
            mapObj = mapgen.createCrypt(cols, rows, {});
        }
        else if (levelType === 'cave') {
            mapObj = mapgen.createCave(cols, rows, {});
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

    this.createHouseElements = function(level, mapObj) {
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
            for (let n = 0; n < conf.nShops; n++) {

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

                const keeper = this.createActor('shopkeeper', {brain: 'Human'});
                const gold = new RG.Item.GoldCoin('Gold coin');
                gold.count = 100;
                keeper.getInvEq().addItem(gold);
                for (let i = 0; i < floor.length; i++) {
                    const xy = floor[i];
                    if (i === 0) {level.addActor(keeper, xy[0], xy[1]);}
                    const shopElem = new RG.Element.Shop();
                    shopElem.setShopkeeper(keeper);
                    level.addElement(shopElem, xy[0], xy[1]);

                    if (conf.hasOwnProperty('parser')) {
                        let item = null;
                        if (conf.shopFunc) {
                            if (typeof conf.shopFunc[n] === 'function') {
                                item = conf.parser.createRandomItem({
                                    func: conf.shopFunc[n]
                                });
                            }
                            else {
                                RG.err('Factory.Base', 'createShop',
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

                        if (!item) {
                            const msg = 'item null. ' +
                                `conf: ${JSON.stringify(conf)}`;
                            RG.err('Factory.Base', 'createShop',
                                `${msg} shopFunc/type${n} not well defined.`);
                        }
                        else {
                            item.add('Unpaid', new RG.Component.Unpaid());
                            level.addItem(item, xy[0], xy[1]);
                        }
                    }
                }
            }
        }
        else {
            RG.err('Factory.Base', 'createShops', 'No houses in mapObj.');
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
    this.addNRandItems = function(level, parser, conf) {
        _verif.verifyConf('addNRandItems', conf, ['func', 'maxValue']);
        // Generate the items randomly for this level

        const freeCells = level.getMap().getFree();
        for (let j = 0; j < conf.itemsPerLevel; j++) {
            const index = RG.RAND.randIndex(freeCells);
            const cell = freeCells[index];

            const item = parser.createRandomItem({func: conf.func});
            if (item) {
                _doItemSpecificAdjustments(item, conf.maxValue);
                level.addItem(item, cell.getX(), cell.getY());
                freeCells.splice(index, 1); // remove used cell
            }
        }
        const food = parser.createRandomItem({func: function(item) {
            return item.type === 'food';
        }});

        if (food) {
            const index = RG.RAND.randIndex(freeCells);
            const foodCell = freeCells[index];
            _doItemSpecificAdjustments(food, conf.maxValue);
            level.addItem(food, foodCell.getX(), foodCell.getY());
        }
        else {
            RG.warn('Factory.Base', 'addNRandItems',
                'Item.Food was not created properly.');

        }
    };

    /* Adds N random monsters to the level based on given danger level.*/
    this.addNRandMonsters = (level, parser, conf) => {
        _verif.verifyConf('addNRandMonsters', conf,
            ['maxDanger', 'monstersPerLevel']);
        // Generate the monsters randomly for this level
        const maxDanger = conf.maxDanger;

        const freeCells = level.getMap().getFree();
        for (let i = 0; i < conf.monstersPerLevel; i++) {
            const index = RG.RAND.randIndex(freeCells);
            const cell = freeCells[index];

            // Generic randomization with danger level
            let monster = null;
            if (!conf.func) {
                monster = parser.createRandomActorWeighted(1, maxDanger,
                    {func: function(actor) {return actor.danger <= maxDanger;}}
                );
            }
            else {
                monster = parser.createRandomActor({
                    func: (actor) => (conf.func(actor) &&
                        actor.danger <= maxDanger)
                });
            }

            if (monster) {
                // This levels up the actor to match current danger level
                const objShell = parser.dbGet('actors', monster.getName());
                const expLevel = maxDanger - objShell.danger;
                if (expLevel > 1) {
                    RG.levelUpActor(monster, expLevel);
                }
                level.addActor(monster, cell.getX(), cell.getY());
            }
            else {
                RG.err('Factory.Feature', 'addNRandMonsters',
                    `Generated monster null. Conf: ${JSON.stringify(conf)}`);
            }

            freeCells.splice(index, 1); // remove used cell
        }
    };

    this.addRandomGold = function(level, parser, conf) {
        const freeCells = level.getMap().getFree();
        for (let i = 0; i < conf.goldPerLevel; i++) {
            const index = RG.RAND.randIndex(freeCells);
            const cell = freeCells[index];

            const gold = parser.createActualObj(RG.TYPE_ITEM, 'Gold coin');
            _doItemSpecificAdjustments(gold, conf.nLevel);
            level.addItem(gold, cell.getX(), cell.getY());
            freeCells.splice(index, 1); // remove used cell
        }
    };

    /* Called for random items. Adjusts some of their attributes randomly.*/
    const _doItemSpecificAdjustments = function(item, val) {
        _itemRandomizer.adjustItem(item, val);
    };


    this.createHumanArmy = function(level, parser) {
        for (let y = 0; y < 2; y++) {
            for (let x = 0; x < 20; x++) {
                const human = parser.createActualObj('actors', 'fighter');
                level.addActor(human, x + 1, 4 + y);
            }

            const warlord = parser.createActualObj('actors', 'warlord');
            level.addActor(warlord, 10, y + 7);
        }

    };

    this.createDemonArmy = function(level, parser) {
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

RG.Factory.Feature = function() {
    RG.Factory.Base.call(this);

    const _verif = new RG.Verify.Conf('Factory.Feature');

    const _parser = new RG.ObjectShell.Parser();
    _parser.parseShellData(RG.Effects);
    _parser.parseShellData(RGObjects);

    this.getRandLevelType = function() {
        const type = ['rooms', 'rogue', 'digger'];
        const nLevelType = RG.RAND.randIndex(type);
        return type[nLevelType];
    };

    this.addItemsAndMonsters = function(level, conf) {
        _verif.verifyConf('addItemsAndMonsters', conf,
            ['nLevel', 'sqrPerItem', 'sqrPerMonster', 'maxValue']);

        const numFree = level.getMap().getFree().length;
        const monstersPerLevel = Math.round(numFree / conf.sqrPerMonster);
        const itemsPerLevel = Math.round(numFree / conf.sqrPerItem);
        const goldPerLevel = itemsPerLevel;

        debug(`Adding ${monstersPerLevel} monsters and items ` +
            `${itemsPerLevel} to the level`);

        const itemConstraint = function(maxValue) {
            return function(item) {return item.value <= maxValue;};
        };

        const itemConf = {
            nLevel: conf.nLevel, // verified to exist
            itemsPerLevel,
            func: itemConstraint(conf.maxValue),
            maxValue: conf.maxValue
        };
        this.addNRandItems(level, _parser, itemConf);

        const actorConf = {
            monstersPerLevel: conf.monstersPerLevel || monstersPerLevel,
            maxDanger: conf.maxDanger || conf.nLevel + 1
        };
        if (conf.actor) {
            if (typeof conf.actor === 'function') {
                actorConf.func = conf.actor;
            }
            else {
                RG.err('Factory.Feature', 'addItemsAndMonsters',
                    'conf.actor must be a function');
            }
        }
        this.addNRandMonsters(level, _parser, actorConf);

        const goldConf = {
            goldPerLevel,
            nLevel: conf.nLevel + 1
        };
        this.addRandomGold(level, _parser, goldConf);
    };

    /* Creates random dungeon level. */
    this.createDungeonLevel = function(conf) {
        let level = null;
        let levelType = this.getRandLevelType();
        if (conf.dungeonType) {
            levelType = conf.dungeonType;
        }
        debug(`dungeonLevel: ${levelType}, ${JSON.stringify(conf)}`);
        level = this.createLevel(levelType, conf.x, conf.y);
        this.addItemsAndMonsters(level, conf);
        return level;
    };


    this.createMountainLevel = function(conf) {
        const mountConf = {
            maxValue: 100,
            sqrPerMonster: 50,
            sqrPerItem: 200,
            nLevel: 4
        };
        debug(`Creating mountain level with ${conf}`);
        const mountainLevel = this.createLevel('mountain',
            conf.x, conf.y, mountConf);
        this.addItemsAndMonsters(mountainLevel, mountConf);
        return mountainLevel;
    };

    //---------------------------
    // CITY LEVELS
    //---------------------------

    this.createCityLevel = function(conf) {
        const levelConf = RG.Factory.cityConfBase(conf);
        levelConf.parser = _parser;
        let cityLevel = null;

        const {x, y} = conf;
        if (levelConf.groupType) {
            switch (levelConf.groupType) {
                case 'village': {
                    console.log('Creating village level now');
                    cityLevel = this.createVillageLevel(x, y, levelConf);
                    break;
                }
                case 'capital': {
                    cityLevel = this.createCapitalLevel(x, y, levelConf);
                    break;
                }
                case 'stronghold': {
                    cityLevel = this.createStrongholdLevel(x, y, levelConf);
                    break;
                }
                case 'fort': {
                    console.log('Creating capital/fort level now');
                    cityLevel = this.createFortLevel(x, y, levelConf);
                    break;
                }
                default: {
                    break;
                }
            }
        }

        if (cityLevel === null) {
            cityLevel = this.createLevel('town', x, y, levelConf);
        }
        return cityLevel;
    };

    this.createVillageLevel = function(cols, rows, levelConf) {
        levelConf.levelType = 'empty';
        levelConf.wallType = 'wooden';
        const level = this.createLevel('town', cols, rows, levelConf);
        const actorConf = {
            monstersPerLevel: 30,
            maxDanger: 2,
            func: actor => actor.type === 'human'
        };
        this.addNRandMonsters(level, _parser, actorConf);
        return level;
    };

    this.createFortLevel = function(cols, rows, levelConf) {
        levelConf.levelType = 'miner';
        return this.createLevel('town', 100, 100, levelConf);
    };

    this.createCapitalLevel = function(cols, rows, levelConf) {
        levelConf.levelType = 'miner';
        const level = this.createLevel('town', 100, 100, levelConf);
        const actorConf = {
            monstersPerLevel: 100,
            maxDanger: 10,
            func: actor => (
                actor.type === 'human' &&
                actor.name !== 'shopkeeper'
            )
        };
        this.addNRandMonsters(level, _parser, actorConf);
        return level;
    };

    this.createStrongholdLevel = function(cols, rows, levelConf) {
        levelConf.levelType = 'miner';
        const level = this.createLevel('town', 100, 100, levelConf);
        return level;
    };

};
RG.extend2(RG.Factory.Feature, RG.Factory.Base);

/* Factory object for creating worlds and features. Uses conf object which is
 * somewhat involved. For an example, see ../data/conf.world.js. This Factory
 * does not have any procedural generation. The configuration object can be
 * generated procedurally, and the factory will then use the configuration for
 * building the world. Separation of concerns, you know.
 */
RG.Factory.World = function() {
    const _verif = new RG.Verify.Conf('Factory.World');
    this.featureFactory = new RG.Factory.Feature();

    // Used for generating levels, if more specific settings not given
    this.globalConf = {
        dungeonX: RG.LEVEL_MEDIUM_X,
        dungeonY: RG.LEVEL_MEDIUM_Y
    };

    this.presetLevels = {};

    this.setPresetLevels = function(levels) {
        this.presetLevels = levels;
    };

    // Can be used to pass already created levels to different features. For
    // example, after restore game, no new levels should be created
    this.id2level = {};
    this.id2levelSet = false;

    /* If id2level is set, factory does not construct any levels. It uses
     * id2level as a lookup table instead. */
    this.setId2Level = function(id2level) {
        this.id2level = id2level;
        this.id2levelSet = true;
    };

    this.scope = []; // Keeps track of hierarchical names of places
    this.confStack = [];

    this.pushScope = function(conf) {
        this.scope.push(conf.name);
        this.confStack.push(conf);
    };

    this.popScope = function(conf) {
        const name = conf.name;
        const poppedName = this.scope.pop();
        if (poppedName !== name) {
            RG.err('Factory.World', 'popScope',
                `Popped: ${poppedName}, Expected: ${name}`);
        }
        else {
            const currConf = this.confStack.pop();
            debug('Popped scope: ' + currConf.name);
        }
    };

    /* Initializes the global configuration such as level size. */
    this.setGlobalConf = function(conf) {
        const levelSize = conf.levelSize || 'Medium';
        const sqrPerMonster = conf.sqrPerMonster || RG.ACTOR_MEDIUM_SQR;
        this.globalConf.levelSize = levelSize;
        this.globalConf.dungeonX = levelSizes.dungeon[levelSize].x;
        this.globalConf.dungeonY = levelSizes.dungeon[levelSize].y;
        this.globalConf.sqrPerMonster = sqrPerMonster;
        this.globalConf.sqrPerItem = conf.sqrPerItem || RG.LOOT_MEDIUM_SQR;
        this.globalConf.set = true;
        debug('globalConf set to ' + JSON.stringify(this.globalConf));
    };

    /* Returns config value. */
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

    /* Returns the full hierarchical name of feature. */
    this.getHierName = () => this.scope.join('.');

    /* Creates a world using given configuration. */
    this.createWorld = function(conf) {
        _verif.verifyConf('createWorld', conf, ['name', 'nAreas']);
        if (!this.globalConf.set) {
            this.setGlobalConf({});
        }
        this.pushScope(conf);
        const world = new RG.World.World(conf.name);
        for (let i = 0; i < conf.nAreas; i++) {
            const areaConf = conf.area[i];
            const area = this.createArea(areaConf);
            world.addArea(area);
        }
        this.popScope(conf);
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
        if (needsConnect) {
            area.connectTiles();
        }
        area.setHierName(this.getHierName());
        const nDungeons = conf.nDungeons || 0;
        const nMountains = conf.nMountains || 0;
        const nCities = conf.nCities || 0;

        for (let i = 0; i < nDungeons; i++) {
            const dungeonConf = conf.dungeon[i];
            const dungeon = this.createDungeon(dungeonConf);
            area.addDungeon(dungeon);
            if (!this.id2levelSet) {
                this.createConnection(area, dungeon, dungeonConf);
            }
        }

        for (let i = 0; i < nMountains; i++) {
            const mountainConf = conf.mountain[i];
            const mountain = this.createMountain(mountainConf);
            area.addMountain(mountain);
            if (!this.id2levelSet) {
                this.createConnection(area, mountain, mountainConf);
            }
        }

        for (let i = 0; i < nCities; i++) {
            const cityConf = conf.city[i];
            const city = this.createCity(cityConf);
            area.addCity(city);
            if (!this.id2levelSet) {
                this.createConnection(area, city, cityConf);
            }
        }
        this.popScope(conf);
        return area;
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
        }

        if (conf.entrance) {
            dungeon.setEntrance(conf.entrance);
        }

        // Connect branches according to configuration
        if (!this.id2levelSet) {
            if (conf.nBranches > 1) {
                if (conf.connect) {
                    conf.connect.forEach(conn => {
                        if (conn.length === 4) {
                            // conn has len 4, spread it out
                            dungeon.connectBranches(...conn);
                        }
                        else {
                            RG.err('Factory.World', 'createDungeon',
                                'Each connection.length must be 4.');
                        }
                    });
                }
                else {
                    RG.err('Factory.World', 'createDungeon',
                        'nBranches > 1, but no conf.connect.');
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

        const constraint = this.getConf('constraint');
        const presetLevels = this.getPresetLevels(hierName);

        for (let i = 0; i < conf.nLevels; i++) {

            const levelConf = {
                x: this.getConf('dungeonX'),
                y: this.getConf('dungeonY'),
                sqrPerMonster: this.getConf('sqrPerMonster'),
                sqrPerItem: this.getConf('sqrPerItem'),
                maxValue: 20 * (i + 1),
                nLevel: i
            };

            const dungeonType = this.getConf('dungeonType');
            if (dungeonType) {
                levelConf.dungeonType = dungeonType;
            }

            if (constraint) {
                levelConf.actor = constraint.actor;
            }

            // First try to find a preset level
            let level = null;
            if (presetLevels.length > 0) {
                const obj = presetLevels.find(item => item.nLevel === i);
                if (obj) {
                    level = obj.level;
                }
            }

            // If preset not found, either restore or create a new one
            if (!level) {
                if (conf.levels) {
                    level = this.id2level[conf.levels[i]];
                }
                else {
                    level = this.featureFactory.createDungeonLevel(levelConf);
                }
            }
            branch.addLevel(level);
        }

        // Do only if not restoring the branch
        if (!this.id2levelSet) {
            branch.connectLevels();
            if (conf.hasOwnProperty('entranceLevel')) {
                const entrStairs = new Stairs(false);
                branch.setEntrance(entrStairs, conf.entranceLevel);
            }
        }
        else if (conf.hasOwnProperty('entrance')) {
            branch.setEntranceLocation(conf.entrance);
        }

        this.popScope(conf);
        return branch;
    };

    this.getPresetLevels = function(hierName) {
        const keys = Object.keys(this.presetLevels);
        const foundKey = keys.find(item => new RegExp(item).test(hierName));
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

        for (let i = 0; i < conf.nFaces; i++) {
            const faceConf = conf.face[i];
            const mountainFace = this.createMountainFace(faceConf);
            mountain.addFace(mountainFace);
        }

        if (!this.id2levelSet) {
            if (conf.nFaces > 1) {
                if (conf.connect) {
                    conf.connect.forEach(conn => {
                        if (conn.length === 4) {
                            // conn has len 4, spread it out
                            mountain.connectFaces(...conn);
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
                        'nBranches > 1, but no conf.connect.');
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

        for (let i = 0; i < conf.nLevels; i++) {
            let level = null;
            if (!this.id2levelSet) {
                level = this.featureFactory.createMountainLevel(mLevelConf);
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

    /* Creates a City and all its sub-features. */
    this.createCity = function(conf) {
        if (this.id2levelSet) {
            _verif.verifyConf('createCity',
                conf, ['name', 'nQuarters']);
        }
        else {
            _verif.verifyConf('createCity',
                conf, ['name', 'nQuarters']);
        }
        this.pushScope(conf);
        const city = new RG.World.City(conf.name);
        city.setHierName(this.getHierName());
        for (let i = 0; i < conf.nQuarters; i++) {
            const qConf = conf.quarter[i];
            const quarter = this.createCityQuarter(qConf);
            city.addQuarter(quarter);
        }

        // Connect city quarters according to configuration
        if (!this.id2levelSet) {
            if (conf.nQuarters > 1) {
                if (conf.connect) {
                    conf.connect.forEach(conn => {
                        if (conn.length === 4) {
                            // conn has len 4, spread it out
                            city.connectQuarters(...conn);
                        }
                        else {
                            RG.err('Factory.World', 'createCity',
                                'Each connection.length must be 4.');
                        }
                    });
                }
                else {
                    RG.err('Factory.World', 'createCity',
                        'nBranches > 1, but no conf.connect.');
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
        quarter.setHierName(this.getHierName());

        const cityLevelConf = {
            x: conf.x || 80, y: conf.y || 40,
            nShops: conf.nShops || 1,
            shopFunc: conf.shop || [(item) => (item.type === 'food')]
        };

        const groupType = this.getConf('groupType');
        const cityType = this.getConf('cityType');
        const quarterType = this.getConf('quarterType');
        if (groupType) {cityLevelConf.groupType = groupType;}
        if (cityType) {cityLevelConf.cityType = cityType;}
        if (quarterType) {cityLevelConf.cityType = quarterType;}

        for (let i = 0; i < conf.nLevels; i++) {
            let level = null;
            if (!this.id2levelSet) {
                level = this.featureFactory.createCityLevel(cityLevelConf);
            }
            else {
                const id = conf.levels[i];
                level = this.id2level[id];
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

    /* Creates a connection between an area and a feature such as city, mountain
     * or dungeon. Unless configured, connects the feature entrance to a random
     * location in the area. */
    this.createConnection = function(area, feature, conf) {
        _verif.verifyConf('createConnection', conf, ['x', 'y']);

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

        if (feature.hasOwnProperty('getEntrances')) {
            const entrances = feature.getEntrances();
            if (entrances.length > 0) {
                const entranceStairs = entrances[0];
                const entranceLevel = entranceStairs.getSrcLevel();
                const isDown = !entranceStairs.isDown();
                const tileStairs = new Stairs(isDown, tileLevel, entranceLevel);
                tileLevel.addStairs(tileStairs, tileStairsX, tileStairsY);
                tileStairs.connect(entranceStairs);
            }
            else {
                const msg = `No entrances in ${feature.getHierName()}.`;
                RG.err('Factory.World', 'createConnection',
                    `${msg}. Cannot connect to tile.`);
            }
        }
        else { // No entrance for feature, what to do?
            RG.err('Factory.World', 'createConnection',
                'No getEntrances method for feature.');
        }

        // Make extra connections between the area and feature. This is useful
        // if city/dungeon needs to have 2 or more entrances
        if (conf.hasOwnProperty('connectToXY')) {
            const connectionsXY = conf.connectToXY;
            connectionsXY.forEach(conn => {
                const nLevel = conn.nLevel;
                const x = conn.levelX;
                const y = conn.levelY;
                const name = conn.name;

                const featLevel = feature.findLevel(name, nLevel);
                if (featLevel) {
                    // Create 2 new stairs, add 1st to the area level, and 2nd
                    // to the feature level
                    const freeCell = featLevel.getFreeRandCell();
                    const featX = freeCell.getX();
                    const featY = freeCell.getY();

                    const tileStairs = new Stairs(true, tileLevel, featLevel);
                    const featStairs = new Stairs(false, featLevel, tileLevel);
                    tileLevel.addStairs(tileStairs, x, y);
                    featLevel.addStairs(featStairs, featX, featY);
                    tileStairs.connect(featStairs);
                }
                else {
                    let msg = `connectToXY: ${JSON.stringify(conn)}`;
                    msg += `featureConf: ${JSON.stringify(conf)}`;
                    RG.err('Factory.World', 'createConnection',
                        `No level found. ${msg}`);

                }
            });
        }


    };
};

module.exports = RG.Factory;

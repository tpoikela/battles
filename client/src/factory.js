
const RG = require('./rg.js');
const ROT = require('../../lib/rot.js');

const debug = require('debug')('bitn:factory');

RG.Component = require('./component.js');
RG.Brain = require('./brain.js');
RG.Map = require('./map.js');

const RGObjects = require('../data/battles_objects.js');
RG.Effects = require('../data/effects.js');

const MSG = {
    EYE_OF_STORM:
        'You see an eye of the storm approaching. Brace yourself now..',
    BEASTS_SLAIN:
        'All beasts have been slain. The blizzard seems to calm down',
    ENEMIES_DEAD:
        'All enemies are dead! You emerge victorious. Congratulations!'
};

const Stairs = RG.Element.Stairs;

/* Returns a basic configuration for a city level. */
const cityConfBase = function(_parser, conf) {
    const userConf = conf || {};
    const obj = {
        nHouses: 10, minHouseX: 5, maxHouseX: 10, minHouseY: 5,
        maxHouseY: 10, parser: _parser,
        func: function(item) {return item.type === 'armour';}
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
        Small: {x: 40, y: 20},
        Medium: {x: 60, y: 30},
        Large: {x: 80, y: 40},
        Huge: {x: 140, y: 60}
    },
    city: {
        Small: {x: 40, y: 20},
        Medium: {x: 60, y: 30},
        Large: {x: 80, y: 40},
        Huge: {x: 140, y: 60}
    }
};


/* Player stats based on user selection.*/
const confPlayerStats = {
    Weak: {att: 1, def: 1, prot: 1, hp: 15, Weapon: 'Dagger'},
    Medium: {att: 2, def: 4, prot: 2, hp: 25, Weapon: 'Short sword'},
    Strong: {att: 5, def: 6, prot: 3, hp: 40, Weapon: 'Tomahawk'},
    Inhuman: {att: 10, def: 10, prot: 4, hp: 80, Weapon: 'Magic sword'}
};


//---------------------------------------------------------------------------
// FACTORY OBJECTS
//---------------------------------------------------------------------------

RG.Factory = {};

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
        const weight = ROT.RNG.getWeightedValue(_foodWeights);
        food.setWeight(weight);
    };

    /* LUT for functions to call on specific items.*/
    const _adjustFunctions = {
        food: _adjustFoodItem
    };

};

/* Factory object for creating some commonly used objects.*/
RG.Factory.Base = function() { // {{{2

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
            case 'Demon': return new RG.Brain.Demon(actor);
            case 'Human': return new RG.Brain.Human(actor);
            case 'Summoner': return new RG.Brain.Summoner(actor);
            case 'Zombie': return new RG.Brain.Zombie(actor);
            default: return new RG.Brain.Rogue(actor);
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

        if (levelType === 'town') {
            mapObj = mapgen.createTown(cols, rows, conf);
            level.setMap(mapObj.map);
            this.createHouseElements(level, mapObj, conf);
            this.createShop(level, mapObj, conf);
        }
        else if (levelType === 'forest') {
            if (!RG.isNullOrUndef([conf.forest])) {
                const forestShape = conf.forest.shape;
                mapgen.setGen(forestShape, cols, rows);
                mapObj = mapgen.createForest(conf.forest.ratio);
                level.setMap(mapObj.map);
            }
            else {
                RG.err('RG.Factory.Base', 'createLevel',
                    'conf.forest must be specified!');
            }
        }
        else if (levelType === 'mountain') {
            // mapgen.setGen('ruins', cols, rows);
            mapgen.setGen('ruins', 50, 200);
            mapObj = mapgen.createMountain();
            level.setMap(mapObj.map);
        }
        else {
            mapgen.setGen(levelType, cols, rows);
            mapObj = mapgen.getMap();
            level.setMap(mapObj.map);
        }

        return level;
    };

    this.createHouseElements = function(level, mapObj) {
        if (!mapObj.hasOwnProperty('houses')) {return;}
        const map = mapObj.map;
        const houses = mapObj.houses;
        for (let i = 0; i < houses.length; i++) {
            const doorXY = houses[i].door;
            const door = new RG.Element.Door(true);
            map.getCell(doorXY[0], doorXY[1]).setProp('elements', door);
        }
    };

    /* Creates a shop and a shopkeeper into a random house in the given level.*/
    this.createShop = function(level, mapObj, conf) {
        const map = mapObj.map;
        if (mapObj.hasOwnProperty('houses')) {
            const houses = mapObj.houses;
            const nlength = houses.length;
            const index = Math.floor(nlength * Math.random());
            const house = mapObj.houses[index];
            const floor = house.floor;

            const doorXY = house.door;
            const door = new RG.Element.Door(true);
            map.getCell(doorXY[0], doorXY[1]).setProp('elements', door);

            const keeper = this.createActor('Shopkeeper', {brain: 'Human'});
            for (let i = 0; i < floor.length; i++) {
                const xy = floor[i];
                if (i === 0) {level.addActor(keeper, xy[0], xy[1]);}
                const cell = map.getCell(xy[0], xy[1]);
                const shopElem = new RG.Element.Shop();
                shopElem.setShopkeeper(keeper);
                cell.setProp('elements', shopElem);

                if (conf.hasOwnProperty('parser')) {
                    const item = conf.parser.createRandomItem({
                        func: conf.func
                    });
                    item.add('Unpaid', new RG.Component.Unpaid());
                    level.addItem(item, xy[0], xy[1]);
                }
            }
        }
        else {
            RG.err('Factory.Base', 'createShop', 'No houses in mapObj.');
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
    this.addNRandItems = function(parser, itemsPerLevel, level, maxVal, func) {
        // Generate the items randomly for this level
        for (let j = 0; j < itemsPerLevel; j++) {
            const item = parser.createRandomItem({
                func: func
            });
            _doItemSpecificAdjustments(item, maxVal);
            const itemCell = level.getFreeRandCell();
            level.addItem(item, itemCell.getX(), itemCell.getY());
        }
        const food = parser.createRandomItem({func: function(item) {
            return item.type === 'food';
        }});
        const foodCell = level.getFreeRandCell();
        _doItemSpecificAdjustments(food, maxVal);
        level.addItem(food, foodCell.getX(), foodCell.getY());
    };

    /* Adds N random monsters to the level based on given danger level.*/
    this.addNRandMonsters = (parser, monstersPerLevel, level, maxDanger) => {
        // Generate the monsters randomly for this level
        for (let i = 0; i < monstersPerLevel; i++) {
            const cell = level.getFreeRandCell();
            /* const monster = parser.createRandomActor({
                func: function(actor){return actor.danger <= maxDanger;}
            });*/
            const monster = parser.createRandomActorWeighted(1, maxDanger,
                {func: function(actor) {return actor.danger <= maxDanger;}}
            );
            const objShell = parser.dbGet('actors', monster.getName());
            const expLevel = maxDanger - objShell.danger;
            if (expLevel > 1) {
                RG.levelUpActor(monster, expLevel);
            }
            level.addActor(monster, cell.getX(), cell.getY());
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

    this.spawnDemonArmy = function(level, parser) {
        for (let y = 0; y < 2; y++) {
            for (let i = 0; i < 10; i++) {
                const demon = parser.createActualObj('actors', 'Winter demon');
                level.addActor(demon, i + 10, 14 + y);
                RG.POOL.emitEvent(RG.EVT_ACTOR_CREATED, {actor: demon,
                    level: level, msg: 'DemonSpawn'});
            }
        }
    };

    this.spawnBeastArmy = function(level, parser) {
        const x0 = level.getMap().cols / 2;
        const y0 = level.getMap().rows / 2;
        for (let y = y0; y < y0 + 2; y++) {
            for (let x = x0; x < x0 + 10; x++) {
                const beast = parser.createActualObj('actors',
                    'Blizzard beast');
                level.addActor(beast, x + 10, 14 + y);
                RG.POOL.emitEvent(RG.EVT_ACTOR_CREATED, {actor: beast,
                    level: level, msg: 'DemonSpawn'});
            }
        }
        RG.debug(this, 'Blizzard beasts should now appear.');
    };

};

RG.FACT = new RG.Factory.Base();
// }}}

RG.Factory.Feature = function() {
    RG.Factory.Base.call(this);

    const _parser = new RG.ObjectShellParser();
    _parser.parseShellData(RG.Effects);
    _parser.parseShellData(RGObjects);

    this.getRandLevelType = function() {
        const type = ['rooms', 'rogue', 'digger', 'cellular'];
        const nLevelType = Math.floor(Math.random() * type.length);
        return type[nLevelType];
    };

    this.addItemsAndMonsters = function(conf, level) {
        const numFree = level.getMap().getFree().length;
        const monstersPerLevel = Math.round(numFree / conf.sqrPerMonster);
        const itemsPerLevel = Math.round(numFree / conf.sqrPerItem);

        debug(`Adding ${monstersPerLevel} monsters and
            ${itemsPerLevel} to the level`);

        const itemConstraint = function(maxVal) {
            return function(item) {return item.value <= maxVal;};
        };

        this.addNRandItems(_parser, itemsPerLevel, level, conf.maxValue,
            itemConstraint(conf.maxValue)
        );
        this.addNRandMonsters(
            _parser, monstersPerLevel, level, conf.nLevel + 1);
    };

    /* Creates random dungeon level. */
    this.createDungeonLevel = function(conf) {
        const levelType = this.getRandLevelType();
        const level = this.createLevel(levelType, conf.x, conf.y);
        this.addItemsAndMonsters(conf, level);
        return level;
    };

    this.createCityLevel = function(conf) {
        const levelConf = cityConfBase(_parser);
        const city = this.createLevel('town', conf.x, conf.y, levelConf);
        return city;
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
        this.addItemsAndMonsters(mountConf, mountainLevel);
        return mountainLevel;
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

    this.featureFactory = new RG.Factory.Feature();

    this.scope = []; // Keeps track of hierarchical names of places

    this.pushScope = name => {
        this.scope.push(name);
    };

    this.popScope = name => {
        const poppedName = this.scope.pop();
        if (poppedName !== name) {
            RG.err('Factory.World', 'popScope',
                `Popped: ${poppedName}, Expected: ${name}`);
        }
    };

    /* Returns the full hierarchical name of feature. */
    this.getHierName = () => this.scope.join('.');

    /* Verifies that configuration contains all required keys.*/
    this.verifyConf = function(msg, conf, required) {
        let ok = true;
        required.forEach(req => {
            if (!conf.hasOwnProperty(req)) {
                ok = false;
                RG.err('Factory.World', 'verifyConf',
                    `Missing conf arg: ${req}`);
            }
        });
        if (!ok) {
            RG.err('Factory.World', 'verifyConf', msg);
        }
        return ok;
    };

    /* Creates a world using given configuration. */
    this.createWorld = function(conf) {
        this.verifyConf('createWorld', conf, ['name', 'nAreas']);
        this.pushScope(conf.name);
        const world = new RG.World.World(conf.name);
        for (let i = 0; i < conf.nAreas; i++) {
            const areaConf = conf.area[i];
            const area = this.createArea(areaConf);
            world.addArea(area);
        }
        this.popScope(conf.name);
        return world;
    };

    /* Creates an area which can be added to a world. */
    this.createArea = function(conf) {
        this.verifyConf('createArea', conf,
            ['name', 'maxX', 'maxY']);
        this.pushScope(conf.name);
        const area = new RG.World.Area(conf.name, conf.maxX, conf.maxY);
        area.setHierName(this.getHierName());
        const nDungeons = conf.nDungeons || 0;
        const nMountains = conf.nMountains || 0;
        const nCities = conf.nCities || 0;

        for (let i = 0; i < nDungeons; i++) {
            const dungeonConf = conf.dungeon[i];
            const dungeon = this.createDungeon(dungeonConf);
            area.addDungeon(dungeon);
            this.createConnection(area, dungeon, dungeonConf);
        }

        for (let i = 0; i < nMountains; i++) {
            const mountainConf = conf.mountain[i];
            const mountain = this.createMountain(mountainConf);
            area.addMountain(mountain);
            this.createConnection(area, mountain, mountainConf);
        }

        for (let i = 0; i < nCities; i++) {
            const cityConf = conf.city[i];
            const city = this.createCity(cityConf);
            area.addCity(city);
            this.createConnection(area, city, cityConf);
        }
        this.popScope(conf.name);
        return area;
    };


    this.createDungeon = function(conf) {
        this.verifyConf('createDungeon', conf,
            ['name', 'nBranches']);
        this.pushScope(conf.name);

        const dungeon = new RG.World.Dungeon(conf.name);
        dungeon.setHierName(this.getHierName());

        for (let i = 0; i < conf.nBranches; i++) {
            const branchConf = conf.branch[i];
            const branch = this.createBranch(branchConf);
            dungeon.addBranch(branch);
        }

        if (conf.entrance) {
            dungeon.setEntrance(conf.entrance);
        }

        // Connect branches according to configuration
        if (conf.nBranches > 1) {
            if (conf.connect) {
                conf.connect.forEach( conn => {
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

        this.popScope(conf.name);
        return dungeon;
    };

    /* Creates one dungeon branch and all levels inside it. */
    this.createBranch = function(conf) {
        this.verifyConf('createBranch', conf,
            ['name', 'nLevels']);
        this.pushScope(conf.name);
        const branch = new RG.World.Branch(conf.name);
        branch.setHierName(this.getHierName());
        for (let i = 0; i < conf.nLevels; i++) {
            // TODO: Level configuration can be quite complex. Support random
            // and customly created levels somehow
            const levelConf = {
                x: 40,
                y: 40,
                sqrPerMonster: 20,
                sqrPerItem: 20,
                maxValue: 20 * (i + 1),
                nLevel: i,
                special: [] // TODO for special levels
            };
            const level = this.featureFactory.createDungeonLevel(levelConf);
            branch.addLevel(level);
        }
        branch.connectLevels();
        this.popScope(conf.name);
        return branch;
    };

    this.createMountain = function(conf) {
        this.verifyConf('createMountain', conf, ['name']);
        this.pushScope(conf.name);
        const mountain = new RG.World.Mountain(conf.name);
        mountain.setHierName(this.getHierName());

        this.pushScope('face1');
        const northFace = new RG.World.MountainFace();
        const mConf = { x: 50, y: 200 };
        const level = this.featureFactory.createMountainLevel(mConf);
        northFace.addLevel(level);
        mountain.addFace(northFace);
        this.popScope('face1');

        this.popScope(conf.name);
        return mountain;
    };

    this.createCity = function(conf) {
        this.verifyConf('createCity', conf, ['name']);
        this.pushScope(conf.name);
        const cityConf = {
            x: 100,
            y: 100
        };
        const city = new RG.World.City(conf.name);
        city.setHierName(this.getHierName());
        const level = this.featureFactory.createCityLevel(cityConf);
        city.addLevel(level);
        this.popScope(conf.name);
        return city;
    };

    /* Creates a connection between an area and a feature such as city, mountain
     * or dungeon. Unless configured, connects the feature entrance to a random
     * location in the area. */
    this.createConnection = function(area, feature, conf) {
        this.verifyConf('createConnection', conf, ['x', 'y']);

        const x = conf.x;
        const y = conf.y;
        const tile = area.getTileXY(x, y);
        const tileLevel = tile.getLevel();

        const freeAreaCell = tileLevel.getEmptyRandCell();
        const freeX = freeAreaCell.getX();
        const freeY = freeAreaCell.getY();

        if (feature.hasOwnProperty('getEntrances')) {
            const entrances = feature.getEntrances();
            if (entrances.length > 0) {
                const entranceStairs = entrances[0];
                const entranceLevel = entranceStairs.getSrcLevel();
                const isDown = !entranceStairs.isDown();
                const tileStairs = new Stairs(isDown, tileLevel, entranceLevel);
                tileLevel.addStairs(tileStairs, freeX, freeY);
                tileStairs.connect(entranceStairs);
            }
            else {
                const msg = `No entrances in ${feature.getHierName()}.`;
                RG.err('Factory.World', 'createConnection',
                    `${msg}. Cannot connect to tile.`);
            }
        }
        else { // No entrance for feature, what to do?
            console.warn(
                'No getEntrances method for feature. Skipping connect');
        }
    };
};

RG.FCCGame = function() {
    RG.Factory.Base.call(this);

    const _parser = new RG.ObjectShellParser();

    /* Creates a player actor and starting inventory.*/
    this.createFCCPlayer = function(game, obj) {
        let player = obj.loadedPlayer;
        if (RG.isNullOrUndef([player])) {
            const expLevel = obj.playerLevel;
            const pConf = confPlayerStats[expLevel];

            player = this.createPlayer(obj.playerName, {
                att: pConf.att, def: pConf.def, prot: pConf.prot
            });

            player.setType('player');
            player.add('Health', new RG.Component.Health(pConf.hp));
            const startingWeapon = _parser.createActualObj(
                'items', pConf.Weapon);
            player.getInvEq().addItem(startingWeapon);
            player.getInvEq().equipItem(startingWeapon);
        }

        if (!player.has('Hunger')) {
            const hunger = new RG.Component.Hunger(20000);
            player.add('Hunger', hunger);
        }
        else {
            // Notify Hunger system only
            const hunger = player.get('Hunger');
            player.remove('Hunger');
            player.add('Hunger', hunger);
        }
        const regenPlayer = new RG.Time.RogueRegenEvent(player,
            20 * RG.ACTION_DUR);
        game.addEvent(regenPlayer);
        return player;
    };


    const that = this; // For private objects/functions

    // Private object for checking when battle is done
    const DemonKillListener = function(game, level) {

        // Needed for adding monsters and events
        const _game = game;
        const _level = level;

        let _maxBeasts = 0;
        let _maxDemons = 0;
        let _beastsKilled = 0;
        let _demonsKilled = 0;

        this.hasNotify = true;
        this.notify = function(evtName, obj) {
            if (evtName === RG.EVT_ACTOR_CREATED) {
                if (obj.hasOwnProperty('msg') && obj.msg === 'DemonSpawn') {
                    const actorCreated = obj.actor;
                    if (actorCreated.getName() === 'Winter demon') {
                        ++_maxDemons;
                    }
                    if (actorCreated.getName() === 'Blizzard beast') {
                        ++_maxBeasts;
                    }
                }
            }
            else if (evtName === RG.EVT_ACTOR_KILLED) {
                const actor = obj.actor;
                if (actor.getName() === 'Winter demon') {
                    ++_demonsKilled;
                    if (_demonsKilled === _maxDemons) {
                        this.allDemonsKilled();
                    }
                    RG.debug(this,
                        'A winter demon was slain! Count:' + _demonsKilled);
                    RG.debug(this, 'Max demons: ' + _maxDemons);
                }
                else if (actor.getName() === 'Blizzard beast') {
                    ++_beastsKilled;
                    if (_beastsKilled === _maxBeasts) {
                        this.allBeastsKilled();
                    }
                }
            }
        };
        RG.POOL.listenEvent(RG.EVT_ACTOR_CREATED, this);
        RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);

        this.addSnow = function(level, ratio) {
            const map = level.getMap();
            RG.Map.Generator.prototype.addRandomSnow(map, ratio);
        };

        /* Called after all winter demons have been slain.*/
        this.allDemonsKilled = function() {
            RG.gameMsg(
                "Humans have vanquished all demons! But it's not over..");
            const windsEvent = new RG.Time.RogueOneShotEvent(
                this.addSnow.bind(this, _level, 0.2), 20 * 100,
                "Winds are blowing stronger. You feel it's getting colder"
            );
            _game.addEvent(windsEvent);
            const stormEvent = new RG.Time.RogueOneShotEvent(
                () => {}, 35 * 100, MSG.EYE_OF_STORM);
            _game.addEvent(stormEvent);
            const beastEvent = new RG.Time.RogueOneShotEvent(
                that.spawnBeastArmy.bind(that, _level, _parser), 50 * 100,
                'Winter spread by Blizzard Beasts! Hell seems to freeze.');
            _game.addEvent(beastEvent);
        };


        this.allBeastsKilled = function() {
            RG.gameMsg(MSG.BEASTS_SLAIN);
            // DO a final message of game over
            // Add random people to celebrate
            const msgEvent = new RG.Time.RogueOneShotEvent(() => {}, 10 * 100,
                MSG.ENEMIES_DEAD);
            _game.addEvent(msgEvent);
            const msgEvent2 = new RG.Time.RogueOneShotEvent(() => {}, 20 * 100,
                'But Battles in North will continue soon in larger scale...');
            _game.addEvent(msgEvent2);
        };
    }; // const DemonKillListener

    /* Creates the game for the FCC project.*/
    this.createNewGame = function(obj) {
        _parser.parseShellData(RG.Effects);
        _parser.parseShellData(RGObjects);
        const cols = obj.cols;
        const rows = obj.rows;
        const nLevels = obj.levels;
        const sqrPerMonster = obj.sqrPerMonster;
        const sqrPerItem = obj.sqrPerItem;

        let levelCount = 1;
        const game = new RG.Game.Main();
        const player = this.createFCCPlayer(game, obj);

        if (obj.debugMode === 'Arena') {
            return this.createArenaDebugGame(obj, game, player);
        }
        else if (obj.debugMode === 'Battle') {
            return this.createDebugBattle(obj, game, player);
        }
        else if (obj.debugMode === 'Tiles') {
            return this.createTiledWorld(obj, game, player);
        }
        else if (obj.debugMode === 'World') {
            return this.createFullWorld(obj, game, player);
        }

        const levels = ['rooms', 'rogue', 'digger'];
        const maxLevelType = levels.length;

        // For storing stairs and levels
        const allStairsDown = [];
        const allLevels = [];

        const branch = new RG.World.Branch('StartBranch');

        const itemConstraint = function(maxVal) {
            return function(item) {return item.value <= maxVal;};
        };
        // Generate all game levels
        for (let nl = 0; nl < nLevels; nl++) {

            const nLevelType = Math.floor(Math.random() * maxLevelType);
            let levelType = levels[nLevelType];
            if (nl === 0) {levelType = 'ruins';}
            const level = this.createLevel(levelType, cols, rows);
            branch.addLevel(level);

            const numFree = level.getMap().getFree().length;
            const monstersPerLevel = Math.round(numFree / sqrPerMonster);
            const itemsPerLevel = Math.round(numFree / sqrPerItem);

            const potion = new RG.Item.Potion('Healing potion');
            level.addItem(potion);
            const missile = _parser.createActualObj('items', 'Shuriken');
            missile.count = 20;
            level.addItem(missile);

            const maxVal = 20 * (nl + 1);
            this.addNRandItems(_parser, itemsPerLevel, level, maxVal,
                itemConstraint(maxVal)
            );
            this.addNRandMonsters(_parser, monstersPerLevel, level, nl + 1);

            allLevels.push(level);
        }

        // Create the final boss
        const lastLevel = allLevels.slice(-1)[0];
        const bossCell = lastLevel.getFreeRandCell();
        const summoner = this.createActor('Summoner',
            {hp: 100, att: 10, def: 10});
        summoner.setType('summoner');
        summoner.get('Experience').setExpLevel(10);
        summoner.setBrain(new RG.Brain.Summoner(summoner));
        lastLevel.addActor(summoner, bossCell.getX(), bossCell.getY());

        const townLevel = this.createLastBattle(game, {cols: 80, rows: 60});
        townLevel.setLevelNumber(levelCount++);

        branch.connectLevels();
        game.addPlace(branch);

        const finalStairs = new Stairs(true, allLevels[nLevels - 1], townLevel);
        const stairsLoot = new RG.Component.Loot(finalStairs);
        summoner.add('Loot', stairsLoot);
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
            const human = this.createActor(name, {brain: 'Human'});
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

    let _playerFOV = RG.FOV_RANGE;

    this.createTiledWorld = function(obj, game, player) {
        const area = new RG.World.Area('Kingdom', 4, 4);
        const levels = area.getLevels();
        levels.forEach(level => {
            game.addLevel(level);
        });
        game.addPlayer(player);
        return game;
    };

    this.createFullWorld = function(obj, game, player) {
        const worldConf = obj.world;
        if (!worldConf) {
            RG.err('Factory', 'createFullWorld',
                'obj.world must exist!');
            return null;
        }
        worldConf.levelSize = obj.levelSize;
        const fact = new RG.Factory.World();
        const world = fact.createWorld(worldConf);
        const levels = world.getLevels();

        if (levels.length > 0) {
            levels.forEach(level => {
                game.addLevel(level);
            });
            game.addPlayer(player);
            return game;
        }
        else {
            RG.err('Factory', 'createFullWorld',
                'There are no levels in the world!');
            return null;
        }
    };

    /* Can be used to create a short debugging game for testing.*/
    this.createArenaDebugGame = function(obj, game, player) {
        const sqrPerItem = obj.sqrPerItem;
        const level = this.createLastBattle(game, obj);

        const spirit = new RG.Actor.Spirit('Wolf spirit');
        spirit.get('Stats').setStrength(500);
        level.addActor(spirit, 2, 1);

        const gem = new RG.Item.SpiritGem('Lesser gem');
        level.addItem(gem);

        const pickaxe = _parser.createActualObj('items', 'Pick-axe');
        level.addItem(pickaxe, 2, 2);

        const poison = _parser.createActualObj('items',
            'Potion of frost poison');
        poison.count = 5;
        level.addItem(poison, 2, 2);
        const curePoison = _parser.createActualObj('items',
            'Potion of cure poison');
        level.addItem(curePoison, 3, 2);

        // Test for shops
        const keeper = _parser.createActualObj('actors', 'shopkeeper');
        level.addActor(keeper, 2, 2);
        const shopElem = new RG.Element.Shop();
        const shopCell = level.getMap().getCell(3, 3);
        shopCell.setProp('elements', shopElem);
        const soldItem = _parser.createActualObj('items', 'Ruby glass sword');
        soldItem.add('Unpaid', new RG.Component.Unpaid());
        shopCell.setProp('items', soldItem);
        shopElem.setShopkeeper(keeper);

        const numFree = level.getMap().getFree().length;
        // const monstersPerLevel = Math.round(numFree / sqrPerMonster);
        const itemsPerLevel = Math.round(numFree / sqrPerItem);
        this.addNRandItems(_parser, itemsPerLevel, level, 2500,
            function(item) {return item.value <= 2500;});
        game.addPlayer(player);

        const pepper = _parser.createActualObj('items', 'Ghost pepper');
        player.getInvEq().addItem(pepper);
        const spiritPot = _parser.createActualObj(
            'items', 'Potion of spirit form');
        player.getInvEq().addItem(spiritPot);

        // player.setFOVRange(50);
        return game;
    };

    this.createDebugBattle = function(obj, game, player) {
        const battle = new RG.Game.Battle('Battle of ice kingdoms');
        const army1 = new RG.Game.Army('Blue army');
        const army2 = new RG.Game.Army('Red army');
        this.addActorsToArmy(army1, 10, 'warlord');
        this.addActorsToArmy(army2, 10, 'Winter demon');

        const battleLevel = RG.FACT.createLevel('arena', 60, 30);
        battle.setLevel(battleLevel);
        battle.addArmy(army1, 1, 1);
        battle.addArmy(army2, 1, 2);
        game.addBattle(battle);

        game.addPlayer(player);
        return game;
    };

    this.addActorsToArmy = function(army, num, name) {
        for (let i = 0; i < num; i++) {
            const actor = _parser.createActualObj('actors', name);
            actor.setFOVRange(10);
            army.addActor(actor);
        }
    };

    /* eslint-disable */
    let _listener = null;
    /* eslint-enable */

    this.createLastBattle = function(game, obj) {
        const levelConf = cityConfBase(_parser);
        const level = this.createLevel('town', obj.cols, obj.rows, levelConf);
        _listener = new DemonKillListener(game, level);

        this.createHumanArmy(level, _parser);

        level.setOnFirstEnter(function() {
            const demonEvent = new RG.Time.RogueOneShotEvent(
                that.spawnDemonArmy.bind(that, level, _parser), 100 * 20,
                'Demon hordes are unleashed from the unsilent abyss!');
            game.addEvent(demonEvent);
        });

        level.setOnEnter( function() {
            _playerFOV = game.getPlayer().getFOVRange();
            game.getPlayer().setFOVRange(20);
        });
        level.setOnExit( function() {
            game.getPlayer().setFOVRange(_playerFOV);
        });

        game.addLevel(level);
        return level;
    };
};
RG.extend2(RG.FCCGame, RG.Factory.Base);


module.exports = RG.Factory;

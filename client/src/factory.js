

const RG = require('./rg.js');
const debug = require('debug')('bitn:factory');

RG.Actor = require('./actor');
RG.Component = require('./component.js');
RG.Brain = require('./brain.js');
RG.Map = require('./map.js');
RG.Map.Generator = require('./map.generator');
RG.Map.Level = require('./level');
RG.Verify = require('./verify');
RG.World = require('./world');

const {FactoryActor} = require('./factory.actors');
const {FactoryItem} = require('./factory.items');
const DungeonPopulate = require('./dungeon-populate');
const MountainGenerator = require('./mountain-generator');

const RNG = RG.Random.getRNG();

/* Returns a basic configuration for a city level. */
RG.Factory.cityConfBase = conf => {
    const userConf = conf || {};
    const obj = {
        nHouses: 10, minHouseX: 5, maxHouseX: 10, minHouseY: 5,
        maxHouseY: 10, nShops: 1,
        shopFunc: [
            item => item.type === RNG.arrayGetRand(RG.SHOP_TYPES)
        ],
        shopType: '', levelType: 'arena'
    };
    const result = Object.assign(obj, userConf);
    return result;
};

RG.Factory.addPropsToFreeCells = function(level, props, type) {
    const freeCells = level.getMap().getFree();
    RG.Factory.addPropsToCells(level, freeCells, props, type);
};

const ItemConf = function(conf) {
    const req = ['itemsPerLevel', 'maxValue', 'func'];
    req.forEach(prop => {
        if ((prop in conf)) {
            this[prop] = conf[prop];
        }
        else {
            const msg = `${prop} must be given`;
            RG.err('ItemConf', 'new', msg);
        }
    });
};

/* Adds to the given level, and its cells, all props given in the list. Assumes
 * that all props are of given type (placement function is different for
 * different types. */
RG.Factory.addPropsToCells = function(level, cells, props, type) {
    for (let i = 0; i < props.length; i++) {
        if (cells.length > 0) {
            const index = RNG.randIndex(cells);
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

/* Factory object for creating actors. */

/* Factory object for creating some commonly used objects. Because this is a
* global object RG.FACT, no state should be used. */
RG.Factory.Base = function() {
    this._verif = new RG.Verify.Conf('Factory.Base');
    this._actorFact = new FactoryActor();
    this._itemFact = new FactoryItem();

    /* Creates a new die object from array or die expression '2d4 + 3' etc.*/
    this.createDie = strOrArray => {
        const numDiceMod = RG.parseDieSpec(strOrArray);
        if (numDiceMod.length === 3) {
            return new RG.Die(numDiceMod[0], numDiceMod[1], numDiceMod[2]);
        }
        return null;
    };

    /* Factory method for players.*/
    this.createPlayer = (name, obj) => this._actorFact.createPlayer(name, obj);

    /* Factory method for monsters.*/
    this.createActor = (name, obj = {}) => (
        this._actorFact.createActor(name, obj)
    );

    /* Factory method for AI brain creation.*/
    this.createBrain = (actor, brainName) =>
        this._actorFact.createBrain(actor, brainName);

    /* Factory method for AI brain creation.*/
    this.createSpell = name => this._actorFact.createSpell(name);

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

        if (levelType === 'empty') {
            mapObj = mapgen.createEmptyMap();
        }
        else if (levelType === 'town') {
            mapObj = mapgen.createTownBSP(cols, rows, conf);
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
            mapObj = mapgen.createMountain(cols, rows, conf);
        }
        else if (levelType === 'summit') {
            mapObj = mapgen.createSummit(cols, rows, conf);
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
        this.setLevelExtras(level, mapObj);
        return level;
    };

    this.setLevelExtras = (level, mapObj) => {
        const extras = {};
        const possibleExtras = ['rooms', 'corridors', 'vaults', 'houses',
            'paths'];
        possibleExtras.forEach(extra => {
            if (mapObj.hasOwnProperty(extra)) {
                extras[extra] = mapObj[extra];
            }
        });
        level.setExtras(extras);
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
        this._verif.verifyConf('createShops', conf, ['nShops']);
        const dungPopul = new DungeonPopulate();
        level.addExtras('houses', mapObj.houses);
        dungPopul.createShops(level, conf);
    };

    /* Creates trainers for the given level. */
    this.createTrainers = function(level, conf) {
        const dungPopul = new DungeonPopulate();
        dungPopul.createTrainers(level, conf);
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
        this._verif.verifyConf('addNRandItems', conf, ['func', 'maxValue']);
        // Generate the items randomly for this level
        return this._itemFact.addNRandItems(level, parser, conf);
    };

    /* Adds N random monsters to the level based on given danger level.
     * Returns the number of actors added. */
    this.addNRandActors = (level, parser, conf) => {
        this._verif.verifyConf('addNRandActors', conf,
            ['maxDanger', 'actorsPerLevel']);
        // Generate the enemies randomly for this level
        const maxDanger = conf.maxDanger;

        const actors = this.generateNActors(conf.actorsPerLevel, conf.func,
            maxDanger);
        if (!actors) {
            return 0;
        }
        RG.Factory.addPropsToFreeCells(level, actors, RG.TYPE_ACTOR);
        return actors.length;
    };

    this.setParser = parser => {
        this._parser = parser;
    };

    this.generateNActors = (nActors, func, maxDanger) => {
        if (!Number.isInteger(maxDanger) || maxDanger <= 0) {
            RG.err('Factory.Zone', 'generateNActors',
                'maxDanger (> 0) must be given. Got: ' + maxDanger);
        }
        const parser = this._parser;
        const actors = [];
        for (let i = 0; i < nActors; i++) {

            // Generic randomization with danger level
            let actor = null;
            if (!func) {
                actor = parser.createRandomActorWeighted(1, maxDanger,
                    {func: function(actor) {return actor.danger <= maxDanger;}}
                );
            }
            else {
                actor = parser.createRandomActor({
                    func: actor => (func(actor) &&
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
            }

        }
        return actors;
    };

    /* Adds a random number of gold coins to the level. */
    this.addRandomGold = (level, parser, conf) => {
        this._itemFact.addRandomGold(level, parser, conf);
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

RG.Factory.Zone = function() {
    RG.Factory.Base.call(this);
    this._verif = new RG.Verify.Conf('Factory.Zone');
    this._parser = RG.ObjectShell.getParser();

    this.getRandLevelType = () => {
        const type = ['uniform', 'rooms', 'rogue', 'digger'];
        const nLevelType = RNG.randIndex(type);
        return type[nLevelType];
    };

    this.addItemsAndActors = function(level, conf) {
        this._verif.verifyConf('addItemsAndActors', conf,
            ['nLevel', 'sqrPerItem', 'sqrPerActor', 'maxValue']);

        const numFree = level.getMap().getFree().length;
        const actorsPerLevel = Math.round(numFree / conf.sqrPerActor);
        const itemsPerLevel = Math.round(numFree / conf.sqrPerItem);
        const goldPerLevel = itemsPerLevel;

        debug(`Adding ${actorsPerLevel} monsters and items ` +
            `${itemsPerLevel} to the level`);

        const getItemConstraintFunc = (min, max) => (
            item => (
                item.value >= min &&
                item.value <= max
            )
        );

        const itemConf = {
            nLevel: conf.nLevel,
            itemsPerLevel,
            func: getItemConstraintFunc(0, conf.maxValue),
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
        else if (conf.minValue) {
            itemConf.func = getItemConstraintFunc(conf.minValue, conf.maxValue);
        }
        this.addNRandItems(level, this._parser, itemConf);

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
        this.addNRandActors(level, this._parser, actorConf);

        if (itemConf.gold) {
            const goldConf = {
                goldPerLevel,
                nLevel: conf.nLevel + 1
            };
            this.addRandomGold(level, this._parser, goldConf);
        }
    };

    /* Creates dungeon level. Unless levelType is given, chooses the type
     * randomly. */
    this.createDungeonLevel = function(conf) {
        this._verif.verifyConf('createDungeonLevel', conf, ['x', 'y']);
        let level = null;
        let levelType = this.getRandLevelType();
        if (conf.dungeonType && conf.dungeonType !== '') {
            levelType = conf.dungeonType;
        }
        debug(`dungeonLevel: ${levelType}, ${JSON.stringify(conf)}`);
        level = this.createLevel(levelType, conf.x, conf.y, conf);
        this.addItemsAndActors(level, conf);
        this.addExtraDungeonFeatures(level, conf);
        return level;
    };


    this.createMountainLevel = function(conf) {
        let mountConf = Object.assign(MountainGenerator.getFaceOptions(),
            {
                maxValue: 100,
                sqrPerActor: 50,
                sqrPerItem: 200,
                nLevel: 4
            }
        );
        mountConf = Object.assign(mountConf, conf);
        debug(`Creating mountain level with ${conf}`);
        const mountGen = new MountainGenerator();
        const mountainLevel = mountGen.createFace(conf.x, conf.y,
            mountConf);
        /* const mountainLevel = this.createLevel('mountain',
            conf.x, conf.y, mountConf);*/
        this.addItemsAndActors(mountainLevel, mountConf);
        return mountainLevel;
    };

    this.createSummitLevel = function(conf) {
        this._verif.verifyConf('createSummitLevel', conf, ['cols', 'rows']);
        let summitConf = {
            maxValue: 100,
            sqrPerActor: 20,
            sqrPerItem: 200,
            nLevel: 4
        };
        summitConf = Object.assign(summitConf, conf);

        const mountGen = new MountainGenerator();
        const summitLevel = mountGen.createSummit(conf.cols, conf.rows,
            summitConf);
        debug(`Creating summit level with ${conf}`);
        this.addItemsAndActors(summitLevel, summitConf);
        if (!conf.maxValue) {conf.maxValue = summitConf.maxValue;}
        return summitLevel;
    };

    //---------------------------
    // CITY LEVELS
    //---------------------------

    /* Called for each nLevels of city quarter. Delegates the task to other
    * functions based on the type of city and quarter. */
    this.createCityLevel = function(nLevel, conf) {
        const levelConf = RG.Factory.cityConfBase(conf);
        levelConf.parser = this._parser;
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

        if (conf.friendly) {
            const actors = cityLevel.getActors();
            actors.forEach(actor => {
                if (!actor.has('NonSentient')) {
                    actor.getBrain().getMemory().removeEnemyType('player');
                }
            });
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
            alignment = RNG.arrayGetRand(RG.ALIGNMENTS);
        }

        if (!levelConf.actor) {
            if (alignment === RG.ALIGN_GOOD) {
                this.populateWithHumans(level, levelConf);
            }
            else if (alignment === RG.ALIGN_EVIL) {
                this.populateWithEvil(level, levelConf);
            }
            else {
                this.populateWithNeutral(level, levelConf);
            }
        }
        else {
            this.populateWithActors(level, levelConf);
        }
    };

    /* Adds items to the city level in a reasonable way. */
    this.addItemsToCityLevel = function(level, levelConf) {
        const map = level.getMap();
        const floorCells = map.getCells(cell => (
            cell.getBaseElem().getType() === 'floorhouse'
        ));
        const factItem = new FactoryItem();
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

    this.populateWithActors = function(level, levelConf) {
        console.log('Factory populateWithActors now');
        const actorConf = {
            actorsPerLevel: levelConf.actorsPerLevel || 100,
            maxDanger: levelConf.maxDanger || 10,
            func: levelConf.actor
        };
        const nAdded = this.addNRandActors(level, this._parser, actorConf);
        if (nAdded === 0) {
            const parent = level.getParent();
            let msg = 'No actors added to level.';
            if (parent) {
                msg += ' Level parent: ' + parent.getName();
            }
            RG.err('Factory', 'populateWithActors', msg);
        }
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
        this.addNRandActors(level, this._parser, actorConf);
    };

    this.populateWithEvil = function(level, levelConf) {
        let allOK = false;
        while (!allOK) {
            const raceType = RNG.arrayGetRand(RG.EVIL_RACES);
            const actorConf = {
                actorsPerLevel: levelConf.actorsPerLevel || 100,
                maxDanger: levelConf.maxDanger || 10,
                func: actor => (
                    actor.type === raceType
                )
            };
            if (levelConf.func) {actorConf.func = levelConf.func;}
            allOK = this.addNRandActors(level, this._parser, actorConf);
        }
    };

    this.populateWithNeutral = function(level, levelConf) {
        const raceType = RNG.arrayGetRand(RG.NEUTRAL_RACES);
        const actorConf = {
            actorsPerLevel: levelConf.actorsPerLevel || 100,
            maxDanger: levelConf.maxDanger || 10,
            func: actor => (
                actor.type === raceType
            )
        };
        if (levelConf.func) {actorConf.func = levelConf.func;}
        this.addNRandActors(level, this._parser, actorConf);
    };

    this.addActorToLevel = (actorName, level) => {
        const actor = this._parser.createActor(actorName);
        const cell = level.getFreeRandCell();
        level.addActor(actor, cell.getX(), cell.getY());
    };

    /* Adds some special features to dungeon levels to make them more
     * interestings. */
    this.addExtraDungeonFeatures = (level, conf) => {
        const extras = level.getExtras();
        if (extras.rooms) {
            extras.rooms.forEach(room => {
                room.getDoors((x, y) => {
                    level.addElement(new RG.Element.Door(), x, y);
                });
            });

            const room = RNG.arrayGetRand(extras.rooms);
            const bbox = room.getBbox();
            this.addActorsToBbox(level, bbox, conf);
        }
    };

    this.addActorsToBbox = (level, bbox, conf) => {
        const nActors = conf.nActors || 4;
        const {maxDanger, func} = conf;
        const actors = this.generateNActors(nActors, func, maxDanger);
        const freeCells = level.getMap().getFreeInBbox(bbox);
        if (freeCells.length < nActors) {
            RG.warn('Factory.Zone', 'addActorsToBbox',
                'Not enough free cells');
        }
        RG.Factory.addPropsToCells(level, freeCells, actors, RG.TYPE_ACTOR);
    };

    /* Adds N items to the given level in bounding box coordinates. */
    this.addItemsToBbox = (level, bbox, conf) => {
        const nItems = conf.nItems || 4;
        let itemConf = Object.assign({itemsPerLevel: nItems}, conf);
        itemConf = new ItemConf(itemConf);
        const freeCells = level.getMap().getFreeInBbox(bbox);
        const itemFact = new FactoryItem();
        const items = itemFact.generateItems(this._parser, itemConf);
        RG.Factory.addPropsToCells(level, freeCells, items, RG.TYPE_ITEM);
    };

};
RG.extend2(RG.Factory.Zone, RG.Factory.Base);

module.exports = RG.Factory;

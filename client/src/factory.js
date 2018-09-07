
const RG = require('./rg.js');
// const debug = require('debug')('bitn:Factory.Base');

RG.Map = require('./map.js');
RG.Map.Generator = require('./map.generator');
RG.Map.Level = require('./level');
RG.Verify = require('./verify');
RG.World = require('./world');

const {FactoryActor} = require('./factory.actors');
const {FactoryItem} = require('./factory.items');
const DungeonPopulate = require('./dungeon-populate');

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


module.exports = RG.Factory;

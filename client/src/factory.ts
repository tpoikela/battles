
import RG from './rg';
// const debug = require('debug')('bitn:FactoryBase');

import {Cell} from './map.cell';
import {Level} from './level';
import {MapGenerator} from './map.generator';
import * as Verify from './verify';
import {Placer} from './placer';

import {FactoryActor} from './factory.actors';
import {FactoryItem} from './factory.items';
import {DungeonPopulate}from './dungeon-populate';
import {EventPool} from '../src/eventpool';

const POOL = EventPool.getPool();

const RNG = RG.Random.getRNG();

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

export const Factory: any = {};

/* Returns a basic configuration for a city level. */
Factory.cityConfBase = conf => {
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


//---------------------------------------------------------------------------
// FACTORY OBJECTS
//---------------------------------------------------------------------------

/* Factory object for creating actors. */

/* Factory object for creating some commonly used objects. Because this is a
* global object RG.FACT, no state should be used. */
export const FactoryBase = function() {
    this._verif = new Verify.Conf('FactoryBase');
    this._actorFact = new FactoryActor();
    this._itemFact = new FactoryItem();

    /* Creates a new die object from array or die expression '2d4 + 3' etc.*/
    this.createDie = strOrArray => {
        return RG.createDie(strOrArray);
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
        new Cell(x, y, new RG.Element.Base('floor'));

    this.createWallCell = (x, y) =>
        new Cell(x, y, new RG.Element.Base('wall'));

    /* Factory method for creating levels.*/
    this.createLevel = function(levelType, cols, rows, conf) {
        const mapgen = new MapGenerator();
        let mapObj = null;
        const level = new Level(cols, rows);
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
            RG.err('FactoryBase', 'createLevel',
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
        Placer.addPropsToFreeCells(level, actors, RG.TYPE_ACTOR);
        return actors.length;
    };

    this.setParser = parser => {
        this._parser = parser;
    };

    this.generateNActors = (nActors, func, maxDanger) => {
        return this._actorFact.generateNActors(nActors, func, maxDanger);
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
                POOL.emitEvent(RG.EVT_ACTOR_CREATED, {actor: demon,
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
                    POOL.emitEvent(RG.EVT_ACTOR_CREATED, {actor: beast,
                        level, msg: 'DemonSpawn'});
                }
                else {
                    RG.warn('FactoryBase', 'createBeastArmy',
                        `Cannot put beast to ${xAct}, ${yAct}.`);
                }
            }
        }
        RG.debug(this, 'Blizzard beasts should now appear.');
    };

    this.addActorsToBbox = (level, bbox, conf) => {
        const nActors = conf.nActors || 4;
        const {maxDanger, func} = conf;
        const actors = this.generateNActors(nActors, func, maxDanger);
        Placer.addActorsToBbox(level, bbox, actors);
    };

    /* Adds N items to the given level in bounding box coordinates. */
    this.addItemsToBbox = (level, bbox, conf) => {
        const nItems = conf.nItems || 4;
        let itemConf = Object.assign({itemsPerLevel: nItems}, conf);
        itemConf = new ItemConf(itemConf);
        const itemFact = new FactoryItem();
        const items = itemFact.generateItems(itemConf);
        const freeCells = level.getMap().getFreeInBbox(bbox);
        Placer.addPropsToCells(level, freeCells, items, RG.TYPE_ITEM);
    };

};

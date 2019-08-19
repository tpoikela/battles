
import RG from './rg';

import {Cell} from './map.cell';
import {Level} from './level';
import {MapGenerator} from './generator';
import * as Verify from './verify';
import {Placer} from './placer';

import {FactoryActor} from './factory.actors';
import {FactoryItem} from './factory.items';
import {FactoryLevel} from './factory.level';
import {EventPool} from '../src/eventpool';
import {Random} from './random';
import * as Element from './element';
import {ELEM_MAP} from '../data/elem-constants';

const POOL = EventPool.getPool();

const RNG = Random.getRNG();

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
        nShops: 1,
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

/* Factory object for creating some commonly used objects. */
export const FactoryBase = function() {
    this._verif = new Verify.Conf('FactoryBase');
    this._actorFact = new FactoryActor();
    this._itemFact = new FactoryItem();
    this._levelFact = new FactoryLevel();

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

    /* Factory method for Spell creation. */
    this.createSpell = name => this._actorFact.createSpell(name);

    this.createElement = (elemType) => {
        if (ELEM_MAP.elemTypeToObj[elemType]) {
            return ELEM_MAP.elemTypeToObj[elemType];
        }
        switch (elemType) {
            case 'door' : return new Element.ElementDoor(true);
            case 'opendoor' : return new Element.ElementDoor(false);
            default: return null;
        }
    };

    this.createFloorCell = (x, y): Cell =>
        new Cell(x, y, new Element.ElementBase('floor'));

    this.createWallCell = (x, y): Cell =>
        new Cell(x, y, new Element.ElementWall('wall'));

    /* Factory method for creating levels.*/
    this.createLevel = function(levelType, cols, rows, conf): Level {
        return this._levelFact.createLevel(levelType, cols, rows, conf);
    };


    /* Adds N random items to the level based on maximum value.*/
    this.addNRandItems = (level, parser, conf) => {
        this._verif.verifyConf('addNRandItems', conf, ['func', 'maxValue']);
        // Generate the items randomly for this level
        return this._itemFact.addNRandItems(level, parser, conf);
    };

    /* Adds N random monsters to the level based on given danger level.
     * Returns the number of actors added. */
    this.addNRandActors = (level: Level, parser, conf): number => {
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

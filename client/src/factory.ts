
import RG from './rg';

import {Cell} from './map.cell';
import {Level} from './level';
import * as Verify from './verify';
import {Placer} from './placer';

import {FactoryActor} from './factory.actors';
import {FactoryItem} from './factory.items';
import {FactoryLevel} from './factory.level';
import {EventPool} from '../src/eventpool';
import {Random} from './random';
import * as Element from './element';
import {ELEM_MAP} from '../data/elem-constants';
import {ItemConf, ActorConf, TShellFunc} from './interfaces';

const POOL = EventPool.getPool();

const RNG = Random.getRNG();

type Parser = import('./objectshellparser').Parser;
const Stairs = Element.ElementStairs;

export const Factory: any = {};

/* Returns a basic configuration for a city level. */
Factory.cityConfBase = (conf) => {
    const userConf = conf || {};
    const obj: any = {
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

/* Factory object for creating some commonly used objects. */
export class FactoryBase {
    protected _verif: Verify.Conf;
    protected _actorFact: FactoryActor;
    protected _itemFact: FactoryItem;
    protected _levelFact: FactoryLevel;
    protected _parser: Parser;

    constructor() {
        this._verif = new Verify.Conf('FactoryBase');
        this._actorFact = new FactoryActor();
        this._itemFact = new FactoryItem();
        this._levelFact = new FactoryLevel();
    }

    /* Factory method for players.*/
    public createPlayer(name: string, obj) {
        return this._actorFact.createPlayer(name, obj);
    }

    /* Factory method for monsters.*/
    public createActor(name: string, obj = {}) {
        return this._actorFact.createActor(name, obj);
    }

    /* Factory method for AI brain creation.*/
    public createBrain(actor, brainName: string) {
        return this._actorFact.createBrain(actor, brainName);
    }

    /* Factory method for Spell creation. */
    public createSpell(name: string) {
        return this._actorFact.createSpell(name);
    }

    public createElement(elemType: string): null | Element.ElementBase {
        if (ELEM_MAP.elemTypeToObj[elemType]) {
            return ELEM_MAP.elemTypeToObj[elemType];
        }
        switch (elemType) {
            case 'door' : return new Element.ElementDoor(true);
            case 'opendoor' : return new Element.ElementDoor(false);
            case 'stairsUp' : return new Stairs(elemType);
            case 'stairsDown' : return new Stairs(elemType);
            default: return null;
        }
    }

    public createFloorCell(x: number, y: number): Cell {
        return new Cell(x, y, new Element.ElementBase('floor'));
    }

    public createWallCell(x: number, y: number): Cell {
        return new Cell(x, y, new Element.ElementWall('wall'));
    }

    /* Factory method for creating levels.*/
    public createLevel(levelType: string, cols, rows, conf): Level {
        return this._levelFact.createLevel(levelType, cols, rows, conf);
    }

    /* Adds N random items to the level based on maximum value.*/
    public addNRandItems(level: Level, parser: Parser, conf: ItemConf) {
        this._verif.verifyConf('addNRandItems', conf, ['item', 'maxValue']);
        // Generate the items randomly for this level
        return this._itemFact.addNRandItems(level, conf);
    }

    /* Adds N random monsters to the level based on given danger level.
     * Returns the number of actors added. */
    public addNRandActors(level: Level, parser: Parser, conf: ActorConf): number {
        this._verif.verifyConf('addNRandActors', conf,
            ['maxDanger', 'actorsPerLevel']);
        // Generate the enemies randomly for this level
        const maxDanger = conf.maxDanger;
        const actors = this.generateNActors(conf.actorsPerLevel, conf.actor,
            maxDanger);
        if (!actors) {
            return 0;
        }
        Placer.addPropsToFreeCells(level, actors);
        return actors.length;
    }

    public setParser(parser: Parser) {
        this._parser = parser;
    }

    public generateNActors(nActors: number, func: TShellFunc, maxDanger: number) {
        return this._actorFact.generateNActors(nActors, func, maxDanger);
    }

    /* Adds a random number of gold coins to the level. */
    public addRandomGold(level: Level, parser: Parser, conf: ItemConf) {
        this._itemFact.addRandomGold(level, parser, conf);
    }

    public createHumanArmy(level: Level, parser: Parser) {
        for (let y = 0; y < 2; y++) {
            for (let x = 0; x < 20; x++) {
                const human = parser.createActor('fighter');
                level.addActor(human, x + 1, 4 + y);
            }

            const warlord = parser.createActor('warlord');
            level.addActor(warlord, 10, y + 7);
        }
    }

    public createDemonArmy(level: Level, parser: Parser) {
        for (let y = 0; y < 2; y++) {
            for (let i = 0; i < 10; i++) {
                const demon = parser.createActor('winter demon');
                level.addActor(demon, i + 10, 14 + y);
                POOL.emitEvent(RG.EVT_ACTOR_CREATED, {actor: demon,
                    level, msg: 'DemonSpawn'});
            }
        }
    }

    public createBeastArmy(level: Level, parser: Parser) {
        const x0 = level.getMap().cols / 2;
        const y0 = level.getMap().rows / 2;
        for (let y = y0; y < y0 + 2; y++) {
            for (let x = x0; x < x0 + 10; x++) {
                const beast = parser.createActor('blizzard beast');
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
    }

    public addActorsToBbox(level: Level, bbox, conf) {
        const nActors = conf.nActors || 4;
        const {maxDanger, func} = conf;
        const actors = this.generateNActors(nActors, func, maxDanger);
        Placer.addActorsToBbox(level, bbox, actors);
    }

    /* Adds N items to the given level in bounding box coordinates. */
    public addItemsToBbox(level: Level, bbox, conf: ItemConf) {
        const nItems = conf.nItems || 4;
        const itemConf = Object.assign({itemsPerLevel: nItems}, conf);
        // itemConf = new ItemConf(itemConf);
        const itemFact = new FactoryItem();
        const items = itemFact.generateItems(itemConf);
        const freeCells = level.getMap().getFreeInBbox(bbox);
        Placer.addPropsToCells(level, freeCells, items);
    }

}

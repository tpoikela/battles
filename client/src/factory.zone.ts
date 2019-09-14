
import RG from './rg';

import dbg = require('debug');
const debug = dbg('bitn:FactoryZone');

import * as Verify from './verify';
import {Factory, FactoryBase} from './factory';
import {FactoryItem} from './factory.items';
import {FactoryLevel} from './factory.level';
import {MountainGenerator, CityGenerator, CastleGenerator} from './generator';
import {Random} from './random';
import {ObjectShell} from './objectshellparser';
import * as Element from './element';

type Level = import('./level').Level;

const RNG = Random.getRNG();

export interface ActorConf {
    actorsPerLevel: number;
    maxDanger: number;
    func?: (actor) => boolean;
}

export interface ItemConf { // TODO cleanup
    itemsPerLevel?: number;
    nItems?: number;
    maxValue: number;
    func?: (actor) => boolean;
}

export const FactoryZone = function() {
    this._verif = new Verify.Conf('FactoryZone');
    this._parser = ObjectShell.getParser();
    this._levelFact = new FactoryLevel();
    this._factBase = new FactoryBase();
    this.rng = RNG;

    this.getRandLevelType = () => {
        const type = ['uniform', 'rooms', 'rogue', 'digger'];
        const nLevelType = this.rng.randIndex(type);
        return type[nLevelType];
    };

    this.setRNG = (rng: Random): void => {
        this.rng = rng;
    };

    this.addItemsAndActors = function(level: Level, conf): void {
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
        this._factBase.addNRandItems(level, this._parser, itemConf);

        const actorConf: ActorConf = {
            actorsPerLevel: conf.actorsPerLevel || actorsPerLevel,
            maxDanger: conf.maxDanger || conf.nLevel + 1
        };
        if (conf.actor) {
            if (typeof conf.actor === 'function') {
                actorConf.func = conf.actor;
            }
            else {
                RG.err('FactoryZone', 'addItemsAndActors',
                    'conf.actor must be a function');
            }
        }
        this._factBase.addNRandActors(level, this._parser, actorConf);

        if (itemConf.gold) {
            const goldConf = {
                goldPerLevel,
                nLevel: conf.nLevel + 1
            };
            this._factBase.addRandomGold(level, this._parser, goldConf);
        }
    };

    /* Creates dungeon level. Unless levelType is given, chooses the type
     * randomly. */
    this.createDungeonLevel = function(conf): Level {
        this._verif.verifyConf('createDungeonLevel', conf, ['x', 'y']);
        let level = null;
        let levelType = this.getRandLevelType();
        if (conf.dungeonType && conf.dungeonType !== '') {
            levelType = conf.dungeonType;
        }
        debug(`dungeonLevel: ${levelType}, ${JSON.stringify(conf)}`);
        level = this._levelFact.createLevel(levelType, conf.x, conf.y, conf);
        this.addItemsAndActors(level, conf);
        this.addExtraDungeonFeatures(level, conf);
        return level;
    };


    this.createMountainLevel = function(conf): Level {
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
        this.addItemsAndActors(mountainLevel, mountConf);
        return mountainLevel;
    };

    this.createSummitLevel = function(conf): Level {
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
    this.createCityLevel = function(nLevel: number, conf): Level {
        const levelConf = Factory.cityConfBase(conf);
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
            cityLevel = this._levelFact.createLevel('town', x, y, levelConf);
            this.populateCityLevel(cityLevel, levelConf);
        }

        if (conf.friendly) {
            const actors = cityLevel.getActors();
            actors.forEach(actor => {
                if (!actor.has('NonSentient')) {
                    actor.getBrain().getMemory().removeEnemyType('player');
                }
            });
        }

        if (conf.disposition) {
            const {disposition} = conf;
            const actors = cityLevel.getActors();
            actors.forEach(actor => {
                Object.keys(disposition).forEach(name => {
                    if (disposition[name] === 'enemy') {
                        actor.getBrain().getMemory().addEnemyType(name);
                    }
                });
            });
        }

        return cityLevel;
    };

    this.createVillageLevel = function(cols: number, rows: number, levelConf): Level {
        levelConf.levelType = 'empty';
        levelConf.wallType = 'wooden';

        if (!levelConf.actorsPerLevel) {
            levelConf.actorsPerLevel = 30;
        }
        if (!levelConf.maxDanger) {
            levelConf.maxDanger = 3;
        }
        if (!levelConf.itemsPerLevel) {
            levelConf.itemsPerLevel = levelConf.maxDanger * 2;
        }
        const cityGen = new CityGenerator();
        const level = cityGen.create(cols, rows, levelConf);
        this.populateCityLevel(level, levelConf);
        this.addItemsToCityLevel(level, levelConf);
        return level;
    };

    this.createFortLevel = function(cols: number, rows: number, levelConf): Level {
        const castleGen = new CastleGenerator();
        levelConf.roomCount = -1; // Fill all castle tiles
        if (!levelConf.maxDanger) {levelConf.maxDanger = 6;}
        const level = castleGen.create(100, 84, levelConf);
        this.populateCityLevel(level, levelConf);
        return level;
    };

    this.createCapitalLevel = function(nLevel: number, cols: number, rows: number, levelConf): Level {
        levelConf.levelType = 'miner';
        let level = null;
        if (nLevel === 0) {
            levelConf.levelType = 'townwithwall';
            level = this._levelFact.createLevel('townwithwall', 200, 84, levelConf);
        }
        else {
            level = this._levelFact.createLevel('town', 100, 84, levelConf);
        }
        this.populateCityLevel(level, levelConf);
        return level;
    };

    this.createStrongholdLevel = function(cols: number, rows: number, levelConf): Level {
        levelConf.levelType = 'miner';
        const level = this._levelFact.createLevel('town', 100, 84, levelConf);
        this.populateCityLevel(level, levelConf);
        return level;
    };

    this.populateCityLevel = function(level: Level, levelConf): void {
        let alignment = levelConf.alignment;
        if (!alignment) {
            alignment = this.rng.arrayGetRand(RG.ALIGNMENTS);
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
    this.addItemsToCityLevel = function(level: Level, levelConf): void {
        const map = level.getMap();
        const floorCells = map.getCells(cell => (
            cell.getBaseElem().getType() === 'floorhouse'
        ));
        const factItem = new FactoryItem();
        const parser = ObjectShell.getParser();
        const itemConf: ItemConf = {
            func: item => item.value <= (levelConf.maxDanger * 10),
            maxValue: levelConf.maxDanger * 50
        };
        if (!RG.isNullOrUndef([levelConf.itemsPerLevel])) {
            itemConf.itemsPerLevel = levelConf.itemsPerLevel;
        }

        factItem.addItemsToCells(level, parser, floorCells, itemConf);
    };

    this.populateWithActors = function(level: Level, levelConf): void {
        const actorConf = {
            actorsPerLevel: levelConf.actorsPerLevel || 100,
            maxDanger: levelConf.maxDanger || 10,
            func: levelConf.actor
        };
        const nAdded = this._factBase.addNRandActors(level, this._parser, actorConf);
        if (nAdded === 0) {
            const parent = level.getParent();
            let msg = 'No actors added to level.';
            msg += '\nUsed conf was ' + JSON.stringify(actorConf);
            if (parent) {
                msg += '\nLevel parent: ' + parent.getName();
            }
            RG.err('FactoryZone', 'populateWithActors', msg);
        }
    };

    this.populateWithHumans = function(level: Level, levelConf): void {
        const actorConf = {
            actorsPerLevel: levelConf.actorsPerLevel || 100,
            maxDanger: levelConf.maxDanger || 10,
            func: actor => (
                actor.type === 'human' &&
                actor.name !== 'shopkeeper'
            )
        };
        if (levelConf.func) {actorConf.func = levelConf.func;}
        this._factBase.addNRandActors(level, this._parser, actorConf);
    };

    this.populateWithEvil = function(level: Level, levelConf): void {
        let allOK = false;
        while (!allOK) {
            const raceType = this.rng.arrayGetRand(RG.EVIL_RACES);
            const actorConf = {
                actorsPerLevel: levelConf.actorsPerLevel || 100,
                maxDanger: levelConf.maxDanger || 10,
                func: actor => (
                    actor.type === raceType
                )
            };
            if (levelConf.func) {actorConf.func = levelConf.func;}
            allOK = this._factBase.addNRandActors(level, this._parser, actorConf);
        }
    };

    this.populateWithNeutral = function(level: Level, levelConf): void {
        const raceType = this.rng.arrayGetRand(RG.NEUTRAL_RACES);
        const actorConf = {
            actorsPerLevel: levelConf.actorsPerLevel || 100,
            maxDanger: levelConf.maxDanger || 10,
            func: actor => (
                actor.type === raceType
            )
        };
        if (levelConf.func) {actorConf.func = levelConf.func;}
        this._factBase.addNRandActors(level, this._parser, actorConf);
    };

    this.addActorToLevel = (actorName: string, level: Level): void => {
        const actor = this._parser.createActor(actorName);
        const cell = level.getFreeRandCell();
        level.addActor(actor, cell.getX(), cell.getY());
    };

    /* Adds some special features to dungeon levels to make them more
     * interestings. */
    this.addExtraDungeonFeatures = (level: Level, conf): void => {
        const extras = level.getExtras();
        if (extras.rooms) {
            extras.rooms.forEach(room => {
                room.getDoors((x, y) => {
                    level.addElement(new Element.ElementDoor(true), x, y);
                });
            });

            const foundRoom = this.rng.arrayGetRand(extras.rooms);
            const bbox = foundRoom.getBbox();
            const factBase = new FactoryBase();
            factBase.addActorsToBbox(level, bbox, conf);
        }
    };

};

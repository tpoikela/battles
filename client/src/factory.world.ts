
import RG from './rg';
import {LevelFactory} from '../data/level-factory';
import {ActorGen} from '../data/actor-gen';
import {Constraints} from './constraints';

const dbg = require('debug');
const debug = dbg('bitn:Factory.World');
const debugVerb = dbg('bitn:Factory.World-verb');

import * as Verify from './verify';
import {ConfStack} from './conf-stack';
import * as World from './world';
import {FactoryBase} from './factory';
import {FactoryZone} from './factory.zone';
import {FactoryLevel} from './factory.level';
import {FactoryActor} from './factory.actors';
import {ObjectShell} from './objectshellparser';
import {ObjectShellComps} from './objectshellcomps';

import {DungeonGenerator, PartialDungeonOpts,
    CaveGenerator,
    CastleGenerator,
    CryptGenerator} from './generator';

import {QuestPopulate} from './quest';
import {Level} from './level';
import {DungeonFeatures} from './dungeon-features';
import {OWMap} from './overworld.map';

import * as Element from './element';
import * as IF from './interfaces';
import { IConstraint, LevelConf } from './interfaces';

const Stairs = Element.ElementStairs;
const ZONE_TYPES = ['City', 'Mountain', 'Dungeon', 'BattleZone'];

type Entity = import('./entity').Entity;
type SentientActor = import('./actor').SentientActor;
type Random = import('./random').Random;
type Stairs = Element.ElementStairs;
type StairsOrList = Stairs | Stairs[];
type WorldBase = World.WorldBase;
type WorldTop = World.WorldTop;
type ZoneBase = World.ZoneBase;
type Area = World.Area;
type ConcreteSubZone = World.Branch | World.CityQuarter |
    World.MountainFace | World.MountainSummit;
type FromJSON = import('./game.fromjson').FromJSON;


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

interface PresetLevels {
    [key: string]: Level | Level[] | Level[][];
}

/* Factory object for creating worlds and zones. Uses conf object which is
 * somewhat involved. For an example, see ../data/conf.world.js. This Factory
 * does not have any procedural generation. The configuration object can be
 * generated procedurally, and the factory will then use the configuration for
 * building the world. Separation of concerns, you know.
 */
export class FactoryWorld {
    public _verif: Verify.Conf;
    public factZone: FactoryZone;

    public createAllZones: boolean;
    public worldElemByID: {[key: number]: WorldBase}; // Stores world elements by ID

    public presetLevels: PresetLevels;

    public _conf: ConfStack;

    public id2level: IF.ID2LevelMap;
    public id2levelSet: boolean;
    public id2entity: {[key: number]: Entity};

    public fromJSON: null | FromJSON;
    public overworld: null | OWMap;

    constructor() {
        this._verif = new Verify.Conf('FactoryWorld');
        this.factZone = new FactoryZone();

        // Creates all zones when the area is created if true. Setting it to true
        // makes creation of game very slow, as the full game is built in one go
        this.createAllZones = true;
        this.worldElemByID = {} as {[key: number]: WorldBase}; // Stores world elements by ID

        this.presetLevels = {};

        this._conf = new ConfStack();

        // Can be used to pass already created levels to different zones. For
        // example, after restore game, no new levels should be created
        this.id2level = {} as IF.ID2LevelMap;
        this.id2levelSet = false;
        this.id2entity = {};
        this.fromJSON = null;
        this.overworld = null;
    }

    //----------------------------------------------------------------------
    // FUNCTIONS
    //----------------------------------------------------------------------
    public setRNG(rng: Random): void {
        this.factZone.setRNG(rng);
    }


    public setPresetLevels(levels: PresetLevels): void {
        this.presetLevels = levels;
        this.debug('PresetLevels were set.');
    }

    /* If id2level is set, factory does not construct any levels. It uses
     * id2level as a lookup table instead. This is mainly used when restoring a
     * saved game. */
    public setId2Level(id2level: IF.ID2LevelMap) {
        if (Object.keys(id2level).length === 0) {
            RG.warn('FactoryWorld', 'setId2Level',
                'There are no levels/keys present in id2level map. Bug?');
        }
        this.id2level = id2level;
        this.id2levelSet = true;
        this.debug('Id2Level was set OK.');
    }

    /* Pushes the hier name and configuration on the stack. Config can be
    * queried with getConf(). */
    public pushScope(conf: {[key: string]: any}): void {
        if (conf) {
            this._conf.pushScope(conf);
        }
        else {
            RG.err('FactoryWorld', 'pushScope',
              `Null/undef conf given`);
        }
    }

    /* Removes given config and the name it contains from stacks. Reports an
    * error if removed name does not match the name in conf. */
    public popScope(conf: {[key: string]: any}): void {
        this._conf.popScope(conf);
    }

    /* Initializes the global configuration such as level size. */
    public setGlobalConf(conf: any = {}): void {
        const levelSize = conf.levelSize || 'Medium';
        const sqrPerActor = conf.sqrPerActor || RG.ACTOR_MEDIUM_SQR;
        const globalConf: IF.GlobalConf = {
            levelSize,
            dungeonX: levelSizes.dungeon[levelSize].x,
            dungeonY: levelSizes.dungeon[levelSize].y,
            sqrPerActor,
            sqrPerItem: conf.sqrPerItem || RG.LOOT_MEDIUM_SQR,
            set: true
        };
        this._conf.setGlobalConf(globalConf);
        this.debug('globalConf set to ' + JSON.stringify(globalConf));
    }

    public getGlobalConf(): IF.GlobalConf {
        return this._conf.getGlobalConf();
    }

    /* Returns a config value. */
    public getConf(keys: string) {
        return this._conf.getConf(keys);
    }

    public setOverWorld(overworld: OWMap): void {
        this.overworld = overworld;
    }

    /* Returns the full hierarchical name of the zone. */
    public getHierName(): string {return this._conf.getScope().join('.');}

    /* Creates a world using given configuration. */
    public createWorld(conf: IF.WorldConf): World.WorldTop {
        this._verif.verifyConf('createWorld', conf, ['name', 'nAreas']);
        if (!this.getGlobalConf().set) {
            this.setGlobalConf({});
        }
        if (conf.hasOwnProperty('createAllZones')) {
            this.createAllZones = conf.createAllZones;
            this.debug('createAllZones set to ' + this.createAllZones);
        }
        this.pushScope(conf);
        const world = new World.WorldTop(conf.name);
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
    }


    /* Creates an area which can be added to a world. */
    public createArea(conf: IF.AreaConf): World.Area {
        this._verif.verifyConf('createArea', conf,
            ['name', 'maxX', 'maxY']);
        this.pushScope(conf);

        const hierName = this.getHierName();

        let areaLevels = null;
        if (this.id2levelSet) {
            areaLevels = this.getAreaLevels(conf);
        }
        else {
            areaLevels = this.getPresetLevels(hierName, conf);
            if (!areaLevels || areaLevels.length === 0) {
                areaLevels = null;
            }
        }

        const area = new World.Area(conf.name, conf.maxX, conf.maxY,
            conf.cols, conf.rows, areaLevels);
        area.setConf(conf);
        area.setHierName(this.getHierName());

        // When player enters a given area tile, create zones for that tile
        if (this.createAllZones) {
            this._createAllZones(area, conf);
            area.markAllZonesCreated();
        }
        else {
            this.debug('Skipping the zone creating due to createZones=false');
        }
        this.popScope(conf);
        return area;
    }

    public restoreCreatedZones(world: WorldTop, area: Area, areaConf: IF.AreaConf): void {
        Object.keys(areaConf.zonesCreated).forEach(keyXY => {
            const [xStr, yStr] = keyXY.split(',');
            const [x, y] = [parseInt(xStr, 10), parseInt(yStr, 10)];
            if (areaConf.zonesCreated[keyXY]) {
                this.debug(`\tRestoring created zones for tile ${x},${y}`);
                this.createZonesForTile(world, area, x, y);
            }
        });
    }

    /* Creates zones for given area tile x,y with located in area areaName. */
    public createZonesForTile(world: WorldTop, area: Area, x: number, y: number): void {
        // Setup the scope & conf stacks
        if (!area.tileHasZonesCreated(x, y)) {
            this.debug(`Creating Area ${x},${y} zones (not created yet)`);
            const worldConf = world.getConf();
            this.pushScope(worldConf);
            const areaConf = area.getConf();
            this.pushScope(areaConf);

            this.populateAreaLevel(area, x, y);

            this._createAllZones(area, areaConf, x, y);
            area.markTileZonesCreated(x, y);

            // Create quests for this tile x,y
            // Unsupported for now, need to change serialisation scheme
            this.createQuests(world, area, x, y);

            // Cleanup the scope & conf stacks
            this.popScope(areaConf);
            this.popScope(worldConf);
        }
        else {
            this.debug(`Area ${x},${y} zones already created`);
        }
    }

    /* Adds actors and items into AreaTile level. Config for world/area should
     * already exists in the stack, so calling this.getConf() gets it. */
    public populateAreaLevel(area: Area, x: number, y: number): void {
        const playerX = Math.floor(area.getSizeX() / 2);
        const playerY = area.getSizeY() - 1;
        const parser = ObjectShell.getParser();

        if (!area.isLoaded(x, y)) {
            RG.err('FactoryWorld', 'populateAreaLevel',
                `Cannot populate unloaded Tile ${x},${y}`);
        }

        const level = (area.getTileXY(x, y) as World.AreaTile).getLevel();

        const xDiff = Math.abs(playerX - x);
        const yDiff = playerY - y;

        const itemsPerLevel = 7 + xDiff + 2 * yDiff;
        const actorsPerLevel = (yDiff + 1) * 10 + 2 * xDiff + 10;

        const fact = new FactoryBase();
        fact.setParser(parser);

        const maxValue = RG.getMaxValue(xDiff, yDiff);
        const maxDanger = RG.getMaxDanger(xDiff, yDiff);

        const levelConf: LevelConf = {
            itemsPerLevel,
            item: item => (
                item.value <= maxValue
                && item.type !== 'food'
            ),
            actor: actor => (
                actor.danger <= maxDanger
            ),
            gold: () => false, // No gold on the ground
            food: () => false, // No food on the ground
            maxValue,
            actorsPerLevel, maxDanger
        };
        this.setAreaLevelConstraints(levelConf, x, y);

        levelConf.item = levelConf.item;
        fact.addNRandItems(level, parser, levelConf as IF.ItemConf);
        levelConf.actor = levelConf.actor;
        fact.addNRandActors(level, parser, levelConf as IF.ActorConf);

        this.addActorSpawner(level, parser, levelConf);
    }

    public _createAllZones(area: Area, conf, tx = -1, ty = -1): void {
        this.debug(`_createAllZones ${tx}, ${ty}`);
        if (!conf.tiles) {
            // Is this ever entered? Can be removed?
            this.createZonesFromArea(area, conf, tx, ty);
        }
        else if (tx < 0 || ty < 0) {
            // RG.err('Factory', 'createAllZones',
                // 'Cannot use -1 to create all tiles here');
            this.createZonesFromArea(area, conf, tx, ty);
        }
        else {
            const areaTileConf = conf.tiles[tx][ty];
            this.createZonesFromTile(area, areaTileConf, tx, ty);
        }
    }

    public createZonesFromArea(area: Area, conf, tx = -1, ty = -1): void {
        this.debug(`createZonesFromArea ${tx}, ${ty}`);
        ZONE_TYPES.forEach(type => {
            const typeLc = type.toLowerCase();
            const createFunc = 'create' + type;
            let nZones = 0;
            if (Array.isArray(conf[typeLc])) {
                nZones = conf[typeLc].length;
            }
            this.debug(`\tnZones (${type}) is now ${nZones}`);

            for (let i = 0; i < nZones; i++) {
                const zoneConf = conf[typeLc][i];
                const {x, y} = zoneConf;

                // If tx,ty given, create only zones for tile tx,ty
                // Otherwise, create zones for all tiles
                if ((tx === -1 || tx === x) && (ty === -1 || ty === y)) {
                    // calls createDungeon, createCity, createMountain...
                    const zone = this[createFunc](zoneConf);
                    zone.setTileXY(x, y);
                    area.addZone(type, zone);
                    this.addWorldID(zoneConf, zone);
                    if (!this.id2levelSet) {
                        this.createAreaZoneConnection(area, zone, zoneConf);
                    }
                    this.addZoneComps(zone, zoneConf);
                }
            }

        });
    }

    /* Used when 'tiles' exists inside areaConf. Usually when restoring a saved
     * game. */
    public createZonesFromTile(area: Area, areaTileConf, tx, ty): void {
        ZONE_TYPES.forEach(type => {
            const typeLc = type.toLowerCase();
            const createFunc = 'create' + type;
            let nZones = 0;
            if (Array.isArray(areaTileConf[typeLc])) {
                nZones = areaTileConf[typeLc].length;
            }
            this.debug(`\t[${tx}][${ty}]: nZones (${type}) is now ${nZones}`);
            for (let i = 0; i < nZones; i++) {
                const zoneConf = areaTileConf[typeLc][i];
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
                    this.addZoneComps(zone, zoneConf);
                }
            }

        });
    }

    /* Used when creating area from existing levels. Uses id2level lookup table
     * to construct 2-d array of levels.*/
    public getAreaLevels(conf): Level[][] {
        const levels: Level[][] = [];
        if (conf.tiles) {
            conf.tiles.forEach((tileCol) => {
                const levelCol: Level[] = [];
                tileCol.forEach((tile) => {
                    const level: Level = this.id2level[tile.level];
                    if (level) {
                        levelCol.push(level);
                    }
                    else {
                        RG.err('FactoryWorld', 'getAreaLevels',
                            `No level ID ${tile.level} in id2level`);
                    }
                });
                levels.push(levelCol);
            });
        }
        else {
            RG.err('FactoryWorld', 'getAreaLevels',
                'conf.tiles null/undefined, but id2levelSet true');

        }
        return levels;
    }

    public createDungeon(conf): World.Dungeon {
        this._verif.verifyConf('createDungeon', conf,
            ['name', 'nBranches']);
        this.pushScope(conf);

        const dungeon = new World.Dungeon(conf.name);
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
                            dungeon.connectSubZones(...conn as World.SubZoneConn);
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
    }

    /* Creates one dungeon branch and all levels inside it. */
    public createBranch(conf): World.Branch {
        this._verif.verifyConf('createBranch', conf,
            ['name', 'nLevels']);
        this.pushScope(conf);

        const branch = new World.Branch(conf.name);
        const hierName = this.getHierName();
        branch.setHierName(hierName);

        const presetLevels = this.getPresetLevels(hierName, conf);

        for (let i = 0; i < conf.nLevels; i++) {
            // These are recursively fetched from config stack
            const maxDanger = this.getConf('maxDanger');
            const maxValue = this.getConf('maxValue');
            const maxRarity = this.getConf('maxRarity');
            const halfI = Math.floor(i / 2);

            const levelConf: LevelConf = {
                x: this.getConf('dungeonX'),
                y: this.getConf('dungeonY'),
                sqrPerActor: this.getConf('sqrPerActor'),
                sqrPerItem: this.getConf('sqrPerItem'),
                maxValue: maxValue ? (maxValue + i * 20) : 20 * (i + 1),
                maxDanger: maxDanger ? (maxDanger + i) : (3 + i),
                maxRarity: maxRarity ? (maxRarity + halfI) : (1 + halfI),
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
                    const [cols, rows] = [levelConf.x, levelConf.y];
                    levelConf.markersPreserved = false;
                    if ((/(crypt)/i).test(dungeonType)) {
                        const cryptGen = new CryptGenerator();
                        cryptGen.factZone = this.factZone;
                        (levelConf as any).shouldRemoveMarkers = true;
                        level = cryptGen.create(cols, rows, levelConf);
                        //rm this.factZone.addItemsAndActors(level, levelConf);
                        //rm this.factZone.addExtraDungeonFeatures(level, levelConf);
                        const markers = level.getElements().filter(e => e.getType() === 'marker');
                        if (markers.length > 0) {
                            RG.err('FactoryWorld', 'createBranch',
                                `${markers.length} left inside level: ${JSON.stringify(markers)}`);
                        }
                    }
                    else if ((/cave/).test(dungeonType)) {
                        const caveGen = new CaveGenerator();
                        level = caveGen.create(cols, rows, levelConf);
                        if (levelConf.item) {
                            levelConf.item = (shell) => shell.type !== 'food' &&
                                levelConf.item!(shell) &&
                                shell.rarity <= levelConf.maxRarity
                        }
                        this.factZone.addItemsAndActors(level, levelConf);
                        this.factZone.addExtraDungeonFeatures(level, levelConf);
                    }
                    else if (/(fort|castle)/.test(dungeonType)) {
                        const castleGen = new CastleGenerator();
                        level = castleGen.create(cols, rows, levelConf);
                    }
                    else {
                        const dungGen = new DungeonGenerator();
                        const dungOpts: PartialDungeonOpts = levelConf;
                        dungOpts.wallType = 'walldungeon';
                        dungOpts.floorType = 'floordungeon';
                        dungOpts.shouldRemoveMarkers = true;
                        level = dungGen.create(cols, rows, dungOpts);
                        const markers = level.getElements().filter(e => e.getType() === 'marker');
                        if (markers.length > 0) {
                            RG.err('FactoryWorld', 'createBranch',
                                `${markers.length} left inside level: ${JSON.stringify(markers)}`);
                        }
                    }
                    // For creating 'fixed' items and actors
                    this.addFixedFeatures(i, level, branch);
                    const dungFeat = new DungeonFeatures('dungeon');
                    if (i === (conf.nLevels - 1)) {
                        dungFeat.addLastLevelFeatures(i, level, levelConf);
                    }
                    level.get('Place').setDepth(i + 1);
                }
            }
            else if (conf.createPresetLevels && conf.create) {
                this.addFixedFeatures(i, level as Level, branch);
            }

            branch.addLevel(level as Level); // Should be Level at this point
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
    }

    /* Returns a level from presetLevels if any exist for the current level
     * number. */
    public getFromPresetLevels(
        i: number, presetLevels: IF.LevelObj[]
    ): IF.LevelSpecStub | Level | null  {
        let foundLevel = null;
        if (presetLevels.length > 0) {
            const levelObj = presetLevels.find(lv => lv.nLevel === i);
            if (levelObj) {
                foundLevel = levelObj.level;
            }
        }
        return foundLevel;
    }

    public _errorOnFunc(val: any): void {
        if (typeof val === 'function') {
            RG.err('Factory', '_errorOnFunc',
                `Function constraint not supported anymore: ${val.toString()}`);
        }
    }

    /* Sets the randomization constraints for the level based on current
     * configuration. */
    public setLevelConstraints(levelConf): void {
        const constraint = this.getConf('constraint');
        const constrFact = new Constraints();
        if (constraint) {
            const hierName = this.getHierName();
            // this._verifyConstraintKeys(constraint);
            if (constraint.actor) {
                this._errorOnFunc(constraint.actor);
                levelConf.actor = constrFact.getConstraints(constraint.actor);
                const str = JSON.stringify(constraint.actor);
                this.debug(`Found actor constraint for ${hierName}: ${str}`);
            }
            if (constraint.item) {
                this._errorOnFunc(constraint.item);
                levelConf.item = constrFact.getConstraints(constraint.item);
                const str = JSON.stringify(constraint.item);
                this.debug(`Found item constraint for ${hierName}: ${str}`);
            }
            if (constraint.food) {
                this._errorOnFunc(constraint.food);
                levelConf.food = constrFact.getConstraints(constraint.food);
                const str = JSON.stringify(constraint.food);
                this.debug(`Found food constraint for ${hierName}: ${str}`);
            }
            if (constraint.gold) {
                this._errorOnFunc(constraint.gold);
                levelConf.gold = constrFact.getConstraints(constraint.gold);
                const str = JSON.stringify(constraint.gold);
                this.debug(`Found gold constraint for ${hierName}: ${str}`);
            }
            if (constraint.shop) {
                const shopFunc = [];
                constraint.shop.forEach(con => {
                    shopFunc.push(constrFact.getConstraints(con));
                });
                levelConf.shopFunc = shopFunc;
                const str = JSON.stringify(constraint.shop);
                this.debug(`Found shop constraint for ${hierName}: ${str}`);
            }
            if (constraint.disposition) {
                const disp = constraint.disposition;
                levelConf.disposition = constraint.disposition;
            }
            if (constraint.cellsAround) {
                const {cellsAround} = constraint;
                levelConf.cellsAround = cellsAround;
            }
        }

        const groupType = this.getConf('groupType');
        const cityType = this.getConf('cityType');
        const quarterType = this.getConf('quarterType');
        const alignment = this.getConf('alignment');
        const wallType = this.getConf('wallType');
        const floorType = this.getConf('floorType');
        const isFriendly = this.getConf('friendly');
        if (groupType) {levelConf.groupType = groupType;}
        if (cityType) {levelConf.cityType = cityType;}
        if (quarterType) {levelConf.cityType = quarterType;}
        if (alignment) {levelConf.alignment = alignment;}
        if (wallType) {levelConf.wallType = wallType;}
        if (floorType) {levelConf.floorType = floorType;}
        if (isFriendly) {levelConf.friendly = true;}
    }

    public _verifyConstraintKeys(constraint): void {
        const keys = new Set(['actor', 'item', 'food', 'gold', 'shop',
            'disposition'
        ]);
        Object.keys(constraint).forEach(key => {
            if (!keys.has(key)) {
                const json = JSON.stringify(constraint);
                RG.err('Factory.World', '_verifyConstraintKeys',
                    `Unsupported key ${key} in ${json}`);
            }
        });
    }

    public setAreaLevelConstraints(levelConf, aX, aY): void {
        const key = aX + ',' + aY;
        const constraints = this.getConf('constraint');
        if (constraints && constraints.hasOwnProperty(key)) {
            const conf = {
                name: 'AreaLevel[' + key + ']',
                constraint: constraints[key]
            };
            this.pushScope(conf);
            this.setLevelConstraints(levelConf);
            this.popScope(conf);
        }
    }

    /* Adds fixed features such as stairs, actors and items into the level. */
    public addFixedFeatures(nLevel: number, level: Level, zone): void {
        const create = this.getConf('create');

        // Actor creation
        if (create && create.actor) {
            const createActors = create.actor;
            createActors.forEach(createActor => {
                if (createActor.nLevel === nLevel) {
                    const actorName = createActor.name;
                    let numActors = 1;
                    if (createActor.num) {
                        numActors = createActor.num;
                    }

                    for (let i = 0; i < numActors; i++) {
                        if (createActor.hasOwnProperty('target') &&
                            zone.getName() === createActor.target) {
                            this.factZone.addActorToLevel(actorName, level);
                        }
                        else {
                            this.factZone.addActorToLevel(actorName, level);
                        }
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
    }

    /* Returns preset levels (if any) for the current zone. */
    public getPresetLevels(hierName: string, subZoneConf) {

        // First check the configuration
        const presetLevels = this.getConf('presetLevels');
        if (presetLevels) {
            const names = Object.keys(presetLevels);
            const keyFound = names.find(item => {
                return new RegExp(item + '$').test(hierName);
            });
            if (keyFound) {
                return presetLevels[keyFound];
            }
        }

        // Then check the global preset levels
        const keys = Object.keys(this.presetLevels);
        const foundKey = keys.find(item => new RegExp(item + '$').test(hierName));
        if (foundKey) {
            return this.presetLevels[foundKey];
        }

        // Finally, check subZoneConf.createPresetLevels: ...
        if (subZoneConf && subZoneConf.createPresetLevels) {
            const {createPresetLevels} = subZoneConf;
            const levelFact = new LevelFactory(new FactoryLevel());
            const levels = levelFact.create(createPresetLevels.new,
                createPresetLevels.args as any); // TODO fix
            if (!levels) {
                let msg = 'Found createPresetLevels but no levels created';
                msg += ' conf: ' + JSON.stringify(subZoneConf);
                RG.err('Factory', 'getPresetLevels', msg);
            }
            return levels;
        }

        return [];
    }

    public createMountain(conf: IF.MountainConf): World.Mountain {
        this._verif.verifyConf('createMountain', conf,
            ['name', 'nFaces', 'face']);
        this.pushScope(conf);

        const mountain = new World.Mountain(conf.name);
        mountain.setHierName(this.getHierName());

        if (conf.nFaces !== conf.face.length) {
            const len = conf.face.length;
            RG.err('Factory.World', 'createMountain',
                `Face number mismatch [] = ${len}, n: ${conf.nFaces}`);
        }

        // Create the faces of the mountain
        for (let i = 0; i < conf.nFaces; i++) {
            const faceConf = conf.face[i];
            const mountainFace = this.createMountainFace(faceConf);
            mountain.addSubZone(mountainFace);
            this.addWorldID(faceConf, mountainFace);
        }

        // Create the mountain summits
        for (let i = 0; i < conf.nSummits; i++) {
            const summitConf = conf.summit[i];
            const mountainSummit = this.createSummit(summitConf);
            mountain.addSubZone(mountainSummit);
            this.addWorldID(summitConf, mountainSummit);
        }

        if (!this.id2levelSet) {
            if (conf.nFaces > 1 || conf.nFaces === 1 && conf.nSummits > 0) {
                if (conf.connectLevels && conf.connectLevels.length > 0) {
                    conf.connectLevels.forEach(conn => {
                        if (conn.length === 4) {
                            // conn has len 4, spread it out
                            mountain.connectSubZones(...conn as World.SubZoneConn);
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
    }

    public createMountainFace(conf: IF.FaceConf): World.MountainFace {
        if (this.id2levelSet) {
            this._verif.verifyConf('createMountainFace', conf,
                ['name', 'nLevels']);
        }
        else {
            this._verif.verifyConf('createMountainFace',
                conf, ['name', 'nLevels', 'x', 'y']);
        }

        const faceName = conf.name;
        this.pushScope(conf);
        const face = new World.MountainFace(faceName);
        const mLevelConf: LevelConf = { x: conf.x, y: conf.y,
            maxValue: conf.maxValue, maxDanger: conf.maxDanger, maxRarity: conf.maxRarity};
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
            level.get('Place').setElevation(i + 1);
            face.addLevel(level);
        }

        this._addEntranceToSubZone(face, conf);
        this.popScope(conf);
        return face;
    }

    /* Creates a subzone for mountain summit. Creates the levels contained in
     * that subzone. */
    public createSummit(conf: IF.SummitConf): World.MountainSummit {
        this._verif.verifyConf('createSummit', conf, ['name', 'nLevels']);
        this.pushScope(conf);
        const summit = new World.MountainSummit(conf.name);

        const summitLevelConf: any = Object.assign({}, conf); // TODO fix types

        this.setLevelConstraints(summitLevelConf);
        this.addMaxDangerIfMissing(summitLevelConf);

        for (let i = 0; i < conf.nLevels; i++) {
            let level = null;
            if (!this.id2levelSet) {
                if (!summitLevelConf.maxDanger) {
                    summitLevelConf.maxDanger = 4;
                }
                level = this.factZone.createSummitLevel(summitLevelConf);
                level.get('Place').setElevation(5 + i);
                const dungFeat = new DungeonFeatures('mountain');
                if (i === (conf.nLevels - 1)) {
                    dungFeat.addLastLevelFeatures(i, level, summitLevelConf);
                }
            }
            else {
                const id = conf.levels[i];
                level = this.id2level[id];
            }
            summit.addLevel(level);
        }

        this._addEntranceToSubZone(summit, conf);
        this.popScope(conf);
        return summit;
    }

    public addMaxDangerIfMissing(conf): void {
        if (!Number.isInteger(conf.maxDanger)) {
            conf.maxDanger = this.getConf('maxDanger');
        }
        if (!Number.isInteger(conf.maxValue)) {
            const maxValue = this.getConf('maxValue');
            if (maxValue) {
                conf.maxValue = maxValue;
            }
        }
        if (!Number.isInteger(conf.maxRarity)) {
            conf.maxRarity = this.getConf('maxRarity');
        }
    }

    public _addEntranceToSubZone(
        subZone: ConcreteSubZone, conf: IF.SubZoneConf
    ): void {
        if (conf.hasOwnProperty('entranceLevel')) {
            subZone.addEntrance(conf.entranceLevel!);
        }
        else if (conf.hasOwnProperty('entrance')) {
            // RG.err('FactoryWorld', '_addEntranceToSubZone',
            //     `got conf: ${conf}`);
            subZone.setEntranceLocation(conf.entrance);
        }
    }

    /* Creates a City and all its sub-zones. */
    public createCity(conf: IF.CityConf): World.City {
        this._verif.verifyConf('createCity',
            conf, ['name', 'nQuarters']);
        this.pushScope(conf);

        debugVerb('createCity', conf.name, 'addComp is ', conf.addComp);

        const city = new World.City(conf.name);
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
                            city.abutQuarters(...conn as World.SubZoneConn);
                        }
                        else {
                            RG.err('Factory.World', 'createCity',
                                'Each connection.length must be 4.');
                        }
                    });
                }
                else {
                    let msg = 'nQuarters > 1, but no conf.connectLevels.';
                    msg += `cityConf: ${JSON.stringify(conf)}`;
                    RG.err('Factory.World', 'createCity', msg);
                }
            }
        }

        this.popScope(conf);
        return city;
    }

    /* Createa CityQuarter which can be added to a city. */
    public createCityQuarter(conf: IF.QuarterConf): World.CityQuarter {
        this._verif.verifyConf('createCityQuarter',
            conf, ['name', 'nLevels']);
        this.pushScope(conf);

        const quarter = new World.CityQuarter(conf.name);
        const hierName = this.getHierName();
        quarter.setHierName(hierName);

        const presetLevels = this.getPresetLevels(hierName, conf);

        const cityLevelConf: IF.LevelConf = {
            x: conf.x || 80, y: conf.y || 40,
            maxDanger: conf.maxDanger,
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
            else if ((level as IF.LevelSpecStub).stub) {
                const stubObj = level as IF.LevelSpecStub;
                const levelFact = new LevelFactory(new FactoryLevel());
                // TODO fix type
                const levelObj = levelFact.create(stubObj.new, stubObj.args as any);
                if (levelObj) {
                    level = levelObj[0].level;
                    if (!level) {
                        RG.err('Factory', 'createCityQuarter',
                            'Stub found but cannot create level');
                    }
                }
                if (debug.enabled) {
                    this.debug('Creating level from stub ' +
                        JSON.stringify(stubObj.stub));
                }
            }
            else if (conf.createPresetLevels && conf.create) {
                this.addFixedFeatures(i, level as Level, quarter);
            }
            else {
                this.debug(`cityQuarter ${hierName} ${i} from preset level`);
            }

            level = level as Level; // Should be settled now
            // Need to add the shops to the quarter
            if (!this.id2levelSet) {
                if (level.hasExtras()) {
                    const extras = level.getExtras();
                    if (Array.isArray(extras.shops)) {
                        extras.shops.forEach(shop => {
                            quarter.addShop(shop);
                        });
                    }
                }
            }
            quarter.addLevel(level);
        }

        if (!this.id2levelSet) {
            quarter.connectLevels();
        }

        this._addEntranceToSubZone(quarter, conf);

        // Only during restore game
        if (conf.hasOwnProperty('shops')) {
            conf.shops.forEach(shop => {
                const shopObj = new World.WorldShop();
                shopObj.setLevel(this.id2level[shop.level]);
                shopObj.setCoord(shop.coord);
                shopObj._isAbandoned = shop.isAbandoned;
                if (!shop.isAbandoned) {
                    const keeper = this.id2entity[shop.shopkeeper] as SentientActor;
                    if (keeper) {
                        shopObj.setShopkeeper(keeper);
                    }
                    else {
                        const id = shop.shopkeeper;
                        const ids = Object.keys(this.id2entity);
                        const str = `Possible IDs: ${ids}`;
                        RG.err('Factory', 'createCityQuarter',
                            `Cannot find shopkeeper ID ${id}. ${str}`);
                    }
                }
                quarter.addShop(shopObj);
            });
        }

        this.popScope(conf);
        return quarter;
    }

    public createBattleZone(conf): World.BattleZone {
        this.pushScope(conf);
        const battleZone = new World.BattleZone(conf.name);
        if (!this.id2levelSet) {
            RG.err('Factory', 'createBattleZone',
                'Can create BattleZones only during restore');
        }
        for (let i = 0; i < conf.nLevels; i++) {
            const id = conf.levels[i];
            const level = this.id2level[id];
            if (level) {
                battleZone.addLevel(level);
            }
            else {
                RG.err('Factory', 'createBattleZone',
                    `Cannot find level ID ${id} for BattleZone`);
            }
        }
        this.popScope(conf);
        return battleZone;
    }

    /* Returns the name for connection elem based on zoneType and
     * zone configuration. */
    public getConnectionName(
        conf, zoneType: string, stairs: StairsOrList
    ): string {
        let name = '';
        if (zoneType === 'city') {
            name = 'town';
            if (conf.groupType) {
                if (conf.groupType === 'fort') {
                    name = 'cityfort';
                }
            }
        }
        else if (zoneType === 'mountain') {name = 'mountain';}
        else if (Array.isArray(stairs)) {
            const isDown = !stairs[0].isDown();
            name = isDown ? 'stairsDown' : 'stairsUp';
        }
        else {
            const isDown = !stairs.isDown();
            name = isDown ? 'stairsDown' : 'stairsUp';
        }
        return name;
    }

    /* Returns x,y coord which can be used for stairs placed on the tile level. */
    public getTileStairsXY(level: Level, conf): IF.TCoord {
        let [tsX, tsY] = [conf.levelX, conf.levelY];
        const isNull = RG.isNullOrUndef([tsX, tsY]);

        // If conf does not contain fixed position, get rand free cell
        if (isNull) {
            const freeAreaCell = level.getEmptyRandCell();
            if (freeAreaCell) {
                tsX = freeAreaCell.getX();
                tsY = freeAreaCell.getY();
            }
        }

        let cell = level.getMap().getCell(tsX, tsY);
        let watchdog = RG.WATCHDOG;
        // This loop executed only, if by accident we get another cell with
        // connection. 2 or more connections in cell is trouble
        while (cell.hasConnection()) {
            const freeAreaCell = level.getEmptyRandCell();
            if (freeAreaCell) {
                tsX = freeAreaCell.getX();
                tsY = freeAreaCell.getY();
            }
            cell = level.getMap().getCell(tsX, tsY);
            if (--watchdog <= 0) {break;}
        }

        return [tsX, tsY];
    }

    public getEntryStairs(
        entryLevel: Level, entryStairs: Stairs, zoneStairs: StairsOrList
    ): Stairs|Stairs[] {
        // Connection OK, remove the stairs, otherwise use the
        // existing entrance
        if ((zoneStairs as Stairs[]).length > 0) {
            const sX = entryStairs.getX();
            const sY = entryStairs.getY();

            // Stairs could've been removed by zone edge connection
            if (entryLevel.getElements().indexOf(entryStairs) >= 0) {
                if (!entryLevel.removeElement(entryStairs, sX, sY)) {
                    RG.err('Factory.World', 'getEntryStairs',
                        'Cannot remove entryStairs');
                }
            }
            return zoneStairs;
        }
        return entryStairs;
    }

    /* Processes each 'connectToAreaXY' object. Requires current zone and tile
     * level we are connecting to. Connection type depends on the type of zone.
     */
    public processConnObject(conn, zone: ZoneBase, tileLevel: Level) {
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
                    let msg = `zoneStairs null, index: ${stairsIndex}`;
                    msg += `\tPoss: ${JSON.stringify(zoneLevel.getStairs())}`;
                    RG.err('Factory.World', 'processConnObject', msg);
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
                RG.err('Factory.World', 'processConnObject',
                    `zoneStairs not a proper stairs object ${json}`);
            }

            // Create stairs for tileLevel and connect them to the zone
            // stairs
            let connName = 'stairsDown'; // Default for dungeon
            if (zone.getType() === 'city') {connName = 'town';}
            else if (zone.getType() === 'mountain') {connName = 'mountain';}
            const tileStairs = new Stairs(connName, tileLevel, zoneLevel);
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
    }

    /* Creates the actual connection objects such as stairs or passages, and
     * adds them into the zone level. Returns the created objects for connecting
     * them into the tile level. */
    public createNewZoneConnects(zone, zoneLevel): Stairs | Stairs[] {
        let zoneStairs = null;
        if (zone.getType() === 'dungeon') {
            zoneStairs = this.createDungeonZoneConnect(zone, zoneLevel);
        }
        else if (zone.getType() === 'city') {
            zoneStairs = this.createCityZoneConnect(zone, zoneLevel);
        }
        else if (zone.getType() === 'mountain') {
            this.debug('Creating new mountain south connection');
            zoneStairs = World.addExitsToEdge(zoneLevel,
                'passage', 'south', true);
        }
        return zoneStairs;
    }

    /* Creates the connection for dungeon zone and returns the connection. */
    public createDungeonZoneConnect(zone, zoneLevel): Stairs | Stairs[] {
        this.debug('Creating dungeon connection');
        let sX = 0;
        let sY = 0;
        if (zoneLevel.hasExtras()) {
            const extras = zoneLevel.getExtras();
            if (extras.startPoint) {
                [sX, sY] = extras.startPoint;
            }
            else if (extras.connectEdges) {
                return this.createCityZoneConnect(zone, zoneLevel);
            }
        }
        else {
            const freeCell = zoneLevel.getFreeRandCell();
            [sX, sY] = freeCell.getXY();
        }
        const zoneStairs = new Stairs('stairsUp', zoneLevel);
        zoneLevel.addStairs(zoneStairs, sX, sY);
        return zoneStairs;
    }

    public createCityZoneConnect(zone, zoneLevel): Stairs[] {
        let zoneStairs = null;
        this.debug('Creating new city edge connection');
        let allEdgeExits = [];
        RG.CARDINAL_DIR.forEach(dir => {
            if (!World.edgeHasConnections(zoneLevel, dir)) {
                const exits = World.addExitsToEdge(zoneLevel,
                    'passage', dir);
                if (exits.length > 0) {
                    allEdgeExits = allEdgeExits.concat(exits);
                }
            }
        });
        zoneStairs = allEdgeExits;

        // Connection failed, resort to single point connection
        if (zoneStairs.length === 0) {
            // TODO this one is shaky
            const freeCell = zoneLevel.getFreeRandCell();
            const zoneX = freeCell.getX();
            const zoneY = freeCell.getY();
            zoneStairs = new Stairs('stairsUp', zoneLevel);
            zoneLevel.addStairs(zoneStairs, zoneX, zoneY);
            zoneStairs = [zoneStairs];

            this.debug('City edge connection failed. Added stairs');
        }
        return zoneStairs;
    }

    public debugPrintCityConns(zoneType, entryLevel) {
        if (debug.enabled && zoneType === 'city') {
            const conns = entryLevel.getConnections();
            let jsonStr = JSON.stringify(conns[0], null, 1);
            if (conns.length > 1) {
                jsonStr += JSON.stringify(conns[conns.length - 1], null, 1);
            }
            this.debug(`First/last conn: ${jsonStr}`);
            this.debug(`conn length after: ${conns.length}`);
        }
    }

    /* Adds a world ID to the given element. */
    public addWorldID(conf, worldElem) {
      if (!RG.isNullOrUndef([conf.id])) {
          worldElem.setID(conf.id);
      }
      this.worldElemByID[worldElem.getID()] = worldElem;
    }

    /* Creates quests for AreaTile[x][y] of the given area. */
    public createQuests(world, area, x, y) {
        const questPopul = new QuestPopulate();
        questPopul.createQuests(world, area, x, y);
    }

    /* Creates a connection between an area and a zone such as city, mountain
     * or dungeon. Unless configured, connects the zone entrance to a random
     * location in the area.
     * @param {World.Area} area - Area where zone is located in
     * @param {World.Zone} zone - Zone which is connected to area
     * @param {object} conf - Config for the zone
     * @return {void}
     * */
    public createAreaZoneConnection(
        area: World.Area, zone, conf: IF.ZoneConf
    ): void {
        this._verif.verifyConf('createAreaZoneConnection', conf, ['x', 'y']);
        this.debug('Creating area-zone connections');

        const {x, y} = conf;
        const tile = area.getTileXY(x!, y!); // Already checked by verifyConf
        if (!tile || !(tile as World.AreaTile).getLevel) {
            RG.err('FactoryWorld', 'createAreaZoneConnection',
                'Tile does not exist, or getLevel not usable');
            return;
        }
        const areaTile: World.AreaTile = tile as World.AreaTile;
        const tileLevel = areaTile.getLevel();
        debugPrintConfAndTile(conf, tileLevel, ' CALL 1');

        if (typeof zone.getEntrances !== 'function') {
            // No entrance for zone, error out
            RG.err('Factory.World', 'createAreaZoneConnection',
                'No getEntrances method for zone.');
        }

        const entrances = zone.getEntrances();
        if (entrances.length > 0) {
            const entryStairs: Stairs = entrances[0];
            let entryConn: StairsOrList = entryStairs;
            const entryLevel: Level = entryStairs.getSrcLevel();
            const zoneType: string = zone.getType();

            this.debug('Connecting area-zone by entrance');

            let conns = null;
            if (zoneType.match(/(city|mountain)/) || conf.connectEdges) {

                if (debug.enabled) {
                    conns = entryLevel.getConnections();
                    this.debug(`conn length before: ${conns.length}`);
                }

                const zoneStairs: StairsOrList = this.createNewZoneConnects(zone,
                    entryLevel);
                entryConn = this.getEntryStairs(entryLevel, entryStairs,
                    zoneStairs);
            }

            const connName = this.getConnectionName(conf, zoneType, entryConn);

            debugPrintConfAndTile(conf, tileLevel, ' CALL 2');
            const tileStairs = new Stairs(connName, tileLevel, entryLevel);
            const [tileSX, tileSY] = this.getTileStairsXY(tileLevel, conf);
            try {
                tileLevel.addStairs(tileStairs, tileSX, tileSY);
                tileStairs.connect(entryConn);
            }
            catch (e) {
                RG.log('Given conf: ' + JSON.stringify(conf));
                throw e;
            }

            this.debugPrintCityConns(zoneType, entryLevel);
        }
        else if (!conf.hasOwnProperty('connectToAreaXY')) {
            const msg = `No entrances in ${zone.getHierName()}.`;
            RG.err('Factory.World', 'createAreaZoneConnection',
                `${msg}. Cannot connect to tile.`);
        }

        // Make extra connections between the area and zone. This is useful
        // if city/dungeon needs to have 2 or more entrances in different places
        if (conf.hasOwnProperty('connectToAreaXY')) {
            const connectionsXY = conf.connectToAreaXY;
            connectionsXY.forEach(conn => {
                this.processConnObject(conn, zone, tileLevel);
            });
        }

    }

    public addActorSpawner(level: Level, parser, conf): void {
        const maxDanger = conf.maxDanger + 1;
        const constr: IConstraint[] = [
            {op: 'eq', prop: 'type', value: ActorGen.getRaces()}
        ];
        const placeConstr: IConstraint[] = [
            {op: 'eq', func: 'getX', value: [0, level.getMap().cols - 1]},
            {op: 'eq', func: 'getY', value: [0, level.getMap().rows - 1]},
        ];
        const factActor = new FactoryActor();
        const spawner = factActor.createActorSpawner(maxDanger, constr, placeConstr);
        level.addVirtualProp(RG.TYPE_ACTOR, spawner);
    }

    public addZoneComps(
        zone: ZoneBase, zoneConf: IF.ZoneConf
    ): void {
        debugVerb('addZoneComps called with ', zoneConf.name);
        if (zoneConf.addComp) {
            const compGen = new ObjectShellComps();
            compGen.addComponents(zoneConf, zone);
            debugVerb('addZoneComps added comps to', zoneConf.name, ',', zoneConf.addComp);
        }
        else if (zoneConf.components) {
            if (this.fromJSON) {
                if (debugVerb.enabled) {
                    debugVerb('addZoneComps restoring comps for', zoneConf.name);
                    debugVerb('Comps are', zoneConf.components);
                }
                this.fromJSON.addCompsToEntity(zone, zoneConf.components);
            }
            else {
                RG.err('FactoryWorld', 'addZoneComps',
                    'Failed to restore zone comps: fromJSON not set');
            }
        }
    }

    /* Used for printing debug messages only. Can be enabled with
     * DEBUG= env var. */
    public debug(msg: string): void {
        if (debug.enabled) {
            let scope = this.getHierName();
            if (!scope) {scope = 'EMPTY';}
            debug(`|${scope}| ${msg}`);
        }
    }

} // FactoryWorld

function debugPrintConfAndTile(conf, tileLevel, tag) {
    if (conf.name === 'Iron hills') {
        RG.diag(tag + ' Creating iron hills connection now');
        const tConns = tileLevel.getConnections();
        const mConns = tConns.filter(c => c.getName() === 'mountain');
        RG.diag('\t## Ex. conns: ' + JSON.stringify(mConns));
        if (mConns.length > 0) {
            const target = mConns[0].getTargetLevel();
            RG.diag('\t## Parent: ' + target.getParent().getName());
        }
    }
}


import RG from './rg';
import {ConfStack} from './conf-stack';
import {FactoryWorld} from './factory.world';
import {Entity} from './entity';
import {Level} from './level';
import * as Verify from './verify';
import {LoadStat} from './interfaces';

import dbg = require('debug');
const debug = dbg('bitn:WorldFromJSON');
import * as World from './world';

import * as IF from './interfaces';

type WorldBase = World.WorldBase;
type WorldTop = World.WorldTop;
type FromJSON = import('./game.fromjson').FromJSON;

type AreaLevelOrString = World.AreaLevelOrString;

// type FromJSON = import('./game.fromjson').FromJSON;

interface LevelMap {
    [key: number]: Level;
}

interface EntityMap {
    [key: number]: Entity;
}

/* This class converts a serialized world back to World.Top object. It supports
 * unloaded AreaTiles, and does not create them as objects when
 * tileStatus[x][y] is set to JSON/ON_DISK for that tile.
 *
 * This class resembles Factory.World (it's a partial copy-paste), but there
 * are intricacies when
 * restoring an existing game, which have been added. Do NOT try to refactor
 * these into single class!
 */
export class WorldFromJSON {

    public id2level: LevelMap;
    public id2entity: EntityMap;
    public _verif: any; // TODO VerifyConf;
    public worldElemByID: IF.IWorldElemMap; // TODO fix typings
    public createAllZones: boolean;
    public fromJSON: FromJSON;

    private _conf: any; // TODO ConfStack;
    private _IND: 0;
    private fact: FactoryWorld; // TODO FactoryWorld;

    constructor(id2level: LevelMap, id2entity: EntityMap) {
        this.id2level = id2level;
        this.id2entity = id2entity;
        this._conf = new ConfStack();
        this._verif = new Verify.Conf('WorldFromJSON');
        this.worldElemByID = {}; // Stores world elements by ID
        this.createAllZones = true;
        this._IND = 0; // Used for indenting debug messages
    }

    public createPlace(placeJSON): null | WorldTop {
        switch (placeJSON.type) {
            case 'world': return this.createWorld(placeJSON);
            /*case 'quarter': { // Used for debugging (Arena mode)
                const fact = new FactoryWorld();
                fact.setId2Level(this.id2level);
                return fact.createCityQuarter(placeJSON);
            }
            */
            default: RG.err('WorldFromJSON', 'createPlace',
                `No place ${placeJSON.type} implemented yet`);
        }
        return null;
    }

    /* Main function to call with a serialized JSON of WorldTop. */
    public createWorld(placeJSON): WorldTop {
        let world = null;
        if (placeJSON.conf) {
            this.dbg('Creating a restored world now');
            world = this.createRestoredWorld(placeJSON);
        }
        else {
            RG.err('WorldFromJSON', 'Should not be called at all.', 'ERROR');
            // TODO branch will be removed completely after verification
            this.dbg('Creating world using Factory.World fully');
            const fact = new FactoryWorld();
            fact.setId2Level(this.id2level);
            fact.fromJSON = this.fromJSON;
            world = fact.createWorld(placeJSON);
        }
        return world;
    }

    /* Given a serialized WorldTop in JSON, returns the created
     * WorldTop object. */
    public createRestoredWorld(worldJSON): WorldTop {
        if (!worldJSON.conf) {
            RG.err('WorldFromJSON', 'createRestoredWorld',
                'No worldJSON.conf. Does not look like restored world.');
        }
        const world = this.createWorldFromJSON(worldJSON);

        // Need to restore configurations here
        world.setConf(worldJSON.conf);

        const areas = world.getAreas();
        if (areas.length > 0) {
            const keys = `${Object.keys(worldJSON.conf)}`;
            if (!worldJSON.conf.hasOwnProperty('area')) {
                RG.err('WorldFromJSON', 'createRestoredWorld',
                    `No prop 'area' in ${worldJSON.conf}. Props ${keys}`);
            }
        }

        areas.forEach((area, i) => {
            area.setConf(worldJSON.conf.area[i]);
        });
        return world;
    }

    public pushScope(json): void {
        this._conf.pushScope(json);
        this.fact.pushScope(json);
        ++this._IND;
    }

    public popScope(json): void {
        this._conf.popScope(json);
        this.fact.popScope(json);
        --this._IND;
    }

    public getHierName(): string {return this._conf.getScope().join('.');}

    public createWorldFromJSON(worldJSON): WorldTop {
        const fact = new FactoryWorld();
        fact.setId2Level(this.id2level);
        fact.id2entity = this.id2entity;
        fact.fromJSON = this.fromJSON;
        this.fact = fact;

        this.verify('createWorld', worldJSON, ['name', 'nAreas']);
        if (worldJSON.hasOwnProperty('createAllZones')) {
            this.createAllZones = worldJSON.createAllZones;
            this.dbg('createAllZones set to ' + this.createAllZones);
            fact.createAllZones = this.createAllZones;
        }
        this.pushScope(worldJSON);
        const world = new World.WorldTop(worldJSON.name);
        world.setConf(worldJSON);
        for (let i = 0; i < worldJSON.nAreas; i++) {
            const areaJSON = worldJSON.area[i];
            if (debug.enabled) {
                this.printKeys('areaJSON keys', areaJSON);
            }
            const area: World.Area = this.restoreAreaFromJSON(areaJSON);

            if (areaJSON.zonesCreated) { // Only during restore game
                this.restoreCreatedZones(world, area);
            }

            world.addArea(area);
            this.addWorldID(areaJSON, area);
        }
        this.popScope(worldJSON);
        this.addWorldID(worldJSON, world);
        return world;
    }

    /* Restores WorldArea from JSON. */
    public restoreAreaFromJSON(areaJSON): World.Area {
        this.verify('restoreAreaFromJSON', areaJSON,
            ['name', 'maxX', 'maxY']);
        this.pushScope(areaJSON);

        const areaLevels = this.getAreaLevels(areaJSON);

        const {name, maxX, maxY, cols, rows} = areaJSON;
        const area = new World.Area(name, maxX, maxY, cols, rows,
            areaLevels);
        area.setConf(areaJSON);
        area.setHierName(this.getHierName());

        // Restore zone state variables
        area.tileStatus = areaJSON.tileStatus;
        area.zonesCreated = areaJSON.zonesCreated;

        this.setTileJSONForUnloadedTiles(area, areaJSON);

        // When player enters a given area tile, create zones for that tile
        if (this.createAllZones) {
        // >>>>>>>>>>>>>>>>>> Factory.World START
            this.fact._createAllZones(area, areaJSON);
        // >>>>>>>>>>>>>>>>>> Factory.World END
            area.markAllZonesCreated();
        }
        else {
            this.dbg('Skipping the zone creating due to createZones=false');
        }
        this.popScope(areaJSON);
        return area;
    }

    public restoreCreatedZones(world: WorldTop, area: World.Area) {
        Object.keys(area.zonesCreated).forEach(xy => {
            const [xStr, yStr] = xy.split(',');
            const [x, y] = [parseInt(xStr, 10), parseInt(yStr, 10)];
            if (area.zonesCreated[xy] && area.isLoaded(x, y)) {
                this.dbg(`\tRestoring created zones for tile ${x},${y}`);
                this.restoreZonesForTile(world, area, x, y);
            }
        });
    }

    public restoreZonesForTile(
        world: World.WorldTop, area: World.Area, x: number, y: number
    ): void {
        const worldConf: IF.WorldConf = world.getConf();
        this.pushScope(worldConf);
        const areaConf = area.getConf();
        this.pushScope(areaConf);

        // >>>>>>>>>>>>>>>>>>>>>> Factory.World START
        this.fact._createAllZones(area, areaConf, x, y);
        // >>>>>>>>>>>>>>>>>>>>>> Factory.World END

        // Cleanup the scope & conf stacks
        this.popScope(areaConf);
        this.popScope(worldConf);
    }

    /* Used when creating area from existing levels. Uses id2level lookup table
     * to construct 2-d array of levels.*/
    public getAreaLevels(areaJSON): AreaLevelOrString[][] {
        this.verify('getAreaLevels', areaJSON, ['tileStatus']);
        ++this._IND;
        const levels: AreaLevelOrString[][] = [];
        if (areaJSON.tiles) {
            areaJSON.tiles.forEach((tileCol, x) => {
                const levelCol: AreaLevelOrString[] = [];
                tileCol.forEach((tile, y) => {
                    if (areaJSON.tileStatus[x][y] === LoadStat.LOADED) {
                        this.dbg(`Tile ${x},${y} is loaded`);
                        const level = this.id2level[tile.level];
                        if (level) {
                            levelCol.push(level);
                        }
                        else {
                            RG.err('WorldFromJSON', 'getAreaLevels',
                                `No level ID ${tile.level} in id2level`);
                        }
                    }
                    else {
                        this.dbg(`Will NOT load Tile ${x},${y}`);
                        levelCol.push(RG.LEVEL_NOT_LOADED);
                    }
                });
                levels.push(levelCol);
            });
        }
        else {
            RG.err('WorldFromJSON', 'getAreaLevels',
                'areaJSON.tiles cannot be null/undefined');
        }
        --this._IND;
        return levels;
    }

    public setTileJSONForUnloadedTiles(area: World.Area, areaJSON): void {
        const tiles = area.getTiles();
        tiles.forEach((tileCol, x) => {
            tileCol.forEach((tile, y) => {
                if (tiles[x][y] === RG.TILE_NOT_LOADED) {
                    tiles[x][y] = areaJSON.tiles[x][y];
                }
            });
        });
    }

    /* Adds a world ID to given world element. */
    public addWorldID(conf, worldElem: WorldBase): void {
        if (!RG.isNullOrUndef([conf.id])) {
            worldElem.setID(conf.id);
        }
        this.worldElemByID[worldElem.getID()] = worldElem;
    }

    /* For printing debug messages. */
    public dbg(msg: string): void {
        if (debug.enabled) {
            const ind = ' '.repeat(this._IND);
            RG.diag(ind + 'WorldFromJSON: ' + msg);
        }
    }

    /* Verifies that given config is OK. */
    public verify(funcName: string, conf: {[key: string]: any}, list: any[]): void {
        this._verif.verifyConf(funcName, conf, list);
    }

    public printKeys(msg, obj): void {
        RG.diag(msg);
        RG.diag(Object.keys(obj));
    }

}

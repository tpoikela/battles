
const RG = require('./rg');
const debug = require('debug')('bitn:WorldFromJSON');
const ConfStack = require('./conf-stack');

RG.Factory = require('./factory');

/* This class converts a serialized world back to World.Top object. It supports
 * unloaded AreaTiles, and does not create them as objects when
 * tilesLoaded[x][y] is false for that tile.
 *
 * This class resembles Factory.World (it's a partial copy-paste), but there
 * are intricacies when
 * restoring an existing game, which have been added. Do NOT try to refactor
 * these into single class!
 *
 */
export default class WorldFromJSON {

    constructor(id2level, id2entity) {
        this.id2level = id2level;
        this.id2entity = id2entity;
        this._conf = new ConfStack();
        this._verif = new RG.Verify.Conf('WorldFromJSON');
        this.worldElemByID = {}; // Stores world elements by ID
        this.createAllZones = true;
        this._IND = 0; // Used for indenting debug messages
    }

    /* Main function to call with a serialized JSON of World.Top. */
    createWorld(placeJSON) {
        let world = null;
        if (placeJSON.conf) {
            this.dbg('Creating a restored world now');
            world = this.createRestoredWorld(placeJSON);
        }
        else {
            RG.err('WorldFromJSON', 'Should not be called at all.', 'ERROR');
            // TODO branch will be removed completely after verification
            this.dbg('Creating world using Factory.World fully');
            const fact = new RG.Factory.World();
            fact.setId2Level(this.id2level);
            world = fact.createWorld(placeJSON);
        }
        return world;
    }

    /* Given a serialized WorldTop in JSON, returns the created
     * World.Top object. */
    createRestoredWorld(worldJSON) {
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

    pushScope(json) {
        this._conf.pushScope(json);
        this.fact.pushScope(json);
        ++this.IND;
    }

    popScope(json) {
        this._conf.popScope(json);
        this.fact.popScope(json);
        --this.IND;
    }

    getHierName() {return this._conf.getScope().join('.');}

    createWorldFromJSON(worldJSON) {
        const fact = new RG.Factory.World();
        fact.setId2Level(this.id2level);
        fact.id2entity = this.id2entity;
        this.fact = fact;

        this.verify('createWorld', worldJSON, ['name', 'nAreas']);
        if (worldJSON.hasOwnProperty('createAllZones')) {
            this.createAllZones = worldJSON.createAllZones;
            this.dbg('createAllZones set to ' + this.createAllZones);
            fact.createAllZones = this.createAllZones;
        }
        this.pushScope(worldJSON);
        const world = new RG.World.Top(worldJSON.name);
        world.setConf(worldJSON);
        for (let i = 0; i < worldJSON.nAreas; i++) {
            const areaJSON = worldJSON.area[i];
            this.printKeys('areaJSON keys', areaJSON);
            const area = this.restoreAreaFromJSON(areaJSON);

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

    /* Restores World.Area from JSON. */
    restoreAreaFromJSON(areaJSON) {
        this.verify('restoreAreaFromJSON', areaJSON,
            ['name', 'maxX', 'maxY']);
        this.pushScope(areaJSON);

        const areaLevels = this.getAreaLevels(areaJSON);

        const {name, maxX, maxY, cols, rows} = areaJSON;
        const area = new RG.World.Area(name, maxX, maxY, cols, rows,
            areaLevels);
        area.setConf(areaJSON);
        area.setHierName(this.getHierName());

        // Restore zone state variables
        area.tilesLoaded = areaJSON.tilesLoaded;
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

    restoreCreatedZones(world, area) {
        Object.keys(area.zonesCreated).forEach(xy => {
            const [xStr, yStr] = xy.split(',');
            const [x, y] = [parseInt(xStr, 10), parseInt(yStr, 10)];
            if (area.zonesCreated[xy] && area.tilesLoaded[x][y]) {
                this.dbg(`\tRestoring created zones for tile ${x},${y}`);
                this.restoreZonesForTile(world, area, x, y);
            }
        });
    }

    restoreZonesForTile(world, area, x, y) {
        const worldConf = world.getConf();
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
    getAreaLevels(areaJSON) {
        this.verify('getAreaLevels', areaJSON, ['tilesLoaded']);
        ++this._IND;
        const levels = [];
        if (areaJSON.tiles) {
            areaJSON.tiles.forEach((tileCol, x) => {
                const levelCol = [];
                tileCol.forEach((tile, y) => {
                    if (areaJSON.tilesLoaded[x][y]) {
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

    setTileJSONForUnloadedTiles(area, areaJSON) {
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
    addWorldID(conf, worldElem) {
        if (!RG.isNullOrUndef([conf.id])) {
            worldElem.setID(conf.id);
        }
        this.worldElemByID[worldElem.getID()] = worldElem;
    }

    /* For printing debug messages. */
    dbg(msg) {
        if (debug.enabled) {
            const ind = ' '.repeat(this._IND);
            console.log(ind + 'WorldFromJSON: ' + msg);
        }
    }

    /* Verifies that given config is OK. */
    verify(funcName, conf, list) {
        this._verif.verifyConf(funcName, conf, list);
    }

    printKeys(msg, obj) {
        console.log(msg);
        console.log(Object.keys(obj));
    }

}

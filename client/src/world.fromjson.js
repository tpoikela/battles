
const RG = require('./rg');
const debug = require('debug')('bitn:WorldFromJSON');

/* This class converts a serialized world back to World.Top object. It supports 
 * unloaded AreaTiles, and does not create them as objects. */
export default class WorldFromJSON {

    constructor(id2level) {
        this.id2level = id2level;
        this._conf = new RG.Factory.ConfStack();
        this._verif = new RG.Verify.Conf('WorldFromJSON');
        this.worldElemByID = {}; // Stores world elements by ID
        this.createAllZones = true;
    }

    createWorld(placeJSON) {
        let world = null;
        if (placeJSON.conf) {
            this.dbg('Creating a restored world now');
            world = this.createRestoredWorld(placeJSON);
        }
        else {
            RG.err('WorldFromJSON', 'Should not be called at all.', 'ERROR');
            this.dbg('Creating world using Factory.World fully');
            const fact = new RG.Factory.World();
            fact.setId2Level(this.id2level);
            world = fact.createWorld(placeJSON);
        }
        return world;
    }

    /* Given a serialized world in JSON, returns the created World.Top object.
     * */
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
    }

    popScope(json) {
        this._conf.popScope(json);
        this.fact.popScope(json);
    }

    getHierName() {return this._conf.getScope().join('.');}

    createWorldFromJSON(worldJSON) {
        const fact = new RG.Factory.World();
        fact.setId2Level(this.id2level);
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
            const areaConf = worldJSON.area[i];

            // Factory.World START
            const area = this.fact.createArea(areaConf);

            if (areaConf.zonesCreated) { // Only during restore game
                this.fact.restoreCreatedZones(world, area, areaConf);
            }
            // Factory.World END

            world.addArea(area);
            this.addWorldID(areaConf, area);
        }
        this.popScope(worldJSON);
        this.addWorldID(worldJSON, world);
        return world;
    }

    /* Creates an area which can be added to a world. */
    createArea(conf) {
        this.verify('createArea', conf,
            ['name', 'maxX', 'maxY']);
        this.pushScope(conf);

        // >>>>>>>>>>>>>>>>>> Factory.World START
        let areaLevels = null;
        if (this.id2levelSet) {
            areaLevels = this.fact.getAreaLevels(conf);
        }

        const area = new RG.World.Area(conf.name, conf.maxX, conf.maxY,
            conf.cols, conf.rows, areaLevels);
        area.setConf(conf);
        area.setHierName(this.getHierName());

        // When player enters a given area tile, create zones for that tile
        if (this.createAllZones) {
            this.fact._createAllZones(area, conf);
        // >>>>>>>>>>>>>>>>>> Factory.World END
            area.markAllZonesCreated();
        }
        else {
            this.dbg('Skipping the zone creating due to createZones=false');
        }
        this.popScope(conf);
        return area;
    }

    /* Adds a world ID to given world element. */
    addWorldID(conf, worldElem) {
        if (!RG.isNullOrUndef([conf.id])) {
            worldElem.setID(conf.id);
        }
        this.worldElemByID[worldElem.getID()] = worldElem;
    }

    dbg(msg) {
        if (debug.enabled) {
            console.log(msg);
        }
    }

    /* Verifies that given config is OK. */
    verify(funcName, conf, list) {
        this._verif.verifyConf(funcName, conf, list);
    }

}

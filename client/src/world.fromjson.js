
const RG = require('./rg');
const debug = require('debug')('bitn:WorldFromJSON');

/* This class converts a serialized world back to World.Top object. It supports 
 * unloaded AreaTiles, and does not create them as objects. */
export default class WorldFromJSON {

    constructor(id2level) {
        this.id2level = id2level;
    }

    createWorld(placeJSON) {
        let world = null;
        if (placeJSON.conf) {
            this.dbg('Creating a restored world now');
            world = this.createRestoredWorld(placeJSON);
        }
        else {
            this.dbg('Creating world using Factory.World fully');
            const fact = new RG.Factory.World();
            fact.setId2Level(this.id2level);
            world = fact.createWorld(placeJSON);
        }
        return world;
    }

    createRestoredWorld(worldJSON) {
        const fact = new RG.Factory.World();
        fact.setId2Level(this.id2level);

        if (!worldJSON.conf) {
            RG.err('WorldFromJSON', 'createRestoredWorld',
                'No worldJSON.conf. Does not look like restored world.');
        }
        const world = fact.createWorld(worldJSON);
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

    dbg(msg) {
        if (debug.enabled) {
            console.log(msg);
        }
    }

}

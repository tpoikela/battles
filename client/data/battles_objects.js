
/* eslint max-len: 100 */

/**
 * THis file contains definitions for in-game objects, monsters and levels. It's
 * rather human-readable so it should be easy to add new stuff in. All contents
 * are used for procedural generation.
 */

// Some info on attributes:
//      dontCreate: true - Use with base classes, prevents object creation
//      base: xxx        - Use xxx as a base for the object
//      danger - For rand generation for actors, higher values means less often
//      value  - For rand gen (+buy/sell) for items, higher means less often
//      cssClass         - Used for rendering purposes.

const Items = require('./items');
const Actors = require('./actors');

const RGObjects = {

    actors: Actors,
    items: Items

    //
    /*
    levels: [
        {

        },

    ],
   */

    // Dungeons contains multiple levels. Any levels specified above can be used
    // in the dungeon.
    /*
    dungeons: [

    ],
   */

};


module.exports = RGObjects;


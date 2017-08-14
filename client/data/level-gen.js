
/* This file contains code to generate the configuration for different types of
 * levels. */

const RG = require('../src/rg');
RG.Names = require('./name-gen');

const LevelGen = {};

const getNumLevels = function(name) {
    switch (name) {
        case 'Cave': return 1;
        case 'Crypt': return 2;
        case 'Dungeon': return 3;
        case 'Labyrinth': return 1;
        default: return 3;
    }
};

/* Returns generation constraints based on the level name. */
const getConstraint = function(name) {
    switch (name) {
        case 'Crypt': return {
            actor: actor => {
                return (actor.type === 'undead');
            }
        };
        default: return null;
    }
};

LevelGen.getDungeonConf = (dungeonName) => {
    const brName = RG.Names.getGenericPlaceName('branch');
    const nLevels = getNumLevels(dungeonName);
    const constraint = getConstraint(dungeonName);
    const obj = {
        name: dungeonName,
        type: dungeonName.toLowerCase(),
        nBranches: 1,
        branch: [
            {name: brName, nLevels, entranceLevel: 0}
        ]
    };

    if (constraint) {
        obj.constraint = constraint;
    }

    return obj;
};


module.exports = LevelGen;

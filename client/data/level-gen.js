
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
        case 'Cave': return {
            actor: actor => actor.type === 'animal' || actor.type === 'goblin'
        };
        case 'Crypt': return {
            actor: actor => actor.type === 'undead'
        };
        default: return null;
    }
};

const convertToImplemented = function(name) {
    switch (name) {
        case 'Grotto': return 'Cave';
        case 'Cavern': return 'Cave';
        case 'Catacombs': return 'Crypt';
        case 'Tombs': return 'Crypt';
        case 'Cells': return 'Dungeon';
        default: return name;
    }
};

LevelGen.getDungeonConf = (dungeonName) => {
    const usedName = convertToImplemented(dungeonName);
    // const brName = RG.Names.getGenericPlaceName('branch');
    const nLevels = getNumLevels(usedName);
    const constraint = getConstraint(usedName);
    const obj = {
        name: dungeonName,
        dungeonType: usedName.toLowerCase(),
        nBranches: 1,
        branch: [
            {name: dungeonName, nLevels, entranceLevel: 0}
        ]
    };

    if (constraint) {
        obj.constraint = constraint;
    }

    return obj;
};


module.exports = LevelGen;

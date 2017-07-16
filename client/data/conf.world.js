/* eslint comma-dangle: 0 */

const RG = require('../src/rg');

const temple = require('./temple.json');

// Note:
// An object with key 'constraint' can be passed at any level. This contains
// info about procedural generation. There are scopes for constraints. The
// innermost constraint is taken into account, and the rest are ignored.
// Priority goes like this:
//      0. Level
//      1. Branch/Quarter/Face
//      2. Dungeon/Mountain/City
//      3. World.
// For example, anything level-specific overrides all other constraints. Note
// that for now there's NO merging of constraints. This means that the full
// constraint object is overwritten.

const cities = {
    Blashyrkh:
    { x: 2, y: 2, name: 'Blashyrkh', nQuarters: 1,
        quarter: [
            {name: 'Center', nLevels: 1, entranceLevel: 0, nShops: 2,
                shop: [
                    item => item.type === 'food',
                    item => item.value < 100 && item.type === 'weapon',
                ]
            },
        ],
    },
};

const dungeons = {
    beastDungeon: { x: 0, y: 0, name: 'Beast dungeon', nBranches: 1,
        constraint: {
            actor: actor => {
                return (actor.type === 'animal');
            }
        },
        branch: [
            {name: 'Animals', nLevels: 5, entranceLevel: 0}
        ],
    },
    smallDungeon: { x: 0, y: 0, name: 'Small dungeon', nBranches: 1,
        // constraint: {actor: actor => (actor.type === 'animal')},
        branch: [{name: 'main', nLevels: 5, entranceLevel: 0}],
    },
};

/* Configuration settings for creating the game world. There's not much to
* document. Follow the convention to construct your own world. */
RG.WorldConf = {
    name: 'The North',

    presetLevels: {
        'Beast dungeon.Animals': [{nLevel: 0, level: temple}]
    },

    playerStart: {place: 'The North', x: 2, y: 4},

    nAreas: 1,
    area: [
        {
            name: 'Ravendark',
            maxX: 5,
            maxY: 5,
            cols: 80, rows: 28,
            // DUNGEONS
            nDungeons: 3,
            dungeon: [
                dungeons.smallDungeon,
                dungeons.beastDungeon,
                { x: 0, y: 0, name: 'BranchTest', nBranches: 2,
                    connect: [
                        ['main', 'side', 0, 0]
                    ],
                    branch: [
                        {name: 'main', nLevels: 1, entranceLevel: 0},
                        {name: 'side', nLevels: 1},
                    ],
                },
                /*
                { x: 1, y: 1, name: 'Large dungeon', nBranches: 3,
                    connect: [
                        ['main', 'side', 6, 0],
                        ['main', 'side2', 6, 0],
                    ],
                    branch: [
                        {name: 'main', nLevels: 7},
                        {name: 'side', nLevels: 3},
                        {name: 'side2', nLevels: 3},
                    ],
                },
                */
            ],
            // CITIES
            nCities: 2,
            city: [
                { x: 0, y: 0, name: 'Petit town', nQuarters: 1,
                    quarter: [{name: 'Center', nLevels: 1, entranceLevel: 0}],
                },
                cities.Blashyrkh,
            ],
            // MOUNTAINS
            nMountains: 1,
            mountain: [
                { x: 0, y: 0, name: 'IceThorn', nFaces: 1,
                    face: [{name: 'north', nLevels: 1, x: 50, y: 200}]
                },
            ],
        },
    ],
};

module.exports = RG.WorldConf;


/* eslint comma-dangle: 0 */

const RG = require('../src/rg');

/* Configuration settings for creating the game world. There's not much to
* document. Follow the convention to construct your own world. */
RG.WorldConf = {
    name: 'The North',

    nAreas: 1,
    area: [
        {
            name: 'Ravendark',
            maxX: 4,
            maxY: 4,
            cols: 30, rows: 30,
            // DUNGEONS
            nDungeons: 2,
            dungeon: [
                { x: 0, y: 0, name: 'd1', nBranches: 1,
                    branch: [{name: 'main', nLevels: 5}],
                },
                { x: 1, y: 1, name: 'Large dungeon', nBranches: 2,
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
            ],
            // CITIES
            nCities: 1,
            city: [
                { x: 2, y: 2, name: 'Blashyrkh',
                }
            ],
            // MOUNTAINS
            nMountains: 1,
            mountain: [
                { x: 0, y: 0, name: 'IceThorn', nFaces: 1,
                    face: [{name: 'north', nLevels: 1}]
                },
            ],
        },
    ],
};

module.exports = RG.WorldConf;


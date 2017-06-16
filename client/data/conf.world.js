/* eslint comma-dangle: 0 */

const RG = require('../src/rg');

RG.WorldConf = {
    name: 'The North',

    nAreas: 1,
    area: [
        {
            name: 'Ravendark',
            maxX: 4,
            maxY: 4,
            // DUNGEONS
            nDungeons: 1,
            dungeon: [
                { x: 0, y: 0, name: 'd1', nBranches: 1,
                    branch: [{name: 'main', nLevels: 5}],
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


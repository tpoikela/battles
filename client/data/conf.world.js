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
            nDungeons: 1,
            dungeon: [
                { x: 0, y: 0, name: 'd1', nBranches: 1,
                    branch: [{name: 'main', nLevels: 5}],
                },
            ],
        },
    ],

    nMountains: 0,
    mountain: [

    ],

    nCities: 0,
    city: [

    ],
};

module.exports = RG.WorldConf;


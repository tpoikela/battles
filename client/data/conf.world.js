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
                { name: 'd1' }
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


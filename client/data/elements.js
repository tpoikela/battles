/* File contains elements used in the game. */

/* eslint comma-dangle: 0 */
// const RG = require('../src/rg');

const Elements = [
    {
        name: 'bridge', className: 'cell-element-bridge',
        char: '='
    },
    {
        name: 'chasm', className: 'cell-element-chasm',
        char: '~', addComp: ['Impassable']
    },
    {
        name: 'grass', className: 'cell-element-grass',
        char: '"'
    },
    {
        name: 'highrock', className: 'cell-element-highrock',
        char: '^', addComp: ['Impassable', 'Opaque']
    },
    {
        name: 'floor', className: 'cell-element-floor',
        char: '.'
    },
    {
        name: 'floorcave', className: 'cell-element-floor-cave',
        char: '.'
    },
    {
        name: 'floorcrypt', className: 'cell-element-floor-crypt',
        char: '.'
    },
    {
        name: 'floorhouse', className: 'cell-element-floor-house',
        char: '.'
    },
    {
        name: 'fort', className: 'cell-element-fort',
        char: '#', addComp: ['Impassable']
    },
    {
        name: 'lava', className: 'cell-element-lava',
        char: '~', addComp: ['Impassable']
    },
    {
        name: 'path', className: 'cell-element-path',
        char: '.',
    },
    {
        name: 'road', className: 'cell-element-road',
        char: '.',
    },
    {
        name: 'sky', className: 'cell-element-sky',
        char: '~', addComp: ['Impassable']
    },
    {
        name: 'snow', className: 'cell-element-snow',
        char: '.',
    },
    {
        name: 'stone', className: 'cell-element-stone',
        char: '^'
    },
    {
        name: 'tree', className: 'cell-element-tree',
        char: 'T', addComp: ['Opaque']
    },
    {
        name: 'water', className: 'cell-element-water',
        char: '~',
        // addComp: {name: 'Terrain', setters: {setDifficulty: 5}}
    },

    //---------------------------------------------------------
    // Presentational-only elements, only rendering info stored
    //---------------------------------------------------------
    {
        dontCreate: true, name: 'mountain',
        char: '^', className: 'cell-element-mountain'
    },
    {
        dontCreate: true, name: 'town',
        char: 'o', className: 'cell-element-town'
    },
    {
        dontCreate: true, name: 'battle',
        char: 'X', className: 'cell-element-battle'
    }

];

module.exports = Elements;

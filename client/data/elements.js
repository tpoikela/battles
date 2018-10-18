
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
        name: 'fort', className: 'cell-element-fort',
        char: '#', addComp: ['Impassable']
    },
    {
        name: 'lava', className: 'cell-element-lava',
        char: '~', addComp: ['Impassable']
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

];

module.exports = Elements;

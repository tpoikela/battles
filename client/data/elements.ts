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
        name: 'snowy grass', className: 'cell-element-snowy-grass',
        char: '"', addComp: ['Snowy']
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
        name: 'floorcastle', className: 'cell-element-floor-castle',
        char: '.',
        addComp: ['Indoor']
    },
    {
        name: 'floorcave', className: 'cell-element-floor-cave',
        char: '.',
        addComp: ['Indoor']
    },
    {
        name: 'floorcrypt', className: 'cell-element-floor-crypt',
        char: '.',
        addComp: ['Indoor']
    },
    {
        name: 'floorhouse', className: 'cell-element-floor-house',
        char: '.',
        addComp: ['Indoor']
    },
    {
        name: 'floorwooden', className: 'cell-element-floor-wooden',
        char: '.',
        addComp: ['Indoor']
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
        name: 'light snow', className: 'cell-element-light-snow',
        char: '.', addComp: ['Snowy']
    },
    {
        name: 'snow', className: 'cell-element-snow',
        char: '.', addComp: ['Snowy']
    },
    {
        name: 'deep snow', className: 'cell-element-deep-snow',
        char: '.', addComp: ['Snowy']
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
        name: 'snow-covered tree', className: 'cell-element-snow-tree',
        char: 'T', addComp: ['Opaque', 'Snowy']
    },
    {
        name: 'water', className: 'cell-element-water',
        char: '~',
        // addComp: {name: 'Terrain', setters: {setDifficulty: 5}}
    },
    {
        name: 'frozen water', className: 'cell-element-frozen-water',
        char: '~', addComp: ['Snowy']
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
    },
    {
        dontCreate: true, name: 'cityfort',
        char: 'o', className: 'cell-element-fort'
    },
    {
        dontCreate: true, name: 'wallcastle',
        char: '#', className: 'cell-element-castle'
    }

];

export default Elements;

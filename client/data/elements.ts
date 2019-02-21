/* File contains elements used in the game. */

/* eslint comma-dangle: 0 */
// const RG = require('../src/rg');

const Elements = [
    {
        name: 'bed', className: 'cell-element-bed',
        char: '=',
        msg: {
            onEnter: 'There is a bed here for resting'
        },
        addComp: ['Indoor']
    },
    {
        name: 'bridge', className: 'cell-element-bridge',
        char: '=',
        msg: {
            onEnter: 'You are standing on a bridge.'
        }
    },
    {
        name: 'chasm', className: 'cell-element-chasm',
        char: '~', addComp: ['Impassable']
    },
    {
        name: 'grass', className: 'cell-element-grass',
        char: '"',
        msg: {
            onEnter: 'You see some grass.'
        }
    },
    {
        name: 'snowy grass', className: 'cell-element-snowy-grass',
        char: '"', addComp: ['Snowy'],
        msg: {
            onEnter: 'You see some snow-covered grass.'
        }
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
        msg: {
            onEnter: 'You tread lightly on the road.'
        }
    },
    {
        name: 'sky', className: 'cell-element-sky',
        char: '~', addComp: ['Impassable']
    },
    {
        name: 'light snow', className: 'cell-element-light-snow',
        char: '.', addComp: ['Snowy'],
        msg: {
            onEnter: 'A thin layer of snow is on the ground'
        }
    },
    {
        name: 'light snow with tracks',
        className: 'cell-element-light-snow-tracks',
        char: '.', addComp: ['Snowy'],
        msg: {
            onEnter: 'Someone has traversed this thin crust of snow'
        }
    },
    {
        name: 'snow', className: 'cell-element-snow',
        char: '.', addComp: ['Snowy'],
        msg: {
            onEnter: 'Ground is covered with snow.'
        }
    },
    {
        name: 'snow with tracks', className: 'cell-element-snow-tracks',
        char: '.', addComp: ['Snowy'],
        msg: {
            onEnter: 'Someone has left their tracks on snow'
        }
    },
    {
        name: 'deep snow', className: 'cell-element-deep-snow',
        char: '.', addComp: ['Snowy'],
        msg: {
            onEnter: 'Snow is deep and difficult to traverse here'
        }
    },
    {
        name: 'deep snow with tracks',
        className: 'cell-element-deep-snow-tracks',
        char: '.', addComp: ['Snowy'],
        msg: {
            onEnter: 'Snow is deep, but there are some tracks here'
        }
    },
    {
        name: 'stone', className: 'cell-element-stone',
        char: '^'
    },
    {
        name: 'tree', className: 'cell-element-tree',
        char: 'T', addComp: ['Opaque'],
        msg: {
            onEnter: 'There is a tree here.'
        }
    },
    {
        name: 'snow-covered tree', className: 'cell-element-snow-tree',
        char: 'T', addComp: ['Opaque', 'Snowy'],
        msg: {
            onEnter: 'There is a snow-covered tree here.'
        }
    },
    {
        name: 'water', className: 'cell-element-water',
        char: '~',
        msg: {
            onEnter: 'Water slows you down'
        }
        // addComp: {name: 'Terrain', setters: {setDifficulty: 5}}
    },
    {
        name: 'frozen water', className: 'cell-element-frozen-water',
        char: '~', addComp: ['Snowy'],
        msg: {
            onEnter: 'There is some ice here'
        }
        // addComp: {name: 'Terrain', setters: {setDifficulty: 5}}
    },
    {
        name: 'closed window', className: 'cell-element-window',
        char: '+', addComp: ['Impassable']
    },

    //---------------------------------------------------------
    // Presentational-only elements, only rendering info stored
    // NOTE: Adding anything else here than char/className will
    //       NOT affect these elements
    //---------------------------------------------------------
    {
        dontCreate: true, name: 'web',
        char: '|', className: 'cell-element-web'
    },
    {
        dontCreate: true, name: 'slime',
        char: '|', className: 'cell-element-slime'
    },
    {
        dontCreate: true, name: 'hole',
        char: '^', className: 'cell-element-hole'
    },
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

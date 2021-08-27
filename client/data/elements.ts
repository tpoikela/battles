/* File contains elements used in the game. */

/* eslint comma-dangle: 0 */
// const RG = require('../src/rg');
//
import {
    speedPenalty, statsPenalty, defensePenalty, attackPenalty
} from './shell-utils';

// Elevations
const ELEV = [
    // '\u22C5',
    '\u2219',
    ':',
    '\u22EE',
];

const DEPTH = [
    '\u223C',
    '\u2248',
    '\u224B',
];

const CHAR_WALL = '#';

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
        },
        addComp: [{comp: 'Terrain',
            func: {setMods: [
                defensePenalty(0.5, ['Flying']),
            ]}
        }]
    },
    {
        name: 'shallow chasm', className: 'cell-element-chasm',
        char: DEPTH[0], addComp: ['Impassable'],
        z: -1,
        callbacks: {
            onRemoveFlyingEntity: {
                addComp: [
                    {comp: 'Paralysis'}
                ]
            },
            onAddFlyingEntity: {
                removeComp: [
                    {comp: 'Paralysis'}
                ]
            },
        }
    },
    {
        name: 'chasm', className: 'cell-element-chasm',
        char: DEPTH[1], addComp: ['Impassable'],
        z: -2,
        callbacks: {
            onRemoveFlyingEntity: {
                addComp: [
                    {comp: 'Paralysis'}
                ]
            },
            onAddFlyingEntity: {
                removeComp: [
                    {comp: 'Paralysis'}
                ]
            },
        }
    },
    {
        name: 'deep chasm', className: 'cell-element-chasm',
        char: DEPTH[2], addComp: ['Impassable'],
        z: -10,
    },
    {
        name: 'grass', className: 'cell-element-grass',
        char: '"',
        msg: {
            onEnter: 'You see some grass.'
        },
        addComp: [{comp: 'Terrain',
            func: {setMods: [
                speedPenalty(0.10, ['Flying']),
            ]}
        }]
    },
    {
        name: 'snowy grass', className: 'cell-element-snowy-grass',
        char: '"',
        msg: {
            onEnter: 'You see some snow-covered grass.'
        },
        addComp: [{comp: 'Terrain',
            func: {setMods: [
                speedPenalty(0.15, ['Flying']),
            ]}
        }]
    },
    {
        name: 'highrock', className: 'cell-element-highrock',
        char: '^', addComp: ['Impassable', 'Opaque']
    },
    {
        name: 'floor', className: 'cell-element-floor',
        char: '.', addComp: ['Tillable'],
    },
    {
        name: 'floorcastle', className: 'cell-element-floor-castle',
        char: '.',
        addComp: ['Indoor']
    },
    {
        name: 'floordungeon', className: 'cell-element-floor-dungeon',
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
        char: '.', z: 1
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
        char: '.',
        msg: {
            onEnter: 'Ground is covered with snow.'
        },
        addComp: ['Snowy', {comp: 'Terrain',
            func: {setMods: [speedPenalty(0.10, ['Flying', 'SnowWalk'])]}
        }]
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
        char: '.',
        msg: {
            onEnter: 'Snow is deep and difficult to traverse here'
        },
        addComp: ['Snowy', {comp: 'Terrain',
            func: {setMods: [speedPenalty(0.25, ['Flying', 'SnowWalk'])]}
        }]
    },
    {
        name: 'deep snow with tracks',
        className: 'cell-element-deep-snow-tracks',
        char: '.',
        msg: {
            onEnter: 'Snow is deep, but there are some tracks here'
        },
        addComp: ['Snowy', {comp: 'Terrain',
            func: {setMods: [speedPenalty(0.10, ['Flying', 'SnowWalk'])]}
        }]
    },
    {
        name: 'cliff', className: 'cell-element-stone',
        char: ELEV[0], z: 1,
        msg: {
            onEnter: 'Difficult rocky terrain slows you down.'
        },
        addComp: [{comp: 'Terrain',
            func: {setMods: [speedPenalty(0.25, ['Flying'])]}
        }]
    },
    {
        name: 'stone', className: 'cell-element-stone',
        char: ELEV[1], z: 2,
        msg: {
            onEnter: 'Difficult rocky terrain slows you down.'
        },
        addComp: [{comp: 'Terrain',
            func: {setMods: [speedPenalty(0.25, ['Flying'])]}
        }]
    },
    {
        name: 'steep cliff', className: 'cell-element-stone',
        char: ELEV[2], z: 3,
        msg: {
            onEnter: 'Difficult rocky terrain slows you down.'
        },
        addComp: [{comp: 'Terrain',
            func: {setMods: [speedPenalty(0.25, ['Flying'])]}
        }]
    },
    {
        name: 'snowy cliff', className: 'cell-element-snow-tree',
        char: ELEV[0], z: 1,
        msg: {
            onEnter: 'Difficult and slippery snowy terrain slows you down.'
        },
        addComp: ['Snowy', {comp: 'Terrain',
            func: {setMods: [speedPenalty(0.35, ['Flying'])]}
        }]
    },
    {
        name: 'snow-covered stone', className: 'cell-element-snow-tree',
        char: ELEV[1], z: 2,
        msg: {
            onEnter: 'Difficult and slippery snowy terrain slows you down.'
        },
        addComp: ['Snowy', {comp: 'Terrain',
            func: {setMods: [speedPenalty(0.35, ['Flying'])]}
        }]
    },
    {
        name: 'frozen steep cliff', className: 'cell-element-snow-tree',
        char: ELEV[2], z: 3,
        msg: {
            onEnter: 'Difficult and slippery snowy terrain slows you down.'
        },
        addComp: ['Snowy', {comp: 'Terrain',
            func: {setMods: [speedPenalty(0.35, ['Flying'])]}
        }]
    },

    {
        name: 'tree', className: 'cell-element-tree',
        char: 'T', addComp: ['Opaque'],
        msg: {
            onEnter: 'There is a tree here.'
        }
    },
    {
        name: 'large tree', className: 'cell-element-tree-large',
        char: 'T', addComp: ['Impassable', 'Opaque'],
        msg: {
            onEnter: 'There is a large tree here.'
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
        name: 'large frozen tree', className: 'cell-element-tree-large-frozen',
        char: 'T', addComp: ['Impassable', 'Opaque'],
        msg: {
            onEnter: 'There is a large frozen tree here.'
        }
    },

    // WATER BASE ELEMENTS
    {
        name: 'shallow water', className: 'cell-element-water',
        //char: '~',
        char: DEPTH[0],
        msg: {
            onEnter: 'Shallow water slows you down slightly'
        },
        addComp: [
            {
                comp: 'Terrain',
                func: {
                    setMods: [
                        speedPenalty(0.10, ['Flying', 'Amphibious']),
                        defensePenalty(0.10, ['Flying', 'Amphibious']),
                        attackPenalty(0.10, ['Flying', 'Amphibious']),
                    ]
                }
            },
        ],
        callbacks: {
            onEnter: {addComp: [{comp: 'Drenched', useOld: true, func: {incrLevel: 1}}]}
        }
    },
    {
        name: 'water', className: 'cell-element-water',
        char: DEPTH[1],
        msg: {
            onEnter: 'Water slows you down'
        },
        addComp: [
            {comp: 'Terrain',
            func: {setMods: [
                speedPenalty(0.25, ['Flying', 'Amphibious']),
                defensePenalty(0.25, ['Flying', 'Amphibious']),
                attackPenalty(0.25, ['Flying', 'Amphibious']),
            ]}
            },
        ],
        callbacks: {
            onEnter: {addComp: [{comp: 'Drenched', useOld: true, func: {incrLevel: 2}}]},
            onRemoveParalysisEntity: {
                removeComp: [
                    {comp: 'Drowning'}
                ]
            },
            onAddParalysisEntity: {
                addComp: [
                    {comp: 'Drowning'}
                ]
            },
        }
    },
    {
        name: 'deep water', className: 'cell-element-water',
        char: DEPTH[2],
        msg: {
            onEnter: 'Deep water makes moving extremely difficult'
        },
        addComp: [{comp: 'Terrain',
            func: {setMods: [
                speedPenalty(0.50, ['Flying', 'Amphibious']),
                defensePenalty(0.50, ['Flying', 'Amphibious']),
                attackPenalty(0.50, ['Flying', 'Amphibious']),
            ]}
        }],
        callbacks: {
            onEnter: {addComp: [{comp: 'Drenched', useOld: true, func: {incrLevel: 4}}]},
            onRemoveParalysisEntity: {
                removeComp: [
                    {comp: 'Drowning'}
                ]
            },
            onAddParalysisEntity: {
                addComp: [
                    {comp: 'Drowning'}
                ]
            },
        }
    },

    // FROZEN WATER
    {
        name: 'frozen shallow water', className: 'cell-element-frozen-water',
        char: DEPTH[0],
        msg: {
            onEnter: 'There is some ice here'
        },
        addComp: ['Snowy', {comp: 'Terrain',
            func: {setMods: [speedPenalty(0.15, ['Flying'])]}
        }]
    },
    {
        name: 'frozen water', className: 'cell-element-frozen-water',
        char: DEPTH[1],
        msg: {
            onEnter: 'There is some ice here'
        },
        addComp: ['Snowy', {comp: 'Terrain',
            func: {setMods: [speedPenalty(0.15, ['Flying'])]}
        }]
    },
    {
        name: 'frozen deep water', className: 'cell-element-frozen-water',
        char: DEPTH[2],
        msg: {
            onEnter: 'There is some ice here'
        },
        addComp: ['Snowy', {comp: 'Terrain',
            func: {setMods: [speedPenalty(0.15, ['Flying'])]}
        }]
    },

    // Wall types
    {
        name: 'wallcave', className: 'cell-element-wall-cave',
        char: CHAR_WALL,
        addComp: ['Opaque',
            {comp: 'Impassable', func: ['setAllImpassable']}
        ],
    },
    {
        name: 'walldungeon', className: 'cell-element-wall-dungeon',
        char: CHAR_WALL,
        addComp: ['Opaque',
            {comp: 'Impassable', func: ['setAllImpassable']}
        ],
    },
    {
        name: 'wallcrypt', className: 'cell-element-wall-crypt',
        char: CHAR_WALL,
        addComp: ['Opaque',
            {comp: 'Impassable', func: ['setAllImpassable']}
        ],
    },
    {
        name: 'wallwooden', className: 'cell-element-wall-wooden',
        char: CHAR_WALL,
        addComp: ['Opaque',
            {comp: 'Impassable', func: ['setAllImpassable']}
        ],
    },
    {
        name: 'wallice', className: 'cell-element-wall-ice',
        char: CHAR_WALL,
        addComp: ['Opaque',
            {comp: 'Impassable', func: ['setAllImpassable']}
        ],
    },
    {
        name: 'wallcastle', className: 'cell-element-wall-castle',
        char: CHAR_WALL,
        addComp: ['Opaque',
            {comp: 'Impassable', func: ['setAllImpassable']}
        ],
    },
    {
        name: 'wallruby', className: 'style-ruby',
        char: CHAR_WALL,
        addComp: ['Opaque',
            {comp: 'Impassable', func: ['setAllImpassable']}
        ],
    },
    {
        name: 'wallvoid', className: 'style-void',
        char: CHAR_WALL,
        addComp: ['Opaque',
            {comp: 'Impassable', func: ['setAllImpassable']}
        ],
    },
    {
        name: 'wallforium', className: 'style-forium',
        char: CHAR_WALL,
        addComp: ['Opaque',
            {comp: 'Impassable', func: ['setAllImpassable']}
        ],
    },

    // MISCELLANEOUS
    {
        name: 'closed window', className: 'cell-element-window',
        char: '+', addComp: ['Impassable']
    },

    {
        name: 'tilled soil', noRandom: true,
        className: 'cell-element-floor',
        char: '|'
    },
    {
        name: 'planted soil', noRandom: true,
        className: 'cell-element-floor',
        char: '+'
    },

    {
        name: 'swamp', className: 'cell-element-swamp',
        char: '"',
        addComp: [{comp: 'Terrain',
            func: {
                setMods: [speedPenalty(0.25, ['Flying'])]
            }
        }]
    },
    {
        name: 'frozen swamp', className: 'cell-element-frozen-swamp',
        char: '"',
        addComp: ['Snowy', {comp: 'Terrain',
            func: {
                setMods: [speedPenalty(0.15, ['Flying'])]
            }
        }]
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
        char: '\u26F0', className: 'cell-element-mountain'
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
        dontCreate: true, name: 'pathdown',
        char: '\u27C0', className: 'cell-element-stairs'
    },
    /*{
        dontCreate: true, name: 'wallcastle',
        char: '#', className: 'cell-element-castle'
    }*/

];

export default Elements;

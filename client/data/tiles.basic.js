
/* Contains basic tiles like corridors and small rooms. */

const RG = require('../src/rg');
RG.Template = require('../src/template');

const transformList = RG.Template.transformList;

const Basic = {};
Basic.tiles = {};

Basic.tiles.corner = [
`
dir:NE
name:corner
X=#
Y=#

#X#.#X#
Y??.??#
#??.??#
#??....
#?????#
Y?????#
#######`,

`
dir:NEW
name:tcorner
X=#
Y=#

#X#.#X#
Y??.??#
#??.??#
.......
#?????#
Y?????#
#######`,

`
dir:NSEW
name:cross
X=#
Y=#

#X#.#X#
Y??.??#
#??.??#
.......
#??.??#
Y??.??#
###.###`

];

Basic.tiles.corridor = [
`
dir:NS
name:corridor
X=#
Y=#

#X#.#X#
Y??.??#
#??.??#
#??.??#
#??.??#
Y??.??#
###.###`

];

Basic.tiles.room = [
`
dir:N
name:room
X=#
Y=#

#X#.#X#
Y.....#
#.....#
#.....#
#.....#
Y.....#
#######`

];

// Contains names of the tiles to transform
const transforms = {
    all: ['corner'],
    flipVer: [],
    rotateR90: ['tcorner', 'corridor', 'room'],
    rotateR180: ['tcorner', 'room'],
    rotateR270: ['tcorner', 'room']
};

// All tiles concat together
Basic.tiles.all = []
    .concat(Basic.tiles.corner)
    .concat(Basic.tiles.corridor)
    .concat(Basic.tiles.room);

// Templates created from tiles strings
Basic.templates = Basic.tiles.all.map(tile => (
    RG.Template.createTemplate(tile)
));

const transformed = transformList(Basic.templates, transforms);
Basic.templates = Basic.templates.concat(transformed);

/*
const weighted = [];
Basic.templates.forEach(templ => {
    const weight = templ.getProp('weight');
    if (weight) {
        const nClones = weight - 1;
        for (let i = 0; i < nClones; i++) {
            weighted.push(templ.clone());
        }
    }
});
Basic.templates = Basic.templates.concat(weighted);
*/

// 5x5 tiles with room matching
Basic.tiles5x5 = {};
Basic.tiles5x5.corner = [
`
dir:NE
name:corner
X=#
Y=#

#X.X#
Y?.?#
#?...
Y???#
#####`,

`
dir:NEW
name:tcorner
X=#
Y=#

#X.X#
Y?.?#
.....
Y???#
#####`,

`
dir:NSEW
name:cross
X=#
Y=#

#X.X#
Y?.?#
.....
Y?.?#
##.##`
];

Basic.tiles5x5.corridor = [
`
dir:NS
name:corridor
X=#
Y=#

#X.X#
Y?.?#
#?.?#
Y?.?#
##.##`

];


Basic.tiles5x5.room = [
`
dir:N
name:room_term
X=#
Y=#

#X.X#
Y...#
#...#
Y...#
#####`,

`
dir:ND
name:room_adapt
X=#
Y=#

#X.X#
Y...#
#...#
Y...#
#...#`,

`
dir:D
name:room_end
X=#
Y=#

#X#X#
Y...#
#...#
Y...#
#...#`,

`
dir:UDLR
name:room_center
X=.
Y=.

#X.X#
Y....
.....
Y....
#...#`

];

Basic.tiles5x5.filler =
`
name:FILLER
X=#
Y=#

#X#X#
Y####
#####
Y####
#####`;

Basic.tiles5x5.all = []
    .concat(Basic.tiles5x5.corner)
    .concat(Basic.tiles5x5.corridor)
    .concat(Basic.tiles5x5.room);

// Templates created from tiles strings
Basic.templates5x5 = Basic.tiles5x5.all.map(tile => (
    RG.Template.createTemplate(tile)
));

Basic.remap = {};
Basic.remap.exits = {
    N: 'S', S: 'N', E: 'W', W: 'E',
    U: 'D', D: 'U', L: 'R', R: 'L'
};
Basic.remap.nsew2Dir = {
    N: 'U', S: 'D', E: 'R', W: 'L'
};
Basic.remap.transformRotate = {
    U: 'R', D: 'L', L: 'U', R: 'D',
    N: 'E', E: 'S', S: 'W', W: 'N'
};
Basic.remap.transformFlip = {L: 'R', R: 'L', W: 'E', E: 'W'};

// Due to custom directions UDLR, need to define how transformations are applied
// to different exits.
const exitMap = {
    flipVer: Basic.remap.transformFlip,
    rotate90: Basic.remap.transformRotate,
    rotate180: Basic.remap.transformRotate,
    rotate270: Basic.remap.transformRotate
};

const transformed5x5 = transformList(Basic.templates5x5, transforms, exitMap);
Basic.templates5x5 = Basic.templates5x5.concat(transformed5x5);

module.exports = Basic;

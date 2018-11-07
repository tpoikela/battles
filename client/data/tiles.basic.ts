
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
#######`,

`
dir:N
name:room_small
X=#
Y=#

#X#.#X#
Y#...##
##...##
##...##
##...##
Y######
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

const Basic5x5 = {};
// 5x5 tiles with room matching
Basic5x5.tiles = {};
Basic5x5.tiles.corner = [
`
dir:NE
name:corner
X=#
W=.
Y=#

#XWX#
Y?.?#
#?...
Y???#
#####`,

`
dir:NEW
name:tcorner
X=#
W=.
Y=#

#XWX#
Y?.?#
.....
Y???#
#####`,

`
dir:NSEW
name:cross
X=#
W=.
Y=#

#XWX#
Y?.?#
.....
Y?.?#
##.##`
];

Basic5x5.tiles.corridor = [
`
dir:NS
name:corridor
X=#
W=.
Y=#

#XWX#
Y?.?#
#?.?#
Y?.?#
##.##`

];


Basic5x5.tiles.room = [
`
dir:N
name:room_term1
X=#
W=.
Y=#

#XWX#
Y...#
#...#
Y...#
#####`,

`
dir:U
name:room_term2
X=.
W=.
Y=#

#XWX#
Y...#
#...#
Y####
#####`,

`
dir:ND
name:room_adapt
X=#
W=.
Y=#

#XWX#
Y...#
#...#
Y...#
#...#`,

`
dir:NR
name:room_adapt_corner
X=#
W=.
Y=#

#XWX#
Y....
#....
Y....
#####`,

`
dir:LNR
name:room_adapt_tcorner
X=#
W=.
Y=.

#XWX#
Y....
.....
Y....
#####`,

`
dir:NRW
name:room_adapt_tcorner2
X=#
W=.
Y=#

#XWX#
Y....
.....
Y....
#####`,

`
dir:RUW
name:room_adapt_tcorner3
X=.
W=.
Y=#

#XWX#
Y....
.....
Y....
#####`,

`
dir:RU
name:room_corner
X=.
W=.
Y=#

#XWX#
Y....
#....
Y....
#####`,

`
dir:RU
name:room_corner2
X=.
W=.
Y=#

#XWX.
Y....
#....
Y....
#####`,

`
dir:UD
name:room_ext
X=.
W=.
Y=#

#XWX#
Y...#
#...#
Y...#
#...#`,

`
dir:DEW
name:room_end
X=#
W=#
Y=#

#XWX#
Y...#
.....
Y...#
#...#`,

`
dir:D
name:room_end
X=#
W=#
Y=#

#XWX#
Y...#
#...#
Y...#
#...#`,

`
dir:UDLR
name:room_center
X=.
W=.
Y=.

#XWX#
Y....
.....
Y....
#...#`,

`
dir:DEUW
name:room_center2
X=.
W=.
Y=#

#XWX#
Y...#
.....
Y...#
#...#`,

`
dir:DLR
name:room_center3
X=#
W=#
Y=.

#XWX#
Y....
.....
Y....
#...#`,

`
dir:NDRW
name:room_center3
X=#
W=.
Y=#

#XWX#
Y....
.....
Y....
#...#`,

`
dir:NSEL
name:room_center4
X=#
W=.
Y=.

#XWX#
Y...#
.....
Y...#
##.##`

];

Basic5x5.tiles.start =
`
dir:NSRW
name:start
X=#
W=+
Y=.

#XWX#
Y...+
+...+
Y...+
##+##`
;

Basic5x5.tiles.filler =
`
name:FILLER
X=#
Y=#

#X#X#
Y####
#####
Y####
#####`;

Basic5x5.tiles.all = []
    .concat(Basic5x5.tiles.corner)
    .concat(Basic5x5.tiles.corridor)
    .concat(Basic5x5.tiles.room);

// Templates created from tiles strings
Basic5x5.templates = Basic5x5.tiles.all.map(tile => (
    RG.Template.createTemplate(tile)
));

Basic5x5.remap = {};
Basic5x5.remap.exits = {
    N: 'S', S: 'N', E: 'W', W: 'E',
    U: 'D', D: 'U', L: 'R', R: 'L'
};
Basic5x5.remap.nsew2Dir = {
    N: 'U', S: 'D', E: 'R', W: 'L'
};
Basic5x5.remap.transformRotate = {
    U: 'R', D: 'L', L: 'U', R: 'D',
    N: 'E', E: 'S', S: 'W', W: 'N'
};
Basic5x5.remap.transformFlip = {L: 'R', R: 'L', W: 'E', E: 'W'};

// Due to custom directions UDLR, need to define how transformations are applied
// to different exits.
Basic5x5.exitMap = {
    flipVer: Basic5x5.remap.transformFlip,
    rotateR90: Basic5x5.remap.transformRotate,
    rotateR180: Basic5x5.remap.transformRotate,
    rotateR270: Basic5x5.remap.transformRotate
};

Basic5x5.transforms = {
    all: '*',
    flipVer: [],
    rotateR90: [],
    rotateR180: [],
    rotateR270: []
};

const transformed5x5 = transformList(Basic5x5.templates,
    Basic5x5.transforms, Basic5x5.exitMap);
Basic5x5.templates = Basic5x5.templates.concat(transformed5x5);
Basic5x5.roomCount = -1;

Basic5x5.startRoomFunc = function() {
    const tile = RG.Template.createTemplate(Basic5x5.tiles.start);
    const x = Math.floor(this.tilesX / 2);
    const y = Math.floor(this.tilesY / 2);
    return {
        x, y, room: tile
    };
};

Basic5x5.Models = {};
Basic5x5.Models.default = Basic5x5.templates;

module.exports = {Basic, Basic5x5};

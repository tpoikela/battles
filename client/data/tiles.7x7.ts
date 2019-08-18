
import {Template} from '../src/template';
const transformList = Template.transformList;

export const Basic7x7: any = {};
Basic7x7.tiles = {};

Basic7x7.tiles.corner = [
`
dir:NE
name:corner
X=#
Y=#
W=.
Z=#

#X#W#X#
Y??.??#
#??.??#
Z??....
#?????#
Y?????#
#######`,

`
dir:NEW
name:tcorner
X=#
Y=#
W=.
Z=.

#X#W#X#
Y??.??#
#??.??#
Z......
#?????#
Y?????#
#######`,

`
dir:NSEW
name:cross
X=#
Y=#
W=.
Z=.

#X#W#X#
Y??.??#
#??.??#
Z......
#??.??#
Y??.??#
###.###`

];

Basic7x7.tiles.corridor = [
`
dir:NS
name:corridor
X=#
Y=#
W=.
Z=#

#X#W#X#
Y??.??#
#??.??#
Z??.??#
#??.??#
Y??.??#
###.###`

];

Basic7x7.tiles.room = [
`
dir:NSEW
noedge:1
name:room_hall
X=.
Y=.
W=.
Z=.

.X.W.X.
Y......
.......
Z......
.......
Y......
.......`,

`
dir:N
name:room
tag:term
X=#
Y=#
W=.
Z=#

#X#W#X#
Y.....#
#.....#
Z.....#
#.....#
Y.....#
#######`,

`
dir:N
name:room_diag
tag:term
X=#
Y=#
W=.
Z=#

#X#W#X#
Y.....#
#..#..#
Z.....#
##...##
Y##.###
#######`,

`
dir:N
name:room_small
tag:term
X=#
Y=#
W=.
Z=#

#X#W#X#
Y#...##
##...##
Z#...##
##...##
Y######
#######`,

`
dir:N
name:room_special
tag:term
X=#
Y=#
W=.
Z=#

#X#W#X#
Y.....#
##...##
Z.....#
##...##
Y..#..#
#######`

];

Basic7x7.tiles.diag = [
`
dir:NW
name:corridor_diag
X=#
Y=#
W=.
Z=.

#X.W.X#
Y...###
...####
Z.#####
.######
Y######
#######`,

`
dir:NEW
name:corridor_diag2
X=#
Y=#
W=.
Z=.

#X.W.X#
Y.....#
...#...
Z.###..
.#####.
Y######
#######`,

`
dir:NSEW
name:corridor_diag2_a
X=#
Y=#
W=.
Z=.

#X.W.X#
Y.....#
.......
Z.#.#..
.##.##.
Y##.###
###.###`,

`
dir:NSEW
name:corridor_diag3
X=#
Y=#
W=.
Z=.

#X.W.X#
Y...###
...####
Z......
.##.###
Y##.###
###.###`,
];

Basic7x7.tiles.filler =
`
name:filler
X=#
Y=#
W=#
Z=#

#X#W#X#
Y######
#######
Z######
#######
Y######
#######`;


// Contains names of the tiles to transform
const transforms = {
    all: '*',
    flipVer: [],
    rotateR90: [],
    rotateR180: [],
    rotateR270: []
};


// All tiles concat together
Basic7x7.tiles.all = []
    .concat(Basic7x7.tiles.corner)
    .concat(Basic7x7.tiles.corridor)
    .concat(Basic7x7.tiles.room)
    .concat(Basic7x7.tiles.diag);

// Templates created from tiles strings
Basic7x7.templates = Basic7x7.tiles.all.map(tile => (
    Template.createTemplate(tile)
));

const transformed = transformList(Basic7x7.templates, transforms);
Basic7x7.templates = Basic7x7.templates.concat(transformed);

Basic7x7.names = {};
Basic7x7.names.diag = Basic7x7.templates.filter(tt => (
    /diag/.test(tt.getProp('name'))
)).map(tt => tt.getProp('name'));

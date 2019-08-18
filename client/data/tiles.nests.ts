
import {Template, ElemTemplate, verifyTiles} from '../src/template';
const transformList = Template.transformList;

type TemplateLevel = import('../src/template.level').TemplateLevel;

export const Nests: any = {};

Nests.tiles = {};

// These can be placed in nest corners
Nests.tiles.corner = [
`
name:corner1
dir:E
X=#
Y=#
W=#
Z=#

#X#W#X#
Y.....#
#.###..
Z.?.##.
#.###..
Y.....#
#######`,

`
name:corner2
dir:SE
X=#
Y=#
W=#
Z=#

#X#W#X#
Y.....#
#.###..
Z.?.##.
#.###..
Y.....#
###+###`,

`
name:corner3
dir:E
X=#
Y=#
W=#
Z=#

#X#W#X#
Y#.#.##
#..#+##
Z......
#..#+##
Y#.#.##
#######`,

`
name:corner4
dir:SE
X=#
Y=#
W=#
Z=#

#X#W#X#
Y#.#.##
##+#+##
Z......
#...###
Y#..+.#
###.###`,

];


Nests.tiles.center = [
`
name:center1
noedge:1
dir:S
X=#
Y=#
W=#
Z=#

#X#W#X#
Y.....#
#.....#
Z.....#
#.....#
Y.....#
###.###`,

`
name:center2
noedge:1
dir:NS
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
###.###`,

`
name:center3
noedge:1
dir:NSW
X=#
Y=#
W=.
Z=.

#X#W#X#
Y.....#
#.....#
Z.....#
#.....#
Y.....#
###.###`,

`
name:center4
noedge:1
dir:NSEW
X=#
Y=#
W=.
Z=.

#X#W#X#
Y.....#
#.....#
Z......
#.....#
Y.....#
###.###`,

`
name:center5_open
noedge:1
dir:NSEW
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
name:center6_open
noedge:1
dir:SEW
X=#
Y=.
W=#
Z=.

#X#W#X#
Y......
.......
Z......
.......
Y......
.......`,

`
name:center7_open
dir:EW
X=#
Y=.
W=#
Z=.

#X#W#X#
Y......
.......
Z......
.......
Y......
#######`,

`
name:center8_open
dir:SW
X=#
Y=.
W=#
Z=.

#X#W#X#
Y.....#
......#
Z.....#
......#
Y.....#
......#`,

];

Nests.tiles.corridor = [
`
name:corridor1
dir:EW
X=#
Y=#
W=#
Z=.

#X#W#X#
Y######
#.....#
Z......
#.....#
Y######
#######`,

`
name:corridor2
dir:SEW
X=#
Y=#
W=#
Z=.

#X#W#X#
Y######
#.....#
Z......
#.....#
Y##.###
###.###`,

`
name:corridor3
dir:SE
X=#
Y=#
W=#
Z=#

#X#W#X#
Y######
#.....#
Z......
#.....#
Y##.###
###.###`,

// Extension of center
`
name:corridor_ext
dir:N
X=#
Y=#
W=.
Z=#

#X.W.X#
Y.....#
#.....#
Z######
#######
Y######
#######`,
];


Nests.tiles.filler = `
name:FILLER
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

const centerOpen = true;

Nests.matchFilter = function(
    tl: TemplateLevel, x, y, listMatch: ElemTemplate[], last): ElemTemplate[]
{
    if (tl.isCorner(x, y)) {
        return listMatch.filter(et => /corner/.test(et.getProp('name')));
    }
    else if (tl.isEdge(x, y)) {
        return listMatch.filter(et => /corridor/.test(et.getProp('name')));
    }
    else {
        if (centerOpen) {
            return listMatch.filter(et => /center\d+_open/.test(et.getProp('name')));
        }
        else {
            return listMatch.filter(et => /center/.test(et.getProp('name')));
        }
    }

};

// Nests.startRoomFunc = function()

const transforms = {
    all: '*',
    flipVer: [],
    rotateR90: [],
    rotateR180: [],
    rotateR270: []
};

Nests.tiles.all = []
    .concat(Nests.tiles.corner)
    .concat(Nests.tiles.corridor)
    .concat(Nests.tiles.center);

// Templates created from tiles strings
Nests.templates = Nests.tiles.all.map(tile => (
    Template.createTemplate(tile)
));

const transformed = transformList(Nests.templates, transforms);
Nests.templates = Nests.templates.concat(transformed);

//             X, W, X, Y, Z, Y
const genXY = [1, 1, 1, 1, 1, 1];
verifyTiles('tiles.nests.ts', 'Verifying tiles', Nests.templates, genXY);

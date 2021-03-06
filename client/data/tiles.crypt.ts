/* Contains ASCII tiles used for the crypt level generation. */

import RG from '../src/rg';
import {Template, ElemTemplate} from '../src/template';
import {Random} from '../src/random';
import {TemplateData} from '../src/interfaces';

const RNG = Random.getRNG();

export const Crypt: TemplateData = {
    Models: {default: []},
    templates: {all: []}
};
Crypt.tiles = {};

Crypt.tiles.filler = `
name:FILLER
X=#
Y=#

#X###X#
Y######
#######
#######
#######
Y######
#######`;

Crypt.tiles.start = [
`
dir:NSEW
name:start_nsew
X=#
Y=#

#X#+#X#
Y.....#
#.#.#.#
+.###.+
#.#.#.#
Y.....#
###+###`,

`
dir:SEW
name:start_sew
X=#
Y=#

#X###X#
Y.....#
#.#.#.#
+.###.+
#.#.#.#
Y.....#
###+###`,

`
dir:NEW
name:start_new
X=#
Y=#

#X#+#X#
Y.....#
#.#.#.#
+.###.+
#.#.#.#
Y.....#
#######`,

`
dir:NSE
name:start_nse
X=#
Y=#

#X#+#X#
Y.....#
#.#.#.#
#..#..+
#.#.#.#
Y.....#
###+###`,

`
dir:NSW
name:start_nsw
X=#
Y=#

#X#+#X#
Y.....#
#.#.#.#
+..#..#
#.#.#.#
Y.....#
###+###`
];

// Omni-directionals
Crypt.tiles.omni = [
`
dir:NSEW
noedge:1
name:omni
X=#
Y=#

#X#.#X#
Y.....#
#.....#
...#...
#.....#
Y.....#
###.###`,

`
dir:NSEW
noedge:1
name:omni
X=#
Y=#

#X#.#X#
Y.....#
#.#.#.#
...#...
#.#.#.#
Y.....#
###.###`,
`
dir:NSEW
noedge:1
name:omni
X=#
Y=#

#.X.X.#
Y.....#
#..#..#
..###..
#..#..#
Y.....#
###.###`,

`
name:omni
noedge:1
dir:NSEW
X=#
Y=#

#X...X#
.......
Y..#..#
..###..
Y..#..#
.......
##...##`,

`
name:omni
noedge:1
dir:NSEW
X=.
Y=.

..X.X..
.##.##.
Y#...#.
...#...
Y#...#.
.##.##.
.......`,

`
name:omni
noedge:1
dir:NSEW
X=.
Y=.

#.X.X.#
###.###
Y#...#.
...#...
Y#...#.
###.###
#.....#`,

`
name:omni
noedge:1
dir:NSEW
X=.
Y=.

..X.X..
.##.##.
Y##.##.
.......
Y##.##.
.##.##.
.......`,

`
dir:NSEW
noedge:1
name:omni
X=.
Y=.

..X.X..
.##.##.
Y#...#.
.#...#.
Y#...#.
.##.##.
.......`
];

// Terminals (one exit only)
Crypt.tiles.term = [
`
dir:N
name:term
X=#
Y=#

#X#.#X#
#.....#
Y.#.#.#
###.###
Y.....#
#.....#
#######`,

`
dir:N
name:term
X=#
Y=#

#X#.#X#
#.....#
Y.#.#.#
###.###
Y##.###
##...##
#######`,

`
dir:S
name:term
X=#
Y=#

#X###X#
#.....#
Y.#.#.#
###.###
Y.#.#.#
#.....#
##...##`,

`
dir:S
name:term
X=#
Y=#

#X###X#
#######
Y######
###.###
Y.....#
#.....#
##...##`,

`
dir:W
name:term
X=#
Y=#

#X###X#
#.....#
Y.#.#.#
...####
Y.#.#.#
#.....#
#######`,

`
dir:W
name:term
X=#
Y=#

#X###X#
#.#...#
Y.#.###
..#...#
Y.###.#
#.....#
#######`,

`
dir:E
name:term
X=#
Y=#

#X###X#
#.....#
Y..#..#
#..#...
Y.###.#
#.....#
#######`,

`
dir:E
name:term
X=#
Y=#

#X###X#
#.....#
Y...###
#...#..
Y.###.#
#.....#
#######`
];

// Corridors (2 exits on opposite sides)
Crypt.tiles.corridor = [
`
dir:NS
name:corridor
X=#
Y=#

#X...X#
##...##
Y#...##
##...##
Y#...##
##...##
##...##`,

`
dir:NS
name:corridor
X=#
Y=#

#X...X#
#.....#
Y#...##
#.....#
Y#...##
#.....#
##...##`,


`
dir:EW
name:corridor
X=#
Y=#

#X###X#
#######
Y......
.......
Y......
#######
#######`,

`
dir:EW
name:corridor
X=#
Y=#

#X###X#
#.#.#.#
Y.....#
.......
Y.....#
#.#.#.#
#######`
];

// Corners
Crypt.tiles.corner = [
`
dir:NW
name:corner
X=#
Y=#

#X...X#
###.###
Y....##
.....##
Y....##
#######
#######`,

`
dir:NW
name:corner
X=#
Y=#

#X#.#X#
#.....#
Y.....#
......#
Y.###.#
#.....#
#######`,

`
dir:NE
name:corner
X=.
Y=#

#X...X#
###.###
Y#...#.
##.....
Y#...#.
#######
#######`,

`
dir:NE
name:corner
X=#
Y=#

#X#.#X#
#.....#
Y.###.#
#......
Y.....#
#.....#
#######`,

`
dir:SE
name:corner
X=#
Y=#

#X###X#
###.###
Y#...#.
##.....
Y#...#.
###.###
###.###`,

`
dir:SE
name:corner
X=#
Y=#

#X###X#
#.#.#.#
Y#...##
#......
Y#...##
#.#.#.#
###.###`,

`
dir:SW
name:corner
X=#
Y=.

#X###X#
###.###
Y#...##
......#
Y#...##
###.###
###.###`
];


// The rest
Crypt.tiles.misc = [
`
dir:SEW
name:threeway
X=#
Y=.

#X###X#
###.###
Y#...#.
.......
Y#...#.
###.###
###.###`,

`
dir:SEW
name:threeway
X=#
Y=#

#X###X#
#.....#
Y.#.#.#
..#.#..
Y##.###
#.....#
#.....#`,

`
dir:NEW
name:threeway
X=#
Y=.

#X...X#
###.###
Y#...#.
.......
Y#...#.
#######
#######`,

`
dir:NSW
name:threeway
X=#
Y=#

#X...X#
###.###
Y#...##
......#
Y#...##
###.###
###.###`,

`
dir:NSE
name:threeway
X=#
Y=#

#X...X#
###.###
Y#...##
##.....
Y#...##
###.###
###.###`
];

Crypt.templates.start = Crypt.tiles.start.map(tile => {
    return Template.createTemplate(tile);
});

/* Returns the starting room for the crypt generation. Note that 'this' should
 * be bound to Template.Level object. */
Crypt.startRoomFunc = function() {
    const tile: ElemTemplate = RNG.arrayGetRand(Crypt.templates.start);
    let x = RNG.getUniformInt(0, this.tilesX - 1);
    let y = RNG.getUniformInt(0, this.tilesY - 1);
    switch (tile.getProp('name')) {
        case 'start_nsew': {
            x = Math.floor(this.tilesX / 2);
            y = Math.floor(this.tilesY / 2);
            break;
        }
        case 'start_sew': {
            y = 0;
            if (x === 0) {x += 1;}
            if (x === this.tilesX - 1) {x -= 1;}
            break;
        }
        case 'start_new': {
            y = this.tilesY - 1;
            if (x === 0) {x += 1;}
            if (x === this.tilesX - 1) {x -= 1;}
            break;
        }
        case 'start_nse': {
            x = 0;
            if (y === 0) {y += 1;}
            if (y === this.tilesY - 1) {y -= 1;}
            break;

        }
        case 'start_nsw': {
            x = this.tilesX - 1;
            if (y === 0) {y += 1;}
            if (y === this.tilesY - 1) {y -= 1;}
            break;

        }
        default: break;
    }

    return {
        x, y, room: tile
    };
};

// Note that the starting rooms are not included in this list, thus they'll be
// placed only by the startRoomFunc
Crypt.Models.default = []
    .concat(Crypt.tiles.corner)
    .concat(Crypt.tiles.corridor)
    .concat(Crypt.tiles.omni)
    .concat(Crypt.tiles.term)
    .concat(Crypt.tiles.misc);

Crypt.templates.all = Crypt.Models.default.map(tile => (
    Template.createTemplate(tile)
));
const transformed = Template.transformList(Crypt.templates.all);
Crypt.templates.all = Crypt.templates.all.concat(transformed);

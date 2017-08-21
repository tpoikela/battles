/* Contains ASCII tiles used for the crypt level generation. */

const RG = require('../src/rg');
RG.Random = require('../src/random');

const Crypt = {};
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

Crypt.templates = {};

Crypt.templates.start = Crypt.tiles.start.map(tile => {
    return RG.Template.createTemplate(tile);
});

/* Returns the starting room for the crypt generation. */
Crypt.startRoomFunc = function() {
    const tile = RG.RAND.arrayGetRand(Crypt.templates.start);
    let x = RG.RAND.getUniformInt(0, this.tilesX - 1);
    let y = RG.RAND.getUniformInt(0, this.tilesY - 1);
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


Crypt.Models = {};

// Note that the starting rooms are not included in this list
Crypt.Models.default = []
    .concat(Crypt.tiles.corner)
    .concat(Crypt.tiles.corridor)
    .concat(Crypt.tiles.omni)
    .concat(Crypt.tiles.term)
    .concat(Crypt.tiles.misc);

module.exports = Crypt;

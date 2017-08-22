
const RG = require('../src/rg');
RG.Random = require('../src/random');

const Castle = {};

Castle.corridorDoorThr = 0.2;

Castle.tiles = {};

// Corners
Castle.tiles.corner = [
`
dir:NW
name:corner_se
X=.
Y=#

#X...X#
#.....#
Y.....#
......#
Y.....#
......#
#######`,

`
dir:NW
name:corner_se
X=#
Y=#

#X#+#X#
Y.....#
+.....#
+...#.#
+..####
Y...###
#######`,

`
dir:NE
name:corner_sw
X=.
Y=#

#X...X#
#.....#
Y......
#......
Y......
#.....#
#######`,

`
dir:SW
name:corner_ne
X=#
Y=.

#X###X#
Y.....#
......#
......#
......#
Y.....#
#.....#`,

`
dir:SE
name:corner_nw
X=#
Y=#

#X###X#
#......
Y......
#......
Y......
#......
#.....#`
];

// Terminals
Castle.tiles.term = [
`
dir:N
name:term_n
X=#
Y=#

#X#+#X#
#.....#
Y.....#
#.....#
Y.....#
#.....#
#######`,

`
dir:S
name:term_s
X=#
Y=#

#X###X#
#.....#
Y.....#
#.....#
Y.....#
#.....#
###+###`,

`
dir:E
name:term_e
X=#
Y=#

#X###X#
#.....#
Y.....#
#.....+
Y.....#
#.....#
#######`,

`
dir:W
name:term_w
X=#
Y=#

#X###X#
#.....#
Y.....#
+.....#
Y.....#
#.....#
#######`
];

// Entrances
Castle.tiles.entrance = [
`
dir:NEW
name:entrance_n
X=.
Y=#

#X...X#
##...##
Y##.###
..#+#..
.......
Y.....#
#######`,

`
dir:SEW
name:entrance_s
X=#
Y=#

#X###X#
.......
Y.#.##.
.##+##.
Y#...##
#.....#
##...##`
];

// Entrances
Castle.tiles.entranceWall = [
`
dir:NEW
name:entrance_n
X=.
Y=#

#X...X#
##...##
Y##.###
..#+#..
.......
Y.....#
##...##`
];

// Corridors
Castle.tiles.corridor = [
`
dir:NS
name:corridor_ns
X=.
Y=#

#X...X#
#.....#
Y.....#
#.....#
Y.....#
#.....#
#.....#`,
`
dir:EW
name:corridor_ew
X=#
Y=.

#X###X#
.......
Y......
.......
Y......
.......
#######`
];

// Branching from the main wall
Castle.tiles.branch = [
`
dir:NSE
name:corridor_nse
X=.
Y=#

#X...X#
#.....#
Y.....#
#.....+
Y.....#
#.....#
#.....#`,

`
dir:NSW
name:corridor_nsw
X=#
Y=#

#X...X#
#.....#
Y.....#
+.....#
Y.....#
#.....#
##...##`,


`
dir:NEW
name:corridor_new
X=#
Y=.

#X#+#X#
.......
Y......
.......
Y......
.......
#######`,

`
dir:SEW
name:corridor_sew
X=#
Y=.

#X###X#
.......
Y......
.......
Y......
.......
###+###`

];

// Filler cell
Castle.tiles.fillerFloor = `
name:FILLER
X=.
Y=.

.X...X.
Y......
.......
.......
.......
Y......
.......`;

Castle.tiles.fillerWall = `
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

/* Returns the starting room for castle generation. */
Castle.startRoomFunc = function() {
    // const templ = this.findTemplate({name: 'corner_nw'});
    const templ = this.findTemplate({name: 'entrance_n'});
    return {
        x: Math.floor(this.tilesX / 2), y: 0, room: templ
    };
};

/* Constraint function how to generate the castle level. */
Castle.constraintFunc = function(x, y, exitReqd) {

    // Constraints for 4 corners
    if (x === 0 && y === 0) {
        return this.findTemplate({name: 'corner_nw'});
    }
    if (x === 0 && y === this.tilesY - 1) {
        return this.findTemplate({name: 'corner_sw'});
    }
    if (x === this.tilesX - 1 && y === 0) {
        return this.findTemplate({name: 'corner_ne'});
    }
    if (x === this.tilesX - 1 && y === this.tilesY - 1) {
        return this.findTemplate({name: 'corner_se'});
    }

    // Northern wall
    if (y === 0 ) {
        const ew = this.findTemplate({name: 'corridor_ew'});
        const sew = this.findTemplate({name: 'corridor_sew'});
        if (sew) {
            if (exitReqd === 'S') {
                return sew;
            }
            if (RG.RAND.getUniform() < Castle.corridorDoorThr) {
                return sew;
            }
        }
        return ew;
    }
    // Southern wall
    else if (y === this.tilesY - 1) {
        const ew = this.findTemplate({name: 'corridor_ew'});
        const corrNew = this.findTemplate({name: 'corridor_new'});
        if (corrNew) {
            if (exitReqd === 'N') {
                return corrNew;
            }
            if (RG.RAND.getUniform() < Castle.corridorDoorThr) {
                return corrNew;
            }
        }
        return ew;
    }

    // Western wall
    if (x === 0) {
        const corrNs = this.findTemplate({name: 'corridor_ns'});
        const corrNse = this.findTemplate({name: 'corridor_nse'});
        if (corrNse) {
            if (exitReqd === 'E') {
                return corrNse;
            }
            if (RG.RAND.getUniform() < Castle.corridorDoorThr) {
                return corrNse;
            }
        }
        return corrNs;
    }
    // Eastern wall
    else if (x === this.tilesX - 1) {
        const corrNs = this.findTemplate({name: 'corridor_ns'});
        const corrNsw = this.findTemplate({name: 'corridor_nsw'});
        if (corrNsw) {
            if (exitReqd === 'W') {
                return corrNsw;
            }
            if (RG.RAND.getUniform() < Castle.corridorDoorThr) {
                return corrNsw;
            }
        }
        return corrNs;
    }
    return null;
};

Castle.roomCount = -1; // Fill until no more exits

Castle.Models = {};

Castle.Models.full = []
    .concat(Castle.tiles.branch)
    .concat(Castle.tiles.corner)
    .concat(Castle.tiles.term)
    .concat(Castle.tiles.entrance)
    .concat(Castle.tiles.corridor);

Castle.Models.outerWall = []
    .concat(Castle.tiles.entranceWall)
    .concat(Castle.tiles.corner)
    .concat(Castle.tiles.corridor);

module.exports = Castle;

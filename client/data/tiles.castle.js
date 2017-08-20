
const RG = require('../src/rg');
RG.Random = require('../src/random');

const Castle = {};

const corridorDoorThr = 0.2;

// Corners
Castle.corners = [
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
Castle.terms = [
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
Castle.entrances = [
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

// Corridors
Castle.corridors = [
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
Castle.branches = [
`
dir:NSE
name:corridor_nse
X=.
Y=#

#X...X#
#.....#
Y.....#
#......
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
......#
Y.....#
#.....#
##...##`,


`
dir:NEW
name:corridor_new
X=#
Y=.

#X#.#X#
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
###.###`

];

// Filler cell
Castle.fillerFloor = `
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

Castle.fillerWall = `
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

Castle.templates = [];

/* Returns the starting room for castle generation. */
Castle.getStartRoom = function() {
    console.log('### Castle.getStartRoom');
    // const templ = this.findTemplate({name: 'corner_nw'});
    const templ = this.findTemplate({name: 'entrance_n'});
    return {
        x: Math.floor(this.tilesX / 2), y: 0, room: templ
    };
};

/* Constraint function how to generate the castle level. */
Castle.constraintFunc = function(x, y, exitReqd) {
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

    if (y === 0 ) {
        const ew = this.findTemplate({name: 'corridor_ew'});
        const sew = this.findTemplate({name: 'corridor_sew'});
        if (exitReqd === 'S') {
            return sew;
        }
        if (RG.RAND.getUniform() < corridorDoorThr) {
            return sew;
        }
        return ew;
    }
    else if (y === this.tilesY - 1) {
        const ew = this.findTemplate({name: 'corridor_ew'});
        const corrNew = this.findTemplate({name: 'corridor_new'});
        if (exitReqd === 'N') {
            return corrNew;
        }
        if (RG.RAND.getUniform() < corridorDoorThr) {
            return corrNew;
        }
        return ew;
    }

    if (x === 0) {
        const corrNs = this.findTemplate({name: 'corridor_ns'});
        const corrNse = this.findTemplate({name: 'corridor_nse'});
        if (exitReqd === 'E') {
            return corrNse;
        }
        if (RG.RAND.getUniform() < corridorDoorThr) {
            return corrNse;
        }
        return corrNs;
    }
    else if (x === this.tilesX - 1) {
        const corrNs = this.findTemplate({name: 'corridor_ns'});
        const corrNsw = this.findTemplate({name: 'corridor_nsw'});
        if (exitReqd === 'W') {
            return corrNsw;
        }
        if (RG.RAND.getUniform() < corridorDoorThr) {
            return corrNsw;
        }
        return corrNs;
    }
    console.log(`RETURN NULL for ${x},${y}`);
    return null;
};

Castle.templates = []
    .concat(Castle.branches)
    .concat(Castle.corners)
    .concat(Castle.terms)
    .concat(Castle.entrances)
    .concat(Castle.corridors);

Castle.templatesWall = []
    .concat(Castle.corners)
    .concat(Castle.corridors);

module.exports = Castle;

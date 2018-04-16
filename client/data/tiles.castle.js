
const RG = require('../src/rg');
RG.Random = require('../src/random');
const Vault = require('./tiles.vault');

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
Y......
..#.#..
.##+##.
Y#...##
#.....#
##...##`,

`
dir:NSW
name:entrance_w
X=#
Y=#

##X..X#
Y.##..#
...##.#
....+.#
...##.#
Y.##..#
###...#`,

`
dir:NSE
name:entrance_e
X=#
Y=#

#.X..X#
Y.##.##
#..#.#.
#....+.
#..#.#.
Y.##.##
#.....#`
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
##...##`,

`
dir:SEW
name:entrance_s
X=#
Y=#

#X...X#
Y.....#
..#.#..
.##+##.
Y#...##
#.....#
#.....#`,

`
dir:NSW
name:entrance_w
X=#
Y=#

##X..X#
Y.##..#
...##.#
....+.#
...##.#
Y.##..#
###...#`,

`
dir:NSE
name:entrance_e
X=.
Y=#

#.X..X#
Y.##.##
...#.#.
.....+.
...#.#.
Y.##.##
#.....#`
];

// Corridors
Castle.tiles.corridor = [
`
dir:NS
name:corridor_east
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
dir:NS
name:corridor_west
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
name:corridor_north
X=#
Y=.

#X###X#
.......
Y......
.......
Y......
.......
#######`,

`
dir:EW
name:corridor_south
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

// These provide exit from the main wall, however their exit direction is not
// specified thus they're treated as normal bi-directional corridors for PCG
Castle.tiles.corridorWithExit = [
`
dir:NS
name:corridor_east
X=.
Y=#

#X...X#
#.....#
Y#....#
......#
Y#....#
#.....#
#.....#`,

`
dir:NS
name:corridor_west
X=.
Y=#

#X...X#
#.....#
Y....##
#......
Y....##
#.....#
#.....#`,

`
dir:EW
name:corridor_north
X=#
Y=.

#X###X#
.......
Y......
.......
Y......
..#.#..
###.###`,

`
dir:EW
name:corridor_south
X=#
Y=.

#X#.#X#
..#.#..
Y......
.......
Y......
..#.#..
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
    const midX = Math.floor(this.tilesX / 2);
    const north = RG.RAND.getUniform() <= 0.5;

    let templ = null;
    let y = 0;

    if (north) {
        templ = this.findTemplate({name: 'entrance_n'});
    }
    else {
        templ = this.findTemplate({name: 'entrance_s'});
        y = this.tilesY - 1;
    }
    return {
        x: midX, y, room: templ
    };
};

Castle.startRoomFuncSouth = function() {
  const y = this.tilesY - 1;
  const x = Math.floor(this.tilesX / 2);
  const templ = this.findTemplate({name: 'entrance_s'});
  return {
      x, y, room: templ
  };
};

Castle.startRoomFuncWest = function() {
  const y = Math.floor(this.tilesY / 2);
  const x = 0;
  const templ = this.findTemplate({name: 'entrance_w'});
  return {
      x, y, room: templ
  };
};

Castle.startRoomFuncEast = function() {
  const y = Math.floor(this.tilesY / 2);
  const x = this.tilesX - 1;
  const templ = this.findTemplate({name: 'entrance_e'});
  return {
      x, y, room: templ
  };
};

/* Start function if two fixed entrances are required. */
Castle.startFuncTwoGates = function() {
  const midX = Math.floor(this.tilesX / 2);
  const gateN = this.findTemplate({name: 'entrance_n'});
  const gateS = this.findTemplate({name: 'entrance_s'});

  this.addRoom(gateN, midX, 0);

  return {
    x: midX, y: this.tilesY - 1, room: gateS
  };
};

/* Start function if two fixed entrances are required. */
Castle.startFuncFourGates = function() {
  const midX = Math.floor(this.tilesX / 2);
  const midY = Math.floor(this.tilesY / 2);

  const gateN = this.findTemplate({name: 'entrance_n'});
  const gateS = this.findTemplate({name: 'entrance_s'});
  const gateE = this.findTemplate({name: 'entrance_e'});
  const gateW = this.findTemplate({name: 'entrance_w'});

  this.addRoom(gateN, midX, 0);
  this.addRoom(gateE, this.tilesX - 1, midY);
  this.addRoom(gateW, 0, midY);

  return {
    x: midX, y: this.tilesY - 1, room: gateS
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
        const ew = this.findTemplate({name: 'corridor_north'});
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
        const ew = this.findTemplate({name: 'corridor_south'});
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
        const corrNs = this.findTemplate({name: 'corridor_west'});
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
        const corrNs = this.findTemplate({name: 'corridor_east'});
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
    .concat(Castle.tiles.corridor)
    .concat(Vault.tiles.vault)
    .concat(Vault.tiles.corner);

Castle.Models.outerWall = []
    .concat(Castle.tiles.entranceWall)
    .concat(Castle.tiles.corner)
    .concat(Castle.tiles.corridor)
    .concat(Castle.tiles.corridorWithExit);

Castle.templates = {};
Castle.templates.all = Castle.Models.full.map(tile => (
    RG.Template.createTemplate(tile)
));
const transformed = RG.Template.transformList(Castle.templates.all);
Castle.templates.all = Castle.templates.all.concat(transformed);

module.exports = Castle;

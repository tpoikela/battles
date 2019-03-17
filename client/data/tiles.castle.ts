
import RG from '../src/rg';
import {Random} from '../src/random';
import {Template, ElemTemplate} from '../src/template';
import {Vault} from './tiles.vault';

const RNG = Random.getRNG();

export const Castle: any = {};

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
name:corner_se1
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

#.X.X##
Y.#..##
#.##.#.
#....+.
#..#.#.
Y.##.##
#.....#`,

`
dir:SEW
name:entrance_ne
X=#
Y=#

##X#X##
Y.#..##
..##.#.
.....+.
...#.#.
Y.##.##
#.....#`,

`
dir:SEW
name:entrance_nw
X=#
Y=#

##X##X#
Y###..#
.####.#
.+....#
.####.#
Y###..#
###...#`,

`
dir:NEW
name:entrance_se
X=#
Y=#

##X.X##
Y....##
.....#.
.....+.
...#.#.
Y.##.##
#######`,

`
dir:NEW
name:entrance_sw
X=#
Y=#

##X..X#
Y##...#
.#....#
.+....#
.#....#
Y###..#
#######`,
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

#.#XX##
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

Castle.tiles.storerooms = [
`
dir:S
name:storeroom_s
X=#
Y=#

#X###X#
#.....#
Y.....#
#.....#
Y.....#
###|###
##..&##`,

`
dir:N
name:storeroom_n
X=#
Y=#

#X&..X#
###|###
Y.....#
#.....#
Y.....#
#######
#######`,

`
dir:W
name:storeroom_w
X=#
Y=#

##X#X##
Y#.#.##
.#....#
.|...##
&#....#
Y#.#.##
#######`,

`
dir:E
name:storeroom_e
X=#
Y=#

##X#X##
Y#.#.##
#....#&
#....|.
#....#.
Y..#.##
#######`
];

/* Living spaces in the castle. */
Castle.tiles.residential = [
`
name:living2x2
X=#
Y=#

#X+#+X#
#::#::#
Y::#::#
#######
Y::#::#
#::#::#
##+#+##`,

`
name:living2x2
dir:NS
X=#
Y=#

#X#.#X#
#:+.+:#
Y:#.#:#
###.###
Y:#.#:#
#:+.+:#
###.###`,

`
name:living2x2
dir:NS
X=#
Y=#

#X#.#X#
Y:#.#:#
#:+.+:#
###.###
#:+.+:#
Y:#.#:#
###.###`,

`
name:livingL2S
dir:S
X=#
Y=#

#X###X#
#:::::#
Y:::::#
###+###
Y:#.#:#
#:+.+:#
###.###`,

`
name:livingL_corner
dir:NE
X=#
Y=#

#X#..X#
#:#+#..
Y:::##.
#::::#.
Y::::##
#:::::#
#######`,

`
name:living_3dir
dir:NSE
X=#
Y=#

#X#.X##
Y:#.#:#
#:#.#+#
#:#....
Y:#.###
#:+.###
###.###`,

`
name:living_corner
dir:NE
X=#
Y=#

#X#.#X#
#:#...#
Y:###.#
#:::+..
Y:::###
#:::+:#
#######`,

`
name:living_corner2
dir:NE
X=#
Y=#

#X#.#X#
#:#...#
Y:###..
#:::+#.
Y::::##
#:::::#
#######`

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

interface RoomPlace {
    x: number;
    y: number;
    room: ElemTemplate;
}

type StartRoomFunc = () => RoomPlace;

Castle.startFuncs = {} as {[key: string]: StartRoomFunc};

/* Returns the starting room for castle generation. */
Castle.startRoomFunc = function(): RoomPlace {
    const midX = Math.floor(this.tilesX / 2);
    const north = RNG.getUniform() <= 0.5;

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

Castle.startRoomFuncNorth = function(): RoomPlace {
  const y = 0;
  const x = Math.floor(this.tilesX / 2);
  const templ = this.findTemplate({name: 'entrance_n'});
  return {
      x, y, room: templ
  };
};
Castle.startFuncs.N = Castle.startRoomFuncNorth;

Castle.startRoomFuncSouth = function(): RoomPlace {
  const y = this.tilesY - 1;
  const x = Math.floor(this.tilesX / 2);
  const templ = this.findTemplate({name: 'entrance_s'});
  return {
      x, y, room: templ
  };
};
Castle.startFuncs.S = Castle.startRoomFuncSouth;

Castle.startRoomFuncWest = function(): RoomPlace {
  const y = Math.floor(this.tilesY / 2);
  const x = 0;
  const templ = this.findTemplate({name: 'entrance_w'});
  return {
      x, y, room: templ
  };
};
Castle.startFuncs.W = Castle.startRoomFuncWest;

Castle.startRoomFuncEast = function(): RoomPlace {
  const y = Math.floor(this.tilesY / 2);
  const x = this.tilesX - 1;
  const templ = this.findTemplate({name: 'entrance_e'});
  return {
      x, y, room: templ
  };
};
Castle.startFuncs.E = Castle.startRoomFuncEast;

Castle.startRoomFuncNorthEast = function(): RoomPlace {
  const y = 0;
  const x = this.tilesX - 1;
  const templ = this.findTemplate({name: 'entrance_ne'});
  return {x, y, room: templ};
};
Castle.startFuncs.NE = Castle.startRoomFuncNorthEast;

Castle.startRoomFuncNorthWest = function(): RoomPlace {
  const y = 0;
  const x = 0;
  const templ = this.findTemplate({name: 'entrance_nw'});
  return {x, y, room: templ};
};
Castle.startFuncs.NW = Castle.startRoomFuncNorthWest;


Castle.startRoomFuncSouthEast = function(): RoomPlace {
  const y = this.tilesY - 1;
  const x = this.tilesX - 1;
  const templ = this.findTemplate({name: 'entrance_se'});
  return {x, y, room: templ};
};
Castle.startFuncs.SE = Castle.startRoomFuncSouthEast;

Castle.startRoomFuncSouthWest = function(): RoomPlace {
  const y = this.tilesY - 1;
  const x = 0;
  const templ = this.findTemplate({name: 'entrance_sw'});
  return {x, y, room: templ};
};
Castle.startFuncs.SW = Castle.startRoomFuncSouthWest;

/* Start function if two fixed entrances are required. */
Castle.startFuncTwoGates = function(): RoomPlace {
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
            if (RNG.getUniform() < Castle.corridorDoorThr) {
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
            if (RNG.getUniform() < Castle.corridorDoorThr) {
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
            if (RNG.getUniform() < Castle.corridorDoorThr) {
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
            if (RNG.getUniform() < Castle.corridorDoorThr) {
                return corrNsw;
            }
        }
        return corrNs;
    }
    return null;
};

// TODO does not work correctly, connection points between edge
// and center corridors must be handled somehow
Castle.constraintFuncCross = function(x, y, exitReqd) {
    let res = Castle.constraintFunc.call(this, x, y, exitReqd);
    const midX = Math.ceil(this.tilesX / 2);
    const midY = Math.ceil(this.tilesY / 2);

    if (res === null || x === midX || y === midY) {
        if (x === 0 && y === midY) {
            return this.findTemplate({name: 'corridor_nse'});
        }
        else if (x === this.tilesX - 1 && y === midY) {
            return this.findTemplate({name: 'corridor_nsw'});
        }
        else if (y === 0 && x === midX) {
            return this.findTemplate({name: 'corridor_sew'});
        }
        else if (y === this.tilesY - 1 && x === midX) {
            return this.findTemplate({name: 'corridor_new'});
        }
        else if (x === midX && y === midY) {
            res = this.findTemplate({name: 'FILLER'});
        }
        else if (x === midX) {
            if (exitReqd === 'E') {
                return this.findTemplate({name: 'corridor_nse'});
            }
            else if (exitReqd === 'W') {
                return this.findTemplate({name: 'corridor_nsw'});
            }
            const corrE = this.findTemplate({name: 'corridor_east'});
            const corrNsw = this.findTemplate({name: 'corridor_nsw'});
            const corrW = this.findTemplate({name: 'corridor_west'});
            const corrNse = this.findTemplate({name: 'corridor_nse'});
            return RNG.arrayGetRand([corrE, corrNsw, corrW, corrNse]);
        }
        else if (y === midY) {
            if (exitReqd === 'S') {
                return this.findTemplate({name: 'corridor_sew'});
            }
            else if (exitReqd === 'N') {
                return this.findTemplate({name: 'corridor_new'});
            }
            const corrN = this.findTemplate({name: 'corridor_north'});
            const corrSew = this.findTemplate({name: 'corridor_sew'});
            const corrS = this.findTemplate({name: 'corridor_south'});
            const corrNew = this.findTemplate({name: 'corridor_new'});
            return RNG.arrayGetRand([corrN, corrSew, corrN, corrNew]);
        }
    }
    return res;
};

Castle.roomCount = -1; // Fill until no more exits

Castle.Models = {};

Castle.Models.full = []
    .concat(Castle.tiles.branch)
    .concat(Castle.tiles.corner)
    .concat(Castle.tiles.term)
    .concat(Castle.tiles.entrance)
    .concat(Castle.tiles.corridor)
    .concat(Castle.tiles.storerooms)
    .concat(Vault.tiles.vault)
    .concat(Vault.tiles.corner);

Castle.Models.residential = Castle.tiles.residential.concat(Castle.Models.full);

Castle.Models.outerWall = []
    .concat(Castle.tiles.entranceWall)
    .concat(Castle.tiles.corner)
    .concat(Castle.tiles.corridor)
    .concat(Castle.tiles.corridorWithExit);

Castle.templates = {};
Castle.templates.all = Castle.Models.full.map(tile => (
    Template.createTemplate(tile)
));
let transformed = Template.transformList(Castle.templates.all);
Castle.templates.all = Castle.templates.all.concat(transformed);

Castle.templates.livingOnly = Castle.tiles.residential.map(tile => (
    Template.createTemplate(tile)
));
transformed = Template.transformList(Castle.templates.livingOnly);
Castle.templates.livingOnly = Castle.templates.livingOnly.concat(transformed);
Castle.templates.residential = Castle.templates.livingOnly.concat(
    Castle.templates.all);

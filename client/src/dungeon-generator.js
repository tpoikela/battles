
const ROT = require('../../lib/rot.js');
const RG = require('./rg.js');
RG.Map = require('./map.js');
const Level = require('./level');
const Geometry = require('./geometry');

const WALL = 1;

/*
const ROOM_CONF = {
    BIG_CENTER_ROOM: 'BIG_CENTER_ROOM'
    CROSS: 'CROSS'
};
*/

const PROB = {
    BIG_VAULT: 0.1

};

/* This class is used to generate different dungeon levels. */
const DungeonGenerator = function() {

};

/* Contain the default options for various level types. */
DungeonGenerator.options = {
    digger: {
        roomWidth: [3, 9],
        roomHeight: [3, 5],
        corridorLength: [3, 10],
        dugPercentage: 0.2
    },
    uniform: {
        roomWidth: [3, 9],
        roomHeight: [3, 5],
        roomDugPercentage: 0.1
    }
};
const OPTIONS = DungeonGenerator.options;

DungeonGenerator.getOptions = function(type = 'digger') {
    const levelOpts = {
        levelType: type, nBigRooms: 1,
        bigRoomX: ['cen'], bigRoomY: ['cen'],
        bigRoomWidth: [10], bigRoomHeight: [10]
    };
    const mapOpts = {options: OPTIONS[type]};
    return Object.assign(levelOpts, mapOpts);
};

const getRandLevelType = () => {
    return RG.RAND.arrayGetRand(['uniform', 'digger']);
};

/* Creates the actual Map.Level. */
DungeonGenerator.prototype.create = function(cols, rows, conf) {
    const mapGen = this.getMapGen(cols, rows, conf);

    const map = new RG.Map.CellList(cols, rows);
    mapGen.create((x, y, val) => {
        if (val === WALL) {
            map.setBaseElemXY(x, y, RG.ELEM.WALL);
        }
    });

    // At this point, we could add things like water, chasms, bridges
    this.addSpecialFeatures(map, conf);

    const level = new Level(cols, rows);
    level.setMap(map);

    // Finally, we could populate the level with items/actors here

    // For stairs, use placeholders to mark potential stairs locations

    // Optional verification of connectivity etc.
    if (conf.rerunOnFailure || conf.errorOnFailure) {
        if (!this.verifyLevel(mapGen, level, conf)) {
            this.create(cols, rows, conf);
        }
    }
    return level;
};

DungeonGenerator.prototype.getMapGen = function(cols, rows, conf) {
    let levelType = getRandLevelType();
    if (conf.dungeonType && conf.dungeonType !== '') {
        levelType = conf.dungeonType;
    }

    const opts = conf.options || OPTIONS[levelType];
    const mapGen = new ROT.Map.Digger(cols, rows, opts);
    // Here we need to add special rooms etc
    const bigRooms = this.addBigRooms(mapGen, conf);
    if (bigRooms.length > 0) {
        mapGen.bigRooms = bigRooms;
    }
    return mapGen;
};

/* Creates 'big' rooms for the map. Rooms can be used a normal room as it is, or
 * as a container for other special feature like vault. The first big room is
 * always guaranteed to be connected by the algorith. 2nd room may not be
 * connected, but this can be checked if necessary.
 */
DungeonGenerator.prototype.addBigRooms = function(mapGen, conf) {
    const [cols, rows] = [mapGen.getCols(), mapGen.getRows()];
    const [cx, cy] = [Math.floor(cols / 2), Math.floor(rows / 2)];
    const nBigRooms = conf.nBigRooms || 0;
    const bigRoomsCreated = [];

    // Generate different options for big rooms:
    //   1. Left/right big corridor [X]
    //   2. Center hor/ver corridor [X]
    //   3. Top/bottom big corridor [X]
    //   4. Small vault 1/4 of level
    //   5. Big vault 2/4 of level -> 2 orientations
    //   6. Cross or H or I or Z
    //   7. 2 rooms on opposite corners
    //   8. Big center room (add stairs far away), temple

    // Customly specified big rooms
    for (let i = 0; i < nBigRooms; i++) {
        let width = Math.floor(cols / 4);
        if (conf.bigRoomWidth) {
            if (conf.bigRoomWidth[i]) {
                width = conf.bigRoomWidth[i];
            }
        }

        let height = Math.floor(rows / 4);
        if (conf.bigRoomHeight) {
            if (conf.bigRoomHeight[i]) {
                height = conf.bigRoomHeight[i];
            }
        }

        const maxX = cols - 2 - width;
        let x = RG.RAND.getUniformInt(1, maxX);
        if (conf.bigRoomX) {
            x = conf.bigRoomX[i];
        }

        if (/cen/.test(x)) {
            x = cx - Math.floor(width / 2);
        }

        const maxY = rows - 2 - height;
        let y = RG.RAND.getUniformInt(1, maxY);
        if (conf.bigRoomY) {
            y = conf.bigRoomY[i];
        }
        if (/cen/.test(y)) {
            y = cy - Math.floor(height / 2);
        }

        const x2 = x + (width - 1);
        const y2 = y + (height - 1);
        const room = new ROT.Map.Feature.Room(x, y, x2, y2);
        mapGen._options.dugPercentage += 0.1;
        // mapGen._options.roomDugPercentage = 0.1;
        if (i === 0) {
            mapGen.startRoom(room);
        }
        else {
            mapGen.addRoom(room);
        }
        bigRoomsCreated.push(room);
    }

    /* eslint no-constant-condition: 0 */
    // Big center room
    if (0) {
        const roomWidth = [Math.floor(cols / 6), Math.floor(cols / 5)];
        const roomHeight = [Math.floor(rows / 3), Math.floor(rows / 3)];
        const opts = {roomWidth, roomHeight};
        const room = ROT.Map.Feature.Room.createCenter(cx, cy, opts);
        mapGen._options.dugPercentage += 0.2;
        mapGen.addRoom(room);
        bigRoomsCreated.push(room);
    }

    // Large east side corridor
    if (0) {
        const width = Math.floor(cols / 4);
        const room = new ROT.Map.Feature.Room(1, 1, width, rows - 2);
        mapGen._options.dugPercentage += 0.3;
        mapGen.addRoom(room);
        bigRoomsCreated.push(room);
    }

    // Large west side corridor
    if (0) {
        const width = Math.floor(cols / 4);
        const x0 = cols - 2 - width;
        const room = new ROT.Map.Feature.Room(x0, 1, cols - 2, rows - 2);
        mapGen._options.dugPercentage += 0.3;
        mapGen.addRoom(room);
        bigRoomsCreated.push(room);
    }

    // Large north side corridor
    if (0) {
        const height = Math.floor(rows / 4);
        const room = new ROT.Map.Feature.Room(1, 1, cols - 2, height);
        mapGen._options.dugPercentage += 0.3;
        mapGen.addRoom(room);
        bigRoomsCreated.push(room);
    }

    // Large south side corridor
    if (0) {
        const height = Math.floor(rows / 4);
        const y0 = rows - 2 - height;
        const room = new ROT.Map.Feature.Room(1, y0, cols - 2, rows - 2);
        mapGen._options.dugPercentage += 0.20;
        mapGen.addRoom(room);
        bigRoomsCreated.push(room);
    }

    // Cross
    if (0) {
        const div = 8;
        const width = Math.floor(cols / div);
        const height = Math.floor(rows / div);
        mapGen._options.dugPercentage += 0.20;
        const horOpts = {
            roomWidth: [cols - 2, cols - 2], roomHeight: [height, height]
        };
        const verOpts = {
            roomHeight: [rows - 2, rows - 2], roomWidth: [width, width]
        };
        const roomHor = ROT.Map.Feature.Room.createCenter(cx, cy, horOpts);
        const roomVer = ROT.Map.Feature.Room.createCenter(cx, cy, verOpts);
        mapGen.addRoom(roomHor);
        mapGen.addRoom(roomVer);
        bigRoomsCreated.push(roomHor);
        bigRoomsCreated.push(roomVer);
    }

    // Small vault 1/4 of level
    if (1) {
        const big = RG.RAND.getUniform() <= PROB.BIG_VAULT;
        let width = Math.floor(cols / 2);
        let height = Math.floor(rows / 2);
        let corners = ['NE', 'NW', 'SW', 'SE'];
        if (big) {
            if (RG.RAND.getUniform() <= 0.5) {
                corners = ['NE', 'NW'];
                width = Math.floor(cols / 2);
                height = rows - 2;
            }
            else {
                corners = ['NW', 'SW'];
                width = cols - 2;
                height = Math.floor(rows / 2);
            }
            mapGen._options.dugPercentage += 0.25;
        }
        const [x0, y0] = this.getRandCorner(width, height, cols, rows, corners);
        const x1 = x0 + width - 1;
        const y1 = y0 + height - 1;
        const room = new ROT.Map.Feature.Room(x0, y0, x1, y1);
        mapGen._options.dugPercentage += 0.20;
        mapGen.addRoom(room);
        bigRoomsCreated.push(room);
    }

    // Big vault 1/2 of level

    return bigRoomsCreated;
};

DungeonGenerator.prototype.getRandCorner = function(w, h, cols, rows, corners) {
    const corner = RG.RAND.arrayGetRand(corners);
    let [x, y] = [1, 1];
    switch (corner) {
        case 'NW': x = 1; y = 1; break;
        case 'NE': x = cols - 2 - w; y = 1; break;
        case 'SW': x = 1; y = rows - 2 - h; break;
        case 'SE': x = cols - 2 - w; y = rows - 2 - h; break;
        default: break;
    }
    return [x, y];
};

DungeonGenerator.prototype.addSpecialFeatures = function(cols, rows, conf) {

};

/* Right now, use a floodfill to check the connectivity. */
DungeonGenerator.prototype.verifyLevel = function(mapGen, level, conf) {
    const map = level.getMap();
    const type = 'floor';
    const floorCells = map.getCells(c => c.getBaseElem().getType() === type);
    const cell = floorCells[0];
    const floorCellsFilled = Geometry.floodfill(map, cell, type);

    if (floorCells.length !== floorCellsFilled.length) {
        if (conf.errorOnFailure) {
            level.debugPrintInASCII();
            RG.err('DungeonGenerator', 'verifyLevel',
                'floodfill cannot reach all cells!');
        }
        return false;
    }

    return true;
};

module.exports = DungeonGenerator;

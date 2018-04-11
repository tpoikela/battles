
const ROT = require('../../lib/rot.js');
const RG = require('./rg.js');
RG.Map = require('./map.js');
const Level = require('./level');
const Geometry = require('./geometry');
const MapGen = require('./map.generator');
const Path = require('./path');

const WALL = 1;

const shortestPath = Path.getShortestPath;
// Number of cells allowed to be unreachable
const maxUnreachable = 10;

/*
const ROOM_CONF = {
    BIG_CENTER_ROOM: 'BIG_CENTER_ROOM'
    CROSS: 'CROSS'
};
*/

const SPLASH_THEMES = {
    chasm: {
        elem: RG.ELEM.CHASM
    },
    water: {
        elem: RG.ELEM.WATER
    },
    forest: {
        elem: RG.ELEM.TREE
    },
    fire: {
        elem: RG.ELEM.LAVA
    }
};

const DUG_MAX = 0.75;
const PROB = {
    BIG_ROOM: 0.2,
    bigRoomWeights: {
        cross: 1,
        corridor: 1,
        vault: 1,
        center: 1
    }
};

/* Maps a big room to different possible features. The key is matched using
* regular expression. This means the keys must be uniquely matchable. */
const bigRoomType2Feature = {
    cross: {
        special: ['splashes']
    },
    'small vault': {},
    'large vault': {},
    'large corridor': {
        special: ['splashes']
    },
    center: {
    }
};

/* Data struct for big rooms. */
const BigRoom = function(type, room) {
    this.room = room;
    this.type = type;
};

/* This class is used to generate different dungeon levels. */
const DungeonGenerator = function() {
    this.addDoors = true;
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

/* Returns the default options for dungeon level generation. */
DungeonGenerator.getOptions = function(type = 'digger') {
    const levelOpts = {
        levelType: type, nBigRooms: 1,
        bigRoomX: ['cen'], bigRoomY: ['cen'],
        bigRoomWidth: [10], bigRoomHeight: [10]
    };
    const mapOpts = {options: OPTIONS[type]};
    return Object.assign(levelOpts, mapOpts);
};

/* Returns random supported level type. */
const getRandMapType = () => {
    return RG.RAND.arrayGetRand(['uniform', 'digger']);
};

/* Creates the actual Map.Level. */
DungeonGenerator.prototype.create = function(cols, rows, conf) {
    const minNumRooms = 3;
    let mapGen = null;
    let map = null;
    const createCb = (x, y, val) => {
        if (val === WALL) {
            map.setBaseElemXY(x, y, RG.ELEM.WALL);
        }
    };

    let watchdog = 10;
    while (!mapGen || mapGen.getRooms().length < minNumRooms) {
        mapGen = this.getMapGen(cols, rows, conf);
        map = new RG.Map.CellList(cols, rows);
        mapGen.create(createCb);
        if (--watchdog === 0) {
            break;
        }
    }

    const level = new Level(cols, rows);
    level.setMap(map);

    const extras = {
        rooms: mapGen.getRooms(),
        corridors: mapGen.getCorridors()
    };
    if (mapGen.bigRooms) {
        extras.bigRooms = mapGen.bigRooms;
    }
    level.setExtras(extras);

    // At this point, we could add things like water, chasms, bridges
    this.addSpecialFeatures(level, conf);

    // Determine stairs locations
    this.addStairsLocations(level, conf);

    // Add critical path (player must pass through this, usually), not entirely
    // true as there are usually many paths from start to end
    this.addCriticalPath(level);

    // Finally, we could populate the level with items/actors here
    this.populateLevel(level, conf);

    // For stairs, use placeholders to mark potential stairs locations

    // Optional verification of connectivity etc.
    if (conf.rerunOnFailure || conf.errorOnFailure) {
        const fillDiag = true;
        if (!this.verifyLevel(mapGen, level, conf, fillDiag)) {
            this.create(cols, rows, conf);
        }
    }
    return level;
};

DungeonGenerator.prototype.getMapGen = function(cols, rows, conf) {
    let levelType = getRandMapType();
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
    let bigRoomsCreated = [];

    // Generate different options for big rooms:
    //   1. Left/right big corridor [X]
    //   2. Center hor/ver corridor [X]
    //   3. Top/bottom big corridor [X]
    //   4. Small vault 1/4 of level [X]
    //   5. Big vault 2/4 of level -> 2 orientations [X]
    //   6. Cross or H or I or Z
    //   7. 2 rooms on opposite corners
    //   8. Big center room (add stairs far away) [X]

    // Customly specified big rooms
    if (conf.nBigRooms > 0) {
        bigRoomsCreated = this.addCustomBigRooms(mapGen, conf);
    }

    const createBigRoom = RG.RAND.getUniform() <= PROB.BIG_ROOM;
    if (createBigRoom && conf.nBigRooms === 0) {
        const bigRoomType = this.getBigRoomType();
        /* eslint no-constant-condition: 0 */
        if (/center/.test(bigRoomType)) {
            bigRoomsCreated = this.addBigCenterRoom(mapGen, conf);
        }
        if (/large corridor/.test(bigRoomType)) {
            bigRoomsCreated = this.addLargeCorridorRoom(mapGen, conf);
        }
        if (/cross/.test(bigRoomType)) {
            bigRoomsCreated = this.addLargeCross(mapGen, conf);
        }
        if (/vault/.test(bigRoomType)) {
            bigRoomsCreated = this.addVault(mapGen, conf);
        }
    }
    return bigRoomsCreated;
};

DungeonGenerator.prototype.getBigRoomType = function() {
    return RG.RAND.arrayGetRand(Object.keys(bigRoomType2Feature));
};

/* Adds manually specified custom rooms into the level. */
DungeonGenerator.prototype.addCustomBigRooms = function(mapGen, conf) {
    const [cx, cy] = mapGen.getCenterXY();
    const [cols, rows] = [mapGen.getCols(), mapGen.getRows()];
    const nBigRooms = conf.nBigRooms || 0;
    const bigRoomsCreated = [];
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
        mapGen.addRoom(room);
        bigRoomsCreated.push(new BigRoom('custom', room));
    }
    return bigRoomsCreated;
};

DungeonGenerator.prototype.addBigCenterRoom = function(mapGen) {
    const [cols, rows] = [mapGen.getCols(), mapGen.getRows()];
    const [cx, cy] = mapGen.getCenterXY();

    const yDiv = RG.RAND.getUniformInt(2, 5);
    const xDiv = RG.RAND.getUniformInt(2, 6);
    const roomWidth = [Math.floor(cols / (xDiv + 1 )),
        Math.floor(cols / xDiv)];
    const roomHeight = [Math.floor(rows / yDiv), Math.floor(rows / yDiv)];

    const opts = {roomWidth, roomHeight};
    const room = ROT.Map.Feature.Room.createCenter(cx, cy, opts);
    mapGen._options.dugPercentage += 0.2;
    mapGen.addRoom(room);
    return [new BigRoom('center', room)];
};


DungeonGenerator.prototype.addLargeCorridorRoom = function(mapGen) {
    const [cols, rows] = [mapGen.getCols(), mapGen.getRows()];
    const cardinalDir = RG.RAND.getCardinalDirLetter();
    const roomName = 'large corridor ' + cardinalDir;

    // Large east side corridor
    let room = null;
    if (cardinalDir === 'E') {
        const xDiv = RG.RAND.getUniformInt(2, 6);
        const width = Math.floor(cols / xDiv);
        room = new ROT.Map.Feature.Room(1, 1, width, rows - 2);
    }

    // Large west side corridor
    if (cardinalDir === 'W') {
        const xDiv = RG.RAND.getUniformInt(2, 6);
        const width = Math.floor(cols / xDiv);
        const x0 = cols - 2 - width;
        room = new ROT.Map.Feature.Room(x0, 1, cols - 2, rows - 2);
    }

    // Large north side corridor
    if (cardinalDir === 'N') {
        const yDiv = RG.RAND.getUniformInt(2, 5);
        const height = Math.floor(rows / yDiv);
        room = new ROT.Map.Feature.Room(1, 1, cols - 2, height);
    }

    // Large south side corridor
    if (cardinalDir === 'S') {
        const yDiv = RG.RAND.getUniformInt(2, 5);
        const height = Math.floor(rows / yDiv);
        const y0 = rows - 2 - height;
        room = new ROT.Map.Feature.Room(1, y0, cols - 2, rows - 2);
    }

    if (!room) {
        RG.err('DungeonGenerator', 'addLargeCorridorRoom',
            'room null something went wrong');
    }

    mapGen._options.dugPercentage += 0.20;
    mapGen.addRoom(room);
    return [new BigRoom(roomName, room)];
};

DungeonGenerator.prototype.addLargeCross = function(mapGen) {
    const [cols, rows] = [mapGen.getCols(), mapGen.getRows()];
    const [cx, cy] = mapGen.getCenterXY();

    const div = RG.RAND.getUniformInt(3, 8);
    const width = Math.floor(cols / div);
    const height = Math.floor(rows / div);
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

    const areaHor = roomHor.getAreaSize();
    const areaVer = roomVer.getAreaSize();
    const dug = (areaHor + areaVer) / (cols * rows);

    mapGen._options.dugPercentage += 1.6 * dug;
    if (mapGen._options.dugPercentage >= DUG_MAX) {
        mapGen._options.dugPercentage = DUG_MAX;
    }

    return [
        new BigRoom('crossHor', roomHor),
        new BigRoom('crossVer', roomVer)
    ];
};

DungeonGenerator.prototype.addVault = function(mapGen) {
    // Small vault 1/4 of level
    // Big vault 1/2 of level
    const [cols, rows] = [mapGen.getCols(), mapGen.getRows()];
    const big = RG.RAND.getUniform() <= PROB.BIG_VAULT;
    let width = Math.floor(cols / 2);
    let height = Math.floor(rows / 2);
    let corners = ['NE', 'NW', 'SW', 'SE'];
    let type = 'small vault';
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
        type = 'large vault';
    }
    const [x0, y0] = this.getRandCorner(width, height, cols, rows, corners);
    const x1 = x0 + width - 1;
    const y1 = y0 + height - 1;
    const room = new ROT.Map.Feature.Room(x0, y0, x1, y1);
    mapGen._options.dugPercentage += 0.20;
    mapGen.addRoom(room);
    return [new BigRoom(type, room)];
};

/* Returns a random corner for a feature. */
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

/* Function adds features like chasms, bridges, rivers etc. */
DungeonGenerator.prototype.addSpecialFeatures = function(level, conf) {
    console.log(conf);
    const extras = level.getExtras();
    const map = level.getMap();

    // Adds a random special feature to the big room
    if (extras.bigRooms) {
        const room = extras.bigRooms[0];
        let features = {};
        Object.keys(bigRoomType2Feature).forEach(key => {
            if (new RegExp(key).test(room.type)) {
                features = bigRoomType2Feature[key];
            }
        });

        if (features.special) {
            const randSpecial = RG.RAND.arrayGetRand(features.special);
            this.addBigRoomSpecialFeat(level, randSpecial, extras.bigRooms);
        }
    }

    /*
    if (extras.corridors) {
        extras.corridors.forEach((corr, i) => {
            const index = i % 10;
            corr.create((x, y) => {
                const marker = new RG.Element.Marker(index);
                marker.setTag('corridor');
                // level.addElement(marker, x, y);
            });
        });
    }
    */

    if (extras.rooms) {
        const room = RG.RAND.arrayGetRand(extras.rooms);
        const terms = [];
        this.addFireToRoom(level, room);

        extras.rooms.forEach((room, id) => {
            room.setID(id); // Add ID to identify rooms
            let numDoors = 0;
            const bbox = room.getOuterBbox();
            const coord = Geometry.getBorderForBbox(bbox);
            coord.forEach(xy => {
                if (!map.has(xy, 'floor')) {
                    const marker = new RG.Element.Marker('w');
                    marker.setTag('room wall');
                    level.addElement(marker, xy[0], xy[1]);
                }
                else {
                    /* const marker = new RG.Element.Marker('D');
                    marker.setTag('room door');
                    level.addElement(marker, xy[0], xy[1]);*/
                    ++numDoors;
                }
            });

            this.addDoorsForRoom(level, room);

            if (numDoors === 1) {
                terms.push(room);
            }
        });

        terms.forEach(room => {
            const bbox = room.getInnerBbox();
            const coord = Geometry.getCoordBbox(bbox);
            coord.forEach(xy => {
                const marker = new RG.Element.Marker('t');
                marker.setTag('term');
                level.addElement(marker, xy[0], xy[1]);
            });
        });

        extras.terms = terms;
        // We know the terminal rooms know
    }
};

DungeonGenerator.prototype.addBigRoomSpecialFeat = function(
    level, randSpecial, bigRooms) {
    bigRooms.forEach(bigRoom => {
        const room = bigRoom.room; // Unwrap Feature.Room from BigRoom
        if (!room) {
            RG.err('DungeonGenerator', 'addBigRoomSpecialFeat',
                'room is null for ' + JSON.stringify(bigRoom));
        }
        switch (randSpecial) {
            case 'splashes': {
                this.addElemSplashes(level, room); break;
            }
            default: break;
        }
    });

};

DungeonGenerator.prototype.addDoorsForRoom = function(level, room) {
    if (this.addDoors) {
        room.getDoors((x, y) => {
            const cell = level.getMap().getCell(x, y);
            if (!cell.hasDoor()) {
                const door = new RG.Element.Door();
                level.addElement(door, x, y);
            }
        });
    }
};

/* Different options for splashes:
 * 1. water - amphibious
 * 2. chasms - flying
 * 3. forest - animals
 * Make sure  this is same for all rooms.
 */
DungeonGenerator.prototype.addElemSplashes = function(level, room) {
    const themeName = RG.RAND.arrayGetRand(Object.keys(SPLASH_THEMES));
    const theme = SPLASH_THEMES[themeName];
    const elem = theme.elem;

    const x0 = room.getLeft() + 1;
    const y0 = room.getTop() + 1;
    const fCols = room.getWidth();
    const fRows = room.getHeight();
    const {map} = MapGen.createSplashes(fCols, fRows,
        {nForests: 10, elem});
    Geometry.mergeMapBaseElems(level.getMap(), map, x0, y0);
};

DungeonGenerator.prototype.addFireToRoom = function(level, room) {
    const parser = RG.ObjectShell.getParser();
    const corners = Object.values(room.getCorners());
    corners.forEach(xy => {
        const fire = parser.createActor('Fire');
        level.addActor(fire, xy[0], xy[1]);
    });
};

DungeonGenerator.prototype.addStairsLocations = function(level) {
    // Default is to find rooms that are far away from each other
    const extras = level.getExtras();
    let watchdog = 100;
    if (extras.rooms) {
        // 1. Find 2 different rooms
        const room1 = RG.RAND.arrayGetRand(extras.rooms);
        let room2 = RG.RAND.arrayGetRand(extras.rooms);
        while (room1.getID() === room2.getID()) {
            room2 = RG.RAND.arrayGetRand(extras.rooms);
            if (--watchdog === 0) {break;}
        }

        const [cx1, cy1] = room1.getCenter();
        const [cx2, cy2] = room2.getCenter();

        // Store the points to extras
        extras.startPoint = [cx2, cy2];
        extras.endPoint = [cx1, cy1];

        const goalPoint = new RG.Element.Marker('>');
        const startPoint = new RG.Element.Marker('<');
        level.addElement(goalPoint, cx1, cy1);
        level.addElement(startPoint, cx2, cy2);
        room1.addStairs(cx1, cy1, true);
        room2.addStairs(cx2, cy2, false);

    }
    else {
        // Resort to random placement, no worthwhile rooms, although this
        // raises the question if the whole level should be discarded
        RG.err('DungeonGenerator', 'addStairsLocations',
            'Not enough rooms to add stairs');
    }
};


DungeonGenerator.prototype.addCriticalPath = function(level) {
    const extras = level.getExtras();
    const [cx2, cy2] = extras.startPoint;
    const [cx1, cy1] = extras.endPoint;

    const map = level.getMap();
    const pathFunc = (x, y) => {
        return map.isPassable(x, y) || map.getCell(x, y).hasDoor();
    };

    let criticalPath = Path.getShortestPath(cx2, cy2, cx1, cy1, pathFunc);
    if (criticalPath.length === 0) {
        RG.err('DungeonGenerator', 'addStairsLocations',
            'No path found between stairs');
    }

    const pathBrokenFunc = (x, y) => {
        return pathFunc(x, y) &&
            !map.getCell(x, y).hasMarker('path broken');

    };
    const minPathLen = 50;
    let prevPath = criticalPath;
    while (criticalPath.length < minPathLen) {

        // Break the existing path
        const pathBroken = this.breakPath(level, criticalPath);
        if (!pathBroken) {
            // Could not break, might be in a big room
            break;
        }

        // Break OK, find the next path which is shortest
        criticalPath = shortestPath(cx2, cy2, cx1, cy1, pathBrokenFunc);
        if (criticalPath.length === 0) {
            this.restorePath(level, prevPath);
            criticalPath = prevPath;
            break;
        }
        else {
            prevPath = criticalPath;
        }
    }

    console.log('CRITICAL PATH LENGHT: ' + criticalPath.length);

    criticalPath.forEach(xy => {
        const critPathElem = new RG.Element.Marker('*');
        critPathElem.setTag('critical path');
        level.addElement(critPathElem, xy.x, xy.y);
    });

    extras.criticalPath = criticalPath;
};

/* This breaks the path with a wall and by placing a 'path broken' marker to
 * locate the element later. */
DungeonGenerator.prototype.breakPath = function(level, path) {
    for (let i = 0; i < path.length; i++) {
        const {x, y} = path[i];
        const cell = level.getMap().getCell(x, y);
        if (cell.hasDoor()) {
            const marker = new RG.Element.Marker('X');
            marker.setTag('path broken');
            level.addElement(marker, x, y);
            console.log(`Path BROKEN at ${x},${y}`);
            return true;
        }
    }
    return false;
};

/* Restores previous broken path in case no sufficiently long new path is found.
 * */
DungeonGenerator.prototype.restorePath = function(level, path) {
    for (let i = 0; i < path.length; i++) {
        const {x, y} = path[i];
        const cell = level.getMap().getCell(x, y);
        if (cell.hasMarker('path broken')) {
            const elements = level.getElements();
            const thisXY = elements.filter(e => e.isAtXY(x, y));
            thisXY.forEach(elem => {
                if (elem.getType() === 'marker') {
                    if (elem.getTag() === 'path broken') {
                        level.removeElement(elem, x, y);
                    }
                }
            });
        }
    }
    console.log('RESTORED THE PREV PATH');
};

/* Populates the level with actors and items. Some potential features to use
* here in extras:
*   1. startPoint: No monsters spawn in vicinity
*   2. terms: Good items, tough monsters
*   3. bigRooms: spawn depending on theme
*   4. Critical path: Gold coins?
*/
DungeonGenerator.prototype.populateLevel = function(level, conf) {
    const extras = level.getExtras();
    console.log('EXTRAS ARE: ' + JSON.stringify(extras));
    const maxDanger = conf.maxDanger || 5;
    console.log('maxDanger is ' + maxDanger);

    const roomsDone = {};
    //
    if (extras.bigRooms) {
        // TODO
    }

    // Add something nasty into terminal room
    // Some possible design patterns:
    //   1. Stairs + guardian
    //   2. Guardian + strong item
    //   3. Special feature
    //   4. Pack or group of actors
    if (extras.terms) {
        extras.terms.forEach(room => {
            // Don't populate stairs Up room
            if (!room.hasStairsUp()) {
                const bbox = room.getBbox();
                const coord = Geometry.getCoordBbox(bbox);
                coord.forEach(xy => {
                    const orc = new RG.Element.Marker('o');
                    orc.setTag('orc');
                    level.addElement(orc, xy[0], xy[1]);
                });
            }
            roomsDone[room.getID()] = true;
        });
    }

    // Process rest of the rooms
    if (extras.rooms) {
        // TODO
    }

};

/* Right now, use a floodfill to check the connectivity. */
DungeonGenerator.prototype.verifyLevel = function(mapGen, level, conf) {
    const map = level.getMap();
    const filter = c => c.isPassable() || c.hasDoor();
    const floorCells = map.getCells(filter);
    const cell = floorCells[0];
    const floorCellsFilled = Geometry.floodfill(map, cell, filter);

    const numTotal = floorCells.length;
    const numFilled = floorCellsFilled.length;

    if (numFilled !== numTotal) {
        const diff = numTotal - numFilled;
        if (diff > maxUnreachable) {
            if (conf.errorOnFailure) {
                level.debugPrintInASCII();
                const msg = `Max: ${maxUnreachable}, got: ${diff}`;
                RG.err('DungeonGenerator', 'verifyLevel',
                    'floodfill cannot reach all cells! ' + msg);
            }
            return false;
        }
    }

    return true;
};

module.exports = DungeonGenerator;

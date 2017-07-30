/*
 * Code to generate the game 2-D overworld.
 */

/* bb = bounding box = (llx lly urx urx)
 * llx = lower-left x
 * lly = lower-left y
 * urx = upper-right x
 * ury = upper-right y
 *
 * Because 0,0 is located in the top-left (NW) corner, ury <= lly, which maybe
 * confusing because 'lower' has higher value than 'upper'. But in this case
 * 'lower' and 'upper' refer to visual location.
 *    y x0123
 *    0  #### <-(urx, ury)
 *    1  ####
 *    2  ####
 *       ^
 *       |
 *      (llx, lly)
 */

const RG = require('./rg');

const getRandIn = RG.RAND.arrayGetRand.bind(RG.RAND);

RG.OverWorld = {};

// Straight lines
const LL_WE = '\u2550'; // ═
const LL_NS = '\u2551'; // ║

// Corners
const CC_NW = '\u2554'; // ╔
const CC_NE = '\u2557'; // ╗
const CC_SW = '\u255A'; // ╚
const CC_SE = '\u255D'; // ╝

// Double cross
const XX = '\u256C'; // ╬
const EMPTY = 'e';

// NSEW

const TT_W = '\u2560'; // ╠
const TT_E = '\u2563'; // ╣
const TT_N = '\u2566'; // ╦
const TT_S = '\u2569'; // ╩
const TERM = '.';

// Features like cities etc.
const BTOWER = '\u265C';
const WTOWER = '\u2656';
// const CITY = '\u1CC1';

// Used for randomization
/*
const dirValues = [
    TERM, XX, EMPTY, TT_E, TT_W, TT_S, TT_N, CC_NW, CC_NE,
    CC_SW, CC_SE, LL_WE, LL_NS
];
*/

const CELL_ANY = 'CELL_ANY'; // Used in matching functions only

// Can connect to east side
const E_HAS_CONN = [XX, TT_W, TT_N, TT_S, CC_NW, CC_SW, LL_WE];
// const E_CONN = [TERM, XX, TT_E, TT_S, TT_N, LL_WE, CC_NE, CC_SE];

// Can connect to west side
const W_HAS_CONN = [XX, TT_E, TT_N, TT_S, CC_NE, CC_SE, LL_WE];
// const W_CONN = [TERM, XX, TT_W, TT_S, TT_N, LL_WE, CC_NW, CC_SW];

// Can connect to north
const N_HAS_CONN = [XX, TT_S, TT_W, TT_E, CC_SW, CC_SE, LL_NS];
// const N_CONN = [TERM, XX];

// Can connect to south
const S_HAS_CONN = [XX, TT_N, TT_W, TT_E, CC_NW, CC_NE, LL_NS];
// const S_CONN = [TERM, XX];

const N_BORDER = [LL_WE, TT_N];
const S_BORDER = [LL_WE, TT_S];
const E_BORDER = [LL_NS, TT_E];
const W_BORDER = [LL_NS, TT_W];

// const LINE_WE = [LL_WE, TT_N, TT_S, XX];
// const LINE_NS = [LL_NS, TT_E, TT_W, XX];

// Used for weighted randomisation of creating west-east walls,
// favors non-branching walls
const LINE_WE_WEIGHT = {
    [LL_WE]: 10,
    [TT_N]: 3,
    [TT_S]: 3,
    [XX]: 1
};

// Used for weighted randomisation of create north-south walls,
// favors non-branching walls
const LINE_NS_WEIGHT = {
    [LL_NS]: 10,
    [TT_E]: 3,
    [TT_W]: 3,
    [XX]: 1
};

// Connection mappings for different 'mountain' tiles
// If we have an empty cell (e), and neighbouring cell is of type 'first key',
// and this cell is located in the dir 'second key' of the empty cell,
// listed cells can be used as empty cell.
const CAN_CONNECT = {
    [LL_WE]: {
        N: [], // ═
               // e

        S: [], // e
               // ═

        E: E_HAS_CONN, // e═
        W: W_HAS_CONN  // ═e
    },
    [LL_NS]: {
        N: N_HAS_CONN, // ║
                       // e

        S: S_HAS_CONN, // e
                       // ║
        E: [], // e║
        W: []  // ║e
    },

    // Corners
    [CC_NW]: { // ╔
        N: N_HAS_CONN, // ╔
                       // e
        S: [],
        E: [],
        W: W_HAS_CONN // ╔e
    },
    [CC_NE]: {
        N: N_HAS_CONN,
        S: [],
        E: E_HAS_CONN,
        W: []
    },
    [CC_SW]: { // ╚
        N: [],
        S: S_HAS_CONN,
        E: [], // e╚
        W: W_HAS_CONN
    },
    [CC_SE]: { // ╝
        N: [],
        S: S_HAS_CONN,
        E: E_HAS_CONN,  // e╝
        W: [] // ╝e
    },

    [XX]: { // ╬ connects to all dirs
        N: N_HAS_CONN,
        S: S_HAS_CONN,
        E: E_HAS_CONN,
        W: W_HAS_CONN
    },
    [EMPTY]: {
        N: [],
        S: [],
        E: [],
        W: []
    },

    [TT_W]: { // ╠
        N: N_HAS_CONN,
        S: S_HAS_CONN,
        E: [], // e╠
        W: W_HAS_CONN  // ╠e
    },
    [TT_E]: { // ╣
        N: N_HAS_CONN,
        S: S_HAS_CONN,
        E: E_HAS_CONN,
        W: []
    },
    [TT_N]: { // ╦
        N: N_HAS_CONN,
        S: [],
        E: E_HAS_CONN,
        W: W_HAS_CONN
    },
    [TT_S]: { // ╩
        N: [],
        S: S_HAS_CONN,
        E: E_HAS_CONN,
        W: W_HAS_CONN
    },
    [TERM]: {
        N: [],
        S: [],
        E: [],
        W: []
    }
};

const Wall = function(type) {
    this.type = type; // vertical/horizontal/etc
    this.coord = []; // 2-d array of coordinates

    this.addWallCoord = function(tile) {
        this.coord.push(tile);
    };

    this.getCoordAt = function(n) {
        return this.coord[n];
    };

    this.getWallStart = function() {
        if (type === 'vertical') {
            return this.coord[0][0][1];
        }
        if (type === 'horizontal') {
            return this.coord[0][0][0];
        }
        return -1;
    };

    this.getWallEnd = function() {
        const last = this.coord.length - 1;
        if (type === 'vertical') {
            return this.coord[last][0][1];
        }
        if (type === 'horizontal') {
            return this.coord[last][0][0];
        }
        return -1;
    };

    this.toString = function() {
        let str = `Type: ${this.type} `;
        str += `Length: ${this.coord.length}\n`;
        str += `Start: ${this.getWallStart()} End: ${this.getWallEnd()}\n`;
        str += `Tiles: ${JSON.stringify(this.coord)}`;
        return str;
    };
};

/* Feature has type and a list of coordinates. It can be for example a fort
 * occupying several squares. */
RG.OverWorld.SubFeature = function(type, coord) {
    this.type = type;
    this.coord = coord;
};

/* Data struct which is tied to 'RG.Map.Level'. Contains more high-level
 * information like positions of walls and other features. Essentially a wrapper
 * around Map.Level, to keep feature info out of the Map.Level. */
RG.OverWorld.SubLevel = function(level) {
    this._level = level;
    this._hWalls = [];
    this._vWalls = [];

    // Store any number of different type of features by type
    this._features = {};

    // Stores one feature per coordinate location
    this._featuresByXY = {};

    this.addWall = function(wall) {
        if (wall.type === 'vertical') {
            this._vWalls.push(wall);
        }
        else if (wall.type === 'horizontal') {
            this._hWalls.push(wall);
        }
    };

    /* Returns one wall (or null) if none found. */
    this.getWall = function() {
        const hLen = this._hWalls.length;
        const vLen = this._vWalls.length;
        if (hLen === 0 && vLen === 0) {return null;}
        if (hLen === 0) {return this._vWalls[0];}
        if (vLen === 0) {return this._hWalls[0];}
        RG.warn('OverWorld.SubLevel', 'getWall',
            `Return hor wall. Too many walls: vLen: ${vLen}, hLen: ${hLen}`);
        return this._hWalls[0];
    };

    this.addFeature = function(feature) {
        const type = feature.type;
        if (!this._features.hasOwnProperty(type)) {
            this._features[type] = [];
        }
        this._features[type].push(feature);

        feature.coord.forEach(xy => {
            const keyXY = xy[0] + ',' + xy[1];
            this._featuresByXY[keyXY] = type;
        });
    };

};

/* Data struct for overworld. */
RG.OverWorld.Map = function() {
    this._baseMap = [];
    this._subLevels = [];

    this._hWalls = [];
    this._vWalls = [];

    this._features = {};
    this._featuresByXY = {};

    this.getMap = () => this._baseMap;
    this.getCell = (xy) => this._baseMap[xy[0]][xy[1]];

    this.setMap = function(map) {
        const sizeX = map.length;
        this._baseMap = map;
        for (let x = 0; x < sizeX; x++) {
            this._subLevels[x] = [];
        }
    };

    this.addVWall = function(wall) {
        wall.type = 'vertical';
        this._vWalls.push(wall);
    };

    this.addHWall = function(wall) {
        wall.type = 'horizontal';
        this._hWalls.push(wall);
    };

    this.addFeature = function(xy, type) {
        const keyXY = xy[0] + ',' + xy[1];
        if (!this._features.hasOwnProperty(type)) {
            this._features[type] = [];
        }
        if (!this._featuresByXY.hasOwnProperty(keyXY)) {
            this._featuresByXY[keyXY] = [];
        }
        this._features[type].push(xy);
        this._featuresByXY[keyXY].push(type);
    };

    this.getFeaturesByXY = function(xy) {
        const keyXY = xy[0] + ',' + xy[1];
        return this._featuresByXY[keyXY];
    };

    this.addSubLevel = function(xy, level) {
        this._subLevels[xy[0]][xy[1]] = level;
    };

    this.getSubLevel = function(xy) {
        return this._subLevels[xy[0]][xy[1]];
    };

    this.mapToString = function() {
        const map = JSON.parse(JSON.stringify(this._baseMap));
        const sizeY = map[0].length;
        const sizeX = map.length;

        // Add features on top of the base map, for overlapping features,
        // this shows only the first one added
        Object.keys(this._features).forEach(type => {
            this._features[type].forEach(xy => {
                map[xy[0]][xy[1]] = type;
            });
        });

        const lines = [];
        for (let y = 0; y < sizeY; y++) {
            const line = [];
            for (let x = 0; x < sizeX; x++) {
                line.push(map[x][y]);
            }
            lines.push(line);
        }
        return lines.map(line => line.join(''));
    };

};

/* Factory function to construct the overworld. Generally you want to call this
 * method.
 * @return RG.Map.Level.
 */
RG.OverWorld.createOverWorld = function(conf = {}) {
    const overworld = new RG.OverWorld.Map();

    const worldX = conf.worldX || 400;
    const worldY = conf.worldY || 400;

    const yFirst = typeof conf.yFirst !== 'undefined' ? conf.yFirst : true;

    const topToBottom = typeof conf.topToBottom !== 'undefined'
        ? conf.topToBottom : true;

    const printResult = typeof conf.printResult !== 'undefined'
        ? conf.printResult : true;

    // Size of the high-level feature map
    const owTilesX = conf.highX || 40;
    const owTilesY = conf.highY || 20;

    const xMap = Math.floor(worldX / owTilesX);
    const yMap = Math.floor(worldY / owTilesY);

    const map = createEmptyMap(owTilesX, owTilesY);
    randomizeBorders(map);
    printMap(map);
    addWallsIfAny(overworld, map, conf);
    printMap(map);

    if (topToBottom) {
        connectUnconnectedTopBottom(map, yFirst);
    }
    else {
        connectUnconnectedBottomTop(map, yFirst);
    }

    printMap(map);
    overworld.setMap(map);

    addWorldFeatures(overworld);

    if (printResult) {
        console.log(overworld.mapToString());
    }

    const worldLevel = createOverWorldLevel(
        overworld, worldX, worldY, xMap, yMap);
    return worldLevel;
};

//---------------------------------------------------------------------------
// HELPERS
//---------------------------------------------------------------------------

/* Creates an empty map. */
function createEmptyMap(sizeX, sizeY) {
    const map = [];
    for (let x = 0; x < sizeX; x++) {
        map[x] = [];
        for (let y = 0; y < sizeY; y++) {
            map[x][y] = EMPTY;
        }
    }
    return map;
}

/* Randomizes map border using valid border cells. Valid cells are ones
 * which do not have connections outside the map, and abut to neighbouring
 * cells correctly. */
function randomizeBorders(map) {
    const sizeY = map[0].length;
    const sizeX = map.length;

    // Set map corners
    map[0][0] = CC_NW;
    map[0][sizeY - 1] = CC_SW;
    map[sizeX - 1][sizeY - 1] = CC_SE;
    map[sizeX - 1][0] = CC_NE;

    // N border, y = 0, vary x
    for (let x = 1; x < sizeX - 1; x++) {
        map[x][0] = getRandIn(N_BORDER);
    }

    // S border, y = max, vary x
    for (let x = 1; x < sizeX - 1; x++) {
        map[x][sizeY - 1] = getRandIn(S_BORDER);
    }

    // E border, x = max, vary y
    for (let y = 1; y < sizeY - 1; y++) {
        map[sizeX - 1][y] = getRandIn(E_BORDER);
    }

    // W border, x = 0, vary y
    for (let y = 1; y < sizeY - 1; y++) {
        map[0][y] = getRandIn(W_BORDER);
    }

}

function addWallsIfAny(ow, map, conf) {
    const sizeY = map[0].length;
    const sizeX = map.length;

    let nHWalls = typeof conf.nHWalls !== 'undefined'
        ? conf.nHWalls : [0.3, 0.5];
    let nVWalls = typeof conf.nVWalls !== 'undefined'
        ? conf.nVWalls : [];
    const stopOnWall = typeof conf.stopOnWall !== 'undefined'
        ? conf.stopOnWall : false;

    // If only integers are given, randomize positions of walls.
    if (Number.isInteger(conf.nHWalls)) {
        nHWalls = [];
        for (let i = 0; i < conf.nHWalls; i++) {
            nHWalls.push(RG.RAND.getUniform());
        }
    }
    if (Number.isInteger(conf.nVWalls)) {
        nVWalls = [];
        for (let i = 0; i < conf.nVWalls; i++) {
            nVWalls.push(RG.RAND.getUniform());
        }
    }

    // Add horizontal and vertical "walls"
    for (let i = 0; i < nHWalls.length; i++) {
        let stop = stopOnWall;
        if (stopOnWall === 'random') {
            stop = RG.RAND.getUniform() >= 0.5;
        }
        addLineHorizontalWestToEast(ow,
            Math.floor(sizeY * nHWalls[i]), map, stop);
    }
    for (let i = 0; i < nVWalls.length; i++) {
        let stop = stopOnWall;
        if (stopOnWall === 'random') {
            stop = RG.RAND.getUniform() >= 0.5;
        }
        addLineVerticalNorthToSouth(ow,
            Math.floor(sizeX * nVWalls[i]), map, stop);
    }

}

/* Adds a horizontal line travelling from E -> W. */
function addLineHorizontalWestToEast(ow, y, map, stopOnWall = false) {
    const sizeX = map.length;
    let didStopToWall = false;
    const wall = {y, x: [1]};
    map[0][y] = TT_W;
    if (!stopOnWall) {map[sizeX - 1][y] = TT_E;}
    for (let x = 1; x < sizeX - 1; x++) {
        if (!didStopToWall) {
            if (map[x][y] !== EMPTY) {
                if (!stopOnWall) {
                    map[x][y] = XX; // Push through wall
                }
                else { // Add ╣ and finish
                    didStopToWall = true;
                    map[x][y] = TT_E;
                    wall.x.push(x);
                }
            }
            else {
                console.log(`Placing wall to ${x},${y}`);
                map[x][y] = RG.RAND.getWeighted(LINE_WE_WEIGHT);
            }
        }
    }
    if (!didStopToWall) { // Didn't stop to wall
        if (stopOnWall) { // But we wanted, so add ending piece
            map[sizeX - 1][y] = TT_E;
        }
        wall.x.push(sizeX - 1);
    }
    ow.addHWall(wall);
}

/* Adds a horizontal line travelling from E -> W. */
function addLineVerticalNorthToSouth(ow, x, map, stopOnWall = false) {
    const sizeY = map[0].length;
    let didStopToWall = false;
    const wall = {x, y: [1]};
    map[x][0] = TT_N;
    if (!stopOnWall) {map[x][sizeY - 1] = TT_S;}
    for (let y = 1; y < sizeY - 1; y++) {
        if (!didStopToWall) {
            if (map[x][y] !== EMPTY) {
                if (!stopOnWall) {
                    map[x][y] = XX; // Push through wall
                }
                else { // Add ╩ and finish
                    didStopToWall = true;
                    map[x][y] = TT_S;
                    wall.y.push(y);
                }
            }
            else {
                map[x][y] = RG.RAND.getWeighted(LINE_NS_WEIGHT);
            }
        }
    }
    if (!didStopToWall) {
        if (stopOnWall) { // But we wanted, so add ending piece
            map[x][sizeY - 1] = TT_S;
        }
        wall.y.push(sizeY - 1);
    }
    ow.addVWall(wall);
}

/* Connects all unconnected tiles by starting from 0,0 -> 0,N, then
 * moving to 1,0 -> 1,N, and so on.
 * */
function connectUnconnectedTopBottom(map, yFirst = true) {
    const sizeY = map[0].length;
    const sizeX = map.length;

    if (yFirst) {
        for (let x = 0; x < sizeX; x++) {
            for (let y = 0; y < sizeY; y++) {
                processCell(x, y, map);
            }
        }
    }
    else {
        for (let y = 0; y < sizeY; y++) {
            for (let x = 0; x < sizeX; x++) {
                processCell(x, y, map);
            }
        }
    }
}

/* Connects all unconnected tiles by starting from 0,N -> 0,0, then
 * moving to 1,N -> 1,0, and so on.
 * */
function connectUnconnectedBottomTop(map, yFirst = true) {
    const sizeY = map[0].length;
    const sizeX = map.length;

    if (yFirst) {
        for (let x = 0; x < sizeX; x++) {
            for (let y = sizeY - 1; y >= 0; y--) {
                processCell(x, y, map);
            }
        }
    }
    else {
        for (let y = sizeY - 1; y >= 0; y--) {
            for (let x = 0; x < sizeX; x++) {
                processCell(x, y, map);
            }
        }
    }
}

function processCell(x, y, map) {
    if (map[x][y] === EMPTY) {
        const neighbours = getValidNeighbours(x, y, map);
        const validNeighbours = neighbours.filter(n =>
            n[0] !== EMPTY && n[0] !== TERM
        );
        if (validNeighbours.length === 1) {
            if (validNeighbours[0][1].length > 0) {
                map[x][y] = getRandIn(validNeighbours[0][1]);
            }
            else {
                map[x][y] = TERM;
            }
        }
        else {
            map[x][y] = TERM;
        }
    }
}

/* Returns valid neighbouring tiles for the given x,y. */
function getValidNeighbours(x, y, map) {
    const sizeY = map[0].length;
    const sizeX = map.length;
    const tiles = [];
    // N
    if (y > 0) {
        const conn = CAN_CONNECT[map[x][y - 1]].N;
        tiles.push([map[x][y - 1], conn]);
    }
    // S
    if (y < sizeY - 1) {
        const conn = CAN_CONNECT[map[x][y + 1]].S;
        tiles.push([map[x][y + 1], conn]);
    }
    // E
    if (x < sizeX - 1) {
        const conn = CAN_CONNECT[map[x + 1][y]].E;
        tiles.push([map[x + 1][y], conn]);
    }
    // W
    if (x > 0) {
        const conn = CAN_CONNECT[map[x - 1][y]].W;
        tiles.push([map[x - 1][y], conn]);
    }
    return tiles;
}

function printMap(map) {
    const sizeY = map[0].length;
    const sizeX = map.length;
    for (let y = 0; y < sizeY; y++) {
        const line = [];
        for (let x = 0; x < sizeX; x++) {
            line.push(map[x][y]);
        }
        console.log(line.join(''));
    }
}

/* Creates the overworld level. Returns RG.Map.Level. */
function createOverWorldLevel(ow, elemX, elemY, xMap, yMap) {
    const map = ow.getMap();
    const sizeY = map[0].length;
    const sizeX = map.length;
    const level = RG.FACT.createLevel(RG.LEVEL_EMPTY, elemX, elemY);

    const subLevels = [];
    // Build the world level in smaller pieces, and then insert the
    // small leves into the large level.
    for (let x = 0; x < sizeX; x++) {
        subLevels[x] = [];
        for (let y = 0; y < sizeY; y++) {
            const subLevel = createSubLevel(ow, x, y, xMap, yMap);
            const x0 = x * xMap;
            const y0 = y * yMap;
            subLevels[x][y] = subLevel;
            RG.Geometry.insertSubLevel(level, subLevel, x0, y0);
        }
    }
    return level;
}

/* Returns a subLevel created based on the tile type. */
function createSubLevel(ow, owX, owY, xMap, yMap) {
    const owMap = ow.getMap();
    const type = owMap[owX][owY];

    const subX = xMap;
    const subY = yMap;
    const subLevel = RG.FACT.createLevel(RG.LEVEL_EMPTY, subX, subY);

    const owSubLevel = new RG.OverWorld.SubLevel(subLevel);
    ow.addSubLevel([owX, owY], owSubLevel);

    addSubLevelWalls(type, owSubLevel, subLevel);

    // TODO Add other features such as cities, dungeons etc to the level.
    addSubLevelFeatures(ow, owX, owY, subLevel);

    return subLevel;
}

/* Adds the "mountain" walls into the overworld subLevel and the RG.Map.Level
 * sublevel. */
function addSubLevelWalls(type, owSubLevel, subLevel) {
    const map = subLevel.getMap();

    const canConnectNorth = N_HAS_CONN.findIndex(item => item === type) >= 0;
    const canConnectSouth = S_HAS_CONN.findIndex(item => item === type) >= 0;
    const canConnectEast = E_HAS_CONN.findIndex(item => item === type) >= 0;
    const canConnectWest = W_HAS_CONN.findIndex(item => item === type) >= 0;

    const subX = map.cols;
    const subY = map.rows;

    const midX = Math.floor(subX / 2);
    const midY = Math.floor(subY / 2);

    const MEAN_WX = 5;
    const MEAN_WY = 5;
    const STDDEV_W = 3;
    let width = null;

    let startY = -1;
    let endY = -1;
    if (canConnectNorth && canConnectSouth) {
        startY = 0;
        endY = subY - 1;
    }
    else if (canConnectNorth) {
        startY = 0;
        endY = midY - 1;
    }
    else if (canConnectSouth) {
        startY = midY;
        endY = subY - 1;
    }

    let widths = getWidthMovingAvg(endY + 1, MEAN_WX, STDDEV_W, subX, 3);
    // Draw line from center to north
    if (canConnectNorth || canConnectSouth) {
        const wall = new Wall('vertical');
        for (let y = startY; y <= endY; y++) {
            // width = getLineWidth(MEAN_W, STDDEV_W, subX);
            width = widths[y - startY];
            const tile = [];
            if (width === 1) {width = MEAN_WX;}
            for (let x = midX - (width - 1); x <= midX + (width - 1); x++) {
                map.setBaseElemXY(x, y, RG.WALL_ELEM);
                tile.push([x, y]);
            }
            wall.addWallCoord(tile);
        }
        owSubLevel.addWall(wall);
    }

    let startX = -1;
    let endX = -1;
    if (canConnectEast && canConnectWest) {
        startX = 0;
        endX = subX - 1;
    }
    else if (canConnectEast) {
        startX = midX;
        endX = subX - 1;
    }
    else if (canConnectWest) {
        startX = 0;
        endX = midX - 1;
    }

    widths = getWidthMovingAvg(endX + 1, MEAN_WY, STDDEV_W, subX, 3);
    if (canConnectEast || canConnectWest) {
        const wall = new Wall('horizontal');
        for (let x = startX; x <= endX; x++) {
            // width = getLineWidth(MEAN_W, STDDEV_W, subY);
            width = widths[x - startX];
            const tile = [];
            if (width === 1) {width = MEAN_WY;}
            for (let y = midY - (width - 1); y <= midY + (width - 1); y++) {
                map.setBaseElemXY(x, y, RG.WALL_ELEM);
                tile.push([x, y]);
            }
            wall.addWallCoord(tile);
        }
        owSubLevel.addWall(wall);
    }

}


function getLineWidth(mean, stddev, subSize) {
    let width = Math.floor(RG.RAND.getNormal(mean, stddev));
    // width = Math.floor(width + coeff * width);

    if (width > subSize / 2) {
        width = subSize / 2 - 1;
    }
    else if (width < 1) {
        width = 1;
    }
    return width;
}

/* Gets the width using moving average algorithm. */
function getWidthMovingAvg(nElem, mean, stddev, subSize, filterW) {
    const unfiltered = [];
    for (let i = 0; i < nElem; i++) {
        unfiltered.push(getLineWidth(mean, stddev, subSize));
    }

    const filtered = [];
    for (let i = 0; i < filterW; i++) {
        filtered.push(unfiltered[i]);
    }

    // Filter array with algorith
    for (let i = filterW; i < (nElem - filterW); i++) {
        const filtVal = getFiltered(unfiltered, i, filterW);
        filtered.push(filtVal);
    }

    for (let i = (nElem - filterW); i < nElem; i++) {
        // Hack for now, find correct solution
        if (filtered.length < unfiltered.length) {
            filtered.push(unfiltered[i]);
        }
    }

    return filtered;
}

function getFiltered(arr, i, filterW) {
    const num = 2 * filterW + 1;
    let sum = 0;
    for (let n = i - filterW; n <= i + filterW; n++) {
        sum += arr[n];
    }
    return Math.floor(sum / num);
}

/* Monster of a function. Has to add all possible features. */
function addSubLevelFeatures(ow, owX, owY, subLevel) {
    const xy = [owX, owY];
    const owSubLevel = ow.getSubLevel(xy);
    const features = ow.getFeaturesByXY(xy);
    const base = ow.getCell(xy);

    if (!features) {return;}

    features.forEach(feat => {
        if ((base === LL_WE || base === LL_NS) && feat === WTOWER) {
            addMountainFort(owSubLevel, subLevel);
        }
        else if (feat === BTOWER) {
            addBlackTower(owSubLevel, subLevel);
        }
    });
}

function addMountainFort(owSubLevel, subLevel) {
    const wall = owSubLevel.getWall();
    const start = wall.getWallStart();
    const end = wall.getWallEnd();
    const randPos = RG.RAND.getUniformInt(start, end);
    const coord = wall.getCoordAt(randPos);

    // Tile is a list of x,y coordinates
    subLevel.getMap().setBaseElems(coord, RG.FORT_ELEM);
    const fort = new RG.OverWorld.SubFeature('fort', coord);
    owSubLevel.addFeature(fort);

}

function addBlackTower(owSubLevel, subLevel) {
    let placed = false;
    const freeCells = subLevel.getMap().getFree();
    const freeXY = freeCells.map(cell => [cell.getX(), cell.getY()]);
    const coord = [];

    if (RG.Geometry.getFreeArea(freeXY, 3, 3, coord)) {
        placed = true;
    }

    if (placed) {
        subLevel.getMap().setBaseElems(coord, RG.FORT_ELEM);
        const tower = new RG.OverWorld.SubFeature('blacktower', coord);
        owSubLevel.addFeature(tower);
    }

}

/* Adds features like water, cities etc into the world. */
function addWorldFeatures(ow) {

    // Add final tower
    addFeatureToAreaByDir(ow, 'NE', 0.5, BTOWER);

    // City of B
    addFeatureToWall(ow, ow._hWalls[1], WTOWER);
    addFeatureToWall(ow, ow._hWalls[0], WTOWER);
    addFeatureToWall(ow, ow._vWalls[0], WTOWER);

    // Create biomes for actor generation

    // Distribute dungeons

    // Distr
}

/* Adds a feature to the map based on the cardinal direction. */
function addFeatureToAreaByDir(ow, loc, shrink, type) {
    const map = ow.getMap();
    const sizeY = map[0].length;
    const sizeX = map.length;

    let xy = getRandLoc(loc, shrink, sizeX, sizeY);
    let watchdog = 1000;
    while (map[xy[0]][xy[1]] !== TERM) {
        xy = getRandLoc(loc, shrink, sizeX, sizeY);
        if (watchdog === 0) {
            RG.warn('OverWorld', 'addFeature',
                'No empty cell to add ' + type + ', ' + loc);
            break;
        }
        --watchdog;
    }

    // Finally add the feature
    ow.addFeature(xy, type);
}

/* Adds given feature on top of given wall to random position. */
function addFeatureToWall(ow, wall, type) {
    const map = ow.getMap();
    let xy = null;

    if (wall.type === 'horizontal') { // y will be fixed
        const llx = wall.x[0];
        const urx = wall.x[wall.x.length - 1];
        xy = findCellRandXYInBox(map, llx, wall.y, urx, wall.y, LL_WE);
    }
    if (wall.type === 'vertical') { // y will be fixed
        const lly = wall.y[0];
        const ury = wall.y[wall.y.length - 1];
        xy = findCellRandXYInBox(map, wall.x, lly, wall.x, ury, LL_NS);
    }

    ow.addFeature(xy, type);
}

/* Checks if given cell type matches any in the array. If there's CELL_ANY,
 * in the list, then returns always true regardless of type. */
function cellMatches(type, listOrStr) {
    let list = listOrStr;
    if (typeof listOrStr === 'string') {
        list = [listOrStr];
    }
    const matchAny = list.indexOf(CELL_ANY);
    if (matchAny >= 0) {return true;}

    const matchFound = list.indexOf(type);
    return matchFound >= 0;
}

/* Finds a random cell of given type from the box of coordinates. */
function findCellRandXYInBox(map, llx, lly, urx, ury, listOrStr) {
    let x = llx === urx ? llx : RG.RAND.getUniformInt(llx, urx);
    let y = lly === ury ? lly : RG.RAND.getUniformInt(ury, lly);
    let watchdog = 100 * (urx - llx + 1) * (lly - ury + 1);

    let match = cellMatches(map[x][y], listOrStr);
    while (!match) {
        x = llx === urx ? llx : RG.RAND.getUniformInt(llx, urx);
        y = lly === ury ? lly : RG.RAND.getUniformInt(ury, lly);
        match = cellMatches(map[x][y], listOrStr);
        if (watchdog === 0) {
            const box = `(${llx},${lly}) -> (${urx},${ury})`;
            RG.warn('OverWorld', 'findCellRandXYInBox',
                `No cells of type ${listOrStr} in ${box}`);
            break;
        }
        --watchdog;
    }
    return [x, y];
}

/* Given location like 'NE' (northeast), and shrink 0 - 1, plus maximum size,
 * returns a random x,y coordinate bounded by these conditions.
 */
function getRandLoc(loc, shrink, sizeX, sizeY) {
    let llx = 0;
    let lly = 0;
    let urx = 0;
    let ury = 0;

    // Determine the bounding coordinates for random location
    if (loc.match(/N/)) {
        ury = 0;
        lly = Math.floor(shrink * 0.25 * sizeY);
    }
    if (loc.match(/S/)) {
        lly = sizeY - 1;
        ury = 0.75 * sizeY;
        ury = Math.floor(ury + (1 - shrink) * (lly - ury));
    }
    if (loc.match(/E/)) {
        urx = sizeX - 1;
        llx = 0.75 * sizeX;
        llx = Math.floor(llx + (1 - shrink) * (urx - llx));
    }
    if (loc.match(/W/)) {
        llx = 0;
        urx = Math.floor(shrink * 0.25 * sizeX);
    }

    return [
        RG.RAND.getUniformInt(llx, urx),
        RG.RAND.getUniformInt(ury, lly)
    ];
}

module.exports = RG.OverWorld;


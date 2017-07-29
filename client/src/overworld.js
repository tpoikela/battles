

/* Code to generate the game overworld.
 *
 */
const ROT = require('../../lib/rot');
const RG = require('./rg');

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

// Used for randomization
const dirValues = [
    TERM, XX, EMPTY, TT_E, TT_W, TT_S, TT_N, CC_NW, CC_NE,
    CC_SW, CC_SE, LL_WE, LL_NS
];

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

const LINE_WE_WEIGHT = {
    [LL_WE]: 10,
    [TT_N]: 3,
    [TT_S]: 3,
    [XX]: 1
};

const LINE_NS_WEIGHT = {
    [LL_NS]: 10,
    [TT_E]: 3,
    [TT_W]: 3,
    [XX]: 1
};

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

/* Data struct for overworld. */
const OverWorld = function() {

    this._map = [];
    this._hWalls = [];
    this._vWalls = [];

    this.setMap = function(map) {
        this._map = map;
    };

    this.addVWall = function(wall) {
        this._vWalls.push(wall);
    };

    this.addHWall = function(wall) {
        this._hWalls.push(wall);
    };

};

/* Main function to construct the world
*  which returns RG.Map.Level. */
RG.getOverWorld = function(conf = {}) {

    const overworld = new OverWorld();

    const worldX = conf.worldX || 400;
    const worldY = conf.worldY || 400;

    const yFirst = typeof conf.yFirst !== 'undefined' ? conf.yFirst : true;

    const topToBottom = typeof conf.topToBottom !== 'undefined'
        ? conf.topToBottom : true;

    const printResult = typeof conf.printResult !== 'undefined'
        ? conf.printResult : true;

    // Size of the high-level feature map
    const X = conf.highX || 40;
    const Y = conf.highY || 20;

    const xMap = Math.floor(worldX / X);
    const yMap = Math.floor(worldY / Y);

    console.log(`xMap ${xMap}, yMap: ${yMap}`);

    // Fully randomized map first
    const map = getRandMap(X, Y);
    // printMap(map);

    randomizeBorder(map);
    // printMap(map);

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
            nHWalls.push(ROT.RNG.getUniform());
        }
    }
    if (Number.isInteger(conf.nVWalls)) {
        nVWalls = [];
        for (let i = 0; i < conf.nVWalls; i++) {
            nVWalls.push(ROT.RNG.getUniform());
        }
    }

    // Add horizontal and vertical "walls"
    for (let i = 0; i < nHWalls.length; i++) {
        let stop = stopOnWall;
        if (stopOnWall === 'random') {
            stop = ROT.RNG.getUniform() >= 0.5;
        }
        addLineHorizontalWestToEast(overworld,
            Math.floor(Y * nHWalls[i]), map, stop);
    }
    for (let i = 0; i < nVWalls.length; i++) {
        let stop = stopOnWall;
        if (stopOnWall === 'random') {
            stop = ROT.RNG.getUniform() >= 0.5;
        }
        addLineVerticalNorthToSouth(overworld,
            Math.floor(X * nVWalls[i]), map, stop);
    }

    // printMap(map);

    if (topToBottom) {
        connectUnconnectedTopBottom(map, yFirst);
    }
    else {
        connectUnconnectedBottomTop(map, yFirst);
    }

    if (printResult) {
        printMap(map);
    }
    overworld.setMap(map);
    // printMap(map2);

    // addWorldFeatures(overworld);

    const worldLevel = getLevelsWithElems(map, worldX, worldY, xMap, yMap);

    return worldLevel;
};

//---------------------------------------------------------------------------
// HELPERS
//---------------------------------------------------------------------------

function getRandMap(xMax, yMax) {
    const map = [];
    for (let x = 0; x < xMax; x++) {
        map[x] = [];
        for (let y = 0; y < yMax; y++) {
            map[x][y] = getRandArr(dirValues);
        }
    }
    return map;
}

function getRandArr(arr) {
    const max = arr.length;
    const index = Math.floor(Math.random() * max);
    return arr[index];
}

/* Randomizes map order with valid border cells. */
function randomizeBorder(map) {
    const yMax = map[0].length;
    const xMax = map.length;

    for (let x = 0; x < xMax; x++) {
        for (let y = 0; y < yMax; y++) {
            map[x][y] = EMPTY;
        }
    }

    // Set corners
    map[0][0] = CC_NW;
    map[0][yMax - 1] = CC_SW;
    map[xMax - 1][yMax - 1] = CC_SE;
    map[xMax - 1][0] = CC_NE;

    // N, y = 0, vary x
    for (let x = 1; x < xMax - 1; x++) {
        map[x][0] = getRandArr(N_BORDER);
    }

    // S, y = max, vary x
    for (let x = 1; x < xMax - 1; x++) {
        map[x][yMax - 1] = getRandArr(S_BORDER);
    }

    // E, x = max, vary y
    for (let y = 1; y < yMax - 1; y++) {
        map[xMax - 1][y] = getRandArr(E_BORDER);
    }

    // W, x = 0, vary y
    for (let y = 1; y < yMax - 1; y++) {
        map[0][y] = getRandArr(W_BORDER);
    }

}

/* Adds a horizontal line travelling from E -> W. */
function addLineHorizontalWestToEast(ow, y, map, stopOnWall = false) {
    const xMax = map.length;
    let finished = false;
    const wall = {y, x: [1]};
    map[0][y] = TT_W;
    if (!stopOnWall) {map[xMax - 1][y] = TT_E;}
    for (let x = 1; x < xMax - 1; x++) {
        if (!finished) {
            if (map[x][y] !== EMPTY) {
                if (!stopOnWall) {
                    map[x][y] = XX; // Push through wall
                }
                else { // Add ╣ and finish
                    finished = true;
                    map[x][y] = TT_E;
                    wall.x.push(x);
                }
            }
            else {
                map[x][y] = ROT.RNG.getWeightedValue(LINE_WE_WEIGHT);
            }
        }
    }
    if (!finished) {wall.x.push(xMax - 1);}
    ow.addHWall(wall);
}

/* Adds a horizontal line travelling from E -> W. */
function addLineVerticalNorthToSouth(ow, x, map, stopOnWall = false) {
    const yMax = map[0].length;
    let finished = false;
    const wall = {x, y: [1]};
    map[x][0] = TT_N;
    if (!stopOnWall) {map[x][yMax - 1] = TT_S;}
    for (let y = 1; y < yMax - 1; y++) {
        if (!finished) {
            if (map[x][y] !== EMPTY) {
                if (!stopOnWall) {
                    map[x][y] = XX; // Push through wall
                }
                else { // Add ╩ and finish
                    finished = true;
                    map[x][y] = TT_S;
                    wall.y.push(y);
                }
            }
            else {
                map[x][y] = ROT.RNG.getWeightedValue(LINE_NS_WEIGHT);
            }
        }
    }
    if (!finished) {wall.y.push(yMax - 1);}
    ow.addVWall(wall);
}

/* Connects all unconnected tiles by starting from 0,0 -> 0,N, then
 * moving to 1,0 -> 1,N, and so on.
 * */
function connectUnconnectedTopBottom(map, yFirst = true) {
    const yMax = map[0].length;
    const xMax = map.length;

    if (yFirst) {
        for (let x = 0; x < xMax; x++) {
            for (let y = 0; y < yMax; y++) {
                processCell(x, y, map);
            }
        }
    }
    else {
        for (let y = 0; y < yMax; y++) {
            for (let x = 0; x < xMax; x++) {
                processCell(x, y, map);
            }
        }
    }
}

/* Connects all unconnected tiles by starting from 0,N -> 0,0, then
 * moving to 1,N -> 1,0, and so on.
 * */
function connectUnconnectedBottomTop(map, yFirst = true) {
    const yMax = map[0].length;
    const xMax = map.length;

    if (yFirst) {
        for (let x = 0; x < xMax; x++) {
            for (let y = yMax - 1; y >= 0; y--) {
                processCell(x, y, map);
            }
        }
    }
    else {
        for (let y = yMax - 1; y >= 0; y--) {
            for (let x = 0; x < xMax; x++) {
                processCell(x, y, map);
            }
        }
    }
}

function processCell(x, y, map) {
    if (map[x][y] === EMPTY) {
        const neighbours = getValidNeighbours(x, y, map);
        const validNeigbours = neighbours.filter(n =>
            n[0] !== EMPTY && n[0] !== TERM
        );
        if (validNeigbours.length === 1) {
            if (validNeigbours[0][1].length > 0) {
                map[x][y] = getRandArr(validNeigbours[0][1]);
            }
            else {
                map[x][y] = TERM;
            }
        }
        else {
            map[x][y] = TERM;
        }
        // printMap(map);
    }
}

/* Returns valid neighbouring tiles for the given x,y. */
function getValidNeighbours(x, y, map) {
    const yMax = map[0].length;
    const xMax = map.length;
    const tiles = [];
    // N
    if (y > 0) {
        const conn = CAN_CONNECT[map[x][y - 1]].N;
        tiles.push([map[x][y - 1], conn]);
    }
    // S
    if (y < yMax - 1) {
        const conn = CAN_CONNECT[map[x][y + 1]].S;
        tiles.push([map[x][y + 1], conn]);
    }
    // E
    if (x < xMax - 1) {
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
    const yMax = map[0].length;
    const xMax = map.length;
    for (let y = 0; y < yMax; y++) {
        const line = [];
        for (let x = 0; x < xMax; x++) {
            line.push(map[x][y]);
        }
        console.log(line.join(''));
    }
}

/* Returns element map with 1 marking the lines, 0 for non-lines. */
function getLevelsWithElems(map, elemX, elemY, xMap, yMap) {
    const yMax = map[0].length;
    const xMax = map.length;
    const level = RG.FACT.createLevel('empty', elemX, elemY);

    // Build the world level in smaller pieces, and then insert the
    // small leves into the large level.
    for (let x = 0; x < xMax; x++) {
        for (let y = 0; y < yMax; y++) {
            const subLevel = getSubLevel(map[x][y], xMap, yMap);
            const x0 = x * xMap;
            const y0 = y * yMap;
            RG.Geometry.insertSubLevel(level, subLevel, x0, y0);
        }
    }
    return level;
}

/* Returns a subLevel created based on the tile type. */
function getSubLevel(type, xMap, yMap) {
    const subX = xMap;
    const subY = yMap;
    const subLevel = RG.FACT.createLevel('empty', subX, subY);
    const map = subLevel.getMap();

    const canConnectNorth = N_HAS_CONN.findIndex(item => item === type) >= 0;
    const canConnectSouth = S_HAS_CONN.findIndex(item => item === type) >= 0;
    const canConnectEast = E_HAS_CONN.findIndex(item => item === type) >= 0;
    const canConnectWest = W_HAS_CONN.findIndex(item => item === type) >= 0;

    const midX = Math.floor(subX / 2);
    const midY = Math.floor(subY / 2);

    const MEAN_W = 5;
    const STDDEV_W = 2;
    let width = null;

    let widths = getWidthMovingAvg(midY, MEAN_W, STDDEV_W, subX, 3);
    // Draw line from center to north
    if (canConnectNorth) {
        for (let y = 0; y < midY; y++) {
            // width = getLineWidth(MEAN_W, STDDEV_W, subX);
            width = widths[y];
            for (let x = midX - (width - 1); x <= midX + (width - 1); x++) {
                map.setBaseElemXY(x, y, RG.WALL_ELEM);
            }
        }
    }
    widths = getWidthMovingAvg(subY - midY, MEAN_W, STDDEV_W, subX, 3);
    // Draw line from center to south
    if (canConnectSouth) {
        for (let y = midY; y < subY; y++) {
            // width = getLineWidth(MEAN_W, STDDEV_W, subX);
            width = widths[y - midY];
            for (let x = midX - (width - 1); x <= midX + (width - 1); x++) {
                map.setBaseElemXY(x, y, RG.WALL_ELEM);
            }
        }
    }
    widths = getWidthMovingAvg(subX - midX, MEAN_W, STDDEV_W, subX, 3);
    // Draw line from center to east
    if (canConnectEast) {
        for (let x = midX; x < subX; x++) {
            // width = getLineWidth(MEAN_W, STDDEV_W, subY);
            width = widths[x - midX];
            for (let y = midY - (width - 1); y <= midY + (width - 1); y++) {
                map.setBaseElemXY(x, y, RG.WALL_ELEM);
            }
        }
    }
    widths = getWidthMovingAvg(midY, MEAN_W, STDDEV_W, subX, 3);
    // Draw line from center to west
    if (canConnectWest) {
        for (let x = 0; x < midX; x++) {
            // width = getLineWidth(MEAN_W, STDDEV_W, subY);
            width = widths[x];
            for (let y = midY - (width - 1); y <= midY + (width - 1); y++) {
                map.setBaseElemXY(x, y, RG.WALL_ELEM);
            }
        }
    }
    return subLevel;
}

function getLineWidth(mean, stddev, subSize) {
    let width = Math.floor(ROT.RNG.getNormal(mean, stddev));
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

/* Adds features like water, cities etc into the world. */
/* function addWorldFeatures(ow) {

}*/

module.exports = RG.getOverWorld;

// Can be used for quick testing
if (process.env.RUN) {
    const conf = {
        yFirst: false,
        topToBottom: false,
        // stopOnWall: 'random',
        stopOnWall: true,
        // nHWalls: 2,
        nVWalls: [0.8],
        highX: 80,
        highY: 40,
        worldX: 800,
        worldY: 800
    };
    RG.getOverWorld(conf);
}



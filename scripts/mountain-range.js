
/* Test code to generate valley surrounded by mountains.
* Uses unicode "double lines" for easier visualisation.
*
*/

const ROT = require('../lib/rot');

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
const TERM = '*';


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

// If we have an empty cell (e), and neighbouring cell is of type 'first key',
// if the cells is located in the dir 'second key' of the empty cell,
// listed cells can be connected.
//
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

    [XX]: {
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
    [TT_S]: {
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

// Fully randomized
const map = getRandMap(40, 20);
// printMap(map);

randomizeBorder(map);
printMap(map);

addLineHorizontalWestToEast(7, map);
printMap(map);

const map2 = JSON.parse(JSON.stringify(map));

connectUnconnectedTopBottom(map);

console.log('BOTTOM2TOP');
connectUnconnectedBottomTop(map2);


printMap(map);
printMap(map2);

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

/* Adds a horizontal line. */
function addLineHorizontalWestToEast(y, map) {
    const xMax = map.length;
    map[0][y] = TT_W;
    map[xMax - 1][y] = TT_E;
    for (let x = 1; x < xMax - 1; x++) {
        map[x][y] = ROT.RNG.getWeightedValue(LINE_WE_WEIGHT);
        // map[x][y] = getRandArr(LINE_WE);
    }
}

/* Assumes that map has tiles with connections. Goes through empty tiles only.
 * */
function connectUnconnectedTopBottom(map) {
    const yMax = map[0].length;
    const xMax = map.length;

    for (let x = 0; x < xMax; x++) {
        for (let y = 0; y < yMax; y++) {
            processCell(x, y, map);
        }
    }

}

function connectUnconnectedBottomTop(map) {
    const yMax = map[0].length;
    const xMax = map.length;

    for (let x = 0; x < xMax; x++) {
        for (let y = yMax - 1; y >= 0; y--) {
            processCell(x, y, map);
        }
    }

}

function processCell(x, y, map) {
    if (map[x][y] === EMPTY) {
        const neighbours = getNeighbours(x, y, map);
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
        printMap(map);
    }
}

/* Returns neighbouring tiles for the given x,y. */
function getNeighbours(x, y, map) {
    const yMax = map[0].length;
    const xMax = map.length;
    const tiles = [];
    // N
    if (y > 0) {
        console.log(`map tile ${x},${y - 1}: ${map[x][y - 1]}`);
        console.log('getN N: ' + JSON.stringify(CAN_CONNECT[map[x][y - 1]]));
        const conn = CAN_CONNECT[map[x][y - 1]].N;
        tiles.push([map[x][y - 1], conn]);
    }
    // S
    if (y < yMax - 1) {
        const conn = CAN_CONNECT[map[x][y + 1]].S;
        tiles.push([map[x][y + 1], conn]);
    }
    // W
    if (x > 0) {
        const conn = CAN_CONNECT[map[x - 1][y]].W;
        tiles.push([map[x - 1][y], conn]);
    }
    // E
    if (x < xMax - 1) {
        const conn = CAN_CONNECT[map[x + 1][y]].E;
        tiles.push([map[x + 1][y], conn]);
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

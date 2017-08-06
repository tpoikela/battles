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
RG.Names = require('../data/name-gen');

const getRandIn = RG.RAND.arrayGetRand.bind(RG.RAND);

const $DEBUG = true;

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

const biomeTypeMap = {
    arctic: 0,
    alpine: 1,
    tundra: 2,
    taiga: 3,
    forest: 4,
    grassland: 5
};

// Used for randomization
/*
const dirValues = [
    TERM, XX, EMPTY, TT_E, TT_W, TT_S, TT_N, CC_NW, CC_NE,
    CC_SW, CC_SE, LL_WE, LL_NS
];
*/

const ILLEGAL_POS = -1;
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

    /* Returns the y-pos for horizontal and x-pos for vertical walls. */
    this.getWallPos = function() {
        if (type === 'vertical') {
            return this.coord[0][0][0];
        }
        if (type === 'horizontal') {
            return this.coord[0][0][1];
        }
        return ILLEGAL_POS;
    };

    this.getWallStart = function() {
        if (type === 'vertical') {
            return this.coord[0][0][1];
        }
        if (type === 'horizontal') {
            return this.coord[0][0][0];
        }
        return ILLEGAL_POS;
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
 * around Map.Level, to keep feature creep out of the Map.Level. */
RG.OverWorld.SubLevel = function(level) {
    this._level = level;
    this._hWalls = [];
    this._vWalls = [];
    this._subX = level.getMap().rows;
    this._subY = level.getMap().cols;

    // Store any number of different type of features by type
    this._features = {};
    this.getFeatures = () => this._features;

    this.getSubX = () => this._subX;
    this.getSubY = () => this._subY;

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
RG.OverWorld.Map = function(tilesX, tilesY) {
    this._baseMap = [];
    this._subLevels = [];

    this._tilesX = tilesX;
    this._tilesY = tilesY;

    this._hWalls = [];
    this._vWalls = [];

    this._features = {};
    this._featuresByXY = {};

    this.biomeMap = {};

    this.getBiome = function(x, y) {
        const key = x + ',' + y;
        if (this.biomeMap.hasOwnProperty(key)) {
            return this.biomeMap[x + ',' + y];
        }
        else {
            RG.err('OverWorld.Map', 'getBiome',
                `No biome set for x,y ${x},${y}`);
        }
        return '';
    };

    this.getMap = () => this._baseMap;
    this.getCell = (xy) => this._baseMap[xy[0]][xy[1]];

    this.getHWalls = () => this._hWalls;
    this.getVWalls = () => this._vWalls;

    this.setMap = function(map) {
        const sizeX = map.length;
        this._baseMap = map;
        for (let x = 0; x < sizeX; x++) {
            this._subLevels[x] = [];
        }
    };

    this.addBiome = function(x, y, biomeType) {
        const key = x + ',' + y;
        this.biomeMap[key] = biomeType;
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

    this.getSizeX = function() {
        return this._baseMap.length;
    };

    this.getSizeY = function() {
        if (this._baseMap[0].length > 0) {
            return this._baseMap[0].length;
        }
        else {
            RG.warn('OverWorld.Map', 'getSizeY',
                'Y-size requested but returning zero value');
            return 0;
        }
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

    this.printBiomeMap = function() {
        const sizeX = this.getSizeX() - 1;
        const sizeY = this.getSizeY() - 1;

        // Build a legend ie: 0 - arctic, 1 - alpine, 2 - forest etc
        const keys = Object.keys(biomeTypeMap);
        const name2Num = {};
        const legend = keys.map((key, index) => {
            name2Num[key] = '' + index;
            return `${index} - ${key}`;
        });

        let result = '';
        for (let y = 0; y < sizeY; y++) {
            let rowStr = '';
            for (let x = 0; x < sizeX; x++) {
                const key = x + ',' + y;
                rowStr += ',' + name2Num[this.biomeMap[key]];
            }
            rowStr += '\n';
            result += rowStr;
        }
        result += '\n' + legend.join('\n');
        console.log(result);
    };


};

/* Factory function to construct the overworld. Generally you want to call this
 * method.
 * @return RG.Map.Level.
 */
RG.OverWorld.createOverWorld = function(conf = {}) {

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
    const overworld = new RG.OverWorld.Map(owTilesX, owTilesY);

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

    // This will most likely fail, unless values have been set explicitly
    const areaX = conf.areaX || worldX / 100;
    const areaY = conf.areaY || worldY / 100;

    const worldLevel = createOverWorldLevel(
        overworld, worldX, worldY, xMap, yMap, areaX, areaY);

    if (printResult) {overworld.printBiomeMap();}
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

/* Adds the large-scale walls into the overworld map. */
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
        addHorizontalWallWestToEast(ow,
            Math.floor(sizeY * nHWalls[i]), map, stop);
    }
    for (let i = 0; i < nVWalls.length; i++) {
        let stop = stopOnWall;
        if (stopOnWall === 'random') {
            stop = RG.RAND.getUniform() >= 0.5;
        }
        addVerticalWallNorthToSouth(ow,
            Math.floor(sizeX * nVWalls[i]), map, stop);
    }

}

/* Adds a horizontal wall travelling from E -> W. */
function addHorizontalWallWestToEast(ow, y, map, stopOnWall = false) {
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

/* Adds a horizontal wall travelling from E -> W. */
function addVerticalWallNorthToSouth(ow, x, map, stopOnWall = false) {
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
function createOverWorldLevel(ow, worldX, worldY, xMap, yMap, areaX, areaY) {
    const map = ow.getMap();
    const sizeY = map[0].length;
    const sizeX = map.length;
    const level = RG.FACT.createLevel(RG.LEVEL_EMPTY, worldX, worldY);

    const subLevels = [];
    // Build the world level in smaller pieces, and then insert the
    // small levels into the large level.
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

    console.log(`AreaTile size: x: ${worldX / areaX}, y: ${worldY / areaY}`);

    const conf = RG.OverWorld.createWorldConf(ow, subLevels, areaX, areaY);

    return [level, conf];
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

function getWallWidth(mean, stddev, subSize) {
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
        unfiltered.push(getWallWidth(mean, stddev, subSize));
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

/* Adds features like water, cities etc into the world. This feature only
    * designates the x,y coordinate on overworld map, but does not give details
    * for the Map.Level sublevels. */
function addWorldFeatures(ow) {

    // Add final tower
    addFeatureToAreaByDir(ow, 'NE', 0.5, BTOWER);

    // City of B, + other wall fortresses
    addFeatureToWall(ow, ow._hWalls[1], WTOWER);
    addFeatureToWall(ow, ow._hWalls[0], WTOWER);
    addFeatureToWall(ow, ow._vWalls[0], WTOWER);

    // TODO list for features:

    // Add the main roads for most important places

    // Create biomes for actor generation of overworld
    addBiomeToOverWorld(ow, {y: {start: 'N', end: 'wall'}, type: 'alpine'});
    addBiomeToOverWorld(ow, {x: {start: ['wall', 0], end: 'E'},
        type: 'arctic'});
    addBiomeToOverWorld(ow, {y: {start: ['wall', 0], end: ['wall', 1]},
        type: 'tundra'});
    addBiomeToOverWorld(ow, {y: {start: ['wall', 1], end: 'S'}, type: 'taiga'});

    // Create forests and lakes

    // Distribute dungeons

    // Distribute mountains

    // Distribute cities

    // Adds roads for created features
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

/* Adds a biome zone to the overworld map. These zones can be used to generate
 * terrain props + different actors based on the zone type. */
function addBiomeToOverWorld(ow, cmd) {
    const biomeType = cmd.type;

    let xStart = 0;
    let xEnd = ow.getSizeX() - 1;
    let yStart = 0;
    let yEnd = ow.getSizeY() - 1;

    if (cmd.x) {
        console.log('cmd.x specified.');
        const start = cmd.x.start;
        const end = cmd.x.end;

        // Find start position for X
        if (start === 'W') {xStart = 0;}
        else if (start === 'wall') {
            const walls = ow.getVWalls();
            if (walls.length > 0) {
                xStart = walls[0].x;
            }
        }
        else if (Array.isArray(start)) {
            if (start[0] === 'wall') {
                const walls = ow.getVWalls();
                if (walls.length > start[1]) {
                    console.log('xxx: ' + JSON.stringify(walls[start[1]]));
                    xStart = walls[start[1]].x;
                }
            }
        }

        // Find end position for X
        if (end === 'E') {xEnd = ow.getSizeX() - 1;}
        else if (end === 'wall') {
            const walls = ow.getVWalls();
            if (walls.length > 0) {
                xEnd = walls[0].x;
            }
        }
        else if (Array.isArray(end)) {
            if (end[0] === 'wall') {
                const walls = ow.getVWalls();
                if (walls.length > end[1]) {
                    xEnd = walls[end[1]].x;
                }
            }
        }
    }

    if (cmd.y) {
        console.log('cmd.y specified.');
        const start = cmd.y.start;
        const end = cmd.y.end;

        // Find start position for Y
        if (start === 'N') {yStart = 0;}
        else if (start === 'wall') {
            // Find first horizontal wall
            const walls = ow.getHWalls();
            if (walls.length > 0) {
                yStart = walls[0].y;
            }
        }
        else if (Array.isArray(start)) {
            if (start[0] === 'wall') {
                const walls = ow.getHWalls();
                if (walls.length > start[1]) {
                    yStart = walls[start[1]].y;
                }
            }
        }

        // Find end position for Y
        if (end === 'S') {yEnd = ow.getSizeY() - 1;}
        else if (end === 'wall') {
            const walls = ow.getHWalls();
            if (walls.length > 0) {
                yEnd = walls[0].y;
            }
        }
        else if (Array.isArray(end)) {
            if (end[0] === 'wall') {
                const walls = ow.getHWalls();
                if (walls.length > end[1]) {
                    yEnd = walls[end[1]].y;
                }
            }
        }

    } // cmd.y

    if (cmd.x) {console.log(`x: ${xStart} -> ${xEnd}`);}
    if (cmd.y) {console.log(`y: ${yStart} -> ${yEnd}`);}

    // Apply given type on the found range
    for (let x = xStart; x <= xEnd; x++) {
        for (let y = yStart; y <= yEnd; y++) {
            // console.log(`Adding biome [${x}][${y}]: ${biomeType}`);
            ow.addBiome(x, y, biomeType);
        }
    }
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

/* Creates a world configuration which can be given to Factory.World.
 * Maps an MxN array of sub-levels into |areaX| X |areaY| array of tile levels.
 * Both levels are RG.Map.Levels.
 */
RG.OverWorld.createWorldConf = function(ow, subLevels, areaX, areaY) {
    const worldConf = {
        name: 'The North',
        nAreas: 1,
        area: [{name: 'The Northern Realm', maxX: areaX, maxY: areaY,
            biome: {},
            dungeon: [],
            mountain: [],
            city: [],
            nDungeons: 0,
            nMountains: 0,
            nCities: 0
        }]
    };
    const areaConf = worldConf.area[0];

    const subLevelsX = subLevels.length;
    const subLevelsY = subLevels[0].length;
    if (!subLevelsX || !subLevelsY) {
        const msg = `levels in X: ${subLevelsX}, Y: ${subLevelsY}`;
        RG.err('OverWorld', 'createWorldConf',
            `Illegal num of sublevels: ${msg}`);
    }

    const xMap = subLevelsX / areaX; // SubLevels per tile level in x-dir
    const yMap = subLevelsY / areaY; // SubLevels per tile level in y-dir

    if ($DEBUG) {
        console.log(`subLevelsX: ${subLevelsX}, areaX: ${areaX}`);
        console.log(`subLevelsY: ${subLevelsY}, areaY: ${areaY}`);
        console.log(`MapX: ${xMap} levels to one tile`);
        console.log(`MapY: ${yMap} levels to one tile`);
    }

    // if xMap/yMap not integers, mapping will be wrong, thus we cannot round
    // the map values, just throw error
    if (!Number.isInteger(xMap)) {
        RG.err('OverWorld', 'createWorldConf',
            `xMap not int: ${xMap}, sub X :${subLevelsX}, areaX: ${areaX}`);
    }
    if (!Number.isInteger(yMap)) {
        RG.err('OverWorld', 'createWorldConf',
            `yMap not int: ${yMap}, sub Y :${subLevelsY}, areaY: ${areaY}`);
    }

    // Map values are OK, this loops through smaller overworld sublevels, which
    // are aligned with the mountain wall creation
    for (let x = 0; x < subLevelsX; x++) {
        for (let y = 0; y < subLevelsY; y++) {

            // Find sub-level (Map.Level) indices + area level indices
            const slX = x % xMap;
            const slY = y % yMap;
            const aX = Math.floor(x / xMap);
            const aY = Math.floor(y / yMap);

            const subLevel = ow.getSubLevel([x, y]);
            const subX = subLevel.getSubX();
            const subY = subLevel.getSubY();

            // console.log(`subX: ${subX} subY: ${subY}`);

            const features = subLevel.getFeatures();
            Object.keys(features).forEach(type => {
                const featureArray = features[type];
                featureArray.forEach(feat => {
                    if (feat.type === 'fort') {
                        const coord = feat.coord;
                        const nLevels = coord.length;
                        const lastCoord = nLevels - 1;

                        const connX = mapX(coord[0][0], slX, subX);
                        const connY = mapY(coord[0][1], slY, subY) - 1;

                        const featX = mapX(coord[lastCoord][0], slX, subX);
                        const featY = mapY(coord[lastCoord][1], slY, subY) + 1;

                        console.log(`featX: ${featX} featY: ${featY}`);
                        console.log(`slX: ${slX} slY: ${slY}`);

                        const qName = RG.Names.getRandPlaceName('quarter');
                        console.log(`Place name will be ${qName}`);
                        const cityConf = {
                            name: feat.name,
                            nQuarters: 1,
                            connectToXY: [
                                {name: qName, levelX: connX,
                                levelY: connY, nLevel: nLevels - 1}],
                            quarter: [
                                {name: qName,
                                    nLevels, entranceLevel: 0
                                }
                            ],
                            x: aX, // areaTileX
                            y: aY, // areaTileY
                            levelX: featX,
                            levelY: featY
                        };
                        areaConf.nCities += 1;
                        areaConf.city.push(cityConf);
                    }
                    /* if (feat.type === 'blacktower') {

                    }*/
                });
            });
        }
    }

    addBiomeLocations(ow, areaConf);

    console.log('createWorldConf returning configuration..');
    return worldConf;
};

/* Maps an x coord in a sub-level (Map.Level) into an x-y coordinate in
 * an AreaTile.
 * slX = sub-level x index in area tile. For example:
 * Assuming we have a matrix 3x3 of 10x10 sub-levels. Our area tile is now
 * 30x30. slX points then to x-pos of 3x3 matrix.
 */
function mapX(x, slX, subSizeX) {
    const res = x + slX * subSizeX;
    if (res >= 100 ) {
        console.log(`WARNING mapX: ${res}, ${x}, ${slX}, ${subSizeX}`);
    }
    return res;
}

/* Maps an y coord in a sub-level (Map.Level) into an x-y coordinate in
 * an AreaTile.
 * slY = sub-level y index in area tile. For longer expl, see mapY() above.
 */
function mapY(y, slY, subSizeY) {
    return y + slY * subSizeY;
}

/* Map biomes from overworld into areaX * areaY space. */
function addBiomeLocations(ow, areaConf) {
    const owSizeX = ow.getSizeX();
    const owSizeY = ow.getSizeY();
    const xMap = owSizeX / areaConf.maxX;
    const yMap = owSizeY / areaConf.maxY;

    for (let x = 0; x < areaConf.maxX; x++) {
        for (let y = 0; y < areaConf.maxY; y++) {
            const bbox = getSubBoxForAreaTile(x, y, xMap, yMap);
            const key = x + ',' + y;
            const biomeType = ow.getBiome(bbox[0], bbox[3]);
            areaConf.biome[key] = biomeType;
            // How to map multiple cells into one?
            // 1. Option: Determine "majority" biome for that area
        }
    }
}

/* Returns the bounding box of sublevel coordinates for given tile. For example,
 * tile 0,0 with xMap=3,yMap=5, returns [0, 4, 2, 0]. */
function getSubBoxForAreaTile(x, y, xMap, yMap) {
    const lx = x * xMap;
    const rx = lx + xMap - 1;
    const ry = y * yMap;
    const ly = ry + yMap - 1;
    return [lx, ly, rx, ry];
}

module.exports = RG.OverWorld;



/* This file contains the first layer of overworld generation. It generates tile
 * map where each tile represents an area of Map.Cells, for example 10x10.
 * This tile map has one feature (town/mountain/dungeon) per tile, to keep the
 * overworld map useful for navigation and seeing details.
 */

const RG = require('./rg');
RG.Random = require('./random');
RG.Map = require('./map');

const debug = require('debug')('bitn:OW');

const OW = {};

const getRNG = RG.Random.getRNG;

//---------------------------
// CONSTANT DEFINITIONS
//---------------------------

// Straight lines
OW.LL_WE = '\u2550'; // ═
OW.LL_NS = '\u2551'; // ║

// Corners
OW.CC_NW = '\u2554'; // ╔
OW.CC_NE = '\u2557'; // ╗
OW.CC_SW = '\u255A'; // ╚
OW.CC_SE = '\u255D'; // ╝

// Double cross
OW.XX = '\u256C'; // ╬
OW.EMPTY = 'e';

// NSEW

OW.TT_W = '\u2560'; // ╠
OW.TT_E = '\u2563'; // ╣
OW.TT_N = '\u2566'; // ╦
OW.TT_S = '\u2569'; // ╩
OW.TERM = '.';

// Features like cities etc.
OW.WCAPITAL = '\u2654';
OW.BCAPITAL = '\u265A';
OW.BTOWER = '\u265C';
OW.WTOWER = '\u2656';
OW.WDUNGEON = '\u2616';
OW.MOUNTAIN = '^'; // TODO find better char
// OW.VILLAGE = '\u27F0';
OW.BVILLAGE = '\u25B2';
OW.WVILLAGE = '\u25B3';
// const CITY = '\u1CC1';
OW.VTUNNEL = '|'; // Tunnel between two walls
OW.HTUNNEL = '-'; // Tunnel between two walls

OW.PROB_BVILLAGE = 0.25;

OW.biomeTypeMap = {
    arctic: 0,
    alpine: 1,
    tundra: 2,
    taiga: 3,
    forest: 4,
    grassland: 5
};

const elemStyles = RG.cellStyles.elements;
// These styles will be used to render the OW map
OW.classNames = {
  [OW.TERM]: elemStyles.floor,
  [OW.MOUNTAIN]: elemStyles.highrock,

  [OW.LL_WE]: elemStyles.mountain,
  [OW.LL_NS]: elemStyles.mountain,
  [OW.CC_NW]: elemStyles.mountain,
  [OW.CC_NE]: elemStyles.mountain,
  [OW.CC_SW]: elemStyles.mountain,
  [OW.CC_SE]: elemStyles.mountain,
  [OW.XX]: elemStyles.mountain,
  [OW.TT_W ]: elemStyles.mountain,
  [OW.TT_E ]: elemStyles.mountain,
  [OW.TT_N ]: elemStyles.mountain,
  [OW.TT_S ]: elemStyles.mountain,
  default: 'cell-element-ow'

};

OW.BIOME = {};
OW.BIOME.ALPINE = 'alpine';
OW.BIOME.ARCTIC = 'arctic';
OW.BIOME.TUNDRA = 'tundra';
OW.BIOME.TAIGA = 'taiga';

OW.ILLEGAL_POS = -1;
OW.CELL_ANY = 'OW.CELL_ANY'; // Used in matching functions only

// Can connect to east side
OW.E_HAS_CONN = [
    OW.XX, OW.TT_W, OW.TT_N, OW.TT_S, OW.CC_NW, OW.CC_SW, OW.LL_WE];

// Can connect to west side
OW.W_HAS_CONN = [
    OW.XX, OW.TT_E, OW.TT_N, OW.TT_S, OW.CC_NE, OW.CC_SE, OW.LL_WE];

// Can connect to north
OW.N_HAS_CONN = [
    OW.XX, OW.TT_S, OW.TT_W, OW.TT_E, OW.CC_SW, OW.CC_SE, OW.LL_NS];

// Can connect to south
OW.S_HAS_CONN = [
    OW.XX, OW.TT_N, OW.TT_W, OW.TT_E, OW.CC_NW, OW.CC_NE, OW.LL_NS];

OW.N_BORDER = [OW.LL_WE, OW.TT_N];
OW.S_BORDER = [OW.LL_WE, OW.TT_S];
OW.E_BORDER = [OW.LL_NS, OW.TT_E];
OW.W_BORDER = [OW.LL_NS, OW.TT_W];

OW.ALL_WALLS = [
    OW.XX, OW.TT_N, OW.TT_S, OW.TT_E, OW.TT_W,
    OW.CC_SW, OW.CC_NW, OW.CC_SE, OW.CC_NE,
    OW.LL_WE, OW.LL_NS
];

OW.ALL_WALLS_LUT = {};
OW.ALL_WALLS.forEach(tile => {OW.ALL_WALLS_LUT[tile] = tile;});

// const LINE_WE = [OW.LL_WE, OW.TT_N, OW.TT_S, OW.XX];
// const LINE_NS = [OW.LL_NS, OW.TT_E, OW.TT_W, OW.XX];

// Used for weighted randomisation of creating west-east walls,
// favors non-branching walls
OW.LINE_WE_WEIGHT = {
    [OW.LL_WE]: 10,
    [OW.TT_N]: 3,
    [OW.TT_S]: 3,
    [OW.XX]: 1
};

// Used for weighted randomisation of create north-south walls,
// favors non-branching walls
OW.LINE_NS_WEIGHT = {
    [OW.LL_NS]: 10,
    [OW.TT_E]: 3,
    [OW.TT_W]: 3,
    [OW.XX]: 1
};

// Connection mappings for different 'mountain' tiles
// If we have an empty cell (e), and neighbouring cell is of type 'first key',
// and this cell is located in the dir 'second key' of the empty cell,
// listed cells can be used as empty cell.
OW.CAN_CONNECT = {
    [OW.LL_WE]: {
        N: [], // ═
               // e

        S: [], // e
               // ═

        E: OW.E_HAS_CONN, // e═
        W: OW.W_HAS_CONN // ═e
    },
    [OW.LL_NS]: {
        N: OW.N_HAS_CONN, // ║
                       // e

        S: OW.S_HAS_CONN, // e
                       // ║
        E: [], // e║
        W: [] // ║e
    },

    // Corners
    [OW.CC_NW]: { // ╔
        N: OW.N_HAS_CONN, // ╔
                       // e
        S: [],
        E: [],
        W: OW.W_HAS_CONN // ╔e
    },
    [OW.CC_NE]: {
        N: OW.N_HAS_CONN,
        S: [],
        E: OW.E_HAS_CONN,
        W: []
    },
    [OW.CC_SW]: { // ╚
        N: [],
        S: OW.S_HAS_CONN,
        E: [], // e╚
        W: OW.W_HAS_CONN
    },
    [OW.CC_SE]: { // ╝
        N: [],
        S: OW.S_HAS_CONN,
        E: OW.E_HAS_CONN, // e╝
        W: [] // ╝e
    },

    [OW.XX]: { // ╬ connects to all dirs
        N: OW.N_HAS_CONN,
        S: OW.S_HAS_CONN,
        E: OW.E_HAS_CONN,
        W: OW.W_HAS_CONN
    },
    [OW.EMPTY]: {
        N: [],
        S: [],
        E: [],
        W: []
    },

    [OW.TT_W]: { // ╠
        N: OW.N_HAS_CONN,
        S: OW.S_HAS_CONN,
        E: [], // e╠
        W: OW.W_HAS_CONN // ╠e
    },
    [OW.TT_E]: { // ╣
        N: OW.N_HAS_CONN,
        S: OW.S_HAS_CONN,
        E: OW.E_HAS_CONN,
        W: []
    },
    [OW.TT_N]: { // ╦
        N: OW.N_HAS_CONN,
        S: [],
        E: OW.E_HAS_CONN,
        W: OW.W_HAS_CONN
    },
    [OW.TT_S]: { // ╩
        N: [],
        S: OW.S_HAS_CONN,
        E: OW.E_HAS_CONN,
        W: OW.W_HAS_CONN
    },
    [OW.TERM]: {
        N: [],
        S: [],
        E: [],
        W: []
    }
};

/* Creates the overworld map and returns the created map. */
OW.createOverWorld = (conf = {}) => {
    const yFirst = typeof conf.yFirst !== 'undefined' ? conf.yFirst : true;

    const topToBottom = typeof conf.topToBottom !== 'undefined'
        ? conf.topToBottom : true;

    const printResult = typeof conf.printResult !== 'undefined'
        ? conf.printResult : false;

    // Size of the high-level feature map
    const owTilesX = conf.owTilesX || 40;
    const owTilesY = conf.owTilesY || 20;
    const overworld = new OW.Map();

    const owMap = createEmptyMap(owTilesX, owTilesY);
    randomizeBorders(owMap);
    addWallsIfAny(overworld, owMap, conf);

    addRandomInnerWalls(overworld, owMap, conf);

    if (topToBottom) {
        connectUnconnectedTopBottom(owMap, yFirst);
    }
    else {
        connectUnconnectedBottomTop(owMap, yFirst);
    }

    if (conf.printResult) {
        const mapStr = mapToString(owMap);
        RG.log('overworld.map.js\n', mapStr);
    }
    overworld.setMap(owMap);
    addOverWorldFeatures(overworld, conf);

    // High-level overworld generation ends here

    if (printResult) {
        RG.log('\n', overworld.mapToString().join('\n')); // Print result
    }
    return overworld;
};

//---------------------------------------------
/* OW.Map: Data struct for overworld. */
//---------------------------------------------

OW.Map = function() {
    this._baseMap = [];
    this._explored = {};
    this._subLevels = [];

    this._hWalls = [];
    this._vWalls = [];

    this._features = {};
    this._featuresByXY = {};

    this._biomeMap = {};

};

OW.Map.prototype.getSizeXY = function() {
    return [this.getSizeX(), this.getSizeY()];
};

OW.Map.prototype.isWallTile = function(x, y) {
    const tile = this._baseMap[x][y];
    return OW.ALL_WALLS_LUT.hasOwnProperty(tile);
};

OW.Map.prototype.numTiles = function(tile) {
    let numFound = 0;
    const [sizeX, sizeY] = this.getSizeXY();
    for (let x = 0; x < sizeX; x++) {
        for (let y = 0; y < sizeY; y++) {
            if (this._baseMap[x][y] === tile) {
                ++numFound;
            }
        }
    }
    return numFound;
};

OW.Map.prototype.numWallTiles = function() {
    let numWalls = 0;
    const [sizeX, sizeY] = this.getSizeXY();
    for (let x = 0; x < sizeX; x++) {
        for (let y = 0; y < sizeY; y++) {
            if (this.isWallTile(x, y)) {
                ++numWalls;
            }
        }
    }
    return numWalls;
};

OW.Map.prototype.getBiome = function(x, y) {
    const key = x + ',' + y;
    if (this._biomeMap.hasOwnProperty(key)) {
        return this._biomeMap[x + ',' + y];
    }
    else {
        RG.err('OW.Map', 'getBiome',
            `No biome set for x,y ${x},${y}`);
    }
    return '';
};

OW.Map.prototype.getMap = function() {
    return this._baseMap;
};

OW.Map.prototype.getCell = function(xy) {
    return this._baseMap[xy[0]][xy[1]];
};

OW.Map.prototype.numHWalls = function() {
    return this._hWalls.length;
};
OW.Map.prototype.numVWalls = function() {
    return this._vWalls.length;
};
OW.Map.prototype.getHWalls = function() {
    return this._hWalls;
};
OW.Map.prototype.getVWalls = function() {
    return this._vWalls;
};

OW.Map.prototype.setMap = function(map) {
    const sizeX = map.length;
    this._baseMap = map;
    for (let x = 0; x < sizeX; x++) {
        this._subLevels[x] = [];
    }
};

OW.Map.prototype.addBiome = function(x, y, biomeType) {
    const key = x + ',' + y;
    this._biomeMap[key] = biomeType;
};

OW.Map.prototype.addVWall = function(wall) {
    wall.type = 'vertical';
    this._vWalls.push(wall);
};

OW.Map.prototype.addHWall = function(wall) {
    wall.type = 'horizontal';
    this._hWalls.push(wall);
};

OW.Map.prototype.addFeature = function(xy, type) {
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

OW.Map.prototype.getFeaturesByType = function(type) {
    if (!this._features.hasOwnProperty(type)) {
        return [];
    }
    return this._features[type];
};

OW.Map.prototype.getFeaturesByXY = function(xy) {
    const keyXY = xy[0] + ',' + xy[1];
    return this._featuresByXY[keyXY];
};

OW.Map.prototype.addSubLevel = function(xy, level) {
    this._subLevels[xy[0]][xy[1]] = level;
};

OW.Map.prototype.getSubLevel = function(xy) {
    return this._subLevels[xy[0]][xy[1]];
};

OW.Map.prototype.clearSubLevels = function() {
    this._subLevels = [];
};

OW.Map.prototype.getSubLevelsWithFeature = function(type) {
    const featXY = this.getFeaturesByType(type);
    return featXY.map(xy => this.getSubLevel(xy));
};

OW.Map.prototype.getAreaXY = function() {
    return this.getSizeX() * this.getSizeY();
};

OW.Map.prototype.getSizeX = function() {
    return this._baseMap.length;
};

OW.Map.prototype.getSizeY = function() {
    if (this._baseMap[0].length > 0) {
        return this._baseMap[0].length;
    }
    else {
        RG.warn('OW.Map', 'getSizeY',
            'Y-size requested but returning zero value');
        return 0;
    }
};

OW.Map.prototype.setExplored = function(xy) {
    this._explored[xy[0] + ',' + xy[1]] = true;
};

OW.Map.prototype.isExplored = function(xy) {
    return this._explored[xy[0] + ',' + xy[1]];
};

OW.Map.prototype.toJSON = function() {
    const json = {
        baseMap: this._baseMap,
        biomeMap: this._biomeMap,
        features: this._features,
        featuresByXY: this._featuresByXY,
        vWalls: this._vWalls,
        hWalls: this._hWalls,
        explored: this._explored
    };
    if (this.coordMap) {
        json.coordMap = this.coordMap.toJSON();
    }
    return json;
};

OW.Map.prototype.getOWMap = function(useExplored = false) {
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

    if (useExplored) {
      for (let x = 0; x < sizeX; x++) {
        for (let y = 0; y < sizeY; y++) {
          if (!this._explored[x + ',' + y]) {
            map[x][y] = '?';
          }
        }
      }
    }
    return map;
};

/* Returns the OW Map represented as Map.CellList. Marker elements are used to
 * show the visible cells. */
OW.Map.prototype.getCellList = function() {
    const map = this.getOWMap();
    const sizeY = map[0].length;
    const sizeX = map.length;

    const cellList = new RG.Map.CellList(sizeX, sizeY);
    for (let x = 0; x < sizeX; x++) {
        for (let y = 0; y < sizeY; y++) {
            const marker = new RG.Element.Marker(map[x][y]);
            if (OW.classNames[map[x][y]]) {
                marker.setClassName(OW.classNames[map[x][y]]);
            }
            else {
                marker.setClassName(OW.classNames.default);
            }
            cellList.setProp(x, y, RG.TYPE_ELEM, marker);
        }
    }

    return cellList;
};

/* Converts the OW.Map into string. */
OW.Map.prototype.mapToString = function(useExplored = false) {
    const map = this.getOWMap(useExplored);
    const sizeY = map[0].length;
    const sizeX = map.length;

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

/* Prints the map of biomes and a legend explaining the numbers. */
OW.Map.prototype.biomeMapToString = function() {
    const sizeX = this.getSizeX() - 1;
    const sizeY = this.getSizeY() - 1;

    // Build a legend ie: 0 - arctic, 1 - alpine, 2 - forest etc
    const keys = Object.keys(OW.biomeTypeMap);
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
            rowStr += ',' + name2Num[this._biomeMap[key]];
        }
        rowStr += '\n';
        result += rowStr;
    }
    result += '\n' + legend.join('\n');
    return result;
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
            map[x][y] = OW.EMPTY;
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
    map[0][0] = OW.CC_NW;
    map[0][sizeY - 1] = OW.CC_SW;
    map[sizeX - 1][sizeY - 1] = OW.CC_SE;
    map[sizeX - 1][0] = OW.CC_NE;

    // N border, y = 0, vary x
    for (let x = 1; x < sizeX - 1; x++) {
        map[x][0] = getRNG().arrayGetRand(OW.N_BORDER);
    }

    // S border, y = max, vary x
    for (let x = 1; x < sizeX - 1; x++) {
        map[x][sizeY - 1] = getRNG().arrayGetRand(OW.S_BORDER);
    }

    // E border, x = max, vary y
    for (let y = 1; y < sizeY - 1; y++) {
        map[sizeX - 1][y] = getRNG().arrayGetRand(OW.E_BORDER);
    }

    // W border, x = 0, vary y
    for (let y = 1; y < sizeY - 1; y++) {
        map[0][y] = getRNG().arrayGetRand(OW.W_BORDER);
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
            const pos = getRNG().getUniformInt(1, 19);
            nHWalls.push(pos * 0.05);
        }
        nHWalls = nHWalls.sort();
    }
    if (Number.isInteger(conf.nVWalls)) {
        nVWalls = [];
        for (let i = 0; i < conf.nVWalls; i++) {
            const pos = getRNG().getUniformInt(1, 19);
            nVWalls.push(pos * 0.05);
        }
        nVWalls = nHWalls.sort();
    }

    // Add horizontal and vertical "walls"
    for (let i = 0; i < nHWalls.length; i++) {
        let stop = stopOnWall;
        if (stopOnWall === 'random') {
            stop = getRNG().getUniform() >= 0.5;
        }
        addHorizontalWallWestToEast(ow,
            Math.floor(sizeY * nHWalls[i]), map, stop);
    }
    for (let i = 0; i < nVWalls.length; i++) {
        let stop = stopOnWall;
        if (stopOnWall === 'random') {
            stop = getRNG().getUniform() >= 0.5;
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
    map[0][y] = OW.TT_W;
    if (!stopOnWall) {map[sizeX - 1][y] = OW.TT_E;}
    for (let x = 1; x < sizeX - 1; x++) {
        if (!didStopToWall) {
            if (map[x][y] !== OW.EMPTY) {
                if (!stopOnWall) {
                    map[x][y] = OW.XX; // Push through wall
                }
                else { // Add ╣ and finish
                    didStopToWall = true;
                    map[x][y] = OW.TT_E;
                    wall.x.push(x);
                }
            }
            else {
                map[x][y] = getRNG().getWeighted(OW.LINE_WE_WEIGHT);
            }
        }
    }
    if (!didStopToWall) { // Didn't stop to wall
        if (stopOnWall) { // But we wanted, so add ending piece
            map[sizeX - 1][y] = OW.TT_E;
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
    map[x][0] = OW.TT_N;
    if (!stopOnWall) {map[x][sizeY - 1] = OW.TT_S;}
    for (let y = 1; y < sizeY - 1; y++) {
        if (!didStopToWall) {
            if (map[x][y] !== OW.EMPTY) {
                if (!stopOnWall) {
                    map[x][y] = OW.XX; // Push through wall
                }
                else { // Add ╩ and finish
                    didStopToWall = true;
                    map[x][y] = OW.TT_S;
                    wall.y.push(y);
                }
            }
            else {
                map[x][y] = getRNG().getWeighted(OW.LINE_NS_WEIGHT);
            }
        }
    }
    if (!didStopToWall) {
        if (stopOnWall) { // But we wanted, so add ending piece
            map[x][sizeY - 1] = OW.TT_S;
        }
        wall.y.push(sizeY - 1);
    }
    ow.addVWall(wall);
}

function addRandomInnerWalls(overworld, map, conf) {
    const sizeY = map[0].length;
    const sizeX = map.length;

    const ratio = conf.innerWallRatio || 0.05;
    const nTiles = Math.floor(sizeX * sizeY * ratio);

    for (let i = 0; i < nTiles; i++) {
        const x = getRNG().getUniformInt(2, sizeX - 2);
        const y = getRNG().getUniformInt(2, sizeY - 2);
        if (map[x][y] === OW.EMPTY) {
            map[x][y] = getRNG().arrayGetRand(OW.ALL_WALLS);
        }
    }
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
    if (map[x][y] === OW.EMPTY) {
        const neighbours = getValidNeighbours(x, y, map);
        const validNeighbours = neighbours.filter(n =>
            n[0] !== OW.EMPTY && n[0] !== OW.TERM
        );
        if (validNeighbours.length === 1) {
            if (validNeighbours[0][1].length > 0) {
                map[x][y] = getRNG().arrayGetRand(validNeighbours[0][1]);
            }
            else {
                map[x][y] = OW.TERM;
            }
        }
        else {
            map[x][y] = OW.TERM;
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
        const conn = OW.CAN_CONNECT[map[x][y - 1]].N;
        tiles.push([map[x][y - 1], conn]);
    }
    // S
    if (y < sizeY - 1) {
        const conn = OW.CAN_CONNECT[map[x][y + 1]].S;
        tiles.push([map[x][y + 1], conn]);
    }
    // E
    if (x < sizeX - 1) {
        const conn = OW.CAN_CONNECT[map[x + 1][y]].E;
        tiles.push([map[x + 1][y], conn]);
    }
    // W
    if (x > 0) {
        const conn = OW.CAN_CONNECT[map[x - 1][y]].W;
        tiles.push([map[x - 1][y], conn]);
    }
    return tiles;
}

/* Prints the given map. */
function mapToString(map) {
    const sizeY = map[0].length;
    const sizeX = map.length;
    for (let y = 0; y < sizeY; y++) {
        const line = [];
        for (let x = 0; x < sizeX; x++) {
            line.push(map[x][y]);
        }
        console.log(line.join('')); // Print result
    }
}
/* Adds features like water, cities etc into the world. This feature only
 * designates the x,y coordinate on overworld map, but does not give details
 * for the Map.Level sublevels. */
function addOverWorldFeatures(ow, conf) {
    const sizeX = ow.getSizeX();
    const sizeY = ow.getSizeY();
    const area = sizeX * sizeY;

    const numFlatTiles = ow.numTiles(OW.TERM);
    const numWallTiles = ow.numWallTiles();

    const nDungeonsSouth = conf.nDungeonsSouth || Math.floor(numWallTiles / 12);
    const nDungeonsCenter = conf.nDungeonsCenter ||
        Math.floor(numWallTiles / 24);
    const nDungeonsNorth = conf.nDungeonsNorth || Math.floor(numWallTiles / 24);

    const nMountainsNorth = conf.nMountainsNorth || Math.floor(area / 40);
    const nMountainsMiddle = conf.nMountainsMiddle || Math.floor(area / 60);
    const nMountainsSouth = conf.nMountainsSouth || Math.floor(area / 80);

    // Add final tower
    addFeatureToAreaByDir(ow, 'NE', 0.5, OW.BTOWER);
    const numHorWalls = ow.numHWalls();

    // City of B, + other wall fortresses
    if (numHorWalls > 1) {
        addFeatureToWall(ow, ow._hWalls[1], OW.WCAPITAL);
        addFeatureToWall(ow, ow._hWalls[0], OW.WTOWER);
    }
    if (numHorWalls > 2) {
        for (let i = 2; i < numHorWalls; i++) {
            addFeatureToWall(ow, ow._hWalls[i], OW.VTUNNEL);
        }
    }

    const numVerWalls = ow.numVWalls();
    if (numVerWalls > 0) {
        addFeatureToWall(ow, ow._vWalls[numVerWalls - 1], OW.BTOWER);
        addFeatureToWall(ow, ow._vWalls[numVerWalls - 1], OW.BCAPITAL);
    }

    const cmdBetweenHWalls = {y: {start: ['wall', 0], end: ['wall', 1]}};
    const cmdAboveNorthWall = {y: {start: 'N', end: 'wall'}};
    const cmdSouthernArea = {y: {start: ['wall', 1], end: 'S'}};

    // Create biomes for actor generation of overworld
    addBiomeToOverWorld(ow, cmdAboveNorthWall, OW.BIOME.ALPINE);
    addBiomeToOverWorld(ow, {x: {start: ['wall', 0], end: 'E'}},
        OW.BIOME.ARCTIC);
    addBiomeToOverWorld(ow, cmdBetweenHWalls, OW.BIOME.TUNDRA);
    addBiomeToOverWorld(ow, cmdSouthernArea, OW.BIOME.TAIGA);

    // Create forests and lakes (sort of done in sub-level generation)

    // Distribute dungeons
    // const bBoxSouth = bBox(1, sizeY - 2, sizeX - 2, sizeY - 10);
    addDungeonsToOverWorld(ow, nDungeonsSouth, cmdSouthernArea);
    addDungeonsToOverWorld(ow, nDungeonsCenter, cmdBetweenHWalls);
    addDungeonsToOverWorld(ow, nDungeonsNorth, cmdAboveNorthWall);

    const nCitySouth = Math.floor(numFlatTiles * 0.5 / 80);
    const nCityCenter = Math.floor(numFlatTiles * 0.2 / 100);
    const nCityNorth = Math.floor(numFlatTiles * 0.2 / 80);

    // Distribute cities and villages etc settlements
    addVillagesToOverWorld(ow, nCitySouth, cmdSouthernArea);
    addVillagesToOverWorld(ow, nCityCenter, cmdBetweenHWalls);
    addVillagesToOverWorld(ow, nCityNorth, cmdAboveNorthWall);

    // Distribute mountains
    addMountainsToOverWorld(ow, nMountainsSouth, cmdSouthernArea);
    addMountainsToOverWorld(ow, nMountainsMiddle, cmdBetweenHWalls);
    addMountainsToOverWorld(ow, nMountainsNorth, cmdAboveNorthWall);

    // Adds roads for created features
}

/* Adds a feature to the map based on the cardinal direction. */
function addFeatureToAreaByDir(ow, loc, shrink, type) {
    const map = ow.getMap();
    const sizeY = map[0].length;
    const sizeX = map.length;

    let xy = getRandLoc(loc, shrink, sizeX, sizeY);
    let watchdog = 1000;
    while (map[xy[0]][xy[1]] !== OW.TERM) {
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
        const ulx = wall.x[0];
        const lrx = wall.x[wall.x.length - 1];
        xy = findCellRandXYInBox(map, bBox(ulx, wall.y, lrx, wall.y), OW.LL_WE);
    }
    if (wall.type === 'vertical') { // y will be fixed
        const uly = wall.y[0];
        const lry = wall.y[wall.y.length - 1];
        xy = findCellRandXYInBox(map, bBox(wall.x, uly, wall.x, lry), OW.LL_NS);
    }

    debug(`Placed feature ${type} to ${xy}`);
    ow.addFeature(xy, type);
}

/* Adds a biome zone to the overworld map. These zones can be used to generate
 * terrain props + different actors based on the zone type. */
function addBiomeToOverWorld(ow, cmd, biomeType) {
    const bbox = getBoundingBox(ow, cmd);
    // Apply given type on the found range
    for (let x = bbox.ulx; x <= bbox.lrx; x++) {
        for (let y = bbox.uly; y <= bbox.lry; y++) {
            ow.addBiome(x, y, biomeType);
        }
    }
}

/* Adds dungeons into the overworld. Can be bounded using using coordinates. */
function addDungeonsToOverWorld(ow, nDungeons, cmd) {
    const bbox = getBoundingBox(ow, cmd);
    for (let i = 0; i < nDungeons; i++) {
        const xy = findCellRandXYInBox(ow.getMap(), bbox, OW.ALL_WALLS);
        ow.addFeature(xy, OW.WDUNGEON);
    }
}

function addMountainsToOverWorld(ow, nMountains, cmd) {
    const bbox = getBoundingBox(ow, cmd);
    for (let i = 0; i < nMountains; i++) {
        const xy = findCellRandXYInBox(ow.getMap(), bbox, [OW.TERM]);
        ow.addFeature(xy, OW.MOUNTAIN);
    }

}

/* Adds villages into the overworld. Can be bounded using using coordinates. */
function addVillagesToOverWorld(ow, nDungeons, cmd) {
    const bbox = getBoundingBox(ow, cmd);
    for (let i = 0; i < nDungeons; i++) {
        const xy = findCellRandXYInBox(ow.getMap(), bbox, [OW.TERM]);
        if (getRNG().getUniform() < OW.PROB_BVILLAGE) {
            ow.addFeature(xy, OW.BVILLAGE);
        }
        else {
            ow.addFeature(xy, OW.WVILLAGE);
        }
    }
}

/* Checks if given cell type matches any in the array. If there's OW.CELL_ANY,
 * in the list, then returns always true regardless of type. */
function cellMatches(type, listOrStr) {
    let list = listOrStr;
    if (typeof listOrStr === 'string') {
        list = [listOrStr];
    }
    const matchAny = list.indexOf(OW.CELL_ANY);
    if (matchAny >= 0) {return true;}

    const matchFound = list.indexOf(type);
    return matchFound >= 0;
}

/* Finds a random cell of given type from the box of coordinates. listOrStr
 * should contain cells which are allowed. */
function findCellRandXYInBox(map, bbox, listOrStr) {
    const {ulx, uly, lrx, lry} = bbox;

    let x = ulx === lrx ? ulx : getRNG().getUniformInt(ulx, lrx);
    let y = lry === uly ? lry : getRNG().getUniformInt(uly, lry);
    let watchdog = 100 * (lrx - ulx + 1) * (lry - uly + 1);

    let match = cellMatches(map[x][y], listOrStr);
    while (!match) {
        x = ulx === lrx ? ulx : getRNG().getUniformInt(ulx, lrx);
        y = lry === uly ? lry : getRNG().getUniformInt(uly, lry);
        match = cellMatches(map[x][y], listOrStr);
        if (watchdog === 0) {
            const box = `(${ulx},${lry}) -> (${lrx},${uly})`;
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
    let ulx = 0;
    let lry = 0;
    let lrx = 0;
    let uly = 0;

    // Determine the bounding coordinates for random location
    if (loc.match(/N/)) {
        uly = 0;
        lry = Math.floor(shrink * 0.25 * sizeY);
    }
    if (loc.match(/S/)) {
        lry = sizeY - 1;
        uly = 0.75 * sizeY;
        uly = Math.floor(uly + (1 - shrink) * (lry - uly));
    }
    if (loc.match(/E/)) {
        lrx = sizeX - 1;
        ulx = 0.75 * sizeX;
        ulx = Math.floor(ulx + (1 - shrink) * (lrx - ulx));
    }
    if (loc.match(/W/)) {
        ulx = 0;
        lrx = Math.floor(shrink * 0.25 * sizeX);
    }

    return [
        getRNG().getUniformInt(ulx, lrx),
        getRNG().getUniformInt(uly, lry)
    ];
}

/* Returns a bounding box object of given coordinates. */
function bBox(ulx, lry, lrx, uly) {
    if (RG.isNullOrUndef([ulx, lry, lrx, uly])) {
        RG.err('overworld.map.js', 'bBox',
            `bBox coord(s) undef/null: ${ulx},${lry},${lrx},${uly}`);
    }
    return {isBox: true, ulx, lry, lrx, uly};
}

/* Returns a bounding box (ulx, lry, lrx, uly) based on the command.
 * Formats:
 *   1. cmd: {[x|y]: {start: 'wall'|['wall', Nwall]}}
 *   2.
 * */

function getBoundingBox(ow, cmd) {
    if (cmd.isBox) {
        return cmd;
    }

    let xStart = 0;
    let xEnd = ow.getSizeX() - 1;
    let yStart = 0;
    let yEnd = ow.getSizeY() - 1;

    if (cmd.x) {
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

    return {
        ulx: xStart, lrx: xEnd,
        uly: yStart, lry: yEnd
    };

}

module.exports = OW;


const RG = require('./rg');
RG.Random = require('./random');

const OW = {};

const getRandIn = RG.RAND.arrayGetRand.bind(RG.RAND);

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
OW.BTOWER = '\u265C';
OW.WTOWER = '\u2656';
OW.DUNGEON = '\u2616';
// OW.VILLAGE = '\u27F0';
OW.VILLAGE = '\u25B3';
// const CITY = '\u1CC1';

OW.biomeTypeMap = {
    arctic: 0,
    alpine: 1,
    tundra: 2,
    taiga: 3,
    forest: 4,
    grassland: 5
};

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
        W: OW.W_HAS_CONN  // ═e
    },
    [OW.LL_NS]: {
        N: OW.N_HAS_CONN, // ║
                       // e

        S: OW.S_HAS_CONN, // e
                       // ║
        E: [], // e║
        W: []  // ║e
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
        E: OW.E_HAS_CONN,  // e╝
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
        W: OW.W_HAS_CONN  // ╠e
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
OW.createOverWorld = function(conf = {}) {
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

    if (topToBottom) {
        connectUnconnectedTopBottom(owMap, yFirst);
    }
    else {
        connectUnconnectedBottomTop(owMap, yFirst);
    }

    if (conf.printResult) {printMap(owMap);}
    overworld.setMap(owMap);
    addOverWorldFeatures(overworld);

    // High-level overworld generation ends here

    if (printResult) {
        console.log(overworld.mapToString());
    }
    return overworld;
};

//---------------------------------------------
/* OW.Map: Data struct for overworld. */
//---------------------------------------------

OW.Map = function() {
    this._baseMap = [];
    this._subLevels = [];

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
            RG.err('OW.Map', 'getBiome',
                `No biome set for x,y ${x},${y}`);
        }
        return '';
    };

    this.getMap = () => this._baseMap;
    this.getCell = (xy) => this._baseMap[xy[0]][xy[1]];

    this.numHWalls = () => this._hWalls.length;
    this.numVWalls = () => this._vWalls.length;
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

    this.getFeaturesByType = function(type) {
        if (!this._features.hasOwnProperty(type)) {
            return [];
        }
        return this._features[type];
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
            RG.warn('OW.Map', 'getSizeY',
                'Y-size requested but returning zero value');
            return 0;
        }
    };

};

/* Converts the OW.Map into string. */
OW.Map.prototype.mapToString = function() {
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

/* Prints the map of biomes and a legend explaining the numbers. */
OW.Map.prototype.printBiomeMap = function() {
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
            rowStr += ',' + name2Num[this.biomeMap[key]];
        }
        rowStr += '\n';
        result += rowStr;
    }
    result += '\n' + legend.join('\n');
    console.log(result);
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
        map[x][0] = getRandIn(OW.N_BORDER);
    }

    // S border, y = max, vary x
    for (let x = 1; x < sizeX - 1; x++) {
        map[x][sizeY - 1] = getRandIn(OW.S_BORDER);
    }

    // E border, x = max, vary y
    for (let y = 1; y < sizeY - 1; y++) {
        map[sizeX - 1][y] = getRandIn(OW.E_BORDER);
    }

    // W border, x = 0, vary y
    for (let y = 1; y < sizeY - 1; y++) {
        map[0][y] = getRandIn(OW.W_BORDER);
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
                map[x][y] = RG.RAND.getWeighted(OW.LINE_WE_WEIGHT);
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
                map[x][y] = RG.RAND.getWeighted(OW.LINE_NS_WEIGHT);
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
                map[x][y] = getRandIn(validNeighbours[0][1]);
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
/* Adds features like water, cities etc into the world. This feature only
 * designates the x,y coordinate on overworld map, but does not give details
 * for the Map.Level sublevels. */
function addOverWorldFeatures(ow) {
    const sizeX = ow.getSizeX();
    const sizeY = ow.getSizeY();

    // Add final tower
    addFeatureToAreaByDir(ow, 'NE', 0.5, OW.BTOWER);

    // City of B, + other wall fortresses
    if (ow.numHWalls() > 1) {
        addFeatureToWall(ow, ow._hWalls[1], OW.WCAPITAL);
        addFeatureToWall(ow, ow._hWalls[0], OW.WTOWER);
    }
    if (ow.numVWalls() > 0) {
        addFeatureToWall(ow, ow._vWalls[0], OW.BTOWER);
    }

    // TODO list for features:

    // Add the main roads for most important places
    const cmdBetweenHWalls = {y: {start: ['wall', 0], end: ['wall', 1]}};
    const cmdAboveNorthWall = {y: {start: 'N', end: 'wall'}};
    const cmdSouthernArea = {y: {start: ['wall', 1], end: 'S'}};

    // Create biomes for actor generation of overworld
    addBiomeToOverWorld(ow, cmdAboveNorthWall, 'alpine');
    addBiomeToOverWorld(ow, {x: {start: ['wall', 0], end: 'E'}}, 'arctic');
    addBiomeToOverWorld(ow, cmdBetweenHWalls, 'tundra');
    addBiomeToOverWorld(ow, cmdSouthernArea, 'taiga');

    // Create forests and lakes (sort of done in sub-level generation)

    // Distribute dungeons
    addDungeonsToOverWorld(ow, 40, bBox(1, sizeY - 2, sizeX - 2, sizeY - 10));
    addDungeonsToOverWorld(ow, 10, cmdBetweenHWalls);
    addDungeonsToOverWorld(ow, 20, cmdAboveNorthWall);

    // Distribute mountains

    // Distribute cities and villages etc settlements
    addVillagesToOverWorld(ow, 10, bBox(1, sizeY - 2, sizeX - 2, sizeY - 10));
    addVillagesToOverWorld(ow, 2, cmdBetweenHWalls);

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
        const llx = wall.x[0];
        const urx = wall.x[wall.x.length - 1];
        xy = findCellRandXYInBox(map, bBox(llx, wall.y, urx, wall.y), OW.LL_WE);
    }
    if (wall.type === 'vertical') { // y will be fixed
        const lly = wall.y[0];
        const ury = wall.y[wall.y.length - 1];
        xy = findCellRandXYInBox(map, bBox(wall.x, lly, wall.x, ury), OW.LL_NS);
    }

    ow.addFeature(xy, type);
}

/* Adds a biome zone to the overworld map. These zones can be used to generate
 * terrain props + different actors based on the zone type. */
function addBiomeToOverWorld(ow, cmd, biomeType) {
    const bbox = getBoundingBox(ow, cmd);
    // Apply given type on the found range
    for (let x = bbox.llx; x <= bbox.urx; x++) {
        for (let y = bbox.ury; y <= bbox.lly; y++) {
            ow.addBiome(x, y, biomeType);
        }
    }
}

/* Adds dungeons into the overworld. Can be bounded using using coordinates. */
function addDungeonsToOverWorld(ow, nDungeons, cmd) {
    const bbox = getBoundingBox(ow, cmd);
    for (let i = 0; i < nDungeons; i++) {
        const xy = findCellRandXYInBox(ow.getMap(), bbox, OW.ALL_WALLS);
        ow.addFeature(xy, OW.DUNGEON);
    }
}

/* Adds villages into the overworld. Can be bounded using using coordinates. */
function addVillagesToOverWorld(ow, nDungeons, cmd) {
    const bbox = getBoundingBox(ow, cmd);
    for (let i = 0; i < nDungeons; i++) {
        const xy = findCellRandXYInBox(ow.getMap(), bbox, [OW.TERM]);
        ow.addFeature(xy, OW.VILLAGE);
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

/* Finds a random cell of given type from the box of coordinates. */
function findCellRandXYInBox(map, bbox, listOrStr) {
    const {llx, lly, urx, ury} = bbox;

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

/* Returns a bounding box object of given coordinates. */
function bBox(llx, lly, urx, ury) {
    if (RG.isNullOrUndef([llx, lly, urx, ury])) {
        RG.err('overworld.map.js', 'bBox',
            `bBox coord(s) undef/null: ${llx},${lly},${urx},${ury}`);
    }
    return {isBox: true, llx, lly, urx, ury};
}

/* Returns a bounding box (llx, lly, urx, ury) based on the command.
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
        llx: xStart, urx: xEnd,
        ury: yStart, lly: yEnd
    };

}

module.exports = OW;

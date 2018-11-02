/*
 * Code to generate the game 2-D overworld. Contains 2nd layer of overworld
 * generation, and uses overworld.map for generating high-level map.
 */

/* bb = bounding box = (ulx uly lrx lry)
 * ulx = upper-left x
 * uly = upper-left y
 * lrx = lower-right x
 * lry = lower-right y
 *
 * Because 0,0 is located in the top-left (NW) corner, uly <= lry, which maybe
 * confusing because 'lower' has higher value than 'upper'. But in this case
 * 'lower' and 'upper' refer to visual location.
 *
 *      (ulx, uly)
 *       |
 *       V
 *    y x0123
 *    0  ####
 *    1  ####
 *    2  #### <-(lrx, lry)
 */

const RG = require('./rg');
RG.Names = require('../data/name-gen');
const LevelGen = require('../data/level-gen');
RG.Path = require('./path');
const MapGenerator = require('./map.generator');
const OW = require('./overworld.map');
const debug = require('debug')('bitn:overworld');

//-------------------
// Variables
//-------------------

RG.OverWorld = {};

const cityTypesRe = /(capital|city|abandoned fort|fort|village)/;
const twoEntranceCityRe = /(dwarven city|abandoned fort|capital)/;

const MOUNTAIN_TYPE = RG.ELEM.WALL_MOUNT.getType();

// Used in while loops to prevent infinite looping
const WATCHDOG_MAX = 111;

// Used for debugging only
const playerTileX = 1;
const playerTileY = 1;
const debugBlackTower = true;

// When set to 1, builds roads between main features. Currently this feature is
// very slow on large maps.
let addMainRoads = false;

const getRNG = RG.Random.getRNG;

RG.OverWorld.TILE_SIZE_X = 100;
RG.OverWorld.TILE_SIZE_Y = 100;
const {TILE_SIZE_X, TILE_SIZE_Y} = RG.OverWorld;

//---------------------------------------------------------------------------
// Wall object inside the Overworld. Wall here means a huge wall of mountains.
//---------------------------------------------------------------------------
const Wall = function(type) {
    this.type = type; // vertical/horizontal/etc
    this.coord = []; // 2-d array of coordinates
};

Wall.prototype.addWallCoord = function(tile) {
    this.coord.push(tile);
};

Wall.prototype.getCoordAt = function(n) {
    return this.coord[n];
};

/* Returns the y-pos for horizontal and x-pos for vertical walls. */
Wall.prototype.getWallPos = function() {
    if (this.type === 'vertical') {
        return this.coord[0][0][0];
    }
    if (this.type === 'horizontal') {
        return this.coord[0][0][1];
    }
    return OW.ILLEGAL_POS;
};

Wall.prototype.getWallStart = function() {
    if (this.type === 'vertical') {
        return this.coord[0][0][1];
    }
    if (this.type === 'horizontal') {
        return this.coord[0][0][0];
    }
    return OW.ILLEGAL_POS;
};

Wall.prototype.getWallEnd = function() {
    const last = this.coord.length - 1;
    if (this.type === 'vertical') {
        return this.coord[last][0][1];
    }
    if (this.type === 'horizontal') {
        return this.coord[last][0][0];
    }
    return -1;
};

Wall.prototype.toString = function() {
    let str = `type: ${this.type} `;
    str += `Length: ${this.coord.length}\n`;
    str += `Start: ${this.getWallStart()} End: ${this.getWallEnd()}\n`;
    str += `Tiles: ${JSON.stringify(this.coord)}`;
    return str;
};

//---------------------------------------------------------------------------
/* Feature has type and a list of coordinates. It can be for example a fort
 * occupying several squares. */
//---------------------------------------------------------------------------
RG.OverWorld.SubFeature = function(type, coord) {
    this.type = type;
    this.coord = coord;
    this.cellsAround = null;

    if (Array.isArray(coord)) {
        if (coord.length === 0) {
            RG.err('OverWorld.SubFeature', 'new',
                'coord len is 0.');
        }
        else if (!Array.isArray(coord[0])) {
            RG.err('OverWorld.SubFeature', 'new',
                'Each coord must be [x, y] pair.');
        }
    }
    else {
        RG.err('OverWorld.SubFeature', 'new',
            'coord must be an array.');
    }

};

RG.OverWorld.SubFeature.prototype.getLastCoord = function() {
    if (this.coord.length > 0) {
        return this.coord[this.coord.length - 1];
    }
    return [];
};

//---------------------------------------------------------------------------
/* Data struct which is tied to 'RG.Map.Level'. Contains more high-level
 * information like positions of walls and other features. Essentially a wrapper
 * around Map.Level, to keep feature creep out of the Map.Level. */
//---------------------------------------------------------------------------
RG.OverWorld.SubLevel = function(level) {
    this._level = level;
    this._hWalls = [];
    this._vWalls = [];
    this._subX = level.getMap().rows;
    this._subY = level.getMap().cols;

    // Store any number of different type of features by type
    this._features = {};

    // Stores one feature per coordinate location
    this._featuresByXY = {};

};

RG.OverWorld.SubLevel.prototype.getFeatures = function() {
    return this._features;
};

RG.OverWorld.SubLevel.prototype.getSubX = function() {
    return this._subX;
};

RG.OverWorld.SubLevel.prototype.getSubY = function() {
    return this._subY;
};

RG.OverWorld.SubLevel.prototype.addWall = function(wall) {
    if (wall.type === 'vertical') {
        this._vWalls.push(wall);
    }
    else if (wall.type === 'horizontal') {
        this._hWalls.push(wall);
    }
};

/* Returns one wall (or null) if none found. */
RG.OverWorld.SubLevel.prototype.getWall = function() {
    const hLen = this._hWalls.length;
    const vLen = this._vWalls.length;
    if (hLen === 0 && vLen === 0) {return null;}
    if (hLen === 0) {return this._vWalls[0];}
    if (vLen === 0) {return this._hWalls[0];}
    RG.warn('OverWorld.SubLevel', 'getWall',
        `Return hor wall. Too many walls: vLen: ${vLen}, hLen: ${hLen}`);
    return this._hWalls[0];
};

RG.OverWorld.SubLevel.prototype.addFeature = function(feature) {
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


RG.OverWorld.SubLevel.prototype.getFeaturesByType = function(type) {
    if (this._features.hasOwnProperty(type)) {
        return this._features[type];
    }
    return [];
};

//---------------------------------------------------------------------------
/* Object to translate coordinates between different maps and levels.
 */
//---------------------------------------------------------------------------
const CoordMap = function(args = {}) {
    // Size of the large overworld Map.Level
    this.worldCols = args.worldCols || 0;
    this.worldRows = args.worldRows || 0;

    // Number of area tiles per x/y
    this.nTilesX = args.nTilesX || 0;
    this.nTilesY = args.nTilesY || 0;

    // How many cols/rows one overworld square is in overworld Map.Level
    this.xMap = args.xMap || 0;
    this.yMap = args.yMap || 0;

    this.setXYMap = function(xMap, yMap) {
        this.xMap = xMap;
        this.yMap = yMap;
    };

    this.getAreaLevelCols = function() {
        return this.worldCols / this.nTilesX;
    };

    this.getAreaLevelRows = function() {
        return this.worldRows / this.nTilesY;
    };

    this.toOwLevelXY = function(subTileXY, subLevelXY) {
        const x = subTileXY[0] * this.xMap + subLevelXY[0];
        const y = subTileXY[1] * this.xMap + subLevelXY[1];
        return [x, y];
    };

    /**
     * @param {array[]} areaXY - x,y coord for AreaTile
     * @param {array[]} areaLevelXY - local x,y coord with AreaTile Map.Level
     * @return {array[]} - x,y coordinates for overworld tile
     */
    this.toOWTileXY = function(areaXY, areaLevelXY) {
        const bbox = this.getOWTileBboxFromAreaTileXY(areaXY[0], areaXY[1]);
        return [
            bbox.ulx + Math.floor(areaLevelXY[0] / this.xMap),
            bbox.uly + Math.floor(areaLevelXY[1] / this.yMap)
        ];
    };

    /* Given ow tile x,y, returns AreaTile x,y in which this ow tile x,y
     * is located in. */
    this.getAreaXYFromOWTileXY = function(owX, owY) {
        return [
            Math.floor(owX / this.xMap),
            Math.floor(owY / this.yMap)
        ];
    };

    this.getOWTileBboxFromAreaTileXY = function(aX, aY) {
        if (Number.isInteger(aX) && Number.isInteger(aY)) {
            return {
                ulx: (aX * TILE_SIZE_X) / this.xMap,
                uly: (aY * TILE_SIZE_Y) / this.yMap,
                lrx: ((aX + 1) * TILE_SIZE_X) / this.xMap - 1,
                lry: ((aY + 1) * TILE_SIZE_Y) / this.yMap - 1
            };
        }
        RG.err('OverWorld.CoordMap', 'getOWTileBboxFromAreaTileXY',
            `Args (x,y) must be ints. Got ${aX}, ${aY}`);
        return null;
    };

    this.toJSON = function() {
        return {
            worldCols: this.worldCols,
            worldRows: this.worldRows,
            nTilesX: this.nTilesX,
            nTilesY: this.nTilesY,
            xMap: this.xMap,
            yMap: this.yMap
        };
    };

};
RG.OverWorld.CoordMap = CoordMap;

//---------------------------------------------------------------------------
// RG.OverWorld FUNCTIONS (Imported)
//---------------------------------------------------------------------------

/* Factory function to construct the overworld. Generally you want to call this
 * method.
 * @return RG.Map.Level.
 */
RG.OverWorld.createOverWorld = (conf = {}) => {
    // 1st generate the high-level map
    const overworld = OW.createOverWorld(conf);
    // Then use this to generate placement details
    return RG.OverWorld.createOverWorldLevel(overworld, conf);
};

/* Creates/returns Map.Level object of overworld, and a configuration to
 * build the features using Factory.World.
 * @return [Map.Level, conf] - Generated level and Factory config
 * */
RG.OverWorld.createOverWorldLevel = (overworld, conf) => {
    const coordMap = new CoordMap();
    coordMap.worldCols = conf.worldX || 400;
    coordMap.worldRows = conf.worldY || 400;

    coordMap.nTilesX = conf.nTilesX || coordMap.worldCols / TILE_SIZE_X;
    coordMap.nTilesY = conf.nTilesY || coordMap.worldRows / TILE_SIZE_Y;

    coordMap.xMap = Math.floor(coordMap.worldCols / overworld.getSizeX());
    coordMap.yMap = Math.floor(coordMap.worldRows / overworld.getSizeY());

    overworld.coordMap = coordMap;

    addMainRoads = conf.addMainRoads || addMainRoads;

    const worldLevelAndConf = buildMapLevel(overworld, coordMap);
    return worldLevelAndConf;
};

//---------------------------------------------------------------------------
// Private FUNCTIONS
//---------------------------------------------------------------------------

/* Creates the overworld level. Returns RG.Map.Level + conf object. */
function buildMapLevel(ow, coordMap) {
    const {worldCols, worldRows, xMap, yMap, nTilesX, nTilesY} = coordMap;

    const sizeX = ow.getSizeX();
    const sizeY = ow.getSizeY();
    const owLevel = RG.FACT.createLevel(RG.LEVEL_EMPTY, worldCols, worldRows);

    // Build the overworld level in smaller pieces, and then insert the
    // small levels into the large level.
    // Each overworld tile is mapped to map sub Map.Level
    for (let x = 0; x < sizeX; x++) {
        for (let y = 0; y < sizeY; y++) {
            const subLevel = createSubLevel(ow, x, y, xMap, yMap);
            const x0 = x * xMap;
            const y0 = y * yMap;
            RG.Geometry.mergeLevels(owLevel, subLevel, x0, y0);
        }
    }

    const conf = RG.OverWorld.createWorldConf(ow,
        sizeX, sizeY, nTilesX, nTilesY);

    // Some global features (like roads) need to be added
    addGlobalFeatures(ow, owLevel, conf, coordMap);

    return [owLevel, conf];
}

/* Returns a subLevel created based on the tile type. */
function createSubLevel(ow, owX, owY, xMap, yMap) {
    const owMap = ow.getMap();
    const type = owMap[owX][owY];

    const biomeType = ow.getBiome(owX, owY);

    const subX = xMap;
    const subY = yMap;
    const subLevel = RG.FACT.createLevel(RG.LEVEL_EMPTY, subX, subY);

    addBiomeFeaturesSubLevel(biomeType, subLevel);

    const owSubLevel = new RG.OverWorld.SubLevel(subLevel);
    ow.addSubLevel([owX, owY], owSubLevel);

    addSubLevelWalls(type, owSubLevel, subLevel);

    // TODO Add other features such as cities, dungeons etc to the level.
    addSubLevelFeatures(ow, owX, owY, subLevel);

    return subLevel;
}


function addBiomeFeaturesSubLevel(biomeType, subLevel) {
    const cols = subLevel.getMap().cols;
    const rows = subLevel.getMap().rows;

    if (biomeType === 'arctic') {
        MapGenerator.addRandomSnow(subLevel.getMap(), 1.0);
    }
    else if (biomeType === 'alpine') {
        MapGenerator.addRandomSnow(subLevel.getMap(), 0.5);
    }
    else if (biomeType === 'tundra') {
        MapGenerator.addRandomSnow(subLevel.getMap(), 0.1);
    }
    else if (biomeType === 'taiga' || biomeType === 'forest') {
        const freeCells = subLevel.getMap().getFree();
        const forestConf = {
            ratio: 0.6
        };
        const forest = RG.FACT.createLevel('forest', cols, rows, forestConf);
        const forestMap = forest.getMap();
        freeCells.forEach(cell => {
            cell.setBaseElem(forestMap.getBaseElemXY(cell.getX(), cell.getY()));
        });

        // Add some water
        const addLakes = getRNG().getUniform();
        if (addLakes < 0.3) {
            const lakeConf = {ratio: 0.4};
            const lakes = RG.FACT.createLevel('lakes', cols, rows, lakeConf);
            const lakesMap = lakes.getMap();
            freeCells.forEach(cell => {
                cell.setBaseElem(
                    lakesMap.getBaseElemXY(cell.getX(), cell.getY()));
            });
        }
    }
    else if (biomeType === 'grassland') {
        const freeCells = subLevel.getMap().getFree();
        const conf = {
            ratio: 0.1
        };
        const grassland = RG.FACT.createLevel('forest', cols, rows, conf);
        const grassMap = grassland.getMap();
        freeCells.forEach(cell => {
            cell.setBaseElem(grassMap.getBaseElemXY(cell.getX(), cell.getY()));
        });
    }

}

/* Adds the "mountain" walls into the overworld subLevel and the RG.Map.Level
 * sublevel. */
function addSubLevelWalls(type, owSubLevel, subLevel) {
    const map = subLevel.getMap();

    const canConnectNorth = OW.N_HAS_CONN.findIndex(item => item === type) >= 0;
    const canConnectSouth = OW.S_HAS_CONN.findIndex(item => item === type) >= 0;
    const canConnectEast = OW.E_HAS_CONN.findIndex(item => item === type) >= 0;
    const canConnectWest = OW.W_HAS_CONN.findIndex(item => item === type) >= 0;

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
                map.setBaseElemXY(x, y, RG.ELEM.WALL_MOUNT);
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
                map.setBaseElemXY(x, y, RG.ELEM.WALL_MOUNT);
                tile.push([x, y]);
            }
            wall.addWallCoord(tile);
        }
        owSubLevel.addWall(wall);
    }

}

function getWallWidth(mean, stddev, subSize) {
    let width = Math.floor(getRNG().getNormal(mean, stddev));
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

    let numSkipped = 0;
    features.forEach(feat => {
        if (feat === OW.WCAPITAL) {
            addMountainFortToSubLevel(feat, owSubLevel, subLevel);
        }
        else if (isMountainFort(base, feat)) {
            addMountainFortToSubLevel(feat, owSubLevel, subLevel);
        }
        else if (feat === OW.BTOWER || feat === OW.WTOWER) {
            addTowerToSubLevel(feat, owSubLevel, subLevel);
        }
        else if (feat === OW.WDUNGEON) {
            addDungeonToSubLevel(owSubLevel, subLevel);
        }
        else if (feat === OW.WVILLAGE) {
            addVillageToSubLevel(feat, owSubLevel, subLevel);
        }
        else if (feat === OW.MOUNTAIN) {
            addMountainToSubLevel(owSubLevel, subLevel);
        }
        else if (feat === OW.VTUNNEL) {
            addVertTunnelToSubLevel(owSubLevel, subLevel);
        }
        else if (feat === OW.MFORT) {
            addFortToSubLevel(owSubLevel, subLevel);
        }
        else {
            const msg = `Base: ${base}, ${feat}`;
            debug('addSubLevelFeat Skipped: ' + msg);
            ++numSkipped;
        }
    });

    if (numSkipped > 0) {
        debug(`Skipped ${numSkipped} features in addSubLevelFeatures`);
    }
}

function isMountainFort(base, feat) {
    return (base === OW.LL_WE || base === OW.LL_NS) &&
        (feat === OW.BTOWER || feat === OW.WTOWER);
}

/* Creates a fort which goes through a mountain wall. Adds also fort elements
 * into the Map.Level. */
function addMountainFortToSubLevel(feat, owSubLevel, subLevel) {
    const wall = owSubLevel.getWall();
    const start = wall.getWallStart();
    const end = wall.getWallEnd();
    const randPos = getRNG().getUniformInt(start, end);
    const coord = wall.getCoordAt(randPos);

    let type = null;
    switch (feat) {
        case OW.WTOWER: type = 'dwarven city'; break;
        case OW.BTOWER: type = 'abandoned fort'; break;
        case OW.WCAPITAL: type = 'capital'; break;
        case OW.BCAPITAL: type = 'dark city'; break;
        default: RG.err('overworld.js', 'addMountainFortToSubLevel',
            `Type ${feat} not supported`);
    }

    // Tile is a list of x,y coordinates
    subLevel.getMap().setBaseElems(coord, RG.ELEM.FORT);
    const fort = new RG.OverWorld.SubFeature(type, coord);
    fort.alignment = getAlignment(feat);
    owSubLevel.addFeature(fort);
}

function addTowerToSubLevel(feat, owSubLevel, subLevel) {
    let placed = false;
    const freeCells = subLevel.getMap().getFree();
    const freeXY = freeCells.map(cell => [cell.getX(), cell.getY()]);
    let coord = [];

    let watchdog = WATCHDOG_MAX;
    while (coord.length !== 9) {
        if (RG.Geometry.getFreeArea(freeXY, 3, 3, coord)) {
            placed = true;
        }
        if (coord.length < 9) {
            debug('addTowerToSubLevel. Too few coords. Retrying.');
            placed = false;
            coord = [];
        }
        if (--watchdog <= 0) {
            break;
        }
    }

    const type = feat === OW.BTOWER ? 'blacktower' : 'whitetower';

    if (placed) {
        debug('addTowerToSubLevel feat placed with ' +
            JSON.stringify(coord));
        subLevel.getMap().setBaseElems(coord, RG.ELEM.FORT);
        const tower = new RG.OverWorld.SubFeature(type, coord);
        tower.alignment = getAlignment(feat);
        owSubLevel.addFeature(tower);
    }

}

/* Returns the alignment for the given feature. */
function getAlignment(feat) {
    switch (feat) {
        case OW.BCAPITAL: // fallthrough
        case OW.BTOWER: // fallthrough
        case OW.BVILLAGE: return RG.ALIGN_EVIL;
        case OW.WCAPITAL: // fallthrough
        case OW.WTOWER: // fallthrough
        case OW.WVILLAGE: return RG.ALIGN_GOOD;
        default: return RG.ALIGN_NEUTRAL;
    }
}

/* Adds a dungeon to given sub-level. Each dungeon must be adjacent to a
 * mountain.*/
function addDungeonToSubLevel(owSubLevel, subLevel) {
    const coord = getAccessibleMountainCoord(subLevel);
    if (coord && coord.length > 0) {
        const dungeon = new RG.OverWorld.SubFeature('dungeon', coord);
        owSubLevel.addFeature(dungeon);
    }
}

function addFortToSubLevel(owSubLevel, subLevel) {
    const coord = getAccessibleMountainCoord(subLevel, false);
    if (coord && coord.length > 0) {
        const [x, y] = coord[0];
        const coordAround = RG.Geometry.getBoxAround(x, y, 1);
        const map = subLevel.getMap();
        const cellsAround = map.getCellsWithCoord(coordAround);

        const fort = new RG.OverWorld.SubFeature('fort', coord);
        const cellMap = {};
        cellsAround.forEach(c => {
            const dXdY = RG.dXdYUnit(c, coord[0]);
            const dir = RG.dXdYToDir(dXdY);
            cellMap[dir] = c.getBaseElem().getType();
        });
        fort.cellsAround = cellMap;
        owSubLevel.addFeature(fort);
    }
}

function getAccessibleMountainCoord(subLevel, edges = true) {
    let placed = false;
    const map = subLevel.getMap();
    const freeCells = map.getFree();
    let freeXY = freeCells.map(cell => cell.getXY());

    if (!edges) {
        const {cols, rows} = map;
        freeXY = freeXY.filter(xy => (
            (xy[0] !== 0 && xy[0] !== (cols - 1)) &&
            (xy[1] !== 0 && xy[1] !== (rows - 1))
        ));
    }

    // Sometimes no free cells are found, just skip this
    if (freeXY.length === 0) {
        return null;
    }

    let coord = [];
    let watchdog = 10 * WATCHDOG_MAX;
    while (!placed) {
        const xyRand = getRNG().arrayGetRand(freeXY);
        let box = [];
        try {
            box = RG.Geometry.getBoxAround(xyRand[0], xyRand[1], 1);
        }
        catch (e) {
            RG.diag(e);
            RG.diag(freeXY);
            map.debugPrintInASCII();
        }

        if (!edges) {
            const {cols, rows} = map;
            box = box.filter(xy => (
                (xy[0] !== 0 && xy[0] !== (cols - 1)) &&
                (xy[1] !== 0 && xy[1] !== (rows - 1))
            ));
        }

        /* eslint-disable */
        box.forEach(xyBox => {
            if (!placed) {
                if (map.hasXY(xyBox[0], xyBox[1])) {
                    const elem = map.getBaseElemXY(xyBox[0], xyBox[1]);
                    if (elem.getType() === MOUNTAIN_TYPE) {
                        coord = [xyBox];
                        placed = true;
                        map.setBaseElemXY(xyBox[0], xyBox[1], RG.ELEM.FLOOR);
                    }
                }
            }
        });
        /* eslint-enable */

        if (--watchdog <= 0) {
            break;
        }
    }
    return coord;
}

/* Adds a mountain to the given sub-level. Each mountain is placed on free map
 * cell. */
function addMountainToSubLevel(owSubLevel, subLevel) {
    let placed = false;
    const map = subLevel.getMap();
    const freeCells = map.getFreeNotOnEdge();
    const freeXY = freeCells.map(cell => [cell.getX(), cell.getY()]);

    // Sometimes no free cells are found, just skip this
    if (freeXY.length === 0) {
        return;
    }

    let coord = [];
    let watchdog = 10 * WATCHDOG_MAX;
    while (!placed) {
        const xy = getRNG().arrayGetRand(freeXY);
        coord = [xy];
        placed = true;
        if (--watchdog <= 0) {
            break;
        }
    }

    if (placed) {
        const mountain = new RG.OverWorld.SubFeature('mountain', coord);
        owSubLevel.addFeature(mountain);
    }

}

/* This creates a tunnel through mountain wall. This cannot fail, otherwise game
 * is unplayable. */
function addVertTunnelToSubLevel(owSubLevel, subLevel) {
    const map = subLevel.getMap();
    const cols = map.cols;
    const tunnelX = getRNG().getUniformInt(0, cols - 1);
    for (let y = 0; y < map.rows; y++) {
        map.setBaseElemXY(tunnelX, y, RG.ELEM.FLOOR);
    }
    // map.debugPrintInASCII();
}

/* Adds a village to the free square of the sub-level. */
function addVillageToSubLevel(feat, owSubLevel, subLevel) {
    const map = subLevel.getMap();
    const freeCells = map.getFreeNotOnEdge();
    if (freeCells.length > 0) {
        const freeXY = freeCells.map(cell => [cell.getX(), cell.getY()]);
        const coord = getRNG().arrayGetRand(freeXY);
        const village = new RG.OverWorld.SubFeature('village', [coord]);
        village.aligntment = getAlignment(feat);
        owSubLevel.addFeature(village);
    }
    else {
        RG.err('overworld.js', 'addVillageToSubLevel',
            'No free cells found in the level.');
    }
}


/* Creates a world configuration which can be given to Factory.World to build
 * the final game overworld with features, actors and items.
 *
 * Maps an MxN array of sub-levels (each |subX| X |subY| Map.Cells) into
 * |nTilesX| X |nTilesY| array of World.AreaTile levels (Map.Level).
 * Both levels are RG.Map.Level objects.
 */
RG.OverWorld.createWorldConf = function(
    ow, nSubLevelsX, nSubLevelsY, nTilesX, nTilesY
) {
    const worldConf = {
        name: 'The North',
        nAreas: 1,
        area: [{
            name: 'The Northern Realm',
            maxX: nTilesX, maxY: nTilesY,
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

    // const nSubLevelsX = subLevels.length;
    // const nSubLevelsY = subLevels[0].length;
    if (!nSubLevelsX || !nSubLevelsY) {
        const msg = `levels in X: ${nSubLevelsX}, Y: ${nSubLevelsY}`;
        RG.err('OverWorld', 'createWorldConf',
            `Illegal num of sublevels: ${msg}`);
    }

    const xMap = nSubLevelsX / nTilesX; // SubLevels per tile level in x-dir
    const yMap = nSubLevelsY / nTilesY; // SubLevels per tile level in y-dir

    debug(`nSubLevelsX: ${nSubLevelsX}, nTilesX: ${nTilesX}`);
    debug(`nSubLevelsY: ${nSubLevelsY}, nTilesY: ${nTilesY}`);
    debug(`MapX: ${xMap} levels to one tile`);
    debug(`MapY: ${yMap} levels to one tile`);

    // if xMap/yMap not integers, mapping will be wrong, thus we cannot round
    // the map values, just throw error
    if (!Number.isInteger(xMap)) {
        RG.err('OverWorld', 'createWorldConf',
            `xMap not int: ${xMap}, ` +
            `sub X :${nSubLevelsX}, nTilesX: ${nTilesX}`);
    }
    if (!Number.isInteger(yMap)) {
        RG.err('OverWorld', 'createWorldConf',
            `yMap not int: ${yMap}, ` +
            `sub Y :${nSubLevelsY}, nTilesY: ${nTilesY}`);
    }


    // Map values are OK, this loops through smaller overworld sublevels, which
    // are aligned with the large mountain wall creation
    for (let x = 0; x < nSubLevelsX; x++) {
        for (let y = 0; y < nSubLevelsY; y++) {

            // Find sub-level (Map.Level) indices + area level indices
            const slX = x % xMap;
            const slY = y % yMap;

            // AreaTile x,y pointing tile in the M by N AreaTiles
            const aX = Math.floor(x / xMap);
            const aY = Math.floor(y / yMap);

            const subLevel = ow.getSubLevel([x, y]);
            const subX = subLevel.getSubX();
            const subY = subLevel.getSubY();

            const coordObj = {xMap, yMap, nSubLevelsX, nSubLevelsY,
                x, y, slX, slY, aX, aY, subLevel, subX, subY};

            const [pX, pY] = getPlayerPosition(coordObj);
            const features = subLevel.getFeatures();

            Object.keys(features).forEach(type => {
                const featureArray = features[type];
                featureArray.forEach(feat => {

                    const coord = feat.coord;
                    if (!coord) {
                        RG.err('OverWorld', 'createWorldConf',
                            `coord must exist. feat: ${JSON.stringify(feat)}`);
                    }

                    if (feat.type === 'capital') {
                        addCapitalConfToArea(feat, coordObj, areaConf);
                    }
                    else if (feat.type === 'dwarven city') { // WTOWER
                        addDwarvenCityConfToArea(feat, coordObj, areaConf);
                    }
                    else if (feat.type === 'abandoned fort') {
                        addAbandonedFortToArea(feat, coordObj, areaConf);
                    }
                    else if (feat.type === 'dark city') {
                        addCityConfToArea(feat, coordObj, areaConf);
                    }
                    else if (cityTypesRe.test(feat.type)) {
                        addCityConfToArea(feat, coordObj, areaConf);
                    }
                    else if (feat.type === 'dungeon') {
                        const coord = feat.coord;

                        let featX = mapX(coord[0][0], slX, subX);
                        let featY = mapY(coord[0][1], slY, subY);
                        [featX, featY] = legalizeXY([featX, featY]);
                        const dName = RG.Names.getGenericPlaceName('dungeon');

                        const dungeonConf = LevelGen.getDungeonConf(dName);
                        Object.assign(dungeonConf,
                            {x: aX, y: aY, levelX: featX, levelY: featY,
                                owX: x, owY: y});
                        areaConf.nDungeons += 1;
                        addMaxDangerAndValue(pX, pY, dungeonConf);
                        areaConf.dungeon.push(dungeonConf);
                    }
                    else if (feat.type === 'mountain') {
                        const coord = feat.coord;

                        const featX = mapX(coord[0][0], slX, subX);
                        const featY = mapY(coord[0][1], slY, subY);
                        const mName = RG.Names.getUniqueName('mountain');

                        const mountConf = LevelGen.getMountainConf(mName);
                        Object.assign(mountConf,
                            {x: aX, y: aY, levelX: featX, levelY: featY,
                                owX: x, owY: y
                            });
                        addMaxDangerAndValue(pX, pY, mountConf);
                        areaConf.nMountains += 1;
                        areaConf.mountain.push(mountConf);
                    }
                    else if (feat.type === 'blacktower') {
                        debug('Adding final blacktower now');
                        addBlackTowerConfToArea(feat, coordObj, areaConf);
                    }
                });
            });
        }
    }

    addBiomeLocations(ow, areaConf);
    return worldConf;
};

/* Adds maxDanger and maxValue props into the configuration. At the moment, this
 * is based on the distance from player (+ plus some randomisation). */
function addMaxDangerAndValue(pX, pY, zoneConf) {
    const {x, y} = zoneConf;
    const dX = Math.abs(pX - x);
    const dY = Math.abs(pY - y);
    zoneConf.maxDanger = RG.getMaxDanger(dX, dY);
    zoneConf.maxValue = RG.getMaxValue(dX, dY);

    if (getRNG().getUniform() <= RG.EPIC_PROB) {
        zoneConf.isEpic = true;
        zoneConf.maxDanger *= 2;
        zoneConf.maxValue *= 3;
    }
}

/* Maps an x coord in a sub-level (Map.Level) into an x-y coordinate in
 * an AreaTile.
 * slX = sub-level x index in area tile. For example:
 * Assuming we have a matrix 3x3 of 10x10 sub-levels. Our area tile is now
 * 30x30. slX points then to x-pos of 3x3 matrix.
 */
function mapX(x, slX, subSizeX) {
    if (Number.isInteger(x)) {
        const res = x + slX * subSizeX;
        if (res >= TILE_SIZE_X) {
            console.warn(`WARNING mapX: ${res}, ${x}, ${slX}, ${subSizeX}`);
        }
        return res;
    }
    else {
        RG.err('overworld.js', 'mapX',
            `x must be an integer. Got: ${x}`);
    }
    return null;
}

/* Maps an y coord in a sub-level (Map.Level) into an x-y coordinate in
 * an AreaTile.
 * slY = sub-level y index in area tile. For longer expl, see mapY() above.
 */
function mapY(y, slY, subSizeY) {
    if (Number.isInteger(y)) {
        return y + slY * subSizeY;
    }
    else {
        RG.err('overworld.js', 'mapY',
            `y must be an integer. Got: ${y}`);
    }
    return null;
}

function addCapitalConfToArea(feat, coordObj, areaConf) {
    const capitalLevel = {stub: true, new: 'Capital', args: [200, 500, {}]};
    const cityConf = {
        name: 'Blashyrkh',
        nQuarters: 1,
        quarter: [{name: 'Capital cave', nLevels: 1}],
        owX: coordObj.x,
        owY: coordObj.y
    };

    cityConf.presetLevels = {
        'Blashyrkh.Capital cave': [{nLevel: 0, level: capitalLevel}]
    };
    addLocationToZoneConf(feat, coordObj, cityConf);

    const mainConn = {
        name: 'Capital cave',
        levelX: cityConf.levelX,
        levelY: cityConf.levelY,
        nLevel: 0,
        stairs: {getStairs: 1}
    };

    cityConf.connectToAreaXY[0].stairs = {getStairs: 0};
    cityConf.connectToAreaXY.push(mainConn);
    areaConf.nCities += 1;
    areaConf.city.push(cityConf);
}

function addDwarvenCityConfToArea(feat, coordObj, areaConf) {
    const fortConf = {};
    const dwarvenCity = {stub: true, new: 'DwarvenCity',
        args: [300, 250, fortConf]};
    const cityConf = {
        name: 'Dwarven City',
        nQuarters: 1,
        quarter: [{name: 'Fort main level', nLevels: 1}],
        owX: coordObj.x,
        owY: coordObj.y
    };
    cityConf.presetLevels = {
        'Dwarven City.Fort main level': [{nLevel: 0, level: dwarvenCity}]
    };

    addLocationToZoneConf(feat, coordObj, cityConf);
    const mainConn = {
        name: 'Fort main level',
        levelX: cityConf.levelX,
        levelY: cityConf.levelY,
        nLevel: 0,
        stairs: {getStairs: 1}
    };

    cityConf.connectToAreaXY[0].stairs = {getStairs: 0};
    cityConf.connectToAreaXY.push(mainConn);
    areaConf.nCities += 1;
    areaConf.city.push(cityConf);
}

function addAbandonedFortToArea(feat, coordObj, areaConf) {
    const fortConf = {};
    const fortLevel = {stub: true, new: 'AbandonedFort',
        args: [500, 200, fortConf]};
    const cityConf = {
        name: 'Abandoned fort',
        nQuarters: 1,
        quarter: [{name: 'Fort ground level', nLevels: 1}],
        owX: coordObj.x,
        owY: coordObj.y
    };

    cityConf.presetLevels = {
        'Abandoned fort.Fort ground level': [{nLevel: 0, level: fortLevel}]
    };
    addLocationToZoneConf(feat, coordObj, cityConf, false);
    const mainConn = {
        name: 'Fort ground level',
        levelX: cityConf.levelX,
        levelY: cityConf.levelY,
        nLevel: 0,
        stairs: {getStairs: 0}
    };

    cityConf.connectToAreaXY[0].stairs = {getStairs: 1};
    cityConf.connectToAreaXY.push(mainConn);
    areaConf.nCities += 1;
    areaConf.city.push(cityConf);

}

/* Adds a (normal) city configuration to the area. */
function addCityConfToArea(feat, coordObj, areaConf) {
    const coord = feat.coord;
    const nLevels = coord.length;
    feat.nLevels = nLevels;

    const cName = RG.Names.getUniqueName('city');
    const cityConf = LevelGen.getCityConf(cName, feat);
    cityConf.owX = coordObj.x;
    cityConf.owY = coordObj.y;

    cityConf.groupType = feat.type;
    addLocationToZoneConf(feat, coordObj, cityConf);
    cityConf.alignment = feat.alignment
        || getRNG().arrayGetRand(RG.ALIGNMENTS);

    if (feat.cellsAround) {
        if (!cityConf.constraint) {cityConf.constraint = {};}
        cityConf.constraint.cellsAround = feat.cellsAround;
    }

    areaConf.nCities += 1;
    areaConf.city.push(cityConf);

}

/* Adds location info the zone config. This info specifies where the zone is
 * located in the overworld map. */
function addLocationToZoneConf(feat, coordObj, zoneConf, vert = true) {
    const {slX, slY, aX, aY, subX, subY} = coordObj;
    const coord = feat.coord;
    const nLevels = coord.length;
    const lastCoord = nLevels - 1;

    // Where 1st (main) entrance is located on Map.Level
    let featX = mapX(coord[lastCoord][0], slX, subX);
    let featY = mapY(coord[lastCoord][1], slY, subY);
    if (!vert) {
      featX = mapX(coord[0][0], slX, subX) - 1;
      featY = mapY(coord[0][1], slY, subY);
    }
    if (featY >= TILE_SIZE_Y) {
        // const msg = `subXY ${x},${y}, tileXY: ${aX},${aY}`;
        featY -= 1;
    }

    // Extra connection because fort has 2 exits/entrances
    // Where 2nd (exit) entrance is located on Map.Level
    if (twoEntranceCityRe.test(feat.type)) {
        let connX = mapX(coord[0][0], slX, subX);
        let connY = mapY(coord[0][1], slY, subY);
        if (!vert) {
          connX = mapX(coord[lastCoord][0], slX, subX) + 1;
          connY = mapY(coord[lastCoord][1], slY, subY);
        }
        const nLast = zoneConf.nQuarters - 1;

        zoneConf.connectToAreaXY = [{
            name: zoneConf.quarter[nLast].name,
            levelX: connX,
            levelY: connY,
            nLevel: 0
        }];
    }

    zoneConf.x = aX;
    zoneConf.y = aY;
    zoneConf.levelX = featX;
    zoneConf.levelY = featY;
    debug(`Feat: ${feat.type}, ${aX},${aY} : ${featX},${featY}`);

}

/* Adds the black tower configuration to area. */
function addBlackTowerConfToArea(feat, coordObj, areaConf) {
    const {slX, slY, aX, aY, subX, subY} = coordObj;
    const coord = feat.coord;

    const xy = coord[7];
    if (RG.isNullOrUndef([xy])) {
        const msg = 'xy null/undef. feat: ' + JSON.stringify(feat);
        RG.err('overworld.js', 'addBlackTowerConfToArea', msg);
    }
    const featX = mapX(xy[0], slX, subX);
    const featY = mapY(xy[1], slY, subY);
    const tName = 'Elder raventhrone';

    const dungeonConf = LevelGen.getDungeonConf(tName);
    if (debugBlackTower) {
        addToPlayerPosition(dungeonConf, coordObj);
    }
    else {
        Object.assign(dungeonConf,
            {x: aX, y: aY, levelX: featX, levelY: featY});
    }
    debug(`BlackTower: ${aX},${aY}, x,y ${featX},${featY}`);

    dungeonConf.connectEdges = true;
    dungeonConf.branch[0].entranceLevel = 0;
    dungeonConf.branch[0].nLevels = 5;
    const nLastLevel = dungeonConf.branch[0].nLevels - 1;
    dungeonConf.branch[0].createPresetLevels = {
        new: 'BlackTower',
        args: [180, 90]
    };

    dungeonConf.branch[0].create = {
        actor: [
            {
                name: 'Thabba, Son of Ice',
                nLevel: nLastLevel
            },
            {
                name: 'Zamoned, Son of Frost',
                nLevel: nLastLevel
            }
        ]
    };
    areaConf.nDungeons += 1;
    areaConf.dungeon.push(dungeonConf);
}

/* For debugging. Adds the feature close to player starting position. */
function addToPlayerPosition(zoneConf, coordObj) {
    const [xPos, yPos] = getPlayerPosition(coordObj);
    Object.assign(zoneConf,
        {x: xPos, y: yPos, levelX: playerTileX, levelY: playerTileY});
    console.log('BlackTower was added to tile', xPos, yPos);
    console.log('BlackTower was added to level X,Y', playerTileX, playerTileY);
}

/* Returns the player position (tile X,Y), given the coordinate
 * object. */
function getPlayerPosition(coordObj) {
    const {xMap, yMap, nSubLevelsX, nSubLevelsY} = coordObj;
    const xPos = Math.floor(nSubLevelsX / xMap / 2);
    const yPos = nSubLevelsY / yMap - 1;
    return [xPos, yPos];
}

/* Map biomes from overworld into nTilesX * nTilesY space. */
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

function legalizeXY(xy) {
    let [x, y] = xy;
    if (x === 0) {x = 1;}
    if (x === TILE_SIZE_X - 1) {x -= 1;}
    if (y === 0) {y = 1;}
    if (y === TILE_SIZE_Y - 1) {y -= 1;}
    return [x, y];
}

/* Adds global features like roads to the overworld level map. */
function addGlobalFeatures(ow, owLevel, conf, coordMap) {

    // Find player x,y on level
    const [playerStartX, playerStartY] = getPlayerStartPos(ow, coordMap);

    // Find capital x,y on level
    const capSubTileXY = ow.getFeaturesByType(OW.WCAPITAL)[0];
    const capLevel = ow.getSubLevel(capSubTileXY);
    const capFeat = capLevel.getFeaturesByType('capital')[0];
    const subLevelXY = capFeat.getLastCoord();
    const [capX, capY] = coordMap.toOwLevelXY(capSubTileXY, subLevelXY);

    /*
    console.log(`World size: ${coordMap.worldCols}, ${coordMap.worldRows}`);
    console.log(`Player x,y: ${playerStartX}, ${playerStartY}`);
    console.log(`Capital x,y: ${owLevelXY}`);
    */
    const nPathSeg = 5;
    if (addMainRoads) {
        // Connect with road
        /* const path = RG.Path.getMinWeightPath(owLevel.getMap(),
            playerStartX, playerStartY, capX, capY);*/

        const path = RG.Path.getWeightPathSegmented(owLevel.getMap(),
            playerStartX, playerStartY, capX, capY, nPathSeg);

        if (path.length === 0) {
            RG.err('overworld.js', 'addGlobalFeatures',
                'No path from player to capital.');
        }
        RG.Path.addPathToMap(owLevel.getMap(), path);
    }

    // Create road from capital north to wtower south
    const capExitXY = capFeat.coord[0];
    const owLevelCapExitXY = coordMap.toOwLevelXY(capSubTileXY, capExitXY);
    const wTowerSubTileXY = ow.getFeaturesByType(OW.WTOWER)[0];
    const wTowerLevel = ow.getSubLevel(wTowerSubTileXY);
    const wTowerFeat = wTowerLevel.getFeaturesByType('dwarven city')[0];
    const wTowerSubLevelXY = wTowerFeat.getLastCoord();
    const wTowerLevelXY = coordMap.toOwLevelXY(wTowerSubTileXY,
        wTowerSubLevelXY);

    if (addMainRoads) {
        /* const pathCapWTower = RG.Path.getMinWeightPath(owLevel.getMap(),
            owLevelCapExitXY[0], owLevelCapExitXY[1],
            wTowerLevelXY[0], wTowerLevelXY[1]);*/
        const pathCapWTower = RG.Path.getWeightPathSegmented(owLevel.getMap(),
            owLevelCapExitXY[0], owLevelCapExitXY[1],
            wTowerLevelXY[0], wTowerLevelXY[1], nPathSeg);
        RG.Path.addPathToMap(owLevel.getMap(), pathCapWTower);
    }
}

/* Returns the player starting position as a global coordinate. */
function getPlayerStartPos(ow, coordMap) {
    const playerStartX = Math.floor(ow.getSizeX() / 2 - 1) * TILE_SIZE_X;
    const playerStartY = coordMap.worldRows - Math.floor(TILE_SIZE_Y / 2);
    return [playerStartX, playerStartY];
}

module.exports = RG.OverWorld;


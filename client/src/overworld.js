/*
 * Code to generate the game 2-D overworld.
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

import Capital from '../data/capital';

const RG = require('./rg');
RG.Names = require('../data/name-gen');
RG.LevelGen = require('../data/level-gen');
const OW = require('./overworld.map');

const $DEBUG = false;

RG.OverWorld = {};

const cityTypesRe = /(capital|city|fort|stronghold|village)/;
const twoEntranceCityRe = /(fort|stronghold|capital)/;

const getRandIn = RG.RAND.arrayGetRand.bind(RG.RAND);

/* Wall object inside the Overworld. Wall here means a huge wall of mountains.
 * */
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
        return OW.ILLEGAL_POS;
    };

    this.getWallStart = function() {
        if (type === 'vertical') {
            return this.coord[0][0][1];
        }
        if (type === 'horizontal') {
            return this.coord[0][0][0];
        }
        return OW.ILLEGAL_POS;
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

    this.getLastCoord = function() {
        if (this.coord.length > 0) {
            return this.coord[this.coord.length - 1];
        }
        return [];
    };

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

    this.getFeaturesByType = function(type) {
        if (this._features.hasOwnProperty(type)) {
            return this._features[type];
        }
        return [];
    };

};

/* Object to translate coordinates between different maps and levels.
 */
const CoordMap = function() {
    // Size of the large overworld Map.Level
    this.worldX = 0;
    this.worldY = 0;

    // Size of each AreaTile Map.Level
    this.nTilesX = 0;
    this.nTilesY = 0;

    // How many cols/rows one overworld square is in overworld Map.Level
    this.xMap = 0;
    this.yMap = 0;

};

/* Factory function to construct the overworld. Generally you want to call this
 * method.
 * @return RG.Map.Level.
 */
RG.OverWorld.createOverWorld = (conf = {}) => {
    const overworld = OW.createOverWorld(conf);
    return RG.OverWorld.createOverWorldLevel(overworld, conf);
};

RG.OverWorld.createOverWorldLevel = (overworld, conf) => {
    const coordMap = new CoordMap();
    coordMap.worldX = conf.worldX || 400;
    coordMap.worldY = conf.worldY || 400;

    // This will most likely fail, unless values have been set explicitly
    coordMap.nTilesX = conf.nTilesX || coordMap.worldX / 100;
    coordMap.nTilesY = conf.nTilesY || coordMap.worldY / 100;

    coordMap.xMap = Math.floor(coordMap.worldX / overworld.getSizeX());
    coordMap.yMap = Math.floor(coordMap.worldY / overworld.getSizeY());

    const worldLevelAndConf = buildMapLevel(overworld, coordMap);
    return worldLevelAndConf;
};


/* Creates the overworld level. Returns RG.Map.Level. */
function buildMapLevel(ow, coordMap) {
    const {worldX, worldY, xMap, yMap, nTilesX, nTilesY} = coordMap;

    const map = ow.getMap();
    const sizeY = map[0].length;
    const sizeX = map.length;
    const owLevel = RG.FACT.createLevel(RG.LEVEL_EMPTY, worldX, worldY);

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
            RG.Geometry.insertSubLevel(owLevel, subLevel, x0, y0);
        }
    }

    const conf = RG.OverWorld.createWorldConf(ow, subLevels, nTilesX, nTilesY);

    // Some global features (like roads) need to be added
    addGlobalFeatures(ow, owLevel, conf);

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
        RG.Map.Generator.addRandomSnow(subLevel.getMap(), 1.0);
    }
    else if (biomeType === 'alpine') {
        RG.Map.Generator.addRandomSnow(subLevel.getMap(), 0.5);
    }
    else if (biomeType === 'tundra') {
        RG.Map.Generator.addRandomSnow(subLevel.getMap(), 0.1);
    }
    else if (biomeType === 'taiga' || biomeType === 'forest') {
        const freeCells = subLevel.getMap().getFree();
        const conf = {
            ratio: 0.9
        };
        const forest = RG.FACT.createLevel('forest', cols, rows, conf);
        const forestMap = forest.getMap();
        freeCells.forEach(cell => {
            cell.setBaseElem(forestMap.getBaseElemXY(cell.getX(), cell.getY()));
        });

        // Add some water
        const addLakes = RG.RAND.getUniform();
        if (addLakes < 0.3) {
            const lakes = RG.FACT.createLevel('lakes', cols, rows, conf);
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
                map.setBaseElemXY(x, y, RG.ELEM.WALL);
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
                map.setBaseElemXY(x, y, RG.ELEM.WALL);
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
    });

}

function isMountainFort(base, feat) {
    return (base === OW.LL_WE || base === OW.LL_NS) &&
        (feat === OW.BTOWER || feat === OW.WTOWER);
}

function addMountainFortToSubLevel(feat, owSubLevel, subLevel) {
    const wall = owSubLevel.getWall();
    const start = wall.getWallStart();
    const end = wall.getWallEnd();
    const randPos = RG.RAND.getUniformInt(start, end);
    const coord = wall.getCoordAt(randPos);

    let type = feat === OW.WTOWER ? 'fort' : 'stronghold';
    type = feat === OW.WCAPITAL ? 'capital' : type;

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

    let watchdog = 0;
    while (coord.length !== 9) {
        if (RG.Geometry.getFreeArea(freeXY, 3, 3, coord)) {
            placed = true;
        }
        if (coord.length < 9) {
            console.log('addTowerToSubLevel. Too few coords. Retrying.');
            placed = false;
            coord = [];
        }
        if (watchdog === 100) {
            break;
        }
        ++watchdog;
    }

    const type = feat === OW.BTOWER ? 'blacktower' : 'whitetower';

    if (placed) {
        console.log('addTowerToSubLevel feat placed with ' +
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
        case OW.BTOWER:  // fallthrough
        case OW.BVILLAGE: return RG.ALIGN_EVIL;
        case OW.WCAPITAL: // fallthrough
        case OW.WTOWER: // fallthrough
        case OW.WVILLAGE: return RG.ALIGN_GOOD;
        default: return RG.ALIGN_NEUTRAL;
    }
}

function addDungeonToSubLevel(owSubLevel, subLevel) {
    let placed = false;
    const map = subLevel.getMap();
    const freeCells = map.getFree();
    const freeXY = freeCells.map(cell => [cell.getX(), cell.getY()]);

    let coord = [];
    let watchdog = 1000;
    while (!placed) {
        const xy = getRandIn(freeXY);
        const box = RG.Geometry.getBoxAround(xy[0], xy[1], 1);

        /* eslint-disable */
        box.forEach(xyBox => {
            if (!placed) {
                if (map.hasXY(xyBox[0], xyBox[1])) {
                    const elem = map.getBaseElemXY(xyBox[0], xyBox[1]);
                    if (elem.getType() === 'wall') {
                        coord = [xyBox];
                        placed = true;
                        map.setBaseElemXY(xyBox[0], xyBox[1], RG.ELEM.FLOOR);
                    }
                }
            }
        });
        /* eslint-enable */

        if (watchdog === 0) {
            break;
        }
        --watchdog;
    }

    if (placed) {
        const dungeon = new RG.OverWorld.SubFeature('dungeon', coord);
        owSubLevel.addFeature(dungeon);
    }
}

/* Adds a village to the free square of the sub-level. */
function addVillageToSubLevel(feat, owSubLevel, subLevel) {
    const map = subLevel.getMap();
    const freeCells = map.getFree();
    if (freeCells.length > 0) {
        const freeXY = freeCells.map(cell => [cell.getX(), cell.getY()]);
        const coord = RG.RAND.arrayGetRand(freeXY);
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
 * Maps an MxN array of sub-levels (each |subX| X |subY|) into
 * |nTilesX| X |nTilesY| array of World.AreaTile levels.
 * Both levels are RG.Map.Level objects.
 */
RG.OverWorld.createWorldConf = (ow, subLevels, nTilesX, nTilesY) => {
    const worldConf = {
        name: 'The North',
        nAreas: 1,
        area: [{name: 'The Northern Realm', maxX: nTilesX, maxY: nTilesY,
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

    const nSubLevelsX = subLevels.length;
    const nSubLevelsY = subLevels[0].length;
    if (!nSubLevelsX || !nSubLevelsY) {
        const msg = `levels in X: ${nSubLevelsX}, Y: ${nSubLevelsY}`;
        RG.err('OverWorld', 'createWorldConf',
            `Illegal num of sublevels: ${msg}`);
    }

    const xMap = nSubLevelsX / nTilesX; // SubLevels per tile level in x-dir
    const yMap = nSubLevelsY / nTilesY; // SubLevels per tile level in y-dir

    if ($DEBUG) {
        console.log(`nSubLevelsX: ${nSubLevelsX}, nTilesX: ${nTilesX}`);
        console.log(`nSubLevelsY: ${nSubLevelsY}, nTilesY: ${nTilesY}`);
        console.log(`MapX: ${xMap} levels to one tile`);
        console.log(`MapY: ${yMap} levels to one tile`);
    }

    // if xMap/yMap not integers, mapping will be wrong, thus we cannot round
    // the map values, just throw error
    if (!Number.isInteger(xMap)) {
        RG.err('OverWorld', 'createWorldConf',
            `xMap not int: ${xMap}, sub X :${nSubLevelsX}, nTilesX: ${nTilesX}`);
    }
    if (!Number.isInteger(yMap)) {
        RG.err('OverWorld', 'createWorldConf',
            `yMap not int: ${yMap}, sub Y :${nSubLevelsY}, nTilesY: ${nTilesY}`);
    }

    // Map values are OK, this loops through smaller overworld sublevels, which
    // are aligned with the mountain wall creation
    for (let x = 0; x < nSubLevelsX; x++) {
        for (let y = 0; y < nSubLevelsY; y++) {

            // Find sub-level (Map.Level) indices + area level indices
            const slX = x % xMap;
            const slY = y % yMap;

            // Tile coordinate pointing tile in the M by N AreaTiles
            const aX = Math.floor(x / xMap);
            const aY = Math.floor(y / yMap);

            const subLevel = ow.getSubLevel([x, y]);
            const subX = subLevel.getSubX();
            const subY = subLevel.getSubY();

            const coordObj = {xMap, yMap, nSubLevelsX, nSubLevelsY,
                x, y, slX, slY, aX, aY, subLevel, subX, subY};
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
                    else if (cityTypesRe.test(feat.type)) {
                        addCityConfToArea(feat, coordObj, areaConf);
                    }
                    else if (feat.type === 'dungeon') {
                        const coord = feat.coord;

                        const featX = mapX(coord[0][0], slX, subX);
                        const featY = mapY(coord[0][1], slY, subY);
                        const dName = RG.Names.getGenericPlaceName('dungeon');

                        const dungeonConf = RG.LevelGen.getDungeonConf(dName);
                        Object.assign(dungeonConf,
                            {x: aX, y: aY, levelX: featX, levelY: featY});
                        areaConf.nDungeons += 1;
                        areaConf.dungeon.push(dungeonConf);
                    }
                    else if (feat.type === 'blacktower') {
                        addBlackTowerConfToArea(feat, coordObj, areaConf);
                    }
                });
            });
        }
    }

    addBiomeLocations(ow, areaConf);
    return worldConf;
};

/* Maps an x coord in a sub-level (Map.Level) into an x-y coordinate in
 * an AreaTile.
 * slX = sub-level x index in area tile. For example:
 * Assuming we have a matrix 3x3 of 10x10 sub-levels. Our area tile is now
 * 30x30. slX points then to x-pos of 3x3 matrix.
 */
function mapX(x, slX, subSizeX) {
    if (Number.isInteger(x)) {
        const res = x + slX * subSizeX;
        if (res >= 100 ) {
            console.log(`WARNING mapX: ${res}, ${x}, ${slX}, ${subSizeX}`);
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
    const capitalConf = {

    };
    const capitalLevel = new Capital(200, 600, capitalConf).getLevel();

    const cityConf = {
        name: 'Blashyrkh',
        nQuarters: 1,
        quarter: [{name: 'Main area', nLevels: 1}]
    };

    cityConf.presetLevels = {
        'Blashyrkh.Main area': [{nLevel: 0, level: capitalLevel}]
    };

    addLocationToZoneConf(feat, coordObj, cityConf);
    const mainConn = {
        name: 'Main area',
        levelX: cityConf.levelX,
        levelY: cityConf.levelY,
        nLevel: 0,
        stairs: capitalLevel.getStairs()[0]
    };

    cityConf.connectToXY[0].stairs = capitalLevel.getStairs()[0];
    cityConf.connectToXY.push(mainConn);
    areaConf.nCities += 1;
    areaConf.city.push(cityConf);
}

/* Adds a city configuration to the area. */
function addCityConfToArea(feat, coordObj, areaConf) {
    // const {slX, slY, subX, subY} = coordObj;
    const coord = feat.coord;
    const nLevels = coord.length;
    feat.nLevels = nLevels;

    const cName = RG.Names.getUniqueCityName();
    const cityConf = RG.LevelGen.getCityConf(cName, feat);

    cityConf.groupType = feat.type;
    addLocationToZoneConf(feat, coordObj, cityConf);
    cityConf.alignment = feat.alignment
        || getRandIn(RG.ALIGNMENTS);
    areaConf.nCities += 1;
    areaConf.city.push(cityConf);

}

/* Adds location info the zone config. This info specifies where the zone is
 * located in the overworld map. */
function addLocationToZoneConf(feat, coordObj, zoneConf) {
    const {x, y, slX, slY, aX, aY, subX, subY} = coordObj;
    const coord = feat.coord;
    const nLevels = coord.length;
    const lastCoord = nLevels - 1;

    // Where 1st (main) entrance is located on Map.Level
    const featX = mapX(coord[lastCoord][0], slX, subX);
    let featY = mapY(coord[lastCoord][1], slY, subY) + 1;
    if (featY >= 100) {
        const msg = `subXY ${x},${y}, tileXY: ${aX},${aY}`;
        console.log(`${msg} reduce the featY for ${feat.type}`);
        featY -= 1;
    }

    // Extra connection because fort has 2 exits/entrances
    // Where 2nd (exit) entrance is located on Map.Level
    if (twoEntranceCityRe.test(feat.type)) {
        const connX = mapX(coord[0][0], slX, subX);
        const connY = mapY(coord[0][1], slY, subY) - 1;
        const nLast = zoneConf.nQuarters - 1;

        zoneConf.connectToXY = [{
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

}

/* Adds the black tower configuration to area. */
function addBlackTowerConfToArea(feat, coordObj, areaConf) {
    const {xMap, yMap, nSubLevelsX, nSubLevelsY,
        x, y, slX, slY, aX, aY, subX, subY} = coordObj;
    const coord = feat.coord;

    const xy = coord[7];
    if (RG.isNullOrUndef([xy])) {
        const msg = 'xy null/undef. feat: ' + JSON.stringify(feat);
        RG.err('overworld.js', 'addBlackTowerConfToArea', msg);
    }
    // const featX = mapX(xy[0], slX, subX);
    // const featY = mapY(xy[1], slY, subY);
    const tName = 'Elder raventhrone';

    const midX = Math.floor(nSubLevelsX / xMap / 2);
    const yPos = nSubLevelsY / yMap - 1;

    const dungeonConf = RG.LevelGen.getDungeonConf(tName);
    Object.assign(dungeonConf,
        // TODO change after debugging is done
        // {x: aX, y: aY, levelX: featX, levelY: featY});
        {x: midX, y: yPos, levelX: 1, levelY: 1});
    dungeonConf.dungeonType = 'castle';
    dungeonConf.wallType = 'wallice';
    dungeonConf.tilesX = 20;
    dungeonConf.tilesY = 20;
    dungeonConf.maxDanger = 50;
    dungeonConf.constraint = {};
    dungeonConf.constraint.actor = actor => (
        actor.type !== 'human' && actor.danger >= 6 &&
        actor.base === 'WinterBeingBase'
    );
    dungeonConf.constraint.item = item => (
        item.value >= 65 || (/Gold/).test(item.name)
    );
    dungeonConf.constraint.food = () => false;
    dungeonConf.constraint.gold = () => false;
    dungeonConf.branch[0].create = {
        actor: [{
            name: 'Thabba, Son of Ice',
            nLevel: dungeonConf.branch[0].nLevels - 1}
        ]
    };
    areaConf.nDungeons += 1;
    areaConf.dungeon.push(dungeonConf);
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

/* Adds global features like roads to the overworld level map. */
function addGlobalFeatures(ow, level, conf) {

    // Find player x,y on level
    // Find capital x,y on level
    const capLevel = ow.getSubLevelsWithFeature(OW.WCAPITAL)[0];
    const capFeat = capLevel.getFeaturesByType('capital')[0];
    const capXY = capFeat.getLastCoord();
    // Connect with road

}

module.exports = RG.OverWorld;


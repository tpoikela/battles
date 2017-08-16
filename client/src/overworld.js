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
RG.LevelGen = require('../data/level-gen');

const OW = require('./overworld.map');

const $DEBUG = true;

RG.OverWorld = {};

const cityTypesRe = /(fort|city|village)/;

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

/* Factory function to construct the overworld. Generally you want to call this
 * method.
 * @return RG.Map.Level.
 */
RG.OverWorld.createOverWorld = function(conf = {}) {
    const overworld = OW.createOverWorld(conf);
    return RG.createOverWorldLevel(overworld, conf);
};

RG.OverWorld.createOverWorldLevel = function(overworld, conf) {
    const worldX = conf.worldX || 400;
    const worldY = conf.worldY || 400;

    // This will most likely fail, unless values have been set explicitly
    const areaX = conf.areaX || worldX / 100;
    const areaY = conf.areaY || worldY / 100;

    const xMap = Math.floor(worldX / overworld.getSizeX());
    const yMap = Math.floor(worldY / overworld.getSizeY());

    const worldLevel = createOverWorldLevel(
        overworld, worldX, worldY, xMap, yMap, areaX, areaY);

    return worldLevel;

};


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

    const conf = RG.OverWorld.createWorldConf(ow, subLevels, areaX, areaY);

    return [level, conf];
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
        if ((base === OW.LL_WE || base === OW.LL_NS) && feat === OW.WTOWER) {
            addMountainFortToSubLevel(owSubLevel, subLevel);
        }
        else if (feat === OW.BTOWER) {
            addBlackTowerToSubLevel(owSubLevel, subLevel);
        }
        else if (feat === OW.DUNGEON) {
            addDungeonToSubLevel(owSubLevel, subLevel);
        }
        else if (feat === OW.VILLAGE) {
            addVillageToSubLevel(owSubLevel, subLevel);
        }
    });
}

function addMountainFortToSubLevel(owSubLevel, subLevel) {
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

function addBlackTowerToSubLevel(owSubLevel, subLevel) {
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
                        map.setBaseElemXY(xyBox[0], xyBox[1], RG.FLOOR_ELEM);
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
function addVillageToSubLevel(owSubLevel, subLevel) {
    const map = subLevel.getMap();
    const freeCells = map.getFree();
    if (freeCells.length > 0) {
        const freeXY = freeCells.map(cell => [cell.getX(), cell.getY()]);
        const coord = RG.RAND.arrayGetRand(freeXY);
        const village = new RG.OverWorld.SubFeature('village', [coord]);
        owSubLevel.addFeature(village);
    }
    else {
        RG.err('overworld.js', 'addVillageToSubLevel',
            'No free cells found in the level.');
    }
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

            const features = subLevel.getFeatures();
            Object.keys(features).forEach(type => {
                const featureArray = features[type];
                featureArray.forEach(feat => {

                    const coord = feat.coord;
                    if (!coord) {
                        RG.err('OverWorld', 'createWorldConf',
                            `coord must exist. feat: ${JSON.stringify(feat)}`);
                    }

                    if (cityTypesRe.test(feat.type)) {
                        const coord = feat.coord;
                        const nLevels = coord.length;
                        const lastCoord = nLevels - 1;
                        feat.nLevels = nLevels;

                        // Extra connection because fort has 2 exits/entrances
                        const connX = mapX(coord[0][0], slX, subX);
                        const connY = mapY(coord[0][1], slY, subY) - 1;

                        // Where 1st entrance is located on Map.Level
                        const featX = mapX(coord[lastCoord][0], slX, subX);
                        const featY = mapY(coord[lastCoord][1], slY, subY) + 1;

                        const cName = RG.Names.getUniqueCityName();
                        const cityConf = RG.LevelGen.getCityConf(cName, feat);
                        cityConf.connectToXY = [{
                            name: cityConf.quarter[cityConf.nQuarters - 1].name,
                            levelX: connX,
                            levelY: connY,
                            nLevel: 0
                        }];
                        cityConf.x = aX;
                        cityConf.y = aY;
                        cityConf.levelX = featX;
                        cityConf.levelY = featY;
                        areaConf.nCities += 1;
                        areaConf.city.push(cityConf);
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
                    /* if (feat.type === 'blacktower') {

                    }*/
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


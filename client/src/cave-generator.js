
/* Contains code to generate various types of caverns in the game.
 */

const RG = require('./rg.js');
RG.MapGenerator = require('./map.generator');
RG.Map = require('./map.js');
RG.Map.Level = require('./level');
// const Random = require('./random');
const DungeonPopulate = require('./dungeon-populate');
const LevelGenerator = require('./level-generator');
const Path = require('./path');
const Geometry = require('./geometry');

const RNG = RG.Random.getRNG();

const CaveGenerator = function() {
    LevelGenerator.call(this);
    this.shouldRemoveMarkers = true;
};
RG.extend2(CaveGenerator, LevelGenerator);

const Miners = {};

CaveGenerator.getOptions = function() {
    return {
        dungeonType: 'Lair',
        maxDanger: 5, maxValue: 100,
        isCollapsed: false
    };
};

/* Main function to call when a cave is created. */
CaveGenerator.prototype.create = function(cols, rows, conf) {
    if (RG.isNullOrUndef([cols, rows])) {
        RG.err('CaveGenerator', 'create',
            `cols or rows not defined: cols: ${cols} / rows: ${rows}`);
    }
    const level = this._createLevel(cols, rows, conf);

    this.addStairsLocations(level);

    this._addSpecialFeatures(level, conf);

    this._addEncounters(level, conf);

    conf.preserveMarkers = false;
    this.removeMarkers(level, conf);
    return level;
};

/* Creates the Map.Level object with walls/floor and cave-flavor. */
CaveGenerator.prototype._createLevel = function(cols, rows, conf) {
    const mapOpts = this._createMapOptions(cols, rows, conf);
    const mapgen = new RG.MapGenerator();
    const level = new RG.Map.Level(cols, rows);
    mapgen.setGen('cave', cols, rows);

    const mapObj = mapgen.createCave(cols, rows, mapOpts);
    level.setMap(mapObj.map);
    this.setLevelExtras(level, mapObj.mapGen);
    if (mapOpts.isCollapsed) {
        level.getExtras().isCollapsed = true;
    }
    return level;
};

CaveGenerator.prototype.setLevelExtras = function(level, mapGen) {
    const extras = mapGen.getMapData();
    // Need to uniquify start points
    extras.startPoints = RG.uniquifyCoord(extras.startPoints);
    level.setExtras(extras);
};

/* Creates the options how to generate the level map. This depends on the type
 * of cave that needs to be generated. */
CaveGenerator.prototype._createMapOptions = function(cols, rows, conf) {
    let {dungeonType} = conf;
    let opts = {};
    const miners = getMiners(cols, rows);

    dungeonType = dungeonType.capitalize();
    switch (dungeonType) {
        case 'Cave': opts = Miners.getRandOpts(cols, rows, 1, 3); break;
        case 'Grotto': opts = Miners.getRandOpts(cols, rows, 2, 4); break;
        case 'Lair': {
            const edgeMiners = Miners.getMinersAndExclude(cols, rows, ['C']);
            const edgeMiner = RNG.arrayGetRand(edgeMiners);
            const lairMiners = [edgeMiner, miners.C];
            opts = Miners.getOptsWithMiners(lairMiners);
            break;
        }
        case 'Cavern': opts = Miners.getRandOpts(cols, rows, 3, 9); break;
        default: opts = Miners.getRandOpts(cols, rows);
    }

    let isCollapsed = RNG.getUniform() <= 0.1;
    if (conf.isCollapsed === false) {
        isCollapsed = false;
    }
    if (isCollapsed || conf.isCollapsed) {
        opts.floorElem = RG.ELEM.CHASM;
        opts.isCollapsed = true;
    }

    return opts;
};

CaveGenerator.prototype.addStairsLocations = function(level) {
    const extras = level.getExtras();
    const {startPoints} = extras;
    let startPoint = null;
    let endPoint = null;

    if (startPoints.length > 1) {
        [startPoint, endPoint] = RNG.getUniqueItems(startPoints, 2);
    }
    else {
        startPoint = startPoints[0];
        // End point must be determined from the map itself
        endPoint = this.getEndPointFromMap(level, startPoint);
    }

    this.addStartAndEndPoint(level, startPoint, endPoint);

    extras.startPoint = startPoint;
    if (endPoint) {extras.endPoint = endPoint;}

    // Process other points of interest
    const points = startPoints.slice();
    extras.points = [];
    points.splice(points.indexOf(startPoint), 1);
    points.splice(points.indexOf(endPoint), 1);
    points.forEach(point => {
        const [eX, eY] = point;
        const pointMarker = new RG.Element.Marker('>');
        pointMarker.setTag('end_point');
        level.addElement(pointMarker, eX, eY);
        extras.points.push(point);
    });
};

/* Adds features like extra obstacles etc. */
CaveGenerator.prototype._addSpecialFeatures = function(level) {
    if (level.getExtras().isCollapsed) {
        this._createCollapsedLevel(level);
    }
};

CaveGenerator.prototype.getEndPointFromMap = function(level, startPoint) {
    const map = level.getMap();
    const freeCellMap = this.getMapOfFreeCells(level);
    return this.getRandomEndPoint(map, startPoint, freeCellMap);
};

CaveGenerator.prototype.getMapOfFreeCells = function(level) {
    const map = level.getMap();
    const nonWallCells = map.getCells(c => (
        !c.getBaseElem().isWall()
    ));
    const freeCellMap = {};
    nonWallCells.forEach(cell => {
        freeCellMap[cell.getKeyXY()] = cell;
    });
    return freeCellMap;
};

CaveGenerator.prototype._createCollapsedLevel = function(level) {
    const extras = level.getExtras();
    const map = level.getMap();
    let {endPoint} = extras;
    const {startPoint} = extras;

    const freeCellMap = this.getMapOfFreeCells(level);

    if (!endPoint) { // Define random endpoint
        endPoint = this.getRandomEndPoint(map, startPoint, freeCellMap);
    }

    if (startPoint && endPoint) {
        const path = this.createPath(map, startPoint, endPoint);
        path.forEach(xy => {
            delete freeCellMap[xy[0] + ',' + xy[1]];
        });
    }

    // Add points used as digger start points
    const pathPoints = [startPoint, endPoint];
    if (extras.points) {
        extras.points.forEach(newPoint => {
            const otherPoint = RNG.arrayGetRand(pathPoints);
            const path = this.createPath(map, newPoint, otherPoint);
            path.forEach(xy => {
                delete freeCellMap[xy[0] + ',' + xy[1]];
            });
            pathPoints.push(newPoint);
        });
    }

    // Add other misc points into the level
    const numPoints = RNG.getUniformInt(1, 10);
    for (let i = 0; i < numPoints; i++) {
        const newPoint = this.getRandomPoint(map, startPoint, freeCellMap);

        if (newPoint) {
            const otherPoint = RNG.arrayGetRand(pathPoints);
            const path = this.createPath(map, newPoint, otherPoint);
            path.forEach(xy => {
                delete freeCellMap[xy[0] + ',' + xy[1]];
            });
            pathPoints.push(newPoint);
        }
    }

    // const nPoints = pathPoints.length;
};

CaveGenerator.prototype.createPath = function(map, startPoint, endPoint) {
    const wallCb = (x, y) => (
        map.hasXY(x, y) && !map.getBaseElemXY(x, y).getType().match(/wall/)
    );
    const [sX, sY] = startPoint;
    const [eX, eY] = endPoint;
    const path = Path.getShortestPath(sX, sY, eX, eY, wallCb);

    const result = [];

    path.forEach(xy => {
        const {x, y} = xy;
        const coord = Geometry.getCrossAround(x, y, 1, true);
        coord.forEach(coordXY => {
            const [cx, cy] = coordXY;
            const cell = map.getCell(cx, cy);
            if (cell.getBaseElem().getType() === 'chasm') {
                map.setBaseElemXY(cx, cy, RG.ELEM.FLOOR_CAVE);
                result.push([cx, cy]);
            }
        });
    });

    return result;
};

CaveGenerator.prototype.getRandomEndPoint = function(map, startPoint,
    freeCellMap) {
    const wallCb = (x, y) => (
        map.hasXY(x, y) && !map.getBaseElemXY(x, y).getType().match(/wall/)
    );
    const [sX, sY] = startPoint;
    let endPoint = null;

    const minDist = map.cols > map.rows ? map.rows : map.cols;
    let currDist = 0;
    let watchdog = 10;

    const freeCells = Object.values(freeCellMap);
    let currPath = null;

    while (currDist < minDist) {
        const endCell = RNG.arrayGetRand(freeCells);
        const [eX, eY] = endCell.getXY();
        endPoint = [eX, eY];
        currPath = Path.getShortestPath(eX, eY, sX, sY, wallCb);
        currDist = currPath.length;
        if (watchdog === 0) {break;}
        --watchdog;
    }

    // Delete each path cell from list of free cells
    if (endPoint && currPath) {
        currPath.forEach(xy => {
            const key = xy.x + ',' + xy.y;
            delete freeCellMap[key];
        });
    }

    return endPoint;
};

CaveGenerator.prototype.getRandomPoint = function(map, startPoint,
    freeCellMap) {
    const wallCb = (x, y) => (
        map.hasXY(x, y) && !map.getBaseElemXY(x, y).getType().match(/wall/)
    );
    const [sX, sY] = startPoint;
    const freeCells = Object.values(freeCellMap);

    const endCell = RNG.arrayGetRand(freeCells);
    const [eX, eY] = endCell.getXY();
    const point = [eX, eY];
    const currPath = Path.getShortestPath(eX, eY, sX, sY, wallCb);

    // Delete each path cell from list of free cells
    if (point && currPath) {
        currPath.forEach(xy => {
            const key = xy.x + ',' + xy.y;
            delete freeCellMap[key];
        });
    }

    return point;
};

CaveGenerator.prototype._addEncounters = function(level, conf) {
    const {dungeonType} = conf;
    if (dungeonType === 'Lair') {
        this._addLairBoss(level, conf);
    }

    this.populatePoints(level, conf);
};

CaveGenerator.prototype._addLairBoss = function(level, conf) {
    const {maxDanger, maxValue} = conf;
    const endPoint = level.getExtras().endPoint;
    if (endPoint) {
        const populate = new DungeonPopulate({});
        if (level.getExtras().isCollapsed) {
            populate.setActorFunc(actor => actor.flying);
        }
        populate.addPointGuardian(level, endPoint, maxDanger + 4);
        populate.addMainLoot(level, endPoint, maxValue);
    }
    else {
        const json = JSON.stringify(level.getExtras());
        RG.err('CaveGenerator', '_addLairBoss',
            'No endPoint in extras: ' + json);
    }
};

/* Processes points of interest other than start/end points. */
CaveGenerator.prototype.populatePoints = function(level, conf) {
    const extras = level.getExtras();
    const {points} = extras;
    const populate = new DungeonPopulate({});
    points.forEach(point => {
        populate.populatePoint(level, point, conf);
    });
};

/* Returns an object containing the base miners for different directions. */
function getMiners(cols, rows, border = 1) {
    const midX = Math.round(cols / 2);
    const midY = Math.round(rows / 2);

    // Need -2 to preserve wall border of level
    const endX = cols - 1 - border;
    const endY = rows - 1 - border;

    const cbTerminateSouth = (x, y, miner) => {
        if (y === endY) {
            miner.dirWeights = {};
        }
    };
    const cbTerminateNorth = (x, y, miner) => {
        if (y === 1) {
            miner.dirWeights = {};
        }
    };

    const miners = {
        N: {x: midX, y: 1, dirWeights: {E: 1, W: 1, S: 5, SE: 5, SW: 5},
            dugCallback: cbTerminateSouth
        },
        S: {x: midX, y: endY, dirWeights: {E: 1, W: 1, N: 5, NE: 5, NW: 5},
            dugCallback: cbTerminateNorth
        },
        E: {x: endX, y: midY, dirWeights: {N: 1, S: 1, NW: 5, W: 5, SW: 5}},
        W: {x: 1, y: midY, dirWeights: {N: 1, S: 1, NE: 5, E: 5, SE: 5}},
        NE: {x: endX, y: 1, dirWeights: {NW: 1, W: 10, SW: 5, S: 10}},
        NW: {x: 1, y: 1, dirWeights: {NE: 1, E: 10, SE: 5, S: 10}},
        SE: {x: endX, y: endY, dirWeights: {SW: 1, W: 10, NW: 5, N: 10}},
        SW: {x: 1, y: endY, dirWeights: {SE: 1, E: 10, NE: 5, N: 10}},
        C: { // Central miner, all equal weights
            x: midX, y: midY,
            dirWeights: {N: 1, S: 1, E: 2, W: 2, NE: 1, SE: 1, NW: 1, SW: 1}
        }
    };
    return miners;
}
Miners.getMiners = getMiners;

function getMinersAndExclude(cols, rows, excluded) {
    const miners = getMiners(cols, rows);
    excluded.forEach(key => {delete miners[key];});
    return Object.values(miners);
}
Miners.getMinersAndExclude = getMinersAndExclude;

function getOptsWithMiners(miners) {
    const firstMiner = miners[0];
    const opts = {
        startX: firstMiner.x, startY: firstMiner.y,
        dirWeights: firstMiner.dirWeights
    };
    const addMiners = [];
    for (let i = 1; i < miners.length; i++) {
        addMiners.push(miners[i]);
    }
    opts.addMiners = addMiners;
    return opts;
}
Miners.getOptsWithMiners = getOptsWithMiners;

/* Returns map options with random number of miners. */
function getRandOpts(cols, rows, min = 1, max = 9) {
    const miners = getMiners(cols, rows);
    const minerValues = Object.values(miners);

    const nMiners = RNG.getUniformInt(min, max);
    const randMiners = [];
    for (let i = 0; i < nMiners; i++) {
        const randMiner = RNG.arrayGetRand(minerValues);
        randMiners.push(randMiner);
    }
    return getOptsWithMiners(randMiners);
}
Miners.getRandOpts = getRandOpts;

/* Returns options with miners placed on corners. */
function getMinersCorners(cols, rows, miners) {
    if (!miners) {
        miners = getMiners(cols, rows);
    }
    const minersCorners = {
        cols, rows,
        // maxMinersCreated: 100,
        dirWeights: miners.NW.dirWeights,
        addMiners: [
            miners.SW,
            miners.NE,
            miners.SE
        ],
        startX: miners.NW.x, startY: miners.NW.y
    };
    return minersCorners;
}
Miners.getMinersCorners = getMinersCorners;

/* Returns options containing miners in each cardinal direction NSEW. */
function getMinersNSEW(cols, rows, miners) {
    if (!miners) {
        miners = getMiners(cols, rows);
    }
    const minersNSEW = {
        cols: 100, rows: 100,
        maxMinersCreated: 100,

        startX: miners.N.x, startY: miners.N.y,
        dirWeights: miners.N.dirWeights,

        addMiners: [
            miners.S,
            miners.E,
            miners.W
        ]
    };
    return minersNSEW;
}
Miners.getMinersNSEW = getMinersNSEW;

module.exports = {CaveGenerator, Miners};

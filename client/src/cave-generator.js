
/* Contains code to generate various types of caverns in the game.
 */

const RG = require('./rg.js');
RG.MapGenerator = require('./map.generator');
RG.Map = require('./map.js');
RG.Map.Level = require('./level');
// const Random = require('./random');
const DungeonPopulate = require('./dungeon-populate');

const CaveGenerator = function() {
};

const Miners = {};

CaveGenerator.getOptions = function() {
    return {
        dungeonType: 'Lair',
        maxDanger: 5, maxValue: 100
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

    this._addEncounters(level, conf);

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
    return level;
};

CaveGenerator.prototype.setLevelExtras = function(level, mapGen) {
    const extras = mapGen.getMapData();
    level.setExtras(extras);
};

CaveGenerator.prototype._createMapOptions = function(cols, rows, conf) {
    const {dungeonType} = conf;
    let opts = {};

    const miners = getMiners(cols, rows);

    switch (dungeonType) {
        case 'Cave': opts = Miners.getRandOpts(cols, rows, 1, 3); break;
        case 'Grotto': opts = Miners.getRandOpts(cols, rows, 2, 4); break;
        case 'Lair': {
            const edgeMiners = Miners.getMinersAndExclude(cols, rows, ['C']);
            const edgeMiner = RG.RAND.arrayGetRand(edgeMiners);
            const lairMiners = [edgeMiner, miners.C];
            opts = Miners.getOptsWithMiners(lairMiners);
            break;
        }
        case 'Cavern': opts = Miners.getRandOpts(cols, rows, 3, 9); break;
        default: opts = Miners.getRandOpts(cols, rows);
    }

    return opts;
};

CaveGenerator.prototype.addStairsLocations = function(level) {
    const extras = level.getExtras();
    const {startPoints} = extras;
    let startPoint = null;
    let endPoint = null;

    if (startPoints.length > 1) {
        [startPoint, endPoint] = RG.RAND.getUniqueItems(startPoints, 2);
    }
    else {
        startPoint = startPoints[0];
    }

    if (startPoint) {
        const [sX, sY] = startPoint;
        const startPointElem = new RG.Element.Marker('<');
        startPointElem.setTag('start_point');
        level.addElement(startPointElem, sX, sY);
    }

    if (endPoint) {
        const [eX, eY] = endPoint;
        const goalPoint = new RG.Element.Marker('>');
        goalPoint.setTag('end_point');
        level.addElement(goalPoint, eX, eY);
    }
    extras.startPoint = startPoint;
    if (endPoint) {extras.endPoint = endPoint;}
};

CaveGenerator.prototype._addEncounters = function(level, conf) {
    const {dungeonType} = conf;
    if (dungeonType === 'Lair') {
        this._addLairBoss(level, conf);
    }
};

CaveGenerator.prototype._addLairBoss = function(level, conf) {
    const {maxDanger, maxValue} = conf;
    const endPoint = level.getExtras().endPoint;
    if (endPoint) {
        const populate = new DungeonPopulate({});
        populate.addEndPointGuardian(level, maxDanger);
        populate.addMainLoot(level, endPoint, maxValue);
    }
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

    const nMiners = RG.RAND.getUniformInt(min, max);
    const randMiners = [];
    for (let i = 0; i < nMiners; i++) {
        const randMiner = RG.RAND.arrayGetRand(minerValues);
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

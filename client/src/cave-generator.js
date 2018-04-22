
/* Contains code to generate various types of caverns in the game.
 *
 */

const RG = require('./rg.js');

const CaveGenerator = function() {

};

const Miners = {};

CaveGenerator.prototype.create = function(cols, rows, conf) {
    const level = this._createLevel(cols, rows, conf);
    return level;
};

/* Creates the Map.Level object with walls/floor and cave-flavor. */
CaveGenerator.prototype._createLevel = function(cols, rows, conf) {
    const mapOpts = this._createMapOptions(conf);
    const mapgen = new RG.Map.Generator();
    const level = new RG.Map.Level(cols, rows);
    mapgen.setGen('cave', cols, rows);
    const mapObj = mapgen.createCave(cols, rows, mapOpts);
    level.setMap(mapObj.map);
    this.setLevelExtras(level, mapObj);
    return level;
};

CaveGenerator.prototype._createMapOptions = function(conf) {
    const {dungeonType} = conf;
    let opts = {};

    switch (dungeonType) {
        case 'Cave': opts = Miners.getRandOpts(1, 3); break;
        case 'Grotto': opts = Miners.getRandOpts(2, 4); break;
        case 'Lair': opts = Miners.getRandOpts(1, 1); break;
        case 'Cavern': opts = Miners.getRandOpts(3, 9); break;
        default: opts = Miners.getRandOpts();
    }

    return opts;
};

/* Returns an object containing the base miners for different directions. */
function getMiners(cols, rows, border = 1) {
    const midX = Math.round(cols / 2);
    const midY = Math.round(rows / 2);

    // Need -2 to preserve wall border of level
    const endX = cols - 1 - border;
    const endY = rows - 1 - border;

    const miners = {
        N: {x: midX, y: 1, dirWeights: {E: 1, W: 1, S: 5, SE: 5, SW: 5}},
        S: {x: midX, y: endY, dirWeights: {E: 1, W: 1, N: 5, NE: 5, NW: 5}},
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

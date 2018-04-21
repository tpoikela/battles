
require('babel-core/register');

const ROT = require('../lib/rot');
const RG = require('../client/src/battles');
const MapMiner = require('../lib/map.miner');

const cols = 100;
const rows = 100;

const midX = Math.round(cols / 2);
const midY = Math.round(rows / 2);


const miners = {
    N: {x: midX, y: 1, dirWeights: {E: 1, W: 1, S: 5, SE: 5, SW: 5}},
    S: {x: midX, y: rows - 2, dirWeights: {E: 1, W: 1, N: 5, NE: 5, NW: 5}},
    E: {x: cols - 2, y: midY, dirWeights: {N: 1, S: 1, NW: 5, W: 5, SW: 5}},
    W: {x: 1, y: midY, dirWeights: {N: 1, S: 1, NE: 5, E: 5, SE: 5}},
    NE: {x: cols - 2, y: 1, dirWeights: {NW: 1, W: 10, SW: 5, S: 10}},
    NW: {x: 1, y: 1, dirWeights: {NE: 1, E: 10, SE: 5, S: 10}},
    SE: {x: cols - 2, y: rows - 2, dirWeights: {SW: 1, W: 10, NW: 5, N: 10}},
    SW: {x: 1, y: rows - 2, dirWeights: {SE: 1, E: 10, NE: 5, N: 10}},
    C: {
        x: midX, y: midY,
        dirWeights: {N: 1, S: 1, E: 1, W: 1, NE: 5, SE: 10, NW: 1, SW: 1}
    }
};

// const dirs = Object.keys(miners);
const minerValues = Object.values(miners);


// ROT.RNG.setSeed(1524319401126);
// const dontDig = {ulx: 1, uly: 1, lrx: 20, lry: 20};

for (let i = 0; i < 10; i++) {

    const opts = getRandOpts();
    const gen = new MapMiner(cols, rows, opts);
    const map = new RG.Map.CellList(cols, rows);

    gen.create((x, y, val) => {
        if (val === 1) {
            map.setBaseElemXY(x, y, RG.ELEM.WALL);
        }
        else {
            map.setBaseElemXY(x, y, RG.ELEM.FLOOR);
        }
    });

    map.debugPrintInASCII();

    console.log(JSON.stringify(gen._hist));
    console.log('seed was: ' + ROT.RNG.getSeed());

}

function getRandOpts() {
    const nMiners = RG.RAND.getUniformInt(1, 9);
    const firstMiner = RG.RAND.arrayGetRand(minerValues);
    const opts = {
        startX: firstMiner.x, startY: firstMiner.y,
        dirWeights: firstMiner.dirWeights
    };
    const addMiners = [];
    for (let i = 0; i < nMiners - 1; i++) {
        const extraMiner = RG.RAND.arrayGetRand(minerValues);
        addMiners.push(extraMiner);
    }

    opts.addMiners = addMiners;
    return opts;
}

const Conf = {};

function getMinersCorners() {
    const minersCorners = {
        cols: 100, rows: 100,
        maxMinersCreated: 100,
        dirWeights: miners.NW.dirWeights,
        addMiners: [
            miners.SW,
            miners.NE,
            miners.SE
        ],
        startX: miners.NW.x, startY: miners.NW.y
    };
    console.log(minersCorners);
    return minersCorners;
}
Conf.getMinersCorners = getMinersCorners;

function getMinersNSEW() {
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
Conf.getMinersNSEW = getMinersNSEW;

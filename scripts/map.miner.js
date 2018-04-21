
require('babel-core/register');

const ROT = require('../lib/rot');
const RG = require('../client/src/battles');
const MapMiner = require('../lib/map.miner');

const cols = 100;
const rows = 100;

// ROT.RNG.setSeed(1524319401126);
// const dontDig = {ulx: 1, uly: 1, lrx: 20, lry: 20};
const opts = {
    maxMinersCreated: 100,
    // dontDig
    // dirWeights: {NE: 1, SE: 1, SW: 1, NW: 1}
    // dirWeights: {N: 1, S: 1, E: 1, W: 1}
    dirWeights: {NE: 1, E: 10, SE: 5, S: 10},
    /* dirWeights: {
        N: 1, NE: 1, E: 2, SE: 1, S: 1, SW: 1, W: 20, NW: 1
    }*/
    addMiners: [
        {x: 1, y: rows - 2,
            dirWeights: {SE: 1, E: 10, NE: 5, N: 10}
        },
        {x: cols - 2, y: 1,
            dirWeights: {NW: 1, W: 10, SW: 5, S: 10}
        },
        {x: cols - 2, y: rows - 2,
            dirWeights: {SW: 1, W: 10, NW: 5, N: 10}
        }
    ],
    startX: 1, startY: 1
};

for (let i = 0; i < 10; i++) {

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

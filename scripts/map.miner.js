
require('babel-core/register');

const RG = require('../client/src/battles');
const MapMiner = require('../lib/map.miner');

const cols = 200;
const rows = 100;

// const dontDig = {ulx: 1, uly: 1, lrx: 20, lry: 20};
const opts = {
    // dontDig
    // dirWeights: {E: 2, SE: 1, E: 1, NW: 1},
    /* dirWeights: {
        N: 1, NE: 1, E: 2, SE: 1, S: 1, SW: 1, W: 20, NW: 1
    }*/
    // startX: 1, startY: 1
};

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

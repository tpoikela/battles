
require('babel-core/register');

const ROT = require('../lib/rot');
const RG = require('../client/src/battles');
const MapMiner = require('../lib/map.miner');
RG.Map = require('../client/src/map');
RG.Elem = require('../client/src/element');
const {Miners} = require('../client/src/cave-generator');

const cols = 200;
const rows = 200;

const miners = Miners.getMiners(cols, rows);

// ROT.RNG.setSeed(1524319401126);
// const dontDig = {ulx: 1, uly: 1, lrx: 20, lry: 20};

for (let i = 0; i < 20; i++) {

    // const opts = getRandOpts(1, 3);
    const opts = Miners.getOptsWithMiners(Object.values(miners));
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


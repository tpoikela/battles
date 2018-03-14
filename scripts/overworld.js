
/* Test code to generate valley surrounded by mountains.
*/

require('babel-register');

const RG = require('../client/src/battles');

RG.RAND.setSeed(new Date().getTime());

const OverWorld = RG.OverWorld;
const createOverWorld = OverWorld.createOverWorld;

let mult = 1;

let conf = {
    yFirst: false,
    topToBottom: false,
    // stopOnWall: 'random',
    stopOnWall: true,
    // nHWalls: 2,
    nVWalls: [0.8],
    owTilesX: mult * 80,
    owTilesY: mult * 40,
    worldX: mult * 800,
    worldY: mult * 400
};

mult = 1;
conf = {
    yFirst: false,
    topToBottom: false,
    // stopOnWall: 'random',
    stopOnWall: 'random',
    nHWalls: 3,
    // nVWalls: 4,
    nVWalls: [0.8],
    owTilesX: mult * 80,
    owTilesY: mult * 80,
    worldX: mult * 800,
    worldY: mult * 800,
    nLevelsX: mult * 8,
    nLevelsY: mult * 8,
    areaX: mult * 8,
    areaY: mult * 8,
    printResult: true
};

const startTime = new Date().getTime();
const levelAndConf = createOverWorld(conf);
const endTime = new Date().getTime();

const dur = endTime - startTime;
console.log('Creating overworld took ' + dur + 'ms');


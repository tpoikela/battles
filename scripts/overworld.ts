
/* Test code to generate valley surrounded by mountains.
*/

require('babel-register');

const RG = require('../client/src/battles');

const RNG = RG.Random.getRNG();
RNG.setSeed(new Date().getTime());

const OverWorld = RG.OverWorld;
const createOverWorld = OverWorld.createOverWorld;

let mult = 2;

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

mult = 4;
conf = {
    yFirst: false,
    topToBottom: false,
    // stopOnWall: 'random',
    stopOnWall: true,
    // nHWalls: 2,
    // nVWalls: 4,
    nVWalls: [0.8],
    owTilesX: mult * 40,
    owTilesY: mult * 40,
    worldX: mult * 400,
    worldY: mult * 400,
    nLevelsX: mult * 4,
    nLevelsY: mult * 4,
    areaX: mult * 4,
    areaY: mult * 4,
    printResult: true
};

const startTime = new Date().getTime();
const levelAndConf = createOverWorld(conf);
const endTime = new Date().getTime();

const dur = endTime - startTime;
console.log('Creating overworld took ' + dur + 'ms');


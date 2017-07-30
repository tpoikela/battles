
/* Test code to generate valley surrounded by mountains.
*/

const RG = require('../client/src/battles');

RG.RAND.setSeed(new Date().getTime());

const OverWorld = RG.OverWorld;
const createOverWorld = OverWorld.createOverWorld;

const mult = 1;

const conf = {
    yFirst: false,
    topToBottom: false,
    // stopOnWall: 'random',
    stopOnWall: true,
    // nHWalls: 2,
    nVWalls: [0.8],
    highX: mult * 80,
    highY: mult * 40,
    worldX: mult * 800,
    worldY: mult * 400
};

const startTime = new Date().getTime();
createOverWorld(conf);
const endTime = new Date().getTime();

const dur = endTime - startTime;
console.log('Creating overworld took ' + dur + 'ms');


/* Test code to generate valley surrounded by mountains.
*/

import * as RG from '../client/src/battles';

const RNG = RG.Random.getRNG();
RNG.setSeed(new Date().getTime());

const OverWorld = RG.OverWorld;
const createOverWorld = OverWorld.createOverWorld;

let mult = 2;

let conf: any = {
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

const xMult = 2 * 2;
const yMult = 2 * 3;

mult = 1;
conf = {
    yFirst: false,
    topToBottom: false,
    // stopOnWall: 'random',
    stopOnWall: true,
    // nHWalls: 2,
    // nVWalls: 4,
    nVWalls: [0.8],
    owTilesX: xMult * 40,
    owTilesY: yMult * 40,
    worldX: xMult * 400,
    worldY: yMult * 400,
    nLevelsX: xMult * 4,
    nLevelsY: yMult * 4,
    areaX: xMult * 4,
    areaY: yMult * 4,
    printResult: true
};

const startTime = new Date().getTime();
const levelAndConf = createOverWorld(conf);
const endTime = new Date().getTime();

const dur = endTime - startTime;
console.log('Creating overworld took ' + dur + 'ms');


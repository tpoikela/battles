
/* Test code to generate valley surrounded by mountains.
* Uses unicode "double lines" for easier visualisation.
*
*/

const RG = require('../client/src/battles');

const mult = 1;

const conf = {
    yFirst: false,
    topToBottom: false,
    // stopOnWall: 'random',
    stopOnWall: true,
    // nHWalls: 2,
    nVWalls: [0.8],
    highX: mult * 40,
    highY: mult * 20,
    worldX: mult * 400,
    worldY: mult * 400
};

const startTime = new Date().getTime();
RG.getOverWorld(conf);
const endTime = new Date().getTime();

const dur = endTime - startTime;
console.log('Creating overworld took ' + dur + 'ms');

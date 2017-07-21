
const RG = require('../client/src/battles');
const Screen = require('../client/gui/screen');

const x = 80;
const y = 28;
const startTime = new Date();

const level = RG.FACT.createLevel('arena', x, y);

const screen = new Screen(x, y);

const numRenders = 4000;
for (let i = 0; i < numRenders; i++) {
    screen.renderFullMap(level.getMap());
}

const endTime = new Date();
const durationMs = endTime.getTime() - startTime.getTime();
console.log('Creation took ' + durationMs + ' ms');
const fps = numRenders / durationMs * 1000;
console.log('FPS: ' + fps);

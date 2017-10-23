/* A short script to check the performance of Screen.render. */

require('babel-register');

const RG = require('../client/src/battles');
const Screen = require('../client/gui/screen');

let numRenders = 0;

const startTime = new Date().getTime();

const x = 80;
const y = 28;

const level = RG.FACT.createLevel('arena', x, y);
const map = level.getMap();
const screen = new Screen(x, y);
const actor = new RG.Actor.Rogue('rogue');
actor.setIsPlayer(true);
actor.setFOVRange(10);
level.addActor(actor, 1, 1);

for (let i = 0; i < 5000; i++) {
    const visibleCells = level.exploreCells(actor);
    screen.render(i % x, i % y, map, visibleCells);

    const chars = screen.getCharRows();
    const classes = screen.getClassRows();
    ++numRenders;
}

const endTime = new Date().getTime();
const durationMs = endTime - startTime;
const fps = numRenders / durationMs * 1000;

console.log('FPS: ' + fps);

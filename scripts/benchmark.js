/* A short script to check the performance of Screen.render. */

const RG = require('./client/src/battles');
const Screen = require('./client/gui/screen');

let numRenders = 0;

const startTime = new Date().getTime();

const level = RG.FACT.createLevel('arena', 80, 25);
const map = level.getMap();
const screen = new Screen(80, 25);
const actor = new RG.Actor.Rogue('rogue');
actor.setIsPlayer(true);
actor.setFOVRange(10);
level.addActor(actor, 1, 1);

for (let i = 0; i < 5000; i++) {
    const visibleCells = level.exploreCells(actor);
    screen.render(1, 1, map, visibleCells);

    const chars = screen.getCharRows();
    const classes = screen.getClassRows();
    ++numRenders;
}

const endTime = new Date().getTime();
const dur = endTime - startTime;
const fps = numRenders / dur * 1000;

console.log('FPS: ' + fps);

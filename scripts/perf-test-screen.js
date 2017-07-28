
const RG = require('../client/src/battles');
const Screen = require('../client/gui/screen');

const useRLE = true;
const csv = false; // Print results in CSV format
const dx = 80;
const dy = 28;

// How many renders tried per screen
const numRenders = 2000;
const numTries = 1;

let x = 320;
let y = 112;

if (csv) {console.log('x,y,createMs,fps');}

for (let j = 0; j < numTries; j++) {
    if (j > 0) {
        x += dx;
        y += dy;
    }
    if (!csv) {
        console.log(`Level ${x} by ${y}`);
    }

    const startCreate = new Date();
    const level = RG.FACT.createLevel('arena', x, y);
    const endCreate = new Date();
    const durCreate = endCreate.getTime() - startCreate.getTime();

    const screen = new Screen(x, y);
    const map = level.getMap();
    map._optimizeForRowAccess();

    const startTime = new Date();
    for (let i = 0; i < numRenders; i++) {
        if (useRLE) {
            screen.renderFullMapWithRLE(level.getMap());
        }
        else {
            screen.renderFullMap(level.getMap());
        }
    }
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const fps = numRenders / durationMs * 1000;

    // Report all results
    if (csv) {
        console.log(`${x},${y},${durCreate},${fps}`);
    }
    else {
        console.log('createLevel ' + durCreate + ' ms');
        console.log('Rendering took ' + durationMs + ' ms');
        console.log('FPS: ' + fps);
    }
}


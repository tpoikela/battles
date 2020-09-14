
require('ts-node/register');

const SentientActor = require('../client/src/actor').SentientActor;
const FactoryLevel = require('../client/src/factory.level').FactoryLevel;
const Random = require('../client/src/random').Random;

const profile = true;
const profFile = './profile_NEW_ALGO.cpuprofile';

if (profile) {
    const inspector = require('inspector');
    const fs = require('fs');
    const session = new inspector.Session();
    session.connect();

    session.post('Profiler.enable', () => {
      session.post('Profiler.start', () => {
        // Invoke business logic under measurement here...
        testFov();

        // some time later...
        session.post('Profiler.stop', (err, { profile }) => {
          // Write profile to disk, upload, etc.
          if (!err) {
            fs.writeFileSync(profFile, JSON.stringify(profile));
          }
        });
      });
    });
}
else {
    testFov();
}




function testFov() {
    const rng = new Random();
    rng.setSeed(Date.now());

    const factLevel = new FactoryLevel();
    const level = factLevel.createLevel('arena', 28, 80);
    const map = level.getMap();
    const actor = new SentientActor('actor');
    level.addActor(actor, 1, 1);

    const n = 5000;
    const ranges = [1, 2, 4, 5, 6, 8, 10];
    let cells = [];
    const times = {};

    ranges.forEach((r) => {
        times[r] = [];
        times[r].push(Date.now());
        for (let i = 0; i < n; i++) {
            actor.setFOVRange(r);
            const x = rng.getUniformInt(0, 27);
            const y = rng.getUniformInt(0, 79);
            level.moveActorTo(actor, x, y);
            cells = map.getCellsInFOV(actor);
        }
        times[r].push(Date.now());
    });

    console.log('Printing benchmarks:');
    Object.keys(times).forEach((r) => {
        const msec = times[r][1] - times[r][0];
        const perCall = msec / n;
        console.log('r:', r, ', ', msec, 'ms - ', perCall, 'ms/call');
    });
}

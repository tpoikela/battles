
/* This script determines the relative strength of the actors by making them
 * fight each other. */

require('babel-register');

const RG = require('../client/src/battles');
const fs = require('fs');

const parser = RG.ObjectShell.getParser();
const Actors = require('../client/data/actors.js');

const histogram = {};

const matchLimit = 200000;
let nMatches = 0;
let matchesLeftOut = 0;
const nRounds = 2;

const startTime = new Date().getTime();
const shells = Actors.filter(a => !((/spirit/i).test(a.name)));

const monitorActor = 'lich';
const monitor = {
    name: monitorActor,
    won: {},
    lost: {},
    tied: {}
};

for (let n = 0; n < nRounds; n++) {
    console.error(`Starting round ${n}`);
    for (let i = 0; i < shells.length; i++) {
        for (let j = 0; j < shells.length; j++) {
            if (i !== j) {
                const a1 = shells[i];
                const a2 = shells[j];
                if (validActorsForTest(a1, a2)) {
                    if (nMatches < matchLimit) {
                        runBattleTest(a1, a2);
                        ++nMatches;
                        // const msg = `${a1.name} VS ${a2.name}`;
                        // console.log(`Finished match ${nMatches}: ${msg}`);
                    }
                    else {
                        ++matchesLeftOut;
                    }
                }
            }
        }
    }
    console.error(`Round ${n} finished. Matches: ${nMatches}`);
}

printOutputs();
const endTime = new Date().getTime();
const durationMs = endTime - startTime;
console.log('Total duration ' + (durationMs / 1000) + ' s');

//---------------------------------------------------------------------------
// HELPER FUNCTIONS
//---------------------------------------------------------------------------

function validActorsForTest(a1, a2) {
    if (a1.name !== a2.name) {
        if (!a1.dontCreate && !a2.dontCreate) {
            if (a1.base !== 'SpecialBase' && a2.base !== 'SpecialBase') {
                if (a1.type !== 'spirit' && a2.type !== 'spirit') {
                    return true;
                }
            }
        }
    }
    return false;
}

function runBattleTest(a1, a2) {
    initHistograms(a1, a2);

    let watchdog = 300;
    const arena = RG.FACT.createLevel('arena', 7, 7);
    const actor1 = parser.createActor(a1.name);
    const actor2 = parser.createActor(a2.name);
    arena.addActor(actor1, 1, 1);
    arena.addActor(actor2, 6, 6);

    actor1.addEnemy(actor2);
    actor2.addEnemy(actor1);

    const game = new RG.Game.Main();
    game.addLevel(arena);
    game.addActiveLevel(arena);

    const h1 = actor1.get('Health');
    const h2 = actor2.get('Health');

    while (h1.isAlive() && h2.isAlive()) {
        game.simulate();
        if (--watchdog === 0) {break;}
    }

    if (watchdog === 0) {
        histogram[a1.name].tied += 1;
        histogram[a2.name].tied += 1;
        if (a1.name === monitorActor) {
            monitor.tied[a2.name] += 1;
        }
        else if (a2.name === monitorActor) {
            monitor.tiedt[a1.name] += 1;
        }
    }
    else if (h1.isAlive()) {
        histogram[a1.name].won += 1;
        histogram[a2.name].lost += 1;
        if (a1.name === monitorActor) {
            monitor.won[a2.name] += 1;
        }
        else if (a2.name === monitorActor) {
            monitor.lost[a1.name] += 1;
        }
    }
    else {
        histogram[a1.name].lost += 1;
        histogram[a2.name].won += 1;
        if (a1.name === monitorActor) {
            monitor.lost[a2.name] += 1;
        }
        else if (a2.name === monitorActor) {
            monitor.won[a1.name] += 1;
        }
    }

}

function initHistograms(a1, a2) {
    if (!histogram[a1.name]) {
        histogram[a1.name] = {won: 0, lost: 0, tied: 0};
    }
    if (!histogram[a2.name]) {
        histogram[a2.name] = {won: 0, lost: 0, tied: 0};
    }
}

function printOutputs() {
    console.log('======= RESULTS =======');
    console.log(JSON.stringify(histogram, null, 1));
    console.log('Matches still remaining: ' + matchesLeftOut);

    console.log(JSON.stringify(monitor));

    const outputFile = 'actor_fight_results.csv';
    fs.writeFileSync(outputFile, 'Actor,Won,Tied,Lost\n');
    Object.keys(histogram).forEach(key => {
        const {won, lost, tied} = histogram[key];
        const newKey = key.replace(',', '');
        const csvData = `${newKey},${won},${tied},${lost}\n`;
        fs.appendFileSync(outputFile, csvData);
    });
}



/* This script determines the relative strength of the actors by making them
 * fight each other. */

import {ActorGen} from '../client/data/actor-gen';

const ActorBattles = require('../tests/actor-battles');
// const Actors = require('../client/data/actors.js');

const matchLimit = process.argv[2] || 2000;
const nRounds = 3;

// const shells = Actors.filter(a => !((/spirit/i).test(a.name)));
// const monitorActor = 'lich';

const shells = ActorGen.genActors(100);
const monitorActor = shells[0].name;

const ab = new ActorBattles({monitorActor, matchLimit, shells});

ab.runSweep(nRounds);

ab.printOutputs('new_sweeps_' + Date.now());

const numMatches = ab.nMatches;
const durationMs = ab.getDuration();
const matchesPerSec = numMatches / (durationMs / 1000);
console.log('Total duration ' + (durationMs / 1000) + ' s');
console.log('Matches per sec: ' + matchesPerSec);

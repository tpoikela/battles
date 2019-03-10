
/* This script determines the relative strength of the actors by making them
 * fight each other. */

import {ActorGen} from '../client/data/actor-gen';
import {ActorsData} from '../client/data/actors';

const ActorBattles = require('../tests/actor-battles');

const matchLimit = process.argv[2] || 2000;
const nRounds = 3;

const minDanger = 5;

// const shells = Actors.filter(a => !((/spirit/i).test(a.name)));
// const monitorActor = 'lich';

let shells = ActorGen.genActors(100);
const monitorActor = shells[0].name;
shells = shells.concat(ActorsData);

console.log('Before filter: ', shells.length, ' shells');
shells = shells.filter(shell => shell.danger >= minDanger);
console.log('AFTER filter: ', shells.length, ' shells');

const ab = new ActorBattles({monitorActor, matchLimit, shells});

ab.runSweep(nRounds);

ab.printOutputs('new_sweeps_' + Date.now());

const numMatches = ab.nMatches;
const durationMs = ab.getDuration();
const matchesPerSec = numMatches / (durationMs / 1000);
console.log('Total duration ' + (durationMs / 1000) + ' s');
console.log('Matches per sec: ' + matchesPerSec);

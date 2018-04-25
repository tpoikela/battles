
/* This script determines the relative strength of the actors by making them
 * fight each other. */

require('babel-register');

// const RG = require('../client/src/battles');

const ActorBattles = require('../tests/actor-battles');
const Actors = require('../client/data/actors.js');

const matchLimit = 2000;
const nRounds = 2;

const shells = Actors.filter(a => !((/spirit/i).test(a.name)));

const monitorActor = 'lich';
const ab = new ActorBattles({monitorActor, matchLimit, shells});

ab.runSweep(nRounds);

ab.printOutputs();
const durationMs = ab.getDuration();
console.log('Total duration ' + (durationMs / 1000) + ' s');


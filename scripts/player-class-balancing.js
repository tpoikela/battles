
/* This script is for balancing player actor classes. */

require('babel-register');
const RG = require('../client/src/battles');
const Actors = require('../client/data/actors.js');
const ActorBattles = require('../tests/actor-battles');

const className = 'Marksman';
const playerLevel = 16;
const actorClass = new RG.Component.ActorClass();
actorClass.setClassName(className);

const playerActor = new RG.Actor.Rogue('hero');
playerActor.add(actorClass);
RG.levelUpActor(playerActor, playerLevel);

const shells = Actors.filter(a => !((/spirit/i).test(a.name)));
const matchLimit = 2000;
const monitorActor = playerActor.getName();
const ab = new ActorBattles({monitorActor, matchLimit, shells});

ab.runWithActor(playerActor, 1);
ab.printOutputs();

const durationMs = ab.getDuration();
console.log('Total duration ' + (durationMs / 1000) + ' s');

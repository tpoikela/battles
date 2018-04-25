
/* This script is for balancing player actor classes. */

require('babel-register');
const RG = require('../client/src/battles');
const Actors = require('../client/data/actors.js');
const ActorBattles = require('../tests/actor-battles');

const createPlayer = function() {
    const fact = new RG.Factory.Game();
    const race = 'goblin';
    const className = 'Marksman';
    const playerLevel = 32;
    /* const actorClass = new RG.Component.ActorClass();
    actorClass.setClassName(className);

    const playerActor = new RG.Actor.Rogue('hero');
    */
    const conf = {
        playerName: 'hero',
        playerClass: className,
        playerRace: race,
        playerLevel: 'Medium'
    };
    const playerActor = fact.createPlayerUnlessLoaded(conf);
    playerActor.remove('Player');
    // playerActor.add(actorClass);
    RG.levelUpActor(playerActor, playerLevel);

    const brain = new RG.Brain.GoalOriented(playerActor);
    playerActor.setBrain(brain);
    return playerActor;
};

const shells = Actors.filter(a => !((/spirit/i).test(a.name)));
const matchLimit = 2000;
const monitorActor = 'hero';
const ab = new ActorBattles({monitorActor, matchLimit, shells});

ab.runWithActor(createPlayer, 10);
ab.printOutputs();

const durationMs = ab.getDuration();
console.log('Total duration ' + (durationMs / 1000) + ' s');

console.log('Player stats:');
const player = createPlayer();
console.log(JSON.stringify(player, null, 1));

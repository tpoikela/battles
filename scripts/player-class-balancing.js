
/* This script is for balancing player actor classes. */

require('babel-register');
const RG = require('../client/src/battles');
const Actors = require('../client/data/actors.js');
const ActorBattles = require('../tests/actor-battles');

const brainMap = {
    Cryomancer: 'SpellCaster',
    Marksman: 'GoalOriented'
};

const createPlayer = function(playerConf) {
    const {actorClass, playerLevel} = playerConf;
    const fact = new RG.Factory.Game();
    const race = 'goblin';
    const conf = {
        playerName: 'hero',
        playerClass: actorClass,
        playerRace: race,
        playerLevel: 'Medium'
    };
    const playerActor = fact.createPlayerUnlessLoaded(conf);
    playerActor.remove('Player');
    RG.levelUpActor(playerActor, playerLevel);

    let brainType = brainMap[actorClass];
    if (!brainType) {brainType = 'GoalOriented';}

    const brain = new RG.Brain[brainType](playerActor);
    playerActor.setBrain(brain);
    return playerActor;
};

const monitorActor = 'hero';
const matchLimit = 2000;
const shells = Actors.filter(a => !((/spirit/i).test(a.name)));

// Classes to be tested
const classes = ['Cryomancer', 'Marksman'];
// const classes = ['Cryomancer'];
const levels = [4, 8, 12, 16, 20, 24, 28, 32];
// const levels = [8, 16, 24, 32];

classes.forEach(className => {
    levels.forEach(playerLevel => {
        const conf = {
            actorClass: className, playerLevel
        };
        const ab = new ActorBattles({monitorActor, matchLimit, shells});
        ab.runWithActor(createPlayer.bind(null, conf), 3);
        // ab.printOutputs(className);
        //
        const tag = `${className}_L${playerLevel}`;
        ab.printMonitored(tag);

        const durationMs = ab.getDuration();
        console.log('Total duration ' + (durationMs / 1000) + ' s');

        console.log('Player stats:');
        const player = createPlayer(conf);
        console.log(JSON.stringify(player, null, 1));
        console.log(`#### FINISHED: ${tag} ####`);
    });
});

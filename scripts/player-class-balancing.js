
/* This script is for balancing player actor classes. */

require('babel-register');
const RG = require('../client/src/battles');
const Actors = require('../client/data/actors.js');
const ActorBattles = require('../tests/actor-battles');
const {FactoryItem} = require('../client/src/factory.items');

const brainMap = {
    Cryomancer: 'SpellCaster',
    Marksman: 'GoalOriented'
};

const equip = {
    4: 'Leather',
    8: 'Chain',
    12: 'Steel',
    16: 'Mithril',
    20: 'Mithril',
    24: 'Ruby',
    28: 'Runed',
    32: 'Permaice'
};

const weapon = {
    4: 'Mace',
    8: 'Mace',
    12: 'Longsword',
    16: 'Great battle axe',
    20: 'Mithril spear',
    24: 'Ruby glass battle axe',
    28: 'Runed runesword',
    32: 'Permaice katana'
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
    FactoryItem.equipFullGearType(playerActor, equip[playerLevel]);
    FactoryItem.equipWeaponOfType(playerActor, weapon[playerLevel]);
    return playerActor;
};

const monitorActor = 'hero';
const matchLimit = 2000;
const shells = Actors.filter(a => !((/spirit/i).test(a.name)));

// Classes to be tested
// const classes = ['Adventurer', 'Blademaster', 'Cryomancer', 'Marksman'];
 const classes = ['Marksman'];
// const classes = ['Cryomancer'];
const levels = [4, 8, 12, 16, 20, 24, 28, 32];
// const levels = [4];
// const levels = [8, 16, 24, 32];

let summary = '';
classes.forEach(className => {
    levels.forEach(playerLevel => {
        const tag = `${className}_L${playerLevel}`;
        console.log(`#### STARTED: ${tag} {{{`);
        const conf = {
            actorClass: className, playerLevel
        };
        const ab = new ActorBattles({monitorActor, matchLimit, shells});
        ab.equalizeLevels = false;
        ab.runWithActor(createPlayer.bind(null, conf), 3);
        // ab.printOutputs(className);

        ab.printMonitored(tag);

        const durationMs = ab.getDuration();
        console.log('Total duration ' + (durationMs / 1000) + ' s');

        console.log('Player stats:');
        const player = createPlayer(conf);
        console.log('Used player', JSON.stringify(player, null, 1));
        console.log(`#### FINISHED: ${tag} }}}`);

        const monitor = ab.monitor;
        const {won, lost, tied} = monitor;
        summary += `${tag},${won.sum},${tied.sum},${lost.sum}\n`;
    });
});

console.log('tag,won,tied,lost');
console.log(summary);

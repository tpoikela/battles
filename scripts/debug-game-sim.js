
require('babel-register');

const expect = require('chai').expect;
const fs = require('fs');

const RG = require('../client/src/battles');
const Keys = require('../client/src/keymap');
const ROT = require('../lib/rot');
const UtilsSim = require('./utils-sim');

const restKey = {code: Keys.KEY.REST};

const RNG = RG.Random.getRNG();

const opts = UtilsSim.getOpts();

RNG.setSeed(opts.seed);
ROT.RNG.setSeed(opts.seed);

console.log('RNG uniform: ' + RNG.getUniform());
console.log('ROT.RNG uniform: ' + ROT.RNG.getUniform());

const gameConf = {
    cols: 60,
    rows: 30,
    levels: 2,

    playerLevel: 'Medium',
    levelSize: 'Medium',
    playerClass: opts.class || RG.ACTOR_CLASSES[0],
    playerRace: opts.race || RG.ACTOR_RACES[0],

    sqrPerActor: 120,
    sqrPerItem: 120,
    playMode: 'Arena',
    loadedPlayer: null,
    loadedLevel: null,
    playerName: opts.name,
    seed: 0
};
const gameFact = new RG.Factory.Game();
let game = gameFact.createNewGame(gameConf);

// Simulate 1st serialisation in worker thread
let gameJSON = game.toJSON();
let fromJSON = new RG.Game.FromJSON();
game = fromJSON.createGame(gameJSON);

const timeId = new Date().getTime();
const fpsArray = [];

// Used with expect() later
const saveFunc = (numTurns) => {
    fromJSON = new RG.Game.FromJSON();
    gameJSON = game.toJSON();
    game = fromJSON.createGame(gameJSON);

    const level = game.getLevels()[0];
    console.log(`saveFunc RG.POOL listeners: ${RG.POOL.getNumListeners()}`);
    const numActors = level.getActors().length;
    console.log(`Actors in level: ${numActors}`);

    const {playerName} = gameConf;
    const fName = `results/debug-game-${playerName}-${numTurns}-${timeId}.json`;
    fs.writeFileSync(fName, JSON.stringify(gameJSON));
};

const updateFunc = () => {
    if (game.isGameOver()) {
        game.simulate();
    }
    else {
        game.update(restKey);
    }
};

const simulSpellOn1stTurn = () => {
    game.update({code: Keys.KEY.POWER});
    game.update({code: Keys.VK_h});
};
// expect(simulSpellOn1stTurn).not.to.throw(Error);

const timeStart = new Date().getTime();
const numTurns = opts.maxturns || 10000;
const saveInterval = opts.save_period || 400;

let turnOfLastSave = 0;
let timeSaveFinished = Date.now();

console.log(`Start RG.POOL listeners: ${RG.POOL.getNumListeners()}`);

for (let i = 1; i <= numTurns; i++) {
    // expect(updateFunc).not.to.throw(Error);
    updateFunc();

    if (i === 10) {
        expect(simulSpellOn1stTurn).not.to.throw(Error);
    }
    if (i % saveInterval === 0) {
        const timeNow = Date.now();
        const dur = timeNow - timeSaveFinished;
        const fps = (i - turnOfLastSave) / (dur / 1000);
        fpsArray.push(fps);
        console.log(`FPS: ${fps} Saving game after ${i}/${numTurns} turns`);
        // expect(saveFunc).not.to.throw(Error);
        saveFunc(i);
        turnOfLastSave = i;
        timeSaveFinished = Date.now();
    }
    if (i % 10 === 0) {
        console.log('Finished turn ' + i);
    }
}
const timeEnd = new Date().getTime();
const dur = timeEnd - timeStart;
console.log('Execution took ' + dur + ' ms');

const fpsAvg = fpsArray.reduce((acc, val) => acc + val) / fpsArray.length;

const fps = numTurns / (dur / 1000);
console.log('Overall avg FPS: ' + fps);
console.log('\tOverall avg FPS: ' + fpsAvg + ' (from array)');

fromJSON = new RG.Game.FromJSON();
gameJSON = game.toJSON();
fs.writeFileSync('results/debug-game.json',
    JSON.stringify(gameJSON));



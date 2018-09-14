
require('babel-register');

const expect = require('chai').expect;
const fs = require('fs');

const RG = require('../client/src/battles');
const Keys = require('../client/src/keymap');
const Evaluator = require('../client/src/evaluators');
const ROT = require('../lib/rot');
const UtilsSim = require('./utils-sim');

const restKey = {code: Keys.KEY.REST};
const {VMEDIUM} = UtilsSim;

const RNG = RG.Random.getRNG();
const opts = UtilsSim.getOpts();

if (UtilsSim.useBrowser()) {
    opts.nosave = true;
    opts.maxturns = 10000;
}

RNG.setSeed(opts.seed);
ROT.RNG.setSeed(opts.seed);

const logger = new UtilsSim.Log(opts);
const {info, log} = logger;

log('RNG uniform: ' + RNG.getUniform());
log('ROT.RNG uniform: ' + ROT.RNG.getUniform());

const gameConf = {
    playerLevel: 'Medium',
    levelSize: 'Medium',
    playerClass: opts.class || RG.ACTOR_CLASSES[0],
    playerRace: opts.race || RG.ACTOR_RACES[0],

    sqrPerActor: 120,
    sqrPerItem: 120,
    playMode: 'Arena',
    loadedPlayer: null,
    loadedLevel: null,
    playerName: opts.name || 'Player',
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
    const {playerName} = gameConf;
    const fName = `results/debug-game-${playerName}-${numTurns}-${timeId}.json`;
    if (fs && fs.writeFileSync) {
        fs.writeFileSync(fName, JSON.stringify(gameJSON));
    }
};

const reportFunc = game => {
    const level = game.getLevels()[0];
    log(`saveFunc RG.POOL listeners: ${RG.POOL.getNumListeners()}`);
    const numActors = level.getActors().length;
    log(`Actors in level: ${numActors}`);
};

const updateFunc = () => {
    if (game.isGameOver()) {
        const level = game.getLevels()[0];
        const nActors = level.getActors().length;
        game.simulate(nActors);
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

log(`Start RG.POOL listeners: ${RG.POOL.getNumListeners()}`);

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
        log(`FPS: ${fps} Saving game after ${i}/${numTurns} turns`);
        reportFunc(game);
        // expect(saveFunc).not.to.throw(Error);
        if (!opts.nosave) {
            saveFunc(i);
        }
        turnOfLastSave = i;
        timeSaveFinished = Date.now();
    }
    if (i % 100 === 0) {
        log('Finished turn ' + i);
    }
}
const timeEnd = new Date().getTime();
const dur = timeEnd - timeStart;
log('Execution took ' + dur + ' ms');

const fpsAvg = fpsArray.reduce((acc, val) => acc + val, 0) / fpsArray.length;

const fps = numTurns / (dur / 1000);
info(VMEDIUM, 'Overall avg FPS: ' + fps);
if (!Number.isNaN(fpsAvg)) {
    info(VMEDIUM, '\tOverall avg FPS: ' + fpsAvg + ' (from array)');
}

fromJSON = new RG.Game.FromJSON();
gameJSON = game.toJSON();
if (fs && fs.writeFileSync) {
    fs.writeFileSync('results/debug-game.json',
        JSON.stringify(gameJSON));
}

const level = game.getLevels()[0];
if (level.getMap().useCache) {
    const cacheStr = JSON.stringify(level.getMap()._cache);
    log('Map cache length is ' + cacheStr.length);
}

log(Evaluator.hist);

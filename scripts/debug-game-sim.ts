
import fs = require('fs');

import * as RG from '../client/src/battles';
import {default as RotRNG} from '../lib/rot-js/rng';
import {UtilsSim} from './utils-sim';
import {PlayerDriver} from '../tests/helpers/player-driver';
import {Dice} from '../client/src/dice';

type CmdInput = import('../client/src/interfaces').CmdInput;

const Keys = RG.Keys;

const restKey: CmdInput = {code: Keys.KEY.REST};
const {VMEDIUM} = UtilsSim;

const RNG = RG.Random.getRNG();

UtilsSim.addArg({
    name: 'driver', type: Boolean, descr: 'Use advanced driver for player'
});
const opts = UtilsSim.getOpts();

console.log('Start simulation with Seed: ', opts.seed);
RNG.setSeed(opts.seed);
RotRNG.setSeed(opts.seed);
Dice.RNG.setSeed(opts.seed);

if (UtilsSim.useBrowser()) {
    opts.nosave = true;
    opts.maxturns = 10000;
}

RNG.setSeed(opts.seed);
RotRNG.setSeed(opts.seed);

const logger = new UtilsSim.Log(opts);
const {info, log} = logger;

log('RNG uniform: ' + RNG.getUniform());
log('ROT.RNG uniform: ' + RotRNG.getUniform());

const gameConf = {
    playerLevel: 'Medium',
    levelSize: 'Medium',
    playerClass: opts.class || RG.ACTOR_CLASSES[0],
    playerRace: opts.race || RG.RG.ACTOR_RACES[0],

    sqrPerActor: 120,
    sqrPerItem: 120,
    playMode: 'Arena',
    loadedPlayer: null,
    loadedLevel: null,
    playerName: opts.name || 'Player',
    seed: 0
};

const playerDriver = new PlayerDriver();
const gameFact = new RG.FactoryGame();
let game = null;

if (opts.load && opts.file) {
    const buf = fs.readFileSync(opts.file);
    const json = JSON.parse(buf.toString());
    game = restoreGame(json, playerDriver);
}
else {
    game = gameFact.createNewGame(gameConf);
    playerDriver.setGame(game);
    playerDriver.setPlayer(game.getPlayer());
}

let gameJSON = {};
if (!opts.load) {
    // Simulate 1st serialisation in worker thread
    console.log('Verify LevelCache before serialisation');
    RG.verifyLevelCache(game.getLevels()[0]);
    console.log('LevelCache OK. Serialising now');
    gameJSON = game.toJSON();

    console.log('Serialising OK. Restoring game now');
    game = restoreGame(gameJSON, playerDriver);
    console.log('Restore OK. Verify cache after serialisation');
    RG.verifyLevelCache(game.getLevels()[0]);
    console.log('LevelCache OK after restoring');
}

const durTimes: {[key: string]: number} = {
    save: 0, write: 0, rest: 0, total: 0
};
const timeId: number = UtilsSim.getTimeStamp();
const fpsArray: number[] = [];

// Used with expect() later
const saveFunc = (nTurns: number): void => {
    const saveDur = UtilsSim.time(() => {
        gameJSON = game.toJSON();
    });
    const restDur = UtilsSim.time(() => {
        game = restoreGame(gameJSON, playerDriver);
    });
    const writeDur = UtilsSim.time(() => {
        const {playerName} = gameConf;
        const tag = `${playerName}-${nTurns}-${timeId}`;
        const fName = `results/debug-game-${tag}.json`;
        if (fs && fs.writeFileSync) {
            fs.writeFileSync(fName, JSON.stringify(gameJSON));
        }
    });
    durTimes.save += saveDur;
    durTimes.rest += restDur;
    durTimes.write += writeDur;
    durTimes.total += saveDur + restDur + writeDur;
};

const reportFunc = (currGame) => {
    const currLevel = currGame.getLevels()[0];
    const pool = RG.EventPool.getPool();
    log(`saveFunc RG.POOL listeners: ${pool.getNumListeners()}`);
    const numActors = currLevel.getActors().length;
    log(`Actors in level: ${numActors}`);
};

const updateFunc = () => {
    if (game.isGameOver()) {
        const currLevel = game.getLevels()[0];
        const nActors = currLevel.getActors().length;
        game.simulate(nActors);
    }
    else {
        let nextKey: any = restKey;
        if (playerDriver) {
            nextKey = playerDriver.getNextCode();
            if (Number.isInteger(nextKey)) {
                nextKey = {code: nextKey};
            }
        }
        game.update(nextKey);
    }
};

const simulSpellOn1stTurn = () => {
    game.update({code: Keys.KEY.POWER});
    game.update({code: Keys.VK.h});
};
// expect(simulSpellOn1stTurn).not.to.throw(Error);

const timeStart = new Date().getTime();
const numTurns = opts.maxturns || 10000;
const saveInterval = opts.save_period || 400;

let turnOfLastSave = 0;
let timeSaveFinished = Date.now();

const POOL = RG.EventPool.getPool();
log(`Start RG.POOL listeners: ${POOL.getNumListeners()}`);


let crashed = false;

for (let i = 1; i <= numTurns; i++) {
    try {
        updateFunc();
    } catch (e) {
        crashed = true;
        console.log('Caught error:', e.message, '\n', e);
        break;
    }

    /* if (i === 10) {
        expect(simulSpellOn1stTurn).not.to.throw(Error);
    }*/
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
const durGame = timeEnd - timeStart - durTimes.total;
log('Actual Game Execution took ' + durGame + ' ms');
log('Used seed number: ' + opts.seed);
log('Did game crash: ' + crashed);

const fpsAvg = fpsArray.reduce((acc, val) => acc + val, 0) / fpsArray.length;

const finalFps = numTurns / (durGame / 1000);
info(VMEDIUM, 'Overall avg FPS: ' + finalFps);
if (!isNaN(fpsAvg)) {
    info(VMEDIUM, '\tOverall avg FPS: ' + fpsAvg + ' (from array)');
}

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

log(RG.Evaluator.hist);


function restoreGame(json, driver) {
    const fromJSON = new RG.FromJSON();
    let newGame = new RG.GameMain();
    newGame = fromJSON.createGame(newGame, json);
    if (driver) {
        driver.setGame(newGame);
        driver.setPlayer(newGame.getPlayer());
    }
    return newGame;
}


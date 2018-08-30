
require('babel-register');

const expect = require('chai').expect;
const RG = require('../client/src/battles');
const Keys = require('../client/src/keymap');
const fs = require('fs');

const restKey = {code: Keys.KEY.REST};

const RNG = RG.Random.getRNG();
const ROT = require('../lib/rot');

RNG.setSeed(0);
ROT.RNG.setSeed(0);

console.log('RNG uniform: ' + RNG.getUniform());
console.log('ROT.RNG uniform: ' + ROT.RNG.getUniform());

const gameConf = {
    cols: 60,
    rows: 30,
    levels: 2,

    playerLevel: 'Medium',
    levelSize: 'Medium',
    playerClass: RG.ACTOR_CLASSES[0],
    playerRace: RG.ACTOR_RACES[0],

    sqrPerActor: 120,
    sqrPerItem: 120,
    playMode: 'Arena',
    loadedPlayer: null,
    loadedLevel: null,
    playerName: 'Player'
};
const gameFact = new RG.Factory.Game();
let game = gameFact.createNewGame(gameConf);

// Simulate 1st serialisation in worker thread
let gameJSON = game.toJSON();
let fromJSON = new RG.Game.FromJSON();
game = fromJSON.createGame(gameJSON);

// Used with expect() later
const saveFunc = () => {
    fromJSON = new RG.Game.FromJSON();
    gameJSON = game.toJSON();
    game = fromJSON.createGame(gameJSON);
};

const updateFunc = () => {
    game.update(restKey);
};

const simulSpellOn1stTurn = () => {
    game.update({code: Keys.KEY.POWER});
    game.update({code: Keys.VK_h});
};
// expect(simulSpellOn1stTurn).not.to.throw(Error);

const timeStart = new Date().getTime();
const numTurns = 10000;
for (let i = 1; i <= numTurns; i++) {
    // expect(updateFunc).not.to.throw(Error);
    updateFunc();

    if (i === 10) {
        expect(simulSpellOn1stTurn).not.to.throw(Error);
    }
    if (i % 1000 === 0) {
        console.log(`Saving game after ${i}/${numTurns} turns`);
        expect(saveFunc).not.to.throw(Error);
        // saveFunc();
    }
    if (i % 10 === 0) {
        console.log('Finished turn ' + i);
    }
}
const timeEnd = new Date().getTime();
const dur = timeEnd - timeStart;
console.log('Execution took ' + dur + ' ms');

const fps = numTurns / (dur / 1000);
console.log('FPS: ' + fps);

fromJSON = new RG.Game.FromJSON();
gameJSON = game.toJSON();
fs.writeFileSync('results/debug-game.json',
    JSON.stringify(gameJSON));



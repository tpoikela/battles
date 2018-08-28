
/* This is a test file for debug game, which can be also played
 * quickly in the browser. */

// const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const Keys = require('../../../client/src/keymap');

const restKey = {code: Keys.KEY.REST};

describe('Debug game simulation with player and actors', () => {
    it('should execute without throwing', () => {
        const gameConf = {
            cols: 60,
            rows: 30,
            levels: 2,

            seed: new Date().getTime(),

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
        const gameJSON = game.toJSON();
        const fromJSON = new RG.Game.FromJSON();
        game = fromJSON.createGame(gameJSON);

        for (let i = 0; i < 1000; i++) {
            game.update(restKey);
        }

    });
});

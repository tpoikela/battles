

const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const worldConf = require('../../../client/data/conf.world');

const LocalStorage = require('node-localstorage').LocalStorage,
localStorage = new LocalStorage('./battles_local_storage');

const isGUICommand = () => {};
const doGUICommand = () => {};

describe('Function: Saving/restoring a game', () => {
    // 1. Create a new game
    // 2. Do some stuff as user
    // 3. Save game
    // 4. Restore game
    // 5. Assert that changes were saved
    it('should be able to save/restore game for user', () => {
        const gameConf = {
            cols: 80,
            rows: 60,
            levels: 2,
            playerLevel: 'Medium',
            sqrPerMonster: 40,
            sqrPerItem: 100,
            debugMode: 'World',
            loadedPlayer: null,
            loadedLevel: null,
            playerName: 'Player1',
            world: worldConf
        };
        const fccGame = new RG.FCCGame();
        const game = fccGame.createNewGame(gameConf);
        game.setGUICallbacks(isGUICommand, doGUICommand);

        const gameSave = new RG.Game.Save();
        gameSave.setStorage(localStorage);

        gameSave.save(game);

        const restGame = gameSave.restorePlayer(gameConf.playerName);

        expect(restGame.getPlayer().getName()).to.equal(gameConf.playerName);

    });
});

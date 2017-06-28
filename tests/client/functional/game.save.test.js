
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const worldConf = require('../../../client/data/conf.world');

const isGUICommand = () => {};
const doGUICommand = () => {};

describe('Function: Saving/restoring a game', function() {
    this.timeout(5000);
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
        const gameFactory = new RG.Factory.Game();
        const game = gameFactory.createNewGame(gameConf);
        game.setGUICallbacks(isGUICommand, doGUICommand);

        const json = game.toJSON();
        const fromJSON = new RG.Game.FromJSON();
        const restGame = fromJSON.createGame(json);

        expect(restGame.getPlayer().getName()).to.equal(gameConf.playerName);
    });
});


const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

describe('How Game is created from Overworld', () => {
    it('description', () => {
        const gameFact = new RG.Factory.Game();

        const conf = {
            // Empty
        };

        const player = new RG.Actor.Rogue('My Hero');
        player.setIsPlayer(true);
        const gameObj = new RG.Game.Main();
        const game = gameFact.createOverWorld(conf, gameObj, player);

        expect(game).to.exit;
    });
});

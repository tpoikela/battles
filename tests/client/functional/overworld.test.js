
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

RG.Factory.Game = require('../../../client/src/factory.game');

// const RGObjects = require('../../../client/data/battles_objects');
// const RGEffects = require('../../../client/data/effects');

describe('How Game is created from Overworld', function() {
    this.timeout(20000);
    it('is created using factory from game/player objects', () => {
        const gameFact = new RG.Factory.Game();

        const conf = {
            debugMode: 'OverWorld',
            playerLevel: 'Medium'
        };

        // const player = new RG.Actor.Rogue('My Hero');
        // player.setIsPlayer(true);
        // const gameObj = new RG.Game.Main();
        const game = gameFact.createNewGame(conf);
        expect(game).to.exist;
    });
});

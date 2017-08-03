
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const RGObjects = require('../../../client/data/battles_objects');
const RGEffects = require('../../../client/data/effects');

describe('How Game is created from Overworld', function() {
    this.timeout(10000);
    it('is created using factory from game/player objects', () => {
        const gameFact = new RG.Factory.Game();

        const conf = {
            // Empty
        };

        const player = new RG.Actor.Rogue('My Hero');
        player.setIsPlayer(true);
        const gameObj = new RG.Game.Main();
        /*
        const game = gameFact.createOverWorld(conf, gameObj, player);

        expect(game).to.exist;
        */
    });
});

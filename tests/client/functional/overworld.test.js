
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

RG.Factory.Game = require('../../../client/src/factory.game');

describe('How Game is created from Overworld', function() {
    this.timeout(45000);
    it('is created using factory from game/player objects', () => {
        const gameFact = new RG.Factory.Game();

        const conf = {
            playMode: 'OverWorld',
            playerLevel: 'Medium',
            sqrPerItem: 100,
            sqrPerActor: 100
        };

        // const player = new RG.Actor.Rogue('My Hero');
        // player.setIsPlayer(true);
        // const gameObj = new RG.Game.Main();
        const game = gameFact.createNewGame(conf);
        expect(game).to.exist;

        const places = game.getPlaces();
        expect(Object.keys(places)).to.have.length(1);

        const levels = game.getLevels();
        levels.forEach(level => {
            const msg = level.getParent() + ' ' + level.getID();
            expect(level.getActors(),
                `${msg} > 0 actors`).to.have.length.above(0);
            expect(level.getItems(),
                `${msg} > 0 items`).to.have.length.above(0);
        });
    });
});

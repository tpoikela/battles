
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const ROT = require('../../../lib/rot.js');

describe('How Game is created from Overworld', function() {

    this.timeout(5 * 3600 * 1000); // 5 hours

    let game = null;

    beforeEach(() => {
        ROT.RNG.setSeed(1234);
        RG.RAND = new RG.Random();
        RG.RAND.setSeed(5678);
        const conf = {
            playMode: 'OverWorld',
            playerLevel: 'Medium',
            sqrPerItem: 100,
            sqrPerActor: 100,
            yMult: 0.5,
            playerClass: 'Blademaster',
            playerRace: 'human'
        };
        const gameFact = new RG.Factory.Game();
        game = gameFact.createNewGame(conf);
    });

    afterEach(() => {
        game = null;
    });

    it('is created using factory from game/player objects', () => {
        expect(game).to.exist;

        const worldConf = game.getCurrentWorld().getConf();
        const json = game.toJSON();

        const fromJSON = new RG.Game.FromJSON();
        const newGame = fromJSON.createGame(json);
        const newWorldConf = newGame.getCurrentWorld().getConf();
        // expect(worldConf).to.deep.equal(newWorldConf);

        const cityConf = worldConf.area[0].city;
        const newCityConf = newWorldConf.area[0].city;

        const capitalConf = cityConf.find(c => c.name === 'Blashyrkh');
        const newCapitalConf = newCityConf.find(c => c.name === 'Blashyrkh');

        expect(newCapitalConf).to.deep.equal(capitalConf);

    });

});


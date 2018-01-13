
// import {verifySaveData} from '../../../client/src/persist';

const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
RG.Verify = require('../../../client/src/verify');

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
                `${msg}: > 0 actors`).to.have.length.above(0);
            //expect(level.getItems(),
                //`${msg}: > 0 items`).to.have.length.above(0);
        });

        const json = game.toJSON();
        const jsonStr = JSON.stringify(json);
        const jsonParsed = JSON.parse(jsonStr);

        const fromJSON = new RG.Game.FromJSON();
        const newGame = fromJSON.createGame(jsonParsed);

        const checkedID = game.getLevels()[0].getID();

        const levelIDsBefore = game.getLevels().map(l => l.getID());
        const levelIDsAfter = newGame.getLevels().map(l => l.getID());

        const oldLevel = game.getLevels()[0];
        const newLevel = newGame.getLevels().filter(
            l => l.getID() === checkedID[0]
        );

        const actorsOld = oldLevel.getActors();
        const actorsNew = newLevel.getActors();

        actorsOld.forEach((actorOld, i) => {
            expect(actorsNew[i].get('Health').getHP())
                .to.equal(actorOld.get('Health').getHP());
        });

        expect(actorsNew.length).to.equal(actorsOld.length);

        expect(RG.Verify.verifySaveData.bind(json)).to.not.throw;

        expect(levelIDsAfter).to.deep.equal(levelIDsBefore);
    });
});

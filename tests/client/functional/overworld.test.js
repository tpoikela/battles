
// import {verifySaveData} from '../../../client/src/persist';

const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
RG.Verify = require('../../../client/src/verify');

RG.Factory.Game = require('../../../client/src/factory.game');

describe('How Game is created from Overworld', function() {
    this.timeout(90000);
    it('is created using factory from game/player objects', () => {
        RG.RAND.setSeed(0);
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
            // expect(level.getItems(),
                // `${msg}: > 0 items`).to.have.length.above(0);
        });

        const nLevels = game.getLevels().length;
        console.log('Before save, game has ' + nLevels + ' levels');

        const json = game.toJSON();
        const jsonStr = JSON.stringify(json);
        // console.log(jsonStr);
        // RG.Verify.verifySaveData(jsonStr, false);
        const jsonParsed = JSON.parse(jsonStr);

        const fromJSON = new RG.Game.FromJSON();
        console.log('== Restoring the game from JSON ==');
        const newGame = fromJSON.createGame(jsonParsed);

        const checkedID = game.getLevels()[0].getID();
        console.log(`Checked level ID is now ${checkedID}`);

        const levelIDsBefore = game.getLevels().map(l => l.getID());
        const levelIDsAfter = newGame.getLevels().map(l => l.getID());
        expect(levelIDsAfter).to.deep.equal(levelIDsBefore);
        console.log(`After restore ${levelIDsAfter.length} levels`);

        const oldLevel = game.getLevels()[0];
        const newLevel = newGame.getLevels().filter(
            l => l.getID() === checkedID
        )[0];

        const msg = `Level with ID ${checkedID} exists after restore.`;
        expect(newLevel, msg).not.to.be.empty;

        const actorsOld = oldLevel.getActors();
        const actorsNew = newLevel.getActors();

        actorsOld.forEach((actorOld, i) => {
            expect(actorsNew[i].get('Health').getHP())
                .to.equal(actorOld.get('Health').getHP());
        });

        expect(actorsNew.length).to.equal(actorsOld.length);

        expect(RG.Verify.verifySaveData.bind(json)).to.not.throw;

    });
});

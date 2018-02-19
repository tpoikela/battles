
import MockStorage from '../../helpers/mockstorage';

const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const worldConf = require('../../../client/data/conf.world');

const isGUICommand = () => {};
const doGUICommand = () => {};

describe('Function: Saving/restoring a game', function() {
    this.timeout(60000);
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
            sqrPerActor: 40,
            sqrPerItem: 100,
            playMode: 'World',
            loadedPlayer: null,
            loadedLevel: null,
            playerName: 'Player1',
            world: worldConf,
            playerRace: 'human'
        };

        const gameFactory = new RG.Factory.Game();
        console.log('Now creating a new game');
        const game = gameFactory.createNewGame(gameConf);
        game.setGUICallbacks(isGUICommand, doGUICommand);
        game.getPlayer().setFOVRange(11);

        const parentsBefore = game.getLevels().map(level => level.getParent());
        const numLevelsBefore = game.getLevels().length;
        const levelIDsBefore = game.getLevels().map(level => level.getID());
        console.log('Now serializing the game.');
        let json = game.toJSON();

        const levelIDsJSON = json.levels.map(level => level.id);
        expect(levelIDsJSON, 'Level IDs in JSON are preserved')
            .to.deep.equal(levelIDsBefore);

        RG.Verify.verifySaveData(json, true);
        console.log('Converting serialized object to string...');
        let jsonStr = JSON.stringify(json);
        console.log(`Length of serialized string ${jsonStr.length}`);
        const storage = new MockStorage();
        storage.setItem('game_data', jsonStr);
        const newStr = storage.getItem('game_data');
        json = JSON.parse(newStr);

        for (let i = 0; i < 2; i++) {
            const fromJSON = new RG.Game.FromJSON();
            console.log(`Restoring game ${i} from serialized object.`);
            const restGame = fromJSON.createGame(json);

            console.log('Starting the checks for this test');
            expect(restGame.getPlayer().getName())
                .to.equal(gameConf.playerName);

            expect(restGame.getPlayer().getFOVRange()).to.equal(11);

            const parentsAfter = game.getLevels()
                .map(level => level.getParent());
            const numLevelsAfter = restGame.getLevels().length;
            const levelIDsAfter = restGame.getLevels()
                .map(level => level.getID());

            expect(numLevelsAfter, 'Levels must match after restore')
                .to.equal(numLevelsBefore);

            expect(levelIDsAfter, 'Level IDs are preserved')
                .to.deep.equal(levelIDsBefore);
            expect(parentsAfter, 'Level parents are preserved')
                .to.deep.equal(parentsBefore);

            const places = restGame.getPlaces();
            expect(Object.keys(places)).to.have.length(1);
            const world = places[worldConf.name];
            expect(world.getName()).to.equal(worldConf.name);
            console.log('Now serializing the game.');
            json = restGame.toJSON();
            // console.log(JSON.stringify(json, null, ' '));
            jsonStr = JSON.stringify(json);
            console.log(`Length of serialized string ${jsonStr.length}`);
            json = JSON.parse(jsonStr);
        }
    });
});


const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
RG.Verify = require('../../../client/src/verify');
const RGTest = require('../../roguetest');
RG.Factory.Game = require('../../../client/src/factory.game');

const ROT = require('../../../lib/rot.js');
const PlayerDriver = require('../../helpers/player-driver');
const fs = require('fs');

describe('How Game is created from Overworld', function() {
    // this.timeout(240000);
    this.timeout(5 * 3600 * 1000); // 5 hours

    let game = null;

    beforeEach(() => {
        ROT.RNG.setSeed(0);
        RG.Rand = new RG.Random();
        RG.RAND.setSeed(0);
        const conf = {
            playMode: 'OverWorld',
            playerLevel: 'Medium',
            sqrPerItem: 100,
            sqrPerActor: 100,
            yMult: 0.5,
            playerClass: 'Blademaster'
        };
        const gameFact = new RG.Factory.Game();
        game = gameFact.createNewGame(conf);
    });

    afterEach(() => {
        game = null;
    });

    it('is created using factory from game/player objects', () => {

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

        /*
        const json = game.toJSON();
        const jsonStr = JSON.stringify(json);
        // console.log(jsonStr);
        RG.Verify.verifySaveData(json, false);
        const jsonParsed = JSON.parse(jsonStr);

        const fromJSON = new RG.Game.FromJSON();
        console.log('== Restoring the game from JSON ==');
        const newGame = fromJSON.createGame(jsonParsed);
        */
        let newGame = game;

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

        // Create some aid for the player
        const player = newGame.getPlayer();
        player.setName('Xanthur');
        player.remove('Hunger');
        /* const parser = RG.ObjectShell.getParser();
        const magicSword = parser.createItem('Magic sword');
        player.getInvEq().addItem(magicSword);
        player.getInvEq().equipItem(magicSword);*/

        console.log('===== Game simulation =====');
        const driver = new PlayerDriver(player);
        const catcher = new RGTest.MsgCatcher();
        // const area = game.getArea(0);
        // const [aX, aY] = [area.getMaxX(), area.getMaxY()];
        // game.movePlayer(aX - 1, 0);

        // Execute game in try-catch so we can dump data upon failure
        const maxTurns = 100000;
        try {
            for (let i = 0; i < maxTurns; i++) {
                if (i % 50 === 0) {
                    game.getPlayerOwPos();
                    console.log(`[TURN ${i}, ${i / maxTurns * 100}% completed`);
                }
                if (i > 0 && (i % 10000 === 0)) {
                    console.log('Saving/restoring game on turn ' + i);
                    const json = newGame.toJSON();
                    const jsonStr = JSON.stringify(json);
                    const fname = `save_dumps/temp${i}.json`;
                    fs.writeFileSync(fname, jsonStr);
                    const jsonParsed = JSON.parse(jsonStr);

                    const fromJSON = new RG.Game.FromJSON();
                    newGame = fromJSON.createGame(jsonParsed);
                    driver.setPlayer(newGame.getPlayer());

                }
                newGame.update(driver.nextCmd());
                if (newGame.isGameOver()) {
                    console.log('>>> GAME OVER <<<');
                    break;
                }
            }
        }
        catch (e) {
            console.log(e);
            let jsonStr = '';
            try {
                const json = newGame.toJSON();
                jsonStr = JSON.stringify(json);
            }
            catch (e2) {
                console.log(e2);
                jsonStr = JSON.stringify(driver);
            }
            const fname = 'save_dumps/battles_game_error_dump.json';
            fs.writeFileSync(fname, jsonStr);
        }

        console.log('Simulation OK. Saving final state');
        const json = newGame.toJSON();
        const jsonStr = JSON.stringify(json);
        const fname = 'save_dumps/game_final_' + driver.nTurns + '.json';
        fs.writeFileSync(fname, jsonStr);
        console.log('Final state saved to file ' + fname);

        catcher.hasNotify = false;
    });
});

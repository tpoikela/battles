
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

        /* const parser = RG.ObjectShell.getParser();
        const magicSword = parser.createItem('Magic sword');
        player.getInvEq().addItem(magicSword);
        player.getInvEq().equipItem(magicSword);*/

        // To load previous stage quickly
        const loadGame = false;
        const pName = 'Xanthur';
        const loadTurn = 85000;
        const saveGameEnabled = true;
        let driver = new PlayerDriver();

        if (loadGame) {
            const fname = `save_dumps/${pName}_temp_${loadTurn}.json`;
            // const fname = 'save_dumps/remove_bug.json';
            const buf = fs.readFileSync(fname);
            const jsonParsed = JSON.parse(buf.toString());
            if (jsonParsed.driver) {
                driver = PlayerDriver.fromJSON(jsonParsed.driver);
            }
            const fromJSON = new RG.Game.FromJSON();
            newGame = fromJSON.createGame(jsonParsed);
            console.log(`===== Game Loaded from turn ${loadTurn}`);
        }

        const player = newGame.getPlayer();
        player.setName(pName);
        player.remove('Hunger'); // AI not smart enough yet to deal with this
        driver.setPlayer(player);

        console.log('===== Begin Game simulation =====');
        driver.nTurns = loadGame ? loadTurn : 0;
        const catcher = new RGTest.MsgCatcher();
        // const area = game.getArea(0);
        // const [aX, aY] = [area.getMaxX(), area.getMaxY()];
        // game.movePlayer(aX - 1, 0);

        // Execute game in try-catch so we can dump save data on failure
        const mult = 5;
        const maxTurns = mult * 30000;
        try {
            const startI = loadGame ? loadTurn : 0;
            for (let nTurn = startI; nTurn < maxTurns; nTurn++) {
                if (nTurn % 50 === 0) {
                    newGame.getPlayerOwPos();
                    const compl = `${nTurn / maxTurns * 100}% completed`;
                    console.log(`[TURN ${nTurn}, ${compl}`);
                }

                // Save the game between certain intervals
                if (saveGameEnabled) {
                    if (nTurn > startI && (nTurn % (mult * 1000) === 0)) {
                        const fname = `save_dumps/${pName}_temp_${nTurn}.json`;
                        if (maxTurns >= 8000) { // Don't save for short games
                            const json = newGame.toJSON();
                            json.driver = driver.toJSON();
                            const jsonStr = JSON.stringify(json);
                            console.log(`Saving/restoring game to ${fname}`);
                            fs.writeFileSync(fname, jsonStr);
                            const jsonParsed = JSON.parse(jsonStr);

                            const fromJSON = new RG.Game.FromJSON();
                            newGame = fromJSON.createGame(jsonParsed);
                            driver = PlayerDriver.fromJSON(jsonParsed.driver);
                            driver.setPlayer(newGame.getPlayer());
                        }
                    }
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

        const nTurns = driver.nTurns;
        const fname = `save_dumps/${pName}_game_final_${nTurns}.json`;
        fs.writeFileSync(fname, jsonStr);
        console.log('Final state saved to file ' + fname);

        catcher.hasNotify = false;
        console.log('===== End Game simulation =====');
    });
});

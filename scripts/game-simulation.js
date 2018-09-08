
/* eslint no-process-exit: 0 */
/* A script to simulate actual game player with a player driver. */

require('babel-register');

const RG = require('../client/src/battles');
RG.Verify = require('../client/src/verify');
const RGTest = require('../tests/roguetest');
RG.Factory.Game = require('../client/src/factory.game');

const ROT = require('../lib/rot.js');
const PlayerDriver = require('../tests/helpers/player-driver');
const fs = require('fs');
const cmdLineArgs = require('command-line-args');
const UtilsSim = require('./utils-sim');

function main() {

    // Parse command line args
    const optDefs = UtilsSim.optDefs;
    let opts = cmdLineArgs(optDefs);
    opts = getDefaults(opts);
    if (opts.help) {
        usage(optDefs);
    }

    ROT.RNG.setSeed(opts.seed);
    RG.RAND = new RG.Random();
    RG.RAND.setSeed(opts.seed);

    let newGame = null;
    let driver = null;
    let loadGame = false;

    const pName = opts.name;
    const loadTurn = opts.loadturn ? opts.loadturn : 0;

    if (!pName) {
        throw new Error('Player name must be given with -name.');
    }

    // Create new game only if not loading
    if (!opts.load && !opts.file) {

        const conf = {
            playMode: 'OverWorld',
            playerLevel: 'Medium',
            sqrPerItem: 100,
            sqrPerActor: 100,
            yMult: 0.5,
            playerClass: 'Blademaster',
            playerRace: 'human',
            playerName: pName
        };

        const gameFact = new RG.Factory.Game();
        newGame = gameFact.createNewGame(conf);
        driver = new PlayerDriver();
        const player = newGame.getPlayer();
        player.setName(pName);
        player.remove('Hunger'); // AI not smart enough yet to deal with this
        driver.setPlayer(player);
    }
    else { // Otherwise just restore
        let fname = getFilename(pName, loadTurn);
        if (opts.file) {
            fname = opts.file;
        }
        if (fs.existsSync(fname)) {
            [newGame, driver] = restoreGameFromFile(fname);
            console.log(`===== Game Loaded from turn ${driver.nTurns}`);
        }
        else {
            const err = new Error(`${fname} does not exist.`);
            throw err;
        }
        loadGame = true;
    }

    // To load previous stage quickly
    const saveGameEnabled = !opts.nosave;
    // Does not depend on save game
    driver.screenPeriod = opts.framePeriod;

    console.log('===== Begin Game simulation =====');
    let catcher = null;
    if (!opts.nomsg) {
        catcher = new RGTest.MsgCatcher();
    }

    const maxTurns = driver.nTurns + parseInt(opts.maxturns, 10);
    const savePeriod = opts.save_period ? opts.save_period : 2000;

    // Execute game in try-catch so we can dump save data on failure
    try {
        const startI = loadGame ? driver.nTurns : 0;
        for (let nTurn = startI; nTurn < maxTurns; nTurn++) {
            if (nTurn % 50 === 0) {
                newGame.getPlayerOwPos();
                const compl = `${nTurn / maxTurns * 100}% completed`;
                console.log(`[TURN ${nTurn}, ${compl}`);
            }

            // Save the game between certain intervals
            if (saveGameEnabled) {
                if (nTurn > startI && (nTurn % (savePeriod) === 0)) {
                    if (maxTurns >= 1000) { // Don't save for short games
                        const fname = getFilename(pName, nTurn);
                        saveGameToFile(fname, nTurn, newGame, driver);
                        [newGame, driver] = restoreGameFromFile(fname);
                        driver.screenPeriod = opts.framePeriod;
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

    const nTiles = Object.keys(driver.state.tilesVisited).length;
    console.log(`Player visited ${nTiles} different tiles`);

    console.log('Simulation OK. Saving final state');

    const nTurns = driver.nTurns;
    const finalFname = `save_dumps/${pName}_game_final_${nTurns}.json`;
    saveGameToFile(finalFname, nTurns, newGame, driver);
    console.log('Final state saved to file ' + finalFname);

    if (catcher) {
        catcher.hasNotify = false;
    }
    console.log('===== End Game simulation =====');
}

main();

//---------------------------------------------------------------------------
// END OF SCRIPT, HELPER FUNCTIONS
//---------------------------------------------------------------------------

function getDefaults(opt) {
    const obj = Object.assign({}, opt);
    obj.name = obj.name || 'Xanthur';
    obj.maxturns = obj.maxturns || 10000;
    obj.framePeriod = obj.frame_period || 1;
    obj.seed = obj.seed || 0;
    return obj;
}

function getFilename(pName, nTurn) {
    const fname = `save_dumps/${pName}_temp_${nTurn}.json`;
    return fname;
}

// Saves the game, returns new game and driver objects
// ie {newgame, newdriver} = saveGameToFile(game, driver)
function saveGameToFile(fname, nTurn, game, driver) {
    console.log('\tsaveGameEnabled. Turn check OK.');
    console.log('\tDumping chunk load status now:');
    game.getChunkManager().debugPrint();

    const json = game.toJSON();
    json.nTurns = driver.nTurns;
    json.driver = driver.toJSON();
    json.rotRNGState = ROT.RNG.getState();
    const jsonStr = JSON.stringify(json);
    console.log(`Saving/restoring game to ${fname}`);
    fs.writeFileSync(fname, jsonStr);
}

function restoreGameFromFile(fname) {
    const buf = fs.readFileSync(fname);
    const jsonParsed = JSON.parse(buf);
    const fromJSON = new RG.Game.FromJSON();
    const game = fromJSON.createGame(jsonParsed);

    let driver = null;
    if (jsonParsed.driver) {
        driver = PlayerDriver.fromJSON(jsonParsed.driver);
        driver.setPlayer(game.getPlayer());
        driver.nTurns = jsonParsed.nTurns;
    }
    else {
        throw new Error('driver could not be restored.');
    }
    if (jsonParsed.rotRNGState) {
        ROT.RNG.setState(jsonParsed.rotRNGState);
    }
    return [game, driver];
}

function usage(optDefs) {
    UtilsSim.usage(optDefs);
    process.exit(0);
}

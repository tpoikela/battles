
/* eslint no-process-exit: 0 */
/* A script to simulate actual game player with a player driver. */

import * as RG from '../client/src/battles';
import {RGTest} from '../tests/roguetest';
import {FactoryGame} from '../client/src/factory.game';
import {Random} from '../client/src/random';
import {Dice} from '../client/src/dice';

import * as ROT from '../lib/rot-js';
import {PlayerDriver} from '../tests/helpers/player-driver';
import {UtilsSim} from './utils-sim';

import fs from 'fs';
const cmdLineArgs = require('command-line-args');

const {DMG, RESISTANCE} = RG.RG;
const Component = RG.Component;

const RNG = Random.getRNG();

let err = null;

function main() {

    // Parse command line args
    const optDefs = UtilsSim.optDefs;
    let opts = cmdLineArgs(optDefs);
    opts = UtilsSim.getDefaults(opts);
    if (opts.help) {
        usage(optDefs);
    }

    // opts.seed comes from defaults
    console.log('Start simulation with Seed: ', opts.seed);
    RNG.setSeed(opts.seed);
    ROT.RNG.setSeed(opts.seed);
    Dice.RNG.setSeed(opts.seed);

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
            playerLevel: 'Inhuman',
            sqrPerItem: 100,
            sqrPerActor: 100,
            xMult: opts.xmult || 0.5,
            yMult: opts.ymult || 0.5,
            playerClass: 'Blademaster',
            playerRace: 'human',
            playerName: pName
        };

        const gameFact = new FactoryGame();
        try {
            newGame = gameFact.createNewGame(conf);
            driver = new PlayerDriver();
            const player = newGame.getPlayer();
            player.setName(pName);
            player.remove('Hunger'); // AI not smart enough yet to deal with this

            // Add Coldness resistance
            const resComp = new Component.Resistance();
            resComp.setEffect(DMG.COLD);
            resComp.setLevel(RESISTANCE.IMMUNITY);
            player.add(resComp);

            driver.setPlayer(player);
        }
        catch (e) {
            err = e as Error;
            console.log('Creating game failed with:', err.message);
            throw e;
        }

        if (!newGame) {
            return;
        }
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
            err = new Error(`${fname} does not exist.`);
            throw err;
        }
        loadGame = true;
    }

    // To load previous stage quickly
    const saveGameEnabled = !opts.nosave;

    // Does not depend on save game
    if (driver) {
        driver.screenPeriod = opts.framePeriod;
    }

    console.log('===== Begin Game simulation =====');
    let catcher = null;
    if (!opts.nomsg) {
        catcher = new RGTest.MsgCatcher();
    }

    let maxTurns = parseInt(opts.maxturns, 10);
    const savePeriod = opts.save_period ? opts.save_period : 2000;

    if (driver) {
        maxTurns += driver.nTurns;
    }

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
                        if (!opts.nomsg) {
                            catcher = new RGTest.MsgCatcher(newGame.getPool());
                        }
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
        if (saveGameEnabled) {
            if (!fs.existsSync('save_dumps')) {
                fs.mkdirSync('save_dumps');
            }
            const fname = 'save_dumps/battles_game_error_dump.json';
            fs.writeFileSync(fname, jsonStr);
        }
    }

    const nTiles = Object.keys(driver.state.tilesVisited).length;
    console.log(`Player visited ${nTiles} different tiles`);
    console.log('Simulation OK. Saving final state');
    console.log('Seed: ', opts.seed);

    const nTurns = driver.nTurns;
    const finalFname = `save_dumps/${pName}_game_final_${nTurns}.json`;

    if (saveGameEnabled) {
        saveGameToFile(finalFname, nTurns, newGame, driver);
        console.log('Final state saved to file ' + finalFname);
    }

    if (catcher) {
        catcher.hasNotify = false;
    }
    console.log('===== End Game simulation =====');
    console.log(driver.getReport());

    if (err !== null) {
        throw err;
    }
}

main();

//---------------------------------------------------------------------------
// END OF SCRIPT, HELPER FUNCTIONS
//---------------------------------------------------------------------------

/*
function getDefaults(opt) {
    const obj = Object.assign({}, opt);
    obj.name = obj.name || 'Xanthur';
    obj.maxturns = obj.maxturns || 10000;
    obj.framePeriod = obj.frame_period || 1;
    obj.seed = obj.seed || 0;
    return obj;
}
*/

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

function restoreGameFromFile(fname: string) {
    const buf = fs.readFileSync(fname);
    const jsonParsed = JSON.parse(buf.toString().trim());
    const fromJSON = new RG.FromJSON();

    let game = new RG.GameMain();
    game = fromJSON.createGame(game, jsonParsed);

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

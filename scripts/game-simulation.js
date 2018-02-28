
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


function main() {

// Parse command line args
const optDefs = [
  {name: 'name', type: String,
      descr: 'Name of the character' },
  {name: 'frame_period', type: Number,
      descr: 'Print every Nth frame' },
  {name: 'load', type: Boolean,
      descr: 'Load game from the file'},
  {name: 'loadturn', type: Number,
      descr: 'Number of turn to load (optional)'},
  {name: 'maxturns', type: Number,
      descr: 'Turns to simulate'},
  {name: 'nosave', type: Boolean,
    descr: 'Disables saving during the simulation'},
  {name: 'save_period', type: Number,
    descr: 'Number of turns between saves'},
  {name: 'help', alias: 'h', type: Boolean,
    descr: 'Prints help message'}
];
let opts = cmdLineArgs(optDefs);
opts = getDefaults(opts);
if (opts.help) {
    usage(optDefs);
}

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
let newGame = gameFact.createNewGame(conf);

// To load previous stage quickly
const loadGame = opts.load ? true : false;
const pName = opts.name;
const loadTurn = opts.loadturn ? opts.loadturn : 0;
const saveGameEnabled = !opts.nosave;
let driver = new PlayerDriver();
const fname = getFilename(pName, loadTurn);
// const fname = `save_dumps/${pName}_temp_${loadTurn}.json`;
// const fname = 'save_dumps/1519583443971_saveGame_Tunas.json';
// const fname = 'save_dumps/bsave_1519586656174_saveGame_Tunas.json';
// const fname = 'save_dumps/remove_bug.json';

if (loadGame) {
    [newGame, driver] = restoreGameFromFile(fname);
    /*
    const buf = fs.readFileSync(fname);
    // const jsonParsed = JSON.parse(buf.toString());
    const jsonParsed = JSON.parse(buf);
    if (jsonParsed.driver) {
        driver = PlayerDriver.fromJSON(jsonParsed.driver);
    }
    if (jsonParsed.nTurns) {
        loadTurn = jsonParsed.nTurns;
    }
    else {
        console.warn('No nTurns found in same. Give it with -nturns');
    }
    const fromJSON = new RG.Game.FromJSON();
    newGame = fromJSON.createGame(jsonParsed);
    */
    console.log(`===== Game Loaded from turn ${loadTurn}`);
}

const player = newGame.getPlayer();
player.setName(pName);
player.remove('Hunger'); // AI not smart enough yet to deal with this
driver.setPlayer(player);
driver.screenPeriod = opts.framePeriod;

console.log('===== Begin Game simulation =====');
driver.nTurns = loadGame ? loadTurn : 0;
const catcher = new RGTest.MsgCatcher();
// const area = game.getArea(0);
// const [aX, aY] = [area.getMaxX(), area.getMaxY()];
// game.movePlayer(aX - 1, 0);

const maxTurns = loadTurn + opts.maxturns;
const savePeriod = opts.save_period ? opts.save_period : 2000;

// Execute game in try-catch so we can dump save data on failure
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
const json = newGame.toJSON();
const jsonStr = JSON.stringify(json);

const nTurns = driver.nTurns;
json.nTurns = nTurns;
json.driver = driver;

const finalFname = `save_dumps/${pName}_game_final_${nTurns}.json`;
fs.writeFileSync(finalFname, jsonStr);
console.log('Final state saved to file ' + finalFname);

catcher.hasNotify = false;
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
    json.nTurns = nTurn;
    json.driver = driver.toJSON();
    const jsonStr = JSON.stringify(json);
    console.log(`Saving/restoring game to ${fname}`);
    fs.writeFileSync(fname, jsonStr);
}

function restoreGameFromFile(fname) {
    const buf = fs.readFileSync(fname);
    const jsonParsed = JSON.parse(buf);
    const fromJSON = new RG.Game.FromJSON();
    const game = fromJSON.createGame(jsonParsed);
    const driver = PlayerDriver.fromJSON(jsonParsed.driver);
    driver.setPlayer(game.getPlayer());
    return [game, driver];
}

function usage(optDefs) {
    optDefs.forEach(opt => {
        const str = JSON.stringify(opt);
        console.log(str);
    });
    process.exit(0);
}

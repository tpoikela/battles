/* A script for profiling the game creation with large number of
 * tiles/features.  */

import * as RG from '../client/src/battles';
import fs = require('fs');

const seed = process.argv[2] || Date.now();
RG.Random.reseed(seed);
console.log('Seed used is', seed);

const factory = new RG.FactoryGame();
const startTime = new Date();
const jsonTest = true;

const gameConf = {
    playerLevel: 'Medium',
    sqrPerActor: 100,
    sqrPerItem: 100,
    playMode: 'OverWorld',
    loadedPlayer: null,
    loadedLevel: null,
    playerName: 'Player1',
    playerRace: 'goblin',
    playerClass: 'Adventurer',
    xMult: 2,
    yMult: 3
};

const game = factory.createNewGame(gameConf);
const endTime = new Date();

const durationMs = endTime.getTime() - startTime.getTime();
log('Creation took ' + durationMs + ' ms');

const levels = game.getLevels();
const nLevels = levels.length;
log('The game has ' + nLevels + ' distinct levels');

let nItems = 0;
let nActors = 0;

levels.forEach(level => {
    nItems += level.getItems().length;
    nActors += level.getActors().length;
});

log('The game has ' + nActors + ' actors.');
log('The game has ' + nItems + ' items.');

const area: RG.Area = game.getArea(0);
const cities: RG.City[] = area.getZones('City') as RG.City[];

log('There are', cities.length, 'cities created in the world');

const areaConf = area.getConf();
log('In total, found ' + areaConf.nCities + ' cities');

const overworld: RG.OWMap = game.getOverWorld();
const terrMap: RG.Territory = overworld.getTerrMap();

log('Map printed from perf-create-game.js:\n', overworld.mapToString());
log('perf-create-game.js:\n', terrMap.mapToString());

if (jsonTest) {
    for (let i = 0; i < 2; i++) {
        const json = game.toJSON();
        const jsonStr = JSON.stringify(json);
        console.log('JSON length of game is ' + jsonStr.length);

        const fromJSON = new RG.FromJSON();
        let newGame = new RG.GameMain();
        newGame = fromJSON.createGame(newGame, json);
        const newJSON = newGame.toJSON();
        const newJSONStr = JSON.stringify(newJSON);
        console.log('JSON length of NEW game is ' + newJSONStr.length);

        const fname = `perf-create-game${i}.json`;
        fs.writeFileSync('results/' + fname, newJSONStr);
    }
}

function log(...args) {
    console.log('[perf-create-game.js]', ...args);
}

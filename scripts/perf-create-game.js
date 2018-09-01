/* A script for profiling the game creation with large number of
 * tiles/features.  */

require('babel-register');

const RG = require('../client/src/battles');
const FromJSON = require('../client/src/game.fromjson');
const fs = require('fs');

const factory = new RG.Factory.Game();
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
console.log('Creation took ' + durationMs + ' ms');

const levels = game.getLevels();
const nLevels = levels.length;
console.log('The game has ' + nLevels + ' distinct levels');

let nItems = 0;
let nActors = 0;

levels.forEach(level => {
    nItems += level.getItems().length;
    nActors += level.getActors().length;
});

console.log('The game has ' + nActors + ' actors.');
console.log('The game has ' + nItems + ' items.');
console.log('Elements created: ' + RG.elementsCreated);

const area = game.getArea(0);
const cities = area.getZones('City');

console.log('There are', cities.length, 'cities in the world');

const overworld = game.getOverWorld();
const terrMap = overworld.terrMap;

console.log(overworld.mapToString());
console.log(terrMap.mapToString());

if (jsonTest) {
    const json = game.toJSON();
    const jsonStr = JSON.stringify(json);
    console.log('JSON length of game is ' + jsonStr.length);

    const fromJSON = new FromJSON();
    const newGame = fromJSON.createGame(json);
    const newJSON = newGame.toJSON();
    const newJSONStr = JSON.stringify(newJSON);
    console.log('JSON length of NEW game is ' + newJSONStr.length);

    fs.writeFileSync('results/perf-create-game.json', newJSONStr);
}


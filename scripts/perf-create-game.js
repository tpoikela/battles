/* A script for profiling the game creation with large number of
 * tiles/features.  */

require('babel-register');

const RG = require('../client/src/battles');

const factory = new RG.Factory.Game();
const startTime = new Date();

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
    yMult: 2
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


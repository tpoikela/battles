/* A quick script to check the simulation performance of the game. */

const RG = require('../client/src/battles.js');
const RGObjects = require('../client/data/battles_objects.js');
const RGEffects = require('../client/data/effects.js');

const parser = new RG.ObjectShellParser();
parser.parseShellData(RGObjects);
parser.parseShellData(RGEffects);

const game = new RG.Game.Main();
const level = RG.FACT.createLevel('arena', 400, 400);

const conf = {
    maxDanger: 20,
    monstersPerLevel: 5000,
    func: (actor) => (actor.danger < 100)
};

RG.FACT.addNRandMonsters(level, parser, conf);

game.addLevel(level);
game.addActiveLevel(level);

let frameCount = 0;
const startTime = new Date().getTime();

const numActorsBefore = level.getActors().length;

const nTurns = process.argv[2] || 10000;

for (let i = 0; i < nTurns; i++) {
    game.simulateGame();
    ++frameCount;
}
const numActorsAfter = level.getActors().length;

const endTime = new Date().getTime();

const duration = endTime - startTime;
const fps = 1000 * frameCount / (duration);

console.log('Ran for ' + duration + ' ms');
console.log('FPS: ' + fps);
console.log('Actors BEFORE ' + numActorsBefore);
console.log('Actors AFTER ' + numActorsAfter);

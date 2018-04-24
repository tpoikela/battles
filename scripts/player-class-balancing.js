
/* This script is for balancing player actor classes. */

require('babel-register');
const RG = require('../client/src/battles');
const Actors = require('../client/data/actors.js');

const actorClass = 'Marksman';
const playerLevel = 16;

const bestOf = '5';

const parser = RG.ObjectShell.getParser();

const shells = Actors.filter(a => !((/spirit/i).test(a.name)));

for (let i = 0; i < shells.length; i++) {
    const a1 = new Actor.Rogue();
    const a2 = shells[i];
    runBattleTest(a1, a2, histogram);

}

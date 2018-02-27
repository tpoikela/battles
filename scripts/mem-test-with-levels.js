

require('babel-register');

const RG = require('../client/src/battles');
const RGTest = require('../tests/roguetest');

const fact = new RG.Factory.Base();

const levels = [];

let selectCase = 0;
if (process.argv.length > 2) {
    selectCase = parseInt(process.argv[2], 10);
}


for (let i = 0; i < 1000; i++) {
    const level = fact.createLevel('arena', 100, 100);
    // Case 1: Pure Map.Level object
    if (selectCase === 0) {levels.push(level);}
    // Case 2: Serialized Map.Level object
    if (selectCase === 1) {levels.push(level.toJSON());}
    // Case 3: JSON stringified
    if (selectCase === 2) {levels.push(JSON.stringify(level));}
    if (i % 50 === 0) {
        RGTest.printMemUsage(`${i} levels created`);
    }
}

console.log(`Created ${levels.length} levels OK`);
RGTest.printMemUsage('END OF TEST');


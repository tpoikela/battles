

require('babel-register');


const RG = require('../client/src/battles');
const RGTest = require('../tests/roguetest');

const fact = new RG.Factory.Base();

const levels = [];

for (let i = 0; i < 1000; i++) {
    const level = fact.createLevel('arena', 100, 100);
    levels.push(JSON.stringify(level.toJSON()));
    if (i % 50 === 0) {
        RGTest.printMemUsage(`${i} levels created`);
    }
}

console.log(`Created ${levels.length} levels OK`);
RGTest.printMemUsage('END OF TEST');


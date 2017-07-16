/* A script for profiling performance of Map.Cellular. */

/*
 * Usage: node --prof scripts/perf-map-cellular.js
 *        node --prof-process isolate*** > processed.txt
 * in which isolate*** is the file produced from 1st command.
 */

const RG = require('../client/src/battles');

const startTime = new Date();

const levels = [];

const conf = {
    forestSize: 100,
    nForests: 50,
    ratio: 0.5
};

for (let i = 0; i < 20; i++) {
    levels.push(RG.FACT.createLevel('forest', 80, 28, conf));
}

console.log('Created nLevels: ' + levels.length);

const endTime = new Date();
const durationMs = endTime.getTime() - startTime.getTime();
console.log('Creation took ' + durationMs + ' ms');

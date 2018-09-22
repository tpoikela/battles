/* File contains code for procedural quest generation. */

const erratic = require('erratic');
const fs = require('fs');

const g = fs.readFileSync('client/data/quest-grammar.g', 'utf8');

// The grammar is stored in the string g
const rules = erratic.parse(g);
// console.log(JSON.stringify(rules));
console.log(erratic.generate(rules, 'QUEST'));

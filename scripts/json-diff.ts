

const fs = require('fs');

const file1 = '/home/tpoikela/Downloads/bsave_1569050216439_saveGame_Test1.json';
const file2 = '/home/tpoikela/Downloads/bsave_1569050284904_saveGame_Test2.json';

console.log('Reading input files into mem..');
const str1 = fs.readFileSync(file1).toString().trim();
const str2 = fs.readFileSync(file1).toString().trim();

console.log('Parsing JSON files now..');
const json1 = JSON.parse(str1);
const json2 = JSON.parse(str2);

console.log('Computing json-diff..');
//const diffStr = diff(json1, json2);
const diffStr = '';

console.log('Writing diff to output file');

fs.writeFileSync('./results/json_diff.txt', diffStr);


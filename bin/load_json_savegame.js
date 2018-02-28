#! /usr/bin/env node

require('babel-register');

const cmdLineArgs = require('command-line-args');
const fs = require('fs');

const RG = require('../client/src/battles');

const optDefs = [
    {name: 'all', type: Boolean, descr: 'Loads each file in directory'},
    {name: 'json', type: String, descr: 'JSON file to load'}
];

const opts = cmdLineArgs(optDefs);

if (!opts.json) {
    throw new Error('--json missing.');
}

const jsonFile = opts.json;
const buf = fs.readFileSync(jsonFile);
const json = JSON.parse(buf);

let allJSON = fs.readdirSync('save_dumps/');
allJSON = allJSON.sort();
console.log(allJSON);

let game = null;

try {
    const fromJSON = new RG.Game.FromJSON();
    game = fromJSON.createGame(json);
    game.update({key: RG.VK_PERIOD});
}
catch (e) {
    throw e;
}


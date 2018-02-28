#! /usr/bin/env node

require('babel-register');

const cmdLineArgs = require('command-line-args');
const fs = require('fs');

const RG = require('../client/src/battles');

const optDefs = [
    {name: 'all', type: Boolean, descr: 'Loads each file in directory'},
    {name: 'delete', type: Boolean, descr: 'Deletes invalid save game'},
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
}
catch (e) {
    if (opts.delete) {
        console.log('Deleting invalid save file ' + jsonFile);
        fs.unlinkSync(jsonFile);
    }
    throw e;
}

if (game) {
    game.update({code: RG.VK_PERIOD});
}

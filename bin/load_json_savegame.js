#! /usr/bin/env node

require('babel-register');

const cmdLineArgs = require('command-line-args');
const fs = require('fs');

const RG = require('../client/src/battles');

const optDefs = [
    {name: 'all', type: Boolean, descr: 'Loads each file in directory'},
    {name: 'delete', type: Boolean, descr: 'Deletes invalid save game'},
    {name: 'json', type: String, descr: 'JSON file to load'},
    {name: 'pretty', type: Boolean, descr: 'Output a pretty version'}
];

const opts = cmdLineArgs(optDefs);

if (!opts.json) {
    throw new Error('--json missing.');
}

if (opts.pretty) {
    outputPrettyVersion(opts.json);
}
else {
    tryToLoadFile(opts.json);
}

//---------------------------------------------------------------------------
// HELPER FUNCTIONS
//---------------------------------------------------------------------------

function outputPrettyVersion(jsonFile) {
    const buf = fs.readFileSync(jsonFile);
    const json = JSON.parse(buf);

    const baseName = (/^(.*)\.json/).exec(jsonFile)[1];
    if (baseName) {
        console.log(baseName);
        const jsonStr = JSON.stringify(json, null, ' ');
        const fName = baseName + '_pretty.json';
        fs.writeFileSync(fName, jsonStr);
        console.log('Prettified output written to ' + fName);
    }
    else {
        console.log('Cannot extract base name (before .json)');

    }
}

function tryToLoadFile(jsonFile) {
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
}

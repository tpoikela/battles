#! /usr/bin/env node

import cmdLineArgs from 'command-line-args';
import fs from 'fs';
import RG from '../client/src/rg';
import {FromJSON} from '../client/src/game.fromjson';
import {GameMain} from '../client/src/game';
import {Keys} from '../client/src/keymap';

interface Opt {
    name: string;
    type: any;
    alias?: string;
    descr: string;
}

const optDefs: Opt[] = [
    {name: 'all', type: Boolean, descr: 'Loads each file in directory'},
    {name: 'delete', type: Boolean, descr: 'Deletes invalid save game'},
    {name: 'json', type: String, descr: 'JSON file to load'},
    {name: 'pretty', type: Boolean, descr: 'Output a pretty version'},
    {name: 'help', type: Boolean, descr: 'Prints a help'}
];

const opts = cmdLineArgs(optDefs);
if (opts.help) {usage();}

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

function outputPrettyVersion(jsonFile: string) {
    const buf = fs.readFileSync(jsonFile);
    const json = JSON.parse(buf.toString().trim());

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

function tryToLoadFile(jsonFile: string) {
    const buf = fs.readFileSync(jsonFile);
    const json = JSON.parse(buf.toString().trim());

    let allJSON = fs.readdirSync('save_dumps/');
    allJSON = allJSON.sort();
    console.log(allJSON);

    let game = null;

    try {
        const fromJSON = new FromJSON();
        game = new GameMain();
        game = fromJSON.createGame(json, game);
    }
    catch (e) {
        if (opts.delete) {
            console.log('Deleting invalid save file ' + jsonFile);
            fs.unlinkSync(jsonFile);
        }
        throw e;
    }

    if (game) {
        game.update({code: Keys.VK.PERIOD});
    }
}

function usage() {
    console.log('Usage: load_json_savegame.js [opts]\n');
    optDefs.forEach((opt: Opt) => {
        if (opt.alias) {
            console.log(`\t--${opt.name},-${opt.alias}\t- ${opt.descr}`);
        }
        else {
            console.log(`\t--${opt.name}\t\t- ${opt.descr}`);
        }
    });
}


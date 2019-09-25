
import * as RG from '../client/src/battles';
const fs = require('fs');
// import {dbg} from 'debug';

// const debug = dbg('bitn:json-load-save-test');
// debug.enabled = true;
const debug = console.error;

// const fname = '/home/tpoikela/Downloads/bsave_for_test.json';
// const fname = '/home/tpoikela/Downloads/bsave_1567344532809_saveGame_Wuff_REF.json';
//const fname = '/home/tpoikela/Downloads/bsave_1567367171988_saveGame_Greyth.json';
// const fname = '/home/tpoikela/Downloads/bsave_1567368790924_saveGame_Greyth.json';
//const fname = '/home/tpoikela/Downloads/bsave_1569063816154_saveGame_Hurgh.json';
const fname = '/home/tpoikela/Downloads/bsave_1569355855632_saveGame_TestPlayer.json';
debug('Reading the JSON file...');

// console.log(buf);
const timeRecords = {
    start: {} as any,
    end: {} as any,
    dur: {} as any
};

debug('Reading the input file..');
const buf = fs.readFileSync(fname).toString();
debug('Trimming the read data..');
const jsonStr = buf.trim();
debug('Parsing now the original file...');
timeRecords.start.parse = Date.now();
const jsonParsed = JSON.parse(jsonStr);
timeRecords.end.parse = Date.now();
timeRecords.dur.parse = timeRecords.end.parse - timeRecords.start.parse;
console.log(`Parsing took ${timeRecords.dur.parse} ms`);

// let totalLen = 0;
let callDepth = 0;
const maxCallDepth = 20;
let IND = 0;
const printSizes = false;

if (printSizes) {
    debug('Analysing now the original file...');
    printSize(jsonParsed, '');
}

let loadedGameParsed = jsonParsed;
const testNewGame = true;

for (let i = 0; i < 3; i++) {
    if (testNewGame) {
        debug(`Starting round ${i+1}/3 now.`);
        timeRecords.start.begin = Date.now();
        debug('Creating new game from original file...');
        const fromJSON = new RG.FromJSON();
        let game = new RG.GameMain();
        timeRecords.start.create = Date.now();
        game = fromJSON.createGame(game, loadedGameParsed);
        timeRecords.end.create = Date.now();
        // game.simulate();
        console.log('\nNow trying to size of the game again...');
        console.log('\n====>>>> Going for second round');
        if (printSizes) {
            debug('Analysing serialized new game now...');
            printSize(loadedGameParsed, '');
        }

        for (let j = 0; j < 1; j++) {
            const key = `tile_${i},${j}`;
            timeRecords.start[key] = Date.now();
            game.movePlayer(i, j);
            timeRecords.end[key] = Date.now();
            timeRecords.dur[key] = timeRecords.end[key] - timeRecords.start[key];
        }

        debug('Serialising new game now to JSON...');
        timeRecords.start.toJson = Date.now();
        loadedGameParsed = game.toJSON();
        timeRecords.end.toJson = Date.now();

        timeRecords.dur.create = timeRecords.end.create - timeRecords.start.create;
        timeRecords.dur.toJson = timeRecords.end.toJson - timeRecords.start.toJson;
        Object.keys(timeRecords.dur).forEach((key: string) => {
            console.log(`${key} took ${timeRecords.dur[key]} ms`);
        });
    }
}

//---------------------------------------------------------------------------
// HELPERS
//---------------------------------------------------------------------------

function printSize(obj, startKey): void {
    console.log(`\n${indent(IND)} === printSize start with key ${startKey} === {{{`);
    ++IND;
    let largestKey = '';
    const keysBySize: {[key: string]: number} = {};
    let maxSize = 0;

    Object.keys(obj).forEach(key => {
        const str = JSON.stringify(obj[key]);
        if (!str) {
            console.log(`Null str for key ${key}, obj: `, obj);
        }
        else {
            const strLen = str.length;
            if (strLen > maxSize) {
                largestKey  = key;
                maxSize = strLen;
            }
            keysBySize[key] = strLen;
            // totalLen += strLen;
            console.log(`${indent(IND)}${startKey} ${key} - Size: ${strLen}`);
        }
    });

    const largestKeys = getNLargest(keysBySize, 2);
    largestKeys.forEach(key => {
        if (key) {
            if (typeof obj[key] === 'object') {
                if (callDepth < maxCallDepth) {
                    ++callDepth;
                    printSize(obj[key], startKey + '.' + key);
                    --callDepth;
                }
            }
        }
    });
    --IND;
    console.log(`${indent(IND)} }}}`);
}

function indent(ind: number) {
    return '  '.repeat(ind);
}

function getNLargest(keysBySize: {[key: string]: number}, n): string[] {
    const vals = Object.entries(keysBySize);
    vals.sort((a, b) => {
        if (a[1] > b[1]) {return -1;}
        else if (a[1] < b[1]) {return 1;}
        return 0;
    });
    const res: string[] = [];
    for (let i = 0; i < n; i++) {
        if (vals[i]) {
            res.push(vals[i][0]);
        }
    }
    return res;
}

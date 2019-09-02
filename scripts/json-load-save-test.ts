
import * as RG from '../client/src/battles';
const fs = require('fs');

// const fname = '/home/tpoikela/Downloads/bsave_for_test.json';
// const fname = '/home/tpoikela/Downloads/bsave_1567344532809_saveGame_Wuff_REF.json';
//const fname = '/home/tpoikela/Downloads/bsave_1567367171988_saveGame_Greyth.json';
const fname = '/home/tpoikela/Downloads/bsave_1567368790924_saveGame_Greyth.json';
const buf = fs.readFileSync(fname).toString();

// console.log(buf);

const jsonParsed = JSON.parse(buf.trim());

// let totalLen = 0;
let callDepth = 0;
const maxCallDepth = 20;
let IND = 0;

printSize(jsonParsed, '');

const fromJSON = new RG.FromJSON();
let game = new RG.GameMain();
game = fromJSON.createGame(game, jsonParsed);

console.log('\nNow trying to size of the game again...');
console.log('\n====>>>> Going for second round');
const loadedGameParsed = game.toJSON();
printSize(loadedGameParsed, '');

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
    largestKeys.forEach(largestKey => {
        if (largestKey) {
            if (typeof obj[largestKey] === 'object') {
                if (callDepth < maxCallDepth) {
                    ++callDepth;
                    printSize(obj[largestKey], startKey + '.' + largestKey);
                    --callDepth;
                }
            }
        }
    });
    --IND;
    console.log(`${indent(IND)} }}}`);

    /*
        if (typeof obj[largestKey] === 'object') {
            if (callDepth < maxCallDepth) {
                ++callDepth;
                printSize(obj[largestKey], startKey + '.' + largestKey);
            }
        }
    }
    */
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

/* A script to convert gemstone csv file into a JSON format
 * usable in Battles
 */
import fs = require('fs');
import RG from '../client/src/rg';

const csv = require('csvtojson');

const csvPath = 'csv/gemstones.csv';
const midResult = [];
const endResult = [];

const reCateg = /(\w+)+:/;
let subCateg = '';

csv().fromFile(csvPath).then(jsonArray => {

    let currEntry = null;

    jsonArray.forEach(entry => {
        if (reCateg.test(entry.Name)) {
            const mm = entry.Name.match(reCateg);
            subCateg = mm[1];
        }
        else if (entry.Name && entry.Name !== '') {
            if (currEntry) {
                currEntry.gemType = subCateg;
                midResult.push(convertEntry(currEntry));
            }
            currEntry = entry;
        }
        else if (currEntry !== null) {
            Object.keys(entry).forEach(key => {
                if (entry[key] && entry[key] !== '') {
                    currEntry[key] += ' ' + entry[key];
                }
            });
        }
    });

    console.log(JSON.stringify(midResult, null, 1));

    midResult.forEach(entry => {
        const newEntry = {
            type: 'mineral', base: 'MineralBase',
            name: entry.Name,
            gemType: entry.gemType,
            weight: {$$select: getWeight(entry)},
            value: {$$select: getValue(entry)},
            color: {fg: getColor(entry), bg: 'black'},
        };
        endResult.push(newEntry);
    });

    console.log(JSON.stringify(endResult, null, 4));

    const fName = 'client/data/items.gems.ts';
    const fHandle = fs.openSync(fName, 'w');
    fs.writeFileSync(fHandle, '/* tslint:disable */\n');
    fs.writeFileSync(fHandle, 'const GemItems = ');
    fs.writeFileSync(fHandle, JSON.stringify(endResult, null, 4));
    fs.writeFileSync(fHandle, ';\nexport {GemItems};');
});


function convertEntry(entry) {
    entry.Color = entry.Color.split(',');
    entry.Color = entry.Color.map(e => e.trim());
    entry.Cost = entry.Cost.replace('to', ',');
    if (entry.Cost === '' || entry.Cost === 'do.') {entry.Cost = 'Low';}
    // entry.Cost = entry.Cost.split(',');
    // entry.Cost = entry.Cost.map(e => e.trim());
    return entry;
}

function getValue(entry): number[] {
    const costStr = entry.Cost.toLowerCase();
    const value = [];
    if (/low/.test(costStr)) {value.push(30);}
    if (/(medium|mid)/.test(costStr)) {value.push(75);}
    if (/(very\s+high)/.test(costStr)) {value.push(300);}
    else if (/high/.test(costStr)) {value.push(150);}
    return value;
}

function getWeight(entry): number[] {
    return [0.1, 0.2, 0.4, 0.8];
}

function getColor(entry): string {
    const colors = entry.Color;
    // If gem name matches colorname, just return the name
    if (RG.COLORS.indexOf(entry.Name) >= 0) {
        return entry.Name;
    }

    let chosenColor = '';
    colors.forEach(color => {
        if (RG.COLORS.indexOf(color.capitalize()) >= 0) {
            chosenColor = color.capitalize();
        }

        if (chosenColor !== '') {return;} // Terminate loop
    });
    if (colors[0] === 'Colorless') {
        return 'GhostWhite';
    }
    return colors[0];
}

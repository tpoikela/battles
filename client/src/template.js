
const RG = require('./rg');

RG.Template = {};

const genRegex = /[A-Z]/;

RG.Template.createTemplate = function(str) {
    const lines = str.split('\n');
    let nLine = 0;
    let currLine = lines[0];

    // Skip possible empty line
    if (currLine.length === 0) {currLine = lines[++nLine];}
    const elemMap = {};
    while (currLine && currLine.length > 0) {
        const mapAndVal = currLine.split(/\s*=\s*/);
        if (mapAndVal.length === 2) {
            elemMap[mapAndVal[0]] = mapAndVal[1];
        }
        ++nLine;
        currLine = lines[nLine];
    }

    ++nLine; // Skip empty line
    // const templLines = [];

    // Parse x-generators from first line
    let currLineArr = lines[nLine].split('');
    const {xGenPos, xWidths} = getXWidthsAndGenXPos(currLineArr);
    console.log(JSON.stringify(xGenPos));
    console.log(JSON.stringify(xWidths));

    const rows = [];
    let y = 0;
    while (nLine < lines.length) {
        let x = 0;
        rows.push([]);
        currLineArr = lines[nLine].split('');
        xWidths.forEach(w => {
            const elem = currLineArr.slice(x, x + w);
            console.log(`x: ${x}, w: ${w}, elem: ${elem}`);
            rows[y][x] = elem;
            x += w;
        });
        ++nLine;
        ++y;
    }

    rows.forEach((r, i) => {
        console.log(`Row[${i}]: ${JSON.stringify(r)}`);
    });

    // With xWidths, we know the column widths now
    // xGenPos tells us the generator positions

    /*
    while (currLine && currLine.length > 0) {
        const splitLine = currLine.split('');
        const lineLen = splitLine.length;

        const result = [splitLine[0]];
        let prevChar = '';
        const currChar = splitLine[1];
        let str = currChar;

        for (let x = 1; x < lineLen - 1; x++) {

        }


        ++nLine;
        currLine = lines[nLine];
        templLines.push(result);
    }

    console.log(JSON.stringify(templLines));

    //const template = new ElemTemplate(templLines);
    return template;
    */
};

function getXWidthsAndGenXPos(currLineArr) {
    const lineLen = currLineArr.length;
    const xGenPos = {};
    const xWidths = [1];
    let prevChar = '';
    let currChar = '';
    let genXLen = 0;
    for (let x = 1; x < lineLen; x++) {
        currChar = currLineArr[x];
        if (genRegex.test(currChar)) {
            if (genXLen > 0) {
                if (prevChar === currChar) {
                    ++genXLen;
                }
                else {
                    xWidths.push(genXLen);
                    genXLen = 1;
                }
            }
            else {
                ++genXLen;
            }
        }
        else if (genXLen > 0) {
            xGenPos[x - genXLen] = genXLen;
            xWidths.push(genXLen);
            xWidths.push(1);
            genXLen = 0;
        }
        else {
            xWidths.push(1);
        }
        prevChar = currChar;
    }
    if (genXLen > 0) {
        xGenPos[lineLen - genXLen] = genXLen;
        xWidths.push(genXLen);
    }
    return {
        xGenPos,
        xWidths
    };
}

const ElemTemplate = function(elemMap, arr) {
    this.elemMap = elemMap;
    const nMaps = Object.keys(elemMap).length;
    this.sizeX = arr.length;
    this.sizeY = arr[0].length;

    this.elemArr = [];

    // Indicates which cells have generators
    this.hasGenXY = {};
    this.hasGenCol = {};
    this.hasGenRow = {};

    // Before Gen madness, place normal cells
    for (let x = 0; x < this.sizeX; x++) {
        for (let y = 0; y < this.sizeY; y++) {
            this.elemArr[x] = arr[x][y];
        }
    }

    // Find X-generators
    for (let x = 1; x < this.sizeX; x++) {
        const match = arr[x][0].match(/[A-Z]/);
        if (match) {
            console.log('Found GenX: ' + match);
        }
    }

    // Find Y-generator
    for (let y = 1; y < this.sizeY; y++) {
        const match = arr[0][y].match(/[A-Z]/);
        if (match) {
            console.log('Found GenY: ' + match);
        }
    }

    this.getChars = function(arr) {
        if (arr.length > 0 && arr.length !== nMaps) {
            RG.err('ElemTemplate', 'getChars',
                `Input array length must be ${nMaps}.`);
        }
        else {
            const result = [];
            for (let x = 0; x < this.sizeX; x++) {
                if (typeof this.elemArr[x][0] === 'object') {
                    result[x][0] = this.elemArr[x][0].getChars(arr[0]);
                }
            }
        }
    };
};
RG.Template.ElemTemplate = ElemTemplate;

const ElemGenX = function(str) {
    const len = str.length;

    this.length = () => len;

    this.getChars = function(N = 1) {
        return str.repeat(N);
    };

};
RG.Template.ElemGenX = ElemGenX;

const ElemGenY = function(strOrObj) {
    const hasGen = typeof strOrObj === 'object';

    /* Returns chars corresponding to this generator. */
    this.getChars = function(N = 1) {
        const res = [];
        if (hasGen) {
            for (let i = 0; i < N[1]; i++) {
                res.push(strOrObj.getChars(N[0]));
            }
        }
        else {
            for (let i = 0; i < N; i++) {
                res.push(strOrObj);
            }
        }
        return res;
    };

};
RG.Template.ElemGenY = ElemGenY;

module.exports = RG.Template;

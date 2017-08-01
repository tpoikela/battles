
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
    const asciiLines = [];
    while (nLine < lines.length) {
        asciiLines.push(lines[nLine]);
        ++nLine;
    }

    // Parse x-generators from first line
    let currLineArr = asciiLines[0].split('');
    const {genPos: xGenPos, widths: xWidths} = getWidthsAndGenPos(currLineArr);
    console.log(JSON.stringify(xGenPos));
    console.log(JSON.stringify(xWidths));

    const firstCol = [];
    const rows = [];
    let y = 0;
    for (let i = 0; i < asciiLines.length; i++) {
        let xSrc = 0;
        let xTarget = 0;
        rows.push([]);
        currLineArr = asciiLines[i].split('');
        console.log(JSON.stringify(`y: ${y} currLineArr: ${currLineArr}`));
        firstCol.push(currLineArr[0]);
        xWidths.forEach(w => {
            const elem = currLineArr.slice(xSrc, xSrc + w);
            console.log(`x: ${xSrc}, w: ${w}, elem: ${elem}`);
            if (elem) {
                rows[y][xTarget] = elem;
            }
            xSrc += w;
            ++xTarget;
        });
        ++y;
    }

    rows.forEach((r, i) => {
        console.log(`Row[${i}]: ${JSON.stringify(r)}`);
    });

    console.log('firstCols is: ' + JSON.stringify(firstCol));

    const {genPos: yGenPos, widths: yWidths} = getWidthsAndGenPos(firstCol);
    console.log('yGenPos: ' + JSON.stringify(yGenPos));
    console.log('yWidths: ' + JSON.stringify(yWidths));

    const conf = {
        xGenPos, yGenPos,
        xWidths, yWidths,
        rows,
        elemMap
    };

    const template = new ElemTemplate(conf);
    return template;
};

function getWidthsAndGenPos(currLineArr) {
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
            // xGenPos[x - genXLen] = genXLen;
            xGenPos[xWidths.length] = genXLen;
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
        // xGenPos[lineLen - genXLen] = genXLen;
        xGenPos[xWidths.length] = genXLen;
        xWidths.push(genXLen);
    }
    return {
        genPos: xGenPos,
        widths: xWidths
    };
}

const ElemTemplate = function(conf) {
    this.elemMap = conf.elemMap;
    const nMaps = Object.keys(this.elemMap).length;
    this.sizeX = conf.xWidths.length;
    this.sizeY = conf.rows.length;

    this.xWidths = conf.xWidths;
    this.yWidths = conf.yWidths;

    this.elemArr = [];

    // Indicates which cells have generators
    this.xGenPos = conf.xGenPos;
    this.yGenPos = conf.yGenPos;
    this.hasGenRow = {};

    // Before Gen madness, place normal cells
    for (let x = 0; x < this.sizeX; x++) {
        this.elemArr[x] = [];
        for (let y = 0; y < this.sizeY; y++) {
            this.elemArr[x][y] = conf.rows[y][x].join('');
        }
    }
    console.log(JSON.stringify('before X elemArray: ' + this.elemArr));

    Object.keys(this.xGenPos).forEach(x => {
        for (let y = 0; y < this.sizeY; y++) {
            console.log(`-- ${x}, ${y}`);
            const str = this.elemArr[x][y];
            this.elemArr[x][y] = new ElemGenX(str);
        }
    });

    console.log(JSON.stringify('elemArray: ' + this.elemArr));

    // Find Y-generator

    this.getChars = function(arr) {
        if (arr.length > 0 && arr.length !== nMaps) {
            RG.err('ElemTemplate', 'getChars',
                `Input array length must be ${nMaps}.`);
        }
        else {
            let index = 0; // Points to the generator array value
            let incrIndex = false; // Increment only on generators
            const xGenResult = [];
            for (let x = 0; x < this.sizeX; x++) {
                xGenResult[x] = [];
                for (let y = 0; y < this.sizeY; y++) {
                    if (typeof this.elemArr[x][y] === 'object') {
                        xGenResult[x][y] = this.elemArr[x][y].getChars(arr[index]);
                        incrIndex = true;
                    }
                    else {
                        xGenResult[x][y] = this.elemArr[x][y];
                    }
                }
                if (incrIndex) {
                    ++index; // Gen value changes per column
                    incrIndex = false;
                }
            }

            // X is fine, now apply Y-generators
            if (Object.keys(this.yGenPos).length > 0) {
                const yGenResult = [];
                // Use yWidths to generate a new array
                for (let x = 0; x < this.sizeX; x++) {
                    yGenResult[x] = [];
                    let y = 0;
                    let xGenY = 0;

                    console.log(`len xGen: ${xGenResult[x].length}`);
                    // Take w amount of rows from xGenResult
                    this.yWidths.forEach(w => {
                        console.log(`\tSlicing now ${xGenY}, ${xGenY + w}`);
                        yGenResult[x][y] = xGenResult[x].slice(xGenY, xGenY + w);
                        ++y;
                        xGenY += w;
                    });

                }
                console.log('y after widths ' + JSON.stringify(yGenResult));

                // Finally we expand the y-gens inline
                Object.keys(this.yGenPos).forEach(yPos => {
                    for (let x = 0; x < this.sizeX; x++) {
                        yGenResult[x][yPos] = this.expandYGen(arr[index],
                            yGenResult[x][yPos]);
                    }
                    ++index;
                });

                console.log('y after expand ' + JSON.stringify(yGenResult));
                // TODO flatten/substitute
                return yGenResult;
            }
            else {
                // TODO flatten/substitute
                return xGenResult;
            }
        }
        return [];
    };

    /*
    this.expandXGen = function(arr, elem) {

    };
    */

    this.expandYGen = function(val, elem) {
        console.log(`expandYGen ${val} -> ${elem}`);
        const newElem = [];
        for (let i = 0; i < val; i++) {
           newElem.push(elem);
        }
        return newElem;
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

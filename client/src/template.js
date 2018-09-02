
const RG = require('./rg');

RG.Template = {};

RG.Template.$DEBUG = 0;

const genRegex = /[A-Z]/;
const paramSplitRegex = /\s*=\s*/;
const propSplitRegex = /\s*:\s*/;

const debug = msg => {
    if (RG.Template.$DEBUG) {
        console.log('[DEBUG ' + msg);
    }
};

/*
 * Template format:
 *
 */

/* Creates and return ElemTemplate from a string.
 */
RG.Template.createTemplate = str => {
    const lines = str.split('\n');
    let nLine = 0;
    let currLine = lines[0];

    // Skip possible empty line
    if (currLine.length === 0) {currLine = lines[++nLine];}

    const elemMap = {};
    const elemPropMap = {};

    // Find params 'X=#' and props 'key:val'
    while (currLine && currLine.length > 0) {
        if (paramSplitRegex.test(currLine)) {
            const keyAndVal = currLine.split(paramSplitRegex);
            if (keyAndVal.length === 2) {
                const key = keyAndVal[0];
                const val = keyAndVal[1];
                if (key.length === val.length) {
                    elemMap[keyAndVal[0]] = keyAndVal[1];
                }
                else {
                    RG.err('Template', 'createTemplate',
                        `Key ${key}, val ${val} have different len`);
                }
            }
        }
        else if (propSplitRegex.test(currLine)) {
            const keyAndVal = currLine.split(propSplitRegex);
            if (keyAndVal.length === 2) {
                const key = keyAndVal[0];
                const val = keyAndVal[1];
                elemPropMap[key] = val;
            }
            else {
                RG.warn('Template', 'createTemplate',
                    `Prop must be key:val. Ignoring line ${currLine}`);
            }
        }
        // TODO maybe add logic to skip empty lines
        ++nLine;
        currLine = lines[nLine];
    }

    if (nLine === lines.length) {
        RG.err('Template', 'createTemplate',
            'No empty line between header and template section.');
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
    debug(JSON.stringify(xGenPos));
    debug(JSON.stringify(xWidths));

    const firstCol = [];
    const rows = [];
    let y = 0;
    for (let i = 0; i < asciiLines.length; i++) {
        let xSrc = 0;
        let xTarget = 0;
        rows.push([]);
        currLineArr = asciiLines[i].split('');
        debug(JSON.stringify(`y: ${y} currLineArr: ${currLineArr}`));
        firstCol.push(currLineArr[0]);

        for (let j = 0; j < xWidths.length; j++) {
            const w = xWidths[j];
            const elem = currLineArr.slice(xSrc, xSrc + w);
            debug(`x: ${xSrc}, w: ${w}, elem: ${elem}`);
            if (elem) {
                rows[y][xTarget] = elem;
            }
            xSrc += w;
            ++xTarget;
        }
        ++y;
    }

    rows.forEach((r, i) => {
        debug(`Row[${i}]: ${JSON.stringify(r)}`);
    });

    debug('firstCols is: ' + JSON.stringify(firstCol));

    const {genPos: yGenPos, widths: yWidths} = getWidthsAndGenPos(firstCol);
    debug('@yGenPos: ' + JSON.stringify(yGenPos));
    debug('@yWidths: ' + JSON.stringify(yWidths));

    const conf = {
        xGenPos, yGenPos,
        xWidths, yWidths,
        rows,
        elemMap
    };

    const template = new ElemTemplate(conf);
    template.setProps(elemPropMap);
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
                    xGenPos[xWidths.length] = genXLen;
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
    if (conf) {
        this.elemMap = conf.elemMap;
        this.nMaps = Object.keys(this.elemMap).length;
        this.sizeX = conf.xWidths.length;
        this.sizeY = conf.rows.length;

        this.xWidths = conf.xWidths;
        this.yWidths = conf.yWidths;

        // Indicates which cells have generators
        this.xGenPos = conf.xGenPos;
        this.yGenPos = conf.yGenPos;
    }
    this.elemPropMap = {};
    this.elemArr = [];
    this.hasGenRow = {};

    if (conf) {
        // Before Gen madness, place normal cells
        for (let x = 0; x < this.sizeX; x++) {
            this.elemArr[x] = [];
            for (let y = 0; y < this.sizeY; y++) {
                this.elemArr[x][y] = conf.rows[y][x].join('');
            }
        }

        Object.keys(this.xGenPos).forEach(x => {
            for (let y = 0; y < this.sizeY; y++) {
                const str = this.elemArr[x][y];
                this.elemArr[x][y] = new ElemGenX(str);
            }
        });
    }

    this.setProps = function(props) {
        this.elemPropMap = props;
    };

    this.getProp = function(name) {
        return this.elemPropMap[name];
    };

    /* Returns direction (dir property) as sorted string. */
    this.getDir = function() {
        const dir = this.getProp('dir');
        if (dir) {
            return dir.split('').sort().join('');
        }
        return '';
    };

    this.setProp = function(key, val) {
        this.elemPropMap[key] = val;
    };

    // Find Y-generator

    this.getChars = function(arr) {
        if (arr.length > 0 && arr.length < this.nMaps) {
            RG.err('ElemTemplate', 'getChars',
                `Input array length must be ${this.nMaps}.`);
        }
        else {
            let index = 0; // Points to the generator array value
            let incrIndex = false; // Increment only on generators
            const xGenResult = [];
            for (let x = 0; x < this.sizeX; x++) {
                xGenResult[x] = [];
                for (let y = 0; y < this.sizeY; y++) {
                    if (typeof this.elemArr[x][y] === 'object') {
                        const val = arr[index];
                        // const expVal = this.elemArr[x][y].getChars(val);
                        xGenResult[x][y] = this.elemArr[x][y].getChars(val);
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

            this.substituteXMaps(xGenResult);
            debug('X before split: ' + JSON.stringify(xGenResult));
            const splitRes = this.splitMultiElements(xGenResult);
            debug('After-X, Before-Y: ' + JSON.stringify(splitRes));
            // X is fine, now apply Y-generators
            if (Object.keys(this.yGenPos).length > 0) {
                const yGenResult = [];
                // Use yWidths to generate a new array
                for (let x = 0; x < this.sizeX; x++) {
                    yGenResult[x] = [];
                    let y = 0;
                    let xGenY = 0;

                    // Take w amount of rows from xGenResult
                    this.yWidths.forEach(w => {
                        yGenResult[x][y] =
                            xGenResult[x].slice(xGenY, xGenY + w);
                            // splitRes[x].slice(xGenY, xGenY + w);
                        ++y;
                        xGenY += w;
                    });

                }
                debug('y after widths ' + JSON.stringify(yGenResult));

                // Finally we expand the y-gens inline
                Object.keys(this.yGenPos).forEach(yPos => {
                    for (let x = 0; x < this.sizeX; x++) {
                        yGenResult[x][yPos] = this.expandYGen(arr[index],
                            yGenResult[x][yPos]);
                    }
                    ++index;
                });

                const flattened = RG.flattenTo2D(yGenResult);
                debug('y after flatten ' + JSON.stringify(flattened));
                const splitRes = this.splitMultiElements(flattened);
                debug('y after flatten ' + JSON.stringify(splitRes));

                this.substituteYMaps(splitRes);
                return splitRes;
            }
            else {
                debug('X-Before subst: ' + JSON.stringify(xGenResult));
                debug('X-After, split: ' + JSON.stringify(splitRes));

                return splitRes;
            }
        }
        return [];
    };

    this.expandYGen = (val, elem) => {
        debug(`expandYGen ${val} -> ${elem}`);
        const newElem = [];
        for (let i = 0; i < val; i++) {
           newElem.push(elem);
        }
        return newElem;
    };

    /* Substitutes the [A-Z] maps for specified ascii chars. */
    this.substituteXMaps = function(arr) {
        const sizeX = arr.length;
        Object.keys(this.elemMap).forEach(map => {
            const mapRe = new RegExp(map, 'g'); // Need re for global replace
            for (let x = 0; x < sizeX; x++) {
                arr[x][0] = arr[x][0].replace(mapRe, this.elemMap[map]);
            }
        });
    };

    /* Need to substitute the first column only. Arr is otherwise in correct
    * shape. */
    this.substituteYMaps = function(arr) {
        let firstCol = [];
        const sizeY = arr[0].length;
        for (let y = 0; y < sizeY; y++) {
            firstCol.push(arr[0][y]);
        }
        debug('firstCol is now: ' + JSON.stringify(firstCol));
        let str = firstCol.join('');
        Object.keys(this.elemMap).forEach(map => {
            const mapRe = new RegExp(map, 'g'); // Need re for global replace
            str = str.replace(mapRe, this.elemMap[map]);
        });

        // Convert string back to 1st column array
        firstCol = str.split('');
        debug('firstCol END: ' + JSON.stringify(firstCol));

        if (RG.Template.$DEBUG) {
            RG.printMap(arr);
        }
        // Re-apply the substituted column
        for (let y = 0; y < sizeY; y++) {
            arr[0][y] = firstCol[y];
        }
    };

    /* Splits elements like [aa, bb, cc] into [a, b, c], [a, b, c]
    * Has no impact on single elemns like [a, b, c] */
    this.splitMultiElements = arr => {
        const sizeX = arr.length;
        const res = [];
        let realX = 0;
        for (let x = 0; x < sizeX; x++) {
            const col = arr[x];
            const nChars = col[0].length;
            if (nChars > 1) { // Need to split this
                debug(`Splitting ${nChars} nChars: ${col}`);
                for (let y = 0; y < col.length; y++) {
                   // Take one char per y
                   const row = col[y];
                    let writeIndex = realX;
                    row.split('').forEach(char => {
                        if (y === 0) {
                            // Create new array on 1st index
                            res.push([char]);
                            debug('\tres push ' + JSON.stringify(res));
                        }
                        else {
                            // ..and push to array on 2nd,3rd etc
                            res[writeIndex++].push(char);
                            debug('\tres[x] push ' + JSON.stringify(res));
                        }
                    });
                }
                realX += nChars; // Real X dim was expanded by nChars
            }
            else {
                ++realX;
                res.push(col);
            }
        }
        return res;
    };

    /* Clones the template into a new object and returns it. */
    this.clone = () => {
        const newElem = new ElemTemplate();
        const newTempl = JSON.parse(JSON.stringify(this));
        Object.keys(newTempl).forEach(key => {
            newElem[key] = newTempl[key];
        });
        Object.keys(this.xGenPos).forEach(xPos => {
            for (let y = 0; y < this.sizeY; y++) {
                const char = newElem.elemArr[xPos][y].genX;
                newElem.elemArr[xPos][y] = new ElemGenX(char);
            }
        });
        return newElem;
    };
};
RG.Template.ElemTemplate = ElemTemplate;

const ElemGenX = function(str) {
    const len = str.length;

    this.length = () => len;

    this.getChars = (N = 1) => str.repeat(N);

    this.toJSON = () => {
        return {genX: str};
    };

};
RG.Template.ElemGenX = ElemGenX;

/* Two transformations are needed to achieve all possible orientations:
 * 1. Rotation 90 degrees to right (clockwise): R90
 * 2. Flipping (mirroring) over vertical (y-axis): flipY
 */

const exitMaps = {};
// Transforms don't change the generator locations, but the generator tiles must
// be swapped of course. To transform:
//   1. Replace generator vars with their tiles,
//   2. Then do the transformation of x- and y-coordinates
//   3. Add gen vars back to their original place, but change the gen var tiles

const r90ExitMap = {N: 'E', E: 'S', S: 'W', W: 'N'};
exitMaps.rotate90 = r90ExitMap;
exitMaps.rotate180 = r90ExitMap;
exitMaps.rotate270 = r90ExitMap;

/* Rotates the template 90 degrees to the right.*/
RG.Template.rotateR90 = function(templ, exitMap = r90ExitMap) {
    const newTempl = templ.clone();
    remapExits(newTempl, exitMap);
    const genVars = [];
    let nGenVars = Object.keys(newTempl.xGenPos).length;
    nGenVars += Object.keys(newTempl.yGenPos).length;
    for (let n = 0; n < nGenVars; n++) {
        genVars.push(1);
    }
    const ascii = newTempl.getChars(genVars);
    const sizeY = ascii[0].length;
    const rotated = new Array(sizeY);
    for (let y = 0; y < sizeY; y++) {
        rotated[y] = [];
    }

    for (let x = 0; x < ascii.length; x++) {
        for (let y = 0; y < sizeY; y++) {
            rotated[sizeY - 1 - y].push(ascii[x][y]);
        }
    }

    // Switch x/y gen position
    newTempl.yGenPos = Object.assign({}, templ.xGenPos);
    const rotSizeX = rotated.length;

    newTempl.xGenPos = {};
    Object.keys(templ.yGenPos).forEach(yPos => {
        const newYPos = rotSizeX - 1 - yPos;
        newTempl.xGenPos[newYPos] = templ.yGenPos[yPos];
    });

    newTempl.elemArr = rotated;
    // Replace string with X generators
    Object.keys(newTempl.xGenPos).forEach(xPos => {
        for (let y = 0; y < newTempl.sizeY; y++) {
            try {
                newTempl.elemArr[xPos][y] = new ElemGenX(
                    newTempl.elemArr[xPos][y]);
            }
            catch (e) {
                console.log('Template:', newTempl.getProp('name'));
                console.log('xGenPos: ', newTempl.xGenPos);
                throw new Error(e);
            }
        }
    });

    return newTempl;
};


RG.Template.rotateR180 = function(templ, exitMap = r90ExitMap) {
    const newTempl = RG.Template.rotateR90(templ, exitMap);
    return RG.Template.rotateR90(newTempl, exitMap);
};

RG.Template.rotateR270 = function(templ, exitMap = r90ExitMap) {
    const newTempl = RG.Template.rotateR180(templ, exitMap);
    return RG.Template.rotateR90(newTempl, exitMap);
};

const flipVerExitMap = {E: 'W', W: 'E'};
exitMaps.flipVer = flipVerExitMap;

/* Flips the template over vertical axis. */
RG.Template.flipVer = function(templ, exitMap = flipVerExitMap) {
    const newTempl = templ.clone();

    // Only need to mirror E -> W or
    remapExits(newTempl, exitMap);

    const genVars = [];
    let nGenVars = Object.keys(newTempl.xGenPos).length;
    nGenVars += Object.keys(newTempl.yGenPos).length;
    for (let n = 0; n < nGenVars; n++) {
        genVars.push(1);
    }

    const sizeX = newTempl.sizeX;
    const flipped = new Array(sizeX);
    for (let x = 0; x < sizeX; x++) {
        flipped[x] = [];
    }

    const sizeY = newTempl.sizeY;
    const ascii = newTempl.getChars(genVars);

    // Flip x,y coords here. y is unchanged, x flips
    for (let x = 0; x < sizeX; x++) {
        for (let y = 0; y < sizeY; y++) {
            flipped[sizeX - 1 - x][y] = ascii[x][y];
        }
    }

    const flippedSizeX = flipped.length;
    // x-gen positions must also be flipped
    newTempl.xGenPos = {};
    Object.keys(templ.xGenPos).forEach(xPos => {
        if (xPos < (flippedSizeX - 1)) {
            const newXPos = flippedSizeX - 1 - xPos;
            newTempl.xGenPos[newXPos] = templ.xGenPos[xPos];
        }
        else { // Cannot flip on last position, so preserve it
            const newXPos = xPos;
            newTempl.xGenPos[newXPos] = templ.xGenPos[xPos];
        }
    });

    newTempl.elemArr = flipped;
    // Finally, replace string with X generators
    Object.keys(newTempl.xGenPos).forEach(xPos => {
        for (let y = 0; y < newTempl.sizeY; y++) {
            newTempl.elemArr[xPos][y] = new ElemGenX(newTempl.elemArr[xPos][y]);
        }
    });

    return newTempl;
};

function remapExits(templ, exitMap) {
    const dirStr = templ.getProp('dir');
    if (dirStr) {
        const dir = dirStr.split('');
        dir.forEach((val, i) => {
            if (exitMap.hasOwnProperty(val)) {
                dir[i] = exitMap[val];
            }
        });
        templ.setProp('dir', dir.join(''));
    }
}

/* Creates all specified transforms for the given list of templates. */
function transformList(templates, transforms, exitMap) {
    if (RG.isNullOrUndef([templates])) {
        RG.err('Template', 'transformList',
            'Input list templates is null');
    }
    let result = [];

    // Default option is to transform all, usually unnecessary but does not
    // require any setup from the user
    if (!transforms) {
        transforms = {
            all: '*', flipVer: [], rotateR90: [], rotateR180: [],
            rotateR270: []
        };
    }

    // Transformation of each template added
    Object.keys(transforms).forEach(func => {
        if (func !== 'all') {
            const created = [];

            let names = transforms[func];
            if (transforms.all === '*') {
                names = templates.map(t => t.getProp('name'));
            }
            else {
                names = names.concat(transforms.all);
            }

            names.forEach(name => {
                const templ = templates.find(t => (
                    t.getProp('name') === name
                ));

                if (templ) {
                    const map = exitMap ? exitMap[func] : exitMaps[func];
                    const newTempl = RG.Template[func](templ, map);
                    setTransformName(func, newTempl);
                    created.push(newTempl);
                    if (func === 'flipVer') {
                        const rotations = getRotations(transforms, name);
                        rotations.forEach(rot => {
                            const map = exitMap ? exitMap[rot] : exitMaps[rot];
                            const rotTempl = RG.Template[rot](newTempl, map);
                            setTransformName(rot, rotTempl);
                            created.push(rotTempl);
                        });
                    }
                }

            });
            result = result.concat(created);
        }
    });
    return result;
}
RG.Template.transformList = transformList;

/* Finds which rotations need to be applied to given template by name. This is
 * mainly used when flipping vertical to find which rotations must be done. */
function getRotations(transforms, name) {
    const found = [];
    const rotations = ['rotateR90', 'rotateR180', 'rotateR270'];
    rotations.forEach(rot => {
        if (transforms[rot].indexOf(name) >= 0 || transforms.all === '*') {
            found.push(rot);
        }
    });
    return found;
}

function setTransformName(func, templ) {
    let name = templ.getProp('name');
    switch (func) {
        case 'rotateR90': name += '_r90'; break;
        case 'rotateR180': name += '_r180'; break;
        case 'rotateR270': name += '_r270'; break;
        case 'flipVer': name += '_flip'; break;
        default: break;
    }
    templ.setProp('name', name);
}

module.exports = RG.Template;

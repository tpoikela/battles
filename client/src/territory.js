
/* Code here is used to generate territories for different clans/races for the
 * overworld map.
 */

const RG = require('./rg');
const Geometry = require('./geometry');

const RNG = RG.Random.getRNG();
const EMPTY = '.';
const FULL = '#';
const FILL_ALL = -1;

const Territory = function(cols, rows, conf = {}) {
    this.map = new Array(cols);
    this.cols = cols;
    this.rows = rows;

    // Internal state of the generator
    this.rivals = [];
    this.currRivals = [];
    this.empty = {};
    this.occupied = {};
    this.occupiedBy = {};
    this.numEmpty = 0;
    this.numCells = cols * rows;

    // Generated territory data
    this.terrData = {};

    // Config variables (can be set via conf)
    this.rng = RNG;
    this.doPostProcess = true;
    this.maxNumPos = 1;
    this.startSize = 1;
    this.maxFillRatio = 1.0;
    // By default, use only 4 directions
    this.dirs = RG.DIR_NSEW.concat(RG.DIR_DIAG);

    // Set options passed in as a conf object
    const confVals = ['maxNumPos', 'startSize', 'dirs', 'doPostProcess',
        'maxFillRatio', 'rng'];
    confVals.forEach(key => {
        if (conf.hasOwnProperty(key)) {
            this[key] = conf[key];
        }
    });

    for (let i = 0; i < cols; i++) {
        this.map[i] = new Array(rows);
        for (let j = 0; j < rows; j++) {
            this._markEmpty(i, j);
        }
    }
};

Territory.prototype.setRNG = function(rng) {
    this.rng = rng;
};

Territory.prototype.getMap = function() {
    return this.map;
};

Territory.prototype.getData = function(name) {
    if (this.terrData[name]) {return this.terrData[name];}
    return this.terrData;
};

Territory.prototype._markEmpty = function(x, y) {
    this.map[x][y] = EMPTY;
    this.empty[x + ',' + y] = [x, y];
    ++this.numEmpty;
};

Territory.prototype.hasRival = function(xy) {
    return !this.isEmpty(xy) &&
        !this.isFull(xy);
};

/* Gets the rival name of x,y cell. */
Territory.prototype.getRival = function(xy) {
    const [x, y] = xy;
    const char = this.map[x][y];
    return this.getName(char);
};

/* Given a 2d map, and cell info such as {'.': true, '#': false},
 * marks all cells in this.map as empty which have '.' in map,
 * and all cells full, which have '#' in given map.
 */
Territory.prototype.useMap = function(map, cellInfo) {
    this.numEmpty = 0;
    for (let x = 0; x < map.length; x++) {
        for (let y = 0; y < map[0].length; y++) {
            if (cellInfo[map[x][y]]) {
                this._markEmpty(x, y);
            }
            else {
                this.map[x][y] = FULL;
                delete this.empty[x + ',' + y];
            }
        }
    }
};

Territory.prototype.addRival = function(data) {
    this._initRival(data);
};

Territory.prototype.generate = function(maxTurns = FILL_ALL) {
    this.currRivals = this.rivals.slice();
    this.rng.shuffle(this.currRivals);
    let numTurnsTaken = 0;
    while (this._hasTurnsLeftToProcess(numTurnsTaken, maxTurns)) {
        const next = this.currRivals.shift();
        // TODO Check if there is weight on the size

        const {name} = next;
        const contData = this.terrData[name];
        const {open, currPos, maxNumPos} = contData;

        // If no cells occupied, pick one randomly
        if (currPos < maxNumPos) {
            const xy = this._getStartPosition(name);
            this._addStartPosition(name, xy);
            this.currRivals.push(next);
        }
        else if (Object.keys(open).length > 0) {
            const xy = this.getRandOpenXY(name);
            const emptyXY = this.getEmptyAdjacentXY(xy);
            if (emptyXY) {
                this._addOccupied(name, emptyXY);
                this.currRivals.push(next);
            }
            else {
                this._closeCell(name, xy);
                if (Object.keys(open).length > 0) {
                    this.currRivals.push(next);
                }
            }
        }
        ++numTurnsTaken;
    }
    if (this.doPostProcess) {
        this.postProcessData();
    }
};

/* Given char representing a rival name on the map, returns name for that
 * rival. */
Territory.prototype.getName = function(char) {
    const found = this.rivals.find(rival => rival.char === char);
    if (found) {return found.name;}
    return null;
};

Territory.prototype.getFillRatio = function() {
    return (this.numCells - this.numEmpty) / this.numCells;
};

Territory.prototype._hasTurnsLeftToProcess = function(numTurns, maxTurns) {
    return (this.hasEmpty()
        && (this.currRivals.length > 0)
        && (numTurns !== maxTurns)
        && (this.getFillRatio() < this.maxFillRatio)
    );
};


/* Returns the starting position for given rival name. */
Territory.prototype._getStartPosition = function(name) {
    const contData = this.terrData[name];
    const {currPos} = contData;
    const xy = this.getRandEmptyXY();
    if (contData.startX.length > currPos) {
        xy[0] = contData.startX[currPos];
    }
    else {
        contData.startX.push(xy[0]);
    }

    if (contData.startY.length > currPos) {
        xy[1] = contData.startY[currPos];
    }
    else {
        contData.startY.push(xy[1]);
    }

    const key = _key(xy);
    if (!this.empty.hasOwnProperty(key)) {
        if (this.map[xy[0]][xy[1]] !== FULL) {
            RG.warn('Territory', '_getStartPosition',
                `${name} overriding another position @ ${xy}`);
        }
    }

    // TODO this can override starting points of other currRivals

    contData.currPos += 1;
    return xy;
};


Territory.prototype._addOccupied = function(name, xy) {
    const key = _key(xy);
    this.occupied[key] = xy;
    this.occupiedBy[name].push(xy);
    this.terrData[name].open[key] = xy;
    this.terrData[name].occupied[key] = xy;
    this.map[xy[0]][xy[1]] = this.terrData[name].char;

    // 1st cell can be forced to be non-empty, but if not,
    // then clear the empty cell
    if (this.empty[key]) {
        --this.numEmpty;
        delete this.empty[key];
    }
};

Territory.prototype._addStartPosition = function(name, xy) {
    const contData = this.getData(name);
    const dSize = contData.startSize - 1;
    const startCoord = Geometry.getBoxAround(xy[0], xy[1], dSize, true);
    startCoord.forEach(xyStart => {
        if (this.isEmpty(xyStart)) {
            this._addOccupied(name, xyStart);
        }
    });
};

Territory.prototype.getRandEmptyXY = function() {
    return this.rng.arrayGetRand(Object.values(this.empty));
};

Territory.prototype.isFull = function(xy) {
    const [x, y] = xy;
    return this.map[x][y] === FULL;
};

Territory.prototype.isEmpty = function(xy) {
    const key = _key(xy);
    return this.empty.hasOwnProperty(key);
};

Territory.prototype.getRandOpenXY = function(name) {
    const {open} = this.terrData[name];
    return this.rng.arrayGetRand(Object.values(open));
};

Territory.prototype.getEmptyAdjacentXY = function(xy) {
    const dirs = this.dirs.slice();
    this.rng.shuffle(dirs);
    while (dirs.length > 0) {
        const nextDir = dirs.shift();
        const [nX, nY] = RG.newXYFromDir(nextDir, xy);
        if (this.hasXY(nX, nY)) {
            if (this.map[nX][nY] === EMPTY) {
                return [nX, nY];
            }
        }
    }
    return null;
};

Territory.prototype.hasXY = function(nX, nY) {
    return nX >= 0 && nY >= 0 &&
        nX < this.map.length && nY < this.map[0].length;
};

Territory.prototype._closeCell = function(name, xy) {
    const key = _key(xy);
    this.terrData[name].closed[key] = xy;
    delete this.terrData[name].open[key];
};

Territory.prototype.hasEmpty = function() {
    return this.numEmpty > 0;
};


Territory.prototype.mapToString = function() {
    const sizeY = this.map[0].length;
    const sizeX = this.map.length;

    const lines = [];
    for (let y = 0; y < sizeY; y++) {
        const line = [];
        for (let x = 0; x < sizeX; x++) {
            line.push(this.map[x][y]);
        }
        lines.push(line);
    }
    return lines.map(line => line.join(''));
};

/* Histogram of how many cells each contestant occupies. */
Territory.prototype.getAreaProportions = function() {
    const hist = {};
    Object.keys(this.occupiedBy).forEach(name => {
        hist[name] = this.occupiedBy[name].length;
    });
    return hist;
};

Territory.prototype._initRival = function(data) {
    this.rivals.push(data);
    const {name, char} = data;
    this.terrData[name] = {
        currPos: 0,
        maxNumPos: this.maxNumPos,
        char,
        occupied: {},
        closed: {}, // Cannot try anymore
        open: {}, // Available for trying
        startX: [],
        startY: [],
        startSize: this.startSize // How big is the starting region
    };

    if (data.startX >= 0) {
        this.terrData[name].startX = [data.startX];
    }
    else if (Array.isArray(data.startX)) {
        this.terrData[name].startX = data.startX;
    }

    if (data.startY >= 0) {
        this.terrData[name].startY = [data.startY];
    }
    else if (Array.isArray(data.startY)) {
        this.terrData[name].startY = data.startY;
    }

    if (data.numPos) {
        this.terrData[name].maxNumPos = data.numPos;
    }
    else if (data.maxNumPos) {
        this.terrData[name].maxNumPos = data.maxNumPos;
    }

    if (data.startSize) {
        this.terrData[name].startSize = data.startSize;
    }
    this.occupiedBy[name] = [];
};

/* Does processing like floodfilling the regions to find continuous areas for
 * different currRivals.
 */
Territory.prototype.postProcessData = function() {
    const diag = this.dirs.length > 4 ? true : false;
    const names = Object.keys(this.terrData);
    names.forEach(name => {
        const contData = this.terrData[name];
        const {startX, startY, char} = contData;

        contData.numOccupied = Object.keys(contData.occupied).length;

        contData.areas = {};
        startX.forEach((x, i) => {
            const xy = [x, startY[i]];
            const lut = {};
            const coordXY = Geometry.floodfill2D(this.map, xy, char, lut, diag);
            contData.areas[_key(xy)] = coordXY;
        });

    });
};

/* To serialize the territory. */
Territory.prototype.toJSON = function() {
    const json = {
        terrData: this.terrData,
        map: this.map,
        cols: this.cols,
        rows: this.rows,
        currRivals: this.currRivals,
        empty: this.empty,
        occupied: this.occupied,
        occupiedBy: this.occupiedBy,
        numEmpty: this.numEmpty,
        dirs: this.dirs
    };
    return json;
};

Territory.fromJSON = function(json) {
    const terrMap = new Territory();
    Object.keys(json).forEach(key => {
        terrMap[key] = json[key];
    });
    return terrMap;
};

function _key(xy) {
    return xy[0] + ',' + xy[1];
}

module.exports = Territory;

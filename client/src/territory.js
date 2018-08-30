
/* Code here is used to generate territories for different clans/races for the
 * overworld map.
 */

const RG = require('./rg');

const RNG = RG.Random.getRNG();
const EMPTY = 'e';
const FULL = '#';

const Territory = function(cols, rows) {
    this.map = new Array(cols);
    this.contestants = [];
    this.empty = {};
    this.occupied = {};
    this.occupiedBy = {};

    this.data = {};
    this.numEmpty = 0;

    this._rng = RNG;

    // By default, use only 4 directions
    this.dirs = RG.DIR_NSEW.concat(RG.DIR_DIAG);

    for (let i = 0; i < cols; i++) {
        this.map[i] = new Array(rows);
        for (let j = 0; j < rows; j++) {
            this._markEmpty(i, j);
        }
    }
};

Territory.prototype.setRNG = function(rng) {
    this._rng = rng;
};

Territory.prototype.getMap = function() {
    return this.map;
};

Territory.prototype.getData = function(name) {
    if (this.data[name]) {return this.data[name];}
    return this.data;
};

Territory.prototype._markEmpty = function(x, y) {
    this.map[x][y] = EMPTY;
    this.empty[x + ',' + y] = [x, y];
    ++this.numEmpty;
};

/* Given a 2d map, and cell info such as {'.': true, '#': false},
 * marks all cells in this.map as empty which have '.' in map,
 * and all cells full, which have '#' in given map.
 */
Territory.prototype.setAsEmpty = function(map, cellInfo) {
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

Territory.prototype.addContestant = function(data) {
    this._initContestant(data);
};

Territory.prototype.generate = function() {
    this._rng.shuffle(this.contestants);
    while (this.hasEmpty() && this.contestants.length > 0) {
        const next = this.contestants.shift();
        // TODO Check if there is weight on the size

        const {name} = next;
        const contData = this.data[name];
        const {open, currPos, maxNumPos} = contData;

        // If no cells occupied, pick one randomly
        if (currPos < maxNumPos) {
            const xy = this.getStartPosition(name);
            this.addOccupied(name, xy);
            this.contestants.push(next);
        }
        else if (Object.keys(open).length > 0) {
            const xy = this.getOpenXY(name);
            const emptyXY = this.getEmptyAdjacentXY(xy);
            if (emptyXY) {
                this.addOccupied(name, emptyXY);
                this.contestants.push(next);
            }
            else {
                this._closeCell(name, xy);
                if (Object.keys(open).length > 0) {
                    this.contestants.push(next);
                }
            }
        }
    }
};

/* Returns the starting position for given contestant name. */
Territory.prototype.getStartPosition = function(name) {
    const contData = this.data[name];
    const {currPos} = contData;
    const xy = this.getEmptyXY();
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

    contData.currPos += 1;
    return xy;
};


Territory.prototype.addOccupied = function(name, xy) {
    const key = xy[0] + ',' + xy[1];
    this.occupied[key] = xy;
    this.occupiedBy[name].push(xy);
    this.data[name].open[key] = xy;
    this.data[name].occupied[key] = xy;
    this.map[xy[0]][xy[1]] = this.data[name].char;

    // 1st cell can be forced to be non-empty, but if not,
    // then clear the empty cell
    if (this.empty[key]) {
        --this.numEmpty;
        delete this.empty[key];
    }
};

Territory.prototype.getEmptyXY = function() {
    return this._rng.arrayGetRand(Object.values(this.empty));
};

Territory.prototype.getOpenXY = function(name) {
    const {open} = this.data[name];
    return this._rng.arrayGetRand(Object.values(open));
};


Territory.prototype.getEmptyAdjacentXY = function(xy) {
    const dirs = this.dirs.slice();
    this._rng.shuffle(dirs);
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
    const key = xy[0] + ',' + xy[1];
    this.data[name].closed[key] = xy;
    delete this.data[name].open[key];
};

Territory.prototype.hasEmpty = function() {
    return this.numEmpty > 0;
};

Territory.prototype._initContestant = function(data) {
    this.contestants.push(data);
    const {name, char} = data;
    this.data[name] = {
        currPos: 0,
        maxNumPos: 1,
        char,
        occupied: {},
        closed: {}, // Cannot try anymore
        open: {}, // Available for trying
        startX: [],
        startY: []
    };

    if (data.startX >= 0) {
        this.data[name].startX = [data.startX];
    }
    else if (Array.isArray(data.startX)) {
        this.data[name].startX = data.startX;
    }

    if (data.startY >= 0) {
        this.data[name].startY = [data.startY];
    }
    else if (Array.isArray(data.startY)) {
        this.data[name].startY = data.startY;
    }

    if (data.numPos) {
        this.data[name].maxNumPos = data.numPos;
    }
    this.occupiedBy[name] = [];
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

/* To serialize the territory. */
Territory.prototype.toJSON = function() {
    const json = {
        data: this.data,
        map: this.map,
        contestants: this.contestants,
        empty: this.empty,
        occupied: this.occupied,
        occupiedBy: this.occupiedBy,
        numEmpty: this.numEmpty,
        dirs: this.dirs
    };
    return json;
};

module.exports = Territory;

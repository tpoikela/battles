
const ROT = require('./rot');

const RG = require('../client/src/rg');
const Geom = require('../client/src/geometry');
const debug = require('debug')('bitn:Map.Miner');

ROT.Map.Miner = function(width, height, options = {}) {
    ROT.Map.call(this, width, height);

    const divisor = width > height ? height : width;

    this._options = {
        dontDig: false,
        addWaterFalls: true,
        maxMinersCreated: Math.floor(width * height / divisor),
        minerSpawnProb: 0.07,
        smooth: true,
        rng: ROT.RNG,
        startX: Math.floor(this._width / 2),
        startY: Math.floor(this._height / 2),
        nSmooth: 2,
        dirWeights: {
            N: 1, NE: 1, E: 1, SE: 1, S: 1, SW: 1, W: 1, NW: 1
        }
    };

    if (!options.dirWeights) {
        const smaller = width > height ? height : width;
        Object.keys(this._options.dirWeights).forEach(dir => {
            if (dir === 'W' || dir === 'E') {
                this._options.dirWeights[dir] *= width * 6;
            }
            else if (dir === 'S' || dir === 'N') {
                this._options.dirWeights[dir] *= height;
            }
            else {
                this._options.dirWeights[dir] *= smaller;
            }
        });
    }

    // Grab only relevant options
    for (const p in options) {
        if (this._options.hasOwnProperty(p)) {
            this._options[p] = options[p];
        }
    }

    this._hist = {
        minerDir: {}
    };

};
ROT.Map.Miner.extend(ROT.Map);

ROT.Map.Miner.prototype.dbg = function(msg, ...args) {
    if (debug.enabled) {
        console.log(msg, ...args);
    }
};

const DUG = 0;

const WALL = 1;

ROT.Map.Miner.prototype.create = function(callback) {
    const rng = this._options.rng;
    this.map = this._fillMap(WALL);

    const maxMiners = this._options.maxMinersCreated;
    const minerSpawnProb = this._options.minerSpawnProb;

    const startX = this._options.startX;
    const startY = this._options.startY;

    let activeMiners = [{id: 0, x: startX, y: startY}];

    if (this._options.addMiners) {
        activeMiners.concat(this._options.addMiners);
    }

    // Start from the middle of the map
    this._markAsDug(startX, startY);

    this.minerID = 1;
    let minersAdded = 0;
    let minersSpawned = 0;
    let minersRemoved = 0;

    let minersRemove = [];
    let minersToAdd = [];

    let watchdog = 0; // Prevent infinite looping

    /* eslint no-loop-func: 0 */
    while (minersSpawned < maxMiners) {

        // this.printMap();
        this.dbg('Active miners: ' + activeMiners.length);
        activeMiners.forEach(miner => {
            const [x, y] = this._getXYToDig(miner);

            if (this.map[x][y] === DUG && activeMiners.length > 1) {
                // No undug cells found, remove miner
                minersRemove.push(miner);
            }
            else if (this.inBounds(x, y)) {
                if (rng.getUniform() <= minerSpawnProb) {
                    const newMiner = this._tryToAddNew(miner, x, y);
                    if (newMiner) {
                        minersToAdd.push(newMiner);
                        ++minersAdded;
                    }
                    ++minersSpawned;
                }
                this._markAsDug(x, y);
                miner.x = x;
                miner.y = y;
            }
            else {
                minersRemove.push(miner);
            }
        });

        // Remove all miners marked for removal, except the last miner
        minersRemove.forEach(rmMiner => {
            const index = activeMiners.findIndex(miner => (
                rmMiner.id === miner.id
            ));
            if (activeMiners.length > 1) {
                const {id, x, y} = rmMiner;
                this.dbg(`remove miner ${id} at ${x}, ${y}`);
                ++minersRemoved;
                activeMiners.splice(index, 1);
            }
        });

        activeMiners = activeMiners.concat(minersToAdd);
        minersToAdd = [];
        minersRemove = [];

        if (watchdog > (100 * this._width * this._height)) {
            break;
        }
        if (activeMiners.length === 0) {
            break;
        }
        ++watchdog;
    }

    // TODO smooth out individual blocks
    if (this._options.smooth) {
        this.smoothWalls(2);
    }

    if (callback) {
        for (let y = 0; y < this._height; y++) {
            for (let x = 0; x < this._width; x++) {
                callback(x, y, this.map[x][y]);
            }
        }
    }

    this._hist.minersSpawned = minersSpawned;
    this._hist.minersAdded = minersAdded;
    this._hist.minersRemoved = minersRemoved;
};

/* Tries to add a new miner. */
ROT.Map.Miner.prototype._tryToAddNew = function(miner, x, y) {
    let [newX, newY] = this._getXYToDig({x, y});
    let newMiner = null;
    const rng = this._options.rng;

    if (this.map[x][y] === WALL && this.inBounds(newX, newY)) {
        newMiner = {id: this.minerID++, x: newX, y: newY};
        this._markAsDug(newX, newY);
        this.dbg(miner, 'spawned new miner:', newMiner);
    }
    else { // Handle non-progressing loop here
        const index = rng.getUniformInt(0, 7);
        const dir = ROT.DIRS['8'][index];
        newX += dir[0];
        newY += dir[1];
        if (this.inBounds(newX, newY)) {
            newMiner = {id: this.minerID++, x: newX, y: newY};
            this._markAsDug(newX, newY);
            this.dbg(miner, '(else) spawned new miner:', newMiner);
        }
    }

    return newMiner;
};

ROT.Map.Miner.prototype.printMap = function() {
    for (let y = 0; y < this._height; y++) {
        let row = '';
        for (let x = 0; x < this._width; x++) {
            row += this.map[x][y] === WALL ? '#' : '.';
        }
        console.log(row);
    }
};

/* Returns the next digging direction for the miner. */
ROT.Map.Miner.prototype._getXYToDig = function(miner) {
    const rng = this._options.rng;

    // Pre-check if any valid (WALL) cells are around
    const box = Geom.getBoxAround(miner.x, miner.y, 1);
    const undugXY = box.filter(xy => (
        this.map[xy[0]][xy[1]] === WALL &&
        this.inBounds(xy[0], xy[1])
    ));
    if (undugXY.length === 0) {
        this.dbg('No wall cells around ' + miner.x + ', ' + miner.y);
        return [miner.x, miner.y];
    }

    this.dbg('UndugXY is now ' + undugXY);

    // Map x,y coord around to vectors, and filter those with given weights in
    // this._options.dirWeights
    const undugDirs = undugXY.map(xy => {
        const dXdY = [xy[0] - miner.x, xy[1] - miner.y];
        return RG.dxdYToDir(dXdY);
    });
    const dirsLeft = {};
    undugDirs.forEach(dir => {
        if (this._options.dirWeights[dir]) {
            dirsLeft[dir] = this._options.dirWeights[dir];
        }
    });

    // If custom dirWeights given, we may have no legal dir anymore
    if (Object.keys(dirsLeft).length === 0) {
        return [miner.x, miner.y];
    }

    if (debug.enabled) {this.dbg('dirsLeft: ' + JSON.stringify(dirsLeft));}

    let dir = rng.getWeightedValue(dirsLeft);
    let dXdY = RG.dirTodXdY(dir);
    let [x, y] = [miner.x + dXdY[0], miner.y + dXdY[1]];

    this.dbg(`dir: ${dir}, COMP: dXdY: ${dXdY}, x,y: ${x},${y}`);

    if (!this._hist.minerDir[dir]) {this._hist.minerDir[dir] = 0;}
    this._hist.minerDir[dir] += 1;

    // Loop until WALL cell found
    while (this.map[x][y] === DUG) {
        delete dirsLeft[dir];
        if (Object.keys(dirsLeft).length === 0) {break;}
        dir = rng.getWeightedValue(dirsLeft);
        dXdY = RG.dirTodXdY(dir);
        [x, y] = [miner.x + dXdY[0], miner.y + dXdY[1]];
        this.dbg(`dir: ${dir}, COMP: dXdY: ${dXdY}, x,y: ${x},${y}`);

        if (!this._hist.minerDir[dir]) {this._hist.minerDir[dir] = 0;}
        this._hist.minerDir[dir] += 1;
    }

    this.dbg(`Next x,y to dig is ${x},${y}`);
    return [x, y];
};

ROT.Map.Miner.prototype.inBounds = function(i, j) {
    // Takes into account cells given with dontDig
    if (this._options.dontDig) {
        if (this._options.dontDig.ulx) {
            const {ulx, uly, lrx, lry} = this._options.dontDig;
            if (i >= ulx && i <= lrx) {
                if (j >= uly && j <= lry) {
                    return false;
                }
            }
        }
        else if (this._options.dontDig[i + ',' + j]) {
            return false;
        }
    }
    return (i >= 1 && i < this._width - 1 && j >= 1 && j < this._height - 1);
};

ROT.Map.Miner.prototype.smoothWalls = function(nRounds) {
    for (let i = 0; i < nRounds; i++) {
        for (let x = 1; x < this._width - 1; x++) {
            for (let y = 1; y < this._height - 1; y++) {
                if (this.map[x][y] === WALL) {
                    const coord = Geom.getCrossAround(x, y, 1);
                    let numWalls = 0;
                    coord.forEach(xy => {
                        if (this.inBounds(xy[0], xy[1])) {
                            if (this.map[xy[0]][xy[1]]) {
                                ++numWalls;
                            }
                        }
                    });
                    if (this.inBounds(x, y)) {
                        if (numWalls < this._options.nSmooth) {
                            this._markAsDug(x, y);
                        }
                    }
                }
            }
        }
    }
};

/* Marks the cell as dug, and records largest seen coordinates. */
ROT.Map.Miner.prototype._markAsDug = function(x, y) {
    if (x < this._minX) {this._minX = x;}
    if (x > this._maxX) {this._maxX = x;}
    if (y < this._minY) {this._minY = y;}
    if (y > this._maxY) {this._maxY = y;}
    this.map[x][y] = DUG;
};

module.exports = ROT.Map.Miner;

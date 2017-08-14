
const ROT = require('./rot');

const Geom = require('../client/src/geometry');

ROT.Map.Miner = function(width, height, options) {
    ROT.Map.call(this, width, height);

    const divisor = width > height ? height : width;

    this._options = {
        addWaterFalls: true,
        maxMinersCreated: 2 * Math.floor(width * height / divisor),
        // maxMinersCreated: 1000,
        minerSpawnProb: 0.07,
        smooth: true
    };

    // Grab only relevant options
    for (const p in options) {
        if (this._options.hasOwnProperty(p)) {
            this._options[p] = options[p];
        }
    }

};
ROT.Map.Miner.extend(ROT.Map);

ROT.Map.Miner.prototype.create = function(callback) {
    this.map = this._fillMap(1);

    const maxMiners = this._options.maxMinersCreated;
    const minerSpawnProb = this._options.minerSpawnProb;

    const midX = Math.floor(this._width / 2);
    const midY = Math.floor(this._height / 2);

    let activeMiners = [{x: midX, y: midY}];

    // Start from the middle of the map
    this.map[midX][midY] = 0;

    let minersSpawned = 0;
    let minersRemove = [];
    let minersToAdd = [];

    let watchdog = 0; // Prevent infinite looping

    /* eslint no-loop-func: 0 */
    while (minersSpawned < maxMiners) {

        activeMiners.forEach(miner => {
            const box = Geom.getBoxAround(miner.x, miner.y, 1);
            let i = ROT.RNG.getUniformInt(0, box.length - 1);
            let x = box[i][0];
            let y = box[i][1];
            while (this.map[x][y] === 0) {
                box.splice(i, 1);
                if (box.length === 0) {break;}
                i = ROT.RNG.getUniformInt(0, box.length - 1);
                x = box[i][0];
                y = box[i][1];
            }

            if (box.length === 0 && activeMiners.length > 1) {
                minersRemove.push(miner);
            }
            else if (this.inBounds(x, y)) {
                if (ROT.RNG.getUniform() <= minerSpawnProb) {
                    const dirIndex = ROT.RNG.getUniformInt(0, 7);
                    const dir = ROT.DIRS['8'][dirIndex];
                    const newX = x + dir[0];
                    const newY = y + dir[1];
                    minersToAdd.push({x: newX, y: newY});
                    if (this.inBounds(newX, newY)) {
                        this.map[newX][newY] = 0;
                    }
                    ++minersSpawned;
                }
                this.map[x][y] = 0;
                miner.x = x;
                miner.y = y;
            }
            else {
                minersRemove.push(miner);
            }
        });

        // Remove all miners marked for removal, expect the last miner
        minersRemove.forEach(rmMiner => {
            const index = activeMiners.findIndex(miner => (
                rmMiner.x === miner.x && rmMiner.y === miner.y
            ));
            if (activeMiners.length > 1) {
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
};

ROT.Map.Miner.prototype.inBounds = function(i, j) {
    return (i >= 1 && i < this._width - 1 && j >= 1 && j < this._height - 1);
};

ROT.Map.Miner.prototype.smoothWalls = function(nRounds) {
    for (let i = 0; i < nRounds; i++) {
        for (let x = 1; x < this._width - 1; x++) {
            for (let y = 1; y < this._height - 1; y++) {
                if (this.map[x][y] === 1) {
                    const coord = Geom.getCrossAround(x, y, 1);
                    let numWalls = 0;
                    coord.forEach(xy => {
                        if (this.inBounds(xy[0], xy[1])) {
                            if (this.map[xy[0]][xy[1]]) {
                                ++numWalls;
                            }
                        }
                    });
                    if (numWalls < 2) {this.map[x][y] = 0;}
                }
            }
        }
    }
};

module.exports = ROT.Map.Miner;

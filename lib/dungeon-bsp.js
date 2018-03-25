
const ROT = require('./rot');
const BSP = require('./bsp');

const PATH = 2;
const WALL = 1;
const FLOOR = 0;

const DungeonBSP = function(width, height, options) {
    ROT.Map.call(this, width, height);

    this._options = {
        rng: ROT.RNG,
        iter: 5
    };

    if (options) {
        // Grab only relevant options
        for (const p in this._options) {
            if (this._options.hasOwnProperty(p)) {
                if (options.hasOwnProperty(p)) {
                    this._options[p] = options[p];
                }
            }
        }
    }

};
DungeonBSP.extend(ROT.Map);

DungeonBSP.prototype.create = function(callback) {
    const map = this._fillMap(WALL);

    const bspGen = new BSP.BSPGen(this._options);
    bspGen.createWithRoomsAndPaths(this._width, this._height,
        this._options.iter);
    const rooms = bspGen.get('rooms');
    const paths = bspGen.get('paths');

    rooms.forEach(room => {
        const coord = room.getCoord();
        coord.forEach(xy => {
            console.log(xy);
            map[xy[0]][xy[1]] = FLOOR;
        });
    });

    paths.forEach(path => {
        path.forEach(xy => {
            map[xy[0]][xy[1]] = PATH;
        });
    });

    // Service the callback finally
	for (let i = 0; i < this._width; i++) {
		for (let j = 0; j < this._height; j++) {
			callback(i, j, map[i][j]);
		}
	}

    this._rooms = rooms;
    this._paths = paths;
};

module.exports = DungeonBSP;

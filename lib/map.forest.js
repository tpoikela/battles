
const ROT = require('./rot');

ROT.Map.Forest = function(width, height, options) {
    ROT.Map.call(this, width, height);

    this._options = {
        nForests: 5,
        forestSize: 100
    };

    for (const p in options) {
        if (options.hasOwnProperty(p)) {
            this._options[p] = options[p];
        }
    }

};
ROT.Map.Forest.extend(ROT.Map);

ROT.Map.Forest.prototype.create = function(callback) {
    this.map = this._fillMap(0);

	// Draw a number of 'subforests' based on the options
    for (let i = 0; i < this._options.nForests; i++) {
		const x = ROT.RNG.getUniformInt(0, this._width - 1);
		const y = ROT.RNG.getUniformInt(0, this._height - 1);
        this.drawForest(x, y, this._options.forestSize);
    }

    if (callback) {
        for (let y = 0; y < this._height; y++) {
            for (let x = 0; x < this._width; x++) {
                callback(x, y, this.map[x][y]);
            }
        }
    }

};

ROT.Map.Forest.prototype.inBounds = function(i, j) {
    return (i >= 0 && i < this._width && j >= 0 && j < this._height);
};

/* Draws a forest around x,y location. TODO: Add options to control the size. */
ROT.Map.Forest.prototype.drawForest = function(x, y, forestSize) {
	let i, j;

	// this is so that it knows where to generate around or actually originally
	// intended to be the start of a hall way*/
	i = x;
	j = y;

	// how large it will be adjust it to adapt it to the size intended
	// (note: 40 will not be double size*/
	for (let k = 1; k <= forestSize; k++) {
		// double size is around a hundred because it draws over itself)

		// north south east west there at six to not make the forest too big
        // and have a predictable pattern
		const n = ROT.RNG.getUniformInt(0, 6);
		const e = ROT.RNG.getUniformInt(0, 6);
		const s = ROT.RNG.getUniformInt(0, 6);
		const w = ROT.RNG.getUniformInt(0, 6);

		if (n === 1) { /* if we draw north then... if we dont, skip this*/
			// this is to ensure that when we restart at the end that we draw from
			// the same location
			i = i - 1;
            if (this.inBounds(i, j)) {
                this.map[i][j] = 1; /* this makes map at location i , j tree*/
            }
		}
        if (s === 1) { /* do the above but go south*/
			i = i + 1;
            if (this.inBounds(i, j)) {
                this.map[i][j] = 1; /* this makes map at location i , j tree*/
            }
		}
        if (e === 1) { /* again but east*/
			j = j + 1;
            if (this.inBounds(i, j)) {
                this.map[i][j] = 1; /* this makes map at location i , j tree*/
            }
		}
		if (w === 1) { /* and west*/
			j = j - 1;
            if (this.inBounds(i, j)) {
                this.map[i][j] = 1; /* this makes map at location i , j tree*/
            }
		}
    } // for
};

module.exports = ROT.Map.Forest;

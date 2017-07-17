
const ROT = require('./rot');

ROT.Map.Forest = require('./map.forest');

const noiseGradients = [
    [ 0, -1],
    [ 1, -1],
    [ 1, 0],
    [ 1, 1],
    [ 0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1]
];

ROT.Map.Mountain = function(width, height, options) {
    ROT.Map.call(this, width, height, options);

    this._options = {
        gradients: noiseGradients,
        gradientMult: 1,
        noiseMult: 1,
        noiseDivider: 20
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

    const gradients = this._options.gradients.map(item =>
        item * this.gradientMult);
    this.noise = new ROT.Noise.Simplex(gradients);
};
ROT.Map.Mountain.extend(ROT.Map);

ROT.Map.Mountain.prototype.create = function(callback) {
    const map = this._fillMap(0);

    for (let x = 0; x < this._width; x++) {
        for (let y = 0; y < this._height; y++) {
            const val = this.noise.get(x / this.noiseDiv, y / this.noiseDiv)
                * this.noiseMult;
            console.log('Value is ' + val);
            map[x][y] = val;
        }
    }

    // Service the callback finally
	for (let i = 0; i < this._width; i++) {
		for (let j = 0; j < this._height; j++) {
			callback(i, j, map[i][j]);
		}
	}

};

ROT.Map.Mountain.gradients = noiseGradients;

module.exports = ROT.Map.Mountain;


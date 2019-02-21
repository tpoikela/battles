
import ROT from './rot';
import {MapForest} from './map.forest';

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

export const MapMountain = function(width, height, options?) {
    ROT.Map.call(this, width, height);

    this._options = {
        gradients: noiseGradients,
        noiseMult: 1,
        noiseDivider: 20,
        rng: ROT.RNG
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

    this.noise = new ROT.Noise.Simplex();
};
MapMountain.extend(ROT.Map);

MapMountain.prototype.create = function(callback) {
    const map = this._fillMap(0);

    for (let x = 0; x < this._width; x++) {
        for (let y = 0; y < this._height; y++) {
            const val = this.noise.get(x / this._options.noiseDivider,
                y / this._options.noiseDivider) * this._options.noiseMult;
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
MapMountain.gradients = noiseGradients;

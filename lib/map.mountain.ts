
import Simplex from './rot-js/noise/simplex';
import Map from './rot-js/map/map';
import RNG from './rot-js/rng';

const noiseGradients: [number, number][] = [
    [ 0, -1],
    [ 1, -1],
    [ 1, 0],
    [ 1, 1],
    [ 0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1]
];

const RotMap = Map;

interface MapOptions {
    noiseMult: number;
    noiseDivider: number;
    rng: any;
}

export class MapMountain extends RotMap {
    public static gradients: [number, number][];

    public noise: any;
    public _options: {[key: string]: any};

    constructor(width, height, options: Partial<MapOptions> = {}) {
        super(width, height);

        this._options = {
            gradients: noiseGradients,
            noiseMult: 1,
            noiseDivider: 20,
            rng: RNG
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

        this.noise = new Simplex();
    }

    create(callback) {
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

    }
};

MapMountain.gradients = noiseGradients;

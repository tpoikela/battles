import Noise from './noise';
import RNG from '../rng';
import { mod } from '../util';

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

/**
 * A simple 2d implementation of simplex noise by Ondrej Zara
 *
 * Based on a speed-improved simplex noise algorithm for 2D, 3D and 4D in Java.
 * Which is based on example code by Stefan Gustavson (stegu@itn.liu.se).
 * With Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
 * Better rank ordering method by Stefan Gustavson in 2012.
 */
export default class Simplex extends Noise {
    _gradients: number[][];
    _indexes: number[];
    _perms: number[];

    /**
     * @param gradients Random gradients
     */
    constructor(gradients = 256) {
        super();

        this._gradients = [
            [ 0, -1],
            [ 1, -1],
            [ 1,  0],
            [ 1,  1],
            [ 0,  1],
            [-1,  1],
            [-1,  0],
            [-1, -1]
        ];

        let permutations = [];
        for (let i=0;i<gradients;i++) { permutations.push(i); }
        permutations = RNG.shuffle(permutations);

        this._perms = [];
        this._indexes = [];

        for (let i=0;i<2*gradients;i++) {
            this._perms.push(permutations[i % gradients]);
            this._indexes.push(this._perms[i] % this._gradients.length);
        }
    }

    get(xin: number, yin: number) {
        const perms = this._perms;
        const indexes = this._indexes;
        const count = perms.length/2;

        let n0 =0, n1 = 0, n2 = 0, gi; // Noise contributions from the three corners

        // Skew the input space to determine which simplex cell we're in
        const s = (xin + yin) * F2; // Hairy factor for 2D
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        const t = (i + j) * G2;
        const X0 = i - t; // Unskew the cell origin back to (x,y) space
        const Y0 = j - t;
        const x0 = xin - X0; // The x,y distances from the cell origin
        const y0 = yin - Y0;

        // For the 2D case, the simplex shape is an equilateral triangle.
        // Determine which simplex we are in.
        let i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } else { // lower triangle, XY order: (0,0)->(1,0)->(1,1)
            i1 = 0;
            j1 = 1;
        } // upper triangle, YX order: (0,0)->(0,1)->(1,1)

        // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
        // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
        // c = (3-sqrt(3))/6
        const x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2*G2; // Offsets for last corner in (x,y) unskewed coords
        const y2 = y0 - 1 + 2*G2;

        // Work out the hashed gradient indices of the three simplex corners
        const ii = mod(i, count);
        const jj = mod(j, count);

        // Calculate the contribution from the three corners
        let t0 = 0.5 - x0*x0 - y0*y0;
        if (t0 >= 0) {
            t0 *= t0;
            gi = indexes[ii+perms[jj]];
            const grad = this._gradients[gi];
            n0 = t0 * t0 * (grad[0] * x0 + grad[1] * y0);
        }

        let t1 = 0.5 - x1*x1 - y1*y1;
        if (t1 >= 0) {
            t1 *= t1;
            gi = indexes[ii+i1+perms[jj+j1]];
            const grad = this._gradients[gi];
            n1 = t1 * t1 * (grad[0] * x1 + grad[1] * y1);
        }

        let t2 = 0.5 - x2*x2 - y2*y2;
        if (t2 >= 0) {
            t2 *= t2;
            gi = indexes[ii+1+perms[jj+1]];
            const grad = this._gradients[gi];
            n2 = t2 * t2 * (grad[0] * x2 + grad[1] * y2);
        }

        // Add contributions from each corner to get the final noise value.
        // The result is scaled to return values in the interval [-1,1].
        return 70 * (n0 + n1 + n2);
    }
}

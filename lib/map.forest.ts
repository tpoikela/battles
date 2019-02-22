
/* This code has been ported to JavaScript from:
 * http://www.roguebasin.com/index.php?title=CreatingAForest
 * Thanks to the original creator of the algorithm! The original comments have
 * been mostly preserved in drawForest() function.
 */

import ROT from './rot';
import '../client/src/utils';

export const MapForest = function(width, height, options?) {
    ROT.Map.call(this, width, height);

    this._options = {
        nForests: 5,
        forestSize: 100,
        factor: 6, // Lower factor means more trees
        rng: ROT.RNG
    };

    // Grab only relevant options
    for (const p in options) {
        if (this._options.hasOwnProperty(p)) {
            this._options[p] = options[p];
        }
    }

};
MapForest.extend(ROT.Map);

/* To create the forest, call this method with your callback.
 * Signature of the
 * callback should be cb(x, y, val), where val === 1 means a tree in location
 * x,y. */
MapForest.prototype.create = function(callback) {
    const rng = this._options.rng;
    this.map = this._fillMap(0);

    // Draw a number of 'subforests' based on the options
    for (let i = 0; i < this._options.nForests; i++) {
        const x = rng.getUniformInt(0, this._width - 1);
        const y = rng.getUniformInt(0, this._height - 1);
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

/* Check we're not drawing outside the map. */
MapForest.prototype.inBounds = function(i, j) {
    return (i >= 0 && i < this._width && j >= 0 && j < this._height);
};

/* Draws a forest around x,y location. */
MapForest.prototype.drawForest = function(x, y, forestSize) {
    // this is so that it knows where to generate around or actually originally
    // intended to be the start of a hall way*/
    let i = x;
    let j = y;
    const rng = this._options.rng;

    // how large it will be, adjust it to adapt it to the size intended
    // (note: forestSize 40 will not be double size from 20,
    //  double size is around a 100 because it draws over itself)
    for (let k = 1; k <= forestSize; k++) {

        // north south east west there at six to not make the forest too big
        // and have a predictable pattern
        const n = rng.getUniformInt(0, this._options.factor);
        const e = rng.getUniformInt(0, this._options.factor);
        const s = rng.getUniformInt(0, this._options.factor);
        const w = rng.getUniformInt(0, this._options.factor);

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

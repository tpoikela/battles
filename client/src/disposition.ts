/* Used to generate/store disposition of different clans/races. */

import RG from './rg';
import {Random} from './random';
const RNG = Random.getRNG();

export const Disposition = function(rivals, conf?) {
    this.rivals = rivals;
    this.conf = Object.assign({
    }, conf);

    // Weights used for randomisation
    this.weights = {
        default: {
            ally: 20,
            neutral: 50,
            enemy: 30
        }
    };
};

Disposition.prototype.setWeights = function(weights) {
    this.weights = weights;
};

Disposition.prototype.addWeight = function(rival, weights) {
    this.weights[rival] = weights;
};

Disposition.prototype.getTable = function() {
    return this.dispTable;
};

Disposition.prototype._initTable = function() {
    this.dispTable = {};
    this.rivals.forEach(rival1 => {
        this.dispTable[rival1] = {};
    });
};

Disposition.prototype.randomize = function() {
    this._initTable();
    this.rivals.forEach(rival1 => {
        this.rivals.forEach(rival2 => {
            if (!this.pairDone(rival1, rival2)) {
                const weights = this.getWeights(rival1, rival2);
                const disposition = RNG.getWeighted(weights);
                this.dispTable[rival1][rival2] = disposition;
                this.dispTable[rival2][rival1] = disposition;
            }
        });
    });
};

/* Returns the weights for given pair. */
Disposition.prototype.getWeights = function(r1, r2) {
    // TODO smart merging of weights if given
    if (this.weights.hasOwnProperty(r1)) {
        return this.weights[r1];
    }
    else if (this.weights.hasOwnProperty(r2)) {
        return this.weights[r2];
    }
    return this.weights.default;
};

Disposition.prototype.pairDone = function(r1, r2) {
    if (r1 === r2) {return true;} // No self-computation
    if (this.dispTable[r1][r2]) {
        if (!this.dispTable[r2][r1]) {
            RG.err('Disposition', 'pairDone',
                'Something went wrong. No [r2][r1] but [r1][r2] exists');
        }
        return true;
    }
    return false;
};

/* Convert into human-readable format. */
Disposition.prototype.toString = function() {
};

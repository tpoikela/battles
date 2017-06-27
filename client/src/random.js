
const RG = require('./rg');
const ROT = require('../../lib/rot');

/* A OO wrapper around ROT.RNG. Adds method for serialisation. */
RG.Random = function() {
    this.seed = 0;
    this.rng = ROT.RNG.clone();
    this.rng.setSeed(this.seed);
};

RG.Random.prototype.setSeed = function(seed) {
    this.rng.setSeed(seed);
};

/* Return random property from the object.*/
RG.Random.prototype.randProp = function(obj) {
    const keys = Object.keys(obj);
    const keyIndex = this.randIndex(keys);
    return obj[keys[keyIndex]];
};

/* Returns a random entry from the array.*/
RG.Random.prototype.arrayGetRand = function(arr) {
    const randIndex = this.randIndex(arr);
    return arr[randIndex];
};

/* Returns a random index number from given array. */
RG.Random.prototype.randIndex = function randIndex(arr) {
    return Math.floor(this.rng.getUniform() * arr.length);
};

RG.Random.prototype.getUniform = function() {
    return this.rng.getUniform();
};

RG.Random.prototype.toJSON = function() {
    return {
        seed: this.seed,
        state: this.rng.getState()
    };
};

RG.RAND = new RG.Random();

module.exports = RG.Random;

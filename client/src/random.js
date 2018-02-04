
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

RG.Random.prototype.setState = function(state) {
    this.rng.setState(state);
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

RG.Random.prototype.getUniformInt = function(min, max) {
    return this.rng.getUniformInt(min, max);
};

/* Returns a random index number from given array. */
RG.Random.prototype.randIndex = function randIndex(arr) {
    return Math.floor(this.rng.getUniform() * arr.length);
};

RG.Random.prototype.getUniform = function() {
    return this.rng.getUniform();
};

RG.Random.prototype.getUniformRange = function(min, max) {
    const span = max - min;
    const uniform = this.getUniform();
    console.log(`span: ${span}, uniform: ${uniform}`);
    return min + span * uniform;
};

RG.Random.prototype.getNormal = function(mean, stddev) {
    return this.rng.getNormal(mean, stddev);
};

RG.Random.prototype.getWeighted = function(obj) {
    return this.rng.getWeightedValue(obj);
};

/* Given a number N, returns an integer from 0 to N weighted such that N has the
 * highest weight, and 0 the lowest.
 */
RG.Random.prototype.getWeightedLinear = function(N) {
    const weights = {};
    for (let i = 0; i < N; i++) {
        weights[i] = i + 1; // Without + 1, 0 will never be chosen
    }
    return this.rng.getWeightedValue(weights);
};

RG.Random.prototype.toJSON = function() {
    return {
        seed: this.seed,
        state: this.rng.getState()
    };
};

/*
 * From http://stackoverflow.com/questions/2450954/
 * how-to-randomize-shuffle-a-javascript-array
 */
RG.Random.prototype.shuffle = function(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = this.getUniformInt(0, currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
};

// Global RNG
RG.RAND = new RG.Random();

module.exports = RG.Random;

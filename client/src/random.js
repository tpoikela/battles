
const RG = require('./rg');
const ROT = require('../../lib/rot');

const DIRS = [-1, 0, 1];
const DIRS_NO_ZERO = [-1, 1];

/* A OO wrapper around ROT.RNG. Adds method for serialisation. */
RG.Random = function(seed = 0) {
    this.seed = seed;
    this.rng = ROT.RNG.clone();
    this.rng.setSeed(this.seed);
};

RG.Random.prototype.setSeed = function(seed) {
    this.seed = seed;
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

/* Returns N unique items randomly from the array. */
RG.Random.prototype.getUniqueItems = function(arr, n = 2) {
    if (arr.length < n) {
        return arr;
    }
    const seen = {};
    const items = [];
    while (items.length < n) {
        const index = this.randIndex(arr);
        if (!seen[index]) {
            seen[index] = true;
            items.push(arr[index]);
        }
    }
    return items;
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

/* Returns random direction [x, y] while excluding [0, 0]. */
RG.Random.prototype.getRandDir = function() {
    const dX = this.arrayGetRand(DIRS);
    let dY = this.arrayGetRand(DIRS);
    if (dX === 0) {
        dY = this.arrayGetRand(DIRS_NO_ZERO);
    }
    return [dX, dY];
};

/* Returns randomly one of the 4 cardinal directions. */
RG.Random.prototype.getCardinalDir = function() {
    return this.arrayGetRand(RG.CARDINAL_DIR);
};

RG.Random.prototype.getCardinalDirLetter = function() {
    return this.arrayGetRand(RG.CARDINAL_DIR_ABBR);
};

/* Returns a random direction using weights for directions. */
RG.Random.prototype.getRandDirWeighted = function() {
    // TODO
};

/* Returns a random xy-coord in the given bounding box. */
RG.Random.prototype.getRandInBbox = function(bbox) {
    const {ulx, uly, lrx, lry} = bbox;
    // RG.nullOrUndefError([ulx, uly, lrx, lry]);
    return [
        this.getUniformInt(ulx, lrx),
        this.getUniformInt(uly, lry)
    ];
};

/*
 * From http://stackoverflow.com/questions/2450954/
 * how-to-randomize-shuffle-a-javascript-array
 */
RG.Random.prototype.shuffle = function(array) {
    if (array.length <= 1) {return array;}
    let currentIndex = array.length - 1;
    let temporaryValue, randomIndex;

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
// RG.RAND = new RG.Random();

// RNG used for dynamic "micro" stuff like damage rolls etc level ups
RG.DIE_RNG = new RG.Random(new Date().getTime());

RG.Random.setRNG = function(rng) {
    RG.Random.instance = rng;
};

RG.Random.getRNG = function() {
    if (!RG.Random.instance) {
        RG.Random.instance = new RG.Random(666);
    }
    return RG.Random.instance;
};

module.exports = RG.Random;

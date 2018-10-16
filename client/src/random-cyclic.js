
const RG = require('./rg');
const Random = require('./random');

const RNG = Random.getRNG();

/* Given an array, cycles through all of its values in random order, but is
 * guaranteed to eventually return each value. */
const RandomCyclic = function(arr) {
    if (!arr || arr.length === 0) {
        RG.err('RandomCyclic', 'new',
            'array with length > 0 must be given');
    }
    this.arr = arr;
    this.reset();
    this.length = arr.length;
};

RandomCyclic.prototype.reset = function() {
    this.indicesLeft = [];
    this.arr.forEach((item, index) => {
        this.indicesLeft.push(index);
    });
    this._prevValue = null;
    this._currValue = null;
};

RandomCyclic.prototype.prev = function() {
    return this._prevValue;
};

RandomCyclic.prototype.next = function() {
    if (this.indicesLeft.length === 0) {
        this.reset();
    }
    const index = RNG.arrayGetRand(this.indicesLeft);
    // Remove just found index from indicesLeft
    this.indicesLeft = this.indicesLeft.filter(val => val !== index);

    this._prevValue = this._currValue;
    this._currValue = this.arr[index];
    return this._currValue;
};

module.exports = RandomCyclic;

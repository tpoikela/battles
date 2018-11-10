
import RG from './rg';
import {Random} from './random';

const RNG = Random.getRNG();

type DATA = any;

/* Given an array, cycles through all of its values in random order, but is
 * guaranteed to eventually return each value. */
export class RandomCyclic {

    public arr: DATA[];
    public length: number;
    public indicesLeft: number[];
    public _prevValue: DATA;
    public _currValue: DATA;

    constructor(arr) {
        if (!arr || arr.length === 0) {
            RG.err('RandomCyclic', 'new',
                'array with length > 0 must be given');
        }
        this.arr = arr;
        this.reset();
        this.length = arr.length;
    }

    reset(): void {
        this.indicesLeft = [];
        this.arr.forEach((item, index) => {
            this.indicesLeft.push(index);
        });
        this._prevValue = null;
        this._currValue = null;
    }

    prev(): DATA {
        return this._prevValue;
    }

    next(): DATA {
        if (this.indicesLeft.length === 0) {
            this.reset();
        }
        const index = RNG.arrayGetRand(this.indicesLeft);
        // Remove just found index from indicesLeft
        this.indicesLeft = this.indicesLeft.filter(val => val !== index);

        this._prevValue = this._currValue;
        this._currValue = this.arr[index];
        return this._currValue;
    }
}

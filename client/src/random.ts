
import RG from './rg';
import ROT from '../../lib/rot';

const DIRS = [-1, 0, 1];
const DIRS_NO_ZERO = [-1, 1];

/* A OO wrapper around ROT.RNG. Adds method for serialisation. */
export class Random {

    public static instance: Random;

    public seed: number;
    public rng: any;

    constructor(seed = 0) {
        this.seed = seed;
        this.rng = ROT.RNG.clone();
        this.rng.setSeed(this.seed);
    }

    setSeed(seed) {
        console.log('Setting RNG seed to ' + seed);
        this.seed = seed;
        this.rng.setSeed(seed);
    }

    setState(state) {
        this.rng.setState(state);
    }

    /* Return random property from the object.*/
    randProp(obj) {
        const keys = Object.keys(obj);
        const keyIndex = this.randIndex(keys);
        return obj[keys[keyIndex]];
    }

    /* Returns a random entry from the array.*/
    arrayGetRand(arr) {
        const randIndex = this.randIndex(arr);
        return arr[randIndex];
    }

    /* Returns N unique items randomly from the array. This assumes that
     * all items are already unique in the array. */
    getUniqueItems(arr, n = 2) {
        if (arr.length <= n) {
            return arr.slice(); // Just return a copy
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
    }

    getUniformInt(min, max) {
        return this.rng.getUniformInt(min, max);
    }

    /* Returns a random index number from given array. */
    randIndex(arr) {
        return Math.floor(this.rng.getUniform() * arr.length);
    }

    getUniform() {
        return this.rng.getUniform();
    }

    getUniformRange(min, max) {
        const span = max - min;
        const uniform = this.getUniform();
        return min + span * uniform;
    }

    getNormal(mean, stddev) {
        return this.rng.getNormal(mean, stddev);
    }

    getWeighted(obj) {
        return this.rng.getWeightedValue(obj);
    }

    /* Given a number N, returns an integer from 0 to N weighted such that N has the
     * highest weight, and 0 the lowest.
     */
    getWeightedLinear(N) {
        const weights = {};
        for (let i = 0; i < N; i++) {
            weights[i] = i + 1; // Without + 1, 0 will never be chosen
        }
        return this.rng.getWeightedValue(weights);
    }

    toJSON() {
        return {
            seed: this.seed,
            state: this.rng.getState()
        };
    }

    /* Returns random direction [x, y] while excluding [0, 0]. */
    getRandDir() {
        const dX = this.arrayGetRand(DIRS);
        let dY = this.arrayGetRand(DIRS);
        if (dX === 0) {
            dY = this.arrayGetRand(DIRS_NO_ZERO);
        }
        return [dX, dY];
    }

    /* Returns randomly one of the 4 cardinal directions. */
    getCardinalDir() {
        return this.arrayGetRand(RG.CARDINAL_DIR);
    }

    getCardinalDirLetter() {
        return this.arrayGetRand(RG.CARDINAL_DIR_ABBR);
    }

    /* Returns a random direction using weights for directions. */
    getRandDirWeighted() {
        // TODO
    }

    /* Returns a random xy-coord in the given bounding box. */
    getRandInBbox(bbox) {
        const {ulx, uly, lrx, lry} = bbox;
        // RG.nullOrUndefError([ulx, uly, lrx, lry]);
        return [
            this.getUniformInt(ulx, lrx),
            this.getUniformInt(uly, lry)
        ];
    }

    /*
     * From http://stackoverflow.com/questions/2450954/
     * how-to-randomize-shuffle-a-javascript-array
     */
    shuffle(array) {
        if (array.length <= 1) {return array;}
        let currentIndex = array.length - 1;
        let temporaryValue = 0;
        let randomIndex = 0;

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
    }

    static setRNG(rng) {
        Random.instance = rng;
    }

    static getRNG() {
        if (!Random.instance) {
            Random.instance = new Random(666);
        }
        return Random.instance;
    }

    static reseed(seed) {
        ROT.RNG.setSeed(seed);
        const RNG = Random.getRNG();
        RNG.setSeed(seed);
    }
}

// Global RNG
// RG.RAND = new Random();

// RNG used for dynamic "micro" stuff like damage rolls etc level ups
RG.DIE_RNG = new Random(new Date().getTime());


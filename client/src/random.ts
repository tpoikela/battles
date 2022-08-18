
import RG from './rg';
import RotRNG, {RNG} from '../../lib/rot-js/rng';
import {TCoord, RandWeights} from './interfaces';
import {BBox} from './bbox';

const DIRS = [-1, 0, 1];
const DIRS_NO_ZERO = [-1, 1];

/* A OO wrapper around RotRNG. Adds method for serialisation. */
export class Random {

    public static instance: Random;
    public static rngMap: {[key: string]: Random};

    public static setRNG(rng: Random): void {
        Random.instance = rng;
    }

    public static getRNG(key?: string): Random {
        if (key) {
            if (!Random.rngMap[key]) {
                Random.rngMap[key] = new Random(0);
            }
            return Random.rngMap[key];
        }

        if (!Random.instance) {
            Random.instance = new Random(0);
        }
        return Random.instance;
    }

    public static reseed(seed: number) {
        RotRNG.setSeed(seed);
        const rng = Random.getRNG();
        rng.setSeed(seed);
    }

    public seed: number;
    public rng: RNG;

    constructor(seed = 0) {
        this.seed = seed;
        this.rng = RotRNG.clone();
        this.rng.setSeed(this.seed);
    }

    public setSeed(seed: number): void {
        this.seed = seed;
        this.rng.setSeed(seed);
    }

    public setState(state): void {
        this.rng.setState(state);
    }

    /* Return random property from the object.*/
    public randProp(obj: {[key: string]: any}): any {
        const keys = Object.keys(obj);
        const keyIndex = this.randIndex(keys);
        return obj[keys[keyIndex]];
    }

    /* Returns a random entry from the array.*/
    public arrayGetRand<T>(arr: T[]): T {
        const randIndex = this.randIndex(arr);
        return arr[randIndex];
    }

    /* Returns N unique items randomly from the array. This assumes that
     * all items are already unique in the array. */
    public getUniqueItems<T>(arr: T[], n: number = 2): T[] {
        if (arr.length <= n) {
            return arr.slice(); // Just return a copy
        }
        const seen: {[key: string]: boolean} = {};
        const items: T[] = [];
        while (items.length < n) {
            const index = this.randIndex(arr);
            if (!seen[index]) {
                seen[index] = true;
                items.push(arr[index]);
            }
        }
        return items;
    }

    public getUniformInt(min: number, max: number): number {
        return this.rng.getUniformInt(min, max);
    }

    /* Returns a random index number from given array. */
    public randIndex(arr: any[]): number {
        return Math.floor(this.rng.getUniform() * arr.length);
    }

    public getUniform(): number {
        return this.rng.getUniform();
    }

    public getUniformRange(min: number, max: number): number {
        const span = max - min;
        const uniform = this.getUniform();
        return min + span * uniform;
    }

    public getNormal(mean: number, stddev: number): number {
        return this.rng.getNormal(mean, stddev);
    }

    public getWeighted(obj: RandWeights): string {
        return this.rng.getWeightedValue(obj);
    }

    /* Given a number N, returns an integer from 0 to N weighted such that N has the
     * highest weight, and 0 the lowest. IE: {0: 1, 1: 2, ... N: N + 1}
     */
    public getWeightedLinear(N: number): number {
        const weights: RandWeights = {};
        if (N === 0) {return 0;}
        for (let i = 0; i < N; i++) {
            weights[i] = i + 1; // Without + 1, 0 will never be chosen
        }

        const res = parseInt(this.rng.getWeightedValue(weights), 10);
        return res;
    }

    public toJSON(): any {
        return {
            seed: this.seed,
            state: this.rng.getState()
        };
    }

    /* Returns random direction [x, y] while excluding [0, 0]. */
    public getRandDir(): TCoord {
        const dX = this.arrayGetRand(DIRS);
        let dY = this.arrayGetRand(DIRS);
        if (dX === 0) {
            dY = this.arrayGetRand(DIRS_NO_ZERO);
        }
        return [dX, dY];
    }

    /* Returns randomly one of the 4 cardinal directions. */
    public getCardinalDir(): string {
        return this.arrayGetRand(RG.CARDINAL_DIR);
    }

    public getCardinalDirLetter(): string {
        return this.arrayGetRand(RG.CARDINAL_DIR_ABBR);
    }

    /* Returns a random xy-coord in the given bounding box. */
    public getRandInBbox(bbox: BBox): TCoord {
        const {ulx, uly, lrx, lry} = bbox;
        // RG.nullOrUndefError([ulx, uly, lrx, lry]);
        return [
            this.getUniformInt(ulx, lrx),
            this.getUniformInt(uly, lry)
        ];
    }

    public shiftCoord(coord: TCoord): TCoord {
        const dX = this.arrayGetRand(DIRS);
        const dY = this.arrayGetRand(DIRS);
        return [coord[0] + dX, coord[1] + dY];
    }

    /*
     * From http://stackoverflow.com/questions/2450954/
     * how-to-randomize-shuffle-a-javascript-array
     */
    public shuffle<T>(array: T[]): T[] {
        if (array.length <= 1) {return array;}
        let currentIndex = array.length - 1;
        let temporaryValue: T;
        let randomIndex: number = 0;

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

    /* Return x and y randomly adjusted with obj.x and obj.y. */
    public getRandDxDy(obj: {x: number, y: number}): TCoord {
        const x = this.getUniformInt(-obj.x, obj.x);
        const y = this.getUniformInt(-obj.y, obj.y);
        return [x, y];
    }

}


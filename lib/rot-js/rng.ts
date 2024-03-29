/**
 * This code is an implementation of Alea algorithm; (C) 2010 Johannes Baagøe.
 * Alea is licensed according to the http://en.wikipedia.org/wiki/MIT_License.
 */

const FRAC = 2.3283064365386963e-10; /* 2^-32 */

export type RNGState = [number, number, number, number];

export class RNG {
    _seed = 0;
    _s0 = 0;
    _s1 = 0;
    _s2 = 0;
    _c = 0;

    getSeed(): number {
        return this._seed;
    }

    /**
     * Seed the number generator
     */
    setSeed(seed: number): RNG {
        seed = (seed < 1 ? 1/seed : seed);

        this._seed = seed;
        this._s0 = (seed >>> 0) * FRAC;

        seed = (seed*69069 + 1) >>> 0;
        this._s1 = seed * FRAC;

        seed = (seed*69069 + 1) >>> 0;
        this._s2 = seed * FRAC;

        this._c = 1;
        return this;
    }

    /**
     * @returns Pseudorandom value [0,1), uniformly distributed
     */
    getUniform(): number {
        const t = 2091639 * this._s0 + this._c * FRAC;
        this._s0 = this._s1;
        this._s1 = this._s2;
        this._c = t | 0;
        this._s2 = t - this._c;
        return this._s2;
    }

    /**
     * @param lowerBound The lower end of the range to return a value from, inclusive
     * @param upperBound The upper end of the range to return a value from, inclusive
     * @returns Pseudorandom value [lowerBound, upperBound], using ROT.RNG.getUniform() to distribute the value
     */
    getUniformInt(lowerBound: number, upperBound: number): number {
        const max = Math.max(lowerBound, upperBound);
        const min = Math.min(lowerBound, upperBound);
        return Math.floor(this.getUniform() * (max - min + 1)) + min;
    }

    /**
     * @param mean Mean value
     * @param stddev Standard deviation. ~95% of the absolute values will be lower than 2*stddev.
     * @returns A normally distributed pseudorandom value
     */
    getNormal(mean = 0, stddev = 1): number {
        let u, v, r;
        do {
            u = 2*this.getUniform()-1;
            v = 2*this.getUniform()-1;
            r = u*u + v*v;
        } while (r > 1 || r === 0);

        const gauss = u * Math.sqrt(-2*Math.log(r)/r);
        return mean + gauss*stddev;
    }

    /**
     * @returns Pseudorandom value [1,100] inclusive, uniformly distributed
     */
    getPercentage(): number {
        return 1 + Math.floor(this.getUniform()*100);
    }

    /**
     * @returns Randomly picked item, null when length=0
     */
    getItem<T>(array: T[]): T {
        if (!array.length) { return null; }
        return array[Math.floor(this.getUniform() * array.length)];
    }

    /**
     * @returns New array with randomized items
     */
    shuffle<T>(array: T[]): T[] {
        const result = [];
        const clone = array.slice();
        while (clone.length) {
            const index = clone.indexOf(this.getItem(clone) as T);
            result.push(clone.splice(index, 1)[0]);
        }
        return result;
    }

    /**
     * @param data key=whatever, value=weight (relative probability)
     * @returns whatever
     */
    getWeightedValue(data: { [key: string]: number, [key: number]: number }): string {
        let total = 0;

        for (const id in data) {
            total += data[id];
        }
        const random = this.getUniform()*total;

        let id: any = '';
        let part = 0;
        for (id in data) {
            part += data[id];
            if (random < part) { return id; }
        }

        // If by some floating-point annoyance we have
        // random >= total, just return the last id.
        return id;
    }

    /**
     * Get RNG state. Useful for storing the state and re-setting it via setState.
     * @returns Internal state
     */
    getState(): RNGState {
        return [this._s0, this._s1, this._s2, this._c];
    }

    /**
     * Set a previously retrieved state.
     */
    setState(state: RNGState): RNG {
        this._s0 = state[0];
        this._s1 = state[1];
        this._s2 = state[2];
        this._c  = state[3];
        return this;
    }

    /**
     * Returns a cloned RNG
     */
    clone(): RNG {
        const clone = new RNG();
        return clone.setState(this.getState());
    }
}

export default new RNG().setSeed(0);

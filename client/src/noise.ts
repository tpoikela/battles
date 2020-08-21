

import Simplex from '../../lib/rot-js/noise/simplex';


export class Noise {

    public noise: Simplex;

    constructor() {
        this.noise = new Simplex();
    }

    /* Returns a noise value between 0-1. */
    public get(x: number, y: number): number {
        const val = this.noise.get(x, y);
        return (val + 1.0) / 2.0;
    }


    /* Returns a sum of octaves, given an array to compute these. */
    public getOctaves(x: number, y: number, arr: number[]): number {
        let res = 0;
        // let norm = 0;
        arr.forEach((n: number) => {
            res += (1.0 / n) * this.get(n * x, n * y)
            // norm += n;
        });
        return res;
    }

    /* Returns a sum of octaves, given an array to compute these. */
    public getOctavesDiv(x: number, y: number, arr: number[][]): number {
        let res = 0;
        arr.forEach((pair: number[]) => {
            const [w, n] = pair;
            res += w * this.get(x / n, y / n)
        });
        return res;
    }

}

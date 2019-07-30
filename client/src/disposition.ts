/* Used to generate/store disposition of different clans/races. */

import RG from './rg';
import {Random} from './random';
import {RandWeights} from './interfaces';
const RNG = Random.getRNG();

interface WeightValues {
    ally: number;
    neutral: number;
    enemy: number;
}

interface IWeights {
    [key: string]: WeightValues;
}

export interface IDispTable {
    [key: string]: {
        [key: string]: string;
    };
}

export class Disposition {

    public rivals: string[];
    public conf: object;
    public weights: IWeights;
    public dispTable: IDispTable;

    constructor(rivals: string[], conf: object) {
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
    }

    public setWeights(weights: IWeights): void {
        this.weights = weights;
    }

    public addWeight(rival: string, weights: WeightValues): void {
        this.weights[rival] = weights;
    }

    public getTable(): IDispTable {
        return this.dispTable;
    }

    public _initTable() {
        this.dispTable = {};
        this.rivals.forEach(rival1 => {
            this.dispTable[rival1] = {};
        });
    }

    public randomize(): void {
        this._initTable();
        this.rivals.forEach(rival1 => {
            this.rivals.forEach(rival2 => {
                if (!this.pairDone(rival1, rival2)) {
                    const weights = this.getWeights(rival1, rival2);
                    const ww = weights as unknown;
                    const disposition = RNG.getWeighted(ww as RandWeights);
                    this.dispTable[rival1][rival2] = disposition;
                    this.dispTable[rival2][rival1] = disposition;
                }
            });
        });
    }

    /* Returns the weights for given pair. */
    public getWeights(r1: string, r2: string): WeightValues {
        // TODO smart merging of weights if given
        if (this.weights.hasOwnProperty(r1)) {
            return this.weights[r1];
        }
        else if (this.weights.hasOwnProperty(r2)) {
            return this.weights[r2];
        }
        return this.weights.default;
    }

    public pairDone(r1: string, r2: string): boolean {
        if (r1 === r2) {return true;} // No self-computation
        if (this.dispTable[r1][r2]) {
            if (!this.dispTable[r2][r1]) {
                RG.err('Disposition', 'pairDone',
                    'Something went wrong. No [r2][r1] but [r1][r2] exists');
            }
            return true;
        }
        return false;
    }

}

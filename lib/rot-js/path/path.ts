import { DIRS } from '../constants';

export type ComputeCallback = (x: number, y: number, prev?: any) => any;

export type PassableCallback = (
    x: number,
    y: number,
    cx?: number,
    cy?: number
) => boolean;

export interface Options {
    topology: 4 | 6 | 8;
}

/**
 * @class Abstract pathfinder
 * @param {int} toX Target X coord
 * @param {int} toY Target Y coord
 * @param {function} passableCallback Callback to determine map passability
 * @param {object} [options]
 * @param {int} [options.topology=8]
 */
export default abstract class Path {
    _toX: number;
    _toY: number;
    _passableCallback: PassableCallback;
    _options: Options;
    _dirs: number[][];

    constructor(toX: number, toY: number, passableCallback: PassableCallback, options: Partial<Options> = {}) {
        this._toX = toX;
        this._toY = toY;
        this._passableCallback = passableCallback;
        this._options = Object.assign({
            topology: 8
        }, options);

        this._dirs = DIRS[this._options.topology];
        if (this._options.topology === 8) { /* reorder dirs for more aesthetic result (vertical/horizontal first) */
            this._dirs = [
                this._dirs[0],
                this._dirs[2],
                this._dirs[4],
                this._dirs[6],
                this._dirs[1],
                this._dirs[3],
                this._dirs[5],
                this._dirs[7]
            ]
        }
    }

    /**
	 * Compute a path from a given point
	 * @param {int} fromX
	 * @param {int} fromY
	 * @param {function} callback Will be called for every path item with arguments "x" and "y"
	 */
    abstract compute(fromX: number, fromY: number, callback: ComputeCallback): void;

    _getNeighbors(cx: number, cy: number): number[][] {
        const result = [];
        for (let i=0;i<this._dirs.length;i++) {
            const dir = this._dirs[i];
            const x = cx + dir[0];
            const y = cy + dir[1];

            if (!this._passableCallback(x, y, cx, cy)) {
                continue;
            }
            result.push([x, y]);
        }

        return result;
    }
}

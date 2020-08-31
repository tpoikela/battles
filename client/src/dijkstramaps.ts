/* Original version taken from
 * https://gist.github.com/hyakugei/ace116bd9ce72f2bf92c
 */

import * as ROT from '../../lib/rot-js';
import {TCoord} from './interfaces';

export interface Options {
    topology: number;
    fleeMap: boolean;
    fleeMultiplier: number;
}

type Opts = Partial<Options>;

interface TargetObj {
    x: number;
    y: number;
    cost: number;
    target: boolean;
}

type PassableCb = (x: number, y: number, cx: number, cy: number) => boolean;

export class DijkstraMap {

    protected _options: Options;
    protected _dirs: any[];
    protected _computed: {[key: string]: TargetObj};
    protected _todo: TargetObj[];
    protected _passableCallback: PassableCb;


    constructor(passableCallback: PassableCb, options?: Opts) {
        this._passableCallback = passableCallback;
        this._options = {
            topology: 8,
            fleeMap: false,
            fleeMultiplier: -1.2
        };
        for (const p in options) {
            if (this._options.hasOwnProperty(p)) {
                this._options[p] = options[p];
            }
        }

        this._dirs = ROT.DIRS[this._options.topology];
         /* reorder dirs for more aesthetic result (vertical/horizontal first) */
        if (this._options.topology === 8) {
            this._dirs = [
                this._dirs[0],
                this._dirs[2],
                this._dirs[4],
                this._dirs[6],
                this._dirs[1],
                this._dirs[3],
                this._dirs[5],
                this._dirs[7]
            ];
        }

        this._computed = {};
        this._todo = [];
    }

    public addTarget(targetX: number, targetY: number, cost: number): void {
        cost = cost || 0;
        this._add(targetX, targetY, cost, true);
    }


    public compute(callback): void {
        if(this._todo.length === 0) { return; }


        if(this._options.fleeMap === true){
            this._compute();

            // multiply
            for (const key in this._computed){
                if (key) {
                    const i = this._computed[key];
                    i.cost = i.cost * this._options.fleeMultiplier;
                    this._todo.push(i);
                }
            }

            // re-compute
            this._compute();

        } else {
            this._compute();
        }

        for (const key in this._computed){
            if (key) {
                const obj = this._computed[key];
                callback(obj.x, obj.y, obj.cost);
            }
        }
    }

    protected _getNeighbors(cx: number, cy: number): TCoord[] {
        const result: TCoord[] = [];
        for (let i=0;i<this._dirs.length;i++) {
            const dir = this._dirs[i];
            const x = cx + dir[0];
            const y = cy + dir[1];

            if (!this._passableCallback(x, y, cx, cy)) { continue; }
            result.push([x, y]);
        }
        return result;
    }

    protected _compute(): void {
        while (this._todo.length) {
            const item = this._todo.shift()!; // Can't be null here
            const neighbors = this._getNeighbors(item.x, item.y);

            for (let i=0;i<neighbors.length;i++) {
                const neighbor = neighbors[i];
                const x = neighbor[0];
                const y = neighbor[1];
                const id = x+','+y;

                if (id in this._computed){
                    const n = this._computed[id];
                    // is the neighbour cost more or less then item?

                    if (n.target === false && n.cost > item.cost + 1){
                        this._add(n.x, n.y, item.cost + 1);
                        continue;
                    }
                    if (item.target === false && n.cost + 1 < item.cost ){
                        this._add(item.x, item.y, n.cost + 1);
                        break;
                    }
                } else {
                    this._add(x, y, item.cost + 1);
                }
            }
        }
    }

    protected _add(x: number, y: number, cost: number, target?: boolean): void {
        const obj: TargetObj = {
            x,
            y,
            cost: cost || 0,
            target: (target === true)
        };
        this._computed[x+','+y] = obj;
        this._todo.push(obj);
    }

}


import Path, { ComputeCallback, PassableCallback, Options } from './path';

interface Item {
    x: number,
    y: number,
    prev: Item | null
}

/**
 * @class Simplified Dijkstra's algorithm: all edges have a value of 1
 * @augments ROT.Path
 * @see ROT.Path
 */
export default class Dijkstra extends Path {
    _computed: {[key:string]: Item};
    _todo: Item[];

    constructor(toX: number, toY: number, passableCallback: PassableCallback, options: Partial<Options>) {
        super(toX, toY, passableCallback, options);

        this._computed = {};
        this._todo = [];
        this._add(toX, toY, null);
    }

    /**
	 * Compute a path from a given point
	 * @see ROT.Path#compute
	 */
    compute(fromX: number, fromY: number, callback: ComputeCallback) {
        const key = fromX+','+fromY;
        if (!(key in this._computed)) { this._compute(fromX, fromY); }
        if (!(key in this._computed)) { return; }

        let item: Item | null = this._computed[key];
        while (item) {
            callback(item.x, item.y);
            item = item.prev;
        }
    }

    /**
	 * Compute a non-cached value
	 */
    _compute(fromX: number, fromY: number) {
        while (this._todo.length) {
            const item = this._todo.shift() as Item;
            if (item.x == fromX && item.y == fromY) { return; }

            const neighbors = this._getNeighbors(item.x, item.y);

            for (let i=0;i<neighbors.length;i++) {
                const neighbor = neighbors[i];
                const x = neighbor[0];
                const y = neighbor[1];
                const id = x+','+y;
                if (id in this._computed) { continue; } /* already done */
                this._add(x, y, item);
            }
        }
    }

    _add(x: number, y: number, prev: Item | null) {
        const obj = {
            x,
            y,
            prev
        };
        this._computed[x+','+y] = obj;
        this._todo.push(obj);
    }
}

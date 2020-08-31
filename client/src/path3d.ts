
import Path, {ComputeCallback, PassableCallback, Options} from '../../lib/rot-js/path/path';

type CellMap = import('./map').CellMap;

interface Item {
    x: number;
    y: number;
    z: number;
    g: number;
    h: number;
    prev: Item | null;
}

/**
 */
export class AStar3D extends Path {
    _todo: Item[];
    _done: {[key:string]: Item};
    _fromX!: number;
    _fromY!: number;
    _fromZ!: number;
    _map: CellMap;

    constructor(
        toX: number, toY: number, map: CellMap,
        passableCallback: PassableCallback, options: Partial<Options> = {}
    ) {
        super(toX, toY, passableCallback, options);

        this._todo = [];
        this._done = {};
        this._map = map;
    }

    /**
	 * Compute a path from a given point
	 *
	 */
    public compute(fromX: number, fromY: number, callback: ComputeCallback) {
        this._todo = [];
        this._done = {};
        this._fromX = fromX;
        this._fromY = fromY;
        this._fromZ = this._map.getZ(fromX, fromY);
        this._add(this._toX, this._toY, null);

        while (this._todo.length) {
            const item = this._todo.shift() as Item;
            const id = item.x+','+item.y;
            if (id in this._done) { continue; }
            this._done[id] = item;
            if (item.x === fromX && item.y === fromY) { break; }

            const neighbors = this._getNeighbors(item.x, item.y);

            for (let i=0;i<neighbors.length;i++) {
                const neighbor = neighbors[i];
                const x = neighbor[0];
                const y = neighbor[1];
                const doneId = x+','+y;
                if (doneId in this._done) {continue;}
                this._add(x, y, item);
            }
        }

        let itemDone: Item | null = this._done[fromX+','+fromY];
        if (!itemDone) {return;}

        while (itemDone) {
            callback(itemDone.x, itemDone.y, itemDone.prev);
            itemDone = itemDone.prev;
        }
    }

    _add(x: number, y: number, prev: Item | null) {
        const z = this._map.getZ(x, y);
        const h = this._distance(x, y, z, prev);
        let dz = 0;
        if (prev) {
            dz = Math.abs(prev.z - z);
        }
        const obj: Item = {
            x,
            y,
            z,
            prev,
            g: (prev ? prev.g + 1 + dz : 0),
            h
        };

        /* insert into priority queue */

        const f = obj.g + obj.h;
        for (let i=0;i<this._todo.length;i++) {
            const item = this._todo[i];
            const itemF = item.g + item.h;
            if (f < itemF || (f === itemF && h < item.h)) {
                this._todo.splice(i, 0, obj);
                return;
            }
        }

        this._todo.push(obj);
    }

    _distance(x: number, y: number, z: number, prev: Item | null) {
        switch (this._options.topology) {
            case 4:
                return (Math.abs(x-this._fromX) + Math.abs(y-this._fromY));
            break;

            case 6:
                const dx = Math.abs(x - this._fromX);
                const dy = Math.abs(y - this._fromY);
                return dy + Math.max(0, (dx-dy)/2);
            break;

            case 8: {
                const dX = Math.abs(x - this._fromX);
                const dY = Math.abs(y - this._fromY);
                const dZ = Math.abs(z - this._fromZ);
                return Math.max(
                    dX + dZ,
                    dY + dZ
                );
                //return dX + dY + dZ;
            }
            break;
        }
    }
}

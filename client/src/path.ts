
import * as ROT from '../../lib/rot-js';
import RG from './rg';

import {ICoordXY, TCoord} from './interfaces';
type Cell = import('./map.cell').Cell;
type CellMap = import('./map').CellMap;
type Level = import('./level').Level;

// export const Path: any = {};

const NO_PATH = Object.freeze([]);

export type PathFunc = (map: CellMap, x0: number, y0: number, x1: number, y1: number) => ICoordXY[];

type PassableCb = (x: number, y: number) => boolean;

const DEFAULT_CB: PassableCb = (x, y) => true;

/* Algorithm to calculate passable path without smart pathfinding. Simply tries
 * to progress towards target, and if cannot then fails.
 */
export class PathAlgoXY {

    constructor(public tx: number, public ty: number, public passCb: PassableCb) {
    }

    public compute(sx: number, sy: number, cb: (x, y) => void): void {
        const res: TCoord[] = [];
        let cx = sx;
        let cy = sy;

        while (cx !== this.tx || cy !== this.ty) {
            const dx = this.tx - cx;
            const dy = this.ty - cy;
            const ux = dx / Math.abs(dx);
            const uy = dy / Math.abs(dy);

            if (cx === this.tx) {
                if (cy === this.ty) {break;}
                if (Math.abs(dy) !== 1) {
                    cx += this.passCb(cx + 1, cy) && RG.isSuccess(0.33) ? 1
                    : this.passCb(cx - 1, cy) && RG.isSuccess(0.33) ? -1 : 0;
                }
                cy += uy;
            }
            else if (cy === this.ty) {
                if (cx === this.tx) {break;} // Redundant?
                cx += ux;
                if (Math.abs(dx) !== 1) {
                    cy += this.passCb(cx, cy + 1) && RG.isSuccess(0.33) ? 1
                    : this.passCb(cx, cy - 1) && RG.isSuccess(0.33) ? -1 : 0;
                }
            }
            else {
                cx += ux;
                cy += uy;
            }

            // Add coordinate to the list or fail
            if (this.passCb(cx, cy)) {
                res.push([cx, cy]);
            }
            else {
                break;
            }
        }
        res.forEach((xy: TCoord) => {
            cb(xy[0], xy[1]);
        });
    }
}

export class Path {
    public static getPossiblePath: (x0, y0, x1, y1, cb?: PassableCb) => ICoordXY[];
    public static getShortestPath: (x0, y0, x1, y1, cb?: PassableCb) => ICoordXY[];

    public static getShortestSeenPath: (actor, map: CellMap, x1, y1) => ICoordXY[];
    public static getShortestPassablePath: (map: CellMap, x0, y0, x1, y1) => ICoordXY[];
    public static getActorToActorPath: (map: CellMap, x0, y0, x1, y1) => ICoordXY[];
    public static getShortestActorPath: (map: CellMap, x0, y0, x1, y1, cb?: PassableCb) => ICoordXY[];
    public static getShortestPassablePathWithDoors: (map: CellMap, x0, y0, x1, y1) => ICoordXY[];

    public static shortestDist: (x0, y0, x1, y1) => number;
    public static getPathWeight: (map: CellMap, coord: ICoordXY[]) => number;

    public static getMinWeightPath: (map: CellMap, x0, y0, x1, y1, pathFunc?: PathFunc) => ICoordXY[];
    public static getMinWeightOrShortest: (map: CellMap, x0, y0, x1, y1, passableFuncs) => ICoordXY[];

    public static getWeightPathSegmented: (
        map: CellMap, x0, y0, x1, y1, nSeg, pathFunc?: PathFunc) => ICoordXY[];
    public static getPathSeg: (dist: number, nSeg: number) => number[];

    public static getPathFromEdgeToCell: (level: Level, elemType: string) => ICoordXY[];
}

Path.getPossiblePath = function(x0, y0, x1, y1, cb: PassableCb = DEFAULT_CB): ICoordXY[] {
    const coords: ICoordXY[] = [];
    const passableCallback: PassableCb = cb;
    const finder = new PathAlgoXY(x1, y1, passableCallback);
    finder.compute(x0, y0, (x, y) => {
        coords.push({x, y});
    });
    return coords;

};

/* Returns shortest path (array of x,y pairs) between two points. Does not
* check if any of the cells are passable, unless a callback is given, which
* is called with (x, y). */
Path.getShortestPath = function(x0, y0, x1, y1, cb: PassableCb = DEFAULT_CB): ICoordXY[] {
    const coords: ICoordXY[] = [];
    const passableCallback: PassableCb = cb;
    const finder = new ROT.Path.AStar(x1, y1, passableCallback);
    finder.compute(x0, y0, (x, y) => {
        coords.push({x, y});
    });
    return coords;
};

Path.getShortestSeenPath = function(actor, map: CellMap, x1, y1): ICoordXY[] {
    const seenCells: Cell[] = actor.getBrain().getSeenCells();
    const lut: {[key: string]: Cell} = {};

    // Create LUT for better lookup in passable callback
    seenCells.forEach(cell => {
        lut[cell.getKeyXY()] = cell;
    });

    const passableCb = (x, y): boolean => {
        // Assume that each seen cell is within map boundaries
        if (lut.hasOwnProperty(x + ',' + y)) {
            return (
                map.isPassable(x, y) || (x === x0 && y === y0)
                || (x === x1 && y === y1)
            );
        }
        return false;
    };

    const [x0, y0] = actor.getXY();
    if (isSourceBlocked(x0, y0, map, passableCb)) {
        return NO_PATH as ICoordXY[];
    }

    const coords: ICoordXY[] = [];
    const finder = new ROT.Path.AStar(x1, y1, passableCb);
    finder.compute(x0, y0, (x, y) => {
        coords.push({x, y});
    });

    removeSourceAndTarget(coords);
    return coords;
};


/* NOTE: This has problem that if x0,y0 or x1,y1 have actors, returns no path at
 * all. */
Path.getShortestPassablePath = function(map: CellMap, x0, y0, x1, y1): ICoordXY[] {
    const coords = [];
    const passableCallback = (x, y) => map.isPassable(x, y);
    const finder = new ROT.Path.AStar(x1, y1, passableCallback);
    finder.compute(x0, y0, (x, y) => {
        coords.push({x, y});
    });
    return coords;
};

/* Returns shortest actor to actor path. Returns shortest path between two
 * actors excluding the source and destination points. */
Path.getActorToActorPath = function(map: CellMap, x0, y0, x1, y1): ICoordXY[] {
    const coords = [];
    const passableCb = (x, y) => {
        if (map.hasXY(x, y)) {
            return (
                map.isPassable(x, y) || (x === x0 && y === y0)
                || (x === x1 && y === y1)
            );
        }
        return false;
    };

    // Terminate search immediately if source is completely blocked
    if (isSourceBlocked(x0, y0, map, passableCb)) {
        return NO_PATH as ICoordXY[];
    }

    const finder = new ROT.Path.AStar(x1, y1, passableCb);
    finder.compute(x0, y0, (x, y) => {
        coords.push({x, y});
    });

    removeSourceAndTarget(coords);
    return coords;
};

/* Returns shortest path for actor in x0,y0, excluding the source point. If
 * destination point is impassable, returns an empty array. */
Path.getShortestActorPath = function(map: CellMap, x0, y0, x1, y1, cb?: PassableCb): ICoordXY[] {
    const coords = [];
    const passableCb = (x, y) => {
        if (map.hasXY(x, y)) {
            if (cb) {
                return cb(x, y) || (x === x0 && y === y0);
            }
            return (
                map.isPassable(x, y) || (x === x0 && y === y0)
            );
        }
        return false;
    };
    if (isSourceBlocked(x0, y0, map, passableCb)) {
        return NO_PATH as ICoordXY[];
    }

    const finder = new ROT.Path.AStar(x1, y1, passableCb);
    finder.compute(x0, y0, (x, y) => {
        coords.push({x, y});
    });

    removeSource(coords);
    return coords;
};

Path.getShortestPassablePathWithDoors = function(map: CellMap, x0, y0, x1, y1): ICoordXY[] {
    const coords: ICoordXY[] = [];
    const passableCbDoor = (x, y) => {
        if (map.hasXY(x, y)) {
            return map.isPassable(x, y) || map.getCell(x, y).hasDoor();
        }
        return false;
    };
    const finder = new ROT.Path.AStar(x1, y1, passableCbDoor);
    finder.compute(x0, y0, (x, y) => {
        coords.push({x, y});
    });
    return coords;
};


/* Returns shortest distance (in cells) between two points.*/
Path.shortestDist = function(x0, y0, x1, y1): number {
    const coords = Path.getShortestPath(x0, y0, x1, y1);
    return coords.length - 1; // Subtract one because starting cell included
};

/* Returns a weight for given path. */
Path.getPathWeight = (map: CellMap, coord: ICoordXY[]): number => {
    let w = 0;
    coord.forEach(c => {
        if (map.hasXY(c.x, c.y)) {
            const elem = map.getBaseElemXY(c.x, c.y);
            switch (elem.getType()) {
                case 'floor': w += 1; break;
                case 'forest': w += 2; break;
                case 'stone': w += 2; break;
                case 'water': w += 4; break;
                case 'highrock': w += 4; break;
                case 'chasm': w += 5; break;
                case 'wall': w += 20; break;
                default: w += 0; break;
            }
        }
    });
    return w;
};

/* Gets the minimum weight path between x0,y0 and x1,y1 of two options.
 * This algorithm will
 * tunnel through any obstacles eventually. Optionally takes the path function
 * as last argument or uses the default getShortestPassablePath. */
Path.getMinWeightPath = function(map: CellMap, x0, y0, x1, y1, pathFunc?: PathFunc): ICoordXY[] {
    let coordPassable = [];
    if (pathFunc) {
        coordPassable = pathFunc(map, x0, y0, x1, y1);
    }
    else {
        coordPassable = Path.getShortestPassablePath(map, x0, y0, x1, y1);
    }

    const coordShortest = Path.getShortestPath(x0, y0, x1, y1);
    const passableWeight = Path.getPathWeight(map, coordPassable);
    const shortestWeight = Path.getPathWeight(map, coordShortest);

    let coord = null;
    if (coordPassable.length === 0) {
        coord = coordShortest;
    }
    else {
        coord = passableWeight >= shortestWeight ? coordShortest
            : coordPassable;
    }
    return coord;
};

/* Given map and two x,y points, calculates min paths between these points using
 * the list of path functions. */
Path.getMinWeightOrShortest = function(map: CellMap, x0, y0, x1, y1, passableFuncs: PassableCb[]): ICoordXY[] {
    const coordShortest: ICoordXY[] = Path.getShortestPath(x0, y0, x1, y1);
    const paths: ICoordXY[][] = [];
    passableFuncs.forEach((passableCb: PassableCb) => {
        const path = Path.getShortestPath(x0, y0, x1, y1, passableCb);
        if (path.length > 0) {
            paths.push(path);
        }
    });
    paths.push(coordShortest);

    let minPath: ICoordXY[] = [];
    let minWeight = -1;
    paths.forEach(path => {
        const pathWeight = Path.getPathWeight(map, path);
        if (minWeight === -1 || pathWeight < minWeight) {
            minWeight = pathWeight;
            minPath = path;
        }
    });
    return minPath;
};

/* This algorithm divides the path into nSegments, then computes minimum
 * weighted path for each of those segments. This makes the
 * path look more realistic, but of course less optimal.
 */
Path.getWeightPathSegmented = function(map: CellMap, x0, y0, x1, y1, nSeg, pathFunc?: PathFunc): ICoordXY[] {
    const dX = x1 - x0;
    const dY = y1 - y0;
    const segX = Path.getPathSeg(dX, nSeg);
    const segY = Path.getPathSeg(dY, nSeg);
    let finalPath: ICoordXY[] = [];

    let [startX, startY] = [x0, y0];
    for (let i = 0; i < nSeg; i++) {
        const [endX, endY] = [startX + segX[i], startY + segY[i]];
        const segmentPath = Path.getMinWeightPath(map, startX, startY,
            endX, endY, pathFunc);
        [startX, startY] = [endX, endY];
        finalPath = finalPath.concat(segmentPath);
    }
    return finalPath;
};


/* Returns the path segment sizes. For example, dist=17, nSeg=4,
 * produces [4, 4, 4, 5] */
Path.getPathSeg = function(dist: number, nSeg: number): number[] {
    let remain = dist;
    const result = [];
    const segSize = Math.floor(dist / nSeg);
    for (let i = 0; i < nSeg - 1; i++) {
        result.push(segSize);
        remain -= segSize;
    }
    result.push(remain);
    return result;
};


Path.getPathFromEdgeToCell = function(level: Level, elemType: string): ICoordXY[] {
    const edgeConns: Cell[] = level.getFreeEdgeCells();
    const randConn: Cell = edgeConns[0];
    const randDoor = level.getCellWithElem(elemType);
    if (!randDoor || !randConn) {return [];}
    const map = level.getMap();
    const passCb = (x: number, y: number): boolean => (
        map.hasXY(x, y)
            && !/wall/.test(map.getCell(x, y).getBaseElem().getType())
    );
    const [x0, y0] = randConn.getXY();
    const [x1, y1] = randDoor.getXY();
    const path = Path.getShortestPath(x0, y0, x1, y1, passCb);
    return path;
};

/* HELPER FUNCTIONS. */

function isSourceBlocked(x0, y0, map: CellMap, passableCb: PassableCb): boolean {
    for (let x = x0 - 1; x <= x0 + 1; x++) {
        for (let y = y0 - 1; y <= y0 + 1; y++) {
            if (map.hasXY(x, y)) {
                if (passableCb(x, y)) {return false;}
            }
        }
    }
    return true;
}

function removeSource(coords): void {
    if (coords.length > 0) {
        coords.shift();
    }
}

function removeSourceAndTarget(coords): void {
    if (coords.length > 1) {
        coords.shift(); // Remove source x,y
        coords.pop(); // Remove target x,y
    }
}

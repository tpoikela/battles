
const ROT = require('../../lib/rot');
const RG = require('./rg');

const Path = {};

/* NOTE: This has problem that if x0,y0 or x1,y1 have actors, returns no path at
 * all. */
Path.getShortestPassablePath = function(map, x0, y0, x1, y1) {
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
Path.getActorToActorPath = function(map, x0, y0, x1, y1) {
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
    const finder = new ROT.Path.AStar(x1, y1, passableCb);
    finder.compute(x0, y0, (x, y) => {
        coords.push({x, y});
    });

    if (coords.length > 1) {
        coords.shift(); // Remove source x,y
        coords.pop(); // Remove target x,y
    }
    return coords;
};

/* Returns shortest path for actor in x0,y0, excluding the source point. If
 * destination point is impassable, returns an empty array. */
Path.getShortestActorPath = function(map, x0, y0, x1, y1, cb) {
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
    const finder = new ROT.Path.AStar(x1, y1, passableCb);
    finder.compute(x0, y0, (x, y) => {
        coords.push({x, y});
    });

    if (coords.length > 0) {
        coords.shift(); // Remove source x,y
    }
    return coords;
};

Path.getShortestPassablePathWithDoors = function(map, x0, y0, x1, y1) {
    const coords = [];
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

/* Returns shortest path (array of x,y pairs) between two points. Does not
* check if any of the cells are passable. */
Path.getShortestPath = function(x0, y0, x1, y1, cb = () => true) {
    const coords = [];
    const passableCallback = cb;
    const finder = new ROT.Path.AStar(x1, y1, passableCallback);
    finder.compute(x0, y0, (x, y) => {
        coords.push({x, y});
    });
    return coords;
};

/* Returns shortest distance (in cells) between two points.*/
Path.shortestDist = function(x0, y0, x1, y1) {
    const coords = Path.getShortestPath(x0, y0, x1, y1);
    return coords.length - 1; // Subtract one because starting cell included
};

Path.getPathWeight = (map, coord) => {
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
Path.getMinWeightPath = function(map, x0, y0, x1, y1, pathFunc) {
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

/* This algorithm divides the path into nSegments, then computes minimum
 * weighted path for each of those segments. This makes the
 * path look more realistic, but of course less optimal.
 */
Path.getWeightPathSegmented = function(map, x0, y0, x1, y1, nSeg, pathFunc) {
    const dX = x1 - x0;
    const dY = y1 - y0;
    const segX = RG.Path.getPathSeg(dX, nSeg);
    const segY = RG.Path.getPathSeg(dY, nSeg);
    let finalPath = [];

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

Path.addPathToMap = function(map, coord) {
    const chosenCoord = [];
    for (let j = 0; j < coord.length; j++) {
        const c = coord[j];
        if (map.hasXY(c.x, c.y)) {
            const baseElem = map.getBaseElemXY(c.x, c.y);
            if (baseElem.getType().match(/(chasm|water)/)) {
                map.setBaseElemXY(c.x, c.y, RG.ELEM.BRIDGE);
            }
            else if (baseElem.getType() === 'stone') {
                // TODO add mountain path
                map.setBaseElemXY(c.x, c.y, RG.ELEM.ROAD);
            }
            else {
                map.setBaseElemXY(c.x, c.y, RG.ELEM.ROAD);
            }
            chosenCoord.push(c);
        }
    }
    return chosenCoord;
};

/* Returns the path segment sizes. For example, dist=17, nSeg=4,
 * produces [4, 4, 4, 5] */
Path.getPathSeg = function(dist, nSeg) {
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

module.exports = Path;

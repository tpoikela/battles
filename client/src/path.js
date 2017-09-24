
const ROT = require('../../lib/rot');
const RG = require('./rg');

const Path = {};

Path.getShortestPassablePath = function(map, x0, y0, x1, y1) {
    const coords = [];
    const passableCallback = (x, y) => map.isPassable(x, y);
    const finder = new ROT.Path.AStar(x1, y1, passableCallback);
    finder.compute(x0, y0, (x, y) => {
        coords.push({x, y});
    });
    return coords;
};

Path.getShortestPassablePathWithDoors = function(map, x0, y0, x1, y1) {
    console.log('BEGIN getShortestPassablePathWithDoors');
    const coords = [];
    const passableCbDoor = (x, y) => {
        if (map.hasXY(x, y)) {
            if (map.getCell(x, y).hasDoor()) {
                console.log('Found door at ' + x + ',' + y);
            }
            return map.isPassable(x, y) || map.getCell(x, y).hasDoor();
        }
        return false;
    };
    const finder = new ROT.Path.AStar(x1, y1, passableCbDoor);
    finder.compute(x0, y0, (x, y) => {
        coords.push({x, y});
    });
    console.log('Path with doors length: ' + coords.length);
    return coords;
};

/* Returns shortest path (array of x,y pairs) between two points. Does not
* check if any of the cells are passable. */
Path.getShortestPath = function(x0, y0, x1, y1) {
    const coords = [];
    const passableCallback = () => true;
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

/* Gets the minimum weight path between x0,y0 and x1,y1. This algorithm will
* tunnel through any obstacles eventually. Optionally takes the path function
* as last argument or uses the default getShortestPassablePath. */
Path.getMinWeightPath = function(map, x0, y0, x1, y1, pathFunc) {
    let coordPassable = [];
    if (pathFunc) {
        console.log('pathFunc given. Using it now');
        coordPassable = pathFunc(map, x0, y0, x1, y1);
    }
    else {
        coordPassable = Path.getShortestPassablePath(map, x0, y0, x1, y1);
    }

    const coordShortest = Path.getShortestPath(x0, y0, x1, y1);
    const passableWeight = Path.getPathWeight(map, coordPassable);
    const shortestWeight = Path.getPathWeight(map, coordShortest);

    console.log(`passableWeight: ${passableWeight}`);
    console.log(`shortestWeight: ${shortestWeight}`);

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

module.exports = Path;

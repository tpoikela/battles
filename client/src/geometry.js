
const RG = require('./rg');

/* Contains generic 2D geometric functions for square/rectangle/triangle
 * generation and level manipulation. */
RG.Geometry = {

    /* Returns all coord in a box around x0,y0 within distance d. Last arg can
     * be used to include the coordinate itself in the result. */
    getBoxAround: function(x0, y0, d, incSelf = false) {
        const res = [];
        for (let x = x0 - d; x <= x0 + d; x++) {
            for (let y = y0 - d; y <= y0 + d; y++) {
                if (x !== x0 || y !== y0) {
                    res.push([x, y]);
                }
            }
        }
        if (incSelf) {res.push([x0, y0]);}
        return res;
    },

    getCrossAround: function(x0, y0, d, incSelf = false) {
        const res = [];
        for (let x = x0 - d; x <= x0 + d; x++) {
            for (let y = y0 - d; y <= y0 + d; y++) {
                if (x === x0 || y === y0) {
                    if (x !== x0 || y !== y0) {
                        res.push([x, y]);
                    }
                }
            }
        }
        if (incSelf) {res.push([x0, y0]);}
        return res;

    },

    /* Returns a box of coordinates given starting point and end points
     * (inclusive). */
    getBox: function(x0, y0, maxX, maxY) {
        const res = [];
        for (let x = x0; x <= maxX; x++) {
            for (let y = y0; y <= maxY; y++) {
                res.push([x, y]);
            }
        }
        return res;
    },

    /* Given two cells, returns bounding box defined by upper-left
     * and lower-right corners.
     */
    getBoxCornersForCells: function(c0, c1) {
      const [x0, y0] = [c0.getX(), c0.getY()];
      const [x1, y1] = [c1.getX(), c1.getY()];
      const ulx = x0 <= x1 ? x0 : x1;
      const lrx = x1 > x0 ? x1 : x0;
      const uly = y0 <= y1 ? y0 : y1;
      const lry = y1 > y0 ? y1 : y0;
      return {ulx, uly, lrx, lry};
    },

    /* Given start x,y and end x,y coordinates, returns all x,y coordinates in
     * the border of the rectangle.*/
    getHollowBox: function(x0, y0, maxX, maxY) {
        const res = [];
        for (let x = x0; x <= maxX; x++) {
            for (let y = y0; y <= maxY; y++) {
                if ((y === y0 || y === maxY || x === x0 || x === maxX) ) {
                    res.push([x, y]);
                }
            }
        }
        return res;
    },

    getHollowDiamond: function(x0, y0, size) {
        const RightX = x0 + 2 * size;
        const midX = x0 + size;
        const highY = y0 + size;
        const lowY = y0 - size;

        const diamond = {};
        const coord = [[x0, y0]];
        diamond.N = [midX, highY];
        diamond.S = [midX, lowY];
        diamond.E = [RightX, y0];
        diamond.W = [x0, y0];
        // Left side of the diamond
        for (let x = x0 + 1; x <= midX; x++) {
            // Upper left coordinates
            for (let y = y0 + 1; y <= highY; y++) {
                coord.push([x, y]);
            }
            // Lower left coordinates
            for (let y = y0 - 1; y >= lowY; y--) {
                coord.push([x, y]);
            }
        }

        // Righ side of the diamond
        for (let x = midX + 1; x <= RightX; x++) {
            // Upper right coordinates
            for (let y = y0 + 1; y <= highY; y++) {
                coord.push([x, y]);
            }
            // Lower right coordinates
            for (let y = y0 - 1; y >= lowY; y--) {
                coord.push([x, y]);
            }
        }
        diamond.coord = coord;
        return diamond;
    },

    /* Returns true if given coordinate is one of the corners defined by the
     * box. */
    isCorner: function(x, y, ulx, uly, lrx, lry) {
        if (x === ulx || x === lrx) {
            return y === uly || y === lry;
        }
        return false;
    },

    /* Removes all xy-pairs from the first array that are contained also in the
     * 2nd one. Returns number of elements removed. */
    removeMatching: function(modified, toBeRemoved) {
        let nFound = 0;
        if (Array.isArray(modified)) {
            toBeRemoved.forEach(xy => {
                const index = modified.findIndex(xyPair => (
                    xyPair[0] === xy[0] && xyPair[1] === xy[1]
                ));

                if (index >= 0) {
                    modified.splice(index, 1);
                    ++nFound;
                }

            });
        }
        else {
            toBeRemoved.forEach(xy => {
                const key = xy[0] + ',' + xy[1];
                if (modified.hasOwnProperty(key)) {
                    delete modified[key];
                    ++nFound;
                }
            });
        }
        return nFound;
    },

    /* Given a list of levels and x,y sizes, creates a super-level. Works
    * properly only if all levels have equal size. */
    /* abutLevels: function(levels, x, y) {
        if (levels.length !== x * y) {
            RG.err('RG', 'abutLevels',
                `${levels.length} cannot be abutted as ${x} by ${y}.`);
        }
        const l0 = levels[0];
        const cols = l0.getMap().cols * x;
        const rows = l0.getMap().rows * y;
        const newLevel = RG.FACT.createLevel('empty', cols, rows);

        for (let xx = 0; xx < x; xx++) {
            for (let yy = 0; yy < y; yy++) {
                const index = yy * x + xx;
                const currLevel = levels[index];
                // Loop through all cells

            }
        }

    },*/

    /* Splits a larger level into a matrix of X by Y sublevels. This does
    * not preserve the original level for efficiency reasons, but extracts
    * all entities and moves them to smaller levels. */
    splitLevel: function(level, conf) {
        const levels = [];
        const width = level.getMap().cols / conf.nLevelsX;
        const height = level.getMap().rows / conf.nLevelsY;

        for (let x = 0; x < conf.nLevelsX; x++) {
            const levelCol = [];
            for (let y = 0; y < conf.nLevelsY; y++) {
                const subLevel = RG.FACT.createLevel('empty', width, height);
                levelCol.push(subLevel);
            }
            levels.push(levelCol);
        }

        const getSubLevel = function(x, y) {
            const subIndexX = Math.floor(x / width);
            const subIndexY = Math.floor(y / height);
            return levels[subIndexX][subIndexY];
        };

        const getSubX = function(x) {return x % width;};
        const getSubY = function(y) {return y % height;};

        // Move all the elements
        const map = level.getMap();
        for (let x = 0; x < map.cols; x++) {
            for (let y = 0; y < map.rows; y++) {
                // Get correct sub-level
                const subLevel = getSubLevel(x, y);
                const subX = getSubX(x);
                const subY = getSubY(y);
                subLevel.getMap().setBaseElemXY(
                    subX, subY, map.getBaseElemXY(x, y));

                // Translate x,y to sub-level x,y
            }
        }

        // Move actors
        const actors = level.getActors().slice();
        actors.forEach(actor => {
            const aX = actor.getX();
            const aY = actor.getY();
            if (level.removeActor(actor)) {
                const subLevel = getSubLevel(aX, aY);
                const subX = getSubX(aX);
                const subY = getSubY(aY);
                subLevel.addActor(actor, subX, subY);
            }
            else {
                RG.warn('Geometry', 'splitLevel',
                    `removeActor failed on ${JSON.stringify(actor)}`);
            }
        });

        // Move items
        const items = level.getItems().slice();
        items.forEach(item => {
            const aX = item.getX();
            const aY = item.getY();
            level.removeItem(item, aX, aY);

            const subLevel = getSubLevel(aX, aY);
            const subX = getSubX(aX);
            const subY = getSubY(aY);
            subLevel.addItem(item, subX, subY);
        });

        // Warn about existing stairs
        const stairs = level.getStairs();
        if (stairs.length > 0) {
            RG.warn('Geometry', 'splitLevel',
                'Function does not move stairs correctly (yet).');
        }

        return levels;
    },

    /* Inserts a level inside another one. Function works only for elements, and
     * sets map cells only. */
    insertSubLevel: function(l1, l2, startX, startY) {
        const m1 = l1.getMap();
        const m2 = l2.getMap();
        this.mergeMaps(m1, m2, startX, startY);
    },

    mergeMaps: function(m1, m2, startX, startY) {
        if (m1.cols < m2.cols) {
            const got = `m1: ${m1.cols} m2: ${m2.cols}`;
            RG.err('Geometry', 'mergeMaps',
                'Cols: m2 cols must be smaller/equal: ' + got);
        }
        if (m1.rows < m2.rows) {
            const got = `m1: ${m1.rows} m2: ${m2.rows}`;
            RG.err('Geometry', 'mergeMaps',
                'Rows: m2 rows must be smaller/equal: ' + got);
        }
        const endX = startX + m2.cols - 1;
        const endY = startY + m2.rows - 1;
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                if (m1.hasXY(x, y)) {
                    m1._map[x][y] = m2._map[x - startX][y - startY];
                    m1._map[x][y].setX(x);
                    m1._map[x][y].setY(y);
                }
            }
        }
    },

    iterateMapWithBBox: function(map, bbox, cb) {
        for (let x = bbox.ulx; x <= bbox.lrx; x++) {
            for (let y = bbox.uly; y <= bbox.lry; y++) {
                if (map.hasXY(x, y)) {
                    cb(x, y);
                }
            }
        }
    },

    /* Inserts elements into the given level as rectangle bounded by the
     * coordinates given. */
    insertElements: function(l1, elemType, bbox) {
        const m1 = l1.getMap();
        this.iterateMapWithBBox(m1, bbox, (x, y) => {
            const elem = RG.FACT.createElement(elemType);
            if (elemType.match(/(wall|floor)/)) {
                m1._map[x][y].setBaseElem(elem);
            }
            else {
                m1._map[x][y].setProp('elements', elem);
            }
        });
    },

    /* Inserts actors into the given level as rectangle bounded by the
     * coordinates given. Skips non-free cells. */
    insertActors: function(l1, actorName, bbox, parser) {
        const m1 = l1.getMap();
        this.iterateMapWithBBox(m1, bbox, (x, y) => {
            if (m1.getCell(x, y).isFree()) {
                const actor = parser.createActualObj(RG.TYPE_ACTOR,
                    actorName);
                l1.addActor(actor, x, y);
            }
        });
    },

    /* Inserts items into the given level as rectangle bounded by the
     * coordinates given. Skips non-free cells. */
    insertItems: function(l1, itemName, bbox, parser) {
        const m1 = l1.getMap();
        this.iterateMapWithBBox(m1, bbox, (x, y) => {
            if (m1.getCell(x, y).isFree()) {
                const item = parser.createActualObj(RG.TYPE_ITEM, itemName);
                l1.addItem(item, x, y);
            }
        });
    },


    /* Given a list of coordinates (can be any shape), checks if a box xDim *
     * yDim fits anywhere. Returns true if OK, and
     * 'result' will be a list of x,y pairs for the box. */
    getFreeArea: function(freeCoord, xDim, yDim, result) {
        let found = false;
        const left = freeCoord.slice();
        const lookupXY = {};
        freeCoord.forEach(xy => {
            lookupXY[xy[0] + ',' + xy[1]] = xy;
        });

        while (!found && left.length > 0) {
            const index = RG.RAND.getUniformInt(0, left.length - 1);

            // Starting point
            const x0 = left[index][0];
            const y0 = left[index][1];
            let areaOk = true;

            for (let x = x0; x < x0 + xDim; x++) {
                for (let y = y0; y < y0 + yDim; y++) {
                    if (lookupXY[x + ',' + y]) {
                        result.push([x, y]);
                    }
                    else {
                        areaOk = false;
                    }
                }
            }
            found = areaOk;

            if (!found) {
                result = [];
                left.splice(index);
            }
        }
        return found;
    },

    /* Returns all coordinates within straight line between two points. Returns
     * empty array if there is no line. */
    getStraightLine: function(x0, y0, x1, y1, incEnds = true) {
        const isLine = x0 === x1 || y0 === y1
            || Math.abs(x1 - x0) === Math.abs(y1 - y0);
        if (isLine) {
            const res = [];
            const dX = x1 === x0 ? 0 : (x1 - x0) / Math.abs(x1 - x0);
            const dY = y1 === y0 ? 0 : (y1 - y0) / Math.abs(y1 - y0);
            if (incEnds) {res.push([x0, y0]);}
            while (x0 !== x1 || y0 !== y1) {
                if (x0 !== x1) {x0 += dX;}
                if (y0 !== y1) {y0 += dY;}
                console.log('x0: ' + x0 + ' x1: ' + x1);

                if (x0 === x1 && y0 === y1 && incEnds) {
                    res.push([x0, y0]);
                }
                else {
                    res.push([x0, y0]);
                }
            }
            return res;
        }
        return [];
    }

};

module.exports = RG.Geometry;


const RG = require('./rg');

/* Contains generic 2D geometric functions for square/rectangle/triangle
 * generation and level manipulation. */
RG.Geometry = {

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
    isCorner: function(x, y, llx, lly, urx, ury) {
        if (x === llx || x === urx) {
            return y === lly || y === ury;
        }
        return false;
    },

    /* Removes all xy-pairs from the first array that are contained also in the
     * 2nd one. Returns number of elements removed. */
    removeMatching: function(modified, remove) {
        let nFound = 0;
        remove.forEach(xy => {
            const index = modified.findIndex(xyPair => (
                xyPair[0] === xy[0] && xyPair[1] === xy[1]
            ));

            if (index >= 0) {
                modified.splice(index, 1);
                ++nFound;
            }

        });
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
    * not preserve the original level for efficiency reasons. */
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

    insertSubLevel: function(l1, l2, startX, startY) {
        const m1 = l1.getMap();
        const m2 = l2.getMap();
        if (m1.cols < m2.cols) {
            RG.err('Geometry', 'mergeLevels',
                'Cols: Second level arg cols must be smaller.');
        }
        if (m1.rows < m2.rows) {
            RG.err('Geometry', 'mergeLevels',
                'Rows: Second level arg rows must be smaller.');
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


    /* Inserts elements into the given level as rectangle bounded by the
     * coordinates given. */
    insertElements: function(l1, elemType, llx, lly, urx, ury) {
        const m1 = l1.getMap();
        for (let x = llx; x <= urx; x++) {
            for (let y = lly; y <= ury; y++) {
                if (m1.hasXY(x, y)) {
                    const elem = RG.FACT.createElement(elemType);
                    if (elemType.match(/(wall|floor)/)) {
                        m1._map[x][y].setBaseElem(elem);
                    }
                    else {
                        m1._map[x][y].setProp('elements', elem);
                    }
                }
            }
        }
    },

    /* Inserts actors into the given level as rectangle bounded by the
     * coordinates given. */
    insertActors: function(l1, actorName, llx, lly, urx, ury, parser) {
        const m1 = l1.getMap();
        for (let x = llx; x <= urx; x++) {
            for (let y = lly; y <= ury; y++) {
                if (m1.hasXY(x, y)) {
                    const actor = parser.createActualObj(RG.TYPE_ACTOR,
                        actorName);
                    l1.addActor(actor, x, y);
                }
            }
        }
    },

    /* Inserts items into the given level as rectangle bounded by the
     * coordinates given. */
    insertItems: function(l1, itemName, llx, lly, urx, ury, parser) {
        const m1 = l1.getMap();
        for (let x = llx; x <= urx; x++) {
            for (let y = lly; y <= ury; y++) {
                if (m1.hasXY(x, y)) {
                    const item = parser.createActualObj(RG.TYPE_ITEM, itemName);
                    l1.addItem(item, x, y);
                }
            }
        }
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
    }

};

module.exports = RG.Geometry;

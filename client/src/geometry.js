
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

    getDiagCross: function(x0, y0, d, incSelf = false) {
        const res = [];
        for (let x = x0 - d; x <= x0 + d; x++) {
            for (let y = y0 - d; y <= y0 + d; y++) {
                const dX = x - x0;
                const dY = y - y0;
                if (dX !== 0 && dY !== 0) {
                    res.push([x, y]);
                }
            }
        }
        if (incSelf) {res.push([x0, y0]);}
        return res;
    },

    getCrossCaveConn: function(x0, y0, d, incSelf = false) {
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

    getCoordBbox: function(bbox) {
        const {ulx, uly, lrx, lry} = bbox;
        return this.getBox(ulx, uly, lrx, lry);
    },

    getBorderForBbox: function(bbox) {
        const {ulx, uly, lrx, lry} = bbox;
        return this.getHollowBox(ulx, uly, lrx, lry);
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

        const getSubLevel = (x, y) => {
            const subIndexX = Math.floor(x / width);
            const subIndexY = Math.floor(y / height);
            return levels[subIndexX][subIndexY];
        };

        const getSubX = x => x % width;
        const getSubY = y => y % height;

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

    /* Tiles the list of levels to main level l1. Tiled levels placed
     * side-by-side and aligned based on the conf. 'alignRight' will be
     * implemented when needed.
     */
    tileLevels: function(l1, levels, conf) {
      const {x, y} = conf;
      let currX = x;
      let currY = y;
      if (conf.alignLeft) {
        levels.forEach(level => {
          this.insertSubLevel(l1, level, currX, currY);
          currY += level.getMap().rows;
        });
      }
      else if (conf.centerX) {
        const midX = Math.round(l1.getMap().cols / 2);
        levels.forEach(level => {
          currX = midX - Math.round(level.getMap().cols / 2);
          this.insertSubLevel(l1, level, currX, currY);
          currY += level.getMap().rows;
        });
      }
      else if (conf.centerY) {
        const midY = Math.round(l1.getMap().rows / 2);
        levels.forEach(level => {
          currY = midY - Math.round(level.getMap().rows / 2);
          this.insertSubLevel(l1, level, currX, currY);
          currX += level.getMap().cols;
        });

      }
    },

    /* Wraps given array of levels into new super level. */
    wrapAsLevel: function(levels, conf) {
      const maxCallback = (acc, curr) => Math.max(acc, curr);
      const levelCols = levels.map(l => l.getMap().cols);
      const levelRows = levels.map(l => l.getMap().rows);
      const level = new RG.Map.Level();
      let map = null;

      const baseElem = conf.baseElem || RG.ELEM.FLOOR;
      if (conf.centerY) {
        const rowsMax = levelRows.reduce(maxCallback);
        const colsTotal = levelCols.reduce((sum, value) => sum + value, 0);
        map = new RG.Map.CellList(colsTotal, rowsMax, baseElem);
        level.setMap(map);
        this.tileLevels(level, levels, {centerY: true, x: 0, y: 0});
      }
      else if (conf.centerX) {
        const rowsTotal = levelRows.reduce((sum, value) => sum + value, 0);
        const colsMax = levelCols.reduce(maxCallback);
        map = new RG.Map.CellList(colsMax, rowsTotal, baseElem);
        level.setMap(map);
        this.tileLevels(level, levels, {centerX: true, x: 0, y: 0});
      }
      return level;
    },

    /* Inserts a level inside another one. Function works only for elements, and
     * sets map cells only. */
    insertSubLevel: function(l1, l2, startX, startY) {
        this.mergeLevels(l1, l2, startX, startY);
    },

    /* Does a full Map.Level merge. Actors, items and elements included. */
    mergeLevels: function(l1, l2, startX, startY) {
        const m1 = l1.getMap();
        const m2 = l2.getMap();

        const numActors1 = l1.getActors().length;
        const numActors2 = l2.getActors().length;
        const numExpActors = numActors1 + numActors2;

        // Need copies of lists, originals modified in foreach-loops
        const actors = l2.getActors().slice();
        const items = l2.getItems().slice();
        const elements = l2.getElements().slice();

        const getNewXY = prop => [prop.getX() + startX, prop.getY() + startY];
        actors.forEach(actor => {
            const [x, y] = getNewXY(actor);
            if (m1.hasXY(x, y)) {
                if (l2.removeActor(actor)) {
                    l1.addActor(actor, x, y);
                }
            }
        });

        items.forEach(item => {
            const [x0, y0] = [item.getX(), item.getY()];
            const [x, y] = getNewXY(item);
            if (m1.hasXY(x, y)) {
                if (l2.removeItem(item, x0, y0)) {
                    l1.addItem(item, x, y);
                }
            }
        });

        elements.forEach(elem => {
            const [x0, y0] = [elem.getX(), elem.getY()];
            const [x, y] = getNewXY(elem);
            if (m1.hasXY(x, y)) {
                if (l2.removeElement(elem, x0, y0)) {
                    l1.addElement(elem, x, y);
                }
            }
        });

        this.mergeMapBaseElems(m1, m2, startX, startY);

        const numActorsNew1 = l1.getActors().length;
        if (numActorsNew1 !== numExpActors) {
            RG.err('RG.Geometry', 'mergeLevels',
                `Num actors new: ${numActorsNew1}, exp: ${numExpActors}`);
        }
    },

    /* Merges m2 into m1 starting from x,y in m1. Does not move items/actors. */
    mergeMapBaseElems: function(m1, m2, startX, startY) {
        if (m1.cols < m2.cols) {
            const got = `m1: ${m1.cols} m2: ${m2.cols}`;
            RG.err('Geometry', 'mergeMapBaseElems',
                'Cols: m2 cols must be smaller/equal: ' + got);
        }
        if (m1.rows < m2.rows) {
            const got = `m1: ${m1.rows} m2: ${m2.rows}`;
            RG.err('Geometry', 'mergeMapBaseElems',
                'Rows: m2 rows must be smaller/equal: ' + got);
        }
        const endX = startX + m2.cols - 1;
        const endY = startY + m2.rows - 1;
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                if (m1.hasXY(x, y)) {
                    const cell = m2.getCell(x - startX, y - startY);
                    m1._map[x][y].setBaseElem(cell.getBaseElem());
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

    isLine: function(x0, y0, x1, y1) {
        const isLine = x0 === x1 || y0 === y1
            || Math.abs(x1 - x0) === Math.abs(y1 - y0);
        return isLine;
    },

    /* Returns all coordinates within straight line between two points. Returns
     * empty array if there is no line. Straight means all cardinal directions.
     */
    getStraightLine: function(x0, y0, x1, y1, incEnds = true) {
        if (this.isLine(x0, y0, x1, y1)) {
            const res = [];
            const dX = x1 === x0 ? 0 : (x1 - x0) / Math.abs(x1 - x0);
            const dY = y1 === y0 ? 0 : (y1 - y0) / Math.abs(y1 - y0);
            if (incEnds) {res.push([x0, y0]);}
            while (x0 !== x1 || y0 !== y1) {
                if (x0 !== x1) {x0 += dX;}
                if (y0 !== y1) {y0 += dY;}

                if (x0 === x1 && y0 === y1) {
                    if (incEnds) {
                        res.push([x0, y0]);
                    }
                }
                else {
                    res.push([x0, y0]);
                }
            }
            return res;
        }
        return [];
    },

    /* Returns a path from x0,y0 to x1,y1 which resembles "straight" line. */
    getMissilePath: function(x0, y0, x1, y1, incEnds = true) {
        let res = [];
        if (this.isLine(x0, y0, x1, y1)) {
            res = this.getStraightLine(x0, y0, x1, y1, incEnds);
        }
        else {
            if (incEnds) {res.push([x0, y0]);}
            const dX = x1 - x0;
            const dY = y1 - y0;
            const dXAbs = Math.abs(dX);
            const dYAbs = Math.abs(dY);

            const dirX = dX / dXAbs;
            const dirY = dY / dYAbs;

            let xLeft = dXAbs;
            let yLeft = dYAbs;
            let currX = x0;
            let currY = y0;

            if (dXAbs > dYAbs) {

                // Loop until we have straight line, or regular ratio between
                // x/y distance
                while (yLeft >= 0 && (xLeft % yLeft !== 0)) {
                    currX += dirX;
                    currY += dirY;
                    res.push([currX, currY]);
                    xLeft -= 1;
                    yLeft -= 1;
                }

                if (yLeft === 0) { // Finish straight line
                    while (currX !== x1) {
                        currX += dirX;
                        res.push([currX, currY]);
                    }
                }
                else { // remainder 0
                    const ratio = xLeft / yLeft;
                    while (currX !== x1 && currY !== y1) {
                        if (currY !== y1) {
                            currY += dirY;
                        }
                        for (let i = 0; i < ratio; i++) {
                            if (currX !== x1) {
                                currX += dirX;
                                res.push([currX, currY]);
                            }
                        }
                    }
                }

            }
            else if (dYAbs > dXAbs) {

                // Loop until we have straight line, or regular ratio between
                // x/y distance
                while (xLeft >= 0 && (yLeft % xLeft !== 0)) {
                    currX += dirX;
                    currY += dirY;
                    res.push([currX, currY]);
                    xLeft -= 1;
                    yLeft -= 1;
                }

                if (xLeft === 0) { // Finish straight line
                    while (currY !== y1) {
                        currY += dirY;
                        res.push([currX, currY]);
                    }
                }
                else { // remainder 0
                    const ratio = yLeft / xLeft;
                    while (currX !== x1 && currY !== y1) {
                        if (currX !== x1) {
                            currX += dirX;
                        }
                        for (let i = 0; i < ratio; i++) {
                            if (currY !== y1) {
                                currY += dirY;
                                res.push([currX, currY]);
                            }
                        }
                    }
                }
            }

        }
        return res;
    }

};


/* From: https://en.wikipedia.org/wiki/Flood_fill
Flood-fill (node, target-color, replacement-color):
  1. If target-color is equal to replacement-color, return.
  2. If color of node is not equal to target-color, return.
  3. Set Q to the empty queue.
  4.  Set the color of node to replacement-color.
  5. Add node to the end of Q.
  6. While Q is not empty:
  7.     Set n equal to the first element of Q.
  8.     Remove first element from Q.
  9.     If the color of the node to the west of n is target-color,
             set the color of that node to replacement-color and
             add that node to the end of Q.
 10.     If the color of the node to the east of n is target-color,
             set the color of that node to replacement-color and add
             that node to the end of Q.
 11.     If the color of the node to the north of n is target-color,
             set the color of that node to replacement-color
             and add that node to the end of Q.
 12.    If the color of the node to the south of n is target-color,
           set the color of that node to replacement-color
           and add that node to the end of Q.
 13. Continue looping until Q is exhausted.
 14. Return.
*/

/* Given a starting cell and type, floodfills the map from that position and
 * returns all cells included in the floodfill. */
RG.Geometry.floodfill = function(map, cell, type, diag = false) {
    let filterFunc = type;
    if (typeof type === 'string') {
        filterFunc = c => c.getBaseElem().getType() === type;
    }
    if (!filterFunc(cell)) {return [];}

    let currCell = cell;
    const cellsLeft = [];
    const result = [cell];
    const colored = {}; // Needed because we're not changing anything
    colored[cell.getKeyXY()] = true;

    /* Private func which checks if the cell should be added to floodfill. */
    const tryToAddCell = function(x, y) {
        if (map.hasXY(x, y)) {
            if (!colored[x + ',' + y]) {
                const addedCell = map.getCell(x, y);
                if (filterFunc(addedCell)) {
                    colored[addedCell.getKeyXY()] = true;
                    result.push(addedCell);
                    cellsLeft.push(addedCell);
                }
            }
        }
    };

    while (currCell) {
        const [x, y] = currCell.getXY();
        // 9. West
        const xWest = x - 1;
        tryToAddCell(xWest, y);

        // 10. East
        const xEast = x + 1;
        tryToAddCell(xEast, y);

        // 11. North
        const yNorth = y - 1;
        tryToAddCell(x, yNorth);

        // 12. South
        const ySouth = y + 1;
        tryToAddCell(x, ySouth);

        // Allow diagonals in fill if requested
        if (diag) {
            tryToAddCell(xWest, yNorth);
            tryToAddCell(xEast, yNorth);
            tryToAddCell(xWest, ySouth);
            tryToAddCell(xEast, ySouth);
        }

        currCell = cellsLeft.shift();
    }
    return result;
};

/* Does a floodfill of map from point xy. Uses value as the filled value. BUT,
 * does not modify the map, only returns x,y coordinates which would be filled.
 * Optionally, creates a lookup table for fast lookup, and can fill diagonally,
 * if the last arg is true.
 */
RG.Geometry.floodfill2D = function(map, xy, value, lut = false, diag = false) {
    const [x, y] = xy;
    if (map[x][y] !== value) {return [];}

    let currXY = xy;
    const xyLeft = [];
    const result = [currXY];
    const colored = {}; // Needed because we're not changing anything
    colored[x + ',' + y] = true;

    /* Private func which checks if the cell should be added to floodfill. */
    const tryToAddXY = function(x, y) {
        if (x < map.length && y < map[0].length) {
            if (!colored[x + ',' + y]) {
                const currValue = map[x][y];
                if (currValue === value) {
                    colored[x + ',' + y] = true;
                    result.push([x, y]);
                    if (lut) {lut[x + ',' + y] = true;}
                    xyLeft.push([x, y]);
                }
            }
        }
    };

    while (currXY) {
        const [x, y] = currXY;
        // 9. West
        const xWest = x - 1;
        tryToAddXY(xWest, y);

        // 10. East
        const xEast = x + 1;
        tryToAddXY(xEast, y);

        // 11. North
        const yNorth = y - 1;
        tryToAddXY(x, yNorth);

        // 12. South
        const ySouth = y + 1;
        tryToAddXY(x, ySouth);

        // Allow diagonals in fill if requested
        if (diag) {
            tryToAddXY(xWest, yNorth);
            tryToAddXY(xEast, yNorth);
            tryToAddXY(xWest, ySouth);
            tryToAddXY(xEast, ySouth);
        }

        currXY = xyLeft.shift();
    }
    return result;

};

RG.Geometry.getMassCenter = function(arr) {
    let x = 0;
    let y = 0;
    for (let i = 0; i < arr.length; i++) {
        x += arr[i][0];
        y += arr[i][1];
    }
    return [
        Math.round(x / arr.length),
        Math.round(y / arr.length)
    ];
};

/* Square fill finds the largest square shaped region of a given cell type. */
RG.Geometry.squareFill = function(map, cell, type, dXdY) {
    const [endX, endY] = cell.getXY();
    const [dX, dY] = dXdY;
    if (dX === 0 || dY === 0) {
        RG.err('RG.Geometry', 'squareFill',
            `dx,dy must be -1 or 1. Got ${dXdY}`);
    }
    let failed = false;
    let result = [cell];
    let currCell = cell;
    // let prevCell = cell;

    while (!failed) {
        const round = [];
        const [cX, cY] = currCell.getXY();
        const [nX, nY] = [cX + dX, cY + dY];
        if (map.hasXY(nX, nY)) {
            const newDiag = map.getCell(nX, nY);
            // 1. Get new diagonal, test it first
            if (newDiag.getBaseElem().getType() !== type) {
                failed = true;
                break;
            }
            round.push(newDiag);

            // 2. Traverse in x-direction
            let x = nX;
            do {
                x += -dX;
                const cellX = map.getCell(x, nY);
                if (cellX.getBaseElem().getType() !== type) {
                    failed = true;
                    break;
                }
                round.push(cellX);

            } while (x !== endX);

            // 3. Traverse in y-direction
            let y = nY;
            do {
                y += -dY;
                const cellY = map.getCell(nX, y);
                if (cellY.getBaseElem().getType() !== type) {
                    failed = true;
                    break;
                }
                round.push(cellY);

            } while (y !== endY);

            if (!failed) {
                result = result.concat(round);
            }

            // prevCell = currCell;
            currCell = newDiag;
        }

    }
    return result;
};

module.exports = RG.Geometry;

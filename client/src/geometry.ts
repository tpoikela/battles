
import RG from './rg';
import {Random} from './random';
import {TCoord, BBox} from './interfaces';

const RNG = Random.getRNG();

export interface BBoxOld {
    llx: number;
    lly: number;
    urx: number;
    ury: number;
}

type Cell = import('./map.cell').Cell;
type Level = import('./level').Level;

type BBoxType = BBox | BBoxOld;

interface Diamond {
    N: number[];
    S: number[];
    E: number[];
    W: number[];
    coord: TCoord[];
}

/* Contains generic 2D geometric functions for square/rectangle/triangle
 * generation and level manipulation. */
export const Geometry: any = {

    /* Returns all coord in a box around x0,y0 within distance d. Last arg can
     * be used to include the coordinate itself in the result. */
    getBoxAround(x0, y0, d, incSelf = false): TCoord[] {
        verifyInt([x0, y0]);
        const res: TCoord[] = [];
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

    getCrossAround(x0, y0, d, incSelf = false): TCoord[] {
        verifyInt([x0, y0, d]);
        const res: TCoord[] = [];
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

    getDiagCross(x0, y0, d, incSelf = false): TCoord[] {
        verifyInt([x0, y0, d]);
        const res: TCoord[] = [];
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

    getCrossCaveConn(x0, y0, d, incSelf = false): TCoord[] {
        verifyInt([x0, y0, d]);
        const res: TCoord[] = [];
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
    getBox(x0, y0, maxX, maxY): TCoord[] {
        verifyInt([x0, y0, maxX, maxY]);
        const res: TCoord[] = [];
        for (let x = x0; x <= maxX; x++) {
            for (let y = y0; y <= maxY; y++) {
                res.push([x, y]);
            }
        }
        return res;
    },

    /* Converts old (SoCE) style bbox to BitN bbox. */
    convertBbox(bbox: BBoxType): BBox {
        if (bbox.hasOwnProperty('llx')) {
            return {
                ulx: (bbox as BBoxOld).llx,
                uly: (bbox as BBoxOld).ury,
                lrx: (bbox as BBoxOld).urx,
                lry: (bbox as BBoxOld).lly
            };
        }
        else {
            return (bbox as BBox);
        }
    },

    getCoordBbox(bbox: BBox): TCoord[] {
        const {ulx, uly, lrx, lry} = bbox;
        return this.getBox(ulx, uly, lrx, lry);
    },

    getBorderForBbox(bbox: BBox): TCoord[] {
        const {ulx, uly, lrx, lry} = bbox;
        return this.getHollowBox(ulx, uly, lrx, lry);
    },

    getCellsInBbox(map2D: any[][], bbox: BBox): Cell[] {
        const coord = this.getCoordBbox(bbox);
        const result = [];
        coord.forEach((xy: TCoord) => {
            result.push(map2D[xy[0]][xy[1]]);
        });
        return result;
    },

    isInBbox(x: number, y: number, bbox: BBox): boolean {
        const {ulx, uly, lrx, lry} = bbox;
        return x >= ulx && x <= lrx && y >= uly && y <= lry;
    },

    isValidBbox(bbox: any): boolean {
        if (!bbox) {return false;}
        const {ulx, uly, lrx, lry} = bbox;
        return !RG.isNullOrUndef([ulx, uly, lrx, lry]);
    },

    /* Converts a direction into bbox based on cols, rows. */
    dirToBbox(cols: number, rows: number, dir: TCoord): BBox {
        const colsDiv = Math.round(cols / 3);
        const rowsDiv = Math.round(rows / 3);
        const cBbox = {ulx: colsDiv, uly: rowsDiv,
            lrx: 2 * colsDiv - 1, lry: 2 * rowsDiv - 1};
        const dXdY = RG.dirTodXdY(dir);
        if (dXdY) {
            return {
                ulx: cBbox.ulx + dXdY[0] * colsDiv,
                uly: cBbox.uly + dXdY[1] * rowsDiv,
                lrx: cBbox.lrx + dXdY[0] * colsDiv,
                lry: cBbox.lry + dXdY[1] * rowsDiv
            };
        }
        else {
            RG.err('Geometry', 'dirToBbox', `Invalid dir ${dir} given.`);
        }
        return null;
    },

    /* Given two cells, returns bounding box defined by upper-left
     * and lower-right corners.
     */
    getBoxCornersForCells(c0: Cell, c1: Cell): BBox {
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
    getHollowBox(x0, y0, maxX, maxY) {
        verifyInt([x0, y0, maxX, maxY]);
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

    getHollowDiamond(x0: number, y0: number, size: number): Diamond {
        verifyInt([x0, y0, size]);
        const RightX = x0 + 2 * size;
        const midX = x0 + size;
        const highY = y0 + size;
        const lowY = y0 - size;

        const coord: TCoord[] = [[x0, y0]];
        const diamond = {
            N: [midX, highY],
            S: [midX, lowY],
            E: [RightX, y0],
            W: [x0, y0],
            coord: []
        };
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
    isCorner(x, y, ulx, uly, lrx, lry): boolean {
        if (x === ulx || x === lrx) {
            return y === uly || y === lry;
        }
        return false;
    },

    /* Removes all xy-pairs from the first array that are contained also in the
     * 2nd one. Returns number of elements removed. */
    removeMatching(modified, toBeRemoved): number {
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


    /* Tiles the list of levels to main level l1. Tiled levels placed
     * side-by-side and aligned based on the conf. 'alignRight' will be
     * implemented when needed.
     */
    tileLevels(l1: Level, levels: Level[], conf): void {
      const {x, y} = conf;
      let currX = x;
      let currY = y;
      if (conf.alignLeft) {
        levels.forEach(level => {
          this.mergeLevels(l1, level, currX, currY);
          currY += level.getMap().rows;
        });
      }
      else if (conf.centerX) {
        const midX = Math.round(l1.getMap().cols / 2);
        levels.forEach(level => {
          currX = midX - Math.round(level.getMap().cols / 2);
          this.mergeLevels(l1, level, currX, currY);
          currY += level.getMap().rows;
        });
      }
      else if (conf.centerY) {
        const midY = Math.round(l1.getMap().rows / 2);
        levels.forEach(level => {
          currY = midY - Math.round(level.getMap().rows / 2);
          this.mergeLevels(l1, level, currX, currY);
          currX += level.getMap().cols;
        });

      }
    },

    /* Does a full Map.Level merge from l2 to l1.
    * Actors, items and elements included. l1 will be the merged level. */
    mergeLevels(l1: Level, l2: Level, startX, startY): void {
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
            RG.err('Geometry', 'mergeLevels',
                `Num actors new: ${numActorsNew1}, exp: ${numExpActors}`);
        }
    },

    /* Merges m2 into m1 starting from x,y in m1. Does not move items/actors. */
    mergeMapBaseElems(m1, m2, startX, startY): void {
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

    mergeMaps(m1, m2, startX, startY, mergeCb = (c1, c2) => true): void {
        const endX = startX + m2.cols - 1;
        const endY = startY + m2.rows - 1;
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                if (m1.hasXY(x, y)) {
                    const cell2 = m2.getCell(x - startX, y - startY);
                    const cell1 = m1._map[x][y];
                    if (mergeCb(cell1, cell2)) {
                        cell1.setBaseElem(cell2.getBaseElem());
                    }
                }
            }
        }

    },

    /* Calls the callback cb for each x,y coord in given bbox. Checks that x,y
     * is within the bounds of given map. */
    iterateMapWithBBox(map, bbox, cb) {
        for (let x = bbox.ulx; x <= bbox.lrx; x++) {
            for (let y = bbox.uly; y <= bbox.lry; y++) {
                if (map.hasXY(x, y)) {
                    cb(x, y);
                }
            }
        }
    },

    insertEntity(l1, type, bbox, parser) {
        switch (type) {
            case RG.TYPE_ACTOR:
                this.insertActors(l1, type, bbox, parser);
                break;
            case RG.TYPE_ITEM:
                this.insertItems(l1, type, bbox, parser);
                break;
            case RG.TYPE_ELEM:
                this.insertElements(l1, type, bbox);
                break;
            default: RG.err('Geometry', 'insertEntity',
                `No type ${type} supported`);
        }
    },

    /* Inserts elements into the given level as rectangle bounded by the
     * coordinates given. */
    insertElements(l1, elemType, bbox) {
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
    insertActors(l1, actorName, bbox, parser) {
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
    insertItems(l1, itemName, bbox, parser) {
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
    getFreeArea(freeCoord, xDim, yDim, result) {
        let found = false;
        const left = freeCoord.slice();
        const lookupXY = {};
        freeCoord.forEach(xy => {
            lookupXY[xy[0] + ',' + xy[1]] = xy;
        });

        while (!found && left.length > 0) {
            const index = RNG.getUniformInt(0, left.length - 1);

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

    isLine(x0, y0, x1, y1) {
        const isLine = x0 === x1 || y0 === y1
            || Math.abs(x1 - x0) === Math.abs(y1 - y0);
        return isLine;
    },

    /* Returns all coordinates within straight line between two points. Returns
     * empty array if there is no line. Straight means all cardinal directions.
     */
    getStraightLine(x0, y0, x1, y1, incEnds = true): TCoord[] {
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

   /* Returns an array of xy-pairs belonging to Bresenham line from
    *  x1,y1 -> x2,y2
    * Original C-source:
    * https://www.cs.unm.edu/~angel/BOOK/INTERACTIVE_COMPUTER_GRAPHICS
    *   /FOURTH_EDITION/PROGRAMS/bresenham.c
    */
    getBresenham(x1, y1, x2, y2): TCoord[] {
        let [dx, dy, i, e] = [0, 0, 0, 0];
        let [incx, incy, inc1, inc2] = [0, 0, 0, 0];
        let [x, y] = [0, 0];
        const bresLine = [];

        dx = x2 - x1;
        dy = y2 - y1;

        if (dx < 0) {dx = -dx;}
        if (dy < 0) {dy = -dy;}
        incx = 1;
        if (x2 < x1) {incx = -1;}
        incy = 1;
        if (y2 < y1) {incy = -1;}
        x = x1;
        y = y1;
        bresLine.push([x, y]);

        if (dx > dy) {
            e = 2 * dy - dx;
            inc1 = 2 * (dy - dx);
            inc2 = 2 * dy;
            for (i = 0; i < dx; i++) {
                if (e >= 0) {
                    y += incy;
                    e += inc1;
                }
                else {e += inc2;}
                x += incx;
                bresLine.push([x, y]);
            }
        }
        else {
            e = 2 * dx - dy;
            inc1 = 2 * ( dx - dy);
            inc2 = 2 * dx;
            for (i = 0; i < dy; i++) {
                if (e >= 0) {
                    x += incx;
                    e += inc1;
                }
                else {e += inc2;}
                y += incy;
                bresLine.push([x, y]);
            }
        }
        return bresLine;
    },

    /* Returns a path from x0,y0 to x1,y1 which resembles "straight" line. */
    getMissilePath(x0, y0, x1, y1, incEnds = true) {
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
Geometry.floodfill = function(map, cell, type, diag = false) {
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
Geometry.floodfill2D = function(
    map: any[][], xy: TCoord, value: any, lut = false, diag = false
): TCoord[] {
    const [x, y] = xy;
    if (map[x][y] !== value) {return [];}

    let currXY = xy;
    const xyTodo = [];
    const result = [currXY];
    const colored = {}; // Needed because we're not changing anything
    colored[x + ',' + y] = true;

    /* Private func which checks if the cell should be added to floodfill. */
    const tryToAddXY = function(sx, sy): void {
        if (sx >= 0 && sx < map.length && sy >= 0 && sy < map[0].length) {
            if (!colored[sx + ',' + sy]) {
                const currValue = map[sx][sy];
                if (currValue === value) {
                    colored[sx + ',' + sy] = true;
                    result.push([sx, sy]);
                    if (lut) {lut[sx + ',' + sy] = true;}
                    xyTodo.push([sx, sy]);
                }
            }
        }
    };

    while (currXY) {
        const [xx, yy] = currXY;
        // 9. West
        const xWest = xx - 1;
        tryToAddXY(xWest, yy);

        // 10. East
        const xEast = xx + 1;
        tryToAddXY(xEast, yy);

        // 11. North
        const yNorth = yy - 1;
        tryToAddXY(xx, yNorth);

        // 12. South
        const ySouth = yy + 1;
        tryToAddXY(xx, ySouth);

        // Allow diagonals in fill if requested
        if (diag) {
            tryToAddXY(xWest, yNorth);
            tryToAddXY(xEast, yNorth);
            tryToAddXY(xWest, ySouth);
            tryToAddXY(xEast, ySouth);
        }

        currXY = xyTodo.shift();
    }
    return result;

};


Geometry.getMassCenter = function(arr: TCoord[]): TCoord {
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
Geometry.squareFill = function(map, cell, type, dXdY): Cell[] {
    const [endX, endY] = cell.getXY();
    const [dX, dY] = dXdY;
    if (dX === 0 || dY === 0) {
        RG.err('Geometry', 'squareFill',
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

Geometry.histArrayVals = function(array) {
    const hist = {};
    array.forEach(value => {
        if (hist[value]) {hist[value] += 1;}
        else {hist[value] = 1;}
    });
    return hist;
};

/* Checks that all given args are ints. */
function verifyInt(arr) {
    arr.forEach(val => {
        if (!Number.isInteger(val)) {
            const json = JSON.stringify(arr);
            RG.err('Geometry', 'verifyInt',
                'Value not an Int. Arr: ' + json);
        }
    });
}

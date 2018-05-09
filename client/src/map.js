
const ROT = require('../../lib/rot.js');
const RG = require('./rg.js');
RG.Element = require('./element.js');

RG.Map = {};
RG.Map.Cell = require('./map.cell');

/* Map cell list object which contains a number of cells. A map is used for
 * rendering
 * while the level contains actual information about game elements such as
 * monsters and items.  */
RG.Map.CellList = function(cols, rows, baseElem = RG.ELEM.FLOOR) { // {{{2
    this._map = [];
    this.cols = cols;
    this.rows = rows;

    if (typeof this.cols !== 'number' || typeof this.rows !== 'number') {
        RG.err('Map.CellList', 'constructor',
            'Map.CellList(rows, cols) expects 2 integers.');
    }

    this._map = new Array(this.cols);
    // Initialize cells with floor
    for (let x = 0; x < this.cols; x++) {
        // this._map.push([]);
        this._map[x] = new Array(this.rows);
        for (let y = 0; y < this.rows; y++) {
            this._map[x][y] = new RG.Map.Cell(x, y, baseElem);
        }
    }

    this.fov = new ROT.FOV.RecursiveShadowcasting(
        this.lightPasses.bind(this));
};

/* Returns true if x,y are in the this._map.*/
RG.Map.CellList.prototype.hasXY = function(x, y) {
    return (x >= 0) && (x < this.cols) && (y >= 0) && (y < this.rows);
};

/* Sets a property for the underlying cell.*/
RG.Map.CellList.prototype.setProp = function(x, y, prop, obj) {
    this._map[x][y].setProp(prop, obj);
};

RG.Map.CellList.prototype.removeProp = function(x, y, prop, obj) {
    return this._map[x][y].removeProp(prop, obj);
};

RG.Map.CellList.prototype.moveProp = function(fromXY, toXY, prop, obj) {
    if (this.removeProp(fromXY[0], fromXY[1], prop, obj)) {
        this.setProp(toXY[0], toXY[1], prop, obj);
        return true;
    }
    return false;
};

RG.Map.CellList.prototype.setElemXY = function(x, y, obj) {
    this.setProp(x, y, RG.TYPE_ELEM, obj);
};

RG.Map.CellList.prototype.setBaseElemXY = function(x, y, elem) {
    this._map[x][y].setBaseElem(elem);
};

RG.Map.CellList.prototype.getBaseElemXY = function(x, y) {
    return this._map[x][y].getBaseElem();
};

RG.Map.CellList.prototype.getCell = function(x, y) {
    return this._map[x][y];
};

RG.Map.CellList.prototype.isExplored = function(x, y) {
    return this._map[x][y].isExplored();
};

RG.Map.CellList.prototype.getBaseElemRow = function(y) {
    const row = [];
    for (let i = 0; i < this.cols; ++i) {
        row.push(this._map[i][y].getBaseElem());
    }
    return row;
};

RG.Map.CellList.prototype.getCellRow = function(y) {
    const row = [];
    for (let i = 0; i < this.cols; ++i) {
        row.push(this._map[i][y]);
    }
    return row;
};

/* Returns all free cells in the this._map. 'free' means that cell can be
* traversed and is passable. */
RG.Map.CellList.prototype.getFree = function() {
    const freeCells = [];
    for (let x = 0; x < this.cols; x++) {
        for (let y = 0; y < this.rows; y++) {
            if (this._map[x][y].isFree()) {
                freeCells.push(this._map[x][y]);
            }
        }
    }
    return freeCells;
};

RG.Map.CellList.prototype.getFreeNotOnEdge = function() {
    const freeCells = this.getFree();
    return freeCells.filter(c => (
        c._x > 0 && c._x < (this.cols - 1) &&
        c._y > 0 && c._y < (this.rows - 1)
    ));
};

/* Returns the first free cell starting from right edge of the level.
* Range of y-coord can be given, if not, searches all y-coordinates starting
* from 0.
*/
RG.Map.CellList.prototype.getFirstFreeFromRight = function(
    y0 = 0, y1 = this.rows - 1
) {
    for (let x = this.cols - 1; x >= 0; x--) {
        for (let y = y0; y <= y1; y++) {
            if (this._map[x][y].isFree()) {
                return this._map[x][y];
            }
        }
    }
    return null;
};

/* Returns all free cells in the given bounding box. */
RG.Map.CellList.prototype.getFreeInBbox = function(bbox) {
    const freeCells = [];
    for (let x = bbox.ulx; x <= bbox.lrx; x++) {
        for (let y = bbox.uly; y < bbox.lry; y++) {
            if (this._map[x][y].isFree()) {
                freeCells.push(this._map[x][y]);
            }
        }
    }
    return freeCells;
};

/* Returns all empty cells. Cell is empty, if it has only the base
 * element, but no props. */
RG.Map.CellList.prototype.getEmptyCells = function() {
    const emptyCells = [];
    for (let x = 0; x < this.cols; x++) {
        for (let y = 0; y < this.rows; y++) {
            if (!this._map[x][y].hasProps()) {
                emptyCells.push(this._map[x][y]);
            }
        }
    }
    return emptyCells;
};

/* Returns true if the this._map has a cell in given x,y location.*/
RG.Map.CellList.prototype._hasXY = function(x, y) {
    return (x >= 0) && (x < this.cols) && (y >= 0) && (y < this.rows);
};

/* Returns true if light passes through this cell.*/
RG.Map.CellList.prototype.lightPasses = function(x, y) {
    if (this._hasXY(x, y)) {
        return this._map[x][y].lightPasses(); // delegate to cell
    }
    return false;
};

RG.Map.CellList.prototype.hasObstacle = function(x, y) {
    if (this._hasXY(x, y)) {
        return this._map[x][y].hasObstacle();
    }
    return false;
};

RG.Map.CellList.prototype.isPassable = function(x, y) {
    if (this._hasXY(x, y)) {
        return this._map[x][y].isPassable();
    }
    return false;
};

RG.Map.CellList.prototype.isPassableByAir = function(x, y) {
    if (this._hasXY(x, y)) {
        return this._map[x][y].isPassableByAir();
    }
    return false;
};

/* Returns visible cells for given actor.*/
RG.Map.CellList.prototype.getVisibleCells = function(actor) {
    const cells = [];
    const [xA, yA] = actor.getXY();
    if (actor.isLocated()) {
        if (actor.getLevel().getMap() === this) {
            const range = actor.getFOVRange();
            this.fov.compute(xA, yA, range, (x, y, r, visibility) => {
                if (visibility) {
                    if (this._hasXY(x, y)) {
                        cells.push(this._map[x][y]);
                    }
                }
            });
        }
    }
    return cells;
};

/* Returns all cells explored by the player.*/
RG.Map.CellList.prototype.getExploredCells = function() {
    const cells = [];
    for (let x = 0; x < this.cols; x++) {
        for (let y = 0; y < this.rows; y++) {
            if (this._map[x][y].isExplored()) {
                cells.push(this._map[x][y]);
            }
        }
    }
};

/* Returns true if x,y is located at this._map border cells.*/
RG.Map.CellList.prototype.isBorderXY = function(x, y) {
    if (x === 0) {return true;}
    if (y === 0) {return true;}
    if (x === this.cols - 1) {return true;}
    if (y === this.rows - 1) {return true;}
    return false;
};

/* Prints the this._map in ASCII. */
RG.Map.CellList.prototype.debugPrintInASCII = function() {
    let mapInASCII = '';
    for (let y = 0; y < this.rows; y++) {
        let row = '';
        for (let x = 0; x < this.cols; x++) {
            const cell = this._map[x][y];
            const baseType = cell.getBaseElem().getType();
            if (cell.hasActors()) {
                if (cell.getFirstActor().isPlayer()) {
                    row += '@';
                }
                else {
                    row += 'A';
                }
            }
            else if (cell.hasItems()) {row += 'I';}
            else if (cell.getStairs() !== null) {row += '>';}
            else if (cell.hasConnection()) {row += 'c';}
            else if (cell.hasElements()) {
                const elem = cell.getElements()[0];
                if (elem.getType() === 'marker') {
                    row += elem.char;
                }
                else if (elem.getType() === 'door') {
                    row += '+';
                }
                else {
                    row += 'E';
                }
            }
            else if ((/floor/).test(baseType)) {row += '.';}
            else if ((/water|chasm|lava/).test(baseType)) {row += '~';}
            else if ((/wall/).test(baseType)) {row += '#';}
            else if ((/tree/).test(baseType)) {row += 'T';}
            else if ((/grass/).test(baseType)) {row += '"';}
            else if ((/highrock/).test(baseType)) {row += '^';}
            else if ((/road/).test(baseType)) {row += 'R';}
            else {row += '?';}
        }
        mapInASCII += row + '\n';
    }
    RG.diag(mapInASCII);
};

/* Queries a row of cells. _optimizeForRowAccess must be called before this
 * function is used. */
RG.Map.CellList.prototype.getCellRowFast = function(y) {
    if (!this._isRowOptimized) {this._optimizeForRowAccess();}
    return this._rowMap[y];
};

/* Slow find for debugging. Tries to find all objects matching the
 * filterFunc. */
RG.Map.CellList.prototype.findObj = function(filterFunc) {
    let result = [];
    for (let x = 0; x < this.cols; x++) {
        for (let y = 0; y < this.rows; y++) {
            result = result.concat(this._map[x][y].findObj(filterFunc));
        }
    }
    return result;
};

/* Get cells that return true for the given filter function. For example:
 *   cell => cell.hasActors()
 * OR
 *   cell => cell.getBaseElem().getType() === 'floor'
 */
RG.Map.CellList.prototype.getCells = function(filter = () => true) {
    const result = [];
    for (let x = 0; x < this.cols; x++) {
        for (let y = 0; y < this.rows; y++) {
            if (filter(this._map[x][y])) {
                result.push(this._map[x][y]);
            }
        }
    }
    return result;
};

RG.Map.CellList.prototype.getCellsWithCoord = function(coord) {
    const result = [];
    coord.forEach(xy => {
        if (this._hasXY(xy[0], xy[1])) {
            result.push(this._map[xy[0]][xy[1]]);
        }
    });
    return result;
};

RG.Map.CellList.prototype.setBaseElems = function(coord, elem) {
    coord.forEach(xy => {
        this._map[xy[0]][xy[1]].setBaseElem(elem);
    });
};

RG.Map.CellList.prototype.has = function(xy, query) {
    const [x, y] = xy;
    if (this._hasXY(x, y)) {
        const cell = this.getCell(x, y);
        if (typeof query === 'string') {
            const baseElem = cell.getBaseElem();
            if (baseElem.getType() === query) {return true;}
        }
    }
    return false;
};

RG.Map.CellList.invertMap = map => {
    for (let x = 0; x < map.cols; x++) {
        for (let y = 0; y < map.rows; y++) {
            const type = map._map[x][y].getBaseElem().getType();
            if (type === 'wall') {
                map._map[x][y].setBaseElem(RG.ELEM.FLOOR);
            }
            else if (type === 'floor') {
                map._map[x][y].setBaseElem(RG.ELEM.WALL);
            }
        }
    }
};

/* Creates another internal representation of the map. This can be used for fast
 * row access. */
RG.Map.CellList.prototype._optimizeForRowAccess = function() {
    this._rowMap = [];
    for (let y = 0; y < this.rows; y++) {
        this._rowMap[y] = [];
        for (let x = 0; x < this.cols; x++) {
            this._rowMap[y][x] = this._map[x][y];
        }
    }
    this._isRowOptimized = true;
};

RG.Map.CellList.prototype.toJSON = function() {
    const map = new Array(this.cols);
    const elements = {};
    const explored = [];
    for (let x = 0; x < this.cols; x++) {
        map[x] = new Array(this.rows);
        for (let y = 0; y < this.rows; y++) {
            const json = this.getCell(x, y).toJSON();
            map[x][y] = json.t;
            if (json.ex) {explored.push([x, y]);}
            if (json.elements) {
                elements[x + ',' + y] = elements;
            }
        }
    }
    return {
        cols: this.cols,
        rows: this.rows,
        cells: map,
        explored,
        elements
    };
};

module.exports = RG.Map;


import ROT from '../../lib/rot';
import RG from './rg';
import {Cell} from './map.cell';
import {ElementMarker} from './element';

/* Map cell list object which contains a number of cells. Map.CellList is used
 * for rendering while the Map.Level contains high-level information about
 * game objects such as actors, items and elements (stairs/traps). */
export class CellMap {

    public static invertMap(map: CellMap) {
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
    }

    public _map: Cell[][];
    public cols: number;
    public rows: number;
    public fov: any;

    private _isRowOptimized: boolean;
    private _rowMap: Cell[][];

    constructor(cols, rows, baseElem = RG.ELEM.FLOOR) {
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
                this._map[x][y] = new Cell(x, y, baseElem);
            }
        }

        this.fov = new ROT.FOV.RecursiveShadowcasting(
            this.lightPasses.bind(this));

        this.passableCallback = this.passableCallback.bind(this);
        this.passableCallbackFlying = this.passableCallbackFlying.bind(this);
    }

    /* Returns true if x,y are in the this._map.*/
    hasXY(x, y) {
        return (x >= 0) && (x < this.cols) && (y >= 0) && (y < this.rows);
    }

    /* Sets a property for the underlying cell.*/
    setProp(x, y, prop, obj) {
        this._map[x][y].setProp(prop, obj);
    }

    removeProp(x, y, prop, obj) {
        return this._map[x][y].removeProp(prop, obj);
    }

    moveProp(fromXY, toXY, prop, obj) {
        if (this.removeProp(fromXY[0], fromXY[1], prop, obj)) {
            this.setProp(toXY[0], toXY[1], prop, obj);
            return true;
        }
        return false;
    }

    setElemXY(x, y, obj) {
        this.setProp(x, y, RG.TYPE_ELEM, obj);
    }

    setBaseElemXY(x, y, elem) {
        this._map[x][y].setBaseElem(elem);
    }

    getBaseElemXY(x, y) {
        return this._map[x][y].getBaseElem();
    }

    getCell(x, y) {
        return this._map[x][y];
    }

    isExplored(x, y) {
        return this._map[x][y].isExplored();
    }

    getBaseElemRow(y) {
        const row = [];
        for (let i = 0; i < this.cols; ++i) {
            row.push(this._map[i][y].getBaseElem());
        }
        return row;
    }

    getCellRow(y) {
        const row = [];
        for (let i = 0; i < this.cols; ++i) {
            row.push(this._map[i][y]);
        }
        return row;
    }

    /* Returns all free cells in the this._map. 'free' means that cell can be
    * traversed and is passable. */
    getFree() {
        const freeCells = [];
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                if (this._map[x][y].isFree()) {
                    freeCells.push(this._map[x][y]);
                }
            }
        }
        return freeCells;
    }

    getFreeNotOnEdge() {
        const freeCells = this.getFree();
        return freeCells.filter(c => (
            c._x > 0 && c._x < (this.cols - 1) &&
            c._y > 0 && c._y < (this.rows - 1)
        ));
    }

    /* Returns the first free cell starting from right edge of the level.
    * Range of y-coord can be given, if not, searches all y-coordinates starting
    * from 0.
    */
    getFirstFreeFromRight(y0 = 0, y1 = this.rows - 1) {
        for (let x = this.cols - 1; x >= 0; x--) {
            for (let y = y0; y <= y1; y++) {
                if (this._map[x][y].isFree()) {
                    return this._map[x][y];
                }
            }
        }
        return null;
    }

    /* Returns all free cells in the given bounding box. */
    getFreeInBbox(bbox) {
        const freeCells = [];
        for (let x = bbox.ulx; x <= bbox.lrx; x++) {
            for (let y = bbox.uly; y < bbox.lry; y++) {
                if (this._map[x][y].isFree()) {
                    freeCells.push(this._map[x][y]);
                }
            }
        }
        return freeCells;
    }

    /* Returns all empty cells. Cell is empty, if it has only the base
     * element, but no props. */
    getEmptyCells() {
        const emptyCells = [];
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                if (!this._map[x][y].hasProps()) {
                    emptyCells.push(this._map[x][y]);
                }
            }
        }
        return emptyCells;
    }

    /* Returns true if light passes through this cell.*/
    lightPasses(x, y) {
        if (this.hasXY(x, y)) {
            return this._map[x][y].lightPasses(); // delegate to cell
        }
        return false;
    }

    hasObstacle(x, y) {
        if (this.hasXY(x, y)) {
            return this._map[x][y].hasObstacle();
        }
        return false;
    }

    isPassable(x, y) {
        if (this.hasXY(x, y)) {
            return this._map[x][y].isPassable();
        }
        return false;
    }

    isPassableByAir(x, y) {
        if (this.hasXY(x, y)) {
            return this._map[x][y].isPassableByAir();
        }
        return false;
    }

    /* Returns visible cells for given actor.*/
    getVisibleCells(actor) {
        const cells = [];
        const [xA, yA] = actor.getXY();
        const range = actor.getFOVRange();

        if (actor.isLocated()) {
            if (actor.getLevel().getMap() === this) {

                this.fov.compute(xA, yA, range, (x, y, r, visibility) => {
                    if (visibility) {
                        if (this.hasXY(x, y)) {
                            cells.push(this._map[x][y]);
                        }
                    }
                });
            }
        }
        return cells;
    }

    /* Returns all cells explored by the player.*/
    getExploredCells() {
        const cells = [];
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                if (this._map[x][y].isExplored()) {
                    cells.push(this._map[x][y]);
                }
            }
        }
        return cells;
    }

    exploreAll(isExplored = true) {
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                this._map[x][y]._explored = isExplored;
            }
        }
    }

    /* Returns true if x,y is located at this._map border cells.*/
    isBorderXY(x, y) {
        if (x === 0) {return true;}
        if (y === 0) {return true;}
        if (x === this.cols - 1) {return true;}
        if (y === this.rows - 1) {return true;}
        return false;
    }

    /* Prints the this._map in ASCII. */
    debugPrintInASCII() {
        let mapInASCII = '';
        for (let y = 0; y < this.rows; y++) {
            let row = '';
            for (let x = 0; x < this.cols; x++) {
                const cell = this._map[x][y];
                const baseElem = cell.getBaseElem();
                if (!baseElem) {
                    row += 'X';
                    continue;
                }
                const baseType = baseElem.getType();
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
                        const markerElem: unknown = elem;
                        row += (markerElem as ElementMarker).char;
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
                else if ((/arctic/).test(baseType)) {row += '.';}
                else {row += '?';}
            }
            mapInASCII += row + '\n';
        }
        RG.diag(mapInASCII);
    }

    /* Queries a row of cells. _optimizeForRowAccess must be called before this
     * function is used. */
    getCellRowFast(y) {
        if (!this._isRowOptimized) {this._optimizeForRowAccess();}
        return this._rowMap[y];
    }

    /* Slow find for debugging. Tries to find all objects matching the
     * filterFunc. */
    findObj(filterFunc) {
        let result = [];
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                result = result.concat(this._map[x][y].findObj(filterFunc));
            }
        }
        return result;
    }

    /* Get cells that return true for the given filter function. For example:
     *   cell => cell.hasActors()
     * OR
     *   cell => cell.getBaseElem().getType() === 'floor'
     */
    getCells(filter = (cell: Cell) => true) {
        const result = [];
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                if (filter(this._map[x][y])) {
                    result.push(this._map[x][y]);
                }
            }
        }
        return result;
    }

    getCellsWithCoord(coord) {
        const result = [];
        coord.forEach(xy => {
            if (this.hasXY(xy[0], xy[1])) {
                result.push(this._map[xy[0]][xy[1]]);
            }
        });
        return result;
    }

    setBaseElems(coord, elem) {
        coord.forEach(xy => {
            this._map[xy[0]][xy[1]].setBaseElem(elem);
        });
    }

    has(xy, query) {
        const [x, y] = xy;
        if (this.hasXY(x, y)) {
            const cell = this.getCell(x, y);
            if (typeof query === 'string') {
                const baseElem = cell.getBaseElem();
                if (baseElem.getType() === query) {return true;}
            }
        }
        return false;
    }

    /* Creates another internal representation of the map. This can be used for fast
     * row access. */
    _optimizeForRowAccess() {
        this._rowMap = [];
        for (let y = 0; y < this.rows; y++) {
            this._rowMap[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this._rowMap[y][x] = this._map[x][y];
            }
        }
        this._isRowOptimized = true;
    }

    toJSON() {
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
    }

    getShortestPathTo(actor, toX, toY) {
        const [sX, sY] = actor.getXY();
        let passCb = this.passableCallback.bind(null, sX, sY);
        if (actor.has('Flying')) {
            passCb = this.passableCallbackFlying.bind(null, sX, sY);
        }
        const pathFinder = new ROT.Path.AStar(toX, toY, passCb);

        const path = [];
        pathFinder.compute(sX, sY, (x, y) => {
            if (this.hasXY(x, y)) {
                path.push(this._map[x][y]);
            }
        });
        return path;
    }

    passableCallback(sX, sY, x, y) {
        let res = this.isPassable(x, y);
        if (!res) {
            res = (x === sX) && (y === sY);
        }
        return res;
    }

    passableCallbackFlying(sX, sY, x, y) {
        let res = this.isPassableByAir(x, y);
        if (!res) {
            res = (x === sX) && (y === sY);
        }
        return res;

    }
}


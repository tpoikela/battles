
import * as ROT from '../../lib/rot-js';
import RG from './rg';
import {Cell, CellJSON} from './map.cell';
import {ElementBase, ElementWall, ElementMarker, ElementXY} from './element';
import {TCoord, ConstBaseElem, TCellProp, TPropType} from './interfaces';
import {BBox} from './bbox';
import {ELEM_MAP} from '../data/elem-constants';

const FLOOR = new ElementBase('floor');
const WALL = new ElementWall('wall');

type SentientActor = import('./actor').SentientActor;
type YAndIndex = [number, number];

export interface CellMapJSON {
    cols: number;
    rows: number;
    cells: CellJSON[];
    explored: TCoord[];
    elements: any[];

    encoded?: boolean;
    cellsXY?: {[key: string]: YAndIndex[]};
    defaultType: string;
}

/* Map cell list object which contains a number of cells. Map.CellList is used
 * for rendering while the Map.Level contains high-level information about
 * game objects such as actors, items and elements (stairs/traps). */
export class CellMap {
    public static fromJSON: (json: {[key: string]: any}) => null | CellMap;

    public static invertMap(map: CellMap): void {
        for (let x = 0; x < map.cols; x++) {
            for (let y = 0; y < map.rows; y++) {
                const type = map._map[x][y].getBaseElem().getType();
                if (type === 'wall') {
                    map._map[x][y].setBaseElem(FLOOR);
                }
                else if (type === 'floor') {
                    map._map[x][y].setBaseElem(WALL);
                }
            }
        }
    }

    public static createWithoutCells(cols: number, rows: number): CellMap {
        const map = new CellMap(0, 0);
        map._map = new Array(cols);
        for (let x = 0; x < cols; x++) {
            map._map[x] = new Array(rows);
        }
        map.cols = cols;
        map.rows = rows;
        return map;
    }

    public static multiplyMap(map: CellMap, multX: number, multY: number): CellMap {
        const newMap = new CellMap(multX * map.cols, multY * map.rows);
        for (let x = 0; x < newMap.cols; x++) {
            for (let y = 0; y < newMap.rows; y++) {
                const oldX = Math.floor(x / multX);
                const oldY = Math.floor(y / multY);
                newMap.setBaseElemXY(x, y, map.getBaseElemXY(oldX, oldY));
            }
        }
        return newMap;
    }

    public _map: Cell[][];
    public cols: number;
    public rows: number;
    public fov: any;

    private _isRowOptimized: boolean;
    private _rowMap: Cell[][];

    constructor(cols: number, rows: number, baseElem: Readonly<ElementBase> = FLOOR) {
        this._map = [];
        this.cols = cols;
        this.rows = rows;

        this._isRowOptimized = false;

        if (typeof this.cols !== 'number' || typeof this.rows !== 'number') {
            RG.err('Map.CellList', 'constructor',
                'Map.CellList(rows, cols) expects 2 integers.');
        }

        this._map = new Array(this.cols);
        for (let x = 0; x < this.cols; x++) {
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
    public hasXY(x: number, y: number): boolean {
        return (x >= 0) && (x < this.cols) && (y >= 0) && (y < this.rows);
    }

    /* Sets a property for the underlying cell.*/
    public setProp(x: number, y: number, prop: TPropType, obj: TCellProp): void {
        this._map[x][y].setProp(prop, obj);
    }

    public removeProp(x: number, y: number, prop: TPropType, obj: TCellProp): boolean {
        return this._map[x][y].removeProp(prop, obj);
    }

    public moveProp(fromXY: TCoord, toXY: TCoord, prop: TPropType, obj: TCellProp): boolean {
        if (this.removeProp(fromXY[0], fromXY[1], prop, obj)) {
            this.setProp(toXY[0], toXY[1], prop, obj);
            return true;
        }
        return false;
    }

    public setElemXY(x: number, y: number, obj: ElementXY): void {
        this.setProp(x, y, RG.TYPE_ELEM, obj);
    }

    public setBaseElemXY(x: number, y: number, elem: ConstBaseElem) {
        this._map[x][y].setBaseElem(elem);
    }

    public getBaseElemXY(x: number, y: number): ConstBaseElem {
        return this._map[x][y].getBaseElem();
    }

    public getCell(x: number, y: number): Cell {
        return this._map[x][y];
    }

    public isExplored(x: number, y: number): boolean {
        return this._map[x][y].isExplored();
    }

    public getBaseElemRow(y: number): ConstBaseElem[] {
        const row = [];
        for (let i = 0; i < this.cols; ++i) {
            row.push(this._map[i][y].getBaseElem());
        }
        return row;
    }

    public getCellRow(y: number): Cell[] {
        const row = [];
        for (let i = 0; i < this.cols; ++i) {
            row.push(this._map[i][y]);
        }
        return row;
    }

    /* Returns all free cells in the this._map. 'free' means that cell can be
    * traversed and is passable. */
    public getFree(): Cell[] {
        const freeCells = [] as Cell[];
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                if (this._map[x][y].isFree()) {
                    freeCells.push(this._map[x][y]);
                }
            }
        }
        return freeCells;
    }

    public getFreeNotOnEdge(): Cell[] {
        const freeCells: Cell[] = this.getFree();
        return freeCells.filter((c: Cell) => (
            c.getX() > 0 && c.getX() < (this.cols - 1) &&
            c.getY() > 0 && c.getY() < (this.rows - 1)
        ));
    }

    /* Returns the first free cell starting from right edge of the level.
    * Range of y-coord can be given, if not, searches all y-coordinates starting
    * from 0.
    */
    public getFirstFreeFromRight(y0 = 0, y1 = this.rows - 1): Cell | null {
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
    public getFreeInBbox(bbox: BBox): Cell[] {
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
    public getEmptyCells(): Cell[] {
        const emptyCells: Cell[] = [];
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
    public lightPasses(x: number, y: number): boolean {
        if (this.hasXY(x, y)) {
            return this._map[x][y].lightPasses(); // delegate to cell
        }
        return false;
    }

    public hasObstacle(x: number, y: number): boolean {
        if (this.hasXY(x, y)) {
            return this._map[x][y].hasObstacle();
        }
        return false;
    }

    public isPassable(x: number, y: number, cx: number, cy: number): boolean {
        if (this.hasXY(x, y)) {
            if (this._map[x][y].isPassable()) {
                if (typeof cx !== 'undefined' && typeof cy !== 'undefined') {
                    if (this.hasXY(cx, cy)) {
                        return this.getElemDzAbs(x, y, cx, cy) <= 1;
                    }
                    return true;
                }
            }
        }
        return false;
    }

    public getElemDzAbs(x: number, y: number, cx: number, cy: number): number {
        const z0 = this._map[x][y].getBaseElem().getZ();
        const z1 = this._map[cx][cy].getBaseElem().getZ();
        return Math.abs(z0 - z1);
    }

    public isPassableByAir(x: number, y: number): boolean {
        if (this.hasXY(x, y)) {
            return this._map[x][y].isPassableByAir();
        }
        return false;
    }

    /* Returns visible cells for given actor.*/
    public getCellsInFOV(actor: SentientActor): Cell[] {
        const cells: Cell[] = [];
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

    public getCellsInFOVPlus(actor: SentientActor, addRange: number): [Cell[], Cell[]] {
        const cells: Cell[] = [];
        const cellsPlus: Cell[] = [];
        const [xA, yA] = actor.getXY();
        const fovRange = actor.getFOVRange();
        const range = fovRange + addRange;

        if (actor.isLocated()) {
            if (actor.getLevel().getMap() === this) {

                this.fov.compute(xA, yA, range, (x, y, r, visibility) => {
                    if (visibility) {
                        if (this.hasXY(x, y)) {
                            if (r <= fovRange) {
                                cells.push(this._map[x][y]);
                            }
                            else {
                                cellsPlus.push(this._map[x][y]);
                            }
                        }
                    }
                });
            }
        }
        return [cells, cellsPlus];
    }

    /* Returns all cells explored by the player.*/
    public getExploredCells(): Cell[] {
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

    public exploreAll(): void {
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                this._map[x][y].setExplored();
            }
        }
    }

    /* Returns true if x,y is located at this._map border cells.*/
    public isBorderXY(x: number, y: number): boolean {
        if (x === 0) {return true;}
        if (y === 0) {return true;}
        if (x === this.cols - 1) {return true;}
        if (y === this.rows - 1) {return true;}
        return false;
    }

    /* Prints the this._map in ASCII. */
    public debugPrintInASCII(): void {
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
                else if ((/stone/).test(baseType)) {row += '^';}
                else if ((/road/).test(baseType)) {row += 'R';}
                else if ((/arctic/).test(baseType)) {row += '.';}
                else if (cell.isFree()) {row += '.';}
                else {row += '?';}
            }
            mapInASCII += row + '\n';
        }
        RG.diag(mapInASCII);
    }

    /* Queries a row of cells. _optimizeForRowAccess must be called before this
     * function is used. */
    public getCellRowFast(y: number): Cell[] {
        if (!this._isRowOptimized) {this._optimizeForRowAccess();}
        return this._rowMap[y];
    }

    /* Slow find for debugging. Tries to find all objects matching the
     * filterFunc. */
    public findObj(filterFunc: (obj: any) => boolean): any[] {
        let result: any[] = [];
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
    public getCells(filter = (cell: Cell) => true): Cell[] {
        const result: Cell[] = [];
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                if (filter(this._map[x][y])) {
                    result.push(this._map[x][y]);
                }
            }
        }
        return result;
    }

    public getCellsWithCoord(coord: TCoord[]): Cell[] {
        const result: Cell[] = [];
        coord.forEach(xy => {
            if (this.hasXY(xy[0], xy[1])) {
                result.push(this._map[xy[0]][xy[1]]);
            }
        });
        return result;
    }

    public setBaseElems(coord: TCoord[], elem: ConstBaseElem): void {
        coord.forEach(xy => {
            this._map[xy[0]][xy[1]].setBaseElem(elem);
        });
    }

    public has(xy: TCoord, query: string): boolean {
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
    public _optimizeForRowAccess(): void {
        this._rowMap = [];
        for (let y = 0; y < this.rows; y++) {
            this._rowMap[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this._rowMap[y][x] = this._map[x][y];
            }
        }
        this._isRowOptimized = true;
    }

    public toJSON() {
        const map = new Array(this.cols);
        const elements = {};
        const explored = [];
        const baseTypes = {};

        for (let x = 0; x < this.cols; x++) {
            map[x] = new Array(this.rows);
            for (let y = 0; y < this.rows; y++) {
                const json = this.getCell(x, y).toJSON();
                map[x][y] = json.t;
                baseTypes[json.t] = 0;
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
            elements,
            baseTypes
        };
    }

    /* Does special encoding to reduce the size of the map. */
    public toJSONEncoded(): any {
        const json: any = this.toJSON();
        const {cells, baseTypes} = json;
        const typeHist = {};
        const newCells = [];

        // Create histogram of the cells
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                baseTypes[cells[x][y]] += 1;
            }
        }

        let defaultType = -1;
        let highestCount = 0;
        Object.keys(baseTypes).forEach(type => {
            if (baseTypes[type] > highestCount) {
                highestCount = baseTypes[type];
                defaultType = parseInt(type, 10);
            }
        });

        const cellsXY = {};
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                if (cells[x][y] !== defaultType) {
                    if (!cellsXY[x]) {cellsXY[x] = [];}
                    cellsXY[x].push([y,cells[x][y]]);
                }
            }
        }

        delete json.cells;
        json.defaultType = defaultType;
        json.cellsXY = cellsXY;
        json.encoded = true;
        return json;
    }


    public getShortestPathTo(actor, toX: number, toY: number): Cell[] {
        const [sX, sY] = actor.getXY();
        let passCb = this.passableCallback.bind(null, sX, sY);
        if (actor.has('Flying')) {
            passCb = this.passableCallbackFlying.bind(null, sX, sY);
        }
        const pathFinder = new ROT.Path.AStar(toX, toY, passCb);
        const path: Cell[] = [];
        pathFinder.compute(sX, sY, (x, y) => {
            if (this.hasXY(x, y)) {
                path.push(this._map[x][y]);
            }
        });
        return path;
    }

    public getShortestPathCached(actor, toX, toY): Cell[] {
        // TODO
        return [];
    }

    public passableCallback(sX, sY, x, y, cx, cy): boolean {
        let res = this.isPassable(x, y, cx, cy);
        if (!res) {
            res = (x === sX) && (y === sY);
        }
        return res;
    }

    public passableCallbackFlying(sX, sY, x, y): boolean {
        let res = this.isPassableByAir(x, y);
        if (!res) {
            res = (x === sX) && (y === sY);
        }
        return res;

    }

    public moveCellUnsafe(x: number, y: number, cell: Cell): void {
        cell.setXY([x, y]);
        this._map[x][y] = cell;
    }
}

CellMap.fromJSON = function(json: {[key: string]: any}): null | CellMap {
    if (json.encoded) {
        const {defaultType} = json;
        const elemObj = ELEM_MAP.elemIndexToElemObj[defaultType];
        const map = new CellMap(json.cols, json.rows, elemObj);

        Object.keys(json.cellsXY).forEach(x => {
            const xCol = json.cellsXY[x];
            const xNum = parseInt(x, 10);
            xCol.forEach(yAndIndex => {
                const elem = ELEM_MAP.elemIndexToElemObj[yAndIndex[1]];
                map.setBaseElemXY(xNum, yAndIndex[0], elem);
            });
        });

        json.explored.forEach(xy => {
            const [x, y] = xy;
            map._map[x][y].setExplored();
        });
        return map;
    }
    return null;
};

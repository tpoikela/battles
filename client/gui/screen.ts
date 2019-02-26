
import RG from '../src/rg';
import {Viewport} from './viewport';

type Cell = import('../src/map.cell').Cell;
type CellMap = import('../src/map').CellMap;

interface Styles {
    [key: string]: string;
}

export const ALL_VISIBLE = 'ALL';

// TODO: Refactor out of this file
/* Builds and returns two arrays. First contains all CSS classNames of
 * cells to be rendered, and the second one all characters to be rendered.*/
const getClassesAndChars = function(seen: Cell[] | string, cells: Cell[], selCell) {
    const cssClasses = [];
    const asciiChars = [];

    let selX = -1;
    let selY = -1;

    if (selCell !== null) {
        selX = selCell.getX();
        selY = selCell.getY();
    }

    // TODO: Prevents a bug, if player wants to see inventory right after
    // Load. Should render the visible cells properly though.
    if (!seen) {
        cssClasses.fill('cell-not-seen', 0, cells.length - 1);
        asciiChars.fill('X', 0, cells.length - 1);
        return [cssClasses, asciiChars];
    }

    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];

        let visibleToPlayer = false;
        if (seen === ALL_VISIBLE) {
            visibleToPlayer = true;
        }
        else {
            const cellIndex = (seen as Cell[]).indexOf(cell);
            visibleToPlayer = cellIndex < 0 ? false : true;
        }

        let cellClass = RG.getCssClassForCell(cell, visibleToPlayer);
        const cellChar = RG.getCharForCell(cell, visibleToPlayer);

        if (selX === cell.getX() && selY === cell.getY()) {
            cellClass = 'cell-target-selected';
        }

        if (!visibleToPlayer) {
            if (cell.isExplored()) {cellClass += ' cell-not-seen';}
        }
        cssClasses.push(cellClass);
        asciiChars.push(cellChar);
    }

    return [cssClasses, asciiChars];
};

const getClassesAndCharsWithRLE = function(
    seen: Cell[] | string,
    cells: Cell[],
    selCell,
    anim?,
    styles: Styles = {},
    funcClassSrc?,
    funcCharSrc?
): [string[], string[]] {
    let prevChar = null;
    let prevClass = null;
    let charRL = 0;
    let classRL = 0;

    const cssClasses = [];
    const asciiChars = [];

    funcClassSrc = funcClassSrc || RG.getCssClassForCell.bind(RG);
    funcCharSrc = funcCharSrc || RG.getCharForCell.bind(RG);

    let selMap: Map<string, Cell> = null;
    if (selCell) {
        selMap = new Map();
        if (Array.isArray(selCell)) {
            selCell.forEach(cell => {
                selMap.set(cell.getX() + ',' + cell.getY(), cell);
            });
        }
        else {
            selMap.set(selCell.getX() + ',' + selCell.getY(), selCell);
        }
    }

    // TODO: Prevents a bug, if player wants to see inventory right after
    // Load. Should render the visible cells properly though.
    if (!seen) {
        cssClasses.fill('cell-not-seen', 0, cells.length - 1);
        asciiChars.fill('X', 0, cells.length - 1);
        return [cssClasses, asciiChars];
    }

    let cellClass = '';
    let cellChar = '';

    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const cellX = cell.getX();
        const cellY = cell.getY();

        let visibleToPlayer = false;
        if (seen === ALL_VISIBLE) {
            visibleToPlayer = true;
        }
        else {
            const cellIndex = (seen as Cell[]).indexOf(cell);
            visibleToPlayer = cellIndex < 0 ? false : true;
        }

        // cellClass = RG.getCssClassForCell(cell, visibleToPlayer);
        // cellChar = RG.getCharForCell(cell, visibleToPlayer);
        cellClass = funcClassSrc(cell, visibleToPlayer);
        cellChar = funcCharSrc(cell, visibleToPlayer);

        // Useless to animate non-visible cells
        if (visibleToPlayer && anim) {
            const key = cellX + ',' + cellY;
            if (anim[key]) {
                cellClass = anim[key].className;
                cellChar = anim[key].char;
            }
        }

        if (selMap) {
            if (selMap.has(cell.getKeyXY())) {
                if (styles.selectedCell) {
                    cellClass = styles.selectedCell;
                }
                else {
                    cellClass = 'cell-target-selected';
                }
            }
        }

        if (!visibleToPlayer) {
            if (cell.isExplored()) {cellClass += ' cell-not-seen';}
        }

        const finishCurrentRLE = (cellClass !== prevClass) && prevClass
            || (cellChar !== prevChar) && prevChar;

        if (finishCurrentRLE) {
            cssClasses.push([classRL, prevClass]);
            classRL = 1;
            asciiChars.push([charRL, prevChar]);
            charRL = 1;
        }
        else {
            ++classRL;
            ++charRL;
        }

        prevChar = cellChar;
        prevClass = cellClass;
    }

    // Need to add the remaining cells
    if (classRL > 0) {cssClasses.push([classRL, cellClass]);}
    if (charRL > 0) {asciiChars.push([charRL, cellChar]);}

    return [cssClasses, asciiChars];
};

/* Same as above but optimized for showing the full map in the game editor.
*  Does not take into account cells seen by player. */
const getClassesAndCharsFullMap = function(cells: Cell[], selCell) {
    const cssClasses = [];
    const asciiChars = [];

    let selX = -1;
    let selY = -1;

    if (selCell !== null) {
        selX = selCell.getX();
        selY = selCell.getY();
    }

    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];

        let cellClass = RG.getCssClassFullMap(cell);
        const cellChar = RG.getCharFullMap(cell);

        if (selX === cell.getX() && selY === cell.getY()) {
            cellClass = 'cell-target-selected';
        }

        cssClasses.push(cellClass);
        asciiChars.push(cellChar);
    }

    return [cssClasses, asciiChars];
};

/* Returns the CSS classes + characters to be rendered using RLE. */
const getClassesAndCharsFullMapWithRLE = function(cells: Cell[], selCell) {
    let prevChar = null;
    let prevClass = null;
    let charRL = 0;
    let classRL = 0;

    const cssClasses = [];
    const asciiChars = [];

    let selMap = null;
    if (selCell) {
        selMap = new Map();
        selCell.forEach(cell => {
            selMap.set(cell.getX() + ',' + cell.getY(), cell);
        });
    }

    let cellClass = '';
    let cellChar = '';

    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];

        cellClass = RG.getCssClassFullMap(cell);
        cellChar = RG.getCharFullMap(cell);

        if (selMap) {
            const [x, y] = [cell.getX(), cell.getY()];
            if (selMap.has(x + ',' + y)) {
                cellClass = 'cell-target-selected';
            }
        }

        const finishCurrentRLE = (cellClass !== prevClass) && prevClass
            || (cellChar !== prevChar) && prevChar;

        if (finishCurrentRLE) {
            cssClasses.push([classRL, prevClass]);
            classRL = 1;
            asciiChars.push([charRL, prevChar]);
            charRL = 1;
        }
        else {
            ++classRL;
            ++charRL;
        }

        prevChar = cellChar;
        prevClass = cellClass;
    }

    // Need to add the remaining cells
    if (classRL > 0) {cssClasses.push([classRL, cellClass]);}
    if (charRL > 0) {asciiChars.push([charRL, cellChar]);}

    return [cssClasses, asciiChars];

};

//----------------
// Screen
//----------------
/* Creates a screen with viewport set to given parameters. */
export class Screen {

    public viewportX: number;
    public viewportY: number;
    public startX: number;
    public endX: number;
    public startY: number;
    public endY: number;

    public selectedCell: Cell | Cell[];
    public styles: Styles;
    public _charRows: string[][];
    public _classRows: string[][];
    public _mapShown: boolean;
    public viewport: Viewport;

    constructor(viewX: number, viewY: number) {
        this.viewportX = viewX;
        this.viewportY = viewY;
        this.selectedCell = null;
        this.styles = {};
        this._charRows = [];
        this._classRows = [];
        this._mapShown = false;

        this.viewport = new Viewport(viewX, viewY);

    }

    /* Returns the leftmost X-coordinate of the viewport. */
    public getStartX(): number {
        return this.viewport.startX;
    }

    public setSelectedCell(cell: Cell | Cell[]): void {
        this.selectedCell = cell;
    }

    public setViewportXY(x: number, y: number): void {
        this.viewportX = x;
        this.viewportY = y;
        this.viewport.setViewportXY(x, y);

        this._charRows = [];
        this._classRows = [];
        for (let yy = 0; yy < y; yy++) {
            this._charRows.push([]);
            this._classRows.push([]);
        }
    }

    public setMapShown(mapShown: boolean): void {
        this._mapShown = mapShown;
    }

    public getCharRows(): string[][] {
        return this._charRows;
    }

    public getClassRows(): string[][] {
        return this._classRows;
    }

    public _initRender(playX, playY, map: CellMap): void {
        if (!this._mapShown) {
            this.setViewportXY(this.viewportX,
                this.viewportY);
        }
        else {
            this.setViewportXY(map.cols, map.rows);
        }
        this.viewport.initCellsInViewPort(playX, playY, map);

        this.startX = this.viewport.startX;
        this.endX = this.viewport.endX;
        this.startY = this.viewport.startY;
        this.endY = this.viewport.endY;
    }

    /* 'Renders' the ASCII screen and style classes based on player's
     * coordinate, map and visible cells. */
    public render(playX, playY, map: CellMap, visibleCells: Cell[] | string): void {
        this._initRender(playX, playY, map);
        let yCount = 0;
        for (let y = this.viewport.startY; y <= this.viewport.endY; ++y) {
            const rowCellData = this.viewport.getCellRow(y);
            const classesChars = getClassesAndChars(visibleCells,
                rowCellData, this.selectedCell);

            this._classRows[yCount] = classesChars[0];
            this._charRows[yCount] = classesChars[1];
            ++yCount;
        }
    }

    public renderAllVisible(playX, playY, map: CellMap): void {
        this.render(playX, playY, map, ALL_VISIBLE);
    }

    public renderWithRLE(playX: number, playY: number, map: CellMap,
                         visibleCells: Cell[], anim?, funcClassSrc?, funcCharSrc?) {
        this._initRender(playX, playY, map);
        let yCount = 0;
        for (let y = this.viewport.startY; y <= this.viewport.endY; ++y) {
            const rowCellData = this.viewport.getCellRow(y);
            const classesChars = getClassesAndCharsWithRLE(visibleCells,
                rowCellData, this.selectedCell, anim, this.styles, funcClassSrc, funcCharSrc);

            this._classRows[yCount] = classesChars[0];
            this._charRows[yCount] = classesChars[1];
            ++yCount;
        }
    }

    /* Renders the full map as visible. */
    public renderFullMap(map: CellMap): void {
        this.startX = 0;
        this.endX = map.cols - 1;
        this.startY = 0;
        this.endY = map.rows - 1;

        for (let y = 0; y < map.rows; ++y) {
            const classesChars = getClassesAndCharsFullMap(
                map.getCellRowFast(y), this.selectedCell);

            this._classRows[y] = classesChars[0];
            this._charRows[y] = classesChars[1];
        }
    }

    public renderFullMapWithRLE(map: CellMap): void {
        this.startX = 0;
        this.endX = map.cols - 1;
        this.startY = 0;
        this.endY = map.rows - 1;

        for (let y = 0; y < map.rows; ++y) {
            const classesChars = getClassesAndCharsFullMapWithRLE(
                map.getCellRowFast(y), this.selectedCell);

            this._classRows[y] = classesChars[0];
            this._charRows[y] = classesChars[1];
        }
    }

    public clear(): void {
        this._classRows = [];
        this._charRows = [];
        this.selectedCell = null;
        this.startX = 0;
        this.endX = -1;
        this.startY = 0;
        this.endY = -1;
        this.styles = {};
    }

    public setStyle(name: string, value): void {
        this.styles[name] = value;
    }

    /* Prints the chars in screen. */
    public printRenderedChars(): void {
      this._charRows.forEach((row: string[]) => {
        console.log(row.join(''));
      });
    }

    public printRenderedClasses(): void {
      this._classRows.forEach((row: string[]) => {
        console.log(row.join(''));
      });
    }
}

/* A buffered screen for solving problem with elements/items added to
 * non-visible cells. This screen has one "problem": The actors won't
 * disappear from non-visible cells, but their "memory" stays there
 * until the player sees the cell again without the actor. */
export class ScreenBuffered extends Screen {

    protected fullMapCharRows: string[][];
    protected fullMapClassRows: string[][];
    protected isInitialized: boolean;

    constructor(viewX: number, viewY: number) {
        super(viewX, viewY);
        this.isInitialized = false;

        this.getCellChar = this.getCellChar.bind(this);
        this.getCellClass = this.getCellClass.bind(this);
    }

    public invalidate(): void {
        this.isInitialized = false;
    }

    public renderWithRLE(playX: number, playY: number, map: CellMap,
                         visibleCells: Cell[], anim?, funcClassSrc?, funcCharSrc?) {
        if (!this.isInitialized) {
            this.initializeFullMap(map, visibleCells);
        }

        // Mutate only visible cells in the full map
        visibleCells.forEach(cell => {
            const [x, y] = cell.getXY();
            const cellClass = RG.getCssClassForCell(cell, true);
            const cellChar = RG.getCharForCell(cell, true);
            this.fullMapClassRows[x][y] = cellClass;
            this.fullMapCharRows[x][y] = cellChar;
        });

        // Finally, get the chars and classes to render
        return super.renderWithRLE(playX, playY, map, visibleCells, anim,
            this.getCellClass, this.getCellChar);
    }

    /* Called once when a new Map is loaded. */
    protected initializeFullMap(map: CellMap, visibleCells: Cell[]): void {
        const cells: Cell[] = map.getCells();
        this.fullMapClassRows = new Array(map.cols);
        this.fullMapCharRows = new Array(map.cols);
        for (let x = 0; x < map.cols; x++) {
            this.fullMapCharRows[x] = new Array(map.rows);
            this.fullMapClassRows[x] = new Array(map.rows);
        }

        const visibleMap: Map<string, boolean> = new Map();
        visibleCells.forEach(cell => {
            visibleMap[cell.getKeyXY()] = true;
        });
        cells.forEach(cell => {
            const [x, y] = cell.getXY();
            const isVisible = visibleMap[cell.getKeyXY()];
            const cellClass = RG.getCssClassForCell(cell, isVisible);
            const cellChar = RG.getCharForCell(cell, isVisible);
            this.fullMapClassRows[x][y] = cellClass;
            this.fullMapCharRows[x][y] = cellChar;
        });
        this.isInitialized = true;

    }

    protected getCellClass(cell: Cell, isVisible: boolean): string {
        const [x, y] = cell.getXY();
        return this.fullMapClassRows[x][y];
    }

    protected getCellChar(cell: Cell, isVisible: boolean): string {
        const [x, y] = cell.getXY();
        return this.fullMapCharRows[x][y];
    }

}
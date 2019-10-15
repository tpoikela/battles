
import RG from '../src/rg';
import {Viewport} from './viewport';

type Cell = import('../src/map.cell').Cell;
type CellMap = import('../src/map').CellMap;
type Frame = import('../src/animation').Frame;

interface Styles {
    [key: string]: string;
}

export type RLEArray = Array<[number, string] | string>;

export const ALL_VISIBLE = 'ALL';

// TODO: Refactor out of this file
/* Builds and returns two arrays. First contains all CSS classNames of
 * cells to be rendered, and the second one all characters to be rendered.*/
const getClassesAndChars = function(
    seen: Cell[] | string, cells: Cell[], selCell: TSelectedCell
) {
    const cssClasses: string[] = [];
    const asciiChars: string[] = [];

    let selX = -1;
    let selY = -1;

    if (selCell !== null && !Array.isArray(selCell)) {
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
    selCell: TSelectedCell,
    anim?: Frame,
    styles: Styles = {},
    funcClassSrc?,
    funcCharSrc?
): [RLEArray, RLEArray] {
    let prevChar: string | null = null;
    let prevClass: string | null = null;
    let charRL = 0;
    let classRL = 0;

    const cssClasses: RLEArray = [];
    const asciiChars: RLEArray = [];

    funcClassSrc = funcClassSrc || RG.getCssClassForCell.bind(RG);
    funcCharSrc = funcCharSrc || RG.getCharForCell.bind(RG);

    let selMap: Map<string, Cell> | null = null;
    if (selCell) {
        selMap = new Map();
        if (Array.isArray(selCell)) {
            selCell.forEach(cell => {
                selMap!.set(cell.getX() + ',' + cell.getY(), cell);
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
            asciiChars.push([charRL, prevChar!]);
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
*  Does not take into account cells seen by player, so should be faster for
*  full map rendering. */
const getClassesAndCharsFullMap = function(cells: Cell[], selCell: TSelectedCell) {
    const cssClasses: string[] = [];
    const asciiChars: string[] = [];

    let selX = -1;
    let selY = -1;

    if (selCell !== null && !Array.isArray(selCell)) {
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
const getClassesAndCharsFullMapWithRLE = function(
    cells: Cell[], selCell: TSelectedCell
): [RLEArray, RLEArray] {
    let prevChar: string = '';
    let prevClass: string = '';
    let charRL = 0;
    let classRL = 0;

    const cssClasses: RLEArray = [];
    const asciiChars: RLEArray = [];

    let selMap: Map<string, Cell> | null = null;
    if (selCell && Array.isArray(selCell)) {
        selMap = new Map();
        selCell.forEach((cell: Cell) => {
            selMap!.set(cell.getX() + ',' + cell.getY(), cell);
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

type TSelectedCell = Cell | Cell[] | null;

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

    public selectedCell: TSelectedCell;
    public styles: Styles;
    public _charRows: RLEArray[];
    public _classRows: RLEArray[];
    public _mapShown: boolean;
    public isRLE: boolean;
    public viewport: Viewport;

    constructor(viewX: number, viewY: number) {
        this.viewportX = viewX;
        this.viewportY = viewY;
        this.selectedCell = null;
        this.styles = {};
        this._charRows = [];
        this._classRows = [];
        this._mapShown = false;
        this.isRLE = false;

        this.viewport = new Viewport(viewX, viewY);

    }

    /* Returns the leftmost X-coordinate of the viewport. */
    public getStartX(): number {
        return this.viewport.startX;
    }

    public setSelectedCell(cell: TSelectedCell): void {
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

    public getCharRows(): RLEArray[] {
        return this._charRows;
    }

    public getClassRows(): RLEArray[] {
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
        this.isRLE = false;
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

    public renderAllVisible(playX: number, playY: number, map: CellMap): void {
        this.isRLE = false;
        this.render(playX, playY, map, ALL_VISIBLE);
    }

    public renderWithRLE(playX: number, playY: number, map: CellMap,
                         visibleCells: Cell[], anim?: Frame, funcClassSrc?, funcCharSrc?) {
        this.isRLE = true;
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
        this.isRLE = false;
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

    /* Same as renderFullMap() but using RLE */
    public renderFullMapWithRLE(map: CellMap): void {
        this.isRLE = true;
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
    protected prevVisible: Cell[];

    constructor(viewX: number, viewY: number) {
        super(viewX, viewY);
        this.isInitialized = false;

        this.getCellChar = this.getCellChar.bind(this);
        this.getCellClass = this.getCellClass.bind(this);
        this.prevVisible = [];
    }

    public invalidate(): void {
        this.isInitialized = false;
        this.prevVisible = [];
    }

    public renderWithRLE(playX: number, playY: number, map: CellMap,
                         visibleCells: Cell[], anim?: Frame, funcClassSrc?, funcCharSrc?) {
        if (!visibleCells) {
            RG.err('ScreenBuffered', 'renderWithRLE', 'undef visibleCells');
        }
        if (!this.isInitialized) {
            this.initializeFullMap(map, visibleCells);
        }

        // Do a diff of prev visible and new ones
        const changedCells: Cell[] = this.getCellsInFirstOnly(this.prevVisible,
            visibleCells);

        // Then render these as non-visible
        changedCells.forEach(cell => {
            const [x, y] = cell.getXY();
            // false == not visible
            const cellClass = RG.getCssClassForCell(cell, false);
            const cellChar = RG.getCharForCell(cell, false);
            this.fullMapClassRows[x][y] = cellClass;
            this.fullMapCharRows[x][y] = cellChar;
        });

        // Mutate only visible cells in the full map
        visibleCells.forEach(cell => {
            const [x, y] = cell.getXY();
            // true == visible
            const cellClass = RG.getCssClassForCell(cell, true);
            const cellChar = RG.getCharForCell(cell, true);
            this.fullMapClassRows[x][y] = cellClass;
            this.fullMapCharRows[x][y] = cellChar;
        });

        this.prevVisible = visibleCells;
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

    protected getCellsInFirstOnly(first: Cell[], second: Cell[]): Cell[] {
        const res: Cell[] = [];
        first.forEach((cPrev: Cell) => {
            const index = second.indexOf(cPrev);
            if (index < 0) {
                res.push(cPrev);
            }
        });
        return res;
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

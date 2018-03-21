
const Viewport = require('./viewport');
const RG = require('../src/battles');

// TODO: Refactor out of this file
/* Builds and returns two arrays. First contains all CSS classNames of
 * cells to be rendered, and the second one all characters to be rendered.*/
const getClassesAndChars = function(seen, cells, selCell) {
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
        const cellIndex = seen.indexOf(cell);
        const visibleToPlayer = cellIndex < 0 ? false : true;

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
    seen, cells, selCell, anim, styles = {}) {
    let prevChar = null;
    let prevClass = null;
    let charRL = 0;
    let classRL = 0;

    const cssClasses = [];
    const asciiChars = [];

    /* let selX = -1;
    let selY = -1;

    if (selCell) {
        selX = selCell.getX();
        selY = selCell.getY();
    }*/
    let selMap = null;
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

        const cellIndex = seen.indexOf(cell);
        const visibleToPlayer = cellIndex < 0 ? false : true;

        cellClass = RG.getCssClassForCell(cell, visibleToPlayer);
        cellChar = RG.getCharForCell(cell, visibleToPlayer);

        // Useless to animate non-visible cells
        if (visibleToPlayer && anim) {
            const key = cellX + ',' + cellY;
            if (anim[key]) {
                cellClass = anim[key].className;
                cellChar = anim[key].char;
            }
        }

        if (selMap) {
            const [x, y] = [cell.getX(), cell.getY()];
            if (selMap.has(x + ',' + y)) {
                if (styles.selectedCell) {
                    cellClass = styles.selectedCell;
                }
                else {
                    cellClass = 'cell-target-selected';
                }
            }
        }

        /*
        if (cell.isAtXY(selX, selY)) {
            if (styles.selectedCell) {
                cellClass = styles.selectedCell;
            }
            else {
                cellClass = 'cell-target-selected';
            }
        }
        */

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
const getClassesAndCharsFullMap = function(cells, selCell) {
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
const getClassesAndCharsFullMapWithRLE = function(cells, selCell) {
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
const Screen = function(viewX, viewY) {
    this.viewportX = viewX;
    this.viewportY = viewY;
    this.selectedCell = null;
    this.styles = {};
    this._charRows = [];
    this._classRows = [];
    this._mapShown = false;

    this.viewport = new Viewport(viewX, viewY);

};

/* Returns the leftmost X-coordinate of the viewport. */
Screen.prototype.getStartX = function() {
    return this.viewport.startX;
};

Screen.prototype.setSelectedCell = function(cell) {
    this.selectedCell = cell;
};

Screen.prototype.setViewportXY = function(x, y) {
    this.viewportX = x;
    this.viewportY = y;
    this.viewport.setViewportXY(x, y);

    this._charRows = [];
    this._classRows = [];
    for (let yy = 0; yy < y; yy++) {
        this._charRows.push([]);
        this._classRows.push([]);
    }
};

Screen.prototype.setMapShown = function(mapShown) {
    this._mapShown = mapShown;
};

Screen.prototype.getCharRows = function() {
    return this._charRows;
};

Screen.prototype.getClassRows = function() {
    return this._classRows;
};

Screen.prototype._initRender = function(playX, playY, map) {
    if (!this._mapShown) {
        this.setViewportXY(this.viewportX,
            this.viewportY);
    }
    else {
        this.setViewportXY(map.cols, map.rows);
    }
    this.viewport.getCellsInViewPort(playX, playY, map);

    this.startX = this.viewport.startX;
    this.endX = this.viewport.endX;
    this.startY = this.viewport.startY;
    this.endY = this.viewport.endY;
};

/* 'Renders' the ASCII screen and style classes based on player's
 * coordinate, map and visible cells. */
Screen.prototype.render = function(playX, playY, map, visibleCells) {
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

};

Screen.prototype.renderWithRLE = function(
    playX, playY, map, visibleCells, anim) {
    this._initRender(playX, playY, map);
    let yCount = 0;
    for (let y = this.viewport.startY; y <= this.viewport.endY; ++y) {
        const rowCellData = this.viewport.getCellRow(y);
        const classesChars = getClassesAndCharsWithRLE(visibleCells,
            rowCellData, this.selectedCell, anim, this.styles);

        this._classRows[yCount] = classesChars[0];
        this._charRows[yCount] = classesChars[1];
        ++yCount;
    }
};

/* Renders the full map as visible. */
Screen.prototype.renderFullMap = function(map) {
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
};

Screen.prototype.renderFullMapWithRLE = function(map) {
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
};

Screen.prototype.clear = function() {
    this._classRows = [];
    this._charRows = [];
    this.selectedCell = null;
    this.startX = 0;
    this.endX = -1;
    this.startY = 0;
    this.endY = -1;
    this.styles = {};
};

Screen.prototype.setStyle = function(name, value) {
    this.styles[name] = value;
};

    /* Prints the chars in screen. */
Screen.prototype.printRenderedChars = function() {
  this._charRows.forEach(row => {
    console.log(row.join(''));
  });
};

module.exports = Screen;

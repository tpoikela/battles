
const GUI = require('./gui');
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

        let cellClass = RG.getClassName(cell, visibleToPlayer);
        const cellChar = RG.getChar(cell, visibleToPlayer);

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

/* Creates a screen with viewport set to given parameters. */
GUI.Screen = function(viewX, viewY) {
    this.viewportX = viewX;
    this.viewportY = viewY;
    this.selectedCell = null;

    let _charRows = [];
    let _classRows = [];
    let _mapShown = false;

    this.viewport = new GUI.Viewport(viewX, viewY);

    /* Returns the leftmost X-coordinate of the viewport. */
    this.getStartX = function() {
        return this.viewport.startX;
    };

    this.setSelectedCell = function(cell) {
        this.selectedCell = cell;
    };

    this.setViewportXY = function(x, y) {
        this.viewportX = x;
        this.viewportY = y;
        this.viewport.setViewportXY(x, y);

        _charRows = [];
        _classRows = [];
        for (let yy = 0; yy < y; yy++) {
            _charRows.push([]);
            _classRows.push([]);
        }
    };

    this.setMapShown = function(mapShown) {
        _mapShown = mapShown;
    };

    this.getCharRows = function() {
        return _charRows;
    };

    this.getClassRows = function() {
        return _classRows;
    };

    /* 'Renders' the ASCII screen and style classes based on player's
     * coordinate, map and visible cells. */
    this.render = function(playX, playY, map, visibleCells) {
        if (!_mapShown) {
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

        let yCount = 0;
        for (let y = this.viewport.startY; y <= this.viewport.endY; ++y) {
            const rowCellData = this.viewport.getCellRow(y);
            const classesChars = getClassesAndChars(visibleCells,
                rowCellData, this.selectedCell);

            _charRows[yCount] = classesChars[1];
            _classRows[yCount] = classesChars[0];
            ++yCount;
        }

    };

};

module.exports = GUI.Screen;

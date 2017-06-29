
'use strict';

const React = require('react');
const RG = require('../src/rg.js');

const GameRow = require('./game-row');

const GUI = require('../gui/gui');

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

/** Component which renders the game rows. {{{2 */
const GameBoard = React.createClass({

    propTypes: {
        mapShown: React.PropTypes.bool.isRequired,
        viewportX: React.PropTypes.number,
        viewportY: React.PropTypes.number,
        player: React.PropTypes.object,
        visibleCells: React.PropTypes.array,
        map: React.PropTypes.object,
        onCellClick: React.PropTypes.func,
        selectedCell: React.PropTypes.object,
        boardClassName: React.PropTypes.string
    },

    render: function() {
        const mapShown = this.props.mapShown;
        let rowClass = 'cell-row-div-player-view';
        if (mapShown) {rowClass = 'cell-row-div-map-view';}

        const player = this.props.player;
        const playX = player.getX();
        const playY = player.getY();
        const map = this.props.map;

        let shownCells = map;
        // if (!mapShown) {
            shownCells = new GUI.Viewport(this.props.viewportX,
                this.props.viewportY, map);
            shownCells.getCellsInViewPort(playX, playY, map);
        // }

        const cellRows = [];
        const charRows = [];
        const classRows = [];
        for (let y = shownCells.startY; y <= shownCells.endY; ++y) {
            const rowCellData = shownCells.getCellRow(y);
            const classesChars = getClassesAndChars(this.props.visibleCells,
                rowCellData, this.props.selectedCell);

            cellRows.push(rowCellData);
            charRows.push(classesChars[1]);
            classRows.push(classesChars[0]);
        }

        const rowsHTML = [];
        // Build the separate cell rows
        for (let y = shownCells.startY; y <= shownCells.endY; ++y) {
            const yIndex = y - shownCells.startY;
            const startX = cellRows[yIndex][0].getX();

            rowsHTML.push(
                <GameRow
                    key={y}
                    onCellClick={this.props.onCellClick}
                    rowChars={charRows[yIndex]}
                    rowClass={rowClass}
                    rowClasses={classRows[yIndex]}
                    startX={startX}
                    y={y}
                />);
        }

        // Finally return the full rendered board
        return (
            <div
                className={this.props.boardClassName}
                id='game-board'
                >
                {rowsHTML}
            </div>
        );
    }
}); // }}} Gameboard

module.exports = GameBoard;

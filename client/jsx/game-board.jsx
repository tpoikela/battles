
const React = require('react');
const RG = require('../src/rg.js');

const GameRow = require('./game-row');

const GUI = require('../gui/gui');

/** Component which renders the game rows. {{{2 */
var GameBoard = React.createClass({

    viewportX: 35, // * 2
    viewportY: 12, // * 2

    render: function() {

        var mapShown = this.props.mapShown;
        var rowClass = 'cell-row-div-player-view';
        if (mapShown) {rowClass = 'cell-row-div-map-view';}

        this.viewportX = this.props.viewportX;
        this.viewportY = this.props.viewportY;

        var player = this.props.player;
        var playX = player.getX();
        var playY = player.getY();
        var map = this.props.map;

        var shownCells = map;

        if (!mapShown) {
            shownCells = new GUI.Viewport(this.viewportX, this.viewportY, map);
            shownCells.getCellsInViewPort(playX, playY, map);
        }

        var onCellClick = this.props.onCellClick;
        var visibleCells = this.props.visibleCells;

        var rowsHTML = [];
        var selCell = this.props.selectedCell;

        // Build the separate cell rows
        for (var y = shownCells.startY; y <= shownCells.endY; ++y) {

            var rowCellData = shownCells.getCellRow(y);
            var startX = rowCellData[0].getX();
            var classesChars = this.getClassesAndChars(visibleCells, rowCellData, selCell);

            rowsHTML.push(
                <GameRow
                    key={y}
                    onCellClick={onCellClick}
                    rowChars={classesChars[1]}
                    rowClass={rowClass}
                    rowClasses={classesChars[0]}
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
    },

    /* Builds and returns two arrays. First contains all CSS classNames of
     * cells to be rendered, and the second one all characters to be rendered.*/
    getClassesAndChars: function(seen, cells, selCell) {
        var classes = [];
        var chars = [];

        var selX = -1;
        var selY = -1;

        if (selCell !== null) {
            selX = selCell.getX();
            selY = selCell.getY();
        }

        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];
            var cellIndex = seen.indexOf(cell);
            var visibleToPlayer = cellIndex < 0 ? false : true;
            var cellClass = RG.getClassName(cell, visibleToPlayer);
            var cellChar = RG.getChar(cell, visibleToPlayer);

            if (selX === cell.getX() && selY === cell.getY()) {
                cellClass = 'cell-target-selected';
            }

            if (!visibleToPlayer) {
                if (cell.isExplored()) {cellClass += ' cell-not-seen';}
            }
            classes.push(cellClass);
            chars.push(cellChar);
        }

        return [classes, chars];
    }

}); // }}} Gameboard

GameBoard.propTypes = {
    mapShown: React.PropTypes.bool,
    viewportX: React.PropTypes.number,
    viewportY: React.PropTypes.number,
    player: React.PropTypes.object,
    visibleCells: React.PropTypes.array
};

module.exports = GameBoard;

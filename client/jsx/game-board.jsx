
'use strict';

const React = require('react');
const GameRow = require('./game-row');

/** Component which renders the game rows. {{{2 */
const GameBoard = React.createClass({

    propTypes: {
        boardClassName: React.PropTypes.string,
        onCellClick: React.PropTypes.func,
        rowClass: React.PropTypes.string,
        startX: React.PropTypes.number,
        startY: React.PropTypes.number,
        endY: React.PropTypes.number,
        charRows: React.PropTypes.arrayOf(String),
        classRows: React.PropTypes.arrayOf(String)
    },

    render: function() {

        const rowsHTML = [];
        // Build the separate cell rows
        for (let y = this.props.startY; y <= this.props.endY; ++y) {
            const yIndex = y - this.props.startY;

            rowsHTML.push(
                <GameRow
                    key={y}
                    onCellClick={this.props.onCellClick}
                    rowChars={this.props.charRows[yIndex]}
                    rowClass={this.props.rowClass}
                    rowClasses={this.props.classRows[yIndex]}
                    startX={this.props.startX}
                    y={y}
                />);
        }

        // Finally return the full rendered board
        return (
            <div
                className={`game-board ${this.props.boardClassName}`}
            >
                {rowsHTML}
            </div>
        );
    }
}); // }}} Gameboard

module.exports = GameBoard;

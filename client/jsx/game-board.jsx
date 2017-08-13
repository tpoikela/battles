
'use strict';

const React = require('react');
const ReactDOM = require('react-dom');
const GameRow = require('./game-row');

const eventToPosition = (e, elem, props) => {
    // Where the mouse was clicked
    const x = e.clientX;
    const y = e.clientY;

    const numCells = props.sizeX;
    const startX = props.startX;
    const startY = props.startY;

    const rect = elem.getBoundingClientRect();

    const rowElem = document.getElementsByClassName('game-board-row')[0];
    console.log(`h: ${rowElem.clientHeight} w: ${rowElem.clientWidth}`);
    const sizeX = rowElem.clientWidth / numCells;
    const sizeY = rowElem.clientHeight;

    console.log('eventToPosition sizeX ' + sizeX);

    const relX = x - rect.left;
    const relY = y - rect.top;
    const posX = Math.floor(relX / sizeX) + startX;
    const posY = Math.floor(relY / sizeY) + startY;
    return [posX, posY];
};

/** Component which renders the game rows. {{{2 */
const GameBoard = React.createClass({

    propTypes: {
        boardClassName: React.PropTypes.string,
        charRows: React.PropTypes.arrayOf(String),
        classRows: React.PropTypes.arrayOf(String),
        endY: React.PropTypes.number,
        onCellClick: React.PropTypes.func,
        rowClass: React.PropTypes.string,
        useRLE: React.PropTypes.bool,
        sizeX: React.PropTypes.number,
        startX: React.PropTypes.number,
        startY: React.PropTypes.number
    },

	componentDidMount: function() {
        ReactDOM.findDOMNode(this).addEventListener(
			'click', this.onCellClick);
    },

    componentWillUnmount: function() {
        ReactDOM.findDOMNode(this).removeEventListener(
			'click', this.onCellClick);
    },

	onCellClick: function(evt) {
        // this.board specified using react ref=
        const xy = eventToPosition(evt, this.board, this.props);
        console.log(`eventToPosition returned ${xy}`);
        this.props.onCellClick(xy[0], xy[1]);
	},


    render: function() {
        const rowsHTML = [];
        // Build the separate cell rows
        for (let y = this.props.startY; y <= this.props.endY; ++y) {
            const yIndex = y - this.props.startY;
            const key = this.props.startX + ',' + y;

            rowsHTML.push(
                <GameRow
                    key={key}
                    rowChars={this.props.charRows[yIndex]}
                    rowClass={this.props.rowClass}
                    rowClasses={this.props.classRows[yIndex]}
                    startX={this.props.startX}
                    useRLE={this.props.useRLE}
                    y={y}
                />);
        }

        // Finally return the full rendered board
        return (
            <div
                className={`game-board ${this.props.boardClassName}`}
                ref={node => {this.board = node;}}
            >
                {rowsHTML}
            </div>
        );
    }
}); // }}} Gameboard

module.exports = GameBoard;

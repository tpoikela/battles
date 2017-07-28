
'use strict';

const React = require('react');
const ReactDOM = require('react-dom');
const GameRow = require('./game-row');

/** Component which renders the game rows. {{{2 */
const GameBoard = React.createClass({

    marginLeft: 10,
    marginTop: 20,

    propTypes: {
        boardClassName: React.PropTypes.string,
        charRows: React.PropTypes.arrayOf(String),
        classRows: React.PropTypes.arrayOf(String),
        endY: React.PropTypes.number,
        onCellClick: React.PropTypes.func,
        rowClass: React.PropTypes.string,
        useRLE: React.PropTypes.bool,
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
        console.log(JSON.stringify(evt));
        const thisElem = ReactDOM.findDOMNode(this);
        const px = evt.pageX;
        const py = evt.pageY;
        const offsetTop = thisElem.offsetTop;
        const offsetLeft = thisElem.offsetLeft;
        const relX = px - offsetLeft - this.marginLeft;
        const relY = py - offsetTop - this.marginTop;
        console.log(`Clicked coord ${px},${py}`);
        console.log(`Relative coord ${relX},${relY}`);
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
                    onCellClick={this.props.onCellClick}
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
            >
                {rowsHTML}
            </div>
        );
    }
}); // }}} Gameboard

module.exports = GameBoard;

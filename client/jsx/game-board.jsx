
'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
const ReactDOM = require('react-dom');
import GameRow from './game-row';

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
class GameBoard extends Component {

	componentDidMount() {
        ReactDOM.findDOMNode(this).addEventListener(
			'click', this.onCellClick);
    }

    componentWillUnmount() {
        ReactDOM.findDOMNode(this).removeEventListener(
			'click', this.onCellClick);
    }

	onCellClick(evt) {
        // this.board specified using react ref=
        const xy = eventToPosition(evt, this.board, this.props);
        console.log(`eventToPosition returned ${xy}`);
        this.props.onCellClick(xy[0], xy[1]);
	}


    render() {
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

}

GameBoard.propTypes = {
    boardClassName: PropTypes.string,
    charRows: PropTypes.arrayOf(String),
    classRows: PropTypes.arrayOf(String),
    endY: PropTypes.number,
    onCellClick: PropTypes.func,
    rowClass: PropTypes.string,
    useRLE: PropTypes.bool,
    sizeX: PropTypes.number,
    startX: PropTypes.number,
    startY: PropTypes.number
};

module.exports = GameBoard;


'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import GameRow from './game-row';

const eventToPosition = (e, elem, props, elemID) => {
    // Where the mouse was clicked
    const x = e.clientX;
    const y = e.clientY;

    const numCells = props.sizeX;
    const startX = props.startX;
    const startY = props.startY;

    const rect = elem.getBoundingClientRect();
    // const rowElem = document.getElementsByClassName(elemID)[0];
    const rowElem = elem.getElementsByClassName(elemID)[0];
    if (rowElem) {
        console.log(`h: ${rowElem.clientHeight} w: ${rowElem.clientWidth}`);
        const sizeX = rowElem.clientWidth / numCells;
        const sizeY = rowElem.clientHeight;

        console.log('eventToPosition sizeX ' + sizeX);

        const relX = x - rect.left;
        const relY = y - rect.top;
        const posX = Math.floor(relX / sizeX) + startX;
        const posY = Math.floor(relY / sizeY) + startY;
        return [posX, posY];
    }
    return [0, 0];
};

/** Component which renders the game rows. {{{2 */
export default class GameBoard extends Component {

    constructor(props) {
        super(props);
        this.onCellClick = this.onCellClick.bind(this);
        this.onMouseOverCell = this.onMouseOverCell.bind(this);
    }

    onCellClick(evt) {
        // this.board specified using react ref=
        const xy = eventToPosition(evt, this.board, this.props,
            'game-board-row');
        console.log(`eventToPosition returned ${xy}`);
        if (xy) {
            this.props.onCellClick(xy[0], xy[1]);
        }
    }

    getCellXY(evt) {
      return eventToPosition(evt, this.board, this.boards, 'game-board-row');
    }

    componentDidMount() {
      this.board.addEventListener('contextmenu', this.onMouseOverCell, true);
    }

    componentWillUnmount() {
      this.board.removeEventListener('contextmenu', this.onMouseOverCell);
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
                onClick={this.onCellClick}
                ref={node => {this.board = node;}}
            >
                {rowsHTML}
            </div>
        );
    }

    onMouseOverCell(evt) {
      evt.preventDefault();
      console.log('<GameBoard> onMouseOverCell');
      console.log(evt);
      const xy = eventToPosition(evt, this.board, this.props,
          'game-board-row');
      console.log('<GameBoard> xy is ' + xy);
      this.props.onMouseOverCell(xy[0], xy[1]);
      return false; // Prevents standard context menu
    }

}

GameBoard.propTypes = {
    boardClassName: PropTypes.string,
    charRows: PropTypes.arrayOf(String),
    classRows: PropTypes.arrayOf(String),
    endY: PropTypes.number,
    onCellClick: PropTypes.func,
    onMouseOverCell: PropTypes.func,
    rowClass: PropTypes.string,
    useRLE: PropTypes.bool,
    sizeX: PropTypes.number,
    startX: PropTypes.number,
    startY: PropTypes.number
};


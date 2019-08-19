
import * as React from 'react';
import GameRow from './game-row';

import {TCoord} from '../src/interfaces';
import {RLEArray} from '../gui/screen';

interface IGameBoardProps {
    boardClassName: string;
    charRows: RLEArray[];
    classRows: RLEArray[];
    endY: number;
    rowClass: string;
    useRLE?: boolean;
    sizeX: number;
    startX: number;
    startY: number;
    onCellClick?: (x: number, y: number) => void;
    onMouseDown?: (x: number, y: number) => void;
    onMouseOver?: (x: number, y: number) => void;
    onMouseOverCell?: (x: number, y: number) => void;
    onMouseUp?: (x: number, y: number) => void;
}

const eventToPosition = (e, elem, props: IGameBoardProps, elemID: string): TCoord => {
    // Where the mouse was clicked
    const x = e.clientX;
    const y = e.clientY;

    const numCells = props.sizeX;
    const startX = props.startX;
    const startY = props.startY;

    const rect = elem.getBoundingClientRect();
    const rowElem = elem.getElementsByClassName(elemID)[0];
    if (rowElem) {
        const sizeX = rowElem.clientWidth / numCells;
        const sizeY = rowElem.clientHeight;

        const relX = x - rect.left;
        const relY = y - rect.top;
        const posX = Math.floor(relX / sizeX) + startX;
        const posY = Math.floor(relY / sizeY) + startY;
        return [posX, posY];
    }
    return [0, 0];
};

/** Component which renders the game rows. */
export default class GameBoard extends React.Component {

    public props: IGameBoardProps;
    public board: any;

    constructor(props: IGameBoardProps) {
        super(props);
        this.onCellClick = this.onCellClick.bind(this);
        this.onMouseOverCell = this.onMouseOverCell.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseOver = this.onMouseOver.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
    }

    public componentDidMount() {
      if (this.props.onMouseOverCell) {
        this.board.addEventListener('contextmenu', this.onMouseOverCell, true);
      }
      if (this.props.onMouseDown) {
        this.board.addEventListener('mousedown', this.onMouseDown, true);
      }
      if (this.props.onMouseUp) {
        this.board.addEventListener('mouseup', this.onMouseUp, true);
      }
      if (this.props.onMouseOver) {
        this.board.addEventListener('mouseover', this.onMouseOver, true);
      }
    }

    public componentWillUnmount() {
      if (this.props.onMouseOverCell) {
        this.board.removeEventListener('contextmenu', this.onMouseOverCell);
      }
      if (this.props.onMouseDown) {
        this.board.removeEventListener('mousedown', this.onMouseDown, true);
      }
      if (this.props.onMouseUp) {
        this.board.removeEventListener('mouseup', this.onMouseUp, true);
      }
      if (this.props.onMouseOver) {
        this.board.removeEventListener('mouseover', this.onMouseOver, true);
      }
    }

    public onCellClick(evt) {
        const xy = eventToPosition(evt, this.board, this.props,
            'game-board-row');
        if (xy) {
            this.props.onCellClick(xy[0], xy[1]);
        }
    }

    public onMouseOver(evt) {
      if (this.props.onMouseOver) {
        evt.preventDefault();
        const xy = eventToPosition(evt, this.board, this.props,
            'game-board-row');
        this.props.onMouseOver(xy[0], xy[1]);
      }
    }

    public onMouseUp(evt) {
      if (this.props.onMouseUp) {
        evt.preventDefault();
        const xy = eventToPosition(evt, this.board, this.props,
            'game-board-row');
        this.props.onMouseUp(xy[0], xy[1]);
      }
    }

    public onMouseDown(evt) {
      if (this.props.onMouseDown) {
        evt.preventDefault();
        const xy = eventToPosition(evt, this.board, this.props,
            'game-board-row');
        this.props.onMouseDown(xy[0], xy[1]);
      }
    }

    public getCellXY(evt): [number, number] {
      return eventToPosition(evt, this.board, this.props, 'game-board-row');
    }

    public render() {
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

    private onMouseOverCell(evt) {
      if (this.props.onMouseOverCell) {
        evt.preventDefault();
        console.log('<GameBoard> onMouseOverCell');
        console.log(evt);
        const xy = eventToPosition(evt, this.board, this.props,
            'game-board-row');
        console.log('<GameBoard> xy is ' + xy);
        this.props.onMouseOverCell(xy[0], xy[1]);
        return false; // Prevents standard context menu
      }
      return true;
    }

}

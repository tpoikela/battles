
import React from 'react';
import GameBoard from '../jsx/game-board';
import {ContextMenuTrigger} from 'react-contextmenu';
import {Screen} from '../gui/screen';

export interface IEditorGameBoardProps {
    boardClassName: string;
    rowClass: string;
    screen: Screen;
    sizeX: number;
    updateMap: boolean;
    useRLE: boolean;
    onCellClick(x: number, y: number): void;
    onMouseDown(x: number, y: number): void;
    onMouseOver(x: number, y: number): void;
    onMouseOverCell(x: number, y: number): void;
    onMouseUp(x: number, y: number): void;
}

/* Wrapper for the GameBoard to disable map updates for big maps. */
export default class EditorGameBoard extends React.Component {
    public props: IEditorGameBoardProps;

    public shouldComponentUpdate(nextProps) {
        if (nextProps.updateMap) {return true;}
        return false;
    }

    public render() {
        const {screen} = this.props;
        return (
            <ContextMenuTrigger id='right-click-context-menu'>
            <GameBoard
              boardClassName={this.props.boardClassName}
              charRows={screen.getCharRows()}
              classRows={screen.getClassRows()}
              endY={screen.endY}
              onCellClick={this.props.onCellClick}
              onMouseDown={this.props.onMouseDown}
              onMouseOver={this.props.onMouseOver}
              onMouseOverCell={this.props.onMouseOverCell}
              onMouseUp={this.props.onMouseUp}
              rowClass={this.props.rowClass}
              sizeX={this.props.sizeX}
              startX={0}
              startY={0}
              useRLE={this.props.useRLE}
            />
            </ContextMenuTrigger>
        );
    }
}

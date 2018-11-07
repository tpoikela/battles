
import React from 'react';
import PropTypes from 'prop-types';
import GameBoard from '../jsx/game-board';
import {ContextMenuTrigger} from 'react-contextmenu';

/* Wrapper for the GameBoard to disable map updates for big maps. */
export default class EditorGameBoard extends React.Component {

    shouldComponentUpdate(nextProps) {
        if (nextProps.updateMap) {return true;}
        return false;
    }

    render() {
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

EditorGameBoard.propTypes = {
    boardClassName: PropTypes.string,
    onCellClick: PropTypes.func,
    onMouseDown: PropTypes.func,
    onMouseOver: PropTypes.func,
    onMouseOverCell: PropTypes.func,
    onMouseUp: PropTypes.func,
    rowClass: PropTypes.string,
    screen: PropTypes.object,
    sizeX: PropTypes.number,
    updateMap: PropTypes.bool,
    useRLE: PropTypes.bool
};


import * as React from 'react';
import {Cell} from '../src/map.cell';
import {IMessage} from "../src/rg";

interface IGameMessagesProps {
  message: IMessage[];
  visibleCells: Cell[];
  saveInProgress: boolean;
  showAll: boolean;
}

/* Component for displaying in-game messages.*/
export default class GameMessages extends React.Component {

  public static styleToClassName: {[key: string]: string};

  public props: IGameMessagesProps;

  public shouldComponentUpdate(nextProps: IGameMessagesProps ) {
    return nextProps.message.length > 0;
  }

  public render() {
    const message = this.props.message;
    const styles = GameMessages.styleToClassName;
    const seenCells = this.props.visibleCells;
    const showAll = this.props.showAll;

    let msgList = [<span>Saving the game...</span>];
    if (!this.props.saveInProgress) {
        msgList = message.map((val, itemIndex) => {
        const className = styles[val.style];
        let index = 1;

        if (showAll) {
          val.seen = true;
        }
        else if (!val.hasOwnProperty('seen')) {
          if (val.hasOwnProperty('cell')) {
            index = seenCells.indexOf(val.cell);
            if (index >= 0) {val.seen = true;}
          }
        }

        const count = val.count === 1 ? '' : ` (x${val.count})`;
        let fullMsg = `${val.msg}${count}`;

        if (!fullMsg.match(/.$/)) {
          fullMsg += '.';
        }
        fullMsg += '. ';

        if (index >= 0 || val.seen) {
          return (
            <span
              className={className}
              key={itemIndex}
            >
              {fullMsg}
            </span>
          );
        }
        return null;
      });
    }

    return (
      <div className='game-messages'>{msgList}</div>
    );
  }

}

GameMessages.styleToClassName = {
  prim: 'text-primary',
  info: 'text-info',
  descr: 'text-muted',
  warn: 'text-warning',
  danger: 'text-danger',
  success: 'text-success'
};


import * as React from 'react';

const Item = require('../src/item');
const linewrap = require('linewrap');

const textLeftMargin = 3;
const wrap = linewrap(80 - textLeftMargin);

interface IGameMenuProps {
  height: number;
  menuObj: any;
  width: number;
  menuItemClicked(item: Item.Base): void;
}

function padToWidth(w, text, marginLeft, padChar = '&nbsp;'): string {
  const textLen = text.length;
  let marginRight = w - textLen - marginLeft;
  if (marginRight < 0) {marginRight = 0;}
  return padChar.repeat(marginLeft) + text + padChar.repeat(marginRight);
}

function getPaddingLines(width, lineCount) {
  const padding = [];
  for (let i = 0; i < lineCount; i++) {
    const topElem = (
      <div className='cell-row-div-player-view' key={'id' + i}>
        <span className='cell-not-explored'
          dangerouslySetInnerHTML={{__html: padToWidth(width, '', 0)}}
        />
      </div>
    );
    padding.push(topElem);
  }
  return padding;
}

/* Component is used to show in-game menus, for example when a player must
 * make a decision about something. Each menu can contain pre-selection text,
 * the actual selection list and post-selection text. */
export default class GameMenu extends React.Component {

  public props: IGameMenuProps;

  constructor(props: IGameMenuProps ) {
    super(props);
  }

  menuItemClicked(item: Item) {
    console.log('Clicked menu item ' + item);
    this.props.menuItemClicked(item);
  }

  render() {
    const {menuObj, width, height} = this.props;

    const topLineCount = 3;
    const menuLineCount = Object.keys(menuObj).length;
    const bottomLineCount = height - topLineCount - menuLineCount;

    const paddingTop = getPaddingLines(width, topLineCount);
    const paddingBottom = getPaddingLines(width, bottomLineCount);

    const menuElem = Object.keys(menuObj).map(item => {
      if (item !== 'pre' && item !== 'post') {
        const text = padToWidth(width, `[${item}] - ${menuObj[item]} `, 3);
        return (
          <div className='cell-row-div-player-view' key={item}>
            <span className='game-menu-text-span game-menu-item-select'
              dangerouslySetInnerHTML={{__html: text}}
              onClick={this.menuItemClicked.bind(this, item)}
            />
          </div>
        );
      }
      return null;
    });

    // Create pre-selection text element
    let preMenu = null;
    if (menuObj.hasOwnProperty('pre')) {
      if (Array.isArray(menuObj.pre)) {
        preMenu = menuObj.pre.map(item => {
          const wrapped = wrap(item);
          return this.renderMenuLines(wrapped);
        });
      }
    }

    // Create post-selection text element
    let postMenu = null;
    if (menuObj.hasOwnProperty('post')) {
      if (Array.isArray(menuObj.post)) {
        postMenu = menuObj.post.map(item => {
          const wrapped = wrap(item);
          return this.renderMenuLines(wrapped);
        });
      }
    }

    return (
      <div
        className='game-board game-board-player-view'
      >
        {paddingTop}
        {preMenu}
        {menuElem}
        {postMenu}
        {paddingBottom}
      </div>
    );
  }

  renderMenuLines(item) {
    const lines = item.split('\n').filter(line => line.length > 0);
    const {width} = this.props;
    return lines.map((textLine, i) => {
      const text = padToWidth(width, `${textLine}`, 3);
      return (
        <div className='cell-row-div-player-view' key={'menu_line_' + i}>
          <span
            className='game-menu-text-span'
            dangerouslySetInnerHTML={{__html: text}}
          />
        </div>
      );
    });
  }

}


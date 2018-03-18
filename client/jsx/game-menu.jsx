
import React, {Component} from 'react';
import PropTypes from 'prop-types';

function padToWidth(w, text, marginLeft, padChar = '&nbsp;') {
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
export default class GameMenu extends Component {

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
            <span className='game-menu-text-span'
              dangerouslySetInnerHTML={{__html: text}}
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
          return this.renderMenuLines(item);
        });
      }
    }

    // Create post-selection text element
    let postMenu = null;
    if (menuObj.hasOwnProperty('post')) {
      if (Array.isArray(menuObj.post)) {
        postMenu = menuObj.post.map(item => {
          return this.renderMenuLines(item);
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
    const lines = item.split('\n');
    const {width} = this.props;
    return lines.map(textLine => {
      const text = padToWidth(width, `${textLine}`, 3);
      return (
        <div className='cell-row-div-player-view' key={item}>
          <span className='game-menu-text-span'
            dangerouslySetInnerHTML={{__html: text}}
          />
        </div>
      );
    });
  }

}

GameMenu.propTypes = {
  height: PropTypes.number,
  menuObj: PropTypes.object,
  width: PropTypes.number
};


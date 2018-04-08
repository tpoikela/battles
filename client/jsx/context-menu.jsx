/* eslint comma-dangle: 0 */
import React from 'react';
import PropTypes from 'prop-types';

import {ContextMenu, MenuItem} from 'react-contextmenu';

/* Menu items are defined as follows:
 *   The first key defines a getter/query function for a cell. If that function
 *   returns true, all items inside the corresponding array are shown.
 */
const allMenuItems = {
  isPassable: [
    {text: 'Move', type: 'move'},
  ],
  hasActors: [
    {text: 'Attack', type: 'attack'},
    {text: 'Chat', type: 'chat'},
    {text: 'Order', type: 'order'},
  ],
  hasDoor: [
    {text: 'Open/close', type: 'door'},
  ],
  hasItems: [
    {text: 'Pick up', type: 'pickup'},
  ],
  hasUsable: [
    {text: 'Use element', type: 'use-element'},
  ],
  hasConnection: {
    hasPassage: [
      {text: 'Travel', type: 'usestairs'},
    ],
    hasShop: [
      {text: 'Buy item', type: 'buyitem'},
      {text: 'Sell item', type: 'sellitem'},
    ],
    hasStairs: [
      {text: 'Stairs', type: 'usestairs'},
    ],
    hasTown: [
      {text: 'Goto town', type: 'usestairs'},
    ],
    hasBattle: [
      {text: 'Goto battle', type: 'usestairs'},
    ],
    hasMountain: [
      {text: 'Goto mountain', type: 'usestairs'},
    ],
  }
};

export default class GameContextMenu extends React.Component {

  constructor(props) {
      super(props);
      this.handleClick = this.handleClick.bind(this);
  }

  handleClick(e, data) {
      console.log(e);
      console.log(data);
      this.props.handleRightClick(e, data, this.props.mouseOverCell);
  }

  render() {
    const menuItemElem = this.renderMenuItems();
    return (
      <div>
        <ContextMenu className='context-menu' id='right-click-context-menu'>
          {menuItemElem}
        </ContextMenu>
      </div>
    );
  }

  /* Calls different query functions and renders possible commands based on
   * the cell contents. */
  renderMenuItems() {
    const items = [];
    Object.keys(allMenuItems).forEach(queryFunc => {
      if (this.isCorrectContext(queryFunc)) {
        const menuItems = this.getMenuItems(allMenuItems[queryFunc]);
        menuItems.forEach((item, index) => {
          items.push(
            <MenuItem
              data={{type: item.type}}
              key={index + '-' + item.text}
              onClick={this.handleClick}
            >
              {item.text}
            </MenuItem>
          );
        });

        items.push(
          <MenuItem
            className='context-menu-divider'
            divider={true}
            key={'divider-' + queryFunc}
          />
        );
      }
    });
    return items;
  }

  getMenuItems(items) {
    let result = [];
    if (Array.isArray(items)) {
      return items;
    }
    Object.keys(items).forEach(queryFunc => {
      if (this.isCorrectContext(queryFunc)) {
        result = result.concat(this.getMenuItems(items[queryFunc]));
      }
    });
    return result;
  }

  isCorrectContext(queryFunc) {
    const cell = this.props.mouseOverCell;
    if (cell) {
      if (typeof cell[queryFunc] === 'function') {
        return cell[queryFunc]();
      }
      else if (typeof this[queryFunc] === 'function') {
        return this[queryFunc]();
      }
    }
    return false;
  }

}

GameContextMenu.propTypes = {
  handleRightClick: PropTypes.func.isRequired,
  mouseOverCell: PropTypes.object
};

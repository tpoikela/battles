/* eslint comma-dangle: 0 */
import React from 'react';

import ContextMenuItems from './context-menu-items';
import {Cell} from '../src/map.cell';

export interface IGameContextMenuProps {
  mouseOverCell: Cell;
  handleRightClick(evt: React.SyntheticEvent, data: any, cell: Cell): void;
}

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
    {text: 'Shoot', type: 'shoot'},
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
  hasShop: [
    {text: 'Buy item', type: 'buyitem'},
    {text: 'Sell item', type: 'sellitem'},
  ],
  hasConnection: {
    hasPassage: [
      {text: 'Travel', type: 'usestairs'},
    ],
    hasStairs: [
      {text: 'Use stairs', type: 'usestairs'},
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

  public props: IGameContextMenuProps;

  public render() {
    return (
      <ContextMenuItems
        handleRightClick={this.props.handleRightClick}
        menuItems={allMenuItems}
        mouseOverCell={this.props.mouseOverCell}
      />
    );
  }

}


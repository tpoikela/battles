
import * as React from 'react';
import {ContextMenu, MenuItem} from 'react-contextmenu';
import {Cell} from '../src/map.cell';

export interface IContextMenuItemsProps {
  menuItems: any;
  mouseOverCell: null | Cell;
  handleRightClick(evt: React.SyntheticEvent, data: any, cell: Cell): void;
}

export default class ContextMenuItems extends React.Component {

  public props: IContextMenuItemsProps;

  constructor(props: IContextMenuItemsProps) {
      super(props);
      this.handleClick = this.handleClick.bind(this);
  }

  public shouldComponentUpdate(nextProps: IContextMenuItemsProps) {
      if (this.props.mouseOverCell) {
          if (!nextProps.mouseOverCell) {return true;}
          const [x, y] = this.props.mouseOverCell.getXY();
          const [nX, nY] = nextProps.mouseOverCell.getXY();
          if (nX === x && nY === y) {
              return false;
          }
      }
      return true;
  }

  public render() {
    const menuItemElem = this.renderMenuItems();
    return (
      <ContextMenu className='context-menu' id='right-click-context-menu'>
        {menuItemElem}
      </ContextMenu>
    );

  }

  public handleClick(e, data) {
    console.log('ContextMenuItems handleClick with', data);
    if (this.props.mouseOverCell) {
      this.props.handleRightClick(e, data, this.props.mouseOverCell);
    }
  }

  /* Calls different query functions and renders possible commands based on
   * the cell contents. */
  private renderMenuItems() {
    const items: any = [];
    Object.keys(this.props.menuItems).forEach(queryFunc => {
      if (this.isCorrectContext(queryFunc)) {
        const menuItems = this.getMenuItems(this.props.menuItems[queryFunc]);
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
            divider={true}
            key={'divider-' + queryFunc}
          />
        );
      }
    });
    return items;
  }

  private getMenuItems(items) {
    let result: any = [];
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

  private isCorrectContext(queryFunc): boolean {
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


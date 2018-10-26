
import React from 'react';
import PropTypes from 'prop-types';
import {ContextMenu, MenuItem} from 'react-contextmenu';

export default class ContextMenuItems extends React.Component {

  constructor(props) {
      super(props);
      this.handleClick = this.handleClick.bind(this);
  }

  shouldComponentUpdate(nextProps) {
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

  render() {
    const menuItemElem = this.renderMenuItems();
    return (
      <ContextMenu className='context-menu' id='right-click-context-menu'>
        {menuItemElem}
      </ContextMenu>
    );

  }

  handleClick(e, data) {
    console.log('ContextMenuItems handleClick with', data);
    this.props.handleRightClick(e, data, this.props.mouseOverCell);
  }

  /* Calls different query functions and renders possible commands based on
   * the cell contents. */
  renderMenuItems() {
    const items = [];
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

ContextMenuItems.propTypes = {
  handleRightClick: PropTypes.func.isRequired,
  menuItems: PropTypes.object,
  mouseOverCell: PropTypes.object
};
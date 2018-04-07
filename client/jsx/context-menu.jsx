
import React from 'react';
import PropTypes from 'prop-types';

import {ContextMenu, MenuItem} from 'react-contextmenu';

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
    return (
      <div>
        <ContextMenu className='context-menu' id='right-click-context-menu'>
          <MenuItem data={{type: 'attack'}} onClick={this.handleClick}>
            Attack
          </MenuItem>
          <MenuItem data={{type: 'shoot'}} onClick={this.handleClick}>
            Shoot
          </MenuItem>
          <MenuItem data={{type: 'pickup'}} onClick={this.handleClick}>
            Pick up
          </MenuItem>
          <MenuItem divider={true} />
          <MenuItem data={{type: 'move'}} onClick={this.handleClick}>
            Move
          </MenuItem>
          <MenuItem data={{type: 'order'}} onClick={this.handleClick}>
            Order
          </MenuItem>
        </ContextMenu>

      </div>
    );
  }
}

GameContextMenu.propTypes = {
  handleRightClick: PropTypes.func.isRequired,
  mouseOverCell: PropTypes.object
};

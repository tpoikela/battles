
import React from 'react';
import PropTypes from 'prop-types';

import {
  Nav, NavDropdown, MenuItem
} from 'react-bootstrap';

/* Component for the top-level game menu. */
export default class GameTopMenu extends React.Component {

    constructor(props) {
      super(props);
      this.handleSelect = this.handleSelect.bind(this);
    }

    handleSelect(eventKey) {
      console.log('eventKey: ' + eventKey);
      this.props.menuCallback(eventKey);
    }

    render() {
      return (
      <div>
        <Nav activeKey='1' bsStyle='tabs' onSelect={this.handleSelect}>
          <NavDropdown eventKey='game' id='dropdown-game' title='Game' >
            <MenuItem eventKey='game-start'>New</MenuItem>
            <MenuItem eventKey='game-save'>Save</MenuItem>
            <MenuItem eventKey='game-load'>Load</MenuItem>
            <MenuItem eventKey='game-import'>Import</MenuItem>
            <MenuItem eventKey='game-export'>Export</MenuItem>
          </NavDropdown>
        </Nav>
      </div>
      );
    }
}

GameTopMenu.propTypes = {
  menuCallback: PropTypes.func.isRequired
};

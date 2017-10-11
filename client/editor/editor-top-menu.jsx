
import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {
  Nav, NavDropdown, MenuItem
} from 'react-bootstrap';

export default class EditorTopMenu extends Component {

  handleSelect(eventKey) {
    console.log('eventKey: ' + eventKey);
  }

  render() {
    return (
      <Nav activeKey='1' bsStyle='tabs' onSelect={this.handleSelect}>
        <NavDropdown eventKey='1' id='dropdown-file' title='File' >
          <MenuItem eventKey='1.1'>New...</MenuItem>
          <MenuItem eventKey='1.2'>Save as...</MenuItem>
          <MenuItem eventKey='1.3'>Load</MenuItem>
          <MenuItem eventKey='1.4'>Import</MenuItem>
        </NavDropdown>
        <NavDropdown eventKey='3' id='dropdown-edit' title='Edit' >
          <MenuItem eventKey='3.1'>Select</MenuItem>
          <MenuItem eventKey='3.2'>Select shape</MenuItem>
          <MenuItem eventKey='3.3'>Cut</MenuItem>
          <MenuItem eventKey='3.4'>Copy</MenuItem>
          <MenuItem eventKey='3.5'>Paste</MenuItem>
          <MenuItem eventKey='3.6'>Undo</MenuItem>
        </NavDropdown>
        <NavDropdown eventKey='2' id='dropdown-simulate' title='Simulate' >
          <MenuItem eventKey='2.1'>New game</MenuItem>
          <MenuItem eventKey='2.2'>Simulate level</MenuItem>
          <MenuItem eventKey='2.3'>Play/Pause</MenuItem>
          <MenuItem eventKey='2.4'>Stop</MenuItem>
          <MenuItem eventKey='2.5'>Play fast</MenuItem>
        </NavDropdown>
        <NavDropdown eventKey='4' id='dropdown-view' title='View' >
          <MenuItem eventKey='4.1'>Refresh</MenuItem>
          <MenuItem eventKey='4.2'>Zoom in</MenuItem>
          <MenuItem eventKey='4.3'>Zoom out</MenuItem>
          <MenuItem eventKey='4.4'>Zoom fit</MenuItem>
        </NavDropdown>
        <NavDropdown eventKey='5' id='dropdown-insert' title='Insert' >
          <MenuItem eventKey='5.1'>Actor</MenuItem>
          <MenuItem eventKey='5.2'>Item</MenuItem>
          <MenuItem eventKey='5.3'>Element</MenuItem>
          <MenuItem eventKey='5.4'>Sublevel</MenuItem>
          <MenuItem eventKey='5.5'>Shape</MenuItem>
        </NavDropdown>
        <NavDropdown eventKey='6' id='dropdown-level' title='Level' >
          <MenuItem eventKey='6.1'>New level</MenuItem>
          <MenuItem eventKey='6.2'>New zone</MenuItem>
          <MenuItem eventKey='6.3'>New world</MenuItem>
          <MenuItem eventKey='6.4'>New battle</MenuItem>
        </NavDropdown>
      </Nav>
    );
  }
}

EditorTopMenu.propTypes = {

};

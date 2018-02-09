
import React, {Component} from 'react';
import PropTypes from 'prop-types';

import TopMenuLogic from './top-menu-logic';

import {
  Nav, NavDropdown, MenuItem
} from 'react-bootstrap';

const RG = require('../src/rg');

export default class EditorTopMenu extends Component {

  constructor(props) {
      super(props);
      this.handleSelect = this.handleSelect.bind(this);
  }

  handleSelect(eventKey) {
    this.props.menuCallback(eventKey);
    console.log('eventKey: ' + eventKey);
    this.menuLogic.menuCallback(eventKey);
  }

  render() {
    return (
    <div>
      <Nav activeKey='1' bsStyle='tabs' onSelect={this.handleSelect}>

        <NavDropdown eventKey='file' id='dropdown-file' title='File' >
          <MenuItem eventKey='file-new'>New...</MenuItem>
          <MenuItem eventKey='file-save-as'>Save as...</MenuItem>
          <MenuItem eventKey='file-load'>Load</MenuItem>
          <MenuItem eventKey='file-import'>Import</MenuItem>
        </NavDropdown>

        <NavDropdown eventKey='edit' id='dropdown-edit' title='Edit' >
          <MenuItem eventKey='edit-select'>Select</MenuItem>
          <MenuItem eventKey='edit-select-shape'>Select shape</MenuItem>
          <MenuItem eventKey='edit-cut'>Cut</MenuItem>
          <MenuItem eventKey='edit-copy'>Copy</MenuItem>
          <MenuItem eventKey='edit-paste'>Paste</MenuItem>
          <MenuItem eventKey='edit-undo'>Undo</MenuItem>
        </NavDropdown>

        <NavDropdown
            eventKey='simulate' id='dropdown-simulate' title='Simulate'
        >
          <MenuItem eventKey='simulate-1'>New game</MenuItem>
          <MenuItem eventKey='simulate-2'>Simulate level</MenuItem>
          <MenuItem eventKey='simulate-3'>Play/Pause</MenuItem>
          <MenuItem eventKey='simulate-4'>Stop</MenuItem>
          <MenuItem eventKey='simulate-5'>Play fast</MenuItem>
          <MenuItem eventKey='simulate-6'>Step</MenuItem>
        </NavDropdown>

        <NavDropdown eventKey='view' id='dropdown-view' title='View' >
          <MenuItem eventKey='view-1'>Refresh</MenuItem>
          <MenuItem eventKey='view-2'>Zoom in</MenuItem>
          <MenuItem eventKey='view-3'>Zoom out</MenuItem>
          <MenuItem eventKey='view-4'>Zoom fit</MenuItem>
        </NavDropdown>

        <NavDropdown eventKey='insert' id='dropdown-insert' title='Insert' >
          <MenuItem eventKey='insert-1'>Actor</MenuItem>
          <MenuItem eventKey='insert-2'>Item</MenuItem>
          <MenuItem eventKey='insert-3'>Element</MenuItem>
          <MenuItem eventKey='insert-4'>Sublevel</MenuItem>
          <MenuItem eventKey='insert-5'>Shape</MenuItem>
        </NavDropdown>

        <NavDropdown eventKey='level' id='dropdown-level' title='Level' >
          <MenuItem eventKey='level-new-level'>New level</MenuItem>
          <MenuItem eventKey='level-new-zone'>New zone</MenuItem>
          <MenuItem eventKey='level-new-world'>New world</MenuItem>
          <MenuItem eventKey='level-new-battle'>New battle</MenuItem>
        </NavDropdown>
      </Nav>

      <TopMenuLogic
          level={this.props.level}
          onRef={ref => {this.menuLogic = ref;}}
      />

      </div>
    );
  }
}

EditorTopMenu.propTypes = {
    level: PropTypes.objectOf(RG.Map.Level),
    menuCallback: PropTypes.func.isRequired
};

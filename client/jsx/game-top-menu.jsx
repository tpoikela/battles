
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
      const split = eventKey.split('#');
      const cmd = split.shift();
      console.log('eventKey: ' + eventKey);
      console.log('cmd-type: ', cmd, split);
      this.props.menuCallback(cmd, split);
    }

    render() {
      return (
      <div>
        <Nav activeKey='1' bsStyle='tabs' onSelect={this.handleSelect}>
          <NavDropdown eventKey='game' id='dropdown-game' title='Game' >
            <MenuItem eventKey='showScreen#StartScreen'>New</MenuItem>
            <MenuItem eventKey='showScreen#LoadScreen'>Load</MenuItem>
            <MenuItem eventKey='saveGame#saveGame'>Save</MenuItem>
            <MenuItem eventKey='game-import'>Import JSON</MenuItem>
            <MenuItem eventKey='game-export'>Export JSON</MenuItem>
          </NavDropdown>
          <NavDropdown eventKey='view' id='dropdown-view' title='View' >
            <MenuItem eventKey='setViewSize#+#X'>Viewport +X</MenuItem>
            <MenuItem eventKey='setViewSize#-#X'>Viewport -X</MenuItem>
            <MenuItem eventKey='setViewSize#+#Y'>Viewport +Y</MenuItem>
            <MenuItem eventKey='setViewSize#-#Y'>Viewport -Y</MenuItem>
          </NavDropdown>
          <NavDropdown eventKey='help' id='dropdown-help' title='Help' >
            <MenuItem eventKey='showScreen#HelpScreen'>Help</MenuItem>
            <MenuItem eventKey='showScreen#ManualScreen'>Manual</MenuItem>
            <MenuItem eventKey='showScreen#AboutScreen'>About</MenuItem>
          </NavDropdown>
        </Nav>
      </div>
      );
    }
}

GameTopMenu.propTypes = {
  menuCallback: PropTypes.func.isRequired
};

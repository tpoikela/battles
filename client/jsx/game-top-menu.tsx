
import React from 'react';

interface IGameTopMenuProps {
  menuCallback(cmd: string, args: any): void;
}

import {
  Nav, NavDropdown, MenuItem
} from 'react-bootstrap';

/* Component for the top-level game menu. */
export default class GameTopMenu extends React.Component {

    public props: IGameTopMenuProps;

    constructor(props: IGameTopMenuProps) {
      super(props);
      this.handleSelect = this.handleSelect.bind(this);
    }

    public handleSelect(eventKey) {
      const split = eventKey.split('#');
      const cmd = split.shift();
      // console.log('eventKey: ' + eventKey);
      // console.log('cmd-type: ', cmd, split);
      this.props.menuCallback(cmd, split);
    }

    /* eventKey should match function name in parent component, and args are
     * separated by #. setXX#a#b would call parent.setXX('a', 'b') */
    public render() {
      return (
      <div className='game-top-menu'>
        <Nav activeKey='1' bsStyle='tabs' onSelect={this.handleSelect}>
          <NavDropdown eventKey='game' id='dropdown-game' title='Game' >
            <MenuItem eventKey='showScreen#StartScreen'>New</MenuItem>
            <MenuItem eventKey='showScreen#LoadScreen'>Load</MenuItem>
            <MenuItem eventKey='loadFromScript'>Load from script</MenuItem>
            <MenuItem eventKey='saveGame#saveGame'>Save</MenuItem>
            <MenuItem eventKey='importJSON'>Import JSON</MenuItem>
            <MenuItem eventKey='game-export'>Export JSON</MenuItem>
            <MenuItem eventKey='setPlayerDriver'>Load bot</MenuItem>
          </NavDropdown>
          <NavDropdown eventKey='view' id='dropdown-view' title='View' >
            <MenuItem eventKey='setViewSize#+#X'>Viewport +X</MenuItem>
            <MenuItem eventKey='setViewSize#-#X'>Viewport -X</MenuItem>
            <MenuItem eventKey='setViewSize#+#Y'>Viewport +Y</MenuItem>
            <MenuItem eventKey='setViewSize#-#Y'>Viewport -Y</MenuItem>
            <MenuItem eventKey='increaseFont#+'>Increase Font</MenuItem>
            <MenuItem eventKey='increaseFont#-'>Decrease Font</MenuItem>
            <MenuItem eventKey='useAsciiTiles'>ASCII tiles</MenuItem>
            <MenuItem eventKey='useGraphicalTiles'>Graphical tiles</MenuItem>
          </NavDropdown>
          <NavDropdown eventKey='help' id='dropdown-help' title='Help' >
            <MenuItem eventKey='showScreen#HelpScreen'>Help</MenuItem>
            <MenuItem eventKey='showScreen#ManualScreen'>Manual</MenuItem>
            <MenuItem eventKey='showScreen#AboutScreen'>About</MenuItem>
          </NavDropdown>
          <NavDropdown eventKey='plugins' id='dropdown-plugins' title='Plugin'>
            <MenuItem eventKey='loadScript'>Load script</MenuItem>
            <MenuItem eventKey='showPluginManager'>Plugin Manager</MenuItem>
          </NavDropdown>
        </Nav>
      </div>
      );
    }
}


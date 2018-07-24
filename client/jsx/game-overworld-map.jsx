
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import ModalHeader from './modal-header';
import GameBoard from './game-board';

const RG = require('../src/rg');

const Screen = require('../gui/screen');
const Modal = require('react-bootstrap-modal');
const KeyCode = require('../gui/keycode');
const Keys = require('../src/keymap');

const [owViewportX, owViewportY] = [10, 10];
const owBoardClassName = 'game-board-player-view';
const rowClass = 'cell-row-div-player-view';

/* This component shows the game overworld map in a modal. */
export default class GameOverWorldMap extends Component {

    constructor(props) {
        super(props);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.toggleScreen = this.toggleScreen.bind(this);
        this.state = {
          tabShown: 'Region'
        };
    }

  /* Don't update unless player's position has changed. */
  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.ow !== this.props.ow) {
      return true;
    }

    if (this.props.playerOwPos && nextProps.playerOwPos) {
      if (nextProps.playerOwPos[0] !== this.props.playerOwPos[0]) {
        return true;
      }
      if (nextProps.playerOwPos[1] !== this.props.playerOwPos[1]) {
        return true;
      }
    }

    if (this.state.tabShown !== nextState.tabShown) {
      return true;
    }
    return false;
  }

  /* Selects which tab is shown in the modal. */
  selectTab(tabName) {
    this.setState({tabShown: tabName});
  }

  handleKeyDown(evt) {
    const keyCode = KeyCode.getKeyCode(evt);
    if (keyCode === Keys.GUI.OwMap) {
        this.toggleScreen('OWMap');
    }
  }

  render() {
    const tabButtons = this.renderTabButtons();
    const shownTabElement = this.renderTabElement();

    return (
      <Modal
        aria-labelledby='game-overworld-map-modal-label'
        id='gameOverWorldMapModal'
        large={true}
        onHide={this.toggleScreen.bind(this, 'OWMap')}
        onKeyDown={this.handleKeyDown}
        show={this.props.showOWMap}
      >
        <ModalHeader
          id='game-overworld-map-modal-label'
          text={'Overworld'}
        />

        <div className='modal-body row'>
          <div className='col-md-8'>
            {tabButtons}
            {shownTabElement}
          </div>
        </div>

        <div className='modal-footer row'>
          <div className='col-md-4'>
            <button
              className='btn btn-secondary'
              onClick={this.toggleScreen.bind(this, 'OWMap')}
              type='button'
            >Close</button>
          </div>
        </div>

      </Modal>
    );
  }

  toggleScreen(type) {
    this.props.toggleScreen(type);
  }

  /* Returns the content to render for the tab shown inside the modal. */
  renderTabElement() {
    if (!this.props.ow) {
      return null;
    }
    else if (this.state.tabShown === 'World') {
      return this.renderWorldMap();
    }
    else {
      return this.renderRegionMap();
    }
  }

  /* Returns the element to render for the full world map. */
  renderWorldMap() {
    let mapStr = 'No map generated.';
    const map = this.props.ow.mapToString(true).slice();

    // Add player @ to the correct row, this could be done
    // more easily directly inside overworld.Map mapToString
    if (this.props.playerOwPos) {
      const [x, y] = this.props.playerOwPos;
      let line = map[y];
      line = line.substr(0, x) + '@' + line.substr(x + 1);
      map[y] = line;
    }
    mapStr = map.join('\n');
    return (
      <div>
        <pre className='game-overworld-map-pre'>
          {mapStr}
        </pre>
        <p>This map helps you to navigate in the world. It shows places
          of interest as well as the huge mountain walls blocking your
          passage.
        </p>
      </div>
    );
  }

  /* Returns a smaller region map centered on player position. */
  renderRegionMap() {
    const ow = this.props.ow;
    const map = ow.getCellList();

    let [x, y] = [null, null];
    if (this.props.playerOwPos) {
      [x, y] = this.props.playerOwPos;
      const player = new RG.Element.Marker('@');
      map.getCell(x, y).removeProps(RG.TYPE_ELEM);
      map.getCell(x, y).setProp(RG.TYPE_ELEM, player);
    }

    // Set explored cells to make them visible
    map.getCells(cell => {
      if (ow.isExplored(cell.getXY())) {
        cell.setExplored();
      }
    });

    const screen = new Screen(owViewportX, owViewportY);
    screen.renderAllVisible(x, y, map);

    const charRows = screen.getCharRows();
    const classRows = screen.getClassRows();
    const startX = screen.getStartX();

    return (
      <GameBoard
          boardClassName={owBoardClassName}
          charRows={charRows}
          classRows={classRows}
          endY={screen.endY}
          onCellClick={this.onCellClick}
          onMouseOverCell={this.onMouseOverCell}
          rowClass={rowClass}
          sizeX={2 * screen.viewportX + 1}
          startX={startX}
          startY={screen.startY}
          useRLE={false}
      />
    );

  }

  onCellClick(x, y) {
    console.log(`Clicked cell ${x},${y}`);

  }

  onMouseOverCell(x, y) {
    console.log(`Mouse over cell ${x},${y}`);
  }

  /* Returns buttons for selecting the different tabs. */
  renderTabButtons() {
    const buttonElems = (
    <ul className='modal-tab-list'>
      <button className='tab-select-button'
        onClick={this.selectTab.bind(this, 'Region')}
      >Region</button>
      <button className='tab-select-button'
        onClick={this.selectTab.bind(this, 'World')}
      >World</button>
    </ul>
    );
    return (
      <ul>
        {buttonElems}
      </ul>
    );
  }

}

GameOverWorldMap.propTypes = {
  ow: PropTypes.object,
  playerOwPos: PropTypes.array,
  showOWMap: PropTypes.bool.isRequired,
  toggleScreen: PropTypes.func.isRequired
};



import React, {Component} from 'react';
import PropTypes from 'prop-types';
import ModalHeader from './modal-header';

const Modal = require('react-bootstrap-modal');
const KeyCode = require('../gui/keycode');
const Keys = require('../src/keymap');

/* This component shows the game overworld map in a modal. */
export default class GameOverWorldMap extends Component {

    constructor(props) {
        super(props);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

  /* Don't update unless player's position has changed. */
  shouldComponentUpdate(nextProps) {
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
    return false;
  }

  handleKeyDown(evt) {
    const keyCode = KeyCode.getKeyCode(evt);
    if (keyCode === Keys.GUI.OwMap) {
        this.toggleScreen('OWMap');
    }
  }

  render() {
    let mapStr = 'No map generated.';

    if (this.props.ow) {
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
    }

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
            <pre className='game-overworld-map-pre'>
              {mapStr}
            </pre>
            <p>This map helps you to navigate in the world. It shows places
              of interest as well as the huge mountain walls blocking your
              passage.
            </p>
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

}

GameOverWorldMap.propTypes = {
  ow: PropTypes.object,
  playerOwPos: PropTypes.array,
  showOWMap: PropTypes.bool.isRequired,
  toggleScreen: PropTypes.func.isRequired
};


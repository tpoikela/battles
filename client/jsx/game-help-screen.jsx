'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import ModalHeader from './modal-header';

const RG = require('../src/rg.js');
const Modal = require('react-bootstrap-modal');
const Manual = require('../data/manual');

/* Small helper component. */
export const TextHelp = props => (
  <p>
    <span className='text-primary'>{props.char}</span>
    {'- ' + props.descr}
  </p>
);

TextHelp.propTypes = {
  char: PropTypes.string,
  descr: PropTypes.string
};

/** This component contains short info on keys and how to play the game.*/
export default class GameHelpScreen extends Component {

  shouldComponentUpdate() {
    return false;
  }

  render() {
    return (
      <Modal
          aria-labelledby='game-help-modal-label'
          id='gameHelpModal'
          large={true}
          onHide={this.toggleScreen.bind(this, 'HelpScreen')}
          show={this.props.showHelpScreen}
      >
        <ModalHeader id='game-help-modal-label' text={RG.gameTitle + 'Help'}/>
        <div className='modal-body'>
          <div className='row'>
            <div className='col-md-12'>
              <div
                dangerouslySetInnerHTML={{__html: Manual.fullText}}
                id='manual-text'
              />
            </div>
          </div>
        </div>

        <div className='modal-footer row'>
          <div className='col-md-6'>
            <button
              className='btn btn-secondary'
              onClick={this.toggleScreen.bind(this, 'HelpScreen')}
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

GameHelpScreen.propTypes = {
  showHelpScreen: PropTypes.bool.isRequired,
  toggleScreen: PropTypes.func.isRequired
};


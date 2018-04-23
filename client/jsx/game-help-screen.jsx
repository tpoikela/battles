'use strict';

/* eslint max-len: 100 */

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

const cmdDescr = [
    <TextHelp char={'> or <'} descr={'Use stairs/passage.'} key={'<>'}/>,
  <TextHelp char={'f'} descr={'Change fight mode.'} key={'f'} />,
  <TextHelp char={'h'} descr={'See next item in the cell.'} key={'h'} />,
  <TextHelp char={'H'} descr={'Show/hide help.'} key={'H'} />,
  <TextHelp char={'i'} descr={'Show inventory.'} key={'i'} />,
  <TextHelp char={'l'} descr={'Look around.'} key={'l'} />,
  <TextHelp char={'m'} descr={'Toggle the map or player view.'} key={'m'} />,
  <TextHelp char={'M'} descr={'Show overworld map.'} key={'M'} />,
  <TextHelp char={'n'} descr={'Next target (target-look).'} key={'n'} />,
  <TextHelp char={'o'} descr={'Open or close door.'} key={'o'} />,
  <TextHelp char={'p'} descr={'Use your powers.'} key={'p'} />,
  <TextHelp char={'r'} descr={'Toggle run mode (1.5 x speed).'} key={'r'} />,
  <TextHelp char={'t'} descr={'Enter targeting mode. Press again to fire.'}
    key={'t'} />,
  <TextHelp char={'u'} descr={'Use an item.'} key={'u'} />,
  <TextHelp char={','} descr={'Pick up an item.'} key={','} />,
  <TextHelp char={'.'} descr={'Rest (takes less energy than moving).'} key={'.'} />
];

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
          <div className='col-md-6'>
          </div>

          <div className='col-md-6 help-info-buttons'>
            {cmdDescr}
          </div>
        </div>
        </div>

        <div className='row' id='manual-text'>
          <div className='col-md-12'
            dangerouslySetInnerHTML={{__html: Manual.fullText}}
            />
        <div/>

        <div className='modal-footer row'>
          <div className='col-md-6'>
            <button
              className='btn btn-secondary'
              type='button'
              onClick={this.toggleScreen.bind(this, 'HelpScreen')}
            >Close</button>
          </div>
        </div>

      </Modal>
    );
  }

  toggleScreen(type) {
      this.props.toggleScreen(type);
  }

};

GameHelpScreen.propTypes = {
  showHelpScreen: PropTypes.bool.isRequired,
  toggleScreen: PropTypes.func.isRequired
};


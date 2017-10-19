'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';

/** This component contains non-game instance specific controls like starting
 * new game and changing screen size.*/
export default class GamePanel extends Component {

  constructor(props) {
    super(props);

    this.setViewSizeXPlus = this.setViewSizeXPlus.bind(this);
    this.setViewSizeXNeg = this.setViewSizeXNeg.bind(this);
    this.setViewSizeYPlus = this.setViewSizeYPlus.bind(this);
    this.setViewSizeYNeg = this.setViewSizeYNeg.bind(this);

  }

  shouldComponentUpdate() {
    return false;
  }

  setViewSizeXPlus(evt) {
    this.props.setViewSize(evt, '+', 'X');
  }

  setViewSizeXNeg(evt) {
    this.props.setViewSize(evt, '-', 'X');
  }

  setViewSizeYPlus(evt) {
    this.props.setViewSize(evt, '+', 'Y');
  }

  setViewSizeYNeg(evt) {
    this.props.setViewSize(evt, '-', 'Y');
  }

  render() {
    return (
      <div>
        <button
          className='btn btn-info'
          data-target='#gameStartModal'
          data-toggle='modal'
          id='start-button'
          onClick={this.props.showStartScreen}
        >Start</button>
        <button
          className='btn btn-info'
          data-target='#gameLoadModal'
          data-toggle='modal'
          id='load-button'
          onClick={this.props.showLoadScreen}
        >Load</button>
        <button
          className='btn btn-info'
          id='save-button'
          onClick={this.props.saveGame}
        >Save</button>
        <button
          className='btn btn-info'
          data-target='#gameHelpModal'
          data-toggle='modal'
          id='help-button'
        >Help</button>
        <button onClick={this.setViewSizeXPlus}>+X</button>
        <button onClick={this.setViewSizeXNeg}>-X</button>
        <button onClick={this.setViewSizeYPlus}>+Y</button>
        <button onClick={this.setViewSizeYNeg}>-Y</button>
      </div>
    );
  }

}

GamePanel.propTypes = {
  saveGame: PropTypes.func.isRequired,
  setViewSize: PropTypes.func.isRequired,
  showLoadScreen: PropTypes.func.isRequired,
  showStartScreen: PropTypes.func.isRequired
};


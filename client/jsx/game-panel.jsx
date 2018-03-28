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

  setViewSizeXPlus() {
    this.props.setViewSize('+', 'X');
  }

  setViewSizeXNeg() {
    this.props.setViewSize('-', 'X');
  }

  setViewSizeYPlus() {
    this.props.setViewSize('+', 'Y');
  }

  setViewSizeYNeg() {
    this.props.setViewSize('-', 'Y');
  }

  render() {
    return (
      <div>
        <button onClick={this.setViewSizeXPlus}>+X</button>
        <button onClick={this.setViewSizeXNeg}>-X</button>
        <button onClick={this.setViewSizeYPlus}>+Y</button>
        <button onClick={this.setViewSizeYNeg}>-Y</button>
      </div>
    );
  }

}

GamePanel.propTypes = {
  setViewSize: PropTypes.func.isRequired
};


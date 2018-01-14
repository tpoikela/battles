
import React, {Component} from 'react';
import PropTypes from 'prop-types';

export default class Modal extends Component {

  render() {
    return (
      <div
        aria-hidden='true'
        aria-labelledby={this.props.labelId}
        className='modal fade'
        id={this.props.id}
        role='dialog'
        tabIndex='-1'
      >
        <div className='modal-dialog modal-lg'>
          <div className='modal-content'>
            {this.props.children}
          </div>
        </div>
      </div>
    );
  }

}

Modal.propTypes = {
  id: PropTypes.string,
  labelId: PropTypes.string,
  children: PropTypes.array.isRequired
};

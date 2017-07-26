'use strict';

const React = require('react');

/* Header component for modals.*/
const ModalHeader = props => (
    <div className='modal-header'>
        <button
            aria-label='Close'
            className='close'
            data-dismiss='modal'
            type='button'
        >
            <span aria-hidden='true'>&times;</span>
        </button>
        <h4 className='modal-title' id={props.id}>{props.text}</h4>
    </div>
);

ModalHeader.propTypes = {
    id: React.PropTypes.string,
    text: React.PropTypes.string

};

module.exports = ModalHeader;

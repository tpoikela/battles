'use strict';

const React = require('react');

/* Header component for modals.*/
class ModalHeader extends React.Component {

    render() {
        var id = this.props.id;
        var text = this.props.text;
        return (
            <div className='modal-header'>
                <button
                    aria-label='Close'
                    className='close'
                    data-dismiss='modal'
                    type='button'
                    >
                    <span aria-hidden='true'>&times;</span>
                </button>
                <h4 className='modal-title' id={id}>{text}</h4>
            </div>
        );
    }

}

ModalHeader.propTypes = {
    id: React.PropTypes.string,
    text: React.PropTypes.string

};

module.exports = ModalHeader;

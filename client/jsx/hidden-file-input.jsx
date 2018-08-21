
import React from 'react';
import PropTypes from 'prop-types';

export default class HiddenFileInput extends React.Component {

    shouldComponentUpdate() {
        return false;
    }

    render() {
        return (
            <input
              id={this.props.inputId}
              onChange={this.props.onLoadScript}
              style={{display: 'none'}}
              type='file'
            />
        );
    }

}

HiddenFileInput.propTypes = {
    inputId: PropTypes.string,
    onLoadScript: PropTypes.func.required
};

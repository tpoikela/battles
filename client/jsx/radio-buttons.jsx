
import React, {Component} from 'react';
import PropTypes from 'prop-types';

/** Can be used to create radio buttons for different types of selections.
 * Callback must be given, and the button name is passed into this callback.*/
export default class RadioButtons extends Component {

    constructor(props) {
        super(props);
        this.onButtonClick = this.onButtonClick.bind(this);
    }

    onButtonClick(name) {
        this.props.callback(name);
    }

    shouldComponentUpdate(nextProps) {
        if (nextProps.currValue !== this.props.currValue) {
            return true;
        }
        return false;
    }

    render() {
        const currValue = this.props.currValue;
        const buttons = this.props.buttons;

        // Generate buttons using map
        const buttonList = buttons.map( (name, index) => {
            let classes = 'btn btn-primary';
            if (currValue === name) {
                classes = 'btn btn-success active';
            }

            return (
                <button
                    className={classes}
                    key={index}
                    onClick={this.onButtonClick.bind(this, name)}
                >
                    {name}
                </button>
            );
        });

        return (
            <div className='radio-buttons btn-group'>
                <label
                    className='select-label btn text-primary'
                >
                    {this.props.titleName}</label>
                {buttonList}
            </div>
        );
    }

}

RadioButtons.propTypes = {
    buttons: PropTypes.array,
    callback: PropTypes.func,
    currValue: PropTypes.string,
    titleName: PropTypes.string
};


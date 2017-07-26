
const React = require('react');

/** Can be used to create radio buttons for different types of selections.
 * Callback must be given, and the button name is passed into this callback.*/
class RadioButtons extends React.Component {

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
        console.log('Will not render the component RadioButtons');
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
    buttons: React.PropTypes.array,
    callback: React.PropTypes.func,
    currValue: React.PropTypes.string,
    titleName: React.PropTypes.string
};

module.exports = RadioButtons;

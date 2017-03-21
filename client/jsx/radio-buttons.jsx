
const React = require('react');

/** Can be used to create radio buttons for different types of selections.
 * Callback must be given, and the button name is passed into this callback.*/
class RadioButtons extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            activeButton: ''
        };

        this.onButtonClick = this.onButtonClick.bind(this);

    }

    onButtonClick(name) {
        this.props.callback(name);
        this.setState({activeButton: name});
    }

    render() {
        var buttons = this.props.buttons;

        // Generate buttons using map
        var buttonList = buttons.map( (name, index) => {

            var classes = 'btn btn-primary';
            if (this.state.activeButton === name) {
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
    titleName: React.PropTypes.string
};

module.exports = RadioButtons;

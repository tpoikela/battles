
import * as React from 'react';

interface IRadioButtonsProps {
    buttons: string[];
    currValue: string;
    titleName: string;
    callback(any): void;
}

/* Can be used to create radio buttons for different types of selections.
 * Callback must be given, and the button name is passed into this callback.*/
export default class RadioButtons extends React.Component {

    public props: IRadioButtonsProps;

    constructor(props: IRadioButtonsProps ) {
        super(props);
        this.onButtonClick = this.onButtonClick.bind(this);
    }

    public onButtonClick(name) {
        this.props.callback(name);
    }

    public shouldComponentUpdate(nextProps) {
        if (nextProps.currValue !== this.props.currValue) {
            return true;
        }
        return false;
    }

    public render() {
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


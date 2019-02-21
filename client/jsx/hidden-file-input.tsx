
import * as React from 'react';

interface IHiddenFileInputProps {
    inputId: string;
    onLoadScript(): void;
}

export default class HiddenFileInput extends React.Component {

    public props: IHiddenFileInputProps;

    public shouldComponentUpdate() {
        return false;
    }

    public render() {
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


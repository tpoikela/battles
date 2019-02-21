
import * as React from 'react';

interface IDropdownSelectProps {
  id?: string;
  options: string[];
  callback: (any) => void;
  currValue: string;
  titleName: string;
}


export default class DropdownSelect extends React.Component {
  public props: IDropdownSelectProps;

  constructor(props: IDropdownSelectProps) {
    super(props);
    this.onChange = this.onChange.bind(this);
  }

  public render() {
    const id = this.props.id || `select-id-${this.props.titleName}`;
    const optElems = this.getOptElems();
    return (
      <label>{this.props.titleName}
        <select
          id={this.props.id}
          name={`name-${this.props.titleName}`}
          onChange={this.onChange}
          value={this.props.currValue}
        >{optElems}
        </select>
      </label>
    );
  }

  private onChange(evt) {
    const value = evt.target.value;
    this.props.callback(value);
  }

  private getOptElems() {
    if (!this.props.options) {return null;}

    return this.props.options.map(opt => {
      const key = `key-${this.props.titleName}-${opt}`;
      return (
        <option key={key} value={opt}>{opt}</option>
      );
    });
  }

}


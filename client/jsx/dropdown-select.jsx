
import React, {Component} from'react';

export default class DropdownSelect extends Component {

  constructor(props) {
    super(props);
    this.onChange = this.onChange.bind(this);
  }

  onChange(evt) {
    const value = evt.target.value;
    this.props.callback(value);
  }

  render() {
    const optElems = this.getOptElems();
    return (
      <label>{this.props.titleName}
        <select
          name={`name-${this.props.titleName}`}
          onChange={this.onChange}
          value={this.props.currValue}
        >{optElems}
        </select>
      </label>
    );
  }

  getOptElems() {
    return this.props.options.map(opt => {
      const key = `key-${this.props.titleName}-${opt}`;
      return (
        <option key={key} value={opt}>{opt}</option>
      );
    });
  }

}

DropdownSelect.propTypes = {
  options: React.PropTypes.array,
  callback: React.PropTypes.func,
  currValue: React.PropTypes.string,
  titleName: React.PropTypes.string
};


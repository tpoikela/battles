
import React, {Component} from 'react';
import PropTypes from 'prop-types';

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
          id={this.props.id}
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
  id: PropTypes.string,
  options: PropTypes.array,
  callback: PropTypes.func,
  currValue: PropTypes.string,
  titleName: PropTypes.string
};


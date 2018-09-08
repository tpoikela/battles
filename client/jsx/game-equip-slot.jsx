
import React, {Component} from 'react';
import PropTypes from 'prop-types';

const RG = require('../src/rg');

/** Component for one equipment slot.*/
export default class GameEquipSlot extends Component {

  constructor(props) {
    super(props);
    this.setEquipSelected = this.setEquipSelected.bind(this);
  }

  setEquipSelected() {
    if (this.props.item !== null) {
      const selection = {
        slotName: this.props.slotName,
        slotNumber: this.props.slotNumber,
        item: this.props.item
      };
      this.props.setEquipSelected(selection);
    }
  }

  render() {
    const slotName = this.props.slotName;
    const item = this.props.item;
    let msg = 'Empty';
    let className = 'inv-equip-slot';
    if (item !== null) {
      msg = item.toString();
      className += ' ' + RG.getCssClass(RG.TYPE_ITEM, item.getName());
    }
    return (
      <div
        className={className}
        onClick={this.setEquipSelected}
      >{slotName} {msg}</div>
    );
  }

}

GameEquipSlot.propTypes = {
  setEquipSelected: PropTypes.func,
  slotName: PropTypes.string,
  item: PropTypes.object,
  slotNumber: PropTypes.number
};

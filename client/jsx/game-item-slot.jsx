
import React, {Component} from 'react';
import PropTypes from 'prop-types';

const RG = require('../src/rg');

/** Component stores one item, renders its description and selects it if
 * clicked.*/
export default class GameItemSlot extends Component {

  constructor(props) {
    super(props);
    this.setSelectedItem = this.setSelectedItem.bind(this);
  }

  setSelectedItem() {
    this.props.setSelectedItem(this.props.item);
  }

  render() {
    const item = this.props.item;
    const itemString = item.toString();
    const name = item.getName();
    const className = 'inv-item-slot ' + RG.getCssClass(RG.TYPE_ITEM, name);
    return (
        <div
            className={className}
            onClick={this.setSelectedItem}
        >{itemString}
        </div>
    );
  }

}

GameItemSlot.propTypes = {
  setSelectedItem: PropTypes.func,
  item: PropTypes.object
};

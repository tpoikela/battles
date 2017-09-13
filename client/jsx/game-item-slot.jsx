
import React, {Component} from 'react';
import PropTypes from 'prop-types';

/** Component stores one item, renders its description and selects it if
 * clicked.*/
export default class GameItemSlot extends Component {

  setSelectedItem() {
    this.props.setSelectedItem(this.props.item);
  }

  render() {
    const item = this.props.item;
    const itemString = item.toString();
    return (
      <div className='inv-item-slot' onClick={this.setSelectedItem}>{itemString}</div>
    );
  }

};

GameItemSlot.propTypes = {
  setSelectedItem: PropTypes.func,
  item: PropTypes.object
};

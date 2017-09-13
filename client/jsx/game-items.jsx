
import React, {Component} from 'react';
import PropTypes from 'prop-types';

import GameItemSlot from './game-item-slot';

/** Component which shows the inventory items.*/
export default class GameItems extends Component {

  render() {
    const inv = this.props.inv;
    const items = [];
    const setSelectedItem = this.props.setSelectedItem;
    let totalWeight = inv.getWeight() + this.props.eqWeight;
    totalWeight = totalWeight.toFixed(2);
    const maxWeight = this.props.maxWeight;

    let item = inv.first();
    let key = 0;

    while (item !== null && typeof item !== 'undefined') {
      items.push(<GameItemSlot
        item={item}
        key={key}
        setSelectedItem={setSelectedItem}
      />);
      item = inv.next();
      ++key;
    }

    return (
      <div>
        <p>Items: {totalWeight} kg (max {maxWeight} kg)</p>
        {items}
      </div>
    );
  }

}

GameItems.propTypes = {
  inv: PropTypes.object,
  setSelectedItem: PropTypes.func.isRequired,
  maxWeight: PropTypes.number,
  eqWeight: PropTypes.number
};


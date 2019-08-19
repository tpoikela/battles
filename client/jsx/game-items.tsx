
import * as React from 'react';

import GameItemSlot from './game-item-slot';
import * as Item from '../src/item';

interface IGameItemsProps {
  eqWeight: number;
  filter: string;
  inv: Item.Container;
  maxWeight: number;
  setSelectedItem: (item: Item.ItemBase) => void;
}


/* Component which shows the inventory items.*/
export class GameItems extends React.Component {

  public props: IGameItemsProps;

  public render() {
    const inv = this.props.inv;
    const filter = this.props.filter;
    const items: any = [];
    const setSelectedItem = this.props.setSelectedItem;

    const totalWeight = inv.getWeight() + this.props.eqWeight;
    const totalWeightStr = totalWeight.toFixed(2);
    const maxWeight = this.props.maxWeight;

    let item = inv.first();
    let key = 0;

    while (item !== null && typeof item !== 'undefined') {
      if (filter === 'All' || item.getType() === filter) {
        items.push(<GameItemSlot
          item={item}
          key={key}
          setSelectedItem={setSelectedItem}
        />);
      }
      item = inv.next();
      ++key;
    }

    return (
      <div>
        <p>Items: {totalWeightStr} kg (max {maxWeight} kg)</p>
        {items}
      </div>
    );
  }

}


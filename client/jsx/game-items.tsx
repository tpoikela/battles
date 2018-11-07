
import * as React from 'react';

import GameItemSlot from './game-item-slot';

interface IGameItemsProps {
  eqWeight: number;
  filter: string;
  inv: any;
  maxWeight: number;
  setSelectedItem(): void;
}


/* Component which shows the inventory items.*/
export default class GameItems extends Component {

  public props: IGameItemsProps;

  public render() {
    const inv = this.props.inv;
    const filter = this.props.filter;
    const items = [];
    const setSelectedItem = this.props.setSelectedItem;
    let totalWeight = inv.getWeight() + this.props.eqWeight;
    totalWeight = totalWeight.toFixed(2);
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
        <p>Items: {totalWeight} kg (max {maxWeight} kg)</p>
        {items}
      </div>
    );
  }

}



import * as React from 'react';

import GameItemSlot from './game-item-slot';
import * as Item from '../src/item';

type ItemBase = import('../src/item').ItemBase;

interface IGameItemsProps {
  eqWeight: number;
  filter: string;
  inv: Item.Container | ItemBase[];
  maxWeight: number;
  setSelectedItem: (item: Item.ItemBase) => void;
  textToShow?: string;
}

interface ItemLike {
  getType(): string;
}


/* Component which shows the inventory items.*/
export class GameItems extends React.Component {

  public props: IGameItemsProps;

  public render() {
    const inv = this.props.inv;
    const filter = this.props.filter;
    const items: any = [];
    const setSelectedItem = this.props.setSelectedItem;

    let totalWeight = 0;
    if ((inv as any).getWeight) {
      totalWeight = (inv as any).getWeight() + this.props.eqWeight;
    }
    const totalWeightStr = totalWeight.toFixed(2);
    const maxWeight = this.props.maxWeight;

    let item = null;
    if ((inv as any).first) item = (inv as any).first();
    else item = inv as any[0];

    let key = 0;

    if ((inv as any).next) {
      while (item !== null && typeof item !== 'undefined') {
        if (filter === 'All' || item.getType() === filter) {
          items.push(<GameItemSlot
            item={item}
            key={key}
            setSelectedItem={setSelectedItem}
          />);
        }
        item = (inv as any).next();
        ++key;
      }
    }
    else {
      (inv as any).forEach(item => {
        if (filter === 'All' || item.getType() === filter) {
          items.push(<GameItemSlot
            item={item}
            key={key}
            setSelectedItem={setSelectedItem}
          />);
        }
        ++key;
      });
    }

    return (
      <div>
        {(this.props.maxWeight >= 0) &&
        <p>Items: {totalWeightStr} kg (max {maxWeight} kg)</p>
        }
        {(this.props.maxWeight === -1) &&
        <p>{this.props.textToShow}</p>
        }
        {items}
      </div>
    );
  }

}


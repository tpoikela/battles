
import * as React from 'react';
const RG = require('../src/rg');
const Item = require('../src/item');

interface IGameItemSlotProps {
  item: Item.Base;
  setSelectedItem(item: Item.Base): void;
}

/* Component stores one item, renders its description and selects it if
 * clicked.*/
export default class GameItemSlot extends React.Component {

  public props: IGameItemSlotProps;

  constructor(props: IGameItemSlotProps) {
    super(props);
    this.setSelectedItem = this.setSelectedItem.bind(this);
  }

  public setSelectedItem() {
    this.props.setSelectedItem(this.props.item);
  }

  public render() {
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


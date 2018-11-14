
import * as React from 'react';
import RG from '../src/rg';
import * as Item from '../src/item';

interface IGameItemSlotProps {
  item: Item.ItemBase;
  setSelectedItem(item: Item.ItemBase): void;
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


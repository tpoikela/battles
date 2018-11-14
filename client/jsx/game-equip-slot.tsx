
import * as React from 'react';
import RG from '../src/rg';
import * as Item from '../src/item';

interface ISelection {
    slotName: string;
    slotNumber: number;
    item: Item.ItemBase;
}

interface IGameEquipSlotProps {
  slotName: string;
  item: Item.ItemBase;
  slotNumber: number;
  setEquipSelected(selection: ISelection): void;
}

/* Component for one equipment slot.*/
export default class GameEquipSlot extends React.Component {

  public props: IGameEquipSlotProps;

  constructor(props: IGameEquipSlotProps) {
    super(props);
    this.setEquipSelected = this.setEquipSelected.bind(this);
  }

  public setEquipSelected() {
    if (this.props.item !== null) {
      const selection: ISelection = {
        item: this.props.item,
        slotName: this.props.slotName,
        slotNumber: this.props.slotNumber,
      };
      this.props.setEquipSelected(selection);
    }
  }

  public render() {
    const slotName: string = this.props.slotName;
    const item: Item.ItemBase = this.props.item;
    let msg: string = 'Empty';
    let className: string = 'inv-equip-slot';
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


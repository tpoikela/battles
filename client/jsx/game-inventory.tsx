
import * as React from 'react';
import Modal from 'react-bootstrap-modal';
import ModalHeader from './modal-header';
import GameItems from './game-items';
import GameEquipment from './game-equipment';

import RG from '../src/rg';
import {KeyCode} from '../gui/keycode';
import {ItemBase} from '../src/item';
import {ISelection} from "./game-equip-slot";
import {Keys} from '../src/keymap';

interface IGameInventoryProps {
  // count: number;
  doInvCmd: (cmd: any) => void;
  eq: any;
  equipSelected: any;
  handleKeyDown: (evt: any) => void;
  inv: any;
  invMsg: string;
  maxWeight: number;
  msgStyle: string;
  player: any;
  selectEquipTop: (selection: ISelection) => void;
  selectItemTop: (item: ItemBase) => void;
  selectedItem: any;
  setInventoryMsg: (msg: any) => void;
  showInventory: boolean;
  toggleScreen: (type: string) => void;
}

interface IGameInventoryState {
    count: string;
    filter: string;
}


/* Component renders the player inventory.*/
export default class GameInventory extends React.Component {

  public props: IGameInventoryProps;
  public state: IGameInventoryState;;

  constructor(props: IGameInventoryProps) {
    super(props);
    this.dropItem = this.dropItem.bind(this);
    this.equipItem = this.equipItem.bind(this);
    this.unequipItem = this.unequipItem.bind(this);
    this.useItem = this.useItem.bind(this);
    this.setSelectedItem = this.setSelectedItem.bind(this);
    this.setEquipSelected = this.setEquipSelected.bind(this);
    this.onChangeCount = this.onChangeCount.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.state = {
        count: '1',
        filter: 'All'
    };
  }

  handleKeyDown(evt) {
      const keyCode = KeyCode.getKeyCode(evt);
      if (keyCode === Keys.GUI.Inv) {
          this.toggleScreen('Inventory');
      }
      else if (Keys.KeyMap.isConfirmYes(keyCode)) {
          // Delegate to parent
          this.props.handleKeyDown(evt);
      }
  }

  onChangeCount(evt) {
    const value = evt.target.value;
    this.setState({count: value});
  }

  getCount() {
    const count = parseInt(this.state.count, 10);
    if (Number.isInteger(count)) {
      if (count > 0) {
        return count;
      }
    }
    return 1;
  }

  /* Called when "Drop" is clicked. Drops item to the ground.*/
  dropItem() {
    if (this.props.selectedItem !== null) {
      const cmd = RG.getDropCmd(this.props.selectedItem, this.getCount());
      cmd.callback = function(obj) {
        let msgStyle = 'text-success';
        if (!obj.result) {
          msgStyle = 'text-danger';
        }
        this.props.setInventoryMsg(
          {invMsg: obj.msg, msgStyle: msgStyle});
        this.props.selectItemTop(null);
      }.bind(this);
      this.props.doInvCmd(cmd);
    }
    else {
      this.props.setInventoryMsg(
        {invMsg: 'No item selected for dropping!',
          msgStyle: 'text-danger'});
    }
  }

  /* When "Equip" is clicked, equips the selected item, if any.*/
  equipItem() {
    const item = this.props.selectedItem;
    if (item !== null) {
      const cmd = RG.getEquipCmd(this.props.selectedItem, this.getCount());

      cmd.callback = function(obj) {
        let msgStyle = 'text-success';
        if (!obj.result) {
          msgStyle = 'text-danger';
        }
        this.props.setInventoryMsg(
          {invMsg: obj.msg, msgStyle: msgStyle});
        this.props.selectItemTop(null);
      }.bind(this);

      this.props.doInvCmd(cmd);
    }
    else {
      this.props.setInventoryMsg(
        {invMsg: 'No item selected for equipping!',
          msgStyle: 'text-danger'});
    }
  }

  /* Called when "Remove" button is clicked to remove an equipped item.*/
  unequipItem() {
    if (this.props.equipSelected) {
      const name = this.props.equipSelected.slotName;
      const slotNumber = this.props.equipSelected.slotNumber;
      const cmd = RG.getUnequipCmd(name, slotNumber, this.getCount());

      cmd.callback = function(obj) {
        let msgStyle = 'text-success';
        if (!obj.result) {
          msgStyle = 'text-danger';
        }
        this.props.setInventoryMsg(
          {invMsg: obj.msg, msgStyle: msgStyle});
        this.props.selectEquipTop(null);
      }.bind(this);

      this.props.doInvCmd(cmd);
    }
    else {
      this.props.setInventoryMsg({invMsg: 'No equipment selected!',
        msgStyle: 'text-danger'});
    }
  }

  /* Called when Use button is clicked. If an item is selected, uses that
   * item. */
  useItem() {
    const item = this.props.selectedItem;
    if (!RG.isNullOrUndef([item])) {

      const target = this.props.player.getCell();
      const cmd = RG.getUseCmd(item, target);

      cmd.callback = function(obj) {
        let msgStyle = 'text-success';
        if (!obj.result) {
          msgStyle = 'text-danger';
        }
        this.props.setInventoryMsg(
          {invMsg: obj.msg, msgStyle: msgStyle});
        if (item.has('OneShot')) {
          this.props.selectItemTop(null);
        }
      }.bind(this);
      this.props.doInvCmd(cmd);
    }
    else {
      this.props.setInventoryMsg(
        {invMsg: 'You must choose item to use!',
          msgStyle: 'text-danger'});
    }
  }

  /* When an item is clicked, selects it and adds count to the <input> */
  setSelectedItem(item) {
    const msg = 'Inventory Selected: ' + item.toString();
    this.props.selectItemTop(item);
    this.props.setInventoryMsg({invMsg: msg, msgStyle: 'text-info'});
    this.setState({count: item.getCount()});
  }

  setEquipSelected(selection: ISelection) {
    const msg = 'Equipment Selected: ' + selection.item.toString();
    this.props.selectEquipTop(selection);
    this.props.setInventoryMsg({invMsg: msg, msgStyle: 'text-info'});
    this.setState({count: selection.item.getCount()});
  }

  render() {
    const inv = this.props.inv;
    const eq = this.props.eq;
    const maxWeight = this.props.maxWeight;
    const eqWeight = eq.getWeight();

    const isMasterEquipper = this.props.player.has('MasterEquipper');

    const activebuttonClass = 'btn btn-secondary';
    const disabledButtonClass = 'btn btn-secondary disabled';

    const onlyItemSelected = this.props.selectedItem
      && this.props.equipSelected === null;

    const dropButtonClass = onlyItemSelected
      ? activebuttonClass : disabledButtonClass;
    const equipButtonClass = onlyItemSelected
      ? activebuttonClass : disabledButtonClass;
    const unequipButtonClass = this.props.equipSelected
      ? activebuttonClass : disabledButtonClass;
    const useButtonClass = this.props.selectedItem
      ? activebuttonClass : disabledButtonClass;

    const useButtonText = this.getUseButtonText();
    const itemTabs = this.getItemTabs(inv);

    return (
      <Modal
          aria-labelledby='inventory-modal-label'
          id='inventoryModal'
          large={true}
          onHide={this.toggleScreen.bind(this, 'Inventory')}
          onKeyPress={this.handleKeyDown}
          show={this.props.showInventory}
      >
        <ModalHeader id='inventory-modal-label' text='Inventory'/>
        <div className='modal-body row'>

          <div className='items-box col-md-6'>
            {itemTabs}
            <GameItems
              eqWeight={eqWeight}
              filter={this.state.filter}
              inv={inv}
              maxWeight={maxWeight}
              setSelectedItem={this.setSelectedItem}
            />
          </div>

          <div className='col-md-6' id='equipment-box'>
            <GameEquipment
              eq={eq}
              isMasterEquipper={isMasterEquipper}
              setEquipSelected={this.setEquipSelected}
            />
          </div>

        </div>

        <div className='modal-footer row'>
          <div className='col-md-6'>
            <p className={this.props.msgStyle}>{this.props.invMsg}</p>
            <div>Count:
              <input onChange={this.onChangeCount} value={this.state.count} />
            </div>
          </div>

          <div className='col-md-6'>
            <button
              className={dropButtonClass}
              onClick={this.dropItem}
              type='button'
            >Drop</button>
            <button
              className={equipButtonClass}
              onClick={this.equipItem}
              type='button'
            >Equip</button>
            <button
              className={unequipButtonClass}
              onClick={this.unequipItem}
              type='button'
            >Remove</button>
            <button
              className={useButtonClass}
              onClick={this.useItem}
              type='button'
            >{useButtonText}</button>
            <button
                className='btn btn-danger'
                onClick={this.toggleScreen.bind(this, 'Inventory')}
                type='button'
            >Close
            </button>
          </div>

        </div>
      </Modal>
    );
  }

  getItemTabs(inv) {
      const types = {All: true};
      inv.getItems().forEach(item => {
          types[item.getType()] = true;
      });
      const tabNames = Object.keys(types);
      const tabElems = tabNames.map(name => {
          let className = 'btn btn-secondary';
          if (this.state.filter === name) {
              className = 'btn btn-primary';
          }
          return (
              <button
                className={className}
                key={name}
                onClick={this.filterItems.bind(this, name)}
              >{name}</button>
          );
      });
      return (
          <ul>{tabElems}</ul>
      );
  }

  toggleScreen(type) {
      this.props.toggleScreen(type);
  }

  filterItems(type) {
      this.setState({filter: type});
  }

  getUseButtonText() {
    if (this.props.selectedItem) {
      const type = this.props.selectedItem.getType();
      if (type === 'food') {return 'Eat';}
      if (type === 'potion') {return 'Drink';}
    }
    return 'Use';

  }

}

/* eslint-enable */

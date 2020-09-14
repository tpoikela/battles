
import * as React from 'react';
import Modal from 'react-bootstrap-modal';
import ModalHeader from './modal-header';
import {GameItems} from './game-items';
import {GameEquipment} from './game-equipment';

import RG from '../src/rg';
import {KeyCode} from '../gui/keycode';
import {ItemBase} from '../src/item';
import {ISelection} from './game-equip-slot';
import {Keys} from '../src/keymap';

// type Inventory = import('../src/inv').Inventory;
type Equipment = import('../src/equipment').Equipment;
type Container = import('../src/item').Container;
type SentientActor = import('../src/actor').SentientActor;


interface IGameInventoryProps {
  // count: number;
  doInvCmd: (cmd: any) => void;
  equipSelected: any;
  handleKeyDown: (evt: any) => void;
  invMsg: string;
  msgStyle: string;
  player: SentientActor;
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

const ACTIVE_BTN_CLASS = 'btn btn-secondary';
const DISABLED_BTN_CLASS = 'btn btn-secondary disabled';

/* Component renders the player inventory.*/
export default class GameInventory extends React.Component {

  public props: IGameInventoryProps;
  public state: IGameInventoryState;

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

  public handleKeyDown(evt): void {
      const keyCode = KeyCode.getKeyCode(evt);
      if (keyCode === Keys.GUI.Inv) {
          this.toggleScreen('Inventory');
      }
      else if (Keys.KeyMap.isConfirmYes(keyCode)) {
          // Delegate to parent
          this.props.handleKeyDown(evt);
      }
  }

  public onChangeCount(evt): void {
    const value = evt.target.value;
    this.setState({count: value});
  }

  public getCount(): number {
    const count = parseInt(this.state.count, 10);
    if (Number.isInteger(count)) {
      if (count > 0) {
        return count;
      }
    }
    return 1;
  }

  /* Called when "Drop" is clicked. Drops item to the ground.*/
  public dropItem(): void {
    if (this.props.selectedItem !== null) {
      const cmd = RG.getDropCmd(this.props.selectedItem, this.getCount());
      cmd.callback = (obj: any): void => {
        let msgStyle = 'text-success';
        if (!obj.result) {
          msgStyle = 'text-danger';
        }
        this.props.setInventoryMsg(
          {invMsg: obj.msg, msgStyle});
        this.props.selectItemTop(null);
      };
      this.props.doInvCmd(cmd);
    }
    else {
      this.props.setInventoryMsg(
        {invMsg: 'No item selected for dropping!',
          msgStyle: 'text-danger'});
    }
  }

  /* When "Equip" is clicked, equips the selected item, if any.*/
  public equipItem(): void {
    const item = this.props.selectedItem;
    if (item !== null) {
      const cmd = RG.getEquipCmd(this.props.selectedItem, this.getCount());

      cmd.callback = function(obj) {
        let msgStyle = 'text-success';
        if (!obj.result) {
          msgStyle = 'text-danger';
        }
        this.props.setInventoryMsg(
          {invMsg: obj.msg, msgStyle});
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
  public unequipItem(): void {
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
          {invMsg: obj.msg, msgStyle});
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
  public useItem(): void {
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
          {invMsg: obj.msg, msgStyle});
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
  public setSelectedItem(item: ItemBase): void {
    const msg = 'Inventory Selected: ' + item.toString();
    this.props.selectItemTop(item);
    this.props.setInventoryMsg({invMsg: msg, msgStyle: 'text-info'});
    this.setState({count: item.getCount()});
  }

  public setEquipSelected(selection: ISelection): void {
    if (selection.item) {
      const msg = 'Equipment Selected: ' + selection.item.toString();
      this.props.selectEquipTop(selection);
      this.props.setInventoryMsg({invMsg: msg, msgStyle: 'text-info'});
      this.setState({count: selection.item.getCount()});
    }
  }

  public render() {
    const {player} = this.props;
    const inv = player.getInvEq().getInventory();
    const eq: Equipment = player.getInvEq().getEquipment();
    const maxWeight = player.getMaxWeight();
    const eqWeight = eq.getWeight();

    const isMasterEquipper = player.has('MasterEquipper');

    const itemTabs = this.getItemTabs(inv);
    const itemButtons = this.getItemButtons();
    const equipButtons = this.getEquipButtons();

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
            {equipButtons}
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
          </div>

          <div className='col-md-6'>
            {itemButtons}
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

  public getItemTabs(inv: Container) {
      const types: {[key: string]: boolean} = {All: true};
      inv.getItems().forEach((item: ItemBase) => {
          types[item.getType()] = true;
      });
      const tabNames = Object.keys(types);
      const tabElems = tabNames.map(name => {
          let className = 'btn btn-secondary btn-sm';
          if (this.state.filter === name) {
              className = 'btn btn-primary btn-sm';
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

  public getItemButtons() {
    const isItemSelected = this.props.selectedItem;

    const dropButtonClass = isItemSelected
      ? ACTIVE_BTN_CLASS : DISABLED_BTN_CLASS;
    const equipButtonClass = isItemSelected
      ? ACTIVE_BTN_CLASS : DISABLED_BTN_CLASS;
    const useButtonClass = isItemSelected
      ? ACTIVE_BTN_CLASS : DISABLED_BTN_CLASS;
    const useButtonText = this.getUseButtonText();
    return (
      <React.Fragment>
        <button
          className={equipButtonClass}
          onClick={this.equipItem}
          type='button'
        >Equip</button>
        <button
          className={useButtonClass}
          onClick={this.useItem}
          type='button'
        >{useButtonText}</button>
        <button
          className={dropButtonClass}
          onClick={this.dropItem}
          type='button'
        >Drop</button>
        <label>Count:
          <input onChange={this.onChangeCount} value={this.state.count} />
        </label>
      </React.Fragment>
    );
  }

  public getEquipButtons() {
    const unequipButtonClass = this.props.equipSelected
      ? ACTIVE_BTN_CLASS : DISABLED_BTN_CLASS;
    return (
      <React.Fragment>
        <button
        className={unequipButtonClass}
        onClick={this.unequipItem}
        type='button'
        >Remove</button>
      </React.Fragment>
    );
  }


  public toggleScreen(type: string): void {
      this.props.toggleScreen(type);
  }

  public filterItems(type: string): void {
      this.setState({filter: type});
  }

  public getUseButtonText(): string {
    if (this.props.selectedItem) {
      const type = this.props.selectedItem.getType();
      if (type === 'food') {return 'Eat';}
      if (type === 'potion') {return 'Drink';}
    }
    return 'Use';
  }

}

/* eslint-enable */

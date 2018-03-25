'use strict';

import React, {Component} from 'react';
import ModalHeader from './modal-header';
import GameItems from './game-items';
import GameEquipment from './game-equipment';
import PropTypes from 'prop-types';

const RG = require('../src/rg');
const Modal = require('react-bootstrap-modal');

/** Component renders the player inventory.*/
export default class GameInventory extends Component {

  constructor(props) {
    super(props);
    this.dropItem = this.dropItem.bind(this);
    this.equipItem = this.equipItem.bind(this);
    this.unequipItem = this.unequipItem.bind(this);
    this.useItem = this.useItem.bind(this);
    this.setSelectedItem = this.setSelectedItem.bind(this);
    this.setEquipSelected = this.setEquipSelected.bind(this);
    this.onChangeCount = this.onChangeCount.bind(this);
    this.state = {
      count: 0
    };
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

  setSelectedItem(item) {
    const msg = 'Inventory Selected: ' + item.toString();
    this.props.selectItemTop(item);
    this.props.setInventoryMsg({invMsg: msg, msgStyle: 'text-info'});
    this.setState({count: item.count});
  }

  setEquipSelected(selection) {
    const msg = 'Equipment Selected: ' + selection.item.toString();
    this.props.selectEquipTop(selection);
    this.props.setInventoryMsg({invMsg: msg, msgStyle: 'text-info'});
    this.setState({count: selection.item.count});
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

    return (
      <Modal
          aria-labelledby='inventory-modal-label'
          id='inventoryModal'
          large={true}
          onHide={this.toggleScreen.bind(this, 'Inventory')}
          show={this.props.showInventory}
      >
        <ModalHeader id='inventory-modal-label' text='Inventory'/>
        <div className='modal-body row'>

          <div className='items-box col-md-6'>
            <GameItems
              eqWeight={eqWeight}
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

  toggleScreen(type) {
      this.props.toggleScreen(type);
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

GameInventory.propTypes = {
  doInvCmd: PropTypes.func.isRequired,
  eq: PropTypes.object,
  equipSelected: PropTypes.object,
  inv: PropTypes.object,
  invMsg: PropTypes.string.isRequired,
  maxWeight: PropTypes.number,
  msgStyle: PropTypes.string.isRequired,
  player: PropTypes.object,
  selectEquipTop: PropTypes.func.isRequired,
  selectItemTop: PropTypes.func.isRequired,
  selectedItem: PropTypes.object,
  setInventoryMsg: PropTypes.func.isRequired,
  showInventory: PropTypes.bool.isRequired,
  toggleScreen: PropTypes.func.isRequired
};
/* eslint-enable */

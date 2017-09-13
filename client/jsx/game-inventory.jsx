'use strict';

import React, {Component} from 'react';
import ModalHeader from './modal-header';
import GameItems from './game-items';
import GameEquipment from './game-equipment';
import PropTypes from 'prop-types';

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
  }

  /* Called when "Drop" is clicked. Drops item to the ground.*/
  dropItem() {
    if (this.props.selectedItem !== null) {
      const cmd = {cmd: 'drop', item: this.props.selectedItem};
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
      const cmd = {cmd: 'equip', item: this.props.selectedItem};
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
    if (this.props.equipSelected !== null) {
      const name = this.props.equipSelected.slotName;
      const cmd = {cmd: 'unequip', slot: name};
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
    if (this.props.selectedItem !== null) {
      const cmd = {cmd: 'use', item: this.props.selectedItem,
        target: this.props.player.getCell()};
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
        {invMsg: 'You must choose item to use!',
          msgStyle: 'text-danger'});
    }
  }

  setSelectedItem(item) {
    const msg = 'Inventory Selected: ' + item.toString();
    this.props.selectItemTop(item);
    this.props.setInventoryMsg({invMsg: msg, msgStyle: 'text-info'});
  }

  setEquipSelected(selection) {
    const msg = 'Equipment Selected: ' + selection.item.toString();
    this.props.selectEquipTop(selection);
    this.props.setInventoryMsg({invMsg: msg, msgStyle: 'text-info'});
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

    /* eslint-disable */
    return (
      <div className='modal fade' role='dialog' id='inventoryModal' tabIndex='-1' role='dialog' aria-labelledby='inventory-modal-label' aria-hidden='true'>
        <div className='modal-dialog modal-lg'>
          <div className='modal-content'>
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

              <div id='equipment-box' className='col-md-6'>
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
                <button type='button' className={dropButtonClass} onClick={this.dropItem}>Drop</button>
                <button type='button' className={equipButtonClass} onClick={this.equipItem}>Equip</button>
                <button type='button' className={unequipButtonClass} onClick={this.unequipItem}>Remove</button>
                <button type='button' className={useButtonClass} onClick={this.useItem}>Use</button>
                <button type='button' className='btn btn-danger' data-dismiss='modal'>Close</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

};

GameInventory.applypropTypes = {
  doInvCmd: PropTypes.func.isRequired,
  equipSelected: PropTypes.object,
  player: PropTypes.object,
  invMsg: PropTypes.string.isRequired,
  msgStyle: PropTypes.string.isRequired,
  setInventoryMsg: PropTypes.func.isRequired,
  selectedItem: PropTypes.object,
  selectItemTop: PropTypes.func.isRequired,
  selectEquipTop: PropTypes.func.isRequired,
  inv: PropTypes.object,
  eq: PropTypes.object,
  maxWeight: PropTypes.number
};
/* eslint-enable */

'use strict';

const React = require('react');
const ModalHeader = require('./modal-header');

const GameItems = require('./game-items');
const GameEquipment = require('./game-equipment');

/** Component renders the player inventory.*/
const GameInventory = React.createClass({

    propTypes: {
        doInvCmd: React.PropTypes.func.isRequired,
        equipSelected: React.PropTypes.object,
        player: React.PropTypes.object,
        invMsg: React.PropTypes.string.isRequired,
        msgStyle: React.PropTypes.string.isRequired,
        setInventoryMsg: React.PropTypes.func.isRequired,
        selectedItem: React.PropTypes.object,
        selectItemTop: React.PropTypes.func.isRequired,
        selectEquipTop: React.PropTypes.func.isRequired,
        inv: React.PropTypes.object,
        eq: React.PropTypes.object,
        maxWeight: React.PropTypes.number
    },

    /* Called when "Drop" is clicked. Drops item to the ground.*/
    dropItem: function() {
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
    },

    /* When "Equip" is clicked, equips the selected item, if any.*/
    equipItem: function() {
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
            }.bind(this);
            this.props.doInvCmd(cmd);
        }
        else {
            this.props.setInventoryMsg(
                {invMsg: 'No item selected for equipping!',
                msgStyle: 'text-danger'});
        }
    },

    /* Called when "Remove" button is clicked to remove an equipped item.*/
    unequipItem: function() {
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
    },

    /* Called when Use button is clicked. If an item is selected, uses that
     * item. */
    useItem: function() {
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
    },

    setSelectedItem: function(item) {
        const msg = 'Inventory Selected: ' + item.toString();
        this.props.selectItemTop(item);
        this.props.setInventoryMsg({invMsg: msg, msgStyle: 'text-info'});
    },

    setEquipSelected: function(selection) {
        const msg = 'Equipment Selected: ' + selection.item.toString();
        this.props.selectEquipTop(selection);
        this.props.setInventoryMsg({invMsg: msg, msgStyle: 'text-info'});
    },

    render: function() {
        const inv = this.props.inv;
        const eq = this.props.eq;
        const maxWeight = this.props.maxWeight;
        const eqWeight = eq.getWeight();

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
                            <div id='items-box' className='col-md-6'>
                                <GameItems eqWeight={eqWeight} maxWeight={maxWeight} setSelectedItem={this.setSelectedItem} inv={inv} />
                            </div>
                            <div id='equipment-box' className='col-md-6'>
                                <GameEquipment setEquipSelected={this.setEquipSelected} eq={eq} />
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

});
/* eslint-enable */

module.exports = GameInventory;

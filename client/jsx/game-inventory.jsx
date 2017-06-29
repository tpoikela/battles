'use strict';

const React = require('react');
const ModalHeader = require('./modal-header');

const GameItems = require('./game-items');
const GameEquipment = require('./game-equipment');

/** Component renders the player inventory.*/
var GameInventory = React.createClass({

    selectedItem: null,
    equipSelected: null,

    /*
    getInitialState: function() {
        return {
            invMsg: '',
            msgStyle: ''
        };
    },
    */

    invLastRenderLen: 0,
    eqLastRenderLen: 0,
    eqMissCount: 0,

    /*
    shouldComponentUpdate: function(nextProps, nextState) {
        var thisLen = this.invLastRenderLen;
        var nextLen = nextProps.inv.getItems().length;
        var eqNextLen = nextProps.eq.getItems().length;

        console.log("thisLen: " + thisLen + " nextLen " + nextLen);

        if (this.state.invMsg !== nextState.invMsg) return true;
        if (thisLen !== nextLen) return true;
        if (this.eqLastRenderLen !== eqNextLen) {
            return true;
        }
        else { // Check missile status
            var eqMiss = nextProps.eq.getItem("missile");
            if (eqMiss !== null) {
                return eqMiss.count != this.eqMissCount;

            }
        }

        return false;
    },
    */

    propTypes: {
        player: React.PropTypes.object,
        invMsg: React.PropTypes.string.isRequired,
        msgStyle: React.PropTypes.string.isRequired,
        setInventoryMsg: React.PropTypes.func.isRequired,
        selectItemTop: React.PropTypes.func.isRequired,
        inv: React.PropTypes.object,
        eq: React.PropTypes.object,
        maxWeight: React.PropTypes.number
    },


    /* Called when "Drop" is clicked. Drops item to the ground.*/
    dropItem: function() {
        if (this.selectedItem !== null) {
            const invEq = this.props.player.getInvEq();
            if (invEq.dropItem(this.selectedItem)) {
                this.props.setInventoryMsg({
                    invMsg: 'Item dropped!', msgStyle: 'text-success'});
            }

        }
        else {
            this.props.setInventoryMsg({invMsg: 'No item selected!',
                msgStyle: 'text-danger'});
        }
    },

    /* When "Equip" is clicked, equips the selected item, if any.*/
    equipItem: function() {
        // Get item somehow
        var item = this.selectedItem;
        if (item !== null) {
            const invEq = this.props.player.getInvEq();

            if (item.getType() === 'missile') {
                if (invEq.equipNItems(item, item.count)) {
                    this.props.setInventoryMsg(
                        {invMsg: 'Equipping succeeded!',
                        msgStyle: 'text-success'});
                }
            }
            else if (invEq.equipItem(item)) {
                this.props.setInventoryMsg({invMsg: 'Equipping succeeded!',
                    msgStyle: 'text-success'});
            }
        }
        else {
            this.props.setInventoryMsg({invMsg: 'No item selected!',
                msgStyle: 'text-danger'});
        }
    },

    /* Called when "Remove" button is clicked to remove an equipped item.*/
    unequipItem: function() {
        if (this.equipSelected !== null) {
            const invEq = this.props.player.getInvEq();
            const name = this.equipSelected.slotName;
            if (name === 'missile') {
                const eqItem = invEq.getEquipment().getItem('missile');
                let ok = false;

                if (eqItem !== null) {
                    if (invEq.unequipItem(name, eqItem.count)) {
                        this.props.setInventoryMsg(
                            {invMsg: 'Removing succeeded!',
                            msgStyle: 'text-success'});
                        ok = true;
                    }
                }

                if (!ok) {
                    this.props.setInventoryMsg({invMsg:
                        "Failed to remove the item from slot '" + name + "'!",
                        msgStyle: 'text-danger'});
                }
            }
            else if (invEq.unequipItem(name)) {
                this.props.setInventoryMsg({invMsg: 'Removing succeeded!',
                    msgStyle: 'text-success'});
            }
            else {
                this.props.setInventoryMsg({invMsg:
                    "Failed to remove the item from slot '" + name + "'!",
                    msgStyle: 'text-danger'});
            }
        }
        else {
            this.props.setInventoryMsg({invMsg: 'No equipment selected!',
                msgStyle: 'text-danger'});
        }
    },

    useItem: function() {
        if (this.selectedItem !== null) {
            if (this.selectedItem.hasOwnProperty('useItem')) {
                const invEq = this.props.player.getInvEq();
                const target = this.props.player.getCell();
                const itemName = this.selectedItem.getName();

                if (invEq.useItem(this.selectedItem, {target: target})) {
                    this.props.setInventoryMsg(
                        {invMsg: 'You used the ' + itemName + '.',
                        msgStyle: 'text-success'});
                    // this.props.forceRender();
                }
                else {
                    this.props.setInventoryMsg(
                        {invMsg: 'You failed to use the ' + itemName + '.',
                        msgStyle: 'text-danger'});
                }
            }
            else {
                this.props.setInventoryMsg(
                    {invMsg: 'Cannot use the chosen item!',
                    msgStyle: 'text-danger'});
            }
        }
        else {
            this.props.setInventoryMsg(
                {invMsg: 'You must choose item to use!',
                msgStyle: 'text-danger'});
        }

    },

    setSelectedItem: function(item) {
        this.selectedItem = item;
        const msg = 'Inventory Selected: ' + item.toString();
        this.props.selectItemTop(item);
        this.props.setInventoryMsg({invMsg: msg, msgStyle: 'text-info'});
    },

    setEquipSelected: function(selection) {
        this.equipSelected = selection;
        const msg = 'Equipment Selected: ' + selection.item.toString();
        this.props.selectItemTop(selection.item);
        this.props.setInventoryMsg({invMsg: msg, msgStyle: 'text-info'});
    },

    render: function() {
        const inv = this.props.inv;
        const eq = this.props.eq;
        const maxWeight = this.props.maxWeight;
        const eqWeight = eq.getWeight();

        this.invLastRenderLen = inv.getItems().length;
        this.eqLastRenderLen = eq.getItems().length;
        const missile = eq.getItem('missile');

        if (missile !== null) {this.eqMissCount = missile.count;}

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
                                <button type='button' className='btn btn-secondary' onClick={this.dropItem}>Drop</button>
                                <button type='button' className='btn btn-secondary' onClick={this.equipItem}>Equip</button>
                                <button type='button' className='btn btn-secondary' onClick={this.unequipItem}>Remove</button>
                                <button type='button' className='btn btn-secondary' onClick={this.useItem}>Use</button>
                                <button type='button' className='btn btn-secondary' data-dismiss='modal'>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

});

module.exports = GameInventory;


const RG = require('./rg.js');
RG.Item = require('./item.js');
const Equipment = require('./equipment').Equipment;

RG.Inv = {};

/* Object models inventory items and equipment on actor. This object handles
 * movement of items between inventory and equipment. */
const Inventory = function(actor) {
    this._actor = actor;
    this._inv = new RG.Item.Container(actor);
    this._eq = new Equipment(actor);
};

// Wrappers for container methods
Inventory.prototype.addItem = function(item) {
    this._inv.addItem(item);
};
Inventory.prototype.hasItem = function(item) {
    return this._inv.hasItem(item);
};
Inventory.prototype.removeItem = function(item) {
    return this._inv.removeItem(item);
};

Inventory.prototype.removeNItems = function(item, n) {
    return this._inv.removeNItems(item, n);
};

Inventory.prototype.getRemovedItem = function() {
    return this._inv.getRemovedItem();
};

/* For using item inside the container. */
Inventory.prototype.useItem = function(item, obj) {
    if (this._inv.hasItem(item)) {
        if (item.useItem) {
            item.useItem(obj);
            return true;
        }
    }
    else {
        RG.err('Inv.Inventory', 'useItem', 'Not in inventory, cannot use!');
    }
    return false;
};

    /* Returns true if given item can be carried.*/
Inventory.prototype.canCarryItem = function(item) {
    const eqWeight = this._eq.getWeight();
    const invWeight = this._inv.getWeight();
    const newWeight = eqWeight + invWeight + item.getWeight();
    const maxWeight = this._actor.getMaxWeight();
    if (newWeight > maxWeight) {return false;}
    return true;
};

/* Drops selected item to the actor's current location.*/
Inventory.prototype.dropItem = function(item) {
    if (this._inv.removeItem(item)) {
        const level = this._actor.getLevel();
        const droppedItem = this.getRemovedItem();
        const [x, y] = this._actor.getXY();
        if (level.addItem(droppedItem, x, y)) {
            return true;
        }
        else {
            this._inv.addItem(droppedItem);
        }
    }
    return false;
};

Inventory.prototype.dropNItems = function(item, n) {
    if (this.removeNItems(item, n)) {
        const level = this._actor.getLevel();
        const droppedItem = this.getRemovedItem();
        const [x, y] = this._actor.getXY();
        if (level.addItem(droppedItem, x, y)) {
            return true;
        }
        else {
            this._inv.addItem(droppedItem);
        }
    }
    return false;
};

/* Removes and item and returns it. */
Inventory.prototype.removeAndGetItem = function(item) {
    if (this._inv.removeItem(item)) {
        return this.getRemovedItem();
    }
    return null;
};

Inventory.prototype.getInventory = function() {
    return this._inv;
};

Inventory.prototype.getEquipment = function() {
    return this._eq;
};

/* Removes item from inventory and equips it.*/
Inventory.prototype.equipItem = function(item) {
    if (this._inv.hasItem(item)) {
        // If item has count > 2, can't use the same item ref
        const eqItem = this._getItemToEquip(item);
        if (RG.isNullOrUndef[eqItem]) {
            RG.err('Inv.Inventory', 'equipItem',
                'equippedItem is null. Should not happen');
            return false; // For suppressed errors
        }

        if (this._eq.equipItem(eqItem)) {
            return true;
        }
        else {
            this._inv.addItem(eqItem); // Failed, add back to inv
        }
    }
    else {
        RG.err('Inv.Inventory', 'equipItem',
            'Cannot equip. Not in inventory.');
    }
    return false;
};

Inventory.prototype._getItemToEquip = function(item) {
    const res = this._inv.removeItem(item);
    if (res) {
        const rmvItem = this._inv.getRemovedItem();
        // rmvItem.setID(item.getID());
        return rmvItem;
    }
    return null;
};

/* Equips up to N items of given type. */
Inventory.prototype.equipNItems = function(item, n) {
    if (this._inv.hasItem(item)) {
        const res = this._inv.removeNItems(item, n);
        if (res) {
            const removedItem = this._inv.getRemovedItem();
            if (this._eq.equipItem(removedItem)) {
                return true;
            }
            else {
                this._inv.addItem(removedItem);
            }
        }
    }
    return false;
};

/* Unequips item and puts it back to inventory.*/
Inventory.prototype.unequipItem = function(slotType, n, slotNumber) {
    if (RG.isNullOrUndef([slotType])) {
        let msg = 'Some params null/undef: ';
        msg += `type: |${slotType}| n: |${n}| number: |${slotNumber}|`;
        RG.err('InvInventory', 'unequipItem', msg);
    }
    const eqItem = this._eq.getItem(slotType);
    if (!RG.isNullOrUndef([eqItem])) {
        if (this._eq.unequipItem(slotType, n, slotNumber)) {
            const rmvItems = this._eq.getUnequipped(slotType, slotNumber);
            if (rmvItems !== null) {
                this.addItem(rmvItems);
                return true;
            }
        }
    }
    return false;
};

    /* Unequips and returns N items. Doesn't add to inv.*/
Inventory.prototype.unequipAndGetItem = function(
    slotType, n, slotNumber
) {
    const eqItem = this._eq.getItem(slotType);
    if (!RG.isNullOrUndef([eqItem])) {
        if (this._eq.unequipItem(slotType, n)) {
            return this._eq.getUnequipped(slotType, slotNumber);
        }
    }
    return null;
};

Inventory.prototype.getWeapon = function() {
    const item = this._eq.getItem('hand');
    if (!RG.isNullOrUndef([item])) {return item;}
    return null;
};

Inventory.prototype.getMissileWeapon = function() {
    const item = this._eq.getItem('missileweapon');
    if (!RG.isNullOrUndef([item])) {return item;}
    return null;
};

Inventory.prototype.getMissile = function() {
    const item = this._eq.getItem('missile');
    return item;
};

Inventory.prototype.getEquipped = function(slotType) {
    return this._eq.getItem(slotType);
};

Inventory.prototype.restoreEquipped = function(item) {
    const ok = this._eq.equipItem(item);
    if (!ok) {
        const json = JSON.stringify(item);
        RG.err('Inventory', 'restoreEquipped',
            'Failed to equip item ' + json);
    }
};

RG.Inv.Inventory = Inventory;

module.exports = RG.Inv;

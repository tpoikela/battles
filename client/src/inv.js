
const RG = require('./rg.js');
RG.Item = require('./item.js');

RG.Inv = {};

//---------------------------------------------------------------------------
// EQUIPMENT AND INVENTORY
//---------------------------------------------------------------------------

/* Models one slot in the inventory. */
RG.Inv.EquipSlot = function(eq, type, stacked) {
    RG.Object.Ownable.call(this, eq);

    let _item = null;
    let _hasItem = false;
    let _unequipped = null;
    let _stacked = false;

    if (!RG.isNullOrUndef([stacked])) {_stacked = stacked;}

    this.isStacked = function() {return _stacked;};

    this.getUnequipped = function() {
        return _unequipped;
    };

    /* Returns the equipped item for this slot.*/
    this.getItem = function() {
        if (_hasItem) {return _item;}
        return null;
    };

    /* Equips given item to first available place in slot.*/
    this.equipItem = function(item) {
        if (this.canEquip(item)) {
            if (!_stacked || !_hasItem) {
                item.setOwner(this);
                _item = item;
                _hasItem = true;
            }
            else if (RG.addStackedItems(_item, item)) {
                    _hasItem = true;
                }
            return _hasItem;
        }
        return false;
    };

    /* Unequips N items from the slot. */
    this.unequipItem = function(n) {
        if (_hasItem) {
            if (!_stacked) {
                _hasItem = false;
                _unequipped = _item;
                return true;
            }
            else if (n > 0) {
                    _unequipped = RG.removeStackedItems(_item, n);
                    if (_item.count === 0) {_hasItem = false;}
                    return true;
                }
        }
        return false;
    };

    this.canEquip = function(item) {
        if (!_hasItem) {
            return true;
        }
        else if (_stacked) { // Can only equip same items to the stack
            return item.equals(_item);
        }
        return false;
    };

};
RG.extend2(RG.Inv.EquipSlot, RG.Object.Ownable);

/* Models equipment on an actor.*/
RG.Inv.Equipment = function(actor) {
    RG.Object.Ownable.call(this, actor);

    const _equipped = [];

    const _slots = {
        hand: new RG.Inv.EquipSlot(this, 'hand'),
        shield: new RG.Inv.EquipSlot(this, 'shield'),
        head: new RG.Inv.EquipSlot(this, 'head'),
        chest: new RG.Inv.EquipSlot(this, 'chest'),
        neck: new RG.Inv.EquipSlot(this, 'neck'),
        feet: new RG.Inv.EquipSlot(this, 'feet'),
        missile: new RG.Inv.EquipSlot(this, 'missile', true),
        missileweapon: new RG.Inv.EquipSlot(this, 'missileweapon'),
        spiritgem: new RG.Inv.EquipSlot(this, 'spiritgem')
    };

    const _hasSlot = function(slotType) {
        return _slots.hasOwnProperty(slotType);
    };

    this.getWeight = function() {
        let total = 0;
        for (let i = 0; i < _equipped.length; i++) {
            total += _equipped[i].getWeight() * _equipped[i].count;
        }
        return total;
    };

    this.getSlotTypes = function() {return Object.keys(_slots);};

    this.getItems = function() {return _equipped;};

    /* Returns last unequipped item for the slot.*/
    this.getUnequipped = function(slotType) {
        if (_hasSlot(slotType)) {
            return _slots[slotType].getUnequipped();
        }
        else {
            RG.err('Equipment', 'getUnequipped',
                'No slot type: ' + slotType);
        }
        return null;
    };

    /* Returns an item in the given slot.*/
    this.getItem = function(slot) {
        if (_slots.hasOwnProperty(slot)) {
            return _slots[slot].getItem();
        }
        return null;
    };

    /* Equips given item. Slot is chosen automatically from suitable available
     * ones.*/
    this.equipItem = function(item) {
        if (item.hasOwnProperty('getArmourType')) {
            if (_slots[item.getArmourType()].equipItem(item)) {
                _equipped.push(item);
                return true;
            }
        }
        // No equip property, can only equip to hand
        else if (item.getType() === 'missile') {
            if (_slots.missile.equipItem(item)) {
                _addStackedItem(item);
                return true;
            }
        }
        else if (item.getType() === 'missileweapon') {
            if (_slots.missileweapon.equipItem(item)) {
                _equipped.push(item);
                return true;
            }
        }
        else if (_slots.hand.equipItem(item)) {
            _equipped.push(item);
            return true;
        }
        return false;
    };

    const _addStackedItem = function(item) {
        let matchFound = false;
        for (let i = 0; i < _equipped.length; i++) {
            if (_equipped[i].equals(item)) {
                matchFound = true;
                break;
            }
        }
        if (!matchFound) {_equipped.push(item);}
    };

    /* Removes an item, or n items if specified.*/
    const _removeItem = function(item, n) {
        const index = _equipped.indexOf(item);
        if (index >= 0) {
            if (n > 0) {
                if (_equipped[index].hasOwnProperty('count')) {
                    if (_equipped[index].count === 0) {
                        _equipped.splice(index, 1);
                    }
                }
                return true;
            }
            else {
                _equipped.splice(index, 1);
                return true;
            }
        }
        else {
            RG.err('Equipment', 'unequipItem', 'Index < 0. Horribly wrong.');
        }
        return false;
    };

    /* Returns true if given item is equipped.*/
    this.isEquipped = function(item) {
        const index = _equipped.indexOf(item);
        return index !== -1;
    };

    this.getEquipped = function(slotType) {
        return this.getItem(slotType);
    };

    /* Unequips given slotType and index. */
    this.unequipItem = function(slotType, n) {
        if (_hasSlot(slotType)) {
            const item = _slots[slotType].getItem();
            if (_slots[slotType].unequipItem(n)) {
                return _removeItem(item, n);
            }
        }
        else {
            const msg = 'Non-existing slot type ' + slotType;
            RG.err('Equipment', 'unequipItem', msg);
        }
        return false;
    };

    this.propertySum = function(funcname) {
        let result = 0;
        const slotKeys = Object.keys(_slots);
        slotKeys.forEach(slot => {
            const item = this.getItem(slot);
            if (item !== null) {
                if (typeof item[funcname] === 'function') {
                    result += item[funcname]();
                }
                else if (item.has('Stats')) {
                    const sComp = item.get('Stats');
                    if (typeof sComp[funcname] === 'function') {
                        result += sComp[funcname]();
                    }
                }
            }
        });
        return result;
    };

    this.toJSON = function() {
        const json = [];
        for (let i = 0; i < _equipped.length; i++) {
            json.push(_equipped[i].toJSON());
        }
        return json;
    };

    // Dynamically generate accessors for different stats
    const _mods = ['getDefense', 'getAttack', 'getProtection',
        'getSpeed', 'getWillpower',
        'getAccuracy', 'getAgility', 'getStrength'];

    const that = this;
    for (let i = 0; i < _mods.length; i++) {

        /* eslint no-loop-func: 0 */
        // Use closure to fix the function name
        const getFunc = function() {
            const privVar = _mods[i];
            return function() {
                return that.propertySum(privVar);
            };
        };

        this[_mods[i]] = getFunc();
    }

};
RG.extend2(RG.Inv.Equipment, RG.Object.Ownable);


/* Object models inventory items and equipment on actor. This object handles
 * movement of items between inventory and equipment. */
RG.Inv.Inventory = function(actor) {
    RG.Object.Ownable.call(this, actor);
    const _actor = actor;

    const _inv = new RG.Item.Container(actor);
    const _eq = new RG.Inv.Equipment(actor);

    // Wrappers for container methods
    this.addItem = function(item) {_inv.addItem(item);};
    this.hasItem = function(item) {return _inv.hasItem(item);};
    this.removeItem = function(item) {return _inv.removeItem(item);};

    this.removeNItems = function(item, n) {
        return _inv.removeNItems(item, n);
    };

    this.getRemovedItem = function() {return _inv.getRemovedItem();};

    this.useItem = function(item, obj) {
        if (_inv.hasItem(item)) {
            if (item.hasOwnProperty('useItem')) {
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
    this.canCarryItem = function(item) {
        const eqWeight = _eq.getWeight();
        const invWeight = _inv.getWeight();
        const newWeight = eqWeight + invWeight + item.getWeight();
        const maxWeight = _actor.getMaxWeight();
        if (newWeight > maxWeight) {return false;}
        return true;
    };

    /* Drops selected item to the actor's current location.*/
    this.dropItem = function(item) {
        if (_inv.removeItem(item)) {
            const level = _actor.getLevel();
            if (level.addItem(item, _actor.getX(), _actor.getY())) {
                return true;
            }
            else {
                _inv.addItem(item);
            }
        }
        return false;
    };

    this.getInventory = function() {return _inv;};
    this.getEquipment = function() {return _eq;};

    /* Removes item from inventory and equips it.*/
    this.equipItem = function(item) {
        if (_inv.hasItem(item)) {
            // If item has count > 2, can't use the same item ref
            const eqItem = _getItemToEquip(item);
            if (RG.isNullOrUndef[eqItem]) {
                RG.err('Inv.Inventory', 'equipItem',
                    'equippedItem is null. Should not happen');
                return false; // For suppressed errors
            }

            if (_eq.equipItem(eqItem)) {
                return true;
            }
            else {
                _inv.addItem(eqItem); // Failed, add back to inv
            }
        }
        else {
            RG.err('Inv.Inventory', 'equipItem',
                'Cannot equip. Not in inventory.');
        }
        return false;
    };

    const _getItemToEquip = function(item) {
        const res = _inv.removeItem(item);
        if (res) {
            const rmvItem = _inv.getRemovedItem();
            return rmvItem;
        }
        return null;
    };

    /* Equips up to N items of given type. */
    this.equipNItems = function(item, n) {
        if (_inv.hasItem(item)) {
            const res = _inv.removeNItems(item, n);
            if (res) {
                const removedItem = _inv.getRemovedItem();
                if (_eq.equipItem(removedItem)) {
                    return true;
                }
                else {
                    _inv.addItem(removedItem);
                }
            }
        }
        return false;
    };

    /* Unequips item and puts it back to inventory.*/
    this.unequipItem = function(slotType, n) {
        const eqItem = _eq.getItem(slotType);
        if (!RG.isNullOrUndef([eqItem])) {
            if (_eq.unequipItem(slotType, n)) {
                const rmvItems = _eq.getUnequipped(slotType);
                if (rmvItems !== null) {
                    this.addItem(rmvItems);
                    return true;
                }
            }
        }
        return false;
    };

    /* Unequips and returns N items. Doesn't add to inv.*/
    this.unequipAndGetItem = function(slotType, n) {
        const eqItem = _eq.getItem(slotType);
        if (!RG.isNullOrUndef([eqItem])) {
            if (_eq.unequipItem(slotType, n)) {
                return _eq.getUnequipped(slotType);
            }
        }
        return null;
    };

    this.getWeapon = function() {
        const item = _eq.getItem('hand');
        if (!RG.isNullOrUndef([item])) {return item;}
        return null;
    };

    this.getMissileWeapon = function() {
        const item = _eq.getItem('missileweapon');
        if (!RG.isNullOrUndef([item])) {return item;}
        return null;
    };

    this.getEquipped = function(slotType) {
        return _eq.getItem(slotType);
    };


};
RG.extend2(RG.Inv.Inventory, RG.Object.Ownable);

module.exports = RG.Inv;

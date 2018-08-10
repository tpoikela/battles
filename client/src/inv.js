
const RG = require('./rg.js');
RG.Item = require('./item.js');

RG.Inv = {};

//-----------------------------------------------------------------------
// EQUIPMENT AND INVENTORY
//-----------------------------------------------------------------------

/* Models one slot in the inventory. */
RG.Inv.EquipSlot = function(eq, type, stacked) {

    this._type = type;
    this._item = null;
    this._hasItem = false;
    this._unequipped = null;
    this._stacked = false;

    if (!RG.isNullOrUndef([stacked])) {this._stacked = stacked;}

    this.isStacked = () => this._stacked;

    this.getUnequipped = () => this._unequipped;

    /* Returns the equipped item for this slot.*/
    this.getItem = () => {
        if (this._hasItem) {return this._item;}
        return null;
    };

    /* Equips given item to first available place in slot.*/
    this.equipItem = function(item) {
        if (this.canEquip(item)) {
            if (!this._stacked || !this._hasItem) {
                item.setOwner(this);
                this._item = item;
                this._hasItem = true;
            }
            else if (RG.addStackedItems(this._item, item)) {
                this._hasItem = true;
            }
            return this._hasItem;
        }
        return false;
    };

    /* Unequips N items from the slot. */
    this.unequipItem = n => {
        if (this._hasItem) {
            if (!this._stacked) {
                this._hasItem = false;
                this._unequipped = this._item;
                return true;
            }
            else if (n > 0) {
                this._unequipped = RG.removeStackedItems(this._item, n);
                if (this._item.count === 0) {this._hasItem = false;}
                return true;
            }
        }
        return false;
    };

    this.canEquip = item => {
        if (!this._hasItem) {
            return true;
        }
        else if (this._stacked) {
            // Can only equip same items to the stack
            return item.equals(this._item);
        }
        return false;
    };

};

const _equipMods = ['getDefense', 'getAttack', 'getProtection',
    'getSpeed'].concat(RG.GET_STATS);

/* Models equipment on an actor.*/
RG.Inv.Equipment = function(actor) {

    this._equipped = [];

    this._slots = {
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

    this.addSlot = function(slotType, slotObj) {
        if (this._hasSlot(slotType)) {
            if (Array.isArray(this._slots[slotType])) {
                this._slots[slotType].push(slotObj);
            }
            else {
                const slotArr = [this._slots[slotType]];
                slotArr.push(slotObj);
                this._slots[slotType] = slotArr;
            }
        }
        else {
            this._slots[slotType] = slotObj;
        }
    };

    this._hasSlot = slotType => this._slots.hasOwnProperty(slotType);

    /* Returns the total weight of the equipment. */
    this.getWeight = () => {
        let total = 0;
        for (let i = 0; i < this._equipped.length; i++) {
            total += this._equipped[i].getWeight() * this._equipped[i].count;
        }
        if (actor.has('MasterEquipper')) {
            total *= actor.get('MasterEquipper').getFactor();
        }
        return total;
    };

    /* Returns the number of slots for given type. */
    this.getNumSlots = function(slotType) {
        if (this._hasSlot(slotType)) {
            if (Array.isArray(this._slots[slotType])) {
                return this._slots[slotType].length;
            }
            return 1;
        }
        return 0;
    };

    this.getSlotTypes = () => Object.keys(this._slots);

    this.getItems = (slotType) => {
        if (this._hasSlot(slotType)) {
            if (Array.isArray(this._slots[slotType])) {
                return this._slots[slotType];
            }
            return [this._slots[slotType]];
        }
        return this._equipped;
    };

    /* Returns last unequipped item for the slot.*/
    this.getUnequipped = (slotType, index) => {
        if (this._hasSlot(slotType)) {
            const slot = this._slots[slotType];
            if (Array.isArray(slot)) {
                return slot[index].getUnequipped();
            }
            else {
                return this._slots[slotType].getUnequipped();
            }
        }
        else {
            RG.err('Equipment', 'getUnequipped',
                'No slot type: ' + slotType);
        }
        return null;
    };

    /* Returns an item in the given slot.*/
    this.getItem = slotType => {
        if (this._hasSlot(slotType)) {
            const slot = this._slots[slotType];
            if (Array.isArray(slot)) {
                return slot.map(itemSlot => itemSlot.getItem());
            }
            return this._slots[slotType].getItem();
        }
        return null;
    };

    /* Equips given item. Slot is chosen automatically from suitable available
     * ones.*/
    this.equipItem = item => {
        if (item.getArmourType) {
            return this._equipToSlotType(item.getArmourType(), item);
        }
        // No equip property, can only equip to hand
        else if (/^(missile|ammo)$/.test(item.getType())) {
            if (this._slots.missile.equipItem(item)) {
                _addStackedItem(item);
                return true;
            }
        }
        else if (item.getType() === 'missileweapon') {
            return this._equipToSlotType('missileweapon', item);
        }
        else {
            return this._equipToSlotType('hand', item);
        }
        return false;
    };

    this._equipToSlotType = function(slotType, item) {
        const slot = this._slots[slotType];
        if (Array.isArray(slot)) {
            for (let i = 0; i < slot.length; i++) {
                if (slot[i].equipItem(item)) {
                    this._equipped.push(item);
                    return true;
                }
            }
        }
        else if (slot.equipItem(item)) {
            this._equipped.push(item);
            return true;
        }
        return false;
    };

    const _addStackedItem = item => {
        let matchFound = false;
        for (let i = 0; i < this._equipped.length; i++) {
            if (this._equipped[i].equals(item)) {
                matchFound = true;
                break;
            }
        }
        if (!matchFound) {this._equipped.push(item);}
    };

    /* Removes an item, or n items if specified. The item object count has
     * already been changed, so this method only removes the item from internal
     * array. */
    const _removeItem = (item, n) => {
        const index = this._equipped.indexOf(item);
        if (index >= 0) {
            if (n > 0) {
                if (this._equipped[index].hasOwnProperty('count')) {
                    if (this._equipped[index].count === 0) {
                        this._equipped.splice(index, 1);
                    }
                    /* else if (n === 1 && this._equipped[index].count === 1) {
                        this._equipped.splice(index, 1);
                    }*/
                }
                return true;
            } // n not given, just remove from the found index
            else {
                this._equipped.splice(index, 1);
                return true;
            }
        }
        else {
            RG.err('Equipment', '_removeItem', 'Index < 0. Horribly wrong.');
        }
        return false;
    };

    /* Returns true if given item is equipped.*/
    this.isEquipped = item => {
        const index = this._equipped.indexOf(item);
        return index !== -1;
    };

    this.getEquipped = function(slotType) {
        return this.getItem(slotType);
    };

    /* Unequips given slotType and index. */
    this.unequipItem = (slotType, n, index) => {
        if (this._hasSlot(slotType)) {
            const slot = this._slots[slotType];
            if (Array.isArray(slot)) {
                if (index >= 0) {
                    const item = slot[index].getItem();
                    if (slot[index].unequipItem(n)) {
                        if (slot[index].isStacked()) {
                            return _removeItem(item, n);
                        }
                        else {
                            return _removeItem(item);
                        }
                    }
                }
                else {
                    for (let i = 0; i < slot.length; i++) {
                        const item = slot[i].getItem();
                        if (slot[i].unequipItem(n)) {
                            if (slot[i].isStacked()) {
                                return _removeItem(item, n);
                            }
                            else {
                                return _removeItem(item);
                            }
                        }
                    }
                }
            }
            else {
                const item = this._slots[slotType].getItem();
                if (this._slots[slotType].unequipItem(n)) {
                    if (this._slots[slotType].isStacked()) {
                        return _removeItem(item, n);
                    }
                    else {
                        return _removeItem(item);
                    }
                }
            }
        }
        else {
            const msg = 'Non-existing slot type ' + slotType;
            RG.err('Equipment', 'unequipItem', msg);
        }
        return false;
    };

    /* Calls given funcname for each item in slot, and sums the results
     * of the function together. */
    this.propertySum = function(funcname) {
        let result = 0;
        const slotKeys = Object.keys(this._slots);
        slotKeys.forEach(slotName => {
            const slotObj = this._slots[slotName];
            let slots = slotObj;
            if (!Array.isArray(slots)) {
                slots = [slots];
            }

            slots.forEach(slot => {
                const item = slot.getItem();
                result += RG.getItemStat(funcname, item);
            });
        });
        return result;
    };

    this.toJSON = () => {
        const json = [];
        for (let i = 0; i < this._equipped.length; i++) {
            json.push(this._equipped[i].toJSON());
        }
        return json;
    };


    /* Creates getters for stats and combat attributes. */
    for (let i = 0; i < _equipMods.length; i++) {
        /* eslint no-loop-func: 0 */
        // Use closure to fix the function name
        const getFunc = () => {
            return () => this.propertySum(_equipMods[i]);
        };
        this[_equipMods[i]] = getFunc();
    }

};

/* Object models inventory items and equipment on actor. This object handles
 * movement of items between inventory and equipment. */
RG.Inv.Inventory = function(actor) {
    this._actor = actor;
    this._inv = new RG.Item.Container(actor);
    this._eq = new RG.Inv.Equipment(actor);

    // Wrappers for container methods
    this.addItem = item => {this._inv.addItem(item);};
    this.hasItem = item => this._inv.hasItem(item);
    this.removeItem = item => this._inv.removeItem(item);

    this.removeNItems = (item, n) => this._inv.removeNItems(item, n);

    this.getRemovedItem = () => this._inv.getRemovedItem();

    this.useItem = (item, obj) => {
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
    this.canCarryItem = item => {
        const eqWeight = this._eq.getWeight();
        const invWeight = this._inv.getWeight();
        const newWeight = eqWeight + invWeight + item.getWeight();
        const maxWeight = this._actor.getMaxWeight();
        if (newWeight > maxWeight) {return false;}
        return true;
    };

    /* Drops selected item to the actor's current location.*/
    this.dropItem = item => {
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

    this.dropNItems = (item, n) => {
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
    this.removeAndGetItem = item => {
        if (this._inv.removeItem(item)) {
            return this.getRemovedItem();
        }
        return null;
    };

    this.getInventory = () => this._inv;
    this.getEquipment = () => this._eq;

    /* Removes item from inventory and equips it.*/
    this.equipItem = item => {
        if (this._inv.hasItem(item)) {
            // If item has count > 2, can't use the same item ref
            const eqItem = _getItemToEquip(item);
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

    const _getItemToEquip = item => {
        const res = this._inv.removeItem(item);
        if (res) {
            const rmvItem = this._inv.getRemovedItem();
            return rmvItem;
        }
        return null;
    };

    /* Equips up to N items of given type. */
    this.equipNItems = (item, n) => {
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
    this.unequipItem = function(slotType, n, slotNumber) {
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
    this.unequipAndGetItem = (slotType, n, slotNumber) => {
        const eqItem = this._eq.getItem(slotType);
        if (!RG.isNullOrUndef([eqItem])) {
            if (this._eq.unequipItem(slotType, n)) {
                return this._eq.getUnequipped(slotType, slotNumber);
            }
        }
        return null;
    };

    this.getWeapon = () => {
        const item = this._eq.getItem('hand');
        if (!RG.isNullOrUndef([item])) {return item;}
        return null;
    };

    this.getMissileWeapon = () => {
        const item = this._eq.getItem('missileweapon');
        if (!RG.isNullOrUndef([item])) {return item;}
        return null;
    };

    this.getMissile = () => {
        const item = this._eq.getItem('missile');
        return item;
    };

    this.getEquipped = slotType => this._eq.getItem(slotType);


};

module.exports = RG.Inv;

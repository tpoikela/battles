const RG = require('./rg.js');

const EquipSlot = function(type, stacked) {

    this._type = type;
    this._item = null;
    this._hasItem = false;
    this._unequipped = null;
    this._stacked = false;

    if (!RG.isNullOrUndef([stacked])) {this._stacked = stacked;}

};


EquipSlot.prototype.isStacked = function() {
    return this._stacked;
};

EquipSlot.prototype.getUnequipped = function() {return this._unequipped;};

/* Returns the equipped item for this slot.*/
EquipSlot.prototype.getItem = function() {
    if (this._hasItem) {return this._item;}
    return null;
};

EquipSlot.prototype.hasItem = function() {
    return this._hasItem;
};

/* Equips given item to first available place in slot.*/
EquipSlot.prototype.equipItem = function(item) {
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
EquipSlot.prototype.unequipItem = function(n) {
    if (this._hasItem) {
        if (!this._stacked) {
            this._hasItem = false;
            this._unequipped = this._item;
            return true;
        }
        else if (n > 0) {
            if (n === 1 && this._item.count === 1) {
                this._hasItem = false;
                this._unequipped = this._item;
            }
            else if (n === this._item.count) {
                this._hasItem = false;
                this._unequipped = this._item;
            }
            else {
                this._unequipped = RG.removeStackedItems(this._item, n);
                // if (this._item.count === 0) {this._hasItem = false;}
            }
            return true;
        }
    }
    return false;
};

EquipSlot.prototype.canEquip = function(item) {
    if (!this._hasItem) {
        return true;
    }
    else if (this._stacked) {
        // Can only equip same items to the stack
        return item.equals(this._item);
    }
    return false;
};

const _equipMods = ['getDefense', 'getAttack', 'getProtection',
    'getSpeed'].concat(RG.GET_STATS);

/* Models equipment on an actor.*/
const Equipment = function(actor) {

    this._slots = {
        hand: new EquipSlot('hand'),
        shield: new EquipSlot('shield'),
        head: new EquipSlot('head'),
        chest: new EquipSlot('chest'),
        neck: new EquipSlot('neck'),
        feet: new EquipSlot('feet'),
        missile: new EquipSlot('missile', true),
        missileweapon: new EquipSlot('missileweapon'),
        spiritgem: new EquipSlot('spiritgem')
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
        const equipped = this.getItems();
        for (let i = 0; i < equipped.length; i++) {
            total += equipped[i].getWeight() * equipped[i].count;
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
        return this.getEquippedItems();
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
                    return true;
                }
            }
        }
        else if (slot.equipItem(item)) {
            return true;
        }
        return false;
    };

    /* Returns true if given item is equipped.*/
    this.isEquipped = item => {
        const equipped = this.getItems();
        const index = equipped.indexOf(item);
        return index !== -1;
    };

    this.getEquipped = function(slotType) {
        return this.getItem(slotType);
    };

    this.getEquippedItems = function() {
        const items = [];
        Object.values(this._slots).forEach(slot => {
            if (Array.isArray(slot)) {
                slot.forEach(subSlot => {
                    if (subSlot.hasItem()) {
                        items.push(subSlot.getItem());
                    }
                });
            }
            else if (slot.hasItem()) {
                items.push(slot.getItem());
            }
        });
        return items;
    };

    /* Unequips given slotType and index. */
    this.unequipItem = (slotType, n, index) => {
        if (this._hasSlot(slotType)) {
            const slot = this._slots[slotType];
            if (Array.isArray(slot)) {
                if (index >= 0) {
                    if (slot[index].unequipItem(n)) {
                        return true;
                    }
                }
                else {
                    for (let i = 0; i < slot.length; i++) {
                        if (slot[i].unequipItem(n)) {
                            return true;
                        }
                    }
                }
            }
            else {
                return this._slots[slotType].unequipItem(n);
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
        const equipped = this.getItems();
        for (let i = 0; i < equipped.length; i++) {
            json.push(equipped[i].toJSON());
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

module.exports = {
    Equipment,
    EquipSlot
};

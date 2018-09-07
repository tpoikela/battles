const RG = require('./rg.js');

const EquipSlot = function(eq, type, stacked) {

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
const Equipment = function(actor) {

    this._equipped = [];

    this._slots = {
        hand: new EquipSlot(this, 'hand'),
        shield: new EquipSlot(this, 'shield'),
        head: new EquipSlot(this, 'head'),
        chest: new EquipSlot(this, 'chest'),
        neck: new EquipSlot(this, 'neck'),
        feet: new EquipSlot(this, 'feet'),
        missile: new EquipSlot(this, 'missile', true),
        missileweapon: new EquipSlot(this, 'missileweapon'),
        spiritgem: new EquipSlot(this, 'spiritgem')
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

module.exports = {
    Equipment,
    EquipSlot
};

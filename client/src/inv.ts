
import RG from './rg';
import * as Item from './item';
import {Equipment} from './equipment';
import {SentientActor} from './actor';

/* Object models inventory items and equipment on actor. This object handles
 * movement of items between inventory and equipment. */
export class Inventory {
    public _actor: SentientActor;
    public _inv: Item.Container;
    public _eq: Equipment;

    constructor(actor) {
        this._actor = actor;
        this._inv = new Item.Container(actor);
        this._eq = new Equipment(actor);
    }

    // Wrappers for container methods
    addItem(item) {
        this._inv.addItem(item);
    }

    hasItem(item) {
        return this._inv.hasItem(item);
    }

    removeItem(item) {
        return this._inv.removeItem(item);
    }

    removeNItems(item, n) {
        return this._inv.removeNItems(item, n);
    }

    getRemovedItem() {
        return this._inv.getRemovedItem();
    }

    /* For using item inside the container. */
    useItem(item, obj) {
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
    }

    /* Returns true if given item can be carried.*/
    canCarryItem(item) {
        const eqWeight = this._eq.getWeight();
        const invWeight = this._inv.getWeight();
        const newWeight = eqWeight + invWeight + item.getWeight();
        const maxWeight = this._actor.getMaxWeight();
        if (newWeight > maxWeight) {return false;}
        return true;
    }

    /* Drops selected item to the actor's current location.*/
    dropItem(item) {
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
    }

    dropNItems(item, n) {
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
    }

    /* Removes and item and returns it. */
    removeAndGetItem(item) {
        if (this._inv.removeItem(item)) {
            return this.getRemovedItem();
        }
        return null;
    }

    getInventory() {
        return this._inv;
    }

    getEquipment() {
        return this._eq;
    }

    /* Removes item from inventory and equips it.*/
    equipItem(item) {
        if (this._inv.hasItem(item)) {
            // If item has count > 2, can't use the same item ref
            const eqItem = this._getItemToEquip(item);
            if (RG.isNullOrUndef([eqItem])) {
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
    }

    _getItemToEquip(item) {
        const res = this._inv.removeItem(item);
        if (res) {
            const rmvItem = this._inv.getRemovedItem();
            // rmvItem.setID(item.getID());
            return rmvItem;
        }
        return null;
    }

    /* Equips up to N items of given type. */
    equipNItems(item, n) {
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
    }

    /* Unequips item and puts it back to inventory.*/
    unequipItem(slotType, n, slotNumber) {
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
    }

    /* Unequips and returns N items. Doesn't add to inv.*/
    unequipAndGetItem(slotType, n, slotNumber) {
        const eqItem = this._eq.getItem(slotType);
        if (!RG.isNullOrUndef([eqItem])) {
            if (this._eq.unequipItem(slotType, n)) {
                return this._eq.getUnequipped(slotType, slotNumber);
            }
        }
        return null;
    }

    getWeapon() {
        const item = this._eq.getItem('hand');
        if (!RG.isNullOrUndef([item])) {return item;}
        return null;
    }

    getMissileWeapon() {
        const item = this._eq.getItem('missileweapon');
        if (!RG.isNullOrUndef([item])) {return item;}
        return null;
    }

    getMissile() {
        const item = this._eq.getItem('missile');
        return item;
    }

    getEquipped(slotType) {
        return this._eq.getItem(slotType);
    }

    restoreEquipped(item) {
        const ok = this._eq.equipItem(item);
        if (!ok) {
            const json = JSON.stringify(item);
            RG.err('Inventory', 'restoreEquipped',
                'Failed to equip item ' + json);
        }
    }
}

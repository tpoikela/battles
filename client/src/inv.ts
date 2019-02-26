
import RG from './rg';
import * as Item from './item';
import {Equipment} from './equipment';
import {SentientActor} from './actor';

type AmmoOrMissile = Item.Missile | Item.Ammo;

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
    public addItem(item): void {
        this._inv.addItem(item);
    }

    public hasItem(item): boolean {
        return this._inv.hasItem(item);
    }

    public removeItem(item): boolean {
        return this._inv.removeItem(item);
    }

    public removeNItems(item, n): boolean {
        return this._inv.removeNItems(item, n);
    }

    public getRemovedItem() {
        return this._inv.getRemovedItem();
    }

    /* For using item inside the container. */
    public useItem(item, obj): boolean {
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
    public canCarryItem(item): boolean {
        const eqWeight = this._eq.getWeight();
        const invWeight = this._inv.getWeight();
        const newWeight = eqWeight + invWeight + item.getWeight();
        const maxWeight = this._actor.getMaxWeight();
        if (newWeight > maxWeight) {return false;}
        return true;
    }

    /* Drops selected item to the actor's current location.*/
    public dropItem(item): boolean {
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

    public dropNItems(item, n: number): boolean {
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
    public removeAndGetItem(item) {
        if (this._inv.removeItem(item)) {
            return this.getRemovedItem();
        }
        return null;
    }

    public getInventory() {
        return this._inv;
    }

    public getEquipment() {
        return this._eq;
    }

    /* Removes item from inventory and equips it.*/
    public equipItem(item) {
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

    public _getItemToEquip(item) {
        const res = this._inv.removeItem(item);
        if (res) {
            const rmvItem = this._inv.getRemovedItem();
            // rmvItem.setID(item.getID());
            return rmvItem;
        }
        return null;
    }

    /* Equips up to N items of given type. */
    public equipNItems(item, n) {
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
    public unequipItem(slotType, n, slotNumber) {
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
    public unequipAndGetItem(slotType, n, slotNumber) {
        const eqItem = this._eq.getItem(slotType);
        if (!RG.isNullOrUndef([eqItem])) {
            if (this._eq.unequipItem(slotType, n)) {
                return this._eq.getUnequipped(slotType, slotNumber);
            }
        }
        return null;
    }

    public getWeapon() {
        const item = this._eq.getItem('hand');
        if (!RG.isNullOrUndef([item])) {return item;}
        return null;
    }

    public getMissileWeapon(): Item.MissileWeapon | null {
        const item = this._eq.getItem('missileweapon');
        if (!RG.isNullOrUndef([item])) {
            const missWeapon: unknown = item;
            return missWeapon as Item.MissileWeapon;
        }
        return null;
    }

    public getMissile(): AmmoOrMissile | null {
        const item = this._eq.getItem('missile');
        if (item) {
            const missItem: unknown = item;
            return missItem as AmmoOrMissile;
        }
        return null;
    }

    public getEquipped(slotType: string): Item.ItemBase | Item.ItemBase[] | null {
        return this._eq.getItem(slotType);
    }

    public restoreEquipped(item) {
        const ok = this._eq.equipItem(item);
        if (!ok) {
            const json = JSON.stringify(item);
            RG.err('Inventory', 'restoreEquipped',
                'Failed to equip item ' + json);
        }
    }
}
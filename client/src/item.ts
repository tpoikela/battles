
import RG from './rg';
import {compsToJSON} from './component/component.base';
import * as Component from './component/component';
import * as Mixin from './mixin';
import {Entity} from './entity';
import {EventPool} from '../src/eventpool';
import {Dice} from './dice';
import {TCoord} from './interfaces';

type SentientActor = import('./actor').SentientActor;

const POOL = EventPool.getPool();

//---------------------------------------------------------------------------
// ITEMS
//---------------------------------------------------------------------------

export const Item: any = {};

/* Models an item. Each item is ownable by someone. During game, there are no
 * items with null owners. Ownership shouldn't be ever set to null. */
export class ItemBase extends Entity {

    public isOwnable: boolean;
    public useArgs: any;
    public isUsable: boolean;
    protected _owner: SentientActor | ItemBase;
    private _name: string;

    constructor(name) {
        super();
        this.isOwnable = true;
        this._owner = null;
        this._name = name;
        this.isUsable = false;
        this.add(new Component.Typed(RG.ITEM.BASE, RG.TYPE_ITEM));
        this.add(new Component.Item());
        this.add(new Component.Physical());
    }

    public setOwner(owner) {
        if (RG.isNullOrUndef([owner])) {
            RG.err('Object.Ownable', 'setOwner', 'Owner cannot be null.');
        }
        else {
            this._owner = owner;
        }
    }

    /* Returns the top-level owner. Used mainly to recover actor owner of items
     * inside inventory. */
    public getTopOwner() {
        let owner = this._owner;
        while ((owner as ItemBase).getOwner) {
            owner = (owner as ItemBase).getOwner();
        }
        return owner;
    }

    /* Returns the direct owner of this object.*/
    public getOwner() {return this._owner;}

    public getX(): number {
        if (this._owner) {return this._owner.getX();}
        return null;
    }

    public getY(): number {
        if (this._owner) {return this._owner.getY();}
        return null;
    }

    public getXY(): TCoord {
        if (this._owner) {return this._owner.getXY();}
        return null;
    }

    public getLevel() {
        if (this._owner) {return this._owner.getLevel();}
        return null;
    }

    public setName(name) {this._name = name;}
    public getName() {return this._name;}

    public setWeight(weight) {
        this.get('Physical').setWeight(weight);
    }

    public getWeight() {return this.get('Physical').getWeight();}

    public setValue(value) {this.get('Item').setValue(value);}
    public getValue() {return this.get('Item').getValue();}

    public incrCount(count) {this.get('Item').incrCount(count);}
    public decrCount(count) {this.get('Item').decrCount(count);}
    public getCount() {return this.get('Item').getCount();}
    public setCount(count) {this.get('Item').setCount(count);}

    public getType() {return this.get('Typed').getObjType();}
    public setType(type) {return this.get('Typed').setObjType(type);}
    public getPropType() {return this.get('Typed').getPropType();}
    public setPropType(type) {return this.get('Typed').setPropType(type);}

    public setDamageType(type) {this.get('Item').setDamageType(type);}
    public getDamageType() {return this.get('Item').getDamageType();}

    /* Used when showing the item in inventory lists etc. */
    public toString() {
        let txt = this.getName() + ', ' + this.getType() + ', ';
        const totalWeight = this.getWeight() * this.getCount();
        txt += totalWeight.toFixed(2) + 'kg';
        txt = this.getCount() + ' x ' + txt;
        if (this.has('GemBound')) {
            txt += ' (Bound)';
        }
        if (this.has('Stats')) {
            txt += ' ' + this.get('Stats').toString();
        }
        return txt;
    }

    public copy(rhs: ItemBase) {
        this.setName(rhs.getName());
        this.setType(rhs.getType());
        this.setWeight(rhs.getWeight());
        this.setValue(rhs.getValue());

        if (rhs.useArgs) {
            this.useArgs = rhs.useArgs;
        }
        if (rhs.isUsable) {
            this.useItem = rhs.useItem.bind(this);
        }

        const comps = Object.values(rhs.getComponents());
        comps.forEach((comp: any) => {
            this.add(comp.clone());
        });
    }

    public useItem(obj): boolean {
        return false;
    }

    public clone(): ItemBase {
        const newItem = new ItemBase(this.getName());
        newItem.copy(this);
        return newItem;
    }

    public equals(item: ItemBase): boolean {
        if (this.getID() === item.getID()) {
            return true;
        }
        let res = this.getName() === item.getName();
        res = res && (this.getType() === item.getType());
        res = res && (this.getWeight() === item.getWeight());
        res = res && !(this.has('GemBound') || item.has('GemBound'));
        return res;
    }

    public toJSON() {
        const json: any = {
            setID: this.getID(),
            setName: this.getName(),
            setType: this.getType(),
            isUsable: this.isUsable
        };
        json.components = compsToJSON(this);
        return json;
    }

}
Item.ItemBase = ItemBase;

//----------------
/* RGItemFood */
//----------------
export class Food extends ItemBase {

    protected _energy: number;

    constructor(name) {
        super(name);
        this.setType(RG.ITEM.FOOD);
        this._energy = 0; // per 0.1 kg
        this.isUsable = true;
    }

    public setEnergy(energy: number): void {this._energy = energy;}
    public getEnergy(): number {return this._energy;}

    /* Uses (eats) the food item.*/
    public useItem(obj: any): boolean {
        // TODO move this into the system
        if (obj.hasOwnProperty('target')) {
            const cell = obj.target;
            if (cell.hasActors()) {
                const target = cell.getProp('actors')[0];
                if (target.has('Hunger')) {
                    let totalEnergy = this.getConsumedEnergy();
                    if (target.has('NourishedOne')) {
                        totalEnergy *= 3;
                    }
                    target.get('Hunger').addEnergy(totalEnergy);
                    if (this.getCount() === 1) {
                        const msg = {item: this};
                        POOL.emitEvent(RG.EVT_DESTROY_ITEM, msg);
                        RG.gameMsg(target.getName() + ' consumes ' +
                            this.getName());
                    }
                    else {
                        this.decrCount(1);
                    }
                    return true;
                }
                else {
                    RG.gameWarn(target.getName() +
                        ' is not interested in eating.');
                }
            }
            else {
                RG.gameWarn('There\'s no one to give food to.');
            }
        }
        else {
            RG.err('ItemFood', 'useItem', 'No target given in obj.');
        }
        return false;
    }

    public getConsumedEnergy() {
        return Math.round(this.getWeight() * this._energy / 0.1);
    }

    public toJSON() {
        const json = super.toJSON();
        json.setEnergy = this.getEnergy();
        return json;
    }

    public clone() {
        const newFood = new Item.Food(this.getName());
        newFood.copy(this);
        newFood.setEnergy(this.getEnergy());
        return newFood;
    }
}

Item.Food = Food;

//------------------
/* Corpse */
//------------------
export class Corpse extends ItemBase {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM.CORPSE);
    }
}
Item.Corpse = Corpse;

//------------------
/* Weapon */
//------------------
export class Weapon extends Mixin.Damage(ItemBase) {

    private _weaponType: string;

    constructor(name) {
        super(name);
        this.setType(RG.ITEM.WEAPON);
        this._weaponType = '';
    }

    public copy(rhs) {
        super.copy(rhs);
        this._weaponType = rhs.getWeaponType();
    }

    public clone() {
        const weapon = new Weapon(this.getName());
        weapon.copy(this);
        return weapon;
    }

    public setWeaponType(type) {
        this._weaponType = type;
    }

    public getWeaponType() {
        return this._weaponType;
    }

    public toJSON() {
        const json = super.toJSON();
        json.setWeaponType = this._weaponType;
        return json;
    }

}

Item.Weapon = Weapon;

//-------------------------
/* MissileWeapon */
//-------------------------
export class MissileWeapon extends Weapon {

    private _fireRate: number;

    constructor(name) {
        super(name);
        this.setType(RG.ITEM.MISSILE_WEAPON);
        this._fireRate = 1;
    }

    public setFireRate(rate) {
        this._fireRate = rate;
    }

    public getFireRate() {
        return this._fireRate;
    }

    public copy(rhs) {
        super.copy(rhs);
        this.setFireRate(rhs.getFireRate());
    }

    public clone() {
        const weapon = new MissileWeapon(this.getName());
        weapon.copy(this);
        return weapon;
    }

    public equals(rhs) {
        if (super.equals(rhs)) {
            return this._fireRate === rhs.getFireRate();
        }
        return false;
    }

    public toJSON() {
        const json = super.toJSON();
        json.setFireRate = this._fireRate;
        return json;
    }

}
Item.MissileWeapon = MissileWeapon;

//---------------------------------------
/* Ammo Object for ammunition. */
//---------------------------------------
export class Ammo extends Weapon {
    private _ammoType: string;

    constructor(name) {
        super(name);
        this.setType(RG.ITEM.AMMUNITION);
        this.add(new Component.Ammo());
        this._ammoType = '';
    }

    public setAmmoType(type) {this._ammoType = type;}
    public getAmmoType() {return this._ammoType;}

    public copy(rhs) {
        super.copy(rhs);
        this.setAmmoType(rhs.getAmmoType());
    }

    public clone() {
        const ammo = new Ammo(this.getName());
        ammo.copy(this);
        return ammo;
    }

    public equals(rhs) {
        if (super.equals(rhs)) {
            return this._ammoType === rhs.getAmmoType();
        }
        return false;
    }

    public toJSON() {
        const json = super.toJSON();
        json.setAmmoType = this._ammoType;
        return json;
    }

}

Item.Ammo = Ammo;

//-------------------------------------------
/* Armour Object for armour items. */
//-------------------------------------------
export class Armour extends Mixin.Defense(ItemBase) {

    private _armourType: string;

    constructor(name) {
        super(name);
        this.setType(RG.ITEM.ARMOUR);
        this._armourType = null;

        this.setArmourType = type => {this._armourType = type;};
        this.getArmourType = () => this._armourType;
    }

    public copy(rhs) {
        super.copy(rhs);
        this.setArmourType(rhs.getArmourType());
    }

    public clone() {
        const armour = new Armour(this.getName());
        armour.copy(this);
        return armour;
    }

    public equals(rhs) {
        let res = super.equals(rhs);
        res = res && this._armourType === rhs.getArmourType();
        return res;
    }

    public toJSON() {
        const json = super.toJSON();
        json.setArmourType = this.getArmourType();
        return json;
    }
}

Item.Armour = Armour;

//--------------------------------------
/* Potion Object for potions. */
//--------------------------------------
export class Potion extends ItemBase {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM.POTION);
        this.isUsable = true;
    }

    public useItem(obj): boolean {
        if (obj.hasOwnProperty('target')) {
            const cell = obj.target;
            if (cell.hasActors()) {
                const target = cell.getProp('actors')[0];
                const die = new Dice(1, 10, 2);
                const pt = die.roll();
                if (target.has('Health')) {
                    target.get('Health').addHP(pt);
                    const owner = (this.getOwner() as ItemBase).getOwner();
                    const useItemComp = new Component.UseItem();
                    useItemComp.setTarget(target);
                    useItemComp.setItem(this);
                    useItemComp.setUseType(RG.USE.DRINK);
                    owner.add(useItemComp);
                    return false;
                }
            }
            else {
                RG.gameWarn('Cannot see anyone there for using the potion.');
            }
        }
        else {
            RG.err('ItemPotion', 'useItem', 'No target given in obj.');
        }
        return false;
    }

    public clone() {
        const newPotion = new Item.Potion(this.getName());
        newPotion.copy(this);
        return newPotion;
    }
}

Item.Potion = Potion;

//----------------------------------------
/* Rune Object for rune stones. */
//----------------------------------------
export class Rune extends ItemBase {

    private _charges: number;

    constructor(name) {
        super(name);
        this.setType(RG.ITEM.RUNE);

        this._charges = 1;
    }

    public getCharges() {return this._charges;}
    public setCharges(charges) {this._charges = charges;}

    public clone() {
        const rune = new Rune(this.getName());
        rune.copy(this);
        return rune;
    }

    public copy(rhs) {
        super.copy(rhs);
        this.setCharges(rhs.getCharges());
    }

    public equals(rhs) {
        let res = super.equals(rhs);
        if (rhs.getCharges) {
            res = res && this.getCharges() === rhs.getCharges();
            return res;
        }
        return false;
    }

    public toString() {
        let res = super.toString();
        res += ` charges: ${this.getCharges()}`;
        return res;
    }

    public toJSON() {
        const json = super.toJSON();
        json.setCharges = this.getCharges();
        return json;
    }
}
Item.Rune = Rune;

//----------------------------------------------
/* Missile Object for thrown missile. */
//----------------------------------------------
export class Missile extends Weapon {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM.MISSILE);
    }

    public clone() {
        const weapon = new Missile(this.getName());
        weapon.copy(this);
        return weapon;
    }

}

Item.Missile = Missile;

//------------------------------------------------------
/* Container An item which holds other items. */
//------------------------------------------------------
export class Container extends ItemBase {

    private _items: ItemBase[];
    private _iter: number;
    private _removedItem: null | ItemBase;

    constructor(owner) {
        super('container');
        this.setOwner(owner);

        this._items = [];
        this._iter = 0;
        this._removedItem = null; // Last removed item
    }

    /* Adds one item to container. Always succeeds. */
    public _addItem(item) {
        let matchFound = false;
        for (let i = 0; i < this._items.length; i++) {
            if (this._items[i].equals(item)) {
                this._items[i].incrCount(item.getCount());
                matchFound = true;
                break;
            }
        }

        if (!matchFound) {
            item.setOwner(this);
            this._items.push(item);
        }
    }

    /* Returns the total weight of the container.*/
    public getWeight() {
        let sum = 0;
        for (let i = 0; i < this._items.length; i++) {
            sum += this._items[i].getWeight() * this._items[i].getCount();
        }
        return sum;
    }

    /* Adds an item. Container becomes item's owner.*/
    public addItem(item) {
        if (item.getCount() <= 0) {
            const str = JSON.stringify(item);
            RG.warn('Container', 'addItem',
                `Possible bug. Tried to add item with count 0: ${str}`);
        }
        if (item.getType() === 'container') {
            if (this.getOwner() !== item) {
                this._addItem(item);
            }
            else {
                RG.err('Item', 'addItem',
                    'Added item is container\'s owner. Impossible.');
            }
        }
        else {
            this._addItem(item);
        }
    }

    public getItems() {return this._items.slice();}

    /* Check by pure obj ref. Returns true if contains item ref.*/
    public hasItemRef(item) {
        const index = this._items.indexOf(item);
        if (index !== -1) {return true;}
        return false;
    }

    /* Used for stacking/equip purposes only. Uses item.equals(), much slower
     * than hasItemRef(). */
    public hasItem(item) {
        if (this.hasItemRef(item)) {return true;}
        const index = this._getMatchingItemIndex(item);
        return index >= 0;
    }

    /* Tries to remove an item. Returns true on success, false otherwise.*/
    public removeItem(item) {
        if (this.hasItem(item)) {
            return this._removeItem(item);
        }
        this._removedItem = null;
        return false;
    }

    public _getMatchingItemIndex(item) {
        for (let i = 0; i < this._items.length; i++) {
            if (item.equals(this._items[i])) {return i;}
        }
        return -1;
    }

    public _removeItem(item) {
        const i = this._getMatchingItemIndex(item);

        if (i === -1) {
            RG.err('ItemContainer', '_removeItem',
                'Negative index found. Horribly wrong.');
            return false;
        }

        if (this._items[i].getCount() === 1) {
            this._removedItem = item;
            this._items.splice(i, 1);
        }
        else {
            this._removedItem = RG.removeStackedItems(this._items[i], 1);
            if (this._items[i].getCount() === 0) {this._items.splice(i, 1);}
        }
        return true;
    }

    /* Returns last removed item if removeItem returned true.*/
    public getRemovedItem() {return this._removedItem;}

    /* Removes N items from the inventory of given type.*/
    public removeNItems(item, n) {
        let count = 0;
        while ((count < n) && this.removeItem(item)) {
            ++count;
        }

        if (this._removedItem !== null) {
            this._removedItem.setCount(count);
        }
        else {
            RG.err('ItemContainer', 'removeNItems',
                'this._removedItem was null. It should be a valid item.');
            return false;
        }

        if (count > 0) {return true;}
        return false;
    }

    /* Returns first item or null for empty container.*/
    public first() {
        if (this._items.length > 0) {
            this._iter = 1;
            return this._items[0];
        }
        return null;
    }

    /* Returns next item from container or null if there are no more items.*/
    public next() {
        if (this._iter < this._items.length) {
            return this._items[this._iter++];
        }
        return null;
    }

    public last() {
        return this._items[this._items.length - 1];
    }

        /* Returns true for empty container.*/
    public isEmpty() {
        return this._items.length === 0;
    }

    public toString() {
        let str = 'Container: ' + this.getName() + '\n';
        const items = this.getItems();
        for (let i = 0; i < items.length; i++) {
            str += items[i].toString() + '\n';
        }
        return str;
    }

    public toJSON() {
        const json = [];
        const items = this.getItems();
        for (let i = 0; i < items.length; i++) {
            json.push(items[i].toJSON());
        }
        return json;
    }
}
Item.Container = Container;

//----------------
/* Gold */
//----------------
export class Gold extends ItemBase {

    protected _purity: number;

    constructor(name) {
        super(name);
        this.setType(RG.ITEM.GOLD);
        this._purity = 1.0;
    }

    public getPurity() {
        return this._purity;
    }

    public setPurity(purity) {
        this._purity = purity;
    }

    public toJSON() {
        const json = super.toJSON();
        json.setType = this.getType();
        json.setPurity = this._purity;
        return json;
    }
}

Item.Gold = Gold;


//-------------------------------------------
/* GoldCoin because we need money. */
//-------------------------------------------
/* Gold coins have standard weight and are (usually) made of pure gold.*/
export class GoldCoin extends Gold {
    constructor(name?: string) {
        const _name = name || RG.GOLD_COIN_NAME;
        super(_name);
        this.setType(RG.ITEM.GOLD_COIN);
        this._purity = 1.0;
        this.setWeight(0.03);
    }
}
Item.GoldCoin = GoldCoin;

//-------------------------------------------
/* SpiritGem for capturing spirits. */
//-------------------------------------------
export class SpiritGem extends ItemBase {

    private _spirit: SentientActor;
    private _hasSpirit: boolean;

    constructor(name) {
        super(name);
        this.setType(RG.ITEM.SPIRITGEM);

        this._spirit = null;
        this._hasSpirit = false;

    }

    public getArmourType() {return this.getType();}

    public hasSpirit() {return this._hasSpirit;}
    public getSpirit() {return this._spirit;}

    public setSpirit(spirit) {
        if (!this._hasSpirit) {
            this._hasSpirit = true;
            this._spirit = spirit;
        }
        else {
            RG.err('Item.SpiritGem', 'setSpirit', 'Tried to overwrite spirit');
        }
    }

    /* Used for capturing the spirits inside the gem.*/
    public useItem(obj): boolean {
        const binder = (this.getOwner() as ItemBase).getOwner();
        if (binder) {
            const bindComp = new Component.SpiritBind();
            bindComp.setTarget(obj.target);
            bindComp.setBinder(binder);
            this.add(bindComp);
            return true;
        }
        else {
            const msg = `binder is null. obj: ${JSON.stringify(obj)}`;
            RG.err('Item.SpiritGem', 'useItem', msg);
        }
        return false;
    }

    public clone() {
        const gem = new SpiritGem(this.getName());
        gem.copy(this);
        return gem;
    }

    public copy(rhs) {
        super.copy(rhs);
        if (rhs.hasSpirit()) {this.setSpirit(rhs.getSpirit());}
    }

    public equals(rhs) {
        let res = super.equals(rhs);
        res = res && (this.getSpirit() === rhs.getSpirit());
        return res;
    }

    public toString() {
        let txt = super.toString();
        if (this.hasSpirit()) {
            const stats = this.getSpirit().get('Stats');
            txt += '(' + this.getSpirit().getName() + ')';
            txt += ' Str: ' + stats.getStrength();
            txt += ' Agi: ' + stats.getAgility();
            txt += ' Acc: ' + stats.getAccuracy();
            txt += ' Wil: ' + stats.getWillpower();
        }
        else {txt += '(Empty)';}
        return txt;
    }

    public toJSON() {
        const json = super.toJSON();
        json.hasSpirit = this.hasSpirit();
        if (json.hasSpirit) {json.setSpirit = this.getSpirit().toJSON();}
        return json;
    }
}
Item.SpiritGem = SpiritGem;

export interface SpiritGem {
    getAccuracy(): number;
    getAgility(): number;
    getMagic(): number;
    getPerception(): number;
    getStrength(): number;
    getWillpower(): number;
}

for (let i = 0; i < RG.GET_STATS.length; i++) {
    SpiritGem.prototype[RG.GET_STATS[i]] = function(): number {
        return (
            () => {
            const funcName: string = RG.GET_STATS[i];
            if (!this._hasSpirit) {return 0;}
            return this._spirit.get('Stats')[funcName]();
        })(); // Immediately call the function
    };
}

//------------------
/* Mineral */
//------------------
export class Mineral extends ItemBase {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM.MINERAL);
    }
}
Item.Mineral = Mineral;

export interface BookData {
    [key: string]: any[];
}

export class Book extends ItemBase {

    public text: string[];
    public metaData: BookData;

    constructor(name) {
        super(name);
        this.setType(RG.ITEM.BOOK);
        this.text = []; // Shown to player
        this.metaData = {}; // Used in quests etc
    }

    public addMetaData(key, obj) {
        if (!this.metaData.hasOwnProperty[key]) {
            this.metaData[key] = [];
        }
        this.metaData[key].push(obj);
    }

    public setMetaData(data) {
        this.metaData = data;
    }

    public getMetaData(key) {
        return this.metaData[key];
    }

    public useItem(): boolean {
        const owner = this.getTopOwner();
        if (owner) {
            const compRead = new Component.Read();
            compRead.setReadTarget(this);
            owner.add(compRead);
            return true;
        }
        return false;
    }

    public getText() {
        return this.text;
    }

    public addText(textLine) {
        this.text.push(textLine);
    }

    public setText(text) {
        this.text = text;
    }

    public clone() {
        const book = new Book(this.getName());
        book.copy(this);
        return book;
    }

    public copy(rhs) {
        super.copy(rhs);
        const text = rhs.getText().slice();
        this.setText(text);
        this.metaData = JSON.parse(JSON.stringify(rhs.metaData));
    }

    public equals(rhs) {
        // Never stack any books
        if (this.getID() === rhs.getID()) {return true;}
        return false;
    }

    public toJSON() {
        const json = super.toJSON();
        json.setText = this.text;
        json.setMetaData = this.metaData;
        return json;
    }
}
Item.Book = Book;

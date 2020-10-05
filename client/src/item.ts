
import RG from './rg';
import {compsToJSON} from './component/component.base';
import * as Component from './component/component';
import * as Mixin from './mixin';
import {Entity} from './entity';
import {EventPool} from '../src/eventpool';
import {Dice} from './dice';
import {TCoord} from './interfaces';

type SentientActor = import('./actor').SentientActor;
// type Level = import('./level').Level;
type Cell = import('./map.cell').Cell;

const POOL = EventPool.getPool();

type Owner = SentientActor | ItemBase | Cell;

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
    protected _owner: null | Owner;

    constructor(name: string) {
        super();
        this.isOwnable = true;
        this._owner = null;
        this.isUsable = false;
        this.add(new Component.Typed(RG.ITEM.BASE, RG.TYPE_ITEM));
        this.add(new Component.Item());
        this.add(new Component.Physical());
        const named = new Component.Named();
        named.setName(name);
        this.add(named);
    }

    public setOwner(owner: Owner): void {
        if (RG.isNullOrUndef([owner])) {
            RG.err('ItemBase', 'setOwner', 'Owner cannot be null.');
        }
        else {
            this._owner = owner;
        }
    }

    /* Returns the top-level owner. Used mainly to recover actor owner of items
     * inside inventory. */
    public getTopOwner(): null | Owner {
        let owner = this._owner;
        while ((owner as ItemBase).getOwner) {
            owner = (owner as ItemBase).getOwner();
        }
        return owner;
    }

    /* Returns the direct owner of this object.*/
    public getOwner(): null | Owner {return this._owner;}

    public getX(): null | number {
        if (this._owner) {return this._owner.getX();}
        return null;
    }

    public getY(): null | number {
        if (this._owner) {return this._owner.getY();}
        return null;
    }

    public getXY(): null | TCoord {
        if (this._owner) {return this._owner.getXY();}
        return null;
    }

    public setName(name: string): void {
        this.get('Named').setName(name);
    }

    public getName(): string {
        return this.get('Named').getFullName();
    }

    public setWeight(weight: number): void {
        this.get('Physical').setWeight(weight);
    }

    public getWeight(): number {return this.get('Physical').getWeight();}

    public setValue(value: number): void {this.get('Item').setValue(value);}
    public getValue(): number {return this.get('Item').getValue();}

    public incrCount(count: number): void {this.get('Item').incrCount(count);}
    public decrCount(count: number): void {this.get('Item').decrCount(count);}
    public getCount(): number {return this.get('Item').getCount();}
    public setCount(count: number): void {this.get('Item').setCount(count);}

    public getType(): string {return this.get('Typed').getObjType();}
    public setType(type: string): void {return this.get('Typed').setObjType(type);}
    public getPropType(): string {return this.get('Typed').getPropType();}
    public setPropType(type: string): void {
        return this.get('Typed').setPropType(type);
    }

    public setDamageType(type: string): void {this.get('Item').setDamageType(type);}
    public getDamageType(): string {return this.get('Item').getDamageType();}

    public getNameWithCount(): string {
        const name = this.getName();
        const count = this.getCount();
        return `${name} (x${count})`;
    }


    /* Used when showing the item in inventory lists etc. */
    public toString(): string {
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

    public copy(rhs: ItemBase): void {
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
        if (this.getType() !== item.getType()) {return false;}
        if (this.getID() === item.getID()) {
            return true;
        }
        let res = this.getName() === item.getName();
        res = res && (this.getWeight() === item.getWeight());
        res = res && !(this.has('GemBound') || item.has('GemBound'));
        return res;
    }

    public toJSON(): any {
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
Item.Base = ItemBase;

//----------------
/* RGItemFood */
//----------------
export class Food extends ItemBase {

    protected _energy: number;

    constructor(name: string) {
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

    public getConsumedEnergy(): number {
        return Math.round(this.getWeight() * this._energy / 0.1);
    }

    public toJSON(): any {
        const json = super.toJSON();
        json.setEnergy = this.getEnergy();
        return json;
    }

    public clone(): Food {
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
    protected actorName: string;

    constructor(name: string) {
        super(name);
        this.setType(RG.ITEM.CORPSE);
    }

    public setActorName(name: string): void {
        this.actorName = name;
    }

    public getActorName(): string {
        return this.actorName;
    }
}
Item.Corpse = Corpse;

//------------------
/* Weapon */
//------------------
export class Weapon extends Mixin.Damage(ItemBase) {

    private _weaponType: string;

    constructor(name: string) {
        super(name);
        this.setType(RG.ITEM.WEAPON);
        this._weaponType = '';
    }

    public copy(rhs: Weapon): void {
        super.copy(rhs);
        this._weaponType = rhs.getWeaponType();
    }

    public clone(): Weapon {
        const weapon = new Weapon(this.getName());
        weapon.copy(this);
        return weapon;
    }

    public setWeaponType(type: string): void {
        this._weaponType = type;
    }

    public getWeaponType(): string {
        return this._weaponType;
    }

    public toJSON(): any {
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

    constructor(name: string) {
        super(name);
        this.setType(RG.ITEM.MISSILE_WEAPON);
        this._fireRate = 1;
    }

    public setFireRate(rate: number): void {
        this._fireRate = rate;
    }

    public getFireRate(): number {
        return this._fireRate;
    }

    public copy(rhs: MissileWeapon): void {
        super.copy(rhs);
        this.setFireRate(rhs.getFireRate());
    }

    public clone(): MissileWeapon {
        const weapon = new MissileWeapon(this.getName());
        weapon.copy(this);
        return weapon;
    }

    public equals(rhs): boolean {
        if (super.equals(rhs)) {
            return this._fireRate === rhs.getFireRate();
        }
        return false;
    }

    public toJSON(): any {
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

    public setAmmoType(type: string): void {this._ammoType = type;}
    public getAmmoType(): string {return this._ammoType;}

    public copy(rhs: Ammo): void {
        super.copy(rhs);
        this.setAmmoType(rhs.getAmmoType());
    }

    public clone(): Ammo {
        const ammo = new Ammo(this.getName());
        ammo.copy(this);
        return ammo;
    }

    public equals(rhs): boolean {
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

    constructor(name: string) {
        super(name);
        this.setType(RG.ITEM.ARMOUR);
        this._armourType = '';
    }

    public setArmourType(type: string): void {this._armourType = type;}
    public getArmourType(): string {return this._armourType;}

    public copy(rhs: Armour): void {
        super.copy(rhs);
        this.setArmourType(rhs.getArmourType());
    }

    public clone(): Armour {
        const armour = new Armour(this.getName());
        armour.copy(this);
        return armour;
    }

    public equals(rhs): boolean {
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
    constructor(name: string) {
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
                    if (RG.isActor(owner)) {
                        const useItemComp = new Component.UseItem();
                        useItemComp.setTarget(target);
                        useItemComp.setItem(this);
                        useItemComp.setUseType(RG.USE.DRINK);
                        (owner as SentientActor).add(useItemComp);
                        return false;
                    }
                    else {
                        RG.err('Item.Potion', 'useItem',
                           `Non-actor user encountered: ${owner}`);
                    }
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

    public clone(): Potion {
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

    constructor(name: string) {
        super(name);
        this.setType(RG.ITEM.RUNE);

        this._charges = 1;
    }

    public getCharges(): number {return this._charges;}
    public setCharges(charges: number): void {this._charges = charges;}

    public clone(): Rune {
        const rune = new Rune(this.getName());
        rune.copy(this);
        return rune;
    }

    public copy(rhs: Rune): void {
        super.copy(rhs);
        this.setCharges(rhs.getCharges());
    }

    public equals(rhs): boolean {
        let res = super.equals(rhs);
        if (rhs.getCharges) {
            res = res && this.getCharges() === rhs.getCharges();
            return res;
        }
        return false;
    }

    public toString(): string {
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

    public clone(): Missile {
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
    public _addItem(item: ItemBase): void {
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
    public getWeight(): number {
        let sum = 0;
        for (let i = 0; i < this._items.length; i++) {
            sum += this._items[i].getWeight() * this._items[i].getCount();
        }
        return sum;
    }

    /* Adds an item. Container becomes item's owner.*/
    public addItem(item: ItemBase): void {
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

    public getItems(): ItemBase[] {return this._items.slice();}

    /* Check by pure obj ref. Returns true if contains item ref.*/
    public hasItemRef(item: ItemBase): boolean {
        const index = this._items.indexOf(item);
        if (index !== -1) {return true;}
        return false;
    }

    /* Used for stacking/equip purposes only. Uses item.equals(), much slower
     * than hasItemRef(). */
    public hasItem(item: ItemBase): boolean {
        if (this.hasItemRef(item)) {return true;}
        const index = this._getMatchingItemIndex(item);
        return index >= 0;
    }

    public hasItemWith(func: (item: ItemBase) => boolean): boolean {
        const index = this._items.findIndex(func);
        return index >= 0;
    }

    /* Tries to remove an item. Returns true on success, false otherwise.*/
    public removeItem(item: ItemBase): boolean {
        if (this.hasItem(item)) {
            return this._removeItem(item);
        }
        this._removedItem = null;
        return false;
    }

    public _getMatchingItemIndex(item: ItemBase): number {
        for (let i = 0; i < this._items.length; i++) {
            if (item.equals(this._items[i])) {return i;}
        }
        return -1;
    }

    public _removeItem(item: ItemBase): boolean {
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
    public getRemovedItem(): ItemBase {return this._removedItem;}

    /* Removes N items from the inventory of given type.*/
    public removeNItems(item: ItemBase, n: number): boolean {
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
    public first(): ItemBase | null {
        if (this._items.length > 0) {
            this._iter = 1;
            return this._items[0];
        }
        return null;
    }

    /* Returns next item from container or null if there are no more items.*/
    public next(): ItemBase | null {
        if (this._iter < this._items.length) {
            return this._items[this._iter++];
        }
        return null;
    }

    public last() {
        return this._items[this._items.length - 1];
    }

        /* Returns true for empty container.*/
    public isEmpty(): boolean {
        return this._items.length === 0;
    }

    public toString(): string {
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
        this.setWeight(RG.GOLD_COIN_WEIGHT);
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

    public getArmourType(): string {return this.getType();}

    public hasSpirit(): boolean {return this._hasSpirit;}
    public getSpirit(): SentientActor {return this._spirit;}

    public setSpirit(spirit: SentientActor): void {
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

    public clone(): SpiritGem {
        const gem = new SpiritGem(this.getName());
        gem.copy(this);
        return gem;
    }

    public copy(rhs: SpiritGem): void {
        super.copy(rhs);
        if (rhs.hasSpirit()) {this.setSpirit(rhs.getSpirit());}
    }

    public equals(rhs): boolean {
        let res = super.equals(rhs);
        res = res && (this.getSpirit() === rhs.getSpirit());
        return res;
    }

    public toString(): string {
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
    constructor(name: string) {
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

    constructor(name: string) {
        super(name);
        this.setType(RG.ITEM.BOOK);
        this.text = []; // Shown to player
        this.metaData = {}; // Used in quests etc
    }

    public addMetaData(key: string, obj: any): void {
        if (!this.metaData.hasOwnProperty[key]) {
            this.metaData[key] = [];
        }
        this.metaData[key].push(obj);
    }

    public setMetaData(data: BookData): void {
        this.metaData = data;
    }

    public getMetaData(key: string): any {
        return this.metaData[key];
    }

    public useItem(): boolean {
        const owner = this.getTopOwner();
        if (RG.isActor(owner)) {
            const compRead = new Component.Read();
            compRead.setReadTarget(this);
            (owner as SentientActor).add(compRead);
            return true;
        }
        return false;
    }

    public getText(): string[] {
        return this.text;
    }

    public addText(textLine: string): void {
        this.text.push(textLine);
    }

    public setText(text: string[]): void {
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

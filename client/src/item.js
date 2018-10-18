
const RG = require('./rg');
const Component = require('./component');
const Entity = require('./entity');
const Mixin = require('./mixin');

//---------------------------------------------------------------------------
// ITEMS
//---------------------------------------------------------------------------

RG.Item = {};

/* Models an item. Each item is ownable by someone. During game, there are no
 * items with null owners. Ownership shouldn't be ever set to null. */
class ItemBase extends Mixin.Ownable(Entity) {

    constructor(name) {
        super({owner: null});
        this._name = name;
        this.add(new Component.Typed(RG.ITEM.BASE, RG.TYPE_ITEM));
        this.add(new Component.Item());
        this.add(new Component.Physical());
    }

    setName(name) {this._name = name;}
    getName() {return this._name;}

    setWeight(weight) {
        this.get('Physical').setWeight(weight);
    }

    getWeight() {return this.get('Physical').getWeight();}

    setValue(value) {this.get('Item').setValue(value);}
    getValue() {return this.get('Item').getValue();}

    incrCount(count) {this.get('Item').incrCount(count);}
    decrCount(count) {this.get('Item').decrCount(count);}
    getCount() {return this.get('Item').getCount();}
    setCount(count) {this.get('Item').setCount(count);}

    getType() {return this.get('Typed').getObjType();}
    setType(type) {return this.get('Typed').setObjType(type);}
    getPropType() {return this.get('Typed').getPropType();}
    setPropType(type) {return this.get('Typed').setPropType(type);}

    setDamageType(type) {this.get('Item').setDamageType(type);}
    getDamageType() {return this.get('Item').getDamageType();}

    /* Used when showing the item in inventory lists etc. */
    toString() {
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

    copy(rhs) {
        this.setName(rhs.getName());
        this.setType(rhs.getType());
        this.setWeight(rhs.getWeight());
        this.setValue(rhs.getValue());

        if (rhs.useArgs) {
            this.useArgs = rhs.useArgs;
        }
        if (rhs.useItem) {
            this.useItem = rhs.useItem.bind(this);
        }

        const comps = Object.values(rhs.getComponents());
        comps.forEach(comp => {
            this.add(comp.clone());
        });
    }

    clone() {
        const newItem = new RG.Item.Base(this.getName());
        newItem.copy(this);
        return newItem;
    }

    equals(item) {
        if (this.getID() === item.getID()) {
            return true;
        }
        let res = this.getName() === item.getName();
        res = res && (this.getType() === item.getType());
        res = res && (this.getWeight() === item.getWeight());
        res = res && !(this.has('GemBound') || item.has('GemBound'));
        return res;
    }

    toJSON() {
        const json = {
            setID: this.getID(),
            setName: this.getName(),
            setType: this.getType() // Needed for de-ser
        };
        json.components = Component.compsToJSON(this);
        return json;
    }

}
RG.Item.Base = ItemBase;

//----------------
/* RGItemFood */
//----------------
class RGItemFood extends ItemBase {

    constructor(name) {
        super(name);
        this.setType(RG.ITEM.FOOD);
        this._energy = 0; // per 0.1 kg
    }

    setEnergy(energy) {this._energy = energy;}
    getEnergy() {return this._energy;}

    /* Uses (eats) the food item.*/
    useItem(obj) {
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
                        RG.POOL.emitEvent(RG.EVT_DESTROY_ITEM, msg);
                        RG.gameMsg(target.getName() + ' consumes ' +
                            this.getName());
                    }
                    else {
                        this.decrCount(1);
                    }
                }
                else {
                    RG.gameWarn(target.getName() +
                        ' is not interested in eating.');
                }
            }
            else {
                RG.gameWarn("There's no one to give food to.");
            }
        }
        else {
            RG.err('ItemFood', 'useItem', 'No target given in obj.');
        }
    }

    getConsumedEnergy() {
        return Math.round(this.getWeight() * this._energy / 0.1);
    }

    toJSON() {
        const json = super.toJSON();
        json.setEnergy = this.getEnergy();
        return json;
    }

    clone() {
        const newFood = new RG.Item.Food(this.getName());
        newFood.copy(this);
        newFood.setEnergy(this.getEnergy());
        return newFood;
    }
}

RG.Item.Food = RGItemFood;


//------------------
/* RGItemCorpse */
//------------------
class RGItemCorpse extends ItemBase {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM.CORPSE);
    }
}
RG.Item.Corpse = RGItemCorpse;

//------------------
/* RGItemWeapon */
//------------------
class RGItemWeapon extends Mixin.Damage(ItemBase) {

    constructor(name) {
        super(name);
        this.setType(RG.ITEM.WEAPON);
        this._weaponType = '';
    }

    copy(rhs) {
        super.copy(rhs);
        this._weaponType = rhs.getWeaponType();
    }

    clone() {
        const weapon = new RGItemWeapon(this.getName());
        weapon.copy(this);
        return weapon;
    }

    setWeaponType(type) {
        this._weaponType = type;
    }

    getWeaponType() {
        return this._weaponType;
    }

    toJSON() {
        const json = super.toJSON();
        json.setWeaponType = this._weaponType;
        return json;
    }

}

RG.Item.Weapon = RGItemWeapon;

//-------------------------
/* RGItemMissileWeapon */
//-------------------------
class RGItemMissileWeapon extends RGItemWeapon {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM.MISSILE_WEAPON);
        this._fireRate = 1;
    }

    setFireRate(rate) {
        this._fireRate = rate;
    }

    getFireRate() {
        return this._fireRate;
    }

    copy(rhs) {
        super.copy(rhs);
        this.setFireRate(rhs.getFireRate());
    }

    clone() {
        const weapon = new RGItemMissileWeapon(this.getName());
        weapon.copy(this);
        return weapon;
    }

    equals(rhs) {
        if (super.equals(rhs)) {
            return this._fireRate === rhs.getFireRate();
        }
        return false;
    }

    toJSON() {
        const json = super.toJSON();
        json.setFireRate = this._fireRate;
        return json;
    }

}
RG.Item.MissileWeapon = RGItemMissileWeapon;

//---------------------------------------
/* RGItemAmmo Object for ammunition. */
//---------------------------------------
class RGItemAmmo extends RGItemWeapon {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM.AMMUNITION);
        this.add(new Component.Ammo());
        this._ammoType = '';
    }

    setAmmoType(type) {this._ammoType = type;}
    getAmmoType() {return this._ammoType;}

    copy(rhs) {
        super.copy(rhs);
        this.setAmmoType(rhs.getAmmoType());
    }

    clone() {
        const ammo = new RGItemAmmo(this.getName());
        ammo.copy(this);
        return ammo;
    }

    equals(rhs) {
        if (super.equals(rhs)) {
            return this._ammoType === rhs.getAmmoType();
        }
        return false;
    }

    toJSON() {
        const json = super.toJSON();
        json.setAmmoType = this._ammoType;
        return json;
    }

}

RG.Item.Ammo = RGItemAmmo;

//-------------------------------------------
/* RGItemArmour Object for armour items. */
//-------------------------------------------
class RGItemArmour extends Mixin.Defense(ItemBase) {

    constructor(name) {
        super(name);
        this.setType(RG.ITEM.ARMOUR);
        this._armourType = null;

        this.setArmourType = type => {this._armourType = type;};
        this.getArmourType = () => this._armourType;
    }

    copy(rhs) {
        super.copy(rhs);
        this.setArmourType(rhs.getArmourType());
    }

    clone() {
        const armour = new RGItemArmour(this.getName());
        armour.copy(this);
        return armour;
    }

    equals(rhs) {
        let res = super.equals(rhs);
        res = res && this._armourType === rhs.getArmourType();
        return res;
    }

    toJSON() {
        const json = super.toJSON();
        json.setArmourType = this.getArmourType();
        return json;
    }
}

RG.Item.Armour = RGItemArmour;

//--------------------------------------
/* RGItemPotion Object for potions. */
//--------------------------------------
class RGItemPotion extends ItemBase {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM.POTION);
    }

    useItem(obj) {
        if (obj.hasOwnProperty('target')) {
            const cell = obj.target;
            if (cell.hasActors()) {
                const target = cell.getProp('actors')[0];
                const die = new RG.Die(1, 10, 2);
                const pt = die.roll();
                if (target.has('Health')) {
                    target.get('Health').addHP(pt);
                    const owner = this.getOwner().getOwner();
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

    clone() {
        const newPotion = new RG.Item.Potion(this.getName());
        newPotion.copy(this);
        return newPotion;
    }
}

RG.Item.Potion = RGItemPotion;

//----------------------------------------
/* RGItemRune Object for rune stones. */
//----------------------------------------
class RGItemRune extends ItemBase {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM.RUNE);

        this._charges = 1;
    }

    getCharges() {return this._charges;}
    setCharges(charges) {this._charges = charges;}

    clone() {
        const rune = new RGItemRune(this.getName());
        rune.copy(this);
        return rune;
    }

    copy(rhs) {
        super.copy(rhs);
        this.setCharges(rhs.getCharges());
    }

    equals(rhs) {
        let res = super.equals(rhs);
        if (rhs.getCharges) {
            res = res && this.getCharges() === rhs.getCharges();
            return res;
        }
        return false;
    }

    toString() {
        let res = super.toString();
        res += ` charges: ${this.getCharges()}`;
        return res;
    }

    toJSON() {
        const json = super.toJSON();
        json.setCharges = this.getCharges();
        return json;
    }
}
RG.Item.Rune = RGItemRune;

//----------------------------------------------
/* RGItemMissile Object for thrown missile. */
//----------------------------------------------
class RGItemMissile extends RGItemWeapon {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM.MISSILE);
    }

    clone() {
        const weapon = new RGItemMissile(this.getName());
        weapon.copy(this);
        return weapon;
    }

}

RG.Item.Missile = RGItemMissile;

//------------------------------------------------------
/* RGItemContainer An item which holds other items. */
//------------------------------------------------------
class RGItemContainer extends ItemBase {

    constructor(owner) {
        super('container');
        this.setOwner(owner);

        this._items = [];
        this._iter = 0;
        this._removedItem = null; // Last removed item
    }

    /* Adds one item to container. Always succeeds. */
    _addItem(item) {
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
    getWeight() {
        let sum = 0;
        for (let i = 0; i < this._items.length; i++) {
            sum += this._items[i].getWeight() * this._items[i].getCount();
        }
        return sum;
    }

    /* Adds an item. Container becomes item's owner.*/
    addItem(item) {
        if (item.getCount() <= 0) {
            const str = JSON.stringify(item);
            RG.warn('RGItemContainer', 'addItem',
                `Possible bug. Tried to add item with count 0: ${str}`);
        }
        if (item.getType() === 'container') {
            if (this.getOwner() !== item) {
                this._addItem(item);
            }
            else {
                RG.err('Item', 'addItem',
                    "Added item is container's owner. Impossible.");
            }
        }
        else {
            this._addItem(item);
        }
    }

    getItems() {return this._items.slice();}

    /* Check by pure obj ref. Returns true if contains item ref.*/
    hasItemRef(item) {
        const index = this._items.indexOf(item);
        if (index !== -1) {return true;}
        return false;
    }

    /* Used for stacking/equip purposes only. Uses item.equals(), much slower
     * than hasItemRef(). */
    hasItem(item) {
        if (this.hasItemRef(item)) {return true;}
        const index = this._getMatchingItemIndex(item);
        return index >= 0;
    }

    /* Tries to remove an item. Returns true on success, false otherwise.*/
    removeItem(item) {
        if (this.hasItem(item)) {
            return this._removeItem(item);
        }
        this._removedItem = null;
        return false;
    }

    _getMatchingItemIndex(item) {
        for (let i = 0; i < this._items.length; i++) {
            if (item.equals(this._items[i])) {return i;}
        }
        return -1;
    }

    _removeItem(item) {
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
    getRemovedItem() {return this._removedItem;}

    /* Removes N items from the inventory of given type.*/
    removeNItems(item, n) {
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
    first() {
        if (this._items.length > 0) {
            this._iter = 1;
            return this._items[0];
        }
        return null;
    }

    /* Returns next item from container or null if there are no more items.*/
    next() {
        if (this._iter < this._items.length) {
            return this._items[this._iter++];
        }
        return null;
    }

    last() {
        return this._items[this._items.length - 1];
    }

        /* Returns true for empty container.*/
    isEmpty() {
        return this._items.length === 0;
    }

    toString() {
        let str = 'Container: ' + this.getName() + '\n';
        const items = this.getItems();
        for (let i = 0; i < items.length; i++) {
            str += items[i].toString() + '\n';
        }
        return str;
    }

    toJSON() {
        const json = [];
        const items = this.getItems();
        for (let i = 0; i < items.length; i++) {
            json.push(items[i].toJSON());
        }
        return json;
    }
}
RG.Item.Container = RGItemContainer;

//----------------
/* RGItemGold */
//----------------
class RGItemGold extends ItemBase {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM.GOLD);
        this._purity = 1.0;
    }

    getPurity() {
        return this._purity;
    }

    setPurity(purity) {
        this._purity = purity;
    }

    toJSON() {
        const json = super.toJSON();
        json.setType = this.getType();
        json.setPurity = this._purity;
        return json;
    }
}

RG.Item.Gold = RGItemGold;


//-------------------------------------------
/* RGItemGoldCoin because we need money. */
//-------------------------------------------
/* Gold coins have standard weight and are (usually) made of pure gold.*/
class RGItemGoldCoin extends RGItemGold {
	constructor(name) {
		const _name = name || RG.GOLD_COIN_NAME;
		super(_name);
		this.setType(RG.ITEM.GOLD_COIN);
		this._purity = 1.0;
		this.setWeight(0.03);
	}
}
RG.Item.GoldCoin = RGItemGoldCoin;

//-------------------------------------------
/* RGItemSpiritGem for capturing spirits. */
//-------------------------------------------
class RGItemSpiritGem extends ItemBase {

    constructor(name) {
        super(name);
        this.setType(RG.ITEM.SPIRITGEM);

        this._spirit = null;
        this._hasSpirit = false;

        const createGetFunc = i => {
            const funcName = RG.GET_STATS[i];
            return () => {
                if (!this._hasSpirit) {return 0;}
                return this._spirit.get('Stats')[funcName]();
            };
        };

        for (let i = 0; i < RG.GET_STATS.length; i++) {
            this[RG.GET_STATS[i]] = createGetFunc(i);
        }

    }

    getArmourType() {return this.getType();}

    hasSpirit() {return this._hasSpirit;}
    getSpirit() {return this._spirit;}

    setSpirit(spirit) {
        if (!this._hasSpirit) {
            this._hasSpirit = true;
            this._spirit = spirit;
        }
        else {
            RG.err('Item.SpiritGem', 'setSpirit', 'Tried to overwrite spirit');
        }
    }

    /* Used for capturing the spirits inside the gem.*/
    useItem(obj) {
        const binder = this.getOwner().getOwner();
        if (binder) {
            const bindComp = new Component.SpiritBind();
            bindComp.setTarget(obj.target);
            bindComp.setBinder(binder);
            this.add(bindComp);
        }
        else {
            const msg = `binder is null. obj: ${JSON.stringify(obj)}`;
            RG.err('Item.SpiritGem', 'useItem', msg);
        }
    }

    clone() {
        const gem = new RGItemSpiritGem(this.getName());
        gem.copy(this);
        return gem;
    }

    copy(rhs) {
        super.copy(rhs);
        if (rhs.hasSpirit()) {this.setSpirit(rhs.getSpirit());}
    }

    equals(rhs) {
        let res = super.equals(rhs);
        res = res && (this.getSpirit() === rhs.getSpirit());
        return res;
    }

    toString() {
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

    toJSON() {
        const json = super.toJSON();
        json.hasSpirit = this.hasSpirit();
        if (json.hasSpirit) {json.setSpirit = this.getSpirit().toJSON();}
        return json;
    }
}
RG.Item.SpiritGem = RGItemSpiritGem;

//------------------
/* RGItemMineral */
//------------------
class RGItemMineral extends ItemBase {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM.MINERAL);
    }
}
RG.Item.Mineral = RGItemMineral;

class RGItemBook extends ItemBase {

    constructor(name) {
        super(name);
        this.setType(RG.ITEM.BOOK);
        this.text = []; // Shown to player
        this.metaData = {}; // Used in quests etc
    }

    addMetaData(key, obj) {
        if (!this.metaData.hasOwnProperty[key]) {
            this.metaData[key] = [];
        }
        this.metaData[key].push(obj);
    }

    setMetaData(data) {
        this.metaData = data;
    }

    getMetaData(key) {
        return this.metaData[key];
    }

    useItem() {
        const owner = this.getTopOwner();
        if (owner) {
            const compRead = new Component.Read();
            compRead.setReadTarget(this);
            owner.add(compRead);
        }
    }

    getText() {
        return this.text;
    }

    addText(textLine) {
        this.text.push(textLine);
    }

    setText(text) {
        this.text = text;
    }

    clone() {
        const book = new RGItemBook(this.getName());
        book.copy(this);
        return book;
    }

    copy(rhs) {
        super.copy(rhs);
        const text = rhs.getText().slice();
        this.setText(text);
        this.metaData = JSON.parse(JSON.stringify(rhs.metaData));
    }

    equals(rhs) {
        // Never stack any books
        if (this.getID() === rhs.getID()) {return true;}
        return false;
    }

    toJSON() {
        const json = super.toJSON();
        json.setText = this.text;
        json.setMetaData = this.metaData;
        return json;
    }
}
RG.Item.Book = RGItemBook;

module.exports = RG.Item;

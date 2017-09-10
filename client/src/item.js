

const RG = require('./rg.js');
RG.Object = require('./object.js');
RG.Component = require('./component.js');

const Mixin = require('./mixin');

import Entity from './entity';

// Constants for different item types
RG.ITEM_ITEM = 'item';
RG.ITEM_FOOD = 'food';
RG.ITEM_CORPSE = 'corpse';
RG.ITEM_WEAPON = 'weapon';
RG.ITEM_ARMOUR = 'armour';
RG.ITEM_SPIRITGEM = 'spiritgem';
RG.ITEM_GOLD = 'gold';
RG.ITEM_MISSILE = 'missile';
RG.ITEM_MISSILE_WEAPON = 'missileweapon';
RG.ITEM_AMMUNITION = 'ammo';
RG.ITEM_POTION = 'potion';
RG.ITEM_RUNE = 'rune';
RG.ITEM_GOLD_COIN = 'goldcoin';

//---------------------------------------------------------------------------
// ITEMS
//---------------------------------------------------------------------------

RG.Item = {};

/* Models an item. Each item is ownable by someone. During game, there are no
 * items with null owners. Ownership shouldn't be ever set to null. */
class ItemBase extends Mixin.Typed(Mixin.Ownable(Entity)) {

    constructor(name) {
        super({owner: null, type: RG.TYPE_ITEM, propType: RG.TYPE_ITEM});
        this._name = name;
        this._value = 1;
        this.count = 1; // Number of items
        this.add('Physical', new RG.Component.Physical());
    }


    setName(name) {this._name = name;};
    getName() {return this._name;}

    setWeight(weight) {
        this.get('Physical').setWeight(weight);
    };

    getWeight() {return this.get('Physical').getWeight();};

    setValue(value) {this._value = value;};
    getValue() {return this._value;}

    setCount(count) {this.count = count;};

    /* Used when showing the item in inventory lists etc. */
    toString() {
        let txt = this.getName() + ', ' + this.getType() + ', ';
        const totalWeight = this.getWeight() * this.count;
        txt += totalWeight.toFixed(2) + 'kg';
        if (this.hasOwnProperty('count')) {
            txt = this.count + ' x ' + txt;
        }
        return txt;
    };

    equals(item) {
        let res = this.getName() === item.getName();
        res = res && (this.getType() === item.getType());
        return res;
    };

    copy(rhs) {
        this.setName(rhs.getName());
        this.setType(rhs.getType());
        this.setWeight(rhs.getWeight());
        this.setValue(rhs.getValue());
    };

    clone() {
        const newItem = new RG.Item.Base(this.getName());
        newItem.copy(this);
        return newItem;
    };

    toJSON() {
        const json = {
            setID: this.getID(),
            setName: this.getName(),
            setValue: this.getValue(),
            setWeight: this.getWeight(),
            setPropType: RG.TYPE_ITEM,
            setType: this.getType(),
            setCount: this.count
        };
        const components = {};
        const thisComps = this.getComponents();
        Object.keys(thisComps).forEach(name => {
            components[thisComps[name].getType()] = thisComps[name].toJSON();
        });
        json.components = components;
        return json;
    };

}
RG.Item.Base = ItemBase;

//----------------
/* RGItemFood */
//----------------
class RGItemFood extends ItemBase {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM_FOOD);

        this._energy = 0; // per 0.1 kg

        this.setEnergy = energy => {this._energy = energy;};
        this.getEnergy = () => this._energy;

        this.getConsumedEnergy = function() {
            return Math.round( (this.getWeight() * this._energy) / 0.1);
        };

        /* Uses (eats) the food item.*/
        this.useItem = function(obj) {
            if (obj.hasOwnProperty('target')) {
                const cell = obj.target;
                if (cell.hasActors()) {
                    const target = cell.getProp('actors')[0];
                    if (target.has('Hunger')) {
                        const totalEnergy = this.getConsumedEnergy();
                        target.get('Hunger').addEnergy(totalEnergy);
                        if (this.count === 1) {
                            const msg = {item: this};
                            RG.POOL.emitEvent(RG.EVT_DESTROY_ITEM, msg);
                            RG.gameMsg(target.getName() + ' consumes ' +
                                this.getName());
                        }
                        else {
                            this.count -= 1;
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
        };

    }

    toJSON() {
        const json = super.toJSON();
        json.setEnergy = this.getEnergy();
        return json;
    }
}

RG.Item.Food = RGItemFood;


//------------------
/* RGItemCorpse */
//------------------
class RGItemCorpse extends ItemBase {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM_CORPSE);
    }
}

RG.Item.Corpse = RGItemCorpse;

//------------------
/* RGItemWeapon */
//------------------
class RGItemWeapon extends ItemBase {

    constructor(name) {
        super(name);
        RG.Object.Damage.call(this);
        this.setType(RG.ITEM_WEAPON);
    }

    toString() {
        let msg = super.toString();
        msg += RG.Object.Damage.prototype.toString.call(this);
        return msg;
    }

    clone() {
        const weapon = new RGItemWeapon(this.getName());
        weapon.copy(this);
        return weapon;
    }

    copy(rhs) {
        super.copy(rhs);
        RG.Object.Damage.prototype.copy.call(this, rhs);
    }

    equals(rhs) {
        let res = super.equals(rhs);
        res = res && RG.Object.Damage.prototype.equals.call(this, rhs);
        return res;
    }

    toJSON() {
        const json = super.toJSON();
        const json2 = RG.Object.Damage.prototype.toJSON.call(this);
        Object.keys(json2).forEach(p => {
            json[p] = json2[p];
        });
        return json;
    }
}
RG.extend2(RGItemWeapon, RG.Object.Damage);

RG.Item.Weapon = RGItemWeapon;

//-------------------------
/* RGItemMissileWeapon */
//-------------------------
class RGItemMissileWeapon extends RGItemWeapon {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM_MISSILE_WEAPON);
    }
}
RG.Item.MissileWeapon = RGItemMissileWeapon;

//---------------------------------------
/* RGItemAmmo Object for ammunition. */
//---------------------------------------
class RGItemAmmo extends RGItemWeapon {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM_MISSILE);
        this.add('Ammo', new RG.Component.Ammo());
    }

    clone() {
        const ammo = new RGItemAmmo(this.getName());
        ammo.copy(this);
        return ammo;
    }

    copy(rhs) {
        super.copy(rhs);
        RG.Object.Damage.prototype.copy.call(this, rhs);
    }

    equals(rhs) {
        let res = super.equals(rhs);
        res = res && RG.Object.Damage.prototype.equals.call(this, rhs);
        return res;
    }
}

RG.Item.Ammo = RGItemAmmo;

//-------------------------------------------
/* RGItemArmour Object for armour items. */
//-------------------------------------------
class RGItemArmour extends ItemBase {

    constructor(name) {
        super(name);
        RG.Object.Defense.call(this);
        this.setType(RG.ITEM_ARMOUR);
        this._armourType = null;

        this.setArmourType = type => {this._armourType = type;};
        this.getArmourType = () => this._armourType;
    }

    clone() {
        const armour = new RGItemArmour(this.getName());
        armour.copy(this);
        return armour;
    }

    copy(rhs) {
        super.copy(rhs);
        RG.Object.Defense.prototype.copy.call(this, rhs);
        this.setArmourType(rhs.getArmourType());
    }

    equals(rhs) {
        let res = super.equals(rhs);
        res = res && RG.Object.Defense.prototype.equals.call(this, rhs);
        return res;
    }

    toJSON() {
        const json = super.toJSON();
        const json2 = RG.Object.Defense.prototype.toJSON.call(this);
        Object.keys(json2).forEach(p => {
            json[p] = json2[p];
        });
        json.setArmourType = this.getArmourType();
        return json;
    }
}
RG.extend2(RGItemArmour, RG.Object.Defense);

RG.Item.Armour = RGItemArmour;

//--------------------------------------
/* RGItemPotion Object for potions. */
//--------------------------------------
class RGItemPotion extends ItemBase {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM_POTION);
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
                    if (this.count === 1) {
                        const msg = {item: this};
                        RG.POOL.emitEvent(RG.EVT_DESTROY_ITEM, msg);
                        RG.gameMsg(target.getName() + ' drinks '
                            + this.getName());
                    }
                    else {
                        this.count -= 1;
                    }
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
}

RG.Item.Potion = RGItemPotion;

//----------------------------------------
/* RGItemRune Object for rune stones. */
//----------------------------------------
class RGItemRune extends ItemBase {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM_RUNE);

        this._charges = 1;

        this.getCharges = () => this._charges;
        this.setCharges = (charges) => {this._charges = charges;};

        this.useItem = () => {
            // Various complex effects
        };

    }

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
        res = res && this.getCharges() === rhs.getCharges();
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
class RGItemMissile extends ItemBase {
    constructor(name) {
        super(name);
        RG.Object.Damage.call(this);
        this.setType(RG.ITEM_MISSILE);
    }

    clone() {
        const weapon = new RGItemMissile(this.getName());
        weapon.copy(this);
        return weapon;
    }

    copy(rhs) {
        super.copy(rhs);
        RG.Object.Damage.prototype.copy.call(this, rhs);
    }

    equals(rhs) {
        let res = super.equals(rhs);
        res = res && RG.Object.Damage.prototype.equals.call(this, rhs);
        return res;

    }

    toJSON() {
        const json = super.toJSON();
        const json2 = RG.Object.Damage.prototype.toJSON.call(this);
        Object.keys(json2).forEach(p => {
            json[p] = json2[p];
        });
        return json;
    }
}
RG.extend2(RGItemMissile, RG.Object.Damage);

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

    _addItem(item) {
        let matchFound = false;
        for (let i = 0; i < this._items.length; i++) {
            if (this._items[i].equals(item)) {
                if (this._items[i].hasOwnProperty('count')) {
                    if (item.hasOwnProperty('count')) {
                        this._items[i].count += item.count;
                    }
                    else {
                        this._items[i].count += 1;
                    }
                }
                else if (item.hasOwnProperty('count')) {
                        this._items[i].count = 1 + item.count;
                    }
                    else {
                        this._items[i].count = 2;
                    }
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
            sum += this._items[i].getWeight() * this._items[i].count;
        }
        return sum;
    }

        /* Adds an item. Container becomes item's owner.*/
    addItem(item) {
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

    getItems() {return this._items;}

    /* Check by pure obj ref. Returns true if contains item ref.*/
    hasItemRef(item) {
        const index = this._items.indexOf(item);
        if (index !== -1) {return true;}
        return false;
    }

    /* Used for stacking/equip purposes only.*/
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

        if (this._items[i].hasOwnProperty('count')) {
            this._removedItem = RG.removeStackedItems(this._items[i], 1);
            if (this._items[i].count === 0) {this._items.splice(i, 1);}
        }
        else {
            this._removedItem = item;
            this._items.splice(i, 1);
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
            this._removedItem.count = count;
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
        this.setType(RG.ITEM_GOLD);
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
		this.setType(RG.ITEM_GOLD_COIN);
		this._purity = 1.0;
		this.setWeight(0.03);
	}
};
RG.Item.GoldCoin = RGItemGoldCoin;

//-------------------------------------------
/* RGItemSpiritGem for capturing spirits. */
//-------------------------------------------
class RGItemSpiritGem extends ItemBase {
    constructor(name) {
        super(name);
        this.setType(RG.ITEM_SPIRITGEM);

        let _spirit = null;
        let _hasSpirit = false;
        this.getArmourType = () => 'spiritgem';

        this.hasSpirit = () => _hasSpirit;
        this.getSpirit = () => _spirit;

        this.setSpirit = spirit => {
            if (!_hasSpirit) {
                _hasSpirit = true;
                _spirit = spirit;
            }
            else {
                RG.err('Item.Spirit', 'setSpirit', 'Tried to overwrite spirit');
            }
        };

        /* Used for capturing the spirits inside the gem.*/
        this.useItem = function(obj) {
            if (!_hasSpirit) {
                const cell = obj.target;
                const spirits = cell.getPropType('spirit');
                if (spirits.length > 0) {
                    const spirit = spirits[0];
                    // spirit.remove("Action"); // Trapped spirit cannot act
                    spirit.get('Action').disable(); // Trapped spirit cannot act
                    // if (spirit.has("Movement")) spirit.remove("Movement");
                    const level = spirit.getLevel();
                    level.removeActor(spirit);
                    _spirit = spirit;
                    _hasSpirit = true;
                }
                else if (cell.hasActors()) {
                        RG.gameWarn(
                            'That thing there is something else than spirit.');
                    }
                    else {
                        RG.gameWarn('There are no spirits there to be trapped');
                    }
            }
            else {
                RG.gameWarn(this.getName() + ' already traps a spirit');
            }
        };

        // Generate getters which access spirit's Stats component
        const _getters =
            ['getStrength', 'getWillpower', 'getAccuracy', 'getAgility'];

        const createGetFunc = i => {
            const funcName = _getters[i];
            return () => {
                if (!_hasSpirit) {return 0;}
                return _spirit.get('Stats')[funcName]();
            };
        };

        for (let i = 0; i < _getters.length; i++) {
            this[_getters[i]] = createGetFunc(i);
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

module.exports = RG.Item;

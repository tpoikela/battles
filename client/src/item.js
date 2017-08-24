

const RG = require('./rg.js');
RG.Object = require('./object.js');
RG.Component = require('./component.js');

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
RG.Item.Base = function(name) {
    RG.Object.Typed.call(this, RG.TYPE_ITEM, RG.TYPE_ITEM);
    RG.Object.Ownable.call(this, null);
    RG.Entity.call(this);

    let _name = name;
    let _value = 1;

    this.add('Physical', new RG.Component.Physical());

    this.count = 1; // Number of items

    this.setName = function(name) {_name = name;};
    this.getName = function() {return _name;};

    this.setWeight = function(weight) {this.get('Physical').setWeight(weight);};
    this.getWeight = function() {return this.get('Physical').getWeight();};

    this.setValue = function(value) {_value = value;};
    this.getValue = function() {return _value;};

    this.setCount = function(count) {this.count = count;};

};
RG.extend2(RG.Item.Base, RG.Object.Typed);
RG.extend2(RG.Item.Base, RG.Object.Ownable);

/* Used when showing the item in inventory lists etc. */
RG.Item.Base.prototype.toString = function() {
    let txt = this.getName() + ', ' + this.getType() + ', ';
    const totalWeight = this.getWeight() * this.count;
    txt += totalWeight.toFixed(2) + 'kg';
    if (this.hasOwnProperty('count')) {
        txt = this.count + ' x ' + txt;
    }
    return txt;
};

RG.Item.Base.prototype.equals = function(item) {
    let res = this.getName() === item.getName();
    res = res && (this.getType() === item.getType());
    return res;
};

RG.Item.Base.prototype.copy = function(rhs) {
    this.setName(rhs.getName());
    this.setType(rhs.getType());
    this.setWeight(rhs.getWeight());
    this.setValue(rhs.getValue());
};

RG.Item.Base.prototype.clone = function() {
    const newItem = new RG.Item.Base(this.getName());
    newItem.copy(this);
    return newItem;
};

RG.Item.Base.prototype.toJSON = function() {
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


//----------------
/* RG.Item.Food */
//----------------
RG.Item.Food = function(name) {
    RG.Item.Base.call(this, name);
    this.setType(RG.ITEM_FOOD);

    let _energy = 0; // per 0.1 kg

    this.setEnergy = function(energy) {_energy = energy;};
    this.getEnergy = function() {return _energy;};

    this.getConsumedEnergy = function() {
        return Math.round( (this.getWeight() * _energy) / 0.1);
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

};
RG.extend2(RG.Item.Food, RG.Item.Base);

RG.Item.Food.prototype.toJSON = function() {
    const json = RG.Item.Base.prototype.toJSON.call(this);
    json.setEnergy = this.getEnergy();
    return json;
};


//------------------
/* RG.Item.Corpse */
//------------------
RG.Item.Corpse = function(name) {
    RG.Item.Base.call(this, name);
    this.setType(RG.ITEM_CORPSE);
};
RG.extend2(RG.Item.Corpse, RG.Item.Base);

//------------------
/* RG.Item.Weapon */
//------------------
RG.Item.Weapon = function(name) {
    RG.Item.Base.call(this, name);
    RG.Object.Damage.call(this);
    this.setType(RG.ITEM_WEAPON);
};
RG.extend2(RG.Item.Weapon, RG.Item.Base);
RG.extend2(RG.Item.Weapon, RG.Object.Damage);

RG.Item.Weapon.prototype.toString = function() {
    let msg = RG.Item.Base.prototype.toString.call(this);
    msg += RG.Object.Damage.prototype.toString.call(this);
    return msg;
};

RG.Item.Weapon.prototype.clone = function() {
    const weapon = new RG.Item.Weapon(this.getName());
    weapon.copy(this);
    return weapon;
};

RG.Item.Weapon.prototype.copy = function(rhs) {
    RG.Item.Base.prototype.copy.call(this, rhs);
    RG.Object.Damage.prototype.copy.call(this, rhs);
};

RG.Item.Weapon.prototype.equals = function(rhs) {
    let res = RG.Item.Base.prototype.equals.call(this, rhs);
    res = res && RG.Object.Damage.prototype.equals.call(this, rhs);
    return res;
};


RG.Item.Weapon.prototype.toJSON = function() {
    const json = RG.Item.Base.prototype.toJSON.call(this);
    const json2 = RG.Object.Damage.prototype.toJSON.call(this);
    Object.keys(json2).forEach(p => {
        json[p] = json2[p];
    });
    return json;
};

//-------------------------
/* RG.Item.MissileWeapon */
//-------------------------
RG.Item.MissileWeapon = function(name) {
    RG.Item.Weapon.call(this, name);
    this.setType(RG.ITEM_MISSILE_WEAPON);

};
RG.extend2(RG.Item.MissileWeapon, RG.Item.Weapon);

//---------------------------------------
/* RG.Item.Ammo Object for ammunition. */
//---------------------------------------
RG.Item.Ammo = function(name) {
    RG.Item.Weapon.call(this, name);
    this.setType(RG.ITEM_MISSILE);
    this.add('Ammo', new RG.Component.Ammo());
};
RG.extend2(RG.Item.Ammo, RG.Item.Weapon);

RG.Item.Ammo.prototype.clone = function() {
    const ammo = new RG.Item.Ammo(this.getName());
    ammo.copy(this);
    return ammo;
};

RG.Item.Ammo.prototype.copy = function(rhs) {
    RG.Item.Base.prototype.copy.call(this, rhs);
    RG.Object.Damage.prototype.copy.call(this, rhs);
};

RG.Item.Ammo.prototype.equals = function(rhs) {
    let res = RG.Item.Base.prototype.equals.call(this, rhs);
    res = res && RG.Object.Damage.prototype.equals.call(this, rhs);
    return res;
};

//-------------------------------------------
/* RG.Item.Armour Object for armour items. */
//-------------------------------------------
RG.Item.Armour = function(name) {
    RG.Item.Base.call(this, name);
    RG.Object.Defense.call(this);
    this.setType(RG.ITEM_ARMOUR);

    let _armourType = null;

    this.setArmourType = function(type) {_armourType = type;};
    this.getArmourType = function() {return _armourType;};
};
RG.extend2(RG.Item.Armour, RG.Item.Base);
RG.extend2(RG.Item.Armour, RG.Object.Defense);

RG.Item.Armour.prototype.clone = function() {
    const armour = new RG.Item.Armour(this.getName());
    armour.copy(this);
    return armour;
};

RG.Item.Armour.prototype.copy = function(rhs) {
    RG.Item.Base.prototype.copy.call(this, rhs);
    RG.Object.Defense.prototype.copy.call(this, rhs);
    this.setArmourType(rhs.getArmourType());
};

RG.Item.Armour.prototype.equals = function(rhs) {
    let res = RG.Item.Base.prototype.equals.call(this, rhs);
    res = res && RG.Object.Defense.prototype.equals.call(this, rhs);
    return res;
};

RG.Item.Armour.prototype.toJSON = function() {
    const json = RG.Item.Base.prototype.toJSON.call(this);
    const json2 = RG.Object.Defense.prototype.toJSON.call(this);
    Object.keys(json2).forEach(p => {
        json[p] = json2[p];
    });
    json.setArmourType = this.getArmourType();
    return json;
};

//--------------------------------------
/* RG.Item.Potion Object for potions. */
//--------------------------------------
RG.Item.Potion = function(name) {
    RG.Item.Base.call(this, name);
    this.setType(RG.ITEM_POTION);

    this.useItem = function(obj) {
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
                }
            }
            else {
                RG.gameWarn('Cannot see anyone there for using the potion.');
            }
        }
        else {
            RG.err('ItemPotion', 'useItem', 'No target given in obj.');
        }
    };

};
RG.extend2(RG.Item.Potion, RG.Item.Base);

//----------------------------------------
/* RG.Item.Rune Object for rune stones. */
//----------------------------------------
RG.Item.Rune = function(name) {
    RG.Item.Base.call(this, name);
    this.setType(RG.ITEM_RUNE);

    let _charges = 1;

    this.getCharges = () => _charges;
    this.setCharges = (charges) => {_charges = charges;};

    this.useItem = function() {
        // Various complex effects
    };

};
RG.extend2(RG.Item.Potion, RG.Item.Base);

RG.Item.Rune.prototype.clone = function() {
    const rune = new RG.Item.Rune(this.getName());
    rune.copy(this);
    return rune;
};

RG.Item.Rune.prototype.copy = function(rhs) {
    RG.Item.Base.prototype.copy.call(this, rhs);
    this.setCharges(rhs.getCharges());
};

RG.Item.Rune.prototype.equals = function(rhs) {
    let res = RG.Item.Base.prototype.equals.call(this, rhs);
    res = res && this.getCharges() === rhs.getCharges();
    return res;
};

RG.Item.Rune.prototype.toJSON = function() {
    const json = RG.Item.Base.prototype.toJSON.call(this);
    json.setCharges = this.getCharges();
    return json;
};

//----------------------------------------------
/* RG.Item.Missile Object for thrown missile. */
//----------------------------------------------
RG.Item.Missile = function(name) {
    RG.Item.Base.call(this, name);
    RG.Object.Damage.call(this);
    this.setType(RG.ITEM_MISSILE);
};
RG.extend2(RG.Item.Missile, RG.Item.Base);
RG.extend2(RG.Item.Missile, RG.Object.Damage);

RG.Item.Missile.prototype.clone = function() {
    const weapon = new RG.Item.Missile(this.getName());
    weapon.copy(this);
    return weapon;
};

RG.Item.Missile.prototype.copy = function(rhs) {
    RG.Item.Base.prototype.copy.call(this, rhs);
    RG.Object.Damage.prototype.copy.call(this, rhs);
};

RG.Item.Missile.prototype.equals = function(rhs) {
    let res = RG.Item.Base.prototype.equals.call(this, rhs);
    res = res && RG.Object.Damage.prototype.equals.call(this, rhs);
    return res;

};

RG.Item.Missile.prototype.toJSON = function() {
    const json = RG.Item.Base.prototype.toJSON.call(this);
    const json2 = RG.Object.Damage.prototype.toJSON.call(this);
    Object.keys(json2).forEach(p => {
        json[p] = json2[p];
    });
    return json;
};


//------------------------------------------------------
/* RG.Item.Container An item which holds other items. */
//------------------------------------------------------
RG.Item.Container = function(owner) {
    RG.Item.Base.call(this, 'container');
    this.setOwner(owner);

    const _items = [];
    let _iter = 0;
    let _removedItem = null; // Last removed item

    this._addItem = function(item) {
        let matchFound = false;
        for (let i = 0; i < _items.length; i++) {
            if (_items[i].equals(item)) {
                if (_items[i].hasOwnProperty('count')) {
                    if (item.hasOwnProperty('count')) {
                        _items[i].count += item.count;
                    }
                    else {
                        _items[i].count += 1;
                    }
                }
                else if (item.hasOwnProperty('count')) {
                        _items[i].count = 1 + item.count;
                    }
                    else {
                        _items[i].count = 2;
                    }
                matchFound = true;
                break;
            }
        }

        if (!matchFound) {
            item.setOwner(this);
            _items.push(item);
        }
    };

    /* Returns the total weight of the container.*/
    this.getWeight = function() {
        let sum = 0;
        for (let i = 0; i < _items.length; i++) {
            sum += _items[i].getWeight() * _items[i].count;
        }
        return sum;
    };

    /* Adds an item. Container becomes item's owner.*/
    this.addItem = function(item) {
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
    };

    this.getItems = function() {return _items;};

    /* Check by pure obj ref. Returns true if contains item ref.*/
    this.hasItemRef = function(item) {
        const index = _items.indexOf(item);
        if (index !== -1) {return true;}
        return false;
    };

    /* Used for stacking/equip purposes only.*/
    this.hasItem = function(item) {
        if (this.hasItemRef(item)) {return true;}
        const index = _getMatchingItemIndex(item);
        return index >= 0;
    };

    /* Tries to remove an item. Returns true on success, false otherwise.*/
    this.removeItem = function(item) {
        if (this.hasItem(item)) {
            return _removeItem(item);
        }
        _removedItem = null;
        return false;
    };

    const _getMatchingItemIndex = function(item) {
        for (let i = 0; i < _items.length; i++) {
            if (item.equals(_items[i])) {return i;}
        }
        return -1;
    };

    const _removeItem = function(item) {
        const i = _getMatchingItemIndex(item);

        if (i === -1) {
            RG.err('ItemContainer', '_removeItem',
                'Negative index found. Horribly wrong.');
            return false;
        }

        if (_items[i].hasOwnProperty('count')) {
            _removedItem = RG.removeStackedItems(_items[i], 1);
            if (_items[i].count === 0) {_items.splice(i, 1);}
        }
        else {
            _removedItem = item;
            _items.splice(i, 1);
        }
        return true;
    };

    /* Returns last removed item if removeItem returned true.*/
    this.getRemovedItem = function() {
        return _removedItem;
    };

    /* Removes N items from the inventory of given type.*/
    this.removeNItems = function(item, n) {
        let count = 0;
        while ((count < n) && this.removeItem(item)) {
            ++count;
        }

        if (_removedItem !== null) {
            _removedItem.count = count;
        }
        else {
            RG.err('ItemContainer', 'removeNItems',
                '_removedItem was null. It should be a valid item.');
            return false;
        }

        if (count > 0) {return true;}
        return false;
    };

    /* Returns first item or null for empty container.*/
    this.first = function() {
        if (_items.length > 0) {
            _iter = 1;
            return _items[0];
        }
        return null;
    };

    /* Returns next item from container or null if there are no more items.*/
    this.next = function() {
        if (_iter < _items.length) {
            return _items[_iter++];
        }
        return null;
    };

    this.last = function() {
        return _items[_items.length - 1];

    };

    /* Returns true for empty container.*/
    this.isEmpty = function() {
        return _items.length === 0;
    };


};
RG.extend2(RG.Item.Container, RG.Item.Base);

RG.Item.Container.prototype.toString = function() {
    let str = 'Container: ' + this.getName() + '\n';
    const items = this.getItems();
    for (let i = 0; i < items.length; i++) {
        str += items[i].toString() + '\n';
    }
    return str;
};

RG.Item.Container.prototype.toJSON = function() {
    const json = [];
    const items = this.getItems();
    for (let i = 0; i < items.length; i++) {
        json.push(items[i].toJSON());
    }
    return json;
};

//----------------
/* RG.Item.Gold */
//----------------
RG.Item.Gold = function(name) {
    RG.Item.Base.call(this, name);
    this.setType(RG.ITEM_GOLD);
    this._purity = 1.0;
};
RG.extend2(RG.Item.Gold, RG.Item.Base);

RG.Item.Gold.prototype.getPurity = function() {
    return this._purity;
};

RG.Item.Gold.prototype.setPurity = function(purity) {
    this._purity = purity;
};

RG.Item.Gold.prototype.toJSON = function() {
    const json = RG.Item.Base.prototype.toJSON.call(this);
    json.setType = this.getType();
    json.setPurity = this._purity;
    return json;
};

//-------------------------------------------
/* RG.Item.GoldCoin because we need money. */
//-------------------------------------------
/* Gold coins have standard weight and are (usually) made of pure gold.*/
RG.Item.GoldCoin = function(name) {
    const _name = name || RG.GOLD_COIN_NAME;
    RG.Item.Gold.call(this, _name);
    this.setType(RG.ITEM_GOLD_COIN);
    this._purity = 1.0;
    this.setWeight(0.03);
};
RG.extend2(RG.Item.GoldCoin, RG.Item.Gold);


//-------------------------------------------
/* RG.Item.SpiritGem for capturing spirits. */
//-------------------------------------------
RG.Item.SpiritGem = function(name) {
    RG.Item.Base.call(this, name);
    this.setType(RG.ITEM_SPIRITGEM);

    let _spirit = null;
    let _hasSpirit = false;
    this.getArmourType = function() {return 'spiritgem';};

    this.hasSpirit = function() {return _hasSpirit;};
    this.getSpirit = function() {return _spirit;};

    this.setSpirit = function(spirit) {
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

    const createGetFunc = function(i) {
        const funcName = _getters[i];
        return function() {
            if (!_hasSpirit) {return 0;}
            return _spirit.get('Stats')[funcName]();
        };
    };

    for (let i = 0; i < _getters.length; i++) {
        this[_getters[i]] = createGetFunc(i);
    }

};
RG.extend2(RG.Item.SpiritGem, RG.Item.Base);

RG.Item.SpiritGem.prototype.clone = function() {
    const gem = new RG.Item.SpiritGem(this.getName());
    gem.copy(this);
    return gem;
};

RG.Item.SpiritGem.prototype.copy = function(rhs) {
    RG.Item.Base.prototype.copy.call(this, rhs);
    if (rhs.hasSpirit()) {this.setSpirit(rhs.getSpirit());}
};

RG.Item.SpiritGem.prototype.equals = function(rhs) {
    let res = RG.Item.Base.prototype.equals.call(this, rhs);
    res = res && (this.getSpirit() === rhs.getSpirit());
    return res;
};

RG.Item.SpiritGem.prototype.toString = function() {
    let txt = RG.Item.Base.prototype.toString.call(this);
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
};


RG.Item.SpiritGem.prototype.toJSON = function() {
    const json = RG.Item.Base.prototype.toJSON.call(this);
    json.hasSpirit = this.hasSpirit();
    if (json.hasSpirit) {json.setSpirit = this.getSpirit().toJSON();}
    return json;
};


module.exports = RG.Item;

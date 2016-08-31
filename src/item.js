
var GS = require("../getsource.js");

var RG  = GS.getSource(["RG"], "./src/rg.js");
RG.Object = GS.getSource(["RG", "Object"], "./src/object.js");
RG.Component = GS.getSource(["RG", "Component"], "./src/component.js");

//---------------------------------------------------------------------------
// ITEMS
//---------------------------------------------------------------------------

RG.Item = {};

/** Models an item. Each item is ownable by someone. During game, there are no
 * items with null owners. Ownership shouldn't be ever set to null. */
RG.Item.Base = function(name) {
    RG.Object.Ownable.call(this, null);
    RG.Entity.call(this);
    this.setPropType(RG.TYPE_ITEM);

    var _name = name;
    var _value = 1;

    this.add("Physical", new RG.Component.Physical());

    this.count = 1; // Number of items

    this.setName = function(name) {_name = name;};
    this.getName = function() {return _name;};

    this.setWeight = function(weight) {this.get("Physical").setWeight(weight);};
    this.getWeight = function() {return this.get("Physical").getWeight();};

    this.setValue = function(value) {_value = value;};
    this.getValue = function() {return _value;};

};
RG.Item.Base.prototype.toString = function() {
    var txt = this.getName() + ", " + this.getType() + ", ";
    txt += this.getWeight() * this.count + "kg";
    if (this.hasOwnProperty("count")) {
        txt = this.count + " x " + txt;
    }
    return txt;
};

RG.Item.Base.prototype.equals = function(item) {
    var res = this.getName() === item.getName();
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
    var newItem = new RG.Item.Base(this.getName());
    newItem.copy(this);
    return newItem;
};

RG.extend2(RG.Item.Base, RG.Object.Ownable);

/** Object representing food items in the game.*/
RG.Item.Food = function(name) {
    RG.Item.Base.call(this, name);
    this.setType("food");

    var _energy = 0; // per 0.1 kg

    this.setEnergy = function(energy) {_energy = energy;};
    this.getEnergy = function() {return _energy;};

    /** Uses (eats) the food item.*/
    this.useItem = function(obj) {
        if (obj.hasOwnProperty("target")) {
            var cell = obj.target;
            if (cell.hasActors()) {
                var target = cell.getProp("actors")[0];
                if (target.has("Hunger")) {
                    var totalEnergy = Math.round(this.getWeight() * _energy);
                    target.get("Hunger").addEnergy(totalEnergy);
                    if (this.count === 1) {
                        var msg = {item: this};
                        RG.POOL.emitEvent(RG.EVT_DESTROY_ITEM, msg);
                        RG.gameMsg(target.getName() + " consumes " + this.getName());
                    }
                    else {
                        this.count -= 1;
                    }
                }
                else {
                    RG.gameWarn(target.getName() + " is not interested in eating.");
                }
            }
            else {
                RG.gameWarn("There's no one to give food to.");
            }
        }
        else {
            RG.err("ItemFood", "useItem", "No target given in obj.");
        }
    };

};
RG.extend2(RG.Item.Food, RG.Item.Base);

/** Corpse object dropped by killed actors.*/
RG.Item.Corpse = function(name) {
    RG.Item.Base.call(this, name);
    this.setType("corpse");
};
RG.extend2(RG.Item.Corpse, RG.Item.Base);

/** Base object for all weapons.*/
RG.Item.Weapon = function(name) {
    RG.Item.Base.call(this, name);
    RG.Object.Damage.call(this);
    this.setType("weapon");
};

RG.Item.Weapon.prototype.toString = function() {
    var msg = RG.Item.Base.prototype.toString.call(this);
    msg += RG.Object.Damage.prototype.toString.call(this);
    return msg;
};

RG.Item.Weapon.prototype.clone = function() {
    var weapon = new RG.Item.Weapon(this.getName());
    weapon.copy(this);
    return weapon;
};

RG.Item.Weapon.prototype.copy = function(rhs) {
    RG.Item.Base.prototype.copy.call(this, rhs);
    RG.Object.Damage.prototype.copy.call(this, rhs);
};

RG.Item.Weapon.prototype.equals = function(rhs) {
    var res = RG.Item.Base.prototype.equals.call(this, rhs);
    res = res && RG.Object.Damage.prototype.equals.call(this, rhs);
    return res;
};

RG.extend2(RG.Item.Weapon, RG.Item.Base);
RG.extend2(RG.Item.Weapon, RG.Object.Damage);

/** Base object for armour.*/
RG.Item.Armour = function(name) {
    RG.Item.Base.call(this, name);
    RG.Object.Defense.call(this);
    this.setType("armour");

    var _armourType = null;

    this.setArmourType = function(type) {_armourType = type;};
    this.getArmourType = function() {return _armourType;};

};

RG.Item.Armour.prototype.clone = function() {
    var armour = new RG.Item.Armour(this.getName());
    armour.copy(this);
    return armour;
};

RG.Item.Armour.prototype.copy = function(rhs) {
    RG.Item.Base.prototype.copy.call(this, rhs);
    RG.Object.Defense.prototype.copy.call(this, rhs);
    this.setArmourType(rhs.getArmourType());
};

RG.Item.Armour.prototype.equals = function(rhs) {
    var res = RG.Item.Base.prototype.equals.call(this, rhs);
    res = res && RG.Object.Defense.prototype.equals.call(this, rhs);
    return res;
};

RG.extend2(RG.Item.Armour, RG.Item.Base);
RG.extend2(RG.Item.Armour, RG.Object.Defense);

/** Potion object which restores hit points .*/
RG.Item.Potion = function(name) {
    RG.Item.Base.call(this, name);
    this.setType("potion");

    this.useItem = function(obj) {
        if (obj.hasOwnProperty("target")) {
            var cell = obj.target;
            if (cell.hasActors()) {
                var target = cell.getProp("actors")[0];
                var die = new RG.Die(1, 10, 2);
                var pt = die.roll();
                if (target.has("Health")) {
                    target.get("Health").addHP(pt);
                    if (this.count === 1) {
                        var msg = {item: this};
                        RG.POOL.emitEvent(RG.EVT_DESTROY_ITEM, msg);
                        RG.gameMsg(target.getName() + " drinks " + this.getName());
                    }
                    else {
                        this.count -= 1;
                    }
                }
            }
            else {
                RG.gameWarn("Cannot see anyone there for using the potion.");
            }
        }
        else {
            RG.err("ItemPotion", "useItem", "No target given in obj.");
        }
    };

};
RG.extend2(RG.Item.Potion, RG.Item.Base);

/** Models an object which is used as a missile.*/
RG.Item.Missile = function(name) {
    RG.Item.Base.call(this, name);
    RG.Object.Damage.call(this);
    this.setType("missile");

};

RG.Item.Missile.prototype.clone = function() {
    var weapon = new RG.Item.Missile(this.getName());
    weapon.copy(this);
    return weapon;
};

RG.Item.Missile.prototype.copy = function(rhs) {
    RG.Item.Base.prototype.copy.call(this, rhs);
    RG.Object.Damage.prototype.copy.call(this, rhs);

};

RG.Item.Missile.prototype.equals = function(rhs) {
    var res = RG.Item.Base.prototype.equals.call(this, rhs);
    res = res && RG.Object.Damage.prototype.equals.call(this, rhs);
    return res;

};

RG.extend2(RG.Item.Missile, RG.Item.Base);
RG.extend2(RG.Item.Missile, RG.Object.Damage);
RG.extend2(RG.Item.Missile, RG.Entity);

/** Models an item container. Can hold a number of items.*/
RG.Item.Container = function(owner) {
    RG.Item.Base.call(this, "container");
    this.setOwner(owner);

    var _items = [];
    var _iter  = 0;

    var _removedItem = null; // Last removed item

    this._addItem = function(item) {
        var matchFound = false;
        for (var i = 0; i < _items.length; i++) {
            if (_items[i].equals(item)) {
                if (_items[i].hasOwnProperty("count")) {
                    if (item.hasOwnProperty("count")) {
                        _items[i].count += item.count;
                    }
                    else {
                        _items[i].count += 1;
                    }
                }
                else {
                    if (item.hasOwnProperty("count")) {
                        _items[i].count = 1 + item.count;
                    }
                    else {
                        _items[i].count = 2;
                    }
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

    /** Returns the total weight of the container.*/
    this.getWeight = function() {
        var sum = 0;
        for (var i = 0; i < _items.length; i++) {
            sum += _items[i].getWeight() * _items[i].count;
        }
        return sum;
    };

    /** Adds an item. Container becomes item's owner.*/
    this.addItem = function(item) {
        if (item.getType() === "container") {
            if (this.getOwner() !== item) {
                this._addItem(item);
            }
            else {
                RG.err("Item", "addItem", "Added item is container's owner. Impossible.");
            }
        }
        else {
            this._addItem(item);
        }
    };

    this.getItems = function() {return _items;};

    /** Check by pure obj ref. Returns true if contains item ref.*/
    this.hasItemRef = function(item) {
        var index = _items.indexOf(item);
        if (index !== -1) return true;
        return false;
    };

    /** Used for stacking/equip purposes only.*/
    this.hasItem = function(item) {
        if (this.hasItemRef(item)) return true;
        var index = _getMatchingItemIndex(item);
        return index >= 0;
    };

    /** Tries to remove an item. Returns true on success, false otherwise.*/
    this.removeItem = function(item) {
        if (this.hasItem(item)) {
            return _removeItem(item);
        }
        _removedItem = null;
        return false;
    };

    var _getMatchingItemIndex = function(item) {
        for (var i = 0; i < _items.length; i++) {
            if (item.equals(_items[i])) return i;
        }
        return -1;
    };

    var _removeItem = function(item) {
        var i = _getMatchingItemIndex(item);

        if (i === -1) {
            RG.err("ItemContainer", "_removeItem", 
                "Negative index found. Horribly wrong.");
            return false;
        }

        if (_items[i].hasOwnProperty("count")) {
            _removedItem = RG.removeStackedItems(_items[i], 1);
            if (_items[i].count === 0) _items.splice(i, 1);
        }
        else {
            _removedItem = item;
            _items.splice(i, 1);
        }
        return true;
    };

    /** Returns last removed item if removeItem returned true.*/
    this.getRemovedItem = function() {
        return _removedItem;
    };

    /** Removes N items from the inventory of given type.*/
    this.removeNItems = function(item, n) {
        var count = 0;
        while ((count < n) && this.removeItem(item)) {
            ++count;
        }

        if (_removedItem !== null) {
            _removedItem.count = count;
        }
        else {
            RG.err("ItemContainer", "removeNItems",
                "_removedItem was null. It should be a valid item.");
            return false;
        }

        if (count > 0) return true;
        return false;
    };

    /** Returns first item or null for empty container.*/
    this.first = function() {
        if (_items.length > 0) {
            _iter = 1;
            return _items[0];
        }
        return null;
    };

    /** Returns next item from container or null if there are no more items.*/
    this.next = function() {
        if (_iter < _items.length) {
            return _items[_iter++];
        }
        return null;
    };

    this.last = function() {
        return _items[_items.length - 1];

    };

    /** Returns true for empty container.*/
    this.isEmpty = function() {
        return _items.length === 0;
    };

};
RG.extend2(RG.Item.Container, RG.Item.Base);

/** Spirit gems can capture spirits inside them.*/
RG.Item.SpiritGem = function(name) {
    RG.Item.Base.call(this, name);
    this.setType("spiritgem");

    var _spirit = null;

    this.setSpirit = function(spirit) {_spirit = spirit;};
    this.getSpirit = function() {return spirit;};

    /** Used for capturing the spirits inside the gem.*/
    this.useItem = function(obj) {
        if (_spirit === null) {

        }
        else {

        }
    };

};
RG.extend2(RG.Item.SpiritGem, RG.Item.Base);

/** Spirit items are wearables which can have powerful use abilities as well.*/
RG.Item.Spirit = function(name) {
    RG.Item.Base.call(this, name);
    this.setType("spirit");

    this.getArmourType = function() {return "spirit";};

    var stats = new RG.Component.Stats();
    this.add("Stats", stats);

    var _brain = new RG.Brain.Spirit(this);

    this.add("Action", new RG.Component.Stats());

    this.isPlayer = function() {return false;};

    /** Get next action for this spirit.*/
    this.nextAction = function(obj) {
        var cb = _brain.decideNextAction(obj);
        var action = null;

        if (cb !== null) {
            var speed = this.get("Stats").getSpeed();
            var duration = parseInt(RG.BASE_SPEED/speed * RG.ACTION_DUR);
            action = new RG.RogueAction(duration, cb, {});
        }
        else {
            action = new RG.RogueAction(0, function(){}, {});
        }
        return action;
    };

};

RG.Item.Spirit.prototype.toString = function() {
    var txt = this.getName() + ", " + this.getType() + ", ";
    txt += this.get("Stats").toString();
    return txt;
};

RG.Item.Spirit.prototype.equals = function(item) {
    var res = RG.Item.Base.prototype.equals.call(this, item);
    res = res && (this.getType() === item.getType());
    return res;
};

RG.Item.Spirit.prototype.copy = function(rhs) {
    this.get("Stats").copy(rhs.get("Stats"));
};

RG.Item.Spirit.prototype.clone = function() {
    var newSpirit = new RG.Item.Spirit(this.getName());
    newSpirit.copy(this);
    return newSpirit;
};

RG.extend2(RG.Item.Spirit, RG.Item.Base);

if (typeof module !== "undefined" && typeof exports !== "undefined") {
    GS.exportSource(module, exports, ["RG", "Item"], [RG, RG.Item]);
}
else {
    GS.exportSource(undefined, undefined, ["RG", "Item"], [RG, RG.Item]);
}

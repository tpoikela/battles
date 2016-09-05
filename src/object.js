
var GS = require("../getsource.js");
var RG = GS.getSource("RG", "./src/rg.js");

RG.Object = {};

RG.Object.Defense = function() {

    var _attack   = 1;
    var _defense  = 1;
    var _protection = 0;

    this.getAttack = function() {return _attack;};
    this.setAttack = function(attack) { _attack = attack; };

    /** Defense related methods.*/
    this.getDefense = function() { return _defense; };
    this.setDefense = function(defense) { _defense = defense; };

    this.getProtection = function() {return _protection;};
    this.setProtection = function(prot) {return _protection;};

};

RG.Object.Defense.prototype.copy = function(rhs) {
    this.setAttack(rhs.getAttack());
    this.setDefense(rhs.getDefense());
    this.setProtection(rhs.getProtection());
};

RG.Object.Defense.prototype.equals = function(rhs) {
    var res = this.getAttack() === rhs.getAttack() &&
        this.getDefense() === rhs.getDefense() &&
        this.getProtection() === rhs.getProtection();
    return res;
};

RG.Object.Defense.prototype.toJSON = function() {
    var json = {
        setAttack: this.getAttack(),
        setDefense: this.getDefense(),
        setProtection: this.getProtection(),
    };
    return json;
};


RG.Object.Damage = function() {
    RG.Object.Defense.call(this);

    var _damage   = new RG.Die(1, 4, 0);
    var _range    = 1;

    /** Attack methods. */
    this.setAttackRange = function(range) {_range = range;};
    this.getAttackRange = function() {return _range; };

    this.setDamage = function(dStr) {
        if (typeof dStr === "string") {
            _damage = RG.FACT.createDie(dStr);
        }
        else if (typeof dStr === "object") {
            _damage = dStr;
        }
    };

    this.getDamage = function() {
        if (this.hasOwnProperty("getWeapon")) {
            var weapon = this.getWeapon();
            if (!RG.isNullOrUndef([weapon])) {
                return weapon.getDamage();
            }
        }
        return _damage.roll();
    };

    this.getDamageDie = function() {
        return _damage;
    };

    this.setDamageDie = function(str) {
        this.setDamage(str);
    };

};
RG.extend2(RG.Object.Damage, RG.Object.Defense);

RG.Object.Damage.prototype.copy = function(rhs) {
    RG.Object.Defense.prototype.copy.call(this, rhs);
    this.setAttackRange(rhs.getAttackRange());
    var die = new RG.Die();
    die.copy(rhs.getDamageDie());
    this.setDamage(die);
};

RG.Object.Damage.prototype.equals = function(rhs) {
    var res = RG.Object.Defense.prototype.equals.call(this, rhs);
    if (res) {
        res = this.getDamageDie().equals(rhs.getDamageDie());
        res = res && this.getAttackRange() === rhs.getAttackRange();
    }
    return res;
};

RG.Object.Damage.prototype.toString = function() {
    var msg = " A: " + this.getAttack() + ", D: " + this.getDefense() + ", ";
    msg += "Dmg: " + this.getDamageDie().toString();
    msg += ",R:" + this.getAttackRange();
    return msg;
};

RG.Object.Damage.prototype.toJSON = function() {
    var json = RG.Object.Defense.prototype.toJSON.call(this);
    json.setAttackRange = this.getAttackRange();
    json.setDamage = this.getDamageDie().toString();
    return json;
};


/** Typed objects should inherit from this. */
RG.Object.Typed = function(propType, type) {

    var _type = type;
    var _propType = propType;

    this.setPropType = function(propType) {
        var index = RG.PROP_TYPES.indexOf(propType);
        if (index >= 0) {
            _propType = propType;
        }
        else {
            RG.err("Object.Typed", "setPropType",
                "Unknown prop type: |" + propType + "|");
        }
    };

    this.getPropType = function() {return _propType;};

    this.setType = function(type) {
        _type = type;
        RG.nullOrUndefError("Object.Typed: setType", "arg |type|", type);
    };

    this.getType = function() {return _type;};

};


/** This object is used by all locatable objects in the game.  */
RG.Object.Locatable = function() { // {{{2
    RG.Object.Typed.call(this, null);
    var _x = null;
    var _y = null;
    var _level = null;

    /** Simple getters/setters for coordinates.*/
    this.setX = function(x) {_x = x; };
    this.setY = function(y) {_y = y; };
    this.getX = function() {return _x;};
    this.getY = function() {return _y;};
    this.getXY = function() { return [_x, _y];};
    this.setXY = function(x,y) {
        _x = x;
        _y = y;
    };
    /** Sets the level of this locatable object.*/
    this.setLevel = function(level) {
        _level = level;
        RG.nullOrUndefError("Object.Locatable: setLevel", "arg |level|", level);
    };

    this.getLevel = function() {
        return _level;
    };

    /** Returns true if object is located at a position on a level.*/
    this.isLocated = function() {
        return (_x !== null) && (_y !== null) && (_level !== null);
    };

    /** Returns true if locatables are in same position.*/
    this.isSamePos = function(obj) {
        if (_x !== obj.getX()) return false;
        if (_y !== obj.getY()) return false;
        if (_level !== obj.getLevel()) return false;
        return true;
    };

}; // }}} Object.Locatable
RG.extend2(RG.Object.Locatable, RG.Object.Typed);

/** Object.Ownable is sort of Object.Locatable but it moves with its owner. This ensures that
 * for example item coordinates are up-to-date with the carrier.*/
RG.Object.Ownable = function(owner) {
    RG.Object.Typed.call(this, null);
    var _owner = owner;

    this.isSamePos = function(obj) {return _owner.isSamePos(obj);};

    this.getLevel = function() {return _owner.getLevel();};

    this.setOwner = function(owner) {
        if (RG.isNullOrUndef([owner])) {
            RG.err("Object.Ownable", "setOwner", "Owner cannot be null.");
        }
        else {
            _owner = owner;
        }
    };

    /** Returns the owner of this object.*/
    this.getOwner = function() {return _owner;};

    this.getX = function() {
        if (_owner !== null) return _owner.getX();
        return null;
    };

    this.getY = function() {
        if (_owner !== null) return _owner.getY();
        return null;
    };

    this.getLevel = function() {
        if (_owner !== null) return _owner.getLevel();
        return null;
    };

};
RG.extend2(RG.Object.Ownable, RG.Object.Typed);

if (typeof module !== "undefined" && typeof exports !== "undefined") {
    GS.exportSource(module, exports, ["RG", "Object"], [RG, RG.Object]);
}
else {
    GS.exportSource(undefined, undefined, ["RG", "Object"], [RG, RG.Object]);
}


var RG = require('./rg.js');

RG.Object = {};

RG.Object.Defense = function() {

    var _attack = 1;
    var _defense = 1;
    var _protection = 0;

    this.getAttack = function() {return _attack;};
    this.setAttack = function(attack) { _attack = attack; };

    /* Defense related methods.*/
    this.getDefense = function() { return _defense; };
    this.setDefense = function(defense) { _defense = defense; };

    this.getProtection = function() {return _protection;};
    this.setProtection = function(prot) {_protection = prot;};

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
        setProtection: this.getProtection()
    };
    return json;
};


RG.Object.Damage = function() {
    RG.Object.Defense.call(this);

    var _damage = new RG.Die(1, 4, 0);
    var _range = 1;

    /* Attack methods. */
    this.setAttackRange = function(range) {_range = range;};
    this.getAttackRange = function() {return _range; };

    this.setDamage = function(dStr) {
        if (typeof dStr === 'string') {
            _damage = RG.FACT.createDie(dStr);
        }
        else if (typeof dStr === 'object') {
            _damage = dStr;
        }
    };

    this.getDamage = function() {
        if (this.hasOwnProperty('getWeapon')) {
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
    var msg = ' A: ' + this.getAttack() + ', D: ' + this.getDefense() + ', ';
    msg += 'Dmg: ' + this.getDamageDie().toString();
    msg += ',R:' + this.getAttackRange();
    return msg;
};

RG.Object.Damage.prototype.toJSON = function() {
    var json = RG.Object.Defense.prototype.toJSON.call(this);
    json.setAttackRange = this.getAttackRange();
    json.setDamage = this.getDamageDie().toString();
    return json;
};


/* Typed objects should inherit from this. */
RG.Object.Typed = function(propType, type) {
    this.type = type;
    this._propType = propType;

};

    RG.Object.Typed.prototype.getPropType = function() {return this._propType;};
RG.Object.Typed.prototype.getType = function() {return this.type;};

RG.Object.Typed.prototype.setPropType = function(propType) {
    var index = RG.PROP_TYPES.indexOf(propType);
    if (index >= 0) {
        this._propType = propType;
    }
    else {
        RG.err('Object.Typed', 'setPropType',
            'Unknown prop type: |' + propType + '|');
    }
};


RG.Object.Typed.prototype.setType = function(type) {
    this.type = type;
    RG.nullOrUndefError('Object.Typed: setType', 'arg |type|', type);
};


/* This object is used by all locatable objects in the game.  */
RG.Object.Locatable = function() { // {{{2
    RG.Object.Typed.call(this, null);
    this._x = null;
    this._y = null;
    this._level = null;


}; // }}} Object.Locatable
RG.extend2(RG.Object.Locatable, RG.Object.Typed);

    RG.Object.Locatable.prototype.setX = function(x) {this._x = x; };
    RG.Object.Locatable.prototype.setY = function(y) {this._y = y; };

    RG.Object.Locatable.prototype.getX = function() {return this._x;};
    RG.Object.Locatable.prototype.getY = function() {return this._y;};

    RG.Object.Locatable.prototype.getXY = function() {
        return [this._x, this._y];
    };


    /* Simple getters/setters for coordinates.*/
    RG.Object.Locatable.prototype.setXY = function(x, y) {
        this._x = x;
        this._y = y;
    };

/* Sets the level of this locatable object.*/
RG.Object.Locatable.prototype.setLevel = function(level) {
    this._level = level;
    RG.nullOrUndefError('Object.Locatable: setLevel', 'arg |level|', level);
};

RG.Object.Locatable.prototype.getLevel = function() {
    return this._level;
};

/* Returns true if object is located at a position on a level.*/
RG.Object.Locatable.prototype.isLocated = function() {
    return (this._x !== null) && (this._y !== null) && (this._level !== null);
};

/* Returns true if locatables are in same position.*/
RG.Object.Locatable.prototype.isSamePos = function(obj) {
    if (this._x !== obj.getX()) {return false;}
    if (this._y !== obj.getY()) {return false;}
    if (this._level !== obj.getLevel()) {return false;}
    return true;
};

/* Object.Ownable is sort of Object.Locatable but it moves with its owner.
 * This ensures that
 * for example item coordinates are up-to-date with the carrier.*/
RG.Object.Ownable = function(owner) {
    RG.Object.Typed.call(this, null);
    var _owner = owner;

    this.isSamePos = function(obj) {return _owner.isSamePos(obj);};

    this.getLevel = function() {return _owner.getLevel();};

    this.setOwner = function(owner) {
        if (RG.isNullOrUndef([owner])) {
            RG.err('Object.Ownable', 'setOwner', 'Owner cannot be null.');
        }
        else {
            _owner = owner;
        }
    };

    /* Returns the owner of this object.*/
    this.getOwner = function() {return _owner;};

    this.getX = function() {
        if (_owner !== null) {return _owner.getX();}
        return null;
    };

    this.getY = function() {
        if (_owner !== null) {return _owner.getY();}
        return null;
    };

    this.getLevel = function() {
        if (_owner !== null) {return _owner.getLevel();}
        return null;
    };

};
RG.extend2(RG.Object.Ownable, RG.Object.Typed);


module.exports = RG.Object;

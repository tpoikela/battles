
const RG = require('./rg.js');

RG.Object = {};

RG.Object.Defense = function() {
    this._attack = 1;
    this._defense = 1;
    this._protection = 0;
};

RG.Object.Defense.prototype.getAttack = function() {return this._attack;};
RG.Object.Defense.prototype.setAttack = function(attack) {
    this._attack = attack;
};

/* Defense related methods.*/
RG.Object.Defense.prototype.getDefense = function() { return this._defense; };
RG.Object.Defense.prototype.setDefense = function(defense) {
    this._defense = defense;
};

RG.Object.Defense.prototype.getProtection = function() {
    return this._protection;
};
RG.Object.Defense.prototype.setProtection = function(prot) {
    this._protection = prot;
};

RG.Object.Defense.prototype.copy = function(rhs) {
    this.setAttack(rhs.getAttack());
    this.setDefense(rhs.getDefense());
    this.setProtection(rhs.getProtection());
};

RG.Object.Defense.prototype.equals = function(rhs) {
    const res = this.getAttack() === rhs.getAttack() &&
        this.getDefense() === rhs.getDefense() &&
        this.getProtection() === rhs.getProtection();
    return res;
};

RG.Object.Defense.prototype.toJSON = function() {
    const json = {
        setAttack: this.getAttack(),
        setDefense: this.getDefense(),
        setProtection: this.getProtection()
    };
    return json;
};

/* Damage object used in Weapons and other damaging things. */
RG.Object.Damage = function() {
    RG.Object.Defense.call(this);
    let _damageDie = new RG.Die(1, 4, 0);
    let _range = 1;

    /* Attack methods. */
    this.setAttackRange = range => {_range = range;};
    this.getAttackRange = () => _range;

    this.rollDamage = function() {
        if (this.hasOwnProperty('getWeapon')) {
            const weapon = this.getWeapon();
            if (!RG.isNullOrUndef([weapon])) {
                return weapon.rollDamage();
            }
        }
        return _damageDie.roll();
    };

    this.getDamageDie = () => _damageDie;

    this.setDamageDie = dStr => {
        if (typeof dStr === 'string') {
            _damageDie = RG.FACT.createDie(dStr);
        }
        else if (typeof dStr === 'object') {
            _damageDie = dStr;
        }
    };

};
RG.extend2(RG.Object.Damage, RG.Object.Defense);

RG.Object.Damage.prototype.copy = function(rhs) {
    RG.Object.Defense.prototype.copy.call(this, rhs);
    this.setAttackRange(rhs.getAttackRange());
    const die = new RG.Die();
    die.copy(rhs.getDamageDie());
    this.setDamageDie(die);
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
    json.setDamageDie = this.getDamageDie().toString();
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
class RGObjectLocatable {
    constructor() { // {{{2
        this._x = null;
        this._y = null;
        this._level = null;
    }

    setX(x) {this._x = x; }
    setY(y) {this._y = y; }
    getX() {return this._x;}
    getY() {return this._y;}

    getXY() {
        return [this._x, this._y];
    }

    /* Simple getters/setters for coordinates.*/
    setXY(x, y) {
        this._x = x;
        this._y = y;
    }

    /* Accessing the current cell of object. */
    getCell() {
        return this._level.getMap().getCell(this._x, this._y);
    }

    /* Sets the level of this locatable object.*/
    setLevel(level) {
        this._level = level;
        RG.nullOrUndefError('Object.Locatable: setLevel', 'arg |level|', level);
    }

    /* Unsets the level to null. Throws error if level already null. */
    unsetLevel() {
        if (this._level) {
            this._level = null;
        }
        else {
            RG.err('Object.Locatable', 'unsetLevel',
                'Trying to unset already null level.');
        }
    }

    getLevel() {
        return this._level;
    }

    /* Returns true if object is located at a position on a level.*/
    isLocated() {
        return (this._x !== null) && (this._y !== null) && (this._level !== null);
    }

    /* Returns true if locatables are in same position.*/
    isSamePos(obj) {
        if (this._x !== obj.getX()) {return false;}
        if (this._y !== obj.getY()) {return false;}
        if (this._level !== obj.getLevel()) {return false;}
        return true;
    }
} // }}} Object.Locatable

RG.Object.Locatable = RGObjectLocatable;

/* Object.Ownable moves with its owner. Thus, it's x-y position is
 * determined by the owner. This ensures that
 * for example item coordinates are up-to-date with the carrier.*/
RG.Object.Ownable = function(owner) {
    let _owner = owner;

    this.isSamePos = obj => _owner.isSamePos(obj);

    this.getLevel = () => _owner.getLevel();

    this.setOwner = owner => {
        if (RG.isNullOrUndef([owner])) {
            RG.err('Object.Ownable', 'setOwner', 'Owner cannot be null.');
        }
        else {
            _owner = owner;
        }
    };

    /* Returns the owner of this object.*/
    this.getOwner = () => _owner;

    this.getX = () => {
        if (_owner !== null) {return _owner.getX();}
        return null;
    };

    this.getY = () => {
        if (_owner !== null) {return _owner.getY();}
        return null;
    };

    this.getLevel = () => {
        if (_owner !== null) {return _owner.getLevel();}
        return null;
    };

};


module.exports = RG.Object;

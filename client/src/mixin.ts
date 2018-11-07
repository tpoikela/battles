
const RG = require('./rg');

const Mixin: any = {};

// Dummy Base class to be used with mixins.
class Base {}
Mixin.Base = Base;

/* A mixin used for typed objects. */
Mixin.Typed = (superclass) => class extends superclass {

    constructor(args) {
        if (superclass) {super(args);}
        this.type = args.type || '';
        this._propType = args.propType || '';
	}

    getPropType() {return this._propType;}
    getType() {return this.type;}

    setPropType(propType) {
        const index = RG.PROP_TYPES.indexOf(propType);
        if (index >= 0) {
            this._propType = propType;
        }
        else {
            RG.err('Object.Typed', 'setPropType',
                'Unknown prop type: |' + propType + '|');
        }
    }

    setType(type) {
        this.type = type;
        RG.nullOrUndefError('Object.Typed: setType', 'arg |type|', type);
    }

};

/* A mixin for ownable objects. */
Mixin.Ownable = (superclass) => class extends superclass {

    constructor(args) {
		super(args);
		this._owner = args.owner || null;
        this.isOwnable = true;
	}

    isSamePos(obj) {return this._owner.isSamePos(obj);}

    setOwner(owner) {
        if (RG.isNullOrUndef([owner])) {
            RG.err('Object.Ownable', 'setOwner', 'Owner cannot be null.');
        }
        else {
            this._owner = owner;
        }
    }

    /* Returns the top-level owner. Used mainly to recover actor owner of items
     * inside inventory. */
    getTopOwner() {
        let owner = this._owner;
        while (owner.getOwner) {
            owner = owner.getOwner();
        }
        return owner;
    }

    /* Returns the direct owner of this object.*/
    getOwner() {return this._owner;}

    getX() {
        if (this._owner) {return this._owner.getX();}
        return null;
    }

    getY() {
        if (this._owner) {return this._owner.getY();}
        return null;
    }

    getXY() {
        if (this._owner) {return this._owner.getXY();}
        return null;
    }

    getLevel() {
        if (this._owner) {return this._owner.getLevel();}
        return null;
    }

};

/* Mixin used in Locatable objects with x,y coordinates. */
Mixin.Locatable = (superclass) => class extends superclass {

    constructor(args) {
        super(args);
        this._x = null;
        this._y = null;
        this._level = null;
    }

    setX(x) {this._x = x; }
    setY(y) {this._y = y; }
    getX() {return this._x;}
    getY() {return this._y;}

    isAtXY(x, y) {
        return x === this._x && y === this._y;
    }

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
        RG.nullOrUndefError('Mixin.Locatable: setLevel', 'arg |level|', level);
    }

    /* Unsets the level to null. Throws error if level already null. */
    unsetLevel() {
        if (this._level) {
            this._level = null;
        }
        else {
            RG.err('Mixin.Locatable', 'unsetLevel',
                'Trying to unset already null level.');
        }
    }

    getLevel() {
        return this._level;
    }

    /* Returns true if object is located at a position on a level.*/
    isLocated() {
        return (this._x !== null) && (this._y !== null)
            && (this._level !== null);
    }

    /* Returns true if locatables are in same position.*/
    isSamePos(obj) {
        if (this._x !== obj.getX()) {return false;}
        if (this._y !== obj.getY()) {return false;}
        if (this._level !== obj.getLevel()) {return false;}
        return true;
    }

};

/* Mixin for objects requiring a damage roll. */
Mixin.DamageRoll = (superclass) => class extends superclass {

    constructor(args) {
        super(args);
        this.damageDie = RG.FACT.createDie('1d4');
    }

    rollDamage() {
        if (this.getEntity().hasOwnProperty('getWeapon')) {
            const weapon = this.getEntity().getWeapon();
            if (weapon !== null) {return weapon.rollDamage();}
        }
        return this.damageDie.roll();
    }

    getDamageDie() {
        return this.damageDie;
    }

    setDamageDie(strOrDie) {
        if (typeof strOrDie === 'string') {
            this.damageDie = RG.FACT.createDie(strOrDie);
        }
        else {
            this.damageDie = strOrDie;
        }
    }

    copy(rhs) {
        super.copy(rhs);
        this.damageDie = rhs.getDamageDie().clone();
    }

    toJSON() {
        const obj = super.toJSON();
        obj.setDamageDie = this.damageDie.toString();
        return obj;
    }

};

/* Adds a duration and accessor functions to given component. */
Mixin.DurationRoll = (superclass) => class extends superclass {

    constructor(args) {
        super(args);
    }

    rollDuration() {
        return this.duration.roll();
    }

    setDurationDie(strOrDie) {
        if (typeof strOrDie === 'string') {
            this.duration = RG.FACT.createDie(strOrDie);
        }
        else {
            this.duration = strOrDie;
        }
    }

    getDurationDie() {
        return this.duration;
    }

    copy(rhs) {
        super.copy(rhs);
        this.duration = rhs.getDurationDie().clone();
    }

    toJSON() {
        const obj = super.toJSON();
        obj.setDurationDie = this.duration.toString();
        return obj;
    }

};

Mixin.Defense = (superclass) => class extends superclass {

    constructor(args) {
        super(args);
        this._attack = 1;
        this._defense = 1;
        this._protection = 0;
    }

    getAttack() {return this._attack;}

    setAttack(attack) {
        this._attack = attack;
    }

    /* Defense related methods.*/
    getDefense() { return this._defense; }

    setDefense(defense) {
        this._defense = defense;
    }

    getProtection() {
        return this._protection;
    }

    setProtection(prot) {
        this._protection = prot;
    }

    copy(rhs) {
        super.copy(rhs);
        this.setAttack(rhs.getAttack());
        this.setDefense(rhs.getDefense());
        this.setProtection(rhs.getProtection());
    }

    equals(rhs) {
        let res = super.equals(rhs);
        if (res) {
            res = this.getAttack() === rhs.getAttack() &&
                this.getDefense() === rhs.getDefense() &&
                this.getProtection() === rhs.getProtection();
        }
        return res;
    }

    toString() {
        let msg = super.toString();
        msg += ` A: ${this.getAttack()}, D: ${this.getDefense()}, `;
        msg += ` P: ${this.getProtection()}, `;
        return msg;
    }

    toJSON() {
        const json = super.toJSON();
        json.setAttack = this.getAttack();
        json.setDefense = this.getDefense();
        json.setProtection = this.getProtection();
        return json;
    }

};

/* Mixin for damage objects. */
Mixin.Damage = (superclass) => class extends Mixin.Defense(superclass) {

    constructor(args) {
        super(args);
        this._damageDie = new RG.Die(1, 4, 0);
        this._range = 1;
    }

    setAttackRange(range) {this._range = range;}
    getAttackRange() {return this._range;}

    rollDamage() {
        if (this.hasOwnProperty('getWeapon')) {
            const weapon = this.getWeapon();
            if (!RG.isNullOrUndef([weapon])) {
                return weapon.rollDamage();
            }
        }
        return this._damageDie.roll();
    }

    getDamageDie() {return this._damageDie;}

    setDamageDie(dStr) {
        if (typeof dStr === 'string') {
            this._damageDie = RG.FACT.createDie(dStr);
        }
        else if (typeof dStr === 'object') {
            this._damageDie = dStr;
        }
    }

    copy(rhs) {
        super.copy(rhs);
        this.setAttackRange(rhs.getAttackRange());
        const die = rhs.getDamageDie().clone();
        this.setDamageDie(die);
    }

    equals(rhs) {
        let res = super.equals(rhs);
        if (res) {
            res = this.getDamageDie().equals(rhs.getDamageDie());
            res = res && this.getAttackRange() === rhs.getAttackRange();
        }
        return res;
    }

    toString() {
        let msg = super.toString();
        msg += 'Dmg: ' + this.getDamageDie().toString();
        msg += ', R:' + this.getAttackRange();
        return msg;
    }

    toJSON() {
        const json = super.toJSON();
        json.setAttackRange = this.getAttackRange();
        json.setDamageDie = this.getDamageDie().toString();
        return json;
    }

};

export default Mixin;

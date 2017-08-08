
const RG = require('./rg');

RG.Mixin = {};

RG.Mixin.CombatAttr = (superclass) => class extends superclass {

    constructor(args) {
        super(args);
        this._attack = 0;
        this._range = 0;
        this._defense = 0;
        this._protection = 0;
    }

    getAttack() {return this._attack;}
    setAttack(attack) { this._attack = attack; }

    /* Defense related methods.*/
    getDefense() { return this._defense; }
    setDefense(defense) { this._defense = defense; }

    getProtection() {return this._protection;}
    setProtection(prot) {this._protection = prot;}

    /* Attack methods. */
    setAttackRange(range) {this._range = range;}
    getAttackRange() {return this._range; }

    copy(rhs) {
        super.copy(rhs);
        this._attack = rhs._attack;
        this._range = rhs._range;
        this._defense = rhs._defense;
        this._protection = rhs._protection;
    }

    toJSON() {
        const obj = super.toJSON();
        obj.setAttack = this._attack;
        obj.setAttackRange = this._range;
        obj.setDefense = this._defense;
        obj.setProtection = this._protection;
        return obj;
    }

};

RG.Mixin.DamageRoll = (superclass) => class extends superclass {

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
        this.damageDie = rhs.getDamageDie();
    }

    toJSON() {
        const obj = super.toJSON();
        obj.setDamageDie = this.damageDie.toString();
        return obj;
    }

};

/* Adds a duration and accessor functions to given component. */
RG.Mixin.DurationRoll = (superclass) => class extends superclass {

    rollDuration() {
        return this.duration.roll();
    }

    setDurationDie(die) {
        this.duration = die;
    }

    getDurationDie() {
        return this.duration;
    }

    copy(rhs) {
        super.copy(rhs);
        this.duration = rhs.getDurationDie();
    }

    toJSON() {
        const obj = super.toJSON();
        obj.setDurationDie = this.duration.toString();
        return obj;
    }

};

module.exports = RG.Mixin;

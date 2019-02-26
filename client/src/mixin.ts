import RG from './rg';
import {Dice} from './dice';
import {TCoord} from './interfaces';

export const Mixin: any = {};

// Dummy Base class to be used with mixins.
export class Base {}
Mixin.Base = Base;

interface MixinArgs {
    [key: string]: any;
}

/* A mixin used for typed objects. */
export const Typed = superclass => class extends superclass {

    constructor(args?: MixinArgs) {
        if (superclass) {super(args);}
        this.type = args.type || '';
        this._propType = args.propType || '';
    }

    public getPropType(): string {return this._propType;}
    public getType(): string {return this.type;}

    public setPropType(propType) {
        const index = RG.PROP_TYPES.indexOf(propType);
        if (index >= 0) {
            this._propType = propType;
        }
        else {
            RG.err('Object.Typed', 'setPropType',
                'Unknown prop type: |' + propType + '|');
        }
    }

    public setType(type: string): void {
        this.type = type;
        RG.nullOrUndefError('Object.Typed: setType', 'arg |type|', type);
    }

};

export interface Locatable {
    getX: () => number;
    getY: () => number;
    getXY: () => TCoord;
    getLevel: () => any; // Add typings
}

/* Mixin used in Locatable objects with x,y coordinates. */
export const Locatable = superclass => class extends superclass {

    private _x: number;
    private _y: number;
    private _level: any;

    constructor(args?: MixinArgs) {
        super(args);
        this._x = null;
        this._y = null;
        this._level = null;
    }

    public setX(x) {this._x = x; }
    public setY(y) {this._y = y; }
    public getX() {return this._x;}
    public getY() {return this._y;}

    public isAtXY(x, y): boolean {
        return x === this._x && y === this._y;
    }

    public getXY(): TCoord {
        return [this._x, this._y];
    }

    /* Simple getters/setters for coordinates.*/
    public setXY(x, y) {
        this._x = x;
        this._y = y;
    }

    /* Accessing the current cell of object. */
    public getCell() {
        return this._level.getMap().getCell(this._x, this._y);
    }

    /* Sets the level of this locatable object.*/
    public setLevel(level) {
        this._level = level;
        RG.nullOrUndefError('Mixin.Locatable: setLevel', 'arg |level|', level);
    }

    /* Unsets the level to null. Throws error if level already null. */
    public unsetLevel() {
        if (this._level) {
            this._level = null;
        }
        else {
            RG.err('Mixin.Locatable', 'unsetLevel',
                'Trying to unset already null level.');
        }
    }

    public getLevel() {
        return this._level;
    }

    /* Returns true if object is located at a position on a level.*/
    public isLocated() {
        return (this._x !== null) && (this._y !== null)
            && (this._level !== null);
    }

};

/* Mixin for objects requiring a damage roll. */
export const DamageRoll = (superclass) => class extends superclass {

    public damageDie: any;

    constructor(args?: MixinArgs) {
        super(args);
        this.damageDie = Dice.create('1d4');
    }

    public rollDamage() {
        if (this.getEntity().hasOwnProperty('getWeapon')) {
            const weapon = this.getEntity().getWeapon();
            if (weapon !== null) {return weapon.rollDamage();}
        }
        return this.damageDie.roll();
    }

    public getDamageDie() {
        return this.damageDie;
    }

    public setDamageDie(strOrDie) {
        if (typeof strOrDie === 'string') {
            this.damageDie = Dice.create(strOrDie);
        }
        else {
            this.damageDie = strOrDie;
        }
    }

    public copy(rhs) {
        super.copy(rhs);
        this.damageDie = rhs.getDamageDie().clone();
    }

    public toJSON() {
        const obj = super.toJSON();
        obj.setDamageDie = this.damageDie.toString();
        return obj;
    }

};

/* Adds a duration and accessor functions to given component. */
export const DurationRoll =superclass => class extends superclass {

    constructor(args?: MixinArgs) {
        super(args);
    }

    public rollDuration() {
        return this.duration.roll();
    }

    public setDurationDie(strOrDie) {
        if (typeof strOrDie === 'string') {
            this.duration = Dice.create(strOrDie);
        }
        else {
            this.duration = strOrDie;
        }
    }

    public getDurationDie() {
        return this.duration;
    }

    public copy(rhs) {
        super.copy(rhs);
        this.duration = rhs.getDurationDie().clone();
    }

    public toJSON() {
        const obj = super.toJSON();
        obj.setDurationDie = this.duration.toString();
        return obj;
    }

};

export const Defense =superclass => class extends superclass {

    private _attack: number;
    private _defense: number;
    private _protection: number;

    constructor(args?: MixinArgs) {
        super(args);
        this._attack = 1;
        this._defense = 1;
        this._protection = 0;
    }

    public getAttack() {return this._attack;}

    public setAttack(attack) {
        this._attack = attack;
    }

    /* Defense related methods.*/
    public getDefense() { return this._defense; }

    public setDefense(defense) {
        this._defense = defense;
    }

    public getProtection() {
        return this._protection;
    }

    public setProtection(prot) {
        this._protection = prot;
    }

    public copy(rhs) {
        super.copy(rhs);
        this.setAttack(rhs.getAttack());
        this.setDefense(rhs.getDefense());
        this.setProtection(rhs.getProtection());
    }

    public equals(rhs) {
        let res = super.equals(rhs);
        if (res) {
            res = this.getAttack() === rhs.getAttack() &&
                this.getDefense() === rhs.getDefense() &&
                this.getProtection() === rhs.getProtection();
        }
        return res;
    }

    public toString() {
        let msg = super.toString();
        msg += ` A: ${this.getAttack()}, D: ${this.getDefense()}, `;
        msg += ` P: ${this.getProtection()}, `;
        return msg;
    }

    public toJSON() {
        const json = super.toJSON();
        json.setAttack = this.getAttack();
        json.setDefense = this.getDefense();
        json.setProtection = this.getProtection();
        return json;
    }

};

export interface Defense {
    getAttack(): number;
}

/* Mixin for damage objects. */
export const Damage =superclass => class extends Defense(superclass) {

    constructor(args) {
        super(args);
        this._damageDie = new Dice(1, 4, 0);
        this._range = 1;
    }

    public setAttackRange(range) {this._range = range;}
    public getAttackRange() {return this._range;}

    public rollDamage(): number {
        if (this.hasOwnProperty('getWeapon')) {
            const weapon = this.getWeapon();
            if (!RG.isNullOrUndef([weapon])) {
                return weapon.rollDamage();
            }
        }
        return this._damageDie.roll();
    }

    public getDamageDie(): Dice {return this._damageDie;}

    public setDamageDie(dStr: string | Dice): void {
        if (typeof dStr === 'string') {
            this._damageDie = Dice.create(dStr);
        }
        else if (typeof dStr === 'object') {
            this._damageDie = dStr;
        }
    }

    public copy(rhs): void {
        super.copy(rhs);
        this.setAttackRange(rhs.getAttackRange());
        const die = rhs.getDamageDie().clone();
        this.setDamageDie(die);
    }

    public equals(rhs): boolean {
        let res = super.equals(rhs);
        if (res) {
            res = this.getDamageDie().equals(rhs.getDamageDie());
            res = res && this.getAttackRange() === rhs.getAttackRange();
        }
        return res;
    }

    public toString(): string {
        let msg = super.toString();
        msg += 'Dmg: ' + this.getDamageDie().toString();
        msg += ', R:' + this.getAttackRange();
        return msg;
    }

    public toJSON() {
        const json = super.toJSON();
        json.setAttackRange = this.getAttackRange();
        json.setDamageDie = this.getDamageDie().toString();
        return json;
    }

};

export interface Damage extends Defense {
    getAttackRange(): number;
    rollDamage(): number;
    getDamageDie(): Dice;
}

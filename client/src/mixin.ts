import RG from './rg';
import {Dice} from './dice';
import {TCoord} from './interfaces';

type BaseObject = import('./entity').Entity;
type Cell = import('./map.cell').Cell;
type Level = import('./level').Level;

export const Mixin: any = {};

// Dummy Base class to be used with mixins.
//export class Base {}
//Mixin.Base = Base;

interface MixinArgs {
    [key: string]: any;
}

/* Used in the mixins. */
type Constructor<T = BaseObject> = new (...args: any[]) => T;

/* A mixin used for typed objects. */
export function Typed<TBase extends Constructor>(Base: TBase) {

    return class extends Base {

        public type: string;
        private _propType: string;

        constructor(...args: any[]) {
            // if (Base) {super(...args);}
            super(...args);
            this.type = args.length > 0 ? args[0].type : '';
            this._propType = args.length > 0 ? args[0].propType : '';
        }

        public getPropType(): string {return this._propType;}
        public getType(): string {return this.type;}

        public setPropType(propType: string): void {
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
}

export interface Locatable {
    getX: () => number;
    getY: () => number;
    getXY: () => TCoord;
    getLevel: () => any; // Add typings
}

const NO_COORD = null;

/* Mixin used in Locatable objects with x,y coordinates. */
export function Locatable<TBase extends Constructor>(Base: TBase) {

    return class extends Base {
        private _x: null | number;
        private _y: null | number;
        private _level: null | Level;

        constructor(...args: any[]) {
            super(...args);
            this._x = NO_COORD;
            this._y = NO_COORD;
            this._level = NO_COORD;
        }

        public setX(x: number) {this._x = x; }
        public setY(y: number) {this._y = y; }
        public getX(): number {return this._x as number;}
        public getY(): number {return this._y as number;}

        public isAtXY(x: number, y: number): boolean {
            return x === this._x && y === this._y;
        }

        public getXY(): TCoord {
            return [this._x as number, this._y as number];
        }

        /* Simple getters/setters for coordinates.*/
        public setXY(x: number, y: number): void {
            this._x = x;
            this._y = y;
        }

        /* Accessing the current cell of object. */
        public getCell(): Cell {
            if (this._level) {
                const [xx, yy] = [this._x as number, this._y as number];
                return this._level.getMap().getCell(xx, yy);
            }
            RG.err('Locatable', 'getCell',
                'Level is null. This call was most likely a bug');

            return {} as any;
        }

        /* Sets the level of this locatable object.*/
        public setLevel(level: Level): void {
            this._level = level;
            RG.nullOrUndefError('Mixin.Locatable: setLevel', 'arg |level|', level);
        }

        /* Unsets the level to null. Throws error if level already null. */
        public unsetLevel(): void {
            if (this._level) {
                this._level = null;
            }
            else {
                RG.err('Mixin.Locatable', 'unsetLevel',
                    'Trying to unset already null level.');
            }
        }

        public getLevel(): null | Level {
            return this._level;
        }

        /* Returns true if object is located at a position on a level.*/
        public isLocated(): boolean {
            return (this._x !== null) && (this._y !== null)
                && (this._level !== null);
        }

        /* Returns true if locatables are in same position.*/
        public isSamePos(obj: Locatable) {
            if (this._x !== obj.getX()) {return false;}
            if (this._y !== obj.getY()) {return false;}
            if (this._level !== obj.getLevel()) {return false;}
            return true;
        }

    };
}

/* Mixin for objects requiring a damage roll. */
export const DamageRoll = (superclass) => class extends superclass {

    public damageDie: Dice;

    constructor(args?: MixinArgs) {
        super(args);
        this.damageDie = Dice.create('1d4');
    }

    public rollDamage(): number {
        if (this.getEntity().hasOwnProperty('getWeapon')) {
            const weapon = this.getEntity().getWeapon();
            if (weapon !== null) {return weapon.rollDamage();}
        }
        return this.damageDie.roll();
    }

    public getDamageDie(): Dice {
        return this.damageDie;
    }

    public setDamageDie(strOrDie: Dice | string): void {
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
export const DurationRoll = superclass => class extends superclass {

    public duration: Dice;

    constructor(args?: MixinArgs) {
        super(args);
    }

    public rollDuration(): number {
        return this.duration.roll();
    }

    public setDurationDie(strOrDie: string | Dice): void {
        if (typeof strOrDie === 'string') {
            this.duration = Dice.create(strOrDie);
        }
        else {
            this.duration = strOrDie;
        }
    }

    public getDurationDie(): Dice {
        return this.duration;
    }

    public copy(rhs): void {
        super.copy(rhs);
        this.duration = rhs.getDurationDie().clone();
    }

    public toJSON() {
        const obj = super.toJSON();
        obj.setDurationDie = this.duration.toString();
        return obj;
    }

};

export const Defense = superclass => class extends superclass {

    private _attack: number;
    private _defense: number;
    private _protection: number;

    constructor(args?: MixinArgs) {
        super(args);
        this._attack = 1;
        this._defense = 1;
        this._protection = 0;
    }

    public getAttack(): number {return this._attack;}

    public setAttack(attack: number): void {
        this._attack = attack;
    }

    /* Defense related methods.*/
    public getDefense(): number {return this._defense;}

    public setDefense(defense: number): void {
        this._defense = defense;
    }

    public getProtection(): number {
        return this._protection;
    }

    public setProtection(prot: number): void {
        this._protection = prot;
    }

    public copy(rhs): void {
        super.copy(rhs);
        this.setAttack(rhs.getAttack());
        this.setDefense(rhs.getDefense());
        this.setProtection(rhs.getProtection());
    }

    public equals(rhs): boolean {
        let res = super.equals(rhs);
        if (res) {
            res = this.getAttack() === rhs.getAttack() &&
                this.getDefense() === rhs.getDefense() &&
                this.getProtection() === rhs.getProtection();
        }
        return res;
    }

    public toString(): string {
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

    protected _damageDie: Dice;
    protected _range: number;

    constructor(args) {
        super(args);
        this._damageDie = new Dice(1, 4, 0);
        this._range = 1;
    }

    public setAttackRange(range: number): void {this._range = range;}
    public getAttackRange(): number {return this._range;}

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
        this._damageDie = Dice.getDice(dStr);
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

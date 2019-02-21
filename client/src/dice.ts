
import RG from './rg';
import {Random} from './random';

// RNG used for dynamic "micro" stuff like damage rolls etc level ups

// Can be either '1d6 + 4' or [1, 6, 4] for example
type IDiceInputArg = string | [number, number, number];

type DiceValue = Dice | IDiceInputArg;

/* Each die has number of throws, type of dice (d6, d20, d200...) and modifier
 * which is +/- X. */
export class Dice {

    public static RNG: Random;
    public static DIE_RE = /\s*(\d+)d(\d+)\s*(\+|-)?\s*(\d+)?/;
    public static DIE_NUMBER = /^\s*(-?\d+)\s*$/;

    /* Creates a new die object from array or die expression '2d4 + 3' etc.*/
    public static create(strOrArray: IDiceInputArg): Dice {
        const numDiceMod: number[] = Dice.parseDieSpec(strOrArray);
        if (numDiceMod.length === 3) {
            return new Dice(numDiceMod[0], numDiceMod[1], numDiceMod[2]);
        }
        else {
            RG.err('Dice', 'create', 'Could not create dice properly');
        }
    }


    public static getValue(strOrNumOrDie: DiceValue) {
        if (typeof strOrNumOrDie === 'number') {
            if (Number.isInteger((strOrNumOrDie as number))) {
                return strOrNumOrDie;
            }
            else {
            }
        }
        else if (typeof strOrNumOrDie === 'string') {
            const arr: number[] = Dice.parseDieSpec((strOrNumOrDie as string));
            return new Dice(arr[0], arr[1], arr[2]).roll();
        }
        else {
            return (strOrNumOrDie as Dice).roll();
        }
    }


    /* Parses die expression like '2d4' or '3d5 + 4' and returns it as an array [2,
     * 4, 0] or [3, 5, 4]. Returns empty array for invalid expressions.*/
    public static parseDieSpec(strOrArray: IDiceInputArg): number[] {
        if (typeof strOrArray === 'object') {
            if (strOrArray.length >= 3) {
                return [strOrArray[0], strOrArray[1], strOrArray[2]];
            }
        }
        else {
            const match = Dice.DIE_RE.exec(strOrArray);
            if (match !== null) {
                const num = match[1];
                const dType = match[2];
                let mod = null;
                if (!RG.isNullOrUndef([match[3], match[4]])) {
                    if (match[3] === '+') {mod = match[4];}
                    else {mod = '-' + match[4];}
                }
                else {
                    mod = '0';
                }
                return [num, dType, mod];
            }
            else if (Dice.DIE_NUMBER.test(strOrArray)) {
                return [0, 0, parseInt(strOrArray, 10)];
            }
            else {
                RG.err('RG', 'parseDieSpec', 'Cannot parse: ' + strOrArray);
            }
        }
        return [];
    }

    private _num: number;
    private _dice: number;
    private _mod: number;


    constructor(num, dice, mod) {
        this._num = parseInt(num, 10);
        this._dice = parseInt(dice, 10);
        this._mod = parseInt(mod, 10);
    }

    public getNum(): number {return this._num;}
    public setNum(num: number): void {this._num = num;}
    public getDice() {return this._dice;}
    public setDice(dice) {this._dice = dice;}
    public getMod() {return this._mod;}
    public setMod(mod) {this._mod = mod;}

    public roll(): number {
        let res = 0;
        for (let i = 0; i < this._num; i++) {
            res += Dice.RNG.getUniformInt(1, this._dice);
        }
        return res + this._mod;
    }

    public toString(): string {
        let modStr = '+ ' + this._mod;
        if (this._mod < 0) {modStr = '- ' + this._mod;}
        else if (this._mod === 0) {modStr = '';}
        return this._num + 'd' + this._dice + ' ' + modStr;
    }

    public copy(rhs): void {
        this._num = rhs.getNum();
        this._dice = rhs.getDice();
        this._mod = rhs.getMod();
    }

    public clone(): Dice {
        return new Dice(this._num, this._dice, this._mod);
    }

    /* Returns true if dice are equal.*/
    public equals(rhs): boolean {
        let res = this._num === rhs.getNum();
        res = res && (this._dice === rhs.getDice());
        res = res && (this._mod === rhs.getMod());
        return res;
    }

    public toJSON(): number[] {
        return [this._num, this._dice, this._mod];
    }
}
Dice.RNG = new Random(new Date().getTime());

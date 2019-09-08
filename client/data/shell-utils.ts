/* Contains some functions to shorten the definitions in actor/item
 * shells. */

import RG from '../src/rg';
import {Dice} from '../src/dice';
import {
    IAddCompObj, ICompSetterObj, IColor, IDiceInputArg,
    IShell
} from '../src/interfaces';

export const meleeHitDamage = (
    dmg: IDiceInputArg, dur: string | number, dmgType: string, msg?: string
): IAddCompObj => {
    const obj: IAddCompObj = {
        addComp: 'DirectDamage', func: [
            {setter: 'setDamage', value: dmg},
            {setter: 'setDamageType', value: RG.DMG[dmgType]},
            {setter: 'setDamageCateg', value: RG.DMG.MELEE}
        ],
        duration: dur
    };
    if (msg) {
        obj.expireMsg = msg;
    }
    return obj;
};

export const directDamage = (
    dmg: IDiceInputArg, dur: string | number, dmgType: string, prob: number, msg?: string
): IAddCompObj => {
    const obj: IAddCompObj = meleeHitDamage(dmg, dur, dmgType);
    const funcs = obj.func as ICompSetterObj[];
    funcs[2].value = RG.DMG.DIRECT;
    if (prob) {
        funcs.push({setter: 'setProb', value: prob});
    }
    if (msg) {
        obj.expireMsg = msg;
    }
    return obj;
};

export function resistance(type: string, level: string): IAddCompObj {
    const upperType = type.toUpperCase();
    const levelUpper = level.toUpperCase();
    if (!RG.DMG.hasOwnProperty(upperType)) {
        RG.err('actors.ts', 'resistance',
            `No dmg type |${upperType}| in ${Object.keys(RG.DMG)}`);
    }
    if (!RG.RESISTANCE.hasOwnProperty(levelUpper)) {
        RG.err('actors.ts', 'resistance',
            `No dmg type |${levelUpper}| in ${Object.keys(RG.RESISTANCE)}`);
    }
    return {
        comp: 'Resistance', func: {
            setEffect: RG.DMG[upperType],
            setLevel: RG.RESISTANCE[levelUpper]
        }
    };
}

export const color = function(fg: string, bg: string): IColor {
    return {fg, bg};
};

// TODO these should always be extended in mixNewShell instead of override
const defaultMergeProps = new Set<string>(
    ['addComp', 'spells', 'inv', 'equip', 'onAttackHit']
);

// These props are incremented (added) by default
const defaultIncrProps = new Set<string>(
    ['hp', 'maxHP', 'pp', 'maxPP', 'defense',
        'protection', 'attack', 'danger', 'speed',
        'rarity'
    ]
    .concat(RG.STATS_LC)
);

/* Properties which are transformed using a function. */
const defaultTransformProps = {
    damage: transformDamage,
    addDamage: transformAddDamage,
};

// These props are multiplied by default
const defaultMultProps = new Set<string>(
    ['weight', 'value', 'rarity']
);

interface OverrideConf {
    override: {[key: string]: boolean};
    merge: {[key: string]: boolean};
}

/* Creates a new object shell from an array of shells. Applies "smart"
 * merging to some fields like addComp.
 */
export const mixNewShell = function(shells: any[], conf?: OverrideConf): any {
    const newShell = {};
    shells.forEach(shell => {
        for (const p in shell) {
            if (shell.hasOwnProperty(p)) {
                addShellProp(p, shell, newShell, conf);
            }
        }
    });
    return newShell;
};

/* Adds a property to the shell. */
function addShellProp(
    p: string, shell: IShell, newShell: IShell, conf?: OverrideConf
): void {
    if (defaultMergeProps.has(p)) {
        if (newShell.hasOwnProperty(p)) {
            newShell[p] = newShell[p].concat(shell[p]);
        }
        else {
            newShell[p] = shell[p].slice();
        }
    }
    else {
        if (Array.isArray(shell[p])) {
            newShell[p] = shell[p].slice();
        }
        else if (typeof shell[p] === 'object') {
            newShell[p] = JSON.parse(JSON.stringify(shell[p]));
        }
        else {
            if (defaultIncrProps.has(p)) {
                incrShellProp(p, shell, newShell);
            }
            else if (defaultMultProps.has(p)) {
                multShellProp(p, shell, newShell);
            }
            else if (defaultTransformProps.hasOwnProperty(p)) {
                defaultTransformProps[p](p, shell, newShell);
            }
            else {
                newShell[p] = shell[p];
            }
        }
    }
}

// If property reads like '+
const multOpRe = /(\*|\/)\s*(\d+(.\d+)?)/;
const addOpRe = /(\+|-)\s*(\d+(.\d+)?)/;

/* Adds the value of prop p in shell to newShell. */
function incrShellProp(p: string, shell: IShell, newShell: IShell): void {
    if (typeof shell[p] === 'number') {
        if (newShell.hasOwnProperty(p)) {
            newShell[p] += shell[p];
        }
        else {
            newShell[p] = shell[p];
        }
    }
    else {
        checkStringExpression(p, shell, newShell);
    }
}

/* Multiplies a shell property. */
function multShellProp(p: string, shell: IShell, newShell: IShell): void {
    if (typeof shell[p] === 'number') {
        if (newShell.hasOwnProperty(p)) {
            newShell[p] *= Math.round(shell[p]);
        }
        else {
            newShell[p] = shell[p];
        }
    }
    else {
        checkStringExpression(p, shell, newShell);
    }
}


/* Checks if shell[p] is an expression instead of number. */
function checkStringExpression(p: string, shell: IShell, newShell: IShell): void {
    const arr = parseOpAndValue(shell[p]);
    if (!arr) {
        RG.err('shell-utils.ts', 'checkStringExpression',
            `Not legal expression |${shell[p]}|`);
        return;
    }

    const [op, value] = arr;
    if (newShell.hasOwnProperty(p)) {
        if (op === '+') {
            newShell[p] += value;
        }
        else if (op === '-') {
            newShell[p] -= value;
        }
        else if (op === '*') {
            newShell[p] = Math.round(newShell[p] * value);
        }
        else if (op === '/') {
            newShell[p] = Math.round(newShell[p] / value);
        }
        else {
            RG.err('shell-utils.ts', 'incrShellProp',
                `Prop ${p} value illegal: ${shell[p]}`);
        }
    }
    else {
        newShell[p] = value;
    }
}

function parseOpAndValue(expr: string): null | [string, number] {
    let matched = multOpRe.exec(expr);
    if (matched) {
        return [matched[1], parseFloat(matched[2])];
    }
    matched = addOpRe.exec(expr);
    if (matched) {
        return [matched[1], parseFloat(matched[2])];
    }
    return null;

}

/* Transforms damage property. */
function transformDamage(p, shell, newShell): void {
    const dmg = shell[p];
    if (newShell[p]) {
        const baseDmg = newShell[p];
        const dice1 = Dice.create(dmg);
        const dice2 = Dice.create(baseDmg);
        const newDice = Dice.combine(dice1, dice2);
        newShell[p] = newDice.toString();
    }
    else {
        newShell[p] = dmg;
    }
}


function transformAddDamage(p, shell, newShell): void {
    const addDamage = shell[p];
    if (newShell.damage) {
        const dice1 = Dice.create(addDamage);
        const dice2 = Dice.create(newShell.damage);
        const newDice = Dice.addDice(dice1, dice2);
        newShell.damage = newDice.toString();
    }

}

/* Contains some functions to shorten the definitions in actor/item
 * shells. */

import RG from '../src/rg';
import {Dice} from '../src/dice';
import {IAddCompObj, ICompSetterObj, IColor, IDiceInputArg} from '../src/interfaces';

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
const alwaysMergeProps = new Set<string>(
    ['addComp', 'spells', 'inv', 'equip', 'onAttackHit']
);

// Always incremented (added) together
const alwaysIncrProps = new Set<string>(
    ['hp', 'maxHP', 'pp', 'maxPP', 'defense',
        'protection', 'attack', 'danger', 'speed',
        'rarity'
    ]
    .concat(RG.STATS_LC)
);

/* Properties which are transformed using a function. */
const alwaysTransform = {
    damage: transformDamage,
    addDamage: transformAddDamage,
};

// These props are always multiplied
const alwaysMultProps = new Set<string>(
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
function addShellProp(p: string, shell, newShell, conf?: OverrideConf): void {
    if (alwaysMergeProps.has(p)) {
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
            if (alwaysIncrProps.has(p)) {
                incrShellProp(p, shell, newShell);
            }
            else if (alwaysMultProps.has(p)) {
                multShellProp(p, shell, newShell);
            }
            else if (alwaysTransform.hasOwnProperty(p)) {
                alwaysTransform[p](p, shell, newShell);
            }
            else {
                newShell[p] = shell[p];
            }
        }
    }
}

/* Adds the value of prop p in shell to newShell. */
function incrShellProp(p, shell, newShell): void {
    if (newShell.hasOwnProperty(p)) {
        newShell[p] += shell[p];
    }
    else {
        newShell[p] = shell[p];
    }
}

/* Multiplies a shell property. */
function multShellProp(p, shell, newShell): void {
    if (newShell.hasOwnProperty(p)) {
        newShell[p] *= shell[p];
    }
    else {
        newShell[p] = shell[p];
    }
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

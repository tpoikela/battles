/* Contains some functions to shorten the definitions in actor/item
 * shells. */

import RG from '../src/rg';

export const meleeHitDamage = (dmg, dur, dmgType) => {
    return {
        addComp: 'DirectDamage', func: [
            {setter: 'setDamage', value: dmg},
            {setter: 'setDamageType', value: RG.DMG[dmgType]},
            {setter: 'setDamageCateg', value: RG.DMG.MELEE}
        ],
        duration: dur
    };
};

export const color = function(fg, bg) {
    return {fg, bg};
};

// TODO these should always be extended in mixNewShell instead of override
const alwaysMergeProps = new Set<string>(
    ['addComp', 'spells', 'inv', 'equip']
);

const alwaysIncrProps = new Set<string>(
    ['hp', 'maxHP', 'pp', 'maxPP', 'defense',
        'protection', 'attack', 'danger', 'speed'
    ]
    .concat(RG.STATS_LC)
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
function addShellProp(p, shell, newShell, conf?: OverrideConf): void {
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

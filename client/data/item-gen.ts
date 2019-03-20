/* Code for procedurally generating diffent types of items. This is
 * mainly focused on weapons/armour now.
 */

import RG from '../src/rg';
import {IShell, StringMap} from './actor-gen';
import {meleeHitDamage} from './shell-utils';
import {Random} from '../src/random';
import {mixNewShell} from './shell-utils';

const RNG = Random.getRNG();

export const ItemGen: any = {};

interface ItemProps {
    weapon: StringMap<IShell>;
    armour: StringMap<IShell>;
}

const shellProps: any = {};
const names: {[key: string]: string[]} = {};

const weaponTypes = {
    melee: [
        'dagger', 'sword', 'staff', 'whip', 'axe', 'mace', 'saber',
        'spear', 'morningstar', 'battle axe', 'warhammer', 'pick-axe',
        'hammer', 'katana', 'falchion', 'scimitar'
    ],
    ranged: [
        'sling', 'short bow', 'crossbow', 'matchlock', 'musket',
        'rifle'
    ],
    ammo: [
        'arrow', 'bolt', 'bullet'
    ],
    missile: [
        'rock', 'dart', 'throwing axe', 'throwing dagger',
        'throwing knife', 'throwing spear', 'shuriken'
    ]
};
names.weaponTypes = Object.keys(weaponTypes);

const prefix: any = {
    weapon: {
        name: 'sharp', attack: 2
    }
};
names.prefix = {
    weapon: Object.keys(prefix.weapon)
};

const suffix: any = {
    weapon: {
        ofVoid: {
            name: 'of Void',
            onAttackHit: [meleeHitDamage(2, '1d8 + 1', 'VOID')],
            rarity: 4, value: 4
        },
        ofFire: {
            name: 'of Fire',
            onAttackHit: [meleeHitDamage(2, '1d6 + 1', 'FIRE')],
            rarity: 3, value: 3
        }
    }
};
names.suffix = {
    weapon: Object.keys(suffix.weapon)
};

const baseShells: StringMap<IShell> = {
    weapon: {
        range: 1, value: 1, weight: 0.1,
        attack: 0, defense: 0
    }
};

shellProps.weapon = {
    dagger: {
        damage: '1d6', attack: 1, weight: 0.2, rarity: 1,
        value: 10,
    },
    sword: {
        damage: '1d9 + 1', attack: 2, defense: 1, weight: 0.8,
        rarity: 2,
        value: 20,
    },
    spear: {
        damage: '1d9 + 1', attack: 1, defense: 3, weight: 1.0,
        rarity: 3,
        value: 25,
    },
    mace: {
        damage: '1d10', attack: 2, weight: 1.3,
        rarity: 3,
        value: 25,
    },
    axe: {
        damage: '1d10', attack: 2, weight: 1.1, rarity: 3,
        value: 30,
    },
    staff: {
        damage: '1d8', attack: 2, defense: 2, weight: 0.9,
        rarity: 4,
        value: 30,
    }
};
names.weapon = Object.keys(shellProps.weapon);

shellProps.material = {
    leather: {
        weight: 1.0, value: 1.0, rarity: 1.0
    },
    wooden: {
        weight: 1.0, value: 1.0, rarity: 1.0
    },
    iron: {
        weight: 1.7, value: 1.2, rarity: 1.0
    },
    steel: {
        weight: 1.5, value: 1.4, rarity: 1.5
    },
    mithril: {
        weight: 0.9, value: 3.0, rarity: 2.0
    },
    rubyglass: {
        weight: 0.5, value: 5.0, rarity: 3.0
    },
    permaice: {
        weight: 3.0, value: 8.0, rarity: 4.0
    },
    forium: {
        weight: 1.2, value: 7.0, rarity: 5.0
    },
    void: { // No one knows the material really, not even dev
        weight: 1.4, value: 10.0, rarity: 8.0
    }
};

const materials = Object.keys(shellProps.material);

/* Generates a random item shell according to the following rules:
 * 1.
 */
ItemGen.genRandShell = function(type: string): IShell {
    const hasPrefix = RG.isSuccess(RG.ITEM_PREFIX_CHANCE);
    const hasSuffix = RG.isSuccess(RG.ITEM_SUFFIX_CHANCE);
    let prefixName = '';
    let suffixName = '';

    const material = RNG.arrayGetRand(materials);
    const materialShell = shellProps.material[material];

    const weaponName = RNG.arrayGetRand(names[type]);
    const itemShell = shellProps[type][weaponName];

    const allShells = [baseShells[type], itemShell, materialShell];

    let fullName = material + ' ' + weaponName;
    if (hasPrefix) {
        prefixName = RNG.arrayGetRand(names.prefix.weapon);
        const prefixShell = prefix[type][prefixName];
        allShells.push(prefixShell);
        if (prefixShell.name) {
            fullName = prefixShell.name + ' ' + fullName;
        }
        else {
            fullName = prefixName + ' ' + fullName;
        }
    }
    if (hasSuffix) {
        suffixName = RNG.arrayGetRand(names.suffix.weapon);
        const suffixShell = suffix[type][suffixName];
        allShells.push(suffixShell);
        if (suffixShell.name) {
            fullName = fullName + ' ' + suffixShell.name;
        }
        else {
            fullName = fullName + ' ' + suffixName;
        }
    }

    const newShell = mixNewShell(allShells);
    newShell.name = fullName;
    return newShell;
};

/* Generates the given number of actor shells from data in shellProps. */
ItemGen.genItems = function(nItems: number): IShell[] {
    const result = [];
    for (let i = 0; i < nActors; i++) {
        result.push(ItemGen.genRandShell());
    }
    return result;
};

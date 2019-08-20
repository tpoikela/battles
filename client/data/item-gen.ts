/* Code for procedurally generating diffent types of items. This is
 * mainly focused on weapons/armour now.
 */

import RG from '../src/rg';
import {meleeHitDamage, directDamage} from './shell-utils';
import {Random} from '../src/random';
import {mixNewShell} from './shell-utils';
import {IShell, StringMap} from '../src/interfaces';

const RNG = Random.getRNG();

export const ItemGen: any = {};

interface ItemProps {
    weapon: StringMap<IShell>;
    armour: StringMap<IShell>;
}

interface Names {
    armour: string[];
    materials: string[];
    weapon: string[];
    weaponTypes: string[];
    prefix: StringMap<string[]>;
    suffix: StringMap<string[]>;
}

const shellProps: any = {};
ItemGen.shellProps = shellProps;
const names = {} as Names;

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
ItemGen.names = names;

const prefix: any = {
    weapon: {
        heavy: {
            weight: 1.5, value: 1.2, damage: '1d2 + 2', rarity: 1.5
        },
        light: {
            weight: 0.6, value: 1.2, rarity: 2.0
        },
        poisoned: {
            value: 3.0, rarity: 3.0,
            onAttackHit: [meleeHitDamage(2, '1d4 + 1', 'POISON')],
            colorfg: 'Green'
        },
        sharp: {
            damage: '2', value: 1.1, rarity: 1.5
        },
        balanced: {
            attack: 3, damage: '1', value: 1.2, rarity: 1.5
        },
        serrated: {
            value: 2.0, rarity: 2.0,
            onAttackHit: [meleeHitDamage(1, '1d4 + 2', 'PIERCE')],
        }
    }
};

prefix.armour = {
    light: prefix.weapon.light,
    heavy: {weight: 1.5, value: 1.2, protection: 2, rarity: 1.5},
    plated: {weight: 1.2, value: 1.3, protection: 2, rarity: 1.3},
    spiked: {weight: 1.2, value: 1.4, protection: 1, attack: 3, rarity: 2.0},
};

ItemGen.prefix = prefix;
names.prefix = {
    weapon: Object.keys(prefix.weapon),
    armour: Object.keys(prefix.armour)
};

const suffix: any = {
    weapon: {
        ofAccuracy: {
            name: 'of Accuracy', accuracy: 5,
            rarity: 2.5, value: 2.5
        },
        ofAgility: {
            name: 'of Agility', agility: 5,
            rarity: 2.5, value: 2.5
        },
        ofDefense: {
            name: 'of Defense', defense: 5,
            rarity: 3, value: 3
        },
        ofFire: {
            name: 'of Fire',
            onAttackHit: [meleeHitDamage(2, '1d6 + 1', 'FIRE')],
            rarity: 3, value: 3
        },
        ofMight: {
            name: 'of Might', strength: 4,
            rarity: 3, value: 3
        },
        ofNecropotence: {
            name: 'of Necropotence',
            onAttackHit: [
                {transientComp: 'DrainStat', func: [
                    {setter: 'setDrainAmount', value: 1},
                    {setter: 'setSourceComp', value: 'Health'},
                    {setter: 'setSourceGetter', value: 'getHP'},
                    {setter: 'setSourceSetter', value: 'setHP'},
                    {setter: 'setTargetComp', value: 'SpellPower'},
                    {setter: 'setTargetGetter', value: 'getPP'},
                    {setter: 'setTargetSetter', value: 'setPP'},
                    {setter: 'setDrainMsg', value: 'drains life from'},
                ]}
            ],
            onEquip: [
                directDamage(1, '1d1 + 3', 'NECRO', 1.0,
                    'You feel slightly easier'),
                {addComp: 'DirectDamage', func: [
                    {setter: 'setDamage', value: 1},
                    {setter: 'setDamageType', value: RG.DMG.NECRO},
                    {setter: 'setDamageCateg', value: RG.DMG.DIRECT},
                    {setter: 'setProb', value: 0.05},
                    {setter: 'setMsg', value: 'Necropotence demands blood!'},
                ]}
            ],
            rarity: 4, value: 4
        },
        ofFrost: {
            name: 'of Frost',
            onAttackHit: [meleeHitDamage(2, '1d6 + 1', 'ICE')],
            rarity: 3, value: 3
        },
        ofMagic: {
            name: 'of Magic', magic: 5,
            rarity: 2.5, value: 2.5
        },
        ofPerception: {
            name: 'of Perception', perception: 5,
            rarity: 3, value: 3
        },
        ofProtection: {
            name: 'of Protection', protection: 5,
            rarity: 3, value: 3
        },
        ofSpeed: {
            name: 'of Speed', speed: 10,
            rarity: 3, value: 3
        },
        ofVoid: {
            name: 'of Void',
            onAttackHit: [meleeHitDamage(2, '1d8 + 1', 'VOID')],
            rarity: 4, value: 4
        },
        ofSpirit: {
            name: 'of Spirit', spirituality: 6,
            rarity: 3, value: 3
        },
        ofWillpower: {
            name: 'of Willpower', willpower: 6,
            rarity: 3, value: 3
        },
    }
};
suffix.armour = {
    ofAccuracy: suffix.weapon.ofAccuracy,
    ofAgility: suffix.weapon.ofAgility,
    ofDefense: suffix.weapon.ofProtection,
    ofMagic: suffix.weapon.ofMagic,
    ofMight: suffix.weapon.ofMight,
    ofPerception: suffix.weapon.ofPerception,
    ofProtection: suffix.weapon.ofProtection,
    ofSpeed: suffix.weapon.ofSpeed,
    ofLevitation: {
        onEquip: [{addComp: 'Flying'}], rarity: 5, value: 5
    },
    ofNecropotence: {
        onEquip: [
            {addComp: 'RegenEffect', func: [
                {setter: 'setHP', value: 0},
                {setter: 'setMaxWaitPP', value: 25}
            ]},
            {addComp: 'DirectDamage', func: [
                {setter: 'setDamage', value: 1},
                {setter: 'setDamageType', value: RG.DMG.NECRO},
                {setter: 'setDamageCateg', value: RG.DMG.DIRECT},
                {setter: 'setProb', value: 0.05},
                {setter: 'setMsg', value: 'Necropotence demands blood!'},
            ]}
        ]
    },
    ofSpirituality: suffix.weapon.ofSpirit,
    ofWillpower: suffix.weapon.ofWillpower
};
ItemGen.suffix = suffix;
names.suffix = {
    weapon: Object.keys(suffix.weapon),
    armour: Object.keys(suffix.armour)
};

const baseShells: StringMap<IShell> = {
    weapon: {
        type: 'weapon', range: 1, value: 1, attack: 0, defense: 0
    },
    armour: {
        type: 'armour', value: 1, attack: 0, defense: 0,
        protection: 0
    }
};

shellProps.weapon = {
    dagger: {
        damage: '1d6', attack: 1, weight: 0.2, rarity: 1,
        value: 10,
    },
    sword: {
        damage: '1d8 + 2', attack: 2, defense: 1, weight: 0.8,
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
    warhammer: {
        damage: '1d10', attack: 2, weight: 1.1, rarity: 2,
        value: 30,
    },
    staff: {
        damage: '1d8', attack: 2, defense: 2, weight: 0.9,
        rarity: 4, value: 30,
    }
};
names.weapon = Object.keys(shellProps.weapon);

shellProps.armour = {
    robe: {
        armourType: 'chest', weight: 1.0,
        protection: 0, defense: 0
    },
    cuirass: {
        armourType: 'chest', weight: 2.0,
        protection: 3, defense: -1, attack: -1
    },
    boots: {
        armourType: 'feet', weight: 0.5,
        protection: 1, defense: 0, attack: 0
    },
    helmet: {
        armourType: 'head', weight: 0.3,
        protection: 1, defense: 0, attack: 0
    },
    collar: {
        armourType: 'neck', weight: 0.2,
        protection: 1, defense: 0, attack: 0
    },
    shield: {
        armourType: 'shield', weight: 0.8,
        protection: 2, defense: 1, attack: 0
    },
    buckler: {
        armourType: 'shield', weight: 0.4,
        protection: 0, defense: 3, attack: 1
    }
};
names.armour = Object.keys(shellProps.armour);

shellProps.material = {
    leather: {
        weight: 1.0, value: 1.0, rarity: 1.0
    },
    wooden: {
        weight: 1.0, value: 1.0, rarity: 1.0
    },
    iron: {
        weight: 1.7, value: 1.2, rarity: 1.0,
        weapon: {
            damage: '1d2 + 1'
        }
    },
    steel: {
        weight: 1.5, value: 1.4, rarity: 1.5,
        weapon: {
            damage: '1d3 + 2'
        }
    },
    mithril: {
        weight: 0.9, value: 3.0, rarity: 2.0,
        weapon: {
            damage: '2d2 + 3'
        }
    },
    rubyglass: {
        weight: 0.5, value: 5.0, rarity: 3.0,
        weapon: {
            damage: '2d3 + 3'
        }
    },
    permaice: {
        weight: 3.0, value: 8.0, rarity: 4.0,
        weapon: {
            damage: '2d3 + 6'
        }
    },
    forium: {
        weight: 1.2, value: 7.0, rarity: 5.0,
        weapon: {
            damage: '2d2 + 4'
        }
    },
    void: { // No one knows the material really, not even dev
        weight: 1.4, value: 10.0, rarity: 8.0,
        weapon: {
            damage: '2d2 + 6',
            onAttackHit: [meleeHitDamage(2, '1d6 + 1', 'VOID')],
        }
    }
};

names.materials = Object.keys(shellProps.material);

const itemTypes = ['armour', 'weapon'];

/* Generates a random item shell according to the following rules:
 * 1.
 */
ItemGen.genRandShell = function(type: string): IShell {
    const hasPrefix = RG.isSuccess(RG.ITEM_PREFIX_CHANCE);
    const hasSuffix = RG.isSuccess(RG.ITEM_SUFFIX_CHANCE);
    let prefixName = '';
    let suffixName = '';

    const material = RNG.arrayGetRand(names.materials);
    const materialShell = shellProps.material[material];
    let materialItemShell = null;
    if (materialShell[type]) {
        // If we have type-specific shell in material, use it
        materialItemShell = materialShell[type];
    }

    const chosenName = RNG.arrayGetRand(names[type] as string[]);
    const itemShell = shellProps[type][chosenName];

    const allShells = [baseShells[type], itemShell, materialShell];
    if (materialItemShell) {
        allShells.push(materialItemShell);
    }

    let fullName = material + ' ' + chosenName;
    if (hasPrefix) {
        prefixName = RNG.arrayGetRand(names.prefix[type]);
        const prefixShell = prefix[type][prefixName];
        allShells.push(prefixShell);
        fullName = addNamePrefix(fullName, prefixName, prefixShell);
    }
    if (hasSuffix) {
        suffixName = RNG.arrayGetRand(names.suffix[type]);
        const suffixShell = suffix[type][suffixName];
        allShells.push(suffixShell);
        fullName = addNameSuffix(fullName, suffixName, suffixShell);
    }

    const newShell = mixNewShell(allShells);
    newShell.name = fullName;
    return newShell;
};

type NameMap = StringMap<string>;

/* Given an input map, builds a shell based on values. For example:
 * {name: 'sword', type: 'weapon', material: 'iron', suffix...}
 * will mix the specified shells and return a new one.
 */
ItemGen.buildShell = function(nameMap: NameMap): IShell {
    const {type} = nameMap;
    if (!type) {
        RG.err('ItemGen', 'buildShell', 'No type was given');
    }
    const baseShell = baseShells[type];
    const materialShell = shellProps.material[nameMap.material];
    let materialItemShell = null;
    if (materialShell[type]) {
        // If we have type-specific shell in material, use it
        materialItemShell = materialShell[type];
    }

    const prefixShell = prefix[type][nameMap.prefix];
    const suffixShell = suffix[type][nameMap.suffix];
    const itemShell = shellProps[type][nameMap.name];
    const usedShells = [baseShell, materialShell, itemShell];
    if (materialItemShell) {
        usedShells.push(materialItemShell);
    }

    let fullName = nameMap.material + ' ' + nameMap.name;
    if (prefixShell) {
        usedShells.push(prefixShell);
        fullName = addNamePrefix(fullName, nameMap.prefix, prefixShell);
    }
    if (suffixShell) {
        usedShells.push(suffixShell);
        fullName = addNameSuffix(fullName, nameMap.suffix, suffixShell);
    }

    const newShell = mixNewShell(usedShells);
    newShell.name = fullName;
    return newShell;
};

/* Generates the given number of actor shells from data in shellProps. */
ItemGen.genItems = function(nItems: number): IShell[] {
    const result = [];
    for (let i = 0; i < nItems; i++) {
        const itemType = RNG.arrayGetRand(itemTypes);
        result.push(ItemGen.genRandShell(itemType));
    }
    return result;
};

/* Generates a random shell and accepts it with given function. */
ItemGen.genRandShellWith = function(constrOrFunc): IShell {
    let maxTries = 100;
    let shell = null;
    while (maxTries >= 0) {
        const itemType = RNG.arrayGetRand(itemTypes);
        --maxTries;
        shell = ItemGen.genRandShell(itemType);
        if (constrOrFunc(shell)) {break;}
    }
    return shell;
};


function addNamePrefix(fullName: string, prefixName: string, prefixShell: IShell): string {
    let name = fullName;
    if (prefixShell.name) {
        name = prefixShell.name + ' ' + fullName;
    }
    else {
        name = prefixName + ' ' + fullName;
    }
    return name;
}

function addNameSuffix(fullName: string, suffixName: string, suffixShell: IShell): string {
    let name = fullName;
    if (suffixShell.name) {
        name = fullName + ' ' + suffixShell.name;
    }
    else {
        name = fullName + ' ' + suffixName;
    }
    return name;
}

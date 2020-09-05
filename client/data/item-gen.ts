/* Code for procedurally generating diffent types of items. This is
 * mainly focused on weapons/armour now.
 */

import RG from '../src/rg';
import {meleeHitDamage, directDamage, resistance} from './shell-utils';
import {Random} from '../src/random';
import {mixNewShell} from './shell-utils';
import {IShell, StringMap} from '../src/interfaces';

const RNG = Random.getRNG();

export const ItemGen: any = {};

interface ItemProps {
    weapon: StringMap<IShell>;
    armour: StringMap<IShell>;
    missile: StringMap<IShell>;
    missileweapon: StringMap<IShell>;
}

interface Names {
    armour: string[];
    ammo: string[];
    materials: string[];
    weapon: string[];
    weaponTypes: string[];
    prefix: StringMap<string[]>;
    suffix: StringMap<string[]>;
    missile: string[];
    missileweapon: string[];
}

const shellProps: any = {};
ItemGen.shellProps = shellProps;
const names = {} as Names;

const weaponTypes = {
    melee: [
        'dagger', 'sword', 'staff', 'whip', 'axe', 'mace', 'saber',
        'spear', 'morningstar', 'battle axe', 'warhammer', 'pick-axe',
        'hammer', 'katana', 'falchion', 'scimitar', 'war scythe'
    ],
    missileweapon: [
        'sling', 'short bow', 'warbow', 'crossbow', 'musket',
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
    },
    missileweapon: {},
    ammo: {},
    missile: {},
};

prefix.ammo = Object.assign(prefix.ammo, prefix.weapon);
prefix.missile = Object.assign(prefix.missile, prefix.weapon);

prefix.armour = {
    light: prefix.weapon.light,
    heavy: {weight: 1.5, value: 1.2, protection: 2, rarity: 1.5},
    plated: {weight: 1.2, value: 1.3, protection: 3, rarity: 1.3},
    spiked: {weight: 1.2, value: 1.4, protection: 1, attack: 3, rarity: 2.0},
};

ItemGen.prefix = prefix;
names.prefix = {
    weapon: Object.keys(prefix.weapon),
    armour: Object.keys(prefix.armour),
    missileweapon: Object.keys(prefix.missileweapon),
    missile: Object.keys(prefix.missile),
    ammo: Object.keys(prefix.ammo),
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
        ofSerpent: {
            name: 'of Serpent', addComp: [resistance('POISON', 'MEDIUM')],
            rarity: 2, value: 2
        },
        ofHoly: {
            name: 'of Holy', addComp: [resistance('NECRO', 'MEDIUM')],
            rarity: 2, value: 2
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
    ofSerpent: suffix.weapon.ofSerpent,
    ofHoly: suffix.weapon.ofHoly,
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

suffix.missile = {
    ofParalysis: {
        name: 'of paralysis', rarity: 3, value: 2,
        onAttackHit: [{addComp: 'Paralysis', duration: '1'}]
    },
    ofStunning: {
        name: 'of stunning', rarity: 3, value: 2,
        onAttackHit: [{addComp: 'Stun', duration: '1'}]
    },
    ofSlowness: {
        name: 'of slowness', rarity: 3, value: 3,
        onAttackHit: [{addComp: 'StatsMods', func: [{setter: 'setSpeed', value: -10}],
            duration: '3d10'}]
    }
};
suffix.missileweapon = {};
suffix.ammo = suffix.missile;

ItemGen.suffix = suffix;
names.suffix = {
    weapon: Object.keys(suffix.weapon),
    armour: Object.keys(suffix.armour),
    missileweapon: Object.keys(suffix.missileweapon),
    missile: Object.keys(suffix.missile),
    ammo: Object.keys(suffix.ammo),
};

// These are not added to ObjectShellParser, but mixed immediately
const baseShells: StringMap<IShell> = {
    weapon: {
        type: 'weapon', range: 1, value: 1, attack: 0, defense: 0,
        char: '('
    },
    armour: {
        type: 'armour', value: 1, attack: 0, defense: 0,
        protection: 0,
        char: '['
    },
    missile: {
        type: 'missile', value: 1, attack: 0, defense: 0,
        char: '/'
    },
    missileweapon: {
        type: 'missileweapon', value: 1, attack: 0, defense: 0,
        char: '{', fireRate: 1
    },
    ammo: {
        type: 'ammo', value: 1, attack: 0, defense: 0,
        char: '/',
    }
};

shellProps.weapon = {
    dagger: {
        damage: '1d6', attack: 1, weight: 0.2, rarity: 1,
        value: 10,
        weaponType: 'dagger',
    },
    sword: {
        damage: '1d8 + 2', attack: 2, defense: 1, weight: 0.8,
        rarity: 2,
        value: 20,
        weaponType: 'sword',
    },
    spear: {
        damage: '1d9 + 1', attack: 1, defense: 3, weight: 1.0,
        rarity: 3,
        value: 25,
        weaponType: 'spear',
    },
    mace: {
        damage: '1d10', attack: 2, weight: 1.3,
        rarity: 3,
        value: 25,
        weaponType: 'mace',
    },
    axe: {
        damage: '2d6', attack: 2, weight: 1.1, rarity: 3,
        value: 35,
        weaponType: 'axe',
    },
    warhammer: {
        damage: '1d10', attack: 2, weight: 1.1, rarity: 2,
        value: 30,
        weaponType: 'hammer',
    },
    staff: {
        damage: '1d8', attack: 2, defense: 2, weight: 0.9,
        rarity: 4, value: 30,
    },
    'war scythe': {
        damage: '1d10+2', attack: 4, weight: 1.5, rarity: 4,
        value: 50,
        weaponType: 'polearm', damageType: RG.DMG.SLASH
    },
    halberd: {
        damage: '1d12+3', attack: 5, weight: 1.9, rarity: 5,
        value: 55,
        weaponType: 'polearm', damageType: RG.DMG.SLASH
    }
};
names.weapon = Object.keys(shellProps.weapon);

shellProps.armour = {
    robe: {
        armourType: 'chest', weight: 1.0,
        protection: 0, defense: 0,
        value: 15
    },
    cuirass: {
        armourType: 'chest', weight: 2.0,
        protection: 4, defense: -1, attack: -1,
        value: 40, no: {material: ['wooden']}
    },
    mail: {
        armourType: 'chest', weight: 1.7,
        protection: 3, defense: 1, attack: 0,
        value: 30, no: {material: ['leather', 'wooden']}
    },
    brigandine: {
        armourType: 'chest', weight: 1.5,
        protection: 5, defense: 1, attack: 0,
        value: 50, no: {material: ['leather', 'wooden']}
    },
    'full plate': {
        armourType: 'chest', weight: 2.5,
        protection: 8, defense: 0, attack: -2,
        value: 80, no: {material: ['leather', 'wooden', 'cloth']}
    },
    boots: {
        armourType: 'feet', weight: 0.5,
        protection: 1, defense: 0, attack: 0,
        value: 15, no: {material: 'wooden'}
    },
    greaves: {
        armourType: 'legs', weight: 1.0,
        protection: 2, defense: 0, attack: 1,
        value: 20, no: {material: 'wooden'}
    },
    helmet: {
        armourType: 'head', weight: 0.3,
        protection: 1, defense: 0, attack: 0,
        value: 15
    },
    collar: {
        armourType: 'neck', weight: 0.2,
        protection: 1, defense: 0, attack: 0,
        value: 15, no: {material: 'wooden'}
    },
    shield: {
        armourType: 'shield', weight: 0.8,
        protection: 2, defense: 1, attack: 0,
        value: 15, no: {material: ['cloth', 'leather']}
    },
    buckler: {
        armourType: 'shield', weight: 0.4,
        protection: 0, defense: 3, attack: 1,
        value: 20, no: {material: ['cloth', 'leather']}
    }
};
names.armour = Object.keys(shellProps.armour);


shellProps.missile = {
    'shuriken': {
        char: '*', damage: '1d6', range: 3,
        value: 10, weaponType: 'shuriken', weight: 0.1
    },
    'dart': {
        char: '/', damage: '1d6 + 1', range: 3,
        value: 13, weaponType: 'dart', weight: 0.1
    },
    'throwing knife': {
        char: '/', damage: '1d6', range: 3, weight: 0.2,
        value: 13, attack: 1, weaponType: 'dagger'
    },
    'throwing spear': {
        attack: 2, damage: '1d7 + 1', range: 3, value: 30, weight: 0.4,
        weaponType: 'spear'
    },
    'throwing axe': {
        attack: 2, damage: '1d8 + 1', range: 3, value: 35, weight: 0.3,
    },
};
names.missile = Object.keys(shellProps.missile);

shellProps.missileweapon = {
    sling: {
        weaponType: 'sling', value: 15,
        damage: '1d4', range: 3,
        weight: 0.3,
    },
    'short bow': {
        weaponType: 'bow', value: 25,
        damage: '1d6', range: 4,
        weight: 0.6,
    },
    warbow: {
        weaponType: 'bow', value: 35,
        damage: '1d9', range: 6,
        weight: 0.9,
    },
    'light crossbow': {
        weaponType: 'crossbow', value: 30,
        damage: '1d8', range: 5,
        weight: 1.0,
    },
    crossbow: {
        weaponType: 'crossbow', value: 40,
        damage: '2d6', range: 6,
        weight: 1.5,
    },
    musket: {
        weaponType: 'rifle', value: 50,
        damage: '2d6', range: 6,
        no: {material: ['wooden']},
        weight: 2.5
    },
    rifle: {
        weaponType: 'rifle', value: 75,
        damage: '3d6', range: 7,
        no: {material: ['wooden']},
        weight: 3.5
    }
};
names.missileweapon = Object.keys(shellProps.missileweapon);

shellProps.ammo = {
    arrow: {
        ammoType: 'bow',
        damage: '1d6', value: 5, range: 1,
        weight: 0.1
    },
    bolt: {
        ammoType: 'crossbow',
        damage: '1d8', value: 8, range: 1,
        weight: 0.1
    },
    bullet: {
        ammoType: 'rifle',
        damage: '1d8', value: 15,
        no: {material: ['wooden']}, range: 1,
        weight: 0.1
    },
};
names.ammo = Object.keys(shellProps.ammo);

shellProps.material = {
    cloth: {
        weight: 0.5, value: 0.5, rarity: 1.0,
        armour: {
            onEquip: [resistance('BLUNT', 'MEDIUM')]
        }
    },
    leather: {
        weight: 1.0, value: 1.0, rarity: 1.0,
        armour: {
            protection: 1
        }
    },
    wooden: {
        weight: 1.0, value: 1.0, rarity: 1.0
    },
    iron: {
        weight: 1.7, value: 1.2, rarity: 1.0,
        weapon: {
            damage: '1d2 + 1'
        },
        armour: {
            protection: '* 1.3', attack: -1
        }
    },
    steel: {
        weight: 1.5, value: 1.4, rarity: 1.5,
        weapon: {
            damage: '1d4 + 2'
        },
        armour: {
            protection: '* 1.5', attack: -1
        }
    },
    mithril: {
        className: 'cell-item-mithril',
        weight: 0.75, value: 3.0, rarity: 2.3,
        weapon: {
            damage: '2d3 + 3'
        },
        armour: {
            protection: '* 1.7', attack: -1
        }
    },
    rubyglass: {
        className: 'cell-item-ruby-glass',
        weight: 0.5, value: 5.0, rarity: 3.0,
        weapon: {
            damage: '2d4 + 3'
        },
        armour: {
            protection: '* 1.95', defense: 2
        }
    },
    permaice: {
        className: 'cell-item-ice',
        weight: 3.0, value: 8.0, rarity: 4.0,
        weapon: {
            damage: '3d4 + 6'
        },
        armour: {
            protection: '* 3.0',
            defense: -2, attack: -2
        }
    },
    forium: {
        className: 'cell-item-magic',
        weight: 1.2, value: 7.0, rarity: 5.0,
        weapon: {
            damage: '2d4 + 4'
        },
        armour: {
            protection: '* 2.2',
            defense: 1
        }
    },
    netherium: {
        className: 'cell-item-nether',
        weight: 2.0, value: 7.0, rarity: 5.0,
        weapon: {
            damage: '2d4 + 2',
            attack: 5
        },
        armour: {
            protection: '* 2.2',
            defense: -1, attack: -1
        }
    },
    void: { // No one knows the material really, not even dev
        className: 'cell-item-void',
        weight: 1.4, value: 10.0, rarity: 8.0,
        weapon: {
            damage: '2d6 + 6',
            onAttackHit: [meleeHitDamage(2, '1d6 + 1', 'VOID')],
        },
        armour: {
            protection: '* 2.0',
            addComp: [resistance('VOID', 'MEDIUM')],
        }
    }
};
copyValues(shellProps.material, 'weapon', 'missileweapon');
copyValues(shellProps.material, 'weapon', 'missile');
copyValues(shellProps.material, 'weapon', 'ammo');

names.materials = Object.keys(shellProps.material);

const materialForTypes: {[key: string]: string[]} = {
    weapon: names.materials.filter(name => !/(wooden|leather|cloth)/.test(name)),
    armour: names.materials.slice(),
    missileweapon: names.materials.filter(name => !/(leather|cloth)/.test(name)),
    missile: names.materials.filter(name => !/(leather|cloth)/.test(name)),
    ammo: names.materials.filter(name => !/(leather|cloth)/.test(name)),
};

const itemTypes = ['armour', 'weapon', 'ammo', 'missile', 'missileweapon'];

/* Generates a random item shell according to the following rules:
 * 1.
 */
ItemGen.genRandShell = function(type: string): IShell {
    const hasPrefix = RG.isSuccess(RG.ITEM_PREFIX_CHANCE);
    const hasSuffix = RG.isSuccess(RG.ITEM_SUFFIX_CHANCE);
    let prefixName = '';
    let suffixName = '';

    const materialList: string[] = materialForTypes[type];
    // const material = RNG.arrayGetRand(names.materials);
    const material = RNG.arrayGetRand(materialList);
    const materialShell = shellProps.material[material];
    let materialItemShell = null;
    if (materialShell[type]) {
        // If we have type-specific shell in material, use it
        materialItemShell = materialShell[type];
    }

    const namesFiltered = filterMaterial(type, material, names[type]);

    // const chosenName = RNG.arrayGetRand(names[type] as string[]);
    const chosenName = RNG.arrayGetRand(namesFiltered);
    const itemShell = shellProps[type][chosenName];

    const allShells = [baseShells[type], itemShell, materialShell];
    if (materialItemShell) {
        allShells.push(materialItemShell);
    }

    let fullName = material + ' ' + chosenName;
    if (hasPrefix) {
        if (names.prefix[type].length > 0) {
            prefixName = RNG.arrayGetRand(names.prefix[type]);
            const prefixShell = prefix[type][prefixName];
            allShells.push(prefixShell);
            fullName = addNamePrefix(fullName, prefixName, prefixShell);
        }
    }
    if (hasSuffix) {
        if (names.suffix[type].length > 0) {
            suffixName = RNG.arrayGetRand(names.suffix[type]);
            const suffixShell = suffix[type][suffixName];
            allShells.push(suffixShell);
            fullName = addNameSuffix(fullName, suffixName, suffixShell);
        }
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


function addNamePrefix(
    fullName: string, prefixName: string, prefixShell: IShell
): string {
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

function filterMaterial(
    type: string, material: string, items: string[]
): string[] {
    return items.filter((itemName: string) => {
        const itemShell = shellProps[type][itemName];
        // Apply no/negative filter
        if (itemShell.no) {
            const noFilter = itemShell.no;
            if (noFilter.material === material) {
                return false;
            }
            if (noFilter.material.indexOf(material) >= 0) {
                return false;
            }
        }
        // Apply only filter
        if (itemShell.only) {
            const onlyFilter = itemShell.only;
            if (Array.isArray(onlyFilter.material)) {
                if (onlyFilter.material.indexOf(material) < 0) {
                    return false;
                }
            }
            else if (onlyFilter.material !== material) {
                return false;
            }
        }
        return true;
    });
}

function copyValues(obj: StringMap<IShell>, from, to): void {
    Object.keys(obj).forEach((key: string) => {
        const shell: IShell = obj[key];
        if (shell[from]) {
            shell[to] = shell[from];
        }
    });
}


/* eslint comma-dangle: 0 */
const RG = require('../src/rg');
const Colors = require('./colors');
const ShellUtils = require('./shell-utils');

const {meleeHitDamage} = ShellUtils;

const scaleAll = 1.0;

/* Function to scale the item values. For fine-tuning the game balance. */
function value(type, val) {
    let value = 0;
    if (typeof type === 'string') {
        switch (type) {
            case 'leather': value = 1.0 * val; break;
            case 'chain': value = 1.0 * val; break;
            case 'steel': value = 1.0 * val; break;
            case 'permaice': value = 1.5 * val; break;
            case 'ruby': value = 1.5 * val; break;
            case 'magic': value = 1.5 * val; break;
            case 'void': value = 1.75 * val; break;
            case 'gem': value = 1.0 * val; break;
            default: value = val;
        }
    }
    else if (Number.isInteger(type)) {
        // If called as ie value(100)
        value = type;
    }
    return Math.floor(scaleAll * value);
}

//----------------------------
// ITEM LIST
//----------------------------

const Items = [
    {
        name: 'Gold coin', className: 'cell-item-gold-coin',
        char: '$', material: 'gold',
        type: 'goldcoin', value: value(10), weight: 0.03
    },
    //------------------------------------------------------------
    // MELEE WEAPONS
    //------------------------------------------------------------
    {
        name: 'MeleeWeaponBase', className: 'cell-item-melee-weapon',
        char: '(',
        material: ['iron', 'wood'],
        type: 'weapon',
        range: 1, attack: 0, defense: 0,
        dontCreate: true // Base class only
    },
    {
        name: 'Dagger', base: 'MeleeWeaponBase',
        material: 'iron',
        damage: '1d4', weaponType: 'dagger',
        weight: 0.2, value: value(5)
    },
    {
        name: 'Bayonette', base: 'MeleeWeaponBase',
        material: 'iron',
        damage: '1d5', weaponType: 'dagger',
        weight: 0.1, value: value(10)
        // TODO combine with rifle
    },
    {
        name: 'Short sword', base: 'MeleeWeaponBase',
        material: 'iron',
        damage: '1d6', weaponType: 'sword',
        weight: 0.5, value: value(20)
    },
    {
        name: 'Wooden staff', base: 'MeleeWeaponBase',
        material: 'wood',
        damage: '1d6', weaponType: 'staff',
        defense: 1,
        weight: 1.0, value: value(30)
    },
    {
        name: 'Whip', base: 'MeleeWeaponBase',
        material: 'leather',
        damage: '1d6', range: 2, attack: -1,
        weight: 0.2, value: value(10)
    },
    {
        name: 'Tomahawk', base: 'MeleeWeaponBase',
        material: ['wood', 'stone', 'leather'],
        damage: '1d7', attack: 1, defense: 1,
        weaponType: 'axe',
        weight: 0.7, value: value(35)
    },
    {
        name: 'Iron staff', base: 'MeleeWeaponBase',
        material: 'iron',
        damage: '1d8', weaponType: 'staff',
        defense: 2,
        weight: 1.9, value: value(40)
    },
    {
        name: 'Piolet', base: 'MeleeWeaponBase',
        damage: '1d8', attack: 1, defense: 1,
        weaponType: 'axe',
        weight: 0.7, value: value(50)
    },
    {
        name: 'Pick-axe', base: 'MeleeWeaponBase',
        damage: '1d8', attack: 1, defense: 2,
        weaponType: 'axe',
        weight: 2.3, value: value(50), use: 'digger'
    },
    {
        name: 'Saber', base: 'MeleeWeaponBase',
        material: 'iron',
        damage: '2d4 + 1', attack: 2, defense: 1,
        weaponType: 'sword',
        weight: 0.6, value: value(30)
    },
    {
        name: 'Mace', base: 'MeleeWeaponBase',
        material: 'iron',
        damage: '2d4 + 2', attack: 2, defense: 0,
        weaponType: 'mace',
        weight: 0.8, value: value(35)
    },
    {
        name: 'Spear', base: 'MeleeWeaponBase',
        damage: '1d8', attack: 1, defense: 3,
        weaponType: 'spear',
        weight: 1.2, value: value(50)
    },
    {
        name: 'Iron axe', base: 'MeleeWeaponBase',
        damage: '1d8', attack: 3, defense: 1,
        weaponType: 'axe',
        weight: 1.5, value: value(60)
    },
    {
        name: 'Longsword', base: 'MeleeWeaponBase',
        material: 'steel',
        damage: '1d8', attack: 2, defense: 2,
        weaponType: 'sword',
        weight: 0.8, value: value(75)
    },
    {
        name: 'Morningstar', base: 'MeleeWeaponBase',
        material: ['wood', 'iron'],
        damage: '1d9 + 2', attack: 2, defense: 3,
        weaponType: 'mace',
        weight: 0.7, value: value(75)
    },
    {
        name: 'Battle axe', base: 'MeleeWeaponBase',
        material: 'iron',
        damage: '2d6 + 2', attack: 2, defense: 1,
        weaponType: 'axe',
        weight: 2.5, value: value(85)
    },
    {
        name: 'Dwarven pick-axe', base: 'MeleeWeaponBase',
        damage: '1d12', attack: 2, defense: 2,
        color: Colors.dwarven,
        weaponType: 'axe',
        weight: 3.5, value: value(120), use: 'digger'
    },
    {
        name: 'Great battle axe', base: 'MeleeWeaponBase',
        material: 'steel',
        damage: '2d7 + 4', attack: 3, defense: 0,
        weaponType: 'axe',
        weight: 4.5, value: value(130)
    },

    // MITHRIL WEAPONS
    {
        name: 'MithrilWeaponBase', base: 'MeleeWeaponBase',
        className: 'cell-item-mithril',
        material: 'mithril', dontCreate: true,
        attack: 1
    },
    {
        name: 'Mithril dagger', base: 'MithrilWeaponBase',
        attack: 2,
        damage: '1d7 + 3', weaponType: 'dagger',
        weight: 0.15, value: value(50)
    },
    {
        name: 'Mithril short sword', base: 'MithrilWeaponBase',
        attack: 3,
        damage: '1d9 + 4', defense: 2, weight: 0.35, value: value(100),
        weaponType: 'sword'
    },
    {
        name: 'Mithril mace', base: 'MithrilWeaponBase',
        damage: '1d11 + 5', weaponType: 'mace',
        attack: 3,
        defense: 2, weight: 2.5, value: value(150)
    },
    {
        name: 'Mithril staff', base: 'MithrilWeaponBase',
        damage: '1d12 + 2', weaponType: 'staff',
        defense: 6, weight: 1.5, value: value(170)
    },
    {
        name: 'Mithril axe', base: 'MithrilWeaponBase',
        attack: 4,
        damage: '1d15 + 2', defense: 3,
        weaponType: 'axe', weight: 1.2, value: value(200)
    },
    {
        name: 'Mithril long sword', base: 'MithrilWeaponBase',
        attack: 5,
        damage: '1d15 + 4', defense: 4, weight: 0.6, value: value(300),
        weaponType: 'sword'
    },
    {
        name: 'Mithril spear', base: 'MithrilWeaponBase',
        attack: 5,
        damage: '1d12 + 4', defense: 8, weight: 0.9, value: value(350),
        weaponType: 'spear'
    },

    // ICE WEAPONS (not easy to hit with, do lots of damage)
    {
        name: 'IceWeaponBase', base: 'MeleeWeaponBase',
        className: 'cell-item-ice',
        material: 'permaice', dontCreate: true,
        attack: 1
    },
    {
        name: 'Permaice dagger', base: 'IceWeaponBase',
        damage: '1d4 + 9', defense: 6, weight: 0.6, value: value(150),
        weaponType: 'dagger'
    },
    {
        name: 'Permaice short sword', base: 'IceWeaponBase',
        damage: '2d5 + 6', defense: 6, weight: 1.5, value: value(300),
        weaponType: 'sword'
    },
    {
        name: 'Permaice mace', base: 'IceWeaponBase',
        damage: '2d7 + 6', weaponType: 'mace',
        defense: 6, weight: 2.5, value: value(300)
    },
    {
        name: 'Permaice staff', base: 'IceWeaponBase',
        damage: '3d5', weaponType: 'staff',
        defense: 7, weight: 3.8, value: value(300)
    },
    {
        name: 'Permaice axe', base: 'IceWeaponBase',
        damage: '3d6 + 6', defense: 7,
        weaponType: 'axe', weight: 4.5, value: value(400)
    },
    {
        name: 'Permaice long sword', base: 'IceWeaponBase',
        damage: '4d5 + 6', defense: 8, weight: 3.0, value: value(500),
        weaponType: 'sword'
    },
    {
        name: 'Permaice spear', base: 'IceWeaponBase',
        damage: '4d5 + 6', defense: 12, weight: 3.5, value: value(550),
        weaponType: 'spear'
    },
    {
        name: 'Permaice katana', base: 'IceWeaponBase',
        damage: '10d3 + 6', defense: 10, weight: 4.0, value: value(750),
        weaponType: 'sword'
    },

    // RUBY GLASS WEAPONS
    {
        name: 'RubyWeaponBase', base: 'MeleeWeaponBase',
        className: 'cell-item-ruby-glass',
        material: 'ruby glass', dontCreate: true
    },
    {
        name: 'Ruby glass dagger', base: 'RubyWeaponBase',
        damage: '2d5 + 2',
        attack: 4, defense: 1, weight: 0.1, value: value(110),
        weaponType: 'dagger'
    },
    {
        name: 'Ruby glass short sword', base: 'RubyWeaponBase',
        damage: '3d5 + 2',
        attack: 3, defense: 2, weight: 0.2, value: value(200),
        weaponType: 'sword'
    },
    {
        name: 'Ruby glass mace', base: 'RubyWeaponBase',
        damage: '3d6 + 2',
        attack: 3, defense: 3, weight: 0.3, value: value(250),
        weaponType: 'mace'
    },
    {
        name: 'Ruby glass staff', base: 'RubyWeaponBase',
        damage: '3d5', weaponType: 'staff',
        attack: 4, defense: 5,
        weight: 0.4, value: value(300)
    },
    {
        name: 'Ruby glass sword', base: 'RubyWeaponBase',
        damage: '4d5 + 2',
        attack: 5, defense: 2, weight: 0.3, value: value(350),
        weaponType: 'sword'
    },
    {
        name: 'Ruby glass spear', base: 'RubyWeaponBase',
        damage: '3d5 + 2',
        attack: 3, defense: 6, weight: 0.4, value: value(400),
        weaponType: 'spear'
    },
    {
        name: 'Ruby glass battle axe', base: 'RubyWeaponBase',
        damage: '4d6 + 3',
        attack: 6, defense: 2, weight: 0.7, value: value(800),
        weaponType: 'axe'
    },

    // MAGIC WEAPONS
    {
        name: 'RunedWeaponBase', base: 'MeleeWeaponBase',
        className: 'cell-item-magic',
        material: 'forium', dontCreate: true
    },
    {
        name: 'Runed dagger', base: 'RunedWeaponBase',
        damage: '2d5 + 2',
        attack: 2, defense: 1, weight: 0.2, value: value(100),
        weaponType: 'dagger'
    },
    {
        name: 'Runed short sword', base: 'RunedWeaponBase',
        damage: '3d5 + 2',
        attack: 3, defense: 2, weight: 0.5, value: value(300),
        weaponType: 'sword'
    },
    {
        name: 'Runed mace', base: 'RunedWeaponBase',
        damage: '3d6 + 2',
        attack: 3, defense: 2, weight: 1.0, value: value(340),
        weaponType: 'mace'
    },
    {
        name: 'Runed axe', base: 'RunedWeaponBase',
        damage: '4d5 + 2',
        attack: 4, defense: 2, weight: 1.5, value: value(400),
        weaponType: 'axe'
    },
    {
        name: 'Runed staff', base: 'RunedWeaponBase',
        damage: '4d5', weaponType: 'staff',
        attack: 2, defense: 9,
        weight: 2.0, value: value(400)
    },
    {
        name: 'Runed sword', base: 'RunedWeaponBase',
        damage: '5d5 + 2',
        attack: 5, defense: 2, weight: 1.0, value: value(500),
        weaponType: 'sword'
    },
    {
        name: 'Runed spear', base: 'RunedWeaponBase',
        damage: '4d5 + 4',
        attack: 4, defense: 8, weight: 1.4, value: value(600),
        weaponType: 'spear'
    },
    {
        name: 'Runed runesword', base: 'RunedWeaponBase',
        damage: '3d10 + 2',
        attack: 5, defense: 5, weight: 0.8, value: value(750),
        weaponType: 'sword'
    },
    {
        name: 'Wintersbane', base: 'RunedWeaponBase',
        damage: '3d8 + 4',
        attack: 6, defense: 3, weight: 1.0, value: value(1000),
        weaponType: 'sword'
    },

    // VOID WEAPONS
    {
        name: 'VoidWeaponBase', base: 'MeleeWeaponBase',
        className: 'cell-item-void',
        material: 'obsidian', dontCreate: true,
        onAttackHit: [meleeHitDamage(2, '1d8 + 1', 'VOID')],
    },
    {
        name: 'Void dagger', base: 'VoidWeaponBase',
        damage: '2d5 + 1',
        attack: 2, defense: 1, weight: 0.3, value: value(200),
        weaponType: 'dagger'
    },
    {
        name: 'Void short sword', base: 'VoidWeaponBase',
        damage: '3d5 + 1',
        attack: 3, defense: 2, weight: 0.7, value: value(300),
        weaponType: 'sword'
    },
    {
        name: 'Void mace', base: 'VoidWeaponBase',
        damage: '3d6 + 1',
        attack: 3, defense: 2, weight: 1.4, value: value(390),
        weaponType: 'mace'
    },
    {
        name: 'Void axe', base: 'VoidWeaponBase',
        damage: '4d5 + 1',
        attack: 4, defense: 2, weight: 1.9, value: value(450),
        weaponType: 'axe'
    },
    {
        name: 'Void staff', base: 'VoidWeaponBase',
        damage: '3d6', weaponType: 'staff',
        attack: 2, defense: 9,
        weight: 2.0, value: value(450)
    },
    {
        name: 'Void longsword', base: 'VoidWeaponBase',
        damage: '5d5 + 1',
        attack: 5, defense: 2, weight: 1.4, value: value(550),
        weaponType: 'sword'
    },
    {
        name: 'Void spear', base: 'VoidWeaponBase',
        damage: '4d5 + 2',
        attack: 4, defense: 8, weight: 1.8, value: value(650),
        weaponType: 'spear'
    },
    {
        name: 'Hammer of Void', base: 'VoidWeaponBase',
        damage: '5d5 + 4',
        attack: 8, defense: 8, weight: 3.7, value: value(850),
        weaponType: 'hammer',
        onAttackHit: [meleeHitDamage(2, '2d8 + 4', 'VOID')],
    },

    // ARMOUR
    {
        name: 'ArmourBase', type: 'armour', className: 'cell-item-armour',
        char: '[', dontCreate: true, attack: 0, defense: 0, protection: 0
    },
    // ARMOUR MISC
    {
        name: 'Robe', base: 'ArmourBase', className: 'cell-item-cloth',
        weight: 1.0, defense: 1, armourType: 'chest', value: value(15)
    },
    {
        name: 'Spiked boots', base: 'ArmourBase',
        weight: 0.4, defense: 1, protection: 1, armourType: 'feet',
        value: value(35)
    },
    {
        name: 'Robe of defense', base: 'ArmourBase',
        className: 'cell-item-cloth',
        weight: 0.9, defense: 4, armourType: 'chest', value: value(200)
    },
    {
        name: 'Robe of protection', base: 'ArmourBase',
        className: 'cell-item-cloth',
        weight: 0.8, protection: 4, armourType: 'chest', value: value(200)
    },
    {
        name: 'Runed robe', base: 'ArmourBase',
        className: 'cell-item-cloth',
        weight: 0.7, defense: 4, protection: 4, armourType: 'chest',
        value: value(350)
    },
    {
        name: 'Boots of flying', base: 'ArmourBase',
        weight: 0.4, defense: 1, protection: 1, armourType: 'feet',
        value: value(35),
        onEquip: [{addComp: 'Flying'}]
    },
    {
        name: 'Snow shoes', base: 'ArmourBase',
        weight: 0.4, defense: -1, protection: 0, armourType: 'feet',
        value: value(75),
        onEquip: [{addComp: 'SnowWalk'}], noRandom: true
    },
    // ARMOUR LEATHER
    {
        name: 'LeatherArmourBase', base: 'ArmourBase', dontCreate: true,
        material: 'leather', className: 'cell-item-leather'
    },
    {
        name: 'Leather helmet', base: 'LeatherArmourBase',
        weight: 0.3, defense: 1, armourType: 'head', value: value(15)
    },
    {
        name: 'Leather collar', base: 'LeatherArmourBase',
        weight: 0.2, protection: 1, armourType: 'neck', value: value(15)
    },
    {
        name: 'Leather boots', base: 'LeatherArmourBase',
        weight: 0.5, defense: 1, armourType: 'feet', value: value(15)
    },
    {
        name: 'Leather armour', base: 'LeatherArmourBase',
        weight: 2.0, defense: 2, protection: 2,
        armourType: 'chest', value: value(30)
    },
    {
        name: 'Leather shield', base: 'LeatherArmourBase',
        weight: 1.0, defense: 2, attack: -1,
        armourType: 'shield', value: value(15)
    },

    // ARMOUR IRON
    {
        name: 'ChainArmourBase', base: 'ArmourBase', dontCreate: true,
        material: 'iron', className: 'cell-item-iron'
    },
    {
        name: 'Chain helmet', base: 'ChainArmourBase',
        weight: 0.6, defense: 1, protection: 1,
        armourType: 'head', value: value(45)
    },
    {
        name: 'Chain collar', base: 'ChainArmourBase',
        weight: 0.4, protection: 2,
        armourType: 'neck', value: value(45)
    },
    {
        name: 'Chain boots', base: 'ChainArmourBase',
        weight: 1.2, defense: 1, protection: 1,
        armourType: 'feet', value: value(45)
    },
    {
        name: 'Chain armour', base: 'ChainArmourBase',
        weight: 4.0, defense: 1, protection: 3,
        armourType: 'chest', value: value(90)
    },
    {
        name: 'Chain shield', base: 'ChainArmourBase',
        weight: 2.0, defense: 3, attack: -2,
        armourType: 'shield', value: value(40)
    },
    // ARMOUR STEEL
    {
        name: 'SteelArmourBase', base: 'ArmourBase', dontCreate: true,
        material: 'steel', className: 'cell-item-steel'
    },
    {
        name: 'Steel helmet', base: 'SteelArmourBase',
        weight: 1.1, defense: 1, protection: 2,
        armourType: 'head', value: value(75)
    },
    {
        name: 'Steel collar', base: 'SteelArmourBase',
        weight: 0.8, protection: 3,
        armourType: 'neck', value: value(75)
    },
    {
        name: 'Steel boots', base: 'SteelArmourBase',
        weight: 2.0, defense: 1, protection: 2,
        armourType: 'feet', value: value(75)
    },
    {
        name: 'Steel armour', base: 'SteelArmourBase',
        weight: 8.0, defense: 0, protection: 5,
        armourType: 'chest', value: value(150)
    },
    {
        name: 'Steel shield', base: 'SteelArmourBase',
        weight: 3.0, defense: 4, attack: -2,
        armourType: 'shield', value: value(80)
    },

    // ARMOUR MITHRIL
    {
        name: 'MithrilArmourBase', base: 'ArmourBase', dontCreate: true,
        material: 'mithril', className: 'cell-item-mithril'
    },
    {
        name: 'Mithril helmet', base: 'MithrilArmourBase',
        weight: 0.8, defense: 1, protection: 2,
        armourType: 'head', value: value(120)
    },
    {
        name: 'Mithril collar', base: 'MithrilArmourBase',
        weight: 0.6, protection: 3,
        armourType: 'neck', value: value(110)
    },
    {
        name: 'Mithril boots', base: 'MithrilArmourBase',
        weight: 1.6, defense: 1, protection: 2,
        armourType: 'feet', value: value(120)
    },
    {
        name: 'Mithril armour', base: 'MithrilArmourBase',
        weight: 6.0, defense: 0, protection: 7,
        armourType: 'chest', value: value(200)
    },
    {
        name: 'Mithril shield', base: 'MithrilArmourBase',
        weight: 2.2, defense: 5, attack: -1,
        armourType: 'shield', value: value(120)
    },

    // ARMOUR ICE (protective but heavy)
    {
        name: 'IceArmourBase', base: 'ArmourBase', dontCreate: true,
        material: 'permaice', className: 'cell-item-ice'
    },
    {
        name: 'Permaice helmet', base: 'IceArmourBase',
        weight: 1.8, defense: 0, protection: 3,
        armourType: 'head', value: value(200)
    },
    {
        name: 'Permaice collar', base: 'IceArmourBase',
        weight: 1.8, defense: 0, protection: 4,
        armourType: 'neck', value: value(200)
    },
    {
        name: 'Permaice boots', base: 'IceArmourBase',
        weight: 3.6, defense: 0, protection: 3,
        armourType: 'feet', value: value(200)
    },
    {
        name: 'Permaice armour', base: 'IceArmourBase',
        weight: 12.0, defense: 0, protection: 12,
        armourType: 'chest', value: value(400)
    },
    {
        name: 'Permaice shield', base: 'IceArmourBase',
        weight: 6.0, defense: 4, attack: -3, protection: 2,
        armourType: 'shield', value: value(120)
    },

    // ARMOUR RUBY GLASS (light, flexible)
    {
        name: 'RubyArmourBase', base: 'ArmourBase', dontCreate: true,
        material: 'ruby glass', className: 'cell-item-ruby-glass'
    },
    {
        name: 'Ruby glass helmet', base: 'RubyArmourBase',
        weight: 0.1, defense: 2, protection: 2,
        armourType: 'head', value: value('ruby', 100)
    },
    {
        name: 'Ruby glass collar', base: 'RubyArmourBase',
        weight: 0.1, defense: 2, protection: 2,
        armourType: 'neck', value: value('ruby', 100)
    },
    {
        name: 'Ruby glass boots', base: 'RubyArmourBase',
        weight: 0.2, defense: 3, protection: 2,
        armourType: 'feet', value: value('ruby', 200)
    },
    {
        name: 'Ruby glass armour', base: 'RubyArmourBase',
        weight: 1.0, defense: 6, protection: 6,
        armourType: 'chest', value: value('ruby', 500)
    },
    {
        name: 'Ruby glass shield', base: 'RubyArmourBase',
        weight: 0.4, defense: 5,
        armourType: 'shield', value: value('ruby', 250)
    },

    // ARMOUR MAGIC (excellent D/P, very well rounded)
    {
        name: 'RunedArmourBase', base: 'ArmourBase', dontCreate: true,
        material: 'forium', className: 'cell-item-magic'
    },
    {
        name: 'Runed helmet', base: 'RunedArmourBase',
        weight: 0.6, defense: 3, protection: 4,
        armourType: 'head', value: value('magic', 200)
    },
    {
        name: 'Runed collar', base: 'RunedArmourBase',
        weight: 0.4, defense: 3, protection: 2,
        armourType: 'neck', value: value('magic', 200)
    },
    {
        name: 'Runed boots', base: 'RunedArmourBase',
        weight: 1.2, defense: 3, protection: 2,
        armourType: 'feet', value: value('magic', 200)
    },
    {
        name: 'Runed armour', base: 'RunedArmourBase',
        weight: 4.0, defense: 10, protection: 7,
        armourType: 'chest', value: value('magic', 500)
    },
    {
        name: 'Runed shield', base: 'RunedArmourBase',
        weight: 2.0, defense: 5, attack: -2,
        armourType: 'shield', value: value('magic', 200)
    },

    // MISSILES
    {
        name: 'MissileBase', className: 'cell-item-missile', char: '/',
        type: 'missile', dontCreate: true,
        attack: 1, damage: '1d1', range: 2, weight: 0.1
    },
    {
        name: 'Rock', base: 'MissileBase', className: 'cell-item-rock',
        char: '*', damage: '1d4', range: 5, value: value(10), weight: 0.2
    },
    {
        name: 'Large rock', base: 'MissileBase', className: 'cell-item-rock',
        char: '*', damage: '2d4 + 2', range: 2, value: value(20), weight: 1.0
    },
    {
        name: 'Huge rock', base: 'MissileBase', className: 'cell-item-rock',
        char: '*', damage: '5d4 + 2', range: 1, value: value(40), weight: 20.0
    },
    {
        name: 'Shuriken', base: 'MissileBase', className: 'cell-item-iron',
        char: '*', damage: '1d6', range: 3, value: value(20),
        weaponType: 'shuriken'
    },
    {
        name: 'Iron dart', base: 'MissileBase', className: 'cell-item-iron',
        damage: '1d6 + 1', range: 4, value: value(40), weaponType: 'dart'
    },
    {
        name: 'Steel dart', base: 'MissileBase', className: 'cell-item-steel',
        damage: '1d6 + 3', range: 4, value: value(50), weaponType: 'dart'
    },
    {
        name: 'Throwing spear', base: 'MissileBase',
        className: 'cell-item-iron',
        attack: 2, damage: '1d7 + 1', range: 3, value: value(55), weight: 0.4,
        weaponType: 'spear'
    },
    {
        name: 'Throwing axe', base: 'MissileBase', className: 'cell-item-iron',
        attack: 2, damage: '1d8 + 1', range: 3, value: value(60), weight: 0.3,
        weaponType: 'axe'
    },
    {
        name: 'Ruby glass throwing knife', base: 'MissileBase',
        className: 'cell-item-ruby-glass',
        attack: 3, damage: '1d10', range: 5, value: value(80), weight: 0.1,
        weaponType: 'dagger', material: 'ruby glass'
    },
    {
        name: 'Runed Shuriken', base: 'MissileBase',
        attack: 3, className: 'cell-item-magic', char: '*', material: 'forium',
        damage: '3d4 + 2', range: 5, value: value(100), weight: 0.1,
        weaponType: 'shuriken'
    },
    {
        name: 'Throwing axe of death', base: 'MissileBase',
        className: 'cell-item-magic',
        attack: 5, damage: '2d10 + 3', range: 3, value: value(200), weight: 0.5,
        addComp: 'Indestructible', weaponType: 'axe'
    },

    // MISSILE WEAPONS
    {
        name: 'MissileWeaponBase', dontCreate: true,
        type: 'missileweapon', fireRate: 1,
        className: 'cell-item-missileweapon',
        attack: 0, defense: 0, char: '{'
    },
    {
        name: 'Wooden bow', base: 'MissileWeaponBase',
        className: 'cell-item-wooden',
        attack: 1, range: 4, value: value(75),
        weaponType: 'bow', weight: 1.0
    },
    {
        name: 'Wooden crossbow', base: 'MissileWeaponBase',
        className: 'cell-item-wooden',
        attack: 3, range: 6, value: value(150),
        weaponType: 'crossbow', weight: 2.0
    },
    {
        name: 'Iron bow', base: 'MissileWeaponBase',
        className: 'cell-item-iron',
        attack: 1, range: 5, value: value(110),
        weaponType: 'bow', weight: 1.5
    },
    {
        name: 'Steel bow', base: 'MissileWeaponBase',
        className: 'cell-item-steel',
        attack: 2, range: 5, value: value(150),
        weaponType: 'bow', weight: 2.0
    },
    {
        name: 'Steel crossbow', base: 'MissileWeaponBase',
        className: 'cell-item-steel',
        attack: 4, range: 7, value: value(250),
        weaponType: 'crossbow', weight: 3.0
    },
    {
        name: 'Ruby glass bow', base: 'MissileWeaponBase',
        className: 'cell-item-ruby-glass',
        attack: 6, range: 6, value: value('ruby', 300),
        weaponType: 'bow', weight: 0.3
    },
    {
        name: 'Double crossbow', base: 'MissileWeaponBase',
        className: 'cell-item-steel',
        attack: 0, range: 5, value: value(400), fireRate: 2,
        weaponType: 'crossbow', weight: 4.0
    },
    {
        name: 'Bow of Defense', base: 'MissileWeaponBase',
        className: 'cell-item-magic',
        attack: 1, range: 4, defense: 6, value: value('magic', 500),
        weaponType: 'bow', weight: 1.0
    },
    {
        name: 'Rifle', base: 'MissileWeaponBase',
        className: 'cell-item-steel',
        attack: 4, range: 7, value: value(350),
        weaponType: 'rifle', weight: 4.5
    },
    {
        name: 'Dwarven rifle', base: 'MissileWeaponBase',
        className: 'cell-item-steel',
        attack: 4, range: 8, damage: '1d6', value: value(500),
        weaponType: 'rifle', weight: 5.5
    },

    // AMMO
    {
        name: 'Wooden arrow', base: 'MissileBase',
        className: 'cell-item-wooden',
        type: 'ammo', range: 1, weight: 0.1, ammoType: 'bow',
        attack: 0, damage: '1d6', value: value(10)
    },
    {
        name: 'Wooden bolt', base: 'MissileBase',
        className: 'cell-item-wooden',
        type: 'ammo', range: 1, weight: 0.1, ammoType: 'crossbow',
        attack: 1, damage: '1d8', value: value(15)
    },
    {
        name: 'Steel arrow', base: 'MissileBase',
        className: 'cell-item-steel',
        type: 'ammo', range: 1, weight: 0.1, ammoType: 'bow',
        attack: 0, damage: '1d6', value: value('steel', 20)
    },
    {
        name: 'Steel bolt', base: 'MissileBase',
        className: 'cell-item-steel',
        type: 'ammo', range: 1, weight: 0.1, ammoType: 'crossbow',
        attack: 1, damage: '1d8', value: value('steel', 25)
    },
    {
        name: 'Stone bullet', base: 'MissileBase',
        className: 'cell-item-rock',
        type: 'ammo', range: 1, weight: 0.10, ammoType: 'rifle',
        attack: -1, damage: '2d4', value: value(30)
    },
    {
        name: 'Runed arrow', base: 'MissileBase',
        className: 'cell-item-magic',
        type: 'ammo', range: 1, weight: 0.2, ammoType: 'bow',
        attack: 4, damage: '2d7', value: value('magic', 50)
    },
    {
        name: 'Ruby glass bolt', base: 'MissileBase',
        className: 'cell-item-ruby-glass',
        type: 'ammo', range: 2, weight: 0.05, ammoType: 'crossbow',
        attack: 3, damage: '2d8', value: value('ruby', 60)
    },
    {
        name: 'Steel bullet', base: 'MissileBase',
        className: 'cell-item-steel',
        type: 'ammo', range: 1, weight: 0.05, ammoType: 'rifle',
        attack: 1, damage: '3d4', value: value(50)
    },

    // POTIONS
    // Note: Each potion should define useItem method. See examples below.
    {
        name: 'PotionBase', className: 'cell-item-potion', char: '!',
        type: 'potion', dontCreate: true, weight: 0.1, addComp: 'OneShot'
    },
    {
        name: 'Healing potion', base: 'PotionBase',
        use: {heal: {hp: '3d4'}}, value: value(10)
    },
    {
        name: 'Potion of venom', base: 'PotionBase',
        use: {poison: {duration: '4d4 + 5', damage: '1d6', prob: '0.1'}},
        value: value(30)
    },
    {
        name: 'Potion of stunning', base: 'PotionBase',
        use: {stun: {duration: '2d4 + 1'}},
        value: value(50)
    },
    {
        name: 'Potion of power', base: 'PotionBase',
        use: {modifyCompValue: {name: 'SpellPower', set: 'setPP',
            get: 'getPP', value: '1d10 + 2'}
        }, value: value(50)
    },
    {
        name: 'Potion of nourishment', base: 'PotionBase',
        use: {modifyCompValue: {name: 'Hunger', set: 'setEnergy',
            get: 'getEnergy', value: '10000'}
        }, value: value(50)
    },
    {
        name: 'Potion of cure poison', base: 'PotionBase',
        use: {cure: {effect: 'poison'}}, value: value(80)
    },
    {
        name: 'Potion of eagle', base: 'PotionBase',
        use: {addComp: {name: 'Flying', duration: '10d10 + 10'}},
        value: value(80)
    },
    {
        name: 'Potion of paralysis', base: 'PotionBase',
        use: {addComp: {name: 'Paralysis', duration: '2d5'}},
        value: value(80)
    },
    {
        name: 'Potion of frost poison', base: 'PotionBase',
        use: {poison: {duration: '5d20', damage: '1d6 + 1', prob: '0.2'}},
        value: value(100)
    },
    {
        name: 'Healing elixir', base: 'PotionBase',
        use: {heal: {hp: '10d5'}}, value: value(100)
    },
    {
        name: 'Potion of spirit form', base: 'PotionBase',
        use: {addComp: {name: 'Ethereal', duration: '2d10'}},
        value: value(100)
    },
    {
        name: 'Potion of mana', base: 'PotionBase',
        use: {modifyCompValue: {name: 'SpellPower', set: 'setPP',
            get: 'getPP', value: '6d5 + 5'}
        }, value: value(150)
    },
    {
        name: 'Potion of quickness', base: 'PotionBase',
        use: {modifyStat: {value: 2, statName: 'speed'}},
        value: value(150)
    },
    {
        name: 'Potion of willpower', base: 'PotionBase',
        use: {modifyStat: {value: 1, statName: 'willpower'}},
        value: value(200)
    },
    {
        name: 'Potion of strength', base: 'PotionBase',
        use: {modifyStat: {value: 1, statName: 'strength'}},
        value: value(200)
    },
    {
        name: 'Potion of agility', base: 'PotionBase',
        use: {modifyStat: {value: 1, statName: 'agility'}},
        value: value(200)
    },
    {
        name: 'Potion of accuracy', base: 'PotionBase',
        use: {modifyStat: {value: 1, statName: 'accuracy'}},
        value: value(200)
    },
    {
        name: 'Potion of magic', base: 'PotionBase',
        use: {modifyStat: {value: 1, statName: 'magic'}},
        value: value(200)
    },
    // FOOD
    // Note: Food has energy X kcal/100g * 10. Food items can have weight,
    // but if they don't, weight is then generated randomly. Value is also per
    // 100g. Energy should be generally between 0 - 9000
    {
        name: 'FoodBase', className: 'cell-item-food', char: '%',
        weight: 0.1, type: 'food', dontCreate: true, addComp: 'OneShot'
    },
    {
        name: 'Berries', base: 'FoodBase', energy: 1700, value: value(30)
    },
    {
        name: 'Dried meat', base: 'FoodBase', energy: 1300, value: value(20)
    },
    {
        name: 'Corn', base: 'FoodBase', energy: 1600, value: value(30)
    },
    {
        name: 'Beef', base: 'FoodBase', energy: 1000, value: value(20),
        weight: 0.4
    },
    {
        name: 'Ration', base: 'FoodBase', energy: 2000, value: value(40),
        weight: 1.0
    },
    {
        name: 'Dried fruit', base: 'FoodBase', energy: 3500, value: value(50)
    },
    {
        name: 'Ghost pepper', base: 'FoodBase', energy: 100, value: value(50),
        use: {stun: {duration: '3d3'}}
    },
    {
      name: 'Whale fat', base: 'FoodBase', energy: 8000, value: value(100)
    },

    // TOOLS
    // Note: Each tool should have useItem method.
    {
        name: 'tool', type: 'tool', uses: 10, className: 'cell-item-tool',
        char: ']'
    },
    {
        name: 'trapmaking kit', base: 'tool'
    },
    {
        name: 'firemaking kit', base: 'tool',
        use: {addEntity: {entityName: 'Fire', duration: 20}}
    },
    {
        name: 'rope', base: 'tool'
    },

    // SPIRIT GEMS
    {
        name: 'SpiritGemBase', className: 'cell-item-spiritgem', char: '*',
        weight: 0.1, type: 'spiritgem', dontCreate: true
    },
    {
        name: 'Lesser spirit gem', base: 'SpiritGemBase',
        value: value('gem', 30), weight: 4.0
    },
    {
        name: 'Ordinary spirit gem', base: 'SpiritGemBase',
        value: value('gem', 60), weight: 2.5
    },
    {
        name: 'Greater spirit gem', base: 'SpiritGemBase',
        value: value('gem', 100), weight: 1.5
    },
    {
        name: 'Mystical spirit gem', base: 'SpiritGemBase',
        value: value('gem', 300), weight: 0.5
    },
    {
        name: 'Mythic spirit gem', base: 'SpiritGemBase',
        value: value('gem', 500), weight: 0.2
    },

    // RUNESTONES
    {
        name: 'RuneBase', dontCreate: true,
        type: 'rune', char: '*',
        className: 'cell-item-rune', weight: 1.0
    },
    {
        name: 'rune of healing', base: 'RuneBase',
        use: {heal: {hp: '4d4'}}, value: value('rune', 100)
    },
    {
        name: 'rune of protection', base: 'RuneBase',
        use: {addComp: {
            name: 'CombatMods', duration: '10d5 + 10',
            setters: {setProtection: '2d5'}
        }},
        value: value('rune', 100)
    },
    {
        name: 'rune of defense', base: 'RuneBase',
        use: {addComp: {
            name: 'CombatMods', duration: '10d5 + 10',
            setters: {setProtection: '2d5'}
        }},
        value: value('rune', 100)
    },
    {
        name: 'rune of attack', base: 'RuneBase',
        use: {addComp: {
            name: 'CombatMods', duration: '10d5 + 10',
            setters: {setAttack: '2d5'}
        }},
        value: value('rune', 100)
    },
    {
        name: 'rune of cold', base: 'RuneBase',
        use: {addComp: {
            name: 'Coldness', duration: '100d5 + 50'
        }},
        value: value('rune', 100)
    },
    {
        name: 'rune of fire', base: 'RuneBase',
        use: {addEntity: {entityName: 'Fire', duration: 50}},
        value: value('rune', 100)
    },
    {
        name: 'rune of force', base: 'RuneBase',
        use: {addEntity: {entityName: 'Forcefield'}},
        value: value('rune', 100)
    },
    {
        name: 'rune of skies', base: 'RuneBase',
        use: {addComp: {name: 'Flying', duration: '5d10 + 5'}},
        value: value('rune', 100)
    },
    {
        name: 'rune of ice flames', base: 'RuneBase',
        use: {addEntity: {entityName: 'Ice flame', duration: 100}},
        value: value('rune', 150)
    },
    {
        name: 'rune of tunneling', base: 'RuneBase',
        use: 'digger',
        value: value('rune', 150)
    },
    {
        name: 'rune of poison clouds', base: 'RuneBase',
        use: {addEntity: {entityName: 'Poison gas', duration: 30}},
        value: value('rune', 150)
    },
    {
        name: 'rune of venom', base: 'RuneBase',
        use: {poison: {duration: '4d6 + 5', damage: '1d8 + 2', prob: '0.2'}},
        value: value('rune', 150)
    },
    {
        name: 'rune of control', base: 'RuneBase',
        use: {addComp: {name: 'MindControl', duration: '1d4 + 2'}},
        value: value('rune', 250)
    },

    // MINERALS
    {
        name: 'MineralBase', dontCreate: true,
        type: 'mineral', char: ']'
    },
    {
        name: 'iron ore', base: 'MineralBase',
        weight: 0.3, value: value('mineral', 20),
        className: 'cell-item-iron'
    },
    {
        name: 'ruby glass ore', base: 'MineralBase',
        weight: 0.1, value: value('mineral', 100),
        className: 'cell-item-ruby-glass'
    },
    {
        name: 'emerald', base: 'MineralBase',
        weight: 0.15, value: value('mineral', 150),
        char: '*', color: {fg: 'Green', bg: 'Black'}
    },
    {
        name: 'permaice ore', base: 'MineralBase',
        weight: 0.4, value: value('mineral', 150),
        className: 'cell-item-ice'
    },
    {
        name: 'sapphire', base: 'MineralBase',
        weight: 0.15, value: value('mineral', 150),
        char: '*', color: {fg: 'Blue', bg: 'White'}
    },
    {
        name: 'forium ore', base: 'MineralBase',
        weight: 0.2, value: value('mineral', 200),
        className: 'cell-item-magic'
    },
    {
        name: 'ruby', base: 'MineralBase',
        weight: 0.2, value: value('mineral', 250),
        char: '*', className: 'cell-item-ruby-glass'
    },
    {
        name: 'ice diamond', base: 'MineralBase',
        weight: 0.3, value: value('mineral', 400),
        char: '*', className: 'cell-item-ice'
    },


    // SPECIAL ITEMS (not generated procedurally)
    {
        name: 'MagicalAmmoBase', noRandom: true,
        type: 'ammo', char: '/', addComp: 'Magical'
    },
    {
        name: 'Ice arrow', base: 'MagicalAmmoBase',
        className: 'cell-item-ice'
    },
    {
        name: 'Lightning arrow', base: 'MagicalAmmoBase',
        className: 'cell-item-lightning'
    },
    {
        name: 'Energy arrow', base: 'MagicalAmmoBase',
        className: 'cell-item-energy'
    }

    // ARTIFACT ITEMS
];

// Maps the weapon type to damage type. Default is RG.DMG.BLUNT, unless
// specified otherwise here
const dmgTypes = {
    sword: RG.DMG.SLASH,
    spear: RG.DMG.PIERCE,
    dagger: RG.DMG.SLASH,
    axe: RG.DMG.SLASH,

    dart: RG.DMG.PIERCE,
    shuriken: RG.DMG.SLASH,

    bow: RG.DMG.PIERCE,
    crossbow: RG.DMG.PIERCE,
    rifle: RG.DMG.PIERCE
};

/* Set damage types for weapons. */
Items.forEach(item => {
    if (item.weaponType) {
        if (dmgTypes.hasOwnProperty(item.weaponType)) {
            item.damageType = dmgTypes[item.weaponType];
        }
    }
    else if (item.ammoType) {
        if (dmgTypes.hasOwnProperty(item.ammoType)) {
            item.damageType = dmgTypes[item.ammoType];
        }
    }
});


module.exports = Items;

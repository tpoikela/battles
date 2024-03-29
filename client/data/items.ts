
/* eslint comma-dangle: 0 */
import RG from '../src/rg';
import {Colors} from './colors';
import {meleeHitDamage, color, resistance} from './shell-utils';
import {IAddCompObj, IRecipeEntry, TShellValue, ISuccessCheck,
    IAddEntity, IEntCallbacks} from '../src/interfaces';
import {GemItems} from './items.gems';

const scaleAll = 1.0;


/* Function to scale the item values. For fine-tuning the game balance. */
function value(type: string | number, val?): number {
    let retVal = 0;
    if (typeof type === 'string') {
        switch (type) {
            case 'leather': retVal = 1.0 * val; break;
            case 'chain': retVal = 1.0 * val; break;
            case 'steel': retVal = 1.0 * val; break;
            case 'permaice': retVal = 1.5 * val; break;
            case 'ruby': retVal = 1.5 * val; break;
            case 'magic': retVal = 1.5 * val; break;
            case 'void': retVal = 1.75 * val; break;
            case 'gem': retVal = 1.0 * val; break;
            default: retVal = val;
        }
    }
    else if (Number.isInteger(type)) {
        // If called as ie retVal(100)
        retVal = type;
    }
    return Math.floor(scaleAll * retVal);
}

interface ColorSpec {
    fg?: string;
    bg?: string;
}

interface HealUseSpec {
    hp: number | string;
}

interface CureUseSpec {
    effect: string;
}

interface PoisonUseSpec {
    duration: string;
    damage: string;
    prob: string;
}

interface ElementUseSpec {
    elementName: string;
    duration?: string;
    successMsg?: string;
    failureMsg?: string;
}

interface ISetterObj {
    [key: string]: string | number;
}


interface AddElementUseSpec extends ElementUseSpec{
    numAllowed?: number;
    successCheck?: ISuccessCheck[];
    setters?: ISetterObj | ISetterObj[];
}

type RemoveElementUseSpec = ElementUseSpec;


interface UseSpec {
    heal?: HealUseSpec;
    cure?: CureUseSpec;
    poison?: PoisonUseSpec;
    stun?: any;
    modifyCompValue?: any;
    addEntity?: IAddEntity;
    removeComp?: any;
    addComp?: any;
    modifyStat?: any;
    addElement?: AddElementUseSpec;
    removeElement?: RemoveElementUseSpec;
}

interface ObjectShell {
    addComp?: any;
    ammoType?: string;
    armourType?: string;
    attack?: TShellValue<number>;
    base?: string;
    callbacks?: IEntCallbacks;
    char?: string;
    className?: string;
    color?: ColorSpec;
    damage?: string;
    damageType?: string;
    defense?: number;
    dontCreate?: boolean;
    energy?: number;
    fireRate?: number;
    material?: string[] | string;
    name: string;
    noRandom?: boolean;
    onAttackHit?: IAddCompObj | IAddCompObj[];
    onEquip?: IAddCompObj | IAddCompObj[];
    protection?: TShellValue<number>;
    range?: number;
    rarity?: number;
    recipe?: IRecipeEntry[];
    type?: string;
    use?: (string | UseSpec | IAddCompObj) | (string | UseSpec | IAddCompObj)[];
    uses?: number;
    value?: TShellValue<number>;
    weaponType?: string;
    weight?: TShellValue<number>;
}

const charArrow = '\u27B9';
const charRune = '\u2D45';

//----------------------------
// ITEM LIST
//----------------------------

const Items: ObjectShell[] = [
    {
        name: 'Gold coin', className: 'cell-item-gold-coin',
        char: '$', material: 'gold',
        type: 'goldcoin', value: 1, weight: RG.GOLD_COIN_WEIGHT
    },
    //------------------------------------------------------------
    // MELEE WEAPONS
    //------------------------------------------------------------
    {
        name: 'MeleeWeaponBase', className: 'cell-item-melee-weapon',
        char: '(',
        material: RG.MATERIAL.IRON,
        type: 'weapon',
        range: 1, attack: 0, defense: 0,
        dontCreate: true // Base class only
    },
    {
        name: 'Dagger', base: 'MeleeWeaponBase',
        material: RG.MATERIAL.IRON,
        damage: '1d4', weaponType: 'dagger',
        weight: 0.2, value: value(5)
    },
    {
        name: 'Bayonette', base: 'MeleeWeaponBase',
        material: RG.MATERIAL.IRON,
        damage: '1d5', weaponType: 'dagger',
        weight: 0.1, value: value(10)
        // TODO combine with rifle
    },
    {
        name: 'Short sword', base: 'MeleeWeaponBase',
        material: RG.MATERIAL.IRON,
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
        material: RG.MATERIAL.IRON,
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
        material: RG.MATERIAL.IRON,
        damage: '2d4 + 1', attack: 2, defense: 1,
        weaponType: 'sword',
        weight: 0.6, value: value(30)
    },
    {
        name: 'Mace', base: 'MeleeWeaponBase',
        material: RG.MATERIAL.IRON,
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
        material: RG.MATERIAL.STEEL,
        damage: '1d8', attack: 2, defense: 2,
        weaponType: 'sword',
        weight: 0.8, value: value(75)
    },
    {
        name: 'Morningstar', base: 'MeleeWeaponBase',
        material: RG.MATERIAL.IRON,
        damage: '1d9 + 2', attack: 2, defense: 3,
        weaponType: 'mace',
        weight: 0.7, value: value(75)
    },
    {
        name: 'Battle axe', base: 'MeleeWeaponBase',
        material: RG.MATERIAL.IRON,
        damage: '2d6 + 2', attack: 2, defense: 1,
        weaponType: 'axe',
        weight: 2.5, value: value(85)
    },
    {
        name: 'Warhammer', base: 'MeleeWeaponBase',
        material: RG.MATERIAL.IRON,
        damage: '2d6 + 5', attack: 3, defense: 1,
        weaponType: 'hammer',
        weight: 4.5, value: value(100)
    },
    {
        name: 'Dwarven pick-axe', base: 'MeleeWeaponBase',
        damage: '1d12', attack: 2, defense: 2,
        color: Colors.race.dwarven,
        weaponType: 'axe',
        weight: 3.5, value: value(120), use: 'digger'
    },
    {
        name: 'Great battle axe', base: 'MeleeWeaponBase',
        material: 'steel',
        damage: '2d8 + 4', attack: 3, defense: 0,
        weaponType: 'axe',
        weight: 4.5, value: value(130)
    },

    // MITHRIL WEAPONS
    {
        name: 'MithrilWeaponBase', base: 'MeleeWeaponBase',
        className: 'cell-item-mithril',
        material: RG.MATERIAL.MITHRIL, dontCreate: true,
        attack: 1, rarity: 2,
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
        name: 'Mithril hammer', base: 'MithrilWeaponBase',
        attack: 5,
        damage: '1d15 + 6', defense: 1,
        weaponType: 'axe', weight: 2.4, value: value(250)
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
    {
        name: 'Mithril pick-axe',  base: 'MithrilWeaponBase',
        damage: '1d15', attack: 3, defense: 2,
        weaponType: 'axe',
        weight: 1.2, value: value(150), use: 'digger'
    },

    // ICE WEAPONS (not easy to hit with, do lots of damage)
    {
        name: 'IceWeaponBase', base: 'MeleeWeaponBase',
        className: 'cell-item-ice',
        material: RG.MATERIAL.PERMAICE, dontCreate: true,
        attack: 1, rarity: 5,
    },
    {
        name: 'Permaice dagger', base: 'IceWeaponBase',
        damage: '1d4 + 9', defense: 6, weight: 0.6, value: value(150),
        weaponType: 'dagger'
    },
    {
        name: 'Permaice short sword', base: 'IceWeaponBase',
        damage: '2d5 + 9', defense: 6, weight: 1.5, value: value(300),
        weaponType: 'sword'
    },
    {
        name: 'Permaice mace', base: 'IceWeaponBase',
        damage: '2d7 + 9', weaponType: 'mace',
        defense: 6, weight: 2.5, value: value(300)
    },
    {
        name: 'Permaice staff', base: 'IceWeaponBase',
        damage: '3d5 + 9', weaponType: 'staff',
        defense: 7, weight: 3.8, value: value(300)
    },
    {
        name: 'Permaice axe', base: 'IceWeaponBase',
        damage: '3d6 + 9', defense: 7,
        weaponType: 'axe', weight: 4.5, value: value(400)
    },
    {
        name: 'Permaice hammer', base: 'IceWeaponBase',
        damage: '3d6 + 12', defense: 7,
        weaponType: 'hammer', weight: 6.5, value: value(440)
    },
    {
        name: 'Permaice long sword', base: 'IceWeaponBase',
        damage: '4d5 + 9', defense: 8, weight: 3.0, value: value(500),
        weaponType: 'sword'
    },
    {
        name: 'Permaice spear', base: 'IceWeaponBase',
        damage: '4d5 + 9', defense: 12, weight: 3.5, value: value(550),
        weaponType: 'spear'
    },
    {
        name: 'Permaice katana', base: 'IceWeaponBase',
        damage: '10d3 + 10', defense: 10, weight: 4.0, value: value(750),
        weaponType: 'sword'
    },
    {
        name: 'Permaice pick-axe',  base: 'IceWeaponBase',
        damage: '3d6 + 6', defense: 6,
        weaponType: 'axe',
        weight: 3.6, value: value(300), use: 'digger'
    },

    // RUBY GLASS WEAPONS
    {
        name: 'RubyWeaponBase', base: 'MeleeWeaponBase',
        className: 'cell-item-ruby-glass',
        material: RG.MATERIAL.RUBY_GLASS, dontCreate: true,
        rarity: 4,
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
        name: 'Ruby glass hammer', base: 'RubyWeaponBase',
        damage: '3d6 + 4',
        attack: 4, defense: 2, weight: 0.6, value: value(250),
        weaponType: 'hammer'
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
    {
        name: 'Ruby glass pick-axe',  base: 'RubyWeaponBase',
        damage: '3d5', attack: 5, defense: 2,
        weaponType: 'axe',
        weight: 1.0, value: value(300), use: 'digger'
    },

    // RUNED WEAPONS
    {
        name: 'RunedWeaponBase', base: 'MeleeWeaponBase',
        className: 'cell-item-magic',
        material: RG.MATERIAL.FORIUM, dontCreate: true,
        rarity: 6,
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
        name: 'Runed hammer', base: 'RunedWeaponBase',
        damage: '4d5 + 4',
        attack: 5, defense: 1, weight: 2.7, value: value(400),
        weaponType: 'hammer'
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
        name: 'Runed katana', base: 'RunedWeaponBase',
        damage: '3d12 + 2',
        attack: 5, defense: 5, weight: 0.8, value: value(750),
        weaponType: 'sword'
    },
    {
        name: 'Wintersbane', base: 'RunedWeaponBase',
        damage: '3d10 + 4',
        attack: 6, defense: 3, weight: 1.0, value: value(1000),
        weaponType: 'sword',
        // onEquip: {addComp: resistance('ICE', 'MEDIUM')}
    },
    {
        name: 'Rune-covered pick-axe',  base: 'RunedWeaponBase',
        damage: '4d5', attack: 5, defense: 2,
        weaponType: 'axe',
        weight: 2.5, value: value(300), use: 'digger'
    },

    // VOID WEAPONS
    {
        name: 'VoidWeaponBase', base: 'MeleeWeaponBase',
        className: 'cell-item-void',
        material: RG.MATERIAL.NETHERIUM, dontCreate: true,
        onAttackHit: [meleeHitDamage(2, '1d8 + 1', 'VOID')],
        rarity: 8,
    },
    {
        name: 'Void dagger', base: 'VoidWeaponBase',
        damage: '2d5 + 1',
        attack: 2, defense: 1, weight: 0.3, value: value(200),
        weaponType: 'dagger'
    },
    {
        name: 'Void short sword', base: 'VoidWeaponBase',
        damage: '3d5 + 2',
        attack: 3, defense: 2, weight: 0.7, value: value(300),
        weaponType: 'sword'
    },
    {
        name: 'Void mace', base: 'VoidWeaponBase',
        damage: '3d6 + 2',
        attack: 3, defense: 2, weight: 1.4, value: value(390),
        weaponType: 'mace'
    },
    {
        name: 'Void axe', base: 'VoidWeaponBase',
        damage: '4d5 + 2',
        attack: 4, defense: 2, weight: 1.9, value: value(450),
        weaponType: 'axe'
    },
    {
        name: 'Void staff', base: 'VoidWeaponBase',
        damage: '3d6 + 2', weaponType: 'staff',
        attack: 2, defense: 9,
        weight: 2.0, value: value(450)
    },
    {
        name: 'Void longsword', base: 'VoidWeaponBase',
        damage: '5d5 + 2',
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
        damage: '5d5 + 8',
        attack: 8, defense: 8, weight: 3.7, value: value(850),
        weaponType: 'hammer',
        onAttackHit: [meleeHitDamage(2, '2d8 + 4', 'VOID')],
    },
    {
        name: 'Void pick-axe',  base: 'VoidWeaponBase',
        damage: '4d5', attack: 5, defense: 2,
        weaponType: 'axe',
        weight: 2.3, value: value(500), use: 'digger'
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
        weight: 0.9, defense: 4, armourType: 'chest', value: value(200),
        rarity: 3,
    },
    {
        name: 'Robe of protection', base: 'ArmourBase',
        className: 'cell-item-cloth',
        weight: 0.8, protection: 4, armourType: 'chest', value: value(200),
        rarity: 3,
    },
    {
        name: 'Runed robe', base: 'ArmourBase',
        className: 'cell-item-cloth',
        weight: 0.7, defense: 4, protection: 4, armourType: 'chest',
        value: value(350),
        rarity: 3,
    },
    {
        name: 'Boots of flying', base: 'ArmourBase',
        weight: 0.4, defense: 1, protection: 1, armourType: 'feet',
        value: value(350),
        onEquip: [{addComp: 'Flying'}],
        rarity: 3,
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
        material: 'leather', className: 'cell-item-leather',
        rarity: 1,
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
        name: 'Leather leggings', base: 'LeatherArmourBase',
        weight: 1.0, defense: 1, protection: 2,
        armourType: 'legs', value: value(30)
    },
    {
        name: 'Leather armour', base: 'LeatherArmourBase',
        weight: 2.0, defense: 2, protection: 3,
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
        material: 'iron', className: 'cell-item-iron',
        rarity: 2,
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
        name: 'Chain leggings', base: 'ChainArmourBase',
        weight: 2.0, defense: 1, protection: 3,
        armourType: 'legs', value: value(75)
    },
    {
        name: 'Chain armour', base: 'ChainArmourBase',
        weight: 4.0, defense: 1, protection: 4,
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
        material: 'steel', className: 'cell-item-steel',
        rarity: 2,
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
        name: 'Steel leggings', base: 'SteelArmourBase',
        weight: 4.0, defense: 0, protection: 3,
        armourType: 'legs', value: value(100)
    },
    {
        name: 'Steel armour', base: 'SteelArmourBase',
        weight: 8.0, defense: 0, protection: 6,
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
        material: 'mithril', className: 'cell-item-mithril',
        rarity: 3,
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
        name: 'Mithril leggings', base: 'MithrilArmourBase',
        weight: 3.0, defense: 0, protection: 4,
        armourType: 'legs', value: value(150)
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
        material: 'permaice', className: 'cell-item-ice',
        rarity: 5,
    },
    {
        name: 'Permaice helmet', base: 'IceArmourBase',
        weight: 1.8, defense: 0, protection: 4,
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
        name: 'Permaice leggings', base: 'IceArmourBase',
        weight: 6.0, defense: 0, protection: 8,
        armourType: 'legs', value: value(300)
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
        material: 'ruby glass', className: 'cell-item-ruby-glass',
        rarity: 5,
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
        name: 'Ruby glass leggings', base: 'RubyArmourBase',
        weight: 1.0, defense: 6, protection: 5,
        armourType: 'legs', value: value('ruby', 350)
    },
    {
        name: 'Ruby glass armour', base: 'RubyArmourBase',
        weight: 1.0, defense: 7, protection: 8,
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
        material: 'forium', className: 'cell-item-magic',
        rarity: 7,
    },
    {
        name: 'Runed helmet', base: 'RunedArmourBase',
        weight: 0.6, defense: 3, protection: 4,
        armourType: 'head', value: value('magic', 200)
    },
    {
        name: 'Runed cloak', base: 'RunedArmourBase',
        weight: 0.2, defense: 2, protection: 2,
        armourType: 'cloak', value: value('magic', 200)
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
        name: 'Runed leggings', base: 'RunedArmourBase',
        weight: 2.5, defense: 6, protection: 6,
        armourType: 'chest', value: value('magic', 400)
    },
    {
        name: 'Runed armour', base: 'RunedArmourBase',
        weight: 4.0, defense: 12, protection: 8,
        armourType: 'chest', value: value('magic', 500)
    },
    {
        name: 'Runed shield', base: 'RunedArmourBase',
        weight: 2.0, defense: 7, attack: -2,
        armourType: 'shield', value: value('magic', 200)
    },

    // MISSILES
    {
        name: 'MissileBase', className: 'cell-item-missile', char: charArrow,
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
        weaponType: 'dagger', material: 'ruby glass',
        rarity: 4,
    },
    {
        name: 'Runed Shuriken', base: 'MissileBase',
        attack: 3, className: 'cell-item-magic', char: '*', material: 'forium',
        damage: '3d4 + 2', range: 5, value: value(100), weight: 0.1,
        weaponType: 'shuriken',
        rarity: 5,
    },
    {
        name: 'Throwing axe of death', base: 'MissileBase',
        className: 'cell-item-magic',
        attack: 5, damage: '2d10 + 3', range: 3, value: value(200), weight: 0.5,
        addComp: 'Indestructible', weaponType: 'axe',
        rarity: 6,
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
        weaponType: 'bow', weight: 0.3,
        rarity: 4,
    },
    {
        name: 'Double crossbow', base: 'MissileWeaponBase',
        className: 'cell-item-steel',
        attack: 0, range: 5, value: value(400), fireRate: 2,
        weaponType: 'crossbow', weight: 4.0,
        rarity: 4,
    },
    {
        name: 'Bow of Defense', base: 'MissileWeaponBase',
        className: 'cell-item-magic',
        attack: 1, range: 4, defense: 6, value: value('magic', 500),
        weaponType: 'bow', weight: 1.0,
        rarity: 4,
    },
    {
        name: 'Rifle', base: 'MissileWeaponBase',
        className: 'cell-item-steel',
        attack: 4, range: 7, value: value(350),
        weaponType: 'rifle', weight: 4.5,
        rarity: 4,
    },
    {
        name: 'Dwarven rifle', base: 'MissileWeaponBase',
        className: 'cell-item-steel',
        attack: 4, range: 8, damage: '1d6', value: value(500),
        weaponType: 'rifle', weight: 5.5,
        rarity: 5,
    },

    // AMMO
    {
        name: 'Wooden arrow', base: 'MissileBase',
        className: 'cell-item-wooden',
        type: 'ammo', range: 1, weight: 0.1, ammoType: 'bow',
        attack: 0, damage: '1d6', value: value(5)
    },
    {
        name: 'Wooden bolt', base: 'MissileBase',
        className: 'cell-item-wooden',
        type: 'ammo', range: 1, weight: 0.1, ammoType: 'crossbow',
        attack: 1, damage: '1d8', value: value(7)
    },
    {
        name: 'Steel arrow', base: 'MissileBase',
        className: 'cell-item-steel',
        type: 'ammo', range: 1, weight: 0.1, ammoType: 'bow',
        attack: 0, damage: '1d6 + 2', value: value('steel', 8)
    },
    {
        name: 'Steel bolt', base: 'MissileBase',
        className: 'cell-item-steel',
        type: 'ammo', range: 1, weight: 0.1, ammoType: 'crossbow',
        attack: 1, damage: '1d8 + 2', value: value('steel', 14)
    },
    {
        name: 'Stone bullet', base: 'MissileBase',
        className: 'cell-item-rock',
        type: 'ammo', range: 1, weight: 0.10, ammoType: 'rifle',
        attack: -1, damage: '2d4', value: value(10),
        rarity: 2,
    },
    {
        name: 'Arrow of targeting', base: 'MissileBase',
        className: 'cell-item-steel',
        type: 'ammo', range: 1, weight: 0.1, ammoType: 'bow',
        attack: 10, damage: '1d6 + 3', value: value('steel', 20),
        rarity: 3,
    },
    {
        name: 'Runed arrow', base: 'MissileBase',
        className: 'cell-item-magic',
        type: 'ammo', range: 1, weight: 0.2, ammoType: 'bow',
        attack: 4, damage: '2d7', value: value('magic', 25),
        rarity: 5,
    },
    {
        name: 'Ruby glass bolt', base: 'MissileBase',
        className: 'cell-item-ruby-glass',
        type: 'ammo', range: 2, weight: 0.05, ammoType: 'crossbow',
        attack: 3, damage: '2d8', value: value('ruby', 30),
        rarity: 4,
    },
    {
        name: 'Steel bullet', base: 'MissileBase',
        className: 'cell-item-steel',
        type: 'ammo', range: 1, weight: 0.05, ammoType: 'rifle',
        attack: 1, damage: '3d4', value: value(20),
        rarity: 4,
    },
    {
        name: 'Void bolt', base: 'MissileBase',
        className: 'cell-item-void',
        type: 'ammo', range: 1, weight: 0.1, ammoType: 'crossbow',
        attack: 5, damage: '4d4 + 4', value: value(60),
        rarity: 7,
    },

    // POTIONS
    // Note: Each potion should define useItem method. See examples below.
    {
        name: 'PotionBase', char: '!',
        // className: 'cell-item-potion',
        type: 'potion', dontCreate: true, weight: 0.1,
        addComp: 'OneShot', // Item is destroyed after use,
        color: color('random', 'black'), rarity: 1,
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
        name: 'Potion of inner heat', base: 'PotionBase',
        use: {removeComp: {name: 'Coldness', all: true}},
        value: value(50)
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
        name: 'Potion of deflection', base: 'PotionBase',
        use: {addComp: {name: 'Deflection', duration: '10d10 + 10'}},
        value: value(80)
    },
    {
        name: 'Potion of eagle eye', base: 'PotionBase',
        use: {addComp: {name: 'EagleEye', duration: '10d10 + 10'}},
        value: value(80)
    },
    {
        name: 'Potion of first strike', base: 'PotionBase',
        use: {addComp: {name: 'FirstStrike', duration: '10d10 + 10'}},
        value: value(80)
    },
    {
        name: 'Potion of paralysis', base: 'PotionBase',
        use: {addComp: {name: 'Paralysis', duration: '2d5'}},
        value: value(80)
    },
    {
        name: 'Potion of blindness', base: 'PotionBase',
        use: {addComp: {name: 'Blindness', duration: '2d5'}},
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
        name: 'Potion of charm', base: 'PotionBase',
        use: {addComp: {name: 'Charm', duration: '2d10'}},
        value: value(120)
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
        name: 'Potion of greater quickness', base: 'PotionBase',
        use: {modifyStat: {value: 4, statName: 'speed'}},
        value: value(350)
    },

    // FOOD
    // Note: Food has energy X kcal/100g * 10. Food items can have weight,
    // but if they don't, weight is then generated randomly. Value is also per
    // 100g. Energy should be generally between 0 - 9000
    {
        name: 'FoodBase', char: '%',
        weight: 0.1, type: 'food', dontCreate: true,
        addComp: 'OneShot', // Item is destroyed after use
        rarity: 1,
    },
    {
        name: 'Wheat', base: 'FoodBase', energy: 100, value: value(10),
        color: color('ForestGreen', 'Coral')
    },
    {
        name: 'Rye', base: 'FoodBase', energy: 100, value: value(10),
        color: color('ForestGreen', 'Coral')
    },
    {
        name: 'Barley', base: 'FoodBase', energy: 100, value: value(10),
        color: color('ForestGreen', 'Coral')
    },
    {
        name: 'Oat', base: 'FoodBase', energy: 100, value: value(10),
        color: color('ForestGreen', 'Coral')
    },
    {
        name: 'Carrots', base: 'FoodBase', energy: 500, value: value(10),
        color: color('ForestGreen', 'Coral')
    },
    {
        name: 'Milk', base: 'FoodBase', energy: 500, value: value(10),
        color: color('Blue', 'White')
    },
    {
        name: 'Cabbage', base: 'FoodBase', energy: 700, value: value(10),
        color: color('ForestGreen', 'Chartreuse')
    },
    {
        name: 'Turnip', base: 'FoodBase', energy: 700, value: value(10),
        color: color('ForestGreen', 'Khaki')
    },
    {
        name: 'Blueberries', base: 'FoodBase', energy: 1700, value: value(30),
        color: color('FloralWhite', 'DarkBlue')
    },
    {
        name: 'Lingonberries', base: 'FoodBase', energy: 1700, value: value(30),
        color: color('FloralWhite', 'DarkRed')
    },
    {
        name: 'Chicken egg', base: 'FoodBase', energy: 1300, value: value(25)
    },
    {
        name: 'Poultry', base: 'FoodBase', energy: 800, value: value(25),
        weight: 0.4, color: color('red', 'white')
    },
    {
        name: 'Potatoes', base: 'FoodBase', energy: 1200, value: value(20),
        color: color('DarkGray', 'Sienna')
    },
    {
        name: 'Dried meat', base: 'FoodBase', energy: 1300, value: value(20),
        color: color('white', 'red')
    },
    {
        name: 'Corn', base: 'FoodBase', energy: 1600, value: value(30),
        color: color('ForestGreen', 'Yellow')
    },
    {
        name: 'Pork', base: 'FoodBase', energy: 1000, value: value(30),
        weight: 0.4, color: color('white', 'pink')
    },
    {
        name: 'Beef', base: 'FoodBase', energy: 1000, value: value(30),
        weight: 0.4, color: color('white', 'Brown')
    },
    {
        name: 'Chunk of meat', base: 'FoodBase', energy: 1000, value: value(20),
        weight: 0.4, color: color('white', 'red')
    },
    {
        name: 'Reindeer meat', base: 'FoodBase', energy: 2000, value: value(35),
        weight: 0.3, color: color('white', 'red')
    },
    {
        name: 'Elk meat', base: 'FoodBase', energy: 2500, value: value(40),
        weight: 0.3, color: color('white', 'darkred')
    },
    {
        name: 'Bear meat', base: 'FoodBase', energy: 2500, value: value(35),
        weight: 0.3, color: color('pink', 'brown')
    },
    {
        name: 'Wheat bread', base: 'FoodBase', energy: 2000, value: value(30),
        recipe: [{count: 3, name: 'Wheat'}]
    },
    {
        name: 'Rye bread', base: 'FoodBase', energy: 2000, value: value(30),
        recipe: [{count: 3, name: 'Rye'}]
    },
    {
        name: 'Barley bread', base: 'FoodBase', energy: 2000, value: value(30),
        recipe: [{count: 3, name: 'Barley'}]
    },
    {
        name: 'Oats', base: 'FoodBase', energy: 2800, value: value(30),
        recipe: [{count: 4, name: 'Oat'}]
    },
    {
        name: 'Ration', base: 'FoodBase', energy: 2000, value: value(40),
        weight: 1.0
    },
    {
        name: 'Dried fruit', base: 'FoodBase', energy: 3500, value: value(50)
    },
    {
        name: 'Cloudberries', base: 'FoodBase', energy: 1500, value: value(50),
        color: color('Orange', 'DarkGreen')
    },
    {
        name: 'Seeds and nuts', base: 'FoodBase', energy: 5000, value: value(50),
        color: color('GoldenRod', 'Sienna')
    },
    {
        name: 'Ghost pepper', base: 'FoodBase', energy: 100, value: value(50),
        use: {stun: {duration: '3d3'}},
        color: color('OrangeRed', 'DarkGreen')

    },
    {
        name: 'Wraith pepper', base: 'FoodBase', energy: 100, value: value(100),
        use: {stun: {duration: '3d10'}},
        color: color('Cyan', 'Black')

    },
    {
        name: 'Whale fat', base: 'FoodBase', energy: 8000, value: value(100)
    },

    //------------
    // TOOLS
    //------------
    {
        name: 'tool', type: 'tool', uses: 10, className: 'cell-item-tool',
        char: ']', dontCreate: true, rarity: 1,
    },
    {
        name: 'shovel', base: 'tool',
        use: {addElement: {
            elementName: 'Hole', numAllowed: 1,
            successMsg: 'You dig a hole to the ground',
            successCheck: [{elements: {has: 'Diggable'}}],
            failureMsg: 'You fail to dig a hole there',
        }},
        value: 100
    },
    {
        name: 'machete', base: 'tool', char: '(',
        use: {removeElement: {
            elementName: 'web',
            successMsg: 'You remove the webs using machete',
            failureMsg: 'You do not manage to remove any webs',
        }}, noRandom: true
    },
    {
        name: 'trapmaking kit', base: 'tool'
    },
    {
        name: 'firemaking kit', base: 'tool',
        className: 'cell-item-fire',
        use: {addEntity: {entityName: 'Fire', duration: 20}},
        value: 100
    },
    {
        name: 'hoe', base: 'tool',
        className: 'cell-item-iron',
        use: {addElement: {
            elementName: 'TilledSoil', duration: '100',
            successMsg: 'You till the soil with hoe.',
            successCheck: [
                {elements: {has: 'Tillable'}},
            ],
            failureMsg: 'This location cannot be tilled.',
        }},
        value: 30
    },
    {
        name: 'small bomb', base: 'tool', weight: 1.0,
        className: 'cell-item-iron',
        addComp: 'OneShot',
        callbacks: {
            onAddExplosion: {
                addComp: [
                    {comp: 'Explosion', area: '3x3',
                        func: {setDamage: '3d12'},
                        applyToAllTargets: true,
                        anim: {className: 'cell-item-fire'},
                    }
                ],
                removeEntity: {target: 'self'},
            }
        },
        use: {
            addEntity: {
                entityName: 'armed small bomb', duration: 5,
            }
        },
        value: 50,
    },
    {
        name: 'large bomb', base: 'tool', weight: 2.0,
        className: 'cell-item-iron',
        addComp: 'OneShot',
        callbacks: {
            onAddExplosion: {
                addComp: [
                    {comp: 'Explosion', area: '5x5',
                        func: {setDamage: '5d12'},
                        applyToAllTargets: true,
                        anim: {className: 'cell-item-fire'},
                    }
                ],
                removeEntity: {target: 'self'},
            }
        },
        use: {
            addEntity: {
                entityName: 'armed large bomb', duration: 5,
            }
        },
        value: 100,
    },
    {
        name: 'carpentry kit', base: 'tool', weight: 1.5,
        className: 'cell-item-wooden',
        use: {
            addComp: {
                name: 'BuildEvent',
                targetType: ['cell'],
                addOnUser: true, // Can't addComp to cell
                setters: {
                    setBuildType: 'wood',
                    setTarget: '$$target',
                    $chooseArg: {
                        func: 'setElem',
                        args: ['wooden door', 'wallwooden', 'floorwooden'],
                        menuMsg: 'Select which element to build:',
                    },
                }
            }
        }
    },
    {
        name: 'wheat seeds', base: 'tool',
        addComp: 'OneShot',
        use: SowSeeds('Wheat', 2 * 6),
        value: 5,
        weight: 0.05,
    },
    {
        name: 'oat seeds', base: 'tool',
        addComp: 'OneShot',
        use: SowSeeds('Oat', 2 * 6),
        value: 5,
        weight: 0.05,
    },
    {
        name: 'barley seeds', base: 'tool',
        addComp: 'OneShot',
        use: SowSeeds('Oat', 2 * 6),
        value: 5,
        weight: 0.05,
    },
    {
        name: 'rye seeds', base: 'tool',
        addComp: 'OneShot',
        use: SowSeeds('Oat', 2 * 6),
        value: 5,
        weight: 0.05,
    },
    {
        name: 'Turnip seeds', base: 'tool',
        color: color('ForestGreen', 'Khaki'),
        addComp: 'OneShot',
        use: SowSeeds('Turnip', 3 * 6),
        value: 5,
        weight: 0.05,
    },
    {
        name: 'Carrot seeds', base: 'tool',
        color: color('ForestGreen', 'Coral'),
        addComp: 'OneShot',
        use: SowSeeds('Carrots', 3 * 6),
        value: 5,
        weight: 0.05,
    },
    {
        name: 'Cabbage seeds', base: 'tool',
        color: color('ForestGreen', 'Chartreuse'),
        addComp: 'OneShot',
        use: SowSeeds('Cabbage', 3 * 6),
        value: 5,
        weight: 0.05,
    },
    {
        name: 'Potato seeds', base: 'tool',
        color: color('DarkGray', 'Sienna'),
        addComp: 'OneShot',
        use: SowSeeds('Potatoes', 3 * 6),
        value: 7,
        weight: 0.05,
    },
    {
        name: 'Corn seeds', base: 'tool',
        color: color('ForestGreen', 'Yellow'),
        addComp: 'OneShot',
        use: SowSeeds('Corn', 3 * 6),
        value: 7,
        weight: 0.05,
    },
    {
        name: 'Blueberry seeds', base: 'tool',
        color: color('FloralWhite', 'DarkBlue'),
        addComp: 'OneShot',
        use: SowSeeds('Blueberries', 4 * 6),
        value: 10,
        weight: 0.05,
    },
    {
        name: 'Lingonberry seeds', base: 'tool',
        color: color('FloralWhite', 'DarkRed'),
        addComp: 'OneShot',
        use: SowSeeds('Lingonberries', 4 * 6),
        value: 10,
        weight: 0.05,
    },
    {
        name: 'Ghost pepper seeds', base: 'tool',
        color: color('OrangeRed', 'DarkGreen'),
        addComp: 'OneShot',
        use: SowSeeds('Ghost pepper', 5 * 6),
        value: 20,
    },
    {
        name: 'Wraith pepper seeds', base: 'tool',
        color: color('Cyan', 'Black'),
        addComp: 'OneShot',
        use: SowSeeds('Wraith pepper', 6 * 6),
        value: 40,
        weight: 0.05,
    },


    {
        name: 'repair tool kit', base: 'tool',
        use: {removeComp: {name: 'Broken'}}, noRandom: true
    },
    {
        name: 'rope', base: 'tool',
        className: 'cell-item-wooden', weight: 0.5,
        value: 30,
    },
    {
        name: 'piece of wood', base: 'tool', value: 5,
        className: 'cell-item-wooden', weight: 0.2,
        noRandom: true,
    },
    {
        name: 'piece of grass', base: 'tool', value: 2,
        className: 'cell-item-wooden', char: ']', weight: 0.1,
        noRandom: true,
    },
    {
        name: 'piece of stone', base: 'tool', value: 3,
        className: 'cell-item-stone', char: ']', weight: 0.25,
        noRandom: true,
    },
    {
        name: 'iron ingot', base: 'tool', value: 15,
        className: 'cell-item-iron', char: ']', weight: 0.5,
        recipe: [{count: 3, name: 'iron ore'}]
    },
    {
        name: 'steel ingot', base: 'tool', value: 25,
        className: 'cell-item-steel', char: ']', weight: 0.6,
        recipe: [{count: 4, name: 'iron ore'}]
    },
    {
        name: 'mithril ingot', base: 'tool', value: 35,
        className: 'cell-item-mithril', char: ']', weight: 0.45,
        recipe: [{count: 3, name: 'mithril ore'}],
        rarity: 2,
    },
    {
        name: 'permaice ingot', base: 'tool', value: 70,
        className: 'cell-item-ice', char: ']', weight: 1.00,
        recipe: [{count: 3, name: 'permaice ore'}],
        rarity: 4,
    },
    {
        name: 'ruby class ingot', base: 'tool', value: 70,
        className: 'cell-item-ruby-glass', char: ']', weight: 0.20,
        recipe: [{count: 3, name: 'ruby glass ore'}],
        rarity: 4,
    },
    {
        name: 'forium ingot', base: 'tool', value: 75,
        className: 'cell-item-magic', char: ']', weight: 0.40,
        recipe: [{count: 3, name: 'forium ore'}],
        rarity: 5,
    },
    {
        name: 'netherium ingot', base: 'tool', value: 100,
        className: 'cell-item-void', char: ']', weight: 0.70,
        recipe: [{count: 3, name: 'netherium ore'}],
        rarity: 6,
    },

    // SPIRIT GEMS
    {
        name: 'SpiritGemBase', char: ',',
        weight: 0.1, type: 'spiritgem', dontCreate: true,
        color: color('random', 'MediumPurple'),
        rarity: 1,
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
        value: value('gem', 100), weight: 1.5,
        rarity: 2,
    },
    {
        name: 'Glowing spirit gem', base: 'SpiritGemBase',
        value: value('gem', 200), weight: 1.0,
        rarity: 3,
    },
    {
        name: 'Mystical spirit gem', base: 'SpiritGemBase',
        value: value('gem', 300), weight: 0.5,
        rarity: 5,
    },
    {
        name: 'Mythic spirit gem', base: 'SpiritGemBase',
        value: value('gem', 500), weight: 0.2,
        rarity: 7,
    },

    // RUNESTONES
    {
        name: 'RuneBase', dontCreate: true,
        type: 'rune', char: charRune,
        color: color('random', 'black'),
        weight: 1.0, rarity: 1,
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
        name: 'rune of webs', base: 'RuneBase',
        use: {addElement: {elementName: 'Web', numAllowed: 1}},
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
        name: 'rune of traps', base: 'RuneBase',
        use: {addElement: {elementName: 'Hole', numAllowed: 1}},
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
        name: 'copper ore', base: 'MineralBase',
        weight: 0.2, value: value('mineral', 20),
        className: 'cell-item-copper', rarity: 1,
    },
    {
        name: 'iron ore', base: 'MineralBase',
        weight: 0.3, value: value('mineral', 20),
        className: 'cell-item-iron'
    },
    {
        name: 'lapis lazuli', base: 'MineralBase',
        weight: 0.35, value: value('mineral', 40),
        char: '*', color: {fg: 'LightSkyBlue', bg: 'DarkSlateGrey'}
    },
    {
        name: 'amethyst', base: 'MineralBase',
        weight: 0.25, value: value('mineral', 50),
        char: '*', color: {fg: 'Orchid', bg: 'DarkSlateGrey'}
    },
    {
        name: 'aquamarine', base: 'MineralBase',
        weight: 0.25, value: value('mineral', 50),
        char: '*', color: {fg: 'Aquamarine', bg: 'Black'}
    },
    {
        name: 'topaz', base: 'MineralBase',
        weight: 0.15, value: value('mineral', 75),
        char: '*', color: {fg: 'Blue', bg: 'White'}
    },
    {
        name: 'fire opal', base: 'MineralBase',
        weight: 0.15, value: value('mineral', 75),
        char: '*', color: {fg: 'Salmon', bg: 'Black'}
    },
    {
        name: 'white opal', base: 'MineralBase',
        weight: 0.15, value: value('mineral', 75),
        char: '*', color: {fg: 'Wheat', bg: 'Black'}
    },
    {
        name: 'mithril ore', base: 'MineralBase',
        weight: 0.2, value: value('mineral', 60),
        className: 'cell-item-mithril'
    },
    {
        name: 'adamantium ore', base: 'MineralBase',
        weight: 0.3, value: value('mineral', 80),
        className: 'cell-item-adamantium',
        rarity: 2,
    },
    {
        name: 'snowshard', base: 'MineralBase',
        weight: 0.20, value: value('mineral', 50),
        char: '*', color: {fg: 'DarkBlue', bg: 'White'}
    },
    {
        name: 'ruby glass ore', base: 'MineralBase',
        weight: 0.1, value: value('mineral', 100),
        className: 'cell-item-ruby-glass',
        rarity: 3,
    },
    {
        name: 'emerald', base: 'MineralBase',
        weight: 0.15, value: value('mineral', 150),
        char: '*', color: {fg: 'Green', bg: 'Black'}
    },
    {
        name: 'froststone', base: 'MineralBase',
        weight: 0.25, value: value('mineral', 150),
        char: '*', color: {fg: 'LightCyan', bg: 'Gray'}
    },
    {
        name: 'permaice ore', base: 'MineralBase',
        weight: 0.4, value: value('mineral', 100),
        className: 'cell-item-ice',
        rarity: 4,
    },
    {
        name: 'sapphire', base: 'MineralBase',
        weight: 0.15, value: value('mineral', 150),
        char: '*', color: {fg: 'Blue', bg: 'White'}
    },
    {
        name: 'forium ore', base: 'MineralBase',
        weight: 0.2, value: value('mineral', 150),
        className: 'cell-item-magic',
        rarity: 5,
    },
    {
        name: 'netherium ore', base: 'MineralBase',
        weight: 0.3, value: value('mineral', 200),
        className: 'cell-item-void',
        rarity: 5,
    },
    {
        name: 'ruby', base: 'MineralBase',
        weight: 0.2, value: value('mineral', 250),
        char: '*', className: 'cell-item-ruby-glass'
    },
    {
        name: 'diamond', base: 'MineralBase',
        weight: 0.3, value: value('mineral', 300),
        char: '*', color: color('white', 'blue')
    },
    {
        name: 'foriphire', base: 'MineralBase',
        weight: 0.34, value: value('mineral', 350),
        char: '*', className: 'cell-item-magic',
        rarity: 5,
    },
    {
        name: 'nethermond', base: 'MineralBase',
        weight: 0.36, value: value('mineral', 400),
        char: '*', className: 'cell-item-void',
        rarity: 5,
    },
    {
        name: 'ice diamond', base: 'MineralBase',
        weight: 0.3, value: value('mineral', 400),
        char: '*', className: 'cell-item-ice',
        rarity: 5,
    },
    {
        name: 'Blizzard Star', base: 'MineralBase',
        weight: 1.0, value: value('mineral', 600),
        char: '*', color: color('cyan', 'darkblue'),
        rarity: 5,
    },


    // SPECIAL ITEMS (not generated procedurally)
    {
        name: 'MagicBoltBase', noRandom: true,
        type: 'ammo', char: '*', addComp: 'Magical'
    },
    {
        name: 'Fire bolt', base: 'MagicBoltBase',
        className: 'cell-item-fire'
    },
    {
        name: 'MagicalArrowBase', noRandom: true,
        type: 'ammo', char: charArrow, addComp: 'Magical'
    },
    {
        name: 'Ice arrow', base: 'MagicalArrowBase',
        className: 'cell-item-ice'
    },
    {
        name: 'Lightning arrow', base: 'MagicalArrowBase',
        className: 'cell-item-lightning'
    },
    {
        name: 'Energy arrow', base: 'MagicalArrowBase',
        className: 'cell-item-energy'
    },
    {
        name: 'Poison arrow', base: 'MagicalArrowBase',
        className: 'cell-item-poison'
    },
    {
        name: 'Arrow of webs', base: 'MagicalArrowBase',
        className: 'cell-item-energy'
    },

    {
        name: 'armed small bomb', noRandom: true,
        type: 'tool', char: ']',
        callbacks: {
            onFadeout: {
                addComp: [
                    {comp: 'Explosion', area: '3x3',
                        func: {setDamage: '3d12'},
                        applyToAllTargets: true,
                        anim: {className: 'cell-item-fire'},
                    }
                ]
            },
            onAddExplosion: {
                triggerCb: 'onFadeout',
                removeEntity: {target: 'self'},
            },
        }
    },
    {
        name: 'armed large bomb', noRandom: true,
        type: 'tool', char: ']',
        callbacks: {
            onFadeout: {
                addComp: [
                    {comp: 'Explosion', area: '5x5',
                        func: {setDamage: '5d12'},
                        applyToAllTargets: true,
                        anim: {className: 'cell-item-fire'},
                    }
                ]
            },
            onAddExplosion: {
                triggerCb: 'onFadeout',
                removeEntity: {target: 'self'},
            },
        }
    },

    // ARTIFACT ITEMS
];

// Maps the weapon type to damage type. Default is RG.DMG.BLUNT, unless
// specified otherwise here
export const dmgTypes = {
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

/* Set damage types for weapons. Skips, if already set. */
Items.forEach((item: ObjectShell) => {
    if (item.damageType) {
        return;
    }
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

addResistancePotions(Items);
addStatsPotions(Items);


function addResistancePotions(arr: any[]): void {
    Object.values(RG.DMG).forEach((dmg: string) => {
        if (dmg === 'EFFECT' || dmg === 'DIRECT' || dmg === 'HUNGER' || dmg === 'MELEE') {return;}
        Object.entries(RG.RESISTANCE).forEach((pair: [string, number]) => {
            const level = pair[0];
            const resComp: any = resistance(dmg, level);
            const itemVal = 10 * pair[1];

            resComp.name = 'Resistance';
            resComp.duration = '5d10 + 10';
            let name = 'Potion of ' + level.toLowerCase() + ' ' + dmg.toLowerCase();
            if (pair[1] === RG.RESISTANCE.IMMUNITY) {
                name = 'Potion of ' + dmg.toLowerCase() + ' ' + level.toLowerCase();
            }
            else if (pair[1] !== RG.RESISTANCE.ABSORB) {
                name += ' resistance';
            }

            const shell = {
                name, base: 'PotionBase',
                use: {addComp: resComp}, value: value('potion', itemVal)
            };

            arr.push(shell);
        });
    });
}

function addStatsPotions(arr: any[]): void {
    // Generates 2 sets of potions: normal with +1 and greater potions with +2
    const pairs: [string, number][] = [['', 1], [' greater', 2]];

    RG.STATS.forEach((stat: string) => {

        const statLc = stat.toLowerCase();
        pairs.forEach((pair: [string, number]) => {
            const [prefix, incr] = pair;
            const name = 'Potion of' + prefix + ' ' + statLc;
            const shell = {
                name, base: 'PotionBase',
                use: {modifyStat: {value: incr, statName: statLc}},
                value: value('potion', incr * 200)
            };
            arr.push(shell);
        });
    });
}

Items.push(...GemItems);

function SowSeeds(seedName: string, growTime: number): any {
    return {
        addElement: {
            elementName: 'PlantedSoil',
            setters: {
                get: 'PlantedSoil', // Target this component
                setTimeLeftToGrow: growTime,
                setGrowsInto: seedName,
            },
            successCheck: [
                {elements: {has: 'TilledSoil'}},
            ],
            failureMsg: 'Seeds cannot be planted here.',
        }
    };
}

export default Items;

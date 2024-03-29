/* Contains the in-game actors. */
/* eslint comma-dangle: 0 */

import RG from '../src/rg';
import {meleeHitDamage, color, resistance} from './shell-utils';
import {IAddCompObj, TAddCompSpec, IColor} from '../src/interfaces';

const defaultBrain = 'GoalOriented';
const demonBrain = 'GoalOriented';
const undeadBrain = 'GoalOriented';
const needBrain = 'NeedDriven';

const NO_ENEMIES: any[] = [];

interface ItemObj {
    name: string;
    count: number;
}

type Item = string | ItemObj;

interface IAbility {
    [key: string]: any;
}

interface IGoal {
    name: string;
    bias: number;
}

const grayBg = 'DarkSlateGray';

interface PoisonSpec {
    duration: string;
    damage: string;
    prob: string;
}

// Defines all possible attributes which can be given
export interface ActorShell {
    name: string; // Only name is mandatory

    // Meta-attributes
    actorType?: string;
    base?: string;
    char?: string;
    colorfg?: string;
    colorbg?: string;
    color?: IColor;
    className?: string;
    dontCreate?: boolean;
    noRandom?: boolean;

    // Direct attributes of actor
    accuracy?: number;
    agility?: number;
    attack?: number;
    brain?: string;
    damage?: number | string;
    danger?: number;
    defense?: number;
    enemies?: string[];
    fovrange?: number;
    hp?: number;
    magic?: number;
    maxPP?: number;
    perception?: number;
    pp?: number;
    protection?: number;
    power?: number;
    range?: number;
    speed?: number;
    strength?: number;
    spells?: string[];
    type?: string;
    unique?: boolean;
    willpower?: number;

    // TODO more complex typings
    onHit?: any;
    onAttackHit?: any;
    addComp?: TAddCompSpec | string;
    poison?: PoisonSpec;
    equip?: Item[];
    inv?: Item[];

    ability?: IAbility;
    goals?: IGoal[];

}

const charFlame = '\u27C1';

/* Instructions:
 *   base: 'baseName' inherits all properties from the base object (expect
 *   the special property dontCreate). You can chain as many base objects and
 *   use multiple bases but the order is important in that case. The base
 *   objects have to be specified before the objects using them as base.
 *
 * dontCreate: true prevents creation of Actor objects from object. This is
 * useful for "base" objects.
 *
 * noRandom: true  excludes the actor from random generation. This is useful for
 * bosses etc fixed actors.
 *
 * color: {fg: <css-color>, bg: <css-color>} can be used for custom coloring
 * of actors without adding any styles to CSS file.
 */

export const ActorsData: ActorShell[] = [

    // ANIMALS
    {
        name: 'animal', dontCreate: true, type: 'animal',
        className: 'cell-actor-animal',
        attack: 1, defense: 1, hp: 5,
        protection: 0,
        range: 1, danger: 1, speed: 100, brain: 'Animal',
        enemies: RG.ACTOR_RACES
    },
    {
        name: 'chicken', char: 'c', base: 'animal',
        color: color('Red', 'White'),
        damage: '1d1', hp: 1,
        noRandom: true, enemies: NO_ENEMIES,
        ability: {
            addEntity: {
                entityName: 'Chicken egg',
                endMsg: 'Chicken lays an egg onto the ground!'
            }
        },
        inv: [{name: 'Poultry', count: 1}],
    },
    {
        name: 'pig', char: 'p', base: 'animal',
        color: color('Pink', 'White'),
        damage: '1d1', hp: 5,
        noRandom: true, enemies: NO_ENEMIES,
        inv: [{name: 'Pork', count: 2}],
    },
    {
        name: 'cow', char: 'c', base: 'animal',
        color: color('Brown', 'White'),
        damage: '1d2', hp: 7,
        noRandom: true, enemies: NO_ENEMIES,
        inv: [{name: 'Beef', count: 2}],
    },
    {
        name: 'reindeer', char: 'R', base: 'animal',
        color: color('Brown', 'White'),
        damage: '1d2', hp: 7, enemies: NO_ENEMIES,
        inv: [{name: 'Reindeer meat', count: 2}],
    },
    {
        name: 'elk', char: 'E', base: 'animal',
        color: color('Brown', 'White'),
        damage: '1d6', hp: 7, enemies: NO_ENEMIES,
        inv: [{name: 'Elk meat', count: 3}],
    },

    {
        name: 'rat', char: 'r', base: 'animal'
    },
    {
        name: 'cockroach', char: 'c', base: 'animal',
        color: color('red', 'black'),
        attack: 15, damage: '1d1',
        speed: 200,
        addComp: [BypassComp(1.00)],
    },
    {
        name: 'cloud of insects', char: 'i', base: 'animal',
        color: color('Green', 'black'),
        damage: '1d1',
        defense: 2, addComp: 'Flying',
        onHit: [{addComp: 'Paralysis', duration: '1'}]
    },
    {
        name: 'bat', char: 'b', base: 'animal',
        defense: 2, addComp: 'Flying'
    },
    {
        name: 'giant ant', char: 'a', base: 'animal',
        defense: 2, hp: 7
    },
    {
        name: 'badger', char: 'c', base: 'animal',
        attack: 1, defense: 4, damage: '1d4',
        hp: 10, danger: 2
    },
    {
        name: 'coyote', char: 'c', base: 'animal',
        colorfg: 'Yellow',
        attack: 3, defense: 3, damage: '1d4',
        hp: 12, danger: 2
    },
    {
        name: 'lynx', char: 'f', base: 'animal',
        colorfg: 'Orange',
        attack: 5, defense: 1, damage: '1d6',
        hp: 12, danger: 3
    },
    {
        name: 'hawk', char: 'H', base: 'animal',
        attack: 4, defense: 1, damage: '1d5',
        hp: 9, danger: 3, addComp: 'Flying'
    },
    {
        name: 'cloud of horseflies', char: 'i', base: 'animal',
        color: color('Orange', 'black'),
        damage: '1d3', speed: 115,
        defense: 10, addComp: 'Flying',
        onHit: [{addComp: 'Paralysis', duration: '1'}],
        danger: 3
    },
    {
        name: 'wolf', char: 'w', base: 'animal',
        attack: 4, defense: 2, damage: '1d6',
        hp: 15, danger: 3
    },
    {
        name: 'rattlesnake', char: 's', base: 'animal',
        attack: 2, defense: 3, damage: '1d3',
        hp: 10, danger: 3,
        poison: {duration: '1d6', damage: '1d10', prob: '0.1'}
    },
    {
        name: 'cave spider', char: 'S', base: 'animal',
        attack: 2, defense: 4, damage: '1d5',
        hp: 15, danger: 4,
        poison: {duration: '3d6', damage: '1d4 + 1', prob: '0.15'}
    },
    {
        name: 'woolly spider', char: 'S', base: 'animal',
        attack: 4, defense: 4, damage: '1d6 + 2',
        hp: 20, danger: 4,
        poison: {duration: '3d6', damage: '1d4 + 1', prob: '0.15'},
        onHit: [{addComp: 'Paralysis', duration: '1'}]
    },
    {
        name: 'wolverine', char: 'W', base: 'animal',
        attack: 4, defense: 4, damage: '1d7',
        hp: 20, danger: 4
    },
    {
        name: 'auroch', char: 'A', base: 'animal',
        attack: 2, defense: 4, protection: 5, damage: '1d7',
        hp: 23, danger: 4
    },
    {
        name: 'eagle', char: 'E', base: 'animal',
        attack: 4, defense: 4, damage: '1d7',
        hp: 20, danger: 4, addComp: 'Flying'
    },
    {
        name: 'dire wolf', char: 'w', base: 'animal',
        colorfg: 'Gray',
        attack: 6, defense: 2, damage: '1d8 + 2',
        hp: 23, danger: 5
    },
    {
        name: 'giant spider', char: 'S', base: 'animal',
        colorfg: 'Green',
        attack: 6, defense: 3, damage: '1d8 + 2',
        hp: 17, danger: 5,
        poison: {duration: '4d6', damage: '1d4 + 2', prob: '0.20'},
    },
    {
        name: 'black vulture', char: 'V', base: 'animal',
        attack: 5, defense: 5, damage: '1d7',
        hp: 25, danger: 5, addComp: 'Flying'
    },
    {
        name: 'giant scorpion', char: 'S', base: 'animal',
        attack: 5, defense: 5, damage: '1d6 + 1',
        hp: 19, danger: 5, brain: 'SpellCaster',
        spells: ['ScorpionsTail'], maxPP: 1, pp: 1,
        poison: {duration: '4d6', damage: '1d4 + 2', prob: '0.20'},
    },
    {
        name: 'bear', char: 'B', base: 'animal',
        attack: 5, defense: 5, damage: '1d9',
        hp: 30, danger: 5,
        inv: [{name: 'Bear meat', count: 3}],
    },
    {
        name: 'mountain lion', char: 'f', base: 'animal',
        attack: 6, defense: 3, damage: '2d4',
        hp: 25, danger: 5
    },
    {
        name: 'sabretooth tiger', char: 'f', base: 'animal',
        attack: 8, defense: 3, damage: '3d3',
        colorfg: 'Red',
        hp: 25, danger: 5, speed: 110
    },
    {
        name: 'dire bear', char: 'B', base: 'animal',
        colorfg: 'Gray',
        attack: 8, defense: 5, damage: '4d4',
        hp: 40, danger: 6,
        inv: [{name: 'Bear meat', count: 3}],
    },
    {
        name: 'griffin', char: 'G', base: 'animal',
        attack: 7, defense: 7, damage: '3d3 + 3',
        hp: 35, danger: 7, addComp: 'Flying', speed: 130
    },
    {
        name: 'polar bear', char: 'B', base: 'animal',
        color: color('blue', 'white'),
        attack: 10, defense: 5, protection: 7, damage: '4d4 + 5',
        hp: 50, danger: 8,
        onHit: [
            {addComp: 'Stun', duration: '1d2 + 1'}
        ],
        addComp: [resistance('ICE', 'STRONG')],
        inv: [{name: 'Bear meat', count: 3}],
    },
    {
        name: 'giant horsefly', char: 'I', base: 'animal',
        color: color('Orange', 'black'),
        attack: 10, defense: 15, damage: '3d3',
        hp: 25, speed: 110,
        addComp: 'Flying',
        onHit: [{addComp: 'Paralysis', duration: '1'}],
        danger: 8
    },
    {
        name: 'mammoth', char: 'M', base: 'animal',
        attack: 4, defense: 4, protection: 7, damage: '1d9',
        strength: 30, hp: 40, danger: 8,
        addComp: [resistance('ICE', 'MEDIUM')]
    },
    {
        name: 'dire mammoth', char: 'M', base: 'animal',
        attack: 4, defense: 4, protection: 10, damage: '1d15',
        strength: 35, hp: 50, danger: 9,
        colorfg: 'Gray',
        addComp: [resistance('ICE', 'MEDIUM')]
    },
    {
        name: 'polar bear king', char: 'B', base: 'animal',
        color: color('cyan', 'white'),
        attack: 15, defense: 7, damage: '5d5 + 5',
        hp: 75, danger: 10,
        onHit: [
            {addComp: 'Stun', duration: '1d2 + 1'}
        ],
        addComp: [resistance('ICE', 'IMMUNITY')]
    },
    {
        name: 'thunderbird', char: 'G', base: 'animal',
        attack: 7, defense: 7, damage: '2d8',
        hp: 45, danger: 10, addComp: 'Flying', brain: 'SpellCaster',
        spells: ['LightningArrow'], maxPP: 30, pp: 30
    },
    {
        name: 'manticore', char: 'M', base: 'animal',
        attack: 7, defense: 7, damage: '2d10',
        hp: 50, danger: 10, addComp: 'Flying',
        onHit: [{addComp: 'Paralysis', duration: '1d4 + 1'}]
    },
    {
        name: 'forest wurm', char: 'W', base: 'animal',
        color: color('Green', 'Brown'),
        attack: 12, defense: 7, protection: 15, damage: '3d10',
        hp: 70, danger: 10
    },
    {
        name: 'spider queen', char: 'S', base: 'animal',
        color: color('Purple', 'Green'),
        attack: 7, defense: 7, protection: 7, damage: '2d8 + 7',
        hp: 45, danger: 11, brain: 'SpellCaster',
        spells: ['SummonSpiders', 'ArrowOfWebs'], maxPP: 40, pp: 40,
        poison: {duration: '10d6', damage: '1d5 + 3', prob: '0.20'},
    },
    {
        name: 'ancient manticore', char: 'M', base: 'animal',
        color: color('Gray', 'Brown'),
        attack: 15, defense: 10, protection: 10, damage: '2d10 + 10',
        hp: 75, danger: 15, addComp: 'Flying',
        onHit: [{addComp: 'Paralysis', duration: '1d6 + 1'}],
        spells: ['SummonKin'], maxPP: 30, pp: 30
    },

    // BEASTS TODO
    {
        name: 'BeastBase', type: 'beast',
        dontCreate: true,
        enemies: RG.ACTOR_RACES
    },
    {
        name: 'imp', base: 'BeastBase',
        char: 'I', color: color('Black', 'Red'),
        attack: 3, defense: 3, protection: 3, damage: '1d7 + 2',
        hp: 10, danger: 3,
        brain: 'SpellCaster', spells: ['SlimeBolt'],
        addComp: ['Flying'],
        maxPP: 12, pp: 12
    },
    {
        name: 'chasm fiend', base: 'BeastBase',
        char: 'I', color: color('Black', 'OrangeRed'),
        attack: 6, defense: 3, protection: 3, damage: '1d8 + 3',
        hp: 20, danger: 3, addComp: ['Flying'],
    },
    {
        name: 'cave dweller', base: 'BeastBase',
        char: 'C', color: color('Black', 'Red'),
        attack: 5, defense: 5, protection: 5, damage: '1d10 + 2',
        hp: 30, danger: 5,
        brain: 'SpellCaster', spells: ['SlimeBolt'],
        maxPP: 18, pp: 18
    },
    {
        name: 'cave lurker', base: 'BeastBase',
        char: 'C', color: color('Black', 'OrangeRed'),
        attack: 8, defense: 8, protection: 5, damage: '2d10 + 2',
        hp: 50, danger: 9,
        brain: 'SpellCaster', spells: ['SlimeBolt'],
        maxPP: 30, pp: 30
    },
    {
        name: 'hezrou', base: 'BeastBase',
        char: 'B', className: 'cell-actor-poison',
        attack: 5, defense: 5, protection: 3,
        hp: 50, danger: 11, damage: '4d4',
        addComp: [resistance('POISON', 'IMMUNITY')],
        brain: 'SpellCaster', spells: ['PoisonCloud'],
        maxPP: 40, pp: 40
    },

    // CONSTRUCTS ETC
    {
        name: 'ConstructBase', type: 'construct',
        dontCreate: true,
        enemies: RG.ACTOR_RACES
    },
    {
        name: 'fireroach', base: 'ConstructBase',
        char: 'c', className: 'cell-actor-fire',
        attack: 15, defense: 1, damage: '1d2', speed: 170,
        danger: 1, hp: 5, type: 'construct',
        addComp: [BypassComp(0.95)],
        onHit: [meleeHitDamage(1, '1d2', 'FIRE')],
    },
    {
        name: 'water golem', base: 'ConstructBase',
        char: 'Y',  className: 'cell-actor-water',
        addComp: 'Amphibious',
        attack: 3, defense: 6, protection: 6,
        hp: 25, danger: 6, damage: '3d4',
        brain: 'SpellCaster', spells: ['WaterBolt'],
        maxPP: 10, pp: 10
    },
    {
        name: 'earth golem', base: 'ConstructBase',
        char: 'Y',  className: 'cell-actor-earth',
        equip: [{name: 'Large rock', count: 6}],
        attack: 6, defense: 3, protection: 8,
        hp: 25, danger: 7, damage: '3d4'
    },
    {
        name: 'fire golem', base: 'ConstructBase',
        color: color('Red', 'Black'),
        char: 'Y',
        attack: 7, defense: 4, protection: 4,
        hp: 35, danger: 8, damage: '4d4',
        addComp: [resistance('FIRE', 'MEDIUM')],
        brain: 'SpellCaster', spells: ['RingOfFire'],
        maxPP: 20, pp: 20
    },
    {
        name: 'void golem', base: 'ConstructBase',
        color: color('Purple', 'Black'),
        char: 'Y', className: 'cell-actor-void',
        attack: 7, defense: 7, protection: 7,
        hp: 30, danger: 8, damage: '3d4+4',
        addComp: ['SpellStop',
            resistance('MAGIC', 'IMMUNITY'),
            resistance('VOID', 'MEDIUM')
        ]
    },
    {
        name: 'water elemental', base: 'ConstructBase',
        char: 'E', className: 'cell-actor-water',
        attack: 5, defense: 5, protection: 3,
        hp: 45, danger: 10, damage: '4d4',
        addComp: 'Amphibious',
        brain: 'SpellCaster', spells: ['WaterBolt'],
        maxPP: 40, pp: 40
    },
    {
        name: 'air elemental', base: 'ConstructBase',
        char: 'E', className: 'cell-actor-air',
        attack: 5, defense: 5, protection: 3,
        hp: 45, danger: 10, damage: '4d4',
        addComp: 'Flying',
        brain: 'SpellCaster', spells: ['LightningBolt'],
        maxPP: 40, pp: 40
    },
    {
        name: 'earth elemental', base: 'ConstructBase',
        char: 'E', className: 'cell-actor-earth',
        attack: 6, defense: 3, protection: 12,
        hp: 60, danger: 12, damage: '4d4',
        brain: 'SpellCaster', spells: ['RockStorm'],
        equip: [{name: 'Huge rock', count: 6}],
        maxPP: 70, pp: 70
    },
    {
        name: 'fire elemental', base: 'ConstructBase',
        char: 'E', className: 'cell-actor-fire',
        attack: 9, defense: 6, protection: 8,
        hp: 55, danger: 14, damage: '4d4',
        brain: 'SpellCaster', spells: ['FireBolt', 'RingOfFire'],
        addComp: [resistance('FIRE', 'IMMUNITY')],
        maxPP: 60, pp: 60
    },
    {
        name: 'void elemental', base: 'ConstructBase',
        color: color('Purple', 'Black'),
        char: 'E', className: 'cell-actor-void',
        attack: 7, defense: 7, protection: 7,
        hp: 70, danger: 15, damage: '5d4',
        brain: 'SpellCaster', spells: ['PowerDrain'],
        addComp: ['SpellStop',
            resistance('MAGIC', 'ABSORB'),
            resistance('VOID', 'IMMUNITY')
        ],
        maxPP: 70, pp: 70
    },
    {
        name: 'ancient void elemental', base: 'ConstructBase',
        color: color('Purple', 'Black'),
        char: 'E', className: 'cell-actor-void',
        attack: 20, defense: 20, protection: 20,
        hp: 100, danger: 25, damage: '7d4',
        brain: 'SpellCaster', spells: ['VoidBolt', 'PowerDrain'],
        addComp: ['SpellStop',
            resistance('MAGIC', 'ABSORB'),
            resistance('VOID', 'IMMUNITY')
        ],
        maxPP: 100, pp: 100
    },

    // GOBLINS
    {
        name: 'goblin', char: 'g', type: 'goblin',
        className: 'cell-actor-goblin',
        attack: 1, defense: 1, damage: '1d6', range: 1, hp: 7,
        protection: 1,
        danger: 2, enemies: ['human'],
        brain: defaultBrain
    },
    {
        name: 'goblin slinger', base: 'goblin',
        attack: 2, defense: 1, hp: 10, damage: '1d6',
        equip: [{name: 'Rock', count: 10}]
    },
    {
        name: 'goblin fighter', base: 'goblin',
        color: color('LightBlue', grayBg),
        attack: 2, defense: 3, protection: 1, hp: 12,
        damage: '2d5',
        danger: 2
    },
    {
        name: 'goblin healer', base: 'goblin',
        attack: 2, defense: 4, protection: 2, hp: 15,
        danger: 3, damage: '1d6 + 2',
        brain: 'SpellCaster', pp: 18, maxPP: 18,
        spells: ['Heal'],
        color: color('Red', 'White'),
    },
    {
        name: 'goblin sergeant', base: 'goblin',
        damage: '3d4+2',
        attack: 4, defense: 4, protection: 2, hp: 21,
        danger: 4
    },
    {
        name: 'goblin summoner', base: 'goblin',
        attack: 2, defense: 4, protection: 2, hp: 25,
        maxPP: 20, pp: 20, damage: '1d8',
        brain: 'SpellCaster', spells: ['SummonAnimal'],
        danger: 5
    },
    {
        name: 'goblin lord', base: 'goblin',
        attack: 5, defense: 4, protection: 3, hp: 30,
        danger: 7, damage: '4d4',
        colorfg: 'pink',
    },
    {
        name: 'goblin king', base: 'goblin',
        attack: 7, defense: 7, protection: 3, hp: 40,
        danger: 10, damage: '4d4+6',
        brain: 'SpellCaster', spells: ['SummonKin'],
        colorfg: 'red',
    },

    {
        name: 'HyrmBase', char: 'Y', type: 'hyrm',
        color: color('Black', 'Purple'), dontCreate: true,
        attack: 1, defense: 1, damage: '1d4', range: 1, hp: 10,
        danger: 2, brain: defaultBrain,
        enemies: RG.ACTOR_RACES
    },
    {
        name: 'hyrm warrior', base: 'HyrmBase',
        attack: 3, defense: 3, damage: '2d6+2', hp: 20,
        danger: 3,
    },
    {
        name: 'hyrm catapulter', base: 'HyrmBase',
        attack: 3, defense: 3, damage: '1d8', hp: 25,
        danger: 4,
        equip: [{name: 'Large rock', count: 4}]
    },
    {
        name: 'hyrm runemage', base: 'HyrmBase',
        color: color('Black', 'Pink'),
        attack: 3, defense: 3, damage: '1d8', hp: 25,
        danger: 5, brain: 'SpellCaster',
        spells: ['SummonKin', 'StunningTouch'],
        maxPP: 20, pp: 20
    },
    {
        name: 'hyrm hulk', base: 'HyrmBase',
        color: color('Black', 'Pink'),
        attack: 6, defense: 3, damage: '2d8', hp: 40,
        strength: 15, speed: 90,
        danger: 7,
    },

    // HUMANOIDS
    {
        name: 'humanoid', char: 'h', type: 'humanoid',
        attack: 1, defense: 1, damage: '1d4', range: 1, hp: 10,
        danger: 2, brain: defaultBrain,
        enemies: RG.ACTOR_RACES
    },
    {
        name: 'dark warrior', char: 'h', type: 'humanoid',
        className: 'cell-actor-void',
        attack: 6, defense: 4, protection: 2,
        damage: '2d5 + 3', range: 1, hp: 25,
        enemies: RG.ACTOR_RACES, brain: 'SpellCaster',
        spells: ['SummonFlyingEyes'], maxPP: 16, pp: 16, danger: 5
    },
    {
        name: 'dark archer', char: 'h', type: 'humanoid',
        className: 'cell-actor-void',
        attack: 8, defense: 3, protection: 4,
        damage: '2d5', range: 1, hp: 30,
        enemies: RG.ACTOR_RACES, brain: 'SpellCaster',
        spells: ['SummonFlyingEyes'], maxPP: 16, pp: 16, danger: 7,
        equip: ['Iron bow', {name: 'Steel arrow', count: 8}],
        addComp: ['LongRangeShot']
    },
    {
        name: 'dark assassin', char: 'h', type: 'humanoid',
        className: 'cell-actor-void',
        attack: 10, defense: 5, protection: 6, damage: '3d5 + 3', range: 1, hp: 50,
        enemies: RG.ACTOR_RACES, brain: 'SpellCaster',
        spells: ['SummonFlyingEyes'], maxPP: 30, pp: 30, danger: 10,
        addComp: [resistance('POISON', 'IMMUNITY')],
        poison: {duration: '4d6', damage: '1d4 + 2', prob: '0.20'},
    },
    {
        name: 'dark lord', char: 'h', type: 'humanoid',
        color: color('Yellow', 'Purple'),
        attack: 12, defense: 10, protection: 8, damage: '4d5 + 5', range: 1, hp: 75,
        enemies: RG.ACTOR_RACES, brain: 'SpellCaster',
        spells: ['SummonFlyingEyes', 'PoisonArrow'], maxPP: 60, pp: 60,
        danger: 15, addComp: [resistance('POISON', 'IMMUNITY')],
        poison: {duration: '4d6', damage: '2d4 + 2', prob: '0.25'},
    },
    {
        name: 'necromancer', char: '@', type: 'humanoid',
        color: color('Black', 'Red'),
        attack: 9, defense: 9, protection: 5, damage: '4d5 + 5', hp: 45,
        enemies: RG.ACTOR_RACES, brain: 'SpellCaster',
        danger: 10, pp: 25, maxPP: 25,
        addComp: [
            resistance('NECRO', 'STRONG'), resistance('ICE', 'MEDIUM')
        ],
        spells: ['AnimateDead']
    },

    // AVIAN
    {
        name: 'AvianFolkBase', char: 'A', className: 'cell-actor-avianfolk',
        type: 'avianfolk', dontCreate: true,
        enemies: ['human', 'catfolk', 'dogfolk', 'wolfclan'],
        brain: defaultBrain, addComp: 'Flying',
        attack: 2, defense: 2, damage: '1d6', range: 1,
        protection: 1, hp: 15, danger: 2
    },
    {
        name: 'avian townsfolk', base: 'AvianFolkBase', danger: 1,
        attack: 1, defense: 1, damage: '1d4', hp: 10
    },
    {
        name: 'avian scout', base: 'AvianFolkBase', danger: 2,
        attack: 3, defense: 3, damage: '2d4', hp: 20,
        speed: 110, fovrange: 6
    },
    {
        name: 'avian fighter', base: 'AvianFolkBase', danger: 4,
        attack: 6, defense: 7, damage: '3d4', hp: 30,
        color: color('LightBlue', grayBg),
    },
    {
        name: 'avian arbalist', base: 'AvianFolkBase', danger: 5,
        attack: 6, defense: 7, damage: '3d4', hp: 30,
        equip: ['Wooden crossbow', {name: 'Wooden bolt', count: 10}]
    },
    {
        name: 'avian duelist', base: 'AvianFolkBase', danger: 8,
        attack: 7, defense: 10, damage: '3d5', hp: 40,
        addComp: ['CounterAttack', 'Flying']
    },
    {
        name: 'avian judicator', base: 'AvianFolkBase', danger: 9,
        attack: 7, defense: 10, damage: '4d4', hp: 45,
        addComp: ['FirstStrike', 'Flying']
    },
    {
        name: 'avian archmage', base: 'AvianFolkBase', danger: 11,
        attack: 5, defense: 10, damage: '3d4', hp: 45,
        brain: 'SpellCaster', spells: ['SummonAirElemental'],
        pp: 40, maxPP: 40,
        color: color('Purple', grayBg),
    },
    {
        name: 'avian emperor', base: 'AvianFolkBase', danger: 16,
        attack: 8, defense: 14, damage: '5d5', hp: 85,
        addComp: ['Flying', BypassComp(0.15)],
        color: color('Purple', grayBg),
    },

    // BEARFOLK
    {
        name: 'BearfolkBase', char: 'B', className: 'cell-actor-bearfolk',
        dontCreate: true, type: 'bearfolk',
        attack: 1, defense: 1, damage: '1d5 + 1', range: 1, hp: 10,
        danger: 1, enemies: ['goblin', 'dwarf', 'undead', 'demon'],
        brain: defaultBrain,

    },
    {
      name: 'bearfolk villager', base: 'BearfolkBase',
      damage: '1d5 + 1',
      attack: 1, defense: 1, protection: 1, hp: 10, danger: 1,
      color: color('Brown', grayBg),
    },
    /*{
      name: 'bearfolk farmer', base: 'BearfolkBase',
      damage: '1d5 + 1',
      attack: 1, defense: 1, protection: 1, hp: 10, danger: 1,
      color: color('Brown', grayBg),
      brain: 'BrainFarmer',
    },*/
    {
      name: 'bearfolk thief', base: 'BearfolkBase',
      color: color('Brown', grayBg),
      damage: '1d7', brain: 'Thief',
      attack: 1, defense: 1, danger: 2, hp: 12
    },
    {
      name: 'bearfolk fighter', base: 'BearfolkBase',
      damage: '1d8',
      color: color('LightBlue', grayBg),
      attack: 2, defense: 2, danger: 2, hp: 15
    },
    {
      name: 'bearfolk archer', base: 'BearfolkBase',
      damage: '1d6',
      color: color('SpringGreen', grayBg),
      attack: 2, defense: 2, danger: 3, hp: 13,
      equip: ['Wooden bow', {name: 'Wooden arrow', count: 10}]
    },
    {
      name: 'bearfolk mage', base: 'BearfolkBase',
      damage: '1d6',
      color: color('Chartreuse', grayBg),
      attack: 2, defense: 2, danger: 4, hp: 15,
      equip: ['Robe', 'Wooden staff'],
      brain: 'SpellCaster', spells: ['SummonKin'],
      pp: 20, maxPP: 20
    },
    {
      name: 'bearfolk magistrate', base: 'BearfolkBase',
      damage: '1d10 + 2',
      color: color('Salmon', grayBg),
      attack: 4, defense: 4, danger: 5, hp: 30,
      equip: ['Leather armour']
    },
    {
        name: 'bearfolk elite', base: 'BearfolkBase',
        damage: '3d6+2',
        color: color('Cyan', grayBg),
        attack: 5, defense: 5, hp: 37, danger: 8,
        onHit: [
            {addComp: 'Stun', duration: '1d4 + 1'}
        ]
    },
    {
      name: 'bearfolk king', base: 'BearfolkBase',
      damage: '4d6+4', strength: 16,
      color: color('Red', grayBg),
      attack: 7, defense: 7, protection: 5, danger: 10, hp: 75
    },

    // UNDEAD
    {
        name: 'UndeadBase', className: 'cell-actor-undead',
        dontCreate: true, addComp: 'Undead', brain: undeadBrain,
        attack: 1, defense: 1, protection: 0,
        range: 1, enemies: RG.ACTOR_RACES, type: 'undead'
    },
    {
        name: 'skeletal dog', char: 'd', base: 'UndeadBase',
        damage: '1d6', danger: 1,
        brain: 'Animal',
        hp: 6
    },
    {
        name: 'skeletal spider', char: 'S', base: 'UndeadBase',
        attack: 2, defense: 1, damage: '1d4', danger: 1, hp: 5,
        brain: 'Animal',
        poison: {duration: '2d10', damage: '1d2', prob: '0.2'}
    },
    {
        name: 'necrocentipede', char: 'w', base: 'UndeadBase',
        attack: 1, defense: 1, damage: '1d7', danger: 2,
        brain: 'Animal', speed: 125, hp: 6
    },
    {
        name: 'skeleton', char: 'z', base: 'UndeadBase',
        attack: 2, defense: 1, damage: '1d5', danger: 1,
        hp: 9
    },
    {
        name: 'skeleton mauler', char: 'z', base: 'UndeadBase',
        attack: 4, defense: 0, damage: '2d5+4', danger: 2,
        color: color('Red', 'Black'),
        hp: 2
    },
    {
        name: 'zombie', char: 'z', base: 'UndeadBase',
        color: color('Brown', 'Black'),
        attack: 2, defense: 2, damage: '1d6+2', danger: 2,
        hp: 12
    },
    {
        name: 'skeleton archer', char: 'z', base: 'UndeadBase',
        color: color('Yellow', 'Black'),
        attack: 4, defense: 2, damage: '1d8', danger: 4,
        hp: 15,
        equip: ['Wooden bow', {name: 'Wooden arrow', count: 5}]
    },
    {
        name: 'skeleton warrior', char: 'z', base: 'UndeadBase',
        attack: 3, defense: 3, damage: '1d8 + 4', danger: 4,
        color: color('LightBlue', 'Black'),
        hp: 20
    },
    {
        name: 'necrowurm', char: 'W', base: 'UndeadBase',
        attack: 4, defense: 4, damage: '1d10 + 5', danger: 5,
        brain: 'Animal', speed: 115, hp: 21
    },
    {
        name: 'skeleton berserker', char: 'z', base: 'UndeadBase',
        color: color('Pink', 'Black'),
        attack: 9, defense: 1, damage: '2d8 + 4', danger: 5,
        hp: 10
    },
    {
        name: 'ghoul', char: 'z', base: 'UndeadBase',
        color: color('LightGray', 'Black'),
        attack: 3, defense: 3, damage: '1d7 + 2', danger: 5,
        hp: 15, onHit: [{addComp: 'Paralysis', duration: '1d4'}]
    },
    {
        name: 'crypt zombie', char: 'z', base: 'UndeadBase',
        color: color('Cyan', 'Black'),
        attack: 2, defense: 2, protection: 4,
        damage: '3d5', danger: 6, hp: 30,
    },
    {
        name: 'ghost', char: 'G', base: 'UndeadBase',
        attack: 4, defense: 4, damage: '2d5 + 2', danger: 6,
        onHit: [
            {addComp: 'StatsMods', func: [{setter: 'setSpeed', value: -5}],
                duration: '3d10'}
        ],
        hp: 25
    },
    {
        name: 'wraith', char: 'Z', base: 'UndeadBase',
        color: color('Cyan', 'Black'),
        attack: 5, defense: 5, damage: '2d5 + 2', danger: 6,
        onHit: [
            {addComp: 'StatsMods', func: [{setter: 'setStrength', value: -1}],
                duration: '2d10'}
        ],
        hp: 25
    },
    {
        name: 'specter', char: 'Z', base: 'UndeadBase',
        color: color('Blue', 'Black'),
        attack: 6, defense: 6, damage: '2d5 + 5', danger: 7,
        onHit: [
            {addComp: 'StatsMods', func: [{setter: 'setMagic', value: -1}],
                duration: '10d10'}
        ],
        hp: 25,
        addComp: ['Flying', resistance('ICE', 'STRONG')]
    },
    {
        name: 'boneclaw', char: 'B', base: 'UndeadBase',
        attack: 12, defense: 4, damage: '2d7 + 2', danger: 9,
        speed: 100,
        onAttackHit: [
            {addComp: 'DirectDamage', func: [
                {setter: 'setDamage', value: 2},
                {setter: 'setDamageType', value: RG.DMG.NECRO},
                {setter: 'setDamageCateg', value: RG.DMG.DIRECT}
            ],
                duration: '1d8 + 2'
            }
        ],
        hp: 35
    },
    {
        name: 'ghost lord', char: 'G', base: 'UndeadBase',
        colorfg: 'Yellow',
        attack: 7, defense: 7, damage: '2d5 + 2', danger: 8,
        onHit: [
            {addComp: 'StatsMods', func: [{setter: 'setSpeed', value: -7}],
                duration: '3d10'}
        ],
        hp: 35
    },
    {
        name: 'skeleton king', char: 'Z', base: 'UndeadBase',
        color: color('Red', 'Black'),
        attack: 6, defense: 6, damage: '3d5 + 5', danger: 9,
        hp: 45,
        addComp: [
            resistance('PIERCE', 'STRONG'),
            resistance('SLASH', 'STRONG'),
            resistance('ICE', 'STRONG')
        ]
    },
    {
        name: 'vampire', char: 'V', base: 'UndeadBase',
        color: color('Purple', 'Black'),
        attack: 6, defense: 6, damage: '3d5 + 2', danger: 9,
        strength: 15, speed: 120,
        onHit: [
            {addComp: 'StatsMods', func: [{setter: 'setStrength', value: -2}],
                duration: '5d10'}
        ],
        hp: 40
    },
    {
        name: 'undead unicorn', char: 'U', base: 'UndeadBase',
        color: color('GhostWhite', 'Black'),
        attack: 7, defense: 7, protection: 7, damage: '2d5 + 5', danger: 9,
        speed: 102, hp: 50,
        addComp: [BypassComp(0.25)]
    },
    {
        name: 'necrowyrm', char: 'W', base: 'UndeadBase',
        color: color('GhostWhite', 'Black'),
        attack: 7, defense: 7, protection: 7, damage: '3d5', danger: 10,
        brain: 'Animal', speed: 107, hp: 50,
        addComp: ['Flying']
    },
    {
        name: 'ghost king', char: 'G', base: 'UndeadBase',
        color: color('Red', 'Black'),
        attack: 12, defense: 12, protection: 10, damage: '4d5 + 5', danger: 12,
        brain: 'SpellCaster',
        onHit: [
            {addComp: 'StatsMods', func: [{setter: 'setSpeed', value: -12}],
                duration: '3d10'}
        ],
        hp: 50,
        addComp: [BypassComp(0.20)]
    },
    {
        name: 'lich', char: 'L', base: 'UndeadBase',
        attack: 4, defense: 8, protection: 4,
        color: color('Brown', 'Black'),
        damage: '1d8 + 6', danger: 12,
        hp: 50, brain: 'SpellCaster',
        spells: ['GraspOfWinter', 'SummonDead'], maxPP: 50, pp: 50,
        addComp: [resistance('ICE', 'MEDIUM')]
    },
    {
        name: 'lich king', char: 'L', base: 'UndeadBase',
        color: color('Red', 'Black'),
        attack: 15, defense: 15, protection: 6,
        damage: '2d8 + 2', danger: 17,
        hp: 75, brain: 'SpellCaster',
        spells: ['SummonDead', 'AnimateDead'], maxPP: 75, pp: 75,
        onHit: [
            meleeHitDamage(4, '1d6', 'NECRO')
        ],
        addComp: [
            resistance('ICE', 'MEDIUM'),
            resistance('POISON', 'IMMUNITY'),
            resistance('NECRO', 'IMMUNITY'), 'Regeneration', 'RangedEvasion'
        ]
    },
    {
        name: 'ghost emperor', char: 'G', base: 'UndeadBase',
        color: color('Fuchsia', 'Black'),
        attack: 20, defense: 20, protection: 10, damage: '5d5 + 5', danger: 18,
        brain: 'SpellCaster',
        onHit: [
            {addComp: 'StatsMods', func: [{setter: 'setSpeed', value: -20}],
                duration: '3d10'}
        ],
        addComp: [
            resistance('ICE', 'MEDIUM'),
            resistance('NECRO', 'IMMUNITY'), 'Regeneration', 'RangedEvasion',
            BypassComp(0.50)
        ],
        hp: 75,
    },
    {
        name: 'lich emperor', char: 'L', base: 'UndeadBase',
        color: color('Fuchsia', 'Black'),
        attack: 25, defense: 25, protection: 15,
        damage: '4d8 + 2', danger: 20,
        hp: 99, brain: 'SpellCaster',
        spells: ['SummonDead', 'AnimateDead', 'ShadowRay'], maxPP: 120, pp: 120,
        onHit: [
            meleeHitDamage(4, '2d6', 'NECRO'),
            {addComp: 'Stun', duration: '1d4 + 1'}
        ],
        addComp: [
            resistance('ICE', 'MEDIUM'),
            resistance('POISON', 'IMMUNITY'),
            resistance('NECRO', 'IMMUNITY'), 'Regeneration', 'RangedEvasion'
        ]
    },

    // DEMONS AND WINTRY BEINGS
    {
        name: 'WinterBeingBase', // className: 'cell-actor-winter',
        dontCreate: true, enemies: RG.ACTOR_RACES,
        color: color('Blue', 'White'),
        addComp: ['SnowWalk', resistance('ICE', 'MEDIUM')]
    },
    {
        name: 'Crevasse worm', char: 'w', base: 'WinterBeingBase',
        attack: 1, defense: 1, damage: '1d4', speed: 110,
        danger: 1, hp: 5, type: 'animal'
    },
    {
        name: 'frostroach', char: 'c', base: 'WinterBeingBase',
        attack: 15, defense: 1, damage: '1d2', speed: 170,
        danger: 1, hp: 5, type: 'animal',
        addComp: [BypassComp(0.95)],
        onHit: [meleeHitDamage(1, '1d2', 'COLD')],
    },
    {
        name: 'ice bat', char: 'b', base: 'WinterBeingBase',
        attack: 1, defense: 1, damage: '1d6', speed: 110,
        danger: 2, hp: 8, brain: 'Animal',
        addComp: ['Flying', resistance('ICE', 'MEDIUM')],
        type: 'animal'
    },
    {
        name: 'arctic fox', char: 'f', base: 'WinterBeingBase',
        attack: 4, defense: 1, damage: '1d7 + 3', speed: 105,
        danger: 3, hp: 12, brain: 'Animal', type: 'animal'
    },
    {
        name: 'frost goblin', char: 'g', base: 'WinterBeingBase',
        attack: 3, defense: 3, protection: 1, damage: '1d7', hp: 12,
        danger: 3, type: 'icebeing', brain: defaultBrain
    },
    {
        name: 'frost viper', char: 's', base: 'WinterBeingBase',
        attack: 3, defense: 3, protection: 3, damage: '1d7', hp: 18,
        danger: 4, type: 'animal',
        poison: {duration: '1d6 + 5', damage: '1d6', prob: '0.1'}
    },
    {
        name: 'arctic Wolf', char: 'w', base: 'WinterBeingBase',
        attack: 4, defense: 2, damage: '1d8', brain: 'Animal',
        hp: 21, danger: 5, type: 'animal'
    },
    {
        name: 'glacial shaman', char: '@', base: 'WinterBeingBase',
        colorfg: 'CadetBlue',
        attack: 4, defense: 4, protection: 3, damage: '1d7 + 2',
        type: 'icebeing',
        danger: 5, hp: 25, spells: ['IcyPrison'], maxPP: 22, pp: 21,
        brain: 'SpellCaster'
    },
    {
        name: 'glacial golem', char: 'G', base: 'WinterBeingBase',
        attack: 4, defense: 4, protection: 3, damage: '2d4', speed: 90,
        danger: 5, hp: 30, type: 'construct'
    },
    {
        name: 'ice minion', base: 'WinterBeingBase', char: 'm',
        attack: 4, defense: 4, protection: 2, damage: '2d4',
        hp: 20, danger: 5, type: 'demon',
        onHit: [{addComp: 'Coldness', duration: '10d10'}]
    },
    {
        name: 'mighty raven', base: 'WinterBeingBase', char: 'R',
        attack: 4, defense: 10, damage: '2d4 + 2', range: 1, hp: 20,
        danger: 5, brain: 'Animal',
        addComp: ['Flying', resistance('ICE', 'MEDIUM')],
    },
    {
        name: 'snow leopard', base: 'WinterBeingBase', char: 'f',
        attack: 8, defense: 4, damage: '1d6 + 5', range: 1, hp: 25,
        danger: 5, brain: 'Animal', type: 'animal', speed: 120
    },
    {
        name: 'cryomancer', base: 'WinterBeingBase', char: '@',
        type: 'icebeing',
        attack: 4, defense: 4, damage: '1d6', range: 1, hp: 30,
        danger: 5, spells: ['FrostBolt'], maxPP: 22, pp: 21,
        brain: 'SpellCaster'
    },
    {
        name: 'winter demon', type: 'demon', char: '&',
        colorfg: 'CadetBlue',
        attack: 5, defense: 5, protection: 2, damage: '3d3', range: 1,
        hp: 30, danger: 10, brain: demonBrain, base: 'WinterBeingBase'
    },
    {
        name: 'harbinger of winter', type: 'demon', char: '@',
        colorfg: 'DarkBlue',
        attack: 5, defense: 5, protection: 2, damage: '3d3', range: 1,
        hp: 35, danger: 10, brain: 'SpellCaster', base: 'WinterBeingBase',
        spells: ['GraspOfWinter'], maxPP: 30, pp: 30
    },
    {
        name: 'stormrider', type: 'demon', char: '&',
        colorfg: 'DarkBlue',
        attack: 6, defense: 6, protection: 3, damage: '4d3', range: 1,
        hp: 40, danger: 12, brain: demonBrain, base: 'WinterBeingBase',
        equip: ['Permaice short sword']
    },
    {
        name: 'ice archon', type: 'demon', char: 'A',
        attack: 6, defense: 6, protection: 3, damage: '4d3', range: 1,
        hp: 40, danger: 12, base: 'WinterBeingBase', brain: 'SpellCaster',
        pp: 30, maxPP: 30, spells: ['RingOfFrost']
    },
    {
        name: 'ice djinn', type: 'demon', char: '&',
        attack: 7, defense: 6, protection: 6, damage: '3d5+5', range: 1,
        hp: 45, danger: 14, brain: demonBrain, base: 'WinterBeingBase'
    },
    {
        name: 'blizzard beast', type: 'demon', char: 'B',
        colorfg: 'CadetBlue',
        attack: 7, defense: 6, protection: 8, damage: '3d5+5', range: 1,
        hp: 50, danger: 16, brain: demonBrain, base: 'WinterBeingBase'
    },
    {
        name: 'ice behemoth', type: 'demon', char: 'B',
        colorfg: 'DarkBlue',
        attack: 10, defense: 3, protection: 8, damage: '4d5+5', range: 2,
        hp: 65, danger: 16, brain: demonBrain, base: 'WinterBeingBase',
        onHit: [{addComp: 'Coldness'}]
    },
    {
        name: 'frost Titan', type: 'giant', char: 'H',
        attack: 8, defense: 7, protection: 12, damage: '5d5', range: 1,
        hp: 80, danger: 18, brain: demonBrain, base: 'WinterBeingBase',
        onHit: [{addComp: 'Stun', duration: '1d8'}]
    },
    {
        name: 'frostburn monarch', type: 'demon', char: 'M',
        attack: 10, defense: 10, protection: 10, damage: '4d5', range: 1,
        hp: 70, danger: 20, brain: 'SpellCaster', base: 'WinterBeingBase',
        onHit: [{addComp: 'Coldness'}], spells: ['FrostBolt',
            'SummonIceMinion'],
        pp: 50, maxPP: 50
    },

    // DWARVES
    {
        name: 'dwarf', char: 'h', type: 'dwarf',
        className: 'cell-actor-dwarf',
        attack: 2, defense: 2, protection: 1, damage: '1d4',
        range: 1, hp: 20, danger: 3, enemies: ['human', 'undead', 'demon'],
        brain: defaultBrain
    },
    {
        name: 'dwarven fighter', base: 'dwarf',
        attack: 4, defense: 4, protection: 2, damage: '1d7',
        range: 1, hp: 30, danger: 4,
        color: color('LightBlue', grayBg),
        equip: ['Spear']
    },
    {
        name: 'dwarven axeman', base: 'dwarf',
        attack: 4, defense: 4, protection: 3, damage: '1d8',
        range: 1, hp: 40, danger: 5,
        color: color('DarkMagenta', 'GoldenRod'),
        equip: ['Battle axe', 'Chain armour']
    },
    {
        name: 'dwarven priest', base: 'dwarf',
        attack: 7, defense: 3, damage: '1d8',
        range: 1, hp: 40, danger: 7,
        brain: 'SpellCaster', spells: ['Heal'],
        color: color('Chartreuse', grayBg),
        pp: 50, maxPP: 50
    },
    {
        name: 'dwarven hammerer', base: 'dwarf',
        attack: 4, defense: 6, protection: 4, damage: '1d10',
        range: 1, hp: 45, danger: 6,
        equip: ['Dwarven pick-axe', 'Leather armour']
    },
    {
        name: 'dwarven bolter', base: 'dwarf',
        attack: 7, defense: 3, damage: '1d8',
        range: 1, hp: 40, danger: 7, fovrange: 7,
        color: color('DarkBlue', 'GoldenRod'),
        equip: ['Steel crossbow', {name: 'Steel bolt', count: 7}]
    },
    {
        name: 'dwarven rifleman', base: 'dwarf',
        attack: 4, defense: 4, damage: '1d8',
        range: 1, hp: 40, danger: 8, fovrange: 7,
        equip: ['Rifle', {name: 'Steel bullet', count: 10}],
        color: color('SpringGreen', grayBg),
    },
    {
        name: 'dwarven elite', base: 'dwarf',
        attack: 5, defense: 6, damage: '3d5 + 3',
        range: 1, hp: 50, danger: 9,
        color: color('Cyan', 'Black'),
        equip: ['Steel armour']
    },
    {
        name: 'dwarven commander', base: 'dwarf',
        attack: 8, defense: 8, protection: 7, damage: '2d5',
        range: 1, hp: 60, danger: 10,
        color: color('Orange', grayBg),
        equip: ['Great battle axe', 'Steel armour']
    },
    {
        name: 'dwarven king', base: 'dwarf',
        color: color('Red', 'Black'),
        attack: 12, defense: 12, protection: 10, damage: '4d5 + 5',
        range: 1, hp: 75, danger: 15,
        equip: ['Mithril armour']
    },

    // HUMANS
    {
        name: 'human', char: '@', type: 'human',
        className: 'cell-actor-human',
        attack: 2, defense: 2, damage: '1d4',
        range: 1, hp: 20, danger: 3,
        brain: defaultBrain
    },
    {
        name: 'townsfolk', base: 'human',
        attack: 1, defense: 1, damage: '1d4',
        range: 1, hp: 10, danger: 1
    },
    {
        name: 'robber', base: 'human',
        attack: 2, defense: 4, danger: 3,
        enemies: ['player']
    },
    {
        name: 'miner', base: 'human',
        attack: 4, danger: 4, damage: '1d5', equip: ['Pick-axe']
    },
    {
        name: 'fighter', base: 'human', hp: 25,
        attack: 4, defense: 4, damage: '1d8',
        color: color('LightBlue', grayBg),
        danger: 5
    },
    {
        name: 'treasure hunter', base: 'human', hp: 25,
        attack: 4, defense: 4, damage: '1d8',
        danger: 5,
        goals: [{name: 'TreasureHunter', bias: 0.9}]
    },
    {
        name: 'warlord', char: 'W', base: 'human', hp: 35,
        attack: 5, defense: 6, damage: '3d3',
        danger: 6
    },
    {
        name: 'trainer', char: '@', base: 'human', hp: 50,
        attack: 10, defense: 10, protection: 5, damage: '3d3',
        className: 'cell-actor-trainer', noRandom: true,
        danger: 6, inv: [{name: 'Gold coin', count: 50}],
        addComp: 'Trainer'
    },
    {
        name: 'shopkeeper', char: '@', base: 'human', hp: 50,
        attack: 10, defense: 10, protection: 5, damage: '3d3',
        className: 'cell-actor-shopkeeper', noRandom: true,
        danger: 6, inv: [{name: 'Gold coin', count: 100}]
    },
    {
        name: 'summoner', char: '@', base: 'human', hp: 50,
        attack: 7, defense: 7, protection: 3, damage: '2d4',
        brain: 'SpellCaster',
        spells: ['SummonKin'], maxPP: 30, pp: 30,
        danger: 10
    },
    {
        name: 'traveller', char: 't', base: 'human', hp: 35,
        attack: 5, defense: 6, damage: '3d3',
        danger: 6,
        brain: needBrain, addComp: ['Hunger']
    },

    // WILDLINGS
    {
        name: 'wildling', char: 'I', className: 'cell-actor-wildling',
        type: 'wildling', brain: defaultBrain,
        attack: 2, defense: 1, damage: '1d6', range: 1,
        hp: 15, danger: 3, enemies: ['human']
    },
    {
        name: 'wildling tribefolk', base: 'wildling',
        attack: 2, defense: 1, damage: '1d6', hp: 10, danger: 1,
        color: color('Brown', grayBg),
    },
    {
        name: 'wildling hunter', base: 'wildling',
        attack: 3, defense: 3, damage: '1d6 + 2', hp: 20, danger: 3,
        equip: ['Tomahawk'],
        color: color('LightBlue', grayBg),
    },
    {
        name: 'wildling archer', base: 'wildling',
        attack: 3, defense: 3, damage: '1d6 + 2', hp: 20, danger: 4,
        equip: ['Wooden bow', {name: 'Wooden arrow', count: 10}],
        color: color('SpringGreen', grayBg),
        brain: defaultBrain
    },
    {
        name: 'wildling fighter', base: 'wildling',
        attack: 4, defense: 3, damage: '1d9 + 3', hp: 25, danger: 5,
        color: color('LightBlue', grayBg),
    },
    {
        name: 'wildling elite', base: 'wildling',
        attack: 5, defense: 3, damage: '1d10 + 4', hp: 32, danger: 6,
        color: color('Cyan', grayBg),
    },
    {
        name: 'wildling warlord', base: 'wildling',
        attack: 6, defense: 3, damage: '1d12 + 5', hp: 40, danger: 7,
        color: color('Black', grayBg),
    },
    {
        name: 'wildling king', base: 'wildling',
        attack: 8, defense: 5, damage: '1d15 + 6', hp: 50, danger: 10,
        color: color('Red', grayBg),
    },

    // CATFOLK
    {
        name: 'CatfolkBase', char: 'f', className: 'cell-actor-catfolk',
        type: 'catfolk', dontCreate: true,
        attack: 1, defense: 1, protection: 1, damage: '1d6', range: 1,
        hp: 10, danger: 1, enemies: ['human', 'dogfolk', 'wolfclan'],
        brain: defaultBrain
    },
    {
        name: 'catfolk townsfolk', base: 'CatfolkBase',
        attack: 1, defense: 1, hp: 10, danger: 1,
        color: color('Brown', grayBg),
    },
    {
        name: 'catfolk hunter', base: 'CatfolkBase',
        attack: 1, defense: 4, damage: '3d2', hp: 15, danger: 2,
        color: color('LightBlue', grayBg),
    },
    {
        name: 'catfolk darter', base: 'CatfolkBase',
        attack: 1, defense: 4, damage: '3d2', hp: 15, danger: 3,
        brain: defaultBrain, equip: [{name: 'Iron dart', count: 9}],
        color: color('SpringGreen', grayBg),
    },
    {
        name: 'catfolk warrior', base: 'CatfolkBase',
        attack: 2, defense: 5, damage: '4d2', hp: 20, danger: 4,
        color: color('Blue', grayBg),
    },
    {
        name: 'catfolk elite', base: 'CatfolkBase',
        attack: 3, defense: 7, damage: '5d2', hp: 27, danger: 5,
        color: color('Cyan', grayBg),
        addComp: 'CounterAttack'
    },
    {
        name: 'catfolk wizard', base: 'CatfolkBase',
        attack: 3, defense: 6, damage: '4d2', hp: 25, danger: 6,
        brain: 'SpellCaster',
        color: color('Chartreuse', grayBg),
        spells: ['EnergyArrow'], maxPP: 20, pp: 20
    },
    {
        name: 'catfolk warlord', base: 'CatfolkBase',
        attack: 4, defense: 8, damage: '6d2', hp: 35, danger: 7,
        color: color('Black', grayBg),
    },
    {
        name: 'catfolk queen', base: 'CatfolkBase',
        attack: 6, defense: 15, damage: '7d3', hp: 45, danger: 10,
        addComp: 'FirstStrike',
        color: color('Yellow', grayBg),
    },
    {
        name: 'catfolk king', base: 'CatfolkBase',
        attack: 10, defense: 12, protection: 6,
        damage: '7d3 + 5', hp: 60, danger: 13,
        color: color('Red', grayBg),
    },

    // WOLFCLAN
    {
        name: 'WolfclanBase', dontCreate: true, danger: 1,
        attack: 1, defense: 1, damage: '1d4', range: 1,
        protection: 2,
        className: 'cell-actor-wolfclan', char: 'w',
        type: 'wolfclan',
        enemies: ['human', 'catfolk', 'dogfolk', 'bearfolk'],
        brain: defaultBrain
    },
    {
        name: 'wolfclan folk', base: 'WolfclanBase', danger: 1,
        hp: 12,
        attack: 2, defense: 1, damage: '1d6', range: 1,
        color: color('Brown', grayBg),

    },
    {
        name: 'wolfclan brave', base: 'WolfclanBase', danger: 4,
        attack: 4, defense: 3, damage: '2d4', hp: 25,
        color: color('LightBlue', grayBg),
    },
    {
        name: 'wolfclan skirmisher', base: 'WolfclanBase', danger: 5,
        attack: 5, defense: 4, damage: '2d4+3', hp: 30,
        color: color('SteelBlue', grayBg),
    },
    {
        name: 'wolfclan scourger', base: 'WolfclanBase', danger: 6,
        attack: 7, defense: 5, damage: '2d4+7', hp: 35,
        color: color('Blue', grayBg),
    },
    {
        name: 'wolfclan mage', base: 'WolfclanBase', danger: 7,
        attack: 7, defense: 5, damage: '2d4+7', hp: 35,
        spells: ['PowerDrain'], maxPP: 30, pp: 30,
        brain: 'SpellCaster',
        color: color('Chartreuse', grayBg),
    },
    {
        name: 'wolfclan elite', base: 'WolfclanBase', danger: 8,
        attack: 8, defense: 5, protection: 5, damage: '2d4+10', hp: 50,
        addComp: 'CounterAttack',
        color: color('Cyan', grayBg),
    },
    {
        name: 'wolfclan judicator', base: 'WolfclanBase', danger: 9,
        attack: 8, defense: 8, damage: '3d4+6', hp: 55,
        addComp: 'FirstStrike', // , equip: ['Steel armour']
        color: color('Black', grayBg),
    },
    {
        name: 'wolfclan commander', base: 'WolfclanBase', danger: 10,
        attack: 10, defense: 5, damage: '4d4+10', hp: 60,
        color: color('orange', grayBg),
    },
    {
        name: 'wolfclan king', base: 'WolfclanBase', danger: 14,
        attack: 10, defense: 10, damage: '5d4+10', hp: 75,
        color: color('Red', grayBg),
    },

    // DOGFOLK
    {
        name: 'DogfolkBase', dontCreate: true,
        className: 'cell-actor-dogfolk', char: 'd', type: 'dogfolk',
        protection: 1,
        enemies: ['catfolk', 'wolfclan'],
        brain: defaultBrain,
    },
    {
        name: 'dogfolk gatherer', base: 'DogfolkBase',
        attack: 1, defense: 3, damage: '1d4 + 1', hp: 10, danger: 1,
        color: color('Brown', grayBg),
    },
    {
        name: 'dogfolk hunter', base: 'DogfolkBase',
        color: color('LightBlue', grayBg),
        attack: 2, defense: 3, damage: '6d1', hp: 15, danger: 2
    },
    {
        name: 'dogfolk thrower', base: 'DogfolkBase',
        attack: 2, defense: 3, damage: '6d1+1', hp: 15, danger: 3,
        equip: [{name: 'Throwing axe', count: 7}],
        color: color('SpringGreen', grayBg),
    },
    {
        name: 'dogfolk warrior', base: 'DogfolkBase', danger: 4,
        attack: 3, defense: 3, damage: '7d1+3', hp: 20,
        color: color('Blue', grayBg),
    },
    {
        name: 'dogfolk skirmisher', base: 'DogfolkBase', danger: 5,
        attack: 4, defense: 3, damage: '9d1+3', hp: 25
    },
    {
        name: 'dogfolk spellsinger', base: 'DogfolkBase', danger: 8,
        attack: 6, defense: 6, damage: '10d2+4', hp: 40,
        spells: ['SummonKin', 'RingOfEnergy'], maxPP: 30, pp: 30,
        brain: 'SpellCaster',
        color: color('Chartreuse', grayBg),
    },
    {
        name: 'dogfolk elite', base: 'DogfolkBase', danger: 8,
        attack: 6, defense: 6, damage: '8d2+4', hp: 50,
        addComp: 'CounterAttack',
        color: color('Cyan', grayBg),
    },
    {
        name: 'dogfolk commander', base: 'DogfolkBase', danger: 10,
        attack: 8, defense: 8, damage: '8d3+4', hp: 65,
        color: color('orange', grayBg),
    },
    {
        name: 'dogfolk king', base: 'DogfolkBase', danger: 13,
        colorfg: 'red', colorbg: 'white',
        attack: 12, defense: 8, damage: '8d3+8', hp: 75,
        color: color('red', grayBg),
    },

    // SPIRITS
    {
        name: 'SpiritBase', char: 'Q', className: 'cell-actor-spirit',
        type: 'spirit', dontCreate: true,
        addComp: ['Ethereal'], brain: 'Spirit'
    },
    {
        name: 'Rat spirit', base: 'SpiritBase',
        strength: 0, accuracy: 0, agility: 1, willpower: 0, power: 1,
        danger: 1
    },
    {
        name: 'Wolf spirit', base: 'SpiritBase',
        strength: 1, accuracy: 0, agility: 1, willpower: 0, power: 2,
        danger: 2
    },
    {
        name: 'Bear spirit', base: 'SpiritBase',
        strength: 2, accuracy: 0, agility: 1, willpower: 0, power: 3,
        danger: 3
    },
    {
        name: 'Fighter spirit', base: 'SpiritBase',
        strength: 2, accuracy: 2, agility: 1, willpower: 0, power: 4,
        color: color('LightBlue', grayBg),
        danger: 4
    },
    {
        name: 'Shaman spirit', base: 'SpiritBase',
        strength: 0, accuracy: 0, agility: 0, willpower: 6, power: 5,
        danger: 5
    },
    {
        name: 'Winter demon spirit', base: 'SpiritBase',
        strength: 3, accuracy: 3, agility: 3, willpower: 3, power: 7,
        danger: 7
    },
    {
        name: 'Monarch spirit', base: 'SpiritBase',
        strength: 6, accuracy: 0, agility: 1, willpower: 6, power: 10,
        danger: 12
    },

    // HYRKHIANS
    {
      name: 'HyrkhianBase', dontCreate: true, className: 'cell-actor-hyrkh',
      char: 'y', enemies: ['undead', 'demon', 'beast', 'animal'],
      damage: '1d6',
      type: 'hyrkhian', brain: defaultBrain
    },
    {
      name: 'Hyrkhian townsfolk', base: 'HyrkhianBase',
      damage: '1d6',
      attack: 1, defense: 1, protection: 1, hp: 7, danger: 1,
      color: color('Brown', grayBg),
    },
    {
      name: 'Hyrkhian footman', base: 'HyrkhianBase',
      attack: 2, defense: 2, protection: 2, hp: 15, danger: 3,
      equip: ['Longsword'],
      color: color('LightBlue', grayBg),
    },
    {
      name: 'Hyrkhian phalanx', base: 'HyrkhianBase',
      attack: 4, defense: 4, protection: 2, hp: 25, danger: 5,
      equip: ['Chain armour', 'Spear'],
      color: color('Blue', grayBg),
    },
    {
      name: 'Hyrkhian archer', base: 'HyrkhianBase',
      color: color('SpringGreen', grayBg),
      attack: 4, defense: 4, protection: 2, damage: '1d8', hp: 20,
      equip: ['Steel bow', {name: 'Steel arrow', count: 15}], danger: 6
    },
    {
      name: 'Hyrkhian adept', base: 'HyrkhianBase',
      attack: 4, defense: 4, protection: 2, hp: 25,
      danger: 7, maxPP: 30, pp: 30, brain: 'SpellCaster',
      spells: ['Heal', 'MagicArmor'],
      color: color('Chartreuse', grayBg),
    },
    {
      name: 'Hyrkhian elite', base: 'HyrkhianBase',
      attack: 6, defense: 6, protection: 3, hp: 35, brain: defaultBrain,
      strength: 13,
      equip: ['Mithril short sword', 'Chain armour', 'Chain helmet'], danger: 8,
      color: color('Cyan', grayBg),
    },
    {
      name: 'Hyrkhian commander', base: 'HyrkhianBase',
      attack: 8, defense: 8, protection: 4, hp: 50, brain: defaultBrain,
      strength: 15,
      equip: ['Great battle axe', 'Steel armour', 'Steel helmet'], danger: 10,
      color: color('Orange', grayBg),
    },

    // SPECIAL ACTORS
    {
        name: 'SpecialBase', noRandom: true, actorType: 'BaseActor',
        dontCreate: true
    },
    {
      name: 'Fire', className: 'cell-actor-fire', base: 'SpecialBase',
      char: charFlame, type: 'flame', brain: 'Flame',
      addComp: ['Ethereal', 'NonSentient',
          {comp: 'Damaging', func: {setDamageType: RG.DMG.FIRE}}
      ]
    },
    {
      name: 'Ice flame', className: 'cell-actor-winter', base: 'SpecialBase',
      char: charFlame, type: 'flame', brain: 'Flame',
      addComp: ['Ethereal', 'NonSentient',
          {comp: 'Damaging', func: {setDamageType: RG.DMG.ICE}}
      ],
      onHit: [{addComp: 'Coldness', duration: '10d10'}]
    },
    {
      name: 'Ice wave', className: 'cell-actor-winter', base: 'SpecialBase',
      char: ';', type: 'wave', brain: 'Wave',
      addComp: ['Ethereal', 'NonSentient', 'Stats',
          {comp: 'Damaging', func: {setDamageType: RG.DMG.ICE}}
      ],
      onHit: [{addComp: 'Coldness', duration: '10d10'}]
    },
    {
      name: 'Death wave', className: 'cell-actor-undead', base: 'SpecialBase',
      char: ';', type: 'wave', brain: 'Wave',
      addComp: ['Ethereal', 'NonSentient', 'Stats',
          {comp: 'Damaging', func: {setDamageType: RG.DMG.NECRO}}
      ],
      // onHit: [{addComp: 'Coldness', duration: '10d10'}]
    },
    {
      name: 'Poison gas', className: 'cell-actor-poison', base: 'SpecialBase',
      char: charFlame, type: 'flame', brain: 'Cloud',
      color: color('Green', 'Gray'),
      addComp: ['Ethereal', 'NonSentient',
          {comp: 'Damaging', func: {setDamageType: RG.DMG.POISON}}
      ],
      poison: {duration: '1d10', damage: '1d10', prob: '0.1'}
    },
    {
      name: 'Forcefield', className: 'cell-actor-forcefield',
      base: 'SpecialBase',
      char: charFlame, type: 'forcefield', brain: 'NonSentient',
      speed: 1, hp: 25, defense: 0,
      addComp: ['Health', 'NonSentient', 'Combat', 'SpellStop', 'Breakable',
        {comp: 'Weakness', func: {
            setEffect: RG.DMG.MAGIC, setLevel: RG.WEAKNESS.FATAL
        }}
      ]
    },
    {
        name: 'flying eye', className: 'cell-actor-void',
        base: 'SpecialBase', char: 'e', type: 'eye',
        addComp: ['Ethereal'], brain: 'Explorer', hp: 1,
        speed: 130, fovrange: 3, actorType: 'Sentient'
    },

    // UNIQUES
    {
        name: 'UniqueBase', dontCreate: true, className: 'cell-actor-unique',
        noRandom: true, unique: true, addComp: ['Regeneration'],
        color: color('DarkViolet', 'Beige'),
    },
    {
        name: 'Thabba, Son of Ice', base: 'UniqueBase',
        char: '@', danger: 200, enemies: ['human'], type: 'finalboss',
        spells: ['FrostBolt', 'RingOfFrost'], hp: 266, pp: 100,
        brain: 'SpellCaster', damage: '4d5',
        strength: 30, accuracy: 15, agility: 20, willpower: 20, perception: 15,
        magic: 30, attack: 30, defense: 30, protection: 10,
        equip: ['Permaice katana', 'Permaice armour'],
        addComp: ['SnowWalk', resistance('ICE', 'STRONG'), 'Regeneration']
    },
    {
        name: 'Zamoned, Son of Frost', base: 'UniqueBase',
        char: '@', danger: 200, enemies: ['human'], type: 'finalboss',
        hp: 200, pp: 100, brain: defaultBrain,
        strength: 20, accuracy: 25, agility: 35, willpower: 15, perception: 25,
        magic: 10, attack: 30, defense: 30, protection: 10,
        damage: '4d5',
        equip: ['Permaice axe', 'Permaice armour', 'Bow of Defense',
            {name: 'Runed arrow', count: 100}],
        addComp: ['SnowWalk', resistance('ICE', 'STRONG'), 'Regeneration']
    },

    {
        name: 'Hag of North', type: 'wolfclan', base: 'UniqueBase',
        char: 'w', danger: 100,
        damage: '4d4+5', hp: 75, pp: 50, brain: 'SpellCaster',
        spells: ['IcyPrison', 'FrostBolt'],
        strength: 15, accuracy: 15, agility: 15, willpower: 30, perception: 25,
        magic: 25, attack: 15, defense: 15, protection: 5,
        equip: ['Ruby glass armour', 'Ruby glass collar'],
        addComp: ['SnowWalk', resistance('ICE', 'STRONG'), 'Regeneration']
    },

    {
        name: 'Aime Aeon en Nev, Mighty spellsinger', type: 'dogfolk',
        base: 'UniqueBase', char: 'd', danger: 100,
        damage: '5d5 + 5', hp: 100, pp: 75, brain: 'SpellCaster',
        spells: ['Paralysis', 'Flying', 'Heal', 'LightningArrow'],
        strength: 18, accuracy: 19, agility: 18, willpower: 28, perception: 15,
        magic: 25, attack: 20, defense: 15, protection: 5,
        equip: ['Runed armour', 'Runed collar'],
        onHit: [
            {addComp: 'Stun', duration: '1d4 + 1'}
        ],
        addComp: ['Regeneration']
    },
    {
        name: 'Aspelin Primoen, the Blacksmith', type: 'dogfolk',
        base: 'UniqueBase', char: 'd', danger: 75,
        damage: '3d7 + 3', hp: 134, brain: defaultBrain,
        strength: 25, accuracy: 20, agility: 19, willpower: 15, perception: 19,
        magic: 13, attack: 25, defense: 15, protection: 10,
        equip: ['Hammer of Void', 'Mithril armour'],
    },

    {
        name: 'Elene Immolate Kinin, Queen of cats', type: 'catfolk',
        base: 'UniqueBase', char: 'f', danger: 100,
        damage: '10d3 + 3', hp: 123, pp: 50, brain: 'SpellCaster',
        spells: ['ScorpionsTail', 'EnergyArrow', 'SummonKin'],
        strength: 15, accuracy: 25, agility: 25, willpower: 17, perception: 25,
        magic: 17, attack: 25, defense: 15, protection: 5,
        equip: ['Steel armour', 'Runed collar'],
        addComp: ['FirstStrike', 'RangedEvasion', 'Regeneration']
    },

    // Undead uniques
    {
        name: 'Tajun Eon en Lotus, lich lord', type: 'undead',
        base: 'UniqueBase', char: 'L', danger: 85,
        color: {fg: 'Red', bg: 'Black'}, enemies: RG.ACTOR_RACES,
        damage: '2d9 + 4', hp: 90, pp: 100, maxPP: 100, brain: 'SpellCaster',
        strength: 14, accuracy: 15, agility: 14, willpower: 25, perception: 19,
        magic: 30, attack: 25, defense: 15, protection: 10,
        equip: ['Runed robe'],
        onHit: [
            meleeHitDamage(4, '2d8 + 2', 'NECRO')
        ],
        spells: ['SummonDead', 'FrostBolt', 'GraspOfWinter'],
        addComp: ['Regeneration']
    },
    {
        name: 'Zargoth, undead sorcerer', type: 'undead',
        base: 'UniqueBase', char: 'Z', danger: 75,
        color: {fg: 'DarkSalmon', bg: 'Black'}, enemies: RG.ACTOR_RACES,
        damage: '2d9 + 4', hp: 100, pp: 75, maxPP: 75, brain: 'SpellCaster',
        strength: 17, accuracy: 20, agility: 17, willpower: 21, perception: 19,
        magic: 25, attack: 25, defense: 15, protection: 10, fovrange: 7,
        onHit: [
            meleeHitDamage(2, '1d8 + 2', 'NECRO')
        ],
        spells: ['SummonUndeadUnicorns', 'ShadowRay'],
        addComp: ['Regeneration']
    },

    {
        name: 'Emption Agana Sunkist, Emperor bear', type: 'bearfolk',
        base: 'UniqueBase', char: 'B', danger: 75,
        color: color('Fuchsia', 'LightGreen'),
        damage: '4d7 + 3', hp: 123, brain: defaultBrain,
        strength: 35, accuracy: 17, agility: 17, willpower: 17, perception: 17,
        magic: 10, attack: 35, defense: 35, protection: 15,
        equip: ['Mithril armour', 'Mithril shield'],
        onHit: [
            meleeHitDamage(8, '1d2', 'LIGHTNING'),
            {addComp: 'Stun', duration: '1d4 + 1'}
        ],
        addComp: ['Regeneration']
    },

    {
        name: 'Dvaling, dwarven sharpshooter', type: 'dwarf',
        base: 'UniqueBase', char: 'h', danger: 70,
        damage: '4d7 + 3', hp: 123, brain: defaultBrain,
        strength: 35, accuracy: 17, agility: 17, willpower: 17, perception: 30,
        magic: 10, attack: 35, defense: 35, protection: 5,
        fovrange: 9,
        equip: ['Mithril armour', 'Mithril helmet', 'Mithril boots',
            'Double crossbow', {name: 'Void bolt', count: 30}],
        addComp: ['EagleEye', 'RangedEvasion', 'StrongShot', 'Regeneration']
    },

    {
        name: 'Sierra Lilith Hupoith Zoic, the arcavian', type: 'avianfolk',
        base: 'UniqueBase', char: 'A', danger: 77,
        damage: '4d7 + 3', hp: 123, brain: defaultBrain,
        strength: 20, accuracy: 21, agility: 21, willpower: 40, perception: 23,
        magic: 22, attack: 25, defense: 25, protection: 7,
        fovrange: 7,
        equip: ['Ruby glass armour', 'Mithril helmet', 'Mithril shield'],
        addComp: ['Flying', 'Regeneration', 'RangedEvasion']
    },

    {
        name: 'Elsa, the frozen queen', type: 'human',
        color: color('White', 'DarkBlue'),
        base: 'UniqueBase', char: 'E', danger: 80,
        damage: '3d7 + 3', hp: 133, pp: 78, brain: 'SpellCaster',
        strength: 17, accuracy: 35, agility: 15, willpower: 30, perception: 10,
        magic: 22, attack: 35, defense: 35, protection: 15,
        fovrange: 5,
        enemies: RG.ACTOR_RACES,
        addComp: ['SnowWalk', resistance('ICE', 'IMMUNITY'), 'Regeneration'],
        onHit: [
            meleeHitDamage(5, '1d8 + 4', 'ICE')
        ],
        spells: ['FrostBolt', 'GraspOfWinter'],
    },
    {
        name: 'Horgth, the hyrkhian emperor', type: 'hyrkhian',
        base: 'UniqueBase', char: 'H', danger: 80,
        color: color('Purple', 'Black'),
        damage: '5d6 + 6', hp: 133, brain: defaultBrain,
        strength: 30, accuracy: 35, agility: 15, willpower: 15, perception: 15,
        attack: 55, defense: 45, protection: 20,
        fovrange: 5,
        enemies: RG.ACTOR_RACES,
        addComp: ['SnowWalk', resistance('ICE', 'IMMUNITY'), 'Regeneration'],
        onHit: [
            meleeHitDamage(5, '1d4 + 4', 'ICE'), {addComp: 'Stun', duration: '1d2 + 1'}
        ],

    },

    // UNIQUES TODO
    // {type: 'wildling'}
    // {type: 'goblin'}

    {
        name: 'Morkoe, the ancient frost bogey', type: 'creature',
        base: 'UniqueBase', char: 'B', danger: 100,
        damage: '3d7 + 3', hp: 167, pp: 100, brain: 'SpellCaster',
        strength: 25, accuracy: 25, agility: 5, willpower: 30, perception: 10,
        magic: 10, attack: 35, defense: 35, protection: 25,
        fovrange: 5, speed: 90,
        enemies: RG.ACTOR_RACES,
        addComp: ['SnowWalk', resistance('ICE', 'IMMUNITY'),
            resistance('NECRO', 'STRONG'), resistance('VOID', 'STRONG'),
            'Regeneration'],
        onHit: [
            meleeHitDamage(5, '1d8 + 4', 'ICE')
        ],
        spells: ['FrostBolt', 'GraspOfWinter'],
    },

    {
        name: 'Inferno Maelstrom, beingless being', type: 'creature',
        base: 'UniqueBase', char: 'I', danger: 666,
        damage: '16d6 + 6', hp: 666, pp: 666, brain: 'SpellCaster',
        strength: 128, accuracy: 128, agility: 128, willpower: 128, perception: 128,
        magic: 128, attack: 128, defense: 64, protection: 64,
        fovrange: 12, speed: 150,
        enemies: ['animal'].concat(RG.ACTOR_RACES),
        addComp: ['SnowWalk',
            resistance('ICE', 'ABSORB'),
            resistance('NECRO', 'IMMUNITY'),
            resistance('VOID', 'IMMUNITY'),
            resistance('POISON', 'IMMUNITY'),
            'Regeneration'],
        onHit: [
            meleeHitDamage(5, '2d8 + 8', 'ICE')
        ],
        spells: ['FrostBolt', 'GraspOfWinter', 'Blizzard', 'IceArrow', 'RingOfFrost'],
    },

];

//---------------------------------------------------------------------------
// HELPER FUNCTIONS
// These are used to scale the values of all actors. This is useful for
// fine-tuning the game balance.
//---------------------------------------------------------------------------

export const Actors: any = {};

// Multiplies each given value in all actors
Actors.scaleValue = function(actorsData, valName, multiply) {
    actorsData.forEach(actor => {
        if (Number.isInteger(actor[valName])) {
            actor[valName] = Math.round(multiply * actor[valName]);
        }
    });
};

// Adds to the given value in all actors (subtract by giving negative number)
Actors.addValue = function(actorsData, valName, addedVal) {
    actorsData.forEach(actor => {
        if (Number.isInteger(actor[valName])) {
            actor[valName] += addedVal;
        }
    });
};

Actors.scale = {
    attack: 2,
    danger: 1,
    hp: 1.5
};

// Adds the given value for each actor
Actors.add = {
    attack: 4
};

Actors.modToFunc = {
    scale: 'scaleValue',
    add: 'addValue'
};

Actors.modOrder = ['scale', 'add'];

/* Should be called to apply the adjusted values. It's not called by default, as
 * changing the values breaks unit tests fairly easily. If
 * RG.ObjectShell.getParser()
 * is used (recommended), the adjustment is applied automatically. */
export const adjustActorValues = (
    actorsData: ActorShell[], order: string[] = Actors.modOrder
): void => {
    order.forEach((mod: string) => {
        const funcName = Actors.modToFunc[mod];
        Object.keys(Actors[mod]).forEach(item => {
            Actors[funcName](actorsData, item, Actors[mod][item]);
        });
    });
};


export function BypassComp(value): IAddCompObj {
    return {comp: 'BypassProtection', func: {setChance: value}};
}


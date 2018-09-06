/* Contains the in-game actors. */
/* eslint comma-dangle: 0 */

const RG = require('../src/rg');
const ShellUtils = require('./shell-utils');

const {meleeHitDamage} = ShellUtils;

const defaultBrain = 'GoalOriented';
const demonBrain = 'GoalOriented';
const undeadBrain = 'GoalOriented';

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

const Actors = [

    // ANIMALS
    {
        name: 'animal', dontCreate: true, type: 'animal',
        className: 'cell-actor-animal',
        attack: 1, defense: 1, hp: 5,
        range: 1, danger: 1, speed: 100, brain: 'Animal',
        enemies: ['player', 'human', 'dwarf']
    },
    {
        name: 'rat', char: 'r', base: 'animal'
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
        attack: 3, defense: 3, damage: '1d4',
        hp: 12, danger: 2
    },
    {
        name: 'lynx', char: 'f', base: 'animal',
        attack: 5, defense: 1, damage: '1d6',
        hp: 12, danger: 3
    },
    {
        name: 'hawk', char: 'H', base: 'animal',
        attack: 4, defense: 1, damage: '1d5',
        hp: 9, danger: 3, addComp: 'Flying'
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
        hp: 30, danger: 5
    },
    {
        name: 'mountain lion', char: 'f', base: 'animal',
        attack: 6, defense: 3, damage: '2d4',
        hp: 25, danger: 5
    },
    {
        name: 'sabretooth tiger', char: 'f', base: 'animal',
        attack: 8, defense: 3, damage: '3d3',
        hp: 25, danger: 5
    },
    {
        name: 'griffin', char: 'G', base: 'animal',
        attack: 7, defense: 4, damage: '3d3',
        hp: 35, danger: 6, addComp: 'Flying', speed: 130
    },
    {
        name: 'mammoth', char: 'M', base: 'animal',
        attack: 4, defense: 4, protection: 7, damage: '1d9',
        strength: 30, hp: 40, danger: 8
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

    // BEASTS TODO
    {
        name: 'BeastBase', type: 'beast',
        dontCreate: true,
        enemies: ['human', 'player', 'dwarf']
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
        enemies: ['human', 'player']
    },
    {
        name: 'air elemental', base: 'ConstructBase',
        char: 'E', className: 'cell-actor-air',
        attack: 5, defense: 5, protection: 3,
        hp: 38, danger: 9, damage: '4d4',
        addComp: 'Flying',
        brain: 'SpellCaster', spells: ['LightningBolt'],
        maxPP: 40, pp: 40
    },
    {
        name: 'earth elemental', base: 'ConstructBase',
        char: 'E', className: 'cell-actor-earth',
        attack: 6, defense: 3, protection: 12,
        hp: 47, danger: 11, damage: '4d4',
        brain: 'SpellCaster', spells: ['RockStorm'],
        maxPP: 70, pp: 70
    },
    {
        name: 'void elemental', base: 'ConstructBase',
        color: color('Purple', 'Black'),
        char: 'E', className: 'cell-actor-void',
        attack: 7, defense: 7, protection: 7,
        hp: 60, danger: 13, damage: '5d4',
        brain: 'SpellCaster', spells: ['PowerDrain'],
        addComp: ['SpellStop',
            resistance('MAGIC', 'ABSORB'),
            resistance('VOID', 'IMMUNITY')
        ],
        maxPP: 70, pp: 70
    },

    // GOBLINS
    {
        name: 'goblin', char: 'g', type: 'goblin',
        className: 'cell-actor-goblin',
        attack: 1, defense: 1, damage: '1d4', range: 1, hp: 5,
        danger: 2, enemies: ['human', 'player'],
        brain: defaultBrain
    },
    {
        name: 'goblin slinger', base: 'goblin',
        attack: 2, defense: 1, hp: 8,
        equip: [{name: 'Rock', count: 10}]
    },
    {
        name: 'goblin fighter', base: 'goblin',
        attack: 2, defense: 3, protection: 1, hp: 12,
        danger: 2
    },
    {
        name: 'goblin healer', base: 'goblin',
        attack: 2, defense: 4, protection: 2, hp: 15,
        danger: 3,
        brain: 'SpellCaster', pp: 18, maxPP: 18,
        spells: ['Heal']
    },
    {
        name: 'goblin sergeant', base: 'goblin',
        damage: '1d7',
        attack: 4, defense: 4, protection: 2, hp: 21,
        danger: 4
    },
    {
        name: 'goblin summoner', base: 'goblin',
        attack: 2, defense: 4, protection: 2, hp: 25,
        maxPP: 20, pp: 20,
        brain: 'SpellCaster', spells: ['SummonAnimal'],
        danger: 5
    },
    {
        name: 'goblin lord', base: 'goblin',
        attack: 5, defense: 4, protection: 3, hp: 30,
        danger: 7
    },
    {
        name: 'goblin king', base: 'goblin',
        attack: 7, defense: 7, protection: 3, hp: 40,
        danger: 10
    },

    // HUMANOIDS
    {
        name: 'humanoid', char: 'h', type: 'humanoid',
        attack: 1, defense: 1, damage: '1d4', range: 1, hp: 10,
        danger: 2, brain: defaultBrain,
        enemies: ['human', 'player']
    },

    // AVIAN
    {
        name: 'AvianFolkBase', char: 'A', className: 'cell-actor-avianfolk',
        type: 'avianfolk', dontCreate: true,
        enemies: ['player', 'human', 'catfolk', 'dogfolk', 'wolfclan'],
        brain: defaultBrain, addComp: 'Flying',
        attack: 2, defense: 2, damage: '1d6', range: 1,
        protection: 1, hp: 15, danger: 2
    },
    {
        name: 'avian fighter', base: 'AvianFolkBase', danger: 4,
        attack: 6, defense: 7, damage: '3d4', hp: 30
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
        pp: 40, maxPP: 40
    },
    {
        name: 'avian emperor', base: 'AvianFolkBase', danger: 16,
        attack: 8, defense: 14, damage: '5d5', hp: 85,
        addComp: ['Flying',
            {comp: 'BypassProtection', func: {setChance: 0.15}}
        ]
    },

    // BEARFOLK
    {
        name: 'BearfolkBase', char: 'B', className: 'cell-actor-bearfolk',
        dontCreate: true, type: 'bearfolk',
        attack: 1, defense: 1, damage: '1d5 + 1', range: 1, hp: 10,
        danger: 1, enemies: ['goblin', 'dwarf', 'undead', 'demon'],
        brain: defaultBrain
    },
    {
      name: 'bearfolk fighter', base: 'BearfolkBase',
      damage: '1d8',
      attack: 2, defense: 2, danger: 2, hp: 15
    },
    {
      name: 'bearfolk archer', base: 'BearfolkBase',
      damage: '1d6',
      attack: 2, defense: 2, danger: 3, hp: 13,
      equip: ['Wooden bow', {name: 'Wooden arrow', count: 10}]
    },
    {
        name: 'bearfolk elite', base: 'BearfolkBase',
        damage: '2d6',
        attack: 5, defense: 5, hp: 37, danger: 5,
        onHit: [
            {addComp: 'Stun', duration: '1d4 + 1'}
        ]
    },
    {
      name: 'bearfolk king', base: 'BearfolkBase',
      damage: '3d6', strength: 15,
      attack: 7, defense: 7, protection: 5, danger: 8, hp: 75
    },

    // UNDEAD
    {
        name: 'UndeadBase', className: 'cell-actor-undead',
        color: color('White', 'Black'),
        dontCreate: true, addComp: 'Undead', brain: undeadBrain,
        range: 1, enemies: ['player', 'human', 'dwarf'], type: 'undead'
    },
    {
        name: 'skeletal dog', char: 'd', base: 'UndeadBase',
        attack: 1, defense: 1, damage: '1d6', danger: 1,
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
        name: 'zombie', char: 'z', base: 'UndeadBase',
        'color-fg': 'Brown',
        attack: 2, defense: 2, damage: '1d6', danger: 2,
        hp: 12
    },
    {
        name: 'skeleton archer', char: 'z', base: 'UndeadBase',
        'color-fg': 'Yellow',
        attack: 4, defense: 2, damage: '1d8', danger: 4,
        hp: 15,
        equip: ['Wooden bow', {name: 'Wooden arrow', count: 5}]
    },
    {
        name: 'skeleton warrior', char: 'z', base: 'UndeadBase',
        attack: 3, defense: 3, damage: '1d8 + 2', danger: 4,
        hp: 20
    },
    {
        name: 'necrowyrm', char: 'W', base: 'UndeadBase',
        attack: 4, defense: 4, damage: '1d9', danger: 5,
        brain: 'Animal', speed: 115, hp: 21
    },
    {
        name: 'skeleton berserker', char: 'z', base: 'UndeadBase',
        'color-fg': 'Red',
        attack: 6, defense: 1, damage: '1d10 + 4', danger: 5,
        hp: 15
    },
    {
        name: 'ghoul', char: 'z', base: 'UndeadBase',
        'color-fg': 'LightGray',
        attack: 3, defense: 3, damage: '1d7 + 2', danger: 5,
        hp: 15, onHit: [{addComp: 'Paralysis', duration: '1d4'}]
    },
    {
        name: 'wraith', char: 'Z', base: 'UndeadBase',
        'color-fg': 'Cyan',
        attack: 5, defense: 5, damage: '2d5 + 2', danger: 6,
        onHit: [
            {addComp: 'StatsMods', func: [{setter: 'setStrength', value: -1}],
                duration: '2d10'}
        ],
        hp: 25
    },
    {
        name: 'specter', char: 'Z', base: 'UndeadBase',
        'color-fg': 'Blue',
        attack: 6, defense: 6, damage: '2d5 + 2', danger: 7,
        addComp: 'Flying',
        onHit: [
            {addComp: 'StatsMods', func: [{setter: 'setMagic', value: -1}],
                duration: '10d10'}
        ],
        hp: 25
    },
    {
        name: 'boneclaw', char: 'B', base: 'UndeadBase',
        attack: 12, defense: 4, damage: '2d7 + 2', danger: 9,
        speed: 100,
        onAttackHit: [
            {addComp: 'DirectDamage', func: [
                {setter: 'setDamage', value: 2},
                {setter: 'setDamageType', value: RG.DMG.NECRO},
                {setter: 'setDamageCateg', value: RG.DMG.MELEE}
            ],
                duration: '1d8 + 2'
            }
        ],
        hp: 35
    },
    {
        name: 'vampire', char: 'V', base: 'UndeadBase',
        'color-fg': 'Purple',
        attack: 6, defense: 6, damage: '3d5 + 2', danger: 9,
        speed: 120,
        onHit: [
            {addComp: 'StatsMods', func: [{setter: 'setStrength', value: -2}],
                duration: '5d10'}
        ],
        hp: 40
    },
    {
        name: 'necrowyrm', char: 'W', base: 'UndeadBase',
        'color-fg': 'GhostWhite',
        attack: 7, defense: 7, protection: 7, damage: '2d5', danger: 10,
        brain: 'Animal', speed: 107, hp: 50
    },
    {
        name: 'lich', char: 'L', base: 'UndeadBase',
        attack: 4, defense: 8, damage: '1d8 + 6', danger: 12,
        hp: 50, brain: 'SpellCaster',
        spells: ['GraspOfWinter', 'SummonDead'], maxPP: 50, pp: 50
    },

    // DEMONS AND WINTRY BEINGS
    {
        name: 'WinterBeingBase', // className: 'cell-actor-winter',
        dontCreate: true, enemies: ['player', 'human'],
        color: color('Blue', 'White'),
        addComp: ['SnowWalk', resistance('ICE', 'MEDIUM')]
    },
    {
        name: 'Crevasse worm', char: 'w', base: 'WinterBeingBase',
        attack: 1, defense: 1, damage: '1d4', speed: 110,
        danger: 1, hp: 5, type: 'animal'
    },
    {
        name: 'Ice bat', char: 'b', base: 'WinterBeingBase',
        attack: 1, defense: 1, damage: '1d6', speed: 110,
        danger: 2, hp: 8, brain: 'Animal',
        addComp: ['Flying', resistance('ICE', 'MEDIUM')],
        type: 'animal'
    },
    {
        name: 'Arctic fox', char: 'f', base: 'WinterBeingBase',
        attack: 4, defense: 1, damage: '1d7 + 3', speed: 105,
        danger: 3, hp: 12, brain: 'Animal', type: 'animal'
    },
    {
        name: 'Frost goblin', char: 'g', base: 'WinterBeingBase',
        attack: 3, defense: 3, protection: 1, damage: '1d7', hp: 12,
        danger: 3, type: 'goblin', brain: defaultBrain
    },
    {
        name: 'Frost viper', char: 's', base: 'WinterBeingBase',
        attack: 3, defense: 3, protection: 3, damage: '1d7', hp: 18,
        danger: 4, type: 'animal',
        poison: {duration: '1d6 + 5', damage: '1d6', prob: '0.1'}
    },
    {
        name: 'Arctic Wolf', char: 'w', base: 'WinterBeingBase',
        attack: 4, defense: 2, damage: '1d8', brain: 'Animal',
        hp: 21, danger: 5, type: 'animal'
    },
    {
        name: 'Glacial shaman', char: '@', base: 'WinterBeingBase',
        'color-fg': 'CadetBlue',
        attack: 4, defense: 4, protection: 3, damage: '1d7 + 2',
        type: 'icebeing',
        danger: 5, hp: 25, spells: ['IcyPrison'], maxPP: 22, pp: 21,
        brain: 'SpellCaster'
    },
    {
        name: 'Glacial golem', char: 'G', base: 'WinterBeingBase',
        attack: 4, defense: 4, protection: 3, damage: '2d4', speed: 90,
        danger: 5, hp: 30
    },
    {
        name: 'Ice minion', base: 'WinterBeingBase', char: 'm',
        attack: 4, defense: 4, protection: 2, damage: '2d4',
        hp: 20, danger: 5, type: 'demon',
        onHit: [{addComp: 'Coldness', duration: '10d10'}]
    },
    {
        name: 'Mighty raven', base: 'WinterBeingBase', char: 'R',
        attack: 4, defense: 10, damage: '2d4 + 2', range: 1, hp: 20,
        danger: 5, brain: 'Animal',
        addComp: ['Flying', resistance('ICE', 'MEDIUM')],
    },
    {
        name: 'Snow leopard', base: 'WinterBeingBase', char: 'f',
        attack: 8, defense: 4, damage: '1d6 + 5', range: 1, hp: 25,
        danger: 5, brain: 'Animal', type: 'animal', speed: 120
    },
    {
        name: 'Cryomancer', base: 'WinterBeingBase', char: '@',
        type: 'icebeing', enemies: ['player', 'human'],
        attack: 4, defense: 4, damage: '1d6', range: 1, hp: 30,
        danger: 5, spells: ['FrostBolt'], maxPP: 22, pp: 21,
        brain: 'SpellCaster'
    },
    {
        name: 'Winter demon', type: 'demon', char: '&',
        'color-fg': 'CadetBlue',
        attack: 5, defense: 5, protection: 2, damage: '3d3', range: 1,
        hp: 30, danger: 10, brain: demonBrain, base: 'WinterBeingBase'
    },
    {
        name: 'Harbinger of winter', type: 'demon', char: '@',
        'color-fg': 'DarkBlue',
        attack: 5, defense: 5, protection: 2, damage: '3d3', range: 1,
        hp: 35, danger: 10, brain: 'SpellCaster', base: 'WinterBeingBase',
        spells: ['GraspOfWinter'], maxPP: 30, pp: 30
    },
    {
        name: 'Stormrider', type: 'demon', char: '&',
        'color-fg': 'DarkBlue',
        attack: 6, defense: 6, protection: 3, damage: '4d3', range: 1,
        hp: 40, danger: 12, brain: demonBrain, base: 'WinterBeingBase',
        equip: ['Permaice short sword']
    },
    {
        name: 'Ice archon', type: 'demon', char: 'A',
        attack: 6, defense: 6, protection: 3, damage: '4d3', range: 1,
        hp: 40, danger: 12, base: 'WinterBeingBase', brain: 'SpellCaster',
        pp: 30, maxPP: 30, spells: ['RingOfFrost']
    },
    {
        name: 'Ice djinn', type: 'demon', char: '&',
        attack: 7, defense: 6, protection: 6, damage: '3d5+5', range: 1,
        hp: 45, danger: 14, brain: demonBrain, base: 'WinterBeingBase'
    },
    {
        name: 'Blizzard beast', type: 'demon', char: 'B',
        'color-fg': 'CadetBlue',
        attack: 7, defense: 6, protection: 8, damage: '3d5+5', range: 1,
        hp: 50, danger: 16, brain: demonBrain, base: 'WinterBeingBase'
    },
    {
        name: 'Ice behemoth', type: 'demon', char: 'B',
        'color-fg': 'DarkBlue',
        attack: 10, defense: 3, protection: 8, damage: '4d5+5', range: 2,
        hp: 65, danger: 16, brain: demonBrain, base: 'WinterBeingBase',
        onHit: [{addComp: 'Coldness'}]
    },
    {
        name: 'Frost Titan', type: 'giant', char: 'H',
        attack: 8, defense: 7, protection: 12, damage: '5d5', range: 1,
        hp: 80, danger: 18, brain: demonBrain, base: 'WinterBeingBase',
        onHit: [{addComp: 'Stun', duration: '1d8'}]
    },
    {
        name: 'Frostburn monarch', type: 'demon', char: 'M',
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
        attack: 2, defense: 2, damage: '1d4',
        range: 1, hp: 20, danger: 3, enemies: ['human', 'undead', 'demon'],
        brain: defaultBrain
    },
    {
        name: 'dwarven fighter', base: 'dwarf',
        attack: 4, defense: 4, damage: '1d7',
        range: 1, hp: 30, danger: 4,
        equip: ['Spear']
    },
    {
        name: 'dwarven axeman', base: 'dwarf',
        attack: 4, defense: 4, damage: '1d8',
        range: 1, hp: 40, danger: 5,
        equip: ['Battle axe', 'Chain armour']
    },
    {
        name: 'dwarven hammerer', base: 'dwarf',
        attack: 4, defense: 6, damage: '1d10',
        range: 1, hp: 45, danger: 6,
        equip: ['Dwarven pick-axe', 'Leather armour']
    },
    {
        name: 'dwarven bolter', base: 'dwarf',
        attack: 7, defense: 3, damage: '1d8',
        range: 1, hp: 40, danger: 7, fovrange: 7,
        equip: ['Steel crossbow', {name: 'Steel bolt', count: 7}]
    },
    {
        name: 'dwarven rifleman', base: 'dwarf',
        attack: 4, defense: 4, damage: '1d8',
        range: 1, hp: 40, danger: 8, fovrange: 7,
        equip: ['Rifle', {name: 'Steel bullet', count: 10}]
    },
    {
        name: 'dwarven elite', base: 'dwarf',
        attack: 5, defense: 6, damage: '2d5',
        range: 1, hp: 50, danger: 9,
        equip: ['Battle axe', 'Steel armour']
    },
    {
        name: 'dwarven commander', base: 'dwarf',
        attack: 8, defense: 8, damage: '2d5',
        range: 1, hp: 60, danger: 10,
        equip: ['Great battle axe', 'Steel armour']
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
        enemies: ['player', 'human']
    },
    {
        name: 'miner', base: 'human',
        attack: 4, danger: 4, damage: '1d5', equip: ['Pick-axe']
    },
    {
        name: 'fighter', base: 'human', hp: 25,
        attack: 4, defense: 4, damage: '1d8',
        danger: 5
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
        type: 'summoner', enemies: ['player'],
        attack: 7, defense: 7, damage: '2d4', brain: 'Summoner',
        danger: 10
    },

    // WILDLINGS
    {
        name: 'wildling', char: 'F', className: 'cell-actor-wildling',
        type: 'wildling', brain: defaultBrain,
        attack: 2, defense: 1, damage: '1d6', range: 1,
        hp: 15, danger: 3, enemies: ['player', 'human']
    },
    {
        name: 'wildling hunter', base: 'wildling', char: 'F',
        attack: 3, defense: 3, damage: '1d6', hp: 20, danger: 3,
        equip: ['Tomahawk']
    },
    {
        name: 'wildling archer', base: 'wildling', char: 'F',
        attack: 3, defense: 3, damage: '1d6', hp: 20, danger: 4,
        equip: ['Wooden bow', {name: 'Wooden arrow', count: 10}],
        brain: defaultBrain
    },
    {
        name: 'wildling fighter', base: 'wildling', char: 'F',
        attack: 4, defense: 3, damage: '1d9', hp: 25, danger: 5
    },
    {
        name: 'wildling elite', base: 'wildling', char: 'F',
        attack: 5, defense: 3, damage: '1d10', hp: 32, danger: 6
    },
    {
        name: 'wildling warlord', base: 'wildling', char: 'W',
        attack: 6, defense: 3, damage: '1d12', hp: 40, danger: 7
    },
    {
        name: 'wildling king', base: 'wildling', char: 'W',
        attack: 8, defense: 5, damage: '1d15', hp: 50, danger: 10
    },

    // CATFOLK
    {
        name: 'CatfolkBase', char: 'f', className: 'cell-actor-catfolk',
        type: 'catfolk', dontCreate: true,
        attack: 1, defense: 1, damage: '1d6', range: 1,
        hp: 10, danger: 1, enemies: ['player', 'human', 'dogfolk', 'wolfclan'],
        brain: defaultBrain
    },
    {
        name: 'catfolk hunter', base: 'CatfolkBase',
        attack: 1, defense: 4, damage: '3d2', hp: 15, danger: 2
    },
    {
        name: 'catfolk darter', base: 'CatfolkBase',
        attack: 1, defense: 4, damage: '3d2', hp: 15, danger: 3,
        brain: defaultBrain, equip: [{name: 'Iron dart', count: 9}]
    },
    {
        name: 'catfolk warrior', base: 'CatfolkBase',
        attack: 2, defense: 5, damage: '4d2', hp: 20, danger: 4
    },
    {
        name: 'catfolk elite', base: 'CatfolkBase',
        attack: 3, defense: 7, damage: '5d2', hp: 27, danger: 5,
        addComp: 'CounterAttack'
    },
    {
        name: 'catfolk wizard', base: 'CatfolkBase',
        attack: 3, defense: 6, damage: '4d2', hp: 25, danger: 6,
        brain: 'SpellCaster',
        spells: ['EnergyArrow'], maxPP: 20, pp: 20
    },
    {
        name: 'catfolk warlord', base: 'CatfolkBase',
        attack: 4, defense: 8, damage: '6d2', hp: 35, danger: 7
    },
    {
        name: 'catfolk king', base: 'CatfolkBase',
        attack: 6, defense: 12, damage: '7d3', hp: 40, danger: 10
    },

    // WOLFCLAN
    {
        name: 'WolfclanBase', dontCreate: true, danger: 3,
        attack: 3, defense: 3, damage: '1d8', range: 1,
        className: 'cell-actor-wolfclan', char: 'w',
        type: 'wolfclan',
        enemies: ['player', 'human', 'catfolk', 'dogfolk', 'bearfolk'],
        brain: defaultBrain
    },
    {
        name: 'wolfclan brave', base: 'WolfclanBase', danger: 4,
        attack: 4, defense: 3, damage: '2d4', hp: 25
    },
    {
        name: 'wolfclan skirmisher', base: 'WolfclanBase', danger: 5,
        attack: 5, defense: 4, damage: '2d4+3', hp: 30
    },
    {
        name: 'wolfclan scourger', base: 'WolfclanBase', danger: 6,
        attack: 7, defense: 5, damage: '2d4+7', hp: 35
    },
    {
        name: 'wolfclan mage', base: 'WolfclanBase', danger: 7,
        attack: 7, defense: 5, damage: '2d4+7', hp: 35,
        spells: ['PowerDrain'], maxPP: 30, pp: 30,
        brain: 'SpellCaster'
    },
    {
        name: 'wolfclan elite', base: 'WolfclanBase', danger: 8,
        attack: 8, defense: 5, damage: '2d4+10', hp: 50,
        addComp: 'CounterAttack'
    },
    {
        name: 'wolfclan judicator', base: 'WolfclanBase', danger: 9,
        attack: 8, defense: 8, damage: '3d4+6', hp: 55,
        addComp: 'FirstStrike' // , equip: ['Steel armour']
    },
    {
        name: 'wolfclan commander', base: 'WolfclanBase', danger: 10,
        attack: 10, defense: 5, damage: '4d4+10', hp: 60
    },
    {
        name: 'wolfclan king', base: 'WolfclanBase', danger: 14,
        attack: 10, defense: 10, damage: '5d4+10', hp: 75
    },

    // DOGFOLK
    {
        name: 'DogfolkBase', dontCreate: true,
        className: 'cell-actor-dogfolk', char: 'd', type: 'dogfolk',
        enemies: ['player', 'catfolk', 'wolfclan'],
        brain: defaultBrain
    },
    {
        name: 'dogfolk hunter', base: 'DogfolkBase',
        attack: 2, defense: 3, damage: '6d1', hp: 15, danger: 2
    },
    {
        name: 'dogfolk thrower', base: 'DogfolkBase',
        attack: 2, defense: 3, damage: '6d1+1', hp: 15, danger: 3,
        equip: [{name: 'Throwing axe', count: 7}]
    },
    {
        name: 'dogfolk warrior', base: 'DogfolkBase', danger: 4,
        attack: 3, defense: 3, damage: '7d1+3', hp: 20
    },
    {
        name: 'dogfolk skirmisher', base: 'DogfolkBase', danger: 5,
        attack: 4, defense: 3, damage: '9d1+3', hp: 25
    },
    {
        name: 'dogfolk elite', base: 'DogfolkBase', danger: 8,
        attack: 6, defense: 6, damage: '8d2+4', hp: 35,
        addComp: 'CounterAttack'
    },
    {
        name: 'dogfolk commander', base: 'DogfolkBase', danger: 10,
        attack: 8, defense: 8, damage: '8d3+4', hp: 50
    },
    {
        name: 'dogfolk king', base: 'DogfolkBase', danger: 13,
        attack: 12, defense: 8, damage: '8d3+8', hp: 65
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
      noRandom: true, char: 'H', enemies: ['undead', 'demon', 'animal'],
      type: 'hyrkhian', brain: defaultBrain
    },
    {
      name: 'Hyrkhian footman', base: 'HyrkhianBase',
      attack: 4, defense: 4, protection: 2, hp: 20, danger: 5,
      equip: ['Spear']
    },
    {
      name: 'Hyrkhian archer', base: 'HyrkhianBase',
      attack: 4, defense: 4, protection: 2, hp: 20,
      equip: ['Steel bow', {name: 'Steel arrow', count: 15}], danger: 6
    },
    {
      name: 'Hyrkhian elite', base: 'HyrkhianBase',
      attack: 6, defense: 6, protection: 3, hp: 35, brain: 'Human',
      equip: ['Longsword', 'Chain armour', 'Chain helmet'], danger: 8
    },
    {
      name: 'Hyrkhian commander', base: 'HyrkhianBase',
      attack: 8, defense: 8, protection: 4, hp: 50, brain: 'Human',
      equip: ['Battle axe', 'Steel armour', 'Steel helmet'], danger: 10
    },

    // SPECIAL ACTORS
    {
        name: 'SpecialBase', noRandom: true, actorType: 'BaseActor',
        dontCreate: true
    },
    {
      name: 'Fire', className: 'cell-actor-fire', base: 'SpecialBase',
      char: '*', type: 'flame', brain: 'Flame',
      addComp: ['Ethereal', 'NonSentient',
          {comp: 'Damaging', func: {setDamageType: RG.DMG.FIRE}}
      ]
    },
    {
      name: 'Ice flame', className: 'cell-actor-winter', base: 'SpecialBase',
      char: '*', type: 'flame', brain: 'Flame',
      addComp: ['Ethereal', 'NonSentient',
          {comp: 'Damaging', func: {setDamageType: RG.DMG.ICE}}
      ],
      onHit: [{addComp: 'Coldness', duration: '10d10'}]
    },
    {
      name: 'Poison gas', className: 'cell-actor-poison', base: 'SpecialBase',
      char: '*', type: 'flame', brain: 'Cloud',
      color: color('Green', 'Gray'),
      addComp: ['Ethereal', 'NonSentient',
          {comp: 'Damaging', func: {setDamageType: RG.DMG.POISON}}
      ],
      poison: {duration: '1d10', damage: '1d10', prob: '0.1'}
    },
    {
      name: 'Forcefield', className: 'cell-actor-forcefield',
      base: 'SpecialBase',
      char: '*', type: 'forcefield', brain: 'NonSentient',
      speed: 1, hp: 25, defense: 0,
      addComp: ['Health', 'NonSentient', 'Combat', 'SpellStop', 'Breakable',
        {comp: 'Weakness', func: {
            setEffect: RG.DMG.MAGIC, setLevel: RG.WEAKNESS.FATAL
        }}
      ]
    },

    // UNIQUES
    {
        name: 'UniqueBase', dontCreate: true, className: 'cell-actor-unique',
        noRandom: true, unique: true
    },
    {
        name: 'Thabba, Son of Ice', base: 'UniqueBase',
        char: '@', danger: 200, enemies: ['human'], type: 'finalboss',
        spells: ['FrostBolt'], hp: 100, pp: 100, brain: 'SpellCaster',
        strength: 30, accuracy: 15, agility: 20, willpower: 20, perception: 15,
        magic: 30, attack: 30, defense: 30, protection: 10,
        equip: ['Permaice katana', 'Permaice armour']
    },
    {
        name: 'Zamoned, Son of Frost', base: 'UniqueBase',
        char: '@', danger: 200, enemies: ['human'], type: 'finalboss',
        hp: 150, pp: 100, brain: defaultBrain,
        strength: 20, accuracy: 25, agility: 35, willpower: 15, perception: 25,
        magic: 10, attack: 30, defense: 30, protection: 10,
        equip: ['Permaice axe', 'Permaice armour', 'Bow of Defense',
            {name: 'Runed arrow', count: 100}]
    },
    {
        name: 'Hag of North', type: 'wolfclan', base: 'UniqueBase',
        char: 'w', danger: 100,
        damage: '4d4+5', hp: 75, pp: 50, brain: 'SpellCaster',
        spells: ['IcyPrison', 'FrostBolt'],
        strength: 15, accuracy: 15, agility: 15, willpower: 30, perception: 25,
        magic: 25, attack: 15, defense: 15, protection: 5,
        equip: ['Ruby glass armour', 'Ruby glass collar']
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
        ]
    },
    {
        name: 'Elene Immolate Kinin, Queen of cats', type: 'catfolk',
        base: 'UniqueBase', char: 'f', danger: 100,
        damage: '10d3 + 3', hp: 100, pp: 50, brain: 'SpellCaster',
        spells: ['ScorpionsTail', 'EnergyArrow', 'SummonKin'],
        strength: 15, accuracy: 25, agility: 25, willpower: 17, perception: 25,
        magic: 17, attack: 25, defense: 15, protection: 5,
        equip: ['Steel armour', 'Runed collar'],
        addComp: ['FirstStrike']
    },
    {
        name: 'Aspelin Primoen, the Blacksmith', type: 'dogfolk',
        base: 'UniqueBase', char: 'd', danger: 75,
        damage: '3d7 + 3', hp: 134, brain: defaultBrain,
        strength: 25, accuracy: 20, agility: 19, willpower: 15, perception: 19,
        magic: 13, attack: 25, defense: 15, protection: 10,
        equip: ['Hammer of Void', 'Mithril armour'],
        onHit: [
            {addComp: 'Stun', duration: '2d4 + 2'}
        ]
    },
    {
        name: 'Tajun Eon en Lotus, lich lord', type: 'undead',
        base: 'UniqueBase', char: 'L', danger: 85,
        color: {fg: 'Red', bg: 'Black'}, enemies: RG.ACTOR_RACES,
        damage: '2d9 + 4', hp: 90, pp: 100, maxPP: 100, brain: 'SpellCaster',
        strength: 14, accuracy: 15, agility: 14, willpower: 25, perception: 19,
        magic: 30, attack: 25, defense: 15, protection: 10,
        equip: [],
        onHit: [
            meleeHitDamage(4, '2d8 + 2', 'NECRO')
        ],
        spells: ['SummonDead', 'FrostBolt', 'GraspOfWinter'],
    }

];

//---------------------------------------------------------------------------
// HELPER FUNCTIONS
// These are used to scale the values of all actors. This is useful for
// fine-tuning the game balance.
//---------------------------------------------------------------------------

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
Actors.adjustActorValues = (actorsData, order = Actors.modOrder) => {
    order.forEach(mod => {
        const funcName = Actors.modToFunc[mod];
        Object.keys(Actors[mod]).forEach(item => {
            Actors[funcName](actorsData, item, Actors[mod][item]);
        });
    });
};

function resistance(type, level) {
    return {
        comp: 'Resistance', func: {
            setEffect: RG.DMG[type.toUpperCase()],
            setLevel: RG.RESISTANCE[level.toUpperCase()]
        }
    };
}

function color(fg, bg) {
    return {fg, bg};
}

module.exports = Actors;


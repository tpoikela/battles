/* Contains the in-game actors. */

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
        hp: 35, danger: 6, addComp: 'Flying'
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
        onHit: [{addComp: 'Paralysis', duration: '1d4'}]
    },

    // CONSTRUCTS ECT
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
        brain: 'SpellCaster', spells: ['LightningBolt']
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
        name: 'goblin sergeant', base: 'goblin',
        damage: '1d7',
        attack: 4, defense: 4, protection: 2, hp: 21,
        danger: 4
    },
    {
        name: 'goblin summoner', base: 'goblin',
        attack: 2, defense: 4, protection: 2, hp: 25,
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
        dontCreate: true, addComp: 'Undead', brain: undeadBrain,
        range: 1, enemies: ['player', 'human', 'dwarf'], type: 'undead'
    },
    {
        name: 'skeletal dog', char: 'z', base: 'UndeadBase',
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
        name: 'necrowyrm', char: 'w', base: 'UndeadBase',
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
        attack: 2, defense: 2, damage: '1d6', danger: 2,
        hp: 12
    },
    {
        name: 'skeleton archer', char: 'z', base: 'UndeadBase',
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
        name: 'skeleton berserker', char: 'z', base: 'UndeadBase',
        attack: 6, defense: 1, damage: '1d10 + 4', danger: 5,
        hp: 15
    },
    {
        name: 'ghoul', char: 'z', base: 'UndeadBase',
        attack: 3, defense: 3, damage: '1d7 + 2', danger: 5,
        hp: 15, onHit: [{addComp: 'Paralysis', duration: '1d4'}]
    },
    {
        name: 'wraith', char: 'Z', base: 'UndeadBase',
        attack: 5, defense: 5, damage: '2d5 + 2', danger: 6,
        onHit: [
            {addComp: 'StatsMods', func: [{setter: 'setStrength', value: -1}],
                duration: '2d10'}
        ],
        hp: 25
    },
    {
        name: 'specter', char: 'Z', base: 'UndeadBase',
        attack: 6, defense: 6, damage: '2d5 + 2', danger: 7,
        addComp: 'Flying',
        onHit: [
            {addComp: 'StatsMods', func: [{setter: 'setMagic', value: -1}],
                duration: '2d10'}
        ],
        hp: 25
    },
    {
        name: 'lich', char: 'L', base: 'UndeadBase',
        attack: 4, defense: 4, damage: '1d8', danger: 10,
        hp: 50, brain: 'SpellCaster',
        spells: ['GraspOfWinter', 'SummonDead'], maxPP: 50, pp: 50
    },

    // DEMONS AND WINTRY BEINGS
    {
        name: 'WinterBeingBase', className: 'cell-actor-winter',
        dontCreate: true, enemies: ['player', 'human']
    },
    {
        name: 'Crevasse worm', char: 'w', base: 'WinterBeingBase',
        attack: 1, defense: 1, damage: '1d4', speed: 110,
        danger: 1, hp: 5, type: 'animal'
    },
    {
        name: 'Ice bat', char: 'b', base: 'WinterBeingBase',
        attack: 1, defense: 1, damage: '1d6', speed: 110,
        danger: 2, hp: 8, brain: 'Animal', addComp: 'Flying',
        type: 'animal'
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
        attack: 4, defense: 4, protection: 3, damage: '1d7 + 2', type: 'human',
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
        hp: 20, danger: 5, type: 'demon'
    },
    {
        name: 'Mighty raven', base: 'WinterBeingBase', char: 'R',
        attack: 4, defense: 10, damage: '2d4 + 2', range: 1, hp: 20,
        danger: 5, brain: 'Animal', addComp: 'Flying'
    },
    {
        name: 'Snow leopard', base: 'WinterBeingBase', char: 'f',
        attack: 8, defense: 4, damage: '1d6 + 5', range: 1, hp: 25,
        danger: 5, brain: 'Animal', type: 'animal', speed: 120
    },
    {
        name: 'Cryomancer', base: 'WinterBeingBase', char: '@',
        type: 'human', enemies: ['player', 'human'],
        attack: 4, defense: 4, damage: '1d6', range: 1, hp: 30,
        danger: 5, spells: ['FrostBolt'], maxPP: 22, pp: 21,
        brain: 'SpellCaster'
    },
    {
        name: 'Winter demon', type: 'demon', char: '&',
        attack: 5, defense: 5, protection: 2, damage: '3d3', range: 1,
        hp: 30, danger: 10, brain: demonBrain, base: 'WinterBeingBase'
    },
    {
        name: 'Harbinger of winter', type: 'demon', char: '@',
        attack: 5, defense: 5, protection: 2, damage: '3d3', range: 1,
        hp: 35, danger: 10, brain: 'SpellCaster', base: 'WinterBeingBase',
        spells: ['GraspOfWinter'], maxPP: 30, pp: 30
    },
    {
        name: 'Stormrider', type: 'demon', char: '&',
        attack: 6, defense: 6, protection: 3, damage: '4d3', range: 1,
        hp: 40, danger: 12, brain: demonBrain, base: 'WinterBeingBase',
        equip: ['Permaice short sword']
    },
    {
        name: 'Ice djinn', type: 'demon', char: '&',
        attack: 7, defense: 6, protection: 6, damage: '3d5+5', range: 1,
        hp: 45, danger: 14, brain: demonBrain, base: 'WinterBeingBase'
    },
    {
        name: 'Blizzard beast', type: 'demon', char: 'B',
        attack: 7, defense: 6, protection: 8, damage: '3d5+5', range: 1,
        hp: 50, danger: 16, brain: demonBrain, base: 'WinterBeingBase'
    },
    {
        name: 'Frost Titan', type: 'giant', char: 'H',
        attack: 8, defense: 7, protection: 12, damage: '5d5', range: 1,
        hp: 80, danger: 18, brain: demonBrain, base: 'WinterBeingBase'
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
        name: 'dwarven rifleman', base: 'dwarf',
        attack: 4, defense: 4, damage: '1d8',
        range: 1, hp: 40, danger: 7,
        equip: ['Rifle', {name: 'Steel bullet', count: 10}]
    },
    {
        name: 'dwarven elite', base: 'dwarf',
        attack: 5, defense: 6, damage: '2d5',
        range: 1, hp: 50, danger: 8,
        equip: ['Battle axe', 'Steel armour']
    },
    {
        name: 'dwarven commander', base: 'dwarf',
        attack: 8, defense: 8, damage: '2d5',
        range: 1, hp: 60, danger: 9,
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
        type: 'spirit', dontCreate: true
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
      char: '*', type: 'fire', brain: 'Fire',
      addComp: ['Ethereal', 'NonSentient']
    },
    {
      name: 'Forcefield', className: 'cell-actor-forcefield',
      base: 'SpecialBase',
      char: '*', type: 'forcefield', brain: 'NonSentient',
      speed: 1, hp: 25, defense: 0,
      addComp: ['Health', 'NonSentient', 'Combat']
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
        magic: 30, attack: 20, defense: 20, protection: 10,
        equip: ['Permaice katana', 'Permaice armour']
    },
    {
        name: 'Zamoned, Son of Frost', base: 'UniqueBase',
        char: '@', danger: 200, enemies: ['human'], type: 'finalboss',
        hp: 150, pp: 100, brain: defaultBrain,
        strength: 20, accuracy: 25, agility: 35, willpower: 15, perception: 25,
        magic: 10, attack: 20, defense: 20, protection: 10,
        equip: ['Permaice axe', 'Permaice armour', 'Bow of Defense',
            {name: 'Runed arrow', count: 100}]
    },
    {
        name: 'Hag of North', type: 'wolfclan', base: 'UniqueBase',
        char: '@', danger: 100,
        damage: '4d4+5', hp: 75, pp: 50, brain: 'SpellCaster',
        spells: ['FrostBolt'],
        strength: 15, accuracy: 15, agility: 15, willpower: 30, perception: 25,
        magic: 25, attack: 15, defense: 15, protection: 5,
        equip: ['Ruby glass armour', 'Ruby glass collar']
    }
];

//---------------------------------------------------------------------------
// HELPER FUNCTIONS
// These are used to scale the values of all actors. This is useful for
// fine-tuning the game balance.
//---------------------------------------------------------------------------

// Multiplies each given value in all actors
Actors.scaleValue = function(actors, valName, multiply) {
    actors.forEach(actor => {
        if (Number.isInteger(actor[valName])) {
            actor[valName] = Math.round(multiply * actor[valName]);
        }
    });
};

// Adds to the given value in all actors (subtract by giving negative number)
Actors.addValue = function(actors, valName, addedVal) {
    actors.forEach(actor => {
        if (Number.isInteger(actor[valName])) {
            actor[valName] += addedVal;
        }
    });
};

Actors.scale = {
    danger: 1,
    hp: 1
};

// Adds the given value for
Actors.add = {
    attack: 4
};

/* Should be called to apply the adjusted values. It's not called by default, as
 * changing the values breaks unit tests fairly easily. If
 * RG.ObjectShell.getParser()
 * is used (recommended), the adjustment is applied automatically. */
Actors.adjustActorValues = actors => {
    Object.keys(Actors.scale).forEach(item => {
        Actors.scaleValue(actors, item, Actors.scale[item]);
    });
    Object.keys(Actors.add).forEach(item => {
        Actors.addValue(actors, item, Actors.add[item]);
    });
};

module.exports = Actors;


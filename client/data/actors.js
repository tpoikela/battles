/* Contains the in-game actors. */

const Actors = [

    // ANIMALS
    {
        name: 'animal', dontCreate: true, type: 'animal',
        className: 'cell-actor-animal',
        attack: 1, defense: 1, hp: 5,
        range: 1, danger: 1, speed: 100, brain: 'Animal',
        enemies: ['player', 'human']
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
        name: 'griffin', char: 'G', base: 'animal',
        attack: 7, defense: 4, damage: '3d3',
        hp: 35, danger: 6, addComp: 'Flying'
    },
    {
        name: 'manticore', char: 'M', base: 'animal',
        attack: 7, defense: 7, damage: '1d10',
        hp: 50, danger: 10, addComp: 'Flying'
    },

    // GOBLINS
    {
        name: 'goblin', char: 'g', type: 'goblin',
        className: 'cell-actor-goblin',
        attack: 1, defense: 1, damage: '1d4', range: 1, hp: 5,
        danger: 2, enemies: ['human', 'player']
    },
    {
        name: 'goblin slinger', base: 'goblin',
        attack: 2, defense: 1, hp: 8,
        equip: [{name: 'Rock', count: 10}], brain: 'Archer'
    },
    {
        name: 'goblin fighter', base: 'goblin',
        attack: 2, defense: 3, protection: 1, hp: 12,
        danger: 2
    },
    {
        name: 'goblin sergeant', base: 'goblin',
        attack: 4, defense: 2, protection: 2, hp: 17,
        danger: 4
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
        danger: 2
    },

    // BEARFOLK
    {
        name: 'BearfolkBase', char: 'B', className: 'cell-actor-bearfolk',
        dontCreate: true, brain: 'Bearfolk',
        attack: 1, defense: 1, damage: '1d5 + 1', range: 1, hp: 10,
        danger: 1, enemies: ['goblin', 'dwarf', 'undead', 'demon']
    },
    {
      name: 'bearfolk fighter', base: 'BearfolkBase',
      attack: 2, defense: 2, danger: 2, hp: 15
    },
    {
      name: 'bearfolk archer', base: 'BearfolkBase',
      attack: 2, defense: 2, danger: 3, hp: 13,
      equip: ['Bow', {name: 'Arrow', count: 10}], brain: 'Archer'
    },
    {
      name: 'bearfolk king', base: 'BearfolkBase',
      attack: 7, defense: 7, protection: 5, danger: 8, hp: 40
    },

    // UNDEAD
    {
        name: 'UndeadBase', className: 'cell-actor-undead',
        dontCreate: true, addComp: 'Undead', brain: 'Undead',
        range: 1, enemies: ['player', 'human'], type: 'undead'
    },
    {
        name: 'skeletal dog', char: 'z', base: 'UndeadBase',
        attack: 1, defense: 1, damage: '1d6', danger: 1,
        hp: 6
    },
    {
        name: 'skeletal spider', char: 'S', base: 'UndeadBase',
        attack: 2, defense: 1, damage: '1d4', danger: 1, hp: 5,
        poison: {duration: '2d10', damage: '1d2', prob: '0.2'}
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
        name: 'lich', char: 'L', base: 'UndeadBase',
        attack: 4, defense: 4, damage: '1d8', danger: 10,
        hp: 50, brain: 'Summoner'
    },

    // DEMONS AND WINTRY BEINGS
    {
        name: 'WinterBeingBase', className: 'cell-actor-winter',
        dontCreate: true, enemies: ['player', 'human']
    },
    {
        name: 'Crevasse worm', char: 'w', base: 'WinterBeingBase',
        attack: 1, defense: 1, damage: '1d4', speed: 110,
        danger: 1, hp: 5
    },
    {
        name: 'Ice bat', char: 'b', base: 'WinterBeingBase',
        attack: 1, defense: 1, damage: '1d6', speed: 110,
        danger: 2, hp: 8, brain: 'Animal', addComp: 'Flying'
    },
    {
        name: 'Frost goblin', char: 'g', base: 'WinterBeingBase',
        attack: 3, defense: 3, protection: 1, damage: '1d7', hp: 12,
        danger: 3
    },
    {
        name: 'Frost viper', char: 's', base: 'WinterBeingBase',
        attack: 3, defense: 3, protection: 3, damage: '1d7', hp: 18,
        danger: 4,
        poison: {duration: '1d6 + 5', damage: '1d6', prob: '0.1'}
    },
    {
        name: 'Arctic Wolf', char: 'w', base: 'WinterBeingBase',
        attack: 4, defense: 2, damage: '1d8', brain: 'Animal',
        hp: 21, danger: 5
    },
    {
        name: 'Glacial golem', char: 'G', base: 'WinterBeingBase',
        attack: 4, defense: 4, protection: 3, damage: '2d4', speed: 90,
        danger: 10, hp: 30
    },
    {
        name: 'Mighty raven', base: 'WinterBeingBase', char: 'R',
        attack: 4, defense: 8, damage: '2d4 + 2', range: 1, hp: 20,
        danger: 5, brain: 'Animal', addComp: 'Flying'
    },
    {
        name: 'Cryomancer', base: 'WinterBeingBase', char: '@',
        type: 'human', enemies: ['player', 'human'],
        attack: 4, defense: 4, damage: '1d6', range: 1, hp: 30,
        danger: 5, spells: ['FrostBolt'], maxPP: 22, pp: 21,
        brain: 'SpellCaster'
    },
    {
        name: 'Winter demon', type: 'demon', char: 'D',
        attack: 5, defense: 5, protection: 2, damage: '3d3', range: 1,
        hp: 30, danger: 12, brain: 'Demon', base: 'WinterBeingBase'
    },
    {
        name: 'Blizzard beast', type: 'demon', char: 'B',
        attack: 7, defense: 6, protection: 4, damage: '3d4', range: 1,
        hp: 50, danger: 16, brain: 'Demon', base: 'WinterBeingBase'
    },
    {
        name: 'Frost Titan', type: 'giant', char: 'H',
        attack: 7, defense: 7, protection: 10, damage: '4d4', range: 1,
        hp: 80, danger: 18, brain: 'Demon', base: 'WinterBeingBase'
    },
    {
        name: 'Frostburn monarch', type: 'demon', char: 'M',
        attack: 7, defense: 6, protection: 6, damage: '3d4', range: 1,
        hp: 70, danger: 20, brain: 'Demon', base: 'WinterBeingBase'
    },
    // DWARVES
    {
        name: 'dwarf', char: 'h', type: 'dwarf',
        attack: 2, defense: 2, damage: '1d4',
        range: 1, hp: 20, danger: 3, enemies: ['human', 'undead', 'demon']
    },
    {
        name: 'dwarven axeman',
        attack: 4, defense: 4, damage: '1d8',
        range: 1, hp: 40, danger: 5,
        equip: ['Battle axe', 'Chain armour']

    },
    {
        name: 'dwarven rifleman',
        attack: 4, defense: 4, damage: '1d8',
        range: 1, hp: 40, danger: 7,
        equip: ['Rifle', {name: 'Rifle bullet', count: 10}],
        brain: 'Archer'
    },
    // HUMANS
    {
        name: 'human', char: '@', type: 'human',
        attack: 2, defense: 2, damage: '1d4',
        range: 1, hp: 20, danger: 3, brain: 'Human'
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
        name: 'shopkeeper', char: '@', base: 'human', hp: 50,
        attack: 10, defense: 10, damage: '3d3',
        className: 'cell-actor-shopkeeper',
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
        name: 'wildling', char: 'I', className: 'cell-actor-wildling',
        type: 'wildling',
        attack: 2, defense: 1, damage: '1d6', range: 1,
        hp: 15, danger: 3, enemies: ['player', 'human']
    },
    {
        name: 'wildling archer', base: 'wildling', char: 'F',
        attack: 3, defense: 3, damage: '1d6', hp: 20, danger: 4,
        equip: ['Bow', {name: 'Arrow', count: 10}], brain: 'Archer'
    },
    {
        name: 'wildling fighter', base: 'wildling', char: 'F',
        attack: 4, defense: 3, damage: '1d9', hp: 25, danger: 5
    },
    {
        name: 'wildling warlord', base: 'wildling', char: 'W',
        attack: 6, defense: 3, damage: '1d12', hp: 40, danger: 7
    },
    {
        name: 'wildling king', base: 'wildling', char: 'W',
        attack: 8, defense: 5, damage: '1d15', hp: 50, danger: 10
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
      noRandom: true, char: '@', enemies: ['undead', 'demon', 'animal'],
      brain: 'Human'
    },
    {
      name: 'Hyrkhian footman', base: 'HyrkhianBase',
      attack: 4, defense: 4, protection: 2, hp: 20, danger: 5,
      equip: ['Spear']
    },
    {
      name: 'Hyrkhian archer', base: 'HyrkhianBase',
      attack: 4, defense: 4, protection: 2, hp: 20, brain: 'Archer',
      equip: ['Bow', {name: 'Arrow', count: 15}], danger: 6
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

    // UNIQUES
    {
        name: 'UniqueBase', dontCreate: true, className: 'cell-actor-unique',
        noRandom: true, unique: true
    },
    {
        name: 'Thabba, Son of Ice', base: 'UniqueBase',
        char: '@', danger: 100, enemies: ['human'],
        spells: ['FrostBolt'], pp: 100, brain: 'SpellCaster',
        strength: 30, accuracy: 15, agility: 20, willpower: 20, perception: 15,
        attack: 20, defense: 20, protection: 5,
        equip: ['Permaice katana', 'Permaice armour']
    }
];

// TODO add a function to scale values easily
const scaleValue = function(valName, multiply) {
    Actors.forEach(actor => {
        if (Number.isInteger(actor[valName])) {
            actor[valName] *= multiply;
        }
    });
};

scaleValue('danger', 1);

module.exports = Actors;


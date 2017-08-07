/* Contains the in-game actors. */

const Actors = [
    // ANIMALS
    {
        name: 'animal', dontCreate: true, type: 'animal',
        className: 'cell-actor-animal',
        attack: 1, defense: 1, hp: 5,
        range: 1, danger: 1, speed: 100, brain: 'Animal'
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

    // HUMANOIDS
    {
        name: 'humanoid', char: 'h', type: 'humanoid',
        attack: 1, defense: 1, damage: '1d4', range: 1, hp: 10,
        danger: 2
    },

    // BEARFOLK
    {
        name: 'BearfolkBase', char: 'B', className: 'cell-actor-bearfolk',
        dontCreate: true, brain: 'Bearfolk'
    },

    // UNDEAD
    {
        name: 'UndeadBase', className: 'cell-actor-undead',
        dontCreate: true, addComp: 'Undead', brain: 'Undead',
        range: 1
    },
    {
        name: 'skeleton', char: 'z', base: 'UndeadBase',
        attack: 2, defense: 2, damage: '1d6', danger: 2
    },

    // DEMONS AND WINTRY BEINGS
    {
        name: 'WinterBeingBase', className: 'cell-actor-winter',
        dontCreate: true
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
        range: 1, hp: 20, danger: 3
    },
    // HUMANS
    {
        name: 'human', char: '@', type: 'human',
        attack: 2, defense: 2, damage: '1d4',
        range: 1, hp: 20, danger: 3, brain: 'Human'
    },
    {
        name: 'robber', base: 'human',
        attack: 2, defense: 4, danger: 3
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
        type: 'summoner',
        attack: 7, defense: 7, damage: '2d4', brain: 'Summoner',
        danger: 10
    },

    // WILDLINGS
    {
        name: 'wildling', char: 'I', className: 'cell-actor-wildling',
        type: 'wildling',
        attack: 4, defense: 1, damage: '1d6', range: 1,
        hp: 15, danger: 3
    },
    {
        name: 'wildling fighter', base: 'wildling', char: 'F',
        attack: 6, defense: 3, damage: '1d10', hp: 25, danger: 5
    },
    {
        name: 'wildling warlord', base: 'wildling', char: 'W',
        attack: 8, defense: 4, damage: '1d13', hp: 40, danger: 7
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
    }
];

module.exports = Actors;


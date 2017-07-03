

/**
 * THis file contains definitions for in-game objects, monsters and levels. It's
 * rather human-readable so it should be easy to add new stuff in. All contents
 * are used for procedural generation.
 */

// Some info on attributes:
//      dontCreate: true - Use with base classes, prevents object creation
//      base: xxx        - Use xxx as a base for the object
//      danger    - Used for rand generation, higher values means less often
//      cssClass         - Used for rendering purposes.

var RGObjects = {


    actors: [

        // ANIMALS
        {
            name: 'animal', dontCreate: true,
            className: 'cell-actor-animal',
            attack: 1, defense: 1, hp: 5,
            range: 1, danger: 1, speed: 100, brain: 'Animal'
        },
        {
            name: 'bat', type: 'bat', char: 'b', base: 'animal',
            defense: 2
        },
        {
            name: 'rat', type: 'rat', char: 'r', base: 'animal'
        },
        {
            name: 'rattlesnake', char: 's', base: 'animal',
            poison: true, // Change to weapon: venomous fangs
            attack: 2, defense: 3, damage: '1d3',
            hp: 10, danger: 3
        },
        {
            name: 'coyote', char: 'c', base: 'animal',
            attack: 3, defense: 3, damage: '1d4',
            hp: 12, danger: 2
        },
        {
            name: 'wolf', char: 'w', base: 'animal',
            attack: 4, defense: 2, damage: '1d6',
            hp: 15, danger: 3
        },
        {
            name: 'bear', char: 'B', base: 'animal',
            attack: 4, defense: 4, damage: '1d9',
            hp: 25, danger: 5
        },
        {
            name: 'mountain lion', char: 'f', base: 'animal',
            attack: 5, defense: 3, damage: '2d4',
            hp: 25, danger: 5
        },

        // HUMANOIDS
        {
            name: 'humanoid', char: 'h', type: 'humanoid',
            attack: 1, defense: 1, damage: '1d4', range: 1, hp: 10,
            danger: 2
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
            danger: 2, hp: 8, brain: 'Animal'
        },
        {
            name: 'Frost goblin', char: 'g', base: 'WinterBeingBase',
            attack: 3, defense: 3, protection: 1, damage: '1d7', hp: 12,
            danger: 3
        },
        {
            name: 'Frost viper', char: 's', base: 'WinterBeingBase',
            attack: 3, defense: 3, protection: 3, damage: '1d7', hp: 18,
            danger: 4
        },
        {
            name: 'Glacial golem', char: 'G', base: 'WinterBeingBase',
            attack: 4, defense: 4, protection: 3, damage: '2d4', speed: 90,
            danger: 5, hp: 30
        },
        {
            name: 'Mighty raven', base: 'WinterBeingBase', char: 'R',
            attack: 4, defense: 8, damage: '2d4 + 2', range: 1, hp: 20,
            danger: 5, brain: 'Animal'
        },
        {
            name: 'Winter demon', type: 'demon', char: 'D',
            attack: 5, defense: 5, protection: 2, damage: '3d3', range: 1,
            hp: 30, danger: 6, brain: 'Demon', base: 'WinterBeingBase'
        },
        {
            name: 'Blizzard beast', type: 'demon', char: 'B',
            attack: 7, defense: 6, protection: 4, damage: '3d4', range: 1,
            hp: 50, danger: 8, brain: 'Demon', base: 'WinterBeingBase'
        },
        {
            name: 'Frostburn monarch', type: 'demon', char: 'M',
            attack: 7, defense: 6, protection: 6, damage: '3d4', range: 1,
            hp: 70, danger: 10, brain: 'Demon', base: 'WinterBeingBase'
        },

        // HUMANS
        {
            name: 'human', char: '@', type: 'human',
            attack: 2, defense: 2, damage: '1d4',
            range: 1, hp: 20, danger: 3, brain: 'Human'
        },
        {
            name: 'miner', base: 'human',
            attack: 4, danger: 4, damage: '1d5', equip: ['Pick-axe']
        },
        {
            name: 'robber', base: 'human',
            attack: 2, defense: 4
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
            danger: 6, inv: [{name: 'Gold coin', count: 100}]
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
    ],

    items: [
        {
            name: 'Gold coin', className: 'cell-item-gold-coin',
            char: '$', material: 'gold',
            type: 'goldcoin', value: 10, weight: 0.03
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
            damage: '1d4',
            weight: 0.2, value: 5
        },
        {
            name: 'Bayonette', base: 'MeleeWeaponBase',
            material: 'iron',
            damage: '1d5',
            weight: 0.1, value: 10
            // TODO combine with rifle
        },
        {
            name: 'Short sword', base: 'MeleeWeaponBase',
            material: 'iron',
            damage: '1d6',
            weight: 0.5, value: 20
        },
        {
            name: 'Whip', base: 'MeleeWeaponBase',
            material: 'leather',
            damage: '1d6', range: 2, attack: -1,
            weight: 0.2, value: 10
        },
        {
            name: 'Pick-axe', base: 'MeleeWeaponBase',
            damage: '1d8', attack: 1, defense: 2,
            weight: 2.3, value: 50, use: 'digger'
        },
        {
            name: 'Saber', base: 'MeleeWeaponBase',
            material: 'iron',
            damage: '2d4 + 1', attack: 2, defense: 1,
            weight: 0.6, value: 30
        },
        {
            name: 'Spear', base: 'MeleeWeaponBase',
            damage: '1d8', attack: 1, defense: 3,
            weight: 1.2, value: 50
        },
        {
            name: 'Tomahawk', base: 'MeleeWeaponBase',
            material: ['wood', 'stone', 'leather'],
            damage: '1d9 + 2', attack: 2, defense: 3,
            weight: 0.7, value: 75
        },
        {
            name: 'Battle axe', base: 'MeleeWeaponBase',
            material: 'iron',
            damage: '2d6 + 2', attack: 2, defense: 1,
            weight: 1.5, value: 85
        },

        // ICE WEAPONS (not easy to attack, do lots of damage)
        {
            name: 'IceWeaponBase', base: 'MeleeWeaponBase',
            className: 'cell-item-ice',
            material: 'permaice', dontCreate: true,
            attack: 1
        },
        {
            name: 'Permaice Dagger', base: 'IceWeaponBase',
            damage: '1d4 + 6', defense: 3, weight: 0.6, value: 100
        },
        {
            name: 'Permaice short sword', base: 'IceWeaponBase',
            damage: '2d5 + 6', defense: 6, weight: 1.5, value: 300
        },
        {
            name: 'Permaice long sword', base: 'IceWeaponBase',
            damage: '4d5 + 6', defense: 8, weight: 3.0, value: 500
        },
        {
            name: 'Permaice katana', base: 'IceWeaponBase',
            damage: '10d3 + 6', defense: 10, weight: 4.0, value: 750
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
            attack: 4, defense: 1, weight: 0.1, value: 100
        },
        {
            name: 'Ruby glass short sword', base: 'RubyWeaponBase',
            damage: '3d5 + 2',
            attack: 3, defense: 2, weight: 0.2, value: 200
        },
        {
            name: 'Ruby glass sword', base: 'RubyWeaponBase',
            damage: '4d5 + 2',
            attack: 5, defense: 2, weight: 0.3, value: 350
        },
        {
            name: 'Ruby glass spear', base: 'RubyWeaponBase',
            damage: '3d5 + 2',
            attack: 3, defense: 6, weight: 0.4, value: 400
        },

        // MAGIC WEAPONS
        {
            name: 'MagicWeaponBase', base: 'MeleeWeaponBase',
            className: 'cell-item-magic',
            material: 'forium', dontCreate: true
        },
        {
            name: 'Magic dagger', base: 'MagicWeaponBase',
            damage: '2d5 + 2',
            attack: 2, defense: 1, weight: 0.2, value: 100
        },
        {
            name: 'Magic short sword', base: 'MagicWeaponBase',
            damage: '3d5 + 2',
            attack: 3, defense: 2, weight: 0.5, value: 300
        },
        {
            name: 'Magic sword', base: 'MagicWeaponBase',
            damage: '5d5 + 2',
            attack: 5, defense: 2, weight: 1.0, value: 500
        },
        {
            name: 'Magic runesword', base: 'MagicWeaponBase',
            damage: '3d10 + 2',
            attack: 5, defense: 5, weight: 0.8, value: 750
        },
        {
            name: 'Wintersbane', base: 'MagicWeaponBase',
            damage: '3d8 + 4',
            attack: 6, defense: 3, weight: 1.0, value: 1000
        },

        // ARMOUR
        {
            name: 'ArmourBase', type: 'armour', className: 'cell-item-armour',
            char: '[', dontCreate: true, attack: 0, defense: 0, protection: 0
        },

        // ARMOUR LEATHER
        {
            name: 'LeatherArmourBase', base: 'ArmourBase', dontCreate: true,
            material: 'leather', className: 'cell-item-leather'
        },
        {
            name: 'Leather helmet', base: 'LeatherArmourBase',
            weight: 0.3, defense: 1, armourType: 'head', value: 15
        },
        {
            name: 'Leather collar', base: 'LeatherArmourBase',
            weight: 0.2, protection: 1, armourType: 'neck', value: 15
        },
        {
            name: 'Leather boots', base: 'LeatherArmourBase',
            weight: 0.5, defense: 1, armourType: 'feet', value: 15
        },
        {
            name: 'Leather armour', base: 'LeatherArmourBase',
            weight: 2.0, defense: 2, protection: 2,
            armourType: 'chest', value: 30
        },
        {
            name: 'Leather shield', base: 'LeatherArmourBase',
            weight: 1.0, defense: 2, attack: -1,
            armourType: 'shield', value: 15
        },
        // ARMOUR IRON
        {
            name: 'IronArmourBase', base: 'ArmourBase', dontCreate: true,
            material: 'iron', className: 'cell-item-iron'
        },
        {
            name: 'Iron helmet', base: 'IronArmourBase',
            weight: 0.6, defense: 1, protection: 1,
            armourType: 'head', value: 45
        },
        {
            name: 'Iron collar', base: 'IronArmourBase',
            weight: 0.4, protection: 2,
            armourType: 'neck', value: 45
        },
        {
            name: 'Iron boots', base: 'IronArmourBase',
            weight: 1.2, defense: 1, protection: 1,
            armourType: 'feet', value: 45
        },
        {
            name: 'Iron armour', base: 'IronArmourBase',
            weight: 4.0, defense: 1, protection: 3,
            armourType: 'chest', value: 90
        },
        {
            name: 'Iron shield', base: 'IronArmourBase',
            weight: 2.0, defense: 3, attack: -2,
            armourType: 'shield', value: 40
        },

        // ARMOUR ICE (protective but heavy)
        {
            name: 'IceArmourBase', base: 'ArmourBase', dontCreate: true,
            material: 'permaice', className: 'cell-item-ice'
        },
        {
            name: 'Permaice helmet', base: 'IceArmourBase',
            weight: 1.8, defense: 0, protection: 3,
            armourType: 'head', value: 200
        },
        {
            name: 'Permaice collar', base: 'IceArmourBase',
            weight: 1.8, defense: 0, protection: 4,
            armourType: 'neck', value: 200
        },
        {
            name: 'Permaice boots', base: 'IceArmourBase',
            weight: 3.6, defense: 0, protection: 3,
            armourType: 'feet', value: 200
        },
        {
            name: 'Permaice armour', base: 'IceArmourBase',
            weight: 12.0, defense: 0, protection: 8,
            armourType: 'chest', value: 400
        },
        {
            name: 'Permaice shield', base: 'IceArmourBase',
            weight: 6.0, defense: 4, attack: -3, protection: 2,
            armourType: 'shield', value: 120
        },

        // ARMOUR RUBY GLASS (light, flexible)
        {
            name: 'RubyArmourBase', base: 'ArmourBase', dontCreate: true,
            material: 'ruby glass', className: 'cell-item-ruby-glass'
        },
        {
            name: 'Ruby glass helmet', base: 'RubyArmourBase',
            weight: 0.1, defense: 2, protection: 2,
            armourType: 'head', value: 100
        },
        {
            name: 'Ruby glass collar', base: 'RubyArmourBase',
            weight: 0.1, defense: 2, protection: 2,
            armourType: 'neck', value: 100
        },
        {
            name: 'Ruby glass boots', base: 'RubyArmourBase',
            weight: 0.2, defense: 3, protection: 2,
            armourType: 'feet', value: 200
        },
        {
            name: 'Ruby glass armour', base: 'RubyArmourBase',
            weight: 1.0, defense: 6, protection: 6,
            armourType: 'chest', value: 500
        },
        {
            name: 'Ruby glass shield', base: 'RubyArmourBase',
            weight: 0.4, defense: 5,
            armourType: 'shield', value: 250
        },

        // ARMOUR MAGIC (excellent D/P, very well rounded)
        {
            name: 'MagicArmourBase', base: 'ArmourBase', dontCreate: true,
            material: 'forium', className: 'cell-item-magic'
        },
        {
            name: 'Magic helmet', base: 'MagicArmourBase',
            weight: 0.6, defense: 3, protection: 4,
            armourType: 'head', value: 200
        },
        {
            name: 'Magic collar', base: 'MagicArmourBase',
            weight: 0.4, defense: 3, protection: 2,
            armourType: 'neck', value: 200
        },
        {
            name: 'Magic boots', base: 'MagicArmourBase',
            weight: 1.2, defense: 3, protection: 2,
            armourType: 'feet', value: 200
        },
        {
            name: 'Magic armour', base: 'MagicArmourBase',
            weight: 4.0, defense: 10, protection: 10,
            armourType: 'chest', value: 500
        },
        {
            name: 'Magic shield', base: 'MagicArmourBase',
            weight: 2.0, defense: 5, attack: -2,
            armourType: 'shield', value: 200
        },

        // MISSILES
        {
            name: 'MissileBase', className: 'cell-item-missile', char: '/',
            type: 'missile', dontCreate: true,
            attack: 1, damage: '1d1', range: 2, weight: 0.1
        },
        {
            name: 'Shuriken', base: 'MissileBase',
            damage: '1d6', range: 3, value: 20
        },
        {
            name: 'Dart', base: 'MissileBase',
            damage: '1d6 + 1', range: 4, value: 40
        },
        {
            name: 'Throwing axe', base: 'MissileBase',
            attack: 2, damage: '1d8 + 1', range: 3, value: 60, weight: 0.3
        },
        {
            name: 'Ruby glass throwing knife', base: 'MissileBase',
            className: 'cell-item-ruby-glass',
            attack: 3, damage: '1d10', range: 5, value: 80, weight: 0.1
        },
        {
            name: 'Magic Shuriken', base: 'MissileBase',
            attack: 3, className: 'cell-item-magic', material: 'forium',
            damage: '3d4 + 2', range: 5, value: 100, weight: 0.1
        },
        {
            name: 'Throwing axe of death', base: 'MissileBase',
            attack: 5, damage: '2d10 + 3', range: 3, value: 200, weight: 0.5
        },

        // POTIONS
        // Note: Each potion should define useItem method. See examples below.
        {
            name: 'PotionBase', className: 'cell-item-potion', char: '!',
            type: 'potion', dontCreate: true, weight: 0.1
        },
        {
            name: 'Healing potion', base: 'PotionBase',
            use: {heal: {hp: '3d4'}}, value: 10
        },
        {
            name: 'Potion of venom', base: 'PotionBase',
            use: {poison: {duration: '4d4 + 5', damage: '1d6', prob: '0.1'}},
            value: 30
        },
        {
            name: 'Potion of stunning', base: 'PotionBase',
            use: {stun: {duration: '2d4 + 1'}},
            value: 50
        },
        {
            name: 'Potion of cure poison', base: 'PotionBase',
            use: {cure: {effect: 'poison'}}, value: 80
        },
        {
            name: 'Potion of frost poison', base: 'PotionBase',
            use: {poison: {duration: '5d20', damage: '1d6 + 1', prob: '0.2'}},
            value: 100
        },
        {
            name: 'Healing elixir', base: 'PotionBase',
            use: {heal: {hp: '10d5'}}, value: 100
        },
        {
            name: 'Potion of spirit form', base: 'PotionBase',
            use: {addComp: {name: 'Ethereal', duration: '2d10'}},
            value: 100
        },

        // FOOD
        // Note: Food has energy X kcal/100g * 10. Food items can have weight,
        // but if
        // they don't, weight is then generated randomly. Value is also per
        // 100g.
        {
            name: 'FoodBase', className: 'cell-item-food', char: '%',
            weight: 0.1, type: 'food', dontCreate: true
        },
        {
            name: 'Dried meat', base: 'FoodBase', energy: 1300, value: 2
        },
        {
            name: 'Corn', base: 'FoodBase', energy: 1600, value: 3
        },
        {
            name: 'Beef', base: 'FoodBase', energy: 1000, value: 20, weight: 0.4
        },
        {
            name: 'Dried fruit', base: 'FoodBase', energy: 3500, value: 50
        },
        {
            name: 'Ghost pepper', base: 'FoodBase', energy: 100, value: 50,
            use: {stun: {duration: '3d3'}}
        },

        // TOOLS
        // Note: Each tool should have useItem method.
        {
            name: 'tool', type: 'tool', uses: 10
        },
        {
            name: 'Trapmaking kit', base: 'tool'
        },

        // SPIRIT GEMS
        {
            name: 'SpiritGemBase', className: 'cell-item-spiritgem', char: '*',
            weight: 0.1, type: 'spiritgem', dontCreate: true
        },
        {
            name: 'Lesser gem', base: 'SpiritGemBase', value: 30, weight: 3.0
        },
        {
            name: 'Normal gem', base: 'SpiritGemBase', value: 60, weight: 1.5
        },
        {
            name: 'Greater gem', base: 'SpiritGemBase', value: 100, weight: 0.2
        }

    ]

    //
    /*
    levels: [
        {

        },

    ],
   */

    // Dungeons contains multiple levels. Any levels specified above can be used
    // in the dungeon.
    /*
    dungeons: [

    ],
   */

};


module.exports = RGObjects;


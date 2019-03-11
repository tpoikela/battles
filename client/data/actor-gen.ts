/* Contains an actor generator. Generates 'object shells' which are then used
 * for the procedural generation. */

import RG from '../src/rg';
import {Random} from '../src/random';
import {mixNewShell} from './shell-utils';
import {BypassComp, resistance} from './actors';

export const ActorGen: any = {};

const RNG = new Random();

// Mods that can be applied to actors
const mods = {
    size: {
        tiny: [{strength: -2, speed: 15}],
        small: [{strength: -1, speed: 10}],
        normal: [],
        big: [{accuracy: -1, strength: 2}],
        huge: [{accuracy: -2, strength: 4, speed: -10}]
    },

    disposition: {
        friendly: [],
        neutral: [],
        hostile: []
    }

};

const randWeights = {
    size: {
        tiny: 1,
        small: 2,
        normal: 5,
        big: 2,
        huge: 1
    },

};

export interface IShell {
    [key: string]: any;
}

export interface StringMap<T> {
    [key: string]: T;
}

interface ShellProps {
    races: StringMap<IShell>;
    ranks: StringMap<IShell>;
    roleBases: StringMap<IShell>;
    roles: StringMap<StringMap<IShell> >;
}

const shellProps: ShellProps = {
    races: {},
    ranks: {},
    roles: {},
    roleBases: {}
};

const baseShell: IShell = {
    range: 1, danger: 1, speed: 100, brain: 'GoalOriented',
    damage: '1d6', attack: 1, defense: 1, hp: 5,
    protection: 0,
    enemies: RG.ACTOR_RACES,
    accuracy: 5, agility: 5, strength: 5, magic: 5, perception: 5,
    willpower: 5
};


shellProps.races = {
    arborean: {
        strength: 3, willpower: 5,
        type: 'arborean', prefix: 'arborean', char: 'a', colorbg: 'white'
    },
    elf: {
        strength: -1, agility: 4, accuracy: 4, magic: 3,
        type: 'elf', prefix: 'elven', char: 'e', colorbg: 'green'
    },
    fae: {
        type: 'fae', prefix: 'fae', char: 'f', colorbg: 'purple',
        speed: 10,
        strength: -2, magic: 3, addComp: ['Flying']
    },
    gnome: {
        strength: -1, magic: 3, perception: 5,
        type: 'gnome', prefix: 'gnomish', char: 'n', colorbg: 'beige'
    },
    ogre: {
        strength: 4, magic: -3, willpower: -3,
        type: 'ogre', prefix: 'ogre', char: 'O', colorbg: 'darkseagreen'
    },
    orc: {
        strength: 2, magic: -2, willpower: -2,
        type: 'orc', prefix: 'orc', char: 'o', colorg: 'darkseagreen'
    },
    ratling: {
        agility: 2, perception: 4,
        type: 'ratling', prefix: 'ratling', char: 'r', colorbg: 'grey'
    },
    vachefolk: {
        strength: 2,
        type: 'vachefolk', prefix: 'vachefolk', char: 'v', colorbg: 'brown'
    },
    valkyr: {
        strength: 3,
        type: 'valkyr', prefix: 'valkyr', char: 'V', colorbg: 'darkblue',
        addComp: [resistance('ICE', 'MEDIUM')]

    },
};

const raceNames = Object.keys(shellProps.races);

shellProps.roleBases = {
    melee: {
        attack: 2, defense: 2, protection: 2, danger: 1
    },
    magic: {
        magic: 3, willpower: 2, danger: 2,
        brain: 'SpellCaster', maxPP: 10, PP: 10,
        addComp: ['RegenEffect']
    },
    ranged: {
        accuracy: 3, agility: 1, danger: 2,
        addComp: [{
            random: [
                'EagleEye', 'StrongShot', 'ThroughShot', 'LongRangeShot',
                'RangedEvasion', 'CriticalShot'
            ]
        }]
    },
    stealth: {
        agility: 3, perception: 2, danger: 1
    }
};

shellProps.ranks = {
    commoner: {
        danger: 1, hp: 5
    },
    adventurer: {
        danger: 2, hp: 10
    },
    sergeant: {
        danger: 3,
        strength: 1, hp: 15
    },
    commander: {
        danger: 5,
        strength: 5, hp: 20,
        equip: ['Great battle axe', 'Steel armour', 'Steel helmet'],
    },
    steward: {
        danger: 5, hp: 20
    },
    lord: {
        danger: 5,
        strength: 7, hp: 20,
    },
    warlord: {
        danger: 7, hp: 25
    },
    captain: {
        danger: 7, hp: 25,
        strength: 7, agility: 3, accuracy: 3
    },
    prince: {
        danger: 5, hp: 20
    },
    princess: {
        danger: 5, agility: 5, magic: 5, hp: 20
    },
    queen: {
        colorfg: 'yellow',
        danger: 10, hp: 30,
        addComp: ['FirstStrike'],
    },
    king: {
        colorfg: 'red',
        strength: 7, attack: 7, defense: 7,
        danger: 12, hp: 40,
    },
    emperor: {
        colorfg: 'purple',
        danger: 15,
        strength: 10, attack: 10, defense: 10,
        hp: 50,
        addComp: [BypassComp(0.15)]
    },
    empress: {
        colorfg: 'palevioletred',
        danger: 17,
        accuracy: 10, agility: 10, attack: 10, defense: 10,
        hp: 45,
        addComp: [BypassComp(0.25), 'Charm']
    },
    overlord: {
        danger: 10, hp: 35,
        addComp: [BypassComp(0.10)]
    },
};
const rankNames = Object.keys(shellProps.ranks);

shellProps.roles = {
    melee: {
        axeman: {
            danger: 2, hp: 10
        },
        brave: {
            danger: 2, hp: 7,
            strength: 2
        },
        duelist: {
            danger: 3, hp: 13,
            agility: 3, strength: 2
        },
        elite: {
            danger: 5, hp: 23,
            strength: 4,
            addComp: ['CounterAttack']
        },
        fighter: {
            danger: 2, hp: 12,
            agility: 1, strength: 1,
        },
        footman: {
            danger: 1,
            equip: ['Longsword']
        },
        knight: {
            danger: 4, hp: 15,
            strength: 4,
        },
        phalanx: {
            danger: 1, hp: 10,
            defense: 4,
            equip: ['Spear']
        },
        scourger: {
            danger: 4, hp: 20,
            attack: 4, defense: 4, strength: 6,
        },
        judicator: {
            danger: 5, hp: 30,
            attack: 5, defense: 5, strength: 7,
            addComp: ['FirstStrike']
        },
        skirmisher: {
            danger: 3, hp: 15,
            attack: 3, defense: 3
        },
        hunter: {
            danger: 2, hp: 10,
            attack: 3, defense: 3
        },
        warrior: {
            danger: 2, hp: 10,
            attack: 3, defense: 3
        }
    },
    magic: {
        adept: {
            danger: 1, pp: 3, maxPP: 3, hp: 5,
            spells: ['EnergyArrow']
        },
        archmage: {
            danger: 15, pp: 40, maxPP: 40, hp: 30,
            spells: [
                'PowerDrain',
                {random: ['WaterBolt', 'SlimeBolt', 'FrostBolt']},
                {random: ['Heal', 'MagicArmor', 'Charm']},
                {random: ['IceArrow', 'PoisonArrow', 'ArrowOfWebs']},
            ]
        },
        bard: {
            danger: 3,
            magic: 5, pp: 7, maxPP: 7, hp: 7,
            spells: ['SummonAnimal'],
        },
        cleric: {
            danger: 1, magic: 2, willpower: 3,
            pp: 7, maxPP: 7,
            spells: ['Heal']
        },
        healer: {
            danger: 1,
            magic: 2, pp: 7, maxPP: 7,
            spells: ['Heal']
        },
        /* herbalist: {
        },*/
        mage: {
            danger: 5, magic: 5, willpower: 5, hp: 13,
            spells: [{random: ['RingOfFire', 'RingOfFrost']}]
        },
        telepath: {
            danger: 4, pp: 12, maxPP: 12, hp: 12,
            magic: 4, willpower: 4,
            spells: ['SummonFlyingEyes', 'Telepathy']
        },
        necromancer: {
            danger: 5, pp: 10, maxPP: 10, hp: 15,
            spells: ['AnimateDead']
        },
        runemage: {
            danger: 3, pp: 15, maxPP: 15, hp: 15,
            spells: ['StunningTouch'],
        },
        shaman: {
            danger: 3, pp: 15, maxPP: 15, hp: 10,
            spells: ['IcyPrison']
        },
        summoner: {
            danger: 7, pp: 15, maxPP: 15, hp: 15,
            spells: [{random: ['SummonKin', 'SummonAirElemental']}]
        },
        wizard: {
            danger: 10, maxPP: 30, pp: 30, hp: 15,
            magic: 7, willpower: 7,
            spells: [
                {random: ['CrossBolt', 'FrostBolt', 'LightningBolt']},
                {random: ['Heal', 'MagicArmor', 'Paralysis']}
            ]
        },
    },
    ranged: {
        arbalist: {
            danger: 3, hp: 10,
            equip: ['Wooden crossbow', {name: 'Wooden bolt', count: 10}]
       },
        archer: {
            danger: 3, hp: 5,
              equip: [
                  'Wooden bow', {name: 'Wooden arrow', count: 10},
                  'Steel bow', {name: 'Steel arrow', count: 15}
              ]
        },
        bolter: {
            danger: 4, hp: 5,
            equip: ['Steel crossbow', {name: 'Steel bolt', count: 7}]
        },
        rifleman: {
            danger: 6, hp: 15,
            equip: ['Rifle', {name: 'Steel bullet', count: 7}]
        },
        darter: {
            danger: 2, hp: 5,
            equip: [{name: 'Iron dart', count: 9}]
        },
        thrower: {
            danger: 1,
            equip: [{name: 'Throwing axe', count: 7}]
        },
        catapulter: {
            danger: 2, hp: 15,
            strength: 5, speed: -5,
            equip: [{name: 'Large rock', count: 4}]
        },
        sharpshooter: {
            danger: 8, hp: 20,
            accuracy: 5, agility: 5,
            equip: ['Rifle', {name: 'Steel bullet', count: 10}],
            fovrange: 7,
        },
        slinger: {
            danger: 1, hp: 3,
            equip: [{name: 'Rock', count: 10}]
        }
    },
    stealth: {
        assassin: {
            danger: 3,
            addComp: [resistance('POISON', 'MEDIUM')],
        },
        acrobat: {
            danger: 2,
            brain: 'Thief', speed: 20
        },
        rogue: {
        },
        scout: {
            danger: 2, speed: 10, fovrange: 7
        },
        thief: {
            danger: 2,
            brain: 'Thief'
        }
    },
};
const roleTypes: string[] = Object.keys(shellProps.roles);

/* Given a base shell, generates an array of actor object shells. */
ActorGen.genActors = function(nActors: number): IShell[] {
    const result = [];
    for (let i = 0; i < nActors; i++) {
        result.push(ActorGen.genRandShell());
    }
    return result;
};

ActorGen.genRandShell = function(): IShell {
    const numRoles = RNG.getUniformInt(1, 2);
    const raceName = RNG.arrayGetRand(raceNames);
    const raceShell: IShell = shellProps.races[raceName];

    const rankName = RNG.arrayGetRand(rankNames);
    const rankShell: IShell = shellProps.ranks[rankName];

    // Get the role types to be used (ie stealth/melee/magic)
    const rTypes: string[] = RNG.getUniqueItems(roleTypes, numRoles);

    const roleBaseShells = rTypes.map(r => shellProps.roleBases[r]);

    // Then find shells for these roles
    let fullRoleName = '';
    const roleNames = [];
    const usedRoleShells: IShell[] = rTypes.map((r: string) => {
        const roleShells: StringMap<IShell> = shellProps.roles[r];
        const roleName = RNG.arrayGetRand(Object.keys(roleShells));
        fullRoleName += ' ' + roleName;
        roleNames.push(roleName);
        return roleShells[roleName];
    });

    const allShells = [baseShell, raceShell, rankShell]
        .concat(roleBaseShells)
        .concat(usedRoleShells);
    const newShell = mixNewShell(allShells);
    if (rankName !== 'commoner') {
        newShell.name = raceShell.prefix + fullRoleName + ' ' + rankName;
    }
    else {
        newShell.name = raceShell.prefix + fullRoleName;
    }
    newShell.roleTypes = rTypes;
    newShell.roles = roleNames;
    return newShell;
};

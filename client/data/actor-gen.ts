/* Contains an actor generator. Generates 'object shells' which are then used
 * for the procedural generation. */

import RG from '../src/rg';
import {Random} from '../src/random';
import {mixNewShell, resistance} from './shell-utils';
import {BypassComp} from './actors';
import {IShell, ShellConstr, StringMap, TShellFunc} from '../src/interfaces';

export const ActorGen: any = {};

const RNG = new Random();

// Mods that can be applied to actors
/*
const mods: any = {
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
*/

/*
const randWeights: any = {
    size: {
        tiny: 1,
        small: 2,
        normal: 5,
        big: 2,
        huge: 1
    },

};
*/

interface ShellProps {
    races: StringMap<IShell>;
    ranks: StringMap<IShell>;
    roleBases: StringMap<IShell>;
    roles: StringMap<StringMap<IShell> >;
}

export const shellProps: ShellProps = {
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
    naga: {
        strength: 2,
        type: 'naga', prefix: 'naga', char: 'N', colorbg: 'darkgreen',
        addComp: [resistance('POISON', 'STRONG')]
    },
    ogre: {
        strength: 4, magic: -3, willpower: -3,
        type: 'ogre', prefix: 'ogre', char: 'O', colorbg: 'darkseagreen'
    },
    orc: {
        strength: 2, magic: -2, willpower: -2,
        type: 'orc', prefix: 'orc', char: 'o', colorbg: 'darkseagreen'
    },
    ratling: {
        agility: 2, perception: 4,
        type: 'ratling', prefix: 'ratling', char: 'r', colorbg: 'grey'
    },
    teradin: {
        agility: 2, accuracy: 3,
        type: 'teradin', prefix: 'teradin', char: 'T', colorbg: 'white',
        addComp: ['Flying']
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
    viking: {
        strength: 4, agility: 3,
        type: 'viking', prefix: 'viking', char: 'K', colorbg: 'Azure',
        addComp: [resistance('ICE', 'MEDIUM')]
    },
};
scaleStats(shellProps.races, 1.5, 1);

const raceNames = Object.keys(shellProps.races);

/* One rank is chosen for each actor. This has a big impact on HP. */
shellProps.ranks = {
    commoner: {
        danger: 1, hp: 5,
        colorfg: 'brown',
        damage: 1
    },
    peon: {
        danger: 1, hp: 5,
        colorfg: 'brown',
        damage: 1
    },
    thrall: {
        danger: 1, hp: 7,
        damage: 1
    },
    adventurer: {
        danger: 2, hp: 10,
        damage: 2
    },
    sergeant: {
        danger: 3,
        strength: 1, hp: 15,
        damage: 3,
        colorfg: 'lightblue'
    },
    lieutenant: {
        danger: 4,
        damage: 4,
        strength: 3, hp: 20,
        colorfg: 'blue'
    },
    commander: {
        danger: 5,
        damage: 5,
        strength: 5, hp: 20,
        equip: ['Great battle axe', 'Steel armour', 'Steel helmet'],
        colorfg: 'orange'
    },
    steward: {
        colorfg: 'steelblue',
        danger: 5, hp: 20,
        damage: 5,
    },
    lord: {
        colorfg: 'LightGoldenRodYellow',
        danger: 5,
        damage: 5,
        strength: 7, hp: 20,
    },
    hero: {
        colorfg: 'green',
        danger: 6,
        damage: 6,
        strength: 4, accuracy: 4, agility: 4, speed: 7,
        hp: 25,
    },
    warlord: {
        danger: 7, hp: 25,
        colorfg: 'black',
        damage: 7
    },
    captain: {
        danger: 7, hp: 25,
        strength: 7, agility: 3, accuracy: 3,
        colorfg: 'salmon',
        damage: 7
    },
    prince: {
        colorfg: 'MediumPurple',
        danger: 5, hp: 20,
        damage: 5,
    },
    princess: {
        colorfg: 'pink',
        danger: 5, agility: 5, magic: 5, hp: 20,
        damage: 5,
    },
    queen: {
        colorfg: 'yellow',
        danger: 10, hp: 30,
        addComp: ['FirstStrike'],
        damage: 10,
    },
    king: {
        colorfg: 'red',
        strength: 7, attack: 7, defense: 7,
        danger: 12, hp: 40,
        damage: 12,
    },
    emperor: {
        colorfg: 'purple',
        danger: 15,
        strength: 10, attack: 10, defense: 10,
        hp: 50,
        addComp: [BypassComp(0.15)],
        damage: 15,
    },
    empress: {
        colorfg: 'palevioletred',
        danger: 17,
        damage: 17,
        accuracy: 10, agility: 10, attack: 10, defense: 10,
        hp: 45,
        addComp: [BypassComp(0.25), 'Charm']
    },
    overlord: {
        colorfg: 'orangered',
        danger: 10, hp: 35,
        damage: 10,
        addComp: [BypassComp(0.10)]
    },
};
const rankNames = Object.keys(shellProps.ranks);
scaleStats(shellProps.ranks, 1.5, 1);

shellProps.roleBases = {
    melee: {
        attack: 2, defense: 2, protection: 2, danger: 1,
        damage: '1d8'
    },
    magic: {
        magic: 3, willpower: 2, danger: 2,
        brain: 'SpellCaster', maxPP: 10, PP: 10,
        addComp: ['Regeneration'],
        damage: '1d4'
    },
    ranged: {
        accuracy: 3, agility: 1, danger: 2,
        addComp: [{
            random: [
                'EagleEye', 'StrongShot', 'ThroughShot', 'LongRangeShot',
                'RangedEvasion', 'CriticalShot'
            ]
        }],
        damage: '1d6'
    },
    stealth: {
        defense: 2,
        agility: 3, perception: 2, danger: 0,
        damage: '1d5'
    }
};
scaleStats(shellProps.roleBases, 1.5, 1);

/* Contains a list specific roles for each role base type. */
shellProps.roles = {

    // TODO these need more flavor, as many are identical/similar
    melee: {
        soldier: {
            danger: 1, hp: 5, attack: 1, defense: 1,
            damage: '1d4',
        },
        axeman: {
            danger: 2, hp: 10, damage: '1d6',
        },
        brave: {
            danger: 2, hp: 7,
            strength: 2,  damage: '1d6',
        },
        duelist: {
            danger: 3, hp: 13,
            agility: 3, strength: 2,
            addComp: ['RangedEvasion'],
            damage: '1d8',
        },
        elite: {
            danger: 5, hp: 23,
            strength: 4,
            addComp: ['CounterAttack'],
            damage: '2d6',
        },
        fighter: {
            danger: 2, hp: 12,
            agility: 1, strength: 1,
        },
        footman: {
            danger: 1,
            damage: '1d4',
            equip: ['Longsword']
        },
        knight: {
            danger: 4, hp: 15,
            strength: 4,
        },
        phalanx: {
            danger: 1, hp: 10,
            defense: 4,
            equip: ['Spear'],
            damage: '1d4',
        },
        scourger: {
            danger: 4, hp: 20,
            attack: 4, defense: 4, strength: 6,
        },
        judicator: {
            danger: 5, hp: 30,
            attack: 5, defense: 5, strength: 7,
            addComp: ['FirstStrike'],
            damage: '2d6',
        },
        skirmisher: {
            danger: 3, hp: 15,
            attack: 3, defense: 3,
            damage: '2d3',
        },
        hunter: {
            danger: 2, hp: 10,
            attack: 3, defense: 3,
            damage: '1d6',
        },
        warrior: {
            danger: 2, hp: 10,
            attack: 3, defense: 3,
            damage: '1d6',
        },
        berserker: {
            danger: 5, hp: 20,
            attack: 8, defense: 3,
            strength: 6,
            addComp: ['RangedEvasion', resistance('ICE', 'MEDIUM')],
            damage: '2d6',
        },
    },

    magic: {
        adept: {
            danger: 1, pp: 3, maxPP: 3, hp: 5,
            spells: ['EnergyArrow']
        },
        archmage: {
            danger: 15, pp: 50, maxPP: 50, hp: 30,
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
            danger: 2, hp: 5, speed: 5,
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
roleTypes.forEach((roleType: string) => {
    scaleStats(shellProps.roles[roleType], 1.5, 1);
});


const allRoleShells = roleTypes.reduce((acc, rType: string, i: number, arr: string[]) => {
    return Object.assign(acc, shellProps.roles[rType]);
}, {});

const allRolenames = Object.keys(allRoleShells).reduce((acc, key, i, arr) => {
    acc.push(key);
    return acc;
}, [] as string[]);

/* Generates a random actor shell using the following formula:
 * 1. Pick a race from shellProps.races
 * 2. Pick a rank from shellProps.ranks
 * 3. Pick up to 2 roles:
 *   - Choose base type for role from shellProps.roleBases
 *   - Choose actual role from shellProps.roles
 * 4. Generate the full actor based based on 1. - 3.
 * 5. Combine object data from 1. - 3. and return the result.
 */
ActorGen.minNumRoles = 1;
ActorGen.maxNumRoles = 2;
ActorGen.genRandShell = function(): IShell {
    const numRoles = RNG.getUniformInt(ActorGen.minNumRoles, ActorGen.maxNumRoles);
    const raceName = RNG.arrayGetRand(raceNames);
    const raceShell: IShell = shellProps.races[raceName];

    const rankName = RNG.arrayGetRand(rankNames);
    const rankShell: IShell = shellProps.ranks[rankName];

    // Get the role types to be used (ie stealth/melee/magic)
    const rTypes: string[] = RNG.getUniqueItems(roleTypes, numRoles);

    const roleBaseShells: IShell[] = rTypes.map(r => shellProps.roleBases[r]);

    // Then find shells for these roles
    // let fullRoleName = '';
    const roleNames: string[] = [];
    const usedRoleShells: IShell[] = rTypes.map((r: string) => {
        const roleShells: StringMap<IShell> = shellProps.roles[r];
        const roleName = RNG.arrayGetRand(Object.keys(roleShells));
        // fullRoleName += ' ' + roleName;
        roleNames.push(roleName);
        return roleShells[roleName];
    });

    const allShells: IShell[] = [baseShell, raceShell, rankShell]
        .concat(roleBaseShells)
        .concat(usedRoleShells);
    const newShell: IShell = mixNewShell(allShells);
    newShell.name = formatShellName(raceShell, roleNames, rankName);
    newShell.roleTypes = rTypes;
    newShell.roles = roleNames;
    newShell.race = raceName;
    return newShell;
};

/* Generates the given number of actor shells from data in shellProps. */
ActorGen.genActors = function(nActors: number): IShell[] {
    const result = [];
    for (let i = 0; i < nActors; i++) {
        result.push(ActorGen.genRandShell());
    }
    return result;
};

/* Generates a random shell using acceptance function. */
ActorGen.getRandShellWith = function(constrOrFunc: TShellFunc, tries: number = 100): IShell {
    let maxTries = tries;
    let shell = null;
    while (maxTries >= 0) {
        shell = ActorGen.genRandShell();
        if (constrOrFunc(shell)) {break;}
        --maxTries;
    }
    return shell;
};

ActorGen.getRaces = function(): string[] {
    return raceNames;
};

/*
ActorGen.genShellWithRole = function(role: string[]): IShell {
    const roleBase = role[0];
    let roleActual: IShell = null;
    if (role.length > 1) {
        roleActual = shellProps.roles[roleBase][role[1]];
    }
    else {
        roleActual = RNG.arrayGetRand(shellProps.roles[roleBase]);
    }
};
*/

// How to generate the following:
//   1. Human assassin
//   2. Orc assassin archer
//   3. Human assassin prince
//   4. Human assassin mage queen

/* Generates a shell with given constraints.
 * */
ActorGen.genShell = function(conf: ShellConstr): IShell {
    let rankShell: null | IShell = null;
    let rankName = '';
    if (conf.rank) {
        rankName = conf.rank;
        rankShell = shellProps.ranks[conf.rank];
    }
    else {
        rankName = RNG.arrayGetRand(rankNames);
        rankShell = shellProps.ranks[rankName];
    }

    let raceName = conf.race;
    if (!conf.race) {
        raceName = getRandomRace();
    }

    const raceShell: IShell = shellProps.races[raceName];

    // Select base roles for this actor
    let rTypes: string[] = conf.roleTypes;
    if (!conf.roleTypes) {
        const numRoles = RNG.getUniformInt(1, 2);
        rTypes = RNG.getUniqueItems(roleTypes, numRoles);
    }
    const roleBaseShells: IShell[] = rTypes.map(r => shellProps.roleBases[r]);

    // Select the roles for this actor
    const roleNames: string[] = conf.roles || [];
    if (!conf.roles) {
        rTypes.forEach((rType: string) => {
            const rTypeShells: StringMap<IShell> = shellProps.roles[rType];
            const roleName = RNG.arrayGetRand(Object.keys(rTypeShells));
            roleNames.push(roleName);
        });
    }

    const roleShells: IShell[] = [];
    roleNames.forEach((roleName: string) => {
        roleShells.push(allRoleShells[roleName]);
    });

    const shells = [baseShell, raceShell, rankShell]
        .concat(roleShells)
        .concat(roleBaseShells);
    const newShell = mixNewShell(shells);
    newShell.name = formatShellName(raceShell, roleNames, rankName);
    // newShell.roleTypes = rTypes;
    newShell.roles = roleNames;
    newShell.rank = rankName;
    newShell.race = raceName;
    if (!newShell.color && !newShell.colorfg) {
        newShell.colorfg = getColorFg(roleNames);
    }
    return newShell;
};

//---------------------------------------------------------------------------
// Non-exported (for now) HELPERS
//---------------------------------------------------------------------------

/* Formats the new shell name based on give data. */
function formatShellName(raceShell: IShell, roleNames: string[], rankName: string): string {
    const fullRoleName = roleNames.join(' ');
    let name = '';
    if (rankName !== 'commoner') {
        name = raceShell.prefix + ' ' + fullRoleName + ' ' + rankName;
    }
    else {
        name = raceShell.prefix + ' ' + fullRoleName;
    }
    return name;
}


function getRandomRace(): string {
    return RNG.arrayGetRand(raceNames);
}

function getColorFg(roleNames: string[]): string {
    if (roleNames.length > 1) {
        let idx0 = allRolenames.indexOf(roleNames[0]);
        let idx1 = allRolenames.indexOf(roleNames[1]);
        idx0 = idx0 % RG.COLORS.length;
        idx1 = idx1 % RG.COLORS.length;
        const color0 = RG.COLORS[idx0];
        const color1 = RG.COLORS[idx1];
        return color0;
    }
    let idx = allRolenames.indexOf(roleNames[0]);
    idx = idx % RG.COLORS.length;
    return RG.COLORS[idx];
}


function scaleStats(map: StringMap<IShell>, mult: number, add: number): void {
    Object.keys(map).forEach((key: string) => {
        const shell: IShell = map[key];
        RG.STATS_LC.forEach((val: string) => {
            if (shell.hasOwnProperty(val)) {
                shell[val] = Math.round(mult * shell[val]) + add;
            }
        });
    });
}

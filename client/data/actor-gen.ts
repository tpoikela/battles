/* Contains an actor generator. Generates 'object shells' which are then used
 * for the procedural generation. */

export const ActorGen: any = {};

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

const weights = {
    size: {
        tiny: 1,
        small: 2,
        normal: 5,
        big: 2,
        huge: 1
    },

};

const roles: any = {
    ranged: ['arbalist', 'archer', 'bolter', 'rifleman', 'darter', 'thrower',
        'catapulter'],
    melee: ['axeman', 'brave', 'duelist', 'elite', 'fighter', 'footman',
        'phalanx', 'scourger', 'judicator',
        'skirmisher', 'hunter', 'warrior'],
    magic: ['adept', 'archmage', 'healer', 'herbalist', 'mage', 'shaman',
        'summoner', 'runemage', 'wizard',],
    rank: ['townsfolk', 'commander', 'lord', 'warlod', 'prince', 'princess', 'queen',
        'king', 'emperor']
};

/* Given a base shell, generates an array of actor object shells. */
ActorGen.genActors = function(base) {
    // TODO
};

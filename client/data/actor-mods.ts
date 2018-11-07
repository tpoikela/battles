/* This file contains modifications that are applied to specific actors. */

const ActorMods = {};

ActorMods.bearfolk = {
    description: '',
    stats: {
        agility: -2,
        strength: 3
    },
    player: { // Player only section
    }
};

ActorMods.catfolk = {
    stats: {
        agility: 3,
        perception: 2,
        strength: -2
    },
    player: { // Player only section
    }
};

ActorMods.dogfolk = {
    stats: {
        agility: 2,
        perception: 3
    },
    player: { // Player only section
    }
};

ActorMods.dwarf = {
    stats: {
        agility: -1,
        strength: 2,
        willpower: 1
    },
    player: { // Player only section
    }
};

ActorMods.goblin = {
    stats: {
        accuracy: 1,
        agility: 2
    },
    player: { // Player only section
    }
};

ActorMods.human = {
    stats: {
        accuracy: 3,
        magic: 1,
        willpower: 1
    },
    player: { // Player only section
    }
};

ActorMods.hyrkhian = {
    stats: {
        magic: 2,
        willpower: 2
    },
    player: { // Player only section
    }
};

ActorMods.wildling = {
    stats: {
        accuracy: 1,
        agility: 1,
        perception: 4
    },
    player: { // Player only section
    }
};

ActorMods.wolfclan = {
    stats: {
        strength: 1,
        magic: 2,
        willpower: 2
    },
    player: { // Player only section
    }
};

module.exports = ActorMods;

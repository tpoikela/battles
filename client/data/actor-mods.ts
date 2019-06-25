/* This file contains modifications that are applied to specific actors. */

import {ItemConstr, ItemConstrMap, IActorMods} from '../src/interfaces';


export const ActorMods: {[key: string]: IActorMods} = {};

ActorMods.bearfolk = {
    description: '',
    stats: {
        agility: -2,
        strength: 3
    },
    player: { // Player only section
        startingItems: [
        ],
        equipment: [
            {name: 'Chain boots', count: 1}
        ]
    }
};

ActorMods.catfolk = {
    stats: {
        agility: 3,
        perception: 2,
        strength: -2
    },
    player: { // Player only section
        startingItems: [
        ],
        equipment: [
        ]
    }
};

ActorMods.dogfolk = {
    stats: {
        agility: 2,
        perception: 3
    },
    player: { // Player only section
        Spellsinger: {
            startingItems: [
                {func: item => item.type === 'rune', count: 1}
            ],
        },
        startingItems: [
        ],
        equipment: [
        ]
    }
};

ActorMods.dwarf = {
    stats: {
        agility: -1,
        strength: 2,
        willpower: 1
    },
    player: { // Player only section
        Adventurer: {
        },
        Blademaster: {
            equipment: [
                {name: 'Battle axe', count: 1}
            ]
        },
        startingItems: [
        ],
        equipment: [
        ]
    }
};

ActorMods.goblin = {
    stats: {
        accuracy: 1,
        agility: 2
    },
    player: { // Player only section
        startingItems: [
            {name: 'Rock', count: 5}
        ],
        equipment: [
            {name: 'Rock', count: 3}
        ]
    }
};

ActorMods.human = {
    stats: {
        accuracy: 3,
        magic: 1,
        willpower: 1
    },
    player: { // Player only section
        startingItems: [
        ],
        equipment: [
        ]
    }
};

ActorMods.hyrkhian = {
    stats: {
        magic: 2,
        willpower: 2
    },
    player: { // Player only section
        Cryomancer: {
            startingItems: [
                {name: 'Potion of power', count: '2d2'}
            ],
        },
        startingItems: [
            {name: 'Lesser spirit gem', count: 1}
        ],
        equipment: [
        ]
    }
};

ActorMods.wildling = {
    stats: {
        accuracy: 1,
        agility: 1,
        perception: 4
    },
    player: { // Player only section
        startingItems: [
        ],
        equipment: [
        ]
    }
};

ActorMods.wolfclan = {
    stats: {
        strength: 1,
        magic: 2,
        willpower: 2
    },
    player: { // Player only section
        startingItems: [
        ],
        equipment: [
        ]
    }
};

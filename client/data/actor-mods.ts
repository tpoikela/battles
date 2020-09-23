/* This file contains modifications that are applied to specific actors. */

import {ItemConstr, ItemConstrMap, IActorMods} from '../src/interfaces';


export const ActorMods: {[key: string]: IActorMods} = {};

ActorMods.bearfolk = {
    description: '',
    stats: {
        magic: -2,
        agility: -3,
        strength: 5,
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
        agility: 6,
        perception: 4,
        strength: -3
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
        agility: 4,
        perception: 5
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
        agility: -2,
        strength: 3,
        willpower: 3
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
        magic: -3,
        accuracy: 3,
        agility: 4,
        spirituality: -3
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
        accuracy: 6,
        magic: 2,
        willpower: 2,
        spirituality: 2
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
        magic: 5,
        willpower: 5,
        spirituality: 3
    },
    player: { // Player only section
        Cryomancer: {
            startingItems: [
                {name: 'Potion of power', count: '1d2'}
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
        accuracy: 2,
        agility: 2,
        perception: 6
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
        strength: 3,
        magic: 4,
        willpower: 4
    },
    player: { // Player only section
        startingItems: [
        ],
        equipment: [
        ]
    }
};

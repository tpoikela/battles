/* This file contains mining related data. */

import {ELEM} from './elem-constants';
import {ConstBaseElem, RandWeights, IConstraint} from '../src/interfaces';

export interface MineItemEntry {
    always: string[];
    rand?: RandWeights;
    constraint?: IConstraint;
}

export type TWall2Items = {[key: string]: MineItemEntry};

// Used to change wall to floor based on the type
export const Wall2Floor: {[key: string]: ConstBaseElem} = {
    'wall': ELEM.FLOOR,
    'walldungeon': ELEM.FLOOR_DUNGEON,
    'wallwooden': ELEM.FLOOR_HOUSE,
    'wallcave': ELEM.FLOOR_CAVE,
    'wallcrypt': ELEM.FLOOR_CRYPT,
    'wallcastle': ELEM.FLOOR_CASTLE,
};

export const Wall2Items: TWall2Items = {
    'wall': {
        always: ['piece of stone'],
        rand: {nothing: 97, goldcoin: 3}
    },
    'walldungeon': {
        always: ['piece of stone'],
        rand: {nothing: 90, goldcoin: 5},
    },
    'wallwooden': {always: ['piece of wood']},
    'wallcave': {
        always: ['piece of stone'],
        rand: {nothing: 200,
            goldcoin: 16,
            'iron ore': 8, 'copper ore': 8, amethyst: 8,
            topaz: 4, 'mithril ore': 4,
            sapphire: 2, emerald: 2, 'adamantium ore': 2,
            diamond: 1,
        },
        // constraint: {},
    },
    'wallcrypt': {
        always: ['piece of stone'],
        rand: {
            nothing: 90, goldcoin: 3,
            topaz: 3, amethyst: 3, 'lapis lazuli': 3
        }
    },
    'wallcastle': {
        always: ['piece of stone'],
        rand: {
            nothing: 90, goldcoin: 10
        }
    },
    'wallice': {
        always: ['piece of ice'],
        rand: {
            nothing: 90,
            'permaice ore': 3, 'ice diamond': 1, 'froststone': 3,
            'adamantium ore': 4
        }
    },
};

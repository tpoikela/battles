
/* tslint:disable */

const ejs = require('ejs');

import RG from '../src/rg';
import {Random} from '../src/random';
import {IConstraint} from '../src/interfaces';

const RNG = Random.getRNG();

export interface ILoreEntry {
    level?: IConstraint[];
    text: string[];
}

export interface LoreData {
    generic: ILoreEntry[];
    mainQuest: ILoreEntry[];
    directions: ILoreEntry[];
    northDirections: ILoreEntry[];
    genericTopics: string[];
    typesDirections: ILoreEntry[];

    getRand?: (key: string) => ILoreEntry;
    getRandText?: (key: string) => string;
}

export const Lore: LoreData = {
    generic: [],
    mainQuest: [],

    directions: [],
    northDirections: [],
    genericTopics: ['generic', 'mainQuest'],
    typesDirections: [],
};

Lore.getRand = (key: string): ILoreEntry => {
    checkKeyError(key);
    const data = Lore[key] as ILoreEntry[];
    console.log('WWW:', data);
    return RNG.arrayGetRand(data);
};

Lore.getRandText = (key: string): string => {
    checkKeyError(key);
    const randCateg: ILoreEntry[] = Lore[key];
    const textData = RNG.arrayGetRand(randCateg);
    return RNG.arrayGetRand(textData.text);
};

export interface LoreFormatArgs {
    dirPre?: string;
    dir?: string;
    dirPost?: string;
    typePre?: string;
    type?: string;
    typePost?: string;
    namePre?: string;
    name?: string;
    namePost?: string;
    asker?: object;
    level?: object;
    target?: object;
}

// To check if variable used for substitution contains function call
const funcRe = new RegExp('[().]+');

// Each info can be retrieved based on 3 pieces of info:
// 1. Current level (and its parent zone context)
// 2. Target actor of the query 
// 3. Actor who initiated the query (player)
//
// An example: {
//   text: 'There is a dungeon there', // Info provided in the reply
//   level: [
//      {op: 'eq', func: 'getParent.getName', value: 'Deadtown'}
//   ],
//   target: [
//   ],
//   asker: [
//   ]
// }
//

// Special variables which will be formatted:
// <%= target.getXXX %> is replaced with value from func call target.getXXX()
// <%= asker.getXXX.getYYY %> is replaced with value from call asker.getXXX().getYYY()

Lore.generic = [
    {
        level: [
            {op: 'match', func: 'getParentZone.getName', value: 'Home town'}
        ],
        text: [
            prep`Welcome home ${'asker.getName()'}!`,
            prep`Are you returning home from an adventure, ${'asker.getName()'}?`
        ]
    },
    {
        text: [
            'An instant of one second is a luxury amidst the heat of the battle',
            'One day, all matter will be frozen and all movement will cease'
        ]
    }
];

Lore.mainQuest = [
    {
        text: [
            "There is something evil gathering its troops in the northern arctics",
            "To reach the north, you need to pass through several great mountain walls",
        ],
    },
    {
        text: [
            "I've heard rumors of a great northern city carved into the mountainside",
        ],
    },
    {
        text: [
            "Hyrkhians who are natives of this land have a built a great city into the mountain",
            "They say you need to pass through mighty dwarven fortress to reach the cold north",
        ],
    },
    {
        text: [
            "Adventurers have seen strange and cold-looking creatures gathering near an abandoned fort",
        ],
    },
    {
        text: [
            "A traveller had seen a gigantic black tower rising into the sky from beneath the icy arctic.",
        ]
    },
];


Lore.directions = [
    {text: [prep`There might be something interesting in ${'dir'} to explore`]},
    {text: [prep`Travel ${'dir'} if you are looking for adventures`]},
    {text: [prep`I've heard rumors of something going on in ${'dir'} from here`]},
];

Lore.typesDirections = [
    {text: [prep`There is ${'name'} ${'dir'} from here.`]},
    {text: [prep`If you travel ${'dir'}, you should find a ${'name'} there.`]},
];

Lore.northDirections = Lore.directions;

/* Use this to preprocess template literals with your favourite js template
 * engine. */
export function prep(strings: TemplateStringsArray, ...args: any[]) {
    let s = strings[0];
    for (let i = 0; i < args.length; i++) {
        if (!hasFuncCall(args[i])) {s += addExtraString(args[i], 'Pre');}
        s += '<%= ' + args[i] + ' %>';
        if (!hasFuncCall(args[i])) {s += addExtraString(args[i], 'Post');}
        s += strings[i + 1];
    }
    // Could pre-compile also templates and return them as functions?
    return s;
}

/* Given two string, ie 'aaa' and 'Pre', returns ejs template string with
 * condition to check if aaaPre exists, and insertion of aaaPre in that case. */
function addExtraString(str: string, suff: string): string {
    const newName = `${str}${suff}`;
    return `<% if (typeof ${newName} !== "undefined") { %><%= ${newName} %><% } %>`;
}

export function compile(text: string): (arg: any) => string {
    return ejs.compile(text);
}

export function format(text: string, args: LoreFormatArgs): string {
    return ejs.compile(text)(args);
};

/* Creates a message which points player to go north. */
export function createDirNorthMsg(dir: string): string {
    const choices: ILoreEntry = RNG.arrayGetRand(Lore.northDirections);
    const templ: string = RNG.arrayGetRand(choices.text);
    const msg =  format(templ, {dir});
    return msg;
}

export function createLoreMsg(dir: string): string {
    const choices: ILoreEntry = RNG.arrayGetRand(Lore.northDirections);
    const templ: string = RNG.arrayGetRand(choices.text);
    const msg =  format(templ, {dir});
    return msg;
}

/* Creates the object which is used to create and initialize Lore component for
 * this zone. */
export function createLoreObj(msg: string, topic: string, metaData?: object) {
    const compObj: any = {
        comp: 'Lore', func: {
            updateTopics: {
                [topic]: [msg]
            }
        }
    };
    if (metaData) {
        compObj.func.updateMetaData = metaData;
    }
    return compObj;
}

function hasFuncCall(str: string): boolean {
    return funcRe.test(str);
}

function checkKeyError(key: string): void {
    if (!Lore.hasOwnProperty(key)) {
        RG.err('lore.ts', 'checkKeyError', 
           `Key ${key} does not exist`);
    }
}

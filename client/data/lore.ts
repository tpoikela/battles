
/* tslint:disable */

export interface LoreData {
    generic: any[];
    mainQuest: any;
}

export const Lore: LoreData = {
    generic: [],
    mainQuest: {}
};

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

console.log(JSON.stringify(Lore.generic));

/* Use this to preprocess template literals with your favourite js template
 * engine. */
function prep(strings, ...args) {
    let s = strings[0];
    for (let i = 0; i < args.length; i++) {
        s += '<%= ' + args[i] + ' %>';
        s += strings[i + 1];
    }
    // Could pre-compile also templates and return them as functions?
    return s;
}

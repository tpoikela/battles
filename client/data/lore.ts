
/* tslint:disable */

export interface LoreData {
    mainQuest: {[key: number]: string[]}
}

export const Lore: LoreData = {
    mainQuest: {}
};

// Each info can be retrieved based on 3 pieces of info:
// 1. Current level (and its parent zone context)
// 2. Target actor of the query 
// 3. Actor who initiated the query (player)
//
// An example: {
//   text: 'There is a dungeon there', // Info provided in the reply
//   level: {
//   },
//   target: {
//   },
//
// }

Lore.mainQuest = {
    0: [
        "There is something evil gathering its troops in the northern arctics",
        "To reach the north, you need to pass through several great mountain walls",
    ],
    4: [
        "I've heard rumors of a great northern city carved into the mountainside",
    ],
    6: [
        "Hyrkhians who are natives of this land have a built a great city into the mountain",
        "They say you need to pass through mighty dwarven fortress to reach the cold north",
    ],
    7: [
        "Adventurers have seen strange and cold-looking creatures gathering near an abandoned fort",
    ],
    8: [
        "A traveller had seen a gigantic black tower rising into the sky from beneath the icy arctic.",
    ]
};
    

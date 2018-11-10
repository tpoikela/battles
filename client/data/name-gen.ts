/* eslint comma-dangle: 0 */

// Thanks to www.fantasynamegenerators.com for some tips

export const Names: any = {};
import RG from '../src/rg';
import {Random} from '../src/random';

const RNG = Random.getRNG();

// There are two kinds of names:
// 1. Generic ones such as Dungeon, City, Town, Vault etc.
// 2. Unique ones such as Everhold or Ebonfell.

/* As the whole purpose of this module is to generate random names, each
 * function will return randomly picked values of course.
 */

Names.place = {};

/* Generic place names are placed here. */
Names.place.generic = {
    branch: [
        'Hand', 'Foot', 'Small', 'Large'
    ],
    dungeon: [
        'Crypt', 'Catacombs', 'Tombs',
        'Dungeon', 'Cells',
        'Cave', 'Grotto', 'Cavern', 'Lair',
        // 'Burrows', 'Delves',
        // 'Haunt', 'Point',
        // 'Vault', 'Tunnels', 'Pits',
        'Labyrinth' // , 'Maze'
    ],

    mountain: [
        'Summit', 'Volcano', 'Tops', 'Peaks',
        'Bluff', 'Highlands', 'Pinnacle', 'Rise', 'Needle', 'Hills',
        'Slopes'
    ],

    face: [
        'Face', 'Buttress', 'Ridge', 'Shoulder', 'Crag', 'Crest', 'Brink',
        'Cairn', 'Col', 'Pass', 'Crown', 'Scree', 'Watershed'
    ],

    forest: [
        'Grove', 'Wilds', 'Woodlands', 'Timberland', 'Forest', 'Covert',
        'Woods', 'Thicket', 'Glade',
    ],

    city: [
        'Town', 'Village', // 'Township', 'Hamlet',
        'Fort',
        // 'Stronghold', 'Fortress', 'Outpost', 'Castle',
        'City', // 'Capital',
        // 'Guard'
    ],
    lake: [
        'Basin', 'Cove', 'Reservoir', 'Depths', 'Gorge', 'Lagoon', 'Domain',
        'Pond', 'Expanse', 'Lake', 'Shallows', 'Loch', 'Falls', 'Rapids',
    ],

    quarter: [
        'Market', 'Bazaar',
        'Plaza', 'Row', 'Works', 'Side', 'Acre',
        'Garden', 'Park',
        'Temple', 'Necropolis', 'Cemetery',
        'Library', 'Arcane',
        'Royal', 'Slum', 'Living',
        'Arena', 'Military', 'Barracks'
    ],
    area: [

    ]

};

Names.place.unique = {
    city: {
        first: [
            'Stag', 'Small', 'Mud', 'Ebon', 'Silk', 'Spirit', 'Basin',
            'Shadow', 'Gold', 'Silver', 'Snow', 'Frost', 'Ice', 'Hound',
            'Moon', 'Dire', 'Ever', 'Iron', 'Ruby', 'Star', 'Crystal',
            'Glimmer', 'Winters', 'Raven', 'Pine', 'Ever', 'Never', 'Rune',
            'Glace', 'Lumen', 'Confer', 'Flamen', 'Jotun', 'Troll', 'Winds',
            'Oaken', 'Willow', 'Anvil', 'Ashen', 'Kosken', 'Storm'
        ],
        second: [
            'guard', 'point', 'fell', 'mire', 'shield', 'crest', 'yard',
            'minster', 'swallow', 'grasp', 'cliff', 'cross', 'host', 'barrow',
            'vein', 'view', 'home', 'gard', 'wall', 'heim', 'creek', 'gasp',
            'mane', 'thorne', 'keep'
        ]
    }
};

Names.place.unique.mountain = {
    first: Names.place.unique.city.first,
    second: Names.place.generic.mountain.map(name => ' ' + name.toLowerCase())
};
Names.place.unique.dungeon = {
    first: Names.place.unique.city.first,
    second: Names.place.generic.dungeon.map(name => ' ' + name.toLowerCase())
};

Names.actor = {

};

Names.item = {

};

Names.getVillageType = () => {
    return RNG.arrayGetRand(['Village', 'Hamlet', 'Town', 'Township']);
};

Names.alreadyUsed = new Set(['']);

Names.getUniqueName = type => {
    const names = Names.place.unique[type];
    if (names) {
        let fullName = '';
        while (Names.alreadyUsed.has(fullName)) {
            const first = RNG.arrayGetRand(names.first);
            const second = RNG.arrayGetRand(names.second);
            fullName = first + second;
        }
        return fullName;
    }
    else {
        RG.err('name-gen.js', 'Names.getUniqueName',
          `No unique names for type ${type}`);
    }
    return '';
};

Names.getGenericPlaceName = (type) => {
    const arr = Names.place.generic[type];
    return RNG.arrayGetRand(arr);
};

Names.actorCount = 0;
Names.getActorName = () => {
    let fullName = 'RandActor' + Names.actorCount++;
    while (Names.alreadyUsed.has(fullName)) {
        fullName = 'RandActor' + Names.actorCount++;
    }
    return fullName;
};

const bookNameGen = {
    prefix: [
        'old', 'ancient', 'dusty', 'worn', 'well-preserved', 'heavy',
        'light', 'thick', 'thin'
    ],
    prefix2: [
        'rune-covered', 'worm-ridden', 'leather', 'hard-cover',
        'metal-plated', 'decorated', 'exquisite', 'engraved', 'plain',
        'ordinary', 'aesthetic', 'ornamental', 'skeletal'
    ],
    substantive: [
        'tome', 'book', 'tract', 'codex', 'opus', 'handbook',
        'volume', 'treatise', 'grimoire', 'rariora', 'compendium',
        'epitome', 'manuscript'
    ]
};

Names.getBookName = () => {
    let fullName = '';
    while (Names.alreadyUsed.has(fullName)) {
        let prefix = RNG.arrayGetRand(bookNameGen.prefix);
        prefix = prefix.capitalize();
        const prefix2 = RNG.arrayGetRand(bookNameGen.prefix2);
        const subst = RNG.arrayGetRand(bookNameGen.substantive);
        fullName = `${prefix} ${prefix2} ${subst}`;
    }
    return fullName;
};


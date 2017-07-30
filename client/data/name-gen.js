/* eslint comma-dangle: 0 */

// Thanks to www.fantasynamegenerators.com for some tips

const Names = {};
const RG = require('../src/rg.js');

Names.place = {
    dungeon: [
        'Crypt', 'Catacombs', 'Tombs',
        'Dungeon', 'Cave', 'Grotto', 'Cavern',
        'Burrows',
        'Delves',
        'Haunt', 'Point',
        'Vault', 'Lair', 'Tunnels', 'Cells', 'Pits',
        'Labyrinth', 'Maze'
    ],

    mountain: [
        'Summit', 'Volcano', 'Tops', 'Peaks',
        'Bluff', 'Highlands', 'Pinnacle', 'Rise', 'Needle', 'Hills',
        'Slopes'
    ],

    face: [
        'Face', 'Buttress', 'Ridge', 'Shoulder'
    ],

    forest: [
        'Grove', 'Wilds', 'Woodlands', 'Timberland', 'Forest', 'Covert',
        'Woods', 'Thicket', 'Glade',
    ],

    city: [

    ],

    lake: [
        'Basin', 'Cove', 'Reservoir', 'Depths', 'Gorge', 'Lagoon', 'Domain',
        'Pond', 'Expanse', 'Lake', 'Shallows', 'Loch', 'Falls', 'Rapids',
    ],

    quarter: [
        'Plaza', 'Garden', 'Row', 'Works', 'Side', 'Market', 'Acre', 'Bazaar',
    ],

};

Names.actor = {

};

Names.item = {

};

Names.getRandPlaceName = (type) => {
    const arr = Names.place[type];
    return RG.RAND.arrayGetRand(arr);
};

module.exports = Names;



/* Contains basic tiles like corridors and small rooms. */

const RG = require('../src/rg');
RG.Template = require('../src/template');

const Basic = {};
Basic.tiles = {};

Basic.tiles.corner = [
`
dir:NE
name:corner
X=#
Y=#

#X#.#X#
Y??.??#
#??.??#
#??....
#?????#
Y?????#
#######`,

`
dir:NEW
name:tcorner
X=#
Y=#

#X#.#X#
Y??.??#
#??.??#
.......
#?????#
Y?????#
#######`,

`
dir:NSEW
name:cross
X=#
Y=#

#X#.#X#
Y??.??#
#??.??#
.......
#??.??#
Y??.??#
###.###`

];

Basic.tiles.corridor = [
`
dir:NS
name:corridor
X=#
Y=#

#X#.#X#
Y??.??#
#??.??#
#??.??#
#??.??#
Y??.??#
###.###`

];

Basic.tiles.room = [
`
dir:N
name:room
X=#
Y=#

#X#.#X#
Y.....#
#.....#
#.....#
#.....#
Y.....#
#######`

];

// Contains names of the tiles to transform
const transforms = {
    all: ['corner', 'room'],
    flipVer: [],
    rotateR90: ['tcorner', 'corridor'],
    rotateR180: ['tcorner'],
    rotateR270: ['tcorner']
};

// All tiles concat together
Basic.tiles.all = []
    .concat(Basic.tiles.corner)
    .concat(Basic.tiles.corridor)
    .concat(Basic.tiles.room);

// Templates created from tiles strings
Basic.templates = Basic.tiles.all.map(tile => (
    RG.Template.createTemplate(tile)
));

// Transformation of each template added
Object.keys(transforms).forEach(func => {
    if (func !== 'all') {
        const created = [];
        let names = transforms[func];
        names = names.concat(transforms.all);
        names.forEach(name => {
            const templ = Basic.templates.find(t => (
                t.getProp('name') === name
            ));
            if (templ) {
                const newTempl = RG.Template[func](templ);
                created.push(newTempl);
            }

        });
        Basic.templates = Basic.templates.concat(created);
    }
});

const weighted = [];
Basic.templates.forEach(templ => {
    const weight = templ.getProp('weight');
    if (weight) {
        const nClones = weight - 1;
        for (let i = 0; i < nClones; i++) {
            weighted.push(templ.clone());
        }
    }
});
Basic.templates = Basic.templates.concat(weighted);

module.exports = Basic;

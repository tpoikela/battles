
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
    all: ['corner'],
    flipVer: [],
    rotateR90: ['tcorner', 'corridor', 'room'],
    rotateR180: ['tcorner', 'room'],
    rotateR270: ['tcorner', 'room']
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

const transformed = RG.Template.transformList(Basic.templates, transforms);
Basic.templates = Basic.templates.concat(transformed);

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

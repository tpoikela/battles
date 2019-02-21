/* This file contains tiles for creating different types/shapes of houses.
 * Although they could be used to construct full-sized levels, the focus
 * is on narrow spaces and houses.
 * */

import RG from '../src/rg';
import {Template, ElemTemplate} from '../src/template';
import {Random, RandWeights} from '../src/random';

interface HouseData {
    tiles: {[key: string]: string[]};
    templates: {[key: string]: ElemTemplate[]};
    Models: {[key: string]: string[]};
}

export const Houses5x5: any = {tiles: {}, templates: {}, Models: {}};
const RNG = Random.getRNG();

Houses5x5.tiles.start1x1 = [
`
name:start1x1_A
A=#
B=#
C=#
D=#
E=#
F=#

#ABC#
D:::#
E:::#
F:::#
##+##`,

`
name:start1x1_B
A=#
B=#
C=#
D=#
E=#
F=#

.ABC.
D#:##
E:::#
F:::#
##+##`,

`
name:start1x1_C
A=#
B=#
C=#
D=#
E=#
F=#

.ABC.
D#:#.
E::##
F:::#
##+##`,

`
name:start1x1_D
A=.
B=.
C=.
D=#
E=#
F=#

.ABC.
D###.
E::##
F:::#
##+##`

];


Houses5x5.tiles.start1xN = [
`
dir:N
startY:max
startX:first
name:start1xN_A
A=:
B=:
C=:
D=#
E=#
F=#

#ABC#
D:::#
E:::#
F:::#
##+##`,

`
dir:N
startY:max
startX:first
name:start1xN_B
A=:
B=:
C=:
D=#
E=#
F=#

#ABC#
D#:##
E:::#
F:::#
##+##`,

`
dir:N
startY:max
startX:first
name:start1xN_C
A=:
B=:
C=:
D=#
E=#
F=.

#ABC#
D:::#
E#:##
F#:#.
.#+#.`,

`
dir:N
startY:max
startX:first
name:start1xD_C
A=#
B=:
C=#
D=#
E=#
F=#

#ABC#
D:::#
E:::#
F:::#
##+##`

];

Houses5x5.tiles.start2xN = [
`
dir:NE
startX:first
startY:max
name:start2xN_A
A=:
B=:
C=:
D=#
E=#
F=#

#ABC#
D:::#
E::::
F:::#
##+##`,

`
dir:NW
startX:max
startY:max
name:start2xN_B
A=#
B=:
C=#
D=#
E=:
F=#

#ABC#
D:::#
E:::#
F:::#
##+##`
];

Houses5x5.tiles.start2xN = Houses5x5.tiles.start2xN.concat(
    Houses5x5.tiles.start1xN);

// Good starting rooms for houses
Houses5x5.tiles.start = [
`
dir:NEW
name:entrance2
A=:
B=:
C=:
D=#
E=:
F=#

#ABC#
D:::#
E::::
F:::#
##+##`,

`
dir:NW
name:entrance3
A=#
B=:
C=#
D=#
E=:
F=#

#ABC#
D:::#
E:::#
F:::#
##+##`
];

Houses5x5.tiles.corners = [
`
dir:SE
name:corner1
A=#
B=#
C=#
D=#
E=#
F=#

#ABC#
D::::
E::::
F:::#
#::##`,

`
dir:SEW
name:corner2
A=#
B=#
C=#
D=:
E=:
F=#

#ABC#
D::::
E::::
F:::#
##:##`,

`
dir:SE
name:corner3
A=.
B=.
C=.
D=#
E=#
F=#

.ABC#
D####
E::::
F:::#
##:##`,

`
dir:NSEW
name:corner4
A=:
B=:
C=:
D=:
E=:
F=:

#ABC#
D::::
E::::
F::::
#:::#`

];

Houses5x5.tiles.body = [

`
dir:NS
name:corridor
A=:
B=:
C=:
D=#
E=#
F=#

#ABC#
D:::#
E:::#
F:::#
#:::#`,

`
dir:NSEW
name:body1
A=:
B=:
C=:
D=:
E=:
F=:

#ABC#
D::::
E:#::
F::::
#:::#`,

`
dir:NSEW
name:body_cross
A=:
B=:
C=:
D=:
E=:
F=:

#ABC#
D:#::
E###:
F:#::
#:::#`

];

Houses5x5.tiles.terms = [
`
dir:S
name:term3x1
A=.
B=.
C=.
D=.
E=.
F=#

.ABC.
D....
E....
F####
#:::#`,

`
dir:S
name:term3x2
A=.
B=.
C=.
D=.
E=#
F=#

.ABC.
D....
E####
F:::#
#:::#`,

`
dir:S
name:term3x3
A=.
B=.
C=.
D=#
E=#
F=#

.ABC.
D####
E:::#
F:::#
#:::#`,

`
dir:S
name:term3x4
A=#
B=#
C=#
D=#
E=#
F=#

#ABC#
D:::#
E:::#
F:::#
#:::#`

];

/* Used to free up the entrance.*/
Houses5x5.tiles.blocker = `
name:BLOCKER
A=.
B=.
C=.
D=.
E=.
F=.

.ABC.
D....
E....
F....
.....`;

Houses5x5.tiles.filler = `
name:FILLER
A=.
B=.
C=.
D=.
E=.
F=.

.ABC.
D....
E....
F....
.....`;

/* Must be passed to Template.Level using setStartRoomFunc(), to ensure
 * that entrance tile is placed in sane way. */
Houses5x5.startRoomFunc = function() {
    if (this.tilesX === 1 && this.tilesY === 1) {
        return {x: 0, y: 0,
            room: RNG.arrayGetRand(Houses5x5.templates.start1x1)
        };
    }
    else if (this.tilesX === 1) {
        const usableTempl: ElemTemplate[] =
            Houses5x5.templates.start1xN.filter(tpl => (
                !(/(R90|R270)/i).test(tpl.getProp('name'))
            ));
        const templ = RNG.arrayGetRand(usableTempl);
        let y = this.tilesY - 1;
        if (/R180/i.test(templ.getProp('name'))) {y = 0;}
        return {x: 0, y, room: templ};
    }
    else if (this.tilesY === 1) {
        const usableTempl: ElemTemplate[] =
            Houses5x5.templates.start1xN.filter(tpl => (
                (/(R90|R270)/i).test(tpl.getProp('name'))
            ));
        const templ = RNG.arrayGetRand(usableTempl);
        let x = 0;
        if (/R270/i.test(templ.getProp('name'))) {x = this.tilesX - 1;}
        return {x, y: 0, room: templ};
    }
    else if (this.tilesX === 2 || this.tilesY === 2) {
        const usableTempl: ElemTemplate[] = Houses5x5.templates.start2xN;
        const templ = RNG.arrayGetRand(usableTempl);
        let x = 0;
        let y = 0;
        if (templ.getProp('startX') === 'max') {
            x = this.tilesX - 1;
        }
        if (templ.getProp('startY') === 'max') {
            y = this.tilesY - 1;
        }
        return {x, y, room: templ};
    }
    const midX = Math.floor(this.tilesX / 2);
    const midY = Math.floor(this.tilesY / 2);
    const tile = RNG.arrayGetRand(Houses5x5.tiles.start);

    const blocker = Template.createTemplate(Houses5x5.tiles.blocker);
    for (let y = midY; y < this.tilesY; y++) {
        this.addRoom(blocker, midX, y);
    }

    const templRoom = Template.createTemplate(tile);
    return {
        x: midX, y: midY, room: templRoom
    };
};

Houses5x5.Models.default = []
    .concat(Houses5x5.tiles.terms)
    .concat(Houses5x5.tiles.body)
    .concat(Houses5x5.tiles.corners);
Houses5x5.tiles.all = Houses5x5.Models.default;

const startNames = ['all', 'start1x1', 'start1xN', 'start2xN'];
startNames.forEach(name => {
    Houses5x5.templates[name] = Houses5x5.tiles[name].map(tile => (
        Template.createTemplate(tile)
    ));

    const transformed = Template.transformList(Houses5x5.templates[name]);
    Houses5x5.templates[name] = Houses5x5.templates[name].concat(transformed);
});

// Transform also properties startX,startY
Houses5x5.templates.start2xN.forEach(templ => {
    const name = templ.getProp('name');
    if (/_flip/.test(name)) {
        flipPropsVer(templ);
    }
    if (/R90/i.test(name)) {
        rotatePropsR90(templ);
    }
    else if (/R180/i.test(name)) {
        rotatePropsR90(templ);
        rotatePropsR90(templ);
    }
    else if (/R270/i.test(name)) {
        rotatePropsR90(templ);
        rotatePropsR90(templ);
        rotatePropsR90(templ);
    }
});

function rotatePropsR90(templ) {
    const startX = templ.getProp('startX');
    const startY = templ.getProp('startY');
    if (!RG.isNullOrUndef([startX])) {
        templ.setProp('startY', startX);
    }
    if (startY === 'max') {
        templ.setProp('startX', 'first');
    }
    else if (startY === 'first') {
        templ.setProp('startX', 'max');
    }
}

function flipPropsVer(templ) {
    const startX = templ.getProp('startX');
    if (startX === 'max') {
        templ.setProp('startX', 'first');
    }
    else if (startX === 'first') {
        templ.setProp('startX', 'max');
    }
}

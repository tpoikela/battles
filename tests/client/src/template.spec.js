
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const Template = RG.Template;

// const elemTemplates = require('../../../client/data/elem-templates.js');

const templStr2x2 = `
NN=#.
BB=.#
C=~

.NN.BB.C
..#.#.##`;

const templStrY = `
N=#

...
N.#`;

const templStrMixed = `
X=#
Y=.

~X
Y^`;

const templStrSingleYMultiX = `
Y=#
XXX=.#.

~#XXX#
.#...#
Y#...#
.#...#`;

const templStrSingleXMultiY = `
YY=::
X=>

~#X^
.#.^
Y#.^
Y#.^
.#.^`;

const templStrMultiXMultiY = `
YY=::
XX=>>

~#XX^
Y#..^
Y#..^
.#..^`;

// If this works, we're done
const templMess = `
AA=##
BBB=///
CCC=%%%
DD=??
E=>
FF=<<

~AA.BBB.CCC~
D...........
D...........
~...........
E...........
~~~~~~~~~~~~
F.#.#.#..#.#
F..:.:..:.:.
~...........`;

const templStr2Adj = `
A=?
B=.

#~
A~
B~`;

describe('Template.ElemGenX', () => {
    it('Generates sequences of chars from template', () => {
        const genX = new Template.ElemGenX('#~#');
        expect(genX.getChars()).to.equal('#~#');
        expect(genX.getChars(3)).to.equal('#~##~##~#');
    });
});

/*
describe('Template.ElemGenY', () => {
    it('Generates sequences of chars from template', () => {
        const genY = new Template.ElemGenY('#~#');
        expect(genY.getChars()).to.deep.equal(['#~#']);
        expect(genY.getChars(2)).to.deep.equal(['#~#', '#~#']);
    });

    it('can have nested ElemGenX', () => {
        const genX = new Template.ElemGenX('#');
        const genY = new Template.ElemGenY(genX);
        expect(genY.getChars([1, 1])).to.deep.equal(['#']);
    });
});
*/

describe('Template.ElemTemplate', () => {
    it('can expand templates in x-direction', () => {
        const templ = RG.Template.createTemplate(templStr2x2);
        const ascii = templ.getChars([2, 3, 1]);
        expect(ascii).to.have.length(3 * 1 + 2 * 2 + 2 * 3 + 1);
        expect(ascii[0]).to.have.length(2);
    });

    it('can expand templates in y-direction', () => {
        const val = 3;
        const templ2 = RG.Template.createTemplate(templStrY);
        const ascii2 = templ2.getChars([val]);
        expect(ascii2).to.have.length(3);
        expect(ascii2[0]).to.have.length(1 + val);
    });

    it('can expand mixed x-y templates', () => {
        const templMixed = RG.Template.createTemplate(templStrMixed);
        const asciiMixed = templMixed.getChars([2, 3]);
        expect(asciiMixed).to.have.length(3);
        expect(asciiMixed[0]).to.have.length(4);
    });

    it('can expand single-y, multi-x templates', () => {
        const templMixed = RG.Template.createTemplate(templStrSingleYMultiX);
        const asciiMixed = templMixed.getChars([2, 4]);
        expect(asciiMixed).to.have.length(3 + 2 * 3);
    });

    it('can expand single-x, multi-y templatse', () => {
        const templ = RG.Template.createTemplate(templStrSingleXMultiY);
        const asciiMixed = templ.getChars([1, 2]);
        expect(asciiMixed).to.have.length(4);
        expect(asciiMixed[0]).to.have.length(2 + 2 * 2 + 1);

        // And we can reuse the same parsed template
        const asciiMixed2 = templ.getChars([3, 4]);
        expect(asciiMixed2).to.have.length(6);
        expect(asciiMixed2[0]).to.deep.equal('~.::::::::.'.split(''));
    });

    it('can expand multi-x, multi-y templates', () => {
        const templ = RG.Template.createTemplate(templStrMultiXMultiY);
        const asciiMixed = templ.getChars([1, 1]);
        expect(asciiMixed).to.have.length(5);
        expect(asciiMixed[0]).to.have.length(4);
        expect(asciiMixed[0]).to.deep.equal('~::.'.split(''));
    });

    it('can expand complex template', () => {
        const templ = RG.Template.createTemplate(templMess);
        const asciiMess = templ.getChars([1, 1, 1, 1, 1, 1]);
        expect(asciiMess).to.have.length(12);

        RG.Template.$DEBUG = 0;
        const asciiBiggerMess = templ.getChars([2, 2, 2, 2, 2, 2]);
        // RG.printMap(asciiBiggerMess);
        expect(asciiBiggerMess).to.have.length(4 + 2 * 2 + 2 * 3 * 2);

    });

    it('can expand template with 2 adjacent params', () => {
        RG.Template.$DEBUG = 0;
        const templ = RG.Template.createTemplate(templStr2Adj);
        const ascii = templ.getChars([2, 2]);
        // RG.printMap(ascii);
        expect(ascii[0]).to.deep.equal('#??..'.split(''));
    });
});


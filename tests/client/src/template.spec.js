
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

describe('Template.ElemGenX', () => {
    it('Generates sequences of chars from template', () => {
        const genX = new Template.ElemGenX('#~#');
        expect(genX.getChars()).to.equal('#~#');
        expect(genX.getChars(3)).to.equal('#~##~##~#');
    });
});

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

describe('Template.ElemTemplate', () => {
    it('can expand templates in x-direction', () => {
        const templ = RG.Template.createTemplate(templStr2x2);
        const ascii = templ.getChars([2, 3, 1]);
        console.log('x-ascii is ' + JSON.stringify(ascii));
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
        console.log(JSON.stringify(asciiMixed));
        expect(asciiMixed).to.have.length(3);
        expect(asciiMixed[0]).to.have.length(4);
    });

    it('can expand single-y, multi-x templates', () => {
        const templMixed = RG.Template.createTemplate(templStrSingleYMultiX);
        const asciiMixed = templMixed.getChars([2, 4]);
        expect(asciiMixed).to.have.length(3 + 2 * 3);

        RG.printMap(asciiMixed);

    });
});


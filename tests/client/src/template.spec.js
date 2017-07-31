
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
    it('description', () => {
        const templ = RG.Template.createTemplate(templStr2x2);
        console.log(JSON.stringify(templ.getChars([2, 10, 1])));

    });
});

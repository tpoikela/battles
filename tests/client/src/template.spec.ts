
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
dir:SE
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

// Not so fast, had to include one extra test case..
const templStr2Adj = `
A=?
B=.

#~
A~
B~`;

const templProps = `
name:Test template
description: Test Description

#.#
...
#.#`;

const templMultiXY = `
X=#
Y=+

#X.X#
Y.#.^
.....
Y...^
#####`;

const templMixedDirs = `
dir:UDEW
name:MIXED
X=.
Y=.

#.X.#
#...#
Y....
#...#
#...#`;

const templAdapter = `
dir:ND
name:adapter
X=.
Y=#

##X##
#...#
Y...#
#...#
#...#`;

const toBeRotated90 = `
name:living_corner
dir:NE
X=#
Y=#

#X#.#X#
#:#...#
Y:###.#
#:::+..
Y:::###
#:::+:#
#######`;

const living3Dir = `
name:living_3dir
dir:NSE
X=#
Y=#

#X#.X##
Y:#.#:#
#:#.#+#
#:#....
Y:#.###
#:+.###
###.###`;

const house5x5 = `
name:house_core
dir:NE
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
##+##`;

// Not much to test here
describe('Template.ElemGenX', () => {
    it('Generates sequences of chars from template', () => {
        const genX = new Template.ElemGenX('#~#');
        expect(genX.getChars()).to.equal('#~#');
        expect(genX.getChars(3)).to.equal('#~##~##~#');
    });
});

describe('Template.ElemTemplate', () => {

    it('can contain any number of properties', () => {
        const templ = RG.Template.createTemplate(templProps);
        expect(templ.getProp('name')).to.equal('Test template');
        expect(templ.getProp('description')).to.equal('Test Description');
    });

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


    it('can expand templates with same param in 2 places', () => {
        const templ = RG.Template.createTemplate(templMultiXY);
        const p = [2, 2, 3, 3];
        const ascii = templ.getChars(p);
        const firstCol = '#+++.+++#'.split('');
        const lastCol = '#^^^.^^^#'.split('');
        expect(ascii).to.have.length(1 + p[0] + 1 + p[1] + 1);
        expect(ascii[0]).to.deep.equal(firstCol);
        expect(ascii[6]).to.deep.equal(lastCol);
    });
    /*
    it('can also expand template by giving it object', () => {
        const templ = RG.Template.createTemplate(templMess);
        const expObj = {
            AA: 1,
            BBB: 1,
            CCC: 1,
            DD: 1,
            E: 1,
            FF: 1
        };
        const asciiMessExp = templ.getChars([1, 1, 1, 1, 1, 1]);
        const asciiMessGot = templ.getChars(expObj);
        expect(asciiMessGot).to.deep.equal(asciiMessExp);
    });
    */

    it('can be cloned', () => {
        const templMixed = RG.Template.createTemplate(templStrMixed);
        const templClone = templMixed.clone();
        const ascii = templMixed.getChars([3, 5]);
        const asciiClone = templClone.getChars([3, 5]);
        expect(asciiClone).to.deep.equal(ascii);
    });

    it('can rotate templates 90 degress to right', () => {
        const templMixed = RG.Template.createTemplate(templStrMixed);
        let ascii = templMixed.getChars([1, 1]);

        const templR90 = RG.Template.rotateR90(templMixed);
        expect(templR90.getProp('dir')).to.equal('WS');
        ascii = templR90.getChars([1, 1]);
        expect(ascii[0][0], 'Coord 0,0 OK').to.equal('.');
        expect(ascii[1][1], 'Coord 1,1 OK').to.equal('#');

        // Try the expansion on rotated
        ascii = templR90.getChars([2, 2]);
        expect(ascii[0], 'Col 0 OK').to.deep.equal(['.', '^', '^']);
        expect(ascii.length).to.equal(3);
    });

    it('rotates genparams correctly as well', () => {
        const templ = RG.Template.createTemplate(toBeRotated90);
        const templR90 = RG.Template.rotateR90(templ);

        expect(templ.xGenPos).to.deep.equal({1: 1, 5: 1});
        expect(templ.yGenPos).to.deep.equal({2: 1, 4: 1});

        expect(templR90.xGenPos).to.deep.equal({2: 1, 4: 1});
        expect(templR90.yGenPos).to.deep.equal({1: 1, 5: 1});

        const ascii1 = templ.getChars([2, 2, 2, 2]);
        const ascii2 = templR90.getChars([2, 2, 2, 2]);

        expect(ascii1[1][1], 'Coord 1,1 OK').to.equal(':');
        expect(ascii2[1][5], 'R90 Coord 1,5 OK').to.equal('+');
        expect(ascii2[1][6], 'Coord 1,6 OK').to.equal(':');

		const templ2 = RG.Template.createTemplate(living3Dir);
		const templ2R90 = RG.Template.rotateR90(templ2);

        expect(templ2.xGenPos).to.deep.equal({1: 1, 4: 1});
        expect(templ2.yGenPos).to.deep.equal({1: 1, 4: 1});

        expect(templ2R90.xGenPos, 'xGenPos OK').to.deep.equal({2: 1, 5: 1});
        expect(templ2R90.yGenPos, 'yGenPos OK').to.deep.equal({1: 1, 4: 1});

        const ascii21 = templ2.getChars([2, 2, 2, 2]);
        const ascii2R90 = templ2R90.getChars([2, 2, 2, 2]);
        RG.printMap(ascii21);
        RG.printMap(ascii2R90);

        const templ2Flipped = RG.Template.flipVer(templ2);
        expect(templ2Flipped.xGenPos).deep.to.equal({2: 1, 5: 1});
        expect(templ2Flipped.yGenPos).deep.to.equal(templ2.yGenPos);

        const ascii2Flipped = templ2Flipped.getChars([2, 2, 2, 2]);
        RG.printMap(ascii2Flipped);

    });

    it('can be flipped from y-axis', () => {
        const templMixed = RG.Template.createTemplate(templStrMixed);
        const templFlipped = RG.Template.flipVer(templMixed);
        expect(templFlipped.getProp('dir')).to.equal('SW');

        let ascii = templFlipped.getChars([1, 1]);
        expect(ascii[0][0], 'Coord 0,0 OK').to.equal('#');
        expect(ascii[1][0], 'Coord 1,0 OK').to.equal('~');
        expect(ascii[0][1], 'Coord 0,1 OK').to.equal('^');
        expect(ascii[1][1], 'Coord 1,1 OK').to.equal('.');

        ascii = templFlipped.getChars([2, 3]);
        expect(ascii[0]).to.deep.equal(['#', '^', '^', '^']);
        for (let x = 1; x < 3; x++) {
            expect(ascii[x]).to.deep.equal(['~', '.', '.', '.']);
        }
    });

    it('can be flipped when using remapped exits', () => {
        const templ = RG.Template.createTemplate(templMixedDirs);
        const exitMap = {
            D: 'L', U: 'R', E: 'S', W: 'N',
            L: 'U', R: 'D', N: 'E', S: 'W'
        };
        const templR90 = RG.Template.rotateR90(templ, exitMap);
        templR90.setProp('name', 'MIXED_R90');
        const dir = templR90.getDir();
        expect(dir).to.equal('LNRS');

        const exitMaps = {
            flipVer: {L: 'R', R: 'L', E: 'W', W: 'E'},
            rotateR90: exitMap,
            rotateR180: exitMap,
            rotateR270: exitMap
        };
        let transformed = RG.Template.transformList([templR90, templ], null,
            exitMaps);

        // const names = transformed.map(t => t.getProp('name'));
        expect(transformed.length).to.equal(3 + 3 + 1 + 1 + 3 + 3);

        // const templR180 = RG.Template.rotateR90(templR90, exitMap);

        const templR90R90 = transformed.find(t => (
            t.getProp('name') === 'MIXED_R90_r90'
        ));
        const dirR180 = templR90R90.getDir();
        expect(dirR180).to.equal(templ.getDir());

        const adapter = RG.Template.createTemplate(templAdapter);
        transformed = RG.Template.transformList([adapter], null,
            exitMaps);
        const adapterR270 = transformed.find(
            t => t.getProp('name') === 'adapter_r270');
        expect(adapterR270).to.exist;
        expect(adapterR270.getDir()).to.equal('RW');

    });

    it('can expand house template with 6 genparams', () => {
        const templ = RG.Template.createTemplate(house5x5);

        const ascii = templ.getChars();
        expect(ascii.length).to.equal(5);
        expect(ascii[0].length).to.equal(5);

        const ascii2 = templ.getChars(2);
        const len2 = ascii2.length;
        expect(len2).to.equal(2 + 2 + 2 + 2);
        expect(ascii2[0].length).to.equal(2 + 2 + 2 + 2);
        expect(ascii2[4][len2 - 1]).to.equal('+');

        const ascii3 = templ.getChars([1, 2, 3, 4, 5, 6]);
        expect(ascii3.length).to.equal(2 + 1 + 2 + 3);
        expect(ascii3[0].length).to.equal(2 + 4 + 5 + 6);
    });

});


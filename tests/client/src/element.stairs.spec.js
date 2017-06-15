
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const Stairs = RG.Element.Stairs;

describe('Element.Stairs', () => {
    it('has down-attr, prop type, type and name', () => {
        const s = new Stairs(true);

        expect(s.isDown()).to.equal(true);
        expect(s.getPropType()).to.equal(RG.TYPE_ELEM);

        expect(s.getType()).to.not.be.empty;
        expect(s.getType()).to.equal('stairsDown');
    });
});

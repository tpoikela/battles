
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const RGTest = require('../../roguetest');

const FromJSON = require('../../../client/src/game').FromJSON;

const Stairs = RG.Element.Stairs;

describe('Element.Stairs', () => {
    it('has down-attr, prop type, type and name', () => {
        const s = new Stairs(true);

        expect(s.isDown()).to.equal(true);
        expect(s.getPropType()).to.equal(RG.TYPE_ELEM);

        expect(s.getType()).to.not.be.empty;
        expect(s.getType()).to.equal('stairsDown');
    });

    it('can be connected to other stairs', () => {
        const s1 = new Stairs(true);
        const s2 = new Stairs(false);

        const l1 = RGTest.createLevel('arena', 20, 20);
        const l2 = RGTest.createLevel('arena', 20, 20);

        s1.setSrcLevel(l1);
        s2.setSrcLevel(l2);

        s1.connect(s2);

        expect(s1.getTargetLevel()).to.equal(l2);
        expect(s2.getTargetLevel()).to.equal(l1);
    });

    it('can be serialized', () => {
        const s1 = new Stairs(true);
        const s2 = new Stairs(false);

        const l1 = RGTest.createLevel('arena', 20, 20);
        const l2 = RGTest.createLevel('arena', 20, 20);
        l1.addStairs(s1, 3, 4);
        l2.addStairs(s2, 5, 6);
        s1.connect(s2);

        const json = s1.toJSON();
        expect(json.srcLevel).to.equal(l1.getID());
        expect(json.targetLevel).to.equal(l2.getID());
        expect(json.targetStairs.x).to.equal(5);
        expect(json.targetStairs.y).to.equal(6);

        // And deserialized..
        const fromJSON = new FromJSON();
        const s3 = fromJSON.createUnconnectedStairs(json);
        expect(s3.isDown()).to.equal(s1.isDown());
    });
});

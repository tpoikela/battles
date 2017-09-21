
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const ActorClass = require('../../../client/src/actor-class');

const RGTest = require('../../roguetest');

describe('ActorClass.Blademaster', () => {
    it('can be added as class to an actor', () => {
        const rogue = new RG.Actor.Rogue('rogue');
        const bm = new ActorClass.Blademaster(rogue);
        expect(rogue.getActorClass()).to.exist;

        RGTest.wrapIntoLevel([rogue]);

        bm.advanceLevel();
        expect(rogue.has('Defender')).to.be.false;
        rogue.get('Experience').setExpLevel(4);
        bm.advanceLevel();
        expect(rogue.has('Defender')).to.be.true;

        expect(rogue.has('Ambidexterity')).to.be.false;
        rogue.get('Experience').setExpLevel(24);
        bm.advanceLevel();
        expect(rogue.has('Ambidexterity')).to.be.true;
    });
});

describe('ActorClass.Marksman', () => {
    it('adds comps to the actor when advancing levels', () => {
        const rogue = new RG.Actor.Rogue('archer');
        const marksmanClass = new ActorClass.Marksman(rogue);

        RGTest.wrapIntoLevel([rogue]);
        marksmanClass.advanceLevel();
        expect(rogue.has('EagleEye')).to.be.false;
        const fovBefore = rogue.getFOVRange();

        rogue.get('Experience').setExpLevel(4);
        marksmanClass.advanceLevel();
        expect(rogue.has('EagleEye')).to.be.true;
        expect(rogue.getFOVRange()).to.equal(fovBefore + 2);

        rogue.get('Experience').setExpLevel(8);
        marksmanClass.advanceLevel();
        expect(rogue.has('StrongShot')).to.be.true;

    });
});

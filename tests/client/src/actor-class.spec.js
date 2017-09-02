
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const ActorClass = require('../../../client/src/actor-class');

const RGTest = require('../../roguetest');

describe('ActorClass.Blademaster', () => {
    it('an actor can be initialized with a class', () => {
        const rogue = new RG.Actor.Rogue('rogue');
        const bm = new ActorClass.Blademaster(rogue);
        rogue.setActorClass(bm);
        expect(rogue.getActorClass()).to.exist;

        RGTest.wrapIntoLevel([rogue]);

        rogue.get('Experience').setExpLevel(4);
        bm.advanceLevel();
        expect(rogue.has('Defender')).to.be.true;

        rogue.get('Experience').setExpLevel(24);
        bm.advanceLevel();
        expect(rogue.has('Ambidexterity')).to.be.true;
    });
});

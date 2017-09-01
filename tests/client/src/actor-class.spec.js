
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const ActorClass = require('../../../client/src/actor-class');

describe('ActorClass', () => {
    it('an actor can be initialized with a class', () => {
        const rogue = new RG.Actor.Rogue('rogue');
        const bm = new ActorClass.Blademaster(rogue);
        rogue.setActorClass(bm);
        expect(rogue.getActorClass()).to.exist;
    });
});

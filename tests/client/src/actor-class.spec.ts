
import RG from '../../../client/src/rg';
import { expect } from 'chai';
import {SentientActor} from '../../../client/src/actor';

import {ActorClass} from '../../../client/src/actor-class';
import {RGUnitTests} from '../../rg.unit-tests';

describe('ActorClass.Blademaster', () => {
    it('can be added as class to an actor', () => {
        const rogue = new SentientActor('rogue');
        const bm = new ActorClass.Blademaster(rogue);
        expect(rogue.getActorClass()).to.exist;

        RGUnitTests.wrapIntoLevel([rogue]);

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
        const rogue = new SentientActor('archer');
        const marksmanClass = new ActorClass.Marksman(rogue);

        RGUnitTests.wrapIntoLevel([rogue]);
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


describe('Advancing actor class', () => {
    it('can advance the actor at each level', () => {
        const classes = ['Adventurer', 'Blademaster', 'Marksman',
            'Spiritcrafter', 'Spellsinger', 'Cryomancer', 'Alpinist'];
        classes.forEach(actorClass => {
            const advancer = new SentientActor('advancer');
            const classObj = new ActorClass[actorClass](advancer);
            for (let i = 1; i <= 32; i++) {
                advancer.get('Experience').setExpLevel(i);
                classObj.advanceLevel();
            }
        });
    });
});

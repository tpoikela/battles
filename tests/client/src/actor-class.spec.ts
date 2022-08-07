
import RG from '../../../client/src/rg';
import chai from 'chai';
import {SentientActor} from '../../../client/src/actor';

import {ActorClass} from '../../../client/src/actor-class';
import {FactoryItem} from '../../../client/src/factory.items';
import {RGUnitTests} from '../../rg.unit-tests';
import {chaiBattles} from '../../helpers/chai-battles';

const expect = chai.expect;
chai.use(chaiBattles);

describe('ActorClass.Blademaster', () => {
    it('can be added as class to an actor', () => {
        const rogue = new SentientActor('rogue');
        const bm = new ActorClass.Blademaster(rogue);
        expect(rogue.getActorClass()).to.exist;

        RGUnitTests.wrapIntoLevel([rogue]);

        bm.advanceLevel();
        expect(rogue).to.not.have.component('Defender');
        rogue.get('Experience').setExpLevel(4);
        bm.advanceLevel();
        expect(rogue).to.have.component('Defender');

        expect(rogue).to.not.have.component('Ambidexterity');
        rogue.get('Experience').setExpLevel(24);
        bm.advanceLevel();
        expect(rogue).to.have.component('Ambidexterity');
    });
});

describe('ActorClass.Marksman', () => {
    it('adds comps to the actor when advancing levels', () => {
        const rogue = new SentientActor('archer');
        const marksmanClass = new ActorClass.Marksman(rogue);

        RGUnitTests.wrapIntoLevel([rogue]);
        marksmanClass.advanceLevel();
        expect(rogue).to.not.have.component('EagleEye');
        const fovBefore = rogue.getFOVRange();

        rogue.get('Experience').setExpLevel(4);
        marksmanClass.advanceLevel();
        expect(rogue).to.have.component('EagleEye');
        expect(rogue.getFOVRange()).to.equal(fovBefore + 2);

        rogue.get('Experience').setExpLevel(8);
        marksmanClass.advanceLevel();
        expect(rogue).to.have.component('StrongShot');

    });
});


describe('Advancing actor class', () => {
    it('can advance the actor to each level of every class', () => {
        const classes = ['Adventurer', 'Blademaster', 'Marksman',
            'Spiritcrafter', 'Spellsinger', 'Cryomancer', 'Alpinist',
            'Courtier'];
        classes.forEach(actorClass => {
            const advancer = new SentientActor('advancer');
            const classObj = new ActorClass[actorClass](advancer);
            FactoryItem.addItemsToActor(advancer, ActorClass.startingItems[actorClass]);
            FactoryItem.equipItemsToActor(advancer, ActorClass.equipment[actorClass]);
            classObj.setStartingStats();
            for (let i = 1; i <= 32; i++) {
                advancer.get('Experience').setExpLevel(i);
                classObj.advanceLevel();
            }
        });
    });
});

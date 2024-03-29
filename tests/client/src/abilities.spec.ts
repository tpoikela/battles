
import chai, { expect } from 'chai';
import RG from '../../../client/src/rg';
import * as ROT from '../../../lib/rot-js';
import {Ability} from '../../../client/src/abilities';
import * as Component from '../../../client/src/component';
import * as Actor from '../../../client/src/actor';
import * as Item from '../../../client/src/item';
import {Keys} from '../../../client/src/keymap';
import {chaiBattles} from '../../helpers/chai-battles';
import {BrainPlayer} from '../../../client/src/brain/brain.player';

chai.use(chaiBattles as any);

const KeyMap = Keys;

describe('Abilities', () => {
    it('has Camouflage ability', () => {
        const actor = new Actor.SentientActor('able');
        const camouflage = new Ability.Camouflage();
        const abilComp = new Component.Abilities();
        actor.add(abilComp);
        abilComp.addAbility(camouflage);
        camouflage.activate();
        expect(actor).to.have.component('Camouflage');
    });

    it('can generate a menu for selecting skill to use', () => {
        const actor = new Actor.SentientActor('able');
        const abilComp = new Component.Abilities();
        actor.add(abilComp);
        actor.setIsPlayer(true);

        const sword = new Item.Weapon('sword');
        actor.getInvEq().addItem(sword);

        const abilities = actor.get('Abilities');
        const camouflage = new Ability.Camouflage();
        abilities.addAbility(camouflage);
        const sharpener = new Ability.Sharpener();
        abilities.addAbility(sharpener);

        const brain = actor.getBrain() as BrainPlayer;
        brain.decideNextAction({code: KeyMap.KEY.ABILITY});

        expect(brain.isMenuShown()).to.equal(true);

        const menu = brain.getMenu();
        expect(menu).to.exist;

        let action = brain.decideNextAction({code: ROT.KEYS.VK_0});
        action();
        expect(actor).to.have.component('Camouflage');
        expect(brain.isMenuShown()).to.equal(false);

        // Bring up ability menu
        brain.decideNextAction({code: KeyMap.KEY.ABILITY});
        expect(brain.isMenuShown()).to.equal(true);
        // Select ability at index 1
        brain.decideNextAction({code: ROT.KEYS.VK_1});
        expect(brain.isMenuShown()).to.equal(true);

        // Finally select the sword for sharpening
        action = brain.decideNextAction({code: ROT.KEYS.VK_0});
        action();
        expect(brain.isMenuShown()).to.equal(false);
        expect(sword).to.have.component('Sharpened');
    });
});

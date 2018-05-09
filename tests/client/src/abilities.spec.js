
const chai = require('chai');

const RG = require('../../../client/src/battles');
const ROT = require('../../../lib/rot');
const Ability = require('../../../client/src/abilities');
const KeyMap = require('../../../client/src/keymap');
const chaiBattles = require('../../helpers/chai-battles.js');

const expect = chai.expect;
chai.use(chaiBattles);

describe('Abilities', () => {
    it('has Camouflage ability', () => {
        const actor = new RG.Actor.Rogue('able');
        const camouflage = new Ability.Camouflage();
        const abilComp = new RG.Component.Abilities();
        actor.add(abilComp);
        abilComp.addAbility(camouflage);
        camouflage.activate();
        expect(actor).to.have.component('Camouflage');
    });

    it('can generate a menu for selecting skill to use', () => {
        const actor = new RG.Actor.Rogue('able');
        const abilComp = new RG.Component.Abilities();
        actor.add(abilComp);
        actor.setIsPlayer(true);

        const sword = new RG.Item.Weapon('sword');
        actor.getInvEq().addItem(sword);

        const abilities = actor.get('Abilities');
        const camouflage = new Ability.Camouflage();
        abilities.addAbility(camouflage);
        const sharpener = new Ability.Sharpener();
        abilities.addAbility(sharpener);

        const brain = actor.getBrain();
        brain.decideNextAction({code: KeyMap.KEY.ABILITY});

        expect(brain.isMenuShown()).to.equal(true);

        const menu = brain.getMenu();
        expect(menu).to.exist;

        let action = brain.decideNextAction({code: ROT.VK_0});
        action();
        expect(actor).to.have.component('Camouflage');
        expect(brain.isMenuShown()).to.equal(false);

        brain.decideNextAction({code: KeyMap.KEY.ABILITY});
        expect(brain.isMenuShown()).to.equal(true);
        brain.decideNextAction({code: ROT.VK_1});
        expect(brain.isMenuShown()).to.equal(true);

        // Finally select the sword for sharpening
        action = brain.decideNextAction({code: ROT.VK_0});
        action();
        expect(brain.isMenuShown()).to.equal(false);
        expect(sword).to.have.component('Sharpened');
    });
});

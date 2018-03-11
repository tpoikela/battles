
const chai = require('chai');
const RG = require('../../../client/src/battles');
const RGTest = require('../../roguetest');
const chaiBattles = require('../../helpers/chai-battles.js');

const expect = chai.expect;
chai.use(chaiBattles);

describe('Spell.IcyPrison', () => {

    it('adds paralysis for an actor', () => {
        const effSystem = new RG.System.SpellEffect(['SpellCell']);

        const icyPrison = new RG.Spell.IcyPrison();
        const caster = new RG.Actor.Rogue('caster');
        const paralyzed = new RG.Actor.Rogue('paralyzed');
        RGTest.wrapIntoLevel([caster, paralyzed]);

        RGTest.moveEntityTo(caster, 1, 1);
        RGTest.moveEntityTo(paralyzed, 2, 1);

        const spellArgs = {
            src: caster,
            dir: RG.DIR.E
        };
        icyPrison.cast(spellArgs);

        effSystem.update();
        expect(paralyzed.has('Paralysis')).to.be.true;
    });
});

describe('Spell.LightningArrow', () => {
    it('can be cast by AI', () => {
        const castSystem = new RG.System.SpellCast(['SpellCast']);
        const effSystem = new RG.System.SpellEffect(['SpellMissile']);
        const systems = [castSystem, effSystem];

        const parser = RG.ObjectShell.getParser();
        const thunderbird = parser.createActor('thunderbird');
        const human = parser.createActor('human');
        RGTest.wrapIntoLevel([thunderbird, human]);
        RGTest.moveEntityTo(thunderbird, 1, 1);
        RGTest.moveEntityTo(human, 5, 5);

        // Adjust evaluators and casting probability
        RGTest.ensureSpellCast(thunderbird);

        thunderbird.nextAction();
        expect(thunderbird).to.have.component('SpellCast');
        RGTest.updateSystems(systems);

    });
});

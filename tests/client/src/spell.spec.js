
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
const RGTest = require('../../roguetest');

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

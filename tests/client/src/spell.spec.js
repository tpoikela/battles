
const chai = require('chai');
const RG = require('../../../client/src/battles');
const RGTest = require('../../roguetest');
const chaiBattles = require('../../helpers/chai-battles.js');
const Keys = require('../../../client/src/keymap');
const FromJSON = require('../../../client/src/game.fromjson');

const expect = chai.expect;
chai.use(chaiBattles);

const spellComps = ['SpellRay', 'SpellCell', 'SpellMissile', 'SpellArea'];

describe('Spell.SpellBook', () => {

    let wizard = null;
    let book = null;
    let bookSpells = null;
    let systems = null;
    let spellPower = null;

    beforeEach(() => {
        systems = [
            new RG.System.SpellCast(['SpellCast']),
            new RG.System.SpellEffect(
            ['SpellRay', 'SpellCell', 'SpellMissile', 'SpellArea', 'SpellSelf']
            ),
            new RG.System.Missile(['Missile']),
            new RG.System.Damage(['Damage'])
        ];
        wizard = new RG.Actor.Rogue('wizard');
        book = new RG.Spell.SpellBook(wizard);
        RG.Spell.addAllSpells(book);
        bookSpells = book.getSpells();

        spellPower = new RG.Component.SpellPower();
        spellPower.setPP(10000);
        spellPower.setMaxPP(10000);
        wizard.add(spellPower);
    });

    it('it can contain a number of spells', () => {
        const selObj = book.getSelectionObject();
        expect(selObj).to.not.be.empty;

        expect(bookSpells.length).to.be.above(15);
        const selMenu = selObj.getMenu();
        const menuValues = Object.values(selMenu);
        expect(menuValues.length).to.be.above(15);

        const selectObjSpell = selObj.select(Keys.VK_a);
        expect(selectObjSpell).to.not.be.empty;

        if (typeof selectObjSpell === 'function') {
            selectObjSpell();
        }
        else {
            expect(selectObjSpell).to.have.property('showMenu');
        }
    });

    it('has functions for AI spellcasters', () => {
        const enemy = new RG.Actor.Rogue('enemy');
        const friend = new RG.Actor.Rogue('friend');
        const level = RGTest.wrapIntoLevel([enemy, friend, wizard]);
        RGTest.moveEntityTo(wizard, 1, 1);
        RGTest.moveEntityTo(friend, 2, 1);
        RGTest.moveEntityTo(enemy, 3, 3);

        wizard.addEnemy(enemy);
        wizard.addFriend(friend);

        expect(level.getActors()).to.have.length(3);
        const actorCellsAround = [level.getMap().getCell(2, 1)];
        const args = {
            actor: wizard,
            enemy,
            actorCellsAround
        };
        const shouldCastCb = () => true;
        bookSpells.forEach(spell => {
            if (spell.aiShouldCastSpell) {
                if (spell.aiShouldCastSpell(args, shouldCastCb)) {
                    const castArgs = {
                        src: wizard,
                        dir: [1, 1],
                        target: enemy
                    };
                    const cast = () => {
                        spell.cast(castArgs);
                    };
                    const msg = `Spell ${spell.getName()} OK`;
                    expect(cast, msg).not.to.throw(Error);
                }
            }
        });

    });

    it('has serialisation for all spells', () => {
        const bookJSON = book.toJSON();
        const wizard2 = new RG.Actor.Rogue('wizard2');
        const fromJSON = new FromJSON();
        const newBook = fromJSON.createSpells({spellbook: bookJSON}, wizard2);
        expect(newBook.equals(book)).to.be.true;
    });

    it('can cast all spells successfully', () => {
        const enemy = new RG.Actor.Rogue('enemy');
        const level = RGTest.wrapIntoLevel([enemy, wizard]);
        let items = level.getItems();
        expect(items).to.have.length(0);

        RGTest.moveEntityTo(wizard, 1, 1);
        RGTest.moveEntityTo(enemy, 3, 3);
        const rockStorm = bookSpells.find(s => s.getName() === 'RockStorm');
        const spellCast = new RG.Component.SpellCast();
        spellCast.setSource(wizard);
        spellCast.setSpell(rockStorm);
        spellCast.setArgs({src: wizard});

        wizard.add(spellCast);
        RGTest.updateSystems(systems);

        items = level.getItems();
        expect(items).to.have.length.above(0);
    });
});

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

describe('Spell.SummonIceMinion', () => {
    it('can be cast by AI', () => {
        const castSystem = new RG.System.SpellCast(['SpellCast']);
        const effSystem = new RG.System.SpellEffect(spellComps);
        const systems = [castSystem, effSystem];

        const parser = RG.ObjectShell.getParser();
        const monarch = parser.createActor('Frostburn monarch');
        RGTest.ensureSpellCast(monarch);

        const human = parser.createActor('human');
        RGTest.wrapIntoLevel([monarch, human]);
        RGTest.moveEntityTo(monarch, 2, 2);
        RGTest.moveEntityTo(human, 5, 5);

        monarch.nextAction();
        expect(monarch).to.have.component('SpellCast');
        RGTest.updateSystems(systems);

    });
});

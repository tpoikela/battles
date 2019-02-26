
import chai from 'chai';
import {RG} from '../../../client/src/battles';
import {RGTest} from '../../roguetest';
import {chaiBattles} from '../../helpers/chai-battles';
import {Keys} from '../../../client/src/keymap';
import {FromJSON} from '../../../client/src/game.fromjson';
import * as Component from '../../../client/src/component';
import {SentientActor} from '../../../client/src/actor';
import * as Item from '../../../client/src/item';
import {Spell} from '../../../client/src/spell';
import {System} from '../../../client/src/system';
import {ObjectShell} from '../../../client/src/objectshellparser';
import { RGUnitTests } from '../../rg.unit-tests';

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
            new System.SpellCast(['SpellCast']),
            new System.SpellEffect(
            ['SpellRay', 'SpellCell', 'SpellMissile', 'SpellArea', 'SpellSelf']
            ),
            new System.Missile(['Missile']),
            new System.Damage(['Damage'])
        ];
        wizard = new SentientActor('wizard');
        book = new Spell.SpellBook(wizard);
        Spell.addAllSpells(book);
        bookSpells = book.getSpells();

        spellPower = new Component.SpellPower();
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

        const selectObjSpell = selObj.select(Keys.VK_b);
        expect(selectObjSpell).to.not.be.empty;

        if (typeof selectObjSpell === 'function') {
            selectObjSpell();
        }
        else {
            expect(selectObjSpell).to.have.property('showMenu');
        }
    });

    it('has functions for AI spellcasters', () => {
        const enemy = new SentientActor('enemy');
        const friend = new SentientActor('friend');
        const level = RGUnitTests.wrapIntoLevel([enemy, friend, wizard]);
        RGUnitTests.moveEntityTo(wizard, 1, 1);
        RGUnitTests.moveEntityTo(friend, 2, 1);
        RGUnitTests.moveEntityTo(enemy, 3, 3);

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
        const wizard2 = new SentientActor('wizard2');
        const fromJSON = new FromJSON();
        const newBook = fromJSON.createSpells({spellbook: bookJSON}, wizard2);
        expect(newBook.equals(book)).to.equal(true);
    });

    it('can cast all spells successfully', () => {
        const enemy = new SentientActor('enemy');
        const level = RGUnitTests.wrapIntoLevel([enemy, wizard]);
        let items = level.getItems();
        expect(items).to.have.length(0);

        RGUnitTests.moveEntityTo(wizard, 1, 1);
        RGUnitTests.moveEntityTo(enemy, 3, 3);
        const rockStorm = bookSpells.find(s => s.getName() === 'RockStorm');
        const spellCast = new Component.SpellCast();
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
        const effSystem = new System.SpellEffect(['SpellCell']);

        const caster = new SentientActor('caster');
        const icyPrison = new Spell.IcyPrison();
        icyPrison.setCaster(caster);
        const paralyzed = new SentientActor('paralyzed');
        RGUnitTests.wrapIntoLevel([caster, paralyzed]);

        RGUnitTests.moveEntityTo(caster, 1, 1);
        RGUnitTests.moveEntityTo(paralyzed, 2, 1);

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
        const castSystem = new System.SpellCast(['SpellCast']);
        const effSystem = new System.SpellEffect(['SpellMissile']);
        const systems = [castSystem, effSystem];

        const parser = ObjectShell.getParser();
        const thunderbird = parser.createActor('thunderbird');
        const human = parser.createActor('human');
        RGUnitTests.wrapIntoLevel([thunderbird, human]);
        RGUnitTests.moveEntityTo(thunderbird, 1, 1);
        RGUnitTests.moveEntityTo(human, 5, 5);

        // Adjust evaluators and casting probability
        RGTest.ensureSpellCast(thunderbird);

        thunderbird.nextAction();
        expect(thunderbird).to.have.component('SpellCast');
        RGTest.updateSystems(systems);

    });
});

describe('Spell.SummonIceMinion', () => {
    it('can be cast by AI', () => {
        const castSystem = new System.SpellCast(['SpellCast']);
        const effSystem = new System.SpellEffect(spellComps);
        const systems = [castSystem, effSystem];

        const parser = ObjectShell.getParser();
        const monarch = parser.createActor('Frostburn monarch');
        RGTest.ensureSpellCast(monarch);

        const human = parser.createActor('human');
        RGUnitTests.wrapIntoLevel([monarch, human]);
        RGUnitTests.moveEntityTo(monarch, 2, 2);
        RGUnitTests.moveEntityTo(human, 5, 5);

        monarch.nextAction();
        expect(monarch).to.have.component('SpellCast');
        RGTest.updateSystems(systems);

    });
});

describe('Spell.Blizzard', () => {
    it('affects an area around caster', () => {
        const castSystem = new System.SpellCast(['SpellCast']);
        const effSystem = new System.SpellEffect(spellComps);
        const dmgSystem = new System.Damage(['Damage']);
        const animSystem = new System.Animation(['Animation']);
        const systems = [castSystem, effSystem];

        const caster = new SentientActor('caster');
        const victim = new SentientActor('victim');
        const blizzard = new Spell.Blizzard();
        blizzard.setCaster(caster);
        RGUnitTests.wrapIntoLevel([caster, victim]);
        RGUnitTests.moveEntityTo(caster, 3, 2);
        RGUnitTests.moveEntityTo(victim, 5, 5);

        const spellPower = new Component.SpellPower();
        spellPower.setPP(100);
        spellPower.setMaxPP(100);
        caster.add(spellPower);

        const spellArgs = {
            src: caster
        };
        const castFunc = blizzard.getCastFunc(caster, spellArgs);
        expect(castFunc).to.not.throw(Error);
        expect(caster).to.have.component('SpellCast');
        RGTest.updateSystems(systems);
        expect(victim).to.have.component('Damage');
        dmgSystem.update();
        expect(victim).to.have.component('Coldness');
        expect(caster).to.have.component('Animation');
        animSystem.update();
    });
});
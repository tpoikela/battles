
import chai from 'chai';

import RG from '../../../client/src/rg';
import {chaiBattles} from '../../helpers/chai-battles';

import ROT from '../../../lib/rot';
import {RGTest} from '../../roguetest';
import {Keys} from '../../../client/src/keymap';
import {Path} from '../../../client/src/path';
import {FactoryLevel} from '../../../client/src/factory.level';
import {SentientActor} from '../../../client/src/actor';
import * as Brain from '../../../client/src/brain';
import * as Item from '../../../client/src/item';
import {BrainPlayer} from '../../../client/src/brain.player';
import {SystemMovement} from '../../../client/src/system/system.movement';
import {SystemBaseAction} from '../../../client/src/system/system.base-action';
import {Cell} from '../../../client/src/map.cell';
import * as Element from '../../../client/src/element';

const {KEY} = Keys;

const expect = chai.expect;
chai.use(chaiBattles);

const BrainSentient = Brain.BrainSentient;
const ElementBase = Element.ElementBase;

describe('BrainPlayer', () => {
    let level = null;
    let player = null;
    let demon = null;
    let human = null;

    beforeEach( () => {
        const factLevel = new FactoryLevel();
        level = factLevel.createLevel('arena', 10, 10);
        player = new SentientActor('Player');
        demon = new SentientActor('Demon');
        human = new SentientActor('Human friend');

        demon.setType('demon');
        demon.setBrain(new RG.Brain.Demon(demon));
        demon.addEnemy(player);

        human.setType('human');
        human.setBrain(new RG.Brain.Human(human));
        player.setIsPlayer(true);
        level.addActor(player, 1, 1);
        level.addActor(demon, 1, 2);
    });

    it('Accepts key commands', () => {
        const brain = new BrainPlayer(player);

        brain.decideNextAction({code: Keys.VK_r});
        expect(player.getSpeed()).to.equal(120);
        expect(brain.isRunModeEnabled()).to.equal(true);
        expect(brain.energy).to.equal(0);
        brain.decideNextAction({code: Keys.VK_s});
        expect(brain.isRunModeEnabled()).to.equal(false);
        expect(brain.energy).to.equal(RG.energy.REST);

        brain.decideNextAction({code: Keys.VK_c});
        expect(brain.energy).to.equal(RG.energy.MOVE);

        brain.decideNextAction({code: Keys.VK_x});
        expect(brain.energy).to.equal(RG.energy.ATTACK);

        brain.decideNextAction({code: Keys.VK_r}); // Enable run mode
        brain.decideNextAction({code: Keys.VK_c}); // Move
        expect(brain.energy).to.equal(RG.energy.RUN);

    });

    it('Has cmds for more complex things', () => {
        const brain = new BrainPlayer(player);
        brain.decideNextAction({code: Keys.VK_s});
        expect(brain.energy).to.equal(RG.energy.REST);

        // No missile equipped
        brain.decideNextAction({cmd: 'missile'});
        expect(brain.energy).to.equal(0);

        // Equip a missile
        const cell = new Cell(0, 0, new Element.ElementBase('floor'));
        RGTest.equipItem(player, new Item.Missile('Arrow'));
        brain.decideNextAction({cmd: 'missile', target: cell});
        expect(brain.energy).to.equal(RG.energy.MISSILE);

        const sword = new Item.Weapon('sword');
        brain.decideNextAction({cmd: 'use', item: sword});
        expect(brain.energy).to.equal(1);

        const potion = new Item.Potion('healing potion');
        player.get('Health').decrHP(5);
        const hpOld = player.get('Health').getHP();
        player.getInvEq().addItem(potion);
        brain.decideNextAction({cmd: 'use', item: potion,
            target: player.getCell()});
        const hpNew = player.get('Health').getHP();
        expect(hpNew, 'Healing pot restores HP').to.be.above(hpOld);
    });

    it('has commands for dropping, equipping and unequipping items', () => {
        const brain = new BrainPlayer(player);
        const sword = new Item.Weapon('sword');
        player.getInvEq().addItem(sword);
        const dropCmd = {cmd: 'drop', item: sword, count: 1};
        expect(level.getItems()).to.have.length(0);
        brain.decideNextAction(dropCmd);
        expect(level.getItems()).to.have.length(1);

        const dagger = new Item.Weapon('dagger');
        const equipCmd = { cmd: 'equip', item: dagger };
        player.getInvEq().addItem(dagger);
        brain.decideNextAction(equipCmd);
        // expect(player.getWeapon().getName()).to.equal(dagger.getName());
        expect(player).to.have.component('Equip');
        player.remove('Equip');

        const unequipCmd = {cmd: 'unequip', slot: 'hand'};
        brain.decideNextAction(unequipCmd);
        // expect(player.getWeapon()).to.equal(null);
        expect(player).to.have.component('Equip');
    });

    it('Has different fighting modes', () => {
        const brain = new BrainPlayer(player);
        brain.toggleFightMode();

        // var attack = player.getAttack();
        // var speed = player.getSpeed();

        expect(brain.energy).to.equal(1);
        let attackCallback = brain.decideNextAction({code: Keys.VK_x});
        expect(brain.energy).to.equal(RG.energy.ATTACK);
        attackCallback();
        expect(player.get('StatsMods').getSpeed()).to.equal(20);
        expect(player.getSpeed()).to.equal(120);

        brain.toggleFightMode();
        attackCallback = brain.decideNextAction({code: Keys.VK_x});
        attackCallback();
        expect(player.getSpeed()).to.equal(80);
    });

    it('Needs confirm before attacking friends', () => {
        level.addActor(human, 2, 2);
        const brain = new BrainPlayer(player);

        brain.decideNextAction({code: KEY.MOVE_SE});
        expect(brain.energy).to.equal(0);
        brain.decideNextAction({code: KEY.REST});
        expect(brain.energy).to.equal(0);

        brain.decideNextAction({code: KEY.MOVE_SE});
        brain.decideNextAction({code: KEY.YES});
        expect(brain.energy).to.equal(RG.energy.ATTACK);
    });

    it('can toggle between fighting modes', () => {
        const brain = new BrainPlayer(player);
        let fightMode = brain.getFightMode();
        expect(fightMode).to.equal(RG.FMODE_NORMAL);
        brain.decideNextAction({code: KEY.FIGHT});
        fightMode = brain.getFightMode();
        expect(fightMode).to.equal(RG.FMODE_FAST);

        brain.decideNextAction({code: KEY.FIGHT});
        fightMode = brain.getFightMode();
        expect(fightMode).to.equal(RG.FMODE_SLOW);
        brain.decideNextAction({code: KEY.FIGHT});
        fightMode = brain.getFightMode();
        expect(fightMode).to.equal(RG.FMODE_NORMAL);
    });

    it('handles picking up of items', () => {
        const baseSys = new SystemBaseAction(['Pickup']);
        const brain = new BrainPlayer(player);
        const food = new Item.Food('food');
        const weapon = new Item.Weapon('weapon');
        level.addItem(food, 1, 1);
        level.addItem(weapon, 1, 1);

        expect(level.getItems().length).to.equal(2);
        brain.decideNextAction({code: KEY.NEXT_ITEM});
        expect(brain.energy).to.equal(0);

        const actionFunc = brain.decideNextAction({code: KEY.PICKUP});
        expect(brain.energy).to.equal(RG.energy.PICKUP);
        actionFunc();
        RGTest.updateSystems([baseSys]);
        expect(level.getItems().length).to.equal(1);
    });

    it('can have GUI callbacks added to it', () => {
        const cbCode = ROT.VK_ADD;
        let called = false;
        const callback = code => {
            called = true;
            return code;
        };
        const brain = new BrainPlayer(player);
        brain.addGUICallback(cbCode, callback);

        expect(called).to.be.false;
        brain.decideNextAction({code: cbCode});
        expect(called).to.be.true;
    });

    it('has commands for using spellpowers', () => {
        const brain = new BrainPlayer(player);
        player.setBook(new RG.Spell.SpellBook(player));
        let func = brain.decideNextAction({code: KEY.POWER});
        expect(func).to.be.null;
        expect(brain.isMenuShown()).to.equal(true);
        func = brain.decideNextAction({code: ROT.VK_0});
        expect(func).to.be.null;
        expect(brain.isMenuShown()).to.equal(false);
        func = brain.decideNextAction({code: Keys.VK_a});
        expect(typeof func).to.equal('function');
    });

    it('has commands for shooting and targeting', () => {
        const player = new SentientActor('player');
        player.setIsPlayer(true);
        const orc = new SentientActor('orc');
        const goblin = new SentientActor('goblin');
        orc.addEnemy(player);
        goblin.addEnemy(player);

        RGTest.wrapIntoLevel([player, orc, goblin]);
        RGTest.moveEntityTo(player, 2, 2);
        RGTest.moveEntityTo(orc, 1, 1);
        RGTest.moveEntityTo(goblin, 3, 3);

        const brain = player.getBrain();
        expect(brain.hasTargetSelected()).to.be.false;
        brain.decideNextAction({code: KEY.TARGET});
        expect(brain.hasTargetSelected()).to.be.true;

        const targetCell = brain.getTarget();
        const firstID = targetCell.getFirstActor().getID();
        brain.decideNextAction({code: KEY.NEXT});

        const selectedCell = brain.getTarget();
        const nextID = selectedCell.getFirstActor().getID();
        expect(firstID).to.not.equal(nextID);

        brain.decideNextAction({code: KEY.NEXT});
        const thirdID = brain.getTarget().getFirstActor().getID();
        expect(firstID).to.equal(thirdID);

        for (let i = 0; i < 20; i++) {
            const prevID = brain.getTargetActor().getID();
            brain.decideNextAction({code: KEY.NEXT});
            const currID = brain.getTargetActor().getID();
            expect(prevID).to.not.equal(currID);
        }
    });
});

describe('BrainSentient', () => {
    let level = null;
    let player = null;
    let demon = null;
    let human = null;
    let factLevel = null;

    beforeEach( () => {
        factLevel = new FactoryLevel();
        level = factLevel.createLevel('arena', 10, 10);
        player = new SentientActor('Player');
        demon = new SentientActor('Demon');
        human = new SentientActor('Human friend');

        demon.setType('demon');
        demon.setBrain(new RG.Brain.Demon(demon));
        demon.addEnemy(player);

        human.setType('human');
        human.setBrain(new RG.Brain.Human(human));

        player.setIsPlayer(true);
        level.addActor(player, 1, 1);
        level.addActor(demon, 1, 2);
    });

    it('Has 1st priority for enemies', () => {
        let cells = Brain.Brain.getCellsAroundActor(demon);
        expect(cells).to.have.length(8);

        level.addActor(human, 0, 0);
        cells = Brain.Brain.getCellsAroundActor(human);
        expect(cells).to.have.length(3);
    });

    it('explores randomly when no enemies', () => {
        const movSys = new SystemMovement(['Movement']);
        const arena = factLevel.createLevel('arena', 10, 10);
        const rogue = new SentientActor('rogue');
        arena.addActor(rogue, 1, 1);
        const action = rogue.nextAction();
        action.doAction();
        movSys.update();
        const cellChanged = rogue.getCell().getX() !== 1 ||
            rogue.getCell().getY() !== 1;
        expect(cellChanged, 'Actor cell changed').to.be.true;
    });

    it('flees when low on health', () => {
        const movSys = new SystemMovement(['Movement']);
        const arena = factLevel.createLevel('arena', 30, 30);
        const rogue = new SentientActor('rogue');
        rogue.setFOVRange(20);
        const player = new SentientActor('player');

        // Check that flee action not triggered when not player seen
        rogue.get('Health').setHP(1);
        arena.addActor(rogue, 2, 2);
        const action = rogue.nextAction();
        action.doAction();
        movSys.update();
        const rogueX = rogue.getX();
        const rogueY = rogue.getY();
        const cellChanged = rogueX !== 2 || rogueY !== 2;
        expect(cellChanged, 'Explore even when low on health').to.equal(true);

        // Add player to provoke flee response in rogue
        arena.addActor(player, 1, 1);
        player.setIsPlayer(true);

        let currDist = Path.shortestDist(rogueX, rogueY, 1, 1);
        let prevDist = currDist;
        for (let i = 3; i < 9; i++) {
            const action = rogue.nextAction();
            action.doAction();
            movSys.update();
            const rogueX = rogue.getX();
            const rogueY = rogue.getY();
            currDist = Path.shortestDist(rogueX, rogueY, 1, 1);
            expect(currDist).to.be.above(prevDist);
            prevDist = currDist;
        }
    });

});

describe('Brain.Summoner', () => {
    it('can summon help when seeing enemies', () => {
        const summoner = new SentientActor('summoner');
        const brain = new RG.Brain.Summoner(summoner);
        summoner.setBrain(brain);

        const level = RG.FACT.createLevel('arena', 10, 10);
        const player = new SentientActor('Player');
        player.setIsPlayer(true);
        level.addActor(summoner, 1, 1);
        level.addActor(player, 3, 3);

        brain.summonProbability = 1.01;
        const summonAction = summoner.nextAction();
        summonAction.doAction();
        expect(level.getActors(), 'There should be one actor added')
            .to.have.length(3);
    });
});

describe('Brain.Human', () => {
    it('communicates enemies to friend actors', () => {
        const commSystem = new RG.System.Communication(
            ['Communication']
        );
        const human = new SentientActor('human');
        const brain = new RG.Brain.Human(human);
        brain.commProbability = 1.01;
        human.setBrain(brain);

        const human2 = new SentientActor('human2');
        const brain2 = new RG.Brain.Human(human2);
        human2.setBrain(brain2);

        const demon = new SentientActor('demon');
        demon.setType('demon');

        const level = RG.FACT.createLevel('arena', 10, 10);
        level.addActor(human, 2, 2);
        level.addActor(human2, 1, 1);
        level.addActor(demon, 3, 3);

        const action = human.nextAction();
        action.doAction();
        expect(human2.has('Communication')).to.be.true;
        commSystem.update();
        expect(human2.has('Communication')).to.be.false;
    });
});

describe('Brain.Archer', () => {
    it('can do ranged attacks on enemies', () => {
        const missSystem = new RG.System.Missile(['Missile']);
        const player = new SentientActor('player');
        player.setIsPlayer(true);

        const archer = new SentientActor('archer');
        const arrow = new Item.Ammo('arrow');
        arrow.add(new RG.Component.Indestructible());
        arrow.count = 10;
        const bow = new Item.MissileWeapon('bow');
        RGTest.equipItems(archer, [arrow, bow]);

        const brain = new RG.Brain.Archer(archer);
        archer.setBrain(brain);
        archer.getBrain().addEnemy(player);

        const level = RGTest.wrapIntoLevel([player, archer]);
        RGTest.moveEntityTo(player, 2, 2);
        RGTest.moveEntityTo(archer, 4, 4);

        const action = archer.nextAction();
        action.doAction();

        missSystem.update();
        expect(level.getItems().length, '1 arrow was shot').to.equal(1);
    });
});

describe('Brain.SpellCaster', () => {

    let spellSystem = null;
    let effectSystem = null;
    let systems = null;

    beforeEach(() => {
        spellSystem = new RG.System.SpellCast(['SpellCast']);
        effectSystem = new RG.System.SpellEffect(['SpellRay']);
        systems = [spellSystem, effectSystem];
    });

    it('decides when to cast spells towards enemy', () => {
        const wizard = RGTest.getMeAWizard();
        wizard.getBrain().addEnemyType('goblin');

        const goblin = new SentientActor('goblin');
        goblin.setType('goblin');
        RGTest.wrapIntoLevel([wizard, goblin]);
        RGTest.moveEntityTo(wizard, 2, 2);
        RGTest.moveEntityTo(goblin, 4, 4);

        const action = wizard.nextAction();
        action.doAction();

        RGTest.updateSystems(systems);
        expect(goblin).to.have.component('Damage');
        expect(goblin.get('Damage').getDamageType()).to.equal(RG.DMG.ICE);
    });
});

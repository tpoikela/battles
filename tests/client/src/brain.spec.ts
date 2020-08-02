
import chai from 'chai';

import RG from '../../../client/src/rg';
import {chaiBattles} from '../../helpers/chai-battles';

import * as ROT from '../../../lib/rot-js';
import {RGTest} from '../../roguetest';
import {Keys} from '../../../client/src/keymap';
import {FactoryLevel} from '../../../client/src/factory.level';
import {SentientActor} from '../../../client/src/actor';
import {Brain, BrainPlayer, BrainSentient} from '../../../client/src/brain';
import * as Item from '../../../client/src/item';
import {SystemMovement} from '../../../client/src/system/system.movement';
import {SystemBaseAction} from '../../../client/src/system/system.base-action';
import {Cell} from '../../../client/src/map.cell';
import * as Element from '../../../client/src/element';
import {System} from '../../../client/src/system';
import * as Component from '../../../client/src/component';
import {RGUnitTests} from '../../rg.unit-tests';
import {Spell} from '../../../client/src/spell';
import {Evaluator} from '../../../client/src/evaluators';
import {Random} from '../../../client/src/random';

// Used for debugging, when test fails with certain seed
// const seed = Date.now();
// const seed = 1596296381728;
// Random.getRNG().setSeed(seed);

const {KEY} = Keys;

const expect = chai.expect;
chai.use(chaiBattles);


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
        demon.setBrain(new Brain.GoalOriented(demon));
        demon.addEnemy(player);

        human.setType('human');
        human.setBrain(new Brain.GoalOriented(human));
        player.setIsPlayer(true);
        level.addActor(player, 1, 1);
        level.addActor(demon, 1, 2);
    });

    it('Accepts key commands', () => {
        const brain = new BrainPlayer(player);

        brain.decideNextAction({code: Keys.VK.r});
        expect(player.getSpeed()).to.equal(120);
        expect(brain.isRunModeEnabled()).to.equal(true);
        expect(brain.energy).to.equal(0);
        brain.decideNextAction({code: Keys.VK.s});
        expect(brain.isRunModeEnabled()).to.equal(false);
        expect(brain.energy).to.equal(RG.energy.REST);

        brain.decideNextAction({code: Keys.VK.c});
        expect(brain.energy).to.equal(RG.energy.MOVE);

        brain.decideNextAction({code: Keys.VK.x});
        expect(brain.energy).to.equal(RG.energy.ATTACK);

        brain.decideNextAction({code: Keys.VK.r}); // Enable run mode
        brain.decideNextAction({code: Keys.VK.c}); // Move
        expect(brain.energy).to.equal(RG.energy.RUN);

    });

    it('Has cmds for more complex things', () => {
        const brain = new BrainPlayer(player);
        brain.decideNextAction({code: Keys.VK.s});
        expect(brain.energy).to.equal(RG.energy.REST);

        // No missile equipped
        brain.decideNextAction({cmd: 'missile'});
        expect(brain.energy).to.equal(0);

        // Equip a missile
        const cell = new Cell(0, 0, new Element.ElementBase('floor'));
        RGTest.equipItem(player, new Item.Missile('Arrow'));
        brain.decideNextAction({cmd: 'missile', target: cell});
        expect(player).to.have.component('AttackRanged');

        const sword = new Item.Weapon('sword');
        brain.decideNextAction({cmd: 'use', item: sword});
        expect(brain.energy).to.equal(RG.energy.USE);

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

        expect(brain.energy).to.equal(0);
        let attackCallback = brain.decideNextAction({code: Keys.VK.x});
        expect(brain.energy).to.equal(RG.energy.ATTACK);
        attackCallback();
        expect(player.get('StatsMods').getSpeed()).to.equal(20);
        expect(player.getSpeed()).to.equal(120);

        brain.toggleFightMode();
        attackCallback = brain.decideNextAction({code: Keys.VK.x});
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
        const cbCode = ROT.KEYS.VK_ADD;
        let called = false;
        const callback = code => {
            called = true;
            return code;
        };
        const brain = new BrainPlayer(player);
        brain.addGUICallback(cbCode, callback);

        expect(called).to.equal(false);
        brain.decideNextAction({code: cbCode});
        expect(called).to.equal(true);
    });

    it('has commands for using spellpowers', () => {
        const brain = new BrainPlayer(player);
        const book = new Spell.SpellBook(player);
        player.setBook(book);
        book.addSpell(new Spell.FrostBolt());
        // Bring up the spell menu
        let func = brain.decideNextAction({code: KEY.POWER});
        expect(func).to.equal(null);
        expect(brain.isMenuShown()).to.equal(true);

        // Choose 1st shown spell (FrostBolt)
        func = brain.decideNextAction({code: ROT.KEYS.VK_0});
        expect(func).to.equal(null);
        expect(brain.isMenuShown()).to.equal(false);

        // Select direction (a == left)
        func = brain.decideNextAction({code: Keys.VK.a});
        expect(func).to.be.a('function');
    });

    it('has commands for shooting and targeting', () => {
        player = new SentientActor('player');
        player.setIsPlayer(true);
        const orc = new SentientActor('orc');
        const goblin = new SentientActor('goblin');
        orc.addEnemy(player);
        goblin.addEnemy(player);

        RGUnitTests.wrapIntoLevel([player, orc, goblin]);
        RGUnitTests.moveEntityTo(player, 2, 2);
        RGUnitTests.moveEntityTo(orc, 1, 1);
        RGUnitTests.moveEntityTo(goblin, 3, 3);

        const brain = player.getBrain() as BrainPlayer;
        expect(brain.hasTargetSelected()).to.equal(false);
        brain.decideNextAction({code: KEY.TARGET});
        expect(brain.hasTargetSelected()).to.equal(true);

        let targetCell = brain.getTarget() as Cell;
        const firstID = targetCell.getFirstActor().getID();
        brain.decideNextAction({code: KEY.NEXT});

        const selectedCell = brain.getTarget() as Cell;
        const nextID = selectedCell.getFirstActor().getID();
        expect(firstID).to.not.equal(nextID);

        brain.decideNextAction({code: KEY.NEXT});
        targetCell = brain.getTarget() as Cell;
        const thirdID = targetCell.getFirstActor().getID();
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
        demon.setBrain(new Brain.GoalOriented(demon));
        demon.addEnemy(player);

        human.setType('human');
        human.setBrain(new Brain.GoalOriented(human));

        player.setIsPlayer(true);
        level.addActor(player, 1, 1);
        level.addActor(demon, 1, 2);
    });

    it('Has 1st priority for enemies', () => {
        let cells = Brain.getCellsAroundActor(demon);
        expect(cells).to.have.length(8);

        level.addActor(human, 0, 0);
        cells = Brain.getCellsAroundActor(human);
        expect(cells).to.have.length(3);
    });

    it('explores randomly when no enemies', () => {
        const movSys = new SystemMovement(['Movement']);
        const arena = factLevel.createLevel('arena', 10, 10);
        const rogue = new SentientActor('rogue');
        arena.addActor(rogue, 3, 3);
        const action = rogue.nextAction();
        action.doAction();

        let cellChanged = false;
        for (let i = 0; i < 10; i++) {
            movSys.update();
            cellChanged = rogue.getCell().getX() !== 3 ||
                rogue.getCell().getY() !== 3;
            if (cellChanged) {break;}
        }
        expect(cellChanged, 'Actor cell changed').to.equal(true);
    });

    it('flees when low on health', () => {
        const movSys = new SystemMovement(['Movement']);
        const arena = factLevel.createLevel('arena', 30, 30);
        const rogue = new SentientActor('rogue');
        rogue.setFOVRange(20);
        player = new SentientActor('player');

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
        if (rogueX === 1 && rogueY === 1) {
            arena.addActor(player, 1, 2);
        }
        else {
            arena.addActor(player, 1, 1);
        }
        player.setIsPlayer(true);

        let currDx = rogueX - 1;
        let currDY = rogueY - 1;
        let currDist = Math.abs(currDx + currDY);
        let prevDist = currDist;

        // rogue.getBrain().getGoal()._debug = true;

        for (let i = 3; i < 9; i++) {
            const rAction = rogue.nextAction();
            rAction.doAction();
            movSys.update();

            const [rX, rY] = rogue.getXY();
            currDx = rX - 1;
            currDY = rY - 1;
            currDist = Math.abs(currDx + currDY);
            if (!rogue.has('Attack')) {
                expect(currDist).to.be.above(prevDist);
            }
            else {
                rogue.remove('Attack');
            }
            prevDist = currDist;
        }
    });

});

describe('Brain.Human', () => {
    it('communicates enemies to friend actors', () => {
        const commSystem = new System.Communication(
            ['Communication']
        );
        const human = new SentientActor('human');
        const brain = new Brain.GoalOriented(human);
        human.setBrain(brain);
        const goal = brain.getGoal();
        const evalComm = new Evaluator.Communicate(3.0);
        goal.addEvaluator(evalComm);

        const human2 = new SentientActor('human2');
        const brain2 = new Brain.GoalOriented(human2);
        human2.setBrain(brain2);

        const demon = new SentientActor('demon');
        demon.setType('demon');
        human.addEnemy(demon);

        const factLevel = new FactoryLevel();
        const level = factLevel.createLevel('arena', 10, 10);
        level.addActor(human, 2, 2);
        level.addActor(human2, 1, 1);
        level.addActor(demon, 3, 3);

        expect(human2.isEnemy(demon)).to.equal(false);

        const action = human.nextAction();
        action.doAction();
        expect(human2).to.have.component('Communication');
        commSystem.update();
        expect(human2).to.not.have.component('Communication');
        expect(human2.isEnemy(demon)).to.equal(true);
    });
});

describe('Brain.GoalOriented', () => {
    it('can do ranged attacks on enemies', () => {
        const attRangedSystem = new System.AttackRanged(['AttackRanged']);
        const missSystem = new System.Missile(['Missile']);
        const player = new SentientActor('player');
        player.setIsPlayer(true);

        const archer = new SentientActor('archer');
        const arrow = new Item.Ammo('arrow');
        arrow.add(new Component.Indestructible());
        arrow.count = 10;
        const bow = new Item.MissileWeapon('bow');
        RGTest.equipItems(archer, [arrow, bow]);

        (archer.getBrain() as BrainSentient).addEnemy(player);

        const level = RGUnitTests.wrapIntoLevel([player, archer]);
        RGUnitTests.moveEntityTo(player, 2, 2);
        RGUnitTests.moveEntityTo(archer, 4, 4);

        const action = archer.nextAction();
        action.doAction();

        attRangedSystem.update();
        missSystem.update();
        expect(level.getItems().length, '1 arrow was shot').to.equal(1);
    });
});

describe('Brain.SpellCaster', () => {

    let spellSystem = null;
    let effectSystem = null;
    let systems = null;

    beforeEach(() => {
        spellSystem = new System.SpellCast(['SpellCast']);
        effectSystem = new System.SpellEffect(['SpellRay']);
        systems = [spellSystem, effectSystem];
    });

    it('decides when to cast spells towards enemy', () => {
        const wizard = RGTest.getMeAWizard();
        wizard.getBrain().addEnemyType('goblin');

        const goblin = new SentientActor('goblin');
        goblin.setType('goblin');
        RGUnitTests.wrapIntoLevel([wizard, goblin]);
        RGUnitTests.moveEntityTo(wizard, 2, 2);
        RGUnitTests.moveEntityTo(goblin, 4, 4);

        const action = wizard.nextAction();
        action.doAction();

        RGTest.updateSystems(systems);
        expect(goblin).to.have.component('Damage');
        expect(goblin.get('Damage').getDamageType()).to.equal(RG.DMG.ICE);
    });
});

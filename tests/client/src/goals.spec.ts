
import chai from 'chai';
import {RGTest}  from '../../roguetest';
import {RGUnitTests}  from '../../rg.unit-tests';
import RG from '../../../client/src/rg';

import {Goal} from '../../../client/src/goals';
import {Evaluator} from '../../../client/src/evaluators';
import {chaiBattles} from '../../helpers/chai-battles';
import {System} from '../../../client/src/system';
import {Brain} from '../../../client/src/brain';
import {SentientActor} from '../../../client/src/actor';
import {ELEM} from '../../../client/data/elem-constants';
import * as Component from '../../../client/src/component';
import * as Time from '../../../client/src/time';

chai.use(chaiBattles);
const expect = chai.expect;

describe('Actor Goal', () => {

    let movSys = null;
    let attSys = null;
    let dmgSys = null;
    let systems = null;

    beforeEach(() => {
        movSys = new System.Movement(['Movement']);
        attSys = new System.Attack(['Attack']);
        dmgSys = new System.Damage(['Damage']);
        systems = [movSys, attSys, dmgSys];
    });

    it('it indicates to actor what to do', () => {
        const actor = new SentientActor('thinker');
        const enemy = new SentientActor('enemy');
        actor.setBrain(new Brain.GoalOriented(actor));

        actor.addEnemy(enemy);
        enemy.addEnemy(actor);
        const startHP = enemy.get('Health').getHP();
        const level = RGUnitTests.wrapIntoLevel([actor, enemy]);
        expect(level.getActors().length).to.equal(2);
        RGUnitTests.moveEntityTo(actor, 5, 5);
        RGUnitTests.moveEntityTo(enemy, 17, 17);

        enemy.get('Combat').setDefense(0);
        enemy.get('Stats').setAgility(1);

        let [x, y] = actor.getXY();
        const [origX, origY] = [x, y];
        let action;
        for (let i = 0; i < 5; i++) {
            action = actor.nextAction();
            action.doAction();
            systems.forEach(sys => {sys.update();});
        }

        const [newX, newY] = actor.getXY();
        const coordSame = origX === newX && origY === newY;
        expect(coordSame, 'Not same coord').to.equal(false);

        RGUnitTests.moveEntityTo(actor, 2, 2);
        RGUnitTests.moveEntityTo(enemy, 5, 5);

        // const catcher = new RGUnitTests.MsgCatcher();
        RGTest.updateGame(actor, systems, 10, () => {
            // level.debugPrintInASCII();
        });
        // RGUnitTests.printScreen(actor);
        // RGUnitTests.printLevel(level);
        const endHP = enemy.get('Health').getHP();
        expect(endHP, 'Health must decrease').to.be.below(startHP);

        [x, y] = actor.getXY();
        expect([x, y]).to.deep.equal([4, 4]);
        actor.get('Health').setHP(5);
        for (let i = 0; i < 1; i++) {
            action = actor.nextAction();
            action.doAction();
            systems.forEach(sys => {sys.update();});
            [x, y] = actor.getXY();
            expect([x, y]).to.deep.equal([3, 3]);
        }

    });

    it('can be injected into actor via "commander"', () => {
        const commander = new SentientActor('commander');
        const soldier = new SentientActor('soldier');
        const actors = [commander, soldier];
        commander.setBrain(new Brain.GoalOriented(commander));
        soldier.setBrain(new Brain.GoalOriented(soldier));

        RGUnitTests.wrapIntoLevel(actors);
        RGUnitTests.moveEntityTo(commander, 2, 2);
        RGUnitTests.moveEntityTo(soldier, 3, 3);

        const topGoal = soldier.getBrain().getGoal();
        topGoal.removeEvaluators();
        const ordersGoal = new Goal.Orders(soldier);
        ordersGoal.addSubGoal(new Goal.FollowPath(soldier, [10, 10]));

        const orderBias = 1.0;
        const commandEval = new Evaluator.Orders(orderBias);
        commandEval.setArgs({srcActor: commander, goal: ordersGoal});
        topGoal.giveOrders(commandEval);

        RGTest.updateGame(actors, systems, 11);

        const sXY = soldier.getXY();
        expect(sXY).to.deep.equal([10, 10]);
    });

    it('can be Commander Battle goal', () => {
        const commander = new SentientActor('commander');
        const inBattleComp = new Component.InBattle();
        commander.add(new Component.Commander());
        commander.add(inBattleComp);
        commander.setBrain(new Brain.Commander(commander));
        commander.setFOVRange(10);
        const soldiers = [];
        for (let i = 0; i < 10; i++) {
            const soldier = new SentientActor('soldier' + i);
            soldier.setBrain(new Brain.GoalOriented(soldier));
            soldiers.push(soldier);

            soldier.addFriend(commander);
            commander.addFriend(soldier);
        }

        const actors = [commander].concat(soldiers);
        const level = RGUnitTests.wrapIntoLevel(actors);
        soldiers.forEach((soldier, i) => {
            RGUnitTests.moveEntityTo(soldier, 3, 5 + i);
        });
        RGUnitTests.moveEntityTo(commander, 2, 10);

        // RGUnitTests.printLevel(level);
        RGTest.updateGame(actors, systems, 11);

        soldiers.forEach(soldier => {
            expect(soldier.getX()).to.be.above(5);
        });
        expect(level.getActors().length).to.equal(11);
        // RGUnitTests.printLevel(level);

    });

    it('It can tell actor to guard x,y coordinate', () => {
        const guardian = new SentientActor('guardian');
        guardian.setBrain(new Brain.GoalOriented(guardian));

        RGUnitTests.wrapIntoLevel([guardian]);
        RGUnitTests.moveEntityTo(guardian, 4, 4);

        const topGoal = guardian.getBrain().getGoal();
        // topGoal.removeEvaluators();

        const guardEval = new Evaluator.Guard(3.0, [2, 2]);
        topGoal.addEvaluator(guardEval);

        RGTest.updateGame([guardian], systems, 11);

        expect(guardian.getXY()).to.deep.equal([2, 2]);
    });

    it('has a Goal.Flee for fleeing from enemies', () => {
        const injured = new SentientActor('injured');
        injured.get('Health').setMaxHP(100);
        injured.get('Health').setHP(100);
        injured.get('Health').decrHP(95);
        injured.setBrain(new Brain.GoalOriented(injured));
        const enemy = new SentientActor('enemy');
        injured.addEnemy(enemy);

        const level = RGUnitTests.wrapIntoLevel([enemy, injured]);
        RGUnitTests.moveEntityTo(injured, 6, 6);
        RGUnitTests.moveEntityTo(enemy, 4, 4);

        const topGoal = injured.getBrain().getGoal();

        let action = injured.nextAction();
        expect(action).to.be.an.instanceof(Time.Action);

        let subGoals = topGoal.getSubGoals();
        expect(subGoals).to.have.length(1);
        expect(subGoals[0].type).to.equal('GoalFleeFromActor');

        expect(injured).to.have.component('Movement');

        const movComp = injured.get('Movement');
        expect(movComp.getX()).to.equal(7);
        expect(movComp.getY()).to.equal(7);

        RGUnitTests.moveEntityTo(injured, 7, 7);
        RGUnitTests.moveEntityTo(enemy, 5, 5);

        const map = level.getMap();
        map.setBaseElemXY(8, 8, ELEM.WALL);
        action = injured.nextAction();

        subGoals = topGoal.getSubGoals();
        expect(subGoals).to.have.length(1);
        expect(subGoals[0].type).to.equal('GoalFleeFromActor');

    });

});

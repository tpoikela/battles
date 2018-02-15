
import { expect } from 'chai';

const RGTest = require('../../roguetest');
const RG = require('../../../client/src/battles');

const Goal = require('../../../client/src/goals');
const Evaluator = require('../../../client/src/evaluators');

describe('Actor Goal', () => {

    let movSys = null;
    let attSys = null;
    let dmgSys = null;
    let systems = null;

    beforeEach(() => {
        movSys = new RG.System.Movement(['Movement']);
        attSys = new RG.System.Attack(['Attack']);
        dmgSys = new RG.System.Damage(['Damage']);
        systems = [movSys, attSys, dmgSys];
    });

    it('it indicates to actor what to do', () => {

        const actor = new RG.Actor.Rogue('thinker');
        const enemy = new RG.Actor.Rogue('enemy');
        actor.setBrain(new RG.Brain.GoalOriented(actor));

        actor.addEnemy(enemy);
        enemy.addEnemy(actor);
        const startHP = enemy.get('Health').getHP();
        RGTest.wrapIntoLevel([actor, enemy]);
        RGTest.moveEntityTo(actor, 5, 5);
        RGTest.moveEntityTo(actor, 17, 17);

        let [x, y] = actor.getXY();
        let action = actor.nextAction();
        action.doAction();
        systems.forEach(sys => {sys.update();});

        const [nX, nY] = actor.getXY();

        const coordSame = x === nX && y === nY;
        expect(coordSame).not.to.equal(true);

        RGTest.moveEntityTo(actor, 2, 2);
        RGTest.moveEntityTo(enemy, 5, 5);

        RGTest.updateGame(actor, systems, 5);
        // RGTest.printScreen(actor);
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
        const commander = new RG.Actor.Rogue('commander');
        const soldier = new RG.Actor.Rogue('soldier');
        const actors = [commander, soldier];
        commander.setBrain(new RG.Brain.GoalOriented(commander));
        soldier.setBrain(new RG.Brain.GoalOriented(soldier));

        RGTest.wrapIntoLevel(actors);
        RGTest.moveEntityTo(commander, 2, 2);
        RGTest.moveEntityTo(soldier, 3, 3);

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
        const commander = new RG.Actor.Rogue('commander');
        const inBattleComp = new RG.Component.InBattle();
        commander.add(new RG.Component.Commander());
        commander.add(inBattleComp);
        commander.setBrain(new RG.Brain.Commander(commander));
        commander.setFOVRange(10);
        const soldiers = [];
        for (let i = 0; i < 10; i++) {
            const soldier = new RG.Actor.Rogue('soldier' + i);
            soldier.setBrain(new RG.Brain.GoalOriented(soldier));
            soldiers.push(soldier);

            soldier.addFriend(commander);
            commander.addFriend(soldier);
        }

        const actors = [commander].concat(soldiers);
        const level = RGTest.wrapIntoLevel(actors);
        soldiers.forEach((soldier, i) => {
            RGTest.moveEntityTo(soldier, 3, 5 + i);
        });
        RGTest.moveEntityTo(commander, 2, 10);

        // RGTest.printLevel(level);
        RGTest.updateGame(actors, systems, 11);

        soldiers.forEach(soldier => {
            expect(soldier.getX()).to.be.above(5);
        });
        expect(level.getActors().length).to.equal(11);
        // RGTest.printLevel(level);

    });

});

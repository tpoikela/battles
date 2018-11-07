
const chai = require('chai');
const RGTest = require('../../roguetest');
const RG = require('../../../client/src/battles');

const Goal = require('../../../client/src/goals');
const Evaluator = require('../../../client/src/evaluators');
const chaiBattles = require('../../helpers/chai-battles');

chai.use(chaiBattles);
const expect = chai.expect;

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
        const level = RGTest.wrapIntoLevel([actor, enemy]);
        expect(level.getActors().length).to.equal(2);
        RGTest.moveEntityTo(actor, 5, 5);
        RGTest.moveEntityTo(enemy, 17, 17);

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

        RGTest.moveEntityTo(actor, 2, 2);
        RGTest.moveEntityTo(enemy, 5, 5);

        // const catcher = new RGTest.MsgCatcher();
        RGTest.updateGame(actor, systems, 10, () => {
            // level.debugPrintInASCII();
        });
        // RGTest.printScreen(actor);
        // RGTest.printLevel(level);
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

    it('It can tell actor to guard x,y coordinate', () => {
        const guardian = new RG.Actor.Rogue('guardian');
        guardian.setBrain(new RG.Brain.GoalOriented(guardian));

        RGTest.wrapIntoLevel([guardian]);
        RGTest.moveEntityTo(guardian, 4, 4);

        const topGoal = guardian.getBrain().getGoal();
        // topGoal.removeEvaluators();

        const guardEval = new Evaluator.Guard(3.0, [2, 2]);
        topGoal.addEvaluator(guardEval);

        RGTest.updateGame([guardian], systems, 11);

        expect(guardian.getXY()).to.deep.equal([2, 2]);
    });

    it('has a Goal.Flee for fleeing from enemies', () => {
        const injured = new RG.Actor.Rogue('injured');
        injured.get('Health').setMaxHP(100);
        injured.get('Health').setHP(100);
        injured.get('Health').decrHP(95);
        injured.setBrain(new RG.Brain.GoalOriented(injured));
        const enemy = new RG.Actor.Rogue('enemy');
        injured.addEnemy(enemy);

        const level = RGTest.wrapIntoLevel([enemy, injured]);
        RGTest.moveEntityTo(injured, 6, 6);
        RGTest.moveEntityTo(enemy, 4, 4);

        const topGoal = injured.getBrain().getGoal();

        let funcDone = injured.nextAction();
        expect(funcDone).to.be.function;

        let subGoals = topGoal.getSubGoals();
        expect(subGoals).to.have.length(1);
        expect(subGoals[0].type).to.equal('GoalFleeFromActor');

        expect(injured).to.have.component('Movement');

        const movComp = injured.get('Movement');
        expect(movComp.getX()).to.equal(7);
        expect(movComp.getY()).to.equal(7);

        RGTest.moveEntityTo(injured, 7, 7);
        RGTest.moveEntityTo(enemy, 5, 5);

        const map = level.getMap();
        map.setBaseElemXY(8, 8, RG.ELEM.WALL);
        funcDone = injured.nextAction();

        subGoals = topGoal.getSubGoals();
        expect(subGoals).to.have.length(1);
        expect(subGoals[0].type).to.equal('GoalFleeFromActor');

    });

});

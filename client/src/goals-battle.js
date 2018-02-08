
/* This file contains Battle-related goals used by NPC actors. */

const Goal = require('./goals');
const Evaluator = require('./evaluators');

const {GOAL_ACTIVE, GOAL_COMPLETED} = Goal;

const GoalsBattle = {};

//---------------------------------------------------------------------------
// COMPOSITE GOALS
//---------------------------------------------------------------------------

class GoalWinBattle extends Goal.Base {

    constructor(actor) {
        super(actor);
        this.setType('GoalWinBattle');
    }

    activate() {
        this.addSubGoal(new GoalFindEnemyArmy(this.actor));
        this.status = GOAL_ACTIVE;
        this.dbg('Activated goal. Added FindEnemyArmy');
    }

    process() {
        this.dbg('process() begin');
        this.activateIfInactive();
        this.status = this.processSubGoals();
        return this.status;
    }

}
GoalsBattle.WinBattle = GoalWinBattle;

//---------------------------------------------------------------------------
// ATOMIC GOALS
//---------------------------------------------------------------------------

/* Commander will use this goal to follow its army. */
class GoalFollowArmy extends Goal.Base {

    constructor(actor) {
        super(actor);
        this.setType('GoalFollowArmy');
    }

    activate() {
        // 1. Calculate center of mass of army
        // 2. Check distance to the army
        // 3. Move into army's direction if not too close
        //    - Depends on the style/FOV of commander
    }

    process() {
        this.activateIfInactive();
        this.status = GOAL_COMPLETED;
        return this.status;
    }
}
GoalsBattle.FollowArmy = GoalFollowArmy;

/* Goal to find the enemy army. Commander will choose a direction, and the whole
 * army will march into that direction. */
class GoalFindEnemyArmy extends Goal.Base {

    constructor(actor) {
        super(actor);
        this.setType('GoalFindEnemyArmy');
    }

    activate() {
        const brain = this.actor.getBrain();

        const cmdDir = [1, 0];
        const level = this.actor.getLevel();
        const [x, y] = this.actor.getXY();

        if (x < level.getMap().cols / 2) {cmdDir[0] = 1;}
        else {cmdDir[0] = -1;}
        if (y < level.getMap().rows / 2 ) {cmdDir[1] = 1;}
        else {cmdDir[1] = -1;}

        this.dbg(`Cmd army to move to dir ${cmdDir}`);
        // If enemy not seen, order move until found
        const actors = brain.getMemory().getFriends();
        this.dbg(`${actors.length} friends found for command`);
        actors.forEach(actor => {
            const orderBias = 1.0;
            const orderEval = new Evaluator.Orders(orderBias);
            const ordersGoal = new Goal.MoveUntilEnemy(actor, cmdDir);
            orderEval.setArgs({srcActor: this.actor, goal: ordersGoal});

            const topGoal = actor.getBrain().getGoal();
            topGoal.giveOrders(orderEval);
        });
        this.status = GOAL_ACTIVE;
    }

    process() {
        this.activateIfInactive();

        const enemyFound = false;
        if (enemyFound) {
            this.status = GOAL_COMPLETED;
        }

        // Set to GOAL_COMPLETE when enemy found
        // Otherwise keep this active

        return this.status;
    }

}
GoalsBattle.FindEnemyArmy = GoalFindEnemyArmy;

/* Tells to own army actors to attack the most suitable enemy. */
class GoalEngageEnemy extends Goal.Base {

    constructor(actor) {
        super(actor);
    }

    activate() {

    }

    process() {
        this.activateIfInactive();

    }

}
GoalsBattle.EngageEnemy = GoalEngageEnemy;

class GoalRetreat extends Goal.Base {

    constructor(actor) {
        super(actor);
    }

}
GoalsBattle.Retreat = GoalRetreat;

module.exports = GoalsBattle;

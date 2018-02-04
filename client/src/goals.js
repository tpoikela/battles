
const Path = require('./path');
const RG = require('./rg');

const GOAL_ACTIVE = 'GOAL_ACTIVE';
const GOAL_COMPLETED = 'GOAL_COMPLETED';
const GOAL_INACTIVE = 'GOAL_INACTIVE';
const GOAL_FAILED = 'GOAL_FAILED';

const Component = require('./component');

const Goal = {};

const DIRS = [-1, 0, 1];
const DIRS_NO_ZERO = [-1, 1];

const debug = require('debug')('bitn:Goal');

/* Base class for all actor goals. */
class GoalBase {

    constructor(actor) {
        this.subGoals = null;
        this.actor = actor;
        this.status = GOAL_INACTIVE;
        this.type = '';
    }

    setType(type) {
        this.type = type;
    }

    getType() {
        return this.type;
    }

    activate() {
        // This should usually initialize subgoals for composite goal.
        // For atomic goals, can do computation like path-finding, FoV etc
        throw new Error('Pure virtual method');
    }

    activateIfInactive() {
        if (this.isInactive()) {
            this.activate();
        }
    }

    reactivateIfFailed() {
        if (this.hasFailed()) {
            this.status = GOAL_INACTIVE;
        }
    }

    // should return inactive, active, completed, failed
    process() {
        if (Array.isArray(this.subGoals)) {
            const status = this.subGoals[0].process();
            return status;
        }
        return this.status;
    }

    terminate() {
    }

    handleMsg(obj) {
        if (Array.isArray(this.subGoals)) {
            this.subGoals[this.subGoals.length - 1].handleMsg(obj);
        }
    }

    processSubGoals() {
        if (Array.isArray(this.subGoals)) {
            // Clean up any failed/completed goals
            while (this.subGoals.length > 0 && (this.subGoals[0].isCompleted()
                || this.subGoals[0].hasFailed())) {
                this.subGoals[0].terminate();
                this.subGoals.shift();
            }
            if (this.subGoals.length > 0) {
                const status = this.subGoals[0].process();

                /* if (this.subGoals[0].isCompleted() || this.subGoals[0].hasFailed()) {
                    this.subGoals.shift();
                }*/

                if (status === GOAL_COMPLETED && this.subGoals.length > 1) {
                    return GOAL_ACTIVE;
                }
                return status;
            }
            else {
                return GOAL_COMPLETED;
            }
        }
        else {
            throw new Error('No subgoals in atomic goal');
        }
    }

    removeAllSubGoals() {
        if (Array.isArray(this.subGoals)) {
            this.subGoals.forEach(goal => {goal.terminate();});
            this.subGoals = [];
        }
        debug(`${this.type} removed all subGoals`);
    }

    addSubGoal(goal) {
        if (!Array.isArray(this.subGoals)) {
            this.subGoals = [];
        }
        this.subGoals.unshift(goal);
        debug(`${this.type} added subGoal ${goal.getType()}`);
    }

    isInactive() {
        return this.status === GOAL_INACTIVE;
    }

    isActive() {
        return this.status === GOAL_ACTIVE;
    }

    hasFailed() {
        return this.status === GOAL_FAILED;
    }

    isCompleted() {
        return this.status === GOAL_COMPLETED;
    }
}
Goal.Base = GoalBase;

/* A goal for an actor to follow path from its current location to x,y */
class GoalFollowPath extends GoalBase {

    constructor(actor, xy) {
        super(actor);
        this.setType('GoalFollowPath');
        this.path = [];
        this.xy = xy;
    }

    /* If activated, will compute actor's path from current location to x,y */
    activate() {
        const [x, y] = this.xy;
        const [aX, aY] = [this.actor.getX(), this.actor.getY()];
        console.log(`${this.getType()} ${aX},${aY} -> ${x},${y}`);
        const map = this.actor.getLevel().getMap();
        const path = Path.getShortestActorPath(map, aX, aY, x, y);
        debug(`${this.getType()} activate() path length: ${path.length}`);
        this.path = path;
        this.status = GOAL_ACTIVE;
        debug(`${this.getType()} activate() path length: ${this.path.length}`);
    }

    /* Should check the next coordinate, and if actor can move to it. */
    process() {
        this.activateIfInactive();
        const level = this.actor.getLevel();
        if (this.path.length > 0) {
            const {x, y} = this.path[0];
            const [nextX, nextY] = [x, y];
            if (level.getMap().isPassable(nextX, nextY)) {
                const movComp = new Component.Movement(nextX, nextY, level);
                this.actor.add(movComp);
                this.path.shift();
                const n = this.path.length;
                debug(`${this.getType()} process() ret GOAL_ACTIVE, path ${n}`);
                if (this.path.length === 0) {
                    return GOAL_COMPLETED;
                }
                return GOAL_ACTIVE;
            }
            else {
                debug(`${this.getType()} process() ret GOAL_FAILED`);
                return GOAL_FAILED;
            }
        }
        debug(`${this.getType()} process() ret GOAL_COMPLETED`);
        return GOAL_COMPLETED;
    }

    terminate() {

    }

}
Goal.FollowPath = GoalFollowPath;

class GoalAttackActor extends GoalBase {

    constructor(actor, targetActor) {
        super(actor);
        this.setType('GoalAttackActor');
        this.targetActor = targetActor;
    }

    activate() {
        const brain = this.actor.getBrain();
        debug(`${this.getType()} activate() called`);

        // targetActor.isDead() -> completed
        if (this.targetActor.get('Health').isDead()) {
            this.status = GOAL_COMPLETED;
        }
        else {
            const [aX, aY] = this.targetActor.getXY();
            // const level = this.actor.getLevel();

            // If actor disappears, check last seen square
            // If in attack range, add subgoal to attack the target
            if (brain.canMeleeAttack(aX, aY)) {
                this.removeAllSubGoals();
                debug(`${this.getType()} canMeleeAttack()`);
                const hitGoal = new GoalHitActor(this.actor, this.targetActor);
                this.addSubGoal(hitGoal);
            }
            // If actor visible, add subgoal to move closer
            else if (brain.canSeeActor(this.targetActor)) {
                this.removeAllSubGoals();
                debug(`${this.getType()} subGoal FollowPath`);
                const pathGoal = new GoalFollowPath(this.actor, [aX, aY]);
                this.addSubGoal(pathGoal);
            }
            // If not visible, try to hunt the target
        }
        this.status = GOAL_ACTIVE;

    }

    process() {
        this.activateIfInactive();
        this.status = this.processSubGoals();
        return this.status;
    }

    terminate() {
        this.status = GOAL_COMPLETED;
    }

}
Goal.AttackActor = GoalAttackActor;


class GoalHitActor extends GoalBase {

    constructor(actor, targetActor) {
        super(actor);
        this.setType('GoalAttackActor');
        this.targetActor = targetActor;
    }

    activate() {
        const level = this.actor.getLevel();
        const [aX, aY] = this.targetActor.getXY();
        // const brain = this.actor.getBrain();
        const cell = level.getMap().getCell(aX, aY);
        const target = cell.getProp('actors')[0];
        const attackComp = new RG.Component.Attack(target);
        this.actor.add('Attack', attackComp);
        debug(`${this.getType()} added Attack comp`);
        this.status = GOAL_ACTIVE;
    }

    process() {
        this.activateIfInactive();
        this.status = GOAL_COMPLETED;
        return this.status;
    }

}


class GoalExplore extends GoalBase {

    constructor(actor) {
        super(actor);
        this.setType('GoalExplore');
    }

    activate() {
        const dX = RG.RAND.arrayGetRand(DIRS);
        let dY = RG.RAND.arrayGetRand(DIRS);
        if (dX === 0) {
            dY = RG.RAND.arrayGetRand(DIRS_NO_ZERO);
        }
        this.dX = dX;
        this.dY = dY;
        debug(`activate Explore dX,dY: ${dX},${dY}`);
        this.status = GOAL_ACTIVE;
    }

    process() {
        this.activateIfInactive();
        const [aX, aY] = this.actor.getXY();
        const newX = aX + this.dX;
        const newY = aY + this.dY;
        const level = this.actor.getLevel();
        if (level.getMap().isPassable(newX, newY)) {
            const movComp = new RG.Component.Movement(newX, newY, level);
            this.actor.add('Movement', movComp);
        }
        else {
            this.status = GOAL_COMPLETED;
        }
        return this.status;
    }

    terminate() {
        this.status = GOAL_COMPLETED;
    }

}

//---------------------------------------------------------------------------
// TOP-LEVEL GOALS
//---------------------------------------------------------------------------

/* Top-level goal for actors. Arbitrates each turn with a number of lower level
 * goals. */
class GoalThinkBasic extends GoalBase {

    constructor(actor) {
        super(actor);
    }

    activate() {
        this.arbitrate();
    }

    arbitrate() {
        const brain = this.actor.getBrain();
        const seenCells = brain.getSeenCells();

        // Arbitrate goal based on what's seen

        // If enemy seen
        const enemyCell = brain.findEnemyCell(seenCells);
        if (enemyCell) {
            debug(`${this.getType()} enemy is seen`);
            const targetActor = enemyCell.getActors()[0];
            const attackGoal = new GoalAttackActor(this.actor, targetActor);
            this.addGoal(attackGoal);
        }
        else {
            const exploreGoal = new GoalExplore(this.actor);
            this.addGoal(exploreGoal);
        }

    }

    process() {
        this.activateIfInactive();
        const status = this.processSubGoals();
        if (status === GOAL_COMPLETED || status === GOAL_FAILED) {
            return GOAL_INACTIVE;
        }
        debug(`ThinkBasic process() got status ${status}`);
        return status;
    }

    /* Prevents double addition of same type of goal. */
    isGoalPresent(goalType) {
        if (Array.isArray(this.subGoals)) {
            const goal = this.subGoals.find(g => g.getType() === goalType);
            if (goal && (!goal.hasFailed() && !goal.isCompleted())) {
                debug(`${this.getType()} subGoal ${goalType} already present.`);
                debug(`  Its status: ${goal.status}`);
                return true;
            }
        }
        return false;
    }

    addGoal(goal) {
        const type = goal.getType();
        debug(`${this.getType()} addGoal() ${type}`);
        switch (type) {
            case 'GoalExplore': if (!this.isGoalPresent(type)) {
                this.removeAllSubGoals();
                this.addSubGoal(goal);
            }
                break;
            case 'GoalAttackActor': if (!this.isGoalPresent(type)) {
                this.removeAllSubGoals();
                this.addSubGoal(goal);
            }
                break;
            default: {
                console.log('No type ' + type);
            }
        }
    }

    queueGoal(goal) {
        this.subGoals.push(goal);
    }

}
Goal.ThinkBasic = GoalThinkBasic;

module.exports = Goal;

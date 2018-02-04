
const Path = require('./path');
const RG = require('./rg');

const Component = require('./component');

const Goal = {};

Goal.GOAL_ACTIVE = 'GOAL_ACTIVE';
Goal.GOAL_COMPLETED = 'GOAL_COMPLETED';
Goal.GOAL_INACTIVE = 'GOAL_INACTIVE';
Goal.GOAL_FAILED = 'GOAL_FAILED';

const {
    GOAL_ACTIVE,
    GOAL_COMPLETED,
    GOAL_INACTIVE,
    GOAL_FAILED
} = Goal;

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

    /* Prevents double addition of same type of goal. Ignores failed/completed
     * goals. */
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

/* Goal used for patrolling between a list of coordinates. */
class GoalPatrol extends GoalBase {

    constructor(actor, coords) {
        super(actor);
        this.setType('GoalPatrol');
        this.coords = coords;
    }

    /* Calculates the points for patrolling. */
    activate() {

    }

    process() {
        this.activateIfInactive();

    }

}
Goal.Patrol = GoalPatrol;

/* Goal to attack the given actor. */
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
Goal.Explore = GoalExplore;

/* Goal for fleeing from a given actor. */
class GoalFleeFromActor extends GoalBase {

    constructor(actor, targetActor) {
        super(actor);
        this.setType('GoalFleeFromActor');
        this.targetActor = targetActor;
    }

    activate() {
        const brain = this.actor.getBrain();
        const seenCells = brain.getSeenCells();
        const actorCells = RG.Brain.findCellsWithActors(this.actor, seenCells);
        let foundCell = null;
        actorCells.forEach(cell => {
            const actors = cell.getActors();
            if (actors) {
                actors.forEach(actor => {
                    if (actor.getID() === this.targetActor.getID()) {
                        foundCell = cell;
                    }
                });
            }
        });
        if (foundCell) {
            const [x, y] = [foundCell.getX(), foundCell.getY()];
            const thisX = this.actor.getX();
            const thisY = this.actor.getY();
            const dX = x - thisX;
            const dY = y - thisY;
            const newX = thisX - dX;
            const newY = thisY - dY;
            const level = this.actor.getLevel();
            if (level.getMap().isPassable(newX, newY)) {
                const movComp = new Component.Movement(newX, newY, level);
                debug(`${this.getType()} movComp to ${newX},${newY}`);
                this.actor.add(movComp);
                this.status = GOAL_COMPLETED;
            }
            else {
                this.status = GOAL_FAILED;
            }
        }
        else {
            this.status = GOAL_FAILED;
        }
    }

    process() {
        this.activateIfInactive();
        return this.status;
    }

}
Goal.Flee = GoalFleeFromActor;


module.exports = Goal;

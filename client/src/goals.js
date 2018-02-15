
const debug = require('debug')('bitn:Goal');

const Path = require('./path');
const RG = require('./rg');
const Component = require('./component');

const Goal = {};

Goal.GOAL_ACTIVE = 'GOAL_ACTIVE';
Goal.GOAL_COMPLETED = 'GOAL_COMPLETED';
Goal.GOAL_INACTIVE = 'GOAL_INACTIVE';
Goal.GOAL_FAILED = 'GOAL_FAILED';

Goal.Types = {
    Move: Symbol(),
    Kill: Symbol(),
    Find: Symbol()
};

const {
    GOAL_ACTIVE,
    GOAL_COMPLETED,
    GOAL_INACTIVE,
    GOAL_FAILED
} = Goal;

let IND = 0;

//---------------------------------------------------------------------------
/* Base class for all actor goals. */
//---------------------------------------------------------------------------
class GoalBase {

    constructor(actor) {
        this.subGoals = null;
        this.actor = actor;
        this.status = GOAL_INACTIVE;
        this.type = '';
        this.category = '';
    }

    dbg(msg) {
        if (debug.enabled) {
            const ind = '  '.repeat(IND);
            const name = this.actor.getName();
            const typeAndStat = `[${this.getType()}] ${this.status}`;
            console.log(`${ind}${typeAndStat} ${name} ${msg}`);
        }
    }

    setCategory(category) {
        this.category = category;
    }

    getCategory() {
        return this.category;
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
            this.dbg('Activating inactive');
            this.activate();
        }
    }

    reactivateIfFailed() {
        if (this.hasFailed()) {
            this.dbg('Re-Activating failed');
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
        this.dbg('Goal terminated!');
        this.status = GOAL_COMPLETED;
    }

    handleMsg(obj) {
        if (Array.isArray(this.subGoals)) {
            this.subGoals[this.subGoals.length - 1].handleMsg(obj);
        }
    }

    processSubGoals() {
        ++IND;
        let status = '';
        this.dbg('Start processSubGoals()');

        if (Array.isArray(this.subGoals)) {
            // Clean up any failed/completed goals
            this.removeFinishedOrFailed();
            if (this.subGoals.length > 0) {
                status = this.subGoals[0].process();

                if (status === GOAL_COMPLETED && this.subGoals.length > 1) {
                    status = GOAL_ACTIVE;
                }
                // Else keep the sub-process status
            }
            else {
                status = GOAL_COMPLETED;
            }
        }
        else {
            const name = this.actor.getName();
            const msg = `Type: ${this.type}, actor: ${name}`;
            throw new Error(`${msg} No subgoals in atomic goal`);
        }

        --IND;
        this.dbg(`End processSubGoals() with status ${status}`);
        if (debug.enabled) {
            this.dbg(`  subGoals left: ${this.subGoals.map(g => g.getType())}`);
        }
        return status;
    }

    removeFinishedOrFailed() {
        while (this.subGoals.length > 0 && (this.subGoals[0].isCompleted()
            || this.subGoals[0].hasFailed())) {
            this.dbg(`Removing subGoal ${this.subGoals[0].getType()}`);
            this.subGoals[0].terminate();
            this.subGoals.shift();
        }
    }

    removeAllSubGoals() {
        if (Array.isArray(this.subGoals)) {
            this.subGoals.forEach(goal => {goal.terminate();});
            this.subGoals = [];
        }
        this.dbg('Removed all subGoals');
    }

    addSubGoal(goal) {
        if (!Array.isArray(this.subGoals)) {
            this.subGoals = [];
        }
        this.subGoals.unshift(goal);
        this.dbg(`Added subGoal ${goal.getType()}`);
        this.dbg(`   Subgoals are now: ${this.subGoals.map(g => g.getType())}`);
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
                this.dbg(`subGoal ${goalType} already present.`);
                this.dbg(`  SubGoal status: ${goal.status}`);
                return true;
            }
        }
        return false;
    }
}
Goal.Base = GoalBase;

//---------------------------------------------------------------------------
/* A goal for an actor to follow path from its current location to x,y */
//---------------------------------------------------------------------------
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
        this.dbg(`Calc path ${aX},${aY} -> ${x},${y}`);
        const map = this.actor.getLevel().getMap();
        const path = Path.getShortestActorPath(map, aX, aY, x, y);
        this.path = path;
        this.status = GOAL_ACTIVE;
        this.dbg(`activate() path length: ${this.path.length}`);
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
                if (this.path.length === 0) {
                    this.dbg(`process() ret GOAL_COMPL, path ${n}`);
                    this.status = GOAL_COMPLETED;
                    return GOAL_COMPLETED;
                }
                this.dbg(`process() ret GOAL_ACTIVE, path ${n}`);
                this.status = GOAL_ACTIVE;
                return GOAL_ACTIVE;
            }
            else {
                this.dbg('process() ret GOAL_FAILED');
                this.status = GOAL_FAILED;
                return GOAL_FAILED;
            }
        }
        this.dbg('process() ret GOAL_COMPLETED');
        this.status = GOAL_COMPLETED;
        return GOAL_COMPLETED;
    }

}
Goal.FollowPath = GoalFollowPath;

function getNextCoord(actor, dir) {
    const [x, y] = actor.getXY();
    return [x + dir[0], y + dir[1]];

}

/* Movement goal which does not fail/complete when blocked by friend actors.
 * terminates when enemy is seen or the actor hits a hard obstacle such as wall
 * or water.
 */
class GoalMoveUntilEnemy extends GoalBase {

    constructor(actor, dir) {
        super(actor);
        this.setType('GoalMoveUntilEnemy');
        this.dir = dir;
    }

    activate() {
        this.timeout = 100;
        this.status = GOAL_ACTIVE;
    }

    process() {
        this.activateIfInactive();
        const brain = this.actor.getBrain();
        const seenCells = brain.getSeenCells();
        const enemyCell = brain.findEnemyCell(seenCells);

        const [nextX, nextY] = getNextCoord(this.actor, this.dir);
        const map = this.actor.getLevel().getMap();

        if (enemyCell) {
            const [eX, eY] = [enemyCell.getX(), enemyCell.getY()];
            this.dbg(`Has moved enough. Enemy found @${eX},${eY}`);
            this.status = GOAL_COMPLETED;
        }
        else if (map.hasObstacle(nextX, nextY)) {
            this.status = GOAL_FAILED;
            this.dbg('OBSTACLE ENCOUNTERED');
        }
        else if (this.timeout === 0) {
            this.status = GOAL_FAILED;
            this.dbg('TIMEOUT REACHED');
        }
        else if (map.isPassable(nextX, nextY)) {
            const level = this.actor.getLevel();
            const movComp = new RG.Component.Movement(nextX, nextY, level);
            this.actor.add('Movement', movComp);

            const name = this.actor.getName();
            this.dbg(`Moving ${name} to ${nextX},${nextY}`);
        }
        // else IDLE here until cell is passable
        --this.timeout;

        return this.status;
    }

}
Goal.MoveUntilEnemy = GoalMoveUntilEnemy;

/* Variation of follow path where the target (actor) coordinate is excluded from
 * the path. */
class GoalGotoActor extends GoalFollowPath {

    constructor(actor, targetActor) {
        super(actor);
        this.setType('GoalGotoActor');
        this.xy = targetActor.getXY();
    }

    /* If activated, will compute actor's path from current location to x,y */
    activate() {
        const [x, y] = this.xy;
        const [aX, aY] = [this.actor.getX(), this.actor.getY()];
        this.dbg(`${this.getType()} ${aX},${aY} -> ${x},${y}`);
        const map = this.actor.getLevel().getMap();
        const path = Path.getActorToActorPath(map, aX, aY, x, y);
        this.dbg(`activate() path length: ${path.length}`);
        this.path = path;
        this.status = GOAL_ACTIVE;
        this.dbg(`activate() path length: ${this.path.length}`);
    }

}
Goal.GotoActor = GoalGotoActor;

//---------------------------------------------------------------------------
/* Goal used for patrolling between a list of coordinates. */
//---------------------------------------------------------------------------
class GoalPatrol extends GoalBase {

    constructor(actor, coords) {
        super(actor);
        this.setType('GoalPatrol');

        this.coords = coords;
        if (this.coords.length < 2) {
            RG.err('GoalPatrol', 'constructor',
                `Provide >= 2 coords for patrolling. Got ${coords}`);
        }
        this.currIndex = 0;
        this.currTarget = coords[this.currIndex];
        this.patrolDist = 3;
    }

    /* Calculates the points for patrolling. */
    activate() {
        // Calculate path from current point to patrol point
        this.dbg(`${this.getType()} activate()`);
        this.recomputePatrolPath();
    }

    process() {
        this.activateIfInactive();
        this.status = this.processSubGoals();
        this.dbg(`GoalPatrol process(), got subStatus: ${this.status}`);
        const firstGoal = this.subGoals[0];
        if (firstGoal.isCompleted()) {
            this.nextPatrolPoint();
        }
        else if (firstGoal.hasFailed()) {
            this.dbg(`${this.getType()} process() path failed`);
            const [x, y] = this.actor.getXY();
            const [patrolX, patrolY] = this.currTarget;
            const dist = Path.shortestDist(x, y, patrolX, patrolY);
            // Could not get all the way there, but close enough
            if (dist <= this.patrolDist) {
                this.nextPatrolPoint();
            }
            else {
                this.recomputePatrolPath();
            }
        }
        else {
            this.dbg(`${this.getType()} XXX NOT HERE!`);

        }
        return this.status;
    }

    nextPatrolPoint() {
        ++this.currIndex;
        if (this.currIndex >= this.coords.length) {
            this.currIndex = 0;
        }
        this.currTarget = this.coords[this.currIndex];
        this.addSubGoal(new GoalFollowPath(this.actor, this.currTarget));
        this.dbg(`${this.getType()} next patrol point ${this.currTarget}`);
        this.status = GOAL_ACTIVE;
    }

    recomputePatrolPath() {
        this.addSubGoal(new GoalFollowPath(this.actor, this.currTarget));
        this.dbg(`${this.getType()} recompute to point ${this.currTarget}`);
        this.status = GOAL_ACTIVE;
    }

}
Goal.Patrol = GoalPatrol;

//---------------------------------------------------------------------------
/* Goal to attack the given actor. */
//---------------------------------------------------------------------------
class GoalAttackActor extends GoalBase {

    constructor(actor, targetActor) {
        super(actor);
        this.setType('GoalAttackActor');
        this.targetActor = targetActor;
    }

    activate() {
        this.dbg('activate() called');

        // targetActor.isDead() -> completed
        this.selectSubGoal();
        this.status = GOAL_ACTIVE;
    }

    process() {
        this.activateIfInactive();

        // Need to recompute if a different enemy than current target
        // gets closer
        const brain = this.actor.getBrain();
        const seenCells = brain.getSeenCells();
        const enemyCell = brain.findEnemyCell(seenCells);
        if (enemyCell) {
            const actor = enemyCell.getActors()[0];
            if (this.targetActor.getID() !== actor.getID()) {
                if (this.print) {
                    const name = this.actor.getName();
                    const old = this.targetActor.getName();
                    const newName = actor.getName();
                    console.log(`${name}:: Recomp target ${old} -> ${newName}`);
                }
                this.targetActor = actor;
                brain.getMemory().setLastAttacked(actor);
                this.selectSubGoal();
            }
        }
        else {
            this.checkTargetStatus();
        }
        if (!this.isCompleted() && !this.hasFailed()) {
            this.status = this.processSubGoals();
        }
        return this.status;
    }

    terminate() {
        this.dbg('Terminating completed attack actor task');
        this.status = GOAL_COMPLETED;
    }

    canMissileAttack() {
        const [eX, eY] = this.targetActor.getXY();
        const [aX, aY] = this.actor.getXY();
        const miss = this.actor.getInvEq().getEquipment().getItem('missile');
        if (miss) {
            const range = RG.getMissileRange(this.actor, miss);
            const getDist = RG.Path.shortestDist(eX, eY, aX, aY);
            if (getDist <= range) {return true;}
            // TODO test for a clean shot
        }
        return false;
    }

    selectSubGoal() {
        const brain = this.actor.getBrain();
        this.checkTargetStatus();
        if (!this.isCompleted()) {
            const [eX, eY] = this.targetActor.getXY();

            // If actor disappears, check last seen square
            // If in attack range, add subgoal to attack the target
            if (brain.canMeleeAttack(eX, eY)) {
                this.removeAllSubGoals();
                this.dbg('canMeleeAttack() OK');
                const hitGoal = new GoalHitActor(this.actor, this.targetActor);
                this.addSubGoal(hitGoal);
            }
            else if (this.canMissileAttack()) {
                this.removeAllSubGoals();
                this.dbg('canMissileAttack() OK');
                const goal = new GoalShootActor(this.actor, this.targetActor);
                this.addSubGoal(goal);
            }
            // If actor visible, add subgoal to move closer
            else if (brain.canSeeActor(this.targetActor)) {
                this.removeAllSubGoals();
                this.dbg('canSeeActor subGoal GoalGotoActor');
                const goal = new GoalGotoActor(this.actor, this.targetActor);
                this.addSubGoal(goal);
            }
            // If not visible, try to hunt the target
            else {
                this.removeAllSubGoals();
                this.dbg('Moving blind subGoal GoalGotoActor');
                const goal = new GoalGotoActor(this.actor, this.targetActor);
                this.addSubGoal(goal);
            }
        }

    }

    checkTargetStatus() {
        if (this.targetActor.get('Health').isDead()) {
            this.removeAllSubGoals();
            this.status = GOAL_COMPLETED;
        }
        else if (!RG.inSameLevel(this.actor, this.targetActor)) {
            this.removeAllSubGoals();
            this.status = GOAL_COMPLETED;
        }
    }

}
Goal.AttackActor = GoalAttackActor;

//---------------------------------------------------------------------------
/* A goal to (melee) hit an actor. */
//---------------------------------------------------------------------------
class GoalHitActor extends GoalBase {

    constructor(actor, targetActor) {
        super(actor);
        this.setType('GoalHitActor');
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
        this.dbg(`${this.getType()} added Attack comp`);
        this.status = GOAL_ACTIVE;
    }

    process() {
        this.activateIfInactive();
        this.status = GOAL_COMPLETED;
        return this.status;
    }

}

//---------------------------------------------------------------------------
/* A goal to shoot an actor. */
//---------------------------------------------------------------------------
class GoalShootActor extends GoalBase {

    constructor(actor, targetActor) {
        super(actor);
        this.setType('GoalShootActor');
        this.targetActor = targetActor;
    }

    activate() {
        const [eX, eY] = this.targetActor.getXY();
        const mComp = new RG.Component.Missile(this.actor);
        const invEq = this.actor.getInvEq();
        const shotItem = invEq.unequipAndGetItem('missile', 1);

        mComp.setTargetXY(eX, eY);
        mComp.setDamage(RG.getMissileDamage(this.actor, shotItem));
        mComp.setAttack(RG.getMissileAttack(this.actor, shotItem));
        mComp.setRange(RG.getMissileRange(this.actor, shotItem));
        shotItem.add('Missile', mComp);
        this.dbg(`${this.getType()} added Missile comp`);
        this.status = GOAL_ACTIVE;
    }

    process() {
        this.activateIfInactive();
        this.status = GOAL_COMPLETED;
        return this.status;
    }

}

//---------------------------------------------------------------------------
/* An actor goal to explore the given area. */
//---------------------------------------------------------------------------
class GoalExplore extends GoalBase {

    constructor(actor) {
        super(actor);
        this.setType('GoalExplore');
    }

    activate() {
        const [dX, dY] = RG.RAND.getRandDir();
        this.dX = dX;
        this.dY = dY;
        this.dbg(`activate Explore dX,dY: ${dX},${dY}`);
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

//---------------------------------------------------------------------------
/* Goal for fleeing from a given actor. */
//---------------------------------------------------------------------------
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
                this.dbg(`${this.getType()} movComp to ${newX},${newY}`);
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

//---------------------------------------------------------------------------
/* An actor goal to explore the given area. */
//---------------------------------------------------------------------------
class GoalOrders extends GoalBase {

    constructor(actor) {
        super(actor);
        this.setType('GoalOrders');
    }

    activate() {
        this.status = GOAL_ACTIVE;
    }

    process() {
        this.activateIfInactive();
        this.status = this.processSubGoals();
        return this.status;
    }

}
Goal.Orders = GoalOrders;

module.exports = Goal;

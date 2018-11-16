
import dbg from 'debug';
const debug = dbg('bitn:Goal');

import RG from './rg';
import {Random} from './random';
import * as Component from './component';
import {Path, CoordXY, PathFunc} from './path';
import {SentientActor} from './actor';
import {SpellBase, SpellArgs} from './spell';
import * as Item from './item';
import {Brain} from './brain';

const RNG = Random.getRNG();
export const Goal: any = {};
Goal.ACTOR_FILTER = '';

Goal.GOAL_ACTIVE = 1;
Goal.GOAL_COMPLETED = 2;
Goal.GOAL_INACTIVE = 3;
Goal.GOAL_FAILED = 4;

Goal.Status = {
    1: 'GOAL_ACTIVE',
    2: 'GOAL_COMPLETED',
    3: 'GOAL_INACTIVE',
    4: 'GOAL_FAILED'
};

export const Types = {
    Normal: Symbol(),
    Move: Symbol(),
    Kill: Symbol(),
    Find: Symbol()
};
Goal.Types = Types;

const NO_SUB_GOALS = null;

const {
    GOAL_ACTIVE,
    GOAL_COMPLETED,
    GOAL_INACTIVE,
    GOAL_FAILED
} = Goal;

let IND = 0;

type Coord = [number, number];

//---------------------------------------------------------------------------
/* Base class for all actor goals. */
//---------------------------------------------------------------------------

export class GoalBase {

    public subGoals: GoalBase[] | null;
    public actor: SentientActor;
    public status: string;
    public type: string;
    public category: symbol;
    public planBGoal: GoalBase | null;

    constructor(actor) {
        this.subGoals = NO_SUB_GOALS;
        this.actor = actor;
        this.status = GOAL_INACTIVE;
        this.type = '';
        this.category = Types.Normal;

        this.planBGoal = null; // Can be set for a failed goal
    }

    public dbg(msg) {
        if (debug.enabled) {
            let nameMatch = false;
            if (!Goal.ACTOR_FILTER) {nameMatch = true;}
            if (!nameMatch) {
                const matchRe = new RegExp(Goal.ACTOR_FILTER);
                nameMatch = matchRe.test(this.actor.getName());
            }

            if (nameMatch) {
                const ind = '  '.repeat(IND);
                const name = this.actor.getName();
                const status = statusToString(this.status);
                const typeAndStat = `[${this.getType()}] ${status}`;
                console.log(`${ind}${typeAndStat} ${name} ${msg}`);
            }
        }
    }

    public setCategory(category) {
        this.category = category;
    }

    public getCategory() {
        return this.category;
    }

    public setType(type) {
        this.type = type;
    }

    public getType() {
        return this.type;
    }

    public hasPlanB() {
        return this.planBGoal !== null;
    }

    public getPlanB() {return this.planBGoal;}

    public activate() {
        // This should usually initialize subgoals for composite goal.
        // For atomic goals, can do computation like path-finding, FoV etc
        throw new Error('Pure virtual method');
    }

    public activateIfInactive() {
        if (this.isInactive()) {
            this.dbg('Activating inactive');
            this.activate();
        }
    }

    public reactivateIfFailed() {
        if (this.hasFailed()) {
            this.dbg('Re-Activating failed');
            this.status = GOAL_INACTIVE;
        }
    }

    // should return inactive, active, completed, failed
    public process() {
        if (Array.isArray(this.subGoals)) {
            const status = this.subGoals[0].process();
            return status;
        }
        return this.status;
    }

    public terminate() {
        this.dbg('Goal terminated!');
        this.status = GOAL_COMPLETED;
    }

    public handleMsg(obj) {
        if (Array.isArray(this.subGoals)) {
            this.subGoals[this.subGoals.length - 1].handleMsg(obj);
        }
    }

    public processSubGoals() {
        ++IND;
        let status = '';
        this.dbg('Start processSubGoals()');

        if (Array.isArray(this.subGoals)) {
            // Clean up any failed/completed goals
            this.removeFinishedOrFailed();
            if (this.subGoals.length > 0) {
                const subGoal = this.subGoals[0];
                status = subGoal.process();

                if (status === GOAL_COMPLETED && this.subGoals.length > 1) {
                    // This goal has still sub-goals, so keep active
                    status = GOAL_ACTIVE;
                }
                else if (status === GOAL_FAILED && subGoal.hasPlanB()) {
                    this.subGoals[0] = subGoal.getPlanB();
                    // Need to change the type to prevent evaluation changing
                    this.subGoals[0].setType(subGoal.getType());
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

    public removeFinishedOrFailed() {
        this.subGoals = this.subGoals.filter(goal => (
            !goal.isCompleted() && !goal.hasFailed()
        ));
    }

    public removeAllSubGoals() {
        if (Array.isArray(this.subGoals)) {
            this.subGoals.forEach(goal => {goal.terminate();});
            this.subGoals = [];
        }
        this.dbg('Removed all subGoals');
    }

    /* Removes all subGoals of given type. */
    public removeSubGoalsOfType(type) {
        let nRemoved = 0;
        if (Array.isArray(this.subGoals)) {
            let index = this.subGoals.findIndex(g => g.type === type);
            while (index >= 0) {
                this.subGoals[index].terminate();
                this.subGoals.splice(index, 1);
                ++nRemoved;
                index = this.subGoals.findIndex(g => g.type === type);
            }
        }
        return nRemoved;
    }

    public getSubGoals() {return this.subGoals;}

    /* Returns true if this goal has any subgoals in it. */
    public hasSubGoals(type?: string) {
        if (Array.isArray(this.subGoals)) {
            if (type) {
                const index = this.subGoals.findIndex(g => g.type === type);
                return index >= 0;
            }
            else {
                return this.subGoals.length > 0;
            }
        }
        return false;
    }

    public addSubGoal(goal) {
        if (!Array.isArray(this.subGoals)) {
            this.subGoals = [];
        }
        this.subGoals.unshift(goal);
        if (debug.enabled) {
            this.dbg(`Added subGoal ${goal.getType()}`);
            const subStr = this.subGoals.map(g => g.getType());
            this.dbg(`   Subgoals are now: ${subStr}`);
        }
    }

    public isInactive() {
        return this.status === GOAL_INACTIVE;
    }

    public isActive() {
        return this.status === GOAL_ACTIVE;
    }

    public hasFailed() {
        return this.status === GOAL_FAILED;
    }

    public isCompleted() {
        return this.status === GOAL_COMPLETED;
    }

    /* Prevents double addition of same type of goal. Ignores failed/completed
     * goals. */
    public isGoalPresent(goalType) {
        if (Array.isArray(this.subGoals)) {
            const goal = this.subGoals.find(g => g.getType() === goalType);
            if (goal && (!goal.hasFailed() && !goal.isCompleted())) {
                if (debug.enabled) {
                    this.dbg(`subGoal ${goalType} already present.`);
                    this.dbg(`  SubGoal status: ${goal.status}`);
                }
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
export class GoalFollowPath extends GoalBase {

    public path: CoordXY[];
    public xy: Coord;

    constructor(actor, xy) {
        super(actor);
        this.setType('GoalFollowPath');
        this.path = [];
        this.xy = xy;
    }

    /* If activated, will compute actor's path from current location to x,y */
    public activate() {
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
    public process() {
        this.activateIfInactive();
        if (this.path.length > 0) {
            return this.followPath();
        }
        this.dbg('process() ret GOAL_COMPLETED');
        this.status = GOAL_COMPLETED;
        return GOAL_COMPLETED;
    }

    public followPath() {
        const level = this.actor.getLevel();
        const [aX, aY] = this.actor.getXY();
        const {x, y} = this.path[0];
        const [nextX, nextY] = [x, y];
        const n = this.path.length;

        this.dbg(`followPath() test move ${aX},${aY} -> ${x},${y}, path ${n} `);
        if (level.getMap().isPassable(nextX, nextY)) {
            const dX = Math.abs(aX - x);
            const dY = Math.abs(aY - y);

            if (dX <= 1 && dY <= 1) {
                const movComp = new Component.Movement(nextX, nextY, level);
                this.actor.add(movComp);
                this.path.shift();
                if (this.path.length === 0) {
                    this.dbg(`followPath() ret GOAL_COMPL, path ${n}`);
                    this.status = GOAL_COMPLETED;
                    return GOAL_COMPLETED;
                }
                this.dbg(`followPath() ret GOAL_ACTIVE, path ${n}`);
                this.status = GOAL_ACTIVE;
                return GOAL_ACTIVE;
            }
            else {
                this.dbg(`followPath() strayed, ret GOAL_FAILED, path ${n}`);
                // Strayed from the path, mark as failed
                this.status = GOAL_FAILED;
                return GOAL_FAILED;
            }
        }
        else {
            this.dbg('followPathl() next NOT passable ret GOAL_FAILED');
            this.status = GOAL_FAILED;
            return GOAL_FAILED;
        }

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
export class GoalMoveUntilEnemy extends GoalBase {

    public dir: Coord;
    public timeout: number;

    constructor(actor, dir) {
        super(actor);
        this.setType('GoalMoveUntilEnemy');
        this.dir = dir;
    }

    public activate() {
        this.timeout = 100;
        this.status = GOAL_ACTIVE;
    }

    public process() {
        this.activateIfInactive();
        const brain = this.actor.getBrain();
        const seenCells = brain.getSeenCells();
        const enemyCell = brain.findEnemyCell(seenCells);

        const [nextX, nextY] = getNextCoord(this.actor, this.dir);
        const map = this.actor.getLevel().getMap();

        if (enemyCell) {
            const [eX, eY] = [enemyCell.getX(), enemyCell.getY()];
            if (debug.enabled) {
                this.dbg(`Has moved enough. Enemy found @${eX},${eY}`);
            }
            this.status = GOAL_COMPLETED;
        }
        else if (map.hasObstacle(nextX, nextY)) {
            this.status = GOAL_FAILED;
            if (debug.enabled) {this.dbg('OBSTACLE ENCOUNTERED');}
        }
        else if (this.timeout === 0) {
            this.status = GOAL_FAILED;
            if (debug.enabled) {this.dbg('TIMEOUT REACHED');}
        }
        else if (map.isPassable(nextX, nextY)) {
            const level = this.actor.getLevel();
            const movComp = new Component.Movement(nextX, nextY, level);
            this.actor.add(movComp);

            const name = this.actor.getName();
            if (debug.enabled) {
                this.dbg(`Moving ${name} to ${nextX},${nextY}`);
            }
        }
        // else IDLE here until cell is passable
        --this.timeout;

        return this.status;
    }

}
Goal.MoveUntilEnemy = GoalMoveUntilEnemy;

/* Variation of follow path where the target (actor) coordinate is excluded from
 * the path. */
export class GoalGotoActor extends GoalFollowPath {

    public targetActor: SentientActor;
    public pathFunc: PathFunc;

    constructor(actor, targetActor) {
        super(actor, [0, 0]);
        this.setType('GoalGotoActor');
        this.xy = targetActor.getXY();
        this.targetActor = targetActor;
        this.pathFunc = Path.getActorToActorPath;
    }

    /* If activated, will compute actor's path from current location to x,y */
    public activate() {
        const path = this.getPath();
        this.dbg(`activate() path length: ${path.length}`);
        this.path = path;
        this.status = GOAL_ACTIVE;
        this.dbg(`activate() path length: ${this.path.length}`);
    }

    public getPath() {
        const map = this.actor.getLevel().getMap();
        const [x, y] = this.xy;
        const [aX, aY] = [this.actor.getX(), this.actor.getY()];
        this.dbg(`${this.getType()} ${aX},${aY} -> ${x},${y}`);
        return Path.getActorToActorPath(map, aX, aY, x, y);
    }

    public process() {
        this.activateIfInactive();
        const [tX, tY] = [this.targetActor.getX(), this.targetActor.getY()];
        const [x, y] = this.xy;
        const dX = Math.abs(tX - x);
        const dY = Math.abs(tY - y);

        // Why this branch??
        if (dX > 2 || dY > 2) {
            this.followPath();
            this.status = GOAL_FAILED;
            return GOAL_FAILED;
        }
        else if (this.path.length > 0) {
            return this.followPath();
        }
        this.dbg('process() ret GOAL_COMPLETED');
        this.status = GOAL_COMPLETED;
        return GOAL_COMPLETED;
    }

}
Goal.GotoActor = GoalGotoActor;

/* Variation of GotoActor, in which only seen cells are taken into account to
 * make path finding faster. */
export class GoalGotoSeenActor extends GoalGotoActor {

    constructor(actor, targetActor) {
        super(actor, targetActor);
        this.setType('GoalGotoSeenActor');
    }

    public getPath() {
        const map = this.actor.getLevel().getMap();
        const [x, y] = this.xy;
        return Path.getShortestSeenPath(this.actor, map, x, y);
    }

}
Goal.GotoSeenActor = GoalGotoSeenActor;

/* Goal to patrol/guard a single x,y coordinate. */
export class GoalGuard extends GoalBase {

    public dist: number;
    public x: number;
    public y: number;

    constructor(actor, xy: Coord, dist = 1) {
        super(actor);
        this.setType('GoalGuard');
        this.dist = dist;
        this.x = xy[0];
        this.y = xy[1];
        this.subGoals = [];
    }

    public activate() {
        // Check if close enough to the target
        this.checkDistToGuardPoint();
    }

    public process() {
        this.activateIfInactive();
        this.status = this.processSubGoals();
        if (this.subGoals.length > 0) {
            const firstGoal = this.subGoals[0];
            if (firstGoal.hasFailed()) {
                this.checkDistToGuardPoint();
            }
        }
        else {
            this.checkDistToGuardPoint();
        }
    }

    public checkDistToGuardPoint() {
        // const [aX, aY] = this.actor.getXY();
        // const map = this.actor.getLevel().getMap();
        const [dX, dY] = RG.dXdYAbs([this.x, this.y], this.actor.getXY());
        // if (path.length > this.dist) {
        if (dX > this.dist || dY > this.dist) {
            this.addSubGoal(new GoalFollowPath(this.actor, [this.x, this.y]));
        }
        // else if (path.length < this.dist) {
            // moveToRandomDir(this.actor);
        // }
    }
}
Goal.Guard = GoalGuard;
//---------------------------------------------------------------------------
/* Goal used for patrolling between a list of coordinates. */
//---------------------------------------------------------------------------
export class GoalPatrol extends GoalBase {

    public coords: Coord[];
    public currTarget: Coord;
    public currIndex: number;
    public patrolDist: number;

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
    public activate() {
        // Calculate path from current point to patrol point
        this.dbg(`${this.getType()} activate()`);
        this.recomputePatrolPath();
    }

    public process() {
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

    public nextPatrolPoint() {
        ++this.currIndex;
        if (this.currIndex >= this.coords.length) {
            this.currIndex = 0;
        }
        this.currTarget = this.coords[this.currIndex];
        this.addSubGoal(new GoalFollowPath(this.actor, this.currTarget));
        this.dbg(`${this.getType()} next patrol point ${this.currTarget}`);
        this.status = GOAL_ACTIVE;
    }

    public recomputePatrolPath() {
        this.addSubGoal(new GoalFollowPath(this.actor, this.currTarget));
        this.dbg(`${this.getType()} recompute to point ${this.currTarget}`);
        this.status = GOAL_ACTIVE;
    }

}
Goal.Patrol = GoalPatrol;

//---------------------------------------------------------------------------
/* Goal to attack the given actor. */
//---------------------------------------------------------------------------
export class GoalAttackActor extends GoalBase {
    public targetActor: SentientActor;

    public print: boolean;

    constructor(actor, targetActor) {
        super(actor);
        this.setType('GoalAttackActor');
        this.targetActor = targetActor;
    }

    public activate() {
        this.dbg('activate() called');

        // targetActor.isDead() -> completed
        this.selectSubGoal();
        if (!this.isCompleted()) {
            this.status = GOAL_ACTIVE;
        }
    }

    public process() {
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
                    RG.log(`${name}:: Recomp target ${old} -> ${newName}`);
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

    public terminate() {
        this.dbg('Terminating completed attack actor task');
        this.status = GOAL_COMPLETED;
    }

    public canMissileAttack() {
        const [eX, eY] = this.targetActor.getXY();
        const [aX, aY] = this.actor.getXY();
        const miss = this.actor.getInvEq().getEquipment().getItem('missile');
        if (miss) {
            const range = RG.getMissileRange(this.actor, miss);
            const getDist = Path.shortestDist(eX, eY, aX, aY);
            if (getDist <= range) {return true;}
            // TODO test for a clean shot
        }
        return false;
    }

    public selectSubGoal() {
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
                // const goal = new GoalGotoActor(this.actor, this.targetActor);
                const goal = new GoalGotoSeenActor(this.actor,
                    this.targetActor);
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

    public checkTargetStatus() {
        const healthComp = this.targetActor.get('Health');
        if (!healthComp) {
            const json = JSON.stringify(this.targetActor);
            const attacker = JSON.stringify(this.actor);
            RG.log('Attacker: ' + attacker);
            RG.err('GoalAttackActor', 'checkTargetStatus',
                'target has no health: ' + json);
        }

        if (healthComp.isDead()) {
            this.removeAllSubGoals();
            this.status = GOAL_COMPLETED;
            this.dbg('Enemy is dead. Goal completed');
        }
        else if (!RG.inSameLevel(this.actor, this.targetActor)) {
            this.removeAllSubGoals();
            this.status = GOAL_COMPLETED;
            this.dbg('Enemy not in this level. Goal completed');
        }
    }

}
Goal.AttackActor = GoalAttackActor;

//---------------------------------------------------------------------------

//---------------------------------------------------------------------------
/* A goal to (melee) hit an actor. */
//---------------------------------------------------------------------------
export class GoalHitActor extends GoalBase {
    public targetActor: SentientActor;

    constructor(actor, targetActor) {
        super(actor);
        this.setType('GoalHitActor');
        this.targetActor = targetActor;
    }

    public activate() {
        const level = this.actor.getLevel();
        const [aX, aY] = this.targetActor.getXY();
        const cell = level.getMap().getCell(aX, aY);
        const target = cell.getProp('actors')[0];
        const attackComp = new Component.Attack({target});
        this.actor.add(attackComp);
        this.dbg(`${this.getType()} added Attack comp`);
        this.status = GOAL_ACTIVE;
    }

    public process() {
        this.activateIfInactive();
        this.status = GOAL_COMPLETED;
        return this.status;
    }

}

//---------------------------------------------------------------------------
/* A goal to shoot an actor. */
//---------------------------------------------------------------------------
export class GoalShootActor extends GoalBase {
    public targetActor: SentientActor;

    constructor(actor, targetActor) {
        super(actor);
        this.setType('GoalShootActor');
        this.targetActor = targetActor;
    }

    public activate() {
        const [eX, eY] = this.targetActor.getXY();
        const mComp = new Component.Missile(this.actor);
        const invEq = this.actor.getInvEq();
        const shotItem = invEq.unequipAndGetItem('missile', 1);

        if (!shotItem) {
            return;
        }

        mComp.setTargetXY(eX, eY);
        mComp.setDamage(RG.getMissileDamage(this.actor, shotItem));
        mComp.setAttack(RG.getMissileAttack(this.actor, shotItem));
        mComp.setRange(RG.getMissileRange(this.actor, shotItem));
        shotItem.add(mComp);
        this.dbg(`${this.getType()} added Missile comp`);
        this.status = GOAL_ACTIVE;
    }

    public process() {
        this.activateIfInactive();
        this.status = GOAL_COMPLETED;
        return this.status;
    }

}

//---------------------------------------------------------------------------
/* An actor goal to explore the given area. */
//---------------------------------------------------------------------------
export class GoalExplore extends GoalBase {

    public dur: number;
    public dX: number;
    public dY: number;
    public exploreCb: (x: number, y: number) => void;

    constructor(actor, dur = -1) {
        super(actor);
        this.setType('GoalExplore');
        this.dur = dur;
    }

    public activate() {
        this.setNewPassableDir();
        this.dbg(`activate Explore dX,dY: ${this.dX},${this.dY}`);
        this.status = GOAL_ACTIVE;
    }

    /* Can be used to set the Explore callback called after each turn. */
    public setCallback(cb) {
        this.exploreCb = cb;
    }

    public setNewPassableDir() {
        let maxTries = 5;
        let [dX, dY] = RNG.getRandDir();
        while (maxTries > 0 && !this.isDirPassable(dX, dY)) {
            [dX, dY] = RNG.getRandDir();
            --maxTries;
        }
        this.dX = dX;
        this.dY = dY;
    }

    /* Returns true if given dX,dY is passable direction from actor's current
     * location. */
    public isDirPassable(dX, dY) {
        const [aX, aY] = this.actor.getXY();
        const newX = aX + dX;
        const newY = aY + dY;
        return this.actor.getLevel().getMap().isPassable(newX, newY);
    }

    public shouldMoveTo(map, x, y) {
        const cell = map.getCell(x, y);
        if (cell.isPassable()) {
            return !cell.isDangerous();
        }
        return false;
    }

    public process() {
        this.activateIfInactive();
        this.checkChangeDir();
        --this.dur;
        const [aX, aY] = this.actor.getXY();
        const newX = aX + this.dX;
        const newY = aY + this.dY;
        const level = this.actor.getLevel();
        const map = level.getMap();
        if (map.hasXY(newX, newY)) {
            if (this.shouldMoveTo(map, newX, newY)) {
                const movComp = new Component.Movement(newX, newY, level);
                this.actor.add(movComp);
            }
            else if (!this.canOpenDoorAt(map, newX, newY)) {
                this.setNewPassableDir();
            }
        }
        else {
            this.setNewPassableDir();
        }
        if (this.dur === 0) {
            this.status = GOAL_COMPLETED;
        }
        if (this.exploreCb) {
            this.exploreCb(newX, newY);
        }
        return this.status;
    }

    public canOpenDoorAt(map, x, y) {
        const cell = map.getCell(x, y);
        if (cell.hasDoor()) {
            const door = cell.getPropType('door')[0];
            if (door.canToggle()) {
                const comp = new Component.OpenDoor();
                comp.setDoor(door);
                this.actor.add(comp);
                return true;
            }
        }
        return false;
    }

    /* Checks if the actor should change movement direction. */
    public checkChangeDir() {
        const changeDir = RNG.getUniform();
        if (changeDir <= 0.07) {
            const newDx = this.changeDir(this.dX);
            if (this.isDirPassable(newDx, this.dY)) {
                if (newDx !== 0 || this.dY !== 0) {
                    this.dX = newDx;
                }
            }
        }
        else if (changeDir <= 0.14) {
            const newDy = this.changeDir(this.dY);
            if (this.isDirPassable(this.dX, newDy)) {
                if (newDy !== 0 || this.dX !== 0) {
                    this.dY = newDy;
                }
            }
        }
    }

    public changeDir(dir) {
        switch (dir) {
            case 0: return RNG.arrayGetRand([-1, 1]);
            case 1: return 0;
            case -1: return 0;
            default: return dir;
        }
    }

    public terminate() {
        this.status = GOAL_COMPLETED;
    }

}
Goal.Explore = GoalExplore;

//---------------------------------------------------------------------------
/* Goal for fleeing from a given actor. */
//---------------------------------------------------------------------------
export class GoalFleeFromActor extends GoalBase {
    public targetActor: SentientActor;

    constructor(actor, targetActor) {
        super(actor);
        this.setType('GoalFleeFromActor');
        this.targetActor = targetActor;
    }

    public activate() {
        const brain = this.actor.getBrain();
        const seenCells = brain.getSeenCells();
        const actorCells = Brain.findCellsWithActors(this.actor, seenCells);
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
            // const [x, y] = [foundCell.getX(), foundCell.getY()];
            const thisX = this.actor.getX();
            const thisY = this.actor.getY();
            const dXdY = RG.dXdYUnit(this.actor, this.targetActor);
            const newX = thisX + dXdY[0];
            const newY = thisY + dXdY[1];
            const level = this.actor.getLevel();

            const fleeOptions = [[newX, newY], [thisX, newY], [newX, thisY]];
            for (let i = 0; i < 3; i++) {
                const [x, y] = fleeOptions[i];
                if (level.getMap().isPassable(x, y)) {
                    const movComp = new Component.Movement(x, y, level);
                    this.dbg(`${this.getType()} movComp to ${x},${y}`);
                    this.actor.add(movComp);
                    this.status = GOAL_COMPLETED;
                    break;
                }
            }

            if (this.status !== GOAL_COMPLETED) {
                this.status = GOAL_FAILED;
                this.planBGoal = new Goal.AttackActor(this.actor,
                    this.targetActor);
            }
        }
        else {
            this.status = GOAL_FAILED;
        }
    }

    public process() {
        this.activateIfInactive();
        return this.status;
    }

}
Goal.FleeFromActor = GoalFleeFromActor;

/* Goal used when actor is casting a spell. Spell is always an instantaneous
 * goal taking exactly one turn to process. */
export class GoalCastSpell extends GoalBase {

    public spell: any;
    public spellArgs: SpellArgs;

    constructor(actor, spell, spellArgs) {
        super(actor);
        this.setType('GoalCastSpell');
        this.spell = spell;
        this.spellArgs = spellArgs;
    }

    public activate() {
        const castFunc = this.spell.getCastFunc(this.actor, this.spellArgs);
        castFunc();
        this.status = GOAL_COMPLETED;
    }

    public process() {
        this.activateIfInactive();
        return this.status;
    }
}
Goal.CastSpell = GoalCastSpell;

//---------------------------------------------------------------------------
/* An actor goal to follow a specific actor */
//---------------------------------------------------------------------------
export class GoalFollow extends GoalBase {
    public targetActor: SentientActor;

    constructor(actor, targetActor) {
        super(actor);
        this.setType('GoalFollow');
        this.targetActor = targetActor;
    }

    public activate() {
        if (this.actor.getBrain().canSeeActor(this.targetActor)) {
            this.status = GOAL_ACTIVE;
        }
    }

    public process() {
        this.activateIfInactive();
        const brain = this.actor.getBrain();
        const [x, y] = this.actor.getXY();

        if (brain.canSeeActor(this.targetActor)) {
            const [dxU, dyU] = RG.dXdYUnit(this.targetActor, this.actor);
            const [dx, dy] = RG.dXdY(this.targetActor, this.actor);
            let newX = x + dxU;
            let newY = y + dyU;
            const level = this.targetActor.getLevel();
            const map = level.getMap();

            if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
                // Goal OK, already very close
                this.status = GOAL_ACTIVE;
            } // Simple dXdY movement
            else if (map.isPassable(newX, newY)) {
                const movComp = new Component.Movement(newX, newY, level);
                this.actor.add(movComp);
            }
            else { // Apply proper path finding
                const [tX, tY] = this.targetActor.getXY();
                const path = Path.getActorToActorPath(map, x, y, tX, tY);
                if (path.length > 0) {
                    [newX, newY] = [path[0].x, path[0].y];
                    if (map.isPassable(newX, newY)) {
                        const movComp = new Component.Movement(
                            newX, newY, level);
                        this.actor.add(movComp);
                    }
                    else {
                        this.status = GOAL_FAILED;
                    }
                }
                else { // No path to follow the actor
                    this.status = GOAL_FAILED;
                }
            }
        }
        else {
            this.status = GOAL_FAILED;
        }
        return this.status;
    }

}
Goal.Follow = GoalFollow;

/* Goal for picking up items. */
export class GoalGetItem extends GoalBase {
    public targetItem: Item.ItemBase;

    constructor(actor, targetItem) {
        super(actor);
        this.setType('GoalGetItem');
        this.targetItem = targetItem;
    }

    public activate() {
        // Options for getting an item are:
        //   1. Find it
        const itemId = this.targetItem.getID();
        const brain = this.actor.getBrain();
        const seenCells = brain.getSeenCells();

        // Check if we can see the item here
        let foundCell = null;
        seenCells.forEach(cell => {
            if (cell.hasItems()) {
                const items = cell.getItems();
                const item = items.find(i => i.getID() === itemId);
                if (item) {
                    foundCell = cell;
                }
            }
        });

        if (foundCell) {
            const [x, y] = this.actor.getXY();
            const [iX, iY] = foundCell.getXY();
            // If on top of it, pick it up
            if (x === iX && y === iY) {
                const pickup = new Component.Pickup();
                this.actor.add(pickup);
                this.status = GOAL_COMPLETED;
            }
            else { // otherwise try to move closer
                const goal = new GoalFollowPath(this.actor, [iX, iY]);
                this.removeAllSubGoals();
                this.addSubGoal(goal);
                this.status = this.processSubGoals();
            }
        }
        else {
            this.status = GOAL_FAILED;
        }
    }

    public process() {
        this.activateIfInactive();
        if (this.hasSubGoals()) {
            this.status = this.processSubGoals();
        }
        return this.status;
    }

}
Goal.GetItem = GoalGetItem;
//---------------------------------------------------------------------------
/* An actor goal to explore the given area. */
//---------------------------------------------------------------------------
export class GoalOrders extends GoalBase {

    constructor(actor) {
        super(actor);
        this.setType('GoalOrders');
    }

    public activate() {
        this.status = GOAL_ACTIVE;
    }

    public process() {
        this.activateIfInactive();
        this.status = this.processSubGoals();
        return this.status;
    }

}
Goal.Orders = GoalOrders;

/* Goal for shopkeeper. */
export class GoalShopkeeper extends GoalBase {
    public x: number;
    public y: number;
    public hasShouted: boolean;

    constructor(actor, x, y) {
        super(actor);
        this.setType('GoalShopkeeper');
        this.x = x;
        this.y = y;
        this.hasShouted = false;
        this.subGoals = [];
    }

    public activate() {
        this.status = GOAL_ACTIVE;
        // If on a shop element, do something
        const cell = this.actor.getCell();
        if (cell.hasShop()) {
            // TODO verify we're in correct shop
            // Rearrange items
            // Persuade actors to sell their stuff
            if (RG.isSuccess(0.6)) {
                moveToRandomDir(this.actor);
            }
            else if (!this.hasShouted) {
                const comm = new Component.Communication();
                comm.addMsg({src: this.actor,
                    type: 'Shout', shout: 'Hello traveller!'});
                this.actor.add(comm);
            }
            else if (!cell.hasItems()) {
                // Spawn items
            }
        }
        else {
            // Else find a path back to shop
            const goal = new GoalFollowPath(this.actor, [this.x, this.y]);
            // this.removeAllSubGoals();
            this.addSubGoal(goal);
            this.status = this.processSubGoals();
        }
    }

    public process() {
        this.activateIfInactive();
        this.status = this.processSubGoals();
        return this.status;
    }

}
Goal.Shopkeeper = GoalShopkeeper;


export class GoalGoHome extends GoalBase {
    public x: number;
    public y: number;
    public maxDist: number;

    constructor(actor, x, y, dist) {
        super(actor);
        this.setType('GoalGoHome');
        this.x = x;
        this.y = y;
        this.maxDist = dist;
        this.subGoals = [];
    }

    public activate() {
        this.status = GOAL_ACTIVE;
        const cell = this.actor.getCell();
        if (cell.getBaseElem().getType() === 'floorhouse') {
            if (RG.isSuccess(0.03)) {
                const comm = new Component.Communication();
                comm.addMsg({src: this.actor,
                    type: 'Shout', shout: 'Home sweet home!'});
                this.actor.add(comm);
            }
            else {
                moveToRandomDir(this.actor);
            }
        }
        else if (RG.withinRange(this.maxDist, [this.x, this.y], this.actor)) {
            moveToRandomDir(this.actor);
        }
        else {
            const goal = new GoalFollowPath(this.actor, [this.x, this.y]);
            this.addSubGoal(goal);
            this.status = this.processSubGoals();
        }
    }

    public process() {
        this.activateIfInactive();
        this.status = this.processSubGoals();
        return this.status;
    }

}
Goal.GoHome = GoalGoHome;

function moveToRandomDir(actor) {
    const level = actor.getLevel();
    const map = level.getMap();

    let dir = RNG.getRandDir();
    let xy = RG.newXYFromDir(dir, actor);
    let tries = 10;
    while (!map.hasXY(xy[0], xy[1])) {
        dir = RNG.getRandDir();
        xy = RG.newXYFromDir(dir, actor);
        if (--tries === 0) {break;}
    }
    if (tries > 0) {
        const movComp = new Component.Movement(xy[0], xy[1], level);
        actor.add(movComp);
    }
    // Tried to move outside map
}
Goal.moveToRandomDir = moveToRandomDir;

function moveActorTo(actor, cell) {
    const xy = cell.getXY();
    const level = actor.getLevel();
    if (level.getMap().isPassable(xy[0], xy[1])) {
        const movComp = new Component.Movement(xy[0], xy[1], level);
        actor.add(movComp);
    }
}
Goal.moveActorTo = moveActorTo;


/* Class used for monitoring the Goal transitions etc. */
export class GoalMonitor {
    public goal: GoalBase;

    constructor(goal) {
        this.goal = goal;
    }

}
Goal.Monitor = GoalMonitor;

export class GoalCommunicate extends GoalBase {

    constructor(actor) {
        super(actor);
        this.setType('GoalCommunicate');
    }

    public activate() {
        this.communicateEnemies();
    }

    public process() {
        this.activateIfInactive();
        return Goal.GOAL_COMPLETED;
    }

    public communicateEnemies() {
        const brain = this.actor.getBrain();
        const memory = brain.getMemory();
        const enemies = memory.getEnemies();
        const seenCells = brain.getSeenCells();
        const friendCell = brain.findFriendCell(seenCells);
        const friendActor = friendCell.getActors()[0];

        const comComp = new Component.Communication();
        const msg = {type: 'Enemies', enemies, src: this.actor};
        comComp.addMsg(msg);

        friendActor.add(comComp);
        memory.addCommunicationWith(friendActor);
    }

}
Goal.Communicate = GoalCommunicate;

function statusToString(status) {
    return Goal.Status[status];
}

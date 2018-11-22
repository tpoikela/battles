
/* This file contains Battle-related goals used by NPC actors. */

import RG from './rg';
import {Goal, GoalBase} from './goals';
import {Evaluator} from './evaluators';
import {BaseActor, SentientActor, isSentient} from './actor';
import * as Component from './component';

type BrainGoalOriented = import('./brain').BrainGoalOriented;

const {GOAL_ACTIVE, GOAL_COMPLETED} = Goal;

export const GoalsBattle: any = {};

export const orderWithGoal = (actor, obj) => {
    const {bias} = obj;
    const orderEval = new Evaluator.Orders(bias);
    orderEval.setArgs({srcActor: obj.src, goal: obj.goal});
    if (!actor.isPlayer()) {
        if (typeof actor.getBrain().getGoal === 'function') {
            const topGoal = actor.getBrain().getGoal();
            topGoal.clearOrders();
            topGoal.giveOrders(orderEval);
        }
        else {
            const msg = 'Actor without getGoal: ' + JSON.stringify(actor);
            RG.warn('goals-battle.js', 'orderWithGoal', msg);
        }
    }
    else {
        const orderComp = new Component.BattleOrder();
        const args = {
            srcActor: obj.src
        };
        orderComp.setArgs(args);
        actor.add(orderComp);
    }
};
GoalsBattle.orderWithGoal = orderWithGoal;

export const injectOrderEval = (target: SentientActor, goal: GoalBase, args) => {
    if (isSentient(target)) {
        const orderEval = new Evaluator.Orders(args.bias);
        orderEval.setArgs({srcActor: args.src, goal});
        const brain = target.getBrain() as BrainGoalOriented;
        const topGoal = brain.getGoal();
        topGoal.clearOrders();
        topGoal.giveOrders(orderEval);
    }
};

export const giveFollowOrder = (target: BaseActor, args) => {
    if (isSentient(target)) {
        const goal = new Goal.Follow(target, args.src);
        injectOrderEval(target, goal, args);
    }
};
GoalsBattle.giveFollowOrder = giveFollowOrder;

export const giveAttackOrder = (target: BaseActor, args) => {
    if (isSentient(target)) {
        const goal = new Goal.AttackActor(target, args.enemy);
        injectOrderEval(target, goal, args);
    }
};
GoalsBattle.giveAttackOrder = giveAttackOrder;

export const givePickupOrder = (target: BaseActor, args) => {
    if (isSentient(target)) {
        const goal = new Goal.GetItem(target, args.item);
        injectOrderEval(target, goal, args);
    }
};
GoalsBattle.givePickupOrder = givePickupOrder;

/* Clears the given orders from non-enemy actor. */
export const giveClearOrders = (target: BaseActor, args) => {
    if (isSentient(target)) {
        const {src} = args;
        if (!target.isEnemy(src)) {
            const brain = target.getBrain() as BrainGoalOriented;
            const topGoal = brain.getGoal();
            topGoal.clearOrders();
        }
    }
};
GoalsBattle.giveClearOrders = giveClearOrders;

//---------------------------------------------------------------------------
// COMPOSITE GOALS
//---------------------------------------------------------------------------

export class GoalWinBattle extends GoalBase {

    constructor(actor) {
        super(actor);
        this.setType('GoalWinBattle');
    }

    activate() {
        // If enemy not seen
        const brain = this.actor.getBrain();
        const seenCells = brain.getSeenCells();
        const enemy = brain.findEnemyCell(seenCells);
        if (!enemy) {
            this.addSubGoal(new GoalFindEnemyArmy(this.actor));
            this.dbg('Activated goal. Added FindEnemyArmy');
        }
        else {
            this.addSubGoal(new GoalEngageEnemy(this.actor));
            this.dbg('Activated goal. Added EngageEnemy');
        }
        this.status = GOAL_ACTIVE;
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
export class GoalFollowArmy extends GoalBase {

    constructor(actor) {
        super(actor);
        this.setType('GoalFollowArmy');
    }

    activate() {
        // TODO
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

/* Object which maps a level into a macro grid. This can be used to check if
 * actor has visited certain part of the level. */
export class LevelGrid {
    public gridCols: number;
    public gridRows: number;
    public xMap: number;
    public yMap: number;
    public xMapHalf: number;
    public yMapHalf: number;

    public grid: any[][];

    constructor(level, xMap, yMap) {
        const map = level.getMap();
        const [cols, rows] = [map.cols, map.rows];

        let gridCols = Math.floor(cols / xMap);
        let gridRows = Math.floor(rows / yMap);
        if (cols % xMap !== 0) {++gridCols;}
        if (rows % yMap !== 0) {++gridRows;}

        this.grid = [];
        for (let x = 0; x < gridCols; x++) {
            this.grid[x] = [];
            for (let y = 0; y < gridRows; y++) {
                this.grid[x][y] = {data: [x, y]};
            }
        }

        this.gridCols = gridCols;
        this.gridRows = gridRows;
        this.xMap = xMap;
        this.yMap = yMap;
        this.xMapHalf = Math.floor(xMap / 2);
        this.yMapHalf = Math.floor(yMap / 2);
    }

    getCenterLevelXY(gridXY) {
        const [gridX, gridY] = gridXY;
        const x = gridX * this.xMap + this.xMapHalf;
        const y = gridY * this.yMap + this.yMapHalf;
        return [x, y];
    }

    /* Given level x,y coordinates, returns the grid x,y corresponding to
     * this. */
    getGridXY(levelXY) {
        const [x, y] = levelXY;
        const gridX = Math.floor(x / this.xMap);
        const gridY = Math.floor(y / this.yMap);
        return [gridX, gridY];
    }

    setDataLevelXY(xy, key, data) {
        const [gridX, gridY] = this.getGridXY(xy);
        this.grid[gridX][gridY][key] = data;
    }

    setDataGridXY(gridXY, key, data) {
        const [gridX, gridY] = gridXY;
        this.grid[gridX][gridY][key] = data;
    }

    isTrue(gridXY, key) {
        const [gridX, gridY] = gridXY;
        return this.grid[gridX][gridY][key] === true;
    }

    hasProp(gridXY, key) {
        const [gridX, gridY] = gridXY;
        return this.grid[gridX][gridY].hasOwnProperty(key);
    }

    getDataGridXY(gridXY) {
        const [gridX, gridY] = gridXY;
        return this.grid[gridX][gridY];
    }

    getDataLevelXY(xy) {
        const [gridX, gridY] = this.getGridXY(xy);
        return this.grid[gridX][gridY];
    }

    debugPrint() {
        for (let y = 0; y < this.gridRows; y++) {
            let row = '||';
            for (let x = 0; x < this.gridCols; x++) {
                row += JSON.stringify(this.grid[x][y]) + ' ||';
            }
            RG.diag(row);
            RG.diag('='.repeat(row.length));
        }
    }


}

/* Goal to find the enemy army. Commander will choose a direction, and the whole
 * army will march into that direction. */
export class GoalFindEnemyArmy extends GoalBase {

    public gridSeen: LevelGrid;
    public adjustRate: number;

    constructor(actor) {
        super(actor);
        this.setType('GoalFindEnemyArmy');

        const level = actor.getLevel();
        this.gridSeen = new LevelGrid(level, 10, 10);
        const [x, y] = this.actor.getXY();
        this.gridSeen.setDataLevelXY([x, y], 'seen', true);
        // this.gridSeen.debugPrint();
        // How often commander issues a new order
        this.adjustRate = 50;
    }

    activate() {
        this.selectDirToMove();
        this.status = GOAL_ACTIVE;
    }

    process() {
        this.activateIfInactive();
        if (this.adjustRate > 0) {
            --this.adjustRate;
        }
        else {
            this.selectDirToMove();
            this.adjustRate = 50;
        }
        this.status = this.processSubGoals();
        return this.status;
    }

    /* Selects the movement direction for the army. */
    selectDirToMove() {
        const brain = this.actor.getBrain();

        const cmdDir = [0, 0];
        const level = this.actor.getLevel();
        const [x, y] = this.actor.getXY();

        const centerX = level.getMap().cols / 2;
        const centerY = level.getMap().rows / 2;

        if (x < centerX) {cmdDir[0] = 1;}
        else if (x > centerX) {cmdDir[0] = -1;}
        if (y < centerY) {cmdDir[1] = 1;}
        else if (y > centerY) {cmdDir[1] = -1;}

        this.dbg(`Cmd army to move to dir ${cmdDir}`);

        // If enemy not seen, order move until found
        const actors = brain.getSeenFriends();
        this.dbg(`${actors.length} friends found for command`);
        actors.forEach(actor => {
            const goal = new Goal.MoveUntilEnemy(actor, cmdDir);
            orderWithGoal(actor, {src: this.actor, bias: 1.0, goal});
        });

        this.dbg('Issued Move order to ' + actors.length + ' actors');

        const moveGoal = new Goal.MoveUntilEnemy(this.actor, cmdDir);
        this.removeAllSubGoals();
        this.addSubGoal(moveGoal);
    }

}
GoalsBattle.FindEnemyArmy = GoalFindEnemyArmy;

/* Tells to own army actors to attack the most suitable enemy. */
export class GoalEngageEnemy extends GoalBase {
    public enemy: SentientActor;

    constructor(actor) {
        super(actor);
        this.setType('GoalEngageEnemy');
    }

    activate() {
        // const actors = this.actor.brain.getSeenFriends();
        this.dbg('ATTACK ENEMY activate()');
        const brain = this.actor.getBrain();
        const enemies = brain.getSeenEnemies();

        if (enemies.length === 0) {return;}

        const actors = brain.getSeenFriends();
        actors.forEach(actor => {
            const goal = new Goal.AttackActor(actor, enemies[0]);
            orderWithGoal(actor, {src: this.actor, bias: 2.0, goal});
        });

        this.enemy = enemies[0] as SentientActor;
        const goal = new Goal.AttackActor(this.actor, enemies[0]);
        this.addSubGoal(goal);

        // Allocate attackers cleverly

        this.status = GOAL_ACTIVE;
    }

    process() {
        this.activateIfInactive();
        this.dbg('ATTACK ENEMY process()');
        this.status = this.processSubGoals();
        return this.status;
    }

}
GoalsBattle.EngageEnemy = GoalEngageEnemy;

/* Goal to hold army position even though enemy has been encountered, for
 * example to give archers time to shoot. */
export class GoalHoldPosition extends GoalBase {

    constructor(actor) {
        super(actor);
        this.setType('GoalHoldPosition');
    }

}
GoalsBattle.HoldPosition = GoalHoldPosition;

/* Goal issued to retreat from the battle. */
export class GoalRetreat extends GoalBase {

    constructor(actor) {
        super(actor);
        this.setType('GoalRetreat');
    }

}
GoalsBattle.Retreat = GoalRetreat;

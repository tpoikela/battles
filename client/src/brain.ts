
import RG from './rg';
import {Geometry} from './geometry';
import {Evaluator} from './evaluators';
import * as GoalsTop from './goals-top';
import {Memory} from './brain.memory';
import {Random} from './random';
import * as Component from './component';
import {BaseActor} from './actor';
import {CellMap} from './map';

// Dummy callback to return, if the actor's action provides a state
// changing action without callback.
const ACTION_ALREADY_DONE = Object.freeze(() => {});
const NO_ACTION_TAKEN = Object.freeze(() => {});

const NO_MEMORY = null;

const RNG = Random.getRNG();

//---------------------------------------------------------------------------
// BRAINS
//---------------------------------------------------------------------------

export const Brain: any = {};

// function shortestDist(eX, eY, aX, aY): number {
function shortestDist(eX, eY, aX, aY) {
    const path = Geometry.getBresenham(eX, eY, aX, aY);
    const getDist = path.length - 1;
    return getDist > 0 ? getDist : 0;
}

/* Returns a list of cells around the actor. The distance d can be specified.
* For example, d=1 gives 3x3 region, d=2 5x5 region, d=3 7x7 ... */
Brain.getCellsAroundActor = (actor, d = 1) => {
    const map: CellMap = actor.getLevel().getMap();
    const x = actor.getX();
    const y = actor.getY();
    const cells = [];
    for (let xx = x - d; xx <= x + d; xx++) {
        for (let yy = y - d; yy <= y + d; yy++) {
            if (map.hasXY(xx, yy)) {
                if (xx !== x || yy !== y) {
                    cells.push(map.getCell(xx, yy));
                }
            }
        }
    }
    return cells;
};

Brain.getBoxOfFreeCellsAround = (actor, d) => {
    const map = actor.getLevel().getMap();
    const [x, y] = actor.getXY();
    // Grab free cells around the player in the new level, and try
    // to place actors into them
    let coordAround = Geometry.getBoxAround(x, y, d);
    coordAround = coordAround.filter(xy => (
        map.hasXY(xy[0], xy[1])
    ));
    let cells = coordAround.map(xy => map.getCell(xy[0], xy[1]));
    cells = cells.filter(cell => cell.isFree());
    return cells;
};

/* Returns all cells with actors in them from list of seen cells. */
Brain.findCellsWithActors = (actor, seenCells, filterFunc) => {
    const cells = [];
    for (let i = 0, iMax = seenCells.length; i < iMax; i++) {
        if (seenCells[i].hasProp('actors')) {
            const actors = seenCells[i].getProp('actors');
            // Exclude itself from list
            if (actors[0].getID() !== actor.getID()) {
                if (filterFunc && filterFunc(actors)) {
                    cells.push(seenCells[i]);
                }
                else {
                    cells.push(seenCells[i]);
                }
            }
        }
    }
    return cells;
};

Brain.getActorsInCells = (seenCells, filterFunc) => {
    const cells = [];
    for (let i = 0, iMax = seenCells.length; i < iMax; i++) {
        if (seenCells[i].hasProp('actors')) {
            const actors = seenCells[i].getProp('actors');
            if (actors.length === 1) {
                if (filterFunc) {
                    if (filterFunc(actors[0])) {
                        cells.push(actors[0]);
                    }
                }
                else {
                    cells.push(actors[0]);
                }
            }
            else {
                actors.forEach(foundActor => {
                    if (filterFunc) {
                        if (filterFunc(foundActor)) {
                            cells.push(foundActor);
                        }
                    }
                    else {
                        cells.push(foundActor);
                    }
                });
            }
        }
    }
    return cells;
};

Brain.findCellsWithFriends = (actor, seenCells) => {
    const cells = [];
    for (let i = 0, iMax = seenCells.length; i < iMax; i++) {
        if (seenCells[i].hasActors()) {
            const actors = seenCells[i].getSentientActors();
            actors.forEach(actorFound => {
                if (actorFound.getID() !== actor.getID()) {
                    if (!actorFound.isEnemy(actor)) {
                        cells.push(seenCells[i]);
                    }
                }
            });
        }
    }
    return cells;
};

/* Returns all cells with actors in them around the actor. */
Brain.getActorCellsAround = actor => {
    const cellsAround = Brain.getCellsAroundActor(actor);
    const res = cellsAround.filter(cell => cell.hasActors());
    return res;
};

/* Returns all cells with actors in them around the actor. */
Brain.getActorsAround = actor => {
    const cellsAround = Brain.getCellsAroundActor(actor);
    let actors = [];
    cellsAround.forEach(c => {
        if (c.hasActors()) {actors = actors.concat(c.getActors());}
    });
    return actors;
};

Brain.getEnemyCellsAround = actor => {
    const cellsAround = Brain.getCellsAroundActor(actor);
    const res = cellsAround.filter(cell => (
        cell.hasActors() &&
            actor.getBrain().getMemory().isEnemy(cell.getActors()[0])
    ));
    return res;
};

Brain.getFriendCellsAround = actor => {
    const cellsAround = Brain.getCellsAroundActor(actor);
    const res = cellsAround.filter(cell => (
        cell.hasActors() &&
            actor.getBrain().getMemory().isFriend(cell.getActors()[0])
    ));
    return res;
};

Brain.distToActor = (actor1, actor2) => {
    const [eX, eY] = actor1.getXY();
    const [aX, aY] = actor2.getXY();
    const getDist = shortestDist(eX, eY, aX, aY);
    return getDist;
};

Brain.getTelepathyCells = function(actor) {
    const actorLevelID = actor.getLevel().getID();
    const tepathyComps = actor.getList('Telepathy');
    let cells = [];
    tepathyComps.forEach(teleComp => {
        const target = teleComp.getTarget();
        const targetLevel = target.getLevel();
        if (RG.isActorActive(target)) {
            if (targetLevel.getID() === actorLevelID) {
                const newCells = targetLevel.getMap().getVisibleCells(target);
                cells = cells.concat(newCells);
            }
        }
    });
    return cells;
};

//-----------------
// BRAIN BASE
//-----------------

/* Base class for actor brains. */
export class BrainBase {

    public _actor: BaseActor;
    public _type: string;

    constructor(actor) {
        this._actor = actor;
        this._type = null;
    }

    setActor(actor: BaseActor) {this._actor = actor;}
    getActor(): BaseActor {return this._actor;}
    getType() {return this._type;}
    setType(type) {this._type = type;}

    getMemory() {return NO_MEMORY;}

    decideNextAction() {
        RG.err('BrainBase', 'decideNextAction',
            'Not implemented. Do in derived class');
    }

    toJSON() {
        return {
            type: this._type
        };
    }
}
Brain.Base = BrainBase;

export class BrainNonSentient extends BrainBase {
    constructor(actor) {
        super(actor);
        this.setType('NonSentient');
    }

    decideNextAction() {
        return NO_ACTION_TAKEN;
    }
}
Brain.NonSentient = BrainNonSentient;

/* Brain is used by the AI to perform and decide on actions. Brain returns
 * actionable callbacks but doesn't know Action objects.  */
export class BrainSentient {
    protected _actor: BaseActor;
    protected _explored: {[key: string]: boolean};
    protected _type: string;
    protected _memory: Memory;
    protected _cache: {[key: string]: any[]};

    constructor(actor) {
        if (RG.isNullOrUndef([actor])) {
            RG.err('BrainSentient', 'constructor',
                'Actor must not be null.');
        }

        this._actor = actor; // Owner of the brain
        this._explored = {}; // Memory of explored cells
        this._type = 'Rogue';
        this._memory = new Memory();

        this._cache = {
            seen: null
        };

        // this._passableCallback = this._passableCallback.bind(this);
    }

    getType() {
        return this._type;
    }

    setType(type) {
        this._type = type;
    }

    getMemory() {
        return this._memory;
    }

    setActor(actor) {
        this._actor = actor;
    }

    getActor() {
        return this._actor;
    }

    addEnemy(actor) {
        this._memory.addEnemy(actor);
    }

    addFriend(actor) {
        this._memory.addFriend(actor);
    }

    addEnemyType(type) {
        this._memory.addEnemyType(type);
    }

    /* Main function for retrieving the actionable callback. */
    decideNextAction() {
        this._cache.seen = null;
        RG.err('BrainSentient', 'decideNextAction', 
            'Not implemented in this class');
        // return BTree.startBehavTree(Models.Rogue.tree, this._actor)[0];
    }

    // Returns cells seen by this actor
    getSeenCells() {
        if (this._cache.seen) {
            return this._cache.seen;
        }
        const map = this._actor.getLevel().getMap();
        this._cache.seen = map.getVisibleCells(this._actor);
        if (this._actor.has('Telepathy')) {
            const otherSeen = Brain.getTelepathyCells(this._actor);
            this._cache.seen = this._cache.seen.concat(otherSeen);
        }
        return this._cache.seen;
    }

    /* Checks if the actor can melee attack given x,y coordinate.*/
    canMeleeAttack(x, y) {
        const attackRange = this._actor.get('Combat').getAttackRange();
        const [dX, dY] = RG.dXdYAbs([x, y], this._actor);
        if (dX <= attackRange && dY <= attackRange) {return true;}
        return false;
    }

    findSeenCell(func) {
        const seenCells = this.getSeenCells();
        return seenCells.filter(func);
    }

    /* Returns true if this actor can see the given actor. */
    canSeeActor(actor) {
        const seenCells = this.getSeenCells();
        const cells = Brain.findCellsWithActors(this._actor, seenCells);
        let canSee = false;
        cells.forEach(cell => {
            const actors = cell.getActors();
            actors.forEach(a => {
                if (a.getID() === actor.getID()) {
                    canSee = true;
                }
            });
        });
        return canSee;
    }

    /* Given a list of cells, returns a cell with an enemy in it or null.*/
    findEnemyCell(seenCells) {
        const enemyCells = [];
        const cells = Brain.findCellsWithActors(this._actor, seenCells);
        for (let i = 0; i < cells.length; i++) {
            const actors = cells[i].getSentientActors();
            for (let j = 0; j < actors.length; j++) {
                if (this._memory.isEnemy(actors[j])) {
                    this._memory.addEnemySeenCell(actors[j]);
                    if (this._memory.wasLastAttacked(actors[j])) {
                        return cells[i];
                    }
                    else {
                        enemyCells.push(cells[i]);
                    }
                }
            }
        }
        // Return random enemy cell to make behav less predictable
        if (enemyCells.length > 0) {
            return RNG.arrayGetRand(enemyCells);
        }
        return null;
    }

    /* Finds a friend cell among seen cells.*/
    findFriendCell(seenCells) {
        const memory = this.getMemory();
        const cells = Brain.findCellsWithActors(this._actor, seenCells);
        for (let i = 0; i < cells.length; i++) {
            const actors = cells[i].getActors();
            if (!memory.isEnemy(actors[0])) {return cells[i];}
        }
        return null;
    }

    toJSON() {
        return {
            type: this.getType(),
            memory: this.getMemory().toJSON()
        };
    }

    canPickupItem() {
        const cell = this._actor.getCell();
        if (cell.hasItems()) {
            const topItem = cell.getItems()[0];
            return this._actor.getInvEq().canCarryItem(topItem);
        }
        return false;
    }

    pickupItem() {
        return () => {
            const pickup = new Component.Pickup();
            this._actor.add(pickup);
        };
    }

    /* Takes action towards given enemy cell.*/
    actionTowardsEnemy(enemyCell) {
        const level = this._actor.getLevel();
        const playX = enemyCell.getX();
        const playY = enemyCell.getY();
        if (this.canMeleeAttack(playX, playY)) {
            return () => {
                const cell = level.getMap().getCell(playX, playY);
                const target = cell.getProp('actors')[0];
                const attackComp = new Component.Attack({target});
                this._actor.add(attackComp);
            };
        }
        else { // Move closer
            return this.tryToMoveTowardsCell(enemyCell);
        }
    }

    tryToMoveTowardsCell(cell) {
        // Simple dX,dY computation as first option
        const level = this._actor.getLevel();
        const [aX, aY] = this._actor.getXY();
        const [cX, cY] = [cell.getX(), cell.getY()];
        let [dX, dY] = [cX - aX, cY - aY];
        dX = dX !== 0 ? dX / Math.abs(dX) : 0;
        dY = dY !== 0 ? dY / Math.abs(dY) : 0;

        const [newX, newY] = [aX + dX, aY + dY];
        const newCell = level.getMap().getCell(newX, newY);
        if (newCell.isPassable()) {
            return () => {
                const movComp = new Component.Movement(newX, newY, level);
                this._actor.add(movComp);
            };
        }

        // If simple option fails, resort to path finding
        const pathCells = this.getShortestPathTo(cell);
        if (pathCells.length > 1) {
            const x = pathCells[1].getX();
            const y = pathCells[1].getY();
            return () => {
                const movComp = new Component.Movement(x, y, level);
                this._actor.add(movComp);
            };
        }
        else {
            return NO_ACTION_TAKEN; // Don't move, rest
        }
    }

    /* Returns all friends that are visible to the brain's actor. */
    getSeenFriends() {
        const friends = [];
        const memory = this.getMemory();
        const seenCells = this.getSeenCells();
        const cells = Brain.findCellsWithActors(this._actor, seenCells);
        for (let i = 0; i < cells.length; i++) {
            const actors = cells[i].getActors();
            if (memory.isFriend(actors[0])) {
                friends.push(actors[0]);
            }
        }
        return friends;
    }

    /* Returns all enemies that are visible to the brain's actor. */
    getSeenEnemies() {
        const memory = this.getMemory();
        const seenCells = this.getSeenCells();
        const filterFunc = actor => memory.isEnemy(actor);
        const enemies = Brain.getActorsInCells(seenCells, filterFunc);
        return enemies;
    }

    /* Based on seenCells, AI explores the unexplored free cells, or picks on
     * cell randomly, if everything's explored.*/
    exploreLevel(seenCells) {
        // Wander around exploring
        let index = -1;
        let perms = [];
        for (let j = 0; j < seenCells.length; j++) {perms.push(j);}
        perms = RNG.shuffle(perms);

        for (let i = 0, ll = perms.length; i < ll; i++) {
            const ci = perms[i];
            const cell = seenCells[ci];
            if (cell.isFree()) {
                const xy = cell.getX() + ',' + cell.getY();
                if (!this._explored.hasOwnProperty(xy)) {
                    this._explored[xy] = true;
                    index = ci;
                    break;
                }
            }
            else if (cell.hasDoor()) {
                const door = cell.getPropType('door')[0];
                if (door.canToggle()) {
                    const comp = new Component.OpenDoor();
                    comp.setDoor(door);
                    this._actor.add(comp);
                    return ACTION_ALREADY_DONE;
                }
            }
        }

        if (index === -1) { // Everything explored, choose random cell
            index = RNG.randIndex(seenCells);
        }
        return this.tryToMoveTowardsCell(seenCells[index]);

    }

    /* Returns shortest path from actor to the given cell. Resulting cells are
     * returned in order: closest to the actor first. Thus moving to the
     * next cell can be done by taking the first returned cell.*/
    getShortestPathTo(cell) {
        const [toX, toY] = cell.getXY();
        const map = this._actor.getLevel().getMap();
        return map.getShortestPathTo(this._actor, toX, toY);
    }

    /* Flees from the given cell or explores randomly if cannot. */
    fleeFromCell(cell, seenCells) {
        const x = cell.getX();
        const y = cell.getY();
        const thisX = this._actor.getX();
        const thisY = this._actor.getY();
        const deltaX = x - thisX;
        const deltaY = y - thisY;
        // delta determines the direction to flee
        const newX = thisX - deltaX;
        const newY = thisY - deltaY;
        if (this._actor.getLevel().getMap().hasXY(newX, newY)) {
            const newCell = this._actor.getLevel().getMap().getCell(newX, newY);
            if (newCell.isPassable()) {
                return this.tryToMoveTowardsCell(newCell);
            }
            else if (this._actor.has('Flying') && newCell.isPassableByAir()) {
                return this.tryToMoveTowardsCell(newCell);
            }
        }
        return this.exploreLevel(seenCells);
    }

    /* Returns all free cells around the actor owning the brain.*/
    getFreeCellsAround() {
        const cellsAround = Brain.getCellsAroundActor(this._actor);
        return cellsAround.filter(cell => cell.isFree());
    }

    getRandAdjacentFreeCell() {
        const cellsAround = this.getFreeCellsAround();
        if (cellsAround.length > 0) {
            return RNG.arrayGetRand(cellsAround);
        }
        return null;
    }
}

Brain.Sentient = BrainSentient;


/* Brain used by most of the animals. TODO: Add some corpse eating behaviour. */
/* BrainAnimal = function(actor) {
    BrainSentient.call(this, actor);
    this.setType('Animal');
    this._memory.addEnemyType('player');
    this._memory.addEnemyType('human');

};
RG.extend2(BrainAnimal, BrainSentient);
*/

/* Brain used by most of the animals. TODO: Add some corpse eating behaviour. */
/*
Brain.Demon = function(actor) {
    BrainSentient.call(this, actor);
    this.setType('Demon');
    this._memory.addEnemyType('player');
    this._memory.addEnemyType('human');

};
RG.extend2(Brain.Demon, BrainSentient);
*/

/* Brain object used by Undead. */
/*
Brain.Undead = function(actor) {
    BrainSentient.call(this, actor);
    this.setType('Undead');
    this._memory.addEnemyType('player');
    this._memory.addEnemyType('human');
    this._memory.addEnemyType('dwarf');
};
RG.extend2(Brain.Undead, BrainSentient);
*/

/* Brain used by summoners. */
/*
Brain.Summoner = function(actor) {
    BrainSentient.call(this, actor);
    this.setType('Summoner');

    this.numSummoned = 0;
    this.maxSummons = 20;
    this.summonProbability = 0.2;

    this._memory.addEnemyType('player');

    this.willSummon = function() {
        if (this.numSummoned === this.maxSummons) {return false;}
        const summon = RNG.getUniform();
        if (summon > (1.0 - this.summonProbability)) {
            return true;
        }
        return false;
    };

    this.summonMonster = function() {
        const level = this._actor.getLevel();
        const cellsAround = this.getFreeCellsAround();
        if (cellsAround.length > 0) {
            const freeX = cellsAround[0].getX();
            const freeY = cellsAround[0].getY();
            const summoned = RG.FACT.createActor('Summoned',
                {hp: 15, att: 7, def: 7});
            summoned.get('Experience').setExpLevel(5);
            level.addActor(summoned, freeX, freeY);
            RG.gameMsg(this._actor.getName() + ' summons some help');
            this.numSummoned += 1;
        }
        else {
            const txt = ' screamed an incantation but nothing happened';
            RG.gameMsg(this._actor.getName() + txt);
        }
        return ACTION_ALREADY_DONE;
    };


};
RG.extend2(Brain.Summoner, BrainSentient);

Brain.Summoner.prototype.decideNextAction = function() {
    this._cache.seen = null;
    return BTree.startBehavTree(Models.Summoner.tree, this._actor)[0];
};
*/


/* This brain is used by humans who are not hostile to the player.*/
/*
Brain.Human = function(actor) {
    BrainSentient.call(this, actor);
    this.setType('Human');

    this.commProbability = 0.5;

    this.getMemory().addEnemyType('demon');

    this.willCommunicate = function() {
        const communicateOrAttack = RNG.getUniform();
        const seenCells = this.getSeenCells();
        const friendCell = this.findFriendCell(seenCells);
        const memory = this.getMemory();

        let friendActor = null;
        if (RG.isNullOrUndef([friendCell])) {
            return false;
        }
        else {
            friendActor = friendCell.getProp('actors')[0];
            if (memory.hasCommunicatedWith(friendActor)) {
                return false;
            }
            else if (friendActor.has('Communication')) {
                return false;
            }
        }

        if (communicateOrAttack < (1.0 - this.commProbability)) {
            return false;
        }
        return true;

    };

    this.communicateEnemies = function() {
        const memory = this.getMemory();
        const enemies = memory.getEnemies();
        const seenCells = this.getSeenCells();
        const friendCell = this.findFriendCell(seenCells);
        const friendActor = friendCell.getProp('actors')[0];

        const comComp = new Component.Communication();
        const msg = {type: 'Enemies', enemies, src: this.getActor()};
        comComp.addMsg(msg);

        friendActor.add(comComp);
        memory.addCommunicationWith(friendActor);
        return ACTION_ALREADY_DONE;
    };

};
RG.extend2(Brain.Human, BrainSentient);

Brain.Human.prototype.decideNextAction = function() {
    this._cache.seen = null;
    return BTree.startBehavTree(Models.Human.tree, this._actor)[0];
};
/*

/* Brain object used by archers. */
export class BrainArcher extends BrainSentient {
    constructor(actor) {
        super(actor);
        this.setType('Archer');
    }

    /* Checks if the actor can attack given x,y coordinate.*/
    canDoRangedAttack(): boolean {
        const seenCells = this.getSeenCells();
        const enemy = this.findEnemyCell(seenCells);
        const x = enemy.getX();
        const y = enemy.getY();
        const actorX = this._actor.getX();
        const actorY = this._actor.getY();
        const miss = this._actor.getInvEq().getEquipment().getItem('missile');
        if (miss) {
            const range = RG.getMissileRange(this._actor, miss);
            const getDist = shortestDist(x, y, actorX, actorY);
            if (getDist <= range) {return true;}
            // TODO test for a clean shot
        }
        return false;
    }

    /* Performs a ranged attack on enemy cell. */
    doRangedAttack(): () => void {
        const seenCells = this.getSeenCells();
        const enemy = this.findEnemyCell(seenCells);
        const x = enemy.getX();
        const y = enemy.getY();
        const mComp = new Component.Missile(this._actor);

        const invEq = this._actor.getInvEq();
        const missile = invEq.unequipAndGetItem('missile', 1);
        mComp.setTargetXY(x, y);
        mComp.setDamage(RG.getMissileDamage(this._actor, missile));
        mComp.setAttack(RG.getMissileAttack(this._actor, missile));
        mComp.setRange(RG.getMissileRange(this._actor, missile));
        missile.add(mComp);
        return ACTION_ALREADY_DONE;
    }

    decideNextAction() {
        this._cache.seen = null;
        // return BTree.startBehavTree(Models.Archer.tree, this._actor)[0];
        RG.err('BrainArcher', 'decideNextAction', 'Not supported anymore');
    }
}

RG.extend2(BrainArcher, BrainSentient);
Brain.Archer = BrainArcher;

/* Brain object for testing goal-based actors. */
export class BrainGoalOriented extends BrainSentient {
    protected goal: GoalsTop.GoalTop;

    constructor(actor) {
        super(actor);
        this.setType('GoalOriented');
        this.goal = new GoalsTop.ThinkBasic(actor);
    }

    getGoal() {return this.goal;}
    setGoal(goal) {this.goal = goal;}

    /* Must return function. */
    decideNextAction() {
        this._cache.seen = null;
        this.goal.process();
        this._cache.seen = null;
        return ACTION_ALREADY_DONE;
    }

    toJSON() {
        const json: any = super.toJSON();
        json.goal = this.goal.toJSON();
        return json;
    }
}
Brain.GoalOriented = BrainGoalOriented;

/* Brain object for spellcasting actors. This model focuses on aggressive
 * spellcasting intended to harm opponents. */
export class BrainSpellCaster extends BrainGoalOriented {
    constructor(actor) {
        super(actor);
        this.setType('SpellCaster');
        this.goal = new GoalsTop.ThinkSpellcaster(actor);
        this.goal.setBias({CastSpell: 2.0, AttackActor: 0.7});
        this.goal.getEvaluator('CastSpell').setCastingProbability(0.8);
    }

    decideNextAction() {
        this._cache.seen = null;
        this.goal.process();
        this._cache.seen = null;
        return ACTION_ALREADY_DONE;
    }
}
Brain.SpellCaster = BrainSpellCaster;


export class BrainExplorer extends BrainGoalOriented {
    constructor(actor) {
        super(actor);
        this.setType('Explorer');
        this.goal.removeEvaluators();
        this.goal.addEvaluator(new Evaluator.Explore());
    }
}
Brain.Explorer = BrainExplorer;

export class BrainSpirit extends BrainGoalOriented {
    constructor(actor) {
        super(actor)
        this.setType('Spirit');
        this.goal.removeEvaluators();
        this.goal.addEvaluator(new Evaluator.Explore());
    }
}
Brain.Spirit = BrainSpirit;

export class BrainThief extends BrainGoalOriented {
    constructor(actor) {
        super(actor)
        this.setType('Thief');
        this.goal.addEvaluator(new Evaluator.Thief(1.2));
        this.goal.setBias({Thief: 1.2, AttackActor: 0.7});
    }
}
Brain.Thief = BrainThief;

/* Brain-object for animals. */
export class BrainAnimal extends BrainGoalOriented {
    constructor(actor) {
        super(actor);
        this.setType('Animal');
        this.goal = new GoalsTop.ThinkBasic(actor);
        this._memory.addEnemyType('player');
        this._memory.addEnemyType('human');
        this.getGoal = () => this.goal;
        this.setGoal = goal => {this.goal = goal;};
    }

    /* Must return function. */
    decideNextAction() {
        this._cache.seen = null;
        this.goal.process();
        this._cache.seen = null;
        return ACTION_ALREADY_DONE;
    }
}
Brain.Animal = BrainAnimal;

/* Brain object for testing goal-based actors. */
export class BrainCommander extends BrainGoalOriented {
    constructor(actor) {
        super(actor);
        this.setType('Commander');
        this.goal = new GoalsTop.ThinkCommander(actor);
    }

    /* Must return function. */
    decideNextAction() {
        this._cache.seen = null;
        this.goal.process();
        this._cache.seen = null;
        return ACTION_ALREADY_DONE;
    }
}
Brain.Commander = BrainCommander;

/* Simple brain used by the non-moving flame elements. They emit damage
 * components in the cells they are located in. */
export class BrainFlame extends BrainSentient {
    constructor(actor) {
        super(actor);
        this.setType('Flame');
    }

    decideNextAction() {
        const cell = this._actor.getCell();
        const actors = cell.getActors();
        actors.forEach(actor => {
            const damaging = this.getActor().get('Damaging');
            if (damaging) {
                const flameComp = new Component.Flame();
                flameComp.setSource(this._actor);
                flameComp.setDamageType(damaging.getDamageType());
                actor.add(flameComp);
            }
        });
        return ACTION_ALREADY_DONE;
    }
}
Brain.Flame = BrainFlame;

/* Brain for non-sentient clouds. Same as Flame, except moves first
 * randomly and then emits the damage. */
export class BrainCloud extends BrainFlame {
    public chanceToMove: number;

    constructor(actor) {
        super(actor);
        this.setType('Cloud');
        this.chanceToMove = 0.2;
    }

    decideNextAction() {
        if (RNG.getUniform() <= this.chanceToMove) {
            const dir = RNG.getRandDir();
            const [newX, newY] = RG.newXYFromDir(dir, this._actor);
            const level = this._actor.getLevel();
            const map = level.getMap();
            if (map.hasXY(newX, newY)) {
                const movComp = new Component.Movement(newX, newY, level);
                this._actor.add(movComp);
            }
        }
        return super.decideNextAction.call(this);
    }
}
Brain.Cloud = BrainCloud;

/* This brain switched for player-controlled actors when MindControl
 * is cast on them. It acts as "paralysis" at the moment. */
export class BrainMindControl extends BrainGoalOriented {
    constructor(actor) {
        super(actor);
        this.setType('MindControl');
        this.goal = new GoalsTop.ThinkBasic(actor);

        this.getGoal = () => this.goal;
        this.setGoal = goal => {this.goal = goal;};
    }

    decideNextAction() {
        // At the moment does nothing, it could attack the
        // enemies of the source of MindControl
        return ACTION_ALREADY_DONE;
    }
}
Brain.MindControl = BrainMindControl;

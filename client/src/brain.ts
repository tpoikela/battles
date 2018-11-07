
import RG from './rg';
const Path = require('./path');
const Evaluator = require('./evaluators');
const GoalsTop = require('./goals-top');
const BTree = require('./aisequence');
const Memory = require('./brain.memory');

const Models = BTree.Models;

// Dummy callback to return, if the actor's action provides a state
// changing action without callback.
const ACTION_ALREADY_DONE = Object.freeze(() => {});
const NO_ACTION_TAKEN = Object.freeze(() => {});

const NO_MEMORY = null;

const RNG = RG.Random.getRNG();

//---------------------------------------------------------------------------
// BRAINS
//---------------------------------------------------------------------------

const Brain: any = {};

/* Returns a list of cells around the actor. The distance d can be specified.
* For example, d=1 gives 3x3 region, d=2 5x5 region, d=3 7x7 ... */
Brain.getCellsAroundActor = (actor, d = 1) => {
    const map = actor.getLevel().getMap();
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
    let coordAround = RG.Geometry.getBoxAround(x, y, d);
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
    const getDist = Path.shortestDist(eX, eY, aX, aY);
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
Brain.Base = function(actor) {
    this._actor = actor;
    this._type = null;

    this.setActor = (actor) => {this._actor = actor;};
    this.getActor = () => this._actor;
    this.getType = () => this._type;
    this.setType = (type) => {this._type = type;};

    this.getMemory = () => NO_MEMORY;

    /* Main function for retrieving the actionable callback. Acting actor must
     * be passed in. */
};

Brain.Base.prototype.decideNextAction = function() {
    RG.err('Brain.Base', 'decideNextAction',
        'Not implemented. Do in derived class');
};

Brain.Base.prototype.toJSON = function() {
    return {
        type: this._type
    };
};

Brain.NonSentient = function(actor) {
    Brain.Base.call(this, actor);
    this.setType('NonSentient');
};
RG.extend2(Brain.NonSentient, Brain.Base);

Brain.NonSentient.prototype.decideNextAction = function() {
    return NO_ACTION_TAKEN;
};

/* Brain is used by the AI to perform and decide on actions. Brain returns
 * actionable callbacks but doesn't know Action objects.  */
Brain.Rogue = function(actor) {
    if (RG.isNullOrUndef([actor])) {
        RG.err('Brain.Rogue', 'constructor',
            'Actor must not be null.');
    }

    this._actor = actor; // Owner of the brain
    this._explored = {}; // Memory of explored cells
    this._type = 'Rogue';
    this._memory = new Memory(this);

    this._cache = {
        seen: null
    };

    // this._passableCallback = this._passableCallback.bind(this);
};

Brain.Rogue.prototype.getType = function() {
    return this._type;
};

Brain.Rogue.prototype.setType = function(type) {
    this._type = type;
};

Brain.Rogue.prototype.getMemory = function() {
    return this._memory;
};

Brain.Rogue.prototype.setActor = function(actor) {
    this._actor = actor;
};

Brain.Rogue.prototype.getActor = function() {
    return this._actor;
};

Brain.Rogue.prototype.addEnemy = function(actor) {
    this._memory.addEnemy(actor);
};
Brain.Rogue.prototype.addFriend = function(actor) {
    this._memory.addFriend(actor);
};
Brain.Rogue.prototype.addEnemyType = function(type) {
    this._memory.addEnemyType(type);
};

/* Callback used for actor's path finding. */
/*
Brain.Rogue.prototype._passableCallback = function(x, y) {
    const map = this._actor.getLevel().getMap();
    const hasFlying = this._actor.has('Flying');
    if (!RG.isNullOrUndef([map])) {
        let res = false;
        if (hasFlying) {
            res = map.isPassableByAir(x, y);
        }
        else {
            res = map.isPassable(x, y);
        }
        if (!res) {
            res = (x === this._actor.getX()) && (y === this._actor.getY());
        }
        return res;
    }
    else {
        RG.err('Brain.Rogue', '_passableCallback', 'map not well defined.');
    }
    return false;
};
*/

/* Main function for retrieving the actionable callback. */
Brain.Rogue.prototype.decideNextAction = function() {
    this._cache.seen = null;
    return BTree.startBehavTree(Models.Rogue.tree, this._actor)[0];
};

// Returns cells seen by this actor
Brain.Rogue.prototype.getSeenCells = function() {
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
};


/* Checks if the actor can melee attack given x,y coordinate.*/
Brain.Rogue.prototype.canMeleeAttack = function(x, y) {
    const attackRange = this._actor.get('Combat').getAttackRange();
    const [dX, dY] = RG.dXdYAbs([x, y], this._actor);
    if (dX <= attackRange && dY <= attackRange) {return true;}
    return false;
};

Brain.Rogue.prototype.findSeenCell = function(func) {
    const seenCells = this.getSeenCells();
    return seenCells.filter(func);
};

/* Returns true if this actor can see the given actor. */
Brain.Rogue.prototype.canSeeActor = function(actor) {
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
};

/* Given a list of cells, returns a cell with an enemy in it or null.*/
Brain.Rogue.prototype.findEnemyCell = function(seenCells) {
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
};

/* Finds a friend cell among seen cells.*/
Brain.Rogue.prototype.findFriendCell = function(seenCells) {
    const memory = this.getMemory();
    const cells = Brain.findCellsWithActors(this._actor, seenCells);
    for (let i = 0; i < cells.length; i++) {
        const actors = cells[i].getActors();
        if (!memory.isEnemy(actors[0])) {return cells[i];}
    }
    return null;
};

Brain.Rogue.prototype.toJSON = function() {
    return {
        type: this.getType(),
        memory: this.getMemory().toJSON()
    };
};

Brain.Rogue.prototype.canPickupItem = function() {
    const cell = this._actor.getCell();
    if (cell.hasItems()) {
        const topItem = cell.getItems()[0];
        return this._actor.getInvEq().canCarryItem(topItem);
    }
    return false;
};

Brain.Rogue.prototype.pickupItem = function() {
    return () => {
        const pickup = new RG.Component.Pickup();
        this._actor.add(pickup);
    };
};

/* Takes action towards given enemy cell.*/
Brain.Rogue.prototype.actionTowardsEnemy = function(enemyCell) {
    const level = this._actor.getLevel();
    const playX = enemyCell.getX();
    const playY = enemyCell.getY();
    if (this.canMeleeAttack(playX, playY)) {
        return () => {
            const cell = level.getMap().getCell(playX, playY);
            const target = cell.getProp('actors')[0];
            const attackComp = new RG.Component.Attack({target});
            this._actor.add(attackComp);
        };
    }
    else { // Move closer
        return this.tryToMoveTowardsCell(enemyCell);
    }
};

Brain.Rogue.prototype.tryToMoveTowardsCell = function(cell) {
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
            const movComp = new RG.Component.Movement(newX, newY, level);
            this._actor.add(movComp);
        };
    }

    // If simple option fails, resort to path finding
    const pathCells = this.getShortestPathTo(cell);
    if (pathCells.length > 1) {
        const x = pathCells[1].getX();
        const y = pathCells[1].getY();
        return () => {
            const movComp = new RG.Component.Movement(x, y, level);
            this._actor.add(movComp);
        };
    }
    else {
        return NO_ACTION_TAKEN; // Don't move, rest
    }
};

/* Returns all friends that are visible to the brain's actor. */
Brain.Rogue.prototype.getSeenFriends = function() {
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
};

/* Returns all enemies that are visible to the brain's actor. */
Brain.Rogue.prototype.getSeenEnemies = function() {
    const memory = this.getMemory();
    const seenCells = this.getSeenCells();
    const filterFunc = actor => memory.isEnemy(actor);
    const enemies = Brain.getActorsInCells(seenCells, filterFunc);
    return enemies;
};

/* Based on seenCells, AI explores the unexplored free cells, or picks on
 * cell randomly, if everything's explored.*/
Brain.Rogue.prototype.exploreLevel = function(seenCells) {
    // Wander around exploring
    let index = -1;
    let perms = [];
    for (let j = 0; j < seenCells.length; j++) {perms.push(j);}
    perms = perms.randomize();

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
                const comp = new RG.Component.OpenDoor();
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

};

/* Returns shortest path from actor to the given cell. Resulting cells are
 * returned in order: closest to the actor first. Thus moving to the
 * next cell can be done by taking the first returned cell.*/
Brain.Rogue.prototype.getShortestPathTo = function(cell) {
    const [toX, toY] = cell.getXY();
    const map = this._actor.getLevel().getMap();
    return map.getShortestPathTo(this._actor, toX, toY);
};

/* Flees from the given cell or explores randomly if cannot. */
Brain.Rogue.prototype.fleeFromCell = function(cell, seenCells) {
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
};

/* Returns all free cells around the actor owning the brain.*/
Brain.Rogue.prototype.getFreeCellsAround = function() {
    const cellsAround = Brain.getCellsAroundActor(this._actor);
    return cellsAround.filter(cell => cell.isFree());
};

Brain.Rogue.prototype.getRandAdjacentFreeCell = function() {
    const cellsAround = this.getFreeCellsAround();
    if (cellsAround.length > 0) {
        return RNG.arrayGetRand(cellsAround);
    }
    return null;
};


/* Brain used by most of the animals. TODO: Add some corpse eating behaviour. */
/* Brain.Animal = function(actor) {
    Brain.Rogue.call(this, actor);
    this.setType('Animal');
    this._memory.addEnemyType('player');
    this._memory.addEnemyType('human');

};
RG.extend2(Brain.Animal, Brain.Rogue);
*/

/* Brain used by most of the animals. TODO: Add some corpse eating behaviour. */
Brain.Demon = function(actor) {
    Brain.Rogue.call(this, actor);
    this.setType('Demon');
    this._memory.addEnemyType('player');
    this._memory.addEnemyType('human');

};
RG.extend2(Brain.Demon, Brain.Rogue);

/* Brain object used by Undead. */
Brain.Undead = function(actor) {
    Brain.Rogue.call(this, actor);
    this.setType('Undead');
    this._memory.addEnemyType('player');
    this._memory.addEnemyType('human');
    this._memory.addEnemyType('dwarf');
};
RG.extend2(Brain.Undead, Brain.Rogue);

/* Brain used by summoners. */
Brain.Summoner = function(actor) {
    Brain.Rogue.call(this, actor);
    this.setType('Summoner');

    this.numSummoned = 0;
    this.maxSummons = 20;
    this.summonProbability = 0.2;

    this._memory.addEnemyType('player');

    /* Returns true if the summoner will summon on this action. */
    this.willSummon = function() {
        if (this.numSummoned === this.maxSummons) {return false;}
        const summon = RNG.getUniform();
        if (summon > (1.0 - this.summonProbability)) {
            return true;
        }
        return false;
    };

    /* Tries to summon a monster to a nearby cell. Returns true if success.*/
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
RG.extend2(Brain.Summoner, Brain.Rogue);

Brain.Summoner.prototype.decideNextAction = function() {
    this._cache.seen = null;
    return BTree.startBehavTree(Models.Summoner.tree, this._actor)[0];
};


/* This brain is used by humans who are not hostile to the player.*/
Brain.Human = function(actor) {
    Brain.Rogue.call(this, actor);
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

        const comComp = new RG.Component.Communication();
        const msg = {type: 'Enemies', enemies, src: this.getActor()};
        comComp.addMsg(msg);

        friendActor.add(comComp);
        memory.addCommunicationWith(friendActor);
        return ACTION_ALREADY_DONE;
    };

};
RG.extend2(Brain.Human, Brain.Rogue);

Brain.Human.prototype.decideNextAction = function() {
    this._cache.seen = null;
    return BTree.startBehavTree(Models.Human.tree, this._actor)[0];
};

/* Brain object used by archers. */
Brain.Archer = function(actor) {
    Brain.Rogue.call(this, actor);
    this.setType('Archer');

    this.decideNextAction = function() {
        this._cache.seen = null;
        return BTree.startBehavTree(Models.Archer.tree, this._actor)[0];
    };

    /* Checks if the actor can attack given x,y coordinate.*/
    this.canDoRangedAttack = function() {
        const seenCells = this.getSeenCells();
        const enemy = this.findEnemyCell(seenCells);
        const x = enemy.getX();
        const y = enemy.getY();
        const actorX = this._actor.getX();
        const actorY = this._actor.getY();
        const miss = this._actor.getInvEq().getEquipment().getItem('missile');
        if (miss) {
            const range = RG.getMissileRange(this._actor, miss);
            const getDist = Path.shortestDist(x, y, actorX, actorY);
            if (getDist <= range) {return true;}
            // TODO test for a clean shot
        }
        return false;
    };

    /* Performs a ranged attack on enemy cell. */
    this.doRangedAttack = function() {
        const seenCells = this.getSeenCells();
        const enemy = this.findEnemyCell(seenCells);
        const x = enemy.getX();
        const y = enemy.getY();
        const mComp = new RG.Component.Missile(this._actor);

        const invEq = this._actor.getInvEq();
        const missile = invEq.unequipAndGetItem('missile', 1);
        mComp.setTargetXY(x, y);
        mComp.setDamage(RG.getMissileDamage(this._actor, missile));
        mComp.setAttack(RG.getMissileAttack(this._actor, missile));
        mComp.setRange(RG.getMissileRange(this._actor, missile));
        missile.add(mComp);
        return ACTION_ALREADY_DONE;
    };
};
RG.extend2(Brain.Archer, Brain.Rogue);

/* Brain object for spellcasting actors. This model focuses on aggressive
 * spellcasting intended to harm opponents. */
Brain.SpellCaster = function(actor) {
    Brain.Rogue.call(this, actor);
    this.setType('SpellCaster');
    this.goal = new GoalsTop.ThinkSpellcaster(actor);
    this.goal.setBias({CastSpell: 2.0, AttackActor: 0.7});
    this.goal.getEvaluator('CastSpell').setCastingProbability(0.8);

    this.getGoal = () => this.goal;
    this.setGoal = goal => {this.goal = goal;};

};
RG.extend2(Brain.SpellCaster, Brain.Rogue);

Brain.SpellCaster.prototype.decideNextAction = function() {
    this._cache.seen = null;
    this.goal.process();
    this._cache.seen = null;
    return ACTION_ALREADY_DONE;
};

/* Brain object for testing goal-based actors. */
Brain.GoalOriented = function(actor) {
    Brain.Rogue.call(this, actor);
    this.setType('GoalOriented');
    this.goal = new GoalsTop.ThinkBasic(actor);

    this.getGoal = () => this.goal;
    this.setGoal = goal => {this.goal = goal;};

};
RG.extend2(Brain.GoalOriented, Brain.Rogue);

/* Must return function. */
Brain.GoalOriented.prototype.decideNextAction = function() {
    this._cache.seen = null;
    this.goal.process();
    this._cache.seen = null;
    return ACTION_ALREADY_DONE;
};

Brain.GoalOriented.prototype.toJSON = function() {
    const json = Brain.Rogue.prototype.toJSON.call(this);
    json.goal = this.goal.toJSON();
    return json;
};

Brain.Explorer = function(actor) {
    Brain.GoalOriented.call(this, actor);
    this.setType('Explorer');
    this.goal.removeEvaluators();
    this.goal.addEvaluator(new Evaluator.Explore());
};
RG.extend2(Brain.Explorer, Brain.GoalOriented);

Brain.Spirit = function(actor) {
    Brain.GoalOriented.call(this, actor);
    this.setType('Spirit');
    this.goal.removeEvaluators();
    this.goal.addEvaluator(new Evaluator.Explore());
};
RG.extend2(Brain.Spirit, Brain.GoalOriented);

Brain.Thief = function(actor) {
    Brain.GoalOriented.call(this, actor);
    this.setType('Thief');
    this.goal.addEvaluator(new Evaluator.Thief(1.2));
    this.goal.setBias({Thief: 1.2, AttackActor: 0.7});
};
RG.extend2(Brain.Thief, Brain.GoalOriented);

/* Brain-object for animals. */
Brain.Animal = function(actor) {
    Brain.Rogue.call(this, actor);
    this.setType('Animal');
    this.goal = new GoalsTop.ThinkBasic(actor);
    this._memory.addEnemyType('player');
    this._memory.addEnemyType('human');

    this.getGoal = () => this.goal;
    this.setGoal = goal => {this.goal = goal;};

};
RG.extend2(Brain.Animal, Brain.Rogue);

/* Must return function. */
Brain.Animal.prototype.decideNextAction = function() {
    this._cache.seen = null;
    this.goal.process();
    this._cache.seen = null;
    return ACTION_ALREADY_DONE;
};


/* Brain object for testing goal-based actors. */
Brain.Commander = function(actor) {
    Brain.Rogue.call(this, actor);
    this.setType('Commander');
    this.goal = new GoalsTop.ThinkCommander(actor);

    this.getGoal = () => this.goal;
    this.setGoal = goal => {this.goal = goal;};

};
RG.extend2(Brain.Commander, Brain.Rogue);

/* Must return function. */
Brain.Commander.prototype.decideNextAction = function() {
    this._cache.seen = null;
    this.goal.process();
    this._cache.seen = null;
    return ACTION_ALREADY_DONE;
};

/* Simple brain used by the non-moving flame elements. They emit damage
 * components in the cells they are located in. */
Brain.Flame = function(actor) {
    Brain.Rogue.call(this, actor);
    this.setType('Flame');
};
RG.extend2(Brain.Flame, Brain.Rogue);

Brain.Flame.prototype.decideNextAction = function() {
    const cell = this._actor.getCell();
    const actors = cell.getActors();
    actors.forEach(actor => {
        const damaging = this.getActor().get('Damaging');
        if (damaging) {
            const flameComp = new RG.Component.Flame();
            flameComp.setSource(this._actor);
            flameComp.setDamageType(damaging.getDamageType());
            actor.add(flameComp);
        }
    });
    return ACTION_ALREADY_DONE;
};

/* Brain for non-sentient clouds. Same as Flame, except moves first
 * randomly and then emits the damage. */
Brain.Cloud = function(actor) {
    Brain.Flame.call(this, actor);
    this.setType('Cloud');
    this.chanceToMove = 0.2;
};
RG.extend2(Brain.Cloud, Brain.Flame);

Brain.Cloud.prototype.decideNextAction = function() {
    if (RNG.getUniform() <= this.chanceToMove) {
        const dir = RNG.getRandDir();
        const [newX, newY] = RG.newXYFromDir(dir, this._actor);
        const level = this._actor.getLevel();
        const map = level.getMap();
        if (map.hasXY(newX, newY)) {
            const movComp = new RG.Component.Movement(newX, newY, level);
            this._actor.add(movComp);
        }
    }
    return Brain.Flame.prototype.decideNextAction.call(this);
};

/* This brain switched for player-controlled actors when MindControl
 * is cast on them. It acts as "paralysis" at the moment. */
Brain.MindControl = function(actor) {
    Brain.Rogue.call(this, actor);
    this.setType('MindControl');
    this.goal = new GoalsTop.ThinkBasic(actor);

    this.getGoal = () => this.goal;
    this.setGoal = goal => {this.goal = goal;};

};
RG.extend2(Brain.MindControl, Brain.Rogue);

Brain.MindControl.prototype.decideNextAction = function() {
    // At the moment does nothing, it could attack the
    // enemies of the source of MindControl
    return ACTION_ALREADY_DONE;
};

export default Brain;


const ROT = require('../../lib/rot.js');
const RG = require('./rg.js');
const BTree = require('./aisequence');
RG.Path = require('./path');
const Evaluator = require('./evaluators');

const GoalsTop = require('./goals-top');

const Models = BTree.Models;

// Dummy callback to return, if the actor's action provides a state
// changing action without callback.
const ACTION_ALREADY_DONE = () => {};
const NO_ACTION_TAKEN = () => {};
const MEM_NO_ACTORS = Object.freeze([]);

const NO_MEMORY = null;

const RNG = RG.Random.getRNG();

//---------------------------------------------------------------------------
// BRAINS
//---------------------------------------------------------------------------

RG.Brain = {};

/* Returns a list of cells around the actor. The distance d can be specified.
* For example, d=1 gives 3x3 region, d=2 5x5 region, d=3 7x7 ... */
RG.Brain.getCellsAroundActor = (actor, d = 1) => {
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

RG.Brain.getBoxOfFreeCellsAround = (actor, d) => {
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
RG.Brain.findCellsWithActors = (actor, seenCells) => {
    const cells = [];
    for (let i = 0, iMax = seenCells.length; i < iMax; i++) {
        if (seenCells[i].hasProp('actors')) {
            const actors = seenCells[i].getProp('actors');
            // Exclude itself from list
            if (actors[0].getID() !== actor.getID()) {
                cells.push(seenCells[i]);
            }
        }
    }
    return cells;
};

RG.Brain.findCellsWithFriends = (actor, seenCells) => {
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
RG.Brain.getActorCellsAround = actor => {
    const cellsAround = RG.Brain.getCellsAroundActor(actor);
    const res = cellsAround.filter(cell => cell.hasActors());
    return res;
};

/* Returns all cells with actors in them around the actor. */
RG.Brain.getActorsAround = actor => {
    const cellsAround = RG.Brain.getCellsAroundActor(actor);
    let actors = [];
    cellsAround.forEach(c => {
        if (c.hasActors()) {actors = actors.concat(c.getActors());}
    });
    return actors;
};

RG.Brain.getEnemyCellsAround = actor => {
    const cellsAround = RG.Brain.getCellsAroundActor(actor);
    const res = cellsAround.filter(cell => (
        cell.hasActors() &&
            actor.getBrain().getMemory().isEnemy(cell.getActors()[0])
    ));
    return res;
};

RG.Brain.getFriendCellsAround = actor => {
    const cellsAround = RG.Brain.getCellsAroundActor(actor);
    const res = cellsAround.filter(cell => (
        cell.hasActors() &&
            actor.getBrain().getMemory().isFriend(cell.getActors()[0])
    ));
    return res;
};

RG.Brain.distToActor = (actor1, actor2) => {
    const [eX, eY] = actor1.getXY();
    const [aX, aY] = actor2.getXY();
    const getDist = RG.Path.shortestDist(eX, eY, aX, aY);
    return getDist;
};

/* Memory is used by the actor to hold information about enemies, items etc.
 * It's a separate object from decision-making brain.*/
RG.Brain.Memory = function() {

    this._actors = {};
    this._enemyTypes = {}; // List of enemy types for this actor
    this._communications = [];
    this._lastAttackedID = null;

    // TODO add memory of player closing a door/using stairs

    /* Adds a generic enemy type. */
    this.addEnemyType = type => {
        this._enemyTypes[type] = true;
    };

    /* Removes a generic enemy type. */
    this.removeEnemyType = type => {
        if (this._enemyTypes[type]) {
            delete this._enemyTypes[type];
        }
    };

    /* Checks if given actor is an enemy. */
    this.isEnemy = actor => {
        if (this._actors.hasOwnProperty('enemies')) {
            const index = this._actors.enemies.indexOf(actor);
            if (index !== -1) {return true;}
        }
        if (!this.isFriend(actor)) {
            if (this._enemyTypes[actor.getType()]) {
                return true;
            }
            if (!actor.isPlayer) {
                const json = JSON.stringify(actor);
                RG.err('Memory', 'isEnemy',
                    'Actor has not isPlayer() ' + json);
            }
            if (actor.isPlayer()) {
                return this._enemyTypes.player;
            }
        }
        return false;
    };

    /* Checks if actor is a friend. */
    this.isFriend = actor => {
        if (this._actors.hasOwnProperty('friends')) {
            const index = this._actors.friends.indexOf(actor);
            return index >= 0;
        }
        return false;
    };

    /* Adds an actor friend. */
    this.addFriend = actor => {
        if (this.isEnemy(actor)) {
            this.removeEnemy(actor);
        }
        if (!this._actors.hasOwnProperty('friends')) {
            this._actors.friends = [];
        }
        if (!this.isFriend(actor)) {
            this._actors.friends.push(actor);
        }
    };

    this.addEnemySeenCell = cell => {
        this._actors.enemySeen = [cell.getX(), cell.getY()];
    };

    /* Adds given actor as (personal) enemy. */
    this.addEnemy = actor => {
        if (!RG.isActor(actor)) {
            const json = JSON.stringify(actor);
            RG.err('Memory', 'addEnemy',
                'Only actors can be added. Got: ' + json);
        }
        if (!this.isEnemy(actor)) {
            if (this.isFriend(actor)) {
                this.removeFriend(actor);
            }
            if (!this._actors.hasOwnProperty('enemies')) {
                this._actors.enemies = [];
            }
            this._actors.enemies.push(actor);
            if (this._communications.length > 0) {
                this._communications = []; // Invalidate communications
            }
        }
    };

    this.removeEnemy = actor => {
        if (this._actors.hasOwnProperty('enemies')) {
            const index = this._actors.enemies.indexOf(actor);
            if (index >= 0) {
                this._actors.enemies.splice(index, 1);
            }
        }
    };

    this.removeFriend = actor => {
        if (this._actors.hasOwnProperty('friends')) {
            const index = this._actors.friends.indexOf(actor);
            if (index >= 0) {
                this._actors.friends.splice(index, 1);
            }
        }
    };

    this.getEnemies = () => this._actors.enemies || MEM_NO_ACTORS;
    this.getFriends = () => this._actors.friends || MEM_NO_ACTORS;

    /* Adds a communication with given actor. */
    this.addCommunicationWith = actor => {
        if (!this.hasCommunicatedWith(actor)) {
            this._communications.push(actor);
        }
    };

    /* Sets last attacked actor. This is used to prevent actor from switching
     * target between attacks (which is ineffective to kill anything). */
    this.setLastAttacked = actor => {
        if (actor) {
            this._lastAttackedID = actor.getID();
        }
        else {
            // When restoring game, actor can be null (ie it was killed), but
            // this actor does not know it
            this._lastAttackedID = null;
        }
    };

    this.wasLastAttacked = actor => this._lastAttackedID === actor.getID();

    /* Returns true if has communicated with given actor.*/
    this.hasCommunicatedWith = actor => {
        const index = this._communications.indexOf(actor);
        return index !== -1;
    };

    this.toJSON = () => {
        const obj = {
            enemyTypes: Object.keys(this._enemyTypes)
        };
        if (this._actors.hasOwnProperty('enemies')) {
            obj.enemies = this._actors.enemies.map(enemy => enemy.getID());
        }
        if (this._actors.hasOwnProperty('friends')) {
            obj.friends = this._actors.friends.map(enemy => enemy.getID());
        }
        if (this._lastAttackedID) {
            obj.lastAttackedID = this._lastAttackedID;
        }
        return obj;
    };

};

/* Base class for actor brains. */
RG.Brain.Base = function(actor) {
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

RG.Brain.Base.prototype.decideNextAction = function() {
    RG.err('Brain.Base', 'decideNextAction',
        'Not implemented. Do in derived class');
};

RG.Brain.Base.prototype.toJSON = function() {
    return {
        type: this._type
    };
};

RG.Brain.NonSentient = function(actor) {
    RG.Brain.Base.call(this, actor);
    this.setType('NonSentient');
};
RG.extend2(RG.Brain.NonSentient, RG.Brain.Base);

RG.Brain.NonSentient.prototype.decideNextAction = function() {
    return NO_ACTION_TAKEN;
};

/* Brain is used by the AI to perform and decide on actions. Brain returns
 * actionable callbacks but doesn't know Action objects.  */
RG.Brain.Rogue = function(actor) {
    if (RG.isNullOrUndef([actor])) {
        RG.err('Brain.Rogue', 'constructor',
            'Actor must not be null.');
    }

    this._actor = actor; // Owner of the brain
    this._explored = {}; // Memory of explored cells
    this._type = 'Rogue';
    this._memory = new RG.Brain.Memory(this);

    this._cache = {
        seen: null
    };

    this._passableCallback = this._passableCallback.bind(this);
};

RG.Brain.Rogue.prototype.getType = function() {
    return this._type;
};

RG.Brain.Rogue.prototype.setType = function(type) {
    this._type = type;
};

RG.Brain.Rogue.prototype.getMemory = function() {
    return this._memory;
};

RG.Brain.Rogue.prototype.setActor = function(actor) {
    this._actor = actor;
};

RG.Brain.Rogue.prototype.getActor = function() {
    return this._actor;
};

RG.Brain.Rogue.prototype.addEnemy = function(actor) {
    this._memory.addEnemy(actor);
};
RG.Brain.Rogue.prototype.addFriend = function(actor) {
    this._memory.addFriend(actor);
};
RG.Brain.Rogue.prototype.addEnemyType = function(type) {
    this._memory.addEnemyType(type);
};

/* Callback used for actor's path finding. */
RG.Brain.Rogue.prototype._passableCallback = function(x, y) {
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

/* Main function for retrieving the actionable callback. */
RG.Brain.Rogue.prototype.decideNextAction = function() {
    this._cache.seen = null;
    return BTree.startBehavTree(Models.Rogue.tree, this._actor)[0];
};

// Returns cells seen by this actor
RG.Brain.Rogue.prototype.getSeenCells = function() {
    if (this._cache.seen) {
        return this._cache.seen;
    }
    const map = this._actor.getLevel().getMap();
    this._cache.seen = map.getVisibleCells(this._actor);
    return this._cache.seen;
};


/* Checks if the actor can melee attack given x,y coordinate.*/
RG.Brain.Rogue.prototype.canMeleeAttack = function(x, y) {
    const attackRange = this._actor.get('Combat').getAttackRange();
    const [dX, dY] = RG.dXdYAbs([x, y], this._actor);
    if (dX <= attackRange && dY <= attackRange) {return true;}
    return false;
};

RG.Brain.Rogue.prototype.findSeenCell = function(func) {
    const seenCells = this.getSeenCells();
    return seenCells.filter(func);
};

/* Returns true if this actor can see the given actor. */
RG.Brain.Rogue.prototype.canSeeActor = function(actor) {
    const seenCells = this.getSeenCells();
    const cells = RG.Brain.findCellsWithActors(this._actor, seenCells);
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
RG.Brain.Rogue.prototype.findEnemyCell = function(seenCells) {
    const enemyCells = [];
    const cells = RG.Brain.findCellsWithActors(this._actor, seenCells);
    for (let i = 0; i < cells.length; i++) {
        const actors = cells[i].getSentientActors();
        for (let j = 0; j < actors.length; j++) {
            if (this._memory.isEnemy(actors[j])) {
                if (this._memory.wasLastAttacked(actors[j])) {
                    this._memory.addEnemySeenCell(cells[i]);
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
        const randEnemyCell = RNG.arrayGetRand(enemyCells);
        this._memory.addEnemySeenCell(randEnemyCell);
        return randEnemyCell;
    }
    return null;
};

/* Finds a friend cell among seen cells.*/
RG.Brain.Rogue.prototype.findFriendCell = function(seenCells) {
    const memory = this.getMemory();
    const cells = RG.Brain.findCellsWithActors(this._actor, seenCells);
    for (let i = 0; i < cells.length; i++) {
        const actors = cells[i].getActors();
        if (!memory.isEnemy(actors[0])) {return cells[i];}
    }
    return null;
};

RG.Brain.Rogue.prototype.toJSON = function() {
    return {
        type: this.getType(),
        memory: this.getMemory().toJSON()
    };
};

RG.Brain.Rogue.prototype.canPickupItem = function() {
    const cell = this._actor.getCell();
    if (cell.hasItems()) {
        const topItem = cell.getItems()[0];
        return this._actor.getInvEq().canCarryItem(topItem);
    }
    return false;
};

RG.Brain.Rogue.prototype.pickupItem = function() {
    return () => {
        const [x, y] = this._actor.getXY();
        const level = this._actor.getLevel();
        level.pickupItem(this._actor, x, y);
    };
};

/* Takes action towards given enemy cell.*/
RG.Brain.Rogue.prototype.actionTowardsEnemy = function(enemyCell) {
    const level = this._actor.getLevel();
    const playX = enemyCell.getX();
    const playY = enemyCell.getY();
    if (this.canMeleeAttack(playX, playY)) {
        return () => {
            const cell = level.getMap().getCell(playX, playY);
            const target = cell.getProp('actors')[0];
            const attackComp = new RG.Component.Attack({target});
            this._actor.add('Attack', attackComp);
        };
    }
    else { // Move closer
        return this.tryToMoveTowardsCell(enemyCell);
    }
};

RG.Brain.Rogue.prototype.tryToMoveTowardsCell = function(cell) {
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
            this._actor.add('Movement', movComp);
        };
    }

    // If simple option fails, resort to path finding
    const pathCells = this.getShortestPathTo(cell);
    if (pathCells.length > 1) {
        const x = pathCells[1].getX();
        const y = pathCells[1].getY();
        return () => {
            const movComp = new RG.Component.Movement(x, y, level);
            this._actor.add('Movement', movComp);
        };
    }
    else {
        return NO_ACTION_TAKEN; // Don't move, rest
    }
};

/* Returns all friends that are visible to the brain's actor. */
RG.Brain.Rogue.prototype.getSeenFriends = function() {
    const friends = [];
    const memory = this.getMemory();
    const seenCells = this.getSeenCells();
    const cells = RG.Brain.findCellsWithActors(this._actor, seenCells);
    for (let i = 0; i < cells.length; i++) {
        const actors = cells[i].getActors();
        if (memory.isFriend(actors[0])) {
            friends.push(actors[0]);
        }
    }
    return friends;
};

/* Returns all enemies that are visible to the brain's actor. */
RG.Brain.Rogue.prototype.getSeenEnemies = function() {
    const enemies = [];
    const memory = this.getMemory();
    const seenCells = this.getSeenCells();
    const cells = RG.Brain.findCellsWithActors(this._actor, seenCells);
    for (let i = 0; i < cells.length; i++) {
        const actors = cells[i].getActors();
        if (memory.isEnemy(actors[0])) {
            enemies.push(actors[0]);
        }
    }
    return enemies;
};

/* Based on seenCells, AI explores the unexplored free cells, or picks on
 * cell randomly, if everything's explored.*/
RG.Brain.Rogue.prototype.exploreLevel = function(seenCells) {
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
RG.Brain.Rogue.prototype.getShortestPathTo = function(cell) {
    const path = [];
    const toX = cell.getX();
    const toY = cell.getY();
    const pathFinder = new ROT.Path.AStar(toX, toY, this._passableCallback);
    const map = this._actor.getLevel().getMap();
    const sourceX = this._actor.getX();
    const sourceY = this._actor.getY();

    if (RG.isNullOrUndef([toX, toY, sourceX, sourceY])) {
        RG.err('Brain', 'getShortestPathTo', 'Null/undef coords.');
    }

    pathFinder.compute(sourceX, sourceY, (x, y) => {
        if (map.hasXY(x, y)) {
            path.push(map.getCell(x, y));
        }
    });
    return path;
};

/* Flees from the given cell or explores randomly if cannot. */
RG.Brain.Rogue.prototype.fleeFromCell = function(cell, seenCells) {
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
RG.Brain.Rogue.prototype.getFreeCellsAround = function() {
    const cellsAround = RG.Brain.getCellsAroundActor(this._actor);
    return cellsAround.filter(cell => cell.isFree());
};

RG.Brain.Rogue.prototype.getRandAdjacentFreeCell = function() {
    const cellsAround = this.getFreeCellsAround();
    if (cellsAround.length > 0) {
        return RNG.arrayGetRand(cellsAround);
    }
    return null;
};


/* Brain used by most of the animals. TODO: Add some corpse eating behaviour. */
/* RG.Brain.Animal = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('Animal');
    this._memory.addEnemyType('player');
    this._memory.addEnemyType('human');

};
RG.extend2(RG.Brain.Animal, RG.Brain.Rogue);
*/

/* Brain used by most of the animals. TODO: Add some corpse eating behaviour. */
RG.Brain.Demon = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('Demon');
    this._memory.addEnemyType('player');
    this._memory.addEnemyType('human');

};
RG.extend2(RG.Brain.Demon, RG.Brain.Rogue);

/* Brain object used by Undead. */
RG.Brain.Undead = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('Undead');
    this._memory.addEnemyType('player');
    this._memory.addEnemyType('human');
    this._memory.addEnemyType('dwarf');
};
RG.extend2(RG.Brain.Undead, RG.Brain.Rogue);

/* Brain used by summoners. */
RG.Brain.Summoner = function(actor) {
    RG.Brain.Rogue.call(this, actor);
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
RG.extend2(RG.Brain.Summoner, RG.Brain.Rogue);

RG.Brain.Summoner.prototype.decideNextAction = function() {
    this._cache.seen = null;
    return BTree.startBehavTree(Models.Summoner.tree, this._actor)[0];
};


/* This brain is used by humans who are not hostile to the player.*/
RG.Brain.Human = function(actor) {
    RG.Brain.Rogue.call(this, actor);
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

        friendActor.add('Communication', comComp);
        memory.addCommunicationWith(friendActor);
        return ACTION_ALREADY_DONE;
    };

};
RG.extend2(RG.Brain.Human, RG.Brain.Rogue);

RG.Brain.Human.prototype.decideNextAction = function() {
    this._cache.seen = null;
    return BTree.startBehavTree(Models.Human.tree, this._actor)[0];
};

/* Brain object used by Spirit objects.*/
RG.Brain.Spirit = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('Spirit');
};
RG.extend2(RG.Brain.Spirit, RG.Brain.Rogue);

/* Returns the next action for the spirit.*/
RG.Brain.Spirit.prototype.decideNextAction = function() {
    this._cache.seen = null;
    const seenCells = this.getSeenCells();
    const res = this.exploreLevel(seenCells);
    this._cache.seen = null;
    return res;
};

/* Brain object used by archers. */
RG.Brain.Archer = function(actor) {
    RG.Brain.Rogue.call(this, actor);
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
            const getDist = RG.Path.shortestDist(x, y, actorX, actorY);
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
        missile.add('Missile', mComp);
        return ACTION_ALREADY_DONE;
    };
};
RG.extend2(RG.Brain.Archer, RG.Brain.Rogue);

/* Brain object for spellcasting actors. This model focuses on aggressive
 * spellcasting intended to harm opponents. */
RG.Brain.SpellCaster = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('SpellCaster');
    this.goal = new GoalsTop.ThinkSpellcaster(actor);
    this.goal.setBias({CastSpell: 2.0, AttackActor: 0.7});
    this.goal.getEvaluator('CastSpell').setCastingProbability(0.8);

    this.getGoal = () => this.goal;
    this.setGoal = goal => {this.goal = goal;};

};
RG.extend2(RG.Brain.SpellCaster, RG.Brain.Rogue);

RG.Brain.SpellCaster.prototype.decideNextAction = function() {
    this._cache.seen = null;
    this.goal.process();
    this._cache.seen = null;
    return ACTION_ALREADY_DONE;
};

/* Brain object for testing goal-based actors. */
RG.Brain.GoalOriented = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('GoalOriented');
    this.goal = new GoalsTop.ThinkBasic(actor);

    this.getGoal = () => this.goal;
    this.setGoal = goal => {this.goal = goal;};

};
RG.extend2(RG.Brain.GoalOriented, RG.Brain.Rogue);

/* Must return function. */
RG.Brain.GoalOriented.prototype.decideNextAction = function() {
    this._cache.seen = null;
    this.goal.process();
    this._cache.seen = null;
    return ACTION_ALREADY_DONE;
};

RG.Brain.GoalOriented.prototype.toJSON = function() {
    const json = RG.Brain.Rogue.prototype.toJSON.call(this);
    json.goal = this.goal.toJSON();
    return json;
};

RG.Brain.Explorer = function(actor) {
    RG.Brain.GoalOriented.call(this, actor);
    this.setType('Explorer');
    this.goal.removeEvaluators();
    this.goal.addEvaluator(new Evaluator.Explore());
};
RG.extend2(RG.Brain.Explorer, RG.Brain.GoalOriented);

/* Brain-object for animals. */
RG.Brain.Animal = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('Animal');
    this.goal = new GoalsTop.ThinkBasic(actor);
    this._memory.addEnemyType('player');
    this._memory.addEnemyType('human');

    this.getGoal = () => this.goal;
    this.setGoal = goal => {this.goal = goal;};

};
RG.extend2(RG.Brain.Animal, RG.Brain.Rogue);

/* Must return function. */
RG.Brain.Animal.prototype.decideNextAction = function() {
    this._cache.seen = null;
    this.goal.process();
    this._cache.seen = null;
    return ACTION_ALREADY_DONE;
};


/* Brain object for testing goal-based actors. */
RG.Brain.Commander = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('Commander');
    this.goal = new GoalsTop.ThinkCommander(actor);

    this.getGoal = () => this.goal;
    this.setGoal = goal => {this.goal = goal;};

};
RG.extend2(RG.Brain.Commander, RG.Brain.Rogue);

/* Must return function. */
RG.Brain.Commander.prototype.decideNextAction = function() {
    this._cache.seen = null;
    this.goal.process();
    this._cache.seen = null;
    return ACTION_ALREADY_DONE;
};

/* Simple brain used by the non-moving flame elements. They emit damage
 * components in the cells they are located in. */
RG.Brain.Flame = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('Flame');
};
RG.extend2(RG.Brain.Flame, RG.Brain.Rogue);

RG.Brain.Flame.prototype.decideNextAction = function() {
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
RG.Brain.Cloud = function(actor) {
    RG.Brain.Flame.call(this, actor);
    this.setType('Cloud');
    this.chanceToMove = 0.2;
};
RG.extend2(RG.Brain.Cloud, RG.Brain.Flame);

RG.Brain.Cloud.prototype.decideNextAction = function() {
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
    return RG.Brain.Flame.prototype.decideNextAction.call(this);
};

/* This brain switched for player-controlled actors when MindControl
 * is cast on them. It acts as "paralysis" at the moment. */
RG.Brain.MindControl = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('MindControl');
    this.goal = new GoalsTop.ThinkBasic(actor);

    this.getGoal = () => this.goal;
    this.setGoal = goal => {this.goal = goal;};

};
RG.extend2(RG.Brain.MindControl, RG.Brain.Rogue);

RG.Brain.MindControl.prototype.decideNextAction = function() {
    // At the moment does nothing, it could attack the
    // enemies of the source of MindControl
    return ACTION_ALREADY_DONE;
};

module.exports = RG.Brain;

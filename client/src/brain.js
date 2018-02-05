
const ROT = require('../../lib/rot.js');
const RG = require('./rg.js');
const BTree = require('./aisequence');
RG.Path = require('./path');

const GoalsTop = require('./goals-top');

const Models = BTree.Models;

// Dummy callback to return, if the actor's action provides a state
// changing action without callback.
const ACTION_ALREADY_DONE = () => {};
const NO_ACTION_TAKEN = () => {};
const MEM_NO_ACTORS = Object.freeze([]);

//---------------------------------------------------------------------------
// BRAINS
//---------------------------------------------------------------------------

RG.Brain = {};

/* Returns a list of cells in 3x3 around the actor with the brain.*/
RG.Brain.getCellsAroundActor = actor => {
    const map = actor.getLevel().getMap();
    const x = actor.getX();
    const y = actor.getY();
    const cells = [];
    for (let xx = x - 1; xx <= x + 1; xx++) {
        for (let yy = y - 1; yy <= y + 1; yy++) {
            if (map.hasXY(xx, yy)) {
                if (xx !== x || yy !== y) {
                    cells.push(map.getCell(xx, yy));
                }
            }
        }
    }
    return cells;
};

/* Returns all cells with actors in them. */
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

RG.Brain.getEnemyCellsAround = actor => {
    const cellsAround = RG.Brain.getCellsAroundActor(actor);
    const res = cellsAround.filter(cell => (
        cell.hasActors() &&
            actor.getBrain().getMemory().isEnemy(cell.getActors()[0])
    ));
    return res;
};

/* Memory is used by the actor to hold information about enemies, items etc.
 * It's a separate object from decision-making brain.*/
RG.Brain.Memory = function() {

    this._actors = {};
    this._enemyTypes = []; // List of enemy types for this actor
    this._communications = [];
    this._lastAttackedID = null;

    // TODO add memory of player closing a door/using stairs

    /* Adds a generic enemy type. */
    this.addEnemyType = type => {
        this._enemyTypes.push(type);
    };

    /* Removes a generic enemy type. */
    this.removeEnemyType = type => {
        const index = this._enemyTypes.indexOf(type);
        if (index >= 0) {
            this._enemyTypes.splice(index, 1);
        }
    };

    /* Checks if given actor is an enemy. */
    this.isEnemy = actor => {
        if (this._actors.hasOwnProperty('enemies')) {
            const index = this._actors.enemies.indexOf(actor);
            if (index !== -1) {return true;}
        }
        if (!this.isFriend(actor)) {
            const type = actor.getType();
            const index = this._enemyTypes.indexOf(type);
            if (index !== -1) {return true;}
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

    /* Adds given actor as (personal) enemy.*/
    this.addEnemy = actor => {
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
            enemyTypes: this._enemyTypes
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

    this.setActor = actor => {this.this._actor = actor;};
    this.getActor = () => this.this._actor;
    this.getType = () => this.this._type;
    this.setType = type => {this.this._type = type;};

    /* Main function for retrieving the actionable callback. Acting actor must
     * be passed in. */
    this.decideNextAction = function() {
      RG.err('Brain.Base', 'decideNextAction',
          'Not implemented. Do in derived class');
    };

};

/* Brain is used by the AI to perform and decide on actions. Brain returns
 * actionable callbacks but doesn't know Action objects.  */
RG.Brain.Rogue = function(actor) {
    this._actor = actor; // Owner of the brain
    this._explored = {}; // Memory of explored cells
    this._type = 'Rogue';
    this._memory = new RG.Brain.Memory(this);

    this.getType = () => this._type;
    this.setType = type => {this._type = type;};

    this.getMemory = () => this._memory;

    this.setActor = actor => {this._actor = actor;};
    this.getActor = () => this._actor;

    this.addEnemy = actor => {this._memory.addEnemy(actor);};
    this.addFriend = actor => {this._memory.addFriend(actor);};
    this.addEnemyType = type => {this._memory.addEnemyType(type);};

    this._seenCached = null;

    /* Callback used for actor's path finding. */
    this._passableCallback = (x, y) => {
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

    /* Main function for retrieving the actionable callback. Acting actor must
     * be passed in. */
    this.decideNextAction = function() {
        this._seenCached = null;
        return BTree.startBehavTree(Models.Rogue.tree, this._actor)[0];
    };

}; // RogueBrain

// Returns cells seen by this actor
RG.Brain.Rogue.prototype.getSeenCells = function() {
    if (this._seenCached) {
        return this._seenCached;
    }
    const map = this._actor.getLevel().getMap();
    this._seenCached = map.getVisibleCells(this._actor);
    return this._seenCached;
};


/* Checks if the actor can attack given x,y coordinate.*/
RG.Brain.Rogue.prototype.canMeleeAttack = function(x, y) {
    const actorX = this._actor.getX();
    const actorY = this._actor.getY();
    const attackRange = this._actor.get('Combat').getAttackRange();
    const getDist = RG.Path.shortestDist(x, y, actorX, actorY);
    if (getDist <= attackRange) {return true;}
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
        const actors = cells[i].getActors();
        if (this._memory.isEnemy(actors[0])) {
            if (this._memory.wasLastAttacked(actors[0])) {
                return cells[i];
            }
            else {
                enemyCells.push(cells[i]);
            }
        }
    }
    // Return random enemy cell to make behav less predictable
    if (enemyCells.length > 0) {return RG.RAND.arrayGetRand(enemyCells);}
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
            const attackComp = new RG.Component.Attack(target);
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
            if (door.isClosed) {
                return () => {door.openDoor();};
            }
        }
    }

    if (index === -1) { // Everything explored, choose random cell
        index = RG.RAND.randIndex(seenCells);
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


/* Brain used by most of the animals. TODO: Add some corpse eating behaviour. */
RG.Brain.Animal = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('Animal');
    this._memory.addEnemyType('player');
    this._memory.addEnemyType('human');

};
RG.extend2(RG.Brain.Animal, RG.Brain.Rogue);

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

    this.decideNextAction = function() {
        this._seenCached = null;
        return BTree.startBehavTree(Models.Summoner.tree, this._actor)[0];
    };

    /* Returns true if the summoner will summon on this action. */
    this.willSummon = function() {
        if (this.numSummoned === this.maxSummons) {return false;}
        const summon = RG.RAND.getUniform();
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

/* This brain is used by humans who are not hostile to the player.*/
RG.Brain.Human = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('Human');

    this.commProbability = 0.5;

    this.getMemory().addEnemyType('demon');

    this.willCommunicate = function() {
        const communicateOrAttack = RG.RAND.getUniform();
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

    this.decideNextAction = function() {
        this._seenCached = null;
        return BTree.startBehavTree(Models.Human.tree, actor)[0];
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

/* Brain object used by the bearfolk. */
RG.Brain.Bearfolk = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('Bearfolk');
};
RG.extend2(RG.Brain.Bearfolk, RG.Brain.Rogue);

/* Brain object used by Spirit objects.*/
RG.Brain.Spirit = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('Spirit');

    /* Returns the next action for the spirit.*/
    this.decideNextAction = function() {
        this._seenCached = null;
        const seenCells = this.getSeenCells();
        return this.exploreLevel(seenCells);
    };
};
RG.extend2(RG.Brain.Spirit, RG.Brain.Rogue);

/* Brain object used by archers. */
RG.Brain.Archer = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('Archer');

    this.decideNextAction = function() {
        this._seenCached = null;
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

    this._castingProb = 0.2;

    this.setCastProbability = prob => {this._castingProb = prob;};

    this.decideNextAction = function() {
        this._seenCached = null;
        this._spell = this.getRandomSpell();
        this._spellDir = null;
        return BTree.startBehavTree(Models.SpellCaster.tree, this._actor)[0];
    };

    this.getRandomSpell = () => {
        const book = this._actor.getBook();
        if (book && book.getSpells().length > 0) {
            return RG.RAND.arrayGetRand(book.getSpells());
        }
        return null;
    };

    /* Returns true if spellcaster can cast a spell. */
    this.canCastSpell = function() {
        if (actor.get('SpellPower').getPP() >= this._spell.getPower()) {
            if (RG.RAND.getUniform() <= this._castingProb) {
                return true;
            }
        }
        return false;
    };

    /* Returns true if spellcaster should cast the spell. */
    this.shouldCastSpell = function() {
        const seenCells = this.getSeenCells();
        const enemy = this.findEnemyCell(seenCells).getActors()[0];
        const args = {enemy, actor: this._actor};
        return this._spell.aiShouldCastSpell(args);
    };

    /* Casts a spell. */
    this.castSpell = function() {
        return this._spell.getCastFunc(this._actor, this._spellArgs);
    };

    /* Sets the arguments for spell to be cast. */
    this.setSpellArgs = function(args) {
        this._spellArgs = args;
    };

};
RG.extend2(RG.Brain.SpellCaster, RG.Brain.Rogue);

/* Brain object for testing goal-based actors. */
RG.Brain.GoalOriented = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('GoalOriented');

    this.goal = new GoalsTop.ThinkBasic(actor);

    /* Must return function. */
    this.decideNextAction = function() {
        this._seenCached = null;
        const status = this.goal.process();
        return ACTION_ALREADY_DONE;
    };

    this.getGoal = () => this.goal;
    this.setGoal = goal => {this.goal = goal;};

};
RG.extend2(RG.Brain.GoalOriented, RG.Brain.Rogue);


module.exports = RG.Brain;

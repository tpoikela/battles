
const ROT = require('../../lib/rot.js');
const RG = require('./rg.js');
const BTree = require('./aisequence');

const Models = BTree.Models;

// Dummy callback to return, if the actor's action provides a state
// changing action without callback.
const ACTION_ALREADY_DONE = () => {};
const NO_ACTION_TAKEN = () => {};


//---------------------------------------------------------------------------
// BRAINS
//---------------------------------------------------------------------------

RG.Brain = {};

/* Returns a list of cells in 3x3 around the actor with the brain.*/
RG.Brain.getCellsAround = function(actor) {
    const map = actor.getLevel().getMap();
    const x = actor.getX();
    const y = actor.getY();
    const cells = [];
    for (let xx = x - 1; xx <= x + 1; xx++) {
        for (let yy = y - 1; yy <= y + 1; yy++) {
            if (map.hasXY(xx, yy)) {cells.push(map.getCell(xx, yy));}
        }
    }
    return cells;
};

/* Memory is used by the actor to hold information about enemies, items etc.
 * It's a separate object from decision-making brain.*/
RG.Brain.Memory = function() {

    const _enemies = []; // List of enemies for this actor
    const _enemyTypes = []; // List of enemy types for this actor
    let _communications = [];

    let _lastAttackedID = null;

    // TODO add memory of player closing a door/using stairs

    this.addEnemyType = function(type) {
        _enemyTypes.push(type);
    };

    /* Checks if given actor is an enemy. */
    this.isEnemy = function(actor) {
        let index = _enemies.indexOf(actor);
        if (index !== -1) {return true;}
        const type = actor.getType();
        index = _enemyTypes.indexOf(type);
        if (index !== -1) {return true;}
        return false;
    };

    /* Adds given actor as (personal) enemy.*/
    this.addEnemy = function(actor) {
        if (!this.isEnemy(actor)) {
            _enemies.push(actor);
            _communications = []; // Invalidate communications
        }
    };

    this.getEnemies = function() {return _enemies;};

    /* Adds a communication with given actor. */
    this.addCommunicationWith = function(actor) {
        if (!this.hasCommunicatedWith(actor)) {
            _communications.push(actor);
        }
    };

    this.setLastAttacked = function(actor) {
        if (actor) {
            _lastAttackedID = actor.getID();
        }
        else {
            _lastAttackedID = null;
        }
    };

    this.wasLastAttacked = function(actor) {
        return _lastAttackedID === actor.getID();
    };

    /* Returns true if has communicated with given actor.*/
    this.hasCommunicatedWith = function(actor) {
        const index = _communications.indexOf(actor);
        return index !== -1;
    };

    this.toJSON = function() {
        const obj = {
            enemies: _enemies.map(enemy => enemy.getID()),
            enemyTypes: _enemyTypes
        };
        if (_lastAttackedID) {
            obj.lastAttackedID = _lastAttackedID;
        }
        return obj;
    };

};

/* Brain is used by the AI to perform and decide on actions. Brain returns
 * actionable callbacks but doesn't know Action objects.  */
RG.Brain.Rogue = function(actor) {
    let _actor = actor; // Owner of the brain
    const _explored = {}; // Memory of explored cells
    let _type = 'rogue';

    const _memory = new RG.Brain.Memory(this);

    this.getType = function() {return _type;};
    this.setType = function(type) {_type = type;};

    this.getMemory = function() {return _memory;};

    this.setActor = function(actor) {_actor = actor;};
    this.getActor = function() {return _actor;};

    this.addEnemy = function(actor) {_memory.addEnemy(actor);};
    this.addEnemyType = function(type) {_memory.addEnemyType(type);};

    this._seenCached = null;

    /* Callback used for actor's path finding. */
    const _passableCallback = function(x, y) {
        const map = _actor.getLevel().getMap();
        const hasFlying = _actor.has('Flying');
        if (!RG.isNullOrUndef([map])) {
            let res = false;
            if (hasFlying) {
                res = map.isPassableByAir(x, y);
            }
            else {
                res = map.isPassable(x, y);
            }
            if (!res) {
                res = (x === _actor.getX()) && (y === _actor.getY());
            }
            return res;
        }
        else {
            RG.err('Brain.Rogue', '_passableCallback', 'map not well defined.');
        }
        return false;
    };

    // Returns cells seen by this actor
    this.getSeenCells = function() {
        if (this._seenCached) {
            return this._seenCached;
        }
        this._seenCached = _actor.getLevel().getMap().getVisibleCells(_actor);
        return this._seenCached;
    };

    /* Main function for retrieving the actionable callback. Acting actor must
     * be passed in. */
    this.decideNextAction = function() {
        this._seenCached = null;
        return BTree.startBehavTree(Models.Rogue.tree, _actor)[0];
    };

    /* Takes action towards given enemy cell.*/
    this.actionTowardsEnemy = function(enemyCell) {
        const level = _actor.getLevel();
        const playX = enemyCell.getX();
        const playY = enemyCell.getY();
        if (this.canAttack(playX, playY)) {
            return function() {
                const cell = level.getMap().getCell(playX, playY);
                const target = cell.getProp('actors')[0];
                const attackComp = new RG.Component.Attack(target);
                _actor.add('Attack', attackComp);
            };
        }
        else { // Move closer
            return this.tryToMoveTowardsCell(enemyCell);
        }
    };

    /* Based on seenCells, AI explores the unexplored free cells, or picks on
     * cell randomly, if everything's explored.*/
    this.exploreLevel = function(seenCells) {
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
                if (!_explored.hasOwnProperty(xy)) {
                    _explored[xy] = true;
                    index = ci;
                    break;
                }
            }
            else if (cell.hasDoor()) {
                const door = cell.getPropType('door')[0];
                if (door.isClosed) {door.openDoor();}
            }
        }

        if (index === -1) { // Everything explored, choose random cell
            index = RG.RAND.randIndex(seenCells);
        }
        return this.tryToMoveTowardsCell(seenCells[index]);

    };

    this.tryToMoveTowardsCell = function(cell) {
        const pathCells = this.getShortestPathTo(cell);
        if (pathCells.length > 1) {
            const level = _actor.getLevel();
            const x = pathCells[1].getX();
            const y = pathCells[1].getY();
            return function() {
                const movComp = new RG.Component.Movement(x, y, level);
                _actor.add('Movement', movComp);
            };
        }
        else {
            return NO_ACTION_TAKEN; // Don't move, rest
        }
    };

    /* Checks if the actor can attack given x,y coordinate.*/
    this.canAttack = function(x, y) {
        const actorX = _actor.getX();
        const actorY = _actor.getY();
        const attackRange = _actor.get('Combat').getAttackRange();
        const getDist = RG.shortestDist(x, y, actorX, actorY);
        if (getDist <= attackRange) {return true;}
        return false;
    };

    /* Given a list of cells, returns a cell with an enemy in it or null.*/
    this.findEnemyCell = function(seenCells) {
        const enemyCells = [];
        for (let i = 0, iMax = seenCells.length; i < iMax; i++) {
            if (seenCells[i].hasProp('actors')) {
                const actors = seenCells[i].getProp('actors');
                // Prevent suicidal attacks on the actor itself
                if (actors[0].getID() !== _actor.getID()) {
                    if (_memory.isEnemy(actors[0])) {
                        if (_memory.wasLastAttacked(actors[0])) {
                            return seenCells[i];
                        }
                        else {
                            enemyCells.push(seenCells[i]);
                        }
                    }
                }
            }
        }
        if (enemyCells.length > 0) {return RG.RAND.arrayGetRand(enemyCells);}
        return null;
    };

    /* Finds a friend cell among seen cells.*/
    this.findFriendCell = function(seenCells) {
        const memory = this.getMemory();
        for (let i = 0, iMax = seenCells.length; i < iMax; i++) {
            if (seenCells[i].hasProp('actors')) {
                const actors = seenCells[i].getProp('actors');
                if (actors[0] !== _actor) { // Exclude itself
                    if (!memory.isEnemy(actors[0])) {return seenCells[i];}
                }
            }
        }
        return null;
    };

    /* Flees from the given cell or explores randomly if cannot. */
    this.fleeFromCell = function(cell, seenCells) {
        const x = cell.getX();
        const y = cell.getY();
        const thisX = _actor.getX();
        const thisY = _actor.getY();
        const deltaX = x - thisX;
        const deltaY = y - thisY;
        // delta determines the direction to flee
        const newX = thisX - deltaX;
        const newY = thisY - deltaY;
        if (_actor.getLevel().getMap().hasXY(newX, newY)) {
            const newCell = _actor.getLevel().getMap().getCell(newX, newY);
            if (newCell.isPassable()) {
                return this.tryToMoveTowardsCell(newCell);
            }
            else if (_actor.has('Flying') && newCell.isPassableByAir()) {
                return this.tryToMoveTowardsCell(newCell);
            }
        }
        return this.exploreLevel(seenCells);
    };

    /* Returns shortest path from actor to the given cell. Resulting cells are
     * returned in order: closest to the actor first. Thus moving to the
     * next cell can be done by taking the first returned cell.*/
    this.getShortestPathTo = function(cell) {
        const path = [];
        const toX = cell.getX();
        const toY = cell.getY();
        const pathFinder = new ROT.Path.AStar(toX, toY, _passableCallback);
        const map = _actor.getLevel().getMap();
        const sourceX = _actor.getX();
        const sourceY = _actor.getY();

        if (RG.isNullOrUndef([toX, toY, sourceX, sourceY])) {
            RG.err('Brain', 'getShortestPathTo', 'Null/undef coords.');
        }

        pathFinder.compute(sourceX, sourceY, function(x, y) {
            if (map.hasXY(x, y)) {
                path.push(map.getCell(x, y));
            }
        });
        return path;
    };

    this.toJSON = function() {
        return {
            type: this.getType(),
            memory: this.getMemory().toJSON()
        };
    };

}; // RogueBrain

/* Brain used by most of the animals. TODO: Add some corpse eating behaviour. */
RG.Brain.Animal = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('animal');

    const _memory = this.getMemory();
    _memory.addEnemyType('player');
    _memory.addEnemyType('human');

    this.findEnemyCell = function(seenCells) {
        for (let i = 0, iMax = seenCells.length; i < iMax; i++) {
            if (seenCells[i].hasProp('actors')) {
                const actors = seenCells[i].getProp('actors');
                if (_memory.isEnemy(actors[0])) {return seenCells[i];}
            }
        }
        return null;
    };

};
RG.extend2(RG.Brain.Animal, RG.Brain.Rogue);

/* Brain used by most of the animals. TODO: Add some corpse eating behaviour. */
RG.Brain.Demon = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('demon');

    const _memory = this.getMemory();
    _memory.addEnemyType('player');
    _memory.addEnemyType('human');

    this.findEnemyCell = function(seenCells) {
        const memory = this.getMemory();
        for (let i = 0, iMax = seenCells.length; i < iMax; i++) {
            if (seenCells[i].hasProp('actors')) {
                const actors = seenCells[i].getProp('actors');
                if (memory.isEnemy(actors[0])) {return seenCells[i];}
            }
        }
        return null;
    };

};
RG.extend2(RG.Brain.Demon, RG.Brain.Rogue);

RG.Brain.Zombie = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('zombie');
};
RG.extend2(RG.Brain.Zombie, RG.Brain.Rogue);

/* Brain object used by Undead. */
RG.Brain.Undead = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('undead');

    const _memory = this.getMemory();
    _memory.addEnemyType('player');
    _memory.addEnemyType('human');
    _memory.addEnemyType('dwarf');
};
RG.extend2(RG.Brain.Undead, RG.Brain.Rogue);

/* Brain used by summoners. */
RG.Brain.Summoner = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('summoner');

    const _actor = actor;
    this.numSummoned = 0;
    this.maxSummons = 20;
    this.summonProbability = 0.2;

    const _memory = this.getMemory();
    _memory.addEnemyType('player');

    this.decideNextAction = function() {
        this._seenCached = null;
        return BTree.startBehavTree(Models.Summoner.tree, _actor)[0];
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
        const level = _actor.getLevel();
        const cellsAround = this.getFreeCellsAround();
        if (cellsAround.length > 0) {
            const freeX = cellsAround[0].getX();
            const freeY = cellsAround[0].getY();
            const summoned = RG.FACT.createActor('Summoned',
                {hp: 15, att: 7, def: 7});
            summoned.get('Experience').setExpLevel(5);
            level.addActor(summoned, freeX, freeY);
            RG.gameMsg(_actor.getName() + ' summons some help');
            this.numSummoned += 1;
        }
        else {
            const txt = ' screamed an incantation but nothing happened';
            RG.gameMsg(_actor.getName() + txt);
        }
        return ACTION_ALREADY_DONE;
    };

    /* Returns all free cells around the actor owning the brain.*/
    this.getFreeCellsAround = function() {
        const cellsAround = RG.Brain.getCellsAround(_actor);
        const freeCells = [];
        for (let i = 0; i < cellsAround.length; i++) {
            if (cellsAround[i].isFree()) {freeCells.push(cellsAround[i]);}
        }
        return freeCells;
    };

};
RG.extend2(RG.Brain.Summoner, RG.Brain.Rogue);

/* This brain is used by humans who are not hostile to the player.*/
RG.Brain.Human = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('human');

    this.commProbability = 0.5;

    this.getMemory().addEnemyType('demon');

    this.willCommunicate = function() {
        const communicateOrAttack = RG.RAND.getUniform();
        const seenCells = this.getSeenCells();
        // const enemyCell = this.findEnemyCell(seenCells);
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
    this.setType('bearfolk');
};
RG.extend2(RG.Brain.Bearfolk, RG.Brain.Rogue);

/* Brain object used by Spirit objects.*/
RG.Brain.Spirit = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('spirit');

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
    this.setType('archer');
    const _actor = actor;

    this.decideNextAction = function() {
        this._seenCached = null;
        return BTree.startBehavTree(Models.Archer.tree, _actor)[0];
    };

    /* Checks if the actor can attack given x,y coordinate.*/
    this.canDoRangedAttack = function() {
        const seenCells = this.getSeenCells();
        const enemy = this.findEnemyCell(seenCells);
        const x = enemy.getX();
        const y = enemy.getY();
        const actorX = _actor.getX();
        const actorY = _actor.getY();
        const miss = _actor.getInvEq().getEquipment().getItem('missile');
        if (miss) {
            const range = RG.getMissileRange(_actor, miss);
            const getDist = RG.shortestDist(x, y, actorX, actorY);
            if (getDist <= range) {return true;}
            // TODO test for a clean shot
        }
        return false;
    };

    /* Performs a ranged attack on enemy cell. */
    this.doRangedAttack = function() {
        const seenCells = this.getSeenCells();
        const enemy = this.findEnemyCell(seenCells);
        return function() {
            const x = enemy.getX();
            const y = enemy.getY();
            const mComp = new RG.Component.Missile(_actor);
            const missile = _actor.getInvEq().unequipAndGetItem('missile', 1);
            mComp.setTargetXY(x, y);
            mComp.setDamage(RG.getMissileDamage(_actor, missile));
            mComp.setAttack(RG.getMissileAttack(_actor, missile));
            mComp.setRange(RG.getMissileRange(_actor, missile));
            missile.add('Missile', mComp);
        };
    };
};
RG.extend2(RG.Brain.Archer, RG.Brain.Rogue);

module.exports = RG.Brain;

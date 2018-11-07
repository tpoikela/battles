
const RG = require('./rg');

const MEM_NO_ACTORS = Object.freeze([]);

/* Memory is used by the actor to hold information about enemies, items etc.
 * It's a separate object from decision-making brain.*/
const Memory = function() {

    this._actors = {};
    this._enemyTypes = {}; // List of enemy types for this actor
    this._communications = [];
    this._lastAttackedID = null;
    // TODO add memory of player closing a door/using stairs
};

/* Adds a generic enemy type. */
Memory.prototype.addEnemyType = function(type) {
    this._enemyTypes[type] = true;
};

/* Removes a generic enemy type. */
Memory.prototype.removeEnemyType = function(type) {
    if (this._enemyTypes[type]) {
        delete this._enemyTypes[type];
    }
};

/* Checks if given actor is an enemy. */
Memory.prototype.isEnemy = function(actor) {
    if (this._actors.hasOwnProperty('enemies')) {
        const index = this._actors.enemies.indexOf(actor);
        if (index >= 0) {return true;}
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
Memory.prototype.isFriend = function(actor) {
    if (this._actors.hasOwnProperty('friends')) {
        const index = this._actors.friends.indexOf(actor);
        return index >= 0;
    }
    return false;
};

/* Adds an actor friend. */
Memory.prototype.addFriend = function(actor) {
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

Memory.prototype.addEnemySeenCell = function(actor) {
    if (!this._actors.seen) {this._actors.seen = {};}
    this._actors.seen[actor.getID()] = {x: actor.getX(), y: actor.getY(),
        level: actor.getLevel().getID()};
};

Memory.prototype.hasSeen = function(actor) {
    if (this._actors.seen && this._actors.seen[actor.getID()]) {
        return true;
    }
    return false;
};

Memory.prototype.getLastSeen = function(actor) {
    if (this._actors.seen[actor.getID()]) {
        return this._actors.seen[actor.getID()];
    }
    return null;
};

/* Adds given actor as (personal) enemy. */
Memory.prototype.addEnemy = function(actor) {
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

Memory.prototype.removeEnemy = function(actor) {
    if (this._actors.hasOwnProperty('enemies')) {
        const index = this._actors.enemies.indexOf(actor);
        if (index >= 0) {
            this._actors.enemies.splice(index, 1);
        }
    }
};


Memory.prototype.removeFriend = function(actor) {
    if (this._actors.hasOwnProperty('friends')) {
        const index = this._actors.friends.indexOf(actor);
        if (index >= 0) {
            this._actors.friends.splice(index, 1);
        }
    }
};

Memory.prototype.getEnemies = function() {
    return this._actors.enemies || MEM_NO_ACTORS;
};

Memory.prototype.getFriends = function() {
    return this._actors.friends || MEM_NO_ACTORS;
};

/* Copies memory (mainly friends/enemies) from one actor. Used when another
 * actor is summoned to copy summoner's enemies. */
Memory.prototype.copyMemoryFrom = function(actor) {
    const memory = actor.getBrain().getMemory();
    const enemies = memory.getEnemies().slice();
    this._actors.enemies = enemies;
    const friends = memory.getFriends().slice();
    this._actors.friends = friends;
    this._enemyTypes = Object.assign({}, memory._enemyTypes);
};

/* Adds a communication with given actor. */
Memory.prototype.addCommunicationWith = function(actor) {
    if (!this.hasCommunicatedWith(actor)) {
        this._communications.push(actor);
    }
};

Memory.prototype.wasLastAttacked = function(actor) {
    return this._lastAttackedID === actor.getID();
};

/* Sets last attacked actor. This is used to prevent actor from switching
 * target between attacks (which is ineffective to kill anything). */
Memory.prototype.setLastAttacked = function(actor) {
    if (actor) {
        this._lastAttackedID = actor.getID();
    }
    else {
        // When restoring game, actor can be null (ie it was killed), but
        // this actor does not know it
        this._lastAttackedID = null;
    }
};

/* Returns true if has communicated with given actor.*/
Memory.prototype.hasCommunicatedWith = function(actor) {
    const index = this._communications.indexOf(actor);
    return index !== -1;
};

Memory.prototype.toJSON = function() {
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
    if (this._actors.hasOwnProperty('seen')) {
        obj.seen = this._actors.seen;
    }
    return obj;
};

module.exports = Memory;

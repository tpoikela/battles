
import RG from '../rg';

const MEM_NO_ACTORS = Object.freeze([]);

interface ActorsMap {
    enemies?: any[];
    friends?: any[];
    seen?: {[key: string]: any};
}

const NOT_ATTACKED = null;

/* Memory is used by the actor to hold information about enemies, items etc.
 * It's a separate object from decision-making brain.*/
export class Memory {

    protected _actors: ActorsMap;
    protected _enemyTypes: {[key: string]: true};
    protected _communications: any[];
    protected _lastAttackedID: number;

    constructor() {
        this._actors = {};
        this._enemyTypes = {}; // List of enemy types for this actor
        this._communications = [];
        this._lastAttackedID = NOT_ATTACKED;
        // TODO add memory of player closing a door/using stairs
    }

    /* Adds a generic enemy type. */
    addEnemyType(type): void {
        this._enemyTypes[type] = true;
    }

    /* Removes a generic enemy type. */
    removeEnemyType(type): void {
        if (this._enemyTypes[type]) {
            delete this._enemyTypes[type];
        }
    }

    /* Checks if given actor is an enemy. */
    isEnemy(actor): boolean {
        if (this._actors.hasOwnProperty('enemies')) {
            const index = this._actors.enemies.indexOf(actor);
            if (index >= 0) {return true;}
        }
        // Friend overrides generic enemy type
        if (!this.isFriend(actor)) {
            if (this._enemyTypes[actor.getType()]) {
                return true;
            }
            if (actor.isPlayer()) {
                return this._enemyTypes.player;
            }
        }
        return false;
    }

    /* Checks if actor is a friend. */
    isFriend(actor) {
        if (this._actors.hasOwnProperty('friends')) {
            const index = this._actors.friends.indexOf(actor);
            return index >= 0;
        }
        return false;
    }

    /* Adds an actor friend. */
    addFriend(actor) {
        if (this.isEnemy(actor)) {
            this.removeEnemy(actor);
        }
        if (!this._actors.hasOwnProperty('friends')) {
            this._actors.friends = [];
        }
        if (!this.isFriend(actor)) {
            this._actors.friends.push(actor);
        }
    }

    addEnemySeenCell(actor) {
        if (!this._actors.seen) {this._actors.seen = {};}
        this._actors.seen[actor.getID()] = {x: actor.getX(), y: actor.getY(),
            level: actor.getLevel().getID()};
    }

    hasSeen(actor) {
        if (this._actors.seen && this._actors.seen[actor.getID()]) {
            return true;
        }
        return false;
    }

    getLastSeen(actor) {
        if (this._actors.seen[actor.getID()]) {
            return this._actors.seen[actor.getID()];
        }
        return null;
    }

    /* Adds given actor as (personal) enemy. */
    addEnemy(actor) {
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
    }

    removeEnemy(actor) {
        if (this._actors.hasOwnProperty('enemies')) {
            const index = this._actors.enemies.indexOf(actor);
            if (index >= 0) {
                this._actors.enemies.splice(index, 1);
            }
        }
    }

    removeFriend(actor) {
        if (this._actors.hasOwnProperty('friends')) {
            const index = this._actors.friends.indexOf(actor);
            if (index >= 0) {
                this._actors.friends.splice(index, 1);
            }
        }
    }

    getEnemies() {
        return this._actors.enemies || MEM_NO_ACTORS;
    }

    getFriends() {
        return this._actors.friends || MEM_NO_ACTORS;
    }

    /* Copies memory (mainly friends/enemies) from one actor. Used when another
     * actor is summoned to copy summoner's enemies. */
    copyMemoryFrom(actor) {
        const memory = actor.getBrain().getMemory();
        const enemies = memory.getEnemies().slice();
        this._actors.enemies = enemies;
        const friends = memory.getFriends().slice();
        this._actors.friends = friends;
        this._enemyTypes = Object.assign({}, memory._enemyTypes);
    }

    /* Adds a communication with given actor. */
    addCommunicationWith(actor) {
        if (!this.hasCommunicatedWith(actor)) {
            this._communications.push(actor);
        }
    }

    wasLastAttacked(actor) {
        return this._lastAttackedID === actor.getID();
    }

    /* Sets last attacked actor. This is used to prevent actor from switching
     * target between attacks (which is ineffective to kill anything). */
    setLastAttacked(actor) {
        if (actor) {
            this._lastAttackedID = actor.getID();
        }
        else {
            // When restoring game, actor can be null (ie it was killed), but
            // this actor does not know it
            this._lastAttackedID = NOT_ATTACKED;
        }
    }

    /* Returns true if has communicated with given actor.*/
    hasCommunicatedWith(actor) {
        const index = this._communications.indexOf(actor);
        return index !== -1;
    }

    toJSON() {
        const obj: any = {
            enemyTypes: Object.keys(this._enemyTypes)
        };
        if (this._actors.hasOwnProperty('enemies')) {
            obj.enemies = this._actors.enemies.map(enemy => enemy.getID());
        }
        if (this._actors.hasOwnProperty('friends')) {
            obj.friends = this._actors.friends.map(enemy => enemy.getID());
        }
        if (this._lastAttackedID >= 0) {
            obj.lastAttackedID = this._lastAttackedID;
        }
        if (this._actors.hasOwnProperty('seen')) {
            obj.seen = this._actors.seen;
        }
        return obj;
    }
}

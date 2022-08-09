
import RG from '../rg';
import {ICoordXY} from '../interfaces';

type BaseActor = import('../actor').BaseActor;

const MEM_NO_ACTORS: BaseActor[] = [];

interface SeenCoord {
    x: number;
    y: number;
    level: number;
}

interface MemActorsMap {
    enemies?: BaseActor[];
    friends?: BaseActor[];
    seen?: {[key: string]: SeenCoord};
    enemyGroups?: number[];
    friendGroups?: number[];
    usedStairs?: {[key: string]: SeenCoord};
    closedDoor?: {[key: string]: SeenCoord};
}

const NOT_ATTACKED = null;

/* Memory is used by the actor to hold information about enemies, items etc.
 * It's a separate object from decision-making brain.*/
export class Memory {

    protected _actors: MemActorsMap;
    protected _enemyTypes: {[key: string]: true};
    protected _communications: BaseActor[];
    protected _lastAttackedID: null | number;

    constructor() {
        this._actors = {};
        this._enemyTypes = {}; // List of enemy types for this actor
        this._communications = [];
        this._lastAttackedID = NOT_ATTACKED;
        // TODO add memory of player closing a door/using stairs
    }

    /* Adds a generic enemy type. */
    public addEnemyType(type: string): void {
        this._enemyTypes[type] = true;
    }

    public hasEnemyType(type: string): boolean {
        return this._enemyTypes[type];
    }

    /* Removes a generic enemy type. */
    public removeEnemyType(type: string): void {
        if (this._enemyTypes[type]) {
            delete this._enemyTypes[type];
        }
    }

    /* Removes all existing enemy types. */
    public removeEnemyTypes(): void {
        Object.keys(this._enemyTypes).forEach(key => {
            this.removeEnemyType(key);
        });
    }

    public addEnemyGroup(groupId: number): void {
        if (!this._actors.enemyGroups) {
            this._actors.enemyGroups = [];
        }
        this._actors.enemyGroups.push(groupId);
    }

    public addUsedStairs(id: number, coord: SeenCoord): void {
        if (!this._actors.usedStairs) {this._actors.usedStairs = {};}
        this._actors.usedStairs[id] = coord;
    }

    public getStairsUsed(): null | {[key: string]: SeenCoord} {
        return this._actors.usedStairs;
    }

    public addFriendGroup(groupId: number): void {
        if (!this._actors.friendGroups) {
            this._actors.friendGroups = [];
        }
        this._actors.friendGroups.push(groupId);
    }

    public isEnemyOrFriend(actor: BaseActor): boolean {
        return this.isEnemy(actor) || this.isFriend(actor);
    }

    /* Checks if given actor is an enemy. */
    public isEnemy(actor: BaseActor): boolean {
        // Checks for personal enemy
        if (this._actors.hasOwnProperty('enemies')) {
            const index = this._actors.enemies!.indexOf(actor);
            if (index >= 0) {return true;}
        }
        // Checks for group enemy (ie in Army)
        if (this._actors.enemyGroups) {
            if (actor.has('Groups')) {
                if (actor.get('Groups').hasGroupId(this._actors.enemyGroups)) {
                    return true;
                }
            }
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
    public isFriend(actor: BaseActor): boolean {
        if (this._actors.hasOwnProperty('friends')) {
            const index = this._actors.friends!.indexOf(actor);
            if (index >= 0) {
                return true;
            }
        }
        // Checks for group enemy (ie in Army)
        if (this._actors.friendGroups) {
            if (actor.has('Groups')) {
                if (actor.get('Groups').hasGroupId(this._actors.friendGroups)) {
                    return true;
                }
            }
        }
        return false;
    }

    /* Adds an actor friend. */
    public addFriend(actor: BaseActor): void {
        if (this.isEnemy(actor)) {
            this.removeEnemy(actor);
        }
        if (!this._actors.hasOwnProperty('friends')) {
            this._actors.friends = [];
        }
        if (!this.isFriend(actor)) {
            this._actors.friends!.push(actor);
        }
    }

    public addEnemySeenCell(actor: BaseActor): void {
        if (!this._actors.seen) {this._actors.seen = {};}
        this._actors.seen[actor.getID()] = {x: actor.getX(), y: actor.getY(),
            level: actor.getLevel().getID()};
    }

    public hasSeen(id: number): boolean {
        if (this._actors.seen && this._actors.seen[id]) {
            return true;
        }
        return false;
    }

    public getLastSeen(actor: BaseActor | number): SeenCoord | null {
        let id = actor as number;
        if (RG.isActor(actor)) {
            id = actor.getID();
        }

        if (this._actors.seen) {
            if (this._actors.seen[id]) {
                return this._actors.seen[id];
            }
        }
        return null;
    }

    /* Adds given actor as (personal) enemy. */
    public addEnemy(actor: BaseActor): void {
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

    public removeEnemy(actor: BaseActor): void {
        if (this._actors.hasOwnProperty('enemies')) {
            const index = this._actors.enemies.indexOf(actor);
            if (index >= 0) {
                this._actors.enemies.splice(index, 1);
            }
        }
    }

    public removeFriend(actor: BaseActor): void {
        if (this._actors.hasOwnProperty('friends')) {
            const index = this._actors.friends.indexOf(actor);
            if (index >= 0) {
                this._actors.friends.splice(index, 1);
            }
        }
    }

    public getEnemyActors(): BaseActor[] {
        return this._actors.enemies || MEM_NO_ACTORS;
    }

    public getFriendActors(): BaseActor[] {
        return this._actors.friends || MEM_NO_ACTORS;
    }

    /* Copies memory (mainly friends/enemies) from one actor. Used when another
     * actor is summoned to copy summoner's enemies. */
    public copyMemoryFrom(actor: BaseActor): void {
        const memory: Memory = actor.getBrain().getMemory();
        const enemies = memory.getEnemyActors().slice();
        this._actors.enemies = enemies;
        const friends = memory.getFriendActors().slice();
        this._actors.friends = friends;
        this._enemyTypes = Object.assign({}, memory._enemyTypes);
    }

    /* Adds a communication with given actor. */
    public addCommunicationWith(actor: BaseActor): void {
        if (!this.hasCommunicatedWith(actor)) {
            this._communications.push(actor);
        }
    }

    public getLastAttacked(): number | null {
        return this._lastAttackedID;
    }

    public wasLastAttacked(actor: BaseActor): boolean {
        return this._lastAttackedID === actor.getID();
    }

    /* Sets last attacked actor. This is used to prevent actor from switching
     * target between attacks (which is ineffective to kill anything). */
    public setLastAttacked(actor: BaseActor): void {
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
    public hasCommunicatedWith(actor) {
        const index = this._communications.indexOf(actor);
        return index !== -1;
    }

    public toJSON() {
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

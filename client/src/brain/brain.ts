
import RG from '../rg';
import * as Component from '../component';
import {Geometry} from '../geometry';
import {BrainBase} from './brain.base';
import {Memory} from './brain.memory';
import {Random} from '../random';
import {TCoord, ICoordXY} from '../interfaces';
import {Path} from '../path';

type BaseActor = import('../actor').BaseActor;
type SentientActor = import('../actor').SentientActor;
type ActionCallback = import('../time').ActionCallback;
type Level = import('../level').Level;
type CellMap = import('../map').CellMap;
type Cell = import('../map.cell').Cell;

// Dummy callback to return, if the actor's action provides a state
// changing action without callback.
export const ACTION_ALREADY_DONE = Object.freeze(() => {});
export const NO_ACTION_TAKEN = Object.freeze(() => {});

const RNG = Random.getRNG();

//---------------------------------------------------------------------------
// BRAINS
//---------------------------------------------------------------------------

export const Brain: any = {};

function shortestDist(eX, eY, aX, aY): number {
    const path = Geometry.getBresenham(eX, eY, aX, aY);
    const getDist = path.length - 1;
    return getDist > 0 ? getDist : 0;
}

/* Returns a list of cells around the actor. The distance d can be specified.
* For example, d=1 gives 3x3 region, d=2 5x5 region, d=3 7x7 ... */
Brain.getCellsAroundActor = (actor: BaseActor, d: number = 1): Cell[] => {
    const map: CellMap = actor.getLevel().getMap();
    const [x, y] = actor.getXY();
    const cells: Cell[] = [];

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

Brain.getBoxOfFreeCellsAround = (actor: BaseActor, d: number): Cell[] => {
    const map = actor.getLevel().getMap();
    const [x, y] = actor.getXY();
    // Grab free cells around the player in the new level, and try
    // to place actors into them
    let coordAround = Geometry.getBoxAround(x, y, d);
    coordAround = coordAround.filter((xy: TCoord) => (
        map.hasXY(xy[0], xy[1])
    ));
    let cells = coordAround.map(xy => map.getCell(xy[0], xy[1]));
    cells = cells.filter(cell => cell.isFree());
    return cells;
};

/* Returns all cells with actors in them from list of seen cells. */
Brain.findCellsWithActors = (actor: BaseActor, seenCells: Cell[], filterFunc): Cell[] => {
    const cells: Cell[] = [];
    for (let i = 0, iMax = seenCells.length; i < iMax; i++) {
        if (seenCells[i].hasActors()) {
            const actors = seenCells[i].getActors()!;
            // Exclude itself from list
            if (actors[0].getID() !== actor.getID()) {
                if (filterFunc && filterFunc(actors)) {
                    cells.push(seenCells[i]);
                }
                else if (!filterFunc) {
                    cells.push(seenCells[i]);
                }
            }
        }
    }
    return cells;
};

Brain.getActorsInCells = (seenCells: Cell[], filterFunc): BaseActor[] => {
    const cells: BaseActor[] = [];
    for (let i = 0, iMax = seenCells.length; i < iMax; i++) {
        if (seenCells[i].hasActors()) {
            // actors must have len >= 1, due to hasProps()
            const actors = seenCells[i].getActors()!;
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

Brain.getSeenHostiles = (ent): SentientActor[] => {
    const seenCells = ent.getBrain().getSeenCells();
    const filterFunc = (actor) => actor.isEnemy(ent);
    const enemies = Brain.getActorsInCells(seenCells, filterFunc);
    return enemies as SentientActor[];
};

Brain.findCellsWithFriends = (actor: BaseActor, seenCells: Cell[]): Cell[] => {
    const cells: Cell[] = [];
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
Brain.getActorCellsAround = (actor: BaseActor): Cell[] => {
    const cellsAround = Brain.getCellsAroundActor(actor);
    const res = cellsAround.filter(cell => cell.hasActors());
    return res;
};

/* Returns all cells with actors in them around the actor. */
Brain.getActorsAround = (actor: BaseActor): BaseActor[] => {
    const cellsAround = Brain.getCellsAroundActor(actor);
    let actors = [];
    cellsAround.forEach(c => {
        if (c.hasActors()) {actors = actors.concat(c.getActors());}
    });
    return actors;
};

Brain.getEnemyCellsAround = (actor: BaseActor): Cell[] => {
    const cellsAround = Brain.getCellsAroundActor(actor);
    const res = cellsAround.filter(cell => (
        cell.hasActors() &&
            actor.getBrain().getMemory().isEnemy(cell.getActors()[0])
    ));
    return res;
};

Brain.getFriendCellsAround = (actor: BaseActor): Cell[] => {
    const cellsAround = Brain.getCellsAroundActor(actor);
    const res = cellsAround.filter(cell => (
        cell.hasActors() &&
            actor.getBrain().getMemory().isFriend(cell.getActors()[0])
    ));
    return res;
};

Brain.distToActor = (actor1: BaseActor, actor2: BaseActor): number => {
    const [eX, eY] = actor1.getXY();
    const [aX, aY] = actor2.getXY();
    const getDist = shortestDist(eX, eY, aX, aY);
    return getDist;
};

Brain.getTelepathyCells = function(actor: BaseActor): Cell[] {
    const actorLevelID = actor.getLevel().getID();
    const tepathyComps = actor.getList('Telepathy');
    let cells = [];
    tepathyComps.forEach(teleComp => {
        const target = teleComp.getTarget();
        const targetLevel: Level = target.getLevel();
        if (RG.isActorActive(target)) {
            if (targetLevel.getID() === actorLevelID) {
                const newCells = targetLevel.getMap().getCellsInFOV(target);
                cells = cells.concat(newCells);
            }
        }
    });
    return cells;
};

//-----------------
// BRAIN BASE
//-----------------

export class BrainNonSentient extends BrainBase {
    constructor(actor) {
        super(actor);
        this.setType('NonSentient');
    }

    public decideNextAction(obj?: any): ActionCallback | null {
        return NO_ACTION_TAKEN;
    }
}
Brain.NonSentient = BrainNonSentient;

/* Brain is used by the AI to perform and decide on actions. Brain returns
 * actionable callbacks but doesn't know Action objects.  */
export class BrainSentient extends BrainBase {
    protected _explored: {[key: string]: boolean};
    protected _memory: Memory;
    protected _cache: {[key: string]: any[]};

    constructor(actor: BaseActor) {
        super(actor);
        this._explored = {}; // Memory of explored cells
        this._type = 'Sentient';
        this._memory = new Memory();
        this._cache = {
            seen: []
        };
        // this._passableCallback = this._passableCallback.bind(this);
    }

    public getMemory(): Memory {
        return this._memory;
    }

    public addEnemy(actor) {
        this._memory.addEnemy(actor);
    }

    public addFriend(actor) {
        this._memory.addFriend(actor);
    }

    public addEnemyType(type: string): void {
        this._memory.addEnemyType(type);
    }

    /* Main function for retrieving the actionable callback. */
    public decideNextAction(obj?: any): null | ActionCallback {
        this._cache.seen = [];
        RG.err('BrainSentient', 'decideNextAction',
            'Not implemented in this class');
        return null;
    }

    // Returns cells seen by this actor
    public getSeenCells(): Cell[] {
        if (this._cache.seen) {
            return this._cache.seen;
        }
        const map = this._actor.getLevel().getMap();
        if (RG.isSentient(this._actor)) {
            this._cache.seen = map.getCellsInFOV(this._actor);
            if (this._actor.has('Telepathy')) {
                const otherSeen = Brain.getTelepathyCells(this._actor);
                this._cache.seen = this._cache.seen.concat(otherSeen);
            }
            return this._cache.seen;
        }
        RG.warn('Brain', 'Sentient',
            `Called with non-sentient actor ${this._actor.getName()}`);
        return [] as Cell[];
    }


    public canSeeCell(cell: Cell): boolean {
        if (this._cache.seen) {
            return this._cache.seen.indexOf(cell) >= 0;
        }
        const map = this._actor.getLevel().getMap();
        if (RG.isSentient(this._actor)) {
            return map.canSeeCell(this._actor, cell);
        }
        return false;
    }

    /* Checks if the actor can melee attack given x,y coordinate.*/
    public canMeleeAttack(x: number, y: number): boolean {
        const attackRange = this._actor.get('Combat').getAttackRange();
        const [dX, dY] = RG.dXdYAbs([x, y], this._actor);
        if (dX <= attackRange && dY <= attackRange) {return true;}
        return false;
    }

    public findSeenCell(func: (c: Cell) => boolean): Cell[] {
        const seenCells = this.getSeenCells();
        return seenCells.filter(func);
    }

    /* Returns true if this actor can see the given actor. */
    public canSeeActor(actor: BaseActor): boolean {
        const seenCells = this.getSeenCells();
        const cells = Brain.findCellsWithActors(this._actor, seenCells);
        let canSee = false;
        cells.forEach((cell: Cell) => {
            const actors = cell.getActors();
            if (actors) {
                actors.forEach(a => {
                    if (a.getID() === actor.getID()) {
                        canSee = true;
                    }
                });
            }
        });
        return canSee;
    }

    /* Given a list of cells, returns a cell with an enemy in it or null.
    * Returns the most recently attacked, or random actor found. */
    public findEnemyCell(seenCells: Cell[]): null | Cell {
        const enemyCells = [];
        const cells = Brain.findCellsWithActors(this._actor, seenCells);
        for (let i = 0; i < cells.length; i++) {
            const actors = cells[i].getSentientActors();
            for (let j = 0; j < actors.length; j++) {
                if (this._memory.isEnemy(actors[j])) {
                    this._memory.addEnemySeenCell(actors[j]);
                    // This ensures we select previously fought enemy, ie
                    // no randomly switching between enemies
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

    /* Finds enemy cell by first checking a box of r x r around the actor. Does
     * full FoV lookup only, if box contains an enemy.
     */
    public findEnemyCellFast(): null | Cell {
        const [x0, y0] = this._actor.getXY();
        const r = RG.getFOVRange((this._actor as SentientActor));
        const coord: TCoord[] = Geometry.getBoxAround(x0, y0, r);
        let cell = null;
        const cellMap = this._actor.getLevel().getMap();

        for (let i = 0; i < coord.length; i++) {
            const [x, y] = coord[i];
            if (cell === null) {
                if (cellMap.hasXY(x, y)) {
                    const c0 = cellMap.getCell(x, y);
                    if (c0.hasActors()) {
                        const actor = c0.getFirstActor()!;
                        if (this._actor.isEnemy(actor)) {
                            cell = c0;
                            if (this._memory.wasLastAttacked(actor)) {
                                return cell;
                            }
                        }
                    }
                }
            }
            else {
                break;
            }
        }
        if (cell === null) {return cell;}
        // Do a proper search with full FOV if one enemy was found
        const seenCells = this.getSeenCells();
        return this.findEnemyCell(seenCells);
    }

    /* Finds a friend cell among seen cells.*/
    public findFriendCell(seenCells: Cell[]): null | Cell {
        const memory = this.getMemory();
        const cells = Brain.findCellsWithActors(this._actor, seenCells);
        for (let i = 0; i < cells.length; i++) {
            const actors = cells[i].getActors();
            if (!memory.isEnemy(actors[0])) {return cells[i];}
        }
        return null;
    }

    public toJSON(): any {
        return {
            type: this.getType(),
            memory: this.getMemory().toJSON()
        };
    }

    public canPickupItem(): boolean {
        const cell = this._actor.getCell();
        if (cell && cell.hasItems()) {
            const topItem = cell.getItems()![0]; // hasItems() ensures non-null
            return (this._actor as SentientActor).getInvEq().canCarryItem(topItem);
        }
        return false;
    }

    public pickupItem(): () => void {
        return () => {
            const pickup = new Component.Pickup();
            this._actor.add(pickup);
        };
    }

    /* Takes action towards given enemy cell.*/
    /*
    public actionTowardsEnemy(enemyCell: Cell): () => void {
        const level = this._actor.getLevel();
        const playX = enemyCell.getX();
        const playY = enemyCell.getY();
        if (this.canMeleeAttack(playX, playY)) {
            return () => {
                const cell = level.getMap().getCell(playX, playY);
                const target = cell.getFirstActor();
                const attackComp = new Component.Attack({target});
                this._actor.add(attackComp);
            };
        }
        else { // Move closer
            return this.tryToMoveTowardsCell(enemyCell);
        }
    }
    TODO rm
    */

    public tryToMoveTowardsCell(cell: Cell): () => void {
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
    public getSeenFriends(): BaseActor[] {
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
    public getSeenEnemies(): SentientActor[] {
        const memory = this.getMemory();
        const seenCells = this.getSeenCells();
        const filterFunc = actor => memory.isEnemy(actor);
        const enemies = Brain.getActorsInCells(seenCells, filterFunc);
        return enemies as SentientActor[];
    }

    /* Based on seenCells, AI explores the unexplored free cells, or picks on
     * cell randomly, if everything's explored.*/
    /*
    public exploreLevel(seenCells) {
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
    TODO rm
    */

    /* Returns shortest path from actor to the given cell. Resulting cells are
     * returned in order: closest to the actor first. Thus moving to the
     * next cell can be done by taking the first returned cell.*/
    public getShortestPathTo(cell: Cell): Cell[] {
        const [toX, toY] = cell.getXY();
        const [fromX, fromY] = this._actor.getXY();
        const map = this._actor.getLevel().getMap();
        // return map.getShortestPathTo(this._actor, toX, toY);
        const path: ICoordXY[] = Path.getShortestActorPath(map, fromX, fromY, toX, toY);
        return path.map((xy: ICoordXY) => map.getCell(xy.x, xy.y));
    }

    /* Flees from the given cell or explores randomly if cannot. */
    /*
    public fleeFromCell(cell: Cell, seenCells: Cell[]): () => void {
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
    TODO rm
    */

    /* Returns all free cells around the actor owning the brain.*/
    public getFreeCellsAround(): Cell[] {
        const cellsAround = Brain.getCellsAroundActor(this._actor);
        return cellsAround.filter((c: Cell) => c.isFree());
    }

    public getRandAdjacentFreeCell(): Cell | null {
        const cellsAround = this.getFreeCellsAround();
        if (cellsAround.length > 0) {
            return RNG.arrayGetRand(cellsAround);
        }
        return null;
    }
}

Brain.Sentient = BrainSentient;

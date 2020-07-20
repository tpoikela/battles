/* Contains code for thief goal and its related sub-goals. */

import RG from './rg';
import {Goal, GoalBase, GoalStatus} from './goals';
import {Random} from './random';
import {Brain} from './brain';
import * as Component from './component';
import {TCoord} from './interfaces';

type Cell = import('./map.cell').Cell;
type ItemBase = import('./item').ItemBase;
type SentientActor = import('./actor').SentientActor;
type ElementShop = import('./element').ElementShop;

const {
    GOAL_ACTIVE,
    GOAL_COMPLETED} = GoalStatus;
const RNG = Random.getRNG();

/* With this Goal, an actor can search a house for interesting features,
 * such as items to pick up. */
export class GoalSearchHouse extends GoalBase {

    public floorCells: Cell[];
    public door: TCoord;
    public searchTime: number;

    constructor(actor: SentientActor) {
        super(actor);
        this.setType('GoalSearchHouse');
        const cell = actor.getCell();
        if (cell.hasDoor()) {
            this.door = cell.getXY();
        }
        this.subGoals = [];
        this.searchTime = RNG.getUniformInt(20, 40);
    }

    public activate(): void {
        this.status = GOAL_ACTIVE;
        const seenCells: Cell[] = this.actor.getBrain().getSeenCells();
        if (!this.floorCells || this.floorCells.length === 0) {
            this.floorCells = seenCells.filter(c => (
                c.getBaseElem().getType() === 'floorhouse'
            ));
        }

        let nextGoal = ifItemFoundCreateGoal(this.actor, seenCells);
        if (!nextGoal && this.floorCells.length > 0) {
            const cell = RNG.arrayGetRand(this.floorCells);
            nextGoal = new Goal.FollowPath(this.actor, cell.getXY());
        }

        if (this.searchTime <= 0) {
            const actorCell = this.actor.getCell();
            // Get out of the house
            if (actorCell.hasDoor()) {
                // Get out finally
                const cells = Brain.getCellsAroundActor(this.actor);
                let chosenCell = null;
                cells.forEach((cell: Cell) => {
                    if (cell.getBaseElem().getType() !== 'floorhouse') {
                        if (cell.isPassable()) {
                            chosenCell = cell;
                            return;
                        }
                    }
                });

                if (chosenCell) {
                    Goal.moveActorTo(this.actor, chosenCell);
                    this.status = GOAL_COMPLETED;
                }
                else {
                    RG.warn('Goal.SearcHouse', 'activate',
                        'Could not move out of the house');
                }
            }
            else {
                nextGoal = Goal.FollowPath(this.actor, actorCell.getXY());
            }
        }

        if (nextGoal) {
            this.addSubGoal(nextGoal);
        }
    }

    public process(): GoalStatus {
        this.activateIfInactive();
        --this.searchTime;
        if (this.hasSubGoals()) {
            this.status = this.processSubGoals();
        }
        else {
            this.activate();
            if (this.status !== GOAL_COMPLETED) {
                this.status = this.processSubGoals();
            }
        }
        return this.status;
    }

}

/* This goal of thief makes an actor to find items, then sell them to a
 * shopkeeper. */
export class GoalThief extends GoalBase {

    public shopCooldown: number;
    public doorCooldown: number;
    public visitedDoors: {[key: string]: TCoord};
    public shops: {[key: string]: Cell};

    constructor(actor) {
        super(actor);
        this.setType('GoalThief');
        this.subGoals = [];
        this.shopCooldown = 20;
        this.doorCooldown = 25;
        this.visitedDoors = {}; // Stores info about doors seen by thief
        this.shops = {}; // Stores known shop location
    }

    public activate(): void {
        this.status = GOAL_ACTIVE;
        this.chooseThiefTask();
    }

    public process(): GoalStatus {
        this.activateIfInactive();
        --this.shopCooldown;
        --this.doorCooldown;
        if (this.isCompleted()) {
            return GOAL_COMPLETED;
        }
        if (this.hasSubGoals()) {
            this.status = this.processSubGoals();
        }
        else {
            this.chooseThiefTask();
            if (this.hasSubGoals()) {
                this.status = this.processSubGoals();
            }
            else { // If we only sold item, go here
                this.status = GOAL_COMPLETED;
            }
        }
        return this.status;
    }

    public isInActiveShop(): boolean {
        const cell: null | Cell = this.actor.getCell();
        if (cell && cell.hasShop()) {
            const shop: null | ElementShop = cell.getShop();
            if (shop && !shop.isAbandoned()) {
                this.shops[cell.getKeyXY()] = cell;
                return true;
            }
        }
        return false;
    }

    public tryToSellItem(): void {
        const inventory = this.actor.getInvEq().getInventory();
        const itemToSell: ItemBase = RNG.arrayGetRand(inventory.getItems());
        const actorCell: null | Cell = this.actor.getCell();

        if (actorCell && itemToSell) {
            const shopElem = actorCell.getPropType('shop')[0] as ElementShop;
            // const price = shopElem.getItemPriceForSelling(itemToSell);
            const trans = new Component.Transaction();
            trans.setArgs({item: itemToSell, seller: this.actor,
                shop: shopElem, buyer: shopElem.getShopkeeper(),
                count: itemToSell.getCount()});
            this.actor.add(trans);
        }
        else {
            RG.err('Goal.Thief', 'tryToSellItem',
                `Null item for sale. Inv: ${JSON.stringify(inventory)}`);
        }
    }

    public tryToGoToShopCell() {
        let nextGoal = null;
        const knownShopCells = Object.values(this.shops);
        if (knownShopCells.length > 0) {
            const shopCell = RNG.arrayGetRand(knownShopCells);
            return new Goal.FollowPath(this.actor, shopCell.getXY());
        }
        const seenCells = this.actor.getBrain().getSeenCells();
        for (let i = 0; i < seenCells.length; i++) {
            const cell = seenCells[i];
            if (cell.hasShop()) {
                nextGoal = new Goal.FollowPath(this.actor, cell.getXY());
            }
        }
        if (!nextGoal) {
            this.shopCooldown = 20;
        }
        return nextGoal;
    }

    public chooseThiefTask(): void {
        const inventory = this.actor.getInvEq().getInventory();
        const hasItems = !inventory.isEmpty();
        let nextGoal = null;
        const actorCell = this.actor.getCell();
        if (!actorCell) {return;}

        if (hasItems && this.isInActiveShop()) {
            this.tryToSellItem();
            this.status = GOAL_COMPLETED;
        }
        else if (hasItems && this.shopCooldown <= 0) {
            nextGoal = this.tryToGoToShopCell();
        }
        else {
            const seenCells = this.actor.getBrain().getSeenCells();
            const elemsCache = {};
            nextGoal = ifItemFoundCreateGoal(this.actor, seenCells, elemsCache,
                (cell: Cell) => cell.hasElements());

            if (!nextGoal && !actorCell.hasDoor() && this.doorCooldown <= 0) {
                // Else if a door is seen, go inside
                Object.values(elemsCache).forEach((cell: Cell) => {
                    if (cell.hasDoor()) {
                        const xy = cell.getXY();
                        const keyXY = cell.getKeyXY();
                        if (!this.visitedDoors.hasOwnProperty(keyXY)) {
                            this.doorCooldown = 25;
                            nextGoal = new Goal.FollowPath(this.actor, xy);
                            return;
                        }
                    }
                });
            }
            else if (actorCell.hasDoor()) {
                this.visitedDoors[actorCell.getKeyXY()] = actorCell.getXY();
                if (this.thiefSeesHouse()) {
                    nextGoal = new GoalSearchHouse(this.actor);
                }
            }

            if (!nextGoal) {
                // Need to find a house, so skulk around
                // Goal.moveToRandomDir(this.actor);
                nextGoal = new Goal.Explore(this.actor, 30);
                nextGoal.setCallback(this.exploreCallback.bind(this));
            }

        }

        if (nextGoal) {
            this.addSubGoal(nextGoal);
        }
    }

    /* Callback given to Goal.Explore for each x,y explored. */
    public exploreCallback(x: number, y: number): void {
        const map = this.actor.getLevel().getMap();
        if (map.hasXY(x, y)) {
            const cell = map.getCell(x, y);
            if (cell.hasShop()) {
                this.shops[cell.getKeyXY()] = cell;
            }
        }
    }

    public thiefSeesHouse(): boolean {
        const seenCells = this.actor.getBrain().getSeenCells();
        const floorCells = seenCells.filter(c => (
            c.getBaseElem().getType() === 'floorhouse'
        ));
        if (floorCells.length > 0) {return true;}
        return false;
    }

}
Goal.Thief = GoalThief;

function ifItemFoundCreateGoal(actor, seenCells, cache?, cacheAcceptFunc?) {
    let nextGoal = null;
    for (let i = 0; i < seenCells.length; i++) {
        const cell = seenCells[i];
        if (cell.hasItems()) {
            const item = cell.getItems()[0];
            if (!item.has('Unpaid')) {
                nextGoal = new Goal.GetItem(actor, item);
                break;
            }
        }

        // If cache given, try cache cells using cacheAcceptFunc as criteria
        if (cache) {
            if (cacheAcceptFunc(seenCells[i])) {
                cache[cell.getKeyXY()] = cell;
            }
        }
    }
    return nextGoal;
}

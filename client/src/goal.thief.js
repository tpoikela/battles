/* Contains code for thief goal. */

const RG = require('./rg');
const Goal = require('./goals');

const {
    GOAL_ACTIVE,
    GOAL_COMPLETED} = Goal;
const RNG = RG.Random.getRNG();

/* With this Goal, an actor can search a house for interesting features,
 * such as items to pick up. */
class GoalSearchHouse extends Goal.Base {

    constructor(actor) {
        super(actor);
        this.setType('GoalSearchHouse');
        const cell = actor.getCell();
        if (cell.hasDoor()) {
            this.door = cell.getXY();
        }
        this.subGoals = [];
        this.searchTime = RNG.getUniformInt(20, 40);
    }

    activate() {
        this.status = GOAL_ACTIVE;
        const seenCells = this.actor.getBrain().getSeenCells();
        if (!this.floorCells || this.floorCells.length === 0) {
            this.floorCells = seenCells.filter(c => (
                c.getBaseElem().getType() === 'floorhouse'
            ));
        }

        let nextGoal = findItem(this.actor, seenCells);
        if (!nextGoal) {
            const cell = RNG.arrayGetRand(this.floorCells);
            nextGoal = new Goal.FollowPath(this.actor, cell.getXY());
        }

        if (this.searchTime <= 0) {
            const actorCell = this.actor.getCell();
            // Get out of the house
            if (actorCell.hasDoor()) {
                // Get out finally
                const cells = RG.Brain.getCellsAroundActor(this.actor);
                let chosenCell = null;
                cells.forEach(cell => {
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

    process() {
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
    }

}

/* This goal of thief makes an actor to find items, then sell them to a
 * shopkeeper. */
class GoalThief extends Goal.Base {

    constructor(actor) {
        super(actor);
        this.setType('GoalThief');
        this.subGoals = [];
        this.shopCooldown = 20;
        this.doorCooldown = 25;
        this.visitedDoors = {}; // Stores info about doors seen by thief
        this.shops = {}; // Stores known shop location
    }

    activate() {
        this.status = GOAL_ACTIVE;
        this.chooseThiefTask();
    }

    process() {
        this.activateIfInactive();
        --this.shopCooldown;
        --this.doorCooldown;
        if (this.hasSubGoals()) {
            this.status = this.processSubGoals();
        }
        else {
            this.chooseThiefTask();
            this.status = this.processSubGoals();
        }
    }

    isInActiveShop() {
        const cell = this.actor.getCell();
        if (cell.hasShop()) {
            const shop = cell.getShop();
            if (!shop.isAbandoned()) {
                this.shops[cell.getKeyXY()] = cell;
                return true;
            }
        }
        return false;
    }

    tryToSellItem() {
        const inventory = this.actor.getInvEq().getInventory();
        const itemToSell = RNG.arrayGetRand(inventory.getItems());
        const actorCell = this.actor.getCell();
        console.log('Thief trying to sell at', actorCell.getXY());

        const shopElem = actorCell.getPropType('shop')[0];
        // const price = shopElem.getItemPriceForSelling(itemToSell);
        const trans = new RG.Component.Transaction();
        trans.setArgs({item: itemToSell, seller: this._actor,
            shop: shopElem, buyer: shopElem.getShopkeeper(),
            count: itemToSell.count});
        this._actor.add(trans);
    }

    tryToGoToShopCell() {
        let nextGoal = null;
        const knownShopCells = Object.values(this.shops);
        if (knownShopCells.length > 0) {
            const shopCell = RG.arrayGetRand(knownShopCells);
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

    chooseThiefTask() {
        const inventory = this.actor.getInvEq().getInventory();
        const hasItems = !inventory.isEmpty();
        let nextGoal = null;
        const actorCell = this.actor.getCell();

        if (this.isInActiveShop()) {
            this.tryToSellItem();
        }
        else if (hasItems && this.shopCooldown <= 0) {
            console.log('KKK Thief has items. Should find a shop');
            nextGoal = this.tryToGoToShopCell();
        }
        else {
            const seenCells = this.actor.getBrain().getSeenCells();
            const elemsCache = {};
            nextGoal = findItem(this.actor, seenCells, elemsCache,
                cell => cell.hasElements());

            if (!nextGoal && !actorCell.hasDoor() && this.doorCooldown <= 0) {
                // Else if a door is seen, go inside
                Object.values(elemsCache).forEach(cell => {
                    if (cell.hasDoor()) {
                        const xy = cell.getXY();
                        const keyXY = cell.getKeyXY();
                        if (!this.visitedDoors.hasOwnProperty(keyXY)) {
                            this.doorCooldown = 25;
                            console.log('KKK Thief follow path to', xy);
                            nextGoal = new Goal.FollowPath(this.actor, xy);
                            return;
                        }
                    }
                });
            }
            else if (actorCell.hasDoor()) {
                this.visitedDoors[actorCell.getKeyXY()] = actorCell.getXY();
                console.log('KKK Thief searching house now');
                nextGoal = new GoalSearchHouse(this.actor);
            }

            if (!nextGoal) {
                // Need to find a house, so skulk around
                // Goal.moveToRandomDir(this.actor);
                console.log('Thief added new Goal.Explore');
                nextGoal = new Goal.Explore(this.actor, 30);
                nextGoal.setCallback(this.exploreCallback.bind(this));
            }

        }

        if (nextGoal) {
            this.addSubGoal(nextGoal);
        }
    }

    /* Callback given to Goal.Explore for each x,y explored. */
    exploreCallback(x, y) {
        const map = this.actor.getLevel().getMap();
        if (map.hasXY(x, y)) {
            const cell = map.getCell(x, y);
            if (cell.hasShop()) {
                this.shops[cell.getKeyXY()] = cell;
            }
        }
    }

}
Goal.Thief = GoalThief;

function findItem(actor, seenCells, cache, cacheAcceptFunc) {
    let nextGoal = null;
    for (let i = 0; i < seenCells.length; i++) {
        const cell = seenCells[i];
        if (cell.hasItems()) {
            const item = cell.getItems()[0];
            nextGoal = new Goal.GetItem(actor, item);
            console.log('GoalThief found an item', item.getName());
            break;
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

module.exports = GoalThief;

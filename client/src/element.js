/*
 * File containing map elements. These are either terrain or interactive
 * elements like stairs.
 */

const RG = require('./rg.js');
RG.Object = require('./object.js');
const Mixin = require('./mixin');

RG.Element = {};

const wallRegexp = /wall/;

/* Element is a wall or other obstacle or a feature in the map. It's not
 * necessarily blocking movement.  */
class RGElementBase extends Mixin.Typed(Mixin.Base) {
    constructor(elemType) {
        super({propType: RG.TYPE_ELEM, type: elemType});
        RG.elementsCreated += 1; // Used for debugging only
    }

    isPassable() {
        return !wallRegexp.test(this.getType());
    }

    isPassableByAir() {
        return !wallRegexp.test(this.getType());
    }

    isSpellPassable() {
        return !wallRegexp.test(this.getType());
    }

    lightPasses() {
        return !wallRegexp.test(this.getType());
    }

    /* Should be enough for stateless elements.
     * Does not work for doors or stairs etc. */
    toJSON() {
        return {
            type: this.getType()
        };
    }
}

RG.Element.Base = RGElementBase;
RG.elementsCreated = 0;

/* Object models stairs connecting two levels. Stairs are one-way, thus
 * connecting 2 levels requires two stair objects. */
class RGElementStairs extends Mixin.Locatable(RGElementBase) {
    constructor(down, srcLevel, targetLevel) {
        if (down) {super('stairsDown');}
        else {super('stairsUp');}

        this._down = down;
        this._srcLevel = srcLevel;
        this._targetLevel = targetLevel;
        this._targetStairs = null;

        this.getSrcLevel = () => this._srcLevel;

        this.setSrcLevel = src => {
            if (!RG.isNullOrUndef([src])) {
                this._srcLevel = src;
            }
            else {
                RG.err('Element.Stairs', 'setSrcLevel',
                    'Cannot set null/undefined level');
            }
        };

        this.getTargetLevel = () => this._targetLevel;
        this.setTargetLevel = target => {
            if (!RG.isNullOrUndef([target])) {
                this._targetLevel = target;
            }
            else {
                RG.err('Element.Stairs', 'setTargetLevel',
                    'Cannot set null/undefined level.');
            }
        };

        /* Sets target stairs for this object. Also sets the level if target
         * stairs
         * have one specified. */
        this.setTargetStairs = function(stairs) {
            if (!RG.isNullOrUndef([stairs])) {
                this._targetStairs = stairs;
                const targetLevel = stairs.getSrcLevel();
                if (!RG.isNullOrUndef([targetLevel])) {
                    this.setTargetLevel(targetLevel);
                }
            }
            else {
                RG.err('Element.Stairs', 'setTargetStairs',
                    'Cannot set null/undefined stairs.');
            }
        };
        this.getTargetStairs = () => this._targetStairs;

        /* Connects to stairs together. */
        this.connect = function(stairs) {
            this.setTargetStairs(stairs);
            stairs.setTargetStairs(this);
            this.setTargetLevel(stairs.getSrcLevel());
            stairs.setTargetLevel(this.getSrcLevel());
        };

        /* Unique ID can be formed by levelID,x,y. */
        this.getID = function() {
            const x = this.getX();
            const y = this.getY();
            const id = this._srcLevel.getID();
            return `${id},${x},${y}`;
        };

    }

    isDown() {return this._down;}

    /* Target actor uses the stairs.*/
    useStairs(actor) {
        if (!RG.isNullOrUndef([this._targetStairs, this._targetLevel])) {
            const newX = this._targetStairs.getX();
            const newY = this._targetStairs.getY();
            if (this._srcLevel.removeActor(actor)) {
                if (this._targetLevel.addActor(actor, newX, newY)) {
                    RG.POOL.emitEvent(RG.EVT_LEVEL_CHANGED,
                        {target: this._targetLevel,
                        src: this._srcLevel, actor});
                    RG.POOL.emitEvent(RG.EVT_LEVEL_ENTERED,
                        {actor, target: this._targetLevel});
                    return true;
                }
            }
        }
        return false;
    }

    /* Serializes the Stairs object. */
    toJSON() {
        if (this.getTargetStairs()) {
            if (this.getTargetLevel()) {
                return {
                    targetLevel: this.getTargetLevel().getID(),
                    srcLevel: this.getSrcLevel().getID(),
                    targetStairs: {
                        x: this.getTargetStairs().getX(),
                        y: this.getTargetStairs().getY()
                    },
                    isDown: this.isDown(),
                    type: this.getType()
                };
            }
            else {
                RG.err('Element.Stairs', 'toJSON',
                    'Target level missing. Cannot serialize.');
            }
        }
        else {
            RG.err('Element.Stairs', 'toJSON',
                'Target stairs missing. Cannot serialize.');
        }
        return null;
    }
}

RG.Element.Stairs = RGElementStairs;

/* Name says it all, be it open or closed.*/
class RGElementDoor extends Mixin.Locatable(RGElementBase) {
    constructor(closed) {
        super('door');
        this._closed = (typeof closed === 'undefined')
            ? true : closed;
    }

    isOpen() {
        return !this._closed;
    }

    isClosed() {
        return this._closed;
    }

    openDoor() {
        this._closed = false;
    }

    closeDoor() {
        this._closed = true;
    }

    isPassable() {
        return !this._closed;
    }

    toJSON() {
        return {
            type: 'door',
            closed: this._closed
        };
    }
}

RG.Element.Door = RGElementDoor;

/* A shop element is added to each cell inside a shop.*/
class RGElementShop extends Mixin.Locatable(RGElementBase) {
    constructor() {
        super('shop');
        this._shopkeeper = null;
        this._costFactorSell = 1.0;
        this._costFactorBuy = 0.5;
        this._isAbandoned = false;
    }

    isAbandoned() {
        return this._isAbandoned;
    }

    /* Returns the price in gold coins for item in the cell.*/
    getItemPriceForBuying(item) {
        if (item.has('Unpaid')) {
            const value = item.getValue() * this._costFactorSell;
            const goldWeight = RG.valueToGoldWeight(value);
            const ncoins = RG.getGoldInCoins(goldWeight);
            if (ncoins === 0) {
                return 1;
            }
            return ncoins;
        }
        else {
            RG.err('Element.Shop', 'getItemPriceForBuying',
                'Item ' + item.getName() + ' is not Unpaid item');
        }
        return null;
    }

    /* Returns the price for selling the item. */
    getItemPriceForSelling(item) {
        const value = item.getValue() * this._costFactorBuy;
        const goldWeight = RG.valueToGoldWeight(value);
        const ncoins = RG.getGoldInCoins(goldWeight);
        return ncoins;
    }

    hasEnoughGold(actor, goldWeight) {
        const ncoins = RG.getGoldInCoins(goldWeight);
        const items = actor.getInvEq().getInventory().getItems();
        for (let i = 0; i < items.length; i++) {
            if (items[i].getType() === 'goldcoin') {
                if (items[i].count >= ncoins) {
                    items[i].count -= ncoins;
                    return true;
                }
            }
        }
        return false;
    }

    /* Function for buying an item.*/
    buyItem(item, buyer) {
        const buyerCell = buyer.getCell();
        const value = item.getValue() * this._costFactorSell;
        const goldWeight = RG.valueToGoldWeight(value);
        const nCoins = RG.getGoldInCoins(goldWeight);

        if (this.hasEnoughGold(buyer, goldWeight)) {
            const coins = new RG.Item.GoldCoin();
            coins.count = nCoins;
            this._shopkeeper.getInvEq().addItem(coins);
            item.getOwner().removeProp('items', item);
            buyer.getInvEq().addItem(item);
            item.remove('Unpaid');
            RG.gameMsg({cell: buyerCell, msg: buyer.getName() +
                ' bought ' + item.getName() + ' for ' + nCoins + ' coins.'});
            return true;
        }
        else {
            RG.gameMsg({cell: buyerCell, msg: buyer.getName() +
                " doesn't have enough money to buy " + item.getName() + ' for '
                + nCoins + ' coins.'});
        }
        return false;
    }

    /* Function for selling an item.*/
    sellItem(item, seller) {
        if (!seller) {
            RG.err('Element.Shop', 'sellItem',
                'Seller is null or undefined.');
        }

        const sellerCell = seller.getCell();
        const value = item.getValue() * this._costFactorBuy;
        const goldWeight = RG.valueToGoldWeight(value);
        const nCoins = RG.getGoldInCoins(goldWeight);

        if (this.hasEnoughGold(this._shopkeeper, goldWeight)) {
            if (seller.getInvEq().dropItem(item)) {
                const coins = new RG.Item.GoldCoin();
                coins.count = nCoins;
                seller.getInvEq().addItem(coins);
                item.add('Unpaid', new RG.Component.Unpaid());
                RG.gameMsg({cell: sellerCell, msg: seller.getName() +
                    ' sold ' + item.getName() + ' for ' + nCoins + ' coins.'});
                return true;
            }
        }
        else {
            const name = this._shopkeeper.getName();
            RG.gameMsg({cell: this._shopkeeper.getCell(),
                msg: 'Keeper ' + name +
                " doesn't have enough gold to buy it."});
        }

        return false;
    }

    abandonShop(item) {
        this._shopkeeper = null;
        this._isAbandoned = true;
        if (item.has('Unpaid')) {
            item.remove('Unpaid');
        }
    }

    /* Sets the shopkeeper.*/
    setShopkeeper(keeper) {
        if (!RG.isNullOrUndef([keeper])) {
            this._shopkeeper = keeper;
        }
        else {
            RG.err('Element.Shop', 'setShopkeeper',
                'Shopkeeper must be non-null and defined.');
        }
    }

    /* Returns the shopkeeper.*/
    getShopkeeper() {
        return this._shopkeeper;
    }

    /* Sets the cost factors for selling and buying. .*/
    setCostFactor(buy, sell) {
        if (!RG.isNullOrUndef([buy, sell])) {
            this._costFactorSell = sell;
            this._costFactorBuy = buy;
        }
        else {
            RG.err('Element.Shop', 'setCostFactor',
                'Args buy/sell must be non-null and defined!');
        }
    }

    /* Returns the cost factor for selling. .*/
    getCostFactorSell() {
        return this._costFactorSell;
    }

    /* Returns the cost factor for buying. .*/
    getCostFactorBuy() {
        return this._costFactorBuy;
    }

    toJSON() {
        let shopkeeperID = null;
        if (this._shopkeeper) {
            shopkeeperID = this._shopkeeper.getID();
        }
        const obj = {
            type: 'shop',
            isAbandoned: this._isAbandoned,
            costFactorSell: this._costFactorSell,
            costFactorBuy: this._costFactorBuy
        };
        if (shopkeeperID !== null) {
            obj.shopkeeper = shopkeeperID;
        }
        return obj;
    }
}

RG.Element.Shop = RGElementShop;

/* A tree element. */
class RGElementTree extends RGElementBase {
    constructor(type) {
        super(type);
    }
}
RG.Element.Tree = RGElementTree;

/* A grass element. */
class RGElementGrass extends RGElementBase {
    constructor(type) {
        super(type);
    }
}
RG.Element.Grass = RGElementGrass;

/* A stone element. */
class RGElementStone extends RGElementBase {
    constructor(type) {
        super(type);
    }
}
RG.Element.Stone = RGElementStone;
/* High rock which is difficult to pass through. */
class RGElementHighRock extends RGElementBase {
    constructor(type) {
        super(type);
    }

    isPassable() {return false;}

    lightPasses() {return false;}
}
RG.Element.HighRock = RGElementHighRock;

/* A chasm element. */
class RGElementChasm extends RGElementBase {
    constructor(type) {
        super(type);
    }

    isPassable() {return false;}
}
RG.Element.Chasm = RGElementChasm;

/* A water element. */
class RGElementWater extends RGElementBase {
    constructor(type) {
        super(type);
    }

    isPassable() {return false;}
}
RG.Element.Water = RGElementWater;

/* A fort element. */
class RGElementFort extends RGElementBase {
    constructor(type) {
        super(type);
    }
    isPassable() {return false;}
}
RG.Element.Fort = RGElementFort;

RG.ELEM = {};
// Constant elements which can be used by all levels. freeze()
// used to prevent any mutations. Note that elements with any state
// in them should not be shared (unless state is common for all)
RG.ELEM.BRIDGE = Object.freeze(new RGElementBase('bridge'));
RG.ELEM.CHASM = Object.freeze(new RG.Element.Chasm());
RG.ELEM.FLOOR = Object.freeze(new RGElementBase('floor'));
RG.ELEM.FLOOR_CAVE = Object.freeze(new RGElementBase('floorcave'));
RG.ELEM.FLOOR_CRYPT = Object.freeze(new RGElementBase('floorcrypt'));
RG.ELEM.GRASS = Object.freeze(new RG.Element.Grass());
RG.ELEM.HIGH_ROCK = Object.freeze(new RG.Element.HighRock());
RG.ELEM.ROAD = Object.freeze(new RGElementBase('road'));
RG.ELEM.SNOW = Object.freeze(new RGElementBase('snow'));
RG.ELEM.STONE = Object.freeze(new RG.Element.Stone());
RG.ELEM.TREE = Object.freeze(new RG.Element.Tree());
RG.ELEM.WALL = Object.freeze(new RGElementBase('wall'));
RG.ELEM.WALL_CAVE = Object.freeze(new RGElementBase('wallcave'));
RG.ELEM.WALL_CRYPT = Object.freeze(new RGElementBase('wallcrypt'));
RG.ELEM.WALL_ICE = Object.freeze(new RGElementBase('wallice'));
RG.ELEM.WALL_WOODEN = Object.freeze(new RGElementBase('wallwooden'));
RG.ELEM.WATER = Object.freeze(new RG.Element.Water());
RG.ELEM.FORT = Object.freeze(new RG.Element.Fort());

RG.elemTypeToObj = {};
Object.keys(RG.ELEM).forEach(key => {
    RG.elemTypeToObj[RG.ELEM[key].getType()] = RG.ELEM[key];
});

module.exports = RG.Element;

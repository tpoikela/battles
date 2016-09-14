/**
 * File containing map elements. These are either terrain or interactive
 * elements like stairs.
 */

var GS = require("../getsource.js");
var RG  = GS.getSource(["RG"], "./src/rg.js");

RG.Object = GS.getSource(["RG", "Object"], "./src/object.js");

RG.Element = {};

/** Element is a wall or other obstacle or a feature in the map. It's not
 * necessarily blocking movement.  */
RG.Element.Base = function(elemType) { // {{{2
    RG.Object.Locatable.call(this);
    this.setPropType("elements");
    this.setType(elemType);
};
RG.extend2(RG.Element.Base, RG.Object.Locatable);

RG.Element.Base.prototype.isPassable = function() {
    return this.getType() !== "wall";
};

// }}} Element

/** Object models stairs connecting two levels. Stairs are one-way, thus
 * connecting 2 levels requires two stair objects. */
RG.Element.Stairs = function(down, srcLevel, targetLevel) {
    if (down)
        RG.Element.Base.call(this, "stairsDown");
    else
        RG.Element.Base.call(this, "stairsUp");

    var _down = down;
    var _srcLevel = srcLevel;
    var _targetLevel = targetLevel;
    var _targetStairs = null;

    /** Target actor uses the stairs.*/
    this.useStairs = function(actor) {
        if (!RG.isNullOrUndef([_targetStairs, _targetLevel])) {
            var newLevel = _targetLevel;
            var newX = _targetStairs.getX();
            var newY = _targetStairs.getY();
            if (_srcLevel.removeActor(actor)) {
                if (_targetLevel.addActor(actor, newX, newY)) {
                    RG.POOL.emitEvent(RG.EVT_LEVEL_CHANGED,
                        {target: _targetLevel, src: _srcLevel, actor: actor});
                    RG.POOL.emitEvent(RG.EVT_LEVEL_ENTERED, {actor: actor, target:
                        targetLevel});
                    return true;
                }
            }
        }
        return false;
    };

    this.isDown = function() {return _down;};

    this.getSrcLevel = function() {return _srcLevel; };
    this.setSrcLevel = function(src) {_srcLevel = src;};

    this.getTargetLevel = function() {return _targetLevel; };
    this.setTargetLevel = function(target) {_targetLevel = target;};

    this.setTargetStairs = function(stairs) {_targetStairs = stairs;};
    this.getTargetStairs = function() {return _targetStairs;};

};
RG.extend2(RG.Element.Stairs, RG.Element.Base);

/** Name says it all, be it open or closed.*/
RG.Element.Door = function(closed) {
    RG.Element.Base.call(this, "door");
    this._closed = closed || true;

};
RG.extend2(RG.Element.Door, RG.Element.Base);

RG.Element.Door.prototype.isClosed = function() {
    return this._closed;
};

RG.Element.Door.prototype.openDoor = function() {
    this._closed = false;
};

RG.Element.Door.prototype.closeDoor = function() {
    this._closed = true;
};

RG.Element.Door.prototype.isPassable = function() {
    return !this._closed;
};

/** A shop element is added to each cell inside a shop.*/
RG.Element.Shop = function() {
    RG.Element.Base.call(this, "shop");

    this._shopkeeper = null;
    this._costFactor = 1.0;

};
RG.extend2(RG.Element.Shop, RG.Element.Base);

/** Returns the price in gold coins for item in the cell.*/
RG.Element.Shop.prototype.getItemPriceForBuying = function(item) {
    if (item.has("Unpaid")) {
        var value = item.getValue() * this._costFactor;
        var goldWeight = RG.valueToGoldWeight(value);
        var ncoins = RG.getGoldInCoins(goldWeight);
        return ncoins;
    }
    else {
        RG.err("Element.Shop", "getItemPriceForBuying",
            "Item " + item.getName() + " is not Unpaid item");
    }
};

RG.Element.Shop.prototype.hasEnoughGold = function(actor, goldWeight) {
    var ncoins = RG.getGoldInCoins(goldWeight);
    console.log("Needed " + ncoins);
    var items = actor.getInvEq().getInventory().getItems();
    for (var i = 0; i < items.length; i++) {
        if (items[i].getType() === "goldcoin") {
            console.log("Found gold coins: " + items[i].count);
            if (items[i].count >= ncoins) {
                items[i].count -= ncoins;
                return true;
            }
        }
    }
    return false;
};

/** Function for buying an item.*/
RG.Element.Shop.prototype.buyItem = function(item, buyer) {
    var buyerCell = buyer.getCell();
    var value = item.getValue() * this._costFactor;
    var goldWeight = RG.valueToGoldWeight(value);
    var nCoins = RG.getGoldInCoins(goldWeight);
    if (this.hasEnoughGold(buyer, goldWeight)) {
        var coins = new RG.Item.GoldCoin();
        coins.count = nCoins;
        this._shopkeeper.getInvEq().addItem(coins);
        item.getOwner().removeProp("items", item);
        buyer.getInvEq().addItem(item);
        item.remove("Unpaid");
        RG.gameMsg({cell: buyerCell, msg: buyer.getName() + 
            " bought " + item.getName() + " for " + nCoins + " coins."});
        return true;
    }
    else {
        RG.gameMsg({cell: buyerCell, msg: buyer.getName() + 
            " doesn't have enough money to buy " + item.getName() + " for " 
            + nCoins + " coins."});
    }
    return false;
};

/** Function for selling an item.*/
RG.Element.Shop.prototype.sellItem = function(item, seller) {
    var sellerCell = seller.getCell();
    var value = item.getValue() / this._costFactor;
    var goldWeight = RG.valueToGoldWeight(value);
    var nCoins = RG.getGoldInCoins(goldWeight);
    if (this.hasEnoughGold(this._shopkeeper, goldWeight)) {
        if (seller.getInvEq().dropItem(item)) {
            var coins = new RG.Item.GoldCoin();
            coins.count = nCoins;
            seller.getInvEq().addItem(coins);
            item.add("Unpaid", new RG.Component.Unpaid());
            RG.gameMsg({cell: sellerCell, msg: seller.getName + 
                " sold " + item.getName() + " for " + nCoins + " coins."});
            return true;
        }
    }
    else {
        var name = this._shopkeeper.getName();
        RG.gameMsg({cell: this._shopkeeper.getCell(), 
            msg: "Shopkeeper " + name + " doesn't have enough gold to buy it."});
    }
    return false;
};

/** Sets the shopkeeper.*/
RG.Element.Shop.prototype.setShopkeeper = function(keeper) {
    this._shopkeeper = keeper;
};

/** Returns the shopkeeper.*/
RG.Element.Shop.prototype.getShopkeeper = function(keeper) {
    return this._shopkeeper;
};

/** Sets the shopkeeper.*/
RG.Element.Shop.prototype.setCostFactor = function(factor) {
    this._costFactor = factor;
};

/** Returns the shopkeeper.*/
RG.Element.Shop.prototype.getShopkeeper = function(keeper) {
    return this._costFactor;
};



if (typeof module !== "undefined" && typeof exports !== "undefined") {
    GS.exportSource(module, exports, ["RG", "Element"], [RG, RG.Element]);
}
else {
    GS.exportSource(undefined, undefined, ["RG", "Element"], [RG, RG.Element]);
}

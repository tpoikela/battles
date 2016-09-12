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

/** A shop element is added to each cell inside a shop.*/
RG.Element.Shop = function() {
    RG.Element.Base.call(this, "shop");

    this._shopkeeper = null;
    this._costFactor = 1.0;

};
RG.extend2(RG.Element.Shop, RG.Element.Base);

RG.Element.Shop.prototype.hasEnoughGold = function(actor, gold) {
    var items = actor.getInvEq().getInventory().getItems();
    for (var i = 0; i < items.length; i++) {
        if (items[i].getType() === "gold") {
            var weight = items[i].getWeight();
            if (weight >= gold) {
                items[i].setWeight(weight - gold);
                return true;
            }
        }
    }
    return false;
};

/** Function for buying an item.*/
RG.Element.Shop.prototype.buyItem = function(item, buyer) {
    var value = item.getValue() * this._costFactor;
    var goldWeight = RG.valueToGoldWeight(value);
    if (this.hasEnoughGold(buyer, goldWeight)) {
        var gold = new RG.Item.Gold();
        gold.setWeight(goldWeight);
        this._shopkeeper.getInvEq().addItem(gold);
        item.getOwner().removeProp("items", item);
        buyer.getInvEq().addItem(item);
        item.remove("Unpaid");
        return true;
    }
    return false;
};

/** Function for selling an item.*/
RG.Element.Shop.prototype.sellItem = function(item, seller) {
    var value = item.getValue() / this._costFactor;
    var goldWeight = RG.valueToGoldWeight(value);
    if (this.hasEnoughGold(this._shopkeeper, goldWeight)) {
        if (seller.getInvEq().dropItem(item)) {
            var gold = new RG.Item.Gold();
            gold.setWeight(goldWeight);
            seller.getInvEq().addItem(gold);
            item.add("Unpaid", new RG.Component.Unpaid());
            return true;
        }
        else {
            console.log("NO DROP XXX");

        }
    }
    else {
        console.log("NO GOLD XXX");

    }
    return false;
};

RG.Element.Shop.prototype.doTransaction = function(item, buyer, seller, gw) {

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

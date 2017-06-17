/*
 * File containing map elements. These are either terrain or interactive
 * elements like stairs.
 */

var RG = require('./rg.js');

RG.Object = require('./object.js');

RG.Element = {};

/* Element is a wall or other obstacle or a feature in the map. It's not
 * necessarily blocking movement.  */
RG.Element.Base = function(elemType) { // {{{2
    RG.Object.Locatable.call(this);
    this.setPropType('elements');
    this.setType(elemType);
};
RG.extend2(RG.Element.Base, RG.Object.Locatable);

RG.Element.Base.prototype.isPassable = function() {
    return this.getType() !== 'wall';
};

// }}} Element

/* Object models stairs connecting two levels. Stairs are one-way, thus
 * connecting 2 levels requires two stair objects. */
RG.Element.Stairs = function(down, srcLevel, targetLevel) {
    if (down) {RG.Element.Base.call(this, 'stairsDown');}
    else {RG.Element.Base.call(this, 'stairsUp');}

    const _down = down;
    let _srcLevel = srcLevel;
    let _targetLevel = targetLevel;
    let _targetStairs = null;

    /* Target actor uses the stairs.*/
    this.useStairs = function(actor) {
        if (!RG.isNullOrUndef([_targetStairs, _targetLevel])) {
            const newX = _targetStairs.getX();
            const newY = _targetStairs.getY();
            if (_srcLevel.removeActor(actor)) {
                if (_targetLevel.addActor(actor, newX, newY)) {
                    RG.POOL.emitEvent(RG.EVT_LEVEL_CHANGED,
                        {target: _targetLevel, src: _srcLevel, actor: actor});
                    RG.POOL.emitEvent(RG.EVT_LEVEL_ENTERED,
                        {actor: actor, target: targetLevel});
                    return true;
                }
            }
        }
        return false;
    };

    this.isDown = function() {return _down;};

    this.getSrcLevel = function() {return _srcLevel; };

    this.setSrcLevel = function(src) {
        if (!RG.isNullOrUndef([src])) {
            _srcLevel = src;
        }
        else {
            RG.err('Element.Stairs', 'setSrcLevel',
                'Cannot set null/undefined level');
        }
    };

    this.getTargetLevel = function() {return _targetLevel; };
    this.setTargetLevel = function(target) {
        if (!RG.isNullOrUndef([target])) {
            _targetLevel = target;
        }
        else {
            RG.err('Element.Stairs', 'setTargetLevel',
                'Cannot set null/undefined level.');
        }
    };

    /* Sets target stairs for this object. Also sets the level if target stairs
     * have one specified. */
    this.setTargetStairs = function(stairs) {
        if (!RG.isNullOrUndef([stairs])) {
            _targetStairs = stairs;
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
    this.getTargetStairs = function() {
        return _targetStairs;
    };

    /* Connects to stairs together. */
    this.connect = function(stairs) {
        this.setTargetStairs(stairs);
        stairs.setTargetStairs(this);
    };

};
RG.extend2(RG.Element.Stairs, RG.Element.Base);

/* Serializes the Stairs object. */
RG.Element.Stairs.prototype.toJSON = function() {
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
};

/* Name says it all, be it open or closed.*/
RG.Element.Door = function(closed) {
    RG.Element.Base.call(this, 'door');
    this._closed = closed || true;

};
RG.extend2(RG.Element.Door, RG.Element.Base);

RG.Element.Door.prototype.isOpen = function() {
    return !this._closed;
};

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

/* A shop element is added to each cell inside a shop.*/
RG.Element.Shop = function() {
    RG.Element.Base.call(this, 'shop');

    this._shopkeeper = null;
    this._costFactor = 1.0;

};
RG.extend2(RG.Element.Shop, RG.Element.Base);

/* Returns the price in gold coins for item in the cell.*/
RG.Element.Shop.prototype.getItemPriceForBuying = function(item) {
    if (item.has('Unpaid')) {
        const value = item.getValue() * this._costFactor;
        const goldWeight = RG.valueToGoldWeight(value);
        const ncoins = RG.getGoldInCoins(goldWeight);
        return ncoins;
    }
    else {
        RG.err('Element.Shop', 'getItemPriceForBuying',
            'Item ' + item.getName() + ' is not Unpaid item');
    }
    return null;
};

RG.Element.Shop.prototype.hasEnoughGold = function(actor, goldWeight) {
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
};

/* Function for buying an item.*/
RG.Element.Shop.prototype.buyItem = function(item, buyer) {
    const buyerCell = buyer.getCell();
    const value = item.getValue() * this._costFactor;
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
};

/* Function for selling an item.*/
RG.Element.Shop.prototype.sellItem = function(item, seller) {
    const sellerCell = seller.getCell();
    const value = item.getValue() / this._costFactor;
    const goldWeight = RG.valueToGoldWeight(value);
    const nCoins = RG.getGoldInCoins(goldWeight);

    if (this.hasEnoughGold(this._shopkeeper, goldWeight)) {
        if (seller.getInvEq().dropItem(item)) {
            const coins = new RG.Item.GoldCoin();
            coins.count = nCoins;
            seller.getInvEq().addItem(coins);
            item.add('Unpaid', new RG.Component.Unpaid());
            RG.gameMsg({cell: sellerCell, msg: seller.getName +
                ' sold ' + item.getName() + ' for ' + nCoins + ' coins.'});
            return true;
        }
    }
    else {
        const name = this._shopkeeper.getName();
        RG.gameMsg({cell: this._shopkeeper.getCell(),
            msg: 'Keeper ' + name + " doesn't have enough gold to buy it."});
    }

    return false;
};

/* Sets the shopkeeper.*/
RG.Element.Shop.prototype.setShopkeeper = function(keeper) {
    this._shopkeeper = keeper;
};

/* Returns the shopkeeper.*/
RG.Element.Shop.prototype.getShopkeeper = function() {
    return this._shopkeeper;
};

/* Sets the shopkeeper.*/
RG.Element.Shop.prototype.setCostFactor = function(factor) {
    this._costFactor = factor;
};

/* Returns the shopkeeper.*/
RG.Element.Shop.prototype.getShopkeeper = function() {
    return this._costFactor;
};

/* A tree element. */
RG.Element.Tree = function() {
    RG.Element.Base.call(this, 'tree');
};
RG.extend2(RG.Element.Tree, RG.Element.Base);

/* A grass element. */
RG.Element.Grass = function() {
    RG.Element.Base.call(this, 'grass');
};
RG.extend2(RG.Element.Grass, RG.Element.Base);

/* A stone element. */
RG.Element.Stone = function() {
    RG.Element.Base.call(this, 'stone');
};
RG.extend2(RG.Element.Stone, RG.Element.Base);

module.exports = RG.Element;

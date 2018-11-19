/*
 * File containing map elements. These are either terrain or interactive
 * elements like stairs.
 */

import RG from './rg';
import {Entity} from './entity';
import * as Mixin from './mixin';
import * as Component from './component';
import {compsToJSON} from './component.base';

export interface ElementJSON {
    id: number;
    name: string;
    type: string;
    components: {[key: string]: any};
}

export const Element: any = {};

const wallRegexp = /wall/;
const obstacleRegexp = /(?:highrock|water|chasm|wall)/;

Element.canJumpOver = type => {
    return !(wallRegexp.test(type) || (/highrock/).test(type));
};

interface NameArgs {
    name: string;
    type: string;
}

/* Element is a wall or other obstacle or a feature in the map. It's not
 * necessarily blocking movement.  */
export class ElementBase extends Mixin.Typed(Entity) {

    constructor(elemName: string | NameArgs, elemType?: string) {
        let name = null;
        let type = null;
        // To support args passing via Mixin
        if (typeof elemName === 'object') {
            name = elemName.name;
            type = elemName.type;
        }
        else { // To allow name/type without object
            name = elemName;
            type = elemType;
        }
        type = type || name;
        super({propType: RG.TYPE_ELEM, type});
        RG.elementsCreated += 1; // Used for debugging only
        this._name = name;
    }

    getName() {return this._name;}
    setName(name) {this._name = name;}

    isWall() {
        return wallRegexp.test(this.getType());
    }

    isObstacle() {
        return obstacleRegexp.test(this.getType());
    }

    isPassable() {
        return !this.has('Impassable');
    }

    isPassableByAir() {
        if (this.has('Impassable')) {
            return this.get('Impassable').canFlyOver;
        }
        return true;
    }

    isSpellPassable() {
        if (this.has('Impassable')) {
            return this.get('Impassable').spellPasses;
        }
        return true;
    }

    lightPasses() {
        return !this.has('Opaque');
    }

    /* Should be enough for stateless elements.
     * Does not work for doors or stairs etc. */
    toJSON(): ElementJSON {
        const components = compsToJSON(this);
        const obj = {
            id: this.getID(),
            name: this.getName(),
            type: this.getType(),
            components
        };
        if (components) {
            obj.components = components;
        }
        return obj;
    }
}
Element.Base = ElementBase;
RG.elementsCreated = 0;

export class ElementWall extends ElementBase {

    constructor(name) {
        super(name);
        this.add(new Component.Opaque());
        const impassable = new Component.Impassable();
        impassable.setAllImpassable();
        this.add(impassable);
    }

}
Element.Wall = ElementWall;

/* Object models stairs connecting two levels. Stairs are one-way, thus
 * connecting 2 levels requires two stair objects. */
export class ElementStairs extends Mixin.Locatable(ElementBase) {

    constructor(name, srcLevel?, targetLevel?) {
        super({name, type: 'connection'});
        this._srcLevel = srcLevel;
        this._targetLevel = targetLevel;
        this._targetStairs = null;
    }

    /* Returns true if the stairs are connected. */
    isConnected() {
        return !RG.isNullOrUndef([
            this._srcLevel, this._targetLevel, this._targetLevel
        ]);
    }

    /* Sets the source level for the stairs. */
    setSrcLevel(src) {
        if (!RG.isNullOrUndef([src])) {
            this._srcLevel = src;
        }
        else {
            RG.err('Element.Stairs', 'setSrcLevel',
                'Cannot set null/undefined level');
        }
    }

    getSrcLevel() {return this._srcLevel;}

    /* Sets the target level for the stairs. */
    setTargetLevel(target) {
        if (!RG.isNullOrUndef([target])) {
            this._targetLevel = target;
        }
        else {
            RG.err('Element.Stairs', 'setTargetLevel',
                'Cannot set null/undefined level.');
        }
    }

    getTargetLevel() {return this._targetLevel;}

    /* Sets target stairs for this object. Also sets the level if target
     * stairs
     * have one specified. */
    setTargetStairs(stairs) {
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
    }

    getTargetStairs() {return this._targetStairs;}


    /* Returns unique ID for the stairs.
     * Unique ID can be formed by levelID,x,y. */
    getID() {
        const x = this.getX();
        const y = this.getY();
        const id = this._srcLevel.getID();
        return `${id},${x},${y}`;
    }

    /* Connects to stairs together. Creates multiple connections if given array
     * of stairs. */
    connect(stairs, index = 0) {
        if (Array.isArray(stairs)) {
            stairs.forEach(ss => {
                ss.setTargetStairs(this);
                ss.setTargetLevel(this.getSrcLevel());
            });
            this.setTargetStairs(stairs[index]);
            this.setTargetLevel(stairs[index].getSrcLevel());
        }
        else {
            this.setTargetStairs(stairs);
            stairs.setTargetStairs(this);
            this.setTargetLevel(stairs.getSrcLevel());
            stairs.setTargetLevel(this.getSrcLevel());
        }
    }

    isDown() {return (/stairsDown/).test(this.getName());}

    /* Target actor uses the stairs to move to their target.*/
    useStairs(actor) {
        if (!RG.isNullOrUndef([this._targetStairs, this._targetLevel])) {
            const newX = this._targetStairs.getX();
            const newY = this._targetStairs.getY();
            if (this._srcLevel.removeActor(actor)) {
                if (this._targetLevel.addActor(actor, newX, newY)) {
                    return true;
                }
            }
        }
        return false;
    }

    /* Sets target level/stairs using a connection object. This is useful when
     * target is known but does not exist (due to target level not being
     * loaded).*/
    setConnObj(connObj) {
        this._targetStairs = connObj.targetStairs;
        this._targetLevel = connObj.targetLevel;
    }

    getConnObj() {
        return {
            targetStairs: {
                x: this.getTargetStairs().getX(),
                y: this.getTargetStairs().getY()
            },
            targetLevel: this.getTargetLevel().getID()
        };
    }

    /* Serializes the Stairs object. */
    toJSON() {
        const json: any = {
            name: this.getName(),
            type: this.getType()
        };
        if (this._srcLevel) {
            json.srcLevel = this.getSrcLevel().getID();
        }

        if (Number.isInteger(this._targetLevel)) {
            json.targetLevel = this._targetLevel;
        }
        else if (this._targetLevel) {
            json.targetLevel = this.getTargetLevel().getID();
        }

        if (this._targetStairs) {
            if (this._targetStairs.getX) {
                json.targetStairs = {
                    x: this.getTargetStairs().getX(),
                    y: this.getTargetStairs().getY()
                };
            }
            else {
                json.targetStairs = this._targetStairs;
            }
        }
        return json;
    }

}

Element.Stairs = ElementStairs;

/* Name says it all, be it open or closed.*/
export class ElementDoor extends Mixin.Locatable(ElementBase) {
    constructor(closed) {
        super('door');
        this._closed = (typeof closed === 'undefined')
            ? true : closed;

        this._opaque = new Component.Opaque();
        const impassable = new Component.Impassable();
        impassable.setAllImpassable();
        this._impassable = impassable;
        if (this._closed) {this.closeDoor();}
    }

    /* Checks if door can be manually opened. */
    canToggle() {return true;}

    isOpen() {
        return !this._closed;
    }

    isClosed() {
        return this._closed;
    }

    openDoor() {
        this._closed = false;
        this.remove('Opaque');
        this.remove('Impassable');
    }

    closeDoor() {
        this._closed = true;
        this.add(this._opaque);
        this.add(this._impassable);
    }

    toJSON() {
        return {
            id: this.getID(),
            type: 'door',
            closed: this._closed
        };
    }
}
Element.Door = ElementDoor;

/* A door which can be opened using a lever only. */
export class ElementLeverDoor extends ElementDoor {

    constructor(isClosed = true) {
        super(isClosed);
        this.setType('leverdoor');
    }

    canToggle() {return false;}

    onUse() {
        if (this.isOpen()) {this.closeDoor();}
        else {this.openDoor();}
    }

    toJSON() {
        const json = super.toJSON();
        json.type = 'leverdoor';
        return json;
    }
}
Element.LeverDoor = ElementLeverDoor;

/* Lever element can be used to trigger any target entities having onUse(actor)
 * function. Targets should be added using addTarget().
 */
export class ElementLever extends Mixin.Locatable(ElementBase) {

    constructor() {
        super('lever');
        this._targets = [];
    }

    getTargets() {
        return this._targets;
    }

    addTarget(target) {
        this._targets.push(target);
    }

    onUse(actor) {
        this._targets.forEach(target => {
            if (target.onUse) {
                target.onUse(actor);
            }
        });
    }

    toJSON() {
        return {
            id: this.getID(),
            type: 'lever',
            addTarget: this._targets.map(t => RG.getObjRef('entity', t))
        };
    }
}
Element.Lever = ElementLever;

/* A shop element is added to each cell inside a shop.*/
export class ElementShop extends Mixin.Locatable(ElementBase) {
    constructor() {
        super('shop');
        this._shopkeeper = null;
        this._costFactorShopSells = 1.0;
        this._costFactorShopBuys = 0.5;
        this._isAbandoned = true;
    }

    isAbandoned() {
        return this._isAbandoned;
    }

    reclaim(actor) {
        this._shopkeeper = actor;
        this._isAbandoned = false;
    }

    /* Returns the price in gold coins for item in the cell.*/
    getItemPriceForBuying(item) {
        if (item.has('Unpaid')) {
            const value = item.getValue();
            const goldWeight = RG.valueToGoldWeight(value);
            let ncoins = RG.getGoldInCoins(goldWeight);
            ncoins *= item.getCount();
            ncoins = Math.ceil(this._costFactorShopSells * ncoins);
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
        const value = item.getValue();
        const goldWeight = RG.valueToGoldWeight(value);
        let ncoins = RG.getGoldInCoins(goldWeight);
        ncoins *= item.getCount();
        ncoins = Math.floor(this._costFactorShopBuys * ncoins);
        return ncoins;
    }

    abandonShop() {
        this._shopkeeper = null;
        this._isAbandoned = true;
    }

    /* Sets the shopkeeper.*/
    setShopkeeper(keeper) {
        if (!RG.isNullOrUndef([keeper])) {
            this._shopkeeper = keeper;
            this._isAbandoned = false;
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
            this._costFactorShopSells = sell;
            this._costFactorShopBuys = buy;
        }
        else {
            RG.err('Element.Shop', 'setCostFactor',
                'Args buy/sell must be non-null and defined!');
        }
    }

    /* Returns the cost factor for selling. .*/
    getCostFactorSell() {
        return this._costFactorShopSells;
    }

    /* Returns the cost factor for buying. .*/
    getCostFactorBuy() {
        return this._costFactorShopBuys;
    }

    toJSON() {
        let shopkeeperID = null;
        if (this._shopkeeper) {
            shopkeeperID = this._shopkeeper.getID();
        }
        const obj: any = {
            type: 'shop',
            isAbandoned: this._isAbandoned,
            costFactorSell: this._costFactorShopSells,
            costFactorBuy: this._costFactorShopBuys
        };
        if (shopkeeperID !== null) {
            obj.shopkeeper = shopkeeperID;
        }
        return obj;
    }
}

Element.Shop = ElementShop;

/* An experience element which is found in the dungeons. */
export class ElementExploration extends Mixin.Locatable(ElementBase) {
    constructor() {
        super('exploration');
        this.exp = 0;
        this.msg = '';
    }

    setData(data) {
        this.data = data;
    }

    addData(key, val) {
        this.data[key] = val;
    }

    getData() {return this.data;}

    hasData() {
        if (this.data) {return true;}
        return false;
    }

    setExp(exp) {
        if (Number.isInteger(exp)) {
            this.exp = exp;
        }
        else {
            RG.err('ElementExploration', 'setExp',
                `exp is not an integer: ${exp}`);
        }
    }

    getExp() {
        return this.exp;
    }

    setMsg(msg) {
        this.msg = msg;
    }

    getMsg() {
        return this.msg;
    }

    toJSON() {
        const json: any = {
            type: this.getType(),
            setMsg: this.getMsg(),
            setExp: this.getExp()
        };
        if (this.hasData()) {
            json.data = this.data;
        }
        return json;
    }

}
Element.Exploration = ElementExploration;

/* Used in proc gen to denote places for actors, items and other elements. For
* example, different places for stairs can be set, and then one chosen. */
export class ElementPlaceholder extends Mixin.Locatable(ElementBase) {
    constructor() {
        super('placeholder');
    }
}
Element.PlaceHolder = ElementPlaceholder;

/* Used in the debugging of levels only. Can be used to add arbitrary characters
 * into level maps when debugging. */
export class ElementMarker extends Mixin.Locatable(ElementBase) {
    constructor(char) {
        super('marker');
        this.char = char;
        this.tag = '';
        this.className = false; // Uses default cell-element-marker
    }

    getClassName() {return this.className;}
    setClassName(name) {this.className = name;}

    getChar() {return this.char;}
    setChar(char) {this.char = char;}

    setTag(tag) {this.tag = tag;}
    getTag() {return this.tag;}

    toJSON() {
        const json = super.toJSON();
        json.char = this.char;
        json.tag = this.tag;
        return json;
    }
}
Element.Marker = ElementMarker;


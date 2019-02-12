/*
 * File containing map elements. These are either terrain or interactive
 * elements like stairs.
 */

import RG from './rg';
import {Entity} from './entity';
import * as Mixin from './mixin';
import * as Component from './component/component';
import {compsToJSON} from './component/component.base';

type Cell = import('./map.cell').Cell;
type Level = import('./level').Level;

export interface ElementJSON {
    id: number;
    name: string;
    type: string;
    components: {[key: string]: any};
}

export const Element: any = {};

const wallRegexp = /wall/;
const obstacleRegexp = /(?:highrock|water|chasm|wall)/;

interface StringMap {
    [key: string]: string;
}

Element.canJumpOver = type => {
    return !(wallRegexp.test(type) || (/highrock/).test(type));
};

interface NameArgs {
    name: string;
    type: string;
}

interface StairsXY {
    x: number;
    y: number;
}

export interface ConnectionObj {
    targetStairs: StairsXY;
    targetLevel: number;
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
        this.msg = {};
    }

    public getName(): string {return this._name;}
    public setName(name: string) {this._name = name;}

    public isWall(): boolean {
        return wallRegexp.test(this.getType());
    }

    public isObstacle(): boolean {
        return obstacleRegexp.test(this.getType());
    }

    public isPassable(): boolean {
        return !this.has('Impassable');
    }

    public isPassableByAir(): boolean {
        if (this.has('Impassable')) {
            return this.get('Impassable').canFlyOver;
        }
        return true;
    }

    public isSpellPassable(): boolean {
        if (this.has('Impassable')) {
            return this.get('Impassable').spellPasses;
        }
        return true;
    }

    public lightPasses(): boolean {
        return !this.has('Opaque');
    }

    public setMsg(msg: StringMap): void {
        this.msg = msg;
    }

    public getMsg(msgType: string): string {
        return this.msg[msgType];
    }

    public hasMsg(msgType: string): boolean {
        return this.msg.hasOwnProperty(msgType);
    }

    /* Called when System adds this element to a cell. */
    public onSystemAdd(cell: Cell): void {
    }

    /* Called when System removes this element from a cell. */
    public onSystemRemove(cell: Cell): void {
    }

    /* Should be enough for stateless elements.
     * Does not work for doors or stairs etc. */
    public toJSON(): ElementJSON {
        const components = compsToJSON(this);
        const obj: any = {
            id: this.getID(),
            name: this.getName(),
            type: this.getType(),
            msg: this.msg
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

    protected _targetStairs: ElementStairs | StairsXY;

    constructor(name, srcLevel?, targetLevel?) {
        super({name, type: 'connection'});
        this._srcLevel = srcLevel;
        this._targetLevel = targetLevel;
        this._targetStairs = null;
    }

    /* Returns true if the stairs are connected. */
    public isConnected(): boolean {
        return !RG.isNullOrUndef([
            this._srcLevel, this._targetLevel, this._targetLevel
        ]);
    }

    /* Sets the source level for the stairs. */
    public setSrcLevel(src): void {
        if (!RG.isNullOrUndef([src])) {
            this._srcLevel = src;
        }
        else {
            RG.err('Element.Stairs', 'setSrcLevel',
                'Cannot set null/undefined level');
        }
    }

    public getSrcLevel() {return this._srcLevel;}

    /* Sets the target level for the stairs. */
    public setTargetLevel(target): void {
        if (!RG.isNullOrUndef([target])) {
            this._targetLevel = target;
        }
        else {
            RG.err('Element.Stairs', 'setTargetLevel',
                'Cannot set null/undefined level.');
        }
    }

    public getTargetLevel(): Level | number {
        return this._targetLevel;
    }

    /* Sets target stairs for this object. Also sets the level if target
     * stairs
     * have one specified. */
    public setTargetStairs(stairs: ElementStairs): void {
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

    public getTargetStairs(): ElementStairs | StairsXY {
        return this._targetStairs;
    }


    /* Returns unique ID for the stairs.
     * Unique ID can be formed by levelID,x,y. */
    public getID(): string {
        const x = this.getX();
        const y = this.getY();
        const id = this._srcLevel.getID();
        return `${id},${x},${y}`;
    }

    /* Connects to stairs together. Creates multiple connections if given array
     * of stairs. */
    public connect(stairs: ElementStairs | ElementStairs[], index = 0) {
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

    public isDown(): boolean {return (/stairsDown/).test(this.getName());}

    /* Target actor uses the stairs to move to their target.*/
    public useStairs(actor): boolean {
        if (!RG.isNullOrUndef([this._targetStairs, this._targetLevel])) {
            if (this._targetStairs instanceof ElementStairs) {
                const newX = this._targetStairs.getX();
                const newY = this._targetStairs.getY();
                if (this._srcLevel.removeActor(actor)) {
                    if (this._targetLevel.addActor(actor, newX, newY)) {
                        return true;
                    }
                }
            }
            else {
                RG.err('ElementStairs', 'useStairs',
                   'Tried to use stairs without proper targetStairs');
            }
        }
        return false;
    }

    /* Sets target level/stairs using a connection object. This is useful when
     * target is known but does not exist (due to target level not being
     * loaded).*/
    public setConnObj(connObj: ConnectionObj): void {
        this._targetStairs = connObj.targetStairs;
        this._targetLevel = connObj.targetLevel;
    }

    /* Convert this Stairs into connection object. */
    public getConnObj(): ConnectionObj {
        const targetStairs = this.getTargetStairs();
        if (targetStairs instanceof ElementStairs) {
            const targetLevel = this.getTargetLevel() as Level;
            return {
                targetStairs: {
                    x: targetStairs.getX(),
                    y: targetStairs.getY()
                },
                targetLevel: targetLevel.getID()
            };
        }
        else {
            return {
                targetStairs: {
                    x: targetStairs.x, y: targetStairs.y
                },
                targetLevel: this.getTargetLevel() as number
            };
        }
    }

    /* Serializes the Stairs object. */
    public toJSON(): any {
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
            json.targetLevel = (this.getTargetLevel() as Level).getID();
        }

        const targetStairs = this.getTargetStairs();
        if (targetStairs) {
            if (targetStairs instanceof ElementStairs) {
                json.targetStairs = {
                    x: targetStairs.getX(),
                    y: targetStairs.getY()
                };
            }
            else {
                json.targetStairs = targetStairs;
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
    public canToggle(): boolean {return true;}

    public isOpen(): boolean {
        return !this._closed;
    }

    public isClosed() {
        return this._closed;
    }

    public openDoor() {
        this._closed = false;
        this.remove('Opaque');
        this.remove('Impassable');
    }

    public closeDoor() {
        this._closed = true;
        this.add(this._opaque);
        this.add(this._impassable);
    }

    public toJSON() {
        const json: any = super.toJSON();
        json.closed = this._closed;
        return json;
        /* return {
            id: this.getID(),
            type: 'door',
            closed: this._closed
        };*/
    }
}
Element.Door = ElementDoor;

/* A door which can be opened using a lever only. */
export class ElementLeverDoor extends ElementDoor {

    constructor(isClosed = true) {
        super(isClosed);
        this.setType('leverdoor');
    }

    public canToggle() {return false;}

    public onUse() {
        if (this.isOpen()) {this.closeDoor();}
        else {this.openDoor();}
    }

    public toJSON() {
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

    public getTargets() {
        return this._targets;
    }

    public addTarget(target) {
        this._targets.push(target);
    }

    public onUse(actor) {
        this._targets.forEach(target => {
            if (target.onUse) {
                target.onUse(actor);
            }
        });
    }

    public toJSON() {
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

    public isAbandoned(): boolean {
        return this._isAbandoned;
    }

    public reclaim(actor): void {
        this._shopkeeper = actor;
        this._isAbandoned = false;
    }

    /* Returns the price in gold coins for item in the cell.*/
    public getItemPriceForBuying(item): number {
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
        return 0;
    }

    /* Returns the price for selling the item. */
    public getItemPriceForSelling(item): number {
        const value = item.getValue();
        const goldWeight = RG.valueToGoldWeight(value);
        let ncoins = RG.getGoldInCoins(goldWeight);
        ncoins *= item.getCount();
        ncoins = Math.floor(this._costFactorShopBuys * ncoins);
        return ncoins;
    }

    public abandonShop(): void {
        this._shopkeeper = null;
        this._isAbandoned = true;
    }

    /* Sets the shopkeeper.*/
    public setShopkeeper(keeper): void {
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
    public getShopkeeper(): void {
        return this._shopkeeper;
    }

    /* Sets the cost factors for selling and buying. .*/
    public setCostFactor(buy: number, sell: number): void {
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
    public getCostFactorSell(): number {
        return this._costFactorShopSells;
    }

    /* Returns the cost factor for buying. .*/
    public getCostFactorBuy(): number {
        return this._costFactorShopBuys;
    }

    public toJSON() {
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
    }

    public setData(data): void {
        this.data = data;
    }

    public addData(key, val): void {
        this.data[key] = val;
    }

    public getData() {return this.data;}

    public hasData(): boolean {
        if (this.data) {return true;}
        return false;
    }

    public setExp(exp): void {
        if (Number.isInteger(exp)) {
            this.exp = exp;
        }
        else {
            RG.err('ElementExploration', 'setExp',
                `exp is not an integer: ${exp}`);
        }
    }

    public getExp(): number {
        return this.exp;
    }


    public toJSON() {
        const json: any = {
            type: this.getType(),
            setExp: this.getExp()
        };
        if (this.hasData()) {
            json.data = this.data;
        }
        return json;
    }

}
Element.Exploration = ElementExploration;

/* Base element for traps. */
export class ElementTrap extends Mixin.Locatable(ElementBase) {

    constructor(type: string) {
        super(type);
    }

    public onSystemAdd(cell: Cell): void {
        const actors = cell.getSentientActors();
        actors.forEach(actor => {
            actor.add(new Component.Entrapped());
        });
    }

    public onSystemRemove(cell: Cell): void {
        const actors = cell.getSentientActors();
        actors.forEach(actor => {
            actor.remove('Entrapped');
        });
    }
}

export class ElementWeb extends ElementTrap {

    constructor() {
        super('web');
        const entrapComp = new Component.Entrapping();
        entrapComp.setDestroyOnMove(true);
        entrapComp.setDifficulty(20);
        this.add(entrapComp);
    }

    public setDifficulty(diff: number): void {
        this.get('Entrapping').setDifficulty(diff);
    }

}
Element.Web = ElementWeb;

export class ElementSlime extends ElementTrap {

    constructor() {
        super('slime');
        const entrapComp = new Component.Entrapping();
        entrapComp.setDestroyOnMove(true);
        entrapComp.setDifficulty(30);
        this.add(entrapComp);
    }

    public setDifficulty(diff: number): void {
        this.get('Entrapping').setDifficulty(diff);
    }

}
Element.Slime = ElementSlime;

export class ElementHole extends ElementTrap {

    constructor() {
        super('hole');
        const entrapComp = new Component.Entrapping();
        entrapComp.setDestroyOnMove(false);
        entrapComp.setDifficulty(50);
        this.add(entrapComp);
    }

    public setDifficulty(diff: number): void {
        this.get('Entrapping').setDifficulty(diff);
    }

}
Element.Hole = ElementHole;

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

    public getClassName() {return this.className;}
    public setClassName(name) {this.className = name;}

    public getChar() {return this.char;}
    public setChar(char) {this.char = char;}

    public setTag(tag) {this.tag = tag;}
    public getTag() {return this.tag;}

    public toJSON() {
        const json = super.toJSON();
        json.char = this.char;
        json.tag = this.tag;
        return json;
    }
}
Element.Marker = ElementMarker;


export const create = function(type: string, ...args): ElementBase {
    const nameCap = type.capitalize();
    if (Element.hasOwnProperty(type)) {
        return new Element[type](...args);
    }
    return null;
};

Element.create = create;

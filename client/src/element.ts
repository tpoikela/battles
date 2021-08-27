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
type SentientActor = import('./actor').SentientActor;
type BaseActor = import('./actor').BaseActor;
type ItemBase = import('./item').ItemBase;

export interface ElementJSON {
    id: number;
    name: string;
    type: string;
    components: {[key: string]: any};
}

export const Element: any = {};

const wallRegexp = /wall/;
const obstacleRegexp = /(?:highrock|chasm|wall)/;

interface StringMap {
    [key: string]: string;
}

Element.canJumpOver = (type: string): boolean => {
    return !(wallRegexp.test(type) || (/highrock/).test(type));
};

interface NameArgs {
    name: string;
    type: string;
}

export interface StairsXY {
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

    public msg: StringMap;
    protected _name: string;
    public z: number;

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
        this._name = name;
        this.msg = {};
        this.z = 0;
    }

    public getName(): string {return this._name;}
    public setName(name: string) {this._name = name;}

    public getZ(): number {return this.z;}
    public setZ(z: number) {this.z = z;}

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

export class ElementWall extends ElementBase {

    constructor(name: string) {
        super(name);
        this.add(new Component.Opaque());
        const impassable = new Component.Impassable();
        impassable.setAllImpassable();
        this.add(impassable);
    }

}
Element.Wall = ElementWall;

type Maybe<T> = T | undefined | null;

type TargetLevel = Level | number;

export class ElementXY extends Mixin.Locatable(ElementBase) {

    constructor(elemName: string | NameArgs, elemType?: string) {
        super(elemName, elemType);
    }
}

/* Object models stairs connecting two levels. Stairs are one-way, thus
 * connecting 2 levels requires two stair objects. */
export class ElementStairs extends ElementXY {

    protected _targetStairs: null | ElementStairs | StairsXY;
    protected _srcLevel: Maybe<Level>;
    protected _targetLevel: Maybe<TargetLevel>;
    public isOneway: boolean;

    constructor(
        name: string, srcLevel?: Maybe<Level>, targetLevel?: Maybe<TargetLevel>
    ) {
        super({name, type: 'connection'});
        this._srcLevel = srcLevel;
        this._targetLevel = targetLevel;
        this._targetStairs = null;
        this.isOneway = false;
    }

    /* Returns true if the stairs are connected. */
    public isConnected(): boolean {
        return !RG.isNullOrUndef([
            this._srcLevel, this._targetLevel, this._targetLevel
        ]);
    }

    /* Sets the source level for the stairs. */
    public setSrcLevel(src: Level): void {
        if (!RG.isNullOrUndef([src])) {
            this._srcLevel = src;
        }
        else {
            RG.err('Element.Stairs', 'setSrcLevel',
                'Cannot set null/undefined level');
        }
    }

    public setTargetOnewayXY(x: number, y: number): void {
        if (!this._targetStairs) {
            this._targetStairs = {x, y};
            this.isOneway = true;
        }
        else {
            const json =  JSON.stringify(this._targetStairs);
            RG.err('ElementStairs', 'setTargetXY',
                'targetStairs already set to ' + json);
        }
    }

    public getSrcLevel(): Maybe<Level> {return this._srcLevel;}

    /* Sets the target level for the stairs. */
    public setTargetLevel(target: TargetLevel): void {
        if (!RG.isNullOrUndef([target])) {
            this._targetLevel = target;
        }
        else {
            RG.err('Element.Stairs', 'setTargetLevel',
                'Cannot set null/undefined level.');
        }
    }

    public getTargetLevel(): Maybe<TargetLevel> {
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
                this.setTargetLevel(targetLevel as Level);
            }
        }
        else {
            RG.err('Element.Stairs', 'setTargetStairs',
                'Cannot set null/undefined stairs.');
        }
    }

    public getTargetStairs(): ElementStairs | StairsXY | null {
        return this._targetStairs;
    }


    /* Returns unique ID for the stairs.
     * Unique ID can be formed by levelID,x,y. */
    public getConnID(): string {
        const x = this.getX();
        const y = this.getY();
        if (!this._srcLevel) {
            RG.err('Stairs', 'getID', '_srcLevel is not defined');
        }
        const id = this._srcLevel!.getID();
        return `${id},${x},${y}`;
    }

    /* Connects to stairs together. Creates multiple connections if given array
     * of stairs. */
    public connect(stairs: ElementStairs | ElementStairs[], index = 0) {
        const srcLevel = this.getSrcLevel();
        if (!srcLevel) {
            RG.err('Stairs', 'connect',
                'Cannot connect. srcLevel is not defined!');
        }
        if (Array.isArray(stairs)) {
            stairs.forEach(ss => {
                ss.setTargetStairs(this);
                ss.setTargetLevel(srcLevel as Level);
            });
            this.setTargetStairs(stairs[index]);
            const targetLevel = stairs[index].getSrcLevel();
            if (targetLevel) {
                this.setTargetLevel(targetLevel);
            }
            else {
                RG.err('Stairs', 'connect',
                    'Tried to set undefined target level');
            }
        }
        else {
            this.setTargetStairs(stairs);
            stairs.setTargetStairs(this);
            const targetLevel = stairs.getSrcLevel();
            if (targetLevel) {
                this.setTargetLevel(targetLevel);
            }
            else {
                RG.err('Stairs', 'connect',
                    'Tried to set undefined target level');
            }
            stairs.setTargetLevel(srcLevel as Level);
        }
    }

    public isDown(): boolean {return (/stairsDown/).test(this.getName());}

    /* Target actor uses the stairs to move to their target.*/
    public useStairs(actor: BaseActor): boolean {
        if (!RG.isNullOrUndef([this._targetStairs, this._targetLevel])) {
            if (this._targetStairs instanceof ElementStairs) {
                const newX = this._targetStairs.getX();
                const newY = this._targetStairs.getY();
                const srcLevel = this._srcLevel;
                if (srcLevel && srcLevel.removeActor(actor)) {
                    // We know target is level
                    if ((this._targetLevel as Level).addActor(actor, newX, newY)) {
                        return true;
                    }
                }
                else {
                    RG.err('Stairs', 'useStairs',
                        'Tried to use stairs without srcLevel');
                }
            }
            else if (this.isOneway && this._targetStairs) {
                const newX = this._targetStairs.x;
                const newY = this._targetStairs.y;
                const srcLevel = this._srcLevel;
                if (srcLevel && srcLevel.removeActor(actor)) {
                    // We know target is level
                    if ((this._targetLevel as Level).addActor(actor, newX, newY)) {
                        return true;
                    }
                }
                else {
                    RG.err('Stairs', 'useStairs',
                        'Tried to use oneway stairs without srcLevel');
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
    public getConnObj(): null | ConnectionObj {
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
        else if (targetStairs) {
            return {
                targetStairs: {
                    x: targetStairs.x, y: targetStairs.y
                },
                targetLevel: this.getTargetLevel() as number
            };
        }
        RG.err('ElementStairs', 'getConnObj',
            `targetStairs is null. Cannot create the connObj!`);
        return null;
    }

    /* Serializes the Stairs object. */
    public toJSON(): any {
        const json = super.toJSON();
        /*const json: any = {
            name: this.getName(),
            type: this.getType()
        };*/
        if (this.isOneway) {
            json.isOneway = true;
        }
        if (this._srcLevel) {
            json.srcLevel = this.getSrcLevel()!.getID();
        }

        if (Number.isInteger((this._targetLevel as number))) {
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
export class ElementDoor extends ElementXY {

    public _opaque: any;
    public _impassable: any;
    protected _closed: boolean;

    constructor(closed: boolean) {
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
export class ElementLever extends ElementXY {

    protected _targets: any[];

    constructor() {
        super('lever');
        this._targets = [];
    }

    public getTargets() {
        return this._targets;
    }

    public addTarget(target: any) {
        this._targets.push(target);
    }

    public onUse(actor: SentientActor) {
        this._targets.forEach(target => {
            if (target.onUse) {
                target.onUse(actor);
            }
        });
    }

    public toJSON() {
        const json: any = super.toJSON();
        json.id = this.getID();
        json.type = 'lever';
        json.addTarget = this._targets.map(t => RG.getObjRef('entity', t));
        return json;
    }
}
Element.Lever = ElementLever;

/* A shop element is added to each cell inside a shop.*/
export class ElementShop extends ElementXY {
    protected _shopkeeper: null | SentientActor;
    protected _costFactorShopSells: number;
    protected _costFactorShopBuys: number;
    protected _isAbandoned: boolean;

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

    public reclaim(actor: SentientActor): void {
        this._shopkeeper = actor;
        this._isAbandoned = false;
    }

    /* Returns the price in gold coins for item in the cell.*/
    public getItemPriceForBuying(item: ItemBase): number {
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
    public getItemPriceForSelling(item: ItemBase, count?: number): number {
        const value = item.getValue();
        const goldWeight = RG.valueToGoldWeight(value);
        let ncoins = RG.getGoldInCoins(goldWeight);
        if (count) {ncoins *= count;}
        else {ncoins *= item.getCount();}
        ncoins = Math.floor(this._costFactorShopBuys * ncoins);
        return ncoins;
    }

    public abandonShop(): void {
        this._shopkeeper = null;
        this._isAbandoned = true;
    }

    /* Sets the shopkeeper.*/
    public setShopkeeper(keeper: SentientActor): void {
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
    public getShopkeeper(): SentientActor | null {
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
export class ElementExploration extends ElementXY {

    public exp: number;
    public data: {[key: string]: any};

    constructor() {
        super('exploration');
        this.exp = 0;
    }

    public setData(data: any): void {
        this.data = data;
    }

    public addData(key: string, val: any): void {
        this.data[key] = val;
    }

    public getData() {return this.data;}

    public hasData(): boolean {
        if (this.data) {return true;}
        return false;
    }

    public setExp(exp: number): void {
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
export class ElementTrap extends ElementXY {

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

export class ElementWeb extends ElementXY {

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
export class ElementPlaceholder extends ElementXY {
    constructor() {
        super('placeholder');
    }
}
Element.PlaceHolder = ElementPlaceholder;

export class ElementTilledSoil extends ElementXY {
    constructor() {
        super('tilled soil');
        this.add(new Component.TilledSoil());
    }
}
Element.TilledSoil = ElementTilledSoil;

export class ElementPlantedSoil extends ElementXY {
    constructor() {
        super('planted soil');
        this.add(new Component.PlantedSoil());
    }
}
Element.PlantedSoil = ElementPlantedSoil;

/* Used in the debugging of levels only. Can be used to add arbitrary characters
 * into level maps when debugging. */
export class ElementMarker extends ElementXY {

    public tag: string;
    public className: string | boolean;

    constructor(public char: string) {
        super('marker');
        this.char = char;
        this.tag = '';
        this.className = false; // Uses default cell-element-marker
    }

    public getClassName(): string | boolean {return this.className;}
    public setClassName(name: string | boolean): void {this.className = name;}

    public getChar(): string {return this.char;}
    public setChar(char: string): void {this.char = char;}

    public setTag(tag: string): void {this.tag = tag;}
    public getTag(): string {return this.tag;}

    public toJSON() {
        const json = super.toJSON();
        json.char = this.char;
        json.tag = this.tag;
        return json;
    }
}
Element.Marker = ElementMarker;


export const create = function(type: string, ...args: any[]): null | ElementBase {
    // const nameCap = type.capitalize();
    if (Element.hasOwnProperty(type)) {
        return new Element[type](...args);
    }
    return null;
};

Element.create = create;

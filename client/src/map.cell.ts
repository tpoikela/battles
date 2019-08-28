
import RG from './rg';
import * as Element from './element';
import {BaseActor} from './actor';
import * as Item from './item';
import {ELEM_MAP} from '../data/elem-constants';
import {TCoord, ConstBaseElem, TCellProp} from './interfaces';

const {TYPE_ACTOR, TYPE_ITEM, TYPE_ELEM} = RG;

type ItemBase = Item.ItemBase;
type Door = Element.ElementDoor;
type LeverDoor = Element.ElementLeverDoor;
type Stairs = Element.ElementStairs;
type SentientActor = import('./actor').SentientActor;
type ElementMarker = Element.ElementMarker;

interface CellProps {
    actors?: TCellProp[];
    items?: TCellProp[];
    elements?: TCellProp[];
}

export type CellPropsKey = keyof CellProps;

export interface CellJSON {
    t: string; // Type of this cell
    ex?: number; // Explored by player?
    elements?: Element.ElementJSON[];
}

/* Object representing one game cell. It can hold actors, items, traps or
 * elements. Cell has x,y for convenient access to coordinates.
 * */
// const Cell = function(x: number, y: number, elem: Element) { // {{{2
export class Cell {

    // Used in Map.Cell for faster access
    public _explored: boolean;
    public _x: number;
    public _y: number;

    // private _baseElem: Maybe<ConstBaseElem>;
    private _baseElem: ConstBaseElem;
    private _p: CellProps;
    private _lightPasses: boolean;
    private _isPassable: boolean;

    constructor(x: number, y: number, elem: ConstBaseElem) { // {{{2

        this._baseElem = elem;
        this._x = x;
        this._y = y;
        this._explored = false;

        this._p = {}; // Cell properties are assigned here

        this._lightPasses = elem ? elem.lightPasses() : true;
        this._isPassable = elem ? elem.isPassable() : true;
    }

    public getX(): number {return this._x;}
    public getY(): number {return this._y;}
    public getXY(): TCoord {return [this._x, this._y];}
    public setX(x: number) {this._x = x;}
    public setY(y: number) {this._y = y;}
    public setXY(xy: TCoord) {this._x = xy[0]; this._y = xy[1];}

    public isAtXY(x: number, y: number): boolean {
        return x === this._x && y === this._y;
    }

    public getKeyXY(): string {
        return this._x + ',' + this._y;
    }

    /* Sets/gets the base element for this cell. There can be only one element.*/
    public setBaseElem(elem: ConstBaseElem): void {
        this._baseElem = elem;
        this._lightPasses = elem.lightPasses();
        this._isPassable = elem.isPassable();
    }

    public getBaseElem(): ConstBaseElem { return this._baseElem; } // TODO safe null

    /* Returns true if the cell has props of given type.*/
    public hasProp(prop: CellPropsKey): boolean {
        return this._p.hasOwnProperty(prop);
    }

    /* Returns the given type of props, or null if does not have any props of that
     * type. */
    public getProp(prop: CellPropsKey): TCellProp[] | null {
        if (this._p[prop]) {
            return this._p[prop] as TCellProp[];
        }
        return null;
    }

    /* Queries cell about possible elements. */
    public hasElements(): boolean {
        return this.hasProp(TYPE_ELEM);
    }

    public getElements(): Element.ElementXY[] | null {
        return this.getProp(TYPE_ELEM) as Element.ElementXY[];
    }

    /* Returns true if cell has any actors.*/
    public hasActors(): boolean {
        return this.hasProp(TYPE_ACTOR);
    }

    public getActors(): BaseActor[] | null {
        return (this.getProp(TYPE_ACTOR) as BaseActor[]);
    }

    public getFirstActor(): BaseActor | null {
        const actors = this.getProp(TYPE_ACTOR) as BaseActor[];
        if (actors && actors.length > 0) {
            return actors[0];
        }
        return null;
    }

    public getSentientActors(): SentientActor[] {
        const actors = this.getActors();
        if (actors) {
            return actors.filter(actor => (
                !actor.has('NonSentient'))
            ) as SentientActor[];
        }
        return []; // as SentientActor[];
    }

    public hasItems(): boolean {return this.hasProp(TYPE_ITEM);}
    public getItems(): ItemBase[] | null {
        return (this.getProp(TYPE_ITEM) as ItemBase[]);
    }

    public getMarkers(): ElementMarker[] {
        const elems = this.getElements();
        const res: ElementMarker[] = [];
        if (elems) {
            for (let i = 0; i < elems.length; i++) {
                if (elems[i].getType() === 'marker') {
                    res.push(elems[i] as ElementMarker);
                }
            }
        }
        return res;
    }

    /* Checks if this cell has a marker with given tag. */
    public hasMarker(tag: string): boolean {
        if (this.hasElements()) {
            const elems = this.getElements() as Element.ElementXY[];
            for (let i = 0; i < elems.length; i++) {
                if (elems[i].getType() === 'marker') {
                    if ((elems[i] as ElementMarker).getTag() === tag) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /* Returns true if cell has any props. */
    public hasProps(): boolean {
        return Object.keys(this._p).length > 0;
    }

    public getProps(): TCellProp[] {
        let res: TCellProp[] = [];
        Object.keys(this._p).forEach((key: CellPropsKey ) => {
            res = res.concat(this._p[key]!.slice());
        });
        return res;
    }

    /* Returns true if cell has stairs.*/
    public hasStairs(): boolean {
        const propType = this.getConnection();
        if (propType) {
            const name = propType.getName();
            return (/stairs(Up|Down)/).test(name);
        }
        return false;
    }

    /* Returns true if cell has passage to another tile. */
    public hasPassage(): boolean {
        const propType = this.getConnection();
        if (propType) {return propType.getName() === 'passage';}
        return false;
    }

    public hasShop(): boolean {
        return this.hasPropType('shop');
    }

    public getShop(): Element.ElementShop | null {
        const shopU = this.getPropType('shop')[0] as unknown;
        return shopU as Element.ElementShop;
    }

    public hasDoor(): boolean {
        return this.hasPropType('door');
    }

    public hasClosedDoor(): boolean {
        if (this.hasDoor()) {
            const door: unknown = this.getPropType('door')[0];
            return (door as Door).isClosed();
        }
        return false;
    }

    public hasConnection(): boolean {
        return this.hasPropType('connection');
    }

    public hasHouse(): boolean {
        return this._baseElem.getType() === 'floorhouse';
    }

    public hasConnectionType(type: string): boolean {
        if (this.hasConnection()) {
            const connection = this.getConnection();
            return connection!.getName() === type;
        }
        return false;
    }

    public hasTown(): boolean {
        return this.hasConnectionType('town');
    }

    public hasBattle(): boolean {
        return this.hasConnectionType('battle');
    }

    public hasMountain(): boolean {
        return this.hasConnectionType('mountain');
    }

    /* Return stairs in this cell, or null if there are none.*/
    public getStairs(): Stairs | null {
        if (this.hasStairs()) {
            return this.getConnection();
        }
        return null;
    }

    public getConnection(): Stairs | null {
        if (this.hasPropType('connection')) {
            const connU = this.getPropType('connection')[0] as unknown;
            return connU as Stairs;
        }
        return null;
    }

    /* Returns passage in this cell, or null if not found. */
    public getPassage(): Stairs | null {
        if (this.hasPassage()) {
            return this.getConnection();
        }
        return null;
    }

    /* Returns true if light passes through this map cell.*/
    public lightPasses(): boolean {
        if (!this._lightPasses) {return false;}
        const elems = this._p.elements;
        if (elems) {
            if (elems.length === 1) {
                if (elems[0].has('Opaque')) {return false;}
            }
            else {
                for (let i = 0; i < elems.length; i++) {
                    if (elems[i].has('Opaque')) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    public isPassable(): boolean {return this.isFree();}

    public isPassableByAir(): boolean {
        return this._baseElem.isPassableByAir();
    }

    public isDangerous(): boolean {
        if (this._p.actors) {
            const actors = this.getProp(TYPE_ACTOR);
            if (actors) {
                return actors[0].has('Damaging');
            }
        }
        return false;
    }

    public hasObstacle(): boolean {
        return this._baseElem.isObstacle();
    }

    public isSpellPassable(): boolean {
        return this._baseElem.isSpellPassable();
    }

    public setExplored(): void {this._explored = true;}
    public isExplored(): boolean {return this._explored;}

    /* Returns true if it's possible to move to this cell.*/
    public isFree(isFlying = false): boolean {
        // if (!isFlying && !this._baseElem.isPassable()) {return false;}
        if (!isFlying && !this._isPassable) {return false;}

        if (this.hasProp(TYPE_ACTOR)) {
            for (let i = 0; i < this._p.actors!.length; i++) {
                if (!this._p.actors![i].has('Ethereal')) {return false;}
            }
            return true;
        }
        else if (this.hasProp(TYPE_ELEM)) {
            if (this.hasPropType('door')) {
                const door = this.getDoor();
                return door!.isOpen();
            }
            else if (this.hasPropType('leverdoor')) {
                const leverDoor = this.getLeverDoor();
                return leverDoor!.isOpen();
            }
        }

        // Handle flying/non-flying here
        if (isFlying) {
            return this._baseElem.isPassableByAir();
        }
        else {
            return true;
        }
    }

    public getDoor(): Door | null {
        if (this.hasPropType('door')) {
            const door = this.getPropType('door')[0] as unknown;
            return (door as Door);
        }
        return null;
    }

    public getLeverDoor(): LeverDoor | null {
        if (this.hasPropType('leverdoor')) {
            const door = this.getPropType('leverdoor')[0] as unknown;
            return (door as LeverDoor);
        }
        return null;
    }

    /* Add given obj with specified property type.*/
    public setProp(prop: CellPropsKey, obj: TCellProp): void {
        if (obj.getType() === 'connection' && this.hasConnection()) {
            let msg = `${this._x},${this._y}`;
            msg += `\nExisting: ${JSON.stringify(this.getConnection())}`;
            msg += `\nTried to add: ${JSON.stringify(obj)}`;
            RG.err('Cell', 'setProp',
                `Tried to add 2nd connection: ${msg}`);
        }
        // This check guarantees that this._p[prop] exists in else-if branches
        if (!this._p.hasOwnProperty(prop)) {
            this._p[prop] = [];
            this._p[prop]!.push(obj);
        }
        // Reorders actors to show them in specific order with GUI
        else if (prop === TYPE_ACTOR) {
            if (!obj.has('NonSentient') && !obj.has('Ethereal')) {
                this._p[prop]!.unshift(obj);
            }
            else {
                this._p[prop]!.push(obj);
            }
        }
        else {
            this._p[prop]!.push(obj);
        }

        if ((obj as ItemBase).isOwnable) {
            (obj as ItemBase).setOwner(this);
        }
    }

    public removeProps(propType: CellPropsKey): void {
        delete this._p[propType];
    }

    /* Removes the given object from cell properties.*/
    public removeProp(prop: CellPropsKey, obj: TCellProp): boolean {
        if (this.hasProp(prop)) {
            const props = this._p[prop];
            const index = props!.indexOf(obj);
            if (index === -1) {return false;}
            this._p[prop]!.splice(index, 1);
            if (this._p[prop]!.length === 0) {
                delete this._p[prop];
            }
            return true;
        }
        return false;
    }

    /* Returns string representation of the cell.*/
    public toString(): string {
        let str = 'Map.Cell ' + this._x + ', ' + this._y;
        str += ' explored: ' + this._explored;
        str += ' passes light: ' + this.lightPasses();
        Object.keys(this._p).forEach(prop => {
            const arrProps = this._p[prop];
            for (let i = 0; i < arrProps.length; i++) {
                if (arrProps[i].hasOwnProperty('toString')) {
                    str += arrProps[i].toString();
                }
                else if (arrProps[i].hasOwnProperty('toJSON')) {
                    str += JSON.stringify(arrProps[i].toJSON());
                }
            }
        });
        return str;
    }

    /* Returns true if the cell has an usable element. */
    public hasUsable(): boolean {
        const elems = this.getProp(RG.TYPE_ELEM) as Element.ElementXY[];
        if (elems) {
            for (let i = 0; i < elems.length; i++) {
                if ((elems[i] as any).onUse) {
                    return true;
                }
            }
        }
        return false;
    }

    public toJSON(): CellJSON {
        const json: CellJSON = {
            t: ELEM_MAP.elemTypeToIndex[this._baseElem.getType()]
        };
        if (this._explored) {json.ex = 1;}
        return json;
    }

    /* Returns name (or type if unnamed) for each prop in this cell, including the
     * base element type. */
    public getPropNames(): string[] {
        const result = [this._baseElem.getType()];
        const keys = Object.keys(this._p) as CellPropsKey[];
        keys.forEach(propType => {
            const props = this.getProp(propType);
            // props must exist, otherwise it is not in keys
            props!.forEach(prop => {
                result.push(prop.getName());
            });
        });
        return result;
    }

    /* Returns true if any cell property has the given type. Ie.
     * myCell.hasPropType("wall"). Doesn't check for basic props like "actors",
     * RG.TYPE_ITEM etc.
     */
    public hasPropType(propType: string): boolean {
        if (this._baseElem.getType() === propType) {return true;}

        const keys = Object.keys(this._p);
        for (let i = 0; i < keys.length; i++) {
            const prop = keys[i] as CellPropsKey;
            // arrpPops must exist, otherwise it is not in keys
            const arrProps = this._p[prop]!;
            for (let j = 0; j < arrProps.length; j++) {
                if (arrProps[j].getType() === propType) {
                    return true;
                }
            }
        }
        return false;
    }

    /* Returns all props with given type in the cell.*/
    public getPropType(propType: string): TCellProp[] | ConstBaseElem[] {
        const props: TCellProp[] = [];
        if (this._baseElem.getType() === propType) {return [this._baseElem];}
        Object.keys(this._p).forEach((prop: CellPropsKey) => {
            // arrpPops must exist, otherwise it is not in keys
            const arrProps = this._p[prop]!;
            for (let i = 0; i < arrProps.length; i++) {
                if (arrProps[i].getType() === propType) {
                    props.push(arrProps[i]);
                }
            }
        });
        return props;
    }

    /* For debugging to find a given object. */
    public findObj(filterFunc: (obj: any) => boolean): any[] {
        const result: any[] = [];
        Object.keys(this._p).forEach((propType: CellPropsKey) => {
            // props must exist, otherwise it is not in keys
            const props = this._p[propType]!;
            props.forEach(propObj => {
                if (filterFunc(propObj)) {
                    result.push(propObj);
                }
            });
        });
        return result;
    }

    public isOutdoors(): boolean {
        return !this._baseElem.has('Indoor');
    }
}


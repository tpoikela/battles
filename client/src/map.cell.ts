
import RG from './rg';
import * as Element from './element';
import {BaseActor} from './actor';
import * as Item from './item';
import {ELEM_MAP} from '../data/elem-constants';
import {TCoord, TCoord3D, ConstBaseElem, TCellProp, CellProps, TPropType} from './interfaces';

const {TYPE_ACTOR, TYPE_ITEM, TYPE_ELEM} = RG;

type ItemBase = Item.ItemBase;
type Door = Element.ElementDoor;
type LeverDoor = Element.ElementLeverDoor;
type Stairs = Element.ElementStairs;
type SentientActor = import('./actor').SentientActor;
type ElementMarker = Element.ElementMarker;

export interface CellJSON {
    t: string; // Type of this cell
    ex?: number; // Explored by player?
    elements?: Element.ElementJSON[];
}

// Up to 32 bits can be used for different state info
const IND_EXPLORED = 0;
const IND_LIGHT_PASSES = 1;
const IND_IS_PASSABLE = 2;

// This is to optimize the memory footprint per cell, it's not visible outside,
// and limits x- and y to 16 bits.
const X_POS = 0x0000ffff;
const Y_POS = 0xffff0000;
const Y_SHIFT = 16;

/* Object representing one game cell. It can hold actors, items, traps or
 * elements. Cell has x,y for convenient access to coordinates.
 * */
// const Cell = function(x: number, y: number, elem: Element) { // {{{2
export class Cell {

    // Used in Map.Cell for faster access
    public _xy: number;

    private _baseElem: ConstBaseElem;
    private _p: CellProps;

    // State flags are cached here (up to 32 state bits possible)
    private _state: number;

    constructor(x: number, y: number, elem: ConstBaseElem) { // {{{2
        this._baseElem = elem;
        this._xy = x & X_POS | (y << Y_SHIFT) & Y_POS;
        this._state = 0;

        // this._p = {}; // Cell properties are assigned here

        this.setStateBit(IND_LIGHT_PASSES, elem.lightPasses());
        this.setStateBit(IND_IS_PASSABLE, elem.isPassable());
    }

    public getX(): number {return this._xy & X_POS;}
    public getY(): number {return (this._xy & Y_POS) >>> Y_SHIFT;}
    public getXY(): TCoord {return [this._xy & X_POS, (this._xy & Y_POS) >>> Y_SHIFT];}
    public setX(x: number) {this._xy = x & X_POS;}
    public setY(y: number) {this._xy = (y << Y_SHIFT) & Y_POS;}

    public getZ(): number {return this._baseElem.getZ();}
    public getXYZ(): TCoord3D {return [this.getX(), this.getY(), this._baseElem.getZ()];}
    public setXY(xy: TCoord) {
        this._xy = xy[0] & X_POS | (xy[1] << Y_SHIFT) & Y_POS;}

    public isAtXY(x: number, y: number): boolean {
        return x === this.getX() && y === this.getY();
    }

    public getKeyXY(): string {
        return this.getX() + ',' + this.getY();
    }

    /* Sets/gets the base element for this cell. There can be only one element.*/
    public setBaseElem(elem: ConstBaseElem): void {
        this._baseElem = elem;
        this.setStateBit(IND_LIGHT_PASSES, elem.lightPasses());
        this.setStateBit(IND_IS_PASSABLE, elem.isPassable());
    }

    public getBaseElem(): ConstBaseElem { return this._baseElem; } // TODO safe null

    /* Returns true if the cell has props of given type.*/
    public hasProp(prop: TPropType): boolean {
        if (!this._p) {return false;}
        return this._p.hasOwnProperty(prop);
    }

    /* Returns the given type of props, or null if does not have any props of that
     * type. */
    public getProp(prop: TPropType): TCellProp[] | null {
        if (this._p && this._p[prop]) {
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

    public isAdjacent(cell: Cell): boolean {
        return RG.withinRange(1, this, cell);
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
        if (!this._p) {return false;}
        return Object.keys(this._p).length > 0;
    }

    public getProps(): TCellProp[] {
        let res: TCellProp[] = [];
        if (!this._p) {return res;}
        Object.keys(this._p).forEach((key: TPropType ) => {
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
        if (!this.getBit(IND_LIGHT_PASSES)) {return false;}
        if (!this._p) {return true;}
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

    public isPassableByAir(z=10): boolean {
        const elevZ = this._baseElem.getZ();
        if (z >= elevZ) {
            return this._baseElem.isPassableByAir();
        }
        return false;
    }

    public isDangerous(): boolean {
        if (this._p && this._p.actors) {
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

    // public setExplored(): void {this._explored = true;}
    public setExplored(): void {this.setStateBit(IND_EXPLORED, true);}
    public isExplored(): boolean {return this.getBit(IND_EXPLORED);}

    /* Returns true if it's possible to move to this cell.*/
    public isFree(isFlying = false): boolean {
        // if (!isFlying && !this._baseElem.isPassable()) {return false;}
        if (!isFlying && !this.getBit(IND_IS_PASSABLE)) {return false;}

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
            else if (this.hasElemWith('Impassable')) {
                if (isFlying) {
                    // TODO case with flying passable element
                    return false;
                }
                else {
                    return false;
                }
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
    public setProp(prop: TPropType, obj: TCellProp): void {
        if (obj.getType() === 'connection' && this.hasConnection()) {
            let msg = `${this.getX()},${this.getY()}`;
            msg += `\nExisting: ${JSON.stringify(this.getConnection())}`;
            msg += `\nTried to add: ${JSON.stringify(obj)}`;
            RG.err('Cell', 'setProp',
                `Tried to add 2nd connection: ${msg}`);
        }
        if (!this._p) {this._p = {};}
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

    public removeProps(propType: TPropType): void {
        delete this._p[propType];
    }

    /* Removes the given object from cell properties.*/
    public removeProp(prop: TPropType, obj: TCellProp): boolean {
        if (this.hasProp(prop)) {
            const props = this._p[prop];
            const index = props!.indexOf(obj);
            if (index === -1) {return false;}
            this._p[prop]!.splice(index, 1);
            if (this._p[prop]!.length === 0) {
                delete this._p[prop];
                if (Object.keys(this._p).length === 0) {
                    this._p = undefined;
                }
            }
            return true;
        }
        return false;
    }

    /* Returns string representation of the cell.*/
    public toString(): string {
        let str = 'Map.Cell ' + this.getX() + ', ' + this.getY();
        str += ' explored: ' + this.isExplored();
        str += ' passes light: ' + this.lightPasses();
        if (!this._p) {return str;}

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
        if (this.getBit(IND_EXPLORED)) {json.ex = 1;}
        return json;
    }

    /* Returns name (or type if unnamed) for each prop in this cell, including the
     * base element type. */
    public getPropNames(): string[] {
        const result = [this._baseElem.getType()];
        if (!this._p) {return result;}

        const keys = Object.keys(this._p) as TPropType[];
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
        if (!this._p) {return false;}

        const keys = Object.keys(this._p);
        for (let i = 0; i < keys.length; i++) {
            const prop = keys[i] as TPropType;
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
        if (!this._p) {return props;}

        if (this._baseElem.getType() === propType) {return [this._baseElem];}
        Object.keys(this._p).forEach((prop: TPropType) => {
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
        if (!this._p) {return result;}

        Object.keys(this._p).forEach((propType: TPropType) => {
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

    public hasElemWith(compType: string): boolean {
        const elems = this.getElements();
        for (let i = 0, len = elems.length; i < len; i++) {
            if (elems[i].has(compType)) return true;
        }
        return false;
    }

    protected getBit(ind: number): boolean {
        return !!(this._state & (1 << ind));
    }

    protected setStateBit(ind: number, val: boolean): void {
        if (val) {this._state = (1 << ind) | this._state;}
        else {
            this._state &= ~(1 << ind);
        }
    }

    protected toggleBit(ind: number): void {
        this._state ^= 1 << ind;
    }
}


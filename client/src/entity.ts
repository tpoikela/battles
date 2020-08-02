/* Base class for entities such as actors and items in the game. Each entity can
 * contain any number of components. The base class provides functionality such
 * as emitting specific events when component is added/removed. Each entity has
 * also unique ID which is preserved throughout a single game (including
 * saving/restoring the game). */

import RG from './rg';
import {GameObject} from './game-object';
import {EventPool} from '../src/eventpool';


// Helper function for faster splice
const spliceOne = function(arr: any[], index: number): void {
    const len = arr.length;
    if (!len) {return;}
    while (index < len) {
        arr[index] = arr[index + 1];
        index++;
    }
    arr.length--;
};

interface IComponents {
    [key: string]: any;
}

interface ICompsByType {
    [key: string]: any[];
}

/* Entity is used to represent actors, items and elements. It can have any
 * arbitrary properties by attaching components to it. See the basic
 * methods add(), get(), has() and remove() particularly.
 */
export class Entity extends GameObject {

    public static POOL: EventPool;
    public static num: {[key: string]: number};

    public static createEntityID(): number {
        return GameObject.createObjectID();
    }

    public static setPool(pool: EventPool): void {
        Entity.POOL = pool;
    }

    public static getIDCount(): number {
        return GameObject.ID;
    }

    protected comps: IComponents;
    protected compsByType: ICompsByType;

    constructor(...args: any[]) {
        super();
        // Stores the comps by ID, used for serialisation
        this.comps = {};

        // Cache for faster access, NOT serialised
        this.compsByType = {};
    }

    /* Removes given component type or component.
     * 1. If object is given, retrieves its id using getID().
     * 2. If integer given, uses it as ID to remove the component.
     * 3. If string is given, either
     *    a) removes first comp of matching type.
     *    b) Uses parseInt() to convert it to ID, then uses this ID.
     */
    public remove(nameOrCompOrId): void {
        ++Entity.num.remove;
        if (typeof nameOrCompOrId === 'object') {
            const id = nameOrCompOrId.getID();
            if (this.comps.hasOwnProperty(id)) {
                const comp = this.comps[id];
                const compName = comp.getType();
                comp.entityRemoveCallback(this);
                delete this.comps[id];

                const index = this.compsByType[compName].indexOf(comp);
                spliceOne(this.compsByType[compName], index);
                if (this.compsByType[compName].length === 0) {
                    delete this.compsByType[compName];
                }
                Entity.POOL.emitEvent(compName, {entity: this, remove: true});
            }
        }
        else if (Number.isInteger(nameOrCompOrId)) {
            const compID = nameOrCompOrId;
            if (this.comps[compID]) {
                this.remove(this.comps[compID]);
            }
        }
        else {
            const compObj = this.get(nameOrCompOrId);
            if (compObj) {
                this.remove(compObj);
            }
            else {
                const compID = parseInt(nameOrCompOrId, 10);
                if (compID) {
                    this.remove(compID);
                }
                else {
                    const type = typeof nameOrCompOrId;
                    RG.warn('Entity', 'remove',
                        `No comp found ->  |${nameOrCompOrId}|, type: ${type}`);
                }
            }
        }
    }

    public equals(rhs: Entity): boolean {
        return this.getID() === rhs.getID();
    }

    /* Gets component with given name. If entity has multiple of them, returns
     * the first found. */
    public get(typeName: string): any {
        ++Entity.num.get;
        if (this.compsByType[typeName]) {
            return this.compsByType[typeName][0];
        }
        return null;
    }

    /* Fast lookup by ID only. Caller must check the result for validity. */
    public getByID(compID: number) {
        return this.comps[compID];
    }

    /* SLOW method to get comps of given type. Don't use in internal methods. */
    public getList(typeName: string): any[] {
        ++Entity.num.getList;
        if (this.compsByType[typeName]) {
            return this.compsByType[typeName].slice();
        }
        return [];
    }

    /* Adds a new component into the entity. */
    public add(compObj: any): void {
        if (typeof compObj === 'string') {
            RG.err('Entity', 'add', 'No string support anymore');
        }
        ++Entity.num.add;
        const compName = compObj.getType();
        if (compObj.isUnique() && this.has(compName)) {
            this.removeAll(compName);
        }

        this.comps[compObj.getID()] = compObj;
        if (!this.compsByType.hasOwnProperty(compName)) {
            this.compsByType[compName] = [compObj];
        }
        else {
            this.compsByType[compName].push(compObj);
        }
        compObj.entityAddCallback(this);
        Entity.POOL.emitEvent(compName, {entity: this, add: true});
    }

    /* Returns true if entity has given component. Lookup by ID is much faster
     * than with name. */
    public has(nameOrId): boolean {
        ++Entity.num.has;
        if (this.compsByType.hasOwnProperty(nameOrId)) {
            return true;
        }
        return this.comps.hasOwnProperty(nameOrId);
    }

    /* Returns true if entity has any of the components. */
    public hasAny(compNames: string[]): boolean {
        ++Entity.num.hasAny;
        for (const compName of compNames) {
            if (this.compsByType.hasOwnProperty(compName)) {
                return true;
            }
        }
        return false;
    }

    public hasNone(compNames: string[]): boolean {
        return !this.hasAny(compNames);
    }

    /* Returns true if entity has all of given comps. */
    public hasAll(compNames: string[]): boolean {
        for (const compName of compNames) {
            if (!this.compsByType.hasOwnProperty(compName)) {
                return false;
            }
        }
        return true;
    }

    /* Removes all components of the given type. */
    public removeAll(nameOrComp): void {
        ++Entity.num.removeAll;
        let compName = nameOrComp;
        if (typeof nameOrComp === 'object') {
            compName = nameOrComp.getType();
        }
        if (this.has(compName)) {
            const list = this.compsByType[compName].slice();
            list.forEach(comp => {this.remove(comp);});
        }
    }

    /* Replaces ALL components of the given type. */
    public replace(nameOrComp, comp): void {
        this.removeAll(nameOrComp);
        if (comp) {
            this.add(comp);
        }
        else {
            this.add(nameOrComp);
        }
    }

    public getComponents(): IComponents {
        return this.comps;
    }

    public getCompList(): string[] {
        return Object.keys(this.compsByType);
    }

    public copy(rhs: any): void {
        throw new Error('copy() not implemented in Entity');
    }

    public clone(): any {
        throw new Error('clone() not implemented in Entity');
    }

    public toJSON(): any {
        throw new Error('toJSON() not implemented in Entity');
    }

}
Entity.setPool(EventPool.getPool());

/* For histogramming purposes, to see how many calls are done per function. */
Entity.num = {};
Entity.num.add = 0;
Entity.num.get = 0;
Entity.num.getList = 0;
Entity.num.has = 0;
Entity.num.hasAny = 0;
Entity.num.hasAll = 0;
Entity.num.remove = 0;
Entity.num.removeAll = 0;

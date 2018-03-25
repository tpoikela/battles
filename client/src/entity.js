/* Base class for entities such as actors and items in the game. Each entity can
 * contain any number of components. The base class provides functionality such
 * as emitting specific events when component is added/removed. Each entity has
 * also unique ID which is preserved throughout a single game (including
 * saving/restoring the game). */

const RG = require('./rg');

export default class Entity {
    constructor() {
        this._id = Entity.idCount++;
        this._comps = {};
    }

    getID() {return this._id;}
    setID(id) {this._id = id;}

    /* Gets component with given name. If entity has multiple of them, returns
     * the first found. */
    get(name) {
        ++Entity.num.get;
        const keys = Object.keys(this._comps);
        for (let i = 0, len = keys.length; i < len; i++) {
            if (this._comps[keys[i]]._type === name) {
                return this._comps[keys[i]];
            }
        }
        return null;
    }

    /* Fast lookup by ID only. Called must check the result. */
    getByID(compID) {
        return this._comps[compID];
    }

    /* SLOW method to get comps of given type. Don't use in internal methods. */
    getList(typeName) {
        ++Entity.num.getList;
        const comps = Object.values(this._comps);
        return comps.filter(comp => comp.getType() === typeName);
    }

    /* Adds a new component into the entity. */
    add(nameOrComp, comp) {
        ++Entity.num.add;
        let compName = nameOrComp;
        let compObj = comp;
        if (typeof nameOrComp === 'object') {
            compObj = nameOrComp;
            compName = nameOrComp.getType();
        }
        if (compObj.isUnique() && this.has(compName)) {
            this.removeAll(compName);
        }
        this._comps[compObj.getID()] = compObj;
        compObj.entityAddCallback(this);
        RG.POOL.emitEvent(compName, {entity: this, add: true});
    }

    /* Returns true if entity has given component. Lookup by ID is much faster
     * than with name. */
    has(nameOrId) {
        ++Entity.num.has;
        if (this._comps.hasOwnProperty(nameOrId)) {
            return true;
        }
        const keys = Object.keys(this._comps);
        for (let i = 0, len = keys.length; i < len; i++) {
            if (this._comps[keys[i]]._type === nameOrId) {
                return true;
            }
        }
        return false;
    }

    /* Removes given component type or component.
     * 1. If object is given, retrieves its id using getID().
     * 2. If integer given, uses it as ID to remove the component.
     * 3. If string is given, either
     *    a) removes first comp of matching type.
     *    b) Uses parseInt() to convert it to ID, then uses this ID.
     */
    remove(nameOrCompOrId) {
        ++Entity.num.remove;
        if (typeof nameOrCompOrId === 'object') {
            const id = nameOrCompOrId.getID();
            if (this._comps.hasOwnProperty(id)) {
                const comp = this._comps[id];
                const compName = comp.getType();
                comp.entityRemoveCallback(this);
                delete this._comps[id];
                RG.POOL.emitEvent(compName, {entity: this, remove: true});
            }
        }
        else if (Number.isInteger(nameOrCompOrId)) {
            const compID = nameOrCompOrId;
            if (this._comps[compID]) {
                this.remove(this._comps[compID]);
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

    /* Removes all components of the given type. */
    removeAll(nameOrComp) {
        ++Entity.num.removeAll;
        let compName = nameOrComp;
        if (typeof nameOrComp === 'object') {
            compName = nameOrComp.getType();
        }
        const list = this.getList(compName);
        list.forEach(comp => {this.remove(comp);});
    }

    /* Replaces ALL components of given type. */
    replace(nameOrComp, comp) {
        this.removeAll(nameOrComp);
        if (comp) {
            this.add(nameOrComp, comp);
        }
        else {
            this.add(nameOrComp);
        }
    }

    getComponents() {return this._comps;}

}

Entity.idCount = 0;

Entity.createEntityID = () => {
    const id = Entity.prototype.idCount;
    Entity.prototype.idCount += 1;
    return id;
};

Entity.getIDCount = () => Entity.idCount;

Entity.num = {};
Entity.num.add = 0;
Entity.num.get = 0;
Entity.num.getList = 0;
Entity.num.has = 0;
Entity.num.remove = 0;
Entity.num.removeAll = 0;


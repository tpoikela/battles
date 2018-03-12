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
        const compList = this.getList(name);
        if (compList.length > 0) {
            return compList[0];
        }
        return null;
    }

    getList(typeName) {
        const comps = Object.values(this._comps);
        return comps.filter(comp => comp.getType() === typeName);
    }

    /* Adds a new component into the entity. */
    add(nameOrComp, comp) {
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
        if (this._comps.hasOwnProperty(nameOrId)) {
            return true;

        }
        const compList = this.getList(nameOrId);
        return compList.length > 0;
    }

    /* Removes given component type or component. If string is given, removes
     * the first matching, otherwise removes by comp ID. 
     */
    remove(nameOrCompOrId) {
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
            const compList = this.getList(nameOrCompOrId);
            if (compList.length > 0) {
                this.remove(compList[0]);
            }
        }
    }

    /* Removes all components of the given type. */
    removeAll(nameOrComp) {
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


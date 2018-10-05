/* Base class for entities such as actors and items in the game. Each entity can
 * contain any number of components. The base class provides functionality such
 * as emitting specific events when component is added/removed. Each entity has
 * also unique ID which is preserved throughout a single game (including
 * saving/restoring the game). */

const RG = require('./rg');
const GameObject = require('./game-object');

// Helper function for faster splice
const spliceOne = function(arr, index) {
    const len = arr.length;
    if (!len) {return;}
    while (index < len) {
        arr[index] = arr[index + 1];
        index++;
    }
    arr.length--;
};

/* Entity is used to represent actors, items and elements. It can have any
 * arbitrary properties by attaching components to it. See the basic
 * methods add(), get(), has() and remove() particularly.
 */
const Entity = function() {
    GameObject.call(this);
    // Stores the comps by ID, used for serialisation
    this._comps = {};

    // Cache for faster access, NOT serialised
    this._compsByType = {};

};
RG.extend2(Entity, GameObject);

/* Gets component with given name. If entity has multiple of them, returns
 * the first found. */
Entity.prototype.get = function(typeName) {
    ++Entity.num.get;
    if (this._compsByType[typeName]) {
        return this._compsByType[typeName][0];
    }
    return null;
};

/* Fast lookup by ID only. Caller must check the result for validity. */
Entity.prototype.getByID = function(compID) {
    return this._comps[compID];
};

/* SLOW method to get comps of given type. Don't use in internal methods. */
Entity.prototype.getList = function(typeName) {
    ++Entity.num.getList;
    if (this._compsByType[typeName]) {
        return this._compsByType[typeName].slice();
    }
    return [];
};

/* Adds a new component into the entity. */
Entity.prototype.add = function(compObj) {
    if (typeof compObj === 'string') {
        RG.err('Entity', 'add', 'No string support anymore');
    }
    ++Entity.num.add;
    const compName = compObj.getType();
    if (compObj.isUnique() && this.has(compName)) {
        this.removeAll(compName);
    }

    this._comps[compObj.getID()] = compObj;
    if (!this._compsByType.hasOwnProperty(compName)) {
        this._compsByType[compName] = [compObj];
    }
    else {
        this._compsByType[compName].push(compObj);
    }
    compObj.entityAddCallback(this);
    RG.POOL.emitEvent(compName, {entity: this, add: true});
};

/* Returns true if entity has given component. Lookup by ID is much faster
 * than with name. */
Entity.prototype.has = function(nameOrId) {
    ++Entity.num.has;
    if (this._compsByType.hasOwnProperty(nameOrId)) {
        return true;
    }
    return this._comps.hasOwnProperty(nameOrId);
};

/* Returns true if entity has any of the components. */
Entity.prototype.hasAny = function(compNames) {
    ++Entity.num.hasAny;
    for (let i = 0; i < compNames.length; i++) {
        if (this._compsByType.hasOwnProperty(compNames[i])) {
            return true;
        }
    }
    return false;
};

/* Returns true if entity has all of given comps. */
Entity.prototype.hasAll = function(compNames) {
    for (let i = 0; i < compNames.length; i++) {
        if (!this._compsByType.hasOwnProperty(compNames[i])) {
            return false;
        }
    }
    return true;
};

/* Removes given component type or component.
 * 1. If object is given, retrieves its id using getID().
 * 2. If integer given, uses it as ID to remove the component.
 * 3. If string is given, either
 *    a) removes first comp of matching type.
 *    b) Uses parseInt() to convert it to ID, then uses this ID.
 */
Entity.prototype.remove = function(nameOrCompOrId) {
    ++Entity.num.remove;
    if (typeof nameOrCompOrId === 'object') {
        const id = nameOrCompOrId.getID();
        if (this._comps.hasOwnProperty(id)) {
            const comp = this._comps[id];
            const compName = comp.getType();
            comp.entityRemoveCallback(this);
            delete this._comps[id];

            const index = this._compsByType[compName].indexOf(comp);
            spliceOne(this._compsByType[compName], index);
            if (this._compsByType[compName].length === 0) {
                delete this._compsByType[compName];
            }
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
};

/* Removes all components of the given type. */
Entity.prototype.removeAll = function(nameOrComp) {
    ++Entity.num.removeAll;
    let compName = nameOrComp;
    if (typeof nameOrComp === 'object') {
        compName = nameOrComp.getType();
    }
    if (this.has(compName)) {
        const list = this._compsByType[compName].slice();
        list.forEach(comp => {this.remove(comp);});
    }
};

/* Replaces ALL components of the given type. */
Entity.prototype.replace = function(nameOrComp, comp) {
    this.removeAll(nameOrComp);
    if (comp) {
        this.add(comp);
    }
    else {
        this.add(nameOrComp);
    }
};

Entity.prototype.getComponents = function() {
    return this._comps;
};

Entity.createEntityID = () => {
    return GameObject.createObjectID();
};

Entity.getIDCount = () => GameObject.ID;

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

module.exports = Entity;

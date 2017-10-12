/* Base class foe entities such as actors and items in the game. Each entity can
 * contain any number of components. The base class provides functionality such
 * as emitting specific events when component is added/removed. Each entity has
 * also unique ID which is preserved throughout single game. */

const RG = require('./rg');

export default class Entity {
    constructor() {
        this._id = Entity.idCount++;
        this._comps = {};
    }

    getID() {return this._id;}
    setID(id) {this._id = id;}

    get(name) {
        if (this._comps.hasOwnProperty(name)) {return this._comps[name];}
        return null;
    }

    add(nameOrComp, comp) {
        let compName = nameOrComp;
        let compObj = comp;
        if (typeof nameOrComp === 'object') {
            compObj = nameOrComp;
            compName = nameOrComp.getType();
        }
        this._comps[compName] = compObj;
        compObj.entityAddCallback(this);
        RG.POOL.emitEvent(compName, {entity: this, add: true});
    }

    has(name) {
        return this._comps.hasOwnProperty(name);
    }

    remove(name) {
        if (this._comps.hasOwnProperty(name)) {
            const comp = this._comps[name];
            comp.entityRemoveCallback(this);
            delete this._comps[name];
            RG.POOL.emitEvent(name, {entity: this, remove: true});
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


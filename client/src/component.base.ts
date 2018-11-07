
import RG from './rg';
import EventPool from '../src/eventpool';

import './utils';

const debug = require('debug')('bitn:Component');
const POOL = EventPool.getPool();

const Component: any  = {};
Component.createdCompDecls = {};

// Used by components which cannot be serialized
// In your component, add the following:
//   this.toJSON = NO_SERIALISATION;
const NO_SERIALISATION = (): any => null;
Component.NO_SERIALISATION = NO_SERIALISATION as any;

// These attributes are never assigned to component instances
const staticAttr = new Set<string>([
  'description'
]);

/* Can be used to create simple Component object constructors with no other data
 * fields. Usage:
 *   const MyComponent = TagComponent('MyComponent');
 *   const compInst = new MyComponent();
 */
const TagComponent = function(type: string, compAttrib: any = {}) {
    errorIfCompDeclExists(type);
    const CompDecl = function() {
        Component.Base.call(this, type);
        Object.keys(compAttrib).forEach(key => {
            if (!staticAttr.has(key)) {
                this[key] = compAttrib[key];
            }
        });
    };
    RG.extend2(CompDecl, Component.Base);
    Component.createdCompDecls[type] = CompDecl;
    handleCompAttrib(CompDecl, compAttrib);
    return CompDecl;
};
Component.TagComponent = TagComponent;

function handleCompAttrib(CompDecl: any, compAttrib: any) {
    staticAttr.forEach((attr: string) => {
        if (compAttrib.hasOwnProperty(attr)) {
            CompDecl[attr] = compAttrib[attr];
        }
    });
}

/* Can be used to create simple data components with setters/getters.
 * Usage:
 *   const Immunity = DataComponent('Immunity', {value: 1, dmgType: 'Fire'});
 *   const immunityComp = new Immunity();
 *   immunityComp.setDmgType('Fire')
 *   ...etc
 * NOTE: There's difference between members and compAttrib. Component
 * attributes are things like serialisation and uniqueness.
 * (only one comp per entity of that type). There are convenience functions
 * below to define unique and non-serialisable (Transient) components. See
 * TransientTagComponent and TransientDataComponent below.
 *
 * Legal values for compAttrib:
 *  - isUnique: true|false (see UniqueXXXComponent)
 *  - toJSON: NO_SERIALISATION (see TransientXXXComponent)
 *  - objRefs: {memberName: 'type'}, type must be 'entity'|'level'
 */

const DataComponent = (type: string, members: any, compAttrib: any = {}) => {
    errorIfCompDeclExists(type);
    if (typeof type !== 'string') {
        const json = JSON.stringify(type);
        RG.err('component.base.js', 'DataComponent: NO TYPE GIVEN',
            'First arg must be string! Got: |' + json + '|');
    }
    if (typeof members !== 'object' || Array.isArray(members)) {
        RG.err('component.base.js', `DataComponent: ${type}`,
            'Members must be given as key/value pairs.');
    }

    // This is the constructor function to be returned
    const CompDecl = function(...argsList: any) {
        Component.Base.call(this, type);
        Object.keys(compAttrib).forEach(key => {
            this[key] = compAttrib[key];
        });
        Object.keys(members).forEach(key => {
            if (argsList && argsList[0] && argsList[0].hasOwnProperty(key)) {
                this[key] = argsList[0][key];
            }
            else if (typeof members[key] === 'object') {
                // Unless cloned, the object ref is same for all
                // instances of this component.
                this[key] = JSON.parse(JSON.stringify(members[key]));
            }
            else {
                this[key] = members[key];
            }
        });
        // User can define _init function if complex initialisation required
        // For example, onAdd/onRemove callbacks can be given here
        if (this._init && typeof this._init === 'function') {
            this._init(...argsList);
        }
    };
    RG.extend2(CompDecl, Component.Base);

    // Create the member functions (getters/setters) for prototype
    Object.keys(members).forEach((propName: string) => {
        // Check that we are not overwriting anything in base class
        if (Component.Base.prototype.hasOwnProperty(propName)) {
            RG.err('component.js', `DataComponent: ${type}`,
                `${propName} is reserved in Component.Base`);
        }

        // Create the setter method unless it exists in Base
        const setter: string = formatSetterName(propName);
        if (Component.Base.prototype.hasOwnProperty(setter)) {
            RG.err('component.js', `DataComponent: ${type}`,
                `${setter} is reserved in Component.Base`);
        }
        CompDecl.prototype[setter] = function(value: any) {
            this[propName] = value;
        };

        // Create the getter method unless it exists in Base
        const getter: string = formatGetterName(propName);
        if (Component.Base.prototype.hasOwnProperty(setter)) {
            RG.err('component.js', `DataComponent: ${type}`,
                `${getter} is reserved in Component.Base`);
        }
        CompDecl.prototype[getter] = function() {
            return this[propName];
        };
    });

    // Record down the objects refs here (for serialisation)
    if (compAttrib.objRefs) {
        CompDecl.prototype.objRefs = Object.freeze(compAttrib.objRefs);
    }

    CompDecl.prototype.members = Object.freeze(members);
    handleCompAttrib(CompDecl, compAttrib);
    Component.createdCompDecls[type] = CompDecl;
    return CompDecl;
};
Component.DataComponent = DataComponent;

function formatGetterName(propName: string) {
    return 'get' + propName.capitalize();
}
function formatSetterName(propName: string) {
    return 'set' + propName.capitalize();
}

/* Same TagComponent, except only one per entity is preserved. Adding another
 * will remove the existing one. */
const UniqueTagComponent = (type: string, compAttrib: any = {}) => {
    return TagComponent(type, Object.assign({_isUnique: true}, compAttrib));
};
Component.UniqueTagComponent = UniqueTagComponent;

/* Same DataComponent, except only one per entity is preserved. Adding another
 * will remove the existing one. */
const UniqueDataComponent = (type: string, members: any, compAttrib: any = {}) => {
    return DataComponent(type, members,
        Object.assign({_isUnique: true}, compAttrib));
};
Component.UniqueDataComponent = UniqueDataComponent;

/* Same as TagComponent but removes serialisation. This component is used by
* systems for transient stuff like Attacks, Move and SpellCasting. */
const TransientTagComponent = (type: string, compAttrib: any = {}) => {
    return TagComponent(type,
        Object.assign({toJSON: NO_SERIALISATION}, compAttrib));
};
Component.TransientTagComponent = TransientTagComponent;

/* Same as TransientTagComponent, but allows specifying data fields. */
const TransientDataComponent = (type: string, members: any, compAttrib: any = {}) => {
    return DataComponent(type, members,
        Object.assign({toJSON: NO_SERIALISATION}, compAttrib));
};
Component.TransientDataComponent = TransientDataComponent;

const UniqueTransientDataComponent = (type: string, members: any, compAttrib = {}) => {
    return DataComponent(type, members,
        Object.assign({
            toJSON: NO_SERIALISATION,
            _isUnique: true
        }, compAttrib)
    );
};
Component.UniqueTransientDataComponent = UniqueTransientDataComponent;
// TODO UniqueTransientTagComponent

/* Raises an error if two comp declarations with same type are created. */
function errorIfCompDeclExists(type: string) {
    if (Component.createdCompDecls[type]) {
        RG.err('Component', 'Tag/DataComponent',
            `Duplicate decl: ${type}`);
    }
}
//---------------------------------------------------------------------------
// ECS COMPONENTS
//---------------------------------------------------------------------------

/* Important Guidelines:
 * =====================
 *
 *  A component constructor must NOT take any
 *  parameters. Call Base constructor with the type. (which must be identical
 *  to the Object type). Don't forget extend2() at the end. See existing comps
 *  for details.
 *
 *  To benefit from serialisation, all methods should be named:
 *    setXXX - getXXX
 *  Note that if you have any methods starting with set/get, these are used in
 *  the serialisation UNLESS you override toJSON() method.
 *
 *  If only one instance of component should exist for an entity, set
 *    this._unique = true.
 *  inside the component.
 *
 *  If serialisation using toJSON is completely undesirable, use the following:
 *    this.toJSON = NO_SERIALISATION;
 *  inside your component.
 *
 *  WARNING: don't mess with or override getType/setType functions. This will
 *  almost certainly break the logic.
 *
 *  If the component requires refs to other custom objects (ie Entities, Comps),
 *  you must write custom toJSON(), and use RG.getObjRef() for serialize those
 *  fields.
 */

/* Given an entity, serializes its components. */
Component.compsToJSON = ent => {
    const components = {};
    const thisComps = ent.getComponents();
    Object.keys(thisComps).forEach(id => {
        const compJson = thisComps[id].toJSON();
        if (compJson) {
            components[id] = compJson;
        }
    });
    return components;
};

Component.idCount = 0;

/* Base class for all components. Provides callback hooks, copying and cloning.
 * */
Component.Base = function(type: string) {
    this._type = type;
    this._entity = null;
    this._id = Component.idCount++;
    this._isUnique = false;

    this._onAddCallbacks = [];
    this._onRemoveCallbacks = [];
};

Component.Base.prototype.getID = function(): number {return this._id;};
Component.Base.prototype.setID = function(id: number): void {this._id = id;};

Component.Base.prototype.getEntity = function() {return this._entity;};
Component.Base.prototype.setEntity = function(entity) {
    if (this._entity === null && entity !== null) {
        this._entity = entity;
    }
    else if (entity === null) {
        this._entity = null;
    }
    else {
        RG.err('Component.Base', 'setEntity', 'Entity already set.');
    }
};

/* Used when entity (item) with component is cloned. The component is
 * also cloned, but entity ref must be changed. */
Component.Base.prototype.changeEntity = function(newEntity) {
    // Check done for error detection purposes, so that changeEntity() is not
    // called on new comps withot existing entity
    if (!RG.isNullOrUndef([this._entity])) {
        this._entity.remove(this.getID());
        newEntity.add(this);
    }
    else {
        RG.err('Component.Base', 'changeEntity',
            'No entity set. Use setEntity() instead of changeEntity()');
    }
};

Component.Base.prototype.isUnique = function() {return this._isUnique;};

Component.Base.prototype.getType = function() {return this._type;};
Component.Base.prototype.setType = function(type) {this._type = type;};

// Called when a component is added to the entity
Component.Base.prototype.entityAddCallback = function(entity) {
    this.setEntity(entity);
    for (let i = 0; i < this._onAddCallbacks.length; i++) {
        this._onAddCallbacks[i]();
    }
};

// Called when a component is removed from the entity
Component.Base.prototype.entityRemoveCallback = function() {
    for (let i = 0; i < this._onRemoveCallbacks.length; i++) {
        this._onRemoveCallbacks[i]();
    }
    this.setEntity(null);
};

Component.Base.prototype.addCallback = function(name, cb) {
    if (name === 'onAdd') {this._onAddCallbacks.push(cb);}
    else if (name === 'onRemove') {this._onRemoveCallbacks.push(cb);}
    else {
        RG.err('Component.Base',
            'addCallback', 'CB name ' + name + ' must be onAdd/onRemove');
    }
};

/* Removes all callbacks of given type. */
Component.Base.prototype.removeCallbacks = function(name) {
    if (name === 'onAdd') {
        this._onAddCallbacks = [];
    }
    else if (name === 'onRemove') {
        this._onRemoveCallbacks = [];
    }
    else {
        this._onAddCallbacks = [];
        this._onRemoveCallbacks = [];
    }
};

/* Works correctly for any component having only simple getters and setters. For
 * more complex components, roll out a separate clone function. */
Component.Base.prototype.clone = function() {
    const compType = this.getType();
    if (Component.hasOwnProperty(compType)) {
        const comp = new Component[compType]();
        comp.copy(this);
        return comp;
    }
    else {
        RG.err('Component.Base', 'clone',
            `No type |${compType}| in Component.`);
    }
    return null;
};

/* Works for any component implementing getXXX/setXXX functions. Does a shallow
 * copy of properties only though. */
Component.Base.prototype.copy = function(rhs) {
    for (const p in this) {
        if (/^get/.test(p)) {
            const getter = p;
            if (getter !== 'getEntity' && getter !== 'getID') {
                const setter = getter.replace('get', 'set');
                if (typeof rhs[getter] === 'function') {
                    if (typeof this[setter] === 'function') {
                        const attrVal = rhs[getter]();
                        this[setter](attrVal);
                    }
                }
            }
        }
    }
};

Component.Base.prototype.equals = function(rhs) {
    return this.getType() === rhs.getType();
};

Component.Base.prototype.toString = function() {
    return 'Component: ' + this.getType();
};

/* Creates a simple JSON representation of the component. NOTE: This relies on
 * getters and setters being named similarly, ie getABC/setABC! Don't rely on
 * this function if you need something more sophisticated. */
Component.Base.prototype.toJSON = function() {
    const obj = {};
    for (const p in this) {
        if (/^get/.test(p)) {
            const getter = p;
            if (getter !== 'getEntity') {
                if (typeof this[getter] === 'function') {
                    const setter = getter.replace('get', 'set');
                    if (typeof this[setter] === 'function') {
                        // To de-serialize, we can then do
                        //   obj[setter](json[setter])
                        obj[setter] = this[getter]();
                    }
                }
            }
        }
    }
    return obj;
};

/* Action component is added to all schedulable acting entities.*/
Component.Action = UniqueTransientDataComponent('Action',
    {energy: 0, active: false});

Component.Action.prototype.addEnergy = function(energy) {
    this.energy += energy;
};

Component.Action.prototype.resetEnergy = function() {this.energy = 0;};

Component.Action.prototype.enable = function() {
    if (this.active === false) {
        POOL.emitEvent(RG.EVT_ACT_COMP_ENABLED,
            {actor: this.getEntity()});
        this.active = true;
    }
    else {
        const name = this.getEntity().getName();
        const id = this.getEntity().getID();
        const entInfo = `${name} ${id}`;
        debug(`Action already active for ${entInfo}`);
    }
};

Component.Action.prototype.disable = function() {
    if (this.active === true) {
        POOL.emitEvent(RG.EVT_ACT_COMP_DISABLED,
            {actor: this.getEntity()});
        this.active = false;
    }
};

/* Factory function that should be used instead of new Component[varName]. */
Component.create = function(compName, ...args) {
    if (Component[compName]) {
        return new Component[compName](...args);
    }
    RG.err('Component', 'create',
        `Comp type |${compName}| does not exist.`);
    return null;
};

Component.defineComponent = function(name, args) {
    if (!Component.hasOwnProperty(name)) {
        const CompDecl = DataComponent(name, args);
        Component[name] = CompDecl;
        return CompDecl;
    }
    RG.err('Component', 'defineComponent',
        `Component ${name} already defined`);
    return null;
};

Component.undefineComponent = function(name) {
    delete Component[name];
};

export default Component;

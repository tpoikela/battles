
const RG = require('../rg');
const debug = require('debug')('bitn:System');

//---------------------------------------------------
/** Base class for all systems in ECS framework.
 * @constructor SystemBase
 * @param {string} type - System type
 * @param {array}  compTypes - Types of comps to listen to
 */
//---------------------------------------------------
const SystemBase = function(type, compTypes) {
    if (!Array.isArray(compTypes)) {
        RG.err('System.Base', 'new',
            '2nd arg must be an array of component types');
    }

    this.type = type; // Type of the system
    this.compTypes = compTypes; // Required comps in entity
    this.entities = {}; // Entities requiring processing

    // If set to true, only one comp has to match the compTypes, otherwise all
    // components in compTypes must be present
    this.compTypesAny = false;

    /* Listens to add/removes for each component type in compTypes.*/
    this.hasNotify = true;

    // Add a listener for each specified component type
    for (let i = 0; i < this.compTypes.length; i++) {
        RG.POOL.listenEvent(this.compTypes[i], this);
    }

    this.debugEnabled = debug.enabled;
};

SystemBase.prototype.addEntity = function(entity) {
    this.entities[entity.getID()] = entity;
};

SystemBase.prototype.removeEntity = function(entity) {
    delete this.entities[entity.getID()];
};

SystemBase.prototype.notify = function(evtName, obj) {
    if (obj.hasOwnProperty('add')) {
        if (this.hasCompTypes(obj.entity)) {this.addEntity(obj.entity);}
    }
    else if (obj.hasOwnProperty('remove')) {
        // Must check if any needed comps are still present, before removing
        // the entity
        if (!this.hasCompTypes(obj.entity)) {
            this.removeEntity(obj.entity);
        }
    }
};

/* Returns true if entity has all required component types, or if
 * compTypesAny if set, if entity has any required component. */
SystemBase.prototype.hasCompTypes = function(entity) {
    const compTypes = this.compTypes;
    if (this.compTypesAny === false) { // All types must be present
        for (let i = 0; i < compTypes.length; i++) {
            if (!entity.has(compTypes[i])) {return false;}
        }
        return true;
    }
    else { // Only one compType has to be present
        for (let j = 0; j < compTypes.length; j++) {
            if (entity.has(compTypes[j])) {return true;}
        }
        return false;
    }
};

/* Returns true if there is at least 1 entity to process. */
SystemBase.prototype.hasEntities = function() {
    return Object.keys(this.entities).length > 0;
};

SystemBase.prototype.update = function() {
    for (const e in this.entities) {
        if (!e) {continue;}
        this.updateEntity(this.entities[e]);
    }
};

/* For printing out debug information. */
SystemBase.prototype.dbg = function(msg) {
    if (debug.enabled) {
        const nEnt = Object.keys(this.entities).length;
        let descr = `[System ${this.type.toString()}]`;
        descr += ` nEntities: ${nEnt}`;
        debug(`${descr} ${msg}`);
    }
};

//---------------------------------------------------------
// Non-member functions used for utility in other systems
//---------------------------------------------------------

/* For adding skills experience components. */
SystemBase.addSkillsExp = function addSkillsExp(att, skill, pts = 1) {
    if (att.has('Skills')) {
        const comp = new RG.Component.SkillsExp();
        comp.setSkill(skill);
        comp.setPoints(pts);
        att.add(comp);
    }
};

/* After succesful hit, adds the given comp to specified entity ent. */
SystemBase.addCompToEntAfterHit = function addCompToEntAfterHit(
    comp, ent, src
) {
    const compClone = comp.clone();

    if (compClone.hasOwnProperty('duration')) {
        const compDur = compClone.rollDuration();
        const expiration = new RG.Component.Expiration();
        expiration.addEffect(compClone, compDur);
        ent.add('Expiration', expiration);
    }

    // Source not present in negative buffs like StatsMods/CombatMods,
    // but needed for Poison etc damage
    if (compClone.getSource) {
        const compSrc = compClone.getSource();
        if (RG.isNullOrUndef([compSrc])) {
            compClone.setSource(src);
        }
    }

    ent.add(compClone);
};


module.exports = SystemBase;

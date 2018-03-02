
const RG = require('./rg.js');
const Mixin = require('./mixin');

RG.Chat = require('./chat');
RG.ActorClass = require('./actor-class');

const debug = require('debug')('bitn:Component');

// Used by components which cannot be serialized
// In your component, add the following:
//   this.toJSON = NO_SERIALISATION;
const NO_SERIALISATION = () => null;

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

RG.Component = {};

/* Given an entity, serializes its components. */
RG.Component.compsToJSON = ent => {
    const components = {};
    const thisComps = ent.getComponents();
    Object.keys(thisComps).forEach(name => {
        const compJson = thisComps[name].toJSON();
        if (compJson) {
            components[thisComps[name].getType()] = compJson;
        }
    });
    return components;
};

RG.Component.idCount = 0;

/* Base class for all components. Provides callback hooks, copying and cloning.
 * */
RG.Component.Base = function(type) {
    this._type = type;
    this._entity = null;
    this._id = RG.Component.idCount++;
    this._isUnique = false;

    this._onAddCallbacks = [];
    this._onRemoveCallbacks = [];
};

RG.Component.Base.prototype.getID = function() {return this._id;};
RG.Component.Base.prototype.setID = function(id) {this._id = id;};

RG.Component.Base.prototype.getEntity = function() {return this._entity;};
RG.Component.Base.prototype.setEntity = function(entity) {
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

RG.Component.Base.prototype.isUnique = function() {return this._isUnique;};

RG.Component.Base.prototype.getType = function() {return this._type;};
RG.Component.Base.prototype.setType = function(type) {this._type = type;};

// Called when a component is added to the entity
RG.Component.Base.prototype.entityAddCallback = function(entity) {
    this.setEntity(entity);
    for (let i = 0; i < this._onAddCallbacks.length; i++) {
        this._onAddCallbacks[i]();
    }
};

// Called when a component is removed from the entity
RG.Component.Base.prototype.entityRemoveCallback = function() {
    for (let i = 0; i < this._onRemoveCallbacks.length; i++) {
        this._onRemoveCallbacks[i]();
    }
    this.setEntity(null);
};


RG.Component.Base.prototype.addCallback = function(name, cb) {
    if (name === 'onAdd') {this._onAddCallbacks.push(cb);}
    else if (name === 'onRemove') {this._onRemoveCallbacks.push(cb);}
    else {
        RG.err('Component.Base',
            'addCallback', 'CB name ' + name + ' invalid.');
    }
};

/* Works correctly for any component having only simple getters and setters. For
 * more complex components, roll out a separate clone function. */
RG.Component.Base.prototype.clone = function() {
    const compType = this.getType();
    if (RG.Component.hasOwnProperty(compType)) {
        const comp = new RG.Component[compType]();
        comp.copy(this);
        return comp;
    }
    else {
        RG.err('Component.Base', 'clone',
            `No type |${compType}| in RG.Component.`);
    }
    return null;
};

/* Works for any component implementing getXXX/setXXX functions. Does a shallow
 * copy of properties only though. */
RG.Component.Base.prototype.copy = function(rhs) {
    for (const p in this) {
        if (/^get/.test(p)) {
            const getter = p;
            if (getter !== 'getEntity') {
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

RG.Component.Base.prototype.equals = function(rhs) {
    return this.getType() === rhs.getType();
};

RG.Component.Base.prototype.toString = function() {
    return 'Component: ' + this.getType();
};

/* Creates a simple JSON representation of the component. NOTE: This relies on
 * getters and setters being named identically! Don't rely on this function if
 * you need something more sophisticated. */
RG.Component.Base.prototype.toJSON = function() {
    const obj = {};
    for (const p in this) {
        if (/^get/.test(p)) {
            const getter = p;
            if (getter !== 'getEntity' && getter !== 'getType') {
                if (typeof this[getter] === 'function') {
                    const setter = getter.replace('get', 'set');
                    if (typeof this[setter] === 'function') {
                        // To de-serialize, we can then do
                        //   obj[setter](obj[setter])
                        obj[setter] = this[getter]();
                    }
                }
            }
        }
    }
    return obj;
};

/* Action component is added to all schedulable acting entities.*/
RG.Component.Action = function() {
    RG.Component.Base.call(this, 'Action');

    this._energy = 0;
    this._active = false;
    this.getEnergy = () => this._energy;
    this.setEnergy = energy => {this._energy = energy;};

    this.getActive = () => this._active;
    this.setActive = active => {this._active = active;};

    this.addEnergy = energy => {
        this._energy += energy;
    };

    this.resetEnergy = () => {this._energy = 0;};

    this.enable = function() {
        if (this._active === false) {
            RG.POOL.emitEvent(RG.EVT_ACT_COMP_ENABLED,
                {actor: this.getEntity()});
            this._active = true;
        }
        else {
            const name = this.getEntity().getName();
            const id = this.getEntity().getID();
            const entInfo = `${name} ${id}`;
            debug(`Action already active for ${entInfo}`);
        }
    };

    this.disable = function() {
        if (this._active === true) {
            RG.POOL.emitEvent(RG.EVT_ACT_COMP_DISABLED,
                {actor: this.getEntity()});
            this._active = false;
        }
    };

    this.toJSON = NO_SERIALISATION;

};
RG.extend2(RG.Component.Action, RG.Component.Base);

RG.Component.Action.prototype.entityAddCallback = function(entity) {
    RG.Component.Base.prototype.entityAddCallback.call(this, entity);
};

RG.Component.Action.prototype.entityRemoveCallback = function(entity) {
    RG.Component.Base.prototype.entityRemoveCallback.call(this, entity);
};

/* Component which takes care of hunger and satiation. */
RG.Component.Hunger = function(energy) {
    RG.Component.Base.call(this, 'Hunger');

    let _currEnergy = 20000;
    let _maxEnergy = 20000;
    const _minEnergy = -5000;

    this.getEnergy = () => _currEnergy;
    this.getMaxEnergy = () => _maxEnergy;

    this.setEnergy = energy => {_currEnergy = energy;};
    this.setMaxEnergy = energy => {_maxEnergy = energy;};

    if (!RG.isNullOrUndef([energy])) {
        _currEnergy = energy;
        _maxEnergy = energy;
    }

    this.addEnergy = energy => {
        _currEnergy += energy;
        if (_currEnergy > _maxEnergy) {_currEnergy = _maxEnergy;}
    };

    this.decrEnergy = energy => {
        _currEnergy -= energy;
        if (_currEnergy < _minEnergy) {_currEnergy = _minEnergy;}
    };

    this.isStarving = () => _currEnergy <= 0;

    this.isFull = () => _currEnergy === _maxEnergy;

};
RG.extend2(RG.Component.Hunger, RG.Component.Base);

/* Health component takes care of HP and such. */
RG.Component.Health = function(hp) {
    RG.Component.Base.call(this, 'Health');
    this._isUnique = true;

    let _hp = hp;
    let _maxHP = hp;

    /* Hit points getters and setters.*/
    this.getHP = () => _hp;
    this.setHP = hp => {_hp = hp;};
    this.getMaxHP = () => _maxHP;
    this.setMaxHP = hp => {_maxHP = hp;};

    this.addHP = hp => {
        _hp += hp;
        if (_hp > _maxHP) {_hp = _maxHP;}
    };

    this.decrHP = hp => {_hp -= hp;};

    this.isAlive = () => _hp > 0;
    this.isDead = () => _hp <= 0;

};
RG.extend2(RG.Component.Health, RG.Component.Base);

/* Component which is used to deal damage.*/
RG.Component.Damage = function(dmg, type) {
    RG.Component.Base.call(this, 'Damage');

    let _dmg = dmg;
    let _dmgType = type;
    let _src = null;
    let _weapon = null;

    this.getDamage = () => _dmg;
    this.setDamage = dmg => {_dmg = dmg;};

    this.getDamageType = () => _dmgType;
    this.setDamageType = type => {_dmgType = type;};

    this.getSource = () => _src;
    this.setSource = src => {_src = src;};

    this.getWeapon = () => _weapon;
    this.setWeapon = weapon => {_weapon = weapon;};

};
RG.extend2(RG.Component.Damage, RG.Component.Base);

/* Component used in entities gaining experience.*/
RG.Component.Experience = function() {
    RG.Component.Base.call(this, 'Experience');
    this._isUnique = true;

    let _exp = 0;
    let _expLevel = 1;

    let _danger = 1;

    /* Experience-level methods.*/
    this.setExp = exp => {_exp = exp;};
    this.getExp = () => _exp;
    this.addExp = nExp => {_exp += nExp;};
    this.setExpLevel = expLevel => {_expLevel = expLevel;};
    this.getExpLevel = () => _expLevel;

    this.setDanger = danger => {_danger = danger;};
    this.getDanger = () => _danger;

};
RG.extend2(RG.Component.Experience, RG.Component.Base);

/* This component is added when entity gains experience. It is removed after
* system evaluation and added to Experience component. */
RG.Component.ExpPoints = function(expPoints) {
    RG.Component.Base.call(this, 'ExpPoints');

    let _expPoints = expPoints;
    const _skills = {};

    this.setSkillPoints = (skill, pts) => {
        _skills[skill] = pts;
    };
    this.getSkillPoints = () => _skills;

    this.setExpPoints = exp => {_expPoints = exp;};
    this.getExpPoints = () => _expPoints;
    this.addExpPoints = exp => { _expPoints += exp;};

};
RG.extend2(RG.Component.ExpPoints, RG.Component.Base);

/* This component is used with entities performing any kind of combat.*/
class Combat extends Mixin.CombatAttr(Mixin.DamageRoll(RG.Component.Base)) {

    constructor() {
        super('Combat');
        this._isUnique = true;
        this._attack = 1;
        this._defense = 1;
        this._protection = 0;
        this._range = 1;
    }

}
RG.Component.Combat = Combat;

/* Modifiers for the Combat component.*/
class CombatMods extends Mixin.CombatAttr(RG.Component.Base) {

    constructor() {
        super('CombatMods');
        this._damage = 0;
    }

    setDamage(dmg) {this._damage = dmg;}
    getDamage() {return this._damage;}

}
RG.Component.CombatMods = CombatMods;

/* This component stores entity stats like speed, agility etc.*/
RG.Component.Stats = function() {
    RG.Component.Base.call(this, 'Stats');
    this._isUnique = true;

    let _accuracy = 5;
    let _agility = 5;
    let _strength = 5;
    let _willpower = 5;
    let _perception = 5;
    let _magic = 5;
    let _speed = 100;

    this.clearValues = () => {
        this.setAccuracy(0);
        this.setAgility(0);
        this.setStrength(0);
        this.setWillpower(0);
        this.setPerception(0);
        this.setSpeed(0);
        this.setMagic(0);
    };

    /* These determine the chance of hitting. */
    this.setAccuracy = accu => {_accuracy = accu;};
    this.getAccuracy = () => _accuracy;
    this.setAgility = agil => {_agility = agil;};
    this.getAgility = () => _agility;
    this.setStrength = str => {_strength = str;};
    this.getStrength = () => _strength;
    this.setWillpower = wp => {_willpower = wp;};
    this.getWillpower = () => _willpower;
    this.setPerception = per => {_perception = per;};
    this.getPerception = () => _perception;
    this.setMagic = per => {_magic = per;};
    this.getMagic = () => _magic;

    this.setSpeed = speed => {_speed = speed;};
    this.getSpeed = () => _speed;

    /* Convenience function for increase a stat. */
    this.incrStat = (statName, addValue) => {
        const setter = 'set' + statName.capitalize();
        const getter = 'get' + statName.capitalize();
        const currValue = this[getter]();
        this[setter](currValue + addValue);
    };

};

RG.Component.Stats.prototype.clone = function() {
    const comp = new RG.Component.Stats();
    comp.copy(this);
    return comp;
};

RG.Component.Stats.prototype.copy = function(rhs) {
    RG.Component.Base.prototype.copy.call(this, rhs);
    this.setAccuracy(rhs.getAccuracy());
    this.setAgility(rhs.getAgility());
    this.setStrength(rhs.getStrength());
    this.setWillpower(rhs.getWillpower());
    this.setSpeed(rhs.getSpeed());
    this.setPerception(rhs.getPerception());
    this.setMagic(rhs.getMagic());
};

RG.Component.Stats.prototype.equals = function(rhs) {
    let res = this.getType() === rhs.getType();
    res = res && this.getAccuracy() === rhs.getAccuracy();
    res = res && this.getAgility() === rhs.getAgility();
    res = res && this.getStrength() === rhs.getStrength();
    res = res && this.getWillpower() === rhs.getWillpower();
    res = res && this.getSpeed() === rhs.getSpeed();
    res = res && this.getPerception() === rhs.getPerception();
    res = res && this.getMagic() === rhs.getMagic();
    return res;
};

RG.Component.Stats.prototype.toString = function() {
    let txt = '';
    if (this.getAccuracy()) {txt += 'Acc: ' + this.getAccuracy();}
    if (this.getAgility()) {txt += ' ,Agi: ' + this.getAgility();}
    if (this.getStrength()) {txt += ' ,Str: ' + this.getStrength();}
    if (this.getWillpower()) {txt += ' ,Wil: ' + this.getWillpower();}
    if (this.getPerception()) {txt += ' ,Per: ' + this.getPerception();}
    if (this.getMagic()) {txt += ' ,Mag: ' + this.getMagic();}
    return txt;
};

RG.extend2(RG.Component.Stats, RG.Component.Base);

/* Stats modifier component. */
RG.Component.StatsMods = function() {
    RG.Component.Stats.call(this);
    this._isUnique = false;
    this.setType('StatsMods');
    this.clearValues();
};
RG.extend2(RG.Component.StatsMods, RG.Component.Stats);


/* Attack component is added to the actor when it attacks. Thus, source of the
 * attack is the entity having Attack component. */
RG.Component.Attack = function(target) {
    RG.Component.Base.call(this, 'Attack');

    let _target = target;

    this.setTarget = t => {_target = t;};
    this.getTarget = () => _target;

};
RG.extend2(RG.Component.Attack, RG.Component.Base);

/* Transient component added to a moving entity.*/
class RGComponentMovement extends Mixin.Locatable(RG.Component.Base) {
    constructor(x, y, level) {
        super('Movement');
        this.setXY(x, y);
        this.setLevel(level);
    }
}
RG.extend2(RGComponentMovement, RG.Component.Base);

RG.Component.Movement = RGComponentMovement;

/* Transient component representing a chat action between actors. */
RG.Component.Chat = function() {
    RG.Component.Base.call(this, 'Chat');

    let _args = null;
    this.setArgs = args => {_args = args;};
    this.getArgs = () => _args;

};
RG.extend2(RG.Component.Chat, RG.Component.Base);

/* Transient component representing a chat action between actors. */
RG.Component.Trainer = function() {
    RG.Component.Base.call(this, 'Trainer');

    const _chatObj = new RG.Chat.Trainer();
    this.getChatObj = () => _chatObj;

    const _addCb = () => {
      _chatObj.setTrainer(this.getEntity());
    };

    this.addCallback('onAdd', _addCb);
};
RG.extend2(RG.Component.Trainer, RG.Component.Base);

/* Added to entities which must act as missiles flying through cells.*/
RG.Component.Missile = function(source) {
    RG.Component.Base.call(this, 'Missile');
    if (!source) {
        RG.err('Component.Missile', 'constructor',
            'Source must not be falsy (ie null/undef..)');
    }

    let _x = source.getX();
    let _y = source.getY();
    const _source = source;
    const _level = source.getLevel();
    let _isFlying = true;

    let _targetX = null;
    let _targetY = null;

    let _range = 0;
    let _attack = 0;
    let _dmg = 0;

    let _path = []; // Flying path for the missile
    let _pathIter = -1;

    this.getX = () => _x;
    this.getY = () => _y;
    this.getSource = () => _source;
    this.getLevel = () => _level;

    this.setRange = range => {_range = range;};
    this.hasRange = () => _range > 0;
    this.isFlying = () => _isFlying;
    this.stopMissile = () => {_isFlying = false;};

    this.getAttack = () => _attack;
    this.setAttack = att => {_attack = att;};
    this.getDamage = () => _dmg;
    this.setDamage = dmg => {_dmg = dmg;};

    this.setTargetXY = (x, y) => {
        _path = RG.Geometry.getMissilePath(_x, _y, x, y);
        _targetX = x;
        _targetY = y;
        if (_path.length > 0) {_pathIter = 0;}
    };

    this.getTargetX = () => _targetX;
    this.getTargetY = () => _targetY;

    /* Returns true if missile has reached its target map cell.*/
    this.inTarget = () => _x === _targetX && _y === _targetY;

    const iteratorValid = () => _pathIter >= 0 && _pathIter < _path.length;

    const setValuesFromIterator = () => {
        const coord = _path[_pathIter];
        _x = coord[0];
        _y = coord[1];
    };

    /* Resets the path iterator to the first x,y. */
    this.first = () => {
        _pathIter = 0;
        setValuesFromIterator();
        return [_x, _y];
    };

    /* Moves to next cell in missile's path. Returns null if path is finished.
     * */
    this.next = () => {
        if (iteratorValid()) {
            --_range;
            ++_pathIter;
            setValuesFromIterator();
            return true;
        }
        return null;
    };

    /* Returns the prev cell in missile's path. Moves iterator backward. */
    this.prev = () => {
        if (iteratorValid()) {
            ++_range;
            --_pathIter;
            setValuesFromIterator();
            return true;
        }
        return null;
    };

};
RG.extend2(RG.Component.Missile, RG.Component.Base);

/* This component holds loot that is dropped when given entity is destroyed.*/
RG.Component.Loot = function(lootEntity) {
    RG.Component.Base.call(this, 'Loot');

    // This will be dropped as loot
    const _lootEntity = lootEntity;

    /* Drops the loot to the given cell.*/
    this.dropLoot = function(cell) {
        if (_lootEntity.hasOwnProperty('_propType')) {
            const propType = _lootEntity.getPropType();
            if (propType === 'elements') {
                this.setElemToCell(cell);
            }
            else {
                cell.setProp(propType, _lootEntity);
            }
        }
        else {
            RG.err('Component.Loot', 'dropLoot', 'Loot has no propType!');
        }
    };

    this.setElemToCell = function(cell) {
        const entLevel = this.getEntity().getLevel();
        if (_lootEntity.hasOwnProperty('useStairs')) {
            RG.debug(this, 'Added stairs to ' + cell.getX()
                + ', ' + cell.getY());
            entLevel.addStairs(_lootEntity, cell.getX(), cell.getY());
        }
    };

};
RG.extend2(RG.Component.Loot, RG.Component.Base);

/* This component is added to entities receiving communication. Communication
 * is used to point out enemies and locations of items, for example.*/
RG.Component.Communication = function() {
    RG.Component.Base.call(this, 'Communication');

    const _messages = [];

    this.getMsg = () => _messages;

    /* Adds one message to the communication.*/
    this.addMsg = obj => {
        _messages.push(obj);
    };

};
RG.extend2(RG.Component.Communication, RG.Component.Base);

/* Entities with physical components have weight and size.*/
RG.Component.Physical = function() {
    RG.Component.Base.call(this, 'Physical');
    this._isUnique = true;

    let _weight = 1; // in kg
    let _size = 1; // abstract unit

    this.setWeight = weight => {
        _weight = weight;
    };

    this.getWeight = () => _weight;
    this.setSize = size => {_size = size;};
    this.getSize = () => _size;

};
RG.extend2(RG.Component.Physical, RG.Component.Base);

/* Ethereal entities are visible but don't have normal interaction with
 * matter. */
RG.Component.Ethereal = function() {
    RG.Component.Base.call(this, 'Ethereal');

};
RG.extend2(RG.Component.Ethereal, RG.Component.Base);

/* Stun component prevents actor from taking many actions like moving and
 * attacking. */
RG.Component.Stun = function() {
    RG.Component.Base.call(this, 'Stun');

    let _src = null;
    this.getSource = () => _src;
    this.setSource = src => {_src = src;};

    this.toJSON = () => {
        const obj = RG.Component.Base.prototype.toJSON.call(this);
        obj.setSource = RG.getObjRef('entity', _src);
    };

};
RG.extend2(RG.Component.Stun, RG.Component.Base);

/* Paralysis component prevents actor from taking many actions like moving and
 * attacking. */
RG.Component.Paralysis = function() {
    RG.Component.Base.call(this, 'Paralysis');

    let _src = null;
    this.getSource = () => _src;
    this.setSource = src => {_src = src;};

    this.toJSON = () => {
        const obj = RG.Component.Base.prototype.toJSON.call(this);
        obj.setSource = RG.getObjRef('entity', _src);
    };

};
RG.extend2(RG.Component.Paralysis, RG.Component.Base);

/* MindControl component allows another actor to control the mind-controlled
 * actor. */
RG.Component.MindControl = function() {
    RG.Component.Base.call(this, 'MindControl');

    let _src = null;
    let _brainTarget = null;
    this.getSource = () => _src;
    this.setSource = src => {_src = src;};

    const _addCb = () => {
        _brainTarget = this.getEntity().getBrain();
        this.getEntity().setPlayerCtrl(true);
    };

    const _removeCb = () => {
        this.getEntity().setPlayerCtrl(false);
        this.getEntity().setBrain(_brainTarget);
    };

    this.addCallback('onAdd', _addCb);
    this.addCallback('onRemove', _removeCb);

    this.toJSON = () => {
        const obj = RG.Component.Base.prototype.toJSON.call(this);
        obj.setSource = RG.getObjRef('entity', _src);
    };
};
RG.extend2(RG.Component.MindControl, RG.Component.Base);

/* Poison component which damages the entity.*/
class Poison extends Mixin.DurationRoll(Mixin.DamageRoll(RG.Component.Base)) {

    constructor() {
        super('Poison');
        this._src = null;
        this._prob = 0.05; // Prob. of poison kicking in
    }

    getProb() {return this._prob;}
    setProb(prob) {this._prob = prob;}

    getSource() {return this._src;}
    setSource(src) {this._src = src;}

    copy(rhs) {
        super.copy(rhs);
        this._prob = rhs.getProb();
        this._src = rhs.getSource();
    }

    toJSON() {
        const obj = super.toJSON();
        obj.setType = this.getType();
        obj.setProb = this._prob;
        obj.setSource = RG.getObjRef('entity', this._src);
        return obj;
    }
}
RG.Component.Poison = Poison;

/* For branding stolen goods.*/
RG.Component.Stolen = function() {
    RG.Component.Base.call(this, 'Stolen');
};
RG.extend2(RG.Component.Stolen, RG.Component.Base);

/* Added to unpaid items in shops. Removed once the purchase is done.*/
RG.Component.Unpaid = function() {
    RG.Component.Base.call(this, 'Unpaid');
};
RG.extend2(RG.Component.Unpaid, RG.Component.Base);

/* Expiration component handles expiration of time-based effects. Any component
 * can be made transient by using this Expiration component. For example, to
 * have transient, non-persistent Ethereal, you can use this component. */
RG.Component.Expiration = function() {
    RG.Component.Base.call(this, 'Expiration');

    this._duration = {};

    /* Adds one effect to time-based components.*/
    this.addEffect = function(comp, dur) {
        const compID = comp.getID();
        if (!this._duration.hasOwnProperty(compID)) {
            this._duration[compID] = dur;

            comp.addCallback('onRemove', () => {
                this.removeEffect(comp);
            });
        }
        else { // increase existing duration
            this._duration[compID] += dur;
        }
    };

    /* Decreases duration of all time-based effects.*/
    this.decrDuration = function() {
        for (const compID in this._duration) {
            if (compID >= 0) {
                this._duration[compID] -= 1;
                if (this._duration[compID] === 0) {
                    const ent = this.getEntity();
                    const compIDInt = parseInt(compID, 10);
                    ent.remove(compIDInt);
                    delete this._duration[compID];
                }
            }
        }
    };

    /* Returns true if component has any time-effects with non-zero duration.*/
    this.hasEffects = function() {
        return Object.keys(this._duration).length > 0;
    };

    this.hasEffect = function(comp) {
        const compID = comp.getID();
        return this._duration.hasOwnProperty(compID);
    };

    /* Should be called to remove a specific effect, for example upon death of
     * an actor. */
    this.removeEffect = function(comp) {
        const compID = comp.getID();
        if (this._duration.hasOwnProperty(compID)) {
            delete this._duration[compID];
        }
    };

    this.getDuration = () => this._duration;
    this.setDuration = duration => {this._duration = duration;};
};
RG.extend2(RG.Component.Expiration, RG.Component.Base);

RG.Component.Indestructible = function() {
    RG.Component.Base.call(this, 'Indestructible');
};
RG.extend2(RG.Component.Indestructible, RG.Component.Base);

RG.Component.Ammo = function() {
    RG.Component.Base.call(this, 'Ammo');
};
RG.extend2(RG.Component.Ammo, RG.Component.Base);

/* Component added to anything that flies. */
RG.Component.Flying = function() {
    RG.Component.Base.call(this, 'Flying');
};
RG.extend2(RG.Component.Flying, RG.Component.Base);

/* Component added to anything Undead. */
RG.Component.Undead = function() {
    RG.Component.Base.call(this, 'Undead');
};
RG.extend2(RG.Component.Undead, RG.Component.Base);

/* Component added to summoned entities. */
RG.Component.Summoned = function() {
    RG.Component.Base.call(this, 'Summoned');
};
RG.extend2(RG.Component.Summoned, RG.Component.Base);

RG.Component.Sharpener = function() {
    RG.Component.Base.call(this, 'Sharpener');
};
RG.extend2(RG.Component.Sharpener, RG.Component.Base);

/* Component which stores the actor class object. */
RG.Component.ActorClass = function() {
    RG.Component.Base.call(this, 'ActorClass');

    let _class = null;
    let _className = null;

    this.setClassName = name => {
        _className = name;
    };

    this.getClassName = () => _className;

    this.getClass = () => _class;

    const _addCb = () => {
        _class = RG.ActorClass.create(_className, this.getEntity());
    };

    this.addCallback('onAdd', _addCb);
};
RG.extend2(RG.Component.ActorClass, RG.Component.Base);

//---------------------------------------------------------------------------
// MELEE COMBAT COMPONENTS
//---------------------------------------------------------------------------

/* Component which gives a defender bonus (+1 for each enemy). */
RG.Component.Defender = function() {
    RG.Component.Base.call(this, 'Defender');
};
RG.extend2(RG.Component.Defender, RG.Component.Base);

/* Component which gives an attack bonus (+1 for each enemy). */
RG.Component.Attacker = function() {
    RG.Component.Base.call(this, 'Attacker');
};
RG.extend2(RG.Component.Attacker, RG.Component.Base);

/* Component which gives an actor bi-directional melee strike. */
RG.Component.BiDirStrike = function() {
    RG.Component.Base.call(this, 'BiDirStrike');
};
RG.extend2(RG.Component.BiDirStrike, RG.Component.Base);

/* Component which gives an actor bi-directional melee strike. */
RG.Component.CounterAttack = function() {
    RG.Component.Base.call(this, 'CounterAttack');
};
RG.extend2(RG.Component.CounterAttack, RG.Component.Base);

/* Component which gives reduces equipment weight by 50%. */
RG.Component.MasterEquipper = function() {
    RG.Component.Base.call(this, 'MasterEquipper');

    let _factor = 0.5;
    this.setFactor = factor => {_factor = factor;};
    this.getFactor = () => _factor;

};
RG.extend2(RG.Component.MasterEquipper, RG.Component.Base);

/* Component which gives an actor power to wield two weapons (if not using
 * shield). */
RG.Component.Ambidexterity = function() {
    RG.Component.Base.call(this, 'Ambidexterity');
};
RG.extend2(RG.Component.Ambidexterity, RG.Component.Base);

/* Gives ability to strike melee hits from distance (generally with a range of 2
 * instead of 1. */
RG.Component.LongReach = function() {
    RG.Component.Base.call(this, 'LongReach');
};
RG.extend2(RG.Component.LongReach, RG.Component.Base);

//--------------------------------------------
// RANGED COMBAT COMPONENTS
//--------------------------------------------

RG.Component.EagleEye = function() {
    RG.Component.Base.call(this, 'EagleEye');
};
RG.extend2(RG.Component.EagleEye, RG.Component.Base);

RG.Component.StrongShot = function() {
    RG.Component.Base.call(this, 'StrongShot');
};
RG.extend2(RG.Component.StrongShot, RG.Component.Base);

RG.Component.ThroughShot = function() {
    RG.Component.Base.call(this, 'ThroughShot');
};
RG.extend2(RG.Component.ThroughShot, RG.Component.Base);

RG.Component.MixedShot = function() {
    RG.Component.Base.call(this, 'MixedShot');
};
RG.extend2(RG.Component.MixedShot, RG.Component.Base);

RG.Component.LongRangeShot = function() {
    RG.Component.Base.call(this, 'LongRangeShot');
};
RG.extend2(RG.Component.LongRangeShot, RG.Component.Base);

RG.Component.RangedEvasion = function() {
    RG.Component.Base.call(this, 'RangedEvasion');
};
RG.extend2(RG.Component.RangedEvasion, RG.Component.Base);

RG.Component.CriticalShot = function() {
    RG.Component.Base.call(this, 'CriticalShot');
};
RG.extend2(RG.Component.CriticalShot, RG.Component.Base);

RG.Component.DoubleShot = function() {
    RG.Component.Base.call(this, 'DoubleShot');
};
RG.extend2(RG.Component.DoubleShot, RG.Component.Base);
//--------------------------------------------
// Spellcasting related components
//--------------------------------------------

RG.Component.SpellPower = function(maxPP) {
    RG.Component.Base.call(this, 'SpellPower');
    this._isUnique = true;

    let _maxPP = maxPP || 10;
    let _pp = _maxPP;

    /* Spell power points getters and setters.*/
    this.getPP = () => _pp;
    this.setPP = pp => {_pp = pp;};
    this.getMaxPP = () => _maxPP;
    this.setMaxPP = pp => {_maxPP = pp;};

    this.addPP = pp => {
        _pp += pp;
        if (_pp > _maxPP) {_pp = _maxPP;}
    };

    this.decrPP = pp => {_pp -= pp;};

    this.hasPower = () => _pp > 0;
    this.canCast = spellPP => _pp >= spellPP;

};
RG.extend2(RG.Component.SpellPower, RG.Component.Base);

/* PowerDrain component which is cancels a SpellCast and adds spell power to
 * holder of PowerDrain. */
RG.Component.PowerDrain = function() {
    RG.Component.Base.call(this, 'PowerDrain');

    this.drainDist = 5;
};
RG.extend2(RG.Component.PowerDrain, RG.Component.Base);

RG.Component.SpellBase = function(type) {
    RG.Component.Base.call(this, type);

    let _spell = null;
    let _src = null;
    let _args = null;

    this.getSpell = () => _spell;
    this.setSpell = spell => {_spell = spell;};

    this.getSource = () => _src;
    this.setSource = src => {_src = src;};

    this.getArgs = () => _args;
    this.setArgs = args => {_args = args;};

};
RG.extend2(RG.Component.SpellBase, RG.Component.Base);

/* SpellCasting component which is added to an actor when it casts a spell. */
RG.Component.SpellCast = function() {
    RG.Component.SpellBase.call(this, 'SpellCast');
};
RG.extend2(RG.Component.SpellCast, RG.Component.SpellBase);

RG.Component.SpellRay = function() {
    RG.Component.SpellBase.call(this, 'SpellRay');
};
RG.extend2(RG.Component.SpellRay, RG.Component.SpellBase);

RG.Component.SpellMissile = function() {
    RG.Component.SpellBase.call(this, 'SpellMissile');
};
RG.extend2(RG.Component.SpellMissile, RG.Component.SpellBase);

RG.Component.SpellCell = function() {
    RG.Component.SpellBase.call(this, 'SpellCell');
};
RG.extend2(RG.Component.SpellCell, RG.Component.SpellBase);

RG.Component.SpellArea = function() {
    RG.Component.SpellBase.call(this, 'SpellArea');
};
RG.extend2(RG.Component.SpellArea, RG.Component.SpellBase);

//--------------------------------------------
// Adventurer components
//--------------------------------------------

/* Triples the energy gained from eating foods. */
RG.Component.NourishedOne = function() {
    RG.Component.Base.call(this, 'NourishedOne');
};
RG.extend2(RG.Component.NourishedOne, RG.Component.Base);

//--------------------------------------------
// Spirit-related components
//--------------------------------------------

RG.Component.SpiritBind = function() {
    RG.Component.Base.call(this, 'SpiritBind');

    let _binder = null;
    let _target = null;

    this.getTarget = () => _target;
    this.getBinder = () => _binder;
    this.setTarget = (target) => {_target = target;};
    this.setBinder = (binder) => {_binder = binder;};

};
RG.extend2(RG.Component.SpiritBind, RG.Component.Base);

/* This component enables entity to bind gems into items. */
RG.Component.GemBound = function() {
    RG.Component.Base.call(this, 'GemBound');

    let _gem = null;

    this.setGem = gem => {_gem = gem;};
    this.getGem = () => _gem;

    this.toJSON = function() {
        return {
            setGem: {
                createFunc: 'createItem',
                value: _gem.toJSON()
            }
        };
    };
};
RG.extend2(RG.Component.GemBound, RG.Component.Base);

/* This component enables entity to bind gems into items. */
RG.Component.SpiritItemCrafter = function() {
    RG.Component.Base.call(this, 'SpiritItemCrafter');
};
RG.extend2(RG.Component.SpiritItemCrafter, RG.Component.Base);

//--------------------------------------------
// Comps related to the skill system
//--------------------------------------------

RG.Component.Skills = function() {
    RG.Component.Base.call(this, 'Skills');
    this._isUnique = true;

    this._skills = {};

    this.hasSkill = skill => this._skills.hasOwnProperty(skill);
    this.addSkill = skill => {
        this._skills[skill] = {name: skill, level: 1, points: 0};
    };

    /* Returns the skill level, or 0 if no skill exists. */
    this.getLevel = skill => {
        if (this.hasSkill(skill)) {
            return this._skills[skill].level;
        }
        return 0;
    };
    this.setLevel = (skill, level) => {this._skills[skill].level = level;};
    this.getPoints = skill => this._skills[skill].points;

    this.resetPoints = skill => {this._skills[skill].points = 0;};
    this.addPoints = (skill, points) => {
        if (this.hasSkill(skill)) {
            this._skills[skill].points += points;
        }
    };

    this.getSkills = () => this._skills;
    this.setSkills = skills => {this._skills = skills;};

    this.toJSON = () => {
        return {
            setSkills: this._skills
        };
    };
};
RG.extend2(RG.Component.Skills, RG.Component.Base);

RG.Component.SkillsExp = function() {
    RG.Component.Base.call(this, 'SkillsExp');

    this._skill = '';
    this._points = 0;

    this.getSkill = () => this._skill;
    this.getPoints = () => this._points;
    this.setSkill = skill => {this._skill = skill;};
    this.setPoints = points => {this._points = points;};

};
RG.extend2(RG.Component.SkillsExp, RG.Component.Base);

/* Component which models a shop transaction. */
RG.Component.Transaction = function() {
    RG.Component.Base.call(this, 'Transaction');

    this._args = null;

    this.setArgs = args => {this._args = args;};
    this.getArgs = () => this._args;

};
RG.extend2(RG.Component.Transaction, RG.Component.Base);


//--------------------------------------------
// Battle-related components
//--------------------------------------------

// Added to all entities inside a battle
RG.Component.InBattle = function() {
    RG.Component.Base.call(this, 'InBattle');
    this._isUnique = true;
    let _data = null;
    this.setData = data => {_data = data;};
    this.getData = () => _data;
    this.updateData = data => {_data = Object.assign(_data || {}, data);};
};
RG.extend2(RG.Component.InBattle, RG.Component.Base);

/* Added to entity once it uses a skill or destroys an opposing actor inside a
 * battle. */
RG.Component.BattleExp = function() {
    RG.Component.Base.call(this, 'BattleExp');

    let _data = null;

    this.setData = data => {_data = data;};
    this.getData = () => _data;
    this.updateData = data => {_data = Object.assign(_data, data);};

};
RG.extend2(RG.Component.BattleExp, RG.Component.Base);

/* This component is placed on entities when the battle is over. It signals to
 * the Battle.System that experience should be processed now. After this, the
 * system processed and removed this and BattleExp components. */
RG.Component.BattleOver = function() {
    RG.Component.Base.call(this, 'BattleOver');
    this._isUnique = true;
};
RG.extend2(RG.Component.BattleOver, RG.Component.Base);

/* Badges are placed on entities that survived a battle. */
RG.Component.BattleBadge = function() {
    RG.Component.Base.call(this, 'BattleBadge');

    let _data = null;

    this.setData = data => {_data = data;};
    this.getData = () => _data;
    this.updateData = data => {_data = Object.assign(_data, data);};

    this.isWon = () => _data.status === 'Won';
    this.isLost = () => _data.status === 'Lost';
};
RG.extend2(RG.Component.BattleBadge, RG.Component.Base);

/* Used for battle commanders. */
RG.Component.Commander = function() {
    RG.Component.Base.call(this, 'Commander');
};
RG.extend2(RG.Component.Commander, RG.Component.Base);

/* This component is added to entity when it gains reputation in some event, and
 * it keeps track of the amount and type of reputation. */
RG.Component.Reputation = function() {
    RG.Component.Base.call(this, 'Reputation');

    let _data = null;

    this.setData = data => {_data = data;};
    this.getData = () => _data;
    this.updateData = data => {_data = Object.assign(_data, data);};

    this.addToFame = nFame => {
        if (!_data) {_data = {};}
        if (_data.hasOwnProperty('fame')) {
            _data.fame += nFame;
        }
        else {
            _data.fame = nFame;
        }
    };
};
RG.extend2(RG.Component.Reputation, RG.Component.Base);

RG.Component.Event = function(args) {
    RG.Component.Base.call(this, 'Event');
    let _args = args;

    this.getArgs = () => _args;
    this.setArgs = args => {_args = args;};

};
RG.extend2(RG.Component.Event, RG.Component.Base);

//--------------------------------------------
// Comps that add or remove other components
//--------------------------------------------

RG.Component.AddOnHit = function() {
    RG.Component.Base.call(this, 'AddOnHit');

    let _comp = null;

    this.setComp = comp => {_comp = comp;};
    this.getComp = () => _comp;

    this.toJSON = () => {
        const json = _comp.toJSON();
        return {setComp: {createComp: json}};
    };
};
RG.extend2(RG.Component.AddOnHit, RG.Component.Base);

RG.Component.Animation = function(args) {
    RG.Component.Base.call(this, 'Animation');
    let _args = args;

    this.getArgs = () => _args;
    this.setArgs = args => {_args = args;};

};
RG.extend2(RG.Component.Animation, RG.Component.Base);

/* Adds a component into expiration component for given entity. */
RG.Component.addToExpirationComp = (entity, comp, dur) => {
    if (entity.has('Expiration')) {
        entity.get('Expiration').addEffect(comp, dur);
    }
    else {
        const expComp = new RG.Component.Expiration();
        expComp.addEffect(comp, dur);
        entity.add(expComp);
    }
    entity.add(comp);
};

//---------------------------------------------------------------------------
// BASE ACTIONS (transient components, not serialized, stored ever)
//---------------------------------------------------------------------------

/* Added to entity when it's picking up something. */
RG.Component.Pickup = function() {
    RG.Component.Base.call(this, 'Pickup');
    this.toJSON = NO_SERIALISATION;
};
RG.extend2(RG.Component.Pickup, RG.Component.Base);

/* Added to entity when it's using stairs to move to another level. */
RG.Component.UseStairs = function() {
    RG.Component.Base.call(this, 'UseStairs');
    this.toJSON = NO_SERIALISATION;
};
RG.extend2(RG.Component.UseStairs, RG.Component.Base);

/* Added to entity when it's opening a door. */
RG.Component.OpenDoor = function() {
    RG.Component.Base.call(this, 'OpenDoor');
    this.toJSON = NO_SERIALISATION;

    this._door = null;

    this.setDoor = door => {
        this._door = door;
    };

    this.getDoor = () => this._door;
};
RG.extend2(RG.Component.OpenDoor, RG.Component.Base);

module.exports = RG.Component;


const RG = require('./rg.js');
const Mixin = require('./mixin');

//---------------------------------------------------------------------------
// ECS COMPONENTS
//---------------------------------------------------------------------------

/* Important Guidelines: Each component constructor must NOT take any
 * parameters. Call Base constructor with the type. (which must be identical
 * to the Object type).
 * To benefit from serialisation, all methods should be named:
 * setXXX - getXXX
 */

RG.Component = {};

RG.Component.Base = function(type) {

    let _type = type;
    let _entity = null;

    this._onAddCallbacks = [];
    this._onRemoveCallbacks = [];

    this.getType = function() {return _type;};
    this.setType = function(type) {_type = type;};

    this.getEntity = function() {return _entity;};
    this.setEntity = function(entity) {
        if (_entity === null && entity !== null) {
            _entity = entity;
        }
        else if (entity === null) {
            _entity = null;
        }
        else {
            RG.err('Component', 'setEntity', 'Entity already set.');
        }
    };
};
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

    let _energy = 0;
    let _active = false;
    this.getEnergy = function() {return _energy;};
    this.setEnergy = function(energy) {_energy = energy;};

    this.getActive = function() {return _active;};
    this.setActive = function(active) {_active = active;};

    this.addEnergy = function(energy) {
        _energy += energy;
    };

    this.resetEnergy = function() {_energy = 0;};

    this.enable = function() {
        if (_active === false) {
            RG.POOL.emitEvent(RG.EVT_ACT_COMP_ENABLED,
                {actor: this.getEntity()});
            _active = true;
        }
    };

    this.disable = function() {
        if (_active === true) {
            RG.POOL.emitEvent(RG.EVT_ACT_COMP_DISABLED,
                {actor: this.getEntity()});
            _active = false;
        }
    };

};
RG.extend2(RG.Component.Action, RG.Component.Base);

RG.Component.Action.prototype.entityAddCallback = function(entity) {
    RG.Component.Base.prototype.entityAddCallback.call(this, entity);
    // RG.POOL.emitEvent(RG.EVT_ACT_COMP_ADDED, {actor: entity});
};

RG.Component.Action.prototype.entityRemoveCallback = function(entity) {
    RG.Component.Base.prototype.entityRemoveCallback.call(this, entity);
    // RG.POOL.emitEvent(RG.EVT_ACT_COMP_REMOVED, {actor: entity});
};

/* Component which takes care of hunger and satiation. */
RG.Component.Hunger = function(energy) {
    RG.Component.Base.call(this, 'Hunger');

    let _currEnergy = 20000;
    let _maxEnergy = 20000;
    const _minEnergy = -5000;

    this.getEnergy = function() {return _currEnergy;};
    this.getMaxEnergy = function() {return _maxEnergy;};

    this.setEnergy = function(energy) {_currEnergy = energy;};
    this.setMaxEnergy = function(energy) {_maxEnergy = energy;};

    if (!RG.isNullOrUndef([energy])) {
        _currEnergy = energy;
        _maxEnergy = energy;
    }

    this.addEnergy = function(energy) {
        _currEnergy += energy;
        if (_currEnergy > _maxEnergy) {_currEnergy = _maxEnergy;}
    };

    this.decrEnergy = function(energy) {
        _currEnergy -= energy;
        if (_currEnergy < _minEnergy) {_currEnergy = _minEnergy;}
    };

    this.isStarving = function() {
        return _currEnergy <= 0;
    };

    this.isFull = function() {return _currEnergy === _maxEnergy;};

};
RG.extend2(RG.Component.Hunger, RG.Component.Base);

/* Health component takes care of HP and such. */
RG.Component.Health = function(hp) {
    RG.Component.Base.call(this, 'Health');

    let _hp = hp;
    let _maxHP = hp;

    /* Hit points getters and setters.*/
    this.getHP = function() {return _hp;};
    this.setHP = function(hp) {_hp = hp;};
    this.getMaxHP = function() {return _maxHP;};
    this.setMaxHP = function(hp) {_maxHP = hp;};

    this.addHP = function(hp) {
        _hp += hp;
        if (_hp > _maxHP) {_hp = _maxHP;}
    };

    this.decrHP = function(hp) {_hp -= hp;};

    this.isAlive = function() {return _hp > 0;};
    this.isDead = function() {return _hp <= 0;};

};
RG.extend2(RG.Component.Health, RG.Component.Base);

/* Component which is used to deal damage.*/
RG.Component.Damage = function(dmg, type) {
    RG.Component.Base.call(this, 'Damage');

    let _dmg = dmg;
    let _dmgType = type;
    let _src = null;
    let _weapon = null;

    this.getDamage = function() {return _dmg;};
    this.setDamage = function(dmg) {_dmg = dmg;};

    this.getDamageType = function() {return _dmgType;};
    this.setDamageType = function(type) {_dmgType = type;};

    this.getSource = function() {return _src;};
    this.setSource = function(src) {_src = src;};

    this.getWeapon = function() {return _weapon;};
    this.setWeapon = function(weapon) {_weapon = weapon;};

};
RG.extend2(RG.Component.Damage, RG.Component.Base);

/* Component used in entities gaining experience.*/
RG.Component.Experience = function() {
    RG.Component.Base.call(this, 'Experience');

    let _exp = 0;
    let _expLevel = 1;

    let _danger = 1;

    /* Experience-level methods.*/
    this.setExp = function(exp) {_exp = exp;};
    this.getExp = function() {return _exp;};
    this.addExp = function(nExp) {_exp += nExp;};
    this.setExpLevel = function(expLevel) {_expLevel = expLevel;};
    this.getExpLevel = function() {return _expLevel;};

    this.setDanger = function(danger) {_danger = danger;};
    this.getDanger = function() {return _danger;};

};
RG.extend2(RG.Component.Experience, RG.Component.Base);

/* This component is added when entity gains experience. It is removed after
* system evaluation and added to Experience component. */
RG.Component.ExpPoints = function(expPoints) {
    RG.Component.Base.call(this, 'ExpPoints');

    let _expPoints = expPoints;
    const _skills = {};

    this.setSkillPoints = function(skill, pts) {
        _skills[skill] = pts;
    };
    this.getSkillPoints = function() {return _skills;};

    this.setExpPoints = function(exp) {_expPoints = exp;};
    this.getExpPoints = function() {return _expPoints;};
    this.addExpPoints = function(exp) { _expPoints += exp;};

};
RG.extend2(RG.Component.ExpPoints, RG.Component.Base);

/* This component is used with entities performing any kind of combat.*/
class Combat extends Mixin.CombatAttr(Mixin.DamageRoll(RG.Component.Base)) {

    constructor() {
        super('Combat');
        this._attack = 1;
        this._defense = 1;
        this._protection = 0;
        this._range = 1;
    }


}
RG.Component.Combat = Combat;

/* Modifiers for the Combat component.*/
class CombatMods extends Mixin.CombatAttr(RG.Component.Base) {

    constructor(args) {
        super(args);
        this._damage = 0;
    }

    setDamage(dmg) {this._damage = dmg;}
    getDamage() {return this._damage;}
}
RG.Component.CombatMods = CombatMods;

/* This component stores entity stats like speed, agility etc.*/
RG.Component.Stats = function() {
    RG.Component.Base.call(this, 'Stats');

    let _accuracy = 5;
    let _agility = 5;
    let _strength = 5;
    let _willpower = 5;
    let _perception = 5;
    let _speed = 100;

    /* These determine the chance of hitting. */
    this.setAccuracy = function(accu) {_accuracy = accu;};
    this.getAccuracy = function() {return _accuracy;};
    this.setAgility = function(agil) {_agility = agil;};
    this.getAgility = function() {return _agility;};
    this.setStrength = function(str) {_strength = str;};
    this.getStrength = function() {return _strength;};
    this.setWillpower = function(wp) {_willpower = wp;};
    this.getWillpower = function() {return _willpower;};
    this.setPerception = function(per) {_perception = per;};
    this.getPerception = function() {return _perception;};

    this.setSpeed = function(speed) {_speed = speed;};
    this.getSpeed = function() {return _speed;};

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
};

RG.Component.Stats.prototype.equals = function(rhs) {
    let res = this.getType() === rhs.getType();
    res = res && this.getAccuracy() === rhs.getAccuracy();
    res = res && this.getAgility() === rhs.getAgility();
    res = res && this.getStrength() === rhs.getStrength();
    res = res && this.getWillpower() === rhs.getWillpower();
    res = res && this.getSpeed() === rhs.getSpeed();
    res = res && this.getPerception() === rhs.getPerception();
    return res;
};

RG.Component.Stats.prototype.toString = function() {
    let txt = '';
    if (this.getAccuracy()) {txt += 'Acc: ' + this.getAccuracy();}
    if (this.getAgility()) {txt += ' ,Agi: ' + this.getAgility();}
    if (this.getStrength()) {txt += ' ,Str: ' + this.getStrength();}
    if (this.getWillpower()) {txt += ' ,Wil: ' + this.getWillpower();}
    if (this.getPerception()) {txt += ' ,Per: ' + this.getPerception();}
    return txt;
};

RG.extend2(RG.Component.Stats, RG.Component.Base);

/* Stats modifier component. */
RG.Component.StatsMods = function() {
    RG.Component.Stats.call(this);
    this.setType('StatsMods');
    this.setAccuracy(0);
    this.setAgility(0);
    this.setStrength(0);
    this.setWillpower(0);
    this.setPerception(0);
    this.setSpeed(0);
};
RG.extend2(RG.Component.StatsMods, RG.Component.Stats);


/* Attack component is added to the actor when it attacks. Thus, source of the
 * attack is the entity having Attack component. */
RG.Component.Attack = function(target) {
    RG.Component.Base.call(this, 'Attack');

    let _target = target;

    this.setTarget = function(t) {_target = t;};
    this.getTarget = function() {return _target;};

};
RG.extend2(RG.Component.Attack, RG.Component.Base);

/* Transient component added to a moving entity.*/
RG.Component.Movement = function(x, y, level) {
    RG.Object.Locatable.call(this);
    RG.Component.Base.call(this, 'Movement');

    this.setXY(x, y);
    this.setLevel(level);

};
RG.extend2(RG.Component.Movement, RG.Object.Locatable);
RG.extend2(RG.Component.Movement, RG.Component.Base);

/* Added to entities which must act as missiles flying through cells.*/
RG.Component.Missile = function(source) {
    RG.Component.Base.call(this, 'Missile');

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

    this.getX = function() {return _x;};
    this.getY = function() {return _y;};
    this.getSource = function() {return _source;};
    this.getLevel = function() {return _level;};

    this.setRange = function(range) {_range = range;};
    this.hasRange = function() {return _range > 0;};
    this.isFlying = function() {return _isFlying;};
    this.stopMissile = function() {_isFlying = false;};

    this.getAttack = function() {return _attack;};
    this.setAttack = function(att) {_attack = att;};
    this.getDamage = function() {return _dmg;};
    this.setDamage = function(dmg) {_dmg = dmg;};

    this.setTargetXY = function(x, y) {
        _path = RG.getShortestPath(_x, _y, x, y);
        _targetX = x;
        _targetY = y;
        if (_path.length > 0) {_pathIter = 0;}
    };

    this.getTargetX = function() {return _targetX;};
    this.getTargetY = function() {return _targetY;};

    /* Returns true if missile has reached its target map cell.*/
    this.inTarget = function() {
        return _x === _targetX && _y === _targetY;
    };

    const iteratorValid = function() {
        return _pathIter >= 0 && _pathIter < _path.length;
    };

    const setValuesFromIterator = function() {
        const coord = _path[_pathIter];
        _x = coord.x;
        _y = coord.y;
    };

    /* Resets the path iterator to the first x,y. */
    this.first = function() {
        _pathIter = 0;
        setValuesFromIterator();
        return [_x, _y];
    };

    /* Moves to next cell in missile's path. Returns null if path is finished.
     * */
    this.next = function() {
        if (iteratorValid()) {
            --_range;
            ++_pathIter;
            setValuesFromIterator();
            return true;
        }
        return null;
    };

    /* Returns the prev cell in missile's path. Moves iterator backward. */
    this.prev = function() {
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

    this.getMsg = function() {return _messages;};

    /* Adds one message to the communication.*/
    this.addMsg = function(obj) {
        _messages.push(obj);
    };

};
RG.extend2(RG.Component.Communication, RG.Component.Base);

/* Entities with physical components have weight and size.*/
RG.Component.Physical = function() {
    RG.Component.Base.call(this, 'Physical');

    let _weight = 1; // in kg
    let _size = 1; // abstract unit

    this.setWeight = function(weight) {
        _weight = weight;
    };

    this.getWeight = function() {return _weight;};
    this.setSize = function(size) {_size = size;};
    this.getSize = function() {return _size;};

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
    this.getSource = function() {return _src;};
    this.setSource = function(src) {_src = src;};

};
RG.extend2(RG.Component.Stun, RG.Component.Base);

/* Paralysis component prevents actor from taking many actions like moving and
 * attacking. */
RG.Component.Paralysis = function() {
    RG.Component.Base.call(this, 'Paralysis');

    let _src = null;
    this.getSource = function() {return _src;};
    this.setSource = function(src) {_src = src;};

};
RG.extend2(RG.Component.Paralysis, RG.Component.Base);

/* MindControl component allows another actor to control the mind-controlled
 * actor. */
RG.Component.MindControl = function() {
    RG.Component.Base.call(this, 'MindControl');

    let _src = null;
    let _brainTarget = null;
    this.getSource = function() {return _src;};
    this.setSource = function(src) {_src = src;};

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
        const type = comp.getType();
        if (!this._duration.hasOwnProperty(type)) {
            this._duration[type] = dur;

            comp.addCallback('onRemove', () => {
                this.removeEffect(comp);
            });
        }
        else { // increase existing duration
            this._duration[type] += dur;
        }
    };

    /* Decreases duration of all time-based effects.*/
    this.decrDuration = function() {
        for (const compType in this._duration) {
            if (compType) {
                this._duration[compType] -= 1;
                if (this._duration[compType] === 0) {
                    const ent = this.getEntity();
                    ent.remove(compType);
                    delete this._duration[compType];
                }
            }
        }
    };

    /* Returns true if component has any time-effects with non-zero duration.*/
    this.hasEffects = function() {
        return Object.keys(this._duration).length > 0;
    };

    this.hasEffect = function(comp) {
        const compType = comp.getType();
        return this._duration.hasOwnProperty(compType);
    };

    /* SHould be called to remove a specific effect, for example upon death of
     * an actor. */
    this.removeEffect = function(comp) {
        const compType = comp.getType();
        if (this._duration.hasOwnProperty(compType)) {
            delete this._duration[compType];
        }

    };
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

    this.setClass = function(classObj) {
        _class = classObj;
    };

    this.getClass = () => _class;
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
// Spellcasting related components
//--------------------------------------------

RG.Component.SpellPower = function(maxPP) {
    RG.Component.Base.call(this, 'SpellPower');

    let _maxPP = maxPP || 10;
    let _pp = _maxPP;

    /* Spell power points getters and setters.*/
    this.getPP = function() {return _pp;};
    this.setPP = function(pp) {_pp = pp;};
    this.getMaxPP = function() {return _maxPP;};
    this.setMaxPP = function(pp) {_maxPP = pp;};

    this.addPP = function(pp) {
        _pp += pp;
        if (_pp > _maxPP) {_pp = _maxPP;}
    };

    this.decrPP = function(pp) {_pp -= pp;};

    this.hasPower = function() {return _pp > 0;};
    this.canCast = function(spellPP) {return _pp >= spellPP;};

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

    this.getSpell = function() {return _spell;};
    this.setSpell = function(spell) {_spell = spell;};

    this.getSource = function() {return _src;};
    this.setSource = function(src) {_src = src;};

    this.getArgs = function() {return _args;};
    this.setArgs = function(args) {_args = args;};

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

//--------------------------------------------
// Comps that add or remove other components
//--------------------------------------------

RG.Component.AddOnHit = function() {
    RG.Component.Base.call(this, 'AddOnHit');

    let _comp = null;

    this.setComp = function(comp) {_comp = comp;};
    this.getComp = function() {return _comp;};
};
RG.extend2(RG.Component.AddOnHit, RG.Component.Base);


RG.Component.Animation = function(args) {
    RG.Component.Base.call(this, 'Animation');
    let _args = args;

    this.getArgs = function() {return _args;};
    this.setArgs = function(args) {_args = args;};

};
RG.extend2(RG.Component.Animation, RG.Component.Base);

module.exports = RG.Component;

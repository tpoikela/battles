
var RG = require("./rg.js");

//---------------------------------------------------------------------------
// ECS COMPONENTS
//---------------------------------------------------------------------------

RG.Component = {};

RG.Component.Base = function(type) {

    var _type = type;
    var _entity = null;

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
            RG.err("Component", "setEntity", "Entity already set.");
        }
    };


};
// Called when a component is added to the entity
RG.Component.Base.prototype.entityAddCallback = function(entity) {
    this.setEntity(entity);
    //RG.POOL.emitEvent(this.getType(), {add:true, entity: entity});
    for (var i = 0; i < this._onAddCallbacks.length; i++) {
        this._onAddCallbacks[i]();
    }
};

// Called when a component is removed from the entity
RG.Component.Base.prototype.entityRemoveCallback = function(entity) {
    this.setEntity(null);
    //RG.POOL.emitEvent(this.getType(), {remove:true, entity: entity});
    for (var i = 0; i < this._onRemoveCallbacks.length; i++) {
        this._onRemoveCallbacks[i]();
    }
};


RG.Component.Base.prototype.addCallback = function(name, cb) {
    if (name === "onAdd") this._onAddCallbacks.push(cb);
    else if (name === "onRemove") this._onRemoveCallbacks.push(cb);
    else RG.err("Component.Base", "addCallback", "CB name " + name + " invalid.");
};

RG.Component.Base.prototype.clone = function() {
    var comp = new RG.Component(this.getType());
    return comp;
};

RG.Component.Base.prototype.copy = function(rhs) {
    this.setType(rhs.getType());
};

RG.Component.Base.prototype.equals = function(rhs) {
    return this.getType() === rhs.getType();
};

RG.Component.Base.prototype.toString = function() {
    return "Component: " + this.getType();
};

/** Creates a simple JSON representation of the component. NOTE: This relies on
 * getters and setters being named identically! Don't rely on this function if
 * you need something more sophisticated. */
RG.Component.Base.prototype.toJSON = function() {
    var obj = {};
    for (var p in this) {
        if (/^get/.test(p)) {
            if (p !== "getEntity" && p !== "getType") {
                var setter = p.replace("get", "set");
                obj[setter] = this[p]();
            }
        }
    }
    return obj;
};

/** Action component is added to all schedulable acting entities.*/
RG.Component.Action = function() {
    RG.Component.Base.call(this, "Action");

    var _energy = 0;
    var _active = false;
    this.getEnergy = function() {return _energy;};

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
    //RG.POOL.emitEvent(RG.EVT_ACT_COMP_ADDED, {actor: entity});
};

RG.Component.Action.prototype.entityRemoveCallback = function(entity) {
    RG.Component.Base.prototype.entityRemoveCallback.call(this, entity);
    //RG.POOL.emitEvent(RG.EVT_ACT_COMP_REMOVED, {actor: entity});
};

/** Component which takes care of hunger and satiation. */
RG.Component.Hunger = function(energy) {
    RG.Component.Base.call(this, "Hunger");

    var _currEnergy = 20000;
    var _maxEnergy = 20000;
    var _minEnergy = -5000;

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
        if (_currEnergy > _maxEnergy) _currEnergy = _maxEnergy;
    };

    this.decrEnergy = function(energy) {
        _currEnergy -= energy;
        if (_currEnergy < _minEnergy) _currEnergy = _minEnergy;
    };

    this.isStarving = function() {
        return _currEnergy <= 0;
    };

    this.isFull = function() {return _currEnergy === _maxEnergy;};

};
RG.extend2(RG.Component.Hunger, RG.Component.Base);

/** Health component takes care of HP and such. */
RG.Component.Health = function(hp) {
    RG.Component.Base.call(this, "Health");

    var _hp = hp;
    var _maxHP = hp;

    /** Hit points getters and setters.*/
    this.getHP = function() {return _hp;};
    this.setHP = function(hp) {_hp = hp;};
    this.getMaxHP = function() {return _maxHP;};
    this.setMaxHP = function(hp) {_maxHP = hp;};

    this.addHP = function(hp) {
        _hp += hp;
        if (_hp > _maxHP) _hp = _maxHP;
    };

    this.decrHP = function(hp) {_hp -= hp;};

    this.isAlive = function() {return _hp > 0;};
    this.isDead = function() {return _hp <= 0;};

};
RG.extend2(RG.Component.Health, RG.Component.Base);

/** Component which is used to deal damage.*/
RG.Component.Damage = function(dmg, type) {
    RG.Component.Base.call(this, "Damage");

    var _dmg = dmg;
    var _type = type;
    var _src = null;

    this.getDamage = function() {return _dmg;};
    this.setDamage = function(dmg) {_dmg = dmg;};

    this.getDamageType = function() {return _type;};
    this.setDamageType = function(type) {_type = type;};

    this.getSource = function() {return _src;};
    this.setSource = function(src) {_src = src;};

};
RG.extend2(RG.Component.Damage, RG.Component.Base);

/** Component used in entities gaining experience.*/
RG.Component.Experience = function() {
    RG.Component.Base.call(this, "Experience");

    var _exp      = 0;
    var _expLevel = 1;

    var _danger = 1;

    /** Experience-level methods.*/
    this.setExp = function(exp) {_exp = exp;};
    this.getExp = function() {return _exp;};
    this.addExp = function(nExp) {_exp += nExp;};
    this.setExpLevel = function(expLevel) {_expLevel = expLevel;};
    this.getExpLevel = function() {return _expLevel;};

    this.setDanger = function(danger) {_danger = danger;};
    this.getDanger = function() {return _danger;};

    /*
    this.toJSON = function() {
        return {
            setExp: _exp,
            setExpLevel: _expLevel,
            setDanger: _danger,
        };
    };
   */

};
RG.extend2(RG.Component.Experience, RG.Component.Base);

/** This component is added when entity gains experience.*/
RG.Component.ExpPoints = function(expPoints) {
    RG.Component.Base.call(this, "ExpPoints");

    var _expPoints = expPoints;
    var _skills = {};

    this.setSkillPoints = function(skill, pts) {
        _skills[skill] = pts;
    };
    this.getSkillPoints = function() {return _skills;};

    this.setExpPoints = function(exp) {_expPoints = exp;};
    this.getExpPoints = function() {return _expPoints;};
    this.addExpPoints = function(exp) { _expPoints += exp;};

};
RG.extend2(RG.Component.ExpPoints, RG.Component.Base);

/** This component is added when entity gains experience.*/
RG.Component.Combat = function() {
    RG.Component.Base.call(this, "Combat");

    var _attack   = 1;
    var _defense  = 1;
    var _protection = 0;
    var _damage = RG.FACT.createDie("1d4");
    var _range    = 1;

    this.getAttack = function() {return _attack;};
    this.setAttack = function(attack) { _attack = attack; };

    /** Defense related methods.*/
    this.getDefense = function() { return _defense; };
    this.setDefense = function(defense) { _defense = defense; };

    this.getProtection = function() {return _protection;};
    this.setProtection = function(prot) {_protection = prot;};

    this.getDamage = function() {
        // TODO add weapon effects
        if (this.getEntity().hasOwnProperty("getWeapon")) {
            var weapon = this.getEntity().getWeapon();
            if (weapon !== null)
                return weapon.getDamage();
        }
        return _damage.roll();
    };

    this.setDamage = function(strOrArray) {
        _damage = RG.FACT.createDie(strOrArray);
    };

    /** Attack methods. */
    this.setAttackRange = function(range) {_range = range;};
    this.getAttackRange = function() {return _range; };

    this.getDamageDie = function() {
        return _damage;
    };

    this.setDamageDie = function(str) {
        this.setDamage(str);
    };

};
RG.extend2(RG.Component.Combat, RG.Component.Base);

RG.Component.Combat.prototype.toJSON = function() {
    var obj = RG.Component.Base.prototype.toJSON.call(this);
    delete obj.setDamageDie; // Clean up setter
    obj.setDamage = this.getDamageDie().toString();
    return obj;
};

/** Modifiers for the Combat component.*/
RG.Component.CombatMods = function() {
    RG.Component.Combat.call(this);

    var _damage = 0;
    var _range = 0;
    var _attack = 0;
    var _defense = 0;
    var _protection = 0;

    this.setType("CombatMods");
    this.setAttackRange = function(range) {_range = range;};
    this.setAttack = function(attack) { _attack = attack; };
    this.setDefense = function(defense) { _defense = defense; };
    this.setProtection = function(prot) {_protection = prot;};

    this.setDamage = function(dmg) {_damage = dmg;};
    this.getDamage = function() {return _damage;};
};
RG.extend2(RG.Component.CombatMods, RG.Component.Combat);

/** This component stores entity stats like speed, agility etc.*/
RG.Component.Stats = function() {
    RG.Component.Base.call(this, "Stats");

    var _accuracy  = 5;
    var _agility   = 5;
    var _strength  = 5;
    var _willpower = 5;
    var _speed     = 100;

    /** These determine the chance of hitting. */
    this.setAccuracy = function(accu) {_accuracy = accu;};
    this.getAccuracy = function() {return _accuracy;};
    this.setAgility = function(agil) {_agility = agil;};
    this.getAgility = function() {return _agility;};
    this.setStrength = function(str) {_strength = str;};
    this.getStrength = function() {return _strength;};
    this.setWillpower = function(wp) {_willpower = wp;};
    this.getWillpower = function() {return _willpower;};

    this.setSpeed = function(speed) {_speed = speed;};
    this.getSpeed = function() {return _speed;};

};

RG.Component.Stats.prototype.clone = function() {
    var comp = new RG.Component.Stats();
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
};

RG.Component.Stats.prototype.equals = function(rhs) {
    var res = this.getType() === rhs.getType();
    res = res && this.getAccuracy() === rhs.getAccuracy();
    res = res && this.getAgility() === rhs.getAgility();
    res = res && this.getStrength() === rhs.getStrength();
    res = res && this.getWillpower() === rhs.getWillpower();
    res = res && this.getSpeed() === rhs.getSpeed();
    return res;
};

RG.Component.Stats.prototype.toString = function() {
    var txt = "";
    if (this.getAccuracy()) txt += "Acc: " + this.getAccuracy();
    if (this.getAgility()) txt += " ,Agi: " + this.getAgility();
    if (this.getStrength()) txt += " ,Str: " + this.getStrength();
    if (this.getWillpower()) txt += " ,Wil: " + this.getWillpower();
    return txt;
};

RG.extend2(RG.Component.Stats, RG.Component.Base);

/** Stats modifier component. */
RG.Component.StatsMods = function() {
    RG.Component.Stats.call(this);
    this.setType("StatsMods");
    this.setAccuracy(0);
    this.setAgility(0);
    this.setStrength(0);
    this.setWillpower(0);
    this.setSpeed(0);
};
RG.extend2(RG.Component.StatsMods, RG.Component.Stats);


/** Attack component is added to the actor when it attacks. Thus, source of the
 * attack is the entity having Attack component. */
RG.Component.Attack = function(target) {
    RG.Component.Base.call(this, "Attack");

    var _target = target;

    this.setTarget = function(t) {_target = t;};
    this.getTarget = function() {return _target;};

};
RG.extend2(RG.Component.Attack, RG.Component.Base);

/** Transient component added to a moving entity.*/
RG.Component.Movement = function(x, y, level) {
    RG.Object.Locatable.call(this);
    RG.Component.Base.call(this, "Movement");

    this.setXY(x, y);
    this.setLevel(level);

};
RG.extend2(RG.Component.Movement, RG.Object.Locatable);
RG.extend2(RG.Component.Movement, RG.Component.Base);

/** Added to entities which must act as missiles flying through cells.*/
RG.Component.Missile = function(source) {
    RG.Component.Base.call(this, "Missile");

    var _x = source.getX();
    var _y = source.getY();
    var _source = source;
    var _level = source.getLevel();
    var _isFlying = true;

    var _targetX = null;
    var _targetY = null;

    var _range = 0;
    var _attack = 0;
    var _dmg = 0;

    var _path = []; // Flying path for the missile
    var _path_iter = -1;

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
        if (_path.length > 0) _path_iter = 0;
    };

    this.getTargetX = function() {return _targetX;};
    this.getTargetY = function() {return _targetY;};

    /** Returns true if missile has reached its target map cell.*/
    this.inTarget = function() {
        return _x === _targetX && _y === _targetY;
    };

    var iteratorValid = function() {
        return _path_iter >= 0 && _path_iter < _path.length;
    };

    var setValuesFromIterator = function() {
        var coord = _path[_path_iter];
        _x = coord.x;
        _y = coord.y;
    };

    this.first = function() {
        if (iteratorValid()) {
            _path_iter = 0;
            setValuesFromIterator();
        }
        return null;
    };

    /** Returns the next cell in missile's path. Moves iterator forward. */
    this.next = function() {
        if (iteratorValid()) {
            --_range;
            ++_path_iter;
            setValuesFromIterator();
            return true;
        }
        return null;
    };

    /** Returns the prev cell in missile's path. Moves iterator backward. */
    this.prev = function() {
        if (iteratorValid()) {
            ++_range;
            --_path_iter;
            setValuesFromIterator();
            return true;
        }
        return null;
    };

};
RG.extend2(RG.Component.Missile, RG.Component.Base);

/** This component holds loot that is dropped when given entity is destroyed.*/
RG.Component.Loot = function(lootEntity) {
    RG.Component.Base.call(this, "Loot");

    // This will be dropped as loot
    var _lootEntity = lootEntity;

    /** Drops the loot to the given cell.*/
    this.dropLoot = function(cell) {
        if (_lootEntity.hasOwnProperty("_propType")) {
            var propType = _lootEntity.getPropType();
            if (propType === "elements") {
                this.setElemToCell(cell);
            }
            else {
                cell.setProp(propType, _lootEntity);
            }
        }
        else {
            RG.err("Component.Loot", "dropLoot", "Loot has no propType!");
        }
    };

    this.setElemToCell = function(cell) {
        var entLevel = this.getEntity().getLevel();
        if (_lootEntity.hasOwnProperty("useStairs")) {
            RG.debug(this, "Added stairs to " + cell.getX() + ", " + cell.getY());
            entLevel.addStairs(_lootEntity, cell.getX(), cell.getY());
        }
    };

};
RG.extend2(RG.Component.Loot, RG.Component.Base);

/** This component is added to entities receiving communication. Communication
 * is used to point out enemies and locations of items, for example.*/
RG.Component.Communication = function() {
    RG.Component.Base.call(this, "Communication");

    var _messages = [];

    this.getMsg = function() {return _messages;};

    /** Adds one message to the communication.*/
    this.addMsg = function(obj) {
        _messages.push(obj);
    };

};
RG.extend2(RG.Component.Communication, RG.Component.Base);

/** Entities with physical components have weight and size.*/
RG.Component.Physical = function() {
    RG.Component.Base.call(this, "Physical");

    var _weight = 1; // in kg
    var _size   = 1; // abstract unit

    this.setWeight = function(weight) {
        _weight = weight;
    };

    this.getWeight = function() {return _weight;};
    this.setSize = function(size) {_size = size;};
    this.getSize = function() {return _size;};

};
RG.extend2(RG.Component.Physical, RG.Component.Base);

/** Ethereal entities are visible but don't have normal interaction with
 * matter. */
RG.Component.Ethereal = function() {
    RG.Component.Base.call(this, "Ethereal");

};
RG.extend2(RG.Component.Ethereal, RG.Component.Base);

/** Stun component prevents actor from taking many actions like moving and
 * attacking. */
RG.Component.Stun = function() {
    RG.Component.Base.call(this, "Stun");

    var _src = null;
    this.getSource = function() {return _src;};
    this.setSource = function(src) {_src = src;};

};
RG.extend2(RG.Component.Stun, RG.Component.Base);


/** Poison component which damages the entity.*/
RG.Component.Poison = function() {
    RG.Component.Base.call(this, "Poison");

    var _src = null;

    var _die = null;
    var _prob = 0.05; // Prob. of poison kicking in

    this.getProb = function() {return _prob;};
    this.setProb = function(prob) {_prob = prob;};

    this.getSource = function() {return _src;};
    this.setSource = function(src) {_src = src;};

    this.setDamage = function(die) {_die = die;};
    this.getDamage = function() {return _die.roll();};

};
RG.extend2(RG.Component.Poison, RG.Component.Base);

/** For branding stolen goods.*/
RG.Component.Stolen = function() {
    RG.Component.Base.call(this, "Stolen");
};
RG.extend2(RG.Component.Stolen, RG.Component.Base);

/** Added to unpaid items in shops. Removed once the purchase is done.*/
RG.Component.Unpaid = function() {
    RG.Component.Base.call(this, "Unpaid");
};
RG.extend2(RG.Component.Unpaid, RG.Component.Base);


/** Expiration component handles expiration of time-based effects. Any component
 * can be made transient by using this Expiration component. For example, to
 * have transient, non-persistent Ethereal, you can use this component. */
RG.Component.Expiration = function() {
    RG.Component.Base.call(this, "Expiration");

    this._duration = {};

    /** Adds one effect to time-based components.*/
    this.addEffect = function(comp, dur) {
        var type = comp.getType();
        if (!this._duration.hasOwnProperty(type)) {
            this._duration[type] = dur;

            var that = this;
            comp.addCallback("onRemove", function() {
                that.removeEffect(comp);
            });
        }
        else { // increase existing duration
            this._duration[type] += dur;
        }
    };

    /** Decreases duration of all time-based effects.*/
    this.decrDuration = function() {
        for (var compType in this._duration) {
            this._duration[compType] -= 1;
            console.log("Decreased duration of " + compType);
            if (this._duration[compType] === 0) {
                var ent = this.getEntity();
                ent.remove(compType);
                delete this._duration[compType];
                console.log("Deleted compType " + compType);
            }
        }
    };

    /* Returns true if component has any time-effects with non-zero duration.*/
    this.hasEffects = function() {
        return Object.keys(this._duration).length > 0;
    };

    this.hasEffect = function(comp) {
        var compType = comp.getType();
        return this._duration.hasOwnProperty(compType);
    };

    /** SHould be called to remove a specific effect, for example upon death of
     * an actor. */
    this.removeEffect = function(comp) {
        var compType = comp.getType();
        if (this._duration.hasOwnProperty(compType)) {
            delete this._duration[compType];
        }

    };

};
RG.extend2(RG.Component.Expiration, RG.Component.Base);


module.exports = RG.Component;

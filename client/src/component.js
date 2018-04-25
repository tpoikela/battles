
const RG = require('./rg.js');
const Mixin = require('./mixin');

RG.Chat = require('./chat');
RG.ActorClass = require('./actor-class');
RG.Component = require('./component.base');

const DataComponent = RG.Component.DataComponent;
const UniqueDataComponent = RG.Component.UniqueDataComponent;
const TransientDataComponent = RG.Component.TransientDataComponent;
const TransientTagComponent = RG.Component.TransientTagComponent;
const TagComponent = RG.Component.TagComponent;
const UniqueTagComponent = RG.Component.UniqueTagComponent;

/* Component which takes care of hunger and satiation. */
RG.Component.Hunger = UniqueDataComponent('Hunger',
    {energy: 20000, maxEnergy: 20000, minEnergy: -5000});

RG.Component.Hunger.prototype.addEnergy = function(energy) {
    this.energy += energy;
    if (this.energy > this.maxEnergy) {
        this.energy = this.maxEnergy;
    }
};

RG.Component.Hunger.prototype.decrEnergy = function(energy) {
    this.energy -= energy;
    if (this.energy < this.minEnergy) {
        this.energy = this.minEnergy;
    }
};

RG.Component.Hunger.prototype.isStarving = function() {
    return this.energy <= 0;
};

RG.Component.Hunger.prototype.isFull = function() {
    return this.energy === this.maxEnergy;
};

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

    this.hpLost = () => {
        return _maxHP - _hp;
    };

};
RG.extend2(RG.Component.Health, RG.Component.Base);

/* Component which is used to deal damage.*/
RG.Component.Damage = function(dmg, type) {
    RG.Component.Base.call(this, 'Damage');
    this.toJSON = RG.Component.NO_SERIALISATION;

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
RG.Component.Experience = UniqueDataComponent('Experience',
    {exp: 0, expLevel: 1, danger: 1});

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
RG.Component.Stats = UniqueDataComponent('Stats', {
    accuracy: 5, agility: 5, strength: 5,
    willpower: 5, perception: 5, magic: 5, speed: 100
});

RG.Component.Stats.prototype.clearValues = function() {
    this.setAccuracy(0);
    this.setAgility(0);
    this.setStrength(0);
    this.setWillpower(0);
    this.setPerception(0);
    this.setSpeed(0);
    this.setMagic(0);
};

/* Convenience function for increase a stat. */
RG.Component.Stats.prototype.incrStat = function(statName, addValue) {
    const setter = 'set' + statName.capitalize();
    const getter = 'get' + statName.capitalize();
    const currValue = this[getter]();
    this[setter](currValue + addValue);
};

RG.Component.Stats.prototype.toString = function() {
    let result = '';
    RG.GET_STATS.forEach((getter, i) => {
        const value = this[getter]();
        if (value !== 0) { // Show also neg. values
            result += RG.STATS_ABBR[i] + ': ' + value;
        }
    });
    return result;
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

/* Stats modifier component. */
RG.Component.StatsMods = function() {
    RG.Component.Stats.call(this);
    this._isUnique = false;
    this.setType('StatsMods');
    this.clearValues();
};
RG.extend2(RG.Component.StatsMods, RG.Component.Stats);

RG.Component.Perception = UniqueDataComponent('Perception',
    {FOVRange: RG.NPC_FOV_RANGE});

/* Attack component is added to the actor when it attacks. Thus, source of the
 * attack is the entity having Attack component. */
RG.Component.Attack = TransientDataComponent('Attack', {target: null});

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
RG.Component.Chat = TransientDataComponent('Chat', {args: null});

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
    let _lootEntity = lootEntity;

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

    this.setLootEntity = function(lootEntity) {
        _lootEntity = lootEntity;
    };

    this.toJSON = function() {
        const json = RG.Component.Base.toJSON.call(this);
        json.setLootEntity = _lootEntity.toJSON();
        return json;
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

/* Added to entities which can cause damage without attack such as fire. Used
 * for AI navigation purposes at the moment. */
RG.Component.Damaging = UniqueTagComponent('Damaging');

/* Added to entities which are destroyed after use. */
RG.Component.OneShot = UniqueTagComponent('OneShot');

/* Entities with physical components have weight and size.*/
RG.Component.Physical = UniqueDataComponent('Physical',
    {weight: 1, size: 1});

/* Ethereal entities are visible but don't have normal interaction with
 * matter. */
RG.Component.Ethereal = TagComponent('Ethereal');

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
        return obj;
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
        return obj;
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
        const ent = this.getEntity();
        _brainTarget = ent.getBrain();
        if (this.getSource().isPlayer()) {
            ent.setPlayerCtrl(true);
        }
        else {
            ent.setBrain(new RG.Brain.MindControl(ent));
        }
    };

    const _removeCb = () => {
        if (this.getSource().isPlayer()) {
            this.getEntity().setPlayerCtrl(false);
        }
        this.getEntity().setBrain(_brainTarget);
    };

    this.addCallback('onAdd', _addCb);
    this.addCallback('onRemove', _removeCb);

    this.toJSON = () => {
        const obj = RG.Component.Base.prototype.toJSON.call(this);
        obj.setSource = RG.getObjRef('entity', _src);
        return obj;
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
        if (this._src) { // May not be present in items etc
            obj.setSource = RG.getObjRef('entity', this._src);
        }
        return obj;
    }
}
RG.Component.Poison = Poison;

RG.Component.Coldness = TagComponent('Coldness');
RG.Component.Heat = TagComponent('Heat');

RG.Component.BodyTemp = UniqueDataComponent('BodyTemp',
    {temp: 100, maxTemp: 100, minTemp: -100});

RG.Component.BodyTemp.prototype.incr = function() {
    if (this.temp < this.maxTemp) {
        this.temp += 1;
    }
};

RG.Component.BodyTemp.prototype.decr = function() {
    if (this.temp > this.minTemp) {
        this.temp -= 1;
    }
};

RG.Component.BodyTemp.prototype.isFreezing = function() {
    return this.temp <= 0;
};

RG.Component.BodyTemp.prototype.isFrozen = function() {
    return this.temp === this.minTemp;
};

/* For branding entity belonging to certain other entity. */
RG.Component.Owned = UniqueDataComponent('Owned', {owner: null});

/* For branding stolen goods.*/
RG.Component.Stolen = TagComponent('Stolen');

/* Added to unpaid items in shops. Removed once the purchase is done.*/
RG.Component.Unpaid = TagComponent('Unpaid');

/* Expiration component handles expiration of time-based effects. Any component
 * can be made transient by using this Expiration component. For example, to
 * have transient, non-persistent Ethereal, you can use this component. */
RG.Component.Expiration = DataComponent('Expiration', {duration: null});

/* Adds one effect to time-based components.*/
RG.Component.Expiration.prototype.addEffect = function(comp, dur) {
    if (!this.duration) {this.duration = {};}
    const compID = comp.getID();
    if (!this.duration.hasOwnProperty(compID)) {
        this.duration[compID] = dur;

        comp.addCallback('onRemove', () => {
            this.removeEffect(comp);
        });
    }
    else { // increase existing duration
        this.duration[compID] += dur;
    }
};

/* Decreases duration of all time-based effects.*/
RG.Component.Expiration.prototype.decrDuration = function() {
    for (const compID in this.duration) {
        if (compID >= 0) {
            this.duration[compID] -= 1;
            if (this.duration[compID] === 0) {
                const ent = this.getEntity();
                const compIDInt = parseInt(compID, 10);
                ent.remove(compIDInt);
                delete this.duration[compID];
            }
        }
    }
};

/* Returns true if component has any time-effects with non-zero duration.*/
RG.Component.Expiration.prototype.hasEffects = function() {
    return Object.keys(this.duration).length > 0;
};

RG.Component.Expiration.prototype.hasEffect = function(comp) {
    const compID = comp.getID();
    return this.duration.hasOwnProperty(compID);
};

/* Should be called to remove a specific effect, for example upon death of
 * an actor. */
RG.Component.Expiration.prototype.removeEffect = function(comp) {
    const compID = comp.getID();
    if (this.duration.hasOwnProperty(compID)) {
        delete this.duration[compID];
    }
};

RG.Component.Expiration.prototype.cleanup = function() {
    const entity = this.getEntity();
    Object.keys(this.duration).forEach(compID => {
        entity.remove(parseInt(compID, 10));
    });
};

RG.Component.Indestructible = UniqueTagComponent('Indestructible');
RG.Component.Ammo = TagComponent('Ammo');
RG.Component.Flying = TagComponent('Flying');
RG.Component.Undead = TagComponent('Undead');
RG.Component.Summoned = TagComponent('Summoned');
RG.Component.Fire = TagComponent('Fire');
RG.Component.Sharpener = TagComponent('Sharpener');
RG.Component.Possessed = TagComponent('Possessed');

/* Used currently for magical arrows to distinguish them from shot/thrown
 * projectiles. */
RG.Component.Magical = TagComponent('Magical');

/* Used for non-sentient actors such as fire and moving doors. */
RG.Component.NonSentient = UniqueTagComponent('NonSentient');

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
/* const componentsMelee = {
    Defender: 'Gives a defender bonus (+1 Def for each enemy).',
    Attacker: 'Gives an attack bonus (+1 Att for each enemy).',
    BiDirStrike: 'Gives bi-directional melee strike',
    CounterAttack: 'Gives a counter attack ability',
    Ambidexterity: 'Gives ability to wield two weapons',
    LongReach: 'Gives +1 to range of melee attacks.',
    FirstStrike: 'Gives a counter attack that hits first.'
};*/
RG.Component.Defender = UniqueTagComponent('Defender');
RG.Component.Attacker = UniqueTagComponent('Attacker');
RG.Component.BiDirStrike = UniqueTagComponent('BiDirStrike');
RG.Component.CounterAttack = UniqueTagComponent('CounterAttack');
RG.Component.Ambidexterity = UniqueTagComponent('Ambidexterity');
RG.Component.LongReach = UniqueTagComponent('LongReach');
RG.Component.FirstStrike = UniqueTagComponent('FirstStrike');

/* Component which gives reduces equipment weight by 50%. */
RG.Component.MasterEquipper = DataComponent('MasterEquipper',
    {factor: 0.5});

/* Component which gives an actor chance to bypass armor. */
RG.Component.BypassProtection = DataComponent('BypassProtection',
    {chance: 0.0});

//--------------------------------------------
// RANGED COMBAT COMPONENTS
//--------------------------------------------

RG.Component.EagleEye = TagComponent('EagleEye');
RG.Component.StrongShot = TagComponent('StrongShot');
RG.Component.ThroughShot = TagComponent('ThroughShot');
RG.Component.MixedShot = TagComponent('MixedShot');
RG.Component.LongRangeShot = TagComponent('LongRangeShot');
RG.Component.RangedEvasion = TagComponent('RangedEvasion');
RG.Component.CriticalShot = TagComponent('CriticalShot');
RG.Component.DoubleShot = TagComponent('DoubleShot');

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

RG.Component.SpellSelf = function() {
    RG.Component.SpellBase.call(this, 'SpellSelf');
};
RG.extend2(RG.Component.SpellSelf, RG.Component.SpellBase);

//--------------------------------------------
// Adventurer components
//--------------------------------------------

/* Triples the energy gained from eating foods. */
RG.Component.NourishedOne = UniqueTagComponent('NourishedOne');

//--------------------------------------------
// Spirit-related components
//--------------------------------------------

/* Used when gem binding into item is attempted. */
RG.Component.SpiritBind = TransientDataComponent('SpiritBind',
    {binder: null, target: null});

/* This component enables entity to bind gems into items. */
RG.Component.GemBound = UniqueDataComponent('GemBound', {gem: null});
RG.Component.GemBound.prototype.toJSON = function() {
    return {
        setID: this.getID(),
        setType: 'GemBound',
        setGem: {
            createFunc: 'createItem',
            value: this.getGem().toJSON()
        }
    };
};

/* This component enables entity to bind gems into items. */
RG.Component.SpiritItemCrafter = UniqueTagComponent('SpiritItemCrafter');

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
            setID: this.getID(),
            setType: this.getType(),
            setSkills: this._skills
        };
    };
};
RG.extend2(RG.Component.Skills, RG.Component.Base);

RG.Component.SkillsExp = TransientDataComponent('SkillsExp',
    {skill: '', points: 0});

/* Component which models a shop transaction. */
RG.Component.Transaction = TransientDataComponent('Transaction', {args: null});

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
    this.updateData = data => {_data = Object.assign(_data || {}, data);};

};
RG.extend2(RG.Component.BattleExp, RG.Component.Base);

/* This component is placed on entities when the battle is over. It signals to
 * the Battle.System that experience should be processed now. After this, the
 * system processed and removed this and BattleExp components. */
RG.Component.BattleOver = UniqueTagComponent('BattleOver');

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

/* An order given during battle. Used to give order to player at the moment. */
RG.Component.BattleOrder = DataComponent('BattleOrder', {args: null});

/* Used for battle commanders. */
RG.Component.Commander = TagComponent('Commander');

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

/* Can be added to actors when they're under player control. */
RG.Component.PlayerControlled = UniqueTagComponent('PlayerControlled');

/* Component added only to the actual player actor. */
RG.Component.Player = UniqueTagComponent('Player');

//--------------------------------------------
// Comps that add or remove other components
//--------------------------------------------

RG.Component.AddOnHit = function() {
    RG.Component.Base.call(this, 'AddOnHit');
    let _comp = null;

    this.setComp = comp => {_comp = comp;};
    this.getComp = () => _comp;

    this.toJSON = () => {
        const jsonComp = _comp.toJSON();
        return {
            setID: this.getID(),
            setType: this.getType(),
            setComp: {createComp: jsonComp}
        };
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
RG.Component.Pickup = TransientTagComponent('Pickup');

/* Added to entity when it's using stairs to move to another level. */
RG.Component.UseStairs = TransientTagComponent('UseStairs');

/* Added to entity when it's opening a door. */
RG.Component.OpenDoor = TransientDataComponent('OpenDoor', {door: null});

RG.Component.UseItem = TransientDataComponent('UseItem',
    {item: null, useType: '', target: null});

RG.Component.UseElement = TransientDataComponent('UseElement',
    {element: null, useType: ''});

/* Added to player to record various event in the game. */
RG.Component.GameInfo = UniqueDataComponent('GameInfo', {
    data: null});

RG.Component.GameInfo.prototype._init = function() {
    this.data = {zones: {}};
};

/* Updates the data with given object. */
RG.Component.GameInfo.prototype.updateData = function(data) {
    const oldData = this.data;
    this.data = Object.assign(oldData, data);
};

RG.Component.GameInfo.prototype.addZone = function(id) {
    this.data.zones[id] = true;
};

RG.Component.GameInfo.prototype.hasZone = function(id) {
    return this.data.zones[id];
};

RG.Component.GameInfo.prototype.addZoneType = function(type) {
    const data = this.data;
    if (!data.zones.hasOwnProperty(type)) {
        data.zones[type] = 1;
    }
    else {
        data.zones[type] += 1;
    }
    this.data = data;
};

/* Fading component is added to entities which disappear eventually */
RG.Component.Fading = DataComponent('Fading', {duration: 0});

RG.Component.Fading.prototype.decrDuration = function() {
    this.duration -= 1;
};

/* This component can be added to any other component to make that component
 * stay for a specific duration only. */
class Duration extends Mixin.DurationRoll(RG.Component.Base) {

    constructor() {
        super('Duration');
        this._comp = null;
        // Behaves differently when on actor
        this._addedOnActor = false;
    }

    setComp(comp) {
        this._comp = comp;
        if (!this._addedOnActor) {
            const _addCb = () => {
                this.getEntity().add(this._comp);
                this._comp = this._comp.getID();
                this._addedOnActor = true;
                this.removeCallbacks('onAdd');
            };
            this.addCallback('onAdd', _addCb);
        }

        const _removeCb = () => {
            // Comp might've been removed due to cure
            if (this.getEntity().has(this._comp)) {
                this.getEntity().remove(this._comp);
            }
        };

        this.addCallback('onRemove', _removeCb);
    }

    getComp() {return this._comp;}

    copy(rhs) {
        super.copy(rhs);
        const comp = rhs.getComp().clone();
        this.setComp(comp);
    }

    clone() {
        const newComp = super.clone();
        newComp.copy(this);
        return newComp;
    }

    setAddedOnActor(added) {
        this._addedOnActor = added;
    }

    getAddedOnActor() {return this._addedOnActor;}

    toJSON() {
        const json = super.toJSON();
        if (!this._addedOnActor) {
            const jsonComp = this._comp.toJSON();
            return Object.assign(json, {setComp: {createComp: jsonComp}});
        }
        else {
            return Object.assign(json, {setAddedOnActor: true,
                setComp: this._comp});
        }
    }


}
RG.Component.Duration = Duration;

module.exports = RG.Component;


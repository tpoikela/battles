
const RG = require('./rg.js');
const Mixin = require('./mixin');

RG.Chat = require('./chat');
RG.ActorClass = require('./actor-class');
RG.Component = require('./component.base');
const Ability = require('./abilities');

const Abilities = Ability.Abilities;

const DataComponent = RG.Component.DataComponent;
const UniqueDataComponent = RG.Component.UniqueDataComponent;
const TransientDataComponent = RG.Component.TransientDataComponent;
const TransientTagComponent = RG.Component.TransientTagComponent;
const TagComponent = RG.Component.TagComponent;
const UniqueTagComponent = RG.Component.UniqueTagComponent;

const BaseProto = RG.Component.Base.prototype;

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

/**
 * Health component takes care of HP and such. */
RG.Component.Health = UniqueDataComponent('Health',
    {HP: 10, maxHP: 10});

RG.Component.Health.prototype.addHP = function(hp) {
    this.HP += hp;
    if (this.HP > this.maxHP) {this.HP = this.maxHP;}
};

RG.Component.Health.prototype.decrHP = function(hp) {this.HP -= hp;};

RG.Component.Health.prototype.isAlive = function() {
    return this.HP > 0;
};

RG.Component.Health.prototype.isDead = function() {return this.HP <= 0;};

RG.Component.Health.prototype.hpLost = function() {
    return this.maxHP - this.HP;
};

RG.Component.Health.prototype._init = function(hp) {
    this.HP = hp;
    this.maxHP = hp;
};

/* Tag component to mark Dead actors (different from Undead) */
RG.Component.Dead = UniqueTagComponent('Dead');

/* Tag component for entities with physical body. */
RG.Component.Corporeal = UniqueTagComponent('Corporeal');

/* Component used to pass damage information between systems. */
RG.Component.Damage = TransientDataComponent('Damage', {
    damage: 0, weapon: null, damageType: '', damageCateg: '',
    source: null, // Source of the damage (ie weapon)
    sourceActor: null // Actor who did the action to cause damage
});

RG.Component.Damage.prototype._init = function(dmg, type) {
    this.damage = dmg;
    this.damageType = type;
};

/* In contrast to Damage (which is transient), DirectDamage can be
 * combined with Comp.AddOnHit to inflict additional damage
 * to an actor. */
RG.Component.DirectDamage = DataComponent('DirectDamage', {
    damage: 0, damageType: '', damageCateg: '', prob: 1.0,
    source: null
});


RG.Component.DirectDamage.prototype.toJSON = function() {
    const obj = RG.Component.Base.prototype.toJSON.call(this);
    if (this.source) {
        obj.setSource = RG.getObjRef('entity', this.source);
    }
    else {
        delete obj.setSource;
    }
    return obj;
};

/* Component to tag entities that block light from passing through. */
RG.Component.Opaque = UniqueTagComponent('Opaque');

/* Component used in entities gaining experience.*/
RG.Component.Experience = UniqueDataComponent('Experience',
    {exp: 0, expLevel: 1, danger: 1});

/* This component is added when entity gains experience. It is removed after
* system evaluation and added to Experience component. */
RG.Component.ExpPoints = TransientDataComponent('ExpPoints',
    {expPoints: null, skillPoints: null}
);

RG.Component.ExpPoints.prototype._init = function(expPoints) {
    this.expPoints = expPoints;
    this.skills = {};
};

RG.Component.ExpPoints.prototype.addSkillPoints = function(skill, pts) {
    this.skills[skill] = pts;
};

RG.Component.ExpPoints.prototype.addExpPoints = function(exp) {
    this.expPoints += exp;
};

/* Combat component holds all combat-related information for actors. */
RG.Component.Combat = UniqueDataComponent('Combat', {
    attack: 1, defense: 1, protection: 0, attackRange: 1, damageDie: null
});

RG.Component.Combat.prototype._init = function() {
    this.damageDie = RG.FACT.createDie('1d4');
};

RG.Component.Combat.prototype.rollDamage = function() {
    return this.damageDie.roll();
};

RG.Component.Combat.prototype.setDamageDie = function(strOrDie) {
    if (typeof strOrDie === 'string') {
        this.damageDie = RG.FACT.createDie(strOrDie);
    }
    else {
        this.damageDie = strOrDie;
    }
};

RG.Component.Combat.prototype.copy = function(rhs) {
    BaseProto.copy.call(this, rhs);
    this.damageDie = rhs.getDamageDie().clone();
};

RG.Component.Combat.prototype.toJSON = function() {
    const obj = BaseProto.toJSON.call(this);
    obj.setDamageDie = this.damageDie.toString();
    return obj;
};

/* Modifiers for the Combat component.*/
RG.Component.CombatMods = DataComponent('CombatMods', {
    attack: 0, defense: 0, protection: 0, attackRange: 0, damage: 0,
    tag: ''
});

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
RG.Component.StatsMods = DataComponent('StatsMods', {
    accuracy: 0, agility: 0, strength: 0,
    willpower: 0, perception: 0, magic: 0, speed: 0,
    tag: ''
});

RG.Component.Perception = UniqueDataComponent('Perception',
    {FOVRange: RG.NPC_FOV_RANGE});

/* Attack component is added to the actor when it attacks. Thus, source of the
 * attack is the entity having Attack component. */
RG.Component.Attack = TransientDataComponent('Attack', {target: null});

/* Transient component added to a moving entity.*/
RG.Component.Movement = TransientDataComponent('Movement', {
    x: 0, y: 0, level: null
});

RG.Component.Movement.prototype.setXY = function(x, y) {
    this.x = x;
    this.y = y;
};

RG.Component.Movement.prototype.getXY = function() {
    return [this.x, this.y];
};

RG.Component.Movement.prototype._init = function(x, y, level) {
    this.x = x;
    this.y = y;
    this.level = level;
};

/* Transient component representing a chat action between actors. */
RG.Component.Chat = TransientDataComponent('Chat', {args: null});

/* Data component added to trainer actors. */
RG.Component.Trainer = UniqueDataComponent('Trainer', {
    chatObj: null
});

// Hack to prevent serialisation
delete RG.Component.Trainer.prototype.setChatObj;

RG.Component.Trainer.prototype._init = function() {
    this.chatObj = new RG.Chat.Trainer();

    const _addCb = () => {
      this.chatObj.setTrainer(this.getEntity());
    };
    this.addCallback('onAdd', _addCb);
};

/* Missile component is added to entities such as arrows and rocks
 * when they have been launched. */
RG.Component.Missile = TransientDataComponent('Missile', {
    x: null, y: null, source: null, level: null,
    flying: true,
    targetX: null, targetY: null,
    range: 0, attack: 0, damage: 0, path: null
});

RG.Component.Missile.prototype._init = function(source) {
    this.source = source;
    this.x = source.getX();
    this.y = source.getY();
    this.level = source.getLevel();
    this.path = [];
    this.pathIter = -1;
};

RG.Component.Missile.prototype.hasRange = function() {
    return this.range > 0;
};

RG.Component.Missile.prototype.isFlying = function() {
    return this.flying;
};

RG.Component.Missile.prototype.stopMissile = function() {
    this.flying = false;
};

RG.Component.Missile.prototype.setTargetXY = function(x, y) {
    this.path = RG.Geometry.getMissilePath(this.x, this.y, x, y);
    this.targetX = x;
    this.targetY = y;
    if (this.path.length > 0) {this.pathIter = 0;}
};

/* Returns true if missile has reached its target map cell.*/
RG.Component.Missile.prototype.inTarget = function() {
    return this.x === this.targetX && this.y === this.targetY;
};

RG.Component.Missile.prototype.iteratorValid = function() {
    return this.pathIter >= 0 && this.pathIter < this.path.length;
};

RG.Component.Missile.prototype.setValuesFromIterator = function() {
    const coord = this.path[this.pathIter];
    this.x = coord[0];
    this.y = coord[1];
};

/* Resets the path iterator to the first x,y. */
RG.Component.Missile.prototype.first = function() {
    this.pathIter = 0;
    this.setValuesFromIterator();
    return [this.x, this.y];
};

/* Moves to next cell in missile's path. Returns null if path is finished.
 * */
RG.Component.Missile.prototype.next = function() {
    if (this.iteratorValid()) {
        --this.range;
        ++this.pathIter;
        this.setValuesFromIterator();
        return true;
    }
    return null;
};

/* Returns the prev cell in missile's path. Moves iterator backward. */
RG.Component.Missile.prototype.prev = function() {
    if (this.iteratorValid()) {
        ++this.range;
        --this.pathIter;
        this.setValuesFromIterator();
        return true;
    }
    return null;
};

/* This component holds loot that is dropped when given entity is destroyed.*/
RG.Component.Loot = function(lootEntity) {
    RG.Component.Base.call(this, 'Loot');

    // This will be dropped as loot
    this._lootEntity = lootEntity;
};
RG.extend2(RG.Component.Loot, RG.Component.Base);

/* Drops the loot to the given cell.*/
RG.Component.Loot.prototype.dropLoot = function(cell) {
    if (this._lootEntity.getPropType) {
        const propType = this._lootEntity.getPropType();
        if (propType === 'elements') {
            this.setElemToCell(cell);
        }
        else {
            cell.setProp(propType, this._lootEntity);
        }
    }
    else {
        RG.err('Component.Loot', 'dropLoot', 'Loot has no propType!');
    }
};

RG.Component.Loot.prototype.setElemToCell = function(cell) {
    const entLevel = this.getEntity().getLevel();
    if (this._lootEntity.hasOwnProperty('useStairs')) {
        RG.debug(this, 'Added stairs to ' + cell.getX()
            + ', ' + cell.getY());
        entLevel.addStairs(this._lootEntity, cell.getX(), cell.getY());
    }
};

RG.Component.Loot.prototype.setLootEntity = function(lootEntity) {
    this._lootEntity = lootEntity;
};

RG.Component.Loot.prototype.toJSON = function() {
    const json = RG.Component.Base.prototype.toJSON.call(this);
    const lootJSON = this._lootEntity.toJSON();
    if (this._lootEntity.getPropType() === RG.TYPE_ITEM) {
        json.setLootEntity = {
            createFunc: 'createItem',
            value: lootJSON
        };
    }
    else if (this._lootEntity.getPropType() === RG.TYPE_ACTOR) {
        json.setLootEntity = {
            createFunc: 'createActor',
            value: lootJSON
        };
    }
    else {
        RG.err('Component.Loot', 'toJSON',
            'Only items/actors loot types are supported');
    }
    return json;
};

/* This component is added to entities receiving communication. Communication
 * is used to point out enemies and locations of items, for example.*/
RG.Component.Communication = TransientDataComponent('Communication',
    {msg: null});

RG.Component.Communication.prototype._init = function() {
    this.msg = [];
};

RG.Component.Communication.prototype.addMsg = function(obj) {
    this.msg.push(obj);
};

/* Added to entities which can cause damage without attack such as fire. Used
 * for AI navigation purposes at the moment. */
RG.Component.Damaging = DataComponent('Damaging', {
    damage: 1, damageType: ''
});

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

/* Component added to summoned/created actors. */
RG.Component.Created = UniqueDataComponent('Created', {creator: null});

RG.Component.Created.prototype.toJSON = function() {
    const obj = RG.Component.Base.prototype.toJSON.call(this);
    obj.setCreator = RG.getObjRef('entity', this.creator);
    return obj;
};

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
RG.Component.Expiration = DataComponent('Expiration',
    {duration: null, expireMsg: null});

RG.Component.Expiration.prototype._init = function() {
    this.expireMsg = {};
};

/* Adds one effect to time-based components.*/
RG.Component.Expiration.prototype.addEffect = function(comp, dur, msg) {
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
    if (msg) {
        if (!this.expireMsg) {this.expireMsg = {};}
        this.expireMsg[compID] = msg;
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
                if (this.expireMsg && this.expireMsg[compIDInt]) {
                    const msg = this.expireMsg[compIDInt];
                    RG.gameMsg({cell: ent.getCell(), msg});
                }
                else {
                    const msg = 'An effect wears of from ' + ent.getName();
                    RG.gameMsg({cell: ent.getCell(), msg});
                }
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
    if (this.expireMsg && this.expireMsg.hasOwnProperty(compID)) {
        delete this.expireMsg[compID];
    }
};

RG.Component.Expiration.prototype.cleanup = function() {
    const entity = this.getEntity();
    Object.keys(this.duration).forEach(compID => {
        entity.remove(parseInt(compID, 10));
    });
};

RG.Component.Breakable = UniqueTagComponent('Breakable');
RG.Component.Indestructible = UniqueTagComponent('Indestructible');
RG.Component.Ammo = TagComponent('Ammo');
RG.Component.Flying = TagComponent('Flying');
RG.Component.Undead = TagComponent('Undead');
RG.Component.Summoned = TagComponent('Summoned');
RG.Component.Sharpener = TagComponent('Sharpener');
RG.Component.Sharpened = TagComponent('Sharpened');
RG.Component.Possessed = TagComponent('Possessed');

RG.Component.Flame = TransientDataComponent('Flame',
    {damageType: '', damage: 1, source: null});

RG.Component.Weakness = DataComponent('Weakness', {
    effect: '',
    level: RG.WEAKNESS.MINOR
});

RG.Component.Resistance = DataComponent('Resistance', {
    effect: '',
    level: RG.RESISTANCE.MINOR
});

/* Used currently for magical arrows to distinguish them from shot/thrown
 * projectiles. */
RG.Component.Magical = UniqueTagComponent('Magical');

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
// ALPINIST COMPONENTS
//--------------------------------------------
RG.Component.Climber = UniqueTagComponent('Climber');
RG.Component.Jumper = UniqueDataComponent('Jumper', {jumpRange: 2});
RG.Component.Camouflage = UniqueTagComponent('Camouflage');
RG.Component.SnowWalk = UniqueTagComponent('SnowWalk');

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

/* Added to actors which stop spells from passing through. */
RG.Component.SpellStop = UniqueTagComponent('SpellStop');

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

/* Component used to pass data between systems. */
RG.Component.Event = TransientDataComponent('Event', {args: null});

RG.Component.Event.prototype._init = function(args) {
    this.args = args;
};

RG.Component.Effects = TransientDataComponent('Effects',
    {args: null, effectType: ''}
);
RG.Component.Effects.prototype._init = function(args) {
    this.args = args || {};
};

/* Can be added to actors when they're under player control. */
RG.Component.PlayerControlled = UniqueTagComponent('PlayerControlled');

/* Component added only to the actual player actor. */
RG.Component.Player = UniqueTagComponent('Player');

//--------------------------------------------
// Comps that add or remove other components
//--------------------------------------------

RG.Component.AddOnHit = DataComponent('AddOnHit', {
    comp: null,
    onDamage: true, // Apply when damage is dealt
    onAttackHit: false // Apply on successful hit (damage irrelevant)
});

RG.Component.AddOnHit.prototype.toJSON = function() {
    const jsonComp = this.comp.toJSON();
    return {
        setID: this.getID(),
        setType: this.getType(),
        setComp: {createComp: jsonComp},
        setOnDamage: this.onDamage,
        setOnAttackHit: this.onAttackHit
    };
};

/* Used to equip/unequip items. */
RG.Component.Equip = TransientDataComponent('Equip', {
    args: null, item: null, isRemove: false
});

/* Adds a component to given entity on equip (or removes it on unequip. */
RG.Component.AddOnEquip = DataComponent('AddOnEquip', {
    comp: null, addedToActor: false
});

RG.Component.AddOnEquip.prototype.toJSON = function() {
    const json = {
        setID: this.getID(),
        setType: this.getType(),
        setAddedToActor: this.addedToActor
    };
    if (!this.addedToActor) {
        const jsonComp = this.comp.toJSON();
        json.setComp = {createComp: jsonComp};
    }
    else {
        json.setComp = {createComp: this.comp}; // Store ID only
    }
    return json;
};

/* Can be used to modify a value of another component at certain
 * intervals. Placed on entity when regeneration is needed, and removed
 * once all values have regenerated. */
RG.Component.RegenEffect = DataComponent('RegenEffect', {
    PP: 1, HP: 1, waitPP: 30, waitHP: 30, maxWaitPP: 60, maxWaitHP: 60
});

/* Animation comp is used to pass data from other systems to Animation
 * System. */
RG.Component.Animation = TransientDataComponent('Animation',
    {args: null}
);

RG.Component.Animation.prototype._init = function(args) {
    this.args = args;
};

/* Adds a component into expiration component for given entity. */
RG.Component.addToExpirationComp = (entity, comp, dur, msg) => {
    if (entity.has('Expiration')) {
        entity.get('Expiration').addEffect(comp, dur, msg);
    }
    else {
        const expComp = new RG.Component.Expiration();
        expComp.addEffect(comp, dur, msg);
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

/* Added to a jumping entity. */
RG.Component.Jump = TransientDataComponent('Jump', {x: -1, y: -1});

/* Added to entity when it's opening a door. */
RG.Component.OpenDoor = TransientDataComponent('OpenDoor', {door: null});

RG.Component.UseItem = TransientDataComponent('UseItem',
    {item: null, useType: '', target: null, targetType: null, effect: null});

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

/* Abilities which stores the separate (non-spell) abilities of actor. */
RG.Component.Abilities = UniqueDataComponent('Abilities', {});

RG.Component.Abilities.prototype._init = function() {
    const _addCb = () => {
        const abilities = new Abilities(this.getEntity());
        // This is mainly used if component is restored
        if (Array.isArray(this.abilities)) {
            this.abilities.forEach(name => {
                const abil = new Ability[name]();
                abilities.addAbility(abil);
            });
        }
        this.abilities = abilities;
        this.removeCallbacks('onAdd');
    };
    this.addCallback('onAdd', _addCb);
};

RG.Component.Abilities.prototype.setAbilities = function(abils) {
    this.abilities = abils;
};

RG.Component.Abilities.prototype.createMenu = function() {
    return this.abilities.getMenu();
};

RG.Component.Abilities.prototype.addAbility = function(ability) {
    this.abilities.addAbility(ability);
};

RG.Component.Abilities.prototype.toJSON = function() {
    const json = RG.Component.Base.prototype.toJSON.call(this);
    json.setAbilities = this.abilities.toJSON();
    return json;
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
        this._source = null;
        // Behaves differently when on actor
        this._addedOnActor = false;
    }

    setSource(source ) {
        this._source = source;
    }

    getSource() {
        return this._source;
    }

    setComp(comp) {
        this._comp = comp;
        if (!this._addedOnActor) {
            const _addCb = () => {
                this.getEntity().add(this._comp);
                if (this._comp.setSource && this._source) {
                    this._comp.setSource(this._source);
                }
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
        if (this._source) {
            json.setSource = RG.getObjRef('entity', this._source);
        }
        if (!this._addedOnActor) {
            const jsonComp = this._comp.toJSON();
            return Object.assign(json, {setComp: {createComp: jsonComp}});
        }
        else {
            return Object.assign(json, {setAddedOnActor: true,
                setComp: this._comp // Contains an ID only
            });
        }
    }


}
RG.Component.Duration = Duration;

module.exports = RG.Component;


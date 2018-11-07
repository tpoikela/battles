
import RG from './rg';
import Ability from './abilities';

import Mixin from './mixin';
import Chat from './chat';
import Component from './component.base';

const Abilities = Ability.Abilities;

const DataComponent = Component.DataComponent;
const UniqueDataComponent = Component.UniqueDataComponent;
const TransientDataComponent = Component.TransientDataComponent;
const TransientTagComponent = Component.TransientTagComponent;
const TagComponent = Component.TagComponent;
const UniqueTagComponent = Component.UniqueTagComponent;

const BaseProto = Component.Base.prototype;

const NO_TYPE = Object.freeze('');

Component.Typed = UniqueDataComponent('Typed', {
    objType: NO_TYPE, propType: NO_TYPE
});

Component.Typed.prototype._init = function(type, propType) {
    this.objType = type;
    this.propType = propType;
};

/* Component is added to all items. To check if an entity is item, has('Item')
 * is enough. */
Component.Item = UniqueDataComponent('Item', {
    value: 1, damageType: RG.DMG.BLUNT, count: 1
});

Component.Item.prototype.incrCount = function(count) {
    this.count += count;
};

Component.Item.prototype.decrCount = function(count) {
    this.count -= count;
};

/* Component which takes care of hunger and satiation. */
Component.Hunger = UniqueDataComponent('Hunger',
    {energy: 20000, maxEnergy: 20000, minEnergy: -5000});

Component.Hunger.prototype.addEnergy = function(energy) {
    this.energy += energy;
    if (this.energy > this.maxEnergy) {
        this.energy = this.maxEnergy;
    }
};

Component.Hunger.prototype.decrEnergy = function(energy) {
    this.energy -= energy;
    if (this.energy < this.minEnergy) {
        this.energy = this.minEnergy;
    }
};

Component.Hunger.prototype.isStarving = function() {
    return this.energy <= 0;
};

Component.Hunger.prototype.isFull = function() {
    return this.energy === this.maxEnergy;
};

/**
 * Health component takes care of HP and such. */
Component.Health = UniqueDataComponent('Health',
    {HP: 10, maxHP: 10});

Component.Health.prototype.addHP = function(hp) {
    this.HP += hp;
    if (this.HP > this.maxHP) {this.HP = this.maxHP;}
};

Component.Health.prototype.decrHP = function(hp) {this.HP -= hp;};

Component.Health.prototype.isAlive = function() {
    return this.HP > 0;
};

Component.Health.prototype.isDead = function() {return this.HP <= 0;};

Component.Health.prototype.hpLost = function() {
    return this.maxHP - this.HP;
};

Component.Health.prototype._init = function(hp) {
    this.HP = hp;
    this.maxHP = hp;
};

/* Tag component to mark Dead actors (different from Undead) */
Component.Dead = UniqueTagComponent('Dead');

/* Tag component for entities with physical body. */
Component.Corporeal = UniqueTagComponent('Corporeal');

/* Component used to pass damage information between systems. */
Component.Damage = TransientDataComponent('Damage', {
    damage: 0, weapon: null, damageType: '', damageCateg: '',
    source: null, // Source of the damage (ie weapon)
    sourceActor: null // Actor who did the action to cause damage
});

Component.Damage.prototype._init = function(dmg, type) {
    this.damage = dmg;
    this.damageType = type;
};

/* In contrast to Damage (which is transient), DirectDamage can be
 * combined with Comp.AddOnHit to inflict additional damage
 * to an actor. */
Component.DirectDamage = DataComponent('DirectDamage', {
    damage: 0, damageType: '', damageCateg: '', prob: 1.0,
    source: null
});


Component.DirectDamage.prototype.toJSON = function() {
    const obj = Component.Base.prototype.toJSON.call(this);
    if (this.source) {
        obj.setSource = RG.getObjRef('entity', this.source);
    }
    else {
        delete obj.setSource;
    }
    return obj;
};

/* Component to entities which can be damaged (but have no health. */
Component.Damaged = UniqueDataComponent('Damaged',
    {damageLevel: 0}
);

/* Added to broken items/elements. Prevents their use. */
Component.Broken = UniqueTagComponent('Broken');

/* Component to tag entities that block light from passing through. */
Component.Impassable = UniqueDataComponent('Impassable', {
    canFlyOver: true, canJumpOver: true, spellPasses: true
});

Component.Impassable.prototype.setAllImpassable = function() {
    this.canFlyOver = false;
    this.spellPasses = false;
};

/* Component to tag entities that block light from passing through. */
Component.Opaque = UniqueTagComponent('Opaque');

/* Component used in entities gaining experience.*/
Component.Experience = UniqueDataComponent('Experience',
    {exp: 0, expLevel: 1, danger: 1});

/* This component is added when entity gains experience. It is removed after
* system evaluation and added to Experience component. */
Component.ExpPoints = TransientDataComponent('ExpPoints',
    {expPoints: null, skillPoints: null}
);

Component.ExpPoints.prototype._init = function(expPoints) {
    this.expPoints = expPoints;
    this.skills = {};
};

Component.ExpPoints.prototype.addSkillPoints = function(skill, pts) {
    this.skills[skill] = pts;
};

Component.ExpPoints.prototype.addExpPoints = function(exp) {
    this.expPoints += exp;
};

/* Combat component holds all combat-related information for actors. */
Component.Combat = UniqueDataComponent('Combat', {
    attack: 1, defense: 1, protection: 0, attackRange: 1, damageDie: null
});

Component.Combat.prototype._init = function() {
    this.damageDie = RG.FACT.createDie('1d4');
};

Component.Combat.prototype.rollDamage = function() {
    return this.damageDie.roll();
};

Component.Combat.prototype.setDamageDie = function(strOrDie) {
    if (typeof strOrDie === 'string') {
        this.damageDie = RG.FACT.createDie(strOrDie);
    }
    else {
        this.damageDie = strOrDie;
    }
};

Component.Combat.prototype.copy = function(rhs) {
    BaseProto.copy.call(this, rhs);
    this.damageDie = rhs.getDamageDie().clone();
};

Component.Combat.prototype.toJSON = function() {
    const obj = BaseProto.toJSON.call(this);
    obj.setDamageDie = this.damageDie.toString();
    return obj;
};

/* Modifiers for the Combat component.*/
Component.CombatMods = DataComponent('CombatMods', {
    attack: 0, defense: 0, protection: 0, attackRange: 0, damage: 0,
    tag: ''
});

export const {CombatMods} = Component;

/* This component stores entity stats like speed, agility etc.*/
Component.Stats = UniqueDataComponent('Stats', {
    accuracy: 5, agility: 5, strength: 5,
    willpower: 5, perception: 5, magic: 5, speed: 100
});

Component.Stats.prototype.clearValues = function() {
    this.setAccuracy(0);
    this.setAgility(0);
    this.setStrength(0);
    this.setWillpower(0);
    this.setPerception(0);
    this.setSpeed(0);
    this.setMagic(0);
};

/* Convenience function for increase a stat. */
Component.Stats.prototype.incrStat = function(statName, addValue) {
    const setter = 'set' + statName.capitalize();
    const getter = 'get' + statName.capitalize();
    const currValue = this[getter]();
    this[setter](currValue + addValue);
};

Component.Stats.prototype.toString = function() {
    let result = '';
    RG.GET_STATS.forEach((getter, i) => {
        const value = this[getter]();
        if (value !== 0) { // Show also neg. values
            result += RG.STATS_ABBR[i] + ': ' + value;
        }
    });
    return result;
};

Component.Stats.prototype.equals = function(rhs) {
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
Component.StatsMods = DataComponent('StatsMods', {
    accuracy: 0, agility: 0, strength: 0,
    willpower: 0, perception: 0, magic: 0, speed: 0,
    tag: ''
});

/* Perception component holds data related to actor perception. */
Component.Perception = UniqueDataComponent('Perception',
    {FOVRange: RG.NPC_FOV_RANGE});

/* Attack component is added to the actor when it attacks. Thus, source of the
 * attack is the entity having Attack component. */
Component.Attack = TransientDataComponent('Attack', {target: null});

/* Transient component added to a moving entity.*/
Component.Movement = TransientDataComponent('Movement', {
    x: 0, y: 0, level: null
});

Component.Movement.prototype.setXY = function(x, y) {
    this.x = x;
    this.y = y;
};

Component.Movement.prototype.getXY = function() {
    return [this.x, this.y];
};

Component.Movement.prototype._init = function(x, y, level) {
    this.x = x;
    this.y = y;
    this.level = level;
};

/* Transient component representing a chat action between actors. */
Component.Chat = TransientDataComponent('Chat', {args: null});

/* Data component added to trainer actors. */
Component.Trainer = UniqueDataComponent('Trainer', {
    chatObj: null
});

// Hack to prevent serialisation of chatObj
delete Component.Trainer.prototype.setChatObj;

Component.Trainer.prototype._init = function() {
    this.chatObj = new Chat.Trainer();

    const _addCb = () => {
      this.chatObj.setTrainer(this.getEntity());
    };
    this.addCallback('onAdd', _addCb);
};

/* Missile component is added to entities such as arrows and rocks
 * when they have been launched. */
Component.Missile = TransientDataComponent('Missile', {
    x: null, y: null, source: null, level: null,
    flying: true,
    targetX: null, targetY: null,
    range: 0, attack: 0, damage: 0, path: null
});

Component.Missile.prototype._init = function(source) {
    this.source = source;
    this.x = source.getX();
    this.y = source.getY();
    this.level = source.getLevel();
    this.path = [];
    this.pathIter = -1;
};

Component.Missile.prototype.hasRange = function() {
    return this.range > 0;
};

Component.Missile.prototype.isFlying = function() {
    return this.flying;
};

Component.Missile.prototype.stopMissile = function() {
    this.flying = false;
};

Component.Missile.prototype.setTargetXY = function(x, y) {
    this.path = RG.Geometry.getBresenham(this.x, this.y, x, y);
    this.targetX = x;
    this.targetY = y;
    if (this.path.length > 0) {this.pathIter = 0;}
};

/* Returns true if missile has reached its target map cell.*/
Component.Missile.prototype.inTarget = function() {
    return this.x === this.targetX && this.y === this.targetY;
};

Component.Missile.prototype.iteratorValid = function() {
    return this.pathIter >= 0 && this.pathIter < this.path.length;
};

Component.Missile.prototype.setValuesFromIterator = function() {
    const coord = this.path[this.pathIter];
    this.x = coord[0];
    this.y = coord[1];
};

/* Resets the path iterator to the first x,y. */
Component.Missile.prototype.first = function() {
    this.pathIter = 0;
    this.setValuesFromIterator();
    return [this.x, this.y];
};

/* Moves to next cell in missile's path. Returns null if path is finished.
 * */
Component.Missile.prototype.next = function() {
    if (this.iteratorValid()) {
        --this.range;
        ++this.pathIter;
        this.setValuesFromIterator();
        return true;
    }
    return null;
};

/* Returns the prev cell in missile's path. Moves iterator backward. */
Component.Missile.prototype.prev = function() {
    if (this.iteratorValid()) {
        ++this.range;
        --this.pathIter;
        this.setValuesFromIterator();
        return true;
    }
    return null;
};

/* This component holds loot that is dropped when given entity is destroyed.*/
Component.Loot = function(lootEntity) {
    Component.Base.call(this, 'Loot');

    // This will be dropped as loot
    this._lootEntity = lootEntity;
};
RG.extend2(Component.Loot, Component.Base);

/* Drops the loot to the given cell.*/
Component.Loot.prototype.dropLoot = function(cell) {
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

Component.Loot.prototype.setElemToCell = function(cell) {
    const entLevel = this.getEntity().getLevel();
    if (this._lootEntity.hasOwnProperty('useStairs')) {
        RG.debug(this, 'Added stairs to ' + cell.getX()
            + ', ' + cell.getY());
        entLevel.addStairs(this._lootEntity, cell.getX(), cell.getY());
    }
};

Component.Loot.prototype.setLootEntity = function(lootEntity) {
    this._lootEntity = lootEntity;
};

Component.Loot.prototype.toJSON = function() {
    const json = Component.Base.prototype.toJSON.call(this);
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
Component.Communication = TransientDataComponent('Communication',
    {msg: null});

Component.Communication.prototype._init = function() {
    this.msg = [];
};

Component.Communication.prototype.addMsg = function(obj) {
    this.msg.push(obj);
};

/* Added to entities which can cause damage without attack such as fire. Used
 * for AI navigation purposes at the moment. */
Component.Damaging = DataComponent('Damaging', {
    damage: 1, damageType: ''
});

/* Added to entities which are destroyed after use. */
Component.OneShot = UniqueTagComponent('OneShot');

/* Entities with physical components have weight and size.*/
Component.Physical = UniqueDataComponent('Physical',
    {weight: 1, size: 1});

/* Ethereal entities are visible but don't have normal interaction with
 * matter. */
Component.Ethereal = TagComponent('Ethereal',
    {description: 'Ethereal beings cannot interact physically with others'}
);

/* Stun component prevents actor from taking many actions like moving and
 * attacking. */
Component.Stun = function() {
    Component.Base.call(this, 'Stun');

    let _src = null;
    this.getSource = () => _src;
    this.setSource = src => {_src = src;};

    this.toJSON = () => {
        const obj = Component.Base.prototype.toJSON.call(this);
        if (RG.isActorActive(_src)) {
            obj.setSource = RG.getObjRef('entity', _src);
        }
        return obj;
    };

};
Component.Stun.description = 'Stunning prevents some actions to be done';
RG.extend2(Component.Stun, Component.Base);

/* Paralysis component prevents actor from taking many actions like moving and
 * attacking. */
const Paralysis = function() {
    Component.Base.call(this, 'Paralysis');

    let _src = null;
    this.getSource = () => _src;
    this.setSource = src => {_src = src;};

    this.toJSON = () => {
        const obj = Component.Base.prototype.toJSON.call(this);
        if (RG.isActorActive(_src)) {
            obj.setSource = RG.getObjRef('entity', _src);
        }
        return obj;
    };

};
Paralysis.description = 'Paralysed actors cannot perform any actions';
Component.Paralysis = Paralysis;
RG.extend2(Component.Paralysis, Component.Base);

/* Component added to summoned/created actors. */
Component.Created = UniqueDataComponent('Created', {creator: null});

Component.Created.prototype.toJSON = function() {
    const obj = Component.Base.prototype.toJSON.call(this);
    obj.setCreator = RG.getObjRef('entity', this.creator);
    return obj;
};

Component.Named = UniqueDataComponent('Named',
    {name: '', uniqueName: ''}
);

Component.Named.prototype.getFullName = function() {
    if (this.uniqueName !== '') {
        return `${this.uniqueName}, ${this.name}`;
    }
    return this.name;
};

/* MindControl component allows another actor to control the mind-controlled
 * actor. */
Component.MindControl = function() {
    Component.Base.call(this, 'MindControl');

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
        const obj = Component.Base.prototype.toJSON.call(this);
        if (RG.isActorActive(_src)) {
            obj.setSource = RG.getObjRef('entity', _src);
        }
        return obj;
    };
};
RG.extend2(Component.MindControl, Component.Base);

/* Poison component which damages the entity.*/
class Poison extends Mixin.DurationRoll(Mixin.DamageRoll(Component.Base)) {

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
        // May not be present in items etc
        if (RG.isActorActive(this._src)) {
            obj.setSource = RG.getObjRef('entity', this._src);
        }
        return obj;
    }
}
Poison.description = 'Poison causes damage periodically until it stop';
Component.Poison = Poison;

Component.Coldness = TagComponent('Coldness',
  {description: 'Coldness will gradually freeze a non-resistant beings'});
Component.Heat = TagComponent('Heat');

Component.BodyTemp = UniqueDataComponent('BodyTemp',
    {temp: 100, maxTemp: 100, minTemp: -100});

Component.BodyTemp.prototype.incr = function() {
    if (this.temp < this.maxTemp) {
        this.temp += 1;
    }
};

Component.BodyTemp.prototype.decr = function() {
    if (this.temp > this.minTemp) {
        this.temp -= 1;
    }
};

Component.BodyTemp.prototype.isFreezing = function() {
    return this.temp <= 0;
};

Component.BodyTemp.prototype.isFrozen = function() {
    return this.temp === this.minTemp;
};

/* For branding entity belonging to certain other entity. */
Component.Owned = UniqueDataComponent('Owned', {owner: null});

/* For branding stolen goods.*/
Component.Stolen = TagComponent('Stolen');

/* Added to unpaid items in shops. Removed once the purchase is done.*/
Component.Unpaid = TagComponent('Unpaid');

Component.Breakable = UniqueTagComponent('Breakable');
Component.Indestructible = UniqueTagComponent('Indestructible');
Component.Ammo = TagComponent('Ammo');
Component.Flying = TagComponent('Flying',
  {description: 'Flying beings can avoid difficult terrain and obstacles'});
Component.Undead = TagComponent('Undead');
Component.Summoned = TagComponent('Summoned');
Component.Sharpener = TagComponent('Sharpener',
  {description: 'You can sharpen weapons (once per weapoon'});
Component.Sharpened = TagComponent('Sharpened');
Component.Possessed = TagComponent('Possessed');

Component.Flame = TransientDataComponent('Flame',
    {damageType: '', damage: 1, source: null});

Component.Weakness = DataComponent('Weakness', {
    effect: '',
    level: RG.WEAKNESS.MINOR
},
    {description: 'Weakness increases damage from attacks of that type'}
);

Component.Resistance = DataComponent('Resistance', {
    effect: '',
    level: RG.RESISTANCE.MINOR
},
    {description: 'Resistance reduces damage from attacks of that type'}
);

/* Used currently for magical arrows to distinguish them from shot/thrown
 * projectiles. */
Component.Magical = UniqueTagComponent('Magical');

/* Used for non-sentient actors such as fire and moving doors. */
Component.NonSentient = UniqueTagComponent('NonSentient');

/* Component which stores the actor class object. */
Component.ActorClass = function() {
    Component.Base.call(this, 'ActorClass');
    this._class = null;
    this._className = null;

    this.setClassName = name => {
        this._className = name;
    };

    this.getClassName = () => this._className;

    this.getClass = () => this._class;
    this.setActorClass = actorClass => {
        this._class = actorClass;
    };

};
RG.extend2(Component.ActorClass, Component.Base);

Component.ActorClass.prototype.toJSON = function() {
    const json = BaseProto.toJSON.call(this);
    json.setActorClass = {
        createFunc: 'createActorClass',
        value: {
            className: this._className,
            actorRef: RG.getObjRef('entity', this.getEntity())
        }
    };
    return json;
};

//---------------------------------------------------------------------------
// MELEE COMBAT COMPONENTS
//---------------------------------------------------------------------------
Component.Defender = UniqueTagComponent('Defender',
    {description: 'Grants a minor defense (Def) bonus'});
Component.Attacker = UniqueTagComponent('Attacker',
    {description: 'Grants a minor attack (Att) bonus'});
Component.BiDirStrike = UniqueTagComponent('BiDirStrike',
    {description: 'You can attack to 2 opposite directions'});
Component.CounterAttack = UniqueTagComponent('CounterAttack',
    {desciption: 'You perform a counterattack when attacked by enemies'});
Component.Ambidexterity = UniqueTagComponent('Ambidexterity');
Component.LongReach = UniqueTagComponent('LongReach');

Component.FirstStrike = UniqueTagComponent('FirstStrike', {
    description: 'You can hit enemies first before they attack you'
});

/* Component which gives reduces equipment weight by 50%. */
Component.MasterEquipper = DataComponent('MasterEquipper',
    {factor: 0.5});

/* Component which gives an actor chance to bypass armor. */
Component.BypassProtection = DataComponent('BypassProtection',
    {chance: 0.0});

//--------------------------------------------
// ALPINIST COMPONENTS
//--------------------------------------------
Component.Climber = UniqueTagComponent('Climber');
Component.Jumper = UniqueDataComponent('Jumper', {jumpRange: 2});
Component.Camouflage = UniqueTagComponent('Camouflage');
Component.SnowWalk = UniqueTagComponent('SnowWalk');

Component.Amphibious = UniqueTagComponent('Amphibious');
//--------------------------------------------
// RANGED COMBAT COMPONENTS
//--------------------------------------------

Component.EagleEye = TagComponent('EagleEye', {
    description: 'Grants bonus to missile range and visibility'
});
Component.StrongShot = TagComponent('StrongShot', {
    description: 'Strength (Str) adds extra damage to missile attacks'
});
Component.ThroughShot = TagComponent('ThroughShot', {
    description: 'You can shoot through enemies to hit another target'
});
Component.MixedShot = TagComponent('MixedShot', {
    description: 'Allows mixing of ammo from different type of weapons'
});
Component.LongRangeShot = TagComponent('LongRangeShot', {
    description: 'Doubles missile attack range'
});
Component.RangedEvasion = TagComponent('RangedEvasion', {
    description: 'Grants 50% chance to evade missile/ranged spell attacks'
});
Component.CriticalShot = TagComponent('CriticalShot');
Component.DoubleShot = TagComponent('DoubleShot');

//--------------------------------------------
// Spellcasting related components
//--------------------------------------------

Component.SpellPower = function(maxPP) {
    Component.Base.call(this, 'SpellPower');
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
RG.extend2(Component.SpellPower, Component.Base);

/* PowerDrain component which is cancels a SpellCast and adds spell power to
 * holder of PowerDrain. */
Component.PowerDrain = function() {
    Component.Base.call(this, 'PowerDrain');

    this.drainDist = 5;
};
RG.extend2(Component.PowerDrain, Component.Base);
Component.PowerDrain.description =
    'Counters any spell cast near you, gives you power and then disappears';

Component.SpellBase = function(type) {
    Component.Base.call(this, type);

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
RG.extend2(Component.SpellBase, Component.Base);

/* SpellCasting component which is added to an actor when it casts a spell. */
Component.SpellCast = function() {
    Component.SpellBase.call(this, 'SpellCast');
};
RG.extend2(Component.SpellCast, Component.SpellBase);

Component.SpellRay = function() {
    Component.SpellBase.call(this, 'SpellRay');
};
RG.extend2(Component.SpellRay, Component.SpellBase);

Component.SpellMissile = function() {
    Component.SpellBase.call(this, 'SpellMissile');
};
RG.extend2(Component.SpellMissile, Component.SpellBase);

Component.SpellCell = function() {
    Component.SpellBase.call(this, 'SpellCell');
};
RG.extend2(Component.SpellCell, Component.SpellBase);

Component.SpellArea = function() {
    Component.SpellBase.call(this, 'SpellArea');
};
RG.extend2(Component.SpellArea, Component.SpellBase);

Component.SpellSelf = function() {
    Component.SpellBase.call(this, 'SpellSelf');
};
RG.extend2(Component.SpellSelf, Component.SpellBase);

/* Added to actors which stop spells from passing through. */
Component.SpellStop = UniqueTagComponent('SpellStop');

//--------------------------------------------
// Adventurer components
//--------------------------------------------

/* Triples the energy gained from eating foods. */
Component.NourishedOne = UniqueTagComponent('NourishedOne', {
    description: 'You gain triple amount of energy from food'
});

//--------------------------------------------
// Spirit-related components
//--------------------------------------------

/* Used when gem binding into item is attempted. */
Component.SpiritBind = TransientDataComponent('SpiritBind',
    {binder: null, target: null});

/* This component enables entity to bind gems into items. */
Component.GemBound = UniqueDataComponent('GemBound', {gem: null});
Component.GemBound.prototype.toJSON = function() {
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
Component.SpiritItemCrafter = UniqueTagComponent('SpiritItemCrafter', {
    description: 'Grants ability to bind gems to items such as weapons/armour'
});

//--------------------------------------------
// Comps related to the skill system
//--------------------------------------------

Component.Skills = function() {
    Component.Base.call(this, 'Skills');
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
RG.extend2(Component.Skills, Component.Base);

Component.SkillsExp = TransientDataComponent('SkillsExp',
    {skill: '', points: 0});

/* Component added to shopkeeper. */
Component.Shopkeeper = UniqueDataComponent('Shopkeeper',
    {levelID: -1, cells: null, doorXY: null}
);

Component.Shopkeeper._init = function() {
    this.cells = [];
};

/* Component which models a shop transaction. */
Component.Transaction = TransientDataComponent('Transaction', {args: null});

//--------------------------------------------
// Battle-related components
//--------------------------------------------

// Added to all entities inside a battle
Component.InBattle = function() {
    Component.Base.call(this, 'InBattle');
    this._isUnique = true;
    let _data = null;
    this.setData = data => {_data = data;};
    this.getData = () => _data;
    this.updateData = data => {_data = Object.assign(_data || {}, data);};
};
RG.extend2(Component.InBattle, Component.Base);

/* Added to entity once it uses a skill or destroys an opposing actor inside a
 * battle. */
Component.BattleExp = function() {
    Component.Base.call(this, 'BattleExp');

    let _data = null;

    this.setData = data => {_data = data;};
    this.getData = () => _data;
    this.updateData = data => {_data = Object.assign(_data || {}, data);};

};
RG.extend2(Component.BattleExp, Component.Base);

/* This component is placed on entities when the battle is over. It signals to
 * the Battle.System that experience should be processed now. After this, the
 * system processed and removed this and BattleExp components. */
Component.BattleOver = UniqueTagComponent('BattleOver');

/* Badges are placed on entities that survived a battle. */
Component.BattleBadge = function() {
    Component.Base.call(this, 'BattleBadge');

    let _data = null;

    this.setData = data => {_data = data;};
    this.getData = () => _data;
    this.updateData = data => {_data = Object.assign(_data, data);};

    this.isWon = () => _data.status === 'Won';
    this.isLost = () => _data.status === 'Lost';
};
RG.extend2(Component.BattleBadge, Component.Base);

/* An order given during battle. Used to give order to player at the moment. */
Component.BattleOrder = DataComponent('BattleOrder', {args: null});

/* Used for battle commanders. */
Component.Commander = TagComponent('Commander');

/* This component is added to entity when it gains reputation in some event, and
 * it keeps track of the amount and type of reputation. */
Component.Reputation = function() {
    Component.Base.call(this, 'Reputation');

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
RG.extend2(Component.Reputation, Component.Base);

/* Component used to pass data between systems. */
Component.Event = TransientDataComponent('Event', {args: null});

Component.Event.prototype._init = function(args) {
    this.args = args;
};

Component.Effects = TransientDataComponent('Effects',
    {args: null, effectType: ''}
);
Component.Effects.prototype._init = function(args) {
    this.args = args || {};
};

/* Can be added to actors when they're under player control. */
Component.PlayerControlled = UniqueTagComponent('PlayerControlled');

/* Component added only to the actual player actor. */
Component.Player = UniqueTagComponent('Player');

//--------------------------------------------
// Comps that add or remove other components
//--------------------------------------------

Component.AddOnHit = DataComponent('AddOnHit', {
    comp: null,
    onDamage: true, // Apply when damage is dealt
    onAttackHit: false // Apply on successful hit (damage irrelevant)
});

Component.AddOnHit.prototype.toJSON = function() {
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
Component.Equip = TransientDataComponent('Equip', {
    args: null, item: null, isRemove: false
});

/* Adds a component to given entity on equip (or removes it on unequip. */
Component.AddOnEquip = DataComponent('AddOnEquip', {
    comp: null, addedToActor: false
});

Component.AddOnEquip.prototype.toJSON = function() {
    const json: any = {
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
Component.RegenEffect = DataComponent('RegenEffect', {
    PP: 1, HP: 1, waitPP: 30, waitHP: 30, maxWaitPP: 60, maxWaitHP: 60
});

Component.Telepathy = DataComponent('Telepathy', {
    target: null, source: null
}, {
    description: "Grants ability to see through another being's eyes"
});

Component.Telepathy.prototype.toJSON = function() {
    const json: any = {
        setID: this.getID(),
        setType: this.getType()
    };
    if (RG.isActorActive(this.target)) {
        json.setTarget = RG.getObjRef('entity', this.target);
    }
    if (RG.isActorActive(this.source)) {
        json.setSource = RG.getObjRef('entity', this.source);
    }
    return json;
};

/* Animation comp is used to pass data from other systems to Animation
 * System. */
Component.Animation = TransientDataComponent('Animation',
    {args: null}
);

Component.Animation.prototype._init = function(args) {
    this.args = args;
};

/* Adds a component into expiration component for given entity. */
Component.addToExpirationComp = (entity, comp, dur, msg) => {
    if (entity.has('Expiration')) {
        entity.get('Expiration').addEffect(comp, dur, msg);
    }
    else {
        const expComp = new Component.Expiration();
        expComp.addEffect(comp, dur, msg);
        entity.add(expComp);
    }
    if (!entity.has(comp)) {
        entity.add(comp);
    }
};

//---------------------------------------------------------------------------
// BASE ACTIONS (transient components, not serialized, stored ever)
//---------------------------------------------------------------------------

/* Added to a entity giving an item. */
Component.Give = TransientDataComponent('Give',
    {giveTarget: null, item: null});

/* Added to a jumping entity. */
Component.Jump = TransientDataComponent('Jump', {x: -1, y: -1});

/* Added to entity when it's opening a door. */
Component.OpenDoor = TransientDataComponent('OpenDoor', {door: null});

/* Added to entity when it's picking up something. */
Component.Pickup = TransientTagComponent('Pickup');

/* Added to an entity reading something. */
Component.Read = TransientDataComponent('Read', {readTarget: null});

Component.UseElement = TransientDataComponent('UseElement',
    {element: null, useType: ''});

Component.UseItem = TransientDataComponent('UseItem',
    {item: null, useType: '', target: null, targetType: null, effect: null});

/* Added to entity when it's using stairs to move to another level. */
Component.UseStairs = TransientTagComponent('UseStairs');

//---------------------------------------------------------------------------
// PLAYER-related data components
//---------------------------------------------------------------------------

/* Added to player to record various event in the game. */
Component.GameInfo = UniqueDataComponent('GameInfo', {
    data: null});

Component.GameInfo.prototype._init = function() {
    this.data = {zones: {}};
};

/* Updates the data with given object. */
Component.GameInfo.prototype.updateData = function(data) {
    const oldData = this.data;
    this.data = Object.assign(oldData, data);
};

Component.GameInfo.prototype.addZone = function(id) {
    this.data.zones[id] = true;
};

Component.GameInfo.prototype.hasZone = function(id) {
    return this.data.zones[id];
};

Component.GameInfo.prototype.addZoneType = function(type) {
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
Component.Abilities = UniqueDataComponent('Abilities', {});

Component.Abilities.prototype._init = function() {
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

Component.Abilities.prototype.setAbilities = function(abils) {
    this.abilities = abils;
};

Component.Abilities.prototype.createMenu = function() {
    return this.abilities.getMenu();
};

Component.Abilities.prototype.addAbility = function(ability) {
    this.abilities.addAbility(ability);
};

Component.Abilities.prototype.toJSON = function() {
    const json = Component.Base.prototype.toJSON.call(this);
    json.setAbilities = this.abilities.toJSON();
    return json;
};

//---------------------------------------------------------------------------
// TIME-related components
//---------------------------------------------------------------------------

/* Fading component is added to entities which disappear eventually */
Component.Fading = DataComponent('Fading', {duration: 0});

Component.Fading.prototype.decrDuration = function() {
    this.duration -= 1;
};

/* Expiration component handles expiration of time-based effects. Any component
 * can be made transient by using this Expiration component. For example, to
 * have transient, non-persistent Ethereal, you can use this component. */
Component.Expiration = DataComponent('Expiration',
    {duration: null, expireMsg: null});

Component.Expiration.prototype._init = function() {
    this.expireMsg = {};
};

/* Adds one effect to time-based components.*/
Component.Expiration.prototype.addEffect = function(comp, dur, msg) {
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
Component.Expiration.prototype.decrDuration = function() {
    for (const compIDStr in this.duration) {
        const compID: number = parseInt(compIDStr, 10);
        if (compID >= 0) {
            this.duration[compID] -= 1;
            if (this.duration[compID] === 0) {
                const ent = this.getEntity();
                if (this.expireMsg && this.expireMsg[compID]) {
                    const msg = this.expireMsg[compID];
                    RG.gameMsg({cell: ent.getCell(), msg});
                }
                else {
                    const msg = 'An effect wears of from ' + ent.getName();
                    RG.gameMsg({cell: ent.getCell(), msg});
                }
                ent.remove(compID);
                delete this.duration[compID];
            }
        }
    }
};

/* Returns true if component has any time-effects with non-zero duration.*/
Component.Expiration.prototype.hasEffects = function() {
    return Object.keys(this.duration).length > 0;
};

Component.Expiration.prototype.hasEffect = function(comp) {
    const compID = comp.getID();
    return this.duration.hasOwnProperty(compID);
};

/* Should be called to remove a specific effect, for example upon death of
 * an actor. */
Component.Expiration.prototype.removeEffect = function(comp) {
    const compID = comp.getID();
    if (this.duration.hasOwnProperty(compID)) {
        delete this.duration[compID];
    }
    if (this.expireMsg && this.expireMsg.hasOwnProperty(compID)) {
        delete this.expireMsg[compID];
    }
};

Component.Expiration.prototype.cleanup = function() {
    const entity = this.getEntity();
    Object.keys(this.duration).forEach(compID => {
        entity.remove(parseInt(compID, 10));
    });
};

/* This component can be added to any other component to make that component
 * stay for a specific duration only. */
class Duration extends Mixin.DurationRoll(Component.Base) {

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

            // Moves the comp to actor, and stores only comp ID
            // inside this object
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
        if (RG.isActorActive(this._source)) {
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
Component.Duration = Duration;

//--------------------------------------------
// QUEST COMPONENTS
//--------------------------------------------

const NO_QUEST_REWARD = -1;
const NO_SUB_QUEST = -1;

/* QuestGiver is added to actors who can give quests. Only one comp
 * supported per actor. */
Component.QuestGiver = UniqueDataComponent('QuestGiver', {
    hasGivenQuest: false, descr: '',
    questID: -1, danger: 1, reward: NO_QUEST_REWARD,
    hasGivenReward: false,
    questTargets: null
});

Component.QuestGiver.prototype._init = function(descr) {
    this.chatObj = new Chat.Quest();
    this.descr = descr;
    this.questID = this.getID();
    this.questTargets = [];

    const _addCb = () => {
      this.chatObj.setQuestGiver(this.getEntity());
    };
    this.addCallback('onAdd', _addCb);
};

Component.QuestGiver.prototype.hasReward = function() {
    return this.reward && (this.reward !== NO_QUEST_REWARD);
};

Component.QuestGiver.prototype.giveQuest = function(target) {
    if (target) {
        this.questGivenTo = target;
        this.hasGivenQuest = true;
    }
    else {
        this.hasGivenQuest = false;
    }
};

Component.QuestGiver.prototype.addTarget = function(targetType, target) {
    if (!target) {
        RG.err('Component.QuestGiver', 'addTarget',
            `No target given. Type ${targetType}`);
    }
    const name = RG.getName(target);
    if (!RG.isEmpty(name)) {
        const targetData = {
            id: target.getID(), name, targetType,
            subQuestID: -1
        };
        const qTarget = target.get('QuestTarget');
        if (qTarget.getSubQuestID() !== NO_SUB_QUEST) {
            targetData.subQuestID = qTarget.getSubQuestID();
        }
        this.questTargets.push(targetData);
    }
    else {
        RG.err('Component.QuestGiver', 'addTarget',
            `Empty name got for target ${JSON.stringify(target)}`);
    }
};

Component.QuestGiver.prototype.toJSON = function() {
    const json = BaseProto.toJSON.call(this);
    // json.setQuestData = this.questData.toJSON();
    if (this.questGivenTo) {
        json.giveQuest = RG.getObjRef('entity', this.questGivenTo);
    }
    return json;
};

Component.QuestGiver.prototype.getChatObj = function() {
    return this.chatObj;
};

/* QuestTarget Comp is added to quest targets (items, actors etc). */
Component.QuestTarget = DataComponent('QuestTarget', {
    targetType: '', target: null, isCompleted: false,
    targetID: -1, questID: -1, subQuestID: NO_SUB_QUEST
});

Component.QuestTarget.prototype.isKill = function() {
    return this.targetType === 'kill';
};

Component.QuestTarget.prototype.toString = function() {
    let name = '';
    if (this.target.getName) {
        name = this.target.getName();
    }
    else if (this.target.getParent) {
        const parent = this.target.getParent();
        if (parent) {
            name = parent.getName();
        }
        if (parent.getParent) {
            const topParent = parent.getParent();
            name += ' of ' + topParent.getName();
        }
    }
    return `${this.targetType} ${name}`;
};

Component.QuestTarget.prototype.toJSON = function() {
    const json = BaseProto.toJSON.call(this);
    json.setTargetType = this.targetType;
    if (this.target.$objID) {
        json.setTarget = RG.getObjRef('object', this.target);
    }
    else {
        json.setTarget = RG.getObjRef('entity', this.target);
    }
    return json;
};

/* Quest component contains all info related to a single quest. */
Component.Quest = DataComponent('Quest', {
    giver: null, questTargets: null, questID: -1, descr: ''
});

Component.Quest.prototype._init = function() {
    this.questTargets = [];
};

Component.Quest.prototype.addTarget = function(targetData) {
    this.questTargets.push(targetData);
};

Component.Quest.prototype.isInThisQuest = function(targetComp) {
    return this.getQuestID() === targetComp.getQuestID();
};

Component.Quest.prototype.getTargetsByType = function(targetType) {
    return this.questTargets.filter(obj => (
        obj.targetType === targetType
    ));
};

/* Returns first quest target matching the given targetType. */
Component.Quest.prototype.first = function(targetType) {
    const targetObj = this.questTargets.find(obj => (
        obj.targetType === targetType
    ));
    if (targetObj) {return targetObj;}
    return null;
};

/* Returns true if all QuestTarget comps have been completed. */
Component.Quest.prototype.isCompleted = function() {
    return this.questTargets.reduce((acc, obj) => acc && obj.isCompleted,
        true);
};

Component.Quest.prototype.isTargetInQuest = function(targetComp) {
    const target = targetComp.getTarget();
    for (let i = 0; i < this.questTargets.length; i++) {
        const curr = this.questTargets[i];
        if (curr.id === target.getID()) {
            return true;
        }
    }
    return false;
};

Component.Quest.prototype.toString = function() {
    let res = '';
    this.questTargets.forEach((obj, i) => {
        if (i > 0) {res += '. ';}
        if (obj.targetType === 'subquest') {
            res += 'Talk to ' + obj.name;
        }
        else {
            res += obj.targetType + ' ' + obj.name;
        }
    });
    return res;
};

Component.QuestInfo = DataComponent('QuestInfo', {
    question: '', info: '',
    givenBy: -1 // ID of the info source
});

Component.QuestReport = DataComponent('QuestReport', {
    expectInfoFrom: -2
});

Component.QuestCompleted = TransientDataComponent('QuestCompleted',
    {giver: null}
);

Component.GiveQuest = TransientDataComponent('GiveQuest',
    {target: null, giver: null}
);

Component.QuestTargetEvent = TransientDataComponent('QuestTargetEvent',
    {targetComp: null, args: null, eventType: ''}
);

Component.QuestTargetEvent.prototype.setTargetComp = function(target) {
    RG.assertType(target, 'QuestTarget');
    this.targetComp = target;
};

export default Component;

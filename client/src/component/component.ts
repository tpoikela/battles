
import RG from '../rg';

import * as Mixin from '../mixin';
import {ComponentBase, Component, NO_SERIALISATION} from './component.base';
import {EventPool} from '../eventpool';
import {Entity} from '../entity';
import {Dice} from '../dice';
import {Geometry} from '../geometry';
import {TCoord, ILoreEntry, TLoreMsg} from '../interfaces';

const POOL = EventPool.getPool();

const DataComponent = Component.DataComponent;
const UniqueDataComponent = Component.UniqueDataComponent;
const UniqueTransientDataComponent = Component.UniqueTransientDataComponent;
const TransientDataComponent = Component.TransientDataComponent;
const TransientTagComponent = Component.TransientTagComponent;
const TagComponent = Component.TagComponent;
const UniqueTagComponent = Component.UniqueTagComponent;

const BaseProto = ComponentBase.prototype;

const NO_TYPE = Object.freeze('');

type Cell = import('../map.cell').Cell;

/* Placed on player if any system sees an impossible cmd being done. */
export const ImpossibleCmd = UniqueTagComponent('ImpossibleCmd');

/* Action component is added to all schedulable acting entities.*/
export const Action = UniqueTransientDataComponent('Action',
    {energy: 0, active: false, msg: '', status: 0});


Action.prototype.addEnergy = function(energy: number): void {
    this.energy += energy;
};

Action.prototype.resetEnergy = function(): void {this.energy = 0;};

Action.prototype.enable = function() {
    if (this.active === false) {
        POOL.emitEvent(RG.EVT_ACT_COMP_ENABLED,
            {actor: this.getEntity()});
        this.active = true;
    }
};

Action.prototype.disable = function() {
    if (this.active === true) {
        POOL.emitEvent(RG.EVT_ACT_COMP_DISABLED,
            {actor: this.getEntity()});
        this.active = false;
    }
};


export const Location = UniqueDataComponent('Location', {
    x: -1, y: -1, level: null});

Location.prototype.getXY = function(): TCoord {return [this.x, this.y];};
Location.prototype.setXY = function(x: number, y: number): void {
    this.x = x;
    this.y = y;
};

Location.prototype.isValid = function(): boolean {
    if (!this.level) {
        return this.x >= 0 && this.y >= 0;
    }
    // TODO check level max boundaries
    return this.x >= 0 && this.y >= 0;
};

Location.prototype.unsetLevel = function(): void {
    if (this.level) {
        this.level = null;
    }
    else {
        RG.err('Location', 'unsetLevel',
            'Trying to unset already null level.');
    }
};

/* Returns true if object is located at a position on a level.*/
Location.prototype.isLocated = function(): boolean {
    return (this.x >= 0) && (this.y >= 0)
        && (this.level !== null);
};

/* Returns true if object is located at a position on a level.*/
Location.prototype.getCell = function(): Cell | null {
    if (this.level) {
        return this.level.getMap().getCell(this.x, this.y);
    }
    return null;
};

// Location.prototype.toJSON = NO_SERIALISATION;
Location.prototype.toJSON = function() {
    const obj: any = {
        setType: this.getType(), setID: this.getID(),
        setX: this.x, setY: this.y
    };
    if (this.level) {
        obj.setLevel = RG.getObjRef('entity', this.level);
    }
    return obj;
};

export const Typed = UniqueDataComponent('Typed', {
    objType: NO_TYPE, propType: NO_TYPE
});

Typed.prototype._init = function(type: string, propType: string) {
    this.objType = type;
    this.propType = propType;
};

/* Component is added to all items. To check if an entity is item, has('Item')
 * is enough. */
export const Item = UniqueDataComponent('Item', {
    value: 1, damageType: RG.DMG.BLUNT, count: 1
});

Item.prototype.incrCount = function(count: number) {
    this.count += count;
};

Item.prototype.decrCount = function(count) {
    this.count -= count;
};

/* Component which takes care of hunger and satiation. */
export const Hunger = UniqueDataComponent('Hunger',
    {energy: 20000, maxEnergy: 20000, minEnergy: -5000});

Hunger.prototype.addEnergy = function(energy) {
    this.energy += energy;
    if (this.energy > this.maxEnergy) {
        this.energy = this.maxEnergy;
    }
};

Hunger.prototype.decrEnergy = function(energy) {
    this.energy -= energy;
    if (this.energy < this.minEnergy) {
        this.energy = this.minEnergy;
    }
};

Hunger.prototype.isStarving = function() {
    return this.energy <= 0;
};

Hunger.prototype.isFull = function() {
    return this.energy === this.maxEnergy;
};

/*
 * Health component takes care of HP and such. */
export const Health = UniqueDataComponent('Health',
    {HP: 10, maxHP: 10});

Health.prototype.addHP = function(hp) {
    this.HP += hp;
    if (this.HP > this.maxHP) {this.HP = this.maxHP;}
};

Health.prototype.propLeft = function(): number {
    return this.HP / this.maxHP;
};

Health.prototype.decrHP = function(hp) {this.HP -= hp;};

Health.prototype.isAlive = function() {
    return this.HP > 0;
};

Health.prototype.isDead = function() {return this.HP <= 0;};

Health.prototype.hpLost = function() {
    return this.maxHP - this.HP;
};

Health.prototype._init = function(hp) {
    this.HP = hp;
    this.maxHP = hp;
};

/* Tag component to mark Dead actors (different from Undead) */
export const Dead = UniqueTagComponent('Dead');

export const DeathEvent = UniqueTransientDataComponent('DeathEvent', {
    msg: '', source: null
});

/* Tag component for entities with physical body. */
export const Corporeal = UniqueTagComponent('Corporeal');

/* Component used to pass damage information between systems. */
export const Damage = TransientDataComponent('Damage', {
    damage: 0, weapon: null, damageType: '', damageCateg: '',
    source: null, // Source of the damage (ie weapon)
    sourceActor: null // Actor who did the action to cause damage
});

Damage.prototype._init = function(dmg, type) {
    this.damage = dmg;
    this.damageType = type;
};

Damage.prototype.isType = function(dmgType: string): boolean {
    return this.damageType === dmgType;
};

/* In contrast to Damage (which is transient), DirectDamage can be
 * combined with Comp.AddOnHit to inflict additional damage
 * to an actor. */
export const DirectDamage = DataComponent('DirectDamage', {
    damage: 0, damageType: '', damageCateg: '', prob: 1.0,
    source: null, msg: ''
});

DirectDamage.prototype.rollDamage = function(): number {
    return this.damage.roll();
};

DirectDamage.prototype.setDamage = function(dmgOrStr): void {
    if (typeof dmgOrStr === 'number') {
        this.damage = new Dice(0, 0, dmgOrStr);
    }
    else if (typeof dmgOrStr === 'object') {
        this.damage = dmgOrStr.clone();
    }
    else {
        this.damage = Dice.create(dmgOrStr);
    }
};

DirectDamage.prototype.toJSON = function() {
    const obj = ComponentBase.prototype.toJSON.call(this);
    if (this.source) {
        obj.setSource = RG.getObjRef('entity', this.source);
    }
    else {
        delete obj.setSource;
    }
    obj.setDamage = this.damage.toString();
    return obj;
};

/* Component to entities which can be damaged (but have no health. */
export const Damaged = UniqueDataComponent('Damaged',
    {damageLevel: 0}
);

/* Added to broken items/elements. Prevents their use. */
export const Broken = UniqueTagComponent('Broken');

/* Component to tag entities that cannot be traversed through. */
export const Impassable = UniqueDataComponent('Impassable', {
    canFlyOver: true, canJumpOver: true, spellPasses: true
});

Impassable.prototype.setAllImpassable = function() {
    this.canFlyOver = false;
    this.spellPasses = false;
};

/* Component to tag entities that block light from passing through. */
export const Opaque = UniqueTagComponent('Opaque');


export const Terrain = UniqueDataComponent('Terrain', {
    mods: null});

Terrain.prototype._init = function() {
    this.mods = [];
};

/* Component used in entities gaining experience.*/
export const Experience = UniqueDataComponent('Experience',
    {exp: 0, expLevel: 1, danger: 1, numKilled: 0});

Experience.prototype.incrNumKilled = function() {
    this.numKilled += 1;
};

/* This component is added when entity gains experience. It is removed after
* system evaluation and added to Experience component. */
export const ExpPoints = TransientDataComponent('ExpPoints',
    {expPoints: null, skillPoints: null}
);

ExpPoints.prototype._init = function(expPoints) {
    this.expPoints = expPoints;
    this.skills = {};
};

ExpPoints.prototype.addSkillPoints = function(skill, pts) {
    this.skills[skill] = pts;
};

ExpPoints.prototype.addExpPoints = function(exp) {
    this.expPoints += exp;
};

/* Combat component holds all combat-related information for actors. */
export const Combat = UniqueDataComponent('Combat', {
    attack: 1, defense: 1, protection: 0, attackRange: 1, damageDie: null,
    numHits: 1
});

Combat.prototype._init = function() {
    this.damageDie = Dice.create('1d4');
};

Combat.prototype.rollDamage = function() {
    return this.damageDie.roll();
};

Combat.prototype.setDamageDie = function(strOrDie) {
    if (typeof strOrDie === 'string') {
        this.damageDie = Dice.create(strOrDie);
    }
    else {
        this.damageDie = strOrDie;
    }
};

Combat.prototype.copy = function(rhs) {
    BaseProto.copy.call(this, rhs);
    this.damageDie = rhs.getDamageDie().clone();
};

Combat.prototype.toJSON = function() {
    const obj = BaseProto.toJSON.call(this);
    obj.setDamageDie = this.damageDie.toString();
    return obj;
};

/* Modifiers for the Combat component.*/
export const CombatMods = DataComponent('CombatMods', {
    attack: 0, defense: 0, protection: 0, attackRange: 0, damage: 0,
    tag: ''
});

/* This component stores entity stats like speed, agility etc.*/
export const Stats = UniqueDataComponent('Stats', RG.STATS_DEFAULTS);

Stats.prototype.clearValues = function() {
    RG.SET_STATS.forEach((func: string) => {
        this[func](0);
    });
};

/* Convenience function for increase a stat. */
Stats.prototype.incrStat = function(statName: string, addValue: number): void {
    const setter = 'set' + statName.capitalize();
    const getter = 'get' + statName.capitalize();
    const currValue = this[getter]();
    this[setter](currValue + addValue);
};

Stats.prototype.toString = function(): string {
    let result = '';
    RG.GET_STATS.forEach((getter, i) => {
        const value = this[getter]();
        if (value !== 0) { // Show also neg. values
            result += RG.STATS_ABBR[i] + ': ' + value;
        }
    });
    return result;
};

Stats.prototype.equals = function(rhs): boolean {
    let res = this.getType() === rhs.getType();
    RG.GET_STATS.forEach((getFunc: string) => {
        res = res && this[getFunc]() === rhs[getFunc]();
    });
    return res;
};

/* Stats modifier component. */
const zeroStats = RG.createStatsObj(0);
export const StatsMods = DataComponent('StatsMods',
   Object.assign({tag: ''}, zeroStats));
/*
   {
    accuracy: 0, agility: 0, strength: 0,
    willpower: 0, perception: 0, magic: 0, speed: 0,
    tag: ''
});*/

/* Perception component holds data related to actor perception. */
export const Perception = UniqueDataComponent('Perception',
    {FOVRange: RG.NPC_FOV_RANGE});

/* Attack component is added to the actor when it attacks. Thus, source of the
 * attack is the entity having Attack component. */
export const Attack = TransientDataComponent('Attack', {target: null});

export const AttackRanged = TransientDataComponent('AttackRanged', {
    target: null, attacker: null
});

/* Transient component added to a moving entity.*/
export const Movement = TransientDataComponent('Movement', {
    x: 0, y: 0, level: null
});

Movement.prototype.setXY = function(x, y) {
    this.x = x;
    this.y = y;
};

Movement.prototype.getXY = function() {
    return [this.x, this.y];
};

Movement.prototype._init = function(x, y, level) {
    this.x = x;
    this.y = y;
    this.level = level;
};

/* Transient component representing a chat action between actors. */
export const Chat = TransientDataComponent('Chat', {args: null});

/* Missile component is added to entities such as arrows and rocks
 * when they have been launched. */
export const Missile = TransientDataComponent('Missile', {
    x: null, y: null, source: null, level: null,
    flying: true,
    targetX: null, targetY: null,
    range: 0, attack: 0, damage: 0, path: null
});

Missile.prototype._init = function(source) {
    this.source = source;
    this.x = source.getX();
    this.y = source.getY();
    this.level = source.getLevel();
    this.path = [];
    this.pathIter = -1;
};

Missile.prototype.hasRange = function() {
    return this.range > 0;
};

Missile.prototype.isFlying = function() {
    return this.flying;
};

Missile.prototype.stopMissile = function() {
    this.flying = false;
};

Missile.prototype.setTargetXY = function(x, y) {
    this.path = Geometry.getBresenham(this.x, this.y, x, y);
    this.targetX = x;
    this.targetY = y;
    if (this.path.length > 0) {this.pathIter = 0;}
};

/* Returns true if missile has reached its target map cell.*/
Missile.prototype.inTarget = function() {
    return this.x === this.targetX && this.y === this.targetY;
};

Missile.prototype.iteratorValid = function() {
    return this.pathIter >= 0 && this.pathIter < this.path.length;
};

Missile.prototype.setValuesFromIterator = function() {
    const coord = this.path[this.pathIter];
    this.x = coord[0];
    this.y = coord[1];
};

/* Resets the path iterator to the first x,y. */
Missile.prototype.first = function() {
    this.pathIter = 0;
    this.setValuesFromIterator();
    return [this.x, this.y];
};

/* Moves to next cell in missile's path. Returns null if path is finished.
 * */
Missile.prototype.next = function() {
    if (this.iteratorValid()) {
        --this.range;
        ++this.pathIter;
        this.setValuesFromIterator();
        return true;
    }
    return null;
};

/* Returns the prev cell in missile's path. Moves iterator backward. */
Missile.prototype.prev = function() {
    if (this.iteratorValid()) {
        ++this.range;
        --this.pathIter;
        this.setValuesFromIterator();
        return true;
    }
    return null;
};

/* This component holds loot that is dropped when given entity is destroyed.*/
export const Loot = function(lootEntity) {
    ComponentBase.call(this, 'Loot');

    // This will be dropped as loot
    this._lootEntity = lootEntity;
};
RG.extend2(Loot, ComponentBase);
Component.Loot = Loot;

/* Drops the loot to the given cell.*/
Loot.prototype.dropLoot = function(cell) {
    const level = this.getEntity().getLevel();
    if (this._lootEntity.getPropType) {
        const propType = this._lootEntity.getPropType();
        if (propType === 'elements') {
            this.setElemToCell(cell);
        }
        else if (propType === RG.TYPE_ITEM) {
            level.addItem(this._lootEntity, cell.getX(), cell.getY());
            // cell.setProp(propType, this._lootEntity);
        }
        else {
            RG.err('Component.Loot', 'dropLoot',
               'Unsupported propType for entity: ' + propType);
        }
    }
    else {
        RG.err('Loot', 'dropLoot', 'Loot has no propType!');
    }
};

Loot.prototype.setElemToCell = function(cell) {
    const entLevel = this.getEntity().getLevel();
    if (this._lootEntity.hasOwnProperty('useStairs')) {
        RG.debug(this, 'Added stairs to ' + cell.getX()
            + ', ' + cell.getY());
        entLevel.addStairs(this._lootEntity, cell.getX(), cell.getY());
    }
};

Loot.prototype.setLootEntity = function(lootEntity) {
    this._lootEntity = lootEntity;
};

Loot.prototype.toJSON = function() {
    const json = ComponentBase.prototype.toJSON.call(this);
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
        RG.err('Loot', 'toJSON',
            'Only items/actors loot types are supported');
    }
    return json;
};

/* This component is added to entities receiving communication. Communication
 * is used to point out enemies and locations of items, for example.*/
export const Communication = TransientDataComponent('Communication',
    {msg: null});

Communication.prototype._init = function() {
    this.msg = [];
};

Communication.prototype.addMsg = function(obj) {
    this.msg.push(obj);
};

/* Added to entities which can cause damage without attack such as fire. Used
 * for AI navigation purposes at the moment. */
export const Damaging = DataComponent('Damaging', {
    damage: 1, damageType: ''
});

/* Added to entities which are destroyed after use. */
export const OneShot = UniqueTagComponent('OneShot');
OneShot.description = 'Destroyed automatically after one use';

/* Entities with physical components have weight and size.*/
export const Physical = UniqueDataComponent('Physical',
    {weight: 1, size: 1});

/* Ethereal entities are visible but don't have normal interaction with
 * matter. */
export const Ethereal = TagComponent('Ethereal',
    {description: 'Ethereal beings cannot interact physically with others'}
);

/* Stun component prevents actor from taking many actions like moving and
 * attacking. */
export const Stun = DataComponent('Stun', {source: null});

Stun.prototype.toJSON = function() {
    const obj = ComponentBase.prototype.toJSON.call(this);
    if (RG.isActorActive(this.source)) {
        obj.setSource = RG.getObjRef('entity', this.source);
    }
    return obj;
};
Stun.description = 'Stunning prevents some actions to be done';

/* Paralysis component prevents actor from taking many actions like moving and
 * attacking. */
export const Paralysis = DataComponent('Paralysis', {source: null});
Paralysis.description = 'Paralysed actors cannot perform any actions';

Paralysis.prototype.toJSON = function() {
    const obj = ComponentBase.prototype.toJSON.call(this);
    if (RG.isActorActive(this.source)) {
        obj.setSource = RG.getObjRef('entity', this.source);
    }
    return obj;
};

/* Component added to summoned/created actors. */
export const Created = UniqueDataComponent('Created', {creator: null});

Created.prototype.toJSON = function() {
    const obj = ComponentBase.prototype.toJSON.call(this);
    obj.setCreator = RG.getObjRef('entity', this.creator);
    return obj;
};

export const Named = UniqueDataComponent('Named',
    {name: '', uniqueName: ''}
);

Named.prototype.prepend = function(name: string): void {
    this.name = name + this.name;
};

Named.prototype.getBaseName = function(): string {
    return this.name;
};

Named.prototype.getFullName = function() {
    if (this.uniqueName !== '') {
        return `${this.uniqueName}, ${this.name}`;
    }
    return this.name;
};

/* Poison component which damages the entity.*/
export class Poison extends Mixin.DurationRoll(Mixin.DamageRoll(ComponentBase)) {

    public static description: string;

    protected _prob: number;
    protected _src: any;

    constructor() {
        super('Poison');
        this._src = null;
        this._prob = 0.05; // Prob. of poison kicking in
    }

    public getProb(): number {return this._prob;}
    public setProb(prob: number): void {this._prob = prob;}

    public getSource() {return this._src;}
    public setSource(src): void {this._src = src;}

    public copy(rhs): void {
        super.copy(rhs);
        this._prob = rhs.getProb();
        this._src = rhs.getSource();
    }

    public toJSON() {
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

export const Coldness = TagComponent('Coldness',
  {description: 'Coldness will gradually freeze a non-resistant beings'});

export const Heat = TagComponent('Heat');

export const BodyTemp = UniqueDataComponent('BodyTemp',
    {temp: 100, maxTemp: 100, minTemp: -100});

BodyTemp.prototype.incr = function() {
    if (this.temp < this.maxTemp) {
        this.temp += 1;
    }
};

BodyTemp.prototype.decr = function() {
    if (this.temp > this.minTemp) {
        this.temp -= 1;
    }
};

BodyTemp.prototype.isFreezing = function() {
    return this.temp <= 0;
};

BodyTemp.prototype.isFrozen = function() {
    return this.temp === this.minTemp;
};

/* For branding entity belonging to certain other entity. */
export const Owned = UniqueDataComponent('Owned', {owner: null});

/* For branding stolen goods.*/
export const Stolen = TagComponent('Stolen');

/* Added to unpaid items in shops. Removed once the purchase is done.*/
export const Unpaid = TagComponent('Unpaid');

export const Breakable = UniqueTagComponent('Breakable');
export const Indestructible = UniqueTagComponent('Indestructible');
export const Ammo = TagComponent('Ammo');
export const Flying = TagComponent('Flying',
  {description: 'Flying beings can avoid difficult terrain and obstacles'});
export const Undead = TagComponent('Undead');
export const Summoned = TagComponent('Summoned');
export const Sharpener = TagComponent('Sharpener',
  {description: 'You can sharpen weapons (once per weapoon'});
export const Sharpened = TagComponent('Sharpened');
export const Possessed = TagComponent('Possessed');

export const Flame = TransientDataComponent('Flame',
    {damageType: '', damage: 1, source: null});

export const Weakness = DataComponent('Weakness', {
    effect: '',
    level: RG.WEAKNESS.MINOR
},
    {description: 'Weakness increases damage from attacks of that type'}
);

export const Resistance = DataComponent('Resistance', {
    effect: '',
    level: RG.RESISTANCE.MINOR
},
    {description: 'Resistance reduces damage from attacks of that type'}
);

/* Used currently for magical arrows to distinguish them from shot/thrown
 * projectiles. */
export const Magical = UniqueTagComponent('Magical');

/* Used for non-sentient actors such as fire and moving doors. */
export const NonSentient = UniqueTagComponent('NonSentient');

/* Component which stores the actor class object. */
export const ActorClass = function() {
    ComponentBase.call(this, 'ActorClass');
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
RG.extend2(ActorClass, ComponentBase);
Component.ActorClass = ActorClass;

ActorClass.prototype.toJSON = function() {
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
export const Defender = UniqueTagComponent('Defender',
    {description: 'Grants a minor defense (Def) bonus'});
export const Attacker = UniqueTagComponent('Attacker',
    {description: 'Grants a minor attack (Att) bonus'});
export const BiDirStrike = UniqueTagComponent('BiDirStrike',
    {description: 'You can attack to 2 opposite directions'});
export const CounterAttack = UniqueTagComponent('CounterAttack',
    {desciption: 'You perform a counterattack when attacked by enemies'});
export const Ambidexterity = UniqueTagComponent('Ambidexterity');
export const LongReach = UniqueTagComponent('LongReach');

export const FirstStrike = UniqueTagComponent('FirstStrike', {
    description: 'You can hit enemies first before they attack you'
});

/* Component which gives reduces equipment weight by 50%. */
export const MasterEquipper = DataComponent('MasterEquipper',
    {factor: 0.5});

/* Component which gives an actor chance to bypass armor. */
export const BypassProtection = DataComponent('BypassProtection',
    {chance: 0.0});

/* Component which can prevent an attack being made. */
export const Charm = DataComponent('Charm', {
    level: 1, targetActor: RG.NO_TARGET
});

//--------------------------------------------
// ALPINIST COMPONENTS
//--------------------------------------------
export const Climber = UniqueTagComponent('Climber');
export const Jumper = UniqueDataComponent('Jumper', {jumpRange: 2});
export const Camouflage = UniqueTagComponent('Camouflage');
export const SnowWalk = UniqueTagComponent('SnowWalk');

export const Amphibious = UniqueTagComponent('Amphibious');
//--------------------------------------------
// RANGED COMBAT COMPONENTS
//--------------------------------------------

export const EagleEye = TagComponent('EagleEye', {
    description: 'Grants bonus to missile range and visibility'
});
export const StrongShot = TagComponent('StrongShot', {
    description: 'Strength (Str) adds extra damage to missile attacks'
});
export const ThroughShot = TagComponent('ThroughShot', {
    description: 'You can shoot through enemies to hit another target'
});
export const MixedShot = TagComponent('MixedShot', {
    description: 'Allows mixing of ammo from different type of weapons'
});
export const LongRangeShot = TagComponent('LongRangeShot', {
    description: 'Doubles missile attack range'
});
export const RangedEvasion = TagComponent('RangedEvasion', {
    description: 'Grants 50% chance to evade missile/ranged spell attacks'
});
export const CriticalShot = TagComponent('CriticalShot');
export const DoubleShot = TagComponent('DoubleShot');

export const Deflection = TagComponent('Deflection', {
    description: 'Grants ability to deflect missile attacks'
});

//--------------------------------------------
// Spellcasting related components
//--------------------------------------------

export const SpellPower = UniqueDataComponent('SpellPower', {
    PP: 10, maxPP: 10
});

SpellPower.prototype.addPP = function(pp) {
    this.PP += pp;
    if (this.PP > this.maxPP) {this.PP = this.maxPP;}
};

SpellPower.prototype.decrPP = function(pp) {
    this.PP -= pp;
};

SpellPower.prototype.propLeft = function(): number {
    return this.PP / this.maxPP;
};

SpellPower.prototype.hasPower = function() {
    return this.PP > 0;
};

SpellPower.prototype.canCast = function(spellPP: number): boolean {
    return this.PP >= spellPP;
};

/* PowerDrain component which is cancels a SpellCast and adds spell power to
 * holder of PowerDrain. */
export const PowerDrain = DataComponent('PowerDrain', {
    drainDist: 5
});
PowerDrain.description =
    'Counters any spell cast near you, gives you power and then disappears';

const spellArgs = {spell: null, source: null, args: null};

/* SpellCasting component which is added to an actor when it casts a spell. */
export const SpellCast = TransientDataComponent('SpellCast', spellArgs);
export const SpellRay = TransientDataComponent('SpellRay', spellArgs);
export const SpellMissile = TransientDataComponent('SpellMissile', spellArgs);
export const SpellCell = TransientDataComponent('SpellCell', spellArgs);
export const SpellArea = TransientDataComponent('SpellArea', spellArgs);
export const SpellSelf = TransientDataComponent('SpellSelf', spellArgs);

/* Added to actors which stop spells from passing through. */
export const SpellStop = UniqueTagComponent('SpellStop');

//--------------------------------------------
// Adventurer components
//--------------------------------------------

/* Triples the energy gained from eating foods. */
export const NourishedOne = UniqueTagComponent('NourishedOne', {
    description: 'You gain triple amount of energy from food'
});

//--------------------------------------------
// Spirit-related components
//--------------------------------------------

/* Used when gem binding into item is attempted. */
export const SpiritBind = TransientDataComponent('SpiritBind',
    {binder: null, target: null});

/* This component enables entity to bind gems into items. */
export const GemBound = UniqueDataComponent('GemBound', {gem: null});
GemBound.prototype.toJSON = function() {
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
export const SpiritItemCrafter = UniqueTagComponent('SpiritItemCrafter', {
    description: 'Grants ability to bind gems to items such as weapons/armour'
});

//--------------------------------------------
// Comps related to the skill system
//--------------------------------------------

export const Skills = UniqueDataComponent('Skills', {skills: null});
Skills.prototype._init = function() {
    this.skills = {};
};

Skills.prototype.hasSkill = function(skill: string): boolean {
    return this.skills.hasOwnProperty(skill);
};

Skills.prototype.addSkill = function(skill: string): void {
    this.skills[skill] = {name: skill, level: 1, points: 0};
};

/* Returns the skill level, or 0 if no skill exists. */
Skills.prototype.getLevel = function(skill: string): number {
    if (this.hasSkill(skill)) {
        return this.skills[skill].level;
    }
    return 0;
};
Skills.prototype.setLevel = function(skill, level): void {
    this.skills[skill].level = level;
};
Skills.prototype.getPoints = function(skill: string): number {
    return this.skills[skill].points;
};

Skills.prototype.resetPoints = function(skill: string): void {
    this.skills[skill].points = 0;
};

Skills.prototype.addPoints = function(skill: string, points: number): void {
    if (this.hasSkill(skill)) {
        this.skills[skill].points += points;
    }
};

Skills.prototype.toJSON = function() {
    return {
        setID: this.getID(),
        setType: this.getType(),
        setSkills: this.skills
    };
};

export const SkillsExp = TransientDataComponent('SkillsExp',
    {skill: '', points: 0});

/* Component added to shopkeeper. */
export const Shopkeeper = UniqueDataComponent('Shopkeeper',
    {levelID: -1, cells: null, doorXY: null}
);

Shopkeeper._init = function() {
    this.cells = [];
};

/* Component which models a shop transaction. */
export const Transaction = TransientDataComponent('Transaction', {args: null});


/* Required to store the effects into an actor/entity. */
export const UseEffects = UniqueDataComponent('UseEffects', {
    effects: null
});

UseEffects.prototype._init = function(): void {
    this.effects = [];
};

UseEffects.prototype.addEffect = function(effect): void {
    this.effects.push(effect);
};

UseEffects.prototype.hasEffect = function(name: string): boolean {
    const index = this.effects.findIndex(eff => {
        return eff.hasOwnProperty(name);
    });
    return index >= 0;
};

//--------------------------------------------
// Battle-related components
//--------------------------------------------
//
export const Groups = UniqueDataComponent('Groups', {
    groups: null
});
Groups.prototype._init = function() {
    this.groups = [];
};

Groups.prototype.addGroup = function(id: number) {
    const index = this.groups.indexOf(id);
    if (index < 0) {this.groups.push(id);}
};

Groups.prototype.hasGroupId = function(ids: number[]): boolean {
    for (let i = 0; i < ids.length; i++) {
        if (this.groups.indexOf(ids[i]) >= 0) {return true;}
    }
    return false;
};

export const BattleEvent = TransientDataComponent('BattleEvent', {
    battle: null, eventType: ''
});

// Added to all entities inside a battle

export const InBattle = UniqueDataComponent('InBattle', {data: null});
InBattle.prototype._init = function() {
    this.data = {};
};
InBattle.prototype.updateData = function(data) {
    Object.keys(data).forEach(key => {
        this.data[key] = data[key];
    });
};

/* Added to entity once it uses a skill or destroys an opposing actor inside a
 * battle. */
export const BattleExp = DataComponent('BattleExp', {data: null});
BattleExp.prototype._init = function() {
    this.data = {};
};
BattleExp.prototype.updateData = function(data) {
    Object.keys(data).forEach(key => {
        this.data[key] = data[key];
    });
};

/* This component is placed on entities when the battle is over. It signals to
 * the Battle.System that experience should be processed now. After this, the
 * system processed and removed this and BattleExp components. */
export const BattleOver = UniqueTagComponent('BattleOver');

/* Badges are placed on entities that survived a battle. */
export const BattleBadge = DataComponent('BattleBadge', {data: null});
BattleBadge.prototype._init = function() {
    this.data = {};
};
BattleBadge.prototype.updateData = function(data) {
    Object.keys(data).forEach(key => {
        this.data[key] = data[key];
    });
};

BattleBadge.prototype.isWon = function() {return this.data.status === 'Won';};
BattleBadge.prototype.isLost = function() {return this.data.status === 'Lost';};
BattleBadge.prototype.isTraitor = function() {return this.data.status === 'Traitor';};
BattleBadge.prototype.isTied = function() {return this.data.status === 'Tied';};
BattleBadge.prototype.isEscaped = function() {return this.data.status === 'Fled';};

/* An order given during battle. Used to give order to player at the moment. */
export const BattleOrder = DataComponent('BattleOrder', {args: null});

/* Used for battle commanders. */
export const Commander = TagComponent('Commander');

/* This component is added to entity when it gains reputation in some event, and
 * it keeps track of the amount and type of reputation. */
export const Reputation = UniqueDataComponent('Reputation', {
    data: null
});
Reputation.prototype._init = function() {
    this.data = {
        fame: 0,
        numFriendsAttacked: 0
    };
};

Reputation.prototype.updateData = function(data) {
    this.data = Object.assign(this.data, data);
};

Reputation.prototype.addToFame = function(nFame) {
    this.data.fame += nFame;
};

/* Component used to pass data between systems. */
export const Event = TransientDataComponent('Event', {args: null});

Event.prototype._init = function(args) {
    this.args = args;
};

export const Effects = TransientDataComponent('Effects',
    {args: null, effectType: ''}
);
Effects.prototype._init = function(args) {
    this.args = args || {};
};

/* Can be added to actors when they're under player control. */
export const PlayerControlled = UniqueTagComponent('PlayerControlled');

/* Component added only to the actual player actor. */
export const Player = UniqueTagComponent('Player');

//--------------------------------------------
// Comps that add or remove other components
//--------------------------------------------

export const AddOnHit = DataComponent('AddOnHit', {
    comp: null,
    onDamage: true, // Apply when damage is dealt
    onAttackHit: false // Apply on successful hit (damage irrelevant)
});

AddOnHit.prototype.getCompToAdd = function() {
    if (this.comp.toJSON) {
        return this.comp;
    }
    return Component.createFromObj(this.comp.transientComp, this.comp.func);
};

AddOnHit.prototype.toJSON = function() {
    const obj: any  = {
        setID: this.getID(),
        setType: this.getType(),
        setComp: this.comp, // Might be in object format already
        setOnDamage: this.onDamage,
        setOnAttackHit: this.onAttackHit
    };
    // But check here if we need to convert to JSON
    if (this.comp.toJSON) {
        obj.setComp = {createComp: this.comp.toJSON()};
    }
    return obj;
};

/* Used to equip/unequip items. */
export const Equip = TransientDataComponent('Equip', {
    args: null, item: null, isRemove: false
});

/* Adds a component to given entity on equip (or removes it on unequip. */
export const AddOnEquip = DataComponent('AddOnEquip', {
    comp: null, addedToActor: false
});

AddOnEquip.prototype.toJSON = function() {
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
export const RegenEffect = DataComponent('RegenEffect', {
    PP: 1, HP: 1, waitPP: 30, waitHP: 30, maxWaitPP: 60, maxWaitHP: 60
});

export const Telepathy = DataComponent('Telepathy', {
    target: null, source: null
}, {
    description: 'Grants ability to see through eyes of another being'
});

Telepathy.prototype.toJSON = function() {
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
export const Animation = TransientDataComponent('Animation',
    {args: null}
);

Animation.prototype._init = function(args) {
    this.args = args;
};

/* Adds a component into expiration component for given entity. */
export const addToExpirationComp = (
    entity: Entity, comp: ComponentBase, dur: number, msg?: string
) => {
    if (entity.has('Expiration')) {
        entity.get('Expiration').addEffect(comp, dur, msg);
    }
    else {
        const expComp = new Expiration();
        expComp.addEffect(comp, dur, msg);
        entity.add(expComp);
    }
    if (!entity.has(comp)) {
        entity.add(comp);
    }
};

export const DontRender = UniqueTagComponent('DontRender');

//---------------------------------------------------------------------------
// BASE ACTIONS (transient components, not serialized, stored ever)
//---------------------------------------------------------------------------

/* Added to a entity giving an item. */
export const Give = TransientDataComponent('Give',
    {giveTarget: null, item: null});

/* Added to a jumping entity. */
export const Jump = TransientDataComponent('Jump', {x: -1, y: -1});

/* Added to entity when it's opening a door. */
export const OpenDoor = TransientDataComponent('OpenDoor', {door: null});

/* Added to entity when it's picking up something. */
export const Pickup = TransientTagComponent('Pickup');

/* Added to an entity reading something. */
export const Read = TransientDataComponent('Read', {readTarget: null});

export const Rest = TransientTagComponent('Rest');

export const UseElement = TransientDataComponent('UseElement',
    {element: null, useType: ''});

export const UseItem = TransientDataComponent('UseItem',
    {item: null, useType: '', target: null, targetType: null, effect: null});

/* Added to entity when it's using stairs to move to another level. */
export const UseStairs = TransientTagComponent('UseStairs');

//---------------------------------------------------------------------------
// PLAYER-related data components
//---------------------------------------------------------------------------

/* Added to player to record various event in the game. */
export const GameInfo = UniqueDataComponent('GameInfo', {
    data: null});

GameInfo.prototype._init = function() {
    this.data = {zones: {}};
};

/* Updates the data with given object. */
GameInfo.prototype.updateData = function(data) {
    const oldData = this.data;
    this.data = Object.assign(oldData, data);
};

GameInfo.prototype.addZone = function(id) {
    this.data.zones[id] = true;
};

GameInfo.prototype.hasZone = function(id) {
    return this.data.zones[id];
};

GameInfo.prototype.addZoneType = function(type) {
    const data = this.data;
    if (!data.zones.hasOwnProperty(type)) {
        data.zones[type] = 1;
    }
    else {
        data.zones[type] += 1;
    }
    this.data = data;
};


//---------------------------------------------------------------------------
// TIME-related components
//---------------------------------------------------------------------------

/* Fading component is added to entities which disappear eventually */
export const Fading = DataComponent('Fading', {duration: 0});

Fading.prototype.decrDuration = function() {
    this.duration -= 1;
};

/* Expiration component handles expiration of time-based effects. Any component
 * can be made transient by using this Expiration component. For example, to
 * have transient, non-persistent Ethereal, you can use this component. */
export const Expiration = DataComponent('Expiration',
    {duration: null, expireMsg: null});

Expiration.prototype._init = function() {
    this.expireMsg = {};
};

/* Adds one effect to time-based components.*/
Expiration.prototype.addEffect = function(comp, dur, msg) {
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
Expiration.prototype.decrDuration = function() {
    for (const compIDStr in this.duration) {
        if (this.duration[compIDStr]) {
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
    }
};

/* Returns true if component has any time-effects with non-zero duration.*/
Expiration.prototype.hasEffects = function() {
    return Object.keys(this.duration).length > 0;
};

Expiration.prototype.hasEffect = function(comp) {
    const compID = comp.getID();
    return this.duration.hasOwnProperty(compID);
};

/* Should be called to remove a specific effect, for example upon death of
 * an actor. */
Expiration.prototype.removeEffect = function(comp) {
    const compID = comp.getID();
    if (this.duration.hasOwnProperty(compID)) {
        delete this.duration[compID];
    }
    if (this.expireMsg && this.expireMsg.hasOwnProperty(compID)) {
        delete this.expireMsg[compID];
    }
};

Expiration.prototype.cleanup = function() {
    const entity = this.getEntity();
    Object.keys(this.duration).forEach(compID => {
        entity.remove(parseInt(compID, 10));
    });
};

/* This component can be added to any other component to make that component
 * stay for a specific duration only. */
export class Duration extends Mixin.DurationRoll(ComponentBase) {

    public _comp: ComponentBase | number;
    public _source: any;
    public _addedOnActor: boolean;
    public _expireMsg: string;

    constructor() {
        super('Duration');
        this._comp = null;
        this._source = null;
        // Behaves differently when on actor
        this._addedOnActor = false;
        this._expireMsg = '';
    }

    public setSource(source: any): void {
        this._source = source;
    }

    public setExpireMsg(msg: string): void {
        this._expireMsg = msg;
    }

    public getExpireMsg(): string {
        return this._expireMsg;
    }

    public getSource() {
        return this._source;
    }

    public setComp(comp: ComponentBase): void {
        this._comp = comp;
        if (!this._addedOnActor) {

            // Moves the comp to actor, and stores only comp ID
            // inside this object
            const _addCb = () => {
                this.getEntity().add(this._comp);
                if ((this._comp as any).setSource && this._source) {
                    (this._comp as any).setSource(this._source);
                }
                this._comp = (this._comp as ComponentBase).getID();
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

    public getComp() {return this._comp;}

    public copy(rhs) {
        super.copy(rhs);
        const comp = rhs.getComp().clone();
        this.setComp(comp);
    }

    public clone() {
        const newComp = super.clone();
        newComp.copy(this);
        return newComp;
    }

    public setAddedOnActor(added: boolean): void {
        this._addedOnActor = added;
    }

    public getAddedOnActor() {return this._addedOnActor;}

    public toJSON() {
        const json = super.toJSON();
        if (RG.isActorActive(this._source)) {
            json.setSource = RG.getObjRef('entity', this._source);
        }
        if (!this._addedOnActor) {
            const jsonComp = (this._comp as ComponentBase).toJSON();
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

//---------------------
// Weather components
//---------------------
export const Weather = DataComponent('Weather', {
    weatherType: 'clear'
});

export const WeatherEffect = TransientDataComponent('WeatherEffect', {
    effectType: 'clear'
});

export const WorldSimEvent = TransientDataComponent('WorldSimEvent', {
    eventType: '', eventData: null
});

export const ZoneEvent = TransientDataComponent('ZoneEvent', {
    eventType: '', eventData: null
});

/* Added to elements that are indoors. */
export const Indoor = UniqueTagComponent('Indoor');

/* Added to elements having some snow. */
export const Snowy = UniqueTagComponent('Snowy');

export const Entrapping = UniqueDataComponent('Entrapping', {
    difficulty: 1, destroyOnMove: false
});

export const Entrapped = UniqueTagComponent('Entrapped');


export interface ComponentLore {
    entries: ILoreEntry[];
    hasTopic(topic: string): boolean;
    getKey(query: any): ILoreEntry[];
    getMsg(topic: string): string[];
    addTopic(key: string, msg: any): void;
    getLoreTopics(): string[];
    addEntry(entry: ILoreEntry): void;
    hasEntry(entry: ILoreEntry): boolean;
}


/* Component attached to Level/Places for Lore. */
export const Lore = DataComponent('Lore', {
    entries: null, // Stores actual Lore entries into list
    tag: '' // Used for internal bookkeeping only
});

Lore.prototype._init = function() {
    this.entries = [];
};

Lore.prototype.addEntry = function(entry: ILoreEntry): void {
    if ((entry as any).msg) {
        let err = 'entry.msg not supported. Use entry.respMsg from now on';
        err += ' Got: ' + JSON.stringify((entry as any).msg);
        RG.err('Component.Lore', 'addEntry', err);
    }
    if (!entry.topic) {
        console.log('Entry was ', entry);
        RG.err('Component.Lore', 'addEntry',
            `Given entry has no topic: ${JSON.stringify(entry)}`);
    }
    this.entries.push(entry);
};


Lore.prototype.hasEntry = function(entry: ILoreEntry): boolean {
    let hasEntry = false;
    const entries = this.getKey({topic: entry.topic});
    entries.forEach((otherEntry: ILoreEntry) => {
        hasEntry = hasEntry || this.compareEntry(entry, otherEntry);
    });
    return hasEntry;
};

/* Compares two lore entries for similarity. */
Lore.prototype.compareEntry = function(lhs: ILoreEntry, rhs: ILoreEntry): boolean {
    if (lhs.topic !== rhs.topic) {return false;}
    if (lhs.askMsg || rhs.askMsg) {
        if (lhs.askMsg !== rhs.askMsg) {return false;}
    }
    if (lhs.respMsg || rhs.respMsg) {
        if (lhs.respMsg !== rhs.respMsg) {return false;}
    }
    if (lhs.names && rhs.names) {
        if (lhs.names.length !== rhs.names.length) {
            return false;
        }
    }
    else if (lhs.names || rhs.names) {
        return false;
    }

    return true;
};


/* Returns all entries with given key. */
Lore.prototype.getKey = function(query: any): ILoreEntry[] {
    const entries: ILoreEntry[] = [];
    this.entries.forEach((entry: ILoreEntry) => {
        let entryAdded = false;
        Object.keys(query).forEach(qq => {
            if ((entry as any)[qq] === query[qq]) {
                if (!entryAdded) {
                    entries.push(entry);
                }
                entryAdded = true;
            }
        });
    });
    return entries;
};


Lore.prototype.getRespMsg = function(topic: string): TLoreMsg[] {
    let res: TLoreMsg[] = [];
    this.entries.forEach((entry: ILoreEntry) => {
        if (entry.topic === topic) {
            const msg = entry.respMsg;
            if (msg) {
                if (Array.isArray(msg)) {
                    res = res.concat(msg);
                }
                else {
                    res.push(msg);
                }
            }
        }
    });
    return res;
};


Lore.prototype.addTopic = function(key: string, respMsg: TLoreMsg): void {
    const obj: ILoreEntry = {topic: key, respMsg};
    this.entries.push(obj);
};


Lore.prototype.hasTopic = function(key: string): boolean {
    const topics = this.getLoreTopics();
    const idx = topics.indexOf(key);
    return idx >= 0;
};


Lore.prototype.getLoreTopics = function(): string[] {
    const topics: string[] = [];
    this.entries.forEach(e => {
        if (topics.indexOf(e.topic) < 0) {
            topics.push(e.topic);
        }
    });
    return topics;
};

export const DrainStat = TransientDataComponent('DrainStat', {
    drainAmount: 1, sourceComp: '', sourceGetter: '', sourceSetter: '',
    targetComp: '', targetGetter: '', targetSetter: '', source: null,
    drainMsg: ''
});

DrainStat.prototype.applyComp = function(): boolean {
    const ent = this.getEntity();
    const srcComp = ent.get(this.sourceComp);
    if (srcComp) {
        const origValue = srcComp[this.sourceGetter]();
        srcComp[this.sourceSetter](origValue - this.drainAmount);

        const tComp = this.source.get(this.targetComp);
        if (tComp) {
            const origTValue = tComp[this.targetGetter]();
            tComp[this.targetSetter](origTValue + this.drainAmount);
            return true;
        }
    }
    return false;
};


import Entity from './entity';

const RG = require('./rg');
RG.Component = require('./component');
RG.Brain = require('./brain.virtual');
RG.Brain.Player = require('./brain.player');
RG.Inv = require('./inv');
RG.Spell = require('./spell');
RG.Time = require('./time');
const Mixin = require('./mixin');

RG.Actor = {};

const ACTOR_NO_ACTION = Object.freeze(() => {});
const EMPTY_ARGS = Object.freeze({});
const SPEED_COEFF = RG.BASE_SPEED * RG.ACTION_DUR;

class BaseActor extends Mixin.Locatable(Mixin.Typed(Entity)) {

    constructor(name) { // {{{2
        super({propType: RG.TYPE_ACTOR, type: null});
        this._name = name;
        this.add(new RG.Component.Action());
    }

    isPlayer() {return false;}
    isEnemy() {return false;}
    addEnemy() {/* No implementation here */}

    setName(name) {this._name = name;}
    getName() {return this._name;}

    getBrain() {return this._brain;}

    setBrain(brain) {
        this._brain = brain;
        this._brain.setActor(this);
    }

    getSpeed() {
        return RG.BASE_SPEED;
    }

    getEquipProtection() {return 0;}

    /* Returns the next action for this actor.*/
    nextAction(obj) {
        // Use actor brain to determine the action
        const cb = this._brain.decideNextAction(obj);
        let action = null;

        if (cb !== null) {
            const duration = Math.round(SPEED_COEFF / this.getSpeed());
            action = new RG.Time.Action(duration, cb, EMPTY_ARGS);
        }
        else {
            action = new RG.Time.Action(0, ACTOR_NO_ACTION, EMPTY_ARGS);
        }

        if (this._brain.hasOwnProperty('energy')) {
            action.energy = this._brain.energy;
        }
        action.actor = this;
        return action;
    }

    /* Serializes the virtual actor. */
    toJSON() {
        let levelID = null;
        if (this.getLevel()) {
            levelID = this.getLevel().getID();
        }
        const obj = {
            id: this.getID(),
            name: this.getName(),
            type: this.getType(),
            levelID,
            brain: this._brain.toJSON()
        };

        obj.components = RG.Component.compsToJSON(this);

        if (obj.type === null) {
            RG.err('Actor.Virtual', 'toJSON',
                `Type null for ${JSON.stringify(obj)}`);
        }

        return obj;
    }

}
RG.Actor.Base = BaseActor;

/* Virtual actor can be used to spawn more entities or for AI-like effects
 * inside a level. */
class VirtualActor extends BaseActor {

    constructor(name) { // {{{2
        super(name);
        this._brain = new RG.Brain.Virtual(this);
    }


}
RG.Actor.Virtual = VirtualActor;

/* Object representing a game actor who takes actions.  */
class RGActorRogue extends BaseActor {
    constructor(name) { // {{{2
        super(name);

        this._brain = new RG.Brain.Rogue(this);
        this._brain.getMemory().addEnemyType('player');

        this._invEq = new RG.Inv.Inventory(this);
        this._maxWeight = 10.0;

        // Components for this entity
        this.add(new RG.Component.Experience());
        this.add(new RG.Component.Combat());
        this.add(new RG.Component.Stats());
        this.add(new RG.Component.Health(50));
        this.add(new RG.Component.Corporeal());

        const perception = new RG.Component.Perception();
        perception.setFOVRange(RG.NPC_FOV_RANGE);
        this.add(new RG.Component.Perception());
    }

    /* Returns true if actor is a player.*/
    isPlayer() {
        return this.has('Player') || this.has('PlayerControlled');
    }

    getFOVRange() {
        let range = this.get('Perception').getFOVRange();
        if (this.has('EagleEye')) {range += 2;}
        return range;
    }

    setFOVRange(range) {
        this.get('Perception').setFOVRange(range);
    }

    //---------------------------------
    // Brain-related methods
    //---------------------------------

    addEnemy(actor) {this._brain.addEnemy(actor);}
    addFriend(actor) {this._brain.addFriend(actor);}

    isEnemy(actor) {
        return this._brain.getMemory().isEnemy(actor);
    }

    isFriend(actor) {
        return this._brain.getMemory().isFriend(actor);
    }

    //---------------------------------
    // Equipment related methods
    //---------------------------------

    getInvEq() { return this._invEq; }

    /* Returns weapon that is wielded by the actor.*/
    getWeapon() {return this._invEq.getWeapon();}

    /* Returns weapon that is wielded by the actor.*/
    getMissileWeapon() {
        return this._invEq.getMissileWeapon();
    }

    /* Returns missile equipped by the player.*/
    getMissile() {
        return this._invEq.getEquipment().getItem('missile');
    }

    getEquipAttack() {
        let att = this._invEq.getEquipment().getAttack();
        if (this.has('Skills')) {
            att += this.get('Skills').getLevel('Melee');
        }
        return att;
    }

    getEquipDefense() {
        let def = this._invEq.getEquipment().getDefense();
        if (this.has('Skills')) {
            def += this.get('Skills').getLevel('Shields');
        }
        return def;
    }

    getEquipProtection() {
        return this._invEq.getEquipment().getProtection();
    }

    getShieldDefense() {
        const shield = this._invEq.getEquipment().getEquipped('shield');
        let bonus = 0;
        if (shield) {
            bonus = shield.getDefense();
            if (this.has('Skills')) {
                bonus += this.get('Skills').getLevel('Shields');
            }
        }
        return bonus;
    }

    setActorClass(classObj) {
        this._actorClass = classObj;
    }

    getActorClass() {
        return this._actorClass;
    }

    setBook(book) {
        this._spellbook = book;
    }

    getBook() {
        return this._spellbook;
    }

    /* Returns carrying capacity of the actor.*/
    getMaxWeight() {
        const statStr = this.get('Stats').getStrength();
        const eqStr = this._invEq.getEquipment().getStrength();
        return 2 * statStr + 2 * eqStr + this._maxWeight;
    }

    /* Marks actor as player. Cannot unset player.*/
    setIsPlayer(isPlayer) {
        if (isPlayer) {
            this._brain = new RG.Brain.Player(this);
            if (!this.has('StatsMods')) {
                this.add(new RG.Component.StatsMods());
            }
            if (!this.has('CombatMods')) {
                this.add(new RG.Component.CombatMods());
            }
            this.add(new RG.Component.Player());
            this.add(new RG.Component.SpellPower());
        }
        else {
            RG.err('Actor.Rogue', 'setIsPlayer',
                'Actor cannot be changed from player to mob.');
        }
    }

    /* Used when controlling other actors with the "real player" actor .*/
    setPlayerCtrl(isPlayer) {
        if (isPlayer) {
            this.add(new RG.Component.PlayerControlled());
            this._actualBrain = this._brain;
            this._brain = new RG.Brain.Player(this);
            if (!this.has('StatsMods')) {
                this.add(new RG.Component.StatsMods());
            }
            if (!this.has('CombatMods')) {
                this.add(new RG.Component.CombatMods());
            }
            this.add(new RG.Component.Possessed());
        }
        else {
            this.remove('PlayerControlled');
            this.remove('StatsMods');
            this.remove('CombatMods');
            this.remove('Possessed');
            this._brain = this._actualBrain;
            delete this._actualBrain;
        }
    }

    /* Returns the cell where this actor is located at.*/
    getCell() {
        const x = this.getX();
        const y = this.getY();
        const level = this.getLevel();
        if (level) {
            return level.getMap().getCell(x, y);
        }
        return null;
    }

    isInLevel(level) {
        if (this.getLevel()) {
            return this.getLevel().getID() === level.getID();
        }
        return false;
    }

    toJSON() {
        let levelID = null;
        if (this.getLevel()) {
            levelID = this.getLevel().getID();
        }
        const obj = {
            id: this.getID(),
            name: this.getName(),
            type: this.getType(),
            x: this.getX(),
            y: this.getY(),
            fovRange: this.getFOVRange(),
            levelID,
            inventory: this.getInvEq().getInventory().toJSON(),
            equipment: this.getInvEq().getEquipment().toJSON(),
            brain: this._brain.toJSON()
        };

        obj.components = RG.Component.compsToJSON(this);

        if (obj.type === null) {
            RG.err('Actor.Rogue', 'toJSON',
                `Type null for ${JSON.stringify(obj)}`);
        }

        if (this._spellbook) {
            obj.spellbook = this._spellbook.toJSON();
        }
        if (this.has('Player')) {
            obj.isPlayer = true;
        }
        if (this._actualBrain) {
            obj.brain = this._actualBrain.toJSON();
        }

        return obj;
    }

    //---------------------------------
    // Combat-related methods
    //---------------------------------

    getAttack() {
        let attack = this.get('Combat').getAttack();
        attack += this.getEquipAttack();
        attack += this._addFromCompList('CombatMods', 'getAttack');
        attack += Math.floor(this.getAccuracy() / 2);
        return attack;
    }

    getDefense() {
        let defense = this.get('Combat').getDefense();
        defense += this.getEquipDefense();
        defense += this._addFromCompList('CombatMods', 'getDefense');
        defense += Math.floor(this.getAgility() / 2);
        return defense;
    }

    getProtection() {
        let protection = this.get('Combat').getProtection();
        protection += this.getEquipProtection();
        protection += this._addFromCompList('CombatMods', 'getProtection');
        return protection;
    }

    getDamage() {
        let damage = this.get('Combat').rollDamage();
        const weapon = this.getWeapon();
        if (weapon) {
            damage = RG.getItemDamage(weapon);
        }
        const strength = this.getStrength();
        damage += RG.strengthToDamage(strength);
        damage += this._addFromCompList('CombatMods', 'getDamage');
        return damage;

    }

    getCombatBonus(funcName) {
        return this._addFromCompList('CombatMods', funcName);
    }

    _addFromCompList(compType, func) {
        const compList = this.getList(compType);
        if (compList.length > 0) {
            return compList.reduce((acc, val) => {
                return acc + val[func]();
            }, 0);
        }
        return 0;
    }

    //-------------------------------------------------------------
    // Stats-related methods (these take eq and boosts into account
    //-------------------------------------------------------------

    getAccuracy() {
        let acc = this.get('Stats').getAccuracy();
        acc += this.getInvEq().getEquipment().getAccuracy();
        acc += this._addFromCompList('StatsMods', 'getAccuracy');
        return acc;
    }

    getAgility() {
        let agi = this.get('Stats').getAgility();
        agi += this.getInvEq().getEquipment().getAgility();
        agi += this._addFromCompList('StatsMods', 'getAgility');
        return agi;
    }

    getStrength() {
        let str = this.get('Stats').getStrength();
        str += this.getInvEq().getEquipment().getStrength();
        str += this._addFromCompList('StatsMods', 'getStrength');
        return str;
    }

    getWillpower() {
        let wil = this.get('Stats').getWillpower();
        wil += this.getInvEq().getEquipment().getWillpower();
        wil += this._addFromCompList('StatsMods', 'getWillpower');
        return wil;
    }

    getSpeed() {
        let speed = this.get('Stats').getSpeed();
        speed += this.getInvEq().getEquipment().getSpeed();
        speed += this._addFromCompList('StatsMods', 'getSpeed');
        return speed;
    }

    getPerception() {
        let per = this.get('Stats').getPerception();
        per += this.getInvEq().getEquipment().getPerception();
        per += this._addFromCompList('StatsMods', 'getPerception');
        return per;
    }

    getMagic() {
        let mag = this.get('Stats').getMagic();
        mag += this.getInvEq().getEquipment().getMagic();
        mag += this._addFromCompList('StatsMods', 'getMagic');
        return mag;
    }

    /* Returns bonuses applied to given stat. */
    getStatBonus(funcName) {
        return this._addFromCompList('StatsMods', funcName);
    }
}

RG.Actor.Rogue = RGActorRogue;

/* Spirit actors. They have Ethereal component and cannot be attacked, but they
 * can be captured by SpiritGem-objects.*/
class RGActorSpirit extends RGActorRogue {

    constructor(name) {
        super(name);
        this.setType('spirit');
        this.add(new RG.Component.Ethereal());
        this.setBrain(new RG.Brain.Spirit(this));
    }

}

RG.Actor.Spirit = RGActorSpirit;

module.exports = RG.Actor;

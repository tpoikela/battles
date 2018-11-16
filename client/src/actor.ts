
import RG from './rg';
import {Entity} from './entity';
import * as Mixin from './mixin';

import * as Component from './component';
import {compsToJSON} from './component.base';

import {BrainGoalOriented} from './brain';
import {BrainVirtual} from './brain.virtual';
import {BrainPlayer} from './brain.player';

import {Inventory} from './inv';
import * as Time from './time';

export const Actor: any = {};

const ACTOR_NO_ACTION = Object.freeze(() => {});
const EMPTY_ARGS = Object.freeze({});
const SPEED_COEFF = RG.BASE_SPEED * RG.ACTION_DUR;

export class BaseActor extends Mixin.Locatable(Mixin.Typed(Entity)) {

    constructor(name) { // {{{2
        super({propType: RG.TYPE_ACTOR, type: null});
        const named = new Component.Named();
        named.setName(name);
        this.add(named);
        this.add(new Component.Action());
    }

    /* Returns true if actor is a player.*/
    public isPlayer() {
        return this.has('Player') || this.has('PlayerControlled');
    }

    public isEnemy(actor) {return false;}
    public addEnemy(actor) {/* No implementation here */}
    public addEnemyType(type: string) {/* No implementation here */}

    public setName(name) {this.get('Named').setName(name);}
    public getName() {
        return this.get('Named').getFullName();
    }

    public getBrain() {return this._brain;}

    public setBrain(brain) {
        this._brain = brain;
        this._brain.setActor(this);
    }

    public getSpeed() {
        return RG.BASE_SPEED;
    }

    public getEquipProtection() {return 0;}

    /* Returns the next action for this actor.*/
    public nextAction(obj?) {
        // Use actor brain to determine the action
        const cb = this._brain.decideNextAction(obj);
        let action = null;

        if (cb !== null) {
            const duration = Math.round(SPEED_COEFF / this.getSpeed());
            action = new Time.Action(duration, cb);
        }
        else {
            action = new Time.Action(0, ACTOR_NO_ACTION);
        }

        if (this._brain.hasOwnProperty('energy')) {
            action.energy = this._brain.energy;
        }
        action.actor = this;
        return action;
    }

    /* Serializes the virtual actor. */
    public toJSON() {
        let levelID = null;
        if (this.getLevel()) {
            levelID = this.getLevel().getID();
        }
        const obj: any = {
            id: this.getID(),
            // name: this.getName(),
            type: this.getType(),
            levelID,
            brain: this._brain.toJSON(),
            new: 'Base' // Must match a constr function name in Actor
        };

        obj.components = compsToJSON(this);

        if (obj.type === null) {
            RG.err('Actor.Virtual', 'toJSON',
                `Type null for ${JSON.stringify(obj)}`);
        }

        return obj;
    }

}
Actor.Base = BaseActor;

/* Virtual actor can be used to spawn more entities or for AI-like effects
 * inside a level. */
export class VirtualActor extends BaseActor {

    constructor(name) { // {{{2
        super(name);
        this._brain = new BrainVirtual(this);
    }


}
Actor.Virtual = VirtualActor;

/* Object representing a game actor who takes actions.  */
export class SentientActor extends BaseActor {
    constructor(name) { // {{{2
        super(name);

        this._brain = new BrainGoalOriented(this);
        this._brain.getMemory().addEnemyType('player');

        this._invEq = new Inventory(this);
        this._maxWeight = 10.0;

        // Components for this entity
        this.add(new Component.Experience());
        this.add(new Component.Combat());
        this.add(new Component.Stats());
        this.add(new Component.Health(50));
        this.add(new Component.Corporeal());

        const perception = new Component.Perception();
        perception.setFOVRange(RG.NPC_FOV_RANGE);
        this.add(perception);
    }


    public getFOVRange() {
        let range = this.get('Perception').getFOVRange();
        if (this.has('EagleEye')) {range += 2;}
        return range;
    }

    public setFOVRange(range) {
        this.get('Perception').setFOVRange(range);
    }

    //---------------------------------
    // Brain-related methods
    //---------------------------------

    public addEnemyType(type) {
        this._brain.getMemory().addEnemyType(type);
    }
    public addEnemy(actor) {this._brain.addEnemy(actor);}
    public addFriend(actor) {this._brain.addFriend(actor);}

    public isEnemy(actor) {
        return this._brain.getMemory().isEnemy(actor);
    }

    public isFriend(actor) {
        return this._brain.getMemory().isFriend(actor);
    }

    //---------------------------------
    // Equipment related methods
    //---------------------------------

    public getInvEq() { return this._invEq; }

    /* Returns weapon that is wielded by the actor.*/
    public getWeapon() {return this._invEq.getWeapon();}

    /* Returns weapon that is wielded by the actor.*/
    public getMissileWeapon() {
        return this._invEq.getMissileWeapon();
    }

    /* Returns missile equipped by the player.*/
    public getMissile() {
        return this._invEq.getEquipment().getItem('missile');
    }

    public getEquipAttack() {
        let att = this._invEq.getEquipment().getAttack();
        if (this.has('Skills')) {
            att += this.get('Skills').getLevel('Melee');
        }
        return att;
    }

    public getEquipDefense() {
        let def = this._invEq.getEquipment().getDefense();
        if (this.has('Skills')) {
            def += this.get('Skills').getLevel('Shields');
        }
        return def;
    }

    public getEquipProtection() {
        return this._invEq.getEquipment().getProtection();
    }

    public getShieldDefense() {
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

    public setActorClass(classObj) {
        this._actorClass = classObj;
    }

    public getActorClass() {
        return this._actorClass;
    }

    public setBook(book) {
        this._spellbook = book;
    }

    public getBook() {
        return this._spellbook;
    }

    /* Returns carrying capacity of the actor.*/
    public getMaxWeight() {
        const statStr = this.get('Stats').getStrength();
        const eqStr = this._invEq.getEquipment().getStrength();
        return 2 * statStr + 2 * eqStr + this._maxWeight;
    }

    /* Marks actor as player. Cannot unset player.*/
    public setIsPlayer(isPlayer) {
        if (isPlayer) {
            this._brain = new BrainPlayer(this);
            addPlayerBrainComps(this);
            this.add(new Component.Player());
            if (!this.has('SpellPower')) {
                this.add(new Component.SpellPower());
            }
        }
        else {
            RG.err('Actor.Sentient', 'setIsPlayer',
                'Actor cannot be changed from player to mob.');
        }
    }

    /* Used when controlling other actors with the "real player" actor .*/
    public setPlayerCtrl(isPlayer) {
        if (isPlayer) {
            this.add(new Component.PlayerControlled());
            this._actualBrain = this._brain;
            this._brain = new BrainPlayer(this);
            addPlayerBrainComps(this);
            this.add(new Component.Possessed());
        }
        else {
            this.remove('PlayerControlled');
            this.remove('Possessed');
            removePlayerBrainComps(this);
            this._brain = this._actualBrain;
            delete this._actualBrain;
        }
    }

    /* Returns the cell where this actor is located at.*/
    public getCell() {
        const x = this.getX();
        const y = this.getY();
        const level = this.getLevel();
        if (level) {
            return level.getMap().getCell(x, y);
        }
        return null;
    }

    public isInLevel(level) {
        if (this.getLevel()) {
            return this.getLevel().getID() === level.getID();
        }
        return false;
    }

    public toJSON() {
        let levelID = null;
        if (this.getLevel()) {
            levelID = this.getLevel().getID();
        }
        const obj: any = {
            id: this.getID(),
            name: this.getName(),
            type: this.getType(),
            x: this.getX(),
            y: this.getY(),
            fovRange: this.getFOVRange(),
            levelID,
            inventory: this.getInvEq().getInventory().toJSON(),
            equipment: this.getInvEq().getEquipment().toJSON(),
            brain: this._brain.toJSON(),
            new: 'Sentient', // Must match a constr function name in Actor
            components: compsToJSON(this)
        };

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

    public getAttack() {
        let attack = this.get('Combat').getAttack();
        attack += this.getEquipAttack();
        attack += this._addFromCompList('CombatMods', 'getAttack');
        attack += RG.accuracyToAttack(this.getAccuracy());
        return attack;
    }

    public getDefense() {
        let defense = this.get('Combat').getDefense();
        defense += this.getEquipDefense();
        defense += this._addFromCompList('CombatMods', 'getDefense');
        defense += RG.agilityToDefense(this.getAgility());
        return defense;
    }

    public getProtection() {
        let protection = this.get('Combat').getProtection();
        protection += this.getEquipProtection();
        protection += this._addFromCompList('CombatMods', 'getProtection');
        return protection;
    }

    public getDamage() {
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

    public getCombatBonus(funcName) {
        return this._addFromCompList('CombatMods', funcName);
    }

    public _addFromCompList(compType, func) {
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

    public getAccuracy() {
        let acc = this.get('Stats').getAccuracy();
        acc += this.getInvEq().getEquipment().getAccuracy();
        acc += this._addFromCompList('StatsMods', 'getAccuracy');
        return acc;
    }

    public getAgility() {
        let agi = this.get('Stats').getAgility();
        agi += this.getInvEq().getEquipment().getAgility();
        agi += this._addFromCompList('StatsMods', 'getAgility');
        return agi;
    }

    public getStrength() {
        let str = this.get('Stats').getStrength();
        str += this.getInvEq().getEquipment().getStrength();
        str += this._addFromCompList('StatsMods', 'getStrength');
        return str;
    }

    public getWillpower() {
        let wil = this.get('Stats').getWillpower();
        wil += this.getInvEq().getEquipment().getWillpower();
        wil += this._addFromCompList('StatsMods', 'getWillpower');
        return wil;
    }

    public getSpeed() {
        let speed = this.get('Stats').getSpeed();
        speed += this.getInvEq().getEquipment().getSpeed();
        speed += this._addFromCompList('StatsMods', 'getSpeed');
        return speed;
    }

    public getPerception() {
        let per = this.get('Stats').getPerception();
        per += this.getInvEq().getEquipment().getPerception();
        per += this._addFromCompList('StatsMods', 'getPerception');
        return per;
    }

    public getMagic() {
        let mag = this.get('Stats').getMagic();
        mag += this.getInvEq().getEquipment().getMagic();
        mag += this._addFromCompList('StatsMods', 'getMagic');
        return mag;
    }

    /* Returns bonuses applied to given stat. */
    public getStatBonus(funcName) {
        return this._addFromCompList('StatsMods', funcName);
    }
}

const playerBrainComps = ['StatsMods', 'CombatMods'];

function addPlayerBrainComps(actor) {
    playerBrainComps.forEach(compName => {
        let hasTag = false;
        if (actor.has(compName)) {
            const list = actor.getList(compName);
            list.forEach(comp => {
                if (comp.getTag() === 'brain-player') {
                    hasTag = true;
                }
            });
        }

        if (!hasTag) {
            const statsMods = new Component[compName]();
            statsMods.setTag('brain-player');
            actor.add(statsMods);
        }
    });
}

function removePlayerBrainComps(actor) {
    playerBrainComps.forEach(compName => {
        let compID = -1;
        if (actor.has(compName)) {
            const list = actor.getList(compName);
            list.forEach(comp => {
                if (comp.getTag() === 'brain-player') {
                    compID = comp.getID();
                }
            });
        }
        if (compID !== -1) {
            actor.remove(compID);
        }
    });
}
Actor.Sentient = SentientActor;

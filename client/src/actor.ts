
import RG from './rg';
import {Entity} from './entity';
import * as Mixin from './mixin';
import {TCoord} from './interfaces';

import * as Component from './component/component';
import {compsToJSON} from './component/component.base';

import {BrainBase, BrainGoalOriented} from './brain';
import {BrainPlayer} from './brain/brain.player';

import {Inventory} from './inv';
import * as Time from './time';

type ActionCallback = Time.ActionCallback;
type Level = import('./level').Level;
type ItemArmour = import('./item').Armour;
type Cell = import('./map.cell').Cell;

export const Actor: any = {};

export const ACTOR_NO_ACTION = Object.freeze(() => {});
const EMPTY_ARGS = Object.freeze({});
const SPEED_COEFF = RG.BASE_SPEED * RG.ACTION_DUR;

export interface StatsData {
    [key: string]: string | number | [number, number];
}

export class BaseActor extends Entity {

    protected _brain: BrainBase;

    constructor(name: string) {
        super({propType: RG.TYPE_ACTOR, type: null});
        const named = new Component.Named();
        named.setName(name);
        this.add(named);
        this.add(new Component.Action());
        this.add(new Component.Location());
        this.add(new Component.Typed('BaseActor', RG.TYPE_ACTOR));
    }

    public getType() {return this.get('Typed').getObjType();}
    public setType(type) {return this.get('Typed').setObjType(type);}
    public getPropType() {return this.get('Typed').getPropType();}
    public setPropType(type) {return this.get('Typed').setPropType(type);}

    public getCell(): Cell | null {
        return this.get('Location').getCell();
    }
    public isLocated(): boolean {
        return this.get('Location').isLocated();
    }
    public unsetLevel(): void {
        this.get('Location').unsetLevel();
    }
    public setLevel(level): void {
        return this.get('Location').setLevel(level);
    }
    public getLevel() {return this.get('Location').getLevel();}
    public getX(): number {return this.get('Location').getX();}
    public getY(): number {return this.get('Location').getY();}
    public getXY(): TCoord {return this.get('Location').getXY();}
    public setXY(x, y): void {
        this.get('Location').setXY(x, y);
    }

    /* Returns true if actor is a player.*/
    public isPlayer() {
        return this.has('Player') || this.has('PlayerControlled');
    }

    public isEnemy(actor: BaseActor): boolean {return false;}
    public addEnemy(actor: BaseActor): void {/* No implementation here */}
    public addEnemyType(type: string): void {/* No implementation here */}

    public setName(name: string) {this.get('Named').setName(name);}
    public getName(): string {
        return this.get('Named').getFullName();
    }

    public getBrain(): BrainBase {return this._brain;}

    public setBrain(brain: BrainBase): void {
        this._brain = brain;
        this._brain.setActor(this);
    }

    public getSpeed(): number {
        return RG.BASE_SPEED;
    }

    public getEquipProtection(): number {return 0;}

    /* Returns the next action for this actor.*/
    public nextAction(obj?): Time.Action | null {
        // Use actor brain to determine the action
        const cb: ActionCallback = this._brain.decideNextAction(obj);
        let action = null;

        if (cb !== null) {
            const duration = Math.round(SPEED_COEFF / this.getSpeed());
            action = new Time.Action(duration, cb);
        }
        else {
            action = new Time.Action(0, ACTOR_NO_ACTION);
        }

        if (this._brain.hasOwnProperty('energy')) {
            const bp = this._brain as unknown;
            action.energy = (bp as BrainPlayer).energy;
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


/* Object representing a game actor who takes actions.  */
export class SentientActor extends BaseActor {

    public static getFormattedStats: (actor: SentientActor) => StatsData;

    protected _invEq: Inventory;
    protected _maxWeight: number;
    protected _actorClass: any;
    protected _spellbook?: any;
    protected _actualBrain?: any;
    protected _brain: BrainGoalOriented | BrainPlayer;

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

    public addEnemyType(type: string): void {
        this._brain.getMemory().addEnemyType(type);
    }
    public addEnemy(actor: BaseActor): void {
        (this._brain as BrainGoalOriented).addEnemy(actor);
    }
    public addFriend(actor: BaseActor): void {
        (this._brain as BrainGoalOriented).addFriend(actor);
    }

    public isEnemy(actor: BaseActor): boolean {
        return this._brain.getMemory().isEnemy(actor);
    }

    public isFriend(actor: BaseActor): boolean {
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
            const armour = shield as unknown;
            bonus = (armour as ItemArmour).getDefense();
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
            RG.err('Actor.Sentient', 'toJSON',
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

/* Returns an objected containing stats data for the given actor. */
SentientActor.getFormattedStats = function(actor): StatsData {
    const dungeonLevel = actor.getLevel().getLevelNumber();
    const location = RG.formatLocationName(actor.getLevel());

    let PP = null;
    if (actor.has('SpellPower')) {
      PP = actor.get('SpellPower').getPP() + '/'
      + actor.get('SpellPower').getMaxPP();
    }

    // Compile final stats information
    // Add typings
    const stats: any = {
      HP: actor.get('Health').getHP() + '/'
      + actor.get('Health').getMaxHP(),
      PP,

      Att: [actor.getAttack(), actor.getCombatBonus('getAttack')],
      Def: [actor.getDefense(), actor.getCombatBonus('getDefense')],
      Pro: [actor.getProtection(), actor.getCombatBonus('getProtection')],

      Str: [actor.getStrength(), actor.getStatBonus('getStrength')],
      Agi: [actor.getAgility(), actor.getStatBonus('getAgility')],
      Acc: [actor.getAccuracy(), actor.getStatBonus('getAccuracy')],
      Wil: [actor.getWillpower(), actor.getStatBonus('getWillpower')],
      Per: [actor.getPerception(), actor.getStatBonus('getPerception')],
      Mag: [actor.getMagic(), actor.getStatBonus('getMagic')],

      Speed: [actor.getSpeed(), actor.getStatBonus('getSpeed')],
      XP: actor.get('Experience').getExp(),
      XL: actor.get('Experience').getExpLevel(),
      DL: dungeonLevel,
      Loc: location
    };

    if (actor.has('Hunger')) {
        stats.E = actor.get('Hunger').getEnergy();
    }

    return stats;
};

export function isSentient(target: BaseActor): target is SentientActor {
    if (target) {
        const brain = target.getBrain() as BrainGoalOriented;
        return (typeof brain.getGoal === 'function');
    }
}

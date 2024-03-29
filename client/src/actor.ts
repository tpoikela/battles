
import RG from './rg';
import {Entity} from './entity';
import {TCoord, TCoord3D, TPropType} from './interfaces';

import * as Component from './component/component';
import {compsToJSON} from './component/component.base';

import {BrainBase, BrainGoalOriented} from './brain';
import {BrainPlayer} from './brain/brain.player';

import {Inventory} from './inv';
import * as Time from './time';
type Level = import('./level').Level;

type ActionCallback = Time.ActionCallback;
type ItemArmour = import('./item').Armour;
type ItemBase = import('./item').ItemBase;
type MissileWeapon = import('./item').MissileWeapon;
// type ItemMissile = import('./item').Missile;
// type ItemAmmo = import('./item').Ammo;
type Cell = import('./map.cell').Cell;
type ActorClass = import('./actor-class').ActorClassBase;
type SpellBook = import('./spell').SpellBook;

export const Actor: any = {};

export const ACTOR_NO_ACTION = Object.freeze(() => {});
//rm const EMPTY_ARGS = Object.freeze({});
const SPEED_COEFF = RG.BASE_SPEED * RG.ACTION_DUR;

export interface StatsData {
    [key: string]: string | number | [number, number];
}

export class BaseActor extends Entity {

    protected _brain?: BrainBase;

    constructor(name: string, build = true) {
        super();
        this.add(new Component.Action());
        const named = new Component.Named();
        named.setName(name);
        this.add(named);
        if (build) {
            this.build();
        }
    }

    public build(): void {
        this.add(new Component.Location());
        this.add(new Component.Typed('BaseActor', RG.TYPE_ACTOR));
    }

    public getType(): string {return this.get('Typed').getObjType();}
    public setType(type: string): void {
        return this.get('Typed').setObjType(type);
    }
    public getPropType(): TPropType {return this.get('Typed').getPropType();}
    public setPropType(type: TPropType) {return this.get('Typed').setPropType(type);}

    public getCell(): Cell | null {
        return this.get('Location').getCell();
    }
    public isLocated(): boolean {
        return this.get('Location').isLocated();
    }
    public unsetLevel(): void {
        this.get('Location').unsetLevel();
    }
    public setLevel(level: Level): void {
        return this.get('Location').setLevel(level);
    }

    public getLevel(): Level {return this.get('Location').getLevel();}
    public getX(): number {return this.get('Location').getX();}
    public getY(): number {return this.get('Location').getY();}
    public getXY(): TCoord {return this.get('Location').getXY();}
    public setXY(x: number, y: number): void {
        this.get('Location').setXY(x, y);
    }

    public isAtXY(x: number, y: number): boolean {
        return this.get('Location').isAtXY(x, y);
    }


    public getZ(): number {return this.getCell().getZ();}

    public getXYZ(): TCoord3D {
        const [x, y] = this.getXY();
        const z = this.getCell().getBaseElem().getZ();
        return [x, y, z];
    }

    /* Returns true if actor is a player.*/
    public isPlayer(): boolean {
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
    public nextAction(obj?): Time.Action {
        // Use actor brain to determine the action
        const cb: ActionCallback = this._brain.decideNextAction(obj);
        let action = null;

        if (cb !== null) {
            const duration = Math.round(SPEED_COEFF / this.getSpeed());
            action = new Time.Action(duration, cb);
            if (this._brain.hasOwnProperty('energy')) {
                const bp = this._brain as unknown;
                action.energy = (bp as BrainPlayer).energy;
            }
        }
        else {
            action = new Time.Action(0, ACTOR_NO_ACTION);
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
    protected _actorClass: ActorClass;
    protected _spellbook?: SpellBook;
    protected _actualBrain?: any;

    constructor(name: string, build = true) {
        super(name, build);
    }

    public build(): void {
        super.build();

        this._brain = new BrainGoalOriented(this);
        this._invEq = new Inventory(this);
        this._maxWeight = 17.0;

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

    public getFOVRange(): number {
        let range = this.get('Perception').getFOVRange();
        if (this.has('EagleEye')) {range += 2;}
        return range;
    }

    public setFOVRange(range: number): void {
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

    public getInvEq(): Inventory { return this._invEq; }

    /* Returns weapon that is wielded by the actor.*/
    public getWeapon(): null | ItemBase {return this._invEq.getWeapon();}

    /* Returns weapon that is wielded by the actor.*/
    public getMissileWeapon(): MissileWeapon | null {
        return this._invEq.getMissileWeapon();
    }

    /* Returns missile equipped by the player.*/
    public getMissile() {
        return this._invEq.getEquipment().getItem('missile');
    }

    public getEquipAttack(): number {
        let att = this._invEq.getEquipment().getAttack();
        att += RG.getSkillLevel(this, RG.SKILLS.MELEE);
        return att;
    }

    public getEquipDefense(): number {
        let def = this._invEq.getEquipment().getDefense();
        def += RG.getSkillLevel(this, RG.SKILLS.SHIELDS);
        return def;
    }

    public getEquipProtection(): number {
        let prot = this._invEq.getEquipment().getProtection();
        prot += RG.getSkillLevel(this, RG.SKILLS.ARMOUR);
        return prot;
    }

    public getShieldDefense(): number {
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

    public setActorClass(classObj: ActorClass): void {
        this._actorClass = classObj;
    }

    public getActorClass(): ActorClass {
        return this._actorClass;
    }

    public setBook(book: SpellBook): void {
        this._spellbook = book;
    }

    public getBook(): undefined | SpellBook {
        return this._spellbook;
    }

    /* Returns carrying capacity of the actor.*/
    public getMaxWeight(): number {
        const statStr = this.get('Stats').getStrength();
        const eqStr = this._invEq.getEquipment().getStrength();
        return 2 * statStr + 2 * eqStr + this._maxWeight;
    }

    /* Marks actor as player. Cannot unset player.*/
    public setIsPlayer(isPlayer: boolean): void {
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
    public setPlayerCtrl(isPlayer: boolean): void {
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
    public getCell(): null | Cell {
        const x = this.getX();
        const y = this.getY();
        const level = this.getLevel();
        if (level) {
            return level.getMap().getCell(x, y);
        }
        return null;
    }

    public isInLevel(level: Level): boolean {
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
            brain: this._brain.toJSON(),
            new: 'Sentient', // Must match a constr function name in Actor
            components: compsToJSON(this)
        };

        const invJSON = this.getInvEq().getInventory().toJSON();
        if (invJSON.length > 0) {obj.inventory = invJSON;}
        const eqJSON = this.getInvEq().getEquipment().toJSON();
        if (eqJSON.length > 0) {obj.equipment = eqJSON;}

        if (obj.type === null) {
            RG.err('Actor.Sentient', 'toJSON',
                `Type null for ${JSON.stringify(obj)}`);
        }

        if (this._spellbook) {
            obj.spellbook = this._spellbook.toJSON();
        }
        if (this.has('Player')) {
            obj.isPlayer = true;
            obj.x = this.getX();
            obj.y = this.getY();
            obj.levelID = levelID;
        }
        if (this._actualBrain) {
            obj.brain = this._actualBrain.toJSON();
        }

        return obj;
    }

    //---------------------------------
    // Combat-related methods
    //---------------------------------

    public getAttack(): number {
        let attack = this.get('Combat').getAttack();
        attack += this.getEquipAttack();
        attack += this._addFromCompList('CombatMods', 'getAttack');
        attack += RG.accuracyToAttack(this.getStatVal('Accuracy'));
        return attack;
    }

    public getDefense(): number {
        let defense = this.get('Combat').getDefense();
        defense += this.getEquipDefense();
        defense += this._addFromCompList('CombatMods', 'getDefense');
        defense += RG.agilityToDefense(this.getStatVal('Agility'));
        return defense;
    }

    public getProtection(): number {
        let protection = this.get('Combat').getProtection();
        protection += this.getEquipProtection();
        protection += this._addFromCompList('CombatMods', 'getProtection');
        return protection;
    }

    public getDamage(): number {
        let damage = this.get('Combat').rollDamage();
        const weapon = this.getWeapon();
        if (weapon) {
            const wpnDamage = RG.getItemDamage(weapon);
            if (wpnDamage > damage) {
                damage = wpnDamage;
            }
        }
        const strength = this.getStatVal('Strength');
        damage += RG.strengthToDamage(strength);
        damage += this._addFromCompList('CombatMods', 'getDamage');
        return damage;

    }

    public getCombatBonus(funcName: string): number {
        return this._addFromCompList('CombatMods', funcName);
    }

    public _addFromCompList(compType: string, func): number {
        const compList = this.getList(compType);
        if (compList.length > 0) {
            return compList.reduce((acc, val) => {
                return acc + val[func]();
            }, 0);
        }
        return 0;
    }

    public getSpeed(): number {
        const speed = this.getStatVal('Speed');
        if (speed === 0) return 1; // If speed is 0, actor is not scheduled
        return speed;
    }

    public getStatVal(stat: string): number {
        const getter = RG.formatGetterName(stat);
        let value = this.get('Stats')[getter]();
        value += this.getInvEq().getEquipment()[getter]();
        // value += this.getInvEq().getEquipment().getStat(name);
        value += this._addFromCompList('StatsMods', getter);
        return value;
    }

    /* Returns bonuses applied to given stat. */
    public getStatBonus(funcName: string): number {
        return this._addFromCompList('StatsMods', funcName);
    }
}

RG.STATS.forEach((stat: string) => {
    SentientActor.prototype[RG.formatGetterName(stat)] = function() {
        return this.getStatVal(stat);
    };
});


const playerBrainComps = ['StatsMods', 'CombatMods'];

function addPlayerBrainComps(actor): void {
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

function removePlayerBrainComps(actor: Entity): void {
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
    let stats: any = {
      HP: actor.get('Health').getHP() + '/'
      + actor.get('Health').getMaxHP(),
      PP,

      Att: [actor.getAttack(), actor.getCombatBonus('getAttack')],
      Def: [actor.getDefense(), actor.getCombatBonus('getDefense')],
      Pro: [actor.getProtection(), actor.getCombatBonus('getProtection')],
    };

    Object.keys(RG.STATS_ABBR2STAT).forEach((abbr: string) => {
        const statName = RG.STATS_ABBR2STAT[abbr];
        const getter = RG.formatGetterName(statName);
        stats[abbr] = [actor[getter](), actor.getStatBonus(getter)];
    });

    stats = Object.assign(stats, {
      Speed: [actor.getSpeed(), actor.getStatBonus('getSpeed')],
      XP: actor.get('Experience').getExp(),
      XL: actor.get('Experience').getExpLevel(),
      DL: dungeonLevel,
      Loc: location
    });

    if (actor.has('Hunger')) {
        stats.E = actor.get('Hunger').getEnergy();
    }

    return stats;
};


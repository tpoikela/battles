
/* File contains spell definitions for the game.
 * Each spell should contain at least:
 *   1. cast()
 *   2. getSelectionObject()
 *   3. aiShouldCastSpell (optional)
 *     - Return true if spell should be cast
 *     - Set also args for the spell (dir, target etc)
 *
 * where 3 is used with spellcaster AI. Without this, the spell cannot be
 * used by the AI.
 *
 * Some optional functions which can be defined:
 *  For any spell inflicting damage:
 *    onHit(actor, src): Called when spell deals damage to actor.
 *
 *  For spells affecting single cells:
 *    preCallback(cell): Called when spell will affect cell
 *    callback(cell): Called when spell has affected cell
 *    postCallback(cell): Called when spell has affected cell
 *
 *  For area-affecting/ray spells:
 *    onCellCallback(cell): Called for each affected cell
 *    NOTE: For damage effects, you can use onHit()
 */
import RG from './rg';
import {Keys} from './keymap';
import * as Component from './component';
import {Random} from './random';
import {Dice} from './dice';
import {ObjectShell} from './objectshellparser';
import {Brain} from './brain';
import {Geometry} from './geometry';
import {Path} from './path';

import {IMenu, SelectionObject, PlayerMissileMenu} from './menu';
import {TCoord, TCoord3D} from './interfaces';
type Cell = import('./map.cell').Cell;
type SentientActor = import('./actor').SentientActor;

const RNG = Random.getRNG();
const {KeyMap} = Keys;

const create = Component.create;
type ComponentBase = Component.ComponentBase;

// const NO_SELECTION_NEEDED = () => {};

export const Spell: any = {
    traceIDs: {}, // For tracing entities during casting
};

type AISpellCb = (actor, args: SpellArgs) => void;
type SpellTarget = SentientActor | Cell;
type AISpellFunc = (actor: SentientActor, target: SpellTarget, cb: AISpellCb)
    => boolean;

Spell.addDebugTraceID = (id: number): void => {
    Spell.traceIDs[id] = true;
}

/* Used for sorting the spells by spell power. */
/* function compareSpells(s1, s2) {
    if (s1.getPower() < s2.getPower()) {
        return -1;
    }
    if (s2.getPower() > s1.getPower()) {
        return 1;
    }
    return 0;
}
*/

const addPoisonEffect = (actor, src): void => {
    const expLevel = src.get('Experience').getExpLevel();
    const dmgDie = new Dice(1, expLevel, Math.ceil(expLevel / 2));
    let prob = 0.07 * expLevel;
    if (prob >= 0.5) {prob = 0.5;}
    const durDie = new Dice(2, expLevel + 5, Math.ceil(expLevel / 2));
    const dur = durDie.roll();
    poisonActor(actor, src, dur, dmgDie, prob);
};
Spell.addPoisonEffect = addPoisonEffect;

const poisonActor = (actor, src, dur, dmgDie, prob) => {
    const poisonComp = new Component.Poison();
    poisonComp.setDamageDie(dmgDie);

    const expiration = new Component.Expiration();
    expiration.addEffect(poisonComp, dur);

    // Need owner to assign exp correctly
    poisonComp.setSource(src);

    poisonComp.setProb(prob);
    actor.add(poisonComp);
    actor.add(expiration);
};

const addFadingActorToCell = (actor, cell: Cell, spell) => {
    const caster = spell.getCaster();
    const level = caster.getLevel();
    level.addActor(actor, cell.getX(), cell.getY());

    const fadingComp = new Component.Fading();
    const duration = spell.getDuration();
    fadingComp.setDuration(duration);
    actor.add(fadingComp);

    const created = new Component.Created();
    created.setCreator(caster);
    actor.add(created);
};
Spell.addFadingActorToCell = addFadingActorToCell;

/* Called at the end of AI querying if spell targeting a cell next to
 * it should be cast. */
const aiSpellCellDone = (actor, target, cb) => {
    const dir = [target.getX() - actor.getX(),
        target.getY() - actor.getY()
    ];
    const newArgs = {dir, src: actor};
    cb(actor, newArgs);
};
Spell.aiSpellCellDone = aiSpellCellDone;

/* Used to determine if AI should attack enemy adjacent to it with a spell.
 * By default, picks strongest enemy based on HP, but args.compFunc can be
 * given to use custom function. Callback cb will be called eventually with
 * cb(actor, {dir: [x, y], src: actor}).
 */
const aiSpellCellEnemy = (args, cb): boolean => {
    const {actor, actorCellsAround} = args;
    let strongest = null;
    actorCellsAround.forEach((cell: Cell) => {
        const actors = cell.getActors();
        actors.forEach(otherActor => {
            if (actor.isEnemy(otherActor)) {
                const health = otherActor.get('Health');
                if (!strongest) {
                    strongest = otherActor;
                }
                else if (args.compFunc) {
                    if (args.compFunc(strongest, otherActor)) {
                        strongest = otherActor;
                    }
                }
                else {
                    const maxHP = health.getMaxHP();
                    const strHP = strongest.get('Health').getMaxHP();
                    if (maxHP > strHP) {strongest = otherActor;}
                }
            }
        });
    });

    if (strongest) {
        aiSpellCellDone(actor, strongest, cb);
        return true;
    }
    return false;
};
Spell.aiSpellCellEnemy = aiSpellCellEnemy;

/* Can be used to determine if AI should cast a close proximity spell to a
 * friendly target. Custom "intelligence" can be provided by giving
 * args.compFunc which will filter the friend actors.
 */
const aiSpellCellFriend = (args, cb) => {
    const {actor, actorCellsAround} = args;
    let suitable = null;
    actorCellsAround.forEach((cell: Cell) => {
        const actors = cell.getActors();
        actors.forEach(otherActor => {
            if (actor.isFriend(otherActor)) {
                if (!suitable) {
                    suitable = otherActor;
                }
                else if (args.compFunc) {
                    if (args.compFunc(suitable, otherActor)) {
                        suitable = otherActor;
                    }
                }
                else { // If compFunc not given, use default logic
                    const h1 = suitable.get('Health');
                    const h2 = otherActor.get('Health');
                    if (h2.hpLost() > h1.hpLost()) {
                        suitable = otherActor;
                    }
                }
            }
        });
    });

    if (suitable) {
        aiSpellCellDone(actor, suitable, cb);
        return true;
    }
    return false;
};
Spell.aiSpellCellFriend = aiSpellCellFriend;

/* Used to determine if AI caster should cast a spell on itself. */
const aiSpellCellSelf = (args, cb) => {
    const {actor} = args;
    let shouldCast = true;
    if (args.compFunc) {
        if (args.compFunc(actor)) {
            shouldCast = true;
        }
        else {
            shouldCast = false;
        }
    }

    if (shouldCast) {
        aiSpellCellDone(actor, actor, cb);
    }
    return shouldCast;
};
Spell.aiSpellCellSelf = aiSpellCellSelf;

/* Returns selection object for spell which is cast on self. */
Spell.getSelectionObjectSelf = (spell, actor) => {
    const func = () => {
        const spellCast = new Component.SpellCast();
        spellCast.setSource(actor);
        spellCast.setSpell(spell);
        spellCast.setArgs({src: actor});
        actor.add(spellCast);
    };
    return func;
};

/* Returns selection object for spell which required choosing a direction. */
Spell.getSelectionObjectDir = (spell, actor, msg): SelectionObject => {
    RG.gameMsg(msg);
    return {
        // showMsg: () => RG.gameMsg(msg),
        select: (code) => {
            const args: any = {
                dir: KeyMap.getDir(code)
            };
            if (args.dir) {
                args.src = actor;
                return () => {
                    const spellCast = new Component.SpellCast();
                    spellCast.setSource(actor);
                    spellCast.setSpell(spell);
                    spellCast.setArgs(args);
                    actor.add(spellCast);
                };
            }
            return null;
        },
        showMenu: () => false
    };
};

interface SpellAddComp {
    duration?: number;
    comp: ComponentBase;
}

type SpellRemoveComp = string[];

export interface SpellArgs {
    addComp?: SpellAddComp;
    callback?: (any) => void;
    damage?: number;
    damageType?: string;
    destroyItem?: boolean;
    dir?: TCoord;
    from?: TCoord3D;
    to?: TCoord3D;
    postCallback?: () => void;
    range?: number;
    removeComp?: SpellRemoveComp;
    spell: any; // TODO fix this
    src: SentientActor;
    target?: SentientActor;
    targetComp?: string;
    set?: string;
    value?: number;
}

/* Returns args object for directional spell. */
const getDirSpellArgs = function(spell: Spell, args): SpellArgs {
    const src = args.src;
    const obj = {
        from: src.getXY(),
        dir: args.dir,
        spell,
        src: args.src
    };
    return obj;
};
Spell.getDirSpellArgs = getDirSpellArgs;

interface ISpell {
    _name: string;
    _new: string;
    _dice: {[key: string]: Dice};

    toString(): string;
    toJSON(): any;
    setCaster(actor: SentientActor): void;
    equals(spell: ISpell): boolean;
    getName(): string;
    getSelectionObject(actor: SentientActor): SelectionObject;
    canCast(): boolean;
    hasDice(name: string): boolean;
    getCastingPower(): number;
    getPower(): number;
    getRange(): number;
}
type Spell = ISpell;

//------------------------------------------------------
/* @class SpellBook
 * A list of spells known by a single actor. */
//------------------------------------------------------
export class SpellBook {
    protected _actor: SentientActor;
    protected _spells: Spell[];

    constructor(actor: SentientActor) {
        this._actor = actor;
        this._spells = [];
        if (RG.isNullOrUndef([this._actor])) {
            RG.err('Spell.SpellBook', 'new',
                'actor must be given.');
        }
    }

    public getActor(): SentientActor {
        return this._actor;
    }

    public addSpell(spell: Spell): void {
        this._spells.push(spell);
        spell.setCaster(this.getActor());
    }

    public getSpells(): Spell[] {
        return this._spells;
    }

    public equals(rhs: SpellBook): boolean {
        const rhsSpells = rhs.getSpells();
        let equals = true;
        this._spells.forEach((spell, i) => {
            equals = equals && spell.equals(rhsSpells[i]);
            if (!equals) {
                console.log('Spell', spell.getName(), ' caused error');
            }
        });
        return equals;
    }

    /* Returns the object which is used in Brain.Player to make the player
     * selection of spell casting. */
    public getSelectionObject(): SelectionObject {
        const powerSorted: Spell[] = this._spells;
        return {
            select: (code: number) => {
                const selection = Keys.codeToIndex(code);
                if (selection >= 0 && selection < powerSorted.length) {
                    return powerSorted[selection].getSelectionObject(this._actor);
                }
                return null;
            },
            getMenu: (): IMenu => {
                RG.gameMsg('Please select a spell to cast:');
                const indices = Keys.menuIndices.slice(0, this._spells.length);
                const obj = {
                    pre: ['You know the following spells:']
                };
                powerSorted.forEach((spell, index) => {
                    obj[indices[index]] = spell.toString();
                });
                return obj;
            },
            showMenu: () => true
        };
    }

    public toJSON(): any {
        return {
            spells: this._spells.map(spell => spell.toJSON())
        };
    }

}
Spell.SpellBook = SpellBook;

//------------------------------------------------------
/* @class SpellBase
 * Base object for all spells. */
//------------------------------------------------------
export const SpellBase = function(name: string, power: number) {
    this._name = name;
    this._power = power || 5;
    this._caster = null;
    this._dice = {};
    this._range = 0;
    this.setName(name);
};

SpellBase.prototype.setCaster = function(caster: SentientActor): void {
    if (!caster) {
        RG.err('SpellBase', 'setCaster', 'Tried to set null caster');
    }
    this._caster = caster;
};

SpellBase.prototype.getCaster = function(): SentientActor {
    return this._caster;
};

SpellBase.prototype.setName = function(name: string): void {
    const nameSplit = name.split(/\s+/);
    const capNames = [];
    nameSplit.forEach(sName => {
        capNames.push(sName.capitalize());
    });
    this._new = capNames.join('');
};

SpellBase.prototype.getName = function(): string {
    return this._name;
};

SpellBase.prototype.getPower = function(): number {
    return this._power;
};

SpellBase.prototype.canCast = function(): boolean {
    const spellPower = this._caster.get('SpellPower');
    const pp = spellPower.getPP();
    return pp >= this.getCastingPower();
};

/* Returns power required to cast this spell. The value is affected by
 * caster spell casting affinity. */
SpellBase.prototype.getCastingPower = function(): number {
    let castPower = this._power;
    const expLevel = this._caster.get('Experience').getExpLevel();
    castPower -= Math.ceil(expLevel / 3);
    castPower -= Math.floor(this.getCastSkillLevel() / 2);

    // Cannot reduce power below 50% of original
    const halfPower = Math.round(0.50 * this._power);
    if (castPower < halfPower) {return halfPower;}
    return castPower;
};

SpellBase.prototype.getRange = function(): number {
    return this._range;
};

SpellBase.prototype.setRange = function(range: number): void {
    this._range = range;
};

SpellBase.prototype.getDuration = function(perLevel = 1): number {
    let dur = 0;
    if (this._dice.duration) {
        dur = this._dice.duration.roll();
    }
    if (perLevel > 0) {
        const expLevel = this._caster.get('Experience').getExpLevel();
        dur += Math.round(expLevel / perLevel);
        dur += Math.round(this.getCastSkillLevel() / perLevel);
    }
    return dur;
};

SpellBase.prototype.getDamage = function(perLevel = 1): number {
    let damage = 0;
    if (this._dice.damage) {
        damage = this._dice.damage.roll();
    }
    const expLevel = this._caster.get('Experience').getExpLevel();
    damage += Math.round(expLevel / perLevel);
    damage += this.getCastSkillLevel();
    return damage;
};

SpellBase.prototype.getCastSkillLevel = function(): number {
    return RG.getSkillLevel(this._caster, RG.SKILLS.SPELLCASTING);
}

SpellBase.prototype.setPower = function(power: number) {this._power = power;};

type CastFunc = () => void;

SpellBase.prototype.getCastFunc = function(actor, args: SpellArgs): null | CastFunc {
    if (args.dir || args.target || args.src) {
        args.src = actor;
        return () => {
            const spellCast = new Component.SpellCast();
            spellCast.setSource(actor);
            spellCast.setSpell(this);
            spellCast.setArgs(args);
            actor.add(spellCast);
        };
    }
    return null;
};

SpellBase.prototype.toString = function(): string {
    const castPower = this.getCastingPower();
    let str = `${this.getName()} - ${castPower}PP`;
    const castLevel = this.getCastSkillLevel();
    if (this._dice.damage) {
        const castDamage = castLevel;
        str += ` Dmg: ${this._dice.damage.toString()}`;
        if (castDamage > 0) {
            str += ` + ${castDamage}`;
        }
    }
    if (this._dice.duration) {
        str += ` Dur: ${this._dice.duration.toString()}`;
    }
    if (this._range > 0) {str += ` R: ${this.getRange()}`;}
    return str;
};

SpellBase.prototype.getCasterExpBonus = function(div: number): number {
    const expLevel = this.getCaster().get('Experience').getExpLevel();
    return Math.round(expLevel / div);
};

SpellBase.prototype.getCasterStatBonus = function(
    statName: string, div: number
): number {
    const getter = 'get' + statName.capitalize();
    const caster = this.getCaster();
    const statValue = caster[getter]();
    return Math.round(statValue / div);
};

SpellBase.prototype.equals = function(rhs: Spell): boolean {
    let equals = this.getName() === rhs.getName();
    equals = equals && this.getPower() === rhs.getPower();
    equals = equals && this.getRange() === rhs.getRange();
    Object.keys(this._dice).forEach(key => {
        if (rhs._dice[key]) {
            equals = equals && this._dice[key].equals(rhs._dice[key]);
        }
        else {
            equals = false;
        }
    });
    return equals;
};

SpellBase.prototype.setDice = function(name: string, dice): void {
    if (typeof dice === 'string') {
        this._dice[name] = Dice.create(dice);
    }
    else if (dice.roll) {
        this._dice[name] = dice;
    }
};

SpellBase.prototype.getDice = function(name: string): Dice {
    return this._dice[name];
};

SpellBase.prototype.hasDice = function(name: string): boolean {
    if (this._dice.hasOwnProperty(name) && this._dice[name]) {
        return true;
    }
    return false;
};

SpellBase.prototype.removeDice = function(name: string): void {
    this._dice[name] = null;
};

SpellBase.prototype.rollDice = function(name: string): number {
    if (this._dice[name]) {
        return this._dice[name].roll();
    }
    RG.err('SpellBase', 'rollDice',
        `No dice with name ${name} found`);
    return 0;
};

SpellBase.prototype.aiShouldCastSpell = function(args, cb): boolean {
    return false;
};

SpellBase.prototype.toJSON = function(): any {
    const dice = {};
    Object.keys(this._dice).forEach(key => {
        if (!RG.isNullOrUndef([this._dice[key]])) {
            dice[key] = this._dice[key].toJSON();
        }
    });
    return {
        name: this.getName(),
        new: this._new,
        power: this.getPower(),
        dice,
        range: this._range
    };
};

//------------------------------------------------------
/* @class Spell.AddComponent
 * Base class for spells which add components to entities. */
//------------------------------------------------------
Spell.AddComponent = function(name: string, power: number) {
    SpellBase.call(this, name, power);
    this._compName = '';
    this._dice.duration = Dice.create('1d6 + 3');

};
RG.extend2(Spell.AddComponent, SpellBase);

Spell.AddComponent.prototype.setDuration = function(die): void {
    this._dice.duration = die;
};

Spell.AddComponent.prototype.setCompName = function(name: string): void {
    this._compName = name;
};

Spell.AddComponent.prototype.getCompName = function(): string {
    return this._compName;
};

Spell.AddComponent.prototype.cast = function(args): void {
    const obj: SpellArgs = getDirSpellArgs(this, args);

    const compToAdd = create(this._compName);
    if (compToAdd.setSource) {
        compToAdd.setSource(args.src);
    }
    obj.addComp = {comp: compToAdd};
    if (this.hasDice('duration')) {
        const dur = this.rollDice('duration');
        obj.addComp.duration = dur;
    }

    const spellComp = new Component.SpellCell();
    spellComp.setArgs(obj);
    args.src.add(spellComp);
};

Spell.AddComponent.prototype.getSelectionObject = function(actor): SelectionObject {
    const msg = 'Select a direction for the spell:';
    return Spell.getSelectionObjectDir(this, actor, msg);
};

//------------------------------------------------------
/* @class Spell.RemoveComponent
 * Base object for spells removing other components. */
//------------------------------------------------------
Spell.RemoveComponent = function(name: string, power: number) {
    SpellBase.call(this, name, power);
    this._compNames = [];

    this.setCompNames = comps => {
        if (typeof comps === 'string') {
            this._compNames = [comps];
        }
        else {
            this._compNames = comps;
        }
    };
    this.getCompNames = () => this._compNames;

    this.cast = function(args): void {
        const obj: SpellArgs = getDirSpellArgs(this, args);
        obj.removeComp = this._compNames;

        const spellComp = new Component.SpellCell();
        spellComp.setArgs(obj);
        args.src.add(spellComp);
    };

    this.getSelectionObject = function(actor): SelectionObject {
        const msg = 'Select a direction for the spell:';
        return Spell.getSelectionObjectDir(this, actor, msg);
    };

};
RG.extend2(Spell.RemoveComponent, SpellBase);

//------------------------------------------------------
/* Base class for ranged spells. */
//------------------------------------------------------
Spell.Ranged = function(name, power) {
    SpellBase.call(this, name, power);
    this._dice.damage = Dice.create('4d4 + 4');
    this._range = 5;

};
RG.extend2(Spell.Ranged, SpellBase);

Spell.BoltBase = function(name, power) {
    Spell.Ranged.call(this, name, power);
    this.stopOnHit = false; // If true, ray does not pass through actors

    this.cast = function(args) {
        const obj: SpellArgs = getDirSpellArgs(this, args);
        obj.damageType = this.damageType;
        obj.damage = this.rollDice('damage');
        const rayComp = new Component.SpellRay();
        rayComp.setArgs(obj);
        args.src.add(rayComp);
    };

    this.getSelectionObject = function(actor): SelectionObject {
        RG.gameMsg('Select a direction for firing:');
        return {
            select: (code) => {
                const dir = KeyMap.getDir(code);
                return this.getCastFunc(actor, {dir});
            },
            showMenu: () => false
        };
    };

    this.aiShouldCastSpell = (args, cb) => {
        const {actor, enemy} = args;
        if (!enemy) {return false;}

        const [x0, y0] = [actor.getX(), actor.getY()];
        const [x1, y1] = [enemy.getX(), enemy.getY()];
        const lineXY = Geometry.getStraightLine(x0, y0, x1, y1);
        if (lineXY.length > 1) {
            const dX = lineXY[1][0] - lineXY[0][0];
            const dY = lineXY[1][1] - lineXY[0][1];
            const newArgs = {dir: [dX, dY]};
            if (typeof cb === 'function') {
                cb(actor, newArgs);
            }
            else {
                RG.err('Spell.BoltBase', 'aiShouldCastSpell',
                    'No callback function given!');
            }
            return true;
        }
        return false;
    };
};
RG.extend2(Spell.BoltBase, Spell.Ranged);

/* Base spell for summoning other actors for help. Derived classes can define
 * postSummonCallback(cell, args, summonedActor) if post-processing is needed
 * for the summoned actor. */
Spell.SummonBase = function(name: string, power: number) {
    SpellBase.call(this, name, power);
    this.summonType = ''; // Type of summoned actor
    this.nActors = 1;
    this.summonFunc = null; // A constraint for summoned actor

    this.setSummonType = type => {
        this.summonType = type;
    };

    this.cast = function(args) {
        const obj: SpellArgs = getDirSpellArgs(this, args);
        const nActors = Dice.getValue(this.nActors);

        // Will be called by System.SpellEffect
        obj.callback = cell => {
            if (nActors === 1) {
                if (cell.isFree()) {
                    this._createAndAddActor(cell, args);
                }
            }
            else {
                const caster = args.src;
                const map = caster.getLevel().getMap();
                const [cX, cY] = caster.getXY();
                const coord = Geometry.getBoxAround(cX, cY, 2);
                let nPlaced = 0;
                let watchdog = 30;

                while (nPlaced < nActors) {
                    const [x, y] = RNG.arrayGetRand(coord);
                    if (map.hasXY(x, y)) {
                        const newCell = map.getCell(x, y);
                        if (newCell.isFree()) {
                            this._createAndAddActor(newCell, args);
                            ++nPlaced;
                        }
                    }
                    if (--watchdog === 0) {break;}
                }

                if (nPlaced < nActors) {
                    const msg = `${caster.getName()} has no space to summon`;
                    RG.gameMsg({cell: caster.getCell(), msg});
                }
            }
        };

        const spellComp = new Component.SpellCell();
        spellComp.setArgs(obj);
        args.src.add(spellComp);
    };

    this.getSelectionObject = function(actor): SelectionObject {
        const msg = 'Select a free cell for summoning:';
        return Spell.getSelectionObjectDir(this, actor, msg);
    };

    this.aiShouldCastSpell = (args, cb): boolean => {
        const {actor, enemy} = args;
        const friends = Brain.getFriendCellsAround(actor);
        if (friends.length === 0) {
            if (typeof cb === 'function') {
                const summonCell = actor.getBrain().getRandAdjacentFreeCell();
                if (summonCell) {
                    args.dir = RG.dXdY(summonCell, actor);
                    cb(actor, args);
                    return true;
                }
            }
            else {
                RG.err(`Spell.${this.getName()}`, 'aiShouldCastSpell',
                    `No callback function given! enemy: ${enemy}`);
            }
        }
        return false;
    };

    this._createAndAddActor = (cell: Cell, args): void => {
        const [x, y] = [cell.getX(), cell.getY()];
        const caster = args.src;
        const level = caster.getLevel();

        // TODO create proper minion
        const parser = ObjectShell.getParser();

        let minion = null;
        if (this.summonType !== '') {
            minion = parser.createActor(this.summonType);
        }
        else if (this.summonFunc) {
            minion = parser.createRandomActor({func: this.summonFunc});
        }
        // At the moment is failing, when summoner becomes too high-level

        if (minion) {
            level.addActor(minion, x, y);
            minion.getBrain().getMemory().copyMemoryFrom(caster);
            minion.addFriend(caster);
            caster.addFriend(minion);

            const casterName = caster.getName();
            const summonName = minion.getName();
            const msg = `${casterName} summons ${summonName}!`;
            RG.gameMsg({cell, msg});
            if (typeof this.postSummonCallback === 'function') {
                this.postSummonCallback(cell, args, minion);
            }
        }
        else {
            let msg = `Failed to create summon type |${this.summonType}|`;
            if (this.summonFunc) {
                const funcStr = this.summonFunc.toString();
                msg = `summonFunc ${funcStr} gave no actors`;
            }
            RG.warn('Spell.SummonBase', '_createAndActor', msg);
        }
    };

};
RG.extend2(Spell.SummonBase, SpellBase);

/* Base class for Spell missiles. */
Spell.Missile = function(name, power) {
    Spell.Ranged.call(this, name, power);
    this.ammoName = '';
};
RG.extend2(Spell.Missile, Spell.Ranged);

Spell.Missile.prototype.getAmmoName = function() {
    return this.ammoName;
};

Spell.Missile.prototype.cast = function(args): void {
    const obj: SpellArgs = {
        from: args.src.getXYZ(),
        target: args.target,
        spell: this,
        src: args.src,
        to: args.target.getXYZ()
    };
    obj.damageType = this.damageType;
    obj.damage = this.getDamage();
    const missComp = new Component.SpellMissile();
    missComp.setArgs(obj);
    args.src.add(missComp);
};

Spell.Missile.prototype.getSelectionObject = function(actor): SelectionObject {
    const msg = 'Select [n]ext/[p]rev target. [t] to fire. [s] to exit.';
    RG.gameMsg(msg);
    actor.getBrain().startTargeting();

    // This will be called when player pressed TARGET key
    const spellCb = () => {
        const target = actor.getBrain().getTarget();
        if (target) {
            const spellCast = new Component.SpellCast();
            spellCast.setSource(actor);
            spellCast.setSpell(this);
            spellCast.setArgs({src: actor, target});
            actor.add(spellCast);
            actor.getBrain().cancelTargeting();
        }
    };
    const menuOpts = [
        {key: Keys.KEY.TARGET, func: spellCb}
    ];
    return new PlayerMissileMenu(menuOpts, actor);
};

Spell.Missile.prototype.aiShouldCastSpell = function(args, cb) {
    const {actor, enemy} = args;
    if (enemy) {
        const [eX, eY] = enemy.getXY();
        const [aX, aY] = actor.getXY();
        const getDist = Path.shortestDist(eX, eY, aX, aY);
        if (getDist <= this.getRange()) {
            const spellArgs = {target: enemy, src: actor};
            cb(actor, spellArgs);
            return true;
        }
    }
    return false;
};

Spell.AreaBase = function(name: string, power: number) {
    Spell.Ranged.call(this, name, power);

    this.getSelectionObject = function(actor): SelectionObject {
        return Spell.getSelectionObjectSelf(this, actor);
    };

    this.aiShouldCastSpell = (args, cb) => {
        return aiEnemyWithinDist(args, cb, this);
    };

    this.cast = function(args) {
        const obj: SpellArgs = {
            src: args.src, range: this.getRange(),
            spell: this
        };
        obj.damageType = this.damageType;
        obj.damage = this.getDamage();
        const spellComp = new Component.SpellArea();
        spellComp.setArgs(obj);
        args.src.add(spellComp);

        const srcName = args.src.getName();
        const msg = `Huge ${this.getName()} emanates from ${srcName}`;
        RG.gameMsg({msg, cell: args.src.getCell()});
    };

};
RG.extend2(Spell.AreaBase, Spell.Ranged);


function aiEnemyWithinDist(args, cb, spell): boolean {
    const {actor, enemy} = args;
    if (!enemy) {return false;}
    const getDist = Brain.distToActor(actor, enemy);
    if (getDist <= spell.getRange()) {
        const spellArgs = {target: enemy, src: actor};
        cb(actor, spellArgs);
        return true;
    }
    return false;
}


Spell.RingBase = function(name, power) {
    SpellBase.call(this, name, power);
    this._dice.duration = Dice.create('10d10');
    this._range = 2;
    this._createdActor = 'Fire';

    this.cast = function(args) {
        const obj: SpellArgs = getDirSpellArgs(this, args);
        obj.callback = this.castCallback.bind(this);

        const spellComp = new Component.SpellSelf();
        spellComp.setArgs(obj);
        args.src.add(spellComp);
    };

    this.getSelectionObject = function(actor): SelectionObject {
        return Spell.getSelectionObjectSelf(this, actor);
    };

    this.castCallback = () => {
        const parser = ObjectShell.getParser();
        const caster = this._caster;

        const cells = Brain.getCellsAroundActor(caster, this._range);
        cells.forEach(cell => {
            if (cell.isPassable() || cell.hasActors()) {
                const fire = parser.createActor(this._createdActor);
                addFadingActorToCell(fire, cell, this);
            }
        });
    };

    this.aiShouldCastSpell = (args, cb) => {
        return aiEnemyWithinDist(args, cb, this);
    };
};
RG.extend2(Spell.RingBase, SpellBase);

/* Wave spells are slowly moving waves of damaging actors. */
Spell.WaveBase = function(name: string, power: number) {
    Spell.Missile.call(this, name, power);
    this._waveWidth = 3;
    this._waveDepth = 2;
    this._waveSpeed = 100;
    this._waveActor = 'Ice wave';

    this.cast = this.cast.bind(this);
};
RG.extend2(Spell.WaveBase, Spell.Missile);

Spell.WaveBase.prototype.getWaveActor = function(): string {
    return this._waveActor;
};

Spell.WaveBase.prototype.getWaveWidth = function(): string {
    return this._waveWidth;
};

Spell.WaveBase.prototype.getWaveDepth = function(): string {
    return this._waveDepth;
};

Spell.WaveBase.prototype.getWaveSpeed = function(): string {
    return this._waveSpeed;
};

Spell.WaveBase.prototype.cast = function(args): void {
    const obj: SpellArgs = {
        from: args.src.getXYZ(),
        target: args.target,
        spell: this,
        src: args.src,
        to: args.target.getXYZ(),
    };
    obj.damageType = this.damageType;
    obj.damage = this.getDamage();
    const waveComp = new Component.SpellWave();
    waveComp.setArgs(obj);
    console.log('WaveBase adding SpellWave comp now:', obj.from, '->', obj.to);
    args.src.add(waveComp);
};


/* Spell that has multiple spell effects. Note that only one effect
 * can have direction, and that direction will be applied to all
 * multi-spells. For area spells etc, dir has no effect of course
 */
Spell.MultiSpell = function(name: string, power: number) {
    SpellBase.call(this, name, power);
    this._spells = []; // List of spells to cast
};
RG.extend2(Spell.MultiSpell, SpellBase);

Spell.MultiSpell.prototype.addSpell = function(spell): void {
    this._spells.push(spell);
};

Spell.MultiSpell.prototype.setCaster = function(caster: SentientActor): void {
    SpellBase.prototype.setCaster.call(this, caster);
    this._spells.forEach(spell => {
        spell.setCaster(caster)
    });
};

Spell.MultiSpell.prototype.removeSpells = function(): void {
    this._spells = [];
};

Spell.MultiSpell.prototype.canCast = function(): boolean {
    const spellPower = this._caster.get('SpellPower');
    const pp = spellPower.getPP();
    return pp >= this.getCastingPower();
};

Spell.MultiSpell.prototype.cast = function(args) {
    this._spells.forEach(spell => {
        spell.cast(args);
    });
};

Spell.MultiSpell.prototype.getCastingPower = function(): number {
    return this._spells.map(spell => spell.getCastingPower())
        .reduce((acc, cur) => acc + cur, 0);
};

Spell.MultiSpell.prototype.getPower = function(): number {
    return this._spells.map(spell => spell.getPower())
        .reduce((acc, cur) => acc + cur, 0);
};

Spell.MultiSpell.prototype.aiShouldCastSpell = function(args, cb) {
    let ok = true;
    this._spells.forEach(spell => {
        ok = ok && spell.aiShouldCastSpell(args, cb);
    });
    return ok;
};

Spell.MultiSpell.prototype.equals = function(rhs): boolean {
    if (!rhs._spells) {return false;}
    if (rhs._spells.length !== this._spells.length) {
        return false;
    }

    let ok = true;
    this._spells.forEach((spell, i) => {
        ok = ok && spell.equals(rhs._spells[i]);
        if (!ok) {
            console.log('Spell', spell.getName(), ' caused error');
        }
    });
    return ok;
};

Spell.MultiSpell.prototype.toJSON = function(): any {
    const json = SpellBase.prototype.toJSON.call(this);
    json.spells = this._spells.map(spell => spell.toJSON());
    return json;
};

/*
Spell.MultiSpell.prototype.setCaster = function(caster: SentientActor): void {
    this._spells.forEach(spell => {
        spell.setCaster(caster);
    });
};
*/

Spell.override = false;

/* Used for testing the spells. Adds all spells to given SpellBook. */
Spell.defineSpell = function(name: string, superclass: any) {
    const SpellDecl = class extends superclass {
        constructor(...args: any[]) {
            super(name, 0);
            if (this._init && typeof this._init === 'function') {
                this._init(...args);
            }
        }
        private _init?(...args: any[]): void;
    };
    if (Spell.hasOwnProperty(name) && !Spell.override) {
        RG.err('Spell', 'defineSpell',
            `Tried to override spell |${name}|. Use Spell.override = true`);
    }
    Spell[name] = SpellDecl;
    return SpellDecl;
};

Spell.undefineSpell = function(name: string) {
    delete Spell[name];
};

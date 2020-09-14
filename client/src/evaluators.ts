
/* This file contains action evaluators used in combination with actor Goals to
 * implement more diverse computational intelligence for NPCs.
 * Each evaluator should return a desirability of given action, which is a
 * number between 0 and 1.
 */
import RG from './rg';
import {Goal, GoalBase} from './goals';
import {GoalThief} from './goal.thief';
import {GoalTreasureHunter} from './goal.treasure-hunter';
import {Random} from './random';
import {SpellArgs} from './spell';
import {Brain} from './brain';
import {TCoord, TNoFuncVal} from './interfaces';
import {BBox} from './bbox';

type SentientActor = import('./actor').SentientActor;

Goal.Thief = GoalThief;
Goal.TreasureHunter = GoalTreasureHunter;

export const Evaluator: any = {};
Evaluator.hist = {};

// Should be returned if evaluator is not applicable to current situation
Evaluator.NOT_POSSIBLE = RG.BIAS.NOT_POSSIBLE;

// Should be returned if the case is always executed
Evaluator.ALWAYS = RG.BIAS.ALWAYS;

const RNG = Random.getRNG();

interface EvalArgs {
    [key: string]: TNoFuncVal;
}

/* Base class for all evaluators. Provides only the basic constructor. */
export class EvaluatorBase {

    public actorBias: number;
    public type: string;

    // To change the evaluation frequency
    public evalCount: number;
    public evalMaxCount: number;
    public isOneShot: boolean;
    public wasLastChosen: boolean;

    constructor(actorBias: number) {
        this.actorBias = actorBias;
        this.type = 'Base';
        this.evalCount = 0;
        this.evalMaxCount = 1;
        this.isOneShot = false;
        this.wasLastChosen = false;
    }

    public calculateDesirability(actor): number {
        throw new Error('Pure virtual function');
    }

    /* THis is used to inject any arbitrary args to a Goal. You need to override
     * this in derived class with the desired args. */
    public setActorGoal(actor, ...args: any[]): void {
        const topGoal = actor.getBrain().getGoal();
        if (Goal[this.type]) {
            const goal = new Goal[this.type](actor, ...args);
            topGoal.addGoal(goal);
            ++Evaluator.hist[this.type];
        }
        else {
            RG.err(`EvaluatorBase (${this.type})`, 'setActorGoal',
                `No Goal.${this.type} found!`);
        }
    }

    public isOrder(): boolean {return false;}

    public getType(): string {return this.type;}

    public setBias(bias: number): void {
        this.actorBias = bias;
    }

    public toJSON() {
        return {
            type: this.getType(),
            bias: this.actorBias
        };
    }

    /* Called by FromJSON. */
    public setArgs(args): void {}

}
Evaluator.Base = EvaluatorBase;


export class EvaluatorAttackActor extends EvaluatorBase {

    public enemyActor: SentientActor;

    constructor(actorBias: number) {
        super(actorBias);
        this.type = 'AttackActor';
    }

    public calculateDesirability(actor): number {
        const brain = actor.getBrain();
        const seenCells = brain.getSeenCells();
        const enemyCell = brain.findEnemyCell(seenCells);
        if (enemyCell) {
            const result = 1;
            this.enemyActor = enemyCell.getActors()[0];
            return this.actorBias * result * 2;
        }
        return Evaluator.NOT_POSSIBLE;
    }

    public setActorGoal(actor) {
        super.setActorGoal(actor, this.enemyActor);
    }

}
Evaluator.AttackActor = EvaluatorAttackActor;
Evaluator.hist.AttackActor = 0;

/* Evaluator to check if an actor should resort to exploring the area. */
export class EvaluatorExplore extends EvaluatorBase {

    constructor(actorBias: number) {
        super(actorBias);
        this.type = 'Explore';
    }

    public calculateDesirability(/* actor */): number {
        return this.actorBias;
    }

}
Evaluator.Explore = EvaluatorExplore;
Evaluator.hist.Explore = 0;

/* Evaluator to check if actor should flee from a fight. */
export class EvaluatorFlee extends EvaluatorBase {

    public enemyActor: SentientActor;

    constructor(actorBias: number) {
        super(actorBias);
        this.type = 'Flee';
    }

    public calculateDesirability(actor): number {
        const health = actor.get('Health');
        const propHP = health.propLeft();
        if (propHP < this.actorBias) {
            const enemies = actor.getBrain().getSeenEnemies();
            if (enemies.length > 0) {
                let index = -1;
                if (this.enemyActor) {
                    index = enemies.findIndex(e =>
                        e.getID() === this.enemyActor.getID()
                    );
                }
                if (index === -1) {
                    this.enemyActor = enemies[0];
                }

                const div = Math.pow(propHP, 2);
                return this.actorBias * (1.0 - propHP) / div;
            }
        }
        this.enemyActor = null;
        return Evaluator.NOT_POSSIBLE;
    }

    public setActorGoal(actor): void {
        if (this.enemyActor) {
            const topGoal = actor.getBrain().getGoal();
            const goal = new Goal.FleeFromActor(actor, this.enemyActor);
            topGoal.addGoal(goal);
            ++Evaluator.hist[this.type];
        }
        else {
            RG.err('EvaluatorFlee', 'setActorGoal',
                'Enemy actor is null. Cannot flee.');
        }
    }

}
Evaluator.Flee = EvaluatorFlee;
Evaluator.hist.Flee = 0;

/* Evaluator to check if actor should guard between given points. */
export class EvaluatorPatrol extends EvaluatorBase {

    public coords: TCoord[];

    constructor(actorBias: number, coord: TCoord[] = []) {
        super(actorBias);
        this.type = 'Patrol';
        this.coords = coord;
    }

    public setCoords(coords: TCoord[]): void {
        this.coords = coords;
    }

    public calculateDesirability(): number {
        return this.actorBias;
    }

    public setActorGoal(actor) {
        const topGoal = actor.getBrain().getGoal();
        const coords = this.coords;
        if (coords.length > 0) {
            const goal = new Goal.Patrol(actor, coords);
            topGoal.addGoal(goal);
            ++Evaluator.hist[this.type];
        }
        else {
            RG.err('EvaluatorPatrol', 'setActorGoal',
                'No guard points set with setCoords()');
        }
    }

    public setArgs(args: EvalArgs) {
        this.coords = args.coords;
    }

    public toJSON() {
        const json: any = super.toJSON();
        json.args = {
            coords: this.coords
        };
        return json;
    }
}
Evaluator.Patrol = EvaluatorPatrol;
Evaluator.hist.Patrol = 0;

/* Evaluator to check if actor should guard the given point. */
export class EvaluatorGuard extends EvaluatorBase {

    public x: number;
    public y: number;

    constructor(actorBias: number, xy: TCoord) {
        super(actorBias);
        this.type = 'Guard';
        if (xy) {this.setXY(xy);}
    }

    public setXY(xy: TCoord): void {
        this.x = xy[0];
        this.y = xy[1];
    }

    public setArgs(args): void {
        const {xy} = args;
        this.setXY(xy);
    }

    public calculateDesirability(): number {
        return this.actorBias;
    }

    public setActorGoal(actor): void {
        const topGoal = actor.getBrain().getGoal();
        const goal = new Goal.Guard(actor, [this.x, this.y]);
        topGoal.addGoal(goal);
        ++Evaluator.hist[this.type];
    }

    public toJSON() {
        const json: any = super.toJSON();
        json.args = {xy: [this.x, this.y]};
        return json;
    }
}
Evaluator.Guard = EvaluatorGuard;
Evaluator.hist.Guard = 0;

/* Evaluator to check if actor should guard the given point. */
export class EvaluatorGuardArea extends EvaluatorBase {

    public bbox: BBox;

    constructor(actorBias: number, bbox: BBox) {
        super(actorBias);
        this.type = 'GuardArea';
        this.setBBox(bbox);
    }

    public setBBox(bbox: BBox): void {
        this.bbox = bbox;
    }

    public setArgs(args: EvalArgs): void {
        const {bbox} = args as any;
        this.setBBox(BBox.fromBBox(bbox));
    }

    public calculateDesirability(actor): number {
        if (this.bbox.hasXY(actor.getX(), actor.getY())) {
            return Evaluator.NOT_POSSIBLE;
        }
        return this.actorBias;
    }

    public setActorGoal(actor): void {
        const topGoal = actor.getBrain().getGoal();
        const goal = new Goal.GuardArea(actor, this.bbox);
        topGoal.addGoal(goal);
        ++Evaluator.hist[this.type];
    }

    public toJSON() {
        const json: any = super.toJSON();
        json.args = {bbox: this.bbox};
        return json;
    }
}
Evaluator.GuardArea = EvaluatorGuardArea;
Evaluator.hist.GuardArea = 0;

/* Evaluator to check if actor should flee from a fight. */
export class EvaluatorOrders extends EvaluatorBase {

    public goal: GoalBase;
    public srcActor: SentientActor;
    // public subEval: EvaluatorBase;

    constructor(actorBias: number) {
        super(actorBias);
        this.type = 'Orders';
        this.goal = null;
    }

    /* Sets the arguments used for goal injection for commanded actor. */
    public setArgs(args): void {
        this.goal = args.goal;
        this.srcActor = args.srcActor;
    }

    public calculateDesirability(): number {
        // TODO evaluate srcActor status
        // Evaluate difficulty of goal
        const commanderMult = 1.0;
        const goalCateg = this.goal.getCategory();
        let mult = goalCateg === Goal.Types.Kill ? 0.5 : 1.0;
        mult *= this.actorBias;
        if (this.acceptsOrdersFromSource()) {
            return mult * commanderMult;
        }
        return 0;
    }

    public acceptsOrdersFromSource(): boolean {
        if (this.srcActor.has('Commander')) {
            return true;
        }
        else if (this.srcActor.isPlayer()) {
            // TODO calculate some values here
            return true;
        }
        return false;
    }

    public setActorGoal(actor): void {
        if (this.goal) {
            const topGoal = actor.getBrain().getGoal();
            topGoal.addGoal(this.goal);
            ++Evaluator.hist[this.type];
        }
        else {
            RG.err('EvaluatorOrder', 'setActorGoal',
                'this.goal must not be null');
        }
    }

    /*
    public setSubEvaluator(evaluator) {
        this.subEval = evaluator;
    }
    */

    public isOrder(): boolean {return true;}

}
Evaluator.Orders = EvaluatorOrders;
Evaluator.hist.Orders = 0;

/* Calculates the desirability to cast a certain spell. */
export class EvaluatorCastSpell extends EvaluatorBase {

    public _castingProb: number;
    public spell: any; // TODO fix to correct type
    public spellArgs: SpellArgs;

    constructor(actorBias: number) {
        super(actorBias);
        this.type = 'CastSpell';
        this._castingProb = 0.2;
    }

    public setCastingProbability(prob) {
        this._castingProb = prob;
    }

    public getCastingProbability() {
        return this._castingProb;
    }

    public calculateDesirability(actor): number {
        this.spell = this.getRandomSpell(actor);
        if (!this.spell) {return 0;}

        if (this.canCastSpell(actor)) {
            if (this.shouldCastSpell(actor)) {
                return this.actorBias;
            }
        }
        return 0;
    }

    public setActorGoal(actor) {
        if (this.spell) {
            const topGoal = actor.getBrain().getGoal();
            const goal = new Goal.CastSpell(actor, this.spell, this.spellArgs);
            topGoal.addGoal(goal);
            ++Evaluator.hist[this.type];
        }
        else {
            RG.err('EvaluatorFlee', 'setActorGoal',
                'Enemy actor is null. Cannot flee.');
        }
    }

    public getRandomSpell(actor) {
        const book = actor.getBook();
        if (book && book.getSpells().length > 0) {
            const spell = RNG.arrayGetRand(book.getSpells());
            return spell;
        }
        return null;
    }

    /* Returns true if spellcaster can cast a spell. */
    public canCastSpell(actor) {
        if (actor.has('SpellPower')) {
            const spellPower = actor.get('SpellPower');
            if (spellPower.getPP() >= this.spell.getCastingPower()) {
                if (RNG.getUniform() <= this._castingProb) {
                    return true;
                }
            }
        }
        return false;
    }

    /* Returns true if spellcaster should cast the spell. */
    public shouldCastSpell(actor) {
        const brain = actor.getBrain();
        const seenCells = brain.getSeenCells();
        const enemyCell = brain.findEnemyCell(seenCells);
        const actorCellsAround = Brain.getActorCellsAround(actor);
        const args: any = {actor, actorCellsAround};
        if (enemyCell) {
            args.enemy = enemyCell.getActors()[0];
        }
        if (this.spell.aiShouldCastSpell) {
            return this.spell.aiShouldCastSpell(args, (act, newArgs) => {
                this.spellArgs = newArgs;
            });
        }
        else {
            let msg = `Spell ${this.spell.getName()} cannot be cast by AI`;
            msg += ' no aiShouldCastSpell() defined for the spell';
            RG.warn('Evaluator.CastSpell', 'shouldCastSpell', msg);
        }
        return false;
    }

}
Evaluator.CastSpell = EvaluatorCastSpell;
Evaluator.hist.CastSpell = 0;

/* Evaluator used by shopkeeper actors to check if they should carry on
 * with shopkeeping duties. */
export class EvaluatorShopkeeper extends EvaluatorBase {

    public x: number;
    public y: number;

    constructor(actorBias: number) {
        super(actorBias);
        this.type = 'Shopkeeper';
    }

    public calculateDesirability(actor): number {
        // TODO calculate dist from shop etc
        if (actor.has('Shopkeeper')) {
            return this.actorBias;
        }
        RG.err('EvaluatorShopkeeper', 'calculateDesirability',
            `An actor is not shopkeeper: ${actor}`);
        return 0;
    }

    public setActorGoal(actor): void {
        const topGoal = actor.getBrain().getGoal();
        const goal = new Goal.Shopkeeper(actor, this.x, this.y);
        topGoal.addGoal(goal);
        ++Evaluator.hist[this.type];
    }

    public setArgs(args) {
        const {xy} = args;
        this.x = xy[0];
        this.y = xy[1];
    }

    public toJSON() {
        const json: any = super.toJSON();
        json.args = {xy: [this.x, this.y]};
        return json;
    }

}
Evaluator.Shopkeeper = EvaluatorShopkeeper;
Evaluator.hist.Shopkeeper = 0;

/* Evaluator added to actors having home and wanting to spend time there
 * now and then. */
export class EvaluatorGoHome extends EvaluatorBase {
    public timeToHomeSick: number;
    public timeToStay: number;
    public maxDistHome: number;
    public x: number;
    public y: number;

    constructor(actorBias: number) {
        super(actorBias);
        this.type = 'GoHome';
        this.timeToHomeSick = RNG.getUniformInt(20, 40);
        this.timeToStay = 0;
        this.maxDistHome = 5;
        this.x = -1;
        this.y = -1;
    }

    public calculateDesirability(actor): number {
        if (this.timeToHomeSick > 0) {
            this.timeToHomeSick -= 1;
            return 0.0;
        }
        else if (this.timeToHomeSick === 0) {
            this.timeToHomeSick = -1;
            this.timeToStay = RNG.getUniformInt(20, 40);
        }

        if (this.timeToStay > 0) {
            const xy: TCoord = [this.x, this.y];
            if (RG.withinRange(this.maxDistHome, xy, actor)) {
                this.timeToStay -= 1;
            }
            return this.actorBias;
        }
        else if (this.timeToStay === 0) {
            this.timeToStay = -1;
            this.timeToHomeSick = RNG.getUniformInt(20, 40);
        }
        return 0.0;
    }

    public setActorGoal(actor) {
        const topGoal = actor.getBrain().getGoal();
        const goal = new Goal.GoHome(actor, this.x, this.y, this.maxDistHome);
        topGoal.addGoal(goal);
        ++Evaluator.hist[this.type];
    }

    public setArgs(args) {
        const {xy} = args;
        this.x = xy[0];
        this.y = xy[1];
        this.timeToHomeSick = args.timeToHomeSick;
    }

    public toJSON() {
        const json: any = super.toJSON();
        json.args = {
            xy: [this.x, this.y],
            timeToHomeSick: this.timeToHomeSick
        };
        return json;
    }

}
Evaluator.GoHome = EvaluatorGoHome;
Evaluator.hist.GoHome = 0;

export class EvaluatorThief extends EvaluatorBase {

    constructor(actorBias: number) {
        super(actorBias);
        this.type = 'Thief';
    }

    public calculateDesirability(/* actor */): number {
        return this.actorBias;
    }

}
Evaluator.Thief = EvaluatorThief;
Evaluator.hist.Thief = 0;

export class EvaluatorCommunicate extends EvaluatorBase {

    constructor(actorBias: number) {
        super(actorBias);
        this.type = 'Communicate';
    }

    public calculateDesirability(actor): number {
        if (this.willCommunicate(actor)) {
            return this.actorBias;
        }
    }

    /* Returns true if actor will communicate something. */
    public willCommunicate(actor): boolean {
        const brain = actor.getBrain();
        const communicateOrAttack = RNG.getUniform();
        const seenCells = brain.getSeenCells();
        const friendCell = brain.findFriendCell(seenCells);
        const memory = brain.getMemory();

        let friendActor = null;
        if (RG.isNullOrUndef([friendCell])) {
            return false;
        }
        else {
            friendActor = friendCell.getActors()[0];
            if (memory.hasCommunicatedWith(friendActor)) {
                return false;
            }
            else if (friendActor.has('Communication')) {
                return false;
            }
        }

        if (communicateOrAttack < (1.0 - this.actorBias)) {
            return false;
        }
        return true;
    }
}
Evaluator.Communicate = EvaluatorCommunicate;

/* Evaluator is needed for actors which have usable skills. */
export class EvaluatorUseSkill extends EvaluatorBase {

    protected cooldown: number;
    protected maxCooldown: number;
    protected aiType: string;

    constructor(actorBias: number) {
        super(actorBias);
        this.type = 'UseSkill';
        this.maxCooldown = 100;
        this.cooldown = RNG.getUniformInt(10, 2 * this.maxCooldown);
        this.aiType = 'aiCell';
    }

    public calculateDesirability(actor): number {
        if (!aiShouldUseSkill(this, actor)) {
            return RG.BIAS.NOT_POSSIBLE;
        }
        if (this.cooldown === 0) {
            this.cooldown = RNG.getUniformInt(10, 2 * this.maxCooldown);
            console.log('EvalUseSkill cooldown at 0.');
            return this.actorBias;
        }
        else {
            this.cooldown -= 1;
            return RG.BIAS.NOT_POSSIBLE;
        }
    }

    public setArgs(args: any): void {
        this.cooldown = args.cooldown;
        this.maxCooldown = args.maxCooldown;
        this.aiType = args.aiType;
    }

    public toJSON() {
        const json: any = super.toJSON();
        json.args = {
            cooldown: this.cooldown,
            maxCooldown: this.maxCooldown,
            aiType: this.aiType
        };
        return json;
    }

}
Evaluator.UseSkill = EvaluatorUseSkill;

function aiShouldUseSkill(evaluator, actor): boolean {
    // Options for AIs:
    //   0. aiSelf
    //   1. aiCell
    //   2. aiFreeCell
    if (evaluator.aiType === 'aiFreeCell') {
        const cells = actor.getBrain().getFreeCellsAround();
        return cells.length > 0;
    }

    //   3. aiFriendlyCell
    //   4. aiEnemyCell
    //   5. aiFriendlyRanged
    //   6. aiEnemyRanged
    //   7. ...
    return false;
}

export class EvaluatorTreasureHunter extends EvaluatorBase {

    constructor(actorBias: number) {
        super(actorBias);
        this.type = 'TreasureHunter';
    }

    public calculateDesirability(/* actor */): number {
        return this.actorBias;
    }

}
Evaluator.TreasureHunter = EvaluatorTreasureHunter;

export class EvaluatorRest extends EvaluatorBase {

    constructor(actorBias: number) {
        super(actorBias);
        this.type = 'Rest';
    }

    public calculateDesirability(/* actor */): number {
        return this.actorBias;
    }

}
Evaluator.Rest = EvaluatorRest;

export class EvaluatorFindWeapon extends EvaluatorBase {

    constructor(actorBias: number) {
        super(actorBias);
        this.type = 'FindWeapon';
    }

    public calculateDesirability(/* actor */): number {
        return this.actorBias;
    }

}
Evaluator.FindWeapon = EvaluatorFindWeapon;


export class EvaluatorFindAmmo extends EvaluatorBase {

    public ammoType: string;

    constructor(actorBias: number) {
        super(actorBias);
        this.type = 'FindAmmo';
        this.ammoType = 'bow';
    }

    public calculateDesirability(/* actor */): number {
        return this.actorBias;
    }

    public setActorGoal(actor) {
        super.setActorGoal(actor, this.ammoType);
    }

}
Evaluator.FindAmmo = EvaluatorFindAmmo;

export class EvaluatorFollowPath extends EvaluatorBase {

    public xy: TCoord;

    constructor(actorBias: number) {
        super(actorBias);
        this.type = 'FollowPath';
    }

    public calculateDesirability(/* actor */): number {
        return this.actorBias;
    }

    public setActorGoal(actor) {
        super.setActorGoal(actor, this.xy);
    }

}
Evaluator.FollowPath = EvaluatorFollowPath;


export class EvaluatorGeneric extends EvaluatorBase {
    public args: any[];

    constructor(actorBias: number, type: string) {
        super(actorBias);
        this.type = type;
        // args not initialized to empty array, as it's not always needed
    }

    public calculateDesirability(/* actor */): number {
        return this.actorBias;
    }

    public setActorGoal(actor): void {
        // Without if, we can get 'this.args is not iterable' Error
        if (this.args) {
            super.setActorGoal(actor, ...this.args);
        }
        else {
            super.setActorGoal(actor);
        }
    }

}
Evaluator.Generic = EvaluatorGeneric;


export function createEval(type: string, bias: number): EvaluatorGeneric {
    return new EvaluatorGeneric(bias, type);
}
Evaluator.create = createEval;

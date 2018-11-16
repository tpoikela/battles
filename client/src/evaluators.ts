
/* This file contains action evaluators used in combination with actor Goals to
 * implement more diverse computational intelligence for NPCs.
 * Each evaluator should return a desirability of given action, which is a
 * number between 0 and 1.
 */
import RG from './rg';
import {Goal, GoalBase} from './goals';
import {GoalThief} from './goal.thief';
import {SentientActor} from './actor';
import {Random} from './random';
import {SpellArgs} from './spell';
import {Brain} from './brain';

type Coord = [number, number];

Goal.Thief = GoalThief;

export const Evaluator: any = {};
Evaluator.hist = {};

// Should be returned if evaluator is not applicable to current situation
Evaluator.NOT_POSSIBLE = RG.BIAS.NOT_POSSIBLE;

// Should be returned if the case is always executed
Evaluator.ALWAYS = RG.BIAS.ALWAYS;

const RNG = Random.getRNG();

/* Base class for all evaluators. Provides only the basic constructor. */
export class EvaluatorBase {

    public actorBias: number;
    public type: string;

    constructor(actorBias) {
        /* if (!Number.isFinite(actorBias)) {
            RG.err('EvaluatorBase', 'constructor',
                `bias must number. Got: ${actorBias}`);
        }*/
        this.actorBias = actorBias;
        this.type = 'Base';
    }

    public calculateDesirability(actor) {
        throw new Error('Pure virtual function');
    }

    public setActorGoal(actor, ...args) {
        const topGoal = actor.getBrain().getGoal();
        if (Goal[this.type]) {
            const goal = new Goal[this.type](actor, ...args);
            topGoal.addGoal(goal);
            ++Evaluator.hist[this.type];
        }
        else {
            RG.err('EvaluatorBase', 'setActorGoal',
                `No Goal.${this.type} found!`);
        }
    }

    public isOrder() {return false;}

    public getType() {return this.type;}

    public setBias(bias) {
        this.actorBias = bias;
    }

    public toJSON() {
        return {
            type: this.getType(),
            bias: this.actorBias
        };
    }

    /* Called by FromJSON. */
    public setArgs(args) {}

}
Evaluator.Base = EvaluatorBase;


export class EvaluatorAttackActor extends EvaluatorBase {

    public enemyActor: SentientActor;

    constructor(actorBias) {
        super(actorBias);
        this.type = 'AttackActor';
    }

    public calculateDesirability(actor) {
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
        /* const topGoal = actor.getBrain().getGoal();
        const goal = new Goal.AttackActor(actor, this.enemyActor);
        topGoal.addGoal(goal);
        ++Evaluator.hist[this.type];*/
    }

}
Evaluator.AttackActor = EvaluatorAttackActor;
Evaluator.hist.AttackActor = 0;

/* Evaluator to check if an actor should resort to exploring the area. */
export class EvaluatorExplore extends EvaluatorBase {

    constructor(actorBias) {
        super(actorBias);
        this.type = 'Explore';
    }

    public calculateDesirability(/* actor */) {
        /* const enemyCells = RG.Brain.getEnemyCellsAround(actor);
        if (enemyCells.length > 0) {
            return 0.01;
        }*/
        return this.actorBias;
    }

}
Evaluator.Explore = EvaluatorExplore;
Evaluator.hist.Explore = 0;

/* Evaluator to check if actor should flee from a fight. */
export class EvaluatorFlee extends EvaluatorBase {

    public enemyActor: SentientActor;

    constructor(actorBias) {
        super(actorBias);
        this.type = 'Flee';
    }

    public calculateDesirability(actor) {
        const enemies = actor.getBrain().getSeenEnemies();
        if (enemies.length > 0) {
            const health = actor.get('Health');
            const maxHP = health.getMaxHP();
            const HP = health.getHP();
            const propHP = HP / maxHP;
            if (propHP < this.actorBias) {
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

    public setActorGoal(actor) {
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

    public coords: Coord[];

    constructor(actorBias, coord = []) {
        super(actorBias);
        this.type = 'Patrol';
        this.coords = coord;
    }

    public setCoords(coords) {
        this.coords = coords;
    }

    public calculateDesirability() {
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

    public setArgs(args) {
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

    constructor(actorBias, xy) {
        super(actorBias);
        this.type = 'Guard';
        if (xy) {this.setXY(xy);}
    }

    public setXY(xy) {
        this.x = xy[0];
        this.y = xy[1];
    }

    public setArgs(args) {
        const {xy} = args;
        this.setXY(xy);
    }

    public calculateDesirability() {
        return this.actorBias;
    }

    public setActorGoal(actor) {
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

/* Evaluator to check if actor should flee from a fight. */
export class EvaluatorOrders extends EvaluatorBase {

    public goal: GoalBase;
    public srcActor: SentientActor;
    public subEval: EvaluatorBase;

    constructor(actorBias) {
        super(actorBias);
        this.type = 'Orders';
        this.goal = null;
    }

    /* Sets the arguments used for goal injection for commanded actor. */
    public setArgs(args) {
        this.goal = args.goal;
        this.srcActor = args.srcActor;
    }

    public calculateDesirability() {
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

    public acceptsOrdersFromSource() {
        if (this.srcActor.has('Commander')) {
            return true;
        }
        else if (this.srcActor.isPlayer()) {
            return true;
        }
        return false;
    }

    public setActorGoal(actor) {
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

    public setSubEvaluator(evaluator) {
        this.subEval = evaluator;
    }

    public isOrder() {return true;}

}
Evaluator.Orders = EvaluatorOrders;
Evaluator.hist.Orders = 0;

/* Calculates the desirability to cast a certain spell. */
export class EvaluatorCastSpell extends EvaluatorBase {

    public _castingProb: number;
    public spell: any; // TODO fix to correct type
    public spellArgs: SpellArgs;

    constructor(actorBias) {
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

    public calculateDesirability(actor) {
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

    constructor(actorBias) {
        super(actorBias);
        this.type = 'Shopkeeper';
    }

    public calculateDesirability(actor) {
        // TODO calculate dist from shop etc
        if (actor.has('Shopkeeper')) {
            return this.actorBias;
        }
        RG.err('EvaluatorShopkeeper', 'calculateDesirability',
            `An actor is not shopkeeper: ${actor}`);
        return 0;
    }

    public setActorGoal(actor) {
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

    constructor(actorBias) {
        super(actorBias);
        this.type = 'GoHome';
        this.timeToHomeSick = RNG.getUniformInt(20, 40);
        this.timeToStay = 0;
        this.maxDistHome = 5;
    }

    public calculateDesirability(actor) {
        if (this.timeToHomeSick > 0) {
            this.timeToHomeSick -= 1;
            return 0.0;
        }
        else if (this.timeToHomeSick === 0) {
            this.timeToHomeSick = -1;
            this.timeToStay = RNG.getUniformInt(20, 40);
        }

        if (this.timeToStay > 0) {
            const xy = [this.x, this.y];
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

    constructor(actorBias) {
        super(actorBias);
        this.type = 'Thief';
    }

    public calculateDesirability(/* actor */) {
        return this.actorBias;
    }

}
Evaluator.Thief = EvaluatorThief;
Evaluator.hist.Thief = 0;

export class EvaluatorCommunicate extends EvaluatorBase {

    constructor(actorBias) {
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

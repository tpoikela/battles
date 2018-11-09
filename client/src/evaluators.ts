
/* This file contains action evaluators used in combination with actor Goals to
 * implement more diverse computational intelligence for NPCs.
 * Each evaluator should return a desirability of given action, which is a
 * number between 0 and 1.
 */
import RG from './rg';
import Goal from './goals';
import GoalThief from './goal.thief';
import {SentientActor} from './actor';
import {Random} from './random';

type Coord = [number, number];

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

    calculateDesirability(actor) {
        throw new Error('Pure virtual function');
    }

    setActorGoal(actor, ...args) {
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

    isOrder() {return false;}

    getType() {return this.type;}

    setBias(bias) {
        this.actorBias = bias;
    }

    toJSON() {
        return {
            type: this.getType(),
            bias: this.actorBias
        };
    }

    /* Called by FromJSON. */
    setArgs(args) {}

}
Evaluator.Base = EvaluatorBase;


export class EvaluatorAttackActor extends EvaluatorBase {

    public enemyActor: SentientActor;

    constructor(actorBias) {
        super(actorBias);
        this.type = 'AttackActor';
    }

    calculateDesirability(actor) {
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

    setActorGoal(actor) {
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

    calculateDesirability(/* actor */) {
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

    calculateDesirability(actor) {
        // const enemyCells = RG.Brain.getEnemyCellsAround(actor);
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

    setActorGoal(actor) {
        if (this.enemyActor) {
            const topGoal = actor.getBrain().getGoal();
            const goal = new Goal.Flee(actor, this.enemyActor);
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

    setCoords(coords) {
        this.coords = coords;
    }

    calculateDesirability() {
        return this.actorBias;
    }

    setActorGoal(actor) {
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

    setArgs(args) {
        this.coords = args.coords;
    }

    toJSON() {
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

    setXY(xy) {
        this.x = xy[0];
        this.y = xy[1];
    }

    setArgs(args) {
        const {xy} = args;
        this.setXY(xy);
    }

    calculateDesirability() {
        return this.actorBias;
    }

    setActorGoal(actor) {
        const topGoal = actor.getBrain().getGoal();
        const goal = new Goal.Guard(actor, [this.x, this.y]);
        topGoal.addGoal(goal);
        ++Evaluator.hist[this.type];
    }

    toJSON() {
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

    constructor(actorBias) {
        super(actorBias);
        this.type = 'Orders';
        this.goal = null;
    }

    /* Sets the arguments used for goal injection for commanded actor. */
    setArgs(args) {
        this.goal = args.goal;
        this.srcActor = args.srcActor;
    }

    calculateDesirability() {
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

    acceptsOrdersFromSource() {
        if (this.srcActor.has('Commander')) {
            return true;
        }
        else if (this.srcActor.isPlayer()) {
            return true;
        }
        return false;
    }

    setActorGoal(actor) {
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

    setSubEvaluator(evaluator) {
        this.subEval = evaluator;
    }

    isOrder() {return true;}

}
Evaluator.Orders = EvaluatorOrders;
Evaluator.hist.Orders = 0;

/* Calculates the desirability to cast a certain spell. */
export class EvaluatorCastSpell extends EvaluatorBase {

    constructor(actorBias) {
        super(actorBias);
        this.type = 'CastSpell';
        this._castingProb = 0.2;
    }

    setCastingProbability(prob) {
        this._castingProb = prob;
    }

    getCastingProbability() {
        return this._castingProb;
    }

    calculateDesirability(actor) {
        this.spell = this.getRandomSpell(actor);
        if (!this.spell) {return 0;}

        if (this.canCastSpell(actor)) {
            if (this.shouldCastSpell(actor)) {
                return this.actorBias;
            }
        }
        return 0;
    }

    setActorGoal(actor) {
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

    getRandomSpell(actor) {
        const book = actor.getBook();
        if (book && book.getSpells().length > 0) {
            const spell = RNG.arrayGetRand(book.getSpells());
            return spell;
        }
        return null;
    }

    /* Returns true if spellcaster can cast a spell. */
    canCastSpell(actor) {
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
    shouldCastSpell(actor) {
        const brain = actor.getBrain();
        const seenCells = brain.getSeenCells();
        const enemyCell = brain.findEnemyCell(seenCells);
        const actorCellsAround = RG.Brain.getActorCellsAround(actor);
        const args = {actor, actorCellsAround};
        if (enemyCell) {
            args.enemy = enemyCell.getActors()[0];
        }
        if (this.spell.aiShouldCastSpell) {
            return this.spell.aiShouldCastSpell(args, (actor, args) => {
                this.spellArgs = args;
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

    constructor(actorBias) {
        super(actorBias);
        this.type = 'Shopkeeper';
    }

    calculateDesirability(actor) {
        // TODO calculate dist from shop etc
        if (actor.has('Shopkeeper')) {
            return this.actorBias;
        }
        RG.err('EvaluatorShopkeeper', 'calculateDesirability',
            `An actor is not shopkeeper: ${actor}`);
        return 0;
    }

    setActorGoal(actor) {
        const topGoal = actor.getBrain().getGoal();
        const goal = new Goal.Shopkeeper(actor, this.x, this.y);
        topGoal.addGoal(goal);
        ++Evaluator.hist[this.type];
    }

    setArgs(args) {
        const {xy} = args;
        this.x = xy[0];
        this.y = xy[1];
    }

    toJSON() {
        const json = super.toJSON();
        json.args = {xy: [this.x, this.y]};
        return json;
    }

}
Evaluator.Shopkeeper = EvaluatorShopkeeper;
Evaluator.hist.Shopkeeper = 0;

/* Evaluator added to actors having home and wanting to spend time there
 * now and then. */
export class EvaluatorGoHome extends EvaluatorBase {

    constructor(actorBias) {
        super(actorBias);
        this.type = 'GoHome';
        this.timeToHomeSick = RNG.getUniformInt(20, 40);
        this.timeToStay = 0;
        this.maxDistHome = 5;
    }

    calculateDesirability(actor) {
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

    setActorGoal(actor) {
        const topGoal = actor.getBrain().getGoal();
        const goal = new Goal.GoHome(actor, this.x, this.y, this.maxDistHome);
        topGoal.addGoal(goal);
        ++Evaluator.hist[this.type];
    }

    setArgs(args) {
        const {xy} = args;
        this.x = xy[0];
        this.y = xy[1];
        this.timeToHomeSick = args.timeToHomeSick;
    }

    toJSON() {
        const json = super.toJSON();
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

    calculateDesirability(/* actor */) {
        return this.actorBias;
    }

}
Evaluator.Thief = EvaluatorThief;
Evaluator.hist.Thief = 0;


/* This file contains action evaluators used in combination with actor Goals to
 * implement more diverse computational intelligence for NPCs.
 * Each evaluator should return a desirability of given action, which is a
 * number between 0 and 1.
 */

const RG = require('./rg');
const Goal = require('./goals');
// const GoalsBattle = require('./goals-battle');

const Evaluator = {};

// Should be returned if evaluator is not applicable to current situation
Evaluator.NOT_POSSIBLE = RG.BIAS.NOT_POSSIBLE;

// Should be returned if the case is always executed
Evaluator.ALWAYS = RG.BIAS.ALWAYS;

const RNG = RG.Random.getRNG();

/* Base class for all evaluators. Provides only the basic constructor. */
class EvaluatorBase {

    constructor(actorBias) {
        this.actorBias = actorBias;
        this.type = 'Base';
    }

    calculateDesirability() {
        throw new Error('Pure virtual function');
    }

    setActorGoal() {
        throw new Error('Pure virtual function');
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
    setArgs() {}

}
Evaluator.Base = EvaluatorBase;


class EvaluatorAttackActor extends EvaluatorBase {

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
        const topGoal = actor.getBrain().getGoal();
        const goal = new Goal.AttackActor(actor, this.enemyActor);
        topGoal.addGoal(goal);
    }

}
Evaluator.AttackActor = EvaluatorAttackActor;

/* Evaluator to check if an actor should resort to exploring the area. */
class EvaluatorExplore extends EvaluatorBase {

    constructor(actorBias) {
        super(actorBias);
        this.type = 'Explore';
    }

    calculateDesirability(actor) {
        const enemyCells = RG.Brain.getEnemyCellsAround(actor);
        if (enemyCells.length > 0) {
            return 0.01;
        }
        return this.actorBias;
    }

    setActorGoal(actor) {
        const topGoal = actor.getBrain().getGoal();
        const goal = new Goal.Explore(actor);
        topGoal.addGoal(goal);
    }

}
Evaluator.Explore = EvaluatorExplore;

/* Evaluator to check if actor should flee from a fight. */
class EvaluatorFlee extends EvaluatorBase {

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
        }
        else {
            RG.err('EvaluatorFlee', 'setActorGoal',
                'Enemy actor is null. Cannot flee.');
        }
    }

}
Evaluator.Flee = EvaluatorFlee;

/* Evaluator to check if actor should flee from a fight. */
class EvaluatorPatrol extends EvaluatorBase {

    constructor(actorBias) {
        super(actorBias);
        this.type = 'Patrol';
        this.coords = [[2, 2], [40, 10], [20, 20]];
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
        const goal = new Goal.Patrol(actor, coords);
        topGoal.addGoal(goal);
    }

    setArgs(args) {
        this.coords = args.coords;
    }

    toJSON() {
        const json = super.toJSON();
        json.args = {
            coords: this.coords
        };
        return json;
    }
}
Evaluator.Patrol = EvaluatorPatrol;

/* Evaluator to check if actor should flee from a fight. */
class EvaluatorGuard extends EvaluatorBase {

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
    }

    toJSON() {
        const json = super.toJSON();
        json.args = {xy: [this.x, this.y]};
        return json;
    }
}
Evaluator.Guard = EvaluatorGuard;

/* Evaluator to check if actor should flee from a fight. */
class EvaluatorOrders extends EvaluatorBase {

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

/* Calculates the desirability to cast a certain spell. */
class EvaluatorCastSpell extends EvaluatorBase {

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
            if (actor.get('SpellPower').getPP() >= this.spell.getPower()) {
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
        if (enemyCell) {
            const enemy = enemyCell.getActors()[0];
            const args = {enemy, actor, actorCellsAround};
            if (this.spell.aiShouldCastSpell) {
                return this.spell.aiShouldCastSpell(args, (actor, args) => {
                    this.spellArgs = args;
                });
            }
            else {
                RG.warn('Evaluator.CastSpell', 'shouldCastSpell',
                    `Spell ${this.spell.getName()} cannot be casty by AI`);
            }
        }
        return false;
    }

}
Evaluator.CastSpell = EvaluatorCastSpell;

module.exports = Evaluator;

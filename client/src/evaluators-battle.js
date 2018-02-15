
/* Evaluators used in the battle-specific goals. */

const GoalsBattle = require('./goals-battle');
const Evaluator = require('./evaluators');

const EvaluatorsBattle = {};

//---------------------------------------------------------------------------
// BATTLE EVALUATORS
//---------------------------------------------------------------------------

/* Evaluator for taking on command goal. */
class EvaluatorWinBattle extends Evaluator.Base {

    constructor(actorBias) {
        super(actorBias);
    }

    calculateDesirability(actor) {
        if (actor.has('InBattle')) {
            // can see an army?
            // required to adjust previous command or not
            return this.actorBias;
        }
        return Evaluator.NOT_POSSIBLE;
    }

    setActorGoal(actor) {
        const topGoal = actor.getBrain().getGoal();
        const goal = new GoalsBattle.WinBattle(actor);
        topGoal.addGoal(goal);
    }
}
EvaluatorsBattle.WinBattle = EvaluatorWinBattle;

/* Evaluator for retreating from battle command. */
class EvaluatorRetreat extends Evaluator.Base {

    constructor(actorBias) {
        super(actorBias);
        this.cooldown = 5;
    }

    calculateDesirability() {
        if (this.cooldown === 0) {
            // can see an army?
            // required to adjust previous command or not
            return this.actorBias;
        }
        else {
            --this.cooldown;
        }
        return 0;
    }

    setActorGoal(actor) {
        const topGoal = actor.getBrain().getGoal();
        const goal = new GoalsBattle.Retreat(actor);
        topGoal.addGoal(goal);
    }
}
EvaluatorsBattle.Retreat = EvaluatorRetreat;

module.exports = EvaluatorsBattle;

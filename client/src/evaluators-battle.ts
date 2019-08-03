
/* Evaluators used in the battle-specific goals. */

import {GoalsBattle} from './goals-battle';
import {Evaluator, EvaluatorBase} from './evaluators';

export const EvaluatorsBattle: any = {};

//---------------------------------------------------------------------------
// BATTLE EVALUATORS
//---------------------------------------------------------------------------

/* Evaluator for taking on command goal. */
export class EvaluatorWinBattle extends EvaluatorBase {

    constructor(actorBias) {
        super(actorBias);
        this.type = 'WinBattle';
    }

    public calculateDesirability(actor) {
        if (actor.has('InBattle')) {
            // can see an army?
            // required to adjust previous command or not
            return this.actorBias;
        }
        return Evaluator.NOT_POSSIBLE;
    }

    public setActorGoal(actor) {
        const topGoal = actor.getBrain().getGoal();
        const goal = new GoalsBattle.WinBattle(actor);
        topGoal.addGoal(goal);
    }
}
EvaluatorsBattle.WinBattle = EvaluatorWinBattle;

/* Evaluator for retreating from battle command. */
export class EvaluatorRetreat extends EvaluatorBase {

    public cooldown: number;

    constructor(actorBias) {
        super(actorBias);
        this.cooldown = 5;
        this.type = 'Retreat';
    }

    public calculateDesirability() {
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

    public setActorGoal(actor) {
        const topGoal = actor.getBrain().getGoal();
        const goal = new GoalsBattle.Retreat(actor);
        topGoal.addGoal(goal);
    }
}
EvaluatorsBattle.Retreat = EvaluatorRetreat;

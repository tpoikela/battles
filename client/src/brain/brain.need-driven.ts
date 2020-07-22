

import * as GoalsTop from '../goals-top';
import {
    BrainSentient,
    ACTION_ALREADY_DONE
} from './brain';
import {NeedsHierarchy} from '../needs-hierarchy';
import {Evaluator} from '../evaluators';

type ActionCallback = import('../time').ActionCallback;

export class BrainNeedDriven extends BrainSentient {
    protected goal: GoalsTop.GoalTop;
    protected needs: NeedsHierarchy;
    protected needUpdatePeriod: number;


    constructor(actor) {
        super(actor);
        this.setType('NeedDriven');
        this.goal = new GoalsTop.ThinkBasic(actor);
        this.needs = new NeedsHierarchy(actor);

        // For pure need-driven, no evaluators are added
        this.goal.removeEvaluators();
        this.goal.addEvaluator(new Evaluator.AttackActor(1.0));
        this.goal.addEvaluator(new Evaluator.Explore(0.75));
        this.needUpdatePeriod = 0;
    }

    /* Must return function. */
    public decideNextAction(): ActionCallback | null {
        this._cache.seen = null;
        if (this.needUpdatePeriod === 0) {
            this.needs.process(this.goal);
            this.needUpdatePeriod = 10;
        }
        else {
            this.needUpdatePeriod -= 1;
        }
        this.goal.process();
        this._cache.seen = null;
        return ACTION_ALREADY_DONE;
    }

    public getGoal(): GoalsTop.GoalTop {return this.goal;}
    public setGoal(goal) {this.goal = goal;}

    public toJSON() {
        const json: any = super.toJSON();
        json.goal = this.goal.toJSON();
        return json;
    }
}

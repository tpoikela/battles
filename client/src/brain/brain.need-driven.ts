

import * as GoalsTop from '../goals-top';
import {
    BrainSentient,
    ACTION_ALREADY_DONE
} from './brain';
import {NeedsHierarchy} from '../needs-hierarchy';

type ActionCallback = import('../time').ActionCallback;

export class BrainNeedDriven extends BrainSentient {
    protected goal: GoalsTop.GoalTop;
    protected needs: NeedsHierarchy;

    constructor(actor) {
        super(actor);
        this.setType('NeedDriven');
        this.goal = new GoalsTop.ThinkBasic(actor);
        this.needs = new NeedsHierarchy(actor);
    }

    /* Must return function. */
    public decideNextAction(): ActionCallback | null {
        this._cache.seen = null;
        this.needs.process();
        this.goal.process();
        this._cache.seen = null;
        return ACTION_ALREADY_DONE;
    }
}

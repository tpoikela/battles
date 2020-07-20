
import {Goal, GoalBase, GoalStatus} from './goals';
import {Random} from './random';

type SentientActor = import('./actor').SentientActor;

const {
    GOAL_ACTIVE,
    GOAL_COMPLETED} = GoalStatus;
const RNG = Random.getRNG();


/* This goal can be used as a treasure hunter for the actors. */
export class GoalTreasureHunter extends GoalBase {

    constructor(actor: SentientActor) {
        super(actor);
        this.setType('GoalTreasureHunter');
        this.subGoals = [];
    }


    public activate(): void {
        this.status = GOAL_ACTIVE;
    }


    public process(): GoalStatus {
    }

}
Goal.TreasureHunter = GoalTreasureHunter;

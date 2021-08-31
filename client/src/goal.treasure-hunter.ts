
import {Goal, GoalBase, GoalStatus} from './goals';
import {Random} from './random';

import {IConstraint} from './interfaces';

type SentientActor = import('./actor').SentientActor;
type Cell = import('./map.cell').Cell;

const {
    GOAL_ACTIVE,
    GOAL_COMPLETED} = GoalStatus;
const RNG = Random.getRNG();


/* This goal can be used as a treasure hunter for the actors. */
export class GoalTreasureHunter extends GoalBase {

    protected treasure: any;
    protected constraint: IConstraint;

    constructor(actor: SentientActor) {
        super(actor);
        this.setType('GoalTreasureHunter');
        this.subGoals = [];
        this.treasure = null;
        this.constraint = {op: '>=', func: 'getValue', value: 0};
    }

    public setConstraint(constraint: IConstraint): void {
        this.constraint = constraint;
    }

    public setTreasure(treasure: any): void {
        this.treasure = treasure;
    }


    public activate(): void {
        this.status = GOAL_ACTIVE;
        this.chooseHunterTask();
    }


    public process(): GoalStatus {
        this.activateIfInactive();
        if (this.isCompleted()) {
            return GOAL_COMPLETED;
        }

        if (this.hasSubGoals()) {
            this.status = this.processSubGoals();
        }
        else {
            this.chooseHunterTask();
            if (this.hasSubGoals()) {
                this.status = this.processSubGoals();
            }
        }
        return this.status;
    }

    protected chooseHunterTask(): void {
        let nextGoal = null;
        let exitGoal = null;

        // We know where the treasure is
        if (this.hasTreasure()) {
            // Flee the zone
            exitGoal = this.checkForZoneExit();
        }
        else if (this.treasure) {
            // We know where treasure is, go there
            nextGoal = new Goal.GetItem(this.actor, this.treasure);
        }
        else {
            // Explore around, and choose treasure if matches constraint
            nextGoal = new Goal.FindItem(this.actor, this.constraint,
                this.setTreasure.bind(this));
        }
        if (nextGoal) {
            if (!exitGoal) {
                exitGoal = this.checkForZoneExit();
            }
            if (exitGoal) {
                this.addSubGoal(exitGoal);
            }
            this.addSubGoal(nextGoal);
        }
    }

    protected hasTreasure(): boolean {
        if (!this.treasure) {
            return false;
        }

        const tresName = this.treasure.getName();
        if (this.actor.getInvEq().hasItemNamed(tresName)) {
            return true;
        }
        return false;
    }

    protected checkForZoneExit(): any {
        if (this.knowsZoneExit()) {
            const cell = this.getExitCell();
            if (cell) {
                return new Goal.ChangeLevel(this.actor, cell.getXY());
            }
        }
        else {
            // Explore to find the exit
        }
        return null;
    }

    protected knowsZoneExit(): boolean {
        return true;
    }

    protected getExitCell(): Cell | null {
        const level = this.actor.getLevel();
        const elems = level.getElements();
        const stairs = elems.find(e => e.getType() === 'connection');
        if (stairs) {
            return level.getMap().getCell(stairs.getX(), stairs.getY());
        }
        return null;
    }

}
Goal.TreasureHunter = GoalTreasureHunter;

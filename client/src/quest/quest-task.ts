
import RG from '../rg';

/* A task represents a part of a quest. */
export class Task {

    public stepType: string;
    public name: string;
    public taskType: string;

    constructor(taskType: string) {
        this.stepType = 'Task';
        this.name = '';
        this.taskType = taskType;
    }

    public isTask(): this is Task {return true;}
    public isQuest(): this is Quest {return false;}

    public getName(): string {
        return this.name;
    }

    public getTaskType(): string {
        return this.taskType;
    }
}

export type QuestStep = Task | Quest;

/* A quest object which can be used to model quests. */
export class Quest {
    public name: string;
    public steps: QuestStep[]; // Atomics/sub-quests
    public stepType: string;
    public motive: string;
    public terms: any[];

    constructor(name: string, tasks?: any[]) { // TODO fix typings
        if (name && typeof name !== 'string') {
            RG.err('Quest', 'new', 'Quest must have a name!');
        }
        this.name = name;
        this.steps = []; // Atomics/sub-quests
        this.stepType = 'Quest';
        this.motive = '';
        this.terms = [];

        if (Array.isArray(tasks)) {
            tasks.forEach(taskType => {
                if (taskType.isQuest) {
                    this.addStep(taskType);
                }
                else if (taskType.isTask) {
                    this.addStep(taskType);
                }
                else {
                    const task = new Task(taskType);
                    this.addStep(task);
                }
            });
        }
    }

    public setName(name: string): void {this.name = name;}
    public getName(): string {return this.name;}
    public setMotive(motive: string): void {this.motive = motive;}
    public getMotive(): string {return this.motive;}
    public isTask(): this is Task {return false;}
    public isQuest(): this is Quest {return true;}

    public addTerm(term): void {
        this.terms.push(term);
    }

    public getTasks(): Task[] {
        const result = this.steps.filter(step => step.isTask());
        return result as Task[];
    }

    public addStep(step: QuestStep): void {
        if (Array.isArray(step)) {
            this.steps = this.steps.concat(step);
        }
        else {
            this.steps.push(step);
        }
    }

    public numQuests(): number {
        let sum = 1;
        this.steps.forEach(step => {
            if (step.isQuest && step.isQuest()) {
                sum += 1;
            }
        });
        return sum;
    }

    /* Returns the number of immediate tasks. */
    public numTasks(): number {
        const numSubquests = this.numQuests() - 1;
        return this.steps.length - numSubquests;
    }

    public getSteps(): QuestStep[] {
        return this.steps.slice();
    }

    public numSteps(): number {
        return this.steps.length;
    }
}

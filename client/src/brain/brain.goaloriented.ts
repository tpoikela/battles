
import RG from '../rg';
import * as GoalsTop from '../goals-top';
import {
    BrainSentient,
    ACTION_ALREADY_DONE
} from './brain';
import {Evaluator, EvaluatorCastSpell} from '../evaluators';
import * as Component from '../component/component';
import {Random} from '../random';

type ActionCallback = import('../time').ActionCallback;

const RNG = Random.getRNG();

const Brain: any = {};

/* Brain object for testing goal-based actors. */
export class BrainGoalOriented extends BrainSentient {
    protected goal: GoalsTop.GoalTop;

    constructor(actor) {
        super(actor);
        this.setType('GoalOriented');
        this.goal = new GoalsTop.ThinkBasic(actor);
    }

    public getGoal(): GoalsTop.GoalTop {return this.goal;}
    public setGoal(goal) {this.goal = goal;}

    /* Must return function. */
    public decideNextAction(): ActionCallback | null {
        this._cache.seen = null;
        this.goal.process();
        this._cache.seen = null;
        return ACTION_ALREADY_DONE;
    }

    public toJSON() {
        const json: any = super.toJSON();
        json.goal = this.goal.toJSON();
        return json;
    }
}
Brain.GoalOriented = BrainGoalOriented;

/* Brain object for spellcasting actors. This model focuses on aggressive
 * spellcasting intended to harm opponents. */
export class BrainSpellCaster extends BrainGoalOriented {
    constructor(actor) {
        super(actor);
        this.setType('SpellCaster');
        this.goal = new GoalsTop.ThinkSpellcaster(actor);
        this.goal.setBias({CastSpell: 2.0, AttackActor: 0.7});
        const spellEval = this.goal.getEvaluator('CastSpell') as EvaluatorCastSpell;
        spellEval.setCastingProbability(0.8);
    }
}
Brain.SpellCaster = BrainSpellCaster;

export class BrainExplorer extends BrainGoalOriented {
    constructor(actor) {
        super(actor);
        this.setType('Explorer');
        this.goal.removeEvaluators();
        this.goal.addEvaluator(new Evaluator.Explore());
    }
}
Brain.Explorer = BrainExplorer;

export class BrainSpirit extends BrainGoalOriented {
    constructor(actor) {
        super(actor);
        this.setType('Spirit');
        this.goal.removeEvaluators();
        this.goal.addEvaluator(new Evaluator.Explore());
    }
}
Brain.Spirit = BrainSpirit;

export class BrainThief extends BrainGoalOriented {
    constructor(actor) {
        super(actor);
        this.setType('Thief');
        this.goal.addEvaluator(new Evaluator.Thief(1.2));
        this.goal.setBias({Thief: 1.2, AttackActor: 0.7});
    }
}
Brain.Thief = BrainThief;

/* Brain-object for animals. */
export class BrainAnimal extends BrainGoalOriented {
    constructor(actor) {
        super(actor);
        this.setType('Animal');
        // this.goal = new GoalsTop.ThinkBasic(actor);
        this._memory.addEnemyType('player');
        this._memory.addEnemyType('human');
        // Already in base class
        // this.getGoal = () => this.goal;
        // this.setGoal = goal => {this.goal = goal;};
    }
}
Brain.Animal = BrainAnimal;

/* Brain object for testing goal-based actors. */
export class BrainCommander extends BrainGoalOriented {
    constructor(actor) {
        super(actor);
        this.setType('Commander');
        this.goal = new GoalsTop.ThinkCommander(actor);
    }

    /* Must return function. */
    public decideNextAction(): ActionCallback | null {
        this._cache.seen = null;
        this.goal.process();
        this._cache.seen = null;
        return ACTION_ALREADY_DONE;
    }
}
Brain.Commander = BrainCommander;

/* Simple brain used by the non-moving flame elements. They emit damage
 * components in the cells they are located in. */
export class BrainFlame extends BrainSentient {
    constructor(actor) {
        super(actor);
        this.setType('Flame');
    }

    public decideNextAction(): ActionCallback | null {
        const cell = this._actor.getCell();
        const actors = cell.getActors();
        actors.forEach(actor => {
            const damaging = this.getActor().get('Damaging');
            if (damaging) {
                const flameComp = new Component.Flame();
                flameComp.setSource(this._actor);
                flameComp.setDamageType(damaging.getDamageType());
                actor.add(flameComp);
            }
        });
        return ACTION_ALREADY_DONE;
    }
}
Brain.Flame = BrainFlame;

/* Brain for non-sentient clouds. Same as Flame, except moves first
 * randomly and then emits the damage. */
export class BrainCloud extends BrainFlame {
    public chanceToMove: number;

    constructor(actor) {
        super(actor);
        this.setType('Cloud');
        this.chanceToMove = 0.2;
    }

    public decideNextAction(): ActionCallback | null {
        if (RNG.getUniform() <= this.chanceToMove) {
            const dir = RNG.getRandDir();
            const [newX, newY] = RG.newXYFromDir(dir, this._actor);
            const level = this._actor.getLevel();
            const map = level.getMap();
            if (map.hasXY(newX, newY)) {
                const movComp = new Component.Movement(newX, newY, level);
                this._actor.add(movComp);
            }
        }
        return super.decideNextAction.call(this);
    }
}
Brain.Cloud = BrainCloud;

/* This brain switched for player-controlled actors when MindControl
 * is cast on them. It acts as "paralysis" at the moment. */
export class BrainMindControl extends BrainGoalOriented {
    constructor(actor) {
        super(actor);
        this.setType('MindControl');
        this.goal = new GoalsTop.ThinkBasic(actor);

        this.getGoal = () => this.goal;
        this.setGoal = goal => {this.goal = goal;};
    }

    public decideNextAction(): ActionCallback | null {
        // At the moment does nothing, it could attack the
        // enemies of the source of MindControl
        return ACTION_ALREADY_DONE;
    }
}
Brain.MindControl = BrainMindControl;

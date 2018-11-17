
/* This file contains Brain objects for virtual actors such as spawners. */

import RG from './rg';
import {Constraints} from './constraints';
import {BrainBase} from './brain';
import {Constraint} from './interfaces';
import { ObjectShell } from './objectshellparser';

const spawnProb = 0.10;

/* Brains for virtual actors such as spawners. */
export class BrainVirtual extends BrainBase {

    constructor(actor) {
        super(actor);
        this.setType('Virtual');
    }
}

/* Brain object used by Spawner virtual actors. */
export class BrainSpawner extends BrainVirtual {

    public constraint: Constraint;
    protected _constraintFunc: (shell) => boolean;

    constructor(actor) {
        super(actor);
        this.setType('Spawner');
        this.constraint = null;
        this._constraintFunc = null;
    }


    public setConstraint(constraint: Constraint) {
        this.constraint = constraint;
        this._constraintFunc = new Constraints().getConstraints(constraint);
    }

    /* Spawns an actor to the current level (if any). */
    public decideNextAction(): () => void {
        if (RG.isSuccess(spawnProb)) {
            return () => {
                const level = this.getActor().getLevel();
                const freeCell = level.getFreeRandCell();
                const [x, y] = [freeCell.getX(), freeCell.getY()];

                const parser = ObjectShell.getParser();
                const newActor = parser.createRandomActor(
                    {func: this._constraintFunc});
                if (newActor) {
                    level.addActor(newActor, x, y);
                    RG.gameMsg(`You feel danger at ${x}, ${y}`);
                }
            };
        }
        return () => {};
    }

    public toJSON() {
        return {
            type: this.getType(),
            constraint: this.constraint
        };
    }

}

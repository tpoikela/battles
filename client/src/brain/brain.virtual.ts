
/* This file contains Brain objects for virtual actors such as spawners. */

import RG from '../rg';
import {Constraints} from '../constraints';
import {BrainBase} from './brain.base';
import {IConstraint, TConstraintArg} from '../interfaces';
import {ObjectShell} from '../objectshellparser';
import {Random} from '../random';

type Cell = import('../map.cell').Cell;

const spawnProb = 0.10;
const RNG = Random.getRNG();
const NO_ACTION = (): void => {};

/* Brains for virtual actors such as spawners. */
export class BrainVirtual extends BrainBase {

    constructor(actor) {
        super(actor);
        this.setType('Virtual');
    }
}

/* Brain object used by Spawner virtual actors. */
export class BrainSpawner extends BrainVirtual {

    public constraint: IConstraint[];
    public placeConstraint: IConstraint[];
    public spawnProb: number;
    protected _constraintFunc: (shell) => boolean;
    protected _placeConstraintFunc: (Cell) => boolean;

    constructor(actor) {
        super(actor);
        this.setType('Spawner');
        this.constraint = null;
        this._constraintFunc = null;
        this.placeConstraint = null;
        this._placeConstraintFunc = null;
        this.spawnProb = spawnProb;
    }

    public setConstraint(constraint: TConstraintArg) {
        if (Array.isArray(constraint)) {
            this.constraint = constraint;
        }
        else {
            this.constraint = [constraint];
        }
        this._constraintFunc = new Constraints().getConstraints(constraint);
    }

    public setPlaceConstraint(constraint: TConstraintArg) {
        if (Array.isArray(constraint)) {
            this.placeConstraint = constraint;
        }
        else {
            this.placeConstraint = [constraint];
        }
        this._placeConstraintFunc = new Constraints().getConstraints(constraint);
    }

    /* Spawns an actor to the current level (if any). */
    public decideNextAction(): () => void {
        if (RG.isSuccess(this.spawnProb)) {
            return (): void => {
                const level = this.getActor().getLevel();
                let freeCell = null;

                if (this.placeConstraint) {
                    let watchdog = 100;
                    const freeCells = level.getMap().getFree();
                    freeCell = RNG.arrayGetRand(freeCells);
                    while (!this._placeConstraintFunc(freeCell)) {
                        freeCell = RNG.arrayGetRand(freeCells);
                        if (--watchdog === 0) {break;}
                    }
                }
                else {
                    freeCell = level.getFreeRandCell();
                }

                const [x, y] = [freeCell.getX(), freeCell.getY()];
                const parser = ObjectShell.getParser();
                const newActor = parser.createRandomActor(
                    {func: this._constraintFunc});
                if (newActor) {
                    level.addActor(newActor, x, y);
                    const name = newActor.getName();
                    RG.gameMsg(`You feel danger at ${x}, ${y} from ${name}`);
                }
            };
        }
        return NO_ACTION;
    }

    public toJSON() {
        const obj: any = {
            type: this.getType(),
            constraint: this.constraint,
            spawnProb: this.spawnProb
        };
        if (this.placeConstraint) {
            obj.placeConstraint = this.placeConstraint;
        }
        return obj;
    }

}

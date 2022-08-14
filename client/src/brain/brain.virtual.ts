
/* This file contains Brain objects for virtual actors such as spawners. Virtual
 * actors don't have Location component, and thus are not placed into maps. They
 * still use Brain (and possibly Goal/Evalutor) and scheduling based on their
 * speed. */

import RG from '../rg';
import {Constraints} from '../constraints';
import {BrainBase} from './brain.base';
import {IConstraint, TConstraintArg} from '../interfaces';
import {ObjectShell} from '../objectshellparser';
import {Random} from '../random';

type Cell = import('../map.cell').Cell;
type BaseActor = import('../actor').BaseActor;

const spawnProb = 0.05;
const RNG = Random.getRNG();
const NO_ACTION = (): void => {};

/* Brains for virtual actors such as spawners. */
export class BrainVirtual extends BrainBase {

    constructor(actor: BaseActor) {
        super(actor);
        this.setType('Virtual');
    }
}

/* Brain object used by Spawner virtual actors. */
export class BrainSpawner extends BrainVirtual {

    public spawnProb: number;
    public spawnLeft: number;
    protected placeConstraint: IConstraint[];
    protected constraint: IConstraint[];
    protected _constraintFunc: (shell) => boolean;
    protected _placeConstraintFunc: (c: Cell) => boolean;

    constructor(actor: BaseActor) {
        super(actor);
        this.setType('Spawner');
        this.constraint = null;
        this._constraintFunc = null;
        this.placeConstraint = null;
        this._placeConstraintFunc = null;
        this.spawnProb = spawnProb;
        this.spawnLeft = 100;
    }

    public setConstraint(constraint: TConstraintArg): void {
        if (Array.isArray(constraint)) {
            this.constraint = constraint;
        }
        else {
            this.constraint = [constraint];
        }
        this._constraintFunc = new Constraints().getConstraints(constraint);
    }

    public setPlaceConstraint(constraint: TConstraintArg): void {
        const factConstr = new Constraints('or');
        if (Array.isArray(constraint)) {
            this.placeConstraint = constraint;
        }
        else {
            this.placeConstraint = [constraint];
        }
        this._placeConstraintFunc = factConstr.getConstraints(constraint);
        this.placeConstraint.forEach(pc => {
            if (pc.prop === 'danger') {
                RG.err('BrainSpawner', 'setPlaceConstraint',
                    `danger not supported in place. ${JSON.stringify(pc)}`);
            }
        });
    }

    /* Spawns an actor to the current level (if any). */
    public decideNextAction(): () => void {
        if (this.spawnLeft !== 0 && RG.isSuccess(this.spawnProb)) {
            return (): void => {
                const level = this.getActor().getLevel();
                let freeCell: null | Cell = null;

                if (this.placeConstraint) {
                    //rm let watchdog = 100;
                    const freeCells: Cell[] = level.getMap().getFree();
                    const filtered: Cell[] = freeCells.filter(c => this._placeConstraintFunc(c));
                    if (filtered.length > 0) {
                        freeCell = RNG.arrayGetRand(filtered);
                    }
                    else {
                        const json = JSON.stringify(this.placeConstraint);
                        RG.warn('BrainSpawner', 'decideNextAction',
                            `No cell found for constr ${json}`);
                    }
                }
                else {
                    freeCell = level.getFreeRandCell();
                }

                if (freeCell) {
                    const [x, y] = freeCell.getXY();
                    const parser = ObjectShell.getParser();
                    const newActor = parser.createRandomActor(
                        {func: this._constraintFunc});
                    if (newActor) {
                        if (level.addActor(newActor, x, y)) {
                            --this.spawnLeft;
                            this.emitSpawnMsg(newActor);
                        }
                    }
                    else {
                        const json = JSON.stringify(this.constraint);
                        RG.err('BrainSpawner', 'decideNextAction',
                            `No actor found for constr ${json}`);
                    }
                }
            };
        }
        return NO_ACTION;
    }

    public emitSpawnMsg(newActor: BaseActor): void {
        const level = newActor.getLevel();
        const cell = newActor.getCell();
        const cardDir = RG.getCardinalDirection(level, cell);
        const msg = `${newActor.getName()} appears from path coming from ${cardDir}`;
        RG.gameMsg({cell, msg});
    }

    public toJSON() {
        const obj: any = {
            type: this.getType(),
            constraint: this.constraint,
            spawnProb: this.spawnProb,
            spawnLeft: this.spawnLeft
        };
        if (this.placeConstraint) {
            obj.placeConstraint = this.placeConstraint;
        }
        return obj;
    }

}

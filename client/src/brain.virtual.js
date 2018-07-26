
/* This file contains Brain objects for virtual actors such as spawners. */

import Constraints from './constraints';

const RG = require('./rg');
RG.Brain = require('./brain');

const spawnProb = 0.10;

/* Brains for virtual actors such as spawners. */
RG.Brain.Virtual = function(actor) {
    RG.Brain.Base.call(this, actor);
    this.setType('Virtual');
};
RG.extend2(RG.Brain.Virtual, RG.Brain.Base);

/* Brain object used by Spawner virtual actors. */
RG.Brain.Spawner = function(actor) {
    RG.Brain.Virtual.call(this, actor);
    this.setType('Spawner');

    this.constraint = null;
    this._constraintFunc = null;

    this.setConstraint = constraint => {
        this.constraint = constraint;
        this._constraintFunc = new Constraints().getConstraints(constraint);
    };

    /* Spawns an actor to the current level (if any). */
    this.decideNextAction = function() {
        if (RG.isSuccess(spawnProb)) {
            return () => {
                const level = this.getActor().getLevel();
                const freeCell = level.getFreeRandCell();
                const [x, y] = [freeCell.getX(), freeCell.getY()];

                const parser = RG.ObjectShell.getParser();
                const newActor = parser.createRandomActor(
                    {func: this._constraintFunc});
                if (newActor) {
                    level.addActor(newActor, x, y);
                    RG.gameMsg(`You feel danger at ${x}, ${y}`);
                }
            };
        }
        return () => {};
    };

    this.toJSON = function() {
        return {
            type: this.getType(),
            constraint: this.constraint
        };
    };

};
RG.extend2(RG.Brain.Spawner, RG.Brain.Virtual);

module.exports = RG.Brain;


import RG from '../rg';
import {SystemBase} from './system.base';
import {Geometry} from '../geometry';
import {Level} from '../level';
import * as Component from '../component/component';

type Cell = import('../map.cell').Cell;
type SentientActor = import('../actor').SentientActor;

interface EventArgs {
    type: string;
    cell?: Cell;
    cause?: SentientActor;
}

interface EventComp {
    getArgs(): EventArgs;
}

/* System which handles events such as actorKilled, onPickup etc. This system
 * must be updated after most of the other systems have been processed, up to
 * System.Damage. */
export class SystemEvents extends SystemBase {
    public eventRadius: number;
    public eventRadiusPerID: {[key: number]: number};
    private _dtable: {[key: string]: (ent, evt, actor) => void};

    constructor(compTypes, pool?) {
        super(RG.SYS.EVENTS, compTypes, pool);

        /* Stores event radius per level ID. Can be used to fine-tune/reduce event
         * radius for active levels. */
        this.eventRadiusPerID = {
        };

        // Global radius, if level-specific value not given
        this.eventRadius = 10;

        // Maps event types to handler functions
        this._dtable = {
            [RG.EVT_ACTOR_KILLED]: this._handleActorKilled.bind(this),
            [RG.EVT_ITEM_PICKED_UP]: this._handleItemPickedUp.bind(this),
            [RG.EVT_ACTOR_DAMAGED]: this._handleActorDamaged.bind(this),
            [RG.EVT_ACTOR_ATTACKED]: this._handleActorAttacked.bind(this),
            [RG.EVT_ACTOR_USED_STAIRS]: this._handleActorUsedStairs.bind(this)
        };
    }

    public updateEntity(ent): void {
        const evtList = ent.getList('Event') as EventComp[];
        evtList.forEach((evt: EventComp) => {
            const args = evt.getArgs();
            const {type} = args;

            // Usually cell is entity's current cell, but if args.cell is
            // specified, use that instead (currently true for UseStairs)
            let srcCell = ent.getCell();
            if (args.cell) {
                srcCell = args.cell;
            }

            const radius = this._getEventRadius(ent);
            const [x0, y0] = [srcCell.getX(), srcCell.getY()];
            const cellCoords = Geometry.getBoxAround(x0, y0, radius, true);
            const cells = ent.getLevel().getMap().getCellsWithCoord(cellCoords);

            // Search for entity which could react to this event for each cell
            // Right now, only actors are interested in events
            cells.forEach(cell => {
                const actors = cell.getActors();
                if (actors) {
                    actors.forEach(actor => {
                        if (!actor.isPlayer() && actor.has('Perception')) {
                            const seenCells = actor.getBrain().getSeenCells();
                            const canSee = seenCells.find(c => (
                                c.getX() === x0 && c.getY() === y0
                            ));
                            if (canSee) {
                                // const name = actor.getName();
                                // Call the handler function from dispatch table
                                this._dtable[type](ent, evt, actor);
                            }
                        }
                    });
                }
            });
            ent.remove(evt);
        });
    }

    public addLevel(level: Level, radius: number): void {
        this.eventRadiusPerID[level.getID()] = radius;
    }

    public removeLevel(level: Level): void {
        delete this.eventRadiusPerID[level.getID()];
    }


    /* Returns the radius which is used to calculate the event propagation
     * distance. */
    public _getEventRadius(ent): number {
        const id = ent.getLevel().getID();
        if (this.eventRadiusPerID.hasOwnProperty(id)) {
            return this.eventRadiusPerID[id];
        }
        // No level specific radius given, resort to global radius
        return this.eventRadius;
    }

    public _handleActorKilled(ent, evt: EventComp, actor): void {
        // React to friend/non-hostile being killed
        if (ent.isPlayer()) {
            const args = evt.getArgs();
            const src: SentientActor = args.cause;
            if (src) {
                const name = actor.getName();
                const victim = ent.getName();
                const msg = `${name} saw ${src.getName()} killing ${victim}`;
                RG.gameMsg({cell: ent.getCell, msg});
            }
        }
    }

    public _handleItemPickedUp(ent, evt: EventComp, actor): void {
        if (actor.getID() !== ent.getID()) {
            // If enemies pick up things, it does not matter because they
            // will be killed anyway
            if (!actor.isEnemy(ent)) {
                const cell = ent.getCell();
                const perceiver = actor.getName();
                const acting = ent.getName();
                const msg = `${perceiver} saw ${acting} picking up an item.`;
                RG.gameMsg({msg, cell});
            }
        }
    }

    public _handleActorDamaged(ent, evt: EventComp, actor): void {
        if (ent.getID() !== actor.getID()) {
            const args = evt.getArgs();
            const {cause} = args;
            this._addActorAsEnemy(cause, ent, actor);
        }
    }

    public _handleActorAttacked(ent, evt: EventComp, actor): void {
        if (ent.getID() !== actor.getID()) {
            const args = evt.getArgs();
            const {cause} = args;
            this._addActorAsEnemy(cause, ent, actor);
        }
    }

    public _handleActorUsedStairs(ent, evt: EventComp, actor): void {
        RG.gameMsg(`${actor.getName()} saw ${ent.getName()} using stairs.`);
    }

    /* Decides if attacker must be added as enemy of the perceiving actor. */
    public _addActorAsEnemy(
        aggressor: SentientActor,
        victim: SentientActor,
        perceiver: SentientActor
    ): void {
        // If self-inflicted damage, ignore it. Most actors are not
        // against self-mutilation
        if (aggressor.getID() === victim.getID()) {
            return;
        }

        if (victim.getType() === perceiver.getType()) {
            if (!perceiver.isEnemy(victim) && !victim.isEnemy(perceiver)) {
                if (perceiver.isFriend(aggressor)) {
                    this._emitMsg('seems to dislike action', aggressor, victim,
                        perceiver);
                    perceiver.getBrain().getMemory().removeFriend(aggressor);
                }
                else {
                    this._emitMsg('shows hatred against action', aggressor,
                        victim, perceiver);
                    perceiver.addEnemy(aggressor);
                }
            }
        }
        else if (perceiver.isFriend(victim)) {
            this._emitMsg('shows hatred against action', aggressor, victim,
                perceiver);
            perceiver.addEnemy(aggressor);
        }
    }

    public _emitMsg(msg, aggr, victim, perc): void {
        const aggrName = aggr.getName();
        const cell = victim.getCell();
        let fullMsg = `${perc.getName()} ${msg} of ${aggrName} `;
        fullMsg += ` towards ${victim.getName()}`;
        RG.gameMsg({cell, msg: fullMsg});
    }

}

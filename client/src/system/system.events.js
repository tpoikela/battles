
const RG = require('../rg');

const System = {};
System.Base = require('./system.base');
/* System which handles events such as actorKilled, onPickup etc. This system
 * must be updated after most of the other systems have been processed, up to
 * System.Damage. */
System.Events = function(compTypes) {
    System.Base.call(this, RG.SYS.EVENTS, compTypes);

    /* Stores event radius per level ID. Can be used to fine-tune/reduce event
     * radius for active levels. */
    this.eventRadiusPerID = {
    };

    // Global radius, if level-specific value not given
    this.eventRadius = 10;

    this.addLevel = (level, radius) => {
        this.eventRadiusPerID[level.getID()] = radius;
    };

    this.removeLevel = level => {
        delete this.eventRadiusPerID[level.getID()];
    };

    this.updateEntity = function(ent) {
        const evtList = ent.getList('Event');
        evtList.forEach(evt => {
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
            const cellCoords = RG.Geometry.getBoxAround(x0, y0, radius, true);
            const cells = ent.getLevel().getMap().getCellsWithCoord(cellCoords);

            // Search for entity which could react to this event for each cell
            // Right now, only actors are interested in events
            cells.forEach(cell => {
                const actors = cell.getActors();
                if (actors) {
                    actors.forEach(actor => {
                        if (!actor.isPlayer() && actor.has('Perception')) {
                            const seenCells = actor.getBrain().getSeenCells();
                            const canSee = seenCells.find(cell => (
                                cell.getX() === x0 && cell.getY() === y0
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
    };

    /* Returns the radius which is used to calculate the event propagation
     * distance. */
    this._getEventRadius = function(ent) {
        const id = ent.getLevel().getID();
        if (this.eventRadiusPerID.hasOwnProperty(id)) {
            return this.eventRadiusPerID[id];
        }
        // No level specific radius given, resort to global radius
        return this.eventRadius;
    };

    this._handleActorKilled = (ent, evt, actor) => {
        // React to friend/non-hostile being killed
        if (ent.isPlayer()) {
            const src = evt.cause;
            if (src) {
                const name = actor.getName();
                const victim = ent.getName();
                const msg = `${name} saw ${src.getName()} killing ${victim}`;
                RG.gameMsg({cell: ent.getCell, msg});
            }
        }
    };

    this._handleItemPickedUp = (ent, evt, actor) => {
        if (!actor.isEnemy(ent)) {
            const cell = ent.getCell();
            const perceiver = actor.getName();
            const acting = ent.getName();
            const msg = `${perceiver} saw ${acting} picking up an item.`;
            RG.gameMsg({msg, cell});
        }
    };

    this._handleActorDamaged = (ent, evt, actor) => {
        if (ent.getID() !== actor.getID()) {
            const args = evt.getArgs();
            const {cause} = args;
            this._addActorAsEnemy(cause, ent, actor);
        }
    };

    this._handleActorAttacked = (ent, evt, actor) => {
        if (ent.getID() !== actor.getID()) {
            const args = evt.getArgs();
            const {cause} = args;
            this._addActorAsEnemy(cause, ent, actor);
        }
    };

    this._handleActorUsedStairs = (ent, evt, actor) => {
        RG.gameMsg(`${actor.getName()} saw ${ent.getName()} using stairs.`);
    };

    // Maps event types to handler functions
    this._dtable = {
        [RG.EVT_ACTOR_KILLED]: this._handleActorKilled,
        [RG.EVT_ITEM_PICKED_UP]: this._handleItemPickedUp,
        [RG.EVT_ACTOR_DAMAGED]: this._handleActorDamaged,
        [RG.EVT_ACTOR_ATTACKED]: this._handleActorAttacked,
        [RG.EVT_ACTOR_USED_STAIRS]: this._handleActorUsedStairs
        // ACTOR_KILLED: this._handleActorKilled.bind(this)
    };

    /* Decides if attacker must be added as enemy of the perceiving actor. */
    this._addActorAsEnemy = (aggressor, victim, perceiver) => {
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
    };

    this._emitMsg = (msg, aggr, victim, perc) => {
        const aggrName = aggr.getName();
        const cell = victim.getCell();
        let fullMsg = `${perc.getName()} ${msg} of ${aggrName} `;
        fullMsg += ` towards ${victim.getName()}`;
        RG.gameMsg({cell, msg: fullMsg});
    };

};
RG.extend2(System.Events, System.Base);

module.exports = System.Events;

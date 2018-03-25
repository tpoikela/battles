
const ROT = require('../../lib/rot.js');
const RG = require('./rg.js');

RG.Time = {};

/* Models an action. Each action has a duration and a callback.  */
RG.Time.Action = function(dur, cb, obj) {

    this._duration = dur;
    this._cb = cb; // Action callback
    this._energy = 0;
    this._obj = obj;

};

RG.Time.Action.prototype.setEnergy = function(en) {this._energy = en;};
RG.Time.Action.prototype.getEnergy = function() {return this._energy;};
RG.Time.Action.prototype.getDuration = function() {return this._duration;};
RG.Time.Action.prototype.doAction = function() {
    this._cb(this._obj);
};

//---------------------------------------------------------------------------
// GAME EVENTS
//---------------------------------------------------------------------------

/* Event is something that is scheduled and takes place but it's not an actor.
 * An example is regeneration or poison effect.*/
RG.Time.GameEvent = function(dur, cb, repeat, offset) {

    // var _cb = cb;
    let _repeat = repeat;
    // var _nTimes = 1;
    let _offset = offset;

    let _level = null; // Level associated with the event, if null, global

    this.isEvent = true; // Needed for the scheduler

    /* Clunky for events, but must implement for the scheduler.*/
    this.isPlayer = () => false;

    this.nextAction = () => new RG.Time.Action(dur, cb, {});

    this.getRepeat = () => _repeat;
    this.setRepeat = repeat => {_repeat = repeat;};

    this.getOffset = () => _offset;
    this.setOffset = offset => {_offset = offset;};

    this.setLevel = level => {_level = level;};
    this.getLevel = () => _level;

};

/* Regeneration event. Initialized with an actor. */
RG.Time.RegenEvent = function(actor, dur) {
    const _dur = dur; // Duration between events

    const _regenerate = () => {
        actor.get('Health').addHP(1);
    };

    RG.Time.GameEvent.call(this, _dur, _regenerate, true);
};
RG.extend2(RG.Time.RegenEvent, RG.Time.GameEvent);

/* Regeneration power points event. Initialized with an actor. */
RG.Time.RegenPPEvent = function(actor, dur) {
    const _dur = dur; // Duration between events

    const _regeneratePower = () => {
        actor.get('SpellPower').addPP(1);
    };

    RG.Time.GameEvent.call(this, _dur, _regeneratePower, true);
};
RG.extend2(RG.Time.RegenPPEvent, RG.Time.GameEvent);

/* Event that is executed once after an offset.*/
RG.Time.OneShotEvent = function(cb, offset, msg) {

    // Wraps the callback into function and emits a message
    var _cb = () => {
        if (!RG.isNullOrUndef([msg])) {
            RG.gameMsg(msg);
        }
        cb();
    };

    RG.Time.GameEvent.call(this, 0, _cb, false, offset);
};
RG.extend2(RG.Time.OneShotEvent, RG.Time.GameEvent);

/* Scheduler for the game actions. Time-based scheduler where each actor/event
* is scheduled based on speed.  */
RG.Time.Scheduler = function() { // {{{2

    // Internally use ROT scheduler
    this._scheduler = new ROT.Scheduler.Action();
    this._scheduler._defaultDuration = 0;
    this._scheduler._duration = 0;

    // Store the scheduled events
    this._events = [];
    this._actors = [];

    this.hasNotify = true;

    // When an actor is killed, removes it from the scheduler.*/
    RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);

}; // }}} Scheduler

/* Adds an actor or event to the scheduler.*/
RG.Time.Scheduler.prototype.add = function(actOrEvent, repeat, offset) {
    this._scheduler.add(actOrEvent, repeat, offset);
    if (actOrEvent.hasOwnProperty('isEvent')) {
        this._events.push(actOrEvent);
    }
    else {
        this._actors.push(actOrEvent);
    }
};

// Returns next actor/event or null if no next actor exists.
RG.Time.Scheduler.prototype.next = function() {
    return this._scheduler.next();
};

/* Must be called after next() to re-schedule next slot for the
 * actor/event.*/
RG.Time.Scheduler.prototype.setAction = function(action) {
    this._scheduler.setDuration(action.getDuration());
};

/* Tries to remove an actor/event, Return true if success.*/
RG.Time.Scheduler.prototype.remove = function(actOrEvent) {
    if (actOrEvent.hasOwnProperty('isEvent')) {
        return this.removeEvent(actOrEvent);
    }
    else {
        const index = this._actors.indexOf(actOrEvent);
        if (index !== -1) {
            this._actors.splice(index, 1);
        }
    }
    return this._scheduler.remove(actOrEvent);
};

/* Removes an event from the scheduler. Returns true on success.*/
RG.Time.Scheduler.prototype.removeEvent = function(actOrEvent) {
    let index = -1;
    if (actOrEvent.hasOwnProperty('isEvent')) {
        index = this._events.indexOf(actOrEvent);
        if (index !== -1) {
            this._events.splice(index, 1);
        }
    }
    return this._scheduler.remove(actOrEvent);
};

RG.Time.Scheduler.prototype.getTime = function() {
    return this._scheduler.getTime();
};

RG.Time.Scheduler.prototype.notify = function(evtName, args) {
    if (evtName === RG.EVT_ACTOR_KILLED) {
        if (args.hasOwnProperty('actor')) {
            this.remove(args.actor);
        }
    }
};

module.exports = RG.Time;

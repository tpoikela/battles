
import ROT from '../../lib/rot';
import RG from './rg';
import {EventPool} from '../src/eventpool';

const POOL = EventPool.getPool();

export const Time = {};

export type ActionCallback = () => void;

/* Models an action. Each action has a duration and a callback.  */
export class Action {
    private _duration: number;
    private _cb: ActionCallback;
    private _energy: number;

    constructor(dur, cb) {
        this._duration = dur;
        this._cb = cb; // Action callback
        this._energy = 0;
    }

    setEnergy(en) {this._energy = en;};
    getEnergy() {return this._energy;};
    getDuration() {return this._duration;};
    doAction() {this._cb();};
}

//---------------------------------------------------------------------------
// GAME EVENTS
//---------------------------------------------------------------------------

/* Event is something that is scheduled and takes place but it's not an actor.
 * An example is regeneration or poison effect.*/
export const GameEvent = function(dur, cb, repeat, offset) {

    // var _cb = cb;
    let _repeat = repeat;
    // var _nTimes = 1;
    let _offset = offset;

    let _level = null; // Level associated with the event, if null, global

    this.isEvent = true; // Needed for the scheduler

    /* Clunky for events, but must implement for the scheduler.*/
    this.isPlayer = () => false;

    this.nextAction = () => new Action(dur, cb);

    this.getRepeat = () => _repeat;
    this.setRepeat = repeat => {_repeat = repeat;};

    this.getOffset = () => _offset;
    this.setOffset = offset => {_offset = offset;};

    this.setLevel = level => {_level = level;};
    this.getLevel = () => _level;

};

/* Regeneration event. Initialized with an actor. */
export const RegenEvent = function(actor, dur) {
    this._dur = dur; // Duration between events

    const _regenerate = () => {
        actor.get('Health').addHP(1);
    };

    GameEvent.call(this, this._dur, _regenerate, true);
};
RG.extend2(RegenEvent, GameEvent);

/* Regeneration power points event. Initialized with an actor. */
export const RegenPPEvent = function(actor, dur) {
    this._dur = dur; // Duration between events

    const _regeneratePower = () => {
        actor.get('SpellPower').addPP(1);
    };

    GameEvent.call(this, this._dur, _regeneratePower, true);
};
RG.extend2(RegenPPEvent, GameEvent);

/* Event that is executed once after an offset.*/
export const OneShotEvent = function(cb, offset, msg) {

    // Wraps the callback into function and emits a message
    var _cb = () => {
        if (!RG.isNullOrUndef([msg])) {
            RG.gameMsg(msg);
        }
        cb();
    };

    GameEvent.call(this, 0, _cb, false, offset);
};
RG.extend2(OneShotEvent, GameEvent);

/* Scheduler for the game actions. Time-based scheduler where each actor/event
* is scheduled based on speed.  */
export const Scheduler = function() { // {{{2

    // Internally use ROT scheduler
    this._scheduler = new ROT.Scheduler.Action();
    this._scheduler._defaultDuration = 0;
    this._scheduler._duration = 0;

    // Store the scheduled events
    this._events = [];
    this._actors = [];

    this.hasNotify = true;

    // When an actor is killed, removes it from the scheduler.*/
    POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);

}; // }}} Scheduler

/* Adds an actor or event to the scheduler.*/
Scheduler.prototype.add = function(actOrEvent, repeat, offset) {
    this._scheduler.add(actOrEvent, repeat, offset);
    if (actOrEvent.hasOwnProperty('isEvent')) {
        this._events.push(actOrEvent);
    }
    else {
        this._actors.push(actOrEvent);
    }
};

// Returns next actor/event or null if no next actor exists.
Scheduler.prototype.next = function() {
    return this._scheduler.next();
};

/* Must be called after next() to re-schedule next slot for the
 * actor/event.*/
Scheduler.prototype.setAction = function(action) {
    this._scheduler.setDuration(action.getDuration());
};

/* Tries to remove an actor/event, Return true if success.*/
Scheduler.prototype.remove = function(actOrEvent) {
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
Scheduler.prototype.removeEvent = function(actOrEvent) {
    let index = -1;
    if (actOrEvent.hasOwnProperty('isEvent')) {
        index = this._events.indexOf(actOrEvent);
        if (index !== -1) {
            this._events.splice(index, 1);
        }
    }
    return this._scheduler.remove(actOrEvent);
};

Scheduler.prototype.getTime = function() {
    return this._scheduler.getTime();
};

Scheduler.prototype.notify = function(evtName, args) {
    if (evtName === RG.EVT_ACTOR_KILLED) {
        if (args.hasOwnProperty('actor')) {
            this.remove(args.actor);
        }
    }
};

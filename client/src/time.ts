
import ROT from '../../lib/rot';
import RG from './rg';
import {EventPool} from '../src/eventpool';

const POOL = EventPool.getPool();

type BaseActor = import('./actor').BaseActor;
type Level = import('./level').Level;

export const Time = {};

export type ActionCallback = () => void;

/* Models an action. Each action has a duration and a callback.  */
export class Action {
    private _duration: number;
    private _cb: ActionCallback;
    private _energy: number;

    constructor(dur: number, cb: ActionCallback) {
        this._duration = dur;
        this._cb = cb; // Action callback
        this._energy = 0;
    }

    public setEnergy(en) {this._energy = en;}
    public getEnergy() {return this._energy;}
    public getDuration() {return this._duration;}
    public doAction() {this._cb();}
}

//---------------------------------------------------------------------------
// GAME EVENTS
//---------------------------------------------------------------------------

/* Event is something that is scheduled and takes place but it's not an actor.
 * An example is regeneration or poison effect.*/
export class GameEvent {
    public isEvent: boolean;
    public cb: () => void;
    public dur: number;
    protected _repeat: boolean;
    protected _offset: number;
    protected _level: Level;

    constructor(dur: number, cb: () => void, repeat: boolean, offset: number) {
        this.isEvent = true; // Needed for the scheduler
        this.dur = dur;
        this.cb = cb;
        this._repeat = repeat;
        this._offset = offset;
        this._level = null; // Level associated with the event, if null, global
    }

    /* Clunky for events, but must implement for the scheduler.*/
    public isPlayer() {return false;}

    public nextAction(): Action {return new Action(this.dur, this.cb);}

    public getRepeat(): boolean {return this._repeat;}
    public setRepeat(repeat: boolean): void {this._repeat = repeat;}

    public getOffset(): number {return this._offset;}
    public setOffset(offset: number): void {this._offset = offset;}

    public setLevel(level: Level): void {this._level = level;}
    public getLevel(): Level {return this._level;}

}

/* Regeneration event. Initialized with an actor. */
export class RegenEvent extends GameEvent {
    constructor(actor, dur) {
        const _regenerate = () => {
            actor.get('Health').addHP(1);
        };
        super(dur, _regenerate, true, 0);
    }
}

/* Regeneration power points event. Initialized with an actor. */
export class RegenPPEvent extends GameEvent {
    constructor(actor: BaseActor, dur: number) {
        const _regeneratePower = () => {
            actor.get('SpellPower').addPP(1);
        };
        super(dur, _regeneratePower, true, 0);
    }
}

/* Event that is executed once after an offset.*/
export class OneShotEvent extends GameEvent {
    constructor(cb: () => void, offset: number, msg?: string) {
        // Wraps the callback into function and emits a message
        const _cb = () => {
            if (!RG.isNullOrUndef([msg])) {
                RG.gameMsg(msg);
            }
            cb();
        };
        super(0, _cb, false, offset);
    }
}

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

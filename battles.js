
var GS = require("./getsource.js");

var ROT = GS.getSource("ROT", "./lib/rot.js");
var RG  = GS.getSource("RG", "./src/rg.js");
RG.Object = GS.getSource(["RG", "Object"], "./src/object.js");
RG.Item = GS.getSource(["RG","Item"], "./src/item.js");
RG.Component = GS.getSource(["RG", "Component"], "./src/component.js");
RG.System = GS.getSource(["RG", "System"], "./src/system.js");
RG.Brain = GS.getSource(["RG", "Brain"], "./src/brain.js");
RG.Inv = GS.getSource(["RG", "Inv"], "./src/inv.js");
RG.Actor = GS.getSource(["RG", "Actor"], "./src/actor.js");
RG.Element = GS.getSource(["RG", "Element"], "./src/element.js");
RG.Map = GS.getSource(["RG", "Map"], "./src/map.js");
RG.World = GS.getSource(["RG", "World"], "./src/world.js");

// Just a test
RG.Effects = GS.getSource(["RG", "Effects"], "./data/effects.js");
RG.Factory = GS.getSource(["RG", "Factory"], "./src/factory.js");

/** Models an action. Each action has a duration and a callback.  */
RG.RogueAction = function(dur, cb, obj) { // {{{2

    var _duration = dur;
    var _cb = cb; // Action callback
    var _energy = 0;

    this.setEnergy = function(en) {_energy = en;};
    this.getEnergy = function() {return _energy;};


    this.getDuration = function() {
        return _duration;
    };

    this.doAction = function() {
        _cb(obj);
    };

}; // }}} Action





//---------------------------------------------------------------------------
// GAME EVENTS
//---------------------------------------------------------------------------

/** Event is something that is scheduled and takes place but it's not an actor.
 * An example is regeneration or poison effect.*/
RG.RogueGameEvent = function(dur, cb, repeat, offset) {

    var _cb = cb;
    var _repeat = repeat;
    var _nTimes = 1;
    var _offset = offset;

    var _level = null; // Level associated with the event, if null, global

    this.isEvent = true; // Needed for the scheduler

    /** Clunky for events, but must implement for the scheduler.*/
    this.isPlayer = function(){return false;};

    this.nextAction = function() {
        return new RG.RogueAction(dur, cb, {});
    };

    this.getRepeat = function() {return _repeat;};
    this.setRepeat = function(repeat) {_repeat = repeat;};

    this.getOffset = function() {return _offset;};
    this.setOffset = function(offset) {_offset = offset;};

    this.setLevel = function(level) {_level = level;};
    this.getLevel = function() {return _level;};

};

/** Regeneration event. Initialized with an actor. */
RG.RogueRegenEvent = function(actor, dur) {

    var _dur = dur; // Duration between events

    var _regenerate = function() {
        maxHP = actor.get("Health").addHP(1);
    };

    RG.RogueGameEvent.call(this, _dur, _regenerate, true);
};
RG.extend2(RG.RogueRegenEvent, RG.RogueGameEvent);

/** Event that is executed once after an offset.*/
RG.RogueOneShotEvent = function(cb, offset, msg) {

    // Wraps the callback into function and emits a message
    var _cb = function() {
        if (!RG.isNullOrUndef([msg])) {
            RG.gameMsg(msg);
        }
        cb();
    };

    RG.RogueGameEvent.call(this, 0, _cb, false, offset);
};
RG.extend2(RG.RogueOneShotEvent, RG.RogueGameEvent);


/** Scheduler for the game actions.  */
RG.RogueScheduler = function() { // {{{2

    // Internally use ROT scheduler
    var _scheduler = new ROT.Scheduler.Action();

    // Store the scheduled events
    var _events = [];
    var _actors = [];

    /** Adds an actor or event to the scheduler.*/
    this.add = function(actOrEvent, repeat, offset) {
        _scheduler.add(actOrEvent, repeat, offset);
        if (actOrEvent.hasOwnProperty("isEvent")) {
            _events.push(actOrEvent);

        }
        else {
            _actors.push(actOrEvent);
        }
    };

    // Returns next actor/event or null if no next actor exists.
    this.next = function() {
        return _scheduler.next();
    };

    /** Must be called after next() to re-schedule next slot for the
     * actor/event.*/
    this.setAction = function(action) {
        _scheduler.setDuration(action.getDuration());
    };

    /** Tries to remove an actor/event, Return true if success.*/
    this.remove = function(actOrEvent) {
        if (actOrEvent.hasOwnProperty("isEvent")) {
            return this.removeEvent(actOrEvent);
        }
        else {
            var index = _actors.indexOf(actOrEvent);
            if (index !== -1) _events.splice(index, 1);
        }
        return _scheduler.remove(actOrEvent);
    };

    /** Removes an event from the scheduler. Returns true on success.*/
    this.removeEvent = function(actOrEvent) {
        var index = - 1;
        if (actOrEvent.hasOwnProperty("isEvent")) {
            index = _events.indexOf(actOrEvent);
            if (index !== -1) _events.splice(index, 1);
        }
        return _scheduler.remove(actOrEvent);

    };

    this.getTime = function() {
        return _scheduler.getTime();
    };

    /** Hooks to the event system. When an actor is killed, removes it from the
     * scheduler.*/
    this.notify = function(evtName, args) {
        if (evtName === RG.EVT_ACTOR_KILLED) {
            if (args.hasOwnProperty("actor")) {
                this.remove(args.actor);
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);


}; // }}} Scheduler


if (typeof exports !== 'undefined' ) {
    if( typeof RG !== 'undefined' && module.exports ) {
        exports = module.exports = RG;
    }
    exports.RG = RG;
}
else {
    window.RG = RG;
}


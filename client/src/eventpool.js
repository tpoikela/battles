
const RG = require('./rg');

/* Event pool can be used to emit events and register callbacks for listeners.
 * This decouples the emitter and listener from each other.
 * Each emitted event can contain an object 'args', which is emitted with the
 * event. This object can contain any data.
 */
const EventPool = function() { // {{{2
    this._listeners = {};
    this._nListeners = 0;

    // const _poolID = RG.EventPool.id;
    this._listenerID = 0;

    this._lastEmitted = null;
    this._lastRemoved = null;
};
RG.POOL = new EventPool(); // Dangerous, global objects

EventPool.prototype.getNumListeners = function() {
    return this._nListeners;
};

EventPool.prototype.getNumEventsListened = function() {
    return Object.keys(this._listeners).length;
};

/* Emits an event with given name. args must be in object-notation ie.
 * {data: "abcd"} */
EventPool.prototype.emitEvent = function(evtName, args) {
    if (!RG.isNullOrUndef([evtName])) {
        if (process.env.NODE_ENV !== 'production') {
            this._lastEmitted = evtName;
            this._lastArgs = args;
        }
        if (this._listeners.hasOwnProperty(evtName)) {
            const called = this._listeners[evtName];
            for (let i = 0, len = called.length; i < len; i++) {
                called[i].notify(evtName, args);
            }
        }
    }
    else {
        RG.nullOrUndefError('EventPool: emitEvent',
            'Event name must be given.', evtName);
    }
};

/* Register an event listener. */
EventPool.prototype.listenEvent = function(evtName, obj) {
    if (!RG.isNullOrUndef([evtName])) {
        if (obj.hasOwnProperty('notify') || obj.hasNotify) {
            if (this._listeners.hasOwnProperty(evtName)) {
                const index = this._listeners[evtName].indexOf(obj);
                if (index === -1) {
                    this._listeners[evtName].push(obj);
                }
            }
            else {
                this._listeners[evtName] = [];
                this._listeners[evtName].push(obj);
            }
            ++this._nListeners;
            if (!obj.hasOwnProperty('listenerID')) {
                obj.listenerID = this._listenerID++;
            }
        }
        else {
            let msg = 'evtName: ' + evtName;
            msg += '\nprototype: ' + JSON.stringify(obj.prototype);
            msg += '\nCannot add object. Listener must implement notify()!';
            RG.err('EventPool', 'listenEvent', msg);
        }
    }
    else {
        RG.err('EventPool', 'listenEvent', 'Event name not well defined.');
    }
};

/* Removes the object from a list of event listeners. */
EventPool.prototype.removeListener = function(obj) {
    if (obj.hasOwnProperty('listenerID')) {
        let nRemoved = 0;
        const id = obj.listenerID;

        const evtKeys = Reflect.ownKeys(this._listeners);
        evtKeys.forEach(evt => {
            const index = this._listeners[evt].findIndex(obj =>
                obj.listenerID === id);
            if (index >= 0) {
                if (process.env.NODE_ENV !== 'production') {
                    this._lastRemoved = this._listeners[evt][index];
                }
                this._listeners[evt].splice(index, 1);
                ++nRemoved;
                --this._nListeners;
                if (this._listeners[evt].length === 0) {
                    delete this._listeners[evt];
                }
            }
        });
        if (nRemoved === 0) {
            RG.warn('EventPool', 'removeListener',
                `ListenerID ${obj.listenerID} not found`);
        }
        delete obj.listenerID;
    }
    else {
        const json = JSON.stringify(obj);
        RG.err('EventPool', 'removeListener',
            `No prop listener ID from on object ${json}`);
    }
};

/* Returns listeners for the given event. */
EventPool.prototype.getListeners = function(evtName) {
    if (this._listeners.hasOwnProperty(evtName)) {
        return this._listeners[evtName].slice();
    }
    return [];
};

EventPool.prototype.printListeners = function() {
    Reflect.ownKeys(this._listeners).forEach(evt => {
        RG.diag(`Listeners for event ${evt}`);
        RG.diag(this._listeners[evt]);
    });
};


EventPool.id = 0;

module.exports = EventPool;

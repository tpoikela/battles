
const RG = require('./rg');

/* Event pool can be used to emit events and register callbacks for listeners.
 * This decouples the emitter and listener from each other.
 * Each emitted event can contain an object 'args', which is emitted with the
 * event. This object can contain any data.
 */
const EventPool = function() { // {{{2
    const _listeners = {};
    let _nListeners = 0;

    // const _poolID = RG.EventPool.id;
    let _listenerID = 0;

    this.getNumListeners = () => _nListeners;

    /* Emits an event with given name. args must be in object-notation ie.
     * {data: "abcd"} */
    this.emitEvent = (evtName, args) => {
        if (!RG.isNullOrUndef([evtName])) {
            if (_listeners.hasOwnProperty(evtName)) {
                const called = _listeners[evtName];
                for (let i = 0; i < called.length; i++) {
                    called[i].notify(evtName, args);
                }
            }
            else {
                ++_nListeners;
            }
        }
        else {
            RG.nullOrUndefError('EventPool: emitEvent',
                'Event name must be given.', evtName);
        }
    };

    /* Register an event listener. */
    this.listenEvent = (evtName, obj) => {
        if (!RG.isNullOrUndef([evtName])) {
            if (obj.hasOwnProperty('notify') || obj.hasNotify) {
                if (_listeners.hasOwnProperty(evtName)) {
                    const index = _listeners[evtName].indexOf(obj);
                    if (index === -1) {
                        _listeners[evtName].push(obj);
                    }
                }
                else {
                    _listeners[evtName] = [];
                    _listeners[evtName].push(obj);
                }
                if (!obj.hasOwnProperty('listenerID')) {
                    obj.listenerID = _listenerID++;
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
    this.removeListener = obj => {
        if (obj.hasOwnProperty('listenerID')) {
            let nRemoved = 0;
            const id = obj.listenerID;
            Reflect.ownKeys(_listeners).forEach(evt => {
                const index = _listeners[evt].findIndex(obj =>
                    obj.listenerID === id);
                if (index >= 0) {
                    _listeners[evt].splice(index, 1);
                    ++nRemoved;
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
    this.getListeners = evtName => {
        if (_listeners.hasOwnProperty(evtName)) {
            return _listeners[evtName].slice();
        }
        return [];
    };
};
RG.POOL = new EventPool(); // Dangerous, global objects
EventPool.id = 0;

module.exports = EventPool;

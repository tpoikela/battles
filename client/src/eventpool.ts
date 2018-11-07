
import RG from './rg';

/* Event pool can be used to emit events and register callbacks for listeners.
 * This decouples the emitter and listener from each other.
 * Each emitted event can contain an object 'args', which is emitted with the
 * event. This object can contain any data.
 */
class EventPool  { // {{{2

    public static poolInstance: EventPool;

    public static getPool(): EventPool {
        if (!EventPool.poolInstance) {
            EventPool.poolInstance = new EventPool();
        }
        return EventPool.poolInstance;
    }

    private static id: number = 0;

    private _listeners: any;
    private _nListeners: number;
    private _listenerID: number;
    private _lastEmitted: any;
    private _lastRemoved: any;
    private pendingRemoves: any[];
    private notifyStackSize: number;
    private _lastArgs: any;
    private cannotRemove: boolean;

    constructor() {
        this._listeners = {};
        this._nListeners = 0;
        this._listenerID = 0;

        this._lastEmitted = null;
        this._lastRemoved = null;

        this.pendingRemoves = [];

        // Tracks that notify() call stack is fully unwound before
        // listeners can be removed
        this.notifyStackSize = 0;
    }


    public getNumListeners() {
        return this._nListeners;
    };

    public getNumEventsListened() {
        return Object.keys(this._listeners).length;
    };

    /* Emits an event with given name. args must be in object-notation ie.
     * {data: "abcd"} */
    public emitEvent(evtName, args) {
        if (!RG.isNullOrUndef([evtName])) {
            ++this.notifyStackSize;
            if (process.env.NODE_ENV !== 'production') {
                this._lastEmitted = evtName;
                this._lastArgs = args;
            }

            if (this._listeners.hasOwnProperty(evtName)) {
                this.cannotRemove = true; // Lock removals
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
        if (this.notifyStackSize === 1) {
            this.cannotRemove = false; // Unlock removals
            // And process pending removals
            if (this.pendingRemoves.length > 0) {
                this.pendingRemoves.forEach(obj => {
                    this.removeListener(obj);
                });
                this.pendingRemoves = [];
            }
        }
        --this.notifyStackSize;
    };

    /* Register an event listener. */
    public listenEvent(evtName, obj) {
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

    /* Removes the object from a list of event listeners. Note that if remove is
     * is triggered within notify() function of an object, the removal is made
     * pending and processed once notify() finishes (see this.dontRemove). */
    public removeListener(obj) {
        if (obj.hasOwnProperty('listenerID')) {
            if (this.cannotRemove) {
                this.pendingRemoves.push(obj);
                return;
            }
            let nRemoved = 0;
            const id = obj.listenerID;

            const evtKeys = Reflect.ownKeys(this._listeners);
            evtKeys.forEach(evt => {
                const index = this._listeners[evt].findIndex(sought =>
                    sought.listenerID === id);
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
    public getListeners(evtName) {
        if (this._listeners.hasOwnProperty(evtName)) {
            return this._listeners[evtName].slice();
        }
        return [];
    }

    public printListeners() {
        Reflect.ownKeys(this._listeners).forEach(evt => {
            RG.diag(`Listeners for event ${String(evt)}`);
            RG.diag(this._listeners[evt]);
        });
    }

};

export default EventPool;

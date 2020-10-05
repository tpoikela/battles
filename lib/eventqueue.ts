

export class EventQueue<T> {
    protected _time: number;
    protected _events: T[];
    protected _eventTimes: number[];
    public traceIDs: {[key: string]: boolean};
    public debugEnabled: boolean;

    /*
     * @class Generic event queue: stores events and retrieves them based on their time
     */
    constructor() {
        this._time = 0;
        this._events = [];
        this._eventTimes = [];
        this.traceIDs = {};
        this.debugEnabled = false;
    }

    setTraceID(id: number): void {
        this.traceIDs[id] = true;
        this.debugEnabled = true;
    }

    /*
     * @returns {number} Elapsed time
     */
    getTime(): number {
        return this._time;
    };

    /*
     * Clear all scheduled events
     */
    clear(): EventQueue<T> {
        this._events = [];
        this._eventTimes = [];
        return this;
    }

    /*
     * @param {?} event
     * @param {number} time
     */
    add(event: T, time: number): void {
        let index = this._events.length;
        for (let i = 0; i < this._eventTimes.length; i++) {
            if (this._eventTimes[i] > time) {
                index = i;
                break;
            }
        }
        insertOne(this._events, index, event);
        insertOne(this._eventTimes, index, time);

        const e = event as any;
        if (e.getID && this.traceIDs[e.getID()]) {
            if (this._events.findIndex((a: any) => a.getID && this.traceIDs[a.getID()]) > 0) {
                console.log(`EQ.add found actor ID ${e.getID()}`);
            }
        }
    }

    /*
     * Locates the nearest event, advances time if necessary. Returns that event and removes it from the queue.
     * @returns {? || null} The event previously added by addEvent, null if no event available
     */
    get(): T | null {
        if (!this._events.length) { return null; }

        const time = this._eventTimes.shift();
        if (time > 0) { /* advance */
            this._time += time;
            for (let i = 0; i < this._eventTimes.length; i++) { this._eventTimes[i] -= time; }
        }

        // return this._events.splice(0, 1)[0];
        const e: any = this._events.shift();
        if (e.getID && this.traceIDs[e.getID()]) {
            console.debug(`EQ.get(): Shifted out ID ${e.getID()}`);
        }
        return e;
    }

    /*
     * Remove an event from the queue
     * @param {?} event
     * @returns {bool} success?
     */
    remove(event: T): boolean {
        const e = event as any;
        if (e.getID && this.traceIDs[e.getID()]) {
            console.log(`EQ.remove(): Trying to remove actor with ID ${e.getID()}`);
            if (this._events.findIndex((a: any) => a.getID && this.traceIDs[a.getID()]) > 0) {
                console.log(`EQ.remove(): Found actor ID ${e.getID()} for removal`);
            }
        }
        const index = this._events.indexOf(event);
        if (index === -1) { return false; }
        this._remove(index);
        return true;
    }


    /*
     * Remove an event from the queue
     * @param {int} index
     */
    _remove(index) {
        // this._events.splice(index, 1);
        // this._eventTimes.splice(index, 1);
        spliceOne(this._events, index);
        spliceOne(this._eventTimes, index);
    }

}


const insertOne = function(array, index, item) {
    let i = array.length;
    while (i-- >= index) {
        array[i + 1] = array[i];
    }
    array[index] = item;
    return array;
};

const spliceOne = function(arr, index) {
    const len = arr.length;
    if (!len) {return;}
    while (index < len) {
        arr[index] = arr[index+1];
        index++;
    }
    arr.length--;
};

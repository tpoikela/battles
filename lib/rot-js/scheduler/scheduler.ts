import EventQueue from '../eventqueue';

export default class Scheduler<T = any> {
    _queue: EventQueue<T>;
    _repeat: T[];
    _current: any;

    /**
	 * @class Abstract scheduler
	 */
    constructor() {
        this._queue = new EventQueue<T>();
        this._repeat = [];
        this._current = null;
    }

    /**
	 * @see ROT.EventQueue#getTime
	 */
    getTime(): number { return this._queue.getTime(); }

    /**
	 * @param {?} item
	 * @param {bool} repeat
	 */
    add(item:T, repeat:boolean): Scheduler<T> {
        if (repeat) { this._repeat.push(item); }
        return this;
    }

    /**
	 * Get the time the given item is scheduled for
	 * @param {?} item
	 * @returns {number} time
	 */
    getTimeOf(item: T): number {
        return this._queue.getEventTime(item);
    }

    /**
	 * Clear all items
	 */
    clear(): Scheduler<T> {
        this._queue.clear();
        this._repeat = [];
        this._current = null;
        return this;
    }

    /**
	 * Remove a previously added item
	 * @param {?} item
	 * @returns {bool} successful?
	 */
    remove(item: any) {
        const result = this._queue.remove(item);

        const index = this._repeat.indexOf(item);
        if (index !== -1) {
            this._repeat.splice(index, 1);
        }

        if (this._current === item) {
            this._current = null;
        }

        return result;
    }

    /**
	 * Schedule next item
	 * @returns {?}
	 */
    next(): T {
        this._current = this._queue.get();
        return this._current;
    }
}

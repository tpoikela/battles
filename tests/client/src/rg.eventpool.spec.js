
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const EventPool = RG.EventPool;

const Listener = function(eventName) {
    this.notified = false;
    this.eventName = eventName;

    this.hasNotify = true;

    this.notify = function(name) {
        if (name === this.eventName) {
            this.notified = true;
        }
    };

    this.clearNotify = function() {
        this.notified = false;
    };
};

const EventEmitter = function() {
    this.pool = null;

    this.emit = function(name, args) {
        this.pool.emitEvent(name, args);
    };
};

describe('How events bubble in the system', () => {

    let pool = null;
    let listener = null;
    let emitter = null;

    beforeEach(() => {
        pool = new EventPool();
        listener = new Listener('ActualEvent');
        pool.listenEvent(listener.eventName, listener);
        emitter = new EventEmitter();
        emitter.pool = pool;

    });

    it('can indicate number of listeners', () => {
        expect(pool.getNumListeners()).to.equal(1);
    });

    it('Sends notification to listener', () => {
        const empty = {};

        RG.suppressErrorMessages = true;
        pool.listenEvent('TestEvent', empty);
        RG.suppressErrorMessages = false;

        emitter.emit('TestEvent', {data: 'abcd'});

        expect(listener.notified).to.equal(false);
        emitter.emit('ActualEvent', {data: 'abcd'});
        expect(listener.notified).to.equal(true);

        listener.clearNotify();
        expect(listener.notified).to.equal(false);
        emitter.emit('RandomEvent', {data: 'abcd'});

        // Works also with symbols
        const symEvent = Symbol();
        const symListener = new Listener(symEvent);
        pool.listenEvent(symListener.eventName, symListener);

        expect(symListener.notified).to.equal(false);
        emitter.emit(symEvent, {data: 'sym data'});
        expect(symListener.notified).to.equal(true);
    });

    it('can have its listeners removed', () => {
        const listeners = [];
        for (let i = 0; i < 10; i++) {
            const listener = new Listener('ActualEvent');
            listeners.push(listener);
            pool.listenEvent(listener.eventName, listener);
        }

        const EVENT = Symbol();
        for (let i = 0; i < 10; i++) {
            const listener = new Listener(EVENT);
            listeners.push(listener);
            pool.listenEvent(listener.eventName, listener);
        }

        const numListeners = pool.getNumListeners();
        pool.removeListener(listener);
        expect(pool.getNumListeners()).to.equal(numListeners - 1);

        expect(listener.notified).to.equal(false);
        emitter.emit('ActualEvent', {data: 'abcd'});
        expect(listener.notified).to.equal(false);
        emitter.emit(EVENT, {data: 'abcd'});

        listeners.forEach(listener => {
            expect(listener.notified).to.equal(true);
            pool.removeListener(listener);
            listener.clearNotify();
        });

        expect(pool.getNumListeners()).to.equal(0);

        emitter.emit('ActualEvent', {data: 'abcd'});
        listeners.forEach(listener => {
            expect(listener.notified).to.equal(false);
        });

    });
});


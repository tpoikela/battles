
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {EventPool} from '../../../client/src/eventpool';

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

const SelfRemovingListener = function(evtName, pool) {
    this.evtName = evtName;
    this.hasNotify = true;
    this.emitAlso = false; // When true, emit inside notify

    this.notify = function(name) {
        console.log('SelfRemovingListener notify got ' + name);
        if (name === this.evtName) {
            if (this.emitAlso) {
                pool.emitEvent('SELF_REM_EMIT', {msg: 'Just emit it'});
            }
            console.log('Now call removeListener() for evt ' + name);
            pool.removeListener(this);
        }
    };
    pool.listenEvent(this.evtName, this);
};

const NestedNotify = function(evtName, pool) {
    this.evtName = evtName;
    this.hasNotify = true;
    this.notified = false;

    this.selfRem = [];

    for (let i = 0; i < 10; i++) {
        const selfRemList = new SelfRemovingListener('NESTED', pool);
        if (i === 0) {selfRemList.emitAlso = true;}
        this.selfRem.push(selfRemList);
    }

    this.notify = function(name) {
        if (name === this.evtName) {
            this.notified = true;
            pool.emitEvent('NESTED', {msg: 'Remove nested'});
        }
    };
    pool.listenEvent(this.evtName, this);

};

describe('EventPool', () => {

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
            const listenerInst = new Listener('ActualEvent');
            listeners.push(listenerInst);
            pool.listenEvent(listenerInst.eventName, listenerInst);
        }

        const EVENT = Symbol();
        for (let i = 0; i < 10; i++) {
            const listenerInst = new Listener(EVENT);
            listeners.push(listenerInst);
            pool.listenEvent(listenerInst.eventName, listenerInst);
        }

        const numListeners = pool.getNumListeners();
        pool.removeListener(listener);
        expect(pool.getNumListeners()).to.equal(numListeners - 1);

        expect(listener.notified).to.equal(false);
        emitter.emit('ActualEvent', {data: 'abcd'});
        expect(listener.notified).to.equal(false);
        emitter.emit(EVENT, {data: 'abcd'});

        listeners.forEach(listenerInst => {
            expect(listenerInst.notified).to.equal(true);
            pool.removeListener(listenerInst);
            listenerInst.clearNotify();
        });

        expect(pool.getNumListeners()).to.equal(0);

        emitter.emit('ActualEvent', {data: 'abcd'});
        listeners.forEach(listener => {
            expect(listener.notified).to.equal(false);
        });

    });

    it('deletes listeners internally', () => {
        expect(pool.getNumEventsListened()).to.equal(1);
        let listeners = pool.getListeners(listener.eventName);
        expect(listeners.length).to.equal(1);
        pool.removeListener(listener);
        listeners = pool.getListeners(listener.eventName);
        expect(listeners.length).to.equal(0);
        expect(pool.getNumEventsListened()).to.equal(0);
    });

    it('handles cases where listener removes itself during notify', () => {
        pool.removeListener(listener);
        expect(pool.getNumListeners()).to.equal(0);
        const listeners = [];
        for (let i = 0; i < 10; i++) {
            const remList = new SelfRemovingListener('REMOVE', pool);
            listeners.push(remList);
        }
        expect(pool.getNumListeners()).to.equal(10);
        emitter.emit('REMOVE', {data: 'just some data'});
        expect(pool.getNumListeners()).to.equal(0);
    });

    it('handles nested notifys and removals without errors', () => {
        const numListStart = pool.getNumListeners();
        const nested = new NestedNotify('NESTED_EVENTS', pool);
        const numListAfter = pool.getNumListeners();
        expect(numListAfter).to.equal(numListStart + 10 + 1);
        emitter.emit('NESTED_EVENTS', {msg: 'Triggers chain'});
        expect(pool.getNumListeners()).to.equal(2);
        expect(nested.notified).to.equal(true);
    });

});


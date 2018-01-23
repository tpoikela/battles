
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
    });

    it('can have its listeners removed', () => {
        pool.removeListener(listener);
        expect(listener.notified).to.equal(false);
        emitter.emit('ActualEvent', {data: 'abcd'});
        expect(listener.notified).to.equal(false);
    });
});


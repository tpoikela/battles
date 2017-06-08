
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

const emitter = {
    pool: null,

    emit: function(name, args) {
        pool.emitEvent(name, args);
    }
};

const empty = {};

const listener = new Listener('ActualEvent');
const pool = new EventPool();
pool.listenEvent(listener.eventName, listener);
pool.listenEvent('TestEvent', empty);
emitter.pool = pool;
emitter.emit('TestEvent', {data: 'abcd'});

describe('How events bubble in the system', function() {
    it('Sends notification to listener', function() {
        expect(listener.notified).to.equal(false);
        emitter.emit('ActualEvent', {data: 'abcd'});
        expect(listener.notified).to.equal(true);
        listener.clearNotify();
        expect(listener.notified).to.equal(false);
        emitter.emit('RandomEvent', {data: 'abcd'});

    });
});


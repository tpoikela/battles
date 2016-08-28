


var chai = require("chai");
var expect = chai.expect;
var RG = require("../battles.js");

EventPool = RG.EventPool;

var Listener = function(eventName) {

    this.notified =  false;

    this.eventName = eventName;

    this.notify = function(name, args) {
        if (name === this.eventName) {
            console.log("Event " + name + " notified. Args:");
            for (var p in args) {
                console.log(p + " -> " + args[p]);
            }
            this.notified = true;
        }
    };

    this.clearNotify = function() {
        this.notified = false;
    };
};

var emitter = {
    pool: null,

    emit: function(name, args) {
        pool.emitEvent(name, args);
    },

};

var empty = {

};

var listener = new Listener("ActualEvent");
var pool = new EventPool();
pool.listenEvent(listener.eventName, listener);
pool.listenEvent("TestEvent", empty);
emitter.pool = pool;
emitter.emit("TestEvent", {data: "abcd"});

describe('How events bubble in the system', function() {
    it('Sends notification to listener', function() {
        expect(listener.notified).to.equal(false);
        emitter.emit("ActualEvent", {data: "abcd"});
        expect(listener.notified).to.equal(true);
        listener.clearNotify();
        expect(listener.notified).to.equal(false);
        emitter.emit("RandomEvent", {data: "abcd"});

    });
});


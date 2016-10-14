/**
 * Unit Tests for checking action scheduling and turn taking between actors.
 *
 */

var chai = require("chai");
var expect = chai.expect;
var RG = require("../battles.js");

var Actor = RG.Actor.Rogue;
var Action = RG.Time.RogueAction;
var Level = RG.RogueLevel;
var Element = RG.RogueElement;

describe('Basic functions for actors', function() {
    it('Acts like Locatable', function() {
        var actor = new Actor(true);
        actor.setXY(2, 10);
        expect(actor.getX()).to.equal(2);
        expect(actor.getY()).to.equal(10);
    });
});


describe('Scheduling one action', function() {
    it('Repeats the same actor indefinetely', function() {
        var sch = new RG.Time.Scheduler();
        var actor = new Actor("actor");
        var actorID = actor.id;

        var player = new Actor("player");
        var playerID = player.id;
        var falseActor = new Actor("falseActor");

        var playerAction = new Action(15, function() {});
        var action = new Action(20, function() {});

        expect(actor.isPlayer()).to.equal(false);
        player.setIsPlayer(true);
        expect(player.isPlayer()).to.equal(true);

        actor.id = 1234;
        actorID = actor.id;

        sch.add(actor, true, 0);
        sch.add(player, true, 1);

        // t = 0
        var nextActor = sch.next();
        sch.setAction(action);
        expect(nextActor.id).to.equal(actorID);

        // t = 1
        nextActor = sch.next();
        sch.setAction(playerAction);
        expect(nextActor.id).to.equal(playerID);
        expect(nextActor.isPlayer()).to.equal(true);

        // t = 16
        nextActor = sch.next();
        sch.setAction(playerAction);
        expect(nextActor.id).to.equal(playerID);
        expect(nextActor.isPlayer()).to.equal(true);
        expect(sch.remove(actor)).to.equal(true);

        // t = 31
        nextActor = sch.next();
        sch.setAction(playerAction);
        expect(nextActor.id).to.equal(playerID);
        expect(nextActor.isPlayer()).to.equal(true);

        sch.add(actor, true, 0);
        nextActor = sch.next();
        sch.setAction(action);
        expect(nextActor.id).to.equal(1234);
        expect(nextActor.isPlayer()).to.equal(false);
        expect(sch.remove(player)).to.equal(true);

        expect(sch.remove(falseActor)).to.equal(false);

    });
});

var testCB = function(setToZero) {
    setToZero = 0;
};

var MockAction = function(dur) {

    var _dur = dur;

    this.setDuration = function(dur) {_dur = dur;};
    this.getDuration = function() {return _dur;};
};

describe('Canceling events and actor actions', function() {
    var sch = new RG.Time.Scheduler();
    var act = new MockAction(100);

    it('Removes the event like it never happened', function() {
        var testActor = new RG.Actor.Rogue("actor");
        var notZero = 555;
        var changeEvent = new RG.Time.RogueOneShotEvent(testCB, 200, "This happened");
        sch.add(testActor, true, 100);
        sch.add(changeEvent, true, 190);

        var next = sch.next();
        sch.setAction(act);
        expect(next).to.equal(testActor);

        next = sch.next();
        expect(next).to.equal(changeEvent);
        act.setDuration(190);
        sch.setAction(act);

        next = sch.next();
        act.setDuration(100);
        sch.setAction(act);
        expect(next).to.equal(testActor);

        next = sch.next();
        expect(next).to.equal(testActor);
        sch.setAction(act);

        sch.remove(changeEvent);

        next = sch.next();
        expect(next).to.equal(testActor);
        sch.setAction(act);

    });
});

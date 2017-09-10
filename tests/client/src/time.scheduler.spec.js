/**
 * Unit Tests for checking action scheduling and turn taking between actors.
 */

const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

const Actor = RG.Actor.Rogue;
const Action = RG.Time.RogueAction;

describe('Basic functions for actors', () => {
    it('Acts like Locatable', () => {
        const actor = new Actor(true);
        actor.setXY(2, 10);
        expect(actor.getX()).to.equal(2);
        expect(actor.getY()).to.equal(10);
    });
});

describe('Scheduling one action', () => {
    it('Repeats the same actor indefinetely', () => {
        const sch = new RG.Time.Scheduler();
        const actor = new Actor('actor');
        let actorID = actor.id;

        const player = new Actor('player');
        const playerID = player.id;
        const falseActor = new Actor('falseActor');

        const playerAction = new Action(15, () => {});
        const action = new Action(20, () => {});

        expect(actor.isPlayer()).to.equal(false);
        player.setIsPlayer(true);
        expect(player.isPlayer()).to.equal(true);

        actor.id = 1234;
        actorID = actor.id;

        sch.add(actor, true, 0);
        sch.add(player, true, 1);

        // t = 0
        let nextActor = sch.next();
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

const emptyTestCB = () => {};

const MockAction = function(dur) {
    let _dur = dur;

    this.setDuration = dur => {_dur = dur;};
    this.getDuration = () => _dur;
};

describe('Canceling events and actor actions', () => {
    const sch = new RG.Time.Scheduler();
    const act = new MockAction(100);

    it('Removes the event like it never happened', () => {
        const testActor = new RG.Actor.Rogue('actor');
        // const notZero = 555;
        const changeEvent = new RG.Time.OneShotEvent(emptyTestCB, 200,
            'This happened');
        sch.add(testActor, true, 100);
        sch.add(changeEvent, true, 190);

        let next = sch.next();
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

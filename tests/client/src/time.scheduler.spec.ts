/**
 * Unit Tests for checking action scheduling and turn taking between actors.
 */

import { expect } from 'chai';
// import RG from '../../../client/src/rg';
import * as Time from '../../../client/src/time';
import {SentientActor} from '../../../client/src/actor';

const Actor = SentientActor;
const Action = Time.Action;

describe('Time.Scheduler', () => {

    it('Repeats the same actor indefinitely', () => {
        const sch = new Time.Scheduler();
        const actor = new Actor('actor');
        let actorID = actor.getID();

        const player = new Actor('player');
        const playerID = player.getID();
        const falseActor = new Actor('falseActor');

        const playerAction = new Action(15, () => {});
        const action = new Action(20, () => {});

        expect(actor.isPlayer()).to.equal(false);
        player.setIsPlayer(true);
        expect(player.isPlayer()).to.equal(true);

        actor.setID(1234);
        actorID = actor.getID();

        sch.add(actor, true, 0);
        sch.add(player, true, 1);

        // t = 0
        let nextActor = sch.next();
        sch.setAction(action);
        expect(nextActor.getID()).to.equal(actorID);

        // t = 1
        nextActor = sch.next();
        sch.setAction(playerAction);
        expect(nextActor.getID()).to.equal(playerID);
        expect(nextActor.isPlayer()).to.equal(true);

        // t = 16
        nextActor = sch.next();
        sch.setAction(playerAction);
        expect(nextActor.getID()).to.equal(playerID);
        expect(nextActor.isPlayer()).to.equal(true);
        expect(sch.remove(actor)).to.equal(true);

        // t = 31
        nextActor = sch.next();
        sch.setAction(playerAction);
        expect(nextActor.getID()).to.equal(playerID);
        expect(nextActor.isPlayer()).to.equal(true);

        sch.add(actor, true, 0);
        nextActor = sch.next();
        sch.setAction(action);
        expect(nextActor.getID()).to.equal(1234);
        expect(nextActor.isPlayer()).to.equal(false);
        expect(sch.remove(player)).to.equal(true);

        expect(sch.remove(falseActor)).to.equal(false);

    });

    it('Removes the event like it never happened', () => {
        const sch = new Time.Scheduler();
        const act = new MockAction(100);

        const testActor = new SentientActor('actor');
        // const notZero = 555;
        const changeEvent = new Time.OneShotEvent(emptyTestCB, 200,
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

    it('can remove actors from the scheduler', () => {
        const sch = new Time.Scheduler();
        const actor1 = new SentientActor('actor1');
        const actor2 = new SentientActor('actor2');
        const act1 = new MockAction(100);
        const act2 = new MockAction(101);

        sch.add(actor1, true, 0);
        sch.add(actor2, true, 0);

        console.log('actor1:', actor1.getID(), 'actor2:', actor2.getID());

        let next = sch.next();
        expect(next.getID()).to.equal(actor1.getID());
        sch.setAction(act1);
        next = sch.next();
        expect(next.getID()).to.equal(actor2.getID());
        sch.setAction(act2);
        sch.remove(actor1);
        for (let i = 0; i < 3; i++) {
            next = sch.next();
            sch.setAction(act2);
            expect(next.getID()).to.equal(actor2.getID());
        }

    });
});

const emptyTestCB = () => {};

const MockAction = function(dur) {
    let _dur = dur;

    this.setDuration = dur => {_dur = dur;};
    this.getDuration = () => _dur;
};


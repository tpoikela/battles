
/**
 * Unit tests for checking that the game engine works. This includes things like
 * ECS system ordering and actor scheduling.
 */

import {expect} from 'chai';
import RG from '../../../client/src/rg';

import {Engine} from '../../../client/src/engine';
import {Actor, SentientActor} from '../../../client/src/actor';
import {Keys} from '../../../client/src/keymap';
import * as Component from '../../../client/src/component';
import { EventPool } from '../../../client/src/eventpool';
import { FactoryLevel } from '../../../client/src/factory.level';
import { Dice } from '../../../client/src/dice';

/* Creates a game engine with 2 actors scheduled for actions.*/
const EngineWithActors = function(pool) {
    this.engine = new Engine(pool);
    this.actor = new SentientActor('TestActor');
    this.actor2 = new SentientActor('TestActor2');

    const factLevel = new FactoryLevel();
    const level = factLevel.createLevel('arena', 30, 30);
    level.addActor(this.actor, 1, 1);
    level.addActor(this.actor2, 2, 2);
    this.actor.get('Action').enable();
    this.actor2.get('Action').enable();
    this.level = level;
};

describe('Game.Engine', () => {
    let eng = null;
    let engine = null;
    let pool = null;

    beforeEach( () => {
        pool = EventPool.getPool();
        eng = new EngineWithActors(pool);
        engine = eng.engine;
    });

    it('has game messages', () => {
        let msg = engine.getMessages();
        expect(msg).to.have.length(0);

        const testMsg = 'A test message';
        pool.emitEvent(RG.EVT_MSG, {msg: testMsg});
        expect(engine.hasNewMessages()).to.be.true;
        msg = engine.getMessages();
        expect(engine.hasNewMessages()).to.be.false;
        expect(msg).to.have.length(1);
        expect(msg[0].msg).to.equal(testMsg);

        engine.clearMessages();
        msg = engine.getMessages();
        expect(msg).to.have.length(1);
    });

    it('Executes scheduled actors one by one', () => {
        const actor = eng.actor;
        const action = actor.nextAction({});
        engine.simulateGame();
        engine.simulateGame();
    });

    it('manages a list of active levels', () => {
        const actor = eng.actor;
        expect(engine.nextActor).to.be.null;
        engine.addActiveLevel(eng.level);
        engine.simulateGame();
        expect(engine.nextActor).to.not.be.null;

        const hunger = new Component.Hunger(1000);
        actor.add(hunger);
        actor.getBrain().energy = 10; // Add energy artificially
        const energyBefore = hunger.getEnergy();
        for (let i = 0; i < 10; i++) {
            engine.simulateGame();
            engine.sysMan.updateLoopSystems();
        }
        const energyAfter = hunger.getEnergy();
        expect(energyAfter).to.be.below(energyBefore);

    });

    // This a bit too thorough test for Engine
    it('Uses Systems to manage entity behaviour', () => {
        const timeSystem = engine.sysMan.timeSystems.TimeEffects;

        const poison = new Component.Poison();
        const expiration = new Component.Expiration();
        expiration.addEffect(poison, 20);
        expect(expiration.hasEffects()).to.equal(true);
        expect(expiration.hasEffect(poison)).to.equal(true);
        // poison.setDuration(20);
        poison.setProb(1.0);
        poison.setDamageDie(new Dice(1, 1, 10));
        poison.setSource(eng.actor2);

        const currHP = eng.actor.get('Health').getHP();

        eng.actor.add(expiration);
        eng.actor.add(poison);
        expect(timeSystem.entities).to.have.property(eng.actor.getID());

        engine.simulateGame();
        const remHP = eng.actor.get('Health').getHP();
        expect(remHP < currHP).to.equal(true);

        const expActor2 = eng.actor2.get('Experience').getExp();
        while (eng.actor.get('Health').isAlive()) {
            engine.simulateGame();
        }

        for (let i = 0; i < 10; i++) {engine.simulateGame();}

        expect(eng.actor.has('Poison')).to.equal(false);
        expect(expiration.hasEffect(poison)).to.equal(false);
        expect(expiration.hasEffects()).to.equal(false);

        expect(timeSystem.entities).to.not.have.property(eng.actor.getID());

        // Check that actor2 was given exp for using poison to kill actor2
        const newExpActor2 = eng.actor2.get('Experience').getExp();
        expect(newExpActor2 > expActor2).to.equal(true);

    });

    it('has high-level update() function for GUI', () => {
        const player = new SentientActor('player');
        player.setIsPlayer(true);
        engine.playerCommandCallback = () => true;

        eng.level.addActorToFreeCell(player);
        engine.addActiveLevel(eng.level);
        engine.simulateGame();
        expect(engine.nextActor).to.not.be.null;
        engine.nextActor = player;
        engine.update({code: Keys.KEY.REST});
        expect(engine.nextActor).to.not.be.null;
    });

    it('takes actor speed into account when scheduling', () => {
        engine.simulateGame();
        let nextActor = engine.nextActor;
        while (!nextActor.get) {
            engine.simulateGame();
            nextActor = engine.nextActor;
        }
        nextActor.get('Stats').setSpeed(200);

        const fastID = nextActor.getID();
        const hist = {[fastID]: 0};
        let numIters = 0;
        while (numIters < 100) {
            engine.simulateGame();
            nextActor = engine.nextActor;
            if (nextActor.getID) {
                const id = nextActor.getID();
                ++numIters;
                hist[id] += 1;
            }
        }
        expect(hist[fastID]).to.be.above(60);
        expect(hist[fastID]).to.be.below(70);
    });
});

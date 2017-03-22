
/**
 * Unit tests for checking that the game engine works. This includes things like
 * ECS system ordering and actor scheduling.
 */

var expect = require('chai').expect;
var RG = require('../client/src/battles');

var Game = require('../client/src/game.js');
var Actor = require('../client/src/actor');

/* Creates a game engine with 2 actors scheduled for actions.*/
var setupEngineWithActors = function() {
    this.engine = new Game.Engine();
    this.actor = new Actor.Rogue('TestActor');
    this.actor2 = new Actor.Rogue('TestActor2');

    var level = RG.FACT.createLevel('arena', 30, 30);
    level.addActor(this.actor, 1, 1);
    level.addActor(this.actor2, 2, 2);
    this.actor.get('Action').enable();
    this.actor2.get('Action').enable();
};

describe('Game.Engine', function() {

    var eng = null;
    var engine = null;

    beforeEach( () => {
        eng = new setupEngineWithActors();
        engine = eng.engine;

    });

    it('has game messages', function() {
        var pool = RG.POOL;
        var msg = engine.getMessages();
        expect(msg).to.have.length(0);

        var testMsg = 'A test message';
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

    it('Executes scheduled actors one by one', function() {
        engine.simulateGame();
        engine.simulateGame();
    });

    it('Uses Systems to manage entity behaviour', function() {
        var timeSystem = engine.timeSystems.TimeEffects;

        var poison = new RG.Component.Poison();
        var expiration = new RG.Component.Expiration();
        expiration.addEffect(poison, 20);
        expect(expiration.hasEffects()).to.equal(true);
        expect(expiration.hasEffect(poison)).to.equal(true);
        // poison.setDuration(20);
        poison.setProb(1.0);
        poison.setDamage(new RG.Die(1, 1, 10));
        poison.setSource(eng.actor2);

        var currHP = eng.actor.get('Health').getHP();

        eng.actor.add('Expiration', expiration);
        eng.actor.add('Poison', poison);
        expect(timeSystem.entities).to.have.property(eng.actor.getID());

        engine.simulateGame();
        var remHP = eng.actor.get('Health').getHP();
        expect(remHP < currHP).to.equal(true);

        var expActor2 = eng.actor2.get('Experience').getExp();
        while (eng.actor.get('Health').isAlive()) {
            engine.simulateGame();
        }

        for (var i = 0; i < 10; i++) {engine.simulateGame();}

        expect(eng.actor.has('Poison')).to.equal(false);
        expect(expiration.hasEffect(poison)).to.equal(false);
        expect(expiration.hasEffects()).to.equal(false);

        expect(timeSystem.entities).to.not.have.property(eng.actor.getID());

        // Check that actor2 was given exp for using poison to kill actor2
        var newExpActor2 = eng.actor2.get('Experience').getExp();
        console.log('Old exp: ' + expActor2 + ' new ' + newExpActor2);
        expect(newExpActor2 > expActor2).to.equal(true);

    });
});

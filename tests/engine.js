
/**
 * Unit tests for checking that the game engine works. This includes things like
 * ECS system ordering and actor scheduling.
 */

var chai = require("chai");
var expect = chai.expect;
var RG = require("../battles.js");

var Game = require("../src/game.js");
var Actor = require("../src/actor");

var setupEngineWithActors = function() {
    this.engine = new Game.Engine();
    this.actor = new Actor.Rogue("TestActor");
    this.actor2 = new Actor.Rogue("TestActor2");

    var level = RG.FACT.createLevel("arena", 30, 30);
    level.addActor(this.actor, 1, 1);
    level.addActor(this.actor2, 2, 2);
    this.actor.get("Action").enable();
    this.actor2.get("Action").enable();
};

describe('Game.Engine', function() {
    it('Executes scheduled actors one by one', function() {
        var eng = new setupEngineWithActors();
        var engine = eng.engine;

        engine.simulateGame();
        engine.simulateGame();
    });

    it('Uses Systems to manage entity behaviour', function() {
        var eng = new setupEngineWithActors();
        engine = eng.engine;
        var timeSystem = engine.timeSystems.TimeEffects;

        var poison = new RG.Component.Poison();
        eng.actor.add("Poison", poison);
        expect(timeSystem.entities).to.have.property(eng.actor.getID());
        eng.actor.remove("Poison");
        expect(timeSystem.entities).to.not.have.property(eng.actor.getID());

        eng.actor.add("Poison", poison);
        expect(timeSystem.entities).to.have.property(eng.actor.getID());

    });
});

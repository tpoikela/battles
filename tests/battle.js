
var chai = require("chai");
var expect = chai.expect;
var RG = require("../battles.js");

var RGTest = require("./roguetest.js");

var checkXY = RGTest.checkActorXY;

var Game = require("../src/game.js");
var Actor = RG.Actor.Rogue;
var Fact = RG.FACT;

var RGObjects = require("../data/battles_objects.js");
RG.Effects = require("../data/effects.js");


var globalParser = new RG.ObjectShellParser();
globalParser.parseShellData(RG.Effects);
globalParser.parseShellData(RGObjects);

var addActors = function(army, num, name) {
    for (var i = 0; i < num; i++) {
        var actor = globalParser.createActualObj("actors", name);
        actor.setFOVRange(10);
        army.addActor(actor);
    }
};

describe('Game.Battle', function() {
    it('It is fought until end condition', function() {
        var game = new Game.Main();
        var battle = new Game.Battle("Battle of ice kingdoms");
        var army1 = new Game.Army("Blue army");
        var army2 = new Game.Army("Red army");

        addActors(army1, 1000, "warlord");
        addActors(army2, 1000, "Winter demon");

        var battleLevel = RG.FACT.createLevel("arena", 1005, 4);
        battle.setLevel(battleLevel);
        battle.addArmy(army1, 1, 1);
        battle.addArmy(army2, 1, 2);

        game.addBattle(battle);

        var count = 0;
        while (!battle.isOver() && count < 100000) {
            game.simulateGame();
            ++count;
        }

        console.log("Battle ended after " + count + " turns.");

    });
});

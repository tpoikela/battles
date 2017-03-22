
var expect = require('chai').expect;
var RG = require('../client/src/battles.js');
var Game = require('../client/src/game.js');

var RGObjects = require('../client/data/battles_objects.js');
RG.Effects = require('../client/data/effects.js');

var globalParser = new RG.ObjectShellParser();
globalParser.parseShellData(RG.Effects);
globalParser.parseShellData(RGObjects);

var addActors = function(army, num, name) {
    for (var i = 0; i < num; i++) {
        var actor = globalParser.createActualObj('actors', name);
        actor.setFOVRange(10);
        army.addActor(actor);
    }
};

describe('Game.Battle', function() {
    it('It is fought until end condition', function() {
        var game = new Game.Main();
        var battle = new Game.Battle('Battle of ice kingdoms');
        var army1 = new Game.Army('Blue army');
        var army2 = new Game.Army('Red army');

        addActors(army1, 10, 'warlord');
        addActors(army2, 10, 'Winter demon');

        var battleLevel = RG.FACT.createLevel('arena', 12, 4);
        battle.setLevel(battleLevel);
        battle.addArmy(army1, 1, 1);
        battle.addArmy(army2, 1, 2);

        game.addBattle(battle);

        expect(battle.isOver()).to.equal(false);

        var count = 0;
        while (!battle.isOver() && count < 1000) {
            game.simulateGame();
            ++count;
        }
        expect(battle.isOver()).to.equal(true);


    });
});

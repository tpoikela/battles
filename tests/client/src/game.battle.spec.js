
const expect = require('chai').expect;
const RG = require('../../../client/src/battles.js');
const Game = require('../../..//client/src/game.js');

const RGObjects = require('../../../client/data/battles_objects.js');
RG.Effects = require('../../../client/data/effects.js');

const globalParser = new RG.ObjectShellParser();
globalParser.parseShellData(RG.Effects);
globalParser.parseShellData(RGObjects);

const addActors = function(army, num, name) {
    for (let i = 0; i < num; i++) {
        const actor = globalParser.createActualObj('actors', name);
        actor.setFOVRange(10);
        army.addActor(actor);
    }
};

describe('Game.Battle', function() {
    it('It is fought until end condition', function() {
        const game = new Game.Main();
        const battle = new Game.Battle('Battle of ice kingdoms');
        const army1 = new Game.Army('Blue army');
        const army2 = new Game.Army('Red army');

        addActors(army1, 10, 'warlord');
        addActors(army2, 10, 'Winter demon');

        const battleLevel = RG.FACT.createLevel('arena', 12, 4);
        battle.setLevel(battleLevel);
        battle.addArmy(army1, 1, 1);
        battle.addArmy(army2, 1, 2);

        game.addBattle(battle);

        expect(battle.isOver()).to.equal(false);

        let count = 0;
        while (!battle.isOver() && count < 1000) {
            game.simulateGame();
            ++count;
        }
        expect(battle.isOver()).to.equal(true);
    });
});

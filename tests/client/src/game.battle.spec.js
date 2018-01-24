
const expect = require('chai').expect;
const RG = require('../../../client/src/battles.js');
const Game = require('../../..//client/src/game.js');

const BattleFact = require('../../../client/src/factory.battle');

describe('Game.Battle', () => {
    it('It is fought until end condition', () => {
        const areaLevel = RG.FACT.createLevel('arena', 40, 40);
        const game = new Game.Main();
        game.addLevel(areaLevel);

        const conf = {
            cols: 20, rows: 10,
            armySize: 10
        };
        const battle = new BattleFact(game).createBattle(areaLevel, conf);

        expect(areaLevel.getActors().length).to.equal(0);
        expect(battle.isOver()).to.equal(false);

        let count = 0;
        while (!battle.isOver() && count < 10000) {
            game.simulateGame();
            ++count;
        }
        expect(battle.isOver()).to.equal(true);

        expect(battle.getLevel().getActors().length).to.be.equal(0);

        const survivors = areaLevel.getActors();
        expect(survivors.length).to.be.above(0);

        const func = () => {
            RG.POOL.emitEvent(RG.EVT_ACTOR_KILLED, {actor: survivors[0]});
        };
        expect(func).not.to.throw();
    });

});

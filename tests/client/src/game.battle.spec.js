
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
        const battle = new BattleFact().createBattle(areaLevel, conf);
        game.addBattle(battle);

        const armies = battle.getArmies();
        armies.forEach(army => {
            army.setDefeatThreshold(0);
        });

        expect(areaLevel.getActors().length).to.equal(0);
        expect(battle.isOver()).to.equal(false);

        let count = 0;
        const turnLimit = 10000;
        while (!battle.isOver() && count < turnLimit) {
            game.simulateGame();
            ++count;
        }

        for (let i = 0; i < 10; i++) {
            game.simulateGame();
        }

        expect(battle.isOver()).to.equal(true);
        expect(battle.getLevel().getActors().length).to.be.equal(0);

        const survivors = areaLevel.getActors();
        expect(survivors.length).to.be.above(0);

        // Check that event listeners are properly cleaned up
        const func = () => {
            RG.POOL.emitEvent(RG.EVT_ACTOR_KILLED, {actor: survivors[0]});
        };
        expect(func).not.to.throw();

        survivors.forEach(actor => {
            expect(actor.has('BattleBadge')).to.equal(true);
            expect(actor.has('InBattle')).to.equal(false);
            expect(actor.has('BattleOver')).to.equal(false);
        });
    });

});

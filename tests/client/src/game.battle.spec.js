
const expect = require('chai').expect;
const RG = require('../../../client/src/battles.js');
const Game = require('../../..//client/src/game.js');

const BattleFact = require('../../../client/src/factory.battle');
// const RGTest = require('../../roguetest');

const {Army} = require('../../../client/src/game.battle');

describe('Game.Army', () => {
    it('it has actors', () => {
        const army = new Army();
        const a1 = new RG.Actor.Rogue('soldier');
        const a2 = new RG.Actor.Rogue('pacifist');
        army.addActor(a1);
        expect(army.hasActor(a1)).to.equal(true);
        expect(army.hasActor(a2)).to.equal(false);
    });

    it('responds to ACTOR_KILLED events', () => {
        const MockBattle = {getName: () => 'MockBattle'};
        const army = new Army();
        const a1 = new RG.Actor.Rogue('soldier');
        const a2 = new RG.Actor.Rogue('pacifist');
        army.addActor(a1);
        army.setBattle(MockBattle);

        RG.POOL.emitEvent(RG.EVT_ACTOR_KILLED, {actor: a2});
        expect(army.isDefeated()).to.equal(false);

        RG.POOL.emitEvent(RG.EVT_ACTOR_KILLED, {actor: a1});
        expect(army.isDefeated()).to.equal(true);
    });
});

describe('Game.Battle', function() {
    it('It is fought until end condition', () => {
        const areaLevel = RG.FACT.createLevel('arena', 40, 40);
        const game = new Game.Main();
        game.addLevel(areaLevel);

        const conf = {
            cols: 20, rows: 10,
            armySize: 10, centerX: true, centerY: true
        };
        const battle = new BattleFact().createBattle(areaLevel, conf);
        battle.getLevel().setParent(areaLevel);
        game.addBattle(battle, -1, true);

        const armies = battle.getArmies();
        armies.forEach(army => {
            army.setDefeatThreshold(2);
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
        const battleActors = battle.getLevel().getActors();
        if (battleActors.length > 0) {
            console.log(JSON.stringify(battleActors));
            battle.getLevel().debugPrintInASCII();
            console.log('TILE LEVEL: ');
            areaLevel.debugPrintInASCII();
        }
        expect(battleActors.length, 'battleLevel empty').to.equal(0);

        const survivors = areaLevel.getActors();
        expect(survivors.length).to.be.at.least(4);

        // Check that event listeners are properly cleaned up
        const func = () => {
            RG.POOL.emitEvent(RG.EVT_ACTOR_KILLED, {actor: survivors[0]});
        };
        expect(func).not.to.throw();

        survivors.forEach(actor => {
            const msg = `Actor: ${actor.getName()}`;
            expect(actor.has('BattleBadge'), msg).to.equal(true);
            expect(actor.has('InBattle'), msg).to.equal(false);
            expect(actor.has('BattleOver'), msg).to.equal(false);
        });
    });

});

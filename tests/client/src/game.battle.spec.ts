
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {SentientActor} from '../../../client/src/actor';
import {GameMain} from '../../../client/src/game';
import {FactoryLevel} from '../../../client/src/factory.level';
import {Army, Battle} from '../../../client/src/game.battle';
import {FactoryBattle} from '../../../client/src/factory.battle';
import {EventPool} from '../../../client/src/eventpool';

const POOL = EventPool.getPool();

describe('Game.Army', () => {
    it('it has actors', () => {
        const army = new Army('Puny army');
        const a1 = new SentientActor('soldier');
        const a2 = new SentientActor('pacifist');
        army.addActor(a1);
        expect(army.hasActor(a1)).to.equal(true);
        expect(army.hasActor(a2)).to.equal(false);
    });

    it('responds to ACTOR_KILLED events', () => {
        const MockBattle = {getName: () => 'MockBattle'};
        const army = new Army('Great army');
        const a1 = new SentientActor('soldier');
        const a2 = new SentientActor('pacifist');
        army.addActor(a1);
        army.setBattle(MockBattle);

        POOL.emitEvent(RG.EVT_ACTOR_KILLED, {actor: a2});
        expect(army.isDefeated()).to.equal(false);

        POOL.emitEvent(RG.EVT_ACTOR_KILLED, {actor: a1});
        expect(army.isDefeated()).to.equal(true);
    });
});

describe('Game.Battle', function() {
    it('It is fought until end condition', () => {
        const levelFact = new FactoryLevel();
        const areaLevel = levelFact.createLevel('arena', 40, 40);
        const game = new GameMain();
        game.addLevel(areaLevel);

        const conf = {
            cols: 20, rows: 10,
            armySize: 10, centerX: true, centerY: true,
            factions: ['undead', 'dwarf']
        };
        const battle = new FactoryBattle().createBattle(areaLevel, conf);
        battle.getLevel().setParent(areaLevel);
        game.addBattle(battle, -1, true);

        const armies = battle.getArmies();
        armies.forEach(army => {
            army.setDefeatThreshold(2);
        });

        expect(areaLevel.getActors().length).to.equal(0);
        expect(battle.isOver()).to.equal(false);

        // battle.getLevel().debugPrintInASCII();
        let count = 0;
        const turnLimit = 10000;
        while (!battle.isOver() && count < turnLimit) {
            game.simulateGame();
            ++count;
        }

        for (let i = 0; i < 10; i++) {
            game.simulateGame();
        }

        const battleActors = battle.getLevel().getActors();
        if (battleActors.length > 0) {
            battle.getLevel().debugPrintInASCII();
            areaLevel.debugPrintInASCII();
        }
        expect(battleActors.length, 'battleLevel empty').to.equal(0);
        expect(battle.isOver()).to.equal(true);

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

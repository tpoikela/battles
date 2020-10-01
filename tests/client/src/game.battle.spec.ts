
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {SentientActor} from '../../../client/src/actor';
import {GameMain} from '../../../client/src/game';
import {FactoryLevel} from '../../../client/src/factory.level';
import {Army, Battle} from '../../../client/src/game.battle';
import {FactoryBattle} from '../../../client/src/factory.battle';
import {EventPool} from '../../../client/src/eventpool';
import {Dice} from '../../../client/src/dice';

const POOL = EventPool.getPool();

import {Random} from '../../../client/src/random';

// Used for debugging, when test fails with certain seed


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
        army.setBattle(MockBattle as any);

        army.notify(RG.EVT_ACTOR_KILLED, {actor: a2});
        expect(army.isDefeated()).to.equal(false);

        army.notify(RG.EVT_ACTOR_KILLED, {actor: a1});
        expect(army.isDefeated()).to.equal(true);
    });
});


describe('Game.Battle', function() {

    it('It is fought until end condition', () => {
        const levelFact = new FactoryLevel();
        const areaLevel = levelFact.createLevel('arena', 20, 20);

        const game = new GameMain();
        const seed = Date.now();
        // const seed = 1596354238527;
        Random.getRNG().setSeed(seed);
        game.setRNG(Random.getRNG());
        console.log('Using seed', seed);
        Dice.RNG.setSeed(1234);

        game.addActiveLevel(areaLevel);

        // game._engine.sysMan.get('Movement').debugEnabled = true;

        const conf = {
            cols: 15, rows: 10,
            armySize: 5, centerX: true, centerY: true,
            factions: ['undead', 'dwarf']
        };
        const battle = new FactoryBattle().createBattle(areaLevel, conf);
        battle.getLevel().setParent(battle);
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
            game.simulateGame(1);
            ++count;
            // battle.getLevel().debugPrintInASCII();
        }

        for (let i = 0; i < 10; i++) {
            game.simulateGame(1);
        }

        const battleActors = battle.getLevel().getActors();
        if (battleActors.length > 0) {
            battle.getLevel().debugPrintInASCII(); // Only if fails
            areaLevel.debugPrintInASCII(); // Only if fails
        }
        expect(battleActors.length, 'battleLevel empty').to.equal(0);
        expect(battle.isOver()).to.equal(true);

        const survivors = areaLevel.getActors();
        expect(survivors.length).to.be.at.least(4);

        // Check that event listeners are properly cleaned up
        const func = () => {
            game.getPool().emitEvent(RG.EVT_ACTOR_KILLED, {actor: survivors[0]});
        };
        expect(func).not.to.throw();

        survivors.forEach(actor => {
            const msg = `Actor: ${actor.getName()}`;
            expect(actor.has('BattleBadge'), msg).to.equal(true);
            expect(actor.has('InBattle'), msg).to.equal(false);
            expect(actor.has('BattleOver'), msg).to.equal(false);
        });

        const state = Random.getRNG().toJSON();
        console.log('RNG end state is ', state);
    });

});

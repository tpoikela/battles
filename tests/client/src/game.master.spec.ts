
import chai from 'chai';
import RG from '../../../client/src/rg';
import {WorldTop} from '../../../client/src/world';
import {Keys} from '../../../client/src/keymap';
import {RGTest} from '../../roguetest';
import {chaiBattles} from '../../helpers/chai-battles';
import {PlayerDriver} from '../../helpers/player-driver';

const expect = chai.expect;
chai.use(chaiBattles);

const testBattleDriver = false;

describe('GameMaster', () => {

    it('handles battle creation from events', () => {
        const world: WorldTop = RGTest.createTestWorld();
        const player = RGTest.createPlayer();
        const game = RGTest.createGame({place: world, player});
        const gm = game.getGameMaster();
        gm.setDebug(false);
        const pId = player.getLevel().getID();

        const area = world.getAreas()[0];
        const aT0 = area.getTileXY(0, 0);
        const evtCreate: any = {
            areaTile: aT0
        };
        game.getPool().emitEvent(RG.EVT_CREATE_BATTLE, evtCreate);
        expect(evtCreate.response).to.have.property('battle');

        delete evtCreate.response;
        game.getPool().emitEvent(RG.EVT_CREATE_BATTLE, evtCreate);
        const battles = gm.getBattles(pId);
        expect(battles).to.have.length(2);

        // Move player to one of the levels
        const evtChangeLevel = {
            actor: player, target: battles[0].getLevel(),
            src: aT0.getLevel()
        };
        game.getPool().emitEvent(RG.EVT_LEVEL_CHANGED, evtChangeLevel);
        expect(game.isMenuShown()).to.equal(true);
        game.update({code: Keys.selectIndexToCode(0)});
        expect(game.isMenuShown()).to.equal(false);
        expect(player).to.have.component('InBattle');

        const evtFleeBattle = {
            actor: player, src: battles[0].getLevel(),
            target: aT0.getLevel()
        };
        game.getPool().emitEvent(RG.EVT_LEVEL_CHANGED, evtFleeBattle);
        expect(player).to.have.component('BattleBadge');
        expect(player).not.to.have.component('InBattle');

        // Move player to another battle
        evtChangeLevel.target = battles[1].getLevel();
        game.getPool().emitEvent(RG.EVT_LEVEL_CHANGED, evtChangeLevel);
        game.update({code: Keys.selectIndexToCode(0)});
        expect(player).to.have.component('InBattle');
        gm.setDebug(false);

        for (let i = 0; i < 10; i++) {
            game.update({code: Keys.KEY.REST});
        }

        if (testBattleDriver) {
            const driver = new PlayerDriver(player, game);
            for (let i = 0; i < 100; i++) {
                game.update({code: driver.getNextCode()});
            }
        }
    });
});

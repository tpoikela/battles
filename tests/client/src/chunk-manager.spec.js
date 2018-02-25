
import { expect } from 'chai';

import ChunkManager, {LOAD} from '../../../client/src/chunk-manager';

const RG = require('../../../client/src/battles');
RG.World = require('../../../client/src/world');

const RGTest = require('../../roguetest');

describe('ChunkManager', () => {

    let game = null;
    let area = null;
    let world = null;
    let player = null;

    beforeEach(() => {
        game = new RG.Game.Main();
        area = new RG.World.Area('north', 4, 4, 100, 100);
        world = new RG.World.Top('World');
        player = new RG.Actor.Rogue('player');
        player.setIsPlayer(true);
        world.addArea(area);
        game.addPlace(world);
    });

    it('stores the state of world area/chunks ', () => {
        // game.addPlayer(player);

        const manager = new ChunkManager(game, area);
        expect(game.getLevels().length).to.equal(16);

        const tiles = area.getTiles();
        let level0 = tiles[0][0].getLevel();
        const conns = level0.getConnections();
        const nConns = conns.length;
        expect(nConns).to.be.above(50);
        RGTest.verifyConnectivity(conns, 'Tile level 0,0 OK');

        manager.serializeArea();
        expect(game.getLevels().length).to.equal(0);
        expect(manager.getLoadState(0, 0)).to.equal(LOAD.JSON);

        manager.setPlayerTile(0, 0);
        expect(manager.getLoadState(0, 0)).to.equal(LOAD.LOADED);
        expect(manager.getLoadState(0, 1)).to.equal(LOAD.LOADED);
        expect(manager.getLoadState(1, 0)).to.equal(LOAD.LOADED);
        expect(manager.getLoadState(1, 1)).to.equal(LOAD.LOADED);

        level0 = manager.area.getTiles()[1][0].getLevel();
        // const tile10 = manager.area.getTiles()[1][0];

        const conns0 = level0.getConnections();
        RGTest.verifyConnectivity(conns0, 'Tile level 0,0 OK');

        level0 = manager.area.getTiles()[0][0].getLevel();
        const newConns = level0.getConnections();
        const newNConns = newConns.length;
        RGTest.verifyConnectivity(newConns, 'Tile level 0,0 OK');
        expect(game.getLevels().length).to.equal(4);
        expect(newNConns).to.equal(nConns);

        manager.setPlayerTile(1, 0, 0, 0);
        expect(manager.getLoadState(2, 0)).to.equal(LOAD.LOADED);
        expect(manager.getLoadState(2, 1)).to.equal(LOAD.LOADED);
        expect(game.getLevels().length).to.equal(6);

        manager.setPlayerTile(2, 0, 1, 0);
        expect(manager.getLoadState(0, 0)).to.equal(LOAD.JSON);
        expect(manager.getLoadState(0, 1)).to.equal(LOAD.JSON);
        expect(manager.getLoadState(3, 0)).to.equal(LOAD.LOADED);
        expect(manager.getLoadState(3, 1)).to.equal(LOAD.LOADED);
        expect(game.getLevels().length).to.equal(6);

        manager.setPlayerTile(2, 1, 2, 0);
        expect(game.getLevels().length).to.equal(9);
    });

    it('loads/restores chunks when player moves', () => {
        game.addPlayer(player);
        const manager = game.getChunkManager();
        expect(manager).to.exist;

        const playerLevel = player.getLevel();
        RG.POOL.emitEvent(RG.EVT_TILE_CHANGED, {actor: player,
            target: playerLevel});

        const playerPos = game.getPlayerOwPos();
        expect(playerPos).to.deep.equal([]);

        game.movePlayer(3, 3);
        expect(manager.getLoadState(3, 3)).to.equal(LOAD.LOADED);
        expect(manager.getLoadState(3, 2)).to.equal(LOAD.LOADED);
        expect(manager.getLoadState(2, 3)).to.equal(LOAD.LOADED);
        expect(manager.getLoadState(2, 2)).to.equal(LOAD.LOADED);

        const numLoaded = manager.getNumInState(LOAD.LOADED);
        const numJSON = manager.getNumInState(LOAD.JSON);
        expect(numLoaded).to.equal(4);
        expect(numJSON).to.equal(4 * 4 - numLoaded);

        const levels = area.getLevels();
        levels.forEach(level => {
            const msg = `Level ${level.getID()} has parent`;
            expect(level.getParent(), msg).to.exist;
        });
    });

    it('prevents loading of the full world after restore', () => {
        game.addPlayer(player);
        const manager = game.getChunkManager();
        expect(manager).to.exist;

        game.movePlayer(2, 2);
        const numLoaded = manager.getNumInState(LOAD.LOADED);
        expect(numLoaded).to.equal(9);

        world.getConf().createAllZones = false;

        const json = game.toJSON();

        const fromJSON = new RG.Game.FromJSON();
        const newGame = fromJSON.createGame(json);
        expect(newGame).to.exist;

        const newManager = newGame.getChunkManager();
        const newNumLoaded = newManager.getNumInState(LOAD.LOADED);
        expect(newNumLoaded).to.equal(9);

    });

});


import { expect } from 'chai';

import ChunkManager, {LOAD, printTileConnections}
    from '../../../client/src/chunk-manager';

const RG = require('../../../client/src/battles');
RG.World = require('../../../client/src/world');

const RGTest = require('../../roguetest');

describe('ChunkManager', () => {

    it('stores the state of world area/chunks ', () => {
        const game = new RG.Game.Main();
        const area = new RG.World.Area('north', 4, 4, 100, 100);
        const world = new RG.World.Top('World');
        const player = new RG.Actor.Rogue('player');
        player.setIsPlayer(true);
        world.addArea(area);
        game.addPlace(world);
        // game.addPlayer(player);

        expect(game.getLevels().length).to.equal(16);
        const manager = new ChunkManager(game, area);

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
});

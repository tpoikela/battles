
import { expect } from 'chai';

import ChunkManager, {LOAD} from '../../../client/src/chunk-manager';

const RG = require('../../../client/src/battles');
RG.World = require('../../../client/src/world');

// const memwatch = require('memwatch-next');

const RGTest = require('../../roguetest');

function printMemUsage(msg) {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    const usedMb = Math.round(used * 100) / 100;
    console.log(`${msg} The script uses approximately ${usedMb} MB`);
}

describe('ChunkManager', function() {
    this.timeout(60000);

    let game = null;
    let area = null;
    let world = null;
    let player = null;
    const sizeX = 4;
    const sizeY = 4;
    const cols = 100;
    const rows = 100;

    beforeEach(() => {
        // memwatch.on('leak', function(info) { console.log(info);});
        // memwatch.on('stats', function(stats) { console.log(stats);});
        printMemUsage('BEFORE_EACH');
        game = new RG.Game.Main();
        area = new RG.World.Area('north', sizeX, sizeY, cols, rows);
        world = new RG.World.Top('World');
        player = new RG.Actor.Rogue('player');
        player.setIsPlayer(true);
        world.addArea(area);
        game.addPlace(world);
        game.setEnableChunkUnload(true);
    });

    it('stores the state of world area/chunks ', () => {
        printMemUsage('START');
        const manager = new ChunkManager(game, area);
        expect(game.getLevels().length).to.equal(sizeX * sizeY);

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

        let [prevX, prevY] = [null, null];

        for (let x = 0; x < sizeX; x++) {
            for (let y = 0; y < sizeY; y++) {
                if (y > 0) {
                    manager.setPlayerTile(x, y, prevX, prevY);
                }
                else {
                    manager.setPlayerTile(x, y);
                }
                const numLoaded = manager.getNumInState(LOAD.LOADED);
                expect(numLoaded).to.be.at.most(10);
                // manager.debugPrint();
                [prevX, prevY] = [x, y];
                // printMemUsage(`setPlayerTile ${x},${y}`);
            }
        }

        printMemUsage('END');
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

        let levels = game.getLevels();
        expect(levels.length).to.equal(5);

        game.movePlayer(2, 2);
        const numLoaded = manager.getNumInState(LOAD.LOADED);
        expect(numLoaded).to.equal(9);

        world.getConf().createAllZones = false;

        let json = game.toJSON();

        let fromJSON = new RG.Game.FromJSON();
        fromJSON.setChunkMode(true);

        console.log('Creating new game now');
        let newGame = fromJSON.createGame(json);
        expect(newGame).to.exist;

        const newManager = newGame.getChunkManager();
        const newNumLoaded = newManager.getNumInState(LOAD.LOADED);
        const newLevels = newGame.getLevels();
        expect(newLevels).to.have.length(10);
        expect(newNumLoaded).to.equal(9);

        const newGameMaster = newGame.getGameMaster();
        let battle = Object.values(newGameMaster.battles)[0];
        expect(battle.getLevel).not.to.exist;

        game.movePlayer(2, 1);
        game.movePlayer(1, 1);
        levels = newGame.getLevels();
        expect(levels.length).to.equal(11);

        battle = Object.values(newGameMaster.battles)[0];
        const battleLevel = battle.getLevel();
        expect(battleLevel).to.exist;

        fromJSON = new RG.Game.FromJSON();
        fromJSON.setChunkMode(true);
        newGame = fromJSON.createGame(json);

        game.movePlayer(2, 1);
        game.movePlayer(3, 1);
        game.movePlayer(3, 2);
        game.movePlayer(3, 1);

        levels = newGame.getLevels();
        const conns = levels.map(l => l.getConnections());
        const nConns = conns.reduce((acc, val) => {acc += val.length;}, 0);

        json = newGame.toJSON();
        fromJSON = new RG.Game.FromJSON();
        fromJSON.setChunkMode(true);
        newGame = fromJSON.createGame(json);

        levels = newGame.getLevels();
        const newConns = levels.map(l => l.getConnections());
        const nConnsAfter = newConns.reduce(
            (acc, val) => {acc += val.length;}, 0);
        expect(nConns).to.equal(nConnsAfter);

        game.movePlayer(3, 2);
        game.movePlayer(3, 1);

    });

});



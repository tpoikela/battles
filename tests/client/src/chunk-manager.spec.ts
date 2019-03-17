
import chai from 'chai';

import RG from '../../../client/src/rg';
import * as World from '../../../client/src/world';
import {RGTest} from '../../roguetest';
import {Chunk} from '../../../client/src/chunk-manager';
import {GameMain} from '../../../client/src/game';
import {Battle} from '../../../client/src/game.battle';
import {chaiBattles} from '../../helpers/chai-battles';
import {SentientActor} from '../../../client/src/actor';
import * as Component from '../../../client/src/component';
import {FromJSON} from '../../../client/src/game.fromjson';
import {EventPool} from '../../../client/src/eventpool';
import {Level} from '../../../client/src/level';

const expect = chai.expect;
chai.use(chaiBattles);

const {ChunkManager, LOAD} = Chunk;

describe('ChunkManager', function() {
    this.timeout(10000);

    let game = null;
    let area = null;
    let world = null;
    let player = null;
    const sizeX = 4;
    const sizeY = 4;
    const cols = 100;
    const rows = 100;

    beforeEach(() => {
        RGTest.enablePrint = false;
        RGTest.printMemUsage('BEFORE_EACH');
        game = new GameMain();
        area = new World.Area('north', sizeX, sizeY, cols, rows);
        world = new World.WorldTop('World');
        player = new SentientActor('player');
        player.setIsPlayer(true);
        world.addArea(area);
        game.addPlace(world);
        game.setEnableChunkUnload(true);
    });

    afterEach(() => {
        RGTest.enablePrint = true;
        game = null;
        area = null;
        world = null;
    });

    it('manager stuff correctly', () => {
        const manager = new ChunkManager(game, area);
        const func = () => {
            manager.setPlayerTile(0, 0);
            manager.setPlayerTile(0, 1, 0, 0);
            manager.setPlayerTile(0, 2, 0, 1);
            manager.setPlayerTile(1, 2, 0, 2);
        };
        expect(func).not.to.throw(Error);
    });

    it('stores the state of world area/chunks ', () => {
        RGTest.printMemUsage('START');
        const manager = new ChunkManager(game, area);
        expect(game.getLevels().length).to.equal(sizeX * sizeY);

        game.getLevels().forEach(level => {
            const qTarget = new Component.QuestTarget();
            qTarget.setTargetType('location');
            qTarget.setTarget(level);
            level.add(qTarget);
        });

        const tiles = area.getTiles();
        let level0 = tiles[0][0].getLevel();
        const conns = level0.getConnections();
        const nConns = conns.length;
        expect(nConns).to.be.above(50);
        RGTest.verifyConnectivity(conns, 'Tile level 0,0 OK');

        // manager.serializeArea();
        manager.setPlayerTile(0, 0);
        expect(game.getLevels().length).to.equal(2 * 2);
        expect(manager.getLoadState(2, 2)).to.equal(LOAD.JSON);
        expect(manager.getLoadState(3, 3)).to.equal(LOAD.JSON);

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
        game.getLevels().forEach(level => {
            expect(level).to.have.component('QuestTarget');
            const qTarget = level.get('QuestTarget');
            expect(qTarget.getTarget()).to.equal(level);
            expect(qTarget.getTargetType()).to.equal('location');
        });

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
                // RGTest.printMemUsage(`setPlayerTile ${x},${y}`);
            }
        }

        RGTest.printMemUsage('END');
    });

    it('loads/restores chunks when player moves', () => {
        game.addPlayer(player);
        const manager = game.getChunkManager();
        expect(manager).to.be.an.instanceof(ChunkManager);

        const playerLevel = player.getLevel();
        const POOL = EventPool.getPool();
        POOL.emitEvent(RG.EVT_TILE_CHANGED, {actor: player,
            target: playerLevel});

        const playerPos = game.getPlayerOwPos();
        expect(playerPos).to.equal(null);

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
            expect(!RG.isNullOrUndef([level.getParent()]), msg).to.equal(true);
        });
    });

    it('prevents loading of the full world after restore', () => {
        const tile00 = area.getTiles()[0][0];
        tile00.getLevel().addActor(player, 1, 1);
        game.addPlayer(player);

        const manager = game.getChunkManager();
        expect(manager).to.be.an.instanceof(ChunkManager);

        let levels = game.getLevels();
        expect(levels.length).to.equal(16);

        game.movePlayer(1, 0); // ChunkManager changes levels to 6
        levels = game.getLevels();
        expect(levels.length).to.equal(6 + 1);
        expect(area.isLoaded(0, 0)).to.equal(true);
        expect(area.isLoaded(0, 2)).to.equal(false);
        expect(area.isLoaded(2, 2)).to.equal(false);

        const numLoaded = manager.getNumInState(LOAD.LOADED);
        expect(numLoaded).to.equal(6);

        world.getConf().createAllZones = false;

        let json = game.toJSON();
        game = null;

        let fromJSON = new FromJSON();
        fromJSON.setChunkMode(true);

        let newGame = new GameMain();
        newGame = fromJSON.createGame(newGame, json);
        expect(newGame).to.exist;

        const newManager = newGame.getChunkManager();
        const newNumLoaded = newManager.getNumInState(LOAD.LOADED);
        const newLevels = newGame.getLevels();
        expect(newLevels).to.have.length(7);
        expect(newNumLoaded).to.equal(6);

        const newGameMaster = newGame.getGameMaster();
        const battle = Object.values(newGameMaster.battles)[0];
        expect(battle).not.to.have.property('getLevel');

        newGame.movePlayer(1, 1);
        newGame.movePlayer(2, 1);
        levels = newGame.getLevels();
        expect(levels.length).to.equal(12);

        const masterBattles = newGameMaster.battles;
        const battleArrays = Object.values(masterBattles);
        const battleObj: Battle = battleArrays[0][0];
        const battleLevel = battleObj.getLevel();
        expect(battleLevel).to.be.an.instanceof(Level);

        json = newGame.toJSON();
        fromJSON = new FromJSON();
        fromJSON.setChunkMode(true);
        newGame = new GameMain();
        newGame = fromJSON.createGame(newGame, json);

        // Simulate player moving around overworld levels
        newGame.movePlayer(2, 1);
        newGame.movePlayer(3, 1);
        newGame.movePlayer(3, 2);
        newGame.movePlayer(3, 1);

        // Store number of connections in all levels
        levels = newGame.getLevels();
        const conns = levels.map(l => l.getConnections());
        const nConns = conns.reduce((acc, val) => {acc += val.length;}, 0);

        // Serialize game, restore using chunkMode
        json = newGame.toJSON();
        fromJSON = new FromJSON();
        fromJSON.setChunkMode(true);
        newGame = new GameMain();
        newGame = fromJSON.createGame(newGame, json);

        // Get num of connections now, compare to prev number
        levels = newGame.getLevels();
        const newConns = levels.map(l => l.getConnections());
        const nConnsAfter = newConns.reduce(
            (acc, val) => {acc += val.length;}, 0);
        expect(nConns).to.equal(nConnsAfter);

        newGame.movePlayer(3, 2);
        newGame.movePlayer(3, 1);
    });

});

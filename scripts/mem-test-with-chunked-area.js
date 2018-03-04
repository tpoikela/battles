
/* eslint import/first: 0 */

require('babel-register');

// const ChunkManager = require('../client/src/chunk-manager');
const heapdump = require('heapdump');

const RG = require('../client/src/battles');
RG.World = require('../client/src/world');
const RGTest = require('../tests/roguetest');

function main() {
    let game = null;
    let area = null;
    let world = null;
    let player = null;
    const sizeX = 8;
    const sizeY = 8;
    const cols = 100;
    const rows = 100;

    // memwatch.on('leak', function(info) { console.log(info);});
    // memwatch.on('stats', function(stats) { console.log(stats);});
    RGTest.printMemUsage('BEFORE_EACH');
    game = new RG.Game.Main();
    area = new RG.World.Area('north', sizeX, sizeY, cols, rows);
    world = new RG.World.Top('World');
    player = new RG.Actor.Rogue('player');
    player.setIsPlayer(true);
    world.addArea(area);
    game.addPlace(world);
    game.setEnableChunkUnload(true);

    RGTest.printMemUsage('START');
    const manager = new RG.ChunkManager(game, area);

    const tiles = area.getTiles();
    let level0 = tiles[0][0].getLevel();
    const conns = level0.getConnections();
    RGTest.verifyConnectivity(conns, 'Tile level 0,0 OK');

    manager.setPlayerTile(0, 0);
    level0 = manager.area.getTiles()[1][0].getLevel();
    // const tile10 = manager.area.getTiles()[1][0];

    const conns0 = level0.getConnections();
    RGTest.verifyConnectivity(conns0, 'Tile level 0,0 OK');

    level0 = manager.area.getTiles()[0][0].getLevel();
    const newConns = level0.getConnections();
    RGTest.verifyConnectivity(newConns, 'Tile level 0,0 OK');

    manager.setPlayerTile(1, 0, 0, 0);
    manager.setPlayerTile(2, 0, 1, 0);
    manager.setPlayerTile(2, 1, 2, 0);

    let [prevX, prevY] = [null, null];

    for (let x = 0; x < sizeX; x++) {
    // for (let x = 0; x < 1; x++) {
        for (let y = 0; y < sizeY; y++) {
            if (y > 0) {
                manager.setPlayerTile(x, y, prevX, prevY);
            }
            else {
                manager.setPlayerTile(x, y);
            }
            // manager.debugPrint();
            [prevX, prevY] = [x, y];
            RGTest.printMemUsage(`setPlayerTile ${x},${y}`);
        }
        if (sizeX === 4) {
            heapdump.writeSnapshot(function(err, fname) {
                if (err) {throw err;}
                console.log('Heap dump written to ' + fname);
            });
        }
    }

    RGTest.printMemUsage('END');
}
main();


const RG = require('./rg');
const FromJSON = require('./game.fromjson');

export const LOAD = Object.freeze(
    {EMPTY: 'EMPTY', LOADED: 'LOADED', JSON: 'JSON', ON_DISK: 'ON_DISK'});
export const CREATE = Object.freeze(
    {EMPTY: 'EMPTY', CREATED: 'CREATED', POPULATED: 'POPULATED'});

export function printTileConnections(msg, tileToConnect, id = -1) {
    console.log(msg);
    if (typeof tileToConnect.getLevel === 'function') {
        if (tileToConnect.getLevel().getID() === id || id === -1) {
            const conns0 = tileToConnect.getLevel().getConnections();
            conns0.forEach(c => {
                const targetLevel = c.getTargetLevel();
                if (Number.isInteger(targetLevel)) {
                    console.log(`\tTarget ID ${targetLevel} found`);
                }
                else {
                    console.log(`\tMap.Level ${targetLevel.getID()} found`);
                }
            });
        }
    }
    else {
        console.log('Skipping printTileConnections due to json input');

    }
}

/* Chunk manager handles loading/saving of world chunks (World.AreaTiles)
 * from/to memory/disk. It also keeps track of the state of each chunk.
 * */
export default class ChunkManager {

    constructor(game, area, loadState) {
        const [sizeX, sizeY] = [area.getSizeX(), area.getSizeY()];
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.area = area;
        this.game = game;
        this.state = [];
        for (let x = 0; x < sizeX; x++) {
            this.state[x] = [];
            for (let y = 0; y < sizeY; y++) {
                const chunkState = {loadState};
                this.state[x].push(chunkState);
            }
        }

        // From how far the levels are loaded
        this.loadDistX = 1;
        this.loadDistY = 1;

        this.onDiskDistX = sizeX;
        this.onDiskDistY = sizeY;
    }

    setPlayerTile(px, py, oldX, oldY) {
        const moveDir = this.getMoveDir(px, py, oldX, oldY);
        // printTileConnections('setPlayerTile XXX',
        // this.area.getTiles()[1][0], 4);
        const loadedTiles = [];
        for (let x = 0; x < this.sizeX; x++) {
            for (let y = 0; y < this.sizeY; y++) {
                if (this.inLoadRange(px, py, x, y)) {
                    if (!this.isLoaded(x, y)) {
                        // this.loadTile(px, py, x, y, moveDir);
                        loadedTiles.push([x, y]);
                    }
                }
                else if (this.isLoaded(x, y)) {
                    this.unloadTile(px, py, x, y, moveDir);
                }
            }
        }
        if (loadedTiles.length > 0) {
            this.loadTiles(px, py, loadedTiles, moveDir);
        }
    }

    isLoaded(x, y) {
        return this.state[x][y].loadState === LOAD.LOADED;
    }

    /* Returns true if given tile (tx,ty) is within load range from
     * player px,py .*/
    inLoadRange(px, py, tx, ty) {
        for (let x = px - this.loadDistX; x <= px + this.loadDistX; x++) {
            for (let y = py - this.loadDistY; y <= py + this.loadDistY; y++) {
                if (tx === x && ty === y) {return true;}
            }
        }
        return false;
    }

    loadAllTiles() {
        this.setLoadStateAll(LOAD.LOADED);
    }

    /* Loads the serialized/on-disk tile. */
    loadTiles(px, py, loadedTilesXY) {
        const areaTiles = this.area.getTiles();
        console.log('loadFIles: ' + JSON.stringify(loadedTilesXY));
        const loadedAreaTiles = loadedTilesXY.map(
            xy => areaTiles[xy[0]][xy[1]]
        );

        // const tile10 = areaTiles[1][0];
        // printTileConnections('loadTiles XXX before', tile10, 4);

        this.createTiles(loadedAreaTiles);

        // printTileConnections('loadTiles XXX after', tile10, 4);

        loadedTilesXY.forEach(xy => {
            console.log(`ChunkManager load now tile ${xy}`);
            const [tx, ty] = xy;
            this.state[tx][ty].loadState = LOAD.LOADED;
            // Need to create the connections on adjacent tiles
            /*
            const newTile = areaTiles[tx][ty];

            if (moveDir === 'WEST') {
                const newX = tx + 1;
                const tileToConnect = areaTiles[tx + 1][ty];
                if (newX < this.area.getSizeX()) {
                    this.addConnections('WEST', tileToConnect, newTile);
                }
            }
            else if (moveDir === 'EAST') {
                const newX = tx - 1;
                const tileToConnect = areaTiles[tx - 1][ty];
                if (newX < this.area.getSizeX()) {
                    this.addConnections('EAST', tileToConnect, newTile);
                }

            }
            else if (moveDir === 'SOUTH') {
                const newY = ty - 1;
                if (newY >= 0) {
                    this.addConnections('SOUTH', areaTiles[tx][ty - 1]);
                }
            }
            else if (moveDir === 'NORTH') {
                const newY = ty + 1;
                if (newY < this.area.getSizeY) {
                    this.addConnections('NORTH', areaTiles[tx][ty + 1]);
                }
            }
            */
        });
    }

    /* Unloads the tile from memory. */
    unloadTile(px, py, tx, ty, moveDir) {
        const areaTiles = this.area.getTiles();
        this.state[tx][ty].loadState = LOAD.JSON;

        const levels = areaTiles[tx][ty].getLevels();
        this.game.removeLevels(levels);

        areaTiles[tx][ty] = areaTiles[tx][ty].toJSON();

        // Need to replace connections on adjacent tiles
        if (moveDir === 'WEST') {
            const newX = tx - 1;
            if (newX < this.area.getSizeX()) {
                this.removeConnections('EAST', areaTiles[tx - 1][ty]);
            }
        }
        else if (moveDir === 'EAST') {
            const newX = tx + 1;
            if (newX < this.area.getSizeX()) {
                this.removeConnections('WEST', areaTiles[tx + 1][ty]);
            }
        }
        else if (moveDir === 'NORTH') {
            const newY = ty - 1;
            if (newY >= 0) {
                this.removeConnections('SOUTH', areaTiles[tx][ty - 1]);
            }
        }
        else if (moveDir === 'SOUTH') {
            const newY = ty + 1;
            if (newY < this.area.getSizeY) {
                this.removeConnections('NORTH', areaTiles[tx][ty + 1]);
            }
        }
    }

    getLoadState(x, y) {
        return this.state[x][y].loadState;
    }

    serializeArea() {
        this.setLoadStateAll(LOAD.JSON);
        const levels = this.area.getLevels();
        this.game.removeLevels(levels);
        this.levels = levels.map(l => l.toJSON());
        const tiles = this.area.getTiles();
        for (let x = 0; x < this.sizeX; x++) {
            for (let y = 0; y < this.sizeY; y++) {
                tiles[x][y] = tiles[x][y].toJSON();
            }
        }
    }

    toJSON() {
        return {
            state: this.state
        };
    }

    setLoadStateAll(state) {
        this.state.forEach((col, x) => {
            col.forEach((tile, y) => {
                this.state[x][y].loadState = state;
            });
        });
    }

    createTiles(tilesJSON) {
        const fromJSON = new FromJSON();
        fromJSON.chunkMode = true;
        fromJSON.createTiles(this.game, tilesJSON);
    }

    addConnections(dir, tileToConnect, newTile) {
        printTileConnections('XXX', tileToConnect);
        const oppositeDir = this.getOpposite(dir);
        const addedConns = this.getReplacedConnections(dir, tileToConnect);
        const newConns = this.getReplacedConnections(oppositeDir, newTile);
        const fromJSON = new FromJSON();
        const conns = addedConns.concat(newConns);
        const levels = [tileToConnect.getLevel(), newTile.getLevel()];
        fromJSON.connectTileLevels(levels, conns);
    }

    removeConnections(dir, tile) {
        const replacedConns = this.getReplacedConnections(dir, tile);
        replacedConns.forEach(conn => {
            const targetConn = conn.getTargetStairs();
            const connObj = {
                targetLevel: conn.getTargetLevel().getID(),
                targetStairs: {x: targetConn.getX(), y: targetConn.getY()}
            };

            conn.setConnObj(connObj);
        });
    }

    getReplacedConnections(dir, tile) {
        const level = tile.getLevel();
        const conns = level.getConnections();
        if (conns.length === 0) {
            RG.err('ChunkManager', 'getReplacedConnections',
                'No connections found.');
        }
        let replacedConns = [];
        if (dir === 'SOUTH') {
            replacedConns = conns.filter(conn => conn.getY() === tile.rows - 1);
        }
        else if (dir === 'NORTH') {
            replacedConns = conns.filter(conn => conn.getY() === 0);
        }
        else if (dir === 'EAST') {
            replacedConns = conns.filter(conn => conn.getX() === tile.cols - 1);
        }
        else if (dir === 'WEST') {
            replacedConns = conns.filter(conn => conn.getX() === 0);
        }
        return replacedConns;
    }

    getOpposite(dir) {
        switch (dir) {
            case 'NORTH': return 'SOUTH';
            case 'SOUTH': return 'NORTH';
            case 'EAST': return 'WEST';
            case 'WEST': return 'EAST';
            default: RG.err('ChunkManager', 'getOpposite',
                `Illegal dir ${dir} given.`);
        }
        return '';
    }

    /* Returns the player movement direction. */
    getMoveDir(px, py, oldX, oldY) {
        let [dx, dy] = [0, 0];
        let moveDir = '';
        if (!RG.isNullOrUndef([oldX, oldY])) {
            dx = px - oldX;
            dy = py - oldY;
            if (dx !== 0 && dy !== 0) {
                RG.err('ChunkManager', 'setPlayerTile',
                    'Diagonal move not supported');
            }
            if (dx > 0) {moveDir = 'EAST';}
            else if (dx < 0) {moveDir = 'WEST';}
            if (dy > 0) {moveDir = 'SOUTH';}
            else if (dy < 0) {moveDir = 'NORTH';}
        }
        return moveDir;
    }
}



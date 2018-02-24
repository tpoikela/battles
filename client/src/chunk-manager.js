
const RG = require('./rg');
const FromJSON = require('./game.fromjson');

export const LOAD = Object.freeze(
    {EMPTY: 'EMPTY', LOADED: 'LOADED', JSON: 'JSON', ON_DISK: 'ON_DISK'});
export const CREATE = Object.freeze(
    {EMPTY: 'EMPTY', CREATED: 'CREATED', POPULATED: 'POPULATED'});

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
    loadTiles(px, py, loadedTilesXY, moveDir) {
        const areaTiles = this.area.getTiles();
        // areaTiles[tx][ty] = this.createTile(areaTiles[tx][ty]);
        const loadedAreaTiles = loadedTilesXY.map(
            xy => areaTiles[xy[0]][xy[1]]);
        this.createTiles(loadedAreaTiles);

        loadedTilesXY.forEach(xy => {
            const [tx, ty] = xy;
            this.state[tx][ty].loadState = LOAD.LOADED;
            // Need to create the connections on adjacent tiles
            if (moveDir === 'WEST') {
                const newX = tx - 1;
                if (newX < this.area.getSizeX()) {
                    this.addConnections('WEST', areaTiles[tx][tx - 1]);
                }
            }
            else if (moveDir === 'EAST') {
                const newX = tx + 1;
                if (newX < this.area.getSizeX()) {
                    this.addConnections('EAST', areaTiles[tx][tx + 1]);
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
                this.removeConnections('EAST', areaTiles[tx][tx - 1]);
            }
        }
        else if (moveDir === 'EAST') {
            const newX = tx + 1;
            if (newX < this.area.getSizeX()) {
                this.removeConnections('WEST', areaTiles[tx][tx + 1]);
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

    addConnections(dir, tile) {
        const addedConns = this.getReplacedConnections(dir, tile);
    }

    removeConnections(dir, tile) {
        const replacedConns = this.getReplacedConnections(dir, tile);
        replacedConns.forEach(conn => {
            conn.setTargetLevel(conn.getTargetLevel().getID());
            conn.setTargetStairs(conn.getTargetStairs().getID());
        });
    }

    getReplacedConnections(dir, tile) {
        const level = tile.getLevel();
        const conns = level.getConnections();
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



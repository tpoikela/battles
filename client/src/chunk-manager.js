
const RG = require('./rg');
const FromJSON = require('./game.fromjson');
const debug = require('debug')('bitn:ChunkManager');

export const LOAD = Object.freeze(
    {EMPTY: 'EMPTY', LOADED: 'LOADED', JSON: 'JSON', ON_DISK: 'ON_DISK',
        LOADED2JSON: 'LOADED2JSON'});
export const CREATE = Object.freeze(
    {EMPTY: 'EMPTY', CREATED: 'CREATED', POPULATED: 'POPULATED'});

export function printTileConnections(msg, tileToConnect, id = -1) {
    RG.diag(msg);
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

    constructor(game, area) {
        const [sizeX, sizeY] = [area.getSizeX(), area.getSizeY()];
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.area = area;
        this.game = game;
        this.state = [];

        for (let x = 0; x < sizeX; x++) {
            this.state[x] = [];
            for (let y = 0; y < sizeY; y++) {
                if (area.isLoaded(x, y)) {
                    const chunkState = {loadState: LOAD.LOADED};
                    this.state[x].push(chunkState);
                }
                else {
                    const chunkState = {loadState: LOAD.JSON};
                    this.state[x].push(chunkState);
                }
            }
        }

        // From how far the levels are loaded
        this.loadDistX = 1;
        this.loadDistY = 1;

        this.onDiskDistX = sizeX;
        this.onDiskDistY = sizeY;
    }

    /* Must be called when player enters a new tile. Loads/unloads the tiles
     * based on old & new tile coordinates. */
    setPlayerTile(px, py, oldX, oldY) {
        const moveDir = this.getMoveDir(px, py, oldX, oldY);
        if (debug.enabled) {
            debug(`## setPlayerTile START ${oldX},${oldY}->${px},${py}`);
            this.debugPrint();
        }
        const loadedTiles = [];
        for (let x = 0; x < this.sizeX; x++) {
            for (let y = 0; y < this.sizeY; y++) {
                if (this.inLoadRange(px, py, x, y)) {
                    if (!this.isLoaded(x, y)) {
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

        if (debug.enabled) {
            debug(`## setPlayerTile END ${oldX},${oldY}->${px},${py}`);
            this.debugPrint();
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

    /* Returns number of tiles in given load state. */
    getNumInState(loadState) {
        let num = 0;
        for (let x = 0; x < this.sizeX; x++) {
            for (let y = 0; y < this.sizeY; y++) {
                if (this.state[x][y].loadState === loadState) {
                    ++num;
                }
            }
        }
        return num;
    }

    /* Loads the serialized/on-disk tile. */
    loadTiles(px, py, loadedTilesXY, moveDir) {
        const areaTiles = this.area.getTiles();
        debug('loadTiles: ' + JSON.stringify(loadedTilesXY));
        const loadedAreaTiles = loadedTilesXY.map(
            xy => areaTiles[xy[0]][xy[1]]
        );

        this.createTiles(loadedAreaTiles);

        loadedTilesXY.forEach(xy => {
            debug(`ChunkManager load now tile ${xy}`);
            const [tx, ty] = xy;
            this.state[tx][ty].loadState = LOAD.LOADED;
            this.area.setLoaded(tx, ty);

            if (moveDir === '') {
                debug(`Rm adjacent conns to ${tx},${ty}`);
                this.removeAdjacentConnections(areaTiles, px, py, tx, ty);
            }
        });
    }

    // The only case where this is used is when player enters the game, or
    // moves via debugging functions such as Game.movePlayer()
    removeAdjacentConnections(areaTiles, px, py, tx, ty) {
        // 1. If cell to north not in range, unload north conns
        if (!this.inLoadRange(px, py, tx, ty - 1)) {
            if ((ty - 1) >= 0) {
                debug(`Rm NORTH conns from ${tx},${ty}`);
                this.removeConnections('NORTH', areaTiles[tx][ty]);
            }
        }

        // 2. If cell to south not in range, unload south conns
        if (!this.inLoadRange(px, py, tx, ty + 1)) {
            if ((ty + 1) < this.area.getSizeY()) {
                debug(`Rm SOUTH conns from ${tx},${ty}`);
                this.removeConnections('SOUTH', areaTiles[tx][ty]);
            }
        }

        // 3. If cell to east not in range, unload east conns
        if (!this.inLoadRange(px, py, tx + 1, ty)) {
            if ((tx + 1) < this.area.getSizeX()) {
                debug(`Rm EAST conns from ${tx},${ty}`);
                this.removeConnections('EAST', areaTiles[tx][ty]);
            }
        }

        // 4. If cell to west not in range, unload west conns
        if (!this.inLoadRange(px, py, tx - 1, ty)) {
            if ((tx - 1) >= 0) {
                debug(`Rm WEST conns from ${tx},${ty}`);
                this.removeConnections('WEST', areaTiles[tx][ty]);
            }
        }
    }

    /* Unloads the tile from memory. */
    unloadTile(px, py, tx, ty, moveDir) {
        debug(`Unloading tile ${tx},${ty}`);
        const areaTiles = this.area.getTiles();
        this.state[tx][ty].loadState = LOAD.LOADED2JSON;
        this.area.setUnloaded(tx, ty);

        const levels = areaTiles[tx][ty].getLevels();
        this.game.removeLevels(levels);

        // Unload battles associated with this tile
        const battleLevel = areaTiles[tx][ty].getLevel();
        debug(`\tUnloading battles @ ${tx},${ty}, id: ${battleLevel.getID()}`);
        const gameMaster = this.game.getGameMaster();
        gameMaster.unloadBattles(battleLevel);

        if (debug.enabled) {
            const lStr = areaTiles[tx][ty].getLevels().map(l => l.getID());
            debug(`\t-- Unloading levels ${lStr}`);
        }

        areaTiles[tx][ty].removeListeners();
        areaTiles[tx][ty] = areaTiles[tx][ty].toJSON();

        // Need to replace connections on adjacent tiles
        if (moveDir === 'WEST') {
            const newX = tx - 1;
            debug(`Removing connections from tile ${tx - 1},${ty}`);
            if (newX < this.area.getSizeX()) {
                this.removeConnections('EAST', areaTiles[tx - 1][ty]);
            }
        }
        else if (moveDir === 'EAST') {
            const newX = tx + 1;
            debug(`Removing connections from tile ${tx + 1},${ty}`);
            if (newX < this.area.getSizeX()) {
                this.removeConnections('WEST', areaTiles[tx + 1][ty]);
            }
        }
        else if (moveDir === 'NORTH') {
            const newY = ty - 1;
            debug(`Removing connections from tile ${tx},${ty - 1}`);
            if (newY >= 0) {
                this.removeConnections('SOUTH', areaTiles[tx][ty - 1]);
            }
        }
        else if (moveDir === 'SOUTH') {
            const newY = ty + 1;
            debug(`Removing connections from tile ${tx},${ty + 1}`);
            if (newY < this.area.getSizeY()) {
                this.removeConnections('NORTH', areaTiles[tx][ty + 1]);
            }
        }
        else { // Usually starting position, player just appears

            // 1. If cell to north is loaded, rm its south conns
            if (this.inLoadRange(px, py, tx, ty - 1)) {
                if ((ty - 1) >= 0) {
                    if (this.isLoaded(tx, ty - 1)) {
                        debug(`Rm SOUTH conns from ${tx},${ty - 1}`);
                        this.removeConnections('SOUTH', areaTiles[tx][ty - 1]);
                    }
                }
            }

            // 2. If cell to south is loaded, rm its north conns
            if (this.inLoadRange(px, py, tx, ty + 1)) {
                if ((ty + 1) < this.area.getSizeY()) {
                    if (this.isLoaded(tx, ty + 1)) {
                        debug(`Rm NORTH conns from ${tx},${ty + 1}`);
                        this.removeConnections('NORTH', areaTiles[tx][ty + 1]);
                    }
                }
            }

            // 3. If cell to east is loaded, rm its west conns
            if (this.inLoadRange(px, py, tx + 1, ty)) {
                if ((tx + 1) < this.area.getSizeX()) {
                    if (this.isLoaded(tx + 1, ty)) {
                        debug(`Rm WEST conns from ${tx + 1},${ty}`);
                        this.removeConnections('WEST', areaTiles[tx + 1][ty]);
                    }
                }
            }

            // 4. If cell to west is loaded, rm its east conns
            if (this.inLoadRange(px, py, tx - 1, ty)) {
                if ((tx - 1) >= 0) {
                    if (this.isLoaded(tx - 1, ty)) {
                        debug(`Rm EAST conns from ${tx - 1},${ty}`);
                        this.removeConnections('EAST', areaTiles[tx - 1][ty]);
                    }
                }
            }

        }
        this.state[tx][ty].loadState = LOAD.JSON;
    }

    getLoadState(x, y) {
        return this.state[x][y].loadState;
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
        fromJSON.setChunkMode(true);
        fromJSON.createTiles(this.game, tilesJSON);
    }

    addConnections(dir, tileToConnect, newTile) {
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

            if (typeof conn.getTargetLevel().getID === 'function') {
                const connObj = {
                    targetLevel: conn.getTargetLevel().getID(),
                    targetStairs: {x: targetConn.getX(), y: targetConn.getY()}
                };
                conn.setConnObj(connObj);
            }
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
                RG.err('ChunkManager', 'getMoveDir',
                    'Diagonal move not supported');
            }
            if (dx > 0) {moveDir = 'EAST';}
            else if (dx < 0) {moveDir = 'WEST';}
            if (dy > 0) {moveDir = 'SOUTH';}
            else if (dy < 0) {moveDir = 'NORTH';}
        }
        return moveDir;
    }

    /* Prints the state in concise format. */
    debugPrint() {
        let result = '';
        for (let y = 0; y < this.sizeY; y++) {
            for (let x = 0; x < this.sizeX; x++) {
                result += ' ' + this.stateToChar(this.state[x][y]);
            }
            result += ` - ${y} \n`;
        }
        result += '\n\tNum loaded: ' + this.getNumInState(LOAD.LOADED);
        result += '\n\tNum serialized: ' + this.getNumInState(LOAD.JSON);
        result += '\n\tNum on disk: ' + this.getNumInState(LOAD.ON_DISK);
        result += '\n';

        for (let y = 0; y < this.area._sizeY; y++) {
            for (let x = 0; x < this.area._sizeX; x++) {
                const isCreated = this.area.zonesCreated[x + ',' + y];
                const val = isCreated ? ' X ' : ' - ';
                result += `${x},${y}: ` + val + '|';
            }
            result += '\n';
        }
        RG.diag(result);
    }

    /* Converts current state into a single char. */
    stateToChar(state) {
        switch (state.loadState) {
            case LOAD.LOADED: return 'L';
            case LOAD.JSON: return 'J';
            case LOAD.ON_DISK: return 'D';
            case LOAD.EMPTY: return 'E';
            case LOAD.LOADED2JSON: return '*';
            default: return '';
        }
    }
}



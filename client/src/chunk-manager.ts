
import RG from './rg';
import {FromJSON} from './game.fromjson';
import {ElementStairs} from './element';
import {TCoord, LoadStat} from './interfaces';
import {Level} from './level';
import * as World from './world';
import {InMemoryStore} from './persist';

type Stairs = ElementStairs;
type AreaTileObj = World.AreaTileObj;
type IAreaTileJSON = World.IAreaTileJSON;
type AreaTile = World.AreaTile;

import dbg = require('debug');
const debug = dbg('bitn:ChunkManager');
// debug.enabled = true;

function printTileConnections(msg: string, tileToConnect, id = -1) {
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
                    console.log(`\tLevel ${targetLevel.getID()} found`);
                }
            });
        }
    }
    else {
        console.log('Skipping printTileConnections due to json input');
    }
}

interface ChunkState {
    loadState: LoadStat;
}

/* Chunk manager handles loading/saving of world chunks (World.AreaTiles)
 * from/to memory/disk. It also keeps track of the state of each chunk.
 * */
export class ChunkManager {
    public sizeX: number;
    public sizeY: number;

    public loadDistX: number;
    public loadDistY: number;
    public jsonDistX: number;
    public jsonDistY: number;
    public onDiskDistX: number;
    public onDiskDistY: number;

    public area: World.Area;
    public game: any;
    public state: ChunkState[][];

    public useInMemoryStore: boolean; // For testing

    public store: InMemoryStore;

    // Stores how player moves between tiles
    public recordedTileMoves: Array<[TCoord, TCoord]>;

    constructor(game, area: World.Area) {
        const [sizeX, sizeY] = [area.getSizeX(), area.getSizeY()];
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.area = area;
        this.game = game;
        this.state = [];

        this.store = new InMemoryStore(this.game.gameID);
        this.recordedTileMoves = [];

        for (let x = 0; x < sizeX; x++) {
            this.state[x] = [];
            for (let y = 0; y < sizeY; y++) {
                if (area.isLoaded(x, y)) {
                    debug(`new() area ${x},${y} is loaded`);
                    const chunkState = {loadState: LoadStat.LOADED};
                    this.state[x].push(chunkState);
                }
                else if (area.isOnDisk(x, y)) {
                    const chunkState = {loadState: LoadStat.ON_DISK};
                    this.state[x].push(chunkState);
                }
                else {
                    const chunkState = {loadState: LoadStat.JSON};
                    this.state[x].push(chunkState);
                }
            }
        }


        // From how far the levels are loaded
        this.loadDistX = 1;
        this.loadDistY = 1;
        this.jsonDistX = 2;
        this.jsonDistY = 2;
        this.onDiskDistX = 3;
        this.onDiskDistY = 3;
    }

    /* Must be called when player enters a new tile. Loads/unloads the tiles
     * based on old & new tile coordinates. */
    public setPlayerTile(px, py, oldX, oldY): void {
        const moveDir: string = this.getMoveDir(px, py, oldX, oldY);
        if (debug.enabled) {
            debug(`## setPlayerTile START ${oldX},${oldY}->${px},${py}`);
            this.debugPrint();
        }

        this.recordedTileMoves.push([[px, py], [oldX, oldY]]);

        // Will contain only coordinates of serialized tiles to load
        const loadedTiles: TCoord[] = [];
        for (let x = 0; x < this.sizeX; x++) {
            for (let y = 0; y < this.sizeY; y++) {
                if (this.inLoadRange(px, py, x, y)) {
                    if (!this.isLoaded(x, y)) {
                        loadedTiles.push([x, y]);
                    }
                }
                else if (this.isLoaded(x, y)) {
                    if (this.inJSONRange(px, py, x, y)) {
                        this.unloadTile(px, py, x, y, moveDir);
                    }
                    else {
                        this.writeTileToDisk(px, py, x, y, moveDir);
                    }
                }
                else if (this.isJSON(x, y)) {
                    if (!this.inJSONRange(px, py, x, y)) {
                        this.writeTileToDisk(px, py, x, y, moveDir);
                    }
                }
                else if (this.isOnDisk(x, y)) {
                    debug('Checking json range for ', px, py, 'to', x, y);
                    if (this.inJSONRange(px, py, x, y)) {
                        debug('Reading tile from disk now', x, y);
                        this.readTileFromDisk(px, py, x, y, moveDir);
                    }
                }
                else {
                    this.writeTileToDisk(px, py, x, y, moveDir);
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

    public isLoaded(x: number, y: number): boolean {
        return this.state[x][y].loadState === LoadStat.LOADED;
    }

    public isJSON(x: number, y: number): boolean {
        return this.state[x][y].loadState === LoadStat.JSON;
    }

    public isOnDisk(x: number, y: number): boolean {
        return this.state[x][y].loadState === LoadStat.ON_DISK;
    }

    /* Returns true if given tile (tx,ty) is within load range from
     * player px,py .*/
    public inLoadRange(px, py, tx, ty): boolean {
        for (let x = px - this.loadDistX; x <= px + this.loadDistX; x++) {
            for (let y = py - this.loadDistY; y <= py + this.loadDistY; y++) {
                if (tx === x && ty === y) {return true;}
            }
        }
        return false;
    }

    public inJSONRange(px, py, x, y): boolean {
        const dX = Math.abs(x - px);
        const dY = Math.abs(y - py);
        if (dX > this.loadDistX || dY > this.loadDistY) {
            return (dX <= this.jsonDistX && dY <= this.jsonDistY);
        }
        return false;
    }

    public loadAllTiles(): void {
        this.setLoadStateAll(LoadStat.LOADED);
    }

    /* Returns number of tiles in given load state. */
    public getNumInState(loadState: LoadStat): number {
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
    public loadTiles(px, py, loadedTilesXY: TCoord[], moveDir: string): void {
        const areaTiles: AreaTileObj[][] = this.area.getTiles();
        debug('loadTiles: ' + JSON.stringify(loadedTilesXY));

        // If tiles are still on disk, we need to load them first
        loadedTilesXY.forEach((xy: TCoord) => {
            if (this.isOnDisk(xy[0], xy[1])) {
                this.readTileFromDisk(px, py, xy[0], xy[1], moveDir);
            }
        });

        const areaTileToLoadNow: IAreaTileJSON[] = loadedTilesXY.map(xy => {
            const [x, y] = xy;
            if (this.area.isJSON(x, y)) {
                return areaTiles[xy[0]][xy[1]] as IAreaTileJSON;
            }
            RG.err('ChunkManager', 'loadTiles',
                `Cannot load non-JSON tile at ${x},${y}`);
        });

        this.createTiles(areaTileToLoadNow);

        loadedTilesXY.forEach(xy => {
            debug(`ChunkManager load now tile ${xy}`);
            const [tx, ty] = xy;
            this.state[tx][ty].loadState = LoadStat.LOADED;
            this.area.setLoaded(tx, ty);

            if (moveDir === '') {
                debug(`Rm adjacent conns to ${tx},${ty}`);
                this.removeAdjacentConnections(areaTiles, px, py, tx, ty);
            }

            // This is correct TODO remove
            if (xy[0] === 0 && xy[1] === 2) {
                const tiles = this.area.getTiles();
            }
        });

    }

    // The only case where this is used is when player enters the game, or
    // moves via debugging functions such as Game.movePlayer()
    public removeAdjacentConnections(areaTiles, px, py, tx, ty) {
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
    public unloadTile(px, py, tx, ty, moveDir): void {
        debug(`Unloading tile ${tx},${ty}`);
        const areaTiles = this.area.getTiles();
        this.state[tx][ty].loadState = LoadStat.LOADED2JSON;
        this.area.setUnloaded2JSON(tx, ty);

        const tileXY = areaTiles[tx][ty] as World.AreaTile;
        const levels = tileXY.getLevels();
        this.game.removeLevels(levels);

        // Unload battles associated with this tile
        const battleLevel = tileXY.getLevel();
        debug(`\tUnloading battles @ ${tx},${ty}, id: ${battleLevel.getID()}`);
        const gameMaster = this.game.getGameMaster();
        gameMaster.unloadBattles(battleLevel);

        if (debug.enabled) {
            const lStr = tileXY.getLevels().map(l => l.getID());
            debug(`\t-- Unloading levels ${lStr}`);
        }

        tileXY.removeListeners();
        areaTiles[tx][ty] = tileXY.toJSON() as IAreaTileJSON;

        // Need to replace connections on adjacent tiles
        if (moveDir === 'WEST') {
            const newX = tx - 1;
            debug(`Removing connections from tile ${tx - 1},${ty}`);
            if (newX < this.area.getSizeX()) {
                this.removeConnections('EAST', areaTiles[tx - 1][ty] as AreaTile);
            }
        }
        else if (moveDir === 'EAST') {
            const newX = tx + 1;
            debug(`Removing connections from tile ${tx + 1},${ty}`);
            if (newX < this.area.getSizeX()) {
                this.removeConnections('WEST', areaTiles[tx + 1][ty] as AreaTile);
            }
        }
        else if (moveDir === 'NORTH') {
            const newY = ty - 1;
            debug(`Removing connections from tile ${tx},${ty - 1}`);
            if (newY >= 0) {
                this.removeConnections('SOUTH', areaTiles[tx][ty - 1] as AreaTile);
            }
        }
        else if (moveDir === 'SOUTH') {
            const newY = ty + 1;
            debug(`Removing connections from tile ${tx},${ty + 1}`);
            if (newY < this.area.getSizeY()) {
                this.removeConnections('NORTH', areaTiles[tx][ty + 1] as AreaTile);
            }
        }
        else { // Usually starting position, player just appears

            // 1. If cell to north is loaded, rm its south conns
            if (this.inLoadRange(px, py, tx, ty - 1)) {
                if ((ty - 1) >= 0) {
                    if (this.isLoaded(tx, ty - 1)) {
                        debug(`Rm SOUTH conns from ${tx},${ty - 1}`);
                        this.removeConnections('SOUTH', areaTiles[tx][ty - 1] as AreaTile);
                    }
                }
            }

            // 2. If cell to south is loaded, rm its north conns
            if (this.inLoadRange(px, py, tx, ty + 1)) {
                if ((ty + 1) < this.area.getSizeY()) {
                    if (this.isLoaded(tx, ty + 1)) {
                        debug(`Rm NORTH conns from ${tx},${ty + 1}`);
                        this.removeConnections('NORTH', areaTiles[tx][ty + 1] as AreaTile);
                    }
                }
            }

            // 3. If cell to east is loaded, rm its west conns
            if (this.inLoadRange(px, py, tx + 1, ty)) {
                if ((tx + 1) < this.area.getSizeX()) {
                    if (this.isLoaded(tx + 1, ty)) {
                        debug(`Rm WEST conns from ${tx + 1},${ty}`);
                        this.removeConnections('WEST', areaTiles[tx + 1][ty] as AreaTile);
                    }
                }
            }

            // 4. If cell to west is loaded, rm its east conns
            if (this.inLoadRange(px, py, tx - 1, ty)) {
                if ((tx - 1) >= 0) {
                    if (this.isLoaded(tx - 1, ty)) {
                        debug(`Rm EAST conns from ${tx - 1},${ty}`);
                        this.removeConnections('EAST', areaTiles[tx - 1][ty] as AreaTile);
                    }
                }
            }

        }
        this.state[tx][ty].loadState = LoadStat.JSON;
    }

    public writeTileToDisk(px, py, tx, ty, moveDir): void {
        if (this.isLoaded(tx, ty)) {
            this.unloadTile(px, py, tx, ty, moveDir);
        }
        this.state[tx][ty].loadState = LoadStat.JSON2ON_DISK;

        const tileId = this.getTileId(tx, ty);
        const tileJSON = this.area.getTileXY(tx, ty);

        if (!tileJSON) {
            RG.err('ChunkManager', 'writeTileToDisk',
                `Expected JSON, got undefined ${tx},${ty}`);
        }
        this.store.setItem(tileId, tileJSON);

        this.area.setOnDisk(tx, ty, {onDisk: true, tileId,
                            level: (tileJSON! as IAreaTileJSON).level});
        this.state[tx][ty].loadState = LoadStat.ON_DISK;
    }

    public readTileFromDisk(px, py, tx, ty, moveDir): void {
        if (this.isOnDisk(tx, ty)) {
            debug(`Reading ${tx},${ty} from disk now`);
            this.state[tx][ty].loadState = LoadStat.ON_DISK2JSON;
            const tileId = this.getTileId(tx, ty);
            const data = this.store.getItem(tileId);
            this.area.setUnloaded2JSON(tx, ty);
            if (typeof data === 'string') {
                this.area.setTile(tx, ty, JSON.parse(data));
            }
            else {
                this.area.setTile(tx, ty, data);
            }
            this.state[tx][ty].loadState = LoadStat.JSON;
        }
        else {
            RG.err('ChunkManager', 'readTileFromDisk',
                `Tried to read tile ${tx},${ty} from disk: ${this.state}`);
        }
    }

    public getTileId(tx: number, ty: number): string {
        const gameID = this.game.gameID;
        return '' + gameID + ',' + tx + ',' + ty;
    }


    public getLoadState(x: number, y: number): LoadStat {
        return this.state[x][y].loadState;
    }

    public toJSON() {
        const json: any = {
            state: this.state,
            useInMemoryStore: this.useInMemoryStore,
            recordedTileMoves: this.recordedTileMoves
        };
        json.data = this.store.data;
        return json;
    }

    public setLoadStateAll(state: LoadStat) {
        this.state.forEach((col, x) => {
            col.forEach((tile, y) => {
                this.state[x][y].loadState = state;
            });
        });
    }

    public createTiles(tilesJSON: IAreaTileJSON[]): void {
        const nTiles = tilesJSON.length;
        debug(`Creating ${nTiles} AreaTiles with FromJSON`);
        const fromJSON = new FromJSON();
        fromJSON.setChunkMode(true);
        fromJSON.createTiles(this.game, tilesJSON);
    }

    public addConnections(dir, tileToConnect, newTile): void {
        const oppositeDir = this.getOpposite(dir);
        const addedConns: Stairs[] = this.getReplacedConnections(dir, tileToConnect);
        const newConns: Stairs[] = this.getReplacedConnections(oppositeDir, newTile);
        const fromJSON = new FromJSON();
        const conns: Stairs[] = addedConns.concat(newConns);
        const levels = [tileToConnect.getLevel(), newTile.getLevel()];
        fromJSON.connectTileLevels(levels, conns);
    }

    public removeConnections(dir: string, tile: World.AreaTile): void {
        const replacedConns: Stairs[] = this.getReplacedConnections(dir, tile);
        replacedConns.forEach(conn => {
            const targetConn = conn.getTargetStairs() as Stairs;
            const targetLevel = conn.getTargetLevel();

            if (targetLevel instanceof Level) {
                const connObj = {
                    targetLevel: targetLevel.getID(),
                    targetStairs: {
                      x: targetConn.getX(),
                      y: targetConn.getY()
                    }
                };
                conn.setConnObj(connObj);
            }
        });
    }

    public getReplacedConnections(dir: string, tile: World.AreaTile): Stairs[] {
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

    public getOpposite(dir: string): string {
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
    public getMoveDir(px, py, oldX, oldY): string {
        let [dx, dy] = [0, 0];
        let moveDir = '';
        if (!RG.isNullOrUndef([oldX, oldY])) {
            dx = px - oldX;
            dy = py - oldY;
            if (dx !== 0 && dy !== 0) {
                const msg = `MOVE: ${oldX},${oldY} -> ${px},${py}`;
                RG.err('ChunkManager', 'getMoveDir',
                    `Diagonal move not supported: ${msg}`);
            }
            if (dx > 0) {moveDir = 'EAST';}
            else if (dx < 0) {moveDir = 'WEST';}
            if (dy > 0) {moveDir = 'SOUTH';}
            else if (dy < 0) {moveDir = 'NORTH';}
        }
        return moveDir;
    }

    /* Prints the state in concise format. */
    public debugPrint(): void {
        let result = '';
        for (let y = 0; y < this.sizeY; y++) {
            for (let x = 0; x < this.sizeX; x++) {
                result += ' ' + this.stateToChar(this.state[x][y]);
            }
            result += ` - ${y} \n`;
        }
        result += '\n\tNum loaded: ' + this.getNumInState(LoadStat.LOADED);
        result += '\n\tNum serialized: ' + this.getNumInState(LoadStat.JSON);
        result += '\n\tNum on disk: ' + this.getNumInState(LoadStat.ON_DISK);
        result += '\n';

        for (let y = 0; y < this.area.getSizeY(); y++) {
            for (let x = 0; x < this.area.getSizeX(); x++) {
                const isCreated = this.area.zonesCreated[x + ',' + y];
                const val = isCreated ? ' X ' : ' - ';
                result += `${x},${y}: ` + val + '|';
            }
            result += '\n';
        }
        RG.diag(result);
    }

    /* Converts current state into a single char. */
    public stateToChar(state: ChunkState): string {
        switch (state.loadState) {
            case LoadStat.LOADED: return 'L';
            case LoadStat.JSON: return 'J';
            case LoadStat.ON_DISK: return 'D';
            case LoadStat.EMPTY: return 'E';
            case LoadStat.LOADED2JSON: return '*';
            case LoadStat.JSON2ON_DISK: return 'V'; // Like down arrow
            case LoadStat.ON_DISK2JSON: return '^'; // Like up arrow


            default: return '';
        }
    }

    protected _checkDist(px, py, tx, ty, distX, distY): boolean {
        for (let x = px - distX; x <= px + distX; x++) {
            for (let y = py - distY; y <= py + distY; y++) {
                if (tx === x && ty === y) {return true;}
            }
        }
        return false;
    }
}

export const Chunk: any = {};
Chunk.printTileConnections = printTileConnections;
Chunk.ChunkManager = ChunkManager;

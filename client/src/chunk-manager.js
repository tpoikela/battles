
const RG = require('./rg');

export const LOAD = Object.freeze(
    {EMPTY: 'EMPTY', LOADED: 'LOADED', JSON: 'JSON', ON_DISK: 'ON_DISK'});
export const CREATE = Object.freeze(
    {EMPTY: 'EMPTY', CREATED: 'CREATED', POPULATED: 'POPULATED'});

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
                const chunkState = {loadState: LOAD.LOADED,
                    createState: CREATE.CREATED};
                this.state[x].push(chunkState);
            }
        }
        this.hasNotify = true;
        game.getPool().listenEvent(RG.EVT_TILE_CHANGED, this);

        // From how far the levels are loaded
        this.loadDistX = 1;
        this.loadDistY = 1;

        this.onDiskDistX = sizeX;
        this.onDiskDistY = sizeY;
    }

    getCreateState(x, y) {
        return this.state[x][y].createState;
    }

    setPlayerTile(px, py) {
        for (let x = 0; x < this.sizeX; x++) {
            for (let y = 0; y < this.sizeY; y++) {
                if (this.inLoadRange(px, py, x, y)) {
                    if (!this.isLoaded(x, y)) {
                        this.loadTile(px, py, x, y);
                    }
                }
                else if (this.isLoaded(x, y)) {
                    this.unloadTile(px, py, x, y);
                }
            }
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
    loadTile(px, py, tx, ty) {
        const [dx, dy] = [px - tx, py - ty];
        this.state[tx][ty].loadState = LOAD.LOADED;
        const areaTiles = this.area.getTiles();
        areaTiles[tx][ty] = this.createTile(areaTiles[tx][ty]);

        // Need to create the connections on adjacent tiles
        if (dx > 0 || dy > 0) {

        }
    }

    /* Unloads the tile from memory. */
    unloadTile(px, py, tx, ty) {
        const [dx, dy] = [px - tx, py - ty];
        const areaTiles = this.area.getTiles();
        this.state[tx][ty].loadState = LOAD.JSON;
        areaTiles[tx][ty] = areaTiles[tx][ty].toJSON();

        // Need to replace connections on adjacent tiles
        if (dx > 0 || dy > 0) {

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
        tiles.forEach(tileCol => {
            tileCol.forEach(tile => {
                const currTile = tile;
                tile = currTile.toJSON();
            });
        });
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

    /* Whenever a tile changes, need to get x,y and serialize + load. */
    notify(evtName, args) {
        if (evtName === RG.EVT_TILE_CHANGED) {
            console.log(args);
        }
    }

    createTile(json) {

    }

}



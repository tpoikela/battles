
import RG from './rg';
import {Entity} from './entity';
import {ChunkManager} from './chunk-manager';
import {EventPool} from './eventpool';
import {Engine} from './engine';
import {GameMaster} from './game.master';
import {GameObject} from './game-object';
import {FactoryWorld} from './factory.world';
import {Random} from './random';
import {Geometry} from './geometry';
import {WorldSimulation} from './world.simulation';
import * as Component from './component';
import * as World from './world';
import {Dice} from './dice';
import {CellMap} from './map';
import {TCoord, IPlayerCmdInput} from './interfaces';
import {ObjectShell} from './objectshellparser';

type Cell = import('./map.cell').Cell;
type Level = import('./level').Level;
type Battle = import('./game.battle').Battle;
type SentientActor = import('./actor').SentientActor;
type OWMap = import('./overworld.map').OWMap;
type BrainPlayer = import('./brain').BrainPlayer;
type WorldTop = World.WorldTop;
type WorldBase = World.WorldBase;

const POOL = EventPool.getPool();

export const Game: any = {};

export interface PlaceObj {
    place: string;
    x: number;
    y: number;
}

export interface IPlace extends WorldBase {
    getLevels(): Level[];
}

export interface IGameMain {
    getPlayer(): SentientActor;
}

export interface PlaceData {
    [key: string]: WorldBase;
}

/* Top-level main object for the game.  */
export class GameMain {

    public hasNotify: boolean;

    protected _players: SentientActor[];
    protected _places: PlaceData;
    protected _shownLevel: null | Level;
    protected _gameOver: boolean;
    protected actorsKilled: {[key: number]: boolean};
    protected gameID: number;

    protected _enableChunkUnload: boolean;
    protected _chunkManager: null | ChunkManager;
    protected _eventPool: EventPool;

    protected currPlaceIndex: number;

    protected _rng: Random;
    protected _engine: Engine;
    protected _master: GameMaster;

    protected _worldSim: WorldSimulation;

    protected visibleCells: Cell[];
    protected globalConf: {[key: string]: any};

    protected _overworld: OWMap;

    constructor() {
        this.hasNotify = true;
        this._players = []; // List of players
        this._places = {};
        this._shownLevel = null; // One per game only
        this._gameOver = false;
        this.actorsKilled = {};
        this.gameID = Date.now();

        this._enableChunkUnload = false;
        this._chunkManager = null;
        this._eventPool = POOL;
        POOL.reset();

        this.currPlaceIndex = 0; // Add support for more worlds

        this._rng = new Random();
        this._engine = new Engine(this._eventPool);
        this._master = new GameMaster(this, this._eventPool);

        this._worldSim = new WorldSimulation(this._eventPool);
        this._engine.addRegularUpdate(this._worldSim);
        this._engine.setSystemArgs({worldSim: this._worldSim});

        this.visibleCells = [];
        this.globalConf = {};

        this._engine.playerCommandCallback = this.playerCommandCallback.bind(this);

        // Re-assign the default Engine '() => false' function
        this._engine.isGameOver = this.isGameOver;

        this._eventPool.listenEvent(RG.EVT_ACTOR_KILLED, this);
        this._eventPool.listenEvent(RG.EVT_LEVEL_CHANGED, this);
        this._eventPool.listenEvent(RG.EVT_TILE_CHANGED, this);
        this._eventPool.listenEvent(RG.EVT_TILE_ENTERED, this);
        this._eventPool.listenEvent(RG.EVT_TILE_LEFT, this);

    } // end of constructor

    public setGlobalConf(conf) {this.globalConf = conf;}
    public getGlobalConf() {return this.globalConf;}

    public shownLevel(): Level {return this._shownLevel;}
    public setShownLevel(level: Level) {this._shownLevel = level;}

    public getPool(): EventPool {return this._eventPool;}

    // GUI commands needed for some functions
    public setGUICallbacks(isGUICmd, doGUICmd: (code) => void) {
        this._engine.isGUICommand = isGUICmd;
        this._engine.doGUICommand = doGUICmd;
        const player = this.getPlayer();
        if (player) {
            (player.getBrain() as BrainPlayer).addGUICallback('GOTO', doGUICmd);
        }
    }

    public setRNG(rng: Random): void {
        this._rng = rng;
        Random.setRNG(this._rng);
    }

    public playerCommandCallback(actor) {
        this.visibleCells = actor.getBrain().getSeenCells();
        this._engine.setVisibleArea(this.shownLevel(), this.visibleCells);
    }

    public isGameOver() {return this._gameOver;}

    public getLevels(): Level[] {return this._engine.getLevels();}
    public getComponents(): number[] {
        return this._engine.getComponents();
    }

    public getPlaces(): PlaceData {return this._places;}

    public getLevelsInAllPlaces(): Level[] {
        let levels: Level[] = [];
        Object.values(this._places).forEach((place: any) => {
            levels = levels.concat(place.getLevels());
        });
        return levels;
    }

    public setEnableChunkUnload(enable: boolean = true) {
        this._enableChunkUnload = enable;
        if (enable && this.getArea(0)) {
            const area = this.getArea(0);
            this._chunkManager = new ChunkManager(this, area);
        }
    }

    /* Returns player(s) of the game.*/
    public getPlayer(): SentientActor {
        return this._engine.getPlayer();
    }

    /* Adds player to the game. By default, it's added to the first level if
     * player has no level yet.*/
    public addPlayer(player: SentientActor, obj?: PlaceObj): boolean {
        let levelOK = false;
        this._master.setPlayer(player);
        if (!RG.isNullOrUndef([player.getLevel()])) {
            levelOK = true;
        }
        else if (RG.isNullOrUndef([obj])) {
            levelOK = this._addPlayerToFirstLevel(player, this.getLevels());
        }
        else {
            levelOK = this._addPlayerToPlace(player, obj);
        }

        if (levelOK) {
            this._engine.nextActor = player;
            this._engine.setPlayer(player);

            if (this._shownLevel === null) {
                this._shownLevel = player.getLevel();
            }
            this._players.push(player);
            this._engine.addActiveLevel(player.getLevel());
            player.getLevel().onEnter();
            player.getLevel().onFirstEnter();
        }

        // Used for debugging purposes only
        if (levelOK && this._gameOver) {
            this._gameOver = false;
        }

        return levelOK;
    }

    /* Debug function for taking over controls of a given actor. */
    public useAsPlayer(actorOrID) {
        let actor = actorOrID;
        if (Number.isInteger(actorOrID)) {
            actor = RG.ent(actorOrID);
        }
        if (!actor) {actor = RG.CLICKED_ACTOR;}
        if (actor) {
            actor.setIsPlayer(true);
            actor.add(new Component.Player());
            this.addPlayer(actor);
        }
    }

    /* Moves player to specified area tile. This is used for debugging purposes
     * mainly. Maybe to be used with quick travel system oneday. */
    public movePlayer(tileX: number, tileY: number, levelX = 0, levelY = 0): void {
        const player = this.getPlayer();
        const world: World.WorldTop = this.getCurrentWorld();
        const area: World.Area = world.getAreas()[0];

        let tile = null;
        if (this._enableChunkUnload) {
            if (this._chunkManager) {
                if (this._chunkManager.isLoaded(tileX, tileY)) {
                    tile = area.getTileXY(tileX, tileY);
                }
                else {
                    this._chunkManager.setPlayerTile(tileX, tileY, null, null);
                    tile = area.getTileXY(tileX, tileY);
                }
            }
            else {
                RG.err('GameMain', 'movePlayer',
                    `chunkUnload enabled, but no chunkManager created`);
            }
        }
        else {
            tile = area.getTileXY(tileX, tileY);
        }

        const newLevel = tile.getLevel();
        const currLevel = player.getLevel();

        const [x0, y0] = [player.getX(), player.getY()];
        if (currLevel.removeActor(player)) {
            if (newLevel.addActor(player, levelX, levelY)) {
                POOL.emitEvent(RG.EVT_LEVEL_CHANGED,
                    {target: newLevel,
                        src: currLevel, actor: player});
                POOL.emitEvent(RG.EVT_LEVEL_ENTERED,
                    {actor: player, target: newLevel});

            }
            else if (newLevel.addActorToFreeCell(player)) {
                POOL.emitEvent(RG.EVT_LEVEL_CHANGED,
                    {target: newLevel,
                        src: currLevel, actor: player});
                POOL.emitEvent(RG.EVT_LEVEL_ENTERED,
                    {actor: player, target: newLevel});
            }
            else {
                currLevel.addActor(player, x0, y0);
            }
        }
        else {
            console.error('Could not remove player from level');
        }
    }

    public _addPlayerToFirstLevel(player: SentientActor, levels: Level[]) {
        let levelOK = false;
        if (levels.length > 0) {
            levelOK = levels[0].addActorToFreeCell(player);
            if (!levelOK) {
                RG.err('Game', 'addPlayer', 'Failed to add the player.');
            }
            else {
                this.checkIfTileChanged({actor: player, src: null,
                    target: levels[0]});
            }
        }
        else {
            RG.err('Game', 'addPlayer',
                'No levels exist. Cannot add player.');
        }
        return levelOK;
    }

    /* Adds player to the first found level of given place.
     * Name of place must be
     * specified as obj.place */
    public _addPlayerToPlace(player: SentientActor, obj): boolean {
        if (obj.hasOwnProperty('place')) {
            const place = obj.place;
            if (this._places.hasOwnProperty(place)) {
                if (obj.hasOwnProperty('x') && obj.hasOwnProperty('y')) {
                    const placeObj = this._places[place];
                    if (placeObj.getType() === 'world') {
                        const area = (placeObj as WorldTop).getAreas()[0];

                        if (area.isLoaded(obj.x, obj.y)) {
                            const tile = area.getTileXY(obj.x, obj.y) as World.AreaTile;
                            const levels = [tile.getLevel()];
                            return this._addPlayerToFirstLevel(player, levels);
                        }
                        else {
                            RG.err('GameMain', '_addPlayerToPlace',
                                `Tried to add player to unloaded tile @${obj}`);
                        }
                    }
                    else {
                        RG.err('GameMain', '_addPlayerToPlace',
                        `Tried to add player to non-world: ${placeObj.toJSON()}`);
                    }
                }
                else {
                    const worldPlace: any = this._places[place];
                    if (worldPlace.getLevels) {
                        const levels = worldPlace.getLevels();
                        return this._addPlayerToFirstLevel(player, levels);
                    }
                }
            }
            else {
                RG.err('GameMain', '_addPlayerToPlace',
                    'No place |' + place + '| found.');
            }
        }
        else {
            RG.err('GameMain', '_addPlayerToPlace', 'obj.place must exist.');
        }
        return false;
    }


    /* Checks if player moved to a tile (from tile or was added). */
    public checkIfTileChanged(args): void {
        const {actor, src, target} = args;

        const areaLevels = [target];
        if (!RG.isNullOrUndef([src])) {
            areaLevels.push(src);
        }

        const area = this.getArea(0);
        if (area && (areaLevels.length === 2) && area.hasTiles(areaLevels)) {
            POOL.emitEvent(RG.EVT_TILE_CHANGED,
                {actor, target, src});
        }

        if (this.isTileLevel(target)) {
            POOL.emitEvent(RG.EVT_TILE_ENTERED, {actor, target, src});
        }
        else if (this.isTileLevel(src)) {
            POOL.emitEvent(RG.EVT_TILE_LEFT, {actor, target, src});
        }
    }

    public isTileLevel(level: Level): boolean {
        const area = this.getArea(0);
        if (area) {
            return area.hasTiles([level]);
        }
        return false;
    }

    /* Checks if player exited an explored zone. */
    public checkIfExploredZoneLeft(args) {
        const {actor, src, target} = args;
        let emitEvent = false;
        if (actor.has('GameInfo') && src && target) {
            const srcParent = src.getParent();
            if (srcParent) {
                // Check that player has explored the parent
                if (srcParent.getID) {
                    const id = srcParent.getID();
                    if (actor.get('GameInfo').hasZone(id)) {
                        emitEvent = this.isTileLevel(target);
                    }
                }
                else {
                    RG.warn('GameMain', 'checkIfExploredZoneLeft',
                        'No getID: ' + JSON.stringify(srcParent));
                }
            }
        }

        if (emitEvent) {
            POOL.emitEvent(RG.EVT_EXPLORED_ZONE_LEFT,
                {actor, target, src});
        }
    }

    public getMessages() {return this._engine.getMessages();}
    public clearMessages() { this._engine.clearMessages();}
    public hasNewMessages() {return this._engine.hasNewMessages();}

    /* Adds an actor to scheduler.*/
    public addActor(actor) {this._engine.addActor(actor);}

    /* Removes an actor from a scheduler.*/
    public removeActor(actor) {this._engine.removeActor(actor);}

    /* Adds an event to the scheduler.*/
    public addEvent(gameEvent) {this._engine.addEvent(gameEvent);}

    public addActiveLevel(level) {this._engine.addActiveLevel(level);}

    /* Adds one level to the game.*/
    public addLevel(level) {
        if (!this._engine.hasLevel(level)) {
            this._engine.addLevel(level);
        }
        else {
            this.errorDuplicateLevel('addLevel', level);
        }
    }

    /* Adds given level to the game unless it already exists. */
    public addLevelUnlessExists(level) {
        if (!this._engine.hasLevel(level)) {
            this._engine.addLevel(level);
        }
    }

    public removeLevels(levels) {
        this._engine.removeLevels(levels);
    }

    /* Adds a place (dungeon/area) containing several levels.*/
    public addPlace(place: IPlace): void {
        if (typeof place.getLevels === 'function') {
            const name = place.getName();
            if (!this._places.hasOwnProperty(name) ) {
                const levels = place.getLevels();
                if (levels.length > 0) {
                    // for (let i = 0; i < levels.length; i++) {
                    for (const level of levels) {
                        this.addLevel(level);
                    }
                }
                else {
                    RG.err('GameMain', 'addPlace',
                        `Place ${name} has no levels!`);
                }
                this._places[name] = place;
                this._engine.setSystemArgs({worldTop: place});

                if (this.getArea(0)) {
                    const world: null | WorldTop = this.getCurrentWorld();
                    if (world) {
                        const area = world.getCurrentArea();
                        if (this._enableChunkUnload && !this._chunkManager) {
                            this._chunkManager = new ChunkManager(this, area);
                        }
                    }
                }
            }
            else {
                RG.err('GameMain', 'addPlace',
                    'A place |' + name + '| exists.');
            }
        }
        else {
            RG.err('GameMain', 'addPlace',
                'Added place must have getLevels()');
        }
    }

    public hasPlaces() {return Object.keys(this._places).length > 0;}

    /* Returns the visible map to be rendered by the GUI. */
    public getVisibleMap(): CellMap {
        const player = this.getPlayer();
        const map = player.getLevel().getMap();
        return map;
    }

    public simulate(nTurns: number): void {
        this._engine.simulateGame(nTurns);
    }

    public simulateGame(nTurns: number): void {
        this._engine.simulateGame(nTurns);
    }

    /* Must be called to advance the game by one player action. Non-player
     * actions are executed after the player action.*/
    public update(obj: IPlayerCmdInput) {this._engine.update(obj);}

    public getArea(index: number) {
        const world = this.getCurrentWorld();
        if (world && typeof world.getAreas === 'function') {
            return world.getAreas()[index];
        }
        return null;
    }

    /* Used by the event pool. Game receives notifications about different
     * game events from child components. */
    public notify(evtName, args) {
        if (evtName === RG.EVT_ACTOR_KILLED) {
            this.actorsKilled[args.actor.getID()] = true;
            if (args.actor.isPlayer()) {
                const {actor} = args;
                const index = this._players.indexOf(actor);
                if (index >= 0) {
                    if (this._players.length === 1) {
                        this._gameOver = true;
                        RG.gameMsg('GAME OVER!');
                    }
                    this._players.splice(index, 1);
                }
            }
        }
        else if (evtName === RG.EVT_LEVEL_CHANGED) {
            const {actor} = args;
            if (actor.isPlayer()) {
                this._shownLevel = actor.getLevel();

                this._worldSim.setLevel(this._shownLevel);
                if (this._overworld) {
                    this._worldSim.setOwPos(this.getPlayerOwPos());
                }

                this.checkIfTileChanged(args);
                this.checkIfExploredZoneLeft(args);
            }
        }
        else if (evtName === RG.EVT_TILE_CHANGED) {
            const {actor, target} = args;
            if (actor.isPlayer()) {
                const levelID = target.getID();

                const world = this.getCurrentWorld();
                if (world && world.getAreas) {
                    const area = world.getAreas()[0];
                    const [x, y] = area.findTileXYById(levelID);
                    const fact = new FactoryWorld();
                    fact.setGlobalConf(this.getGlobalConf());

                    let oldX = null;
                    let oldY = null;
                    if (args.src) {
                        const xy = area.findTileXYById(args.src.getID());
                        if (xy) {
                            [oldX, oldY] = xy;
                        }
                    }
                    if (this._enableChunkUnload) {
                        this._chunkManager.setPlayerTile(x, y, oldX, oldY);
                    }

                    fact.createZonesForTile(world, area, x, y);
                    const levels = world.getLevels();
                    levels.forEach((l: Level) => {
                        this.addLevelUnlessExists(l);
                    });
                }
            }
        }
        else if (evtName === RG.EVT_TILE_ENTERED) {
            this._worldSim.setUpdateRates(30);
        }
        else if (evtName === RG.EVT_TILE_LEFT) {
            this._worldSim.setUpdateRates(5);
        }
    }

    /* Adds one battle to the game. If active = true, battle level is activated
     * and battle started immediately. */
    public addBattle(battle: Battle, id = -1, active = false): void {
        const level = battle.getLevel();
        this.addLevel(level);
        if (active) {
            this._engine.addActiveLevel(level);
        }
        if (this.hasPlaces() && id > -1) {
            this._addBattleZoneToArea(battle, id);
        }
    }

    /* Creates a new zone and adds it into area. */
    public _addBattleZoneToArea(battle: Battle, parentID) {
        const level = battle.getLevel();
        const zoneName = 'Zone of ' + battle.getName();
        const battleZone = new World.BattleZone(zoneName);
        battleZone.addLevel(level);

        const world = this.getCurrentWorld();
        const area = world.getAreas()[0];
        const xy = area.findTileXYById(parentID);
        if (xy) {
            battleZone.setTileXY(xy[0], xy[1]);
            area.addZone('BattleZone', battleZone);
        }
        else {
            RG.err('GameMain', '_addBattleZoneToArea',
            `ID ${parentID} not found in area.`);
        }
    }

    public getChunkManager(): null | ChunkManager {
        return this._chunkManager;
    }

    public getGameMaster(): GameMaster {return this._master;}

    public setGameMaster(master: GameMaster) {
        this._master = master;
        this._master.setPlayer(this.getPlayer());
        const world = this.getCurrentWorld();
        if (world) {
            this._master.setWorld(world);
            this._master.setGame(this);
        }
        else {
            RG.warn('GameMain', 'setGameMaster',
                `Cannot set gameMaster without existing world`);
        }
    }

    public getOverWorld(): OWMap {return this._overworld;}

    public setOverWorld(ow: OWMap): void {
      this._overworld = ow;
      this._worldSim.setOverWorld(ow);
      this._engine.setSystemArgs({owMap: ow});
    }

    public setWorldSim(ws: WorldSimulation) {
        ws.setPool(this._eventPool);
        this._worldSim = ws;
        this._engine.setSystemArgs({worldSim: this._worldSim});
    }

    /* Serializes the game object into JSON. */
    public toJSON() {
        const parser = ObjectShell.getParser();
        const obj: any = { // TODO fix typings
            gameID: this.gameID,
            engine: this._engine.toJSON(),
            gameMaster: this._master.toJSON(),
            gameObjectID: GameObject.ID,
            lastComponentID: Component.getIDCount(),
            globalConf: this.globalConf,
            rng: this._rng.toJSON(),
            diceRng: Dice.RNG.toJSON(),
            charStyles: RG.charStyles,
            cellStyles: RG.cellStyles,
            actorsKilled: this.actorsKilled,
            enableChunkUnload: this._enableChunkUnload,
            objectShellParser: parser.toJSON()
        };

        if (!this.hasPlaces()) {
            // Serialize levels directly if there's no world hierarchy
            const levels: Level[] = [];
            const _levels = this._engine.getLevels();
            _levels.forEach((level) => {
                levels.push(level.toJSON());
            });
            obj.levels = levels;
            obj.places = {};
        }
        else {
            const places = { };
            Object.keys(this._places).forEach((name) => {
                const place = this._places[name];
                places[name] = place.toJSON();
            });
            obj.places = places;
        }

        const player = this.getPlayer();
        if (player) {
            obj.player = player.toJSON();
        }
        if (this._overworld) {
            obj.overworld = this._overworld.toJSON();
        }
        if (this._chunkManager) {
            obj.chunkManager = this._chunkManager.toJSON();
        }
        if (this._worldSim) {
            obj.worldSim = this._worldSim.toJSON();
        }

        return obj;
    }

    /* Returns true if the menu is shown instead of the level. */
    public isMenuShown() {
        return this._engine.isMenuShown();
    }

    /* Returns the current menu object. */
    public getMenu() {
        const player = this.getPlayer();
        if (player) {
            return (player.getBrain() as BrainPlayer).getMenu();
        }
        return null;
    }

    /* Sets the function to be called for animations. */
    public setAnimationCallback(cb) {
        if (typeof cb === 'function') {
            this._engine.animationCallback = cb;
        }
        else {
            RG.warn('GameMain', 'setAnimationCallback',
                'Callback must be a function.');
        }
    }

    /* Returns true if engine has animation to play. */
    public hasAnimation() {return this._engine.hasAnimation();}
    public finishAnimation() {return this._engine.finishAnimation();}

    /* Gets the next animation frame. */
    public getAnimationFrame() {return this._engine.animation.nextFrame();}

    public enableAnimations() {this._engine.enableAnimations();}
    public disableAnimations() {this._engine.disableAnimations();}

    /* Returns the player tile position in overworld map. */
    public getPlayerOwPos(): TCoord | null {
        const player = this.getPlayer();
        if (!this._overworld || !player) {
            return null;
        }

        const overworld = this._overworld;
        const world = this.getCurrentWorld();
        const area = world.getAreas()[0];
        let xy = area.findTileXYById(player.getLevel().getID());

        if (!xy) {
          xy = this.tryToGetTileXY();
          if (!xy) {return null;}
        }

        const {xMap, yMap} = overworld.coordMap;

        const coordX = xy[0] * 100 + player.getX();
        const coordY = xy[1] * 100 + player.getY();

        const pX = Math.floor(coordX / xMap);
        const pY = Math.floor(coordY / yMap);
        return [pX, pY];
    }

    /* When player is inside a zone, tries to find the area tile location by
     * traversing the world hierarchy. */
    public tryToGetTileXY() {
      const level = this.getPlayer().getLevel();
      let parent = level.getParent();
      while (parent) {
        if (parent.getParent) {
          parent = parent.getParent();
        }
        else {
          parent = null;
        }

        if (parent && parent.getTileXY) {
          return parent.getTileXY();
        }
      }
      return null;
    }

    public setOverWorldExplored(xy) {
        const box = Geometry.getBoxAround(xy[0], xy[1], 1, true);
        box.forEach((coord) => {
            this._overworld.setExplored(coord);
        });
    }

    /* Returns the current world where the player is .*/
    public getCurrentWorld(): null | WorldTop {
        const places = Object.values(this.getPlaces());
        if (places.length > this.currPlaceIndex) {
            const world = places[this.currPlaceIndex];
            if (world.getType() === 'world') {
                return world as WorldTop;
            }
        }
        return null;
    }

    /* Generic find function for debugging. */
    public find(filter, levelId = -1, filterFunc = 'find'): null | any[] {
        const levels = this._engine.getLevels();
        if (levelId === -1) {
            const level = this.getPlayer().getLevel();
            return level.getActors()[filterFunc](filter);
        }
        else if (Number.isInteger(levelId)) {
            const level = levels.find((l) => l.getID() === levelId);
            if (level) {
                return level.getActors()[filterFunc](filter);
            }
        }
        else { // Search all levels (slow)
            // for (let i = 0; i < levels.length; i++) {
            for (const level of levels) {
                const found = level.getActors()[filterFunc](filter);
                if (found) {return found;}
            }
        }
        return null;
    }

    public errorDuplicateLevel(funcName, level) {
        const parent = level.getParent();
        const json = level.toJSON();
        delete json.elements;
        delete json.map.cells;
        let msg = '';
        if (parent) {
            const name = RG.formatLocationName(level);
            msg = `Parent: ${name}| `;
        }
        msg += 'Duplicate level ID ' + level.getID();
        msg += ' JSON: ' + JSON.stringify(json, null, 1);

        RG.err('GameMain', funcName, msg);
    }

    public entityPrint() {
        RG.diag(Entity.num);
    }

}

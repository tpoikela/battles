
import Entity from './entity';

const RG = require('./rg');
RG.System = require('./system');
RG.Map = require('./map');
RG.Time = require('./time');

RG.EventPool = require('./eventpool');

RG.Game = {};

const Engine = require('./engine');
const GameMaster = require('./game.master');

/* Top-level main object for the game.  */
RG.Game.Main = function() {

    const _players = []; // List of players
    const _levels = []; // List of all levels
    const _places = {}; // List of all places
    let _shownLevel = null; // One per game only
    let _gameOver = false;

    const _eventPool = new RG.EventPool();
    RG.POOL = _eventPool;

    const _engine = new Engine(_eventPool);
    let _master = new GameMaster(this);

    this.globalConf = {};
    this.setGlobalConf = conf => {this.globalConf = conf;};
    this.getGlobalConf = () => this.globalConf;

    this.shownLevel = () => _shownLevel;
    this.setShownLevel = level => {_shownLevel = level;};

    // GUI commands needed for some functions
    this.setGUICallbacks = (isGUICmd, doGUICmd) => {
        _engine.isGUICommand = isGUICmd;
        _engine.doGUICommand = doGUICmd;
    };

    this.playerCommandCallback = function(actor) {
        this.visibleCells = this.shownLevel().exploreCells(actor);
        _engine.setVisibleArea(this.shownLevel(), this.visibleCells);
    };
    _engine.playerCommandCallback = this.playerCommandCallback.bind(this);

    this.isGameOver = () => _gameOver;
    _engine.isGameOver = this.isGameOver;

    this.getLevels = () => _levels;
    this.getPlaces = () => _places;

    /* Returns player(s) of the game.*/
    this.getPlayer = function() {
        return this.currPlayer;
    };

    /* Adds player to the game. By default, it's added to the first level if
     * player has no level yet.*/
    this.addPlayer = function(player, obj) {
        let levelOK = false;
        _master.setPlayer(player);
        if (!RG.isNullOrUndef([player.getLevel()])) {
            console.log('Player already added to level');
            levelOK = true;
        }
        else if (RG.isNullOrUndef([obj])) {
            levelOK = _addPlayerToFirstLevel(player, _levels);
        }
        else {
            console.log('Adding player through place now');
            levelOK = _addPlayerToPlace(player, obj);
        }

        if (levelOK) {
            _engine.nextActor = player;
            this.currPlayer = player;
            if (_shownLevel === null) {_shownLevel = player.getLevel();}
            _players.push(player);
            RG.debug(this, 'Added a player to the Game.');
            _engine.addActiveLevel(player.getLevel());
            player.getLevel().onEnter();
            player.getLevel().onFirstEnter();
        }

        return levelOK;
    };

    /* Moves player to specified area tile. */
    this.movePlayer = function(tileX, tileY) {
        const player = this.getPlayer();
        const world = this.getCurrentWorld();
        const area = world.getAreas()[0];
        const tile = area.getTileXY(tileX, tileY);
        const newLevel = tile.getLevel();
        const currLevel = player.getLevel();

        const [x0, y0] = [player.getX(), player.getY()];
        if (currLevel.removeActor(player)) {
            if (newLevel.addActorToFreeCell(player)) {
                RG.POOL.emitEvent(RG.EVT_LEVEL_CHANGED,
                    {target: newLevel,
                        src: currLevel, actor: player});
                RG.POOL.emitEvent(RG.EVT_LEVEL_ENTERED,
                    {actor: player, target: newLevel});
            }
            else {
                currLevel.addActor(player, x0, y0);
            }
        }
    };

    const _addPlayerToFirstLevel = (player, levels) => {
        let levelOK = false;
        if (levels.length > 0) {
            levelOK = levels[0].addActorToFreeCell(player);
            if (!levelOK) {
                RG.err('Game', 'addPlayer', 'Failed to add the player.');
            }
            else {
                this.checkIfTileChanged({actor: player, src: null,
                    target: levels[0]});
                /* console.log('_addPlayerToFirstLevel tile changed');
                RG.POOL.emitEvent(RG.EVT_TILE_CHANGED,
                    {actor: player, target: levels[0]});*/
            }
        }
        else {
            RG.err('Game', 'addPlayer',
                'No levels exist. Cannot add player.');
        }
        return levelOK;
    };

    /* Adds player to the first found level of given place.
     * Name of place must be
     * specified as obj.place */
    const _addPlayerToPlace = (player, obj) => {
        if (obj.hasOwnProperty('place')) {
            const place = obj.place;
            if (_places.hasOwnProperty(place)) {
                if (obj.hasOwnProperty('x') && obj.hasOwnProperty('y')) {
                    const placeObj = _places[place];
                    const area = placeObj.getAreas()[0];
                    const tile = area.getTileXY(obj.x, obj.y);
                    const levels = [tile.getLevel()];
                    return _addPlayerToFirstLevel(player, levels);
                }
                else {
                    const levels = _places[place].getLevels();
                    return _addPlayerToFirstLevel(player, levels);
                }
            }
            else {
                RG.err('Game.Main', '_addPlayerToPlace',
                    'No place |' + place + '| found.');
            }
        }
        else {
            RG.err('Game.Main', '_addPlayerToPlace', 'obj.place must exist.');
        }
        return false;
    };


    /* Checks if player moved to a tile (from tile or was added). */
    this.checkIfTileChanged = args => {
        const {actor, src, target} = args;

        const areaLevels = [target];
        if (!RG.isNullOrUndef([src])) {
            areaLevels.push(src);
        }

        const area = this.getArea(0);
        if (area && area.hasTiles(areaLevels)) {
            RG.POOL.emitEvent(RG.EVT_TILE_CHANGED,
                {actor, target, src});
        }
    };

    this.getMessages = () => _engine.getMessages();
    this.clearMessages = () => { _engine.clearMessages();};
    this.hasNewMessages = () => _engine.hasNewMessages();

    /* Adds an actor to scheduler.*/
    this.addActor = actor => {_engine.addActor(actor);};

    /* Removes an actor from a scheduler.*/
    this.removeActor = actor => {_engine.removeActor(actor);};

    /* Adds an event to the scheduler.*/
    this.addEvent = gameEvent => {_engine.addEvent(gameEvent);};

    this.addActiveLevel = level => {_engine.addActiveLevel(level);};

    /* Adds one level to the game.*/
    this.addLevel = level => {
        if (!_engine.hasLevel(level)) {
            _levels.push(level);
            _engine.addLevel(level);
        }
        else {
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

            RG.err('Game.Main', 'addLevel', msg);
        }
    };

    /* Adds given level to the game unless it already exists. */
    this.addLevelUnlessExists = level => {
        if (!_engine.hasLevel(level)) {
            _levels.push(level);
            _engine.addLevel(level);
        }
    };

    /* Adds a place (dungeon/area) containing several levels.*/
    this.addPlace = function(place) {
        if (place.hasOwnProperty('getLevels')) {
            const name = place.getName();
            if (!_places.hasOwnProperty(name) ) {
                const levels = place.getLevels();
                if (levels.length > 0) {
                    for (let i = 0; i < levels.length; i++) {
                        this.addLevel(levels[i]);
                    }
                }
                else {
                    RG.err('Game.Main', 'addPlace',
                        `Place ${name} has no levels!`);
                }
                _places[name] = place;
            }
            else {
                RG.err('Game.Main', 'addPlace',
                    'A place |' + name + '| exists.');
            }
        }
        else {
            RG.err('Game.Main', 'addPlace',
                'Added place must have getLevels()');
        }
    };

    /* Returns the visible map to be rendered by the GUI. */
    this.getVisibleMap = function() {
        const player = this.getPlayer();
        const map = player.getLevel().getMap();
        return map;
    };

    this.simulate = () => {_engine.simulateGame();};
    this.simulateGame = () => {_engine.simulateGame();};

    /* Must be called to advance the game by one player action. Non-player
     * actions are executed after the player action.*/
    this.update = obj => {_engine.update(obj);};

    this.getArea = (index) => {
        const world = this.getCurrentWorld();
        if (world && typeof world.getAreas === 'function') {
            return world.getAreas()[index];
        }
        return null;
    };

    /* Used by the event pool. Game receives notifications about different
     * game events from child components. */
    this.hasNotify = true;
    this.notify = (evtName, args) => {
        if (evtName === RG.EVT_ACTOR_KILLED) {
            if (args.actor.isPlayer()) {
                if (_players.length === 1) {
                    _gameOver = true;
                    RG.gameMsg('GAME OVER!');
                }
            }
        }
        else if (evtName === RG.EVT_LEVEL_CHANGED) {
            const {actor} = args;
            if (actor.isPlayer()) {
                _shownLevel = actor.getLevel();
                this.checkIfTileChanged(args);
            }
        }
        else if (evtName === RG.EVT_TILE_CHANGED) {
            const {actor, target} = args;
            if (actor.isPlayer()) {
                const levelID = target.getID();

                const world = Object.values(_places)[0];
                if (world && world.getAreas) {
                    const area = world.getAreas()[0];
                    const [x, y] = area.findTileXYById(levelID);
                    const fact = new RG.Factory.World();
                    fact.setGlobalConf(this.getGlobalConf());
                    fact.createZonesForTile(world, area, x, y);

                    const levels = world.getLevels();
                    levels.forEach(l => {this.addLevelUnlessExists(l);});
                }
            }
        }
    };
    _eventPool.listenEvent(RG.EVT_ACTOR_KILLED, this);
    _eventPool.listenEvent(RG.EVT_LEVEL_CHANGED, this);
    _eventPool.listenEvent(RG.EVT_TILE_CHANGED, this);

    /* Adds one battle to the game. If active = true, battle level is activated
     * and battle started immediately. */
    this.addBattle = (battle, active = false) => {
        const level = battle.getLevel();
        this.addLevel(level);
        if (active) {
            _engine.addActiveLevel(level);
        }
    };

    this.getGameMaster = () => _master;
    this.setGameMaster = master => {
        _master = master;
        _master.setPlayer(this.getPlayer());
        const world = Object.values(_places)[0];
        _master.setWorld(world);
        _master.setGame(this);
    };

    this.getOverWorld = () => this._overworld;
    this.setOverWorld = (ow) => {
      this._overworld = ow;
    };

    /* Serializes the game object into JSON. */
    this.toJSON = function() {
        const levels = [];
        _levels.forEach(level => {
            levels.push(level.toJSON());
        });

        const places = { };
        Object.keys(_places).forEach(name => {
            const place = _places[name];
            places[name] = place.toJSON();
        });

        // TODO places should store their own levels

        const obj = {
            engine: {},
            levels,
            places,
            gameMaster: _master.toJSON(),
            lastLevelID: RG.Map.Level.prototype.idCount,
            lastEntityID: Entity.getIDCount(),
            globalConf: this.globalConf,
            rng: RG.RAND.toJSON(),
            charStyles: RG.charStyles,
            cellStyles: RG.cellStyles
        };

        const player = this.getPlayer();
        if (player) {
            obj.player = player.toJSON();
        }
        if (this._overworld) {
            obj.overworld = this._overworld.toJSON();
        }

        return obj;
    };

    /* Returns true if the menu is shown instead of the level. */
    this.isMenuShown = function() {
        const player = this.getPlayer();
        if (player) {
            return player.getBrain().isMenuShown();
        }
        return false;
    };

    /* Returns the current menu object. */
    this.getMenu = function() {
        const player = this.getPlayer();
        if (player) {
            return player.getBrain().getMenu();
        }
        return null;
    };

    /* Sets the function to be called for animations. */
    this.setAnimationCallback = cb => {
        if (typeof cb === 'function') {
            _engine.animationCallback = cb;
        }
        else {
            RG.warn('Game.Main', 'setAnimationCallback',
                'Callback must be a function.');
        }
    };

    /* Returns true if engine has animation to play. */
    this.hasAnimation = () => _engine.hasAnimation();

    /* Gets the next animation frame. */
    this.getAnimationFrame = () => _engine.animation.nextFrame();

    this.enableAnimations = () => {_engine.enableAnimations();};
    this.disableAnimations = () => {_engine.disableAnimations();};

    /* Returns the player tile position in overworld map. */
    this.getPlayerOwPos = function() {
        if (!this._overworld) {
            return [];
        }
        const overworld = this._overworld;
        const player = this.getPlayer();
        const world = this.getCurrentWorld();
        const area = world.getAreas()[0];
        const xy = area.findTileXYById(player.getLevel().getID());

        if (!xy) {return null;}

        const {xMap, yMap} = overworld.coordMap;

        const coordX = xy[0] * 100 + player.getX();
        const coordY = xy[1] * 100 + player.getY();

        const pX = Math.floor(coordX / xMap);
        const pY = Math.floor(coordY / yMap);

        // overworld.setExplored([pX, pY]);

        return [pX, pY];
    };

    this.setOverWorldExplored = xy => {
        this._overworld.setExplored(xy);
    };

    /* Returns the current world where the player is .*/
    this.getCurrentWorld = function() {
        const currPlaceIndex = 0; // Add support for more worlds
        const places = Object.values(this.getPlaces());
        if (places.length > currPlaceIndex) {
            return places[currPlaceIndex];
        }
        return null;
    };

    /* Generic find function for debugging. */
    this.find = (filter, levelId = -1, filterFunc = 'find') => {
        if (levelId === -1) {
            const level = this.getPlayer().getLevel();
            return level.getActors()[filterFunc](filter);
        }
        else if (Number.isInteger(levelId)) {
            const level = _levels.find(l => l.getID() === levelId);
            if (level) {
                return level.getActors()[filterFunc](filter);
            }
        }
        else { // Search all levels (slow)
            for (let i = 0; i < _levels.length; i++) {
                const found = _levels[i].getActors()[filterFunc](filter);
                if (found) {return found;}
            }
        }
        return null;
    };

}; // }}} Game.Main


/* An object for saving the game in specified storage (local/etc..) or restoring
* the game from saved format. GUI should use this object. */
RG.Game.Save = function() {
    let _storageRef = null;
    let _dungeonLevel = null;

    // Contains names of players for restore selection
    const _playerList = '_battles_player_data_';

    this.setStorage = stor => {_storageRef = stor;};

    this.getDungeonLevel = () => _dungeonLevel;

    /* Main function which saves the full game.*/
    this.save = function(game, conf) {
        this.savePlayer(game, conf);
    };

    /* Restores game/player with the given name.*/
    this.restore = function(name) {
        if (!RG.isNullOrUndef([name])) {
            const game = this.restorePlayer(name);
            return game;
        }
        else {
            RG.err('Game.Save', 'restore', 'No name given (or null/undef).');
        }
        return null;
    };

    /* Returns a list of saved players.*/
    this.getPlayersAsList = function() {
        const dbObj = this.getPlayersAsObj();
        if (dbObj !== null) {
            return Object.keys(dbObj).map(val => dbObj[val]);
        }
        else {
            return [];
        }
    };

    /* Returns an object containing the saved players.*/
    this.getPlayersAsObj = () => {
        _checkStorageValid();
        const dbString = _storageRef.getItem(_playerList);
        return JSON.parse(dbString);
    };

    /* Deletes given player from the list of save games.*/
    this.deletePlayer = name => {
        _checkStorageValid();
        let dbString = _storageRef.getItem(_playerList);
        const dbObj = JSON.parse(dbString);
        if (dbObj.hasOwnProperty(name)) {
            delete dbObj[name];
        }
        dbString = JSON.stringify(dbObj);
        _storageRef.setItem(_playerList, dbString);
    };

    /* Saves a player object. */
    this.savePlayer = (game, conf) => {
        _checkStorageValid();
        const player = game.getPlayer();
        if (!RG.isNullOrUndef([player])) {
            const name = player.getName();
            _savePlayerInfo(name, player.toJSON(), conf);
        }
        else {
            RG.err('Game.Save', 'savePlayer',
                'Cannot save null player. Forgot game.addPlayer?');
        }
    };

    /* Restores a player with given name. */
    this.restorePlayer = function(name) {
        _checkStorageValid();
        const playersObj = this.getPlayersAsObj();
        if (playersObj.hasOwnProperty(name)) {
            const dbString = _storageRef.getItem('_battles_player_' + name);
            const dbObj = JSON.parse(dbString);
            const fromJSON = new RG.Game.FromJSON();
            const game = fromJSON.createGame(dbObj.game);
            _dungeonLevel = fromJSON.getDungeonLevel();
            return game;
        }
        else {
            RG.err('Game.Save', 'restorePlayer',
                'No player |' + name + '| found from the list.');
            return null;
        }
    };

    /* Saves name and level of the player into a list of players/save games.*/
    const _savePlayerInfo = (name, obj, conf) => {
        let dbString = _storageRef.getItem(_playerList);
        let dbObj = JSON.parse(dbString);
        if (dbObj === null) {dbObj = {};}
        dbObj[name] = {
            name,
            expLevel: obj.components.Experience.setExpLevel,
            dungeonLevel: obj.dungeonLevel
        };
        // Capture also game config settings (cols,rows,loot etc)
        for (const p in conf) {
            if (p) {dbObj[name][p] = conf[p];}
        }
        dbString = JSON.stringify(dbObj);
        _storageRef.setItem(_playerList, dbString);
    };

    const _checkStorageValid = () => {
        if (RG.isNullOrUndef([_storageRef])) {
            throw new Error('Game.Save you must setStorage() first.');
        }
    };


};

/* Describes a condition when the player has won the game. 1st version pretty
 * much checks if given actor is killed. */
RG.Game.WinCondition = function(name) {
    const _name = name;
    this.description = ''; // Shown when condition filled

    this._condIncomplete = {};
    this._condFilled = {};

    this.getName = () => _name;

    this._isTrue = false;
    this.isTrue = function() {return this._isTrue;};

    this._notifyCallbacks = {};
    this.addNotifyCallback = function(type, func) {
        this._notifyCallbacks[type] = func;
    };

    this.hasNotify = true;
    this.notify = function(evtName, args) {
        if (this._notifyCallbacks.hasOwnProperty(evtName)) {
            this._notifyCallbacks[evtName](args);
        }

        if (!this._isTrue) {
            if (Object.keys(this._condIncomplete).length === 0) {
                this._isTrue = true;
                this.onTrue();
            }
        }
    };

    /* Add an event to listen to for win condition. */
    this._addEvent = function(type) {
        RG.POOL.listenEvent(type, this);
    };

    this.addActorKilled = function(actor) {
        this._addEvent(RG.EVT_ACTOR_KILLED);
        this._condIncomplete[RG.EVT_ACTOR_KILLED] = [actor.getID()];
    };

    /* Customisable callback fired on condition being true. */
    this.onTrue = function() {
        let msg = `Condition: ${_name}, Description: ${this.description}.`;
        msg += 'Congratulations. You have won!';
        RG.gameSuccess(msg);
        RG.POOL.emitEvent(RG.EVT_WIN_COND_TRUE, {name: _name});
    };

    // Some default callbacks (if not overwritten)
    this._notifyCallbacks[RG.EVT_ACTOR_KILLED] = (args) => {
        const actor = args.actor;
        const actors = this._condIncomplete[RG.EVT_ACTOR_KILLED];
        if (actors) {
            const index = actors.indexOf(actor.getID());
            if (index >= 0) {
                actors.splice(index, 1);
                if (actors.length === 0) {
                    delete this._condIncomplete[RG.EVT_ACTOR_KILLED];
                }
            }
        }
    };


};

module.exports = RG.Game;


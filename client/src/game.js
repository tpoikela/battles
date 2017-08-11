
const RG = require('./rg.js');
RG.System = require('./system.js');
RG.Map = require('./map.js');
RG.Time = require('./time.js');

RG.Game = {};

/* Game engine which handles turn scheduling, systems updates and in-game
 * messaging between objects. */
RG.Game.Engine = function() {

    // Ignore GUI commands by default
    this.isGUICommand = function() {return false;};
    this.doGUICommand = null;

    this.nextActor = null;
    this.simIntervalID = null;

    const _levelMap = {}; // All levels, ID -> level
    const _activeLevels = []; // Only these levels are simulated
    const _scheduler = new RG.Time.Scheduler();
    const _msg = new RG.MessageHandler();

    this.getMessages = function() {return _msg.getMessages();};
    this.hasNewMessages = function() {return _msg.hasNew();};
    this.clearMessages = function() { _msg.clear();};

    //--------------------------------------------------------------
    // ECS SYSTEMS
    //--------------------------------------------------------------

    // These systems updated after each action
    this.systemOrder = ['Stun', 'Attack', 'Missile', 'Movement', 'SpellCast',
        'Damage', 'ExpPoints', 'Communication'];
    this.systems = {};
    this.systems.Stun = new RG.System.Stun('Stun', ['Stun']);
    this.systems.Attack = new RG.System.Attack('Attack', ['Attack']);
    this.systems.Missile = new RG.System.Missile('Missile', ['Missile']);
    this.systems.Movement = new RG.System.Movement('Movement', ['Movement']);
    this.systems.SpellCast = new RG.System.SpellCast('SpellCast',
        ['SpellCast']);
    this.systems.SpellEffect = new RG.System.SpellEffect('SpellEffect',
        ['SpellRay']);
    this.systems.Damage = new RG.System.Damage('Damage', ['Damage', 'Health']);
    this.systems.ExpPoints = new RG.ExpPointsSystem('ExpPoints',
        ['ExpPoints', 'Experience']);
    this.systems.Communication = new RG.System.Communication('Communication',
        ['Communication']);

    // Systems updated once each game loop (once for each player action)
    this.loopSystemOrder = ['Hunger'];
    this.loopSystems = {};
    this.loopSystems.Hunger = new RG.System.Hunger('Hunger',
        ['Action', 'Hunger']);

    // Time-based systems are added to the scheduler directly
    this.timeSystems = {};

    const effects = new RG.System.TimeEffects('TimeEffects',
        ['Expiration', 'Poison']);

    this.updateSystems = function() {
        for (let i = 0; i < this.systemOrder.length; i++) {
            const sysName = this.systemOrder[i];
            this.systems[sysName].update();
        }
    };

    this.updateLoopSystems = function() {
        for (let i = 0; i < this.loopSystemOrder.length; i++) {
            const sysName = this.loopSystemOrder[i];
            this.loopSystems[sysName].update();
        }
    };


    //--------------------------------------------------------------
    // SCHEDULING/ACTIONS
    //--------------------------------------------------------------

    /* Returns next actor from the scheduling queue.*/
    this.getNextActor = function() {
        return _scheduler.next();
    };

    /* Adds an actor to the scheduler. */
    this.addActor = function(actor) {
        _scheduler.add(actor, true, 0);
    };

    /* Removes an actor from a scheduler.*/
    this.removeActor = function(actor) {
        _scheduler.remove(actor);
    };

    /* Adds an event to the scheduler.*/
    this.addEvent = function(gameEvent) {
        const repeat = gameEvent.getRepeat();
        const offset = gameEvent.getOffset();
        _scheduler.add(gameEvent, repeat, offset);
    };

    /* Performs one game action.*/
    this.doAction = function(action) {
        _scheduler.setAction(action);
        action.doAction();
        if (action.hasOwnProperty('energy')) {
            if (action.hasOwnProperty('actor')) {
                const actor = action.actor;
                if (actor.has('Action')) {
                    actor.get('Action').addEnergy(action.energy);
                }
            }
        }
    };

    //--------------------------------------------------------------
    // GAME LOOPS
    //--------------------------------------------------------------

    this.update = function(obj) {
        if (!this.isGameOver()) {
            this.clearMessages();

            if (this.nextActor !== null) {
                if (obj.hasOwnProperty('code')) {
                    const code = obj.code;
                    if (this.isGUICommand(code)) {
                        this.doGUICommand(code);
                    }
                    else {
                        this.updateGameLoop({code});
                    }
                }
                else {
                    this.updateGameLoop(obj);
                }
            }

        }
        else {
            this.clearMessages();
            RG.POOL.emitEvent(RG.EVT_MSG, {msg: 'GAME OVER!'});
            if (this.simIntervalID === null) {
                this.simIntervalID = setInterval(
                    this.simulateGame.bind(this), 1);
            }
        }
    };

    /* Updates the loop by executing one player command, then looping until
     * next player command.*/
    this.updateGameLoop = function(obj) {
        this.playerCommand(obj);
        this.nextActor = this.getNextActor();

        // Next/act until player found, then go back waiting for key...
        while (!this.nextActor.isPlayer() && !this.isGameOver()) {
            const action = this.nextActor.nextAction();
            this.doAction(action);

            this.updateSystems(); // All systems for each actor

            this.nextActor = this.getNextActor();
            if (RG.isNullOrUndef([this.nextActor])) {
                RG.err('Game.Engine', 'updateGameLoop',
                    'Game loop out of events! Fatal!');
                break; // if errors suppressed (testing), breaks the loop
            }
        }

        this.updateLoopSystems(); // Loop systems once per player action

    };

    /* Simulates the game without a player.*/
    this.simulateGame = function() {
        this.nextActor = this.getNextActor();
        if (!this.nextActor.isPlayer()) {
            const action = this.nextActor.nextAction();
            this.doAction(action);
            this.updateSystems();
        }
        else {
            RG.err('Engine', 'simulateGame', "Doesn't work with player.");
        }
    };

    this.playerCommand = function(obj) {
        if (this.nextActor.isPlayer() === false) {
            if (this.nextActor.hasOwnProperty('isEvent')) {
                RG.err('Engine', 'playerCommand',
                    'Expected player, got an event');

            }
            else {
                RG.err('Engine', 'playerCommand',
                    'Expected player, got: ' + this.nextActor.getName()
                );
            }
        }
        const action = this.nextActor.nextAction(obj);
        this.doAction(action);
        this.updateSystems();
        this.playerCommandCallback(this.nextActor);
    };

    //--------------------------------------------------------------
    // MANAGING ACTIVE LEVELS
    //--------------------------------------------------------------

    this.numActiveLevels = function() {return _activeLevels.length;};


    this.hasLevel = function(level) {
        return _levelMap.hasOwnProperty(level.getID());
    };

    /* Adds one level to the game database.*/
    this.addLevel = function(level) {
        const id = level.getID();
        if (!_levelMap.hasOwnProperty(id)) {
            _levelMap[level.getID()] = level;
        }
        else {
            RG.err('Game.Engine', 'addLevel',
                'Level ID ' + id + ' already exists!');
        }
    };


    /* Adds an active level. Only these levels are simulated.*/
    this.addActiveLevel = function(level) {
        const levelID = level.getID();
        const index = _activeLevels.indexOf(levelID);

        // Check if a level must be removed
        if (_activeLevels.length === (RG.MAX_ACTIVE_LEVELS)) {
            if (index === -1) { // No room for new level, pop one
                const removedLevelID = _activeLevels.pop();
                const removedLevel = _levelMap[removedLevelID];
                if (removedLevel) {
                    const rmvActors = removedLevel.getActors();
                    for (let i = 0; i < rmvActors.length; i++) {
                        rmvActors[i].get('Action').disable();
                    }
                    RG.debug(this, 'Removed active level to make space...');
                }
                else {
                    const levelIDs = Object.keys(_levelMap).join(', ');
                    RG.err('Game.Engine', 'addActiveLevel',
                        `Failed to remove level ID ${removedLevelID}.
                        IDs: ${levelIDs}`);
                }
            }
            else { // Level already in actives, move to the front only
                _activeLevels.splice(index, 1);
                _activeLevels.unshift(levelID);
                RG.debug(this, 'Moved level to the front of active levels.');
            }
        }

        // This is a new level, enable all actors by adding Action comp
        if (index === -1) {
            _activeLevels.unshift(levelID);
            const actActors = level.getActors();
            for (let j = 0; j < actActors.length; j++) {
                actActors[j].get('Action').enable();
            }
        }
    };

    this.isGameOver = function() {return false;};


    this.isActiveLevel = function(level) {
        const index = _activeLevels.indexOf(level.getID());
        return index >= 0;
    };

    /* Adds a TimeSystem into the engine. Each system can be updated with given
     * intervals instead of every turn or loop.*/
    this.addTimeSystem = function(name, obj) {
        this.timeSystems[name] = obj;
        // Must schedule the system to activate it
        const updateEvent = new RG.Time.GameEvent(100,
            obj.update.bind(obj), true, 0);
        this.addEvent(updateEvent);
    };
    this.addTimeSystem('TimeEffects', effects);

    //--------------------------------------------------------------
    // EVENT LISTENING
    //--------------------------------------------------------------

    this.hasNotify = true;
    this.notify = function(evtName, args) {
        if (evtName === RG.EVT_DESTROY_ITEM) {
            const item = args.item;

            // chaining due to inventory container
            const owner = item.getOwner().getOwner();
            if (!owner.getInvEq().removeItem(item)) {
                RG.err('Game.Engine', 'notify - DESTROY_ITEM',
                    'Failed to remove item from inventory.');
            }
        }
        else if (evtName === RG.EVT_ACT_COMP_ADDED) {
            if (args.hasOwnProperty('actor')) {
                this.addActor(args.actor);
            }
            else {
                RG.err('Game.Engine', 'notify - ACT_COMP_ADDED',
                    'No actor specified for the event.');
            }
        }
        else if (evtName === RG.EVT_ACT_COMP_REMOVED) {
            if (args.hasOwnProperty('actor')) {
                this.removeActor(args.actor);
            }
            else {
                RG.err('Game.Engine', 'notify - ACT_COMP_REMOVED',
                    'No actor specified for the event.');
            }
        }
        else if (evtName === RG.EVT_ACT_COMP_ENABLED) {
            if (args.hasOwnProperty('actor')) {
                this.addActor(args.actor);
            }
            else {
                RG.err('Game.Engine', 'notify - ACT_COMP_ENABLED',
                    'No actor specified for the event.');
            }
        }
        else if (evtName === RG.EVT_ACT_COMP_DISABLED) {
            if (args.hasOwnProperty('actor')) {
                this.removeActor(args.actor);
            }
            else {
                RG.err('Game', 'notify - ACT_COMP_DISABLED',
                    'No actor specified for the event.');
            }
        }
        else if (evtName === RG.EVT_LEVEL_PROP_ADDED) {
            if (args.propType === 'actors') {
                if (this.isActiveLevel(args.level)) {
                    // args.obj is actor
                    args.obj.get('Action').enable();
                }
            }
        }
        else if (evtName === RG.EVT_LEVEL_CHANGED) {
            const actor = args.actor;
            if (actor.isPlayer()) {
                this.addActiveLevel(actor.getLevel());
                args.src.onExit();
                args.src.onFirstExit();
                args.target.onEnter();
                args.target.onFirstEnter();
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_DESTROY_ITEM, this);
    RG.POOL.listenEvent(RG.EVT_ACT_COMP_ADDED, this);
    RG.POOL.listenEvent(RG.EVT_ACT_COMP_REMOVED, this);
    RG.POOL.listenEvent(RG.EVT_ACT_COMP_ENABLED, this);
    RG.POOL.listenEvent(RG.EVT_ACT_COMP_DISABLED, this);
    RG.POOL.listenEvent(RG.EVT_LEVEL_PROP_ADDED, this);
    RG.POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this);

};

/* Top-level main object for the game.  */
RG.Game.Main = function() {

    const _players = [];   // List of players
    const _levels = [];   // List of all levels
    const _places = {};   // List of all places
    let _shownLevel = null; // One per game only
    let _gameOver = false;

    const _eventPool = new RG.EventPool();
    RG.resetEventPools();
    RG.pushEventPool(_eventPool);

    const _engine = new RG.Game.Engine();

    this.shownLevel = function() {return _shownLevel;};
    this.setShownLevel = function(level) {_shownLevel = level;};

    // GUI commands needed for some functions
    this.setGUICallbacks = function(isGUICmd, doGUICmd) {
        _engine.isGUICommand = isGUICmd;
        _engine.doGUICommand = doGUICmd;
    };

    this.playerCommandCallback = function(actor) {
        this.visibleCells = this.shownLevel().exploreCells(actor);
    };
    _engine.playerCommandCallback = this.playerCommandCallback.bind(this);

    this.isGameOver = function() {
        return _gameOver;
    };
    _engine.isGameOver = this.isGameOver;

    this.getLevels = function() {return _levels;};
    this.getPlaces = function() {
        return _places;
    };

    /* Returns player(s) of the game.*/
    this.getPlayer = function() {
        if (_players.length === 1) {
            return _players[0];
        }
        else if (_players.length > 1) {
            return _players;
        }
        else {
            return null;
        }
    };

    /* Adds player to the game. By default, it's added to the first level if
     * player has no level yet.*/
    this.addPlayer = function(player, obj) {
        let levelOK = false;
        if (!RG.isNullOrUndef([player.getLevel()])) {
            levelOK = true;
        }
        else if (RG.isNullOrUndef([obj])) {
            levelOK = _addPlayerToFirstLevel(player, _levels);
        }
        else {
            levelOK = _addPlayerToPlace(player, obj);
        }

        if (levelOK) {
            _engine.nextActor = player;
            if (_shownLevel === null) {_shownLevel = player.getLevel();}
            _players.push(player);
            RG.debug(this, 'Added a player to the Game.');
            _engine.addActiveLevel(player.getLevel());
            player.getLevel().onEnter();
            player.getLevel().onFirstEnter();
        }

        return levelOK;
    };

    const _addPlayerToFirstLevel = function(player, levels) {
        let levelOK = false;
        if (levels.length > 0) {
            levelOK = levels[0].addActorToFreeCell(player);
            if (!levelOK) {
                RG.err('Game', 'addPlayer', 'Failed to add the player.');
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
    const _addPlayerToPlace = function(player, obj) {
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

    this.getMessages = function() {return _engine.getMessages();};
    this.clearMessages = function() { _engine.clearMessages();};
    this.hasNewMessages = function() {return _engine.hasNewMessages();};

    /* Adds an actor to scheduler.*/
    this.addActor = function(actor) {_engine.addActor(actor);};

    /* Removes an actor from a scheduler.*/
    this.removeActor = function(actor) {_engine.removeActor(actor);};

    /* Adds an event to the scheduler.*/
    this.addEvent = function(gameEvent) {_engine.addEvent(gameEvent);};

    this.addActiveLevel = function(level) {_engine.addActiveLevel(level);};

    /* Adds one level to the game.*/
    this.addLevel = function(level) {
        if (!_engine.hasLevel(level)) {
            _levels.push(level);
            _engine.addLevel(level);
        }
        else {
            RG.err('Game.Main', 'addLevel',
                'Duplicate level ID ' + level.getID());
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

    this.simulateGame = function() {_engine.simulateGame();};

    /* Must be called to advance the game by one player action. Non-player
     * actions are executed after the player action.*/
    this.update = function(obj) {_engine.update(obj);};

    /* Used by the event pool. Game receives notifications about different
     * game events from child components. */
    this.hasNotify = true;
    this.notify = function(evtName, args) {
        if (evtName === RG.EVT_ACTOR_KILLED) {
            if (args.actor.isPlayer()) {
                if (_players.length === 1) {
                    _gameOver = true;
                    RG.gameMsg('GAME OVER!');
                }
            }
        }
        else if (evtName === RG.EVT_LEVEL_CHANGED) {
            const actor = args.actor;
            if (actor.isPlayer()) {
                _shownLevel = actor.getLevel();
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);
    RG.POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this);

    /* Adds one battle to the game. */
    this.addBattle = function(battle) {
        const level = battle.getLevel();
        _engine.addActiveLevel(level);
    };

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
            lastLevelID: RG.Map.Level.prototype.idCount,
            lastEntityID: RG.Entity.prototype.idCount
        };

        const player = this.getPlayer();
        if (player !== null) {
            obj.player = player.toJSON();
        }

        return obj;
    };

    this.isMenuShown = function() {
        const player = this.getPlayer();
        if (player) {
            return player.getBrain().isMenuShown();
        }
        return false;
    };

    this.getMenu = function() {
        const player = this.getPlayer();
        if (player) {
            return player.getBrain().getMenu();
        }
        return null;
    };

}; // }}} Game.Main

/* Army is a collection of actors associated with a battle. This is useful for
 *  battle commanders to have access to their full army. */
RG.Game.Army = function(name) {
    const _name = name;
    const _actors = []; // All actors inside this army

    let _battle = null;
    let _casualties = 0;
    let _defeatThreshold = 0;

    this.getName = function() {return _name;};

    this.setDefeatThreshold = function(numActors) {
        _defeatThreshold = numActors;
    };

    /* Default defeat is when all actors have been eliminated.*/
    this.isDefeated = function() {
        if (_actors.length <= _defeatThreshold) {
            return true;
        }
        return false;
    };

    this.setBattle = function(battle) {_battle = battle;};
    this.getBattle = function() {return _battle;};

    this.getCasualties = function() {
        return _casualties;
    };

    this.getActors = function() {return _actors;};

    this.hasActor = function(actor) {
        const index = _actors.indexOf(actor);
        return index >= 0;
    };

    /* Tries to add an actor and returns true if success.*/
    this.addActor = function(actor) {
        if (!this.hasActor(actor)) {
            _actors.push(actor);
            return true;
        }
        else {
            RG.err('Game.Army', 'addActor',
                'Actor already in army ' + this.getName());
        }
        return false;
    };

    /* Removes an actor from the army.*/
    this.removeActor = function(actor) {
        const index = _actors.indexOf(actor);
        if (index >= 0) {
            _actors.splice(index, 1);
            return true;
        }
        else {
            return false;
        }
    };

    /* Monitor killed actors and remove them from the army.*/
    this.hasNotify = true;
    this.notify = function(evtName, msg) {
        if (evtName === RG.EVT_ACTOR_KILLED) {
            const actor = msg.actor;
            if (this.hasActor(actor)) {
                if (!this.removeActor(actor)) {
                    RG.err('Game.Army', 'notify',
                        "Couldn't remove the actor " + actor.getName());
                }
                else {
                    ++_casualties;
                }
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);

};

/* Battle is "mini-game" which uses its own scheduling and engine.*/
RG.Game.Battle = function(name) {

    const _name = name;
    const _armies = [];
    let _level = null;

    // Keeps track of battles statistics
    const _stats = {
        duration: 0,
        casualties: 0,
        survivors: 0
    };

    this.getName = function() {return _name;};

    this.setLevel = function(level) {_level = level;};
    this.getLevel = function() {return _level;};

    this.getStats = function() {return _stats;};


    /* Adds an army to given x,y location.*/
    this.addArmy = function(army, x, y) {
        if (!RG.isNullOrUndef([_level])) {
            _armies.push(army);
            const actors = army.getActors();
            for (let i = 0; i < actors.length; i++) {
                _level.addActor(actors[i], x + i, y);
            }
        }
        else {
            RG.err('Game.Battle', 'addArmy',
                'Level must exist before adding army.');
        }
    };

    /* Returns true if the battle is over.*/
    this.isOver = function() {
        if (_armies.length > 1) {
            if (_armies[0].isDefeated()) {return true;}
            if (_armies[1].isDefeated()) {return true;}
        }
        else {
            RG.err('Game.Battle', 'isOver', 'Battle should have >= 2 armies.');
        }
        return false;
    };


};


/* An object for saving the game in specified storage (local/etc..) or restoring
* the game from saved format. GUI should use this object. */
RG.Game.Save = function() {
    let _storageRef = null;
    let _dungeonLevel = null;

    // Contains names of players for restore selection
    const _playerList = '_battles_player_data_';

    this.setStorage = function(stor) {_storageRef = stor;};

    this.getDungeonLevel = function() {
        return _dungeonLevel;
    };

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
            return Object.keys(dbObj).map(function(val) {
                return dbObj[val];
            });
        }
        else {
            return [];
        }
    };

    /* Returns an object containing the saved players.*/
    this.getPlayersAsObj = function() {
        _checkStorageValid();
        const dbString = _storageRef.getItem(_playerList);
        return JSON.parse(dbString);
    };

    /* Deletes given player from the list of save games.*/
    this.deletePlayer = function(name) {
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
    this.savePlayer = function(game, conf) {
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
    const _savePlayerInfo = function(name, obj, conf) {
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

    const _checkStorageValid = function() {
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

    this.getName = function() {return _name;};

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


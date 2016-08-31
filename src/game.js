
var GS = require("../getsource.js");
var RG = GS.getSource("RG", "./src/rg.js");
RG.System = GS.getSource(["RG", "System"], "./src/system.js");
RG.Map = GS.getSource(["RG", "Map"], "./src/map.js");

RG.Game = {};

/** Game engine which handles turn scheduling and systems updates.*/
RG.Game.Engine = function() {

    // Ignore GUI commands by default
    this.isGUICommand  = function() {return false;};
    this.doGUICommand  = null;

    this.nextActor     = null;
    this.simIntervalID = null;

    var _activeLevels = []; // Only these levels are simulated

    var _scheduler = new RG.RogueScheduler();

    var _msg = new RG.MessageHandler();
    this.getMessages = function() {return _msg.getMessages();};
    this.clearMessages = function() { _msg.clear();};

    //--------------------------------------------------------------
    // ECS SYSTEMS
    //--------------------------------------------------------------

    // These systems updated after each action
    this.systemOrder = ["Attack", "Missile", "Movement", "Damage", "ExpPoints", "Communication"];
    this.systems = {};
    this.systems.Attack = new RG.System.Attack("Attack", ["Attack"]);
    this.systems.Missile = new RG.System.Missile("Missile", ["Missile"]);
    this.systems.Movement = new RG.System.Movement("Movement", ["Movement"]);
    this.systems.Damage = new RG.System.Damage("Damage", ["Damage", "Health"]);
    this.systems.ExpPoints = new RG.ExpPointsSystem("ExpPoints", 
        ["ExpPoints", "Experience"]);
    this.systems.Communication = new RG.System.Communication("Communication",
        ["Communication"]);

    // Systems updated once each game loop
    this.loopSystems = {};
    this.loopSystems.Hunger = new RG.System.Hunger("Hunger", ["Action", "Hunger"]);

    this.updateSystems = function() {
        for (var i = 0; i < this.systemOrder.length; i++) {
            var sysName = this.systemOrder[i];
            this.systems[sysName].update();
        }
    };

    this.updateLoopSystems = function() {
        for (var s in this.loopSystems) this.loopSystems[s].update();
    };

    //--------------------------------------------------------------
    // SCHEDULING/ACTIONS
    //--------------------------------------------------------------

    /** Returns next actor from the scheduling queue.*/
    this.getNextActor = function() {
        return _scheduler.next();
    };

    /** Adds an actor to the scheduler.*/
    this.addActor = function(actor) {
        _scheduler.add(actor, true, 0);
    };

    /** Removes an actor from a scheduler.*/
    this.removeActor = function(actor) {
        _scheduler.remove(actor);
    };

    /** Adds an event to the scheduler.*/
    this.addEvent = function(gameEvent) {
        var repeat = gameEvent.getRepeat();
        var offset = gameEvent.getOffset();
        _scheduler.add(gameEvent, repeat, offset);
    };

    /** Performs one game action.*/
    this.doAction = function(action) {
        _scheduler.setAction(action);
        action.doAction();
        if (action.hasOwnProperty("energy")) {
            if (action.hasOwnProperty("actor")) {
                var actor = action.actor;
                if (actor.has("Action"))
                    actor.get("Action").addEnergy(action.energy);
            }
        }
    };

    //--------------------------------------------------------------
    // GAME LOOPS
    //--------------------------------------------------------------

    /** GUI should only call this method.*/
    this.update = function(obj) {
        if (!this.isGameOver()) {
            this.clearMessages();

            if (this.nextActor !== null) {
                if (obj.hasOwnProperty("evt")) {
                    var code = obj.evt.keyCode;
                    if (this.isGUICommand(code)) {
                        this.doGUICommand(code);
                    }
                    else {
                        this.updateGameLoop({code: code});
                    }
                }
                else {
                    this.updateGameLoop(obj);
                }
            }

        }
        else {
            this.clearMessages();
            RG.POOL.emitEvent(RG.EVT_MSG, {msg: "GAME OVER!"});
            if (this.simIntervalID === null) {
                this.simIntervalID = setInterval(this.simulateGame.bind(this), 1);
            }
        }
    };

    this.updateGameLoop = function(obj) {
        this.playerCommand(obj);
        this.nextActor = this.getNextActor();

        // Next/act until player found, then go back waiting for key...
        while (!this.nextActor.isPlayer() && !this.isGameOver()) {
            var action = this.nextActor.nextAction();
            this.doAction(action);

            this.updateSystems();

            this.nextActor = this.getNextActor();
            if (RG.isNullOrUndef([this.nextActor])) {
                console.error("Game loop out of events! This is bad!");
                break;
            }
        }

        this.updateLoopSystems();

    };

    /** Simulates the game without a player.*/
    this.simulateGame = function() {
        this.nextActor = this.getNextActor();
        if (!this.nextActor.isPlayer()) {
            var action = this.nextActor.nextAction();
            this.doAction(action);
            this.updateSystems();
        }
    };

    this.playerCommand = function(obj) {
        var action = this.nextActor.nextAction(obj);
        this.doAction(action);
        this.updateSystems();
        this.playerCommandCallback(this.nextActor);
    };

    //--------------------------------------------------------------
    // MANAGING ACTIVE LEVELS
    //--------------------------------------------------------------

    this.numActiveLevels = function() {return _activeLevels.length;};

    var _levelMap = {};

    this.hasLevel = function(level) {
        return _levelMap.hasOwnProperty(level.getID())
    };

    this.addLevel = function(level) {
        _levelMap[level.getID()] = level;
    };

    /** Sets which levels are actively simulated.*/
    this.addActiveLevel = function(level) {
        var levelID = level.getID();
        var index = _activeLevels.indexOf(levelID);

        // Check if a level must be removed
        if (_activeLevels.length === (RG.MAX_ACTIVE_LEVELS)) {
            if (index === -1) { // No room for new level, pop one
                var removedLevelID = _activeLevels.pop();
                var removedLevel = _levelMap[removedLevelID];
                var rmvActors = removedLevel.getActors();
                for (var i = 0; i < rmvActors.length; i++) {
                    rmvActors[i].get("Action").disable();
                }
                RG.debug(this, "Removed active level to make space...");
            }
            else { // Level already in actives, move to the front only
                _activeLevels.splice(index, 1);
                _activeLevels.unshift(levelID);
                RG.debug(this, "Moved level to the front of active levels.");
            }
        }

        // This is a new level, enable all actors
        if (index === -1) {
            _activeLevels.unshift(levelID);
            var actActors = level.getActors();
            for (var j = 0; j < actActors.length; j++) {
                actActors[j].get("Action").enable();
            }
        }
    };

    this.isGameOver = function() {return false;};


    this.isActiveLevel = function(level) {
        var index = _activeLevels.indexOf(level.getID());
        return index >= 0;
    };

    //--------------------------------------------------------------
    // EVENT LISTENING
    //--------------------------------------------------------------

    this.notify = function(evtName, args) {
        if (evtName === RG.EVT_DESTROY_ITEM) {
            var item = args.item;
            var owner = item.getOwner().getOwner(); // chaining due to inventory container
            if (!owner.getInvEq().removeItem(item)) {
                RG.err("Game", "notify - DESTROY_ITEM",
                    "Failed to remove item from inventory.");
            }
        }
        else if (evtName === RG.EVT_ACT_COMP_ADDED) {
            if (args.hasOwnProperty("actor")) {
                this.addActor(args.actor);
            }
            else {
                RG.err("Game", "notify - ACT_COMP_ADDED",
                    "No actor specified for the event.");
            }
        }
        else if (evtName === RG.EVT_ACT_COMP_REMOVED) {
            if (args.hasOwnProperty("actor")) {
                this.removeActor(args.actor);
            }
            else {
                RG.err("Game", "notify - ACT_COMP_ADDED",
                    "No actor specified for the event.");
            }
        }
        else if (evtName === RG.EVT_ACT_COMP_ENABLED) {
            if (args.hasOwnProperty("actor")) {
                this.addActor(args.actor);
            }
            else {
                RG.err("Game", "notify - ACT_COMP_ENABLED",
                    "No actor specified for the event.");
            }
        }
        else if (evtName === RG.EVT_ACT_COMP_DISABLED) {
            if (args.hasOwnProperty("actor")) {
                this.removeActor(args.actor);
            }
            else {
                RG.err("Game", "notify - ACT_COMP_DISABLED",
                    "No actor specified for the event.");
            }
        }
        else if (evtName === RG.EVT_LEVEL_PROP_ADDED) {
            if (args.propType === "actors") {
                if (this.isActiveLevel(args.level)) {
                    // args.obj is actor
                    args.obj.get("Action").enable();
                }
            }
        }
        else if (evtName === RG.EVT_LEVEL_CHANGED) {
            var actor = args.actor;
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

/** Top-level main object for the game.  */
RG.Game.Main = function() {

    var _players      = [];
    var _levels       = [];
    var _shownLevel   = null; // One per game only
    var _gameOver     = false;

    var _eventPool = new RG.EventPool();
    RG.resetEventPools();
    RG.pushEventPool(_eventPool);

    var _engine = new RG.Game.Engine();

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

    /** Returns player(s) of the game.*/
    this.getPlayer = function() {
        if (_players.length === 1) {
            return _players[0];
        }
        else if (_players.length > 1) {
            return _players;
        }
        else {
            RG.err("Engine", "getPlayer", "There are no players in the game.");
            return null;
        }
    };

    /** Adds player to the game. By default, it's added to the first level.*/
    this.addPlayer = function(player) {
        if (_levels.length > 0) {
            if (_levels[0].addActorToFreeCell(player)) {
                _players.push(player);
                if (_shownLevel === null) {
                    _shownLevel = _levels[0];
                }
                RG.debug(this, "Added a player to the Game.");
                if (_engine.nextActor === null) _engine.nextActor = player;
                _levels[0].onEnter();
                _levels[0].onFirstEnter();
                return true;
            }
            else {
                RG.err("Game", "addPlayer", "Failed to add the player.");
                return false;
            }
        }
        else {
            RG.err("Game", "addPlayer", "No levels exist. Cannot add player.");
        }
        return false;
    };

    this.getMessages = function() {return _engine.getMessages();};
    this.clearMessages = function() { _engine.clearMessages();};

    /** Adds an actor to scheduler.*/
    this.addActor = function(actor) {_engine.addActor(actor);};

    /** Removes an actor from a scheduler.*/
    this.removeActor = function(actor) {_engine.removeActor(actor);};

    /** Adds an event to the scheduler.*/
    this.addEvent = function(gameEvent) {_engine.addEvent(gameEvent);};

    this.addActiveLevel = function(level) {_engine.addActiveLevel(level);};

    /** Adds one level to the game.*/
    this.addLevel = function(level) {
        _levels.push(level);
        if (!_engine.hasLevel(level)) {
            _engine.addLevel(level);
        }
        else {
            RG.err("Game", "addLevel", "Duplicate level ID " + level.getID());
        }
        if (_engine.numActiveLevels() === 0) this.addActiveLevel(level);
    };

    /* Returns the visible map to be rendered by GUI. */
    this.getVisibleMap = function() {
        var player = this.getPlayer();
        var map = player.getLevel().getMap();
        return map;
    };

    /** Must be called to advance the game by one player action. Non-player
     * actions are executed after the player action.*/
    this.update = function(obj) {_engine.update(obj);};

    /** Used by the event pool. Game receives notifications about different
     * game events from child components. */
    this.notify = function(evtName, args) {
        if (evtName === RG.EVT_ACTOR_KILLED) {
            if (args.actor.isPlayer()) {
                if (_players.length === 1) {
                    _gameOver = true;
                    RG.gameMsg("GAME OVER!");
                }
            }
        }
        else if (evtName === RG.EVT_LEVEL_CHANGED) {
            var actor = args.actor;
            if (actor.isPlayer()) {
                _shownLevel = actor.getLevel();
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);
    RG.POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this);
}; // }}} Game

/** Battle is "mini-game" which uses its own scheduling and engine.*/
RG.Game.Battle = function(game) {

    var _game = game;

    var _engine = new RG.Game.Engine();

};

RG.Game.Save = function() {

    var _storageRef = null;
    var _dungeonLevel = 1;
    var _db

    // Contains names of players for restore selection
    var _playerList = "_battles_player_data_";

    this.setStorage = function(stor) {_storageRef = stor;};

    this.getDungeonLevel = function() {return _dungeonLevel;};

    /** Returns a list of saved players.*/
    this.getPlayersAsList = function() {
        var dbObj = this.getPlayersAsObj();
        if (dbObj !== null) {
            return Object.keys(dbObj).map(function(val) {
                return dbObj[val];
            });
        }
        else {
            return [];
        }
    };

    /** Returns an object containing the saved players.*/
    this.getPlayersAsObj = function() {
        var dbString = _storageRef.getItem(_playerList);
        return JSON.parse(dbString);
    };

    /** Saves a player object. */
    this.savePlayer = function(player) {
        var name = player.getName();
        var storedObj = player.objectify();
        storedObj.dungeonLevel = player.getLevel().getLevelNumber();
        var dbObj = {player: storedObj};
        var dbString = JSON.stringify(dbObj);
        _storageRef.setItem("_battles_player_" + name, dbString);
        _savePlayerInfo(name, storedObj);
    };

    /** Restores a player with given name. */
    this.restorePlayer = function(name) {
        var playersObj = this.getPlayersAsObj();
        if (playersObj.hasOwnProperty(name)) {
            var dbString = _storageRef.getItem("_battles_player_" + name);
            var dbObj = JSON.parse(dbString);
            var player = _createPlayerObj(dbObj.player);
            return player;
        }
        else {
            RG.err("No player " + name + " found from the list.");
            return null;
        }
    };

    /** Saves name and level of the player into a list.*/
    var _savePlayerInfo = function(name, obj) {
        var dbString = _storageRef.getItem(_playerList);
        var dbObj = JSON.parse(dbString);
        if (dbObj === null) dbObj = {};
        dbObj[name] = {name: name, L: obj.components.setExpLevel};
        dbString = JSON.stringify(dbObj);
        _storageRef.setItem(_playerList, dbString);
    };

    /** Handles creation of restored player from JSON.*/
    var _createPlayerObj = function(obj) {
        var player = new RG.Actor.Rogue(obj.name);
        player.setIsPlayer(true);
        player.setType("player");
        var storedComps = obj.components;
        for (var name in storedComps) {
            var comp = storedComps[name];
            var newCompObj = new RG.Component[name]();
            for (var fname in comp) {
                newCompObj[fname](comp[fname]);
            }
            player.add(name, newCompObj);
        }
        _dungeonLevel = obj.dungeonLevel;
        return player;
    };

};

if (typeof module !== "undefined" && typeof exports !== "undefined") {
    GS.exportSource(module, exports, ["RG", "Game"], [RG, RG.Game]);
}
else {
    GS.exportSource(undefined, undefined, ["RG", "Game"], [RG, RG.Game]);
}


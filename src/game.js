
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
    //this.setSeenCells = function(cells) {_msg.setSeenCells(cells);};

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

    // Time-based systems are added to the scheduler
    this.timeSystems = {};

    var effects = new RG.System.TimeEffects("TimeEffects",
        ["Poison"]);

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

    /** Adds an actor to the scheduler. */
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

    /** Updates the loop by executing one player command, then looping until
     * next player command.*/
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
        else {
            RG.err("Engine", "simulateGame", "Doesn't work with player.");
        }
    };

    this.playerCommand = function(obj) {
        if (this.nextActor.isPlayer() === false) {
            RG.err("Engine", "playerCommand",
                "nextActor should be player but: " + this.nextActor.getName()
            );
        }
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

    /** Adds one level to the game database.*/
    this.addLevel = function(level) {
        var id = level.getID();
        if (!_levelMap.hasOwnProperty(id)) {
            _levelMap[level.getID()] = level;
        }
        else {
            RG.err("Game.Main", "addLevel", 
                "Level ID " + id + " already exists!");
        }
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

    this.addTimeSystem = function(name, obj) {
        this.timeSystems[name] = obj;
        // Must schedule the system
        var updateEvent = new RG.RogueGameEvent(100, obj.update.bind(obj), true, 0);
        this.addEvent(updateEvent);
    };
    this.addTimeSystem("TimeEffects", effects);

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

    var _players    = [];   // List of players
    var _levels     = [];   // List of all levels
    var _places     = {};   // List of all places
    var _shownLevel = null; // One per game only
    var _gameOver   = false;

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
            RG.err("Game.Main", "getPlayer", "There are no players in the game.");
            return null;
        }
    };

    /** Adds player to the game. By default, it's added to the first level if
     * player has no level yet.*/
    this.addPlayer = function(player, obj) {
        var levelOK = false;
        if (!RG.isNullOrUndef([player.getLevel()])) {
            levelOK = true;
        }
        else {
            if (RG.isNullOrUndef([obj])) {
                levelOK = _addPlayerToFirstLevel(player, _levels);
            }
            else {
                levelOK = _addPlayerToPlace(player, obj);
            }
        }

        if (levelOK) {
            _engine.nextActor = player;
            if (_shownLevel === null) _shownLevel = player.getLevel();
            _players.push(player);
            RG.debug(this, "Added a player to the Game.");
            _engine.addActiveLevel(player.getLevel());
            player.getLevel().onEnter();
            player.getLevel().onFirstEnter();
        }

        return levelOK;
    };

    var _addPlayerToFirstLevel = function(player, levels) {
        var levelOK = false;
        if (levels.length > 0) {
            levelOK = levels[0].addActorToFreeCell(player);
            if (!levelOK)
                RG.err("Game", "addPlayer", "Failed to add the player.");
        }
        else {
            RG.err("Game", "addPlayer", "No levels exist. Cannot add player.");
        }
        return levelOK;
    };

    /** Adds player to the first found level of given place. Name of place must be
     * specified as obj.place */
    var _addPlayerToPlace = function(player, obj) {
        if (obj.hasOwnProperty("place")) {
            var place = obj.place;
            if (_places.hasOwnProperty(place)) {
                var levels = _places[place];
                return _addPlayerToFirstLevel(player, levels);
            }
            else {
                RG.err("Game.Main", "_addPlayerToPlace", 
                    "No place |" + place + "| found.");
            }
        }
        else {
            RG.err("Game.Main", "_addPlayerToPlace", "obj.place must exist.");
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
        if (!_engine.hasLevel(level)) {
            _levels.push(level);
            _engine.addLevel(level);
        }
        else {
            RG.err("Game", "addLevel", "Duplicate level ID " + level.getID());
        }
    };

    /** Adds a place (dungeon/area) containing several levels.*/
    this.addPlace = function(place) {
        if (place.hasOwnProperty("getLevels")) {
            var name = place.getName();
            if (!_places.hasOwnProperty(name) ) {
                var levels = place.getLevels();
                for (var i = 0; i < levels.length; i++) {
                    this.addLevel(levels[i]);
                }
                _places[name] = levels;
            }
            else {
                RG.err("Game.Main", "addPlace", "A place |" + name + "| exists.");
            }
        }
        else {
            RG.err("Game.Main", "addPlace", 
                "Added place must have getLevels()");
        }
    };


    /* Returns the visible map to be rendered by GUI. */
    this.getVisibleMap = function() {
        var player = this.getPlayer();
        var map = player.getLevel().getMap();
        return map;
    };

    this.simulateGame = function() {_engine.simulateGame();};

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

    /** Adds one battle to the game. */
    this.addBattle = function(battle) {
        var level = battle.getLevel();
        _engine.addActiveLevel(level);
    };

}; // }}} Game

/** Army is a collection of actors.*/
RG.Game.Army = function(name) {

    var _name = name;

    var _actors = []; // All actors inside this army

    var _battle = null;
    var _casualties = 0;
    var _defeatThreshold = 0;

    this.getName = function() {return _name;};

    this.setDefeatThreshold = function(numActors) {
        _defeatThreshold = numActors;
    };

    /** Default defeat is when all actors have been eliminated.*/
    this.isDefeated = function() {
        if (_actors.length <= _defeatThreshold) {
            return true;
        }
        return false;
    };

    this.getActors = function() {return _actors;};

    this.hasActor = function(actor) {
        var index = _actors.indexOf(actor);
        return index >= 0;
    };

    /** Tries to add an actor and returns true if success.*/
    this.addActor = function(actor) {
        if (!this.hasActor(actor)) {
            _actors.push(actor);
            return true;
        }
        else {
            RG.err("Game.Army", "addActor", "Actor already in army " + this.getName());
        }
        return false;
    };

    /** Removes an actor from the army.*/
    this.removeActor = function(actor) {
        var index = _actors.indexOf(actor);
        if (index >= 0) {
            _actors.splice(index, 1);
            return true;
        }
        else {

        }
        return false;
    };

    /** Monitor killed actors and remove them from the army.*/
    this.notify = function(evtName, msg) {
        if (evtName === RG.EVT_ACTOR_KILLED) {
            var actor = msg.actor;
            if (this.hasActor(actor)) {
                if (!this.removeActor(actor)) {
                    RG.err("Game.Army", "notify", "Couldn't remove the actor " + actor.getName());
                }
                else {
                    ++_casualties;
                }
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);

};

/** Battle is "mini-game" which uses its own scheduling and engine.*/
RG.Game.Battle = function(name) {

    var _name = name;
    var _armies = [];
    var _level = null;

    // Keeps track of battles statistics
    var _stats = {
        duration: 0,
        casualties: 0,
        survivors: 0,
    };

    this.getName = function() {return _name;};

    this.setLevel = function(level) {_level = level;};
    this.getLevel = function() {return _level;};

    this.getStats = function() {return _stats;};


    /** Adds an army to given x,y location.*/
    this.addArmy = function(army, x, y) {
        if (!RG.isNullOrUndef([_level])) {
            _armies.push(army);
            var actors = army.getActors();
            for (var i = 0; i < actors.length; i++) {
                _level.addActor(actors[i], x + i, y);
            }
        }
        else {
            RG.err("Game.Battle", "addArmy", "Level must exist before adding army.");
        }
    };

    /** Returns true if the battle is over.*/
    this.isOver = function() {
        if (_armies.length > 1) {
            if (_armies[0].isDefeated()) return true;
            if (_armies[1].isDefeated()) return true;
        }
        else {
            RG.err("Game.Battle", "isOver", "Battle should have >= 2 armies.");
        }
        return false;
    };



};

RG.Game.Save = function() {

    var _storageRef = null;
    var _dungeonLevel = 1;
    var _db

    // Contains names of players for restore selection
    var _playerList = "_battles_player_data_";

    this.setStorage = function(stor) {_storageRef = stor;};

    this.getDungeonLevel = function() {return _dungeonLevel;};

    /** Main function which saves the full game.*/
    this.save = function(game, conf) {
        var player = game.getPlayer();
        this.savePlayer(player, conf);
    };

    /** Restores game/player with the given name.*/
    this.restore = function(name) {
        if (!RG.isNullOrUndef([name])) {
            var player = this.restorePlayer(name);
            var obj = {
                player: player
            };
            return obj;
        }
        else {
            RG.err("Game.Save", "restore", "No name given (or null/undef).");
        }
    };

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
        _checkStorageValid();
        var dbString = _storageRef.getItem(_playerList);
        return JSON.parse(dbString);
    };

    /** Deletes given player from the list of save games.*/
    this.deletePlayer = function(name) {
        _checkStorageValid();
        var dbString = _storageRef.getItem(_playerList);
        var dbObj = JSON.parse(dbString);
        if (dbObj.hasOwnProperty(name)) {
            delete dbObj[name];
        }
        dbString = JSON.stringify(dbObj);
        _storageRef.setItem(_playerList, dbString);
    };

    /** Saves a player object. */
    this.savePlayer = function(player, conf) {
        _checkStorageValid();
        var name = player.getName();
        var storedObj = player.toJSON();
        storedObj.dungeonLevel = player.getLevel().getLevelNumber();
        var dbObj = {player: storedObj};
        var dbString = JSON.stringify(dbObj);
        _storageRef.setItem("_battles_player_" + name, dbString);
        _savePlayerInfo(name, storedObj, conf);
    };

    /** Restores a player with given name. */
    this.restorePlayer = function(name) {
        _checkStorageValid();
        var playersObj = this.getPlayersAsObj();
        if (playersObj.hasOwnProperty(name)) {
            var dbString = _storageRef.getItem("_battles_player_" + name);
            var dbObj = JSON.parse(dbString);
            var player = _createPlayerObj(dbObj.player);
            return player;
        }
        else {
            RG.err("Game.Save", "restorePlayer", 
                "No player |" + name + "| found from the list.");
            return null;
        }
    };

    /** Saves name and level of the player into a list.*/
    var _savePlayerInfo = function(name, obj, conf) {
        var dbString = _storageRef.getItem(_playerList);
        var dbObj = JSON.parse(dbString);
        if (dbObj === null) dbObj = {};
        dbObj[name] = {
            name: name,
            expLevel: obj.components.Experience.setExpLevel,
            dungeonLevel: obj.dungeonLevel,
        };
        // Capture also game config settings (cols,rows,loot etc)
        for (var p in conf) {
            dbObj[name][p] = conf[p];
        }
        dbString = JSON.stringify(dbObj);
        _storageRef.setItem(_playerList, dbString);
    };

    /** Handles creation of restored player from JSON.*/
    var _createPlayerObj = function(obj) {
        var player = new RG.Actor.Rogue(obj.name);
        player.setIsPlayer(true);
        player.setType("player");
        _addCompsToEntity(player, obj.components);
        _createInventory(obj, player);
        _createEquipment(obj, player);
        _dungeonLevel = obj.dungeonLevel;
        return player;
    };

    var _addCompsToEntity = function(ent, comps) {
        for (var name in comps) {
            var comp = comps[name];
            var newCompObj = new RG.Component[name]();
            for (var fname in comp) {
                newCompObj[fname](comp[fname]);
            }
            ent.add(name, newCompObj);
        }
    };

    var _createInventory = function(obj, player) {
        if (obj.hasOwnProperty("inventory")) {
            var itemObjs = obj.inventory;
            for (var i = 0; i < itemObjs.length; i++) {
                var newObj = _createItem(itemObjs[i]);
                player.getInvEq().addItem(newObj);
            }

        }
    };

    var _createEquipment = function(obj, player) {
        if (obj.hasOwnProperty("equipment")) {
            var equipObjs = obj.equipment;
            for (var i = 0; i < equipObjs.length; i++) {
                var newObj = _createItem(equipObjs[i]);
                player.getInvEq().addItem(newObj);
                player.getInvEq().equipItem(newObj);
            }

        }
    };

    var _createItem = function(obj) {
        var item = obj;
        var typeCapitalized = _getItemObjectType(item);
        var newObj = new RG.Item[typeCapitalized]();
        for (var func in item) {
            if (func === "setSpirit") {
                newObj[func](_createSpirit(item[func]));
            }
            else {
                newObj[func](item[func]); // Use setter
            }
        }
        return newObj;

    };

    var _createSpirit = function(obj) {
        var newObj = new RG.Actor.Spirit(obj.name);
        _addCompsToEntity(newObj, obj.components);
        return newObj;
    };


    var _checkStorageValid = function() {
        if (RG.isNullOrUndef([_storageRef])) {
            throw new Error("Game.Save you must setStorage() first.");
        }
    };

    var _getItemObjectType = function(item) {
        if (item.setType === "spiritgem") return "SpiritGem";
        return item.setType.capitalize();
    };

};

if (typeof module !== "undefined" && typeof exports !== "undefined") {
    GS.exportSource(module, exports, ["RG", "Game"], [RG, RG.Game]);
}
else {
    GS.exportSource(undefined, undefined, ["RG", "Game"], [RG, RG.Game]);
}


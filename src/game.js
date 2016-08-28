
var GS = require("../getsource.js");
var RG = GS.getSource("RG", "./src/rg.js");
RG.System = GS.getSource(["RG", "System"], "./src/system.js");
RG.Map = GS.getSource(["RG", "Map"], "./src/map.js");

/** Top-level object for the game.  */
RG.Game = function() { // {{{2

    var _cols = RG.COLS;
    var _rows = RG.ROWS;

    var _players      = [];
    var _levels       = [];
    var _activeLevels = [];
    var _shownLevel   = null;
    var _time         = "";
    var _gameOver     = false;

    var _mapGen = new RG.Map.Generator();
    var _scheduler = new RG.RogueScheduler();
    var _msg = new RG.MessageHandler();

    // These systems updated after each action
    this.systemOrder = ["Attack", "Missile", "Movement", "Damage", "ExpPoints", "Communication"];
    this.systems = {};
    this.systems["Attack"] = new RG.System.Attack("Attack", ["Attack"]);
    this.systems["Missile"] = new RG.System.Missile("Missile", ["Missile"]);
    this.systems["Movement"] = new RG.System.Movement("Movement", ["Movement"]);
    this.systems["Damage"] = new RG.System.Damage("Damage", ["Damage", "Health"]);
    this.systems["ExpPoints"] = new RG.ExpPointsSystem("ExpPoints", 
        ["ExpPoints", "Experience"]);
    this.systems["Communication"] = new RG.System.Communication("Communication",
        ["Communication"]);

    // Systems updated once each game loop
    this.loopSystems = {};
    this.loopSystems["Hunger"] = new RG.System.Hunger("Hunger", ["Action", "Hunger"]);

    this.getMessages = function() {
        return _msg.getMessages();
    };

    this.clearMessages = function() {
        _msg.clear();
    };

    this.shownLevel = function() {return _shownLevel;};
    this.setShownLevel = function(level) {_shownLevel = level;};

    this.doGUICommand = null;
    this.isGUICommand = null;
    this.nextActor = null;

    /** Returns next actor from the scheduling queue.*/
    this.getNextActor = function() {
        return _scheduler.next();
    };

    this.isGameOver = function() {
        return _gameOver;
    };

    /** Returns player(s) of the game.*/
    this.getPlayer = function() {
        if (_players.length === 1) {
            return _players[0];
        }
        else if (_players.length > 1) {
            return _players;
        }
        else {
            RG.err("Game", "getPlayer", "There are no players in the game.");
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
                if (this.nextActor === null) this.nextActor = player;
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

    /** Adds an actor to scheduler.*/
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

    var _levelMap = {};
    /** Adds one level to the game.*/
    this.addLevel = function(level) {
        _levels.push(level);
        if (!_levelMap.hasOwnProperty(level.getID())) {
            _levelMap[level.getID()] = level;
        }
        else {
            RG.err("Game", "addLevel", "Duplicate level ID " + level.getID());
        }
        if (_activeLevels.length === 0) this.addActiveLevel(level);
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

    /* Returns the visible map to be rendered by GUI. */
    this.getVisibleMap = function() {
        var player = this.getPlayer();
        var map = player.getLevel().getMap();
        return map;
    };

    /** Must be called to advance the game by one player action. Non-player
     * actions are executed after the player action.*/
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

        }

    };

    /** Updates game for one player command, and a number of AI commands until
     * next player command.*/
    this.updateGameLoop = function(obj) {
        this.playerCommand(obj);
        this.nextActor = this.getNextActor();

        // Next/act until player found, then go back waiting for key...
        while (!this.nextActor.isPlayer() && !this.isGameOver()) {
            var action = this.nextActor.nextAction();
            this.doAction(action);

            for (var i = 0; i < this.systemOrder.length; i++) {
                var sysName = this.systemOrder[i];
                this.systems[sysName].update();
            }

            this.nextActor = this.getNextActor();
            if (RG.isNullOrUndef([this.nextActor])) {
                console.error("Game loop out of events! This is bad!");
                break;
            }
        }

        for (var s in this.loopSystems) this.loopSystems[s].update();

    };

    this.playerCommand = function(obj) {
        var action = this.nextActor.nextAction(obj);
        this.doAction(action);
        for (var i = 0; i < this.systemOrder.length; i++) {
            var sysName = this.systemOrder[i];
            this.systems[sysName].update();
        }
        this.visibleCells = this.shownLevel().exploreCells(this.nextActor);
    };

    this.isActiveLevel = function(level) {
        var index = _activeLevels.indexOf(level.getID());
        return index >= 0;

    };

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
                this.addActiveLevel(_shownLevel);
                args.src.onExit();
                args.src.onFirstExit();
                args.target.onEnter();
                args.target.onFirstEnter();
            }
        }
        else if (evtName === RG.EVT_DESTROY_ITEM) {
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
                    var actor = args.obj;
                    actor.get("Action").enable();
                }
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_ACTOR_CREATED, this);
    RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);
    RG.POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this);
    RG.POOL.listenEvent(RG.EVT_DESTROY_ITEM, this);
    RG.POOL.listenEvent(RG.EVT_ACT_COMP_ADDED, this);
    RG.POOL.listenEvent(RG.EVT_ACT_COMP_REMOVED, this);
    RG.POOL.listenEvent(RG.EVT_ACT_COMP_ENABLED, this);
    RG.POOL.listenEvent(RG.EVT_ACT_COMP_DISABLED, this);
    RG.POOL.listenEvent(RG.EVT_LEVEL_PROP_ADDED, this);
}; // }}} Game

// Exports for node/vars for window
if (typeof exports !== 'undefined' ) {
    if( typeof RG.Game !== 'undefined' && module.exports ) {
        exports = module.exports = RG.Game;
    }
    exports.RG = RG;
    exports.RG.Game = RG.Game;
}
else {
    window.RG.Game = RG.Game;
}

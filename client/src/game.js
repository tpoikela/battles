
import Entity from './entity';

const RG = require('./rg.js');
RG.System = require('./system.js');
RG.Map = require('./map.js');
RG.Time = require('./time.js');


RG.Game = {};

/* Game engine which handles turn scheduling, systems updates and in-game
 * messaging between objects. */
RG.Game.Engine = function(eventPool) {

    // Ignore GUI commands by default
    this.isGUICommand = () => false;
    this.doGUICommand = null;

    this.nextActor = null;
    this.animation = null;
    this.animationCallback = null;

    const _levelMap = {}; // All levels, ID -> level
    const _activeLevels = []; // Only these levels are simulated
    const _scheduler = new RG.Time.Scheduler();
    const _msg = new RG.MessageHandler();
    const _eventPool = eventPool;

    this.getMessages = () => _msg.getMessages();
    this.hasNewMessages = () => _msg.hasNew();
    this.clearMessages = () => { _msg.clear();};

    //--------------------------------------------------------------
    // ECS SYSTEMS
    //--------------------------------------------------------------

    // These systems updated after each action. Order is important, for example,
    // animations should be seen before actors are killed
    this.systemOrder = ['Disability', 'SpiritBind', 'Attack', 'Chat',
        'SpellCast',
        'SpellEffect', 'Missile', 'Movement', 'Animation', 'Damage',
        'ExpPoints', 'Communication'];

    this.systems = {};
    this.systems.Disability = new RG.System.Disability(
        ['Stun', 'Paralysis']);
    this.systems.SpiritBind = new RG.System.SpiritBind(['SpiritBind']);
    this.systems.Chat = new RG.System.Chat(['Chat']);
    this.systems.Attack = new RG.System.Attack(['Attack']);
    this.systems.Missile = new RG.System.Missile(['Missile']);
    this.systems.Movement = new RG.System.Movement(['Movement']);
    this.systems.SpellCast = new RG.System.SpellCast(['SpellCast',
        'PowerDrain']);
    this.systems.SpellEffect = new RG.System.SpellEffect(
        ['SpellRay', 'SpellCell', 'SpellMissile', 'SpellArea']);
    this.systems.Animation = new RG.System.Animation(
        ['Animation']);
    this.systems.Damage = new RG.System.Damage(['Damage', 'Health']);
    this.systems.ExpPoints = new RG.System.ExpPoints(
        ['ExpPoints', 'Experience']);
    this.systems.Communication = new RG.System.Communication(
        ['Communication']);

    // Systems updated once each game loop (once for each player action)
    this.loopSystemOrder = ['Hunger'];
    this.loopSystems = {};
    this.loopSystems.Hunger = new RG.System.Hunger(['Action', 'Hunger']);

    // Time-based systems are added to the scheduler directly
    this.timeSystems = {};

    const effects = new RG.System.TimeEffects(['Expiration', 'Poison']);

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
    this.getNextActor = () => _scheduler.next();

    /* Adds an actor to the scheduler. */
    this.addActor = actor => {
        _scheduler.add(actor, true, 0);
    };

    /* Removes an actor from a scheduler.*/
    this.removeActor = actor => {
        _scheduler.remove(actor);
    };

    /* Adds an event to the scheduler.*/
    this.addEvent = gameEvent => {
        const repeat = gameEvent.getRepeat();
        const offset = gameEvent.getOffset();
        _scheduler.add(gameEvent, repeat, offset);
    };

    /* Performs one game action.*/
    this.doAction = action => {
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
            _eventPool.emitEvent(RG.EVT_MSG, {msg: 'GAME OVER!'});
            this.simulateGame();
        }
    };

    /* Updates the loop by executing one player command, then looping until
     * next player command.*/
    this.updateGameLoop = function(obj) {
        this.playerCommand(obj);
        this.currPlayer = this.nextActor;
        this.nextActor = this.getNextActor();

        // Next/act until player found, then go back waiting for key...
        while (!this.nextActor.isPlayer() && !this.isGameOver()) {
            const action = this.nextActor.nextAction();
            this.doAction(action);

            this.updateSystems(); // All systems for each actor

            // TODO check any animations that should be shown

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
            let msg = '';
            if (this.nextActor.hasOwnProperty('isEvent')) {
                msg = 'Expected player, got an event: ';
            }
            else {
                msg = 'Expected player, got: ' + this.nextActor.getName();
            }
            msg += '\n' + JSON.stringify(this.nextActor);
            RG.err('Engine', 'playerCommand', msg);
        }
        const action = this.nextActor.nextAction(obj);
        this.doAction(action);
        this.updateSystems();
        this.playerCommandCallback(this.nextActor);
    };

    //--------------------------------------------------------------
    // MANAGING ACTIVE LEVELS
    //--------------------------------------------------------------

    this.numActiveLevels = () => _activeLevels.length;

    this.hasLevel = level => _levelMap.hasOwnProperty(level.getID());

    /* Adds one level to the game database.*/
    this.addLevel = level => {
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

        // This is a new level, enable all actors by enabling Action comp
        if (index === -1) {
            _activeLevels.unshift(levelID);
            const actActors = level.getActors();
            for (let j = 0; j < actActors.length; j++) {
                actActors[j].get('Action').enable();
            }
        }
    };

    this.isGameOver = () => false;

    this.isActiveLevel = level => {
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
        else if (evtName === RG.EVT_ANIMATION) {
            if (this.animationCallback) {
                this.animation = args.animation;
                this.animationCallback(this.animation);
            }
        }
    };
    _eventPool.listenEvent(RG.EVT_DESTROY_ITEM, this);
    _eventPool.listenEvent(RG.EVT_ACT_COMP_ADDED, this);
    _eventPool.listenEvent(RG.EVT_ACT_COMP_REMOVED, this);
    _eventPool.listenEvent(RG.EVT_ACT_COMP_ENABLED, this);
    _eventPool.listenEvent(RG.EVT_ACT_COMP_DISABLED, this);
    _eventPool.listenEvent(RG.EVT_LEVEL_PROP_ADDED, this);
    _eventPool.listenEvent(RG.EVT_LEVEL_CHANGED, this);
    _eventPool.listenEvent(RG.EVT_ANIMATION, this);

    this.hasAnimation = function() {
        return this.animation !== null &&
            this.animation.hasFrames();
    };

};

/* Top-level main object for the game.  */
RG.Game.Main = function() {

    const _players = []; // List of players
    const _levels = []; // List of all levels
    const _places = {}; // List of all places
    let _shownLevel = null; // One per game only
    let _gameOver = false;

    const _eventPool = new RG.EventPool();
    RG.resetEventPools();
    RG.pushEventPool(_eventPool);

    const _engine = new RG.Game.Engine(_eventPool);

    this.shownLevel = () => _shownLevel;
    this.setShownLevel = level => {_shownLevel = level;};

    // GUI commands needed for some functions
    this.setGUICallbacks = (isGUICmd, doGUICmd) => {
        _engine.isGUICommand = isGUICmd;
        _engine.doGUICommand = doGUICmd;
    };

    this.playerCommandCallback = function(actor) {
        this.visibleCells = this.shownLevel().exploreCells(actor);
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
        const world = Object.values(_places)[0];
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

    this.simulateGame = () => {_engine.simulateGame();};

    /* Must be called to advance the game by one player action. Non-player
     * actions are executed after the player action.*/
    this.update = obj => {_engine.update(obj);};

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
            const actor = args.actor;
            if (actor.isPlayer()) {
                _shownLevel = actor.getLevel();
            }
        }
    };
    _eventPool.listenEvent(RG.EVT_ACTOR_KILLED, this);
    _eventPool.listenEvent(RG.EVT_LEVEL_CHANGED, this);

    /* Adds one battle to the game. This adds battle directly to the list of
    * active levels. */
    this.addBattle = battle => {
        const level = battle.getLevel();
        _engine.addActiveLevel(level);
    };

    this.getOverWorld = () => this._overworld;
    this.setOverWorld = (ow) => {
      this._overworld = ow;
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
            lastEntityID: Entity.getIDCount()
        };

        const player = this.getPlayer();
        if (player) {
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

}; // }}} Game.Main

/* Army is a collection of actors associated with a battle. This is useful for
 *  battle commanders to have access to their full army. */
RG.Game.Army = function(name) {
    const _name = name;
    const _actors = []; // All actors inside this army

    let _battle = null;
    let _casualties = 0;
    let _defeatThreshold = 0;

    this.getName = () => _name;

    this.setDefeatThreshold = numActors => {
        _defeatThreshold = numActors;
    };

    /* Default defeat is when all actors have been eliminated.*/
    this.isDefeated = () => {
        if (_actors.length <= _defeatThreshold) {
            return true;
        }
        return false;
    };

    this.setBattle = battle => {_battle = battle;};
    this.getBattle = () => _battle;

    this.getCasualties = () => _casualties;

    this.getActors = () => _actors;

    this.hasActor = actor => {
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
    this.removeActor = actor => {
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

    this.getName = () => _name;

    this.setLevel = level => {_level = level;};
    this.getLevel = () => _level;

    this.getStats = () => _stats;


    /* Adds an army to given x,y location.*/
    this.addArmy = (army, x, y) => {
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
    this.isOver = () => {
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


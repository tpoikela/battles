
const RG = require('./rg.js');
RG.System = require('./system.js');
RG.Map = require('./map.js');
RG.Time = require('./time.js');

/* Game engine which handles turn scheduling, systems updates and in-game
 * messaging between objects. */
const Engine = function(eventPool) {

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
        'Shop', 'SpellCast',
        'SpellEffect', 'Missile', 'Movement', 'Animation', 'Damage',
        'Battle',
        'Skills', 'ExpPoints', 'Communication'];

    this.systems = {};
    this.systems.Disability = new RG.System.Disability(
        ['Stun', 'Paralysis']);
    this.systems.SpiritBind = new RG.System.SpiritBind(['SpiritBind']);
    this.systems.Chat = new RG.System.Chat(['Chat']);
    this.systems.Shop = new RG.System.Shop(['Transaction']);
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
    this.systems.Battle = new RG.System.Battle(['BattleOver']);
    this.systems.Skills = new RG.System.Skills(['SkillsExp']);
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

    /* Main update command. Call this either with cmd to perform, or object
     * containing the pressed keycode. */
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
            this.simulateGame(100);
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
    this.simulateGame = function(nTurns = 1) {
        for (let i = 0; i < nTurns; i++) {
            this.nextActor = this.getNextActor();

            if (!this.nextActor.isPlayer()) {
                const action = this.nextActor.nextAction();
                this.doAction(action);
                this.updateSystems();
            }
            else {
                RG.err('Engine', 'simulateGame',
                    "Doesn't work with player.");
            }
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

module.exports = Engine;

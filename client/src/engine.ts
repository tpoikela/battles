
import RG from './rg';
import * as Time from './time';
import {SystemManager} from './system/system.manager';

/* Game engine which handles turn scheduling, systems updates and in-game
 * messaging between objects. */
export const Engine = function(eventPool) {

    // Ignore GUI commands by default
    this.isGUICommand = () => false;
    this.doGUICommand = null;

    this.nextActor = null;
    this.animation = null;
    this.animationCallback = null;

    this._levelMap = {}; // All levels, ID -> level
    this._activeLevels = []; // Only these levels are simulated
    this._scheduler = new Time.Scheduler();
    this._msg = new RG.MessageHandler();
    this._eventPool = eventPool;

    this.visibleCells = [];

    this._cache = {};

    this.getMessages = () => this._msg.getMessages();
    this.hasNewMessages = () => this._msg.hasNew();
    this.clearMessages = () => { this._msg.clear();};

    this.sysMan = new SystemManager(this, eventPool);

    /* Returns true if the menu is shown instead of the level. */
    this.isMenuShown = function() {
        if (this.nextActor.isPlayer()) {
            return this.nextActor.getBrain().isMenuShown();
        }
        return false;
    };


    this.getPlayer = function() {
        return this.currPlayer;
    };

    this.setPlayer = function(player) {
        this.currPlayer = player;
    };

    //--------------------------------------------------------------
    // MANAGING ACTIVE LEVELS
    //--------------------------------------------------------------

    this.numActiveLevels = () => this._activeLevels.length;

    this.hasLevel = function(level) {
        return this._levelMap.hasOwnProperty(level.getID());
    };

    this.getLevels = function() {
        return Object.values(this._levelMap);
    };

    // Not a useless function, re-assigned in Game.Main, but needed
    // here for testing Engine without Game.Main
    this.isGameOver = () => false;

    this.isActiveLevel = level => {
        const index = this._activeLevels.indexOf(level.getID());
        return index >= 0;
    };

    //--------------------------------------------------------------
    // EVENT LISTENING
    //--------------------------------------------------------------

    this.hasNotify = true;
    this._eventPool.listenEvent(RG.EVT_DESTROY_ITEM, this);
    this._eventPool.listenEvent(RG.EVT_ACT_COMP_ADDED, this);
    this._eventPool.listenEvent(RG.EVT_ACT_COMP_REMOVED, this);
    this._eventPool.listenEvent(RG.EVT_ACT_COMP_ENABLED, this);
    this._eventPool.listenEvent(RG.EVT_ACT_COMP_DISABLED, this);
    this._eventPool.listenEvent(RG.EVT_LEVEL_PROP_ADDED, this);
    this._eventPool.listenEvent(RG.EVT_LEVEL_CHANGED, this);
    this._eventPool.listenEvent(RG.EVT_ANIMATION, this);

    this.hasAnimation = function() {
        return this.animation !== null &&
            this.animation.hasFrames();
    };

    this.finishAnimation = function() {
        this.animation = null;
    };

    this.setVisibleArea = (level, cells) => {
        this.visibleLevelID = level.getID();
        this.visibleCells = cells;
        this._cache.visibleCoord = {};
        this._cache.visibleValid = false;
    };

    /* Returns true if player can see the given animation. In general, true
     * whenever animation contains at least one cell visible to the player. */
    this.canPlayerSeeAnimation = animation => {
        if (animation.levelID === this.visibleLevelID) {

            // Build the cache if not valid
            if (!this._cache.visibleValid) {
                this.visibleCells.forEach(cell => {
                    const [x, y] = [cell.getX(), cell.getY()];
                    this._cache.visibleCoord[x + ',' + y] = true;
                });
                this._cache.visibleValid = true;
            }

            // Check overlap between cached coord and coord in animation
            return animation.hasCoord(this._cache.visibleCoord);
        }
        return false;
    };

    this.enableAnimations = () => {
        this.sysMan.systems['Animation'].enableAnimations();
    };

    this.disableAnimations = () => {
        this.sysMan.systems['Animation'].disableAnimations();
    };

};

/* Adds a TimeSystem into the engine. Each system can be updated with given
 * intervals instead of every turn or loop.*/
Engine.prototype.addTimeSystem = function(name, obj) {
    // Must schedule the system to activate it
    const updateEvent = new RG.Time.GameEvent(100,
        obj.update.bind(obj), true, 0);
    this.addEvent(updateEvent);
};

/* Returns all components (within entities) inside the engine. */
Engine.prototype.getComponents = function() {
    const entities = this.getEntities();
    let components = [];
    entities.forEach(ent => {
        const ids = Object.keys(ent.getComponents());
        components = components.concat(ids.map(id => parseInt(id, 10)));
    });
    return components;
};

/* Returns all entities in the engine. */
Engine.prototype.getEntities = function() {
    const levels = this.getLevels();
    let entities = [];
    levels.forEach(level => {
        entities = entities.concat(level.getActors());
        entities = entities.concat(level.getItems());
        entities = entities.concat(level.getElements());
    });
    return entities;
};

/* Updates the loop by executing one player command, then looping until
 * next player command.*/
Engine.prototype.updateGameLoop = function(obj) {
    this.playerCommand(obj);
    this.currPlayer = this.nextActor;
    this.nextActor = this.getNextActor();

    // Loop systems once per player action
    this.sysMan.updateLoopSystems();

    // Next/act until player found, then go back waiting for key...
    while (!this.nextActor.isPlayer() && !this.isGameOver()) {
        const action = this.nextActor.nextAction();
        this.doAction(action);

        this.sysMan.updateSystems(); // All systems for each actor

        this.nextActor = this.getNextActor();
        if (RG.isNullOrUndef([this.nextActor])) {
            RG.err('Game.Engine', 'updateGameLoop',
                'Game loop out of events! Fatal!');
            break; // if errors suppressed (testing), breaks the loop
        }
    }
    if (!this.isGameOver()) {
        this.setPlayer(this.nextActor);
    }

};

Engine.prototype.updateLoopSystems = function() {
    this.sysMan.updateLoopSystems();
};

Engine.prototype.playerCommand = function(obj) {
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
    this.sysMan.updateSystems();
    this.playerCommandCallback(this.nextActor);
};

/* Simulates the game without a player.*/
Engine.prototype.simulateGame = function(nTurns = 1) {
    for (let i = 0; i < nTurns; i++) {
        this.nextActor = this.getNextActor();

        if (!this.nextActor.isPlayer()) {
            const action = this.nextActor.nextAction();
            this.doAction(action);
            this.sysMan.updateSystems();
        }
        else {
            RG.err('Engine', 'simulateGame',
                "Doesn't work with player.");
        }
    }
};

/* Adds one level to the engine. Throws an error if level has already been
 * added. */
Engine.prototype.addLevel = function(level) {
    const id = level.getID();
    if (!this._levelMap.hasOwnProperty(id)) {
        this._levelMap[level.getID()] = level;
    }
    else {
        RG.err('Game.Engine', 'addLevel',
            'Level ID ' + id + ' already exists!');
    }
};

/* Removes the given levels from the engine. Throws error if that level
 * has not been added to engine. */
Engine.prototype.removeLevels = function(levels) {
    levels.forEach(level => {
        const id = level.getID();
        if (this._levelMap.hasOwnProperty(id)) {
            const index = this._activeLevels.indexOf(id);
            if (index >= 0) {
                this._activeLevels.splice(index, 1);

                const removedLevel = this._levelMap[id];
                if (removedLevel) {
                    const rmvActors = removedLevel.getActors();
                    for (let i = 0; i < rmvActors.length; i++) {
                        rmvActors[i].get('Action').disable();
                    }
                }
            }
            delete this._levelMap[id];
        }
        else {
            RG.err('Game.Engine', 'removeLevels',
                `No level with ID ${id}`);
        }
    });
};
/* Adds an active level. Only these levels are simulated.*/
Engine.prototype.addActiveLevel = function(level) {
    const levelID = level.getID();
    const index = this._activeLevels.indexOf(levelID);

    // Check if a level must be removed
    if (this._activeLevels.length === (RG.MAX_ACTIVE_LEVELS)) {
        if (index === -1) { // No room for new level, pop one
            const removedLevelID = this._activeLevels.pop();
            const removedLevel = this._levelMap[removedLevelID];
            if (removedLevel) {
                const rmvActors = removedLevel.getActors();
                for (let i = 0; i < rmvActors.length; i++) {
                    const actionComp = rmvActors[i].get('Action');
                    if (actionComp) {
                        actionComp.disable();
                    }
                }
                RG.debug(this, 'Removed active level to make space...');
            }
            else {
                const levelIDs = Object.keys(this._levelMap).join(', ');
                RG.err('Game.Engine', 'addActiveLevel',
                    `Failed to remove level ID ${removedLevelID}.
                    IDs: ${levelIDs}`);
            }
        }
        else { // Level already in actives, move to the front only
            this._activeLevels.splice(index, 1);
            this._activeLevels.unshift(levelID);
            RG.debug(this, 'Moved level to the front of active levels.');
        }
    }

    // This is a new level, enable all actors by enabling Action comp
    if (index === -1) {
        this._activeLevels.unshift(levelID);
        const actActors = level.getActors();
        for (let j = 0; j < actActors.length; j++) {
            const actionComp = actActors[j].get('Action');
            if (actionComp) {
                actionComp.enable();
            }
        }
    }
};
Engine.prototype.notify = function(evtName, args) {
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
        if (this.canPlayerSeeAnimation(args.animation)) {
            if (this.animationCallback) {
                if (this.animation) {
                    this.animation.combine(args.animation);
                }
                else {
                    this.animation = args.animation;
                }
                this.animationCallback(this.animation);
            }
        }
    }
};
/* Main update command. Call this either with cmd to perform, or object
 * containing the pressed keycode. */
Engine.prototype.update = function(obj) {
    if (!this.isGameOver()) {
        this.clearMessages();

        if (this.nextActor !== null) {
            if (obj.hasOwnProperty('code')) {
                const code = obj.code;
                if (!this.isMenuShown() && this.isGUICommand(code)) {
                    this.doGUICommand(code);
                    this.playerCommandCallback(this.nextActor);
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
        this._eventPool.emitEvent(RG.EVT_MSG, {msg: 'GAME OVER!'});
        this.simulateGame(100);
    }
};

//--------------------------------------------------------------
// SCHEDULING/ACTIONS
//--------------------------------------------------------------

/* Returns next actor from the scheduling queue.*/
Engine.prototype.getNextActor = function() {
    return this._scheduler.next();
};

/* Adds an actor to the scheduler. */
Engine.prototype.addActor = function(actor) {
    this._scheduler.add(actor, true, 0);
};

/* Removes an actor from a scheduler.*/
Engine.prototype.removeActor = function(actor) {
    this._scheduler.remove(actor);
};

/* Adds an event to the scheduler.*/
Engine.prototype.addEvent = function(gameEvent) {
    const repeat = gameEvent.getRepeat();
    const offset = gameEvent.getOffset();
    this._scheduler.add(gameEvent, repeat, offset);
};

/* Performs one game action.*/
Engine.prototype.doAction = function(action) {
    this._scheduler.setAction(action);
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

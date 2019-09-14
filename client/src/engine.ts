
import RG from './rg';
import * as Time from './time';
import {SystemManager} from './system/system.manager';
import * as System from './system';
import {EventPool} from './eventpool';
import {Animation} from './animation';
import {Level} from './level';
import {Cell} from './map.cell';
import {BaseActor, SentientActor} from './actor';
import {MessageHandler} from './message-handler';
import {IMessage, IPlayerCmdInput} from './interfaces';

type BrainPlayer = import('./brain/brain.player').BrainPlayer;
type Entity = import('./entity').Entity;

export interface Action {
    doAction: () => void;
}

type Actor = BaseActor | Time.GameEvent;

interface EngineCache {
    visibleCoord: {[key: string]: boolean};
    visibleValid: boolean;
}

export interface UpdateObj {
    update(): void;
}

type SystemAnimation = System.SystemAnimation;

/* Game engine which handles turn scheduling, systems updates and in-game
 * messaging between objects. */
export class Engine {
    public isGUICommand: (code: number) => boolean;
    public doGUICommand: (code: number) => void;

    public nextActor: null | Actor; // TODO add typings
    public animation: null | Animation;
    public animationCallback: (anim: Animation) => void;

    public _levelMap: {[key: number]: Level};
    public _activeLevels: number[]; // Only these levels are simulated
    public _scheduler: Time.Scheduler;
    public _msg: MessageHandler;
    public _eventPool: EventPool;

    public visibleCells: Cell[];

    public _cache: EngineCache;
    public sysMan: SystemManager;

    public hasNotify: boolean;

    public visibleLevelID: number;
    public currPlayer: SentientActor;
    public playerCommandCallback: (player: SentientActor) => void;

    constructor(eventPool: EventPool) {

        // Ignore GUI commands by default
        this.isGUICommand = () => false;
        this.doGUICommand = null;

        this.nextActor = null;
        this.animation = null;
        this.animationCallback = null;

        this._levelMap = {}; // All levels, ID -> level
        this._activeLevels = []; // Only these levels are simulated
        this._scheduler = new Time.Scheduler();
        this._msg = new MessageHandler(eventPool);
        this._eventPool = eventPool;

        this.visibleCells = [];

        this._cache = {
            visibleCoord: {},
            visibleValid: false
        };

        this.sysMan = new SystemManager(this, eventPool);

        this.hasNotify = true;
        this._eventPool.listenEvent(RG.EVT_DESTROY_ITEM, this);
        this._eventPool.listenEvent(RG.EVT_ACT_COMP_ADDED, this);
        this._eventPool.listenEvent(RG.EVT_ACT_COMP_REMOVED, this);
        this._eventPool.listenEvent(RG.EVT_ACT_COMP_ENABLED, this);
        this._eventPool.listenEvent(RG.EVT_ACT_COMP_DISABLED, this);
        this._eventPool.listenEvent(RG.EVT_LEVEL_PROP_ADDED, this);
        this._eventPool.listenEvent(RG.EVT_LEVEL_CHANGED, this);
        this._eventPool.listenEvent(RG.EVT_ANIMATION, this);
    }

    public setSystemArgs(args: {[key: string]: any}): void {
        this.sysMan.setSystemArgs(args);
    }

    public getMessages(): IMessage[] {
        return this._msg.getMessages();
    }

    public hasNewMessages(): boolean {
        return this._msg.hasNew();
    }

    public clearMessages(): void {this._msg.clear();}

    /* Returns true if the menu is shown instead of the level. */
    public isMenuShown(): boolean {
        if (!this.hasAnimation()) {
            if (this.nextActor.isPlayer()) {
                const actor = this.nextActor as SentientActor;
                const brain = actor.getBrain() as BrainPlayer;
                return brain.isMenuShown();
            }
        }
        return false;
    }


    public getPlayer(): SentientActor {
        return this.currPlayer;
    }

    public setPlayer(player: SentientActor): void {
        this.currPlayer = player;
    }

    //--------------------------------------------------------------
    // MANAGING ACTIVE LEVELS
    //--------------------------------------------------------------

    public numActiveLevels(): number {
        return this._activeLevels.length;
    }

    public hasLevel(level: Level): boolean {
        return this._levelMap.hasOwnProperty(level.getID());
    }

    /* Returns active levels within the engine. */
    public getLevels(): Level[] {
        return Object.values(this._levelMap);
    }

    // Not a useless function, re-assigned in Game.Main, but needed
    // here for testing Engine without Game.Main
    public isGameOver(): boolean {
        return false;
    }

    public isActiveLevel(level): boolean {
        const index = this._activeLevels.indexOf(level.getID());
        return index >= 0;
    }

    //--------------------------------------------------------------
    // EVENT LISTENING
    //--------------------------------------------------------------


    public hasAnimation(): boolean {
        return this.animation !== null &&
            this.animation.hasFrames();
    }

    public finishAnimation(): void {
        this.animation = null;
    }

    public setVisibleArea(level: Level, cells: Cell[]): void {
        this.visibleLevelID = level.getID();
        this.visibleCells = cells;
        this._cache.visibleCoord = {};
        this._cache.visibleValid = false;
    }

    /* Returns true if player can see the given animation. In general, true
     * whenever animation contains at least one cell visible to the player. */
    public canPlayerSeeAnimation(animation): boolean {
        if (animation.levelID === this.visibleLevelID) {

            // Build the cache if not valid
            if (!this._cache.visibleValid) {
                this.visibleCells.forEach((cell: Cell) => {
                    this._cache.visibleCoord[cell.getKeyXY()] = true;
                });
                this._cache.visibleValid = true;
            }

            // Check overlap between cached coord and coord in animation
            return animation.hasCoord(this._cache.visibleCoord);
        }
        return false;
    }

    public enableAnimations(): void {
        const sysAnim = this.sysMan.get('Animation') as SystemAnimation;
        sysAnim.enableAnimations();
    }

    public disableAnimations(): void {
        const sysAnim = this.sysMan.get('Animation') as SystemAnimation;
        sysAnim.disableAnimations();
    }

    /* Adds a TimeSystem into the engine. Each system can be updated with given
     * intervals instead of every turn or loop.*/
    public addTimeSystem(name, obj): void {
        // Must schedule the system to activate it
        const updateEvent = new Time.GameEvent(100,
            obj.update.bind(obj), true, 0);
        this.addEvent(updateEvent);
    }

    /* Can schedule any object to be updated on a certain periodic interval. */
    public addRegularUpdate(obj: UpdateObj, interval = 100): void {
        // Must schedule the system to activate it
        const updateEvent = new Time.GameEvent(interval,
            obj.update.bind(obj), true, 0);
        this.addEvent(updateEvent);
    }

    /* Returns all component IDs (within entities) inside the engine. */
    public getComponents(): number[] {
        const entities = this.getEntities();
        let components = [];
        entities.forEach(ent => {
            const ids = Object.keys(ent.getComponents());
            components = components.concat(ids.map(id => parseInt(id, 10)));
        });
        return components;
    }

    /* Returns all entities in the engine excluding Levels. */
    public getEntities(): Entity[] {
        const levels: Level[] = this.getLevels();
        let entities = [];
        levels.forEach(level => {
            entities = entities.concat(level.getActors());
            entities = entities.concat(level.getItems());
            entities = entities.concat(level.getElements());
        });
        return entities;
    }

    /* Updates the loop by executing one player command, then looping until
     * next player command.*/
    public updateGameLoop(obj: IPlayerCmdInput): void {
        this.playerCommand(obj);
        this.currPlayer = this.nextActor as SentientActor;
        this.nextActor = this.getNextActor();

        // Loop systems once per player action
        this.sysMan.updateLoopSystems();

        // Next/act until player found, then go back waiting for key...
        while (!this.nextActor.isPlayer() && !this.isGameOver()) {

            // TODO refactor R1
            const action = this.nextActor.nextAction();
            this.doAction(action);
            this.sysMan.updateSystems(); // All systems for each actor
            this._scheduler.setAction(action);

            this.nextActor = this.getNextActor();
            if (RG.isNullOrUndef([this.nextActor])) {
                RG.err('Game.Engine', 'updateGameLoop',
                    'Game loop out of events! Fatal!');
                break; // if errors suppressed (testing), breaks the loop
            }
        }
        if (!this.isGameOver()) {
            this.setPlayer(this.nextActor as SentientActor);
        }

    }

    public playerCommand(obj: IPlayerCmdInput): void {
        if (this.nextActor.isPlayer() === false) {
            this.nextActorNotPlayerError();
        }
        const player = this.nextActor as SentientActor;

        // TODO refactor R1
        const action = player.nextAction(obj);
        this.doAction(action);
        this.sysMan.updateSystems();

        // Need to check if any of the systems invalidated the command
        if (!player.has('ImpossibleCmd')) {
            this._scheduler.setAction(action);
        }
        else {
            player.remove('ImpossibleCmd');
        }
        const msg = player.get('Action').getMsg();
        if (msg !== '') {
            RG.gameDanger({cell: player.getCell(), msg});
            player.get('Action').setMsg('');
        }

        this.playerCommandCallback(player);
    }

    /* Simulates the game without a player. Crashes if player is encountered. */
    public simulateGame(nTurns = 1): void {
        for (let i = 0; i < nTurns; i++) {
            this.nextActor = this.getNextActor();

            if (!this.nextActor.isPlayer()) {
                // TODO refactor R1
                const action = this.nextActor.nextAction();
                this.doAction(action);
                this.sysMan.updateSystems();
                this._scheduler.setAction(action);
            }
            else {
                RG.err('Engine', 'simulateGame',
                    'Doesn\'t work with player.');
            }
        }
    }

    /* Adds one level to the engine. Throws an error if level has already been
     * added. */
    public addLevel(level: Level): void {
        const id = level.getID();
        if (!this._levelMap.hasOwnProperty(id)) {
            this._levelMap[level.getID()] = level;
        }
        else {
            RG.err('Game.Engine', 'addLevel',
                'Level ID ' + id + ' already exists!');
        }
    }

    /* Removes the given levels from the engine. Throws error if that level
     * has not been added to engine. */
    public removeLevels(levels: Level[]): void {
        levels.forEach((level: Level) => {
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
    }

    /* Adds an active level. Only these levels are simulated.*/
    public addActiveLevel(level: Level): void {
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
    }

    public notify(evtName, args) {
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
    }

    /* Main update command. Call this either with cmd to perform, or object
     * containing the pressed keycode. */
    public update(obj: IPlayerCmdInput): void {
        if (!this.isGameOver()) {
            this.clearMessages();

            if (this.nextActor !== null) {
                if (obj.hasOwnProperty('code')) {
                    const code = obj.code;
                    if (!this.isMenuShown() && this.isGUICommand(code)) {
                        this.doGUICommand(code);
                        this.playerCommandCallback(this.nextActor as SentientActor);
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
    }

    //--------------------------------------------------------------
    // SCHEDULING/ACTIONS
    //--------------------------------------------------------------

    /* Returns next actor from the scheduling queue.*/
    public getNextActor() {
        return this._scheduler.next();
    }

    /* Adds an actor to the scheduler. */
    public addActor(actor) {
        this._scheduler.add(actor, true, 0);
    }

    /* Removes an actor from a scheduler.*/
    public removeActor(actor) {
        this._scheduler.remove(actor);
    }

    /* Adds an event to the scheduler.*/
    public addEvent(gameEvent: Time.GameEvent): void {
        const repeat = gameEvent.getRepeat();
        const offset = gameEvent.getOffset();
        this._scheduler.add(gameEvent, repeat, offset);
    }

    /* Performs one game action.*/
    public doAction(action) {
        action.doAction();
        if (action.hasOwnProperty('energy')) {
            if (action.hasOwnProperty('actor')) {
                const actor = action.actor;
                if (actor.has('Action')) {
                    actor.get('Action').addEnergy(action.energy);
                }
            }
        }
    }

    public toJSON(): any {
        return {
            msgHandler: this._msg.toJSON()
        };
    }

    /* Throws an error using RG.err because next actor was not player. */
    protected nextActorNotPlayerError(): void {
        let msg = '';
        if (this.nextActor.hasOwnProperty('isEvent')) {
            msg = 'Expected player, got an event: ';
        }
        else {
            const actor = this.nextActor as BaseActor;
            msg = 'Expected player, got: ' + actor.getName();
        }
        msg += '\n' + JSON.stringify(this.nextActor);
        RG.err('Engine', 'playerCommand', msg);
    }
}

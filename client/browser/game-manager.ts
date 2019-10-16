/* Contains browser-side, framework-agnostic code. This manages the game
 * session, plugins, loading and savings. This object must be created inside the
 * GUI framework (react/vue/angular/vanilla), and mainLoop() used to start the
 * game loop. More detailed sequence of functions required:
 *   - createNewGame() creates a new GameMain instance and starts a
 *      an animation using requestAnimationFrame()
 *   - this.frameID can be used to stop it
 */

import RG from '../src/rg';
import ROT from '../../lib/rot';

import {Keys} from '../src/keymap';
import {GameMain} from '../src/game';
import {GameSave} from '../src/gamesave';
import {ScreenBuffered} from '../gui/screen';
import {MultiKeyHandler} from '../gui/multikey-handler';
import {DriverBase, PlayerDriver} from '../../tests/helpers/player-driver';
import {MyWorkerImport} from '../util';
import {FromJSON} from '../src/game.fromjson';
import {PluginManager} from '../gui/plugin-manager';
import {ItemBase} from '../src/item';
import {SentientActor} from '../src/actor';
import {Cell} from '../src/map.cell';
import {WorldConf} from '../data/conf.world';
import {CellClickHandler} from '../gui/cell-click-handler';
import {Level} from '../src/level';
import {FactoryGame} from '../src/factory.game';
import {Dice} from '../src/dice';
import {OWMap} from '../src/overworld.map';
import {KeyCode} from '../gui/keycode';
import {ObjectShell} from '../src/objectshellparser';
import {verifySaveData} from '../src/verify';
import {Frame} from '../src/animation';

import {Persist} from '../src/persist';
import md5 = require('js-md5');
import dbg = require('debug');

import {TCoord, IMessage, IPlayerCmdInput, CmdInput} from '../src/interfaces';

const {KeyMap} = Keys;
const debug = dbg('bitn:game-manager');

type UpdateFunc = (arg: any) => void;

export interface GameStateTop {
    visibleCells: Cell[];
    autoTarget: boolean;
    useModeEnabled: boolean;
    isTargeting: boolean;
    targetInRange: boolean;
    numCurrCell: number;
    enemyCells: Cell[];
}

export const VIEW_MAP = 0;
export const VIEW_PLAYER = 1;

export type TPlayerStatusGUI = [string, string, string, string];

// Different player status can be defined here
export const STATUS_COMPS_GUI: TPlayerStatusGUI[] = [
    // Comp name, style   , text  , react-key
    ['Charm', 'success', 'Charming', 'stat-charm'],
    ['Coldness', 'primary', 'Cold', 'stat-coldness'],
    ['Ethereal', 'info', 'Ethereal', 'stat-ethereal'],
    ['Entrapped', 'danger', 'Trapped', 'stat-trapped'],
    ['Fear', 'danger', 'Afraid', 'stat-fear'],
    ['Flying', 'primary', 'Flying', 'stat-flying'],
    ['Paralysis', 'danger', 'Paralysed', 'stat-paralysis'],
    ['Poison', 'danger', 'Poisoned', 'stat-poison'],
    ['PowerDrain', 'success', 'Power drain', 'stat-power-drain'],
    ['Stun', 'danger', 'Stunned', 'stat-stun'],
    ['MindControl', 'danger', 'Mind controlled', 'stat-mind-ctrl']
];

/* Contains logic that is not tightly coupled to the GUI.*/
export class TopLogic {

  public static describeCell(cell: Cell, seenCells: Cell[]): void {
    const index = seenCells.indexOf(cell);
    if (index !== -1) {
      if (cell.hasActors()) {
        const actor = cell.getFirstActor();
        const msg = 'You see ' + actor.getName();
        RG.gameMsg(msg);
      }
      else if (cell.hasItems()) {
        const items = cell.getItems();
        if (items.length > 1) {
          RG.gameMsg('There are several items there');
          RG.gameMsg('You see ' + items[0].getName() + ' on top');
        }
        else {
          RG.gameMsg('You see ' + items[0].getName()
            + ' lying there.');
        }
      }
      else if (cell.hasPropType('door')) {
        RG.gameMsg('You see a door there.');
      }
      else {
        RG.gameMsg('There is nothing there.');
      }
    }
    else {
      RG.gameWarn('You cannot see there.');
    }
  }

  public static getAdjacentCell(player, code): Cell | null {
    if (KeyMap.inMoveCodeMap(code) || KeyMap.isRest(code)) {
      const [x, y] = player.getXY();
      const diffXY = KeyMap.getDiff(code, x, y);
      if (diffXY !== null) {
        return player.getLevel().getMap().getCell(diffXY[0], diffXY[1]);
      }
    }
    return null;
  }

}

class ProxyListener {
    public hasNotify: boolean;
    public cbNotify: (evtName: string, obj) => void;

     constructor(cbNotify) {
         this.hasNotify = true;
         this.cbNotify = cbNotify;
     }

    public notify(evtName, obj) {
        this.cbNotify(evtName, obj);
    }

}


type ProgressCb = (msg: any) => void;

/* Contains top-level logic for managing instances of games. This is non-GUI
 * related functions like automating player movement etc, which are not
 * strictly related to Graphical things.
 */
export class GameManager {

    public updateCb: UpdateFunc;

    public boardClassName: string;
    public ctrlMode: string;
    public frameID: number;
    public game: any;
    public gameConf: any;
    public gameGUIState: GameStateTop;
    public gameSave: any; // TODO GameSave;
    public guiCommands: {[key: string]: (...args: any[]) => void};
    public multiHandler: MultiKeyHandler;
    public pluginManager: PluginManager;
    public recordedCommands: CmdInput[];
    public screen: ScreenBuffered;
    public showMap: boolean;
    public viewportX: number;
    public viewportY: number;
    public viewportPlayerX: number;
    public viewportPlayerY: number;
    public verifySaveData: boolean;
    public playerDriver: DriverBase;
    public listener: ProxyListener;
    public autoModeKeyBuffer: number[];
    public keysEnabled: boolean;
    public progressCb: ProgressCb;
    public keyPending: boolean;
    public finishAutoOnSight: boolean;
    public finishAutoDist: number;
    public nextCode: number;
    public hasNotify: boolean;
    public savedPlayerList: SentientActor[];
    public animationID: number;
    public animation: null | Frame;

    constructor(updateCb: UpdateFunc) {
        if (!updateCb) {
            RG.err('GameManager', 'constructor',
               'no updateCb given (ie setState in react)');
        }
        this.updateCb = updateCb;

        this.doGUICommand = this.doGUICommand.bind(this);
        this.isGUICommand = this.isGUICommand.bind(this);
        this.mainLoop = this.mainLoop.bind(this);

        // For listening to game events
        this.notify = this.notify.bind(this);
        this.hasNotify = true;
        this.listener = new ProxyListener(this.notify);
        this.animation = null;

        this.game = null;
        this.gameSave = new GameSave();
        this.pluginManager = new PluginManager();

        // Params to control the auto-movement (when clicking a cell etc)
        this.finishAutoOnSight = true;
        this.finishAutoDist = 3;

        // Holds game-state specific info for GUI (see resetGameState)
        this.resetGameState();

        this.viewportPlayerX = 35; // * 2
        this.viewportPlayerY = 15; // * 2
        this.viewportX = 35; // * 2
        this.viewportY = 15; // * 2
        this.resetGameControls();

        this.verifySaveData = true; // Checks JSON before saving if true

        this.gameSave.setStorage(window.localStorage);
        this.savedPlayerList = this.gameSave.getPlayersAsList();

        // Params to control the auto-movement (when clicking a cell etc)
        this.finishAutoOnSight = true;
        this.finishAutoDist = 3;

        // Simple configuration for the game
        this.gameConf = FactoryGame.getGameConf();
        this.gameConf.world = WorldConf;
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    public resetGameControls(): void {
        // Used for request animation frame
        this.frameID = null;

        this.multiHandler = new MultiKeyHandler();

        this.screen = new ScreenBuffered(this.viewportX, this.viewportY);
        this.keyPending = false;
        this.keysEnabled = false;
        this.autoModeKeyBuffer = [];
        this.ctrlMode = 'MANUAL';
        this.recordedCommands = [];
    }

    public setGameSettings(name: string, value: any): void {
        this.gameConf[name] = value;
    }

    public isGameValid(): boolean {
        return !!this.game;
    }

    public getPlayer(): SentientActor {
        return this.game.getPlayer();
    }

    public setPlayerDriver(): void {
        const player = this.game.getPlayer();
        this.playerDriver = new PlayerDriver(player, this.game);
        player.remove('Hunger');
        // this.playerDriver.screenPeriod = -1;
        this.setAutoModeNoFinish();
    }

    public setAutoMode(): void {
        this.ctrlMode = 'AUTOMATIC';
    }

    public setAutoModeNoFinish(): void {
        this.ctrlMode = 'AUTOMATIC';
        this.finishAutoOnSight = false;
    }

    public renderScreen(): void {
        const map = this.game.getVisibleMap();
        const [playX, playY] = this.getPlayer().getXY();
        if (map) {
            this.screen.renderWithRLE(
                playX, playY, map, this.gameGUIState.visibleCells,
                this.animation);
        }
    }

    /* Resets the GUI game state.*/
    public resetGameState(): void {
        this.gameGUIState = {
            autoTarget: false,
            visibleCells: [],
            useModeEnabled: false,
            isTargeting: false,
            targetInRange: false,
            enemyCells: [],
            numCurrCell: 0
        };
    }

    public guiState(name: string, value?: any) {
        if (!value) {return this.gameGUIState[name];}
        else {
            console.log('guiState setting value', name, 'to', value);
            this.gameGUIState[name] = value;
            return this.gameGUIState[name];
        }
    }

    public setGUICommands(guiCommands: {[key: string]: (...args: any[]) => void}): void {
        this.guiCommands = guiCommands;
    }

    public canUseWorker(): boolean {
        return (typeof (window as any).Worker !== 'undefined') &&
            !this.pluginManager.anyPluginsEnabled();
    }

    public getPlugins() {
        return this.pluginManager.getPlugins();
    }

    /* Returns true if given command is a GUI command. */
    public isGUICommand(code: number): boolean {
        if (this.gameGUIState) {
            if (this.gameGUIState.autoTarget && code === Keys.VK.t) {
                return false;
            }
            else if (this.gameGUIState.useModeEnabled) {
                return true;
            }
            else {
                return this.guiCommands.hasOwnProperty(code);
            }
        }
        return false;
    }

    public cancelAnim(): void {
        if (this.frameID) {
            cancelAnimationFrame(this.frameID);
        }
    }

    /* Restarts the main loop */
    public restartMainLoop(): void {
        this.cancelAnim();
        this.frameID = requestAnimationFrame(this.mainLoop);
    }

    public setPlayerName(name: string): void {
        this.gameConf.playerName = name;
    }

    public getScreen(): ScreenBuffered {
        return this.screen;
    }

    public getPlayersAsList(): string[] {
        return this.gameSave.getPlayersAsList();
    }


    public enableKeys() {
      if (!this.keysEnabled) {
        document.addEventListener('keypress', this.handleKeyDown, true);
        this.keysEnabled = true;
      }
    }

    public getRecordedCommands(): CmdInput[] {
        return this.recordedCommands;
    }

    public disableKeys(): void {
      if (this.keysEnabled) {
        document.removeEventListener('keypress', this.handleKeyDown, true);
        this.keysEnabled = false;
      }
    }

    public isValidKey(keyCode: number): boolean {
        return Keys.isValidKey(keyCode) ||
            !!this.guiCommands[keyCode] ||
            Keys.isNumeric(keyCode);
    }

    /* Listens for player key presses and handles them.*/
    public handleKeyDown(evt): void {
        evt.stopPropagation();
        evt.preventDefault();
        const keyCode = KeyCode.getKeyCode(evt);
        if (this.keyPending === false) {
            this.keyPending = true;
            this.nextCode = keyCode;
            if (!this.isGUICommand(keyCode)) {
                this.gameGUIState.isTargeting = false;
            }

            if (Keys.KeyMap.isMultiPurpose(keyCode)) {
                const player = this.game.getPlayer();
                const keySeq = this.multiHandler.getKeys(player);
                if (keySeq && keySeq.length > 0) {
                    this.playerDriver = new CellClickHandler(null, this.game);
                    this.playerDriver.setKeys(keySeq);
                    if (this.playerDriver.hasKeys()) {
                        this.setAutoMode();
                    }
                }
            }
        }
    }

    /* Saves the game position.*/
    public saveGame(cb): void {
        if (this.game) {
            const name = this.game.getPlayer().getName();
            const persist = new Persist(name);

            this.gameToJSON().then(json => {
                if (this.verifySaveData) {
                    verifySaveData(json);
                }
                persist.toStorage(json, () => {
                    this.gameSave.save(this.game, this.gameConf);
                    this.savedPlayerList = this.gameSave.getPlayersAsList();
                    RG.gameMsg('Your progress has been saved.');
                    cb();
                });
            });
        }
    }

    /* Deletes a saved game from the list. */
    public deleteGame(name: string, afterCb: () => void): void {
        if (name) {
            const persist = new Persist(name);
            persist.deleteStorage(() => {
                this.gameSave.deletePlayer(name);
                this.savedPlayerList = this.gameSave.getPlayersAsList();
                afterCb();
            });
        }
    }

    public isMenuShown(): boolean {
        if (this.game) {
            return this.game.isMenuShown();
        }
        return false;
    }

    public getMenu() {
        if (this.game) {
            return this.game.getMenu();
        }
        return null;
    }


    public getMessages(): IMessage[] {
        if (this.game && this.game.hasNewMessages()) {
            return this.game.getMessages();
        }
        return [];
    }

    public getOWAndPlayerPos(): [OWMap, TCoord] {
        let overworld = null;
        let playerOwPos = null;
        if (this.game) {
            overworld = this.game.getOverWorld();

            if (overworld) {
                playerOwPos = this.game.getPlayerOwPos();
                if (playerOwPos) {
                    this.game.setOverWorldExplored(playerOwPos);
                }
            }
        }
        return [overworld, playerOwPos];
    }

    /* Sets up the event pool, GUI callbacks, animation frame and first
     * visible cells for a restored game. */
    public initRestoredGame(game): void {
        this.cancelAnim();
        this.resetGameState();
        this.game = game;
        this.initBeforeNewGame();
    }

    /* Converts the current game into JSON. */
    public gameToJSON() {
        return new Promise((resolve, reject) => {
            try {
                const json = this.game.toJSON();
                resolve(json);
            }
            catch (e) {
                reject(e);
            }
        });
    }

    /* Loads a saved game from a JSON. */
    public loadGame(playerName: string, updateCb: UpdateFunc): void {
        if (playerName) {
            const persist = new Persist(playerName);
            persist.fromStorage().then(result => {
                const fromJSON = new FromJSON();

                // Pick JSON matching the selected player name
                const json = result;
                const game = new GameMain();
                const restGame = fromJSON.createGame(game, json);
                const player = restGame.getPlayer();
                if (player !== null) {
                    this.gameConf.loadedPlayer = player;
                    this.gameConf.loadedLevel = this.gameSave.getDungeonLevel();
                    const confObj = this.gameSave.getPlayersAsObj()[playerName];
                    this.restoreGameConf(confObj);
                    updateCb(restGame);
                }
            });
        }
    }

    public restoreGameConf(obj): void {
        const props = ['cols', 'rows', 'sqrPerActor', 'sqrPerItem', 'levels'];
        for (let i = 0; i < props.length; i++) {
            this.gameConf[props[i]] = obj[props[i]];
        }
    }

    /* Sets the event listeners, GUI callbacks and debugging refs before
     * starting the game. */
    public initBeforeNewGame(): void {
        console.log('initBeforeNewGame starting also mainLoop');

        this.game.setGUICallbacks(this.isGUICommand, this.doGUICommand);
        this.game.setAnimationCallback(this.playAnimation.bind(this));
        this.setDebugRefsToWindow();

        const player = this.game.getPlayer();
        this.gameGUIState.visibleCells = player.getBrain().getSeenCells();

        if (!this.gameGUIState.visibleCells) {
            RG.err('GameManager', 'initBeforeNewGame', 'No visibleCells');
        }

        const eventPool = this.game.getPool();
        eventPool.listenEvent(RG.EVT_LEVEL_CHANGED, this.listener);
        eventPool.listenEvent(RG.EVT_DESTROY_ITEM, this.listener);
        eventPool.listenEvent(RG.EVT_PLAYER_KILLED, this.listener);

        this.frameID = requestAnimationFrame(this.mainLoop);
        this.updateCb({render: true});
    }

    public mainLoop(): void {
        if (this.keyPending === true || this.ctrlMode === 'AUTOMATIC') {
            const code = this.getNextCode();
            if ((code as IPlayerCmdInput).cmd) {
                this.game.update(code);
            }
            else {this.game.update({code});}
            this.recordedCommands.push(code);

            if (!this.game.visibleCells) {
                RG.err('GameManager', 'mainLoop', 'No visible cells');
            }
            this.gameGUIState.visibleCells = this.game.visibleCells;

            if (this.game.isGameOver()) {
                this.updateCb({render: true, showGameMenu: false});
            }
            else {
                const player = this.game.getPlayer();
                const brain = player.getBrain();
                const updates: any = {render: true, showGameMenu: false};
                if (brain.hasTargetSelected()) {
                    updates.selectedCell = brain.getSelectedCells();
                    this.screen.setSelectedCell(updates.selectedCell);
                    if (brain.isTargeting()) {
                        if (!brain.isTargetInRange()) {
                            this.screen.setStyle('selectedCell',
                                'cell-not-in-range');
                        }
                        else {
                            this.screen.setStyle('selectedCell',
                                'cell-target-selected');
                        }
                    }
                    this.gameGUIState.isTargeting = true;
                }
                else {
                    this.gameGUIState.isTargeting = false;
                    updates.selectedCell = null;
                    this.screen.setSelectedCell(null);
                }
                this.updateCb(updates);
            }
            this.keyPending = false;
            this.checkIfAutoModeDone();
        }
        this.frameID = requestAnimationFrame(this.mainLoop);
    }

    /* Checks and makes adjustments if auto-ctrl mode should be terminated.
     * Usually this happens when auto-mode command fails or if enemy is
     * seen. */
    public checkIfAutoModeDone() {
        if (this.playerDriver) {
            if (!this.playerDriver.hasKeys()) {
                this.ctrlMode = 'MANUAL';
            }
            else if (this.finishAutoOnSight) {
                const [pX, pY] = this.game.getPlayer().getXY();
                const enemies = RG.findEnemyCellForActor(this.game.getPlayer(),
                    this.gameGUIState.visibleCells);
                if (enemies.length > 0) {
                    let enemyTooClose = false;
                    enemies.forEach(enemy => {
                        const [eX, eY] = enemy.getXY();
                        const [dX, dY] = RG.dXdYAbs([pX, pY], [eX, eY]);
                        if (dX < this.finishAutoDist
                            || dY < this.finishAutoDist) {
                            enemyTooClose = true;
                        }

                    });

                    if (enemyTooClose) {
                        RG.gameMsg('You spot an enemy');
                        this.ctrlMode = 'MANUAL';
                        this.playerDriver.reset();
                    }
                }
            }
        }
    }

    /* Sets some global variables which ease up the debugging with console.
     */
    public setDebugRefsToWindow(): void {
        if (debug.enabled) {
            (window as any).GAME = this.game; // For debugging
            const player = this.game.getPlayer();
            (window as any).PLAYER = player; // For debugging
            (window as any).RG = RG; // For debugging
            (window as any).PARSER = ObjectShell.getParser(); // For debugging
        }
    }

    /* Returns the next key, either from player or from click handler. */
    public getNextCode(): CmdInput {
        if (this.ctrlMode === 'AUTOMATIC') {
            const nextCode = this.playerDriver.getNextCode();
            if (nextCode) {
                return nextCode;
            }
            else {
                this.ctrlMode = 'MANUAL';
                return Keys.KEY.NO_ACTION;
            }
        }
        else {
            return this.nextCode;
        }
    }

    /* Sets the size of the shown map.*/
    public setViewSize(obj, xOrY) {
        if (obj === '+') {
            if (xOrY === 'X') {this.viewportX += 5;}
            else {this.viewportY += 2;}
        }
        if (obj === '-') {
            if (xOrY === 'X') {this.viewportX -= 5;}
            else {this.viewportY -= 2;}
        }
        this.screen.setViewportXY(this.viewportX, this.viewportY);
    }

    /* Toggles view between normal view and zoomed out map view. */
    public setViewType(type: number): void {
        if (type === VIEW_MAP) {
           this.viewportPlayerX = this.viewportX;
           this.viewportPlayerY = this.viewportY;
           this.viewportX = this.game.getPlayer().getLevel().getMap().cols;
           this.viewportY = this.game.getPlayer().getLevel().getMap().rows;
           this.screen.setMapShown(true);
           this.screen.setViewportXY(this.viewportX, this.viewportY);

           this.boardClassName = 'game-board-map-view';
           this.showMap = true;
        }
        else if (type === VIEW_PLAYER) {
            this.viewportX = this.viewportPlayerX;
            this.viewportY = this.viewportPlayerY;
            this.screen.setMapShown(false);
            this.screen.setViewportXY(this.viewportX, this.viewportY);
            this.boardClassName = 'game-board-player-view';
            this.showMap = false;
        }
    }

    public setSeedName(name: string): void {
        let seed = parseInt(name, 10);
        if (Number.isNaN(seed)) {
            const hash = md5(name);
            seed = parseInt(hash, 16);
        }
        if (name === '') {
            seed = new Date().getTime();
        }
        ROT.RNG.setSeed(seed);
        Dice.RNG.setSeed(seed);
        this.gameConf.seed = seed;
    }

    /* Finds the nearest enemy and shows its name when 'l' is pressed. */
    public GUILook(updateCb): void {
        if (this.gameGUIState.isTargeting) {
            const nextCell = this.getNextTargetCell();
            if (nextCell) {
                const actor = nextCell.getActors()[0];
                const msg = `You see ${actor.getName()} nearby.`;
                this.screen.setSelectedCell(nextCell);
                RG.gameMsg(msg);
                updateCb({selectedCell: nextCell});
            }
            else {
                this.gameGUIState.isTargeting = false;
                this.screen.setSelectedCell(null);
                updateCb({selectedCell: null});
            }
        }
        else {
            this.gameGUIState.isTargeting = true;
            this.gameGUIState.enemyCells = RG.findEnemyCellForActor(
                this.game.getPlayer(), this.gameGUIState.visibleCells);
            this.gameGUIState.numCurrCell = 0;
            let msg = 'You do not see any enemies nearby.';
            if (this.gameGUIState.enemyCells.length > 0) {
                const cell = this.gameGUIState.enemyCells[0];
                const actor = cell.getActors()[0];
                msg = `You see ${actor.getName()} nearby.`;
                this.screen.setSelectedCell(cell);
                RG.gameMsg(msg);
                updateCb({selectedCell: cell});
            }
            else {
                RG.gameMsg(msg);
            }
        }
    }

    public getNextTargetCell(): Cell | null {
        const numCells = this.gameGUIState.enemyCells.length;
        if (numCells > 0) {
            let numNextCell = this.gameGUIState.numCurrCell + 1;
            if (numNextCell >= numCells) {
                numNextCell = 0;
            }

            this.gameGUIState.numCurrCell = numNextCell;
            return this.gameGUIState.enemyCells[numNextCell];
        }
        return null;
    }

    public setGameSetting(name: string, value): void {
        this.gameConf[name] = value;
    }


    public setSelectedCell(cell: Cell): void {
        this.screen.setSelectedCell(cell);
    }

    /* Creates a new game instance.*/
    public createNewGame(preCb: () => void): void {
        this.cancelAnim();
        this.resetGameState();
        this.resetGameControls();

        if (RG.isNullOrUndef([this.gameConf.seed])) {
            this.gameConf.seed = new Date().getTime();
        }

        preCb();
        if (this.canUseWorker()) {
            console.log('documentURI:', document.documentURI);
            this.createGameWorker();
        }
        else {
            const gameFactory = new FactoryGame();
            this.game = gameFactory.createNewGame(this.gameConf);
            this.initBeforeNewGame();
        }
    }

    /* Creates the new game using a worker to not block the main thread and
     * GUI updates. */
    public createGameWorker(): void {
        /* eslint global-require: 0 */
        const worker = new MyWorkerImport();
        worker.onmessage = (e) => {
            const msg = e.data;
            if (msg.progress) {
                this.progressCb(msg.progress);
            }
            else if (msg.ready) {
                const gameJSON = JSON.parse(msg.data);
                const fromJSON = new FromJSON();
                let game = new GameMain();
                game = fromJSON.createGame(game, gameJSON);

                this.game = game;
                this.initBeforeNewGame();
            }
            else if (msg.error) {
                throw new Error('Worker threw error: ' + msg.error);
            }
        };
        worker.postMessage([this.gameConf]);
    }

    /* Creates game from editor data. */
    public createGameFromLevels(levels: Level[]): void {
        this.cancelAnim();
        this.resetGameState();
        if (this.game !== null) {
            delete this.game;
        }
        // Prepare game configuration
        const conf = Object.assign({}, this.gameConf);
        conf.levels = levels;
        conf.playMode = 'from_levels';

        const gameFactory = new FactoryGame();
        this.game = gameFactory.createNewGame(conf);
        this.initBeforeNewGame();
    }

    public useClickHandler(x, y, cell, cmd): void {
        this.playerDriver = new CellClickHandler(null, this.game);
        this.playerDriver.handleClick(x, y, cell, cmd);

        if (this.playerDriver.hasKeys()) {
            this.setAutoMode();
        }
    }


    public getCellCurrMap(x, y): Cell | null {
        const map = this.game.getPlayer().getLevel().getMap();
        if (map.hasXY(x, y)) {
            return map.getCell(x, y);
        }
        return null;
    }

    /* When listening events, component gets notification via this
     * method.*/
    public notify(evtName: string, obj): void {
        if (evtName === RG.EVT_LEVEL_CHANGED) {
            const actor = obj.actor;
            if (actor.isPlayer()) {
                this.screen.invalidate();
                this.gameGUIState.visibleCells = actor.getBrain().getSeenCells();
                this.updateCb({render: true});
            }
        }
        else if (evtName === RG.EVT_PLAYER_KILLED) {
            this.deleteGame(obj.actor.getName(), () => {
                this.updateCb({render: true});
            });
        }
    }

    /* Plays the animation until all animation frames have been shown. */
    public playAnimation(): void {
        if (this.game.hasAnimation()) {
            const animFrame = this.game.getAnimationFrame();
            this.animation = animFrame;
            this.updateCb({render: true, animation: animFrame});
            this.animationID = requestAnimationFrame(
                this.playAnimation.bind(this));
        }
        else {
            // Animation is finished, go back to mainLoop
            this.animation = null;
            this.game.finishAnimation();
            this.updateCb({render: true, animation: null});
        }
    }

    public onLoadRecordedKeys(jsonKeysArray): void {
        const player = this.game.getPlayer();
        this.playerDriver = new DriverBase(player, this.game);
        this.playerDriver.setKeys(jsonKeysArray);
        this.setAutoModeNoFinish();
    }

    /* Called when a JSON file is imported. This can be a save game or a
     * plugin */
    public onLoadCallback(jsonData, updateCb: () => void): void {
        if (jsonData.plugin) {
            const entry = this.pluginManager.readJSON(jsonData);
            const parser = RG.ObjectShell.getParser();
            parser.parseShellData(entry.getData());
            (window as any).parser = parser;
        }
        else {
            const fromJSON = new FromJSON();
            const game = new GameMain();
            const restGame = fromJSON.createGame(game, jsonData);
            const player = restGame.getPlayer();
            if (player !== null) {
                this.initRestoredGame(restGame);
            }
        }
        updateCb();
    }

    /* Calls a GUI command corresponding to the code.*/
    public doGUICommand(code, ...args) {
        if (this.gameGUIState.useModeEnabled) {
            this.guiCommands[Keys.GUI.Use](code);
        }
        else if (this.guiCommands.hasOwnProperty(code)) {
            console.log('doGUICommand() Calling GUI command with code', code);
            this.guiCommands[code](code);
        }
        else if (Keys.KeyMap.isGoto(code)) {
            this.guiCommands.GOTO(...args as [number, number]);
        }
        else {
            console.error('Unknown keycode for GUI command.');
            this.gameGUIState.useModeEnabled = false;
        }
    }

    public useItem(code: number, item: ItemBase): void {
         if (this.gameGUIState.useModeEnabled) {
            this.gameGUIState.useModeEnabled = false;
            if (item !== null) {

                const player = this.game.getPlayer();
                const cell = TopLogic.getAdjacentCell(player, code);
                if (cell !== null) {
                    this.game.update({
                        cmd: 'use', target: cell, item
                    });
                    if (item!.has('OneShot')) {
                        this.updateCb({selectedItem: null});
                    }
                }
                else {
                    RG.gameWarn('There are no targets there.');
                }
            }
            else {
                RG.gameWarn('No item was selected for use!');
            }
        }
    }

    /* loadScriptId must match the #id of <input type=file> element. */
    public onLoadScript(loadScriptId: string, updateCb): void {
        const fileElem = document.querySelector(loadScriptId);
        const fileList = (fileElem as HTMLInputElement).files;
        const file = fileList[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const text = reader.result.toString();
                this.pluginManager.loadScript(text);
                updateCb();
            };
            reader.readAsText(file);
        }
    }

    public onLoadFromScript(id: string, updateCb): void {
        console.log('onLoadFromScript called here');
        this.readTextFromFile(id, (text) => {
            try {
                const entry = this.pluginManager.loadGameFromScript(text);
                if (entry.levels) {
                    this.createGameFromLevels(entry.levels);
                }
                else if (entry.game) {
                    this.cancelAnim();
                    this.resetGameState();
                    this.game = entry.game;
                    this.initBeforeNewGame();
                }
            }
            catch (e) {
                console.error(e, e.message);
            }
        });
    }

    public readTextFromFile(id: string, cb): void {
        const fileElem = document.querySelector(id);
        const fileList = (fileElem as HTMLInputElement).files;
        const file = fileList[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const text = reader.result.toString();
                cb(text);
            };
            reader.readAsText(file);
        }
    }

    public updateGame(cmd): void {
        this.game.update(cmd);
    }

    /* When a cell is clicked, perform a command/show debug info. */
    public onCellClick(x: number, y: number): void {
        const cell = this.getCellCurrMap(x, y);
        if (!cell) {
            RG.warn('GameManager', 'onCellClick',
                `No cell ${x},${y} in the map.`);
            return;
        }

        if (this.gameGUIState.isTargeting) {
            this.game.update({cmd: 'missile', target: cell});
            this.gameGUIState.visibleCells = this.game.visibleCells;
            this.screen.setSelectedCell(null);
            this.updateCb({selectedCell: null});
            this.gameGUIState.isTargeting = false;
        }
        else {
            TopLogic.describeCell(cell, this.gameGUIState.visibleCells);
            this.updateCb({selectedCell: cell});
            if (cell.hasItems()) {
                this.useClickHandler(x, y, cell, 'pickup');
            }
            else {
                this.useClickHandler(x, y, cell, 'move');
            }
        }
        console.log(`Cell: ${JSON.stringify(cell)}`);
        if (cell.hasActors()) {
            const actors = cell.getActors();
            console.log(`Actors: ${JSON.stringify(actors)}`);
            /* if (debug.enabled) {
                RG.CLICKED_ACTOR = actors[0];
            }*/
        }
        if (cell.hasConnection()) {
            const conns = cell.getPropType('connection');
            console.log(`Actors: ${JSON.stringify(conns)}`);
        }
    }

    /* When an ASCII menu item is clicked, this function should be called. */
    public menuItemClicked(key: string): void {
        let result: number | string = -1;
        if (key) {
            if (/\d+/.test(key)) {
                result = parseInt(key, 10);
            }
            else {
                result = key;
            }
            const keyCode = Keys.selectIndexToCode(result);
            if (keyCode >= 0) {
                this.keyPending = true;
                this.nextCode = keyCode;
            }
        }
    }


}

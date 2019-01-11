
import * as React from 'react';

// Subcomponents for the GUI
import GameStartScreen from './game-start-screen';
import GameMenu from './game-menu';
import GameMessages from './game-messages';
import GameOverWorldMap from './game-overworld-map';
import GameHelpScreen from './game-help-screen';
import GameBoard from './game-board';
import GameInventory from './game-inventory';
import GameEditor from '../editor/game-editor';
import GameCharInfo from './game-char-info';
import LevelSaveLoad from '../editor/level-save-load';
import CellClickHandler from '../gui/cell-click-handler';
import GameTopMenu from './game-top-menu';
import GameCreatingScreen from './game-creating-screen';
import HiddenFileInput from './hidden-file-input';
import GamePlugins from './game-plugins';

import GameContextMenu from './context-menu';
import {ContextMenuTrigger} from 'react-contextmenu';

import GameStats, {VIEW_MAP, VIEW_PLAYER} from './game-stats';
import {PluginManager} from '../gui/plugin-manager';

import dbg = require('debug');
const debug = dbg('bitn:top');

import ROT from '../../lib/rot';
import RG from '../src/rg';
import {Keys} from '../src/keymap';
import {GameMain} from '../src/game';
import {GameSave} from '../src/gamesave';
import * as  Verify from '../src/verify';
import {KeyCode} from '../gui/keycode';
import {MultiKeyHandler} from '../gui/multikey-handler';
import {Cell} from '../src/map.cell';

import md5 = require('js-md5');

import {Screen} from '../gui/screen';
import {Persist} from '../src/persist';
import {WorldConf} from '../data/conf.world';

import {MyWorkerImport} from '../util';

import {ACTOR_CLASSES} from '../src/actor-class';
import {SentientActor} from '../src/actor';
import {ItemBase} from '../src/item';

import {EventPool} from '../src/eventpool';
import {FactoryGame} from '../src/factory.game';
import {FromJSON} from '../src/game.fromjson';
import {IMessage} from '../src/rg';
const POOL = EventPool.getPool();

import {PlayerDriver} from '../../tests/helpers/player-driver';

const INV_SCREEN = 'Inventory';
// (window as any).RG = RG;

/* Contains logic that is not tightly coupled to the GUI.*/
class TopLogic {

  public static describeCell(cell, seenCells) {
    const index = seenCells.indexOf(cell);
    if (index !== -1) {
      if (cell.hasActors()) {
        const actor = cell.getProp('actors')[0];
        const msg = 'You see ' + actor.getName();
        RG.gameMsg(msg);
      }
      else if (cell.hasProp('items')) {
        const items = cell.getProp('items');
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

  public static getAdjacentCell(player, code) {
    if (RG.KeyMap.inMoveCodeMap(code) || RG.KeyMap.isRest(code)) {
      const [x, y] = player.getXY();
      const diffXY = RG.KeyMap.getDiff(code, x, y);
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

export interface EditorData {
    [key: string]: any;
}

export interface IBattlesTopState {
    animation: Animation;
    boardClassName: string;
    playMode: string;
    equipSelected: null;
    invMsg: string;
    invMsgStyle: string;
    levelSize: string;
    loadFromEditor: boolean;
    loadInProgress: boolean;
    mouseOverCell: Cell;
    playerClass: string;
    playerRace: string;
    playerLevel: string;
    playerName: string;
    render: boolean;
    saveInProgress: boolean;
    seedName: string;
    selectedCell: null;
    selectedGame: null;
    selectedItem: null;
    showPlugins: boolean;
    showEditor: boolean;
    showMap: boolean;
    showGameMenu: boolean;
    showStartScreen: boolean;
    showHelpScreen: boolean;
    showLoadScreen: boolean;
    showOWMap: boolean;
    showInventory: boolean;
    showCharInfo: boolean;
    showCreateScreen: boolean;
    editorData: EditorData; // Data given to editor
    plugins: any[];
    progress: string;
}

export interface GameStateTop {
    [key: string]: any;
}

/* Top-level Component for the Battles GUI.*/
export class BattlesTop extends React.Component {

    public game: any; // TODO GameMain
    public gameState: GameStateTop;
    public state: IBattlesTopState;
    public pluginManager: PluginManager;
    public guiCommands: {[key: string]: (args?: any) => void};
    public gameSave: any; // TODO GameSave;

    public loadScriptId: string;
    public levelInputId: string;
    public finishAutoOnSight: boolean;
    public finishAutoDist: number;
    public keyPending: boolean;
    public keysEnabled: boolean;
    public autoModeKeyBuffer: number[];
    public ctrlMode: string;
    public gameConf: any;
    public viewportPlayerX: number;
    public viewportPlayerY: number;
    public viewportX: number;
    public viewportY: number;
    public frameID: number;
    public screen: Screen;
    public hasNotify: boolean;
    public listener: ProxyListener;
    public multiHandler: MultiKeyHandler;
    public savedPlayerList: SentientActor[];
    public clickHandler: CellClickHandler;
    public nextCode: number;
    public animationID: number;

    constructor(props) {
        super(props);
        this.game = null;
        this.gameSave = new GameSave();
        this.pluginManager = new PluginManager();

        // Some IDs needed for this component
        this.loadScriptId = '#load-script-input';
        this.levelInputId = '#level-file-input';

        // Used for request animation frame
        this.frameID = null;

        // Holds game-state specific info for GUI (see resetGameState)
        this.gameState = {};
        this.resetGameState();

        this.viewportPlayerX = 35; // * 2
        this.viewportPlayerY = 15; // * 2
        this.viewportX = 35; // * 2
        this.viewportY = 15; // * 2

        this.screen = new Screen(this.viewportX, this.viewportY);

        // Simple configuration for the game
        this.gameConf = {
            cols: 60,
            rows: 30,
            levels: 2,

            seed: new Date().getTime(),

            playerLevel: 'Medium',
            levelSize: 'Medium',
            playerClass: ACTOR_CLASSES[0],
            playerRace: RG.ACTOR_RACES[0],

            sqrPerActor: 120,
            sqrPerItem: 120,
            playMode: 'OverWorld',
            loadedPlayer: null,
            loadedLevel: null,
            playerName: 'Player',
            world: WorldConf,
            xMult: 2,
            yMult: 3
        };

        // Params to control the auto-movement (when clicking a cell etc)
        this.finishAutoOnSight = true;
        this.finishAutoDist = 3;

        this.keyPending = false;
        this.keysEnabled = false;
        this.autoModeKeyBuffer = [];
        this.ctrlMode = 'MANUAL';

        this.notify = this.notify.bind(this);
        this.hasNotify = true;
        this.listener = new ProxyListener(this.notify);
        this.multiHandler = new MultiKeyHandler();

        this.gameSave.setStorage(window.localStorage);
        this.savedPlayerList = this.gameSave.getPlayersAsList();

        this.state = {
            animation: null,
            boardClassName: 'game-board-player-view',
            editorData: {}, // Data given to editor
            equipSelected: null,
            invMsg: '',
            invMsgStyle: '',
            levelSize: 'Medium',
            loadFromEditor: false,
            loadInProgress: false,
            mouseOverCell: null,
            playMode: 'OverWorld',
            playerClass: '',
            playerRace: '',
            playerLevel: 'Medium',
            playerName: 'Player',
            plugins: [],
            progress: '',
            render: true,
            saveInProgress: false,
            seedName: '',
            selectedCell: null,
            selectedGame: null,
            selectedItem: null,
            showCharInfo: false,
            showCreateScreen: false,
            showEditor: false,
            showGameMenu: false,
            showHelpScreen: false,
            showInventory: false,
            showLoadScreen: false,
            showMap: false,
            showOWMap: false,
            showPlugins: false,
            showStartScreen: true
        };

        // Binding of callbacks
        this.bindCallbacks();
        this.initGUICommandTable();
    }

    public showPluginManager() {
        this.setState({showPlugins: !this.state.showPlugins});
    }

    /* Toggles the game editor view. Need to terminate the existing
     * animation. */
    public toggleEditor() {
        cancelAnimationFrame(this.frameID);
        const showStartScreen = this.state.showEditor;
        this.setState({showStartScreen,
            showEditor: !this.state.showEditor});
    }

    public selectSaveGame(name) {
        this.setState({selectedGame: name});
    }

    /* Resets the GUI game state.*/
    public resetGameState() {
        this.gameState = {
            autoTarget: false,
            visibleCells: [],
            useModeEnabled: false,
            isTargeting: false,
            targetInRange: false
        };
    }

    public setPlayerName(name) {
        this.gameConf.playerName = name;
        this.setState({playerName: name});
    }

    public setSeedName(name) {
        let seed = parseInt(name, 10);
        if (Number.isNaN(seed)) {
            const hash = md5(name);
            seed = parseInt(hash, 16);
        }
        // RG.RAND.setSeed(seed);
        ROT.RNG.setSeed(seed);
        // RG.RAND.setSeed(new Date().getTime());
        // ROT.RNG.setSeed(new Date().getTime());
        this.gameConf.seed = seed;
        this.setState({seedName: name});
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
        this.setState({render: true});
    }

    /* Toggles view between normal view and zoomed out map view. */
    public setViewType(type) {
        if (type === VIEW_MAP) {
           this.viewportPlayerX = this.viewportX;
           this.viewportPlayerY = this.viewportY;
           this.viewportX = this.game.getPlayer().getLevel().getMap().cols;
           this.viewportY = this.game.getPlayer().getLevel().getMap().rows;
           this.screen.setMapShown(true);
           this.screen.setViewportXY(this.viewportX, this.viewportY);

           this.setState({
               render: true,
               boardClassName: 'game-board-map-view',
               showMap: true
           });
        }
        else if (type === VIEW_PLAYER) {
            this.viewportX = this.viewportPlayerX;
            this.viewportY = this.viewportPlayerY;
            this.screen.setMapShown(false);
            this.screen.setViewportXY(this.viewportX, this.viewportY);
            this.setState({
                render: true,
                boardClassName: 'game-board-player-view',
                showMap: false
            });
        }
    }

    public createNewGameAsync() {
        return new Promise((resolve, reject) => {
            try {
                this.createNewGame();
                resolve();
            }
            catch (e) {
                reject(e);
            }
        });
    }

    /* Called when "Embark" button is clicked to create a new game.*/
    public newGame() {
        this.enableKeys();
        this.hideScreen('StartScreen');

        if (this.state.loadFromEditor) {
            console.log('Creating newGame from editor contents');
            this.createGameFromEditor();
        }
        else {
            this.createNewGameAsync().then(() => {
                this.setState({render: true});
            });
        }
    }

    /* Creates game from editor data. */
    public createGameFromEditor() {
        if (this.frameID) {
            cancelAnimationFrame(this.frameID);
        }
        this.resetGameState();
        if (this.game !== null) {
            delete this.game;
            RG.FACT = new RG.Factory.Base();
        }
        // Prepare game configuration
        const conf = Object.assign({}, this.gameConf);
        conf.levels = this.state.editorData.levelsToPlay;

        const gameFactory = new RG.Factory.Game();
        this.game = gameFactory.createNewGame(conf);
        this.initBeforeNewGame();
    }

    /* Saves the game position.*/
    public saveGame() {
        if (this.game) {
            const name = this.game.getPlayer().getName();
            const persist = new Persist(name);
            this.setState({saveInProgress: true});

            this.gameToJSON().then(json => {
                persist.toStorage(json, () => {
                    this.gameSave.save(this.game, this.gameConf);
                    this.savedPlayerList = this.gameSave.getPlayersAsList();
                    RG.gameMsg('Your progress has been saved.');
                    this.setState({saveInProgress: false});
                });
            });
        }
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
    public loadGame(playerName) {
        if (playerName) {
            this.setState({showLoadScreen: false, showStartScreen: false,
                loadInProgress: true});

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
                    this.restoreConf(confObj);
                    this.initRestoredGame(restGame);
                }
            });
        }
    }

    /* Sets up the event pool, GUI callbacks, animation frame and first
     * visible cells for a restored game. */
    public initRestoredGame(game) {
        if (this.frameID) {
            cancelAnimationFrame(this.frameID);
        }

        this.resetGameState();
        if (this.game !== null) {
            delete this.game;
            RG.FACT = new RG.Factory.Base();
        }
        this.game = game;
        this.game.setGUICallbacks(this.isGUICommand, this.doGUICommand);
        this.game.setAnimationCallback(this.playAnimation.bind(this));
        this.setDebugRefsToWindow();

        const player = this.game.getPlayer();
        this.gameState.visibleCells = player.getBrain().getSeenCells();
        POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this.listener);
        POOL.listenEvent(RG.EVT_DESTROY_ITEM, this.listener);
        this.enableKeys();
        this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
        this.setState({render: true, loadInProgress: false});
    }

    /* Deletes a saved game from the list. */
    public deleteGame(name) {
        if (name) {
            const persist = new Persist(name);
            persist.deleteStorage(() => {
                this.gameSave.deletePlayer(name);
                this.savedPlayerList = this.gameSave.getPlayersAsList();
                this.setState({render: true, selectedGame: null});
            });
        }
    }

    public restoreConf(obj) {
        const props = ['cols', 'rows', 'sqrPerActor', 'sqrPerItem', 'levels'];
        for (let i = 0; i < props.length; i++) {
            this.gameConf[props[i]] = obj[props[i]];
        }
    }

    /* Creates a new game instance.*/
    public createNewGame() {
        if (this.frameID) {
            cancelAnimationFrame(this.frameID);
        }

        this.resetGameState();
        if (this.game !== null) {
            delete this.game;
            RG.FACT = new RG.Factory.Base();
        }

        if (this.state.seedName === '') {
            this.gameConf.seed = new Date().getTime();
        }

        // if (false && this.canUseWorker()) {
        if (this.canUseWorker()) {
            this.showScreen('CreateScreen');
            this.createGameWorker();
        }
        else {
            const gameFactory = new FactoryGame();
            this.game = gameFactory.createNewGame(this.gameConf);
            this.initBeforeNewGame();
        }
    }

    public canUseWorker() {
        return (typeof (window as any).Worker !== 'undefined') &&
            !this.pluginManager.anyPluginsEnabled();
    }

    /* Creates the new game using a worker to not block the main thread and
     * GUI updates. */
    public createGameWorker() {
        /* eslint global-require: 0 */
        const worker = new MyWorkerImport();
        worker.onmessage = (e) => {
            const msg = e.data;
            if (msg.progress) {
                this.progress(msg.progress);
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
                throw new Error(msg.error);
            }
        };
        worker.postMessage([this.gameConf]);
    }

    /* Sets the event listeners, GUI callbacks and debugging refs before
     * starting the game. */
    public initBeforeNewGame() {
        this.game.setGUICallbacks(this.isGUICommand, this.doGUICommand);
        this.game.setAnimationCallback(this.playAnimation.bind(this));
        this.setDebugRefsToWindow();

        const player = this.game.getPlayer();
        this.gameState.visibleCells = player.getBrain().getSeenCells();
        POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this.listener);
        POOL.listenEvent(RG.EVT_DESTROY_ITEM, this.listener);
        this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
        this.setState({render: true});
    }

    public progress(msg) {
        this.setState({progress: msg});
    }

    /* Sets some global variables which ease up the debugging with console.
     */
    public setDebugRefsToWindow() {
        if (debug.enabled) {
            (window as any).GAME = this.game; // For debugging
            const player = this.game.getPlayer();
            (window as any).PLAYER = player; // For debugging
        }
    }

    public selectItemTop(item) {
        this.setState({selectedItem: item});
    }

    public selectEquipTop(selection) {
        if (selection) {
            this.setState({selectedItem: selection.item,
                equipSelected: selection});
        }
        else {
            this.setState({selectedItem: null, equipSelected: null});
        }
    }

    public setAutoMode() {
        this.ctrlMode = 'AUTOMATIC';
    }

    public onMouseOverCell(x, y) {
        const cell = this.getCellCurrMap(x, y);
        if (cell) {
            this.setState({mouseOverCell: cell});
        }
    }

    public getCellCurrMap(x, y) {
        const map = this.game.getPlayer().getLevel().getMap();
        if (map.hasXY(x, y)) {
            return map.getCell(x, y);
        }
        return null;
    }

    /* Handles right clicks of the context menu. */
    public handleRightClick(evt, data, cell) {
        const [x, y] = cell.getXY();
        this.useClickHandler(x, y, cell, data.type);
    }

    /* When a cell is clicked, perform a command/show debug info. */
    public onCellClick(x, y) {
        const cell = this.getCellCurrMap(x, y);
        if (!cell) {
            RG.warn('BattlesTop', 'onCellClick',
                `No cell ${x},${y} in the map.`);
            return;
        }

        if (this.gameState.isTargeting) {
            this.game.update({cmd: 'missile', target: cell});
            this.gameState.visibleCells = this.game.visibleCells;
            this.screen.setSelectedCell(null);
            this.setState({selectedCell: null});
            this.gameState.isTargeting = false;
        }
        else {
            TopLogic.describeCell(cell, this.gameState.visibleCells);
            this.setState({selectedCell: cell});
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

    public useClickHandler(x, y, cell, cmd) {
        this.clickHandler = new CellClickHandler(this.game);
        this.clickHandler.handleClick(x, y, cell, cmd);

        if (this.clickHandler.hasKeys()) {
            this.setAutoMode();
        }
    }

    /* When listening events, component gets notification via this
     * method.*/
    public notify(evtName, obj) {
        if (evtName === RG.EVT_LEVEL_CHANGED) {
            const actor = obj.actor;
            if (actor.isPlayer()) {
                this.setState({render: true});
            }
        }
    }

    public importJSON() {
        const fInput = document.querySelector(this.levelInputId);
        (fInput  as HTMLInputElement).click();
    }

    public loadScript() {
        const fInput = document.querySelector(this.loadScriptId);
        (fInput as HTMLInputElement).click();
    }

    public onLoadScript() {
        const fileElem = document.querySelector(this.loadScriptId);
        const fileList = (fileElem as HTMLInputElement).files;
        const file = fileList[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const text = reader.result.toString();
                this.pluginManager.loadScript(text);
                this.updatePluginList();
            };
            reader.readAsText(file);
        }
    }

    public updatePluginList() {
        this.setState({showPlugins: true,
            plugins: this.pluginManager.getPlugins()
        });
    }

    public enableKeys() {
      if (!this.keysEnabled) {
        document.addEventListener('keypress', this.handleKeyDown, true);
        this.keysEnabled = true;
      }
    }

    public disableKeys() {
      if (this.keysEnabled) {
        document.removeEventListener('keypress', this.handleKeyDown, true);
        this.keysEnabled = false;
      }
    }

    public isValidKey(keyCode) {
        return Keys.isValidKey(keyCode) ||
            this.guiCommands[keyCode] ||
            Keys.isNumeric(keyCode);
    }

    /* Listens for player key presses and handles them.*/
    public handleKeyDown(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        const keyCode = KeyCode.getKeyCode(evt);
        if (this.keyPending === false) {
            this.keyPending = true;
            this.nextCode = keyCode;
            if (!this.isGUICommand(keyCode)) {
                this.gameState.isTargeting = false;
            }

            if (Keys.KeyMap.isMultiPurpose(keyCode)) {
                const player = this.game.getPlayer();
                const keySeq = this.multiHandler.getKeys(player);
                if (keySeq && keySeq.length > 0) {
                    this.clickHandler = new CellClickHandler(this.game);
                    this.clickHandler.setKeys(keySeq);
                    if (this.clickHandler.hasKeys()) {
                        this.setAutoMode();
                    }
                }
            }
        }
    }

    public setPlayerDriver(): void {
        const player = this.game.getPlayer();
        this.clickHandler = new PlayerDriver(player);
        player.remove('Hunger');
        // this.clickHandler.screenPeriod = -1;
        this.ctrlMode = 'AUTOMATIC';
        this.finishAutoOnSight = false;
    }

    /* Returns the next key, either from player or from click handler. */
    public getNextCode() {
        if (this.ctrlMode === 'AUTOMATIC') {
            const nextCode = this.clickHandler.getNextCode();
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

    /* Checks and makes adjustments if auto-ctrl mode should be terminated.
     * Usually this happens when auto-mode command fails or if enemy is
     * seen. */
    public checkIfAutoModeDone() {
        if (this.clickHandler) {
            if (!this.clickHandler.hasKeys()) {
                this.ctrlMode = 'MANUAL';
            }
            else if (this.finishAutoOnSight) {
                const [pX, pY] = this.game.getPlayer().getXY();
                const enemies = RG.findEnemyCellForActor(this.game.getPlayer(),
                    this.gameState.visibleCells);
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
                        this.clickHandler.reset();
                    }
                }
            }
        }
    }

    public mainLoop() {
        if (this.keyPending === true || this.ctrlMode === 'AUTOMATIC') {
            const code = this.getNextCode();
            if (code.cmd) {
                this.game.update(code);
            }
            else {this.game.update({code});}
            this.gameState.visibleCells = this.game.visibleCells;

            if (this.game.isGameOver()) {
                this.setState({render: true, showGameMenu: false});
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
                    this.gameState.isTargeting = true;
                }
                else {
                    this.gameState.isTargeting = false;
                    updates.selectedCell = null;
                    this.screen.setSelectedCell(null);
                }
                this.setState(updates);
            }
            this.keyPending = false;
            this.checkIfAutoModeDone();
        }
        this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
    }

    /* Plays the animation until all animation frames have been shown. */
    public playAnimation() {
        if (this.game.hasAnimation()) {
            const anim = this.game.getAnimationFrame();
            this.setState({render: true, animation: anim});
            this.animationID = requestAnimationFrame(
                this.playAnimation.bind(this));
        }
        else {
            // Animation is finished, go back to mainLoop
            this.game.finishAnimation();
            this.setState({render: true, animation: null});
            // this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
        }
    }

    /* Called when a JSON file is imported. This can be a save game or a
     * plugin */
    public onLoadCallback(jsonData) {
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
    }

    public render() {
        let map = null;
        let player = null;
        let inv = null;
        let eq = null;
        let maxWeight = null;
        let message: IMessage[] = [];
        let charRows = null;
        let classRows = null;
        let startX = null;
        let rowClass = '';
        let overworld = null;
        let showGameMenu = false;
        let playerOwPos = null;
        let gameValid = false;

        if (this.game) {
            map = this.game.getVisibleMap();
            player = this.game.getPlayer();
            inv = player.getInvEq().getInventory();
            eq = player.getInvEq().getEquipment();
            maxWeight = player.getMaxWeight();
            overworld = this.game.getOverWorld();
            if (this.game.hasNewMessages()) {
                message = this.game.getMessages();
            }

            // All computations for the GameBoard
            const showMap = this.state.showMap;
            rowClass = 'cell-row-div-player-view';
            if (showMap) {rowClass = 'cell-row-div-map-view';}

            const playX = player.getX();
            const playY = player.getY();

            if (map) {
                this.screen.renderWithRLE(
                    playX, playY, map, this.gameState.visibleCells,
                    this.state.animation);
            }

            charRows = this.screen.getCharRows();
            classRows = this.screen.getClassRows();
            startX = this.screen.getStartX();

            gameValid = true;

            showGameMenu = this.game.isMenuShown();
            if (overworld) {
                playerOwPos = this.game.getPlayerOwPos();
                if (playerOwPos) {
                    this.game.setOverWorldExplored(playerOwPos);
                }
            }
        }

        const settings = {
            playerClass: this.state.playerClass,
            playerRace: this.state.playerRace,
            playMode: this.state.playMode,
            playerLevel: this.state.playerLevel,
            levelSize: this.state.levelSize
        };

        const oneSelectedCell = this.getOneSelectedCell();

        return (
            <div className='container main-div' id='main-div' >
                <GameTopMenu menuCallback={this.topMenuCallback} />

                {(this.state.showStartScreen || this.state.showLoadScreen) &&
                <GameStartScreen
                    deleteGame={this.deleteGame}
                    loadFromEditor={this.state.loadFromEditor}
                    loadGame={this.loadGame}
                    newGame={this.newGame}
                    playerName={this.state.playerName}
                    progress={this.state.progress}
                    savedPlayerList={this.savedPlayerList}
                    seedName={this.state.seedName}
                    selectedGame={this.state.selectedGame}
                    selectGame={this.selectSaveGame}
                    setPlayerClass={this.setPlayerClass}
                    setPlayerLevel={this.setPlayerLevel}
                    setPlayerName={this.setPlayerName}
                    setPlayerRace={this.setPlayerRace}
                    setPlayMode={this.setPlayMode}
                    setSeedName={this.setSeedName}
                    settings={settings}
                    showLoadScreen={this.state.showLoadScreen}
                    showStartScreen={this.state.showStartScreen}
                    toggleEditor={this.toggleEditor}
                    toggleScreen={this.toggleScreen}
                />
                }

                {this.state.showCreateScreen &&
                    <GameCreatingScreen
                        gameCreated={gameValid}
                        progress={this.state.progress}
                        showCreateScreen={this.state.showCreateScreen}
                        toggleScreen={this.toggleScreen}
                    />
                }

                {this.state.showHelpScreen &&
                  <GameHelpScreen
                    showHelpScreen={this.state.showHelpScreen}
                    toggleScreen={this.toggleScreen}
                  />
                }

                {this.state.showOWMap &&
                  <GameOverWorldMap
                    ow={overworld}
                    playerOwPos={playerOwPos}
                    showOWMap={this.state.showOWMap}
                    toggleScreen={this.toggleScreen}
                  />
                }

                {gameValid && !this.state.showEditor &&
                 this.state.showInventory &&
                <GameInventory
                    doInvCmd={this.doInvCmd}
                    eq={eq}
                    equipSelected={this.state.equipSelected}
                    handleKeyDown={this.handleKeyDown}
                    inv={inv}
                    invMsg={this.state.invMsg}
                    maxWeight={maxWeight}
                    msgStyle={this.state.invMsgStyle}
                    player={player}
                    selectedItem={this.state.selectedItem}
                    selectEquipTop={this.selectEquipTop}
                    selectItemTop={this.selectItemTop}
                    setInventoryMsg={this.setInventoryMsg}
                    showInventory={this.state.showInventory}
                    toggleScreen={this.toggleScreen}
                />
                }
                {gameValid && !this.state.showEditor &&
                 this.state.showCharInfo &&
                    <GameCharInfo
                      player={player}
                      showCharInfo={this.state.showCharInfo}
                      toggleScreen={this.toggleScreen}
                    />
                }

                {this.state.showPlugins &&
                    <GamePlugins
                        pluginManager={this.pluginManager}
                        plugins={this.state.plugins}
                        updatePluginList={this.updatePluginList}
                    />
                }

                {!this.state.showEditor &&
                <div className='row game-panel-div'>
                    <div className='col-md-2'>
                        {gameValid &&
                        <div className='text-left game-stats-div'>
                            <GameStats
                                player={player}
                                selectedCell={oneSelectedCell}
                                selectedItem={this.state.selectedItem}
                                setViewType={this.setViewType}
                                showMap={this.state.showMap}
                                toggleScreen={this.toggleScreen}
                            />
                        </div>
                        }
                    </div>

                    {gameValid &&
                    <div className='col-md-10'>
                        <div className='game-messages-div'>
                            <GameMessages
                                message={message}
                                saveInProgress={this.state.saveInProgress}
                                showAll={false}
                                visibleCells={this.gameState.visibleCells}
                            />
                        </div>
                        <div className='game-board-div'>
                            {!showGameMenu &&

                            <ContextMenuTrigger id='right-click-context-menu'>
                                <GameBoard
                                    boardClassName={this.state.boardClassName}
                                    charRows={charRows}
                                    classRows={classRows}
                                    endY={this.screen.endY}
                                    onCellClick={this.onCellClick}
                                    onMouseOverCell={this.onMouseOverCell}
                                    rowClass={rowClass}
                                    sizeX={2 * this.screen.viewportX + 1}
                                    startX={startX}
                                    startY={this.screen.startY}
                                    useRLE={true}
                                />
                            </ContextMenuTrigger>
                            }
                            {showGameMenu &&
                            <GameMenu
                                height={28}
                                menuItemClicked={this.menuItemClicked}
                                menuObj={this.game.getMenu()}
                                width={80}
                            />
                            }
                        </div>
                    </div>
                    }

                </div>
                }

                {!this.state.showEditor &&
                  <LevelSaveLoad
                    objData={this.game}
                    onLoadCallback={this.onLoadCallback}
                    pretty={false}
                    savedObjName={player ? 'saveGame_' + player.getName() : ''}
                    setMsg={this.showMsg}
                  />
                }
                {!this.state.showEditor &&
                <GameContextMenu
                    handleRightClick={this.handleRightClick}
                    mouseOverCell={this.state.mouseOverCell}
                />
                }

                {this.state.showEditor &&
                  <GameEditor
                      editorData={this.state.editorData}
                      setEditorData={this.setEditorData}
                      toggleEditor={this.toggleEditor}
                  />
                }
                <HiddenFileInput
                    inputId='load-script-input'
                    onLoadScript={this.onLoadScript}
                />
            </div>
        );
    }

    /* When an ASCII menu item is clicked, this function should be called. */
    public menuItemClicked(key) {
      if (key) {
        if (/\d+/.test(key)) {
          key = parseInt(key, 10);
        }
        const keyCode = Keys.selectIndexToCode(key);
        if (keyCode >= 0) {
          this.keyPending = true;
          this.nextCode = keyCode;
        }
      }
    }

    public setEditorData(levelsToPlay, allLevels) {
        const editorData = {
            levelsToPlay,
            allLevels
        };
        this.setPlayMode('Editor');
        this.setState({editorData, loadFromEditor: true});
    }

    public getOneSelectedCell() {
        if (Array.isArray(this.state.selectedCell)) {
            const cells: Cell[] = this.state.selectedCell as Cell[];
            if (cells.length > 0) {
                return cells[0];
            }
        }
        return this.state.selectedCell;
    }

    //-------------------------------------------------------------
    // GUI-RELATED COMMANDS
    //-------------------------------------------------------------

    /* GUI command keybindings are specified here. */
    public initGUICommandTable() {
        this.guiCommands = {};
        this.guiCommands[Keys.GUI.Help] = this.GUIHelp.bind(this);
        this.guiCommands[Keys.GUI.Inv] = this.GUIInventory;
        this.guiCommands[Keys.GUI.Map] = this.GUIMap;
        this.guiCommands[Keys.GUI.OwMap] = this.GUIOverWorldMap.bind(this);
        // this.guiCommands[Keys.VK_n] = this.GUINextTarget;
        // this.guiCommands[Keys.GUI.Look] = this.GUILook;
        this.guiCommands[Keys.GUI.Use] = this.GUIUseItem;
        this.guiCommands[Keys.GUI.CharInfo] = this.GUICharInfo.bind(this);
        this.guiCommands.GOTO = this.GUIGoto.bind(this);
    }

    /* Returns true if given command is a GUI command. */
    public isGUICommand(code) {
        if (this.gameState) {
            if (this.gameState.autoTarget && code === Keys.VK_t) {
                return false;
            }
            else if (this.gameState.useModeEnabled) {
                return true;
            }
            else {
                return this.guiCommands.hasOwnProperty(code);
            }
        }
        return false;
    }

    public GUIHelp() {
      this.showScreen('HelpScreen');
    }

    public GUICharInfo() {
      this.showScreen('CharInfo');
    }

    public GUIGoto(x: number, y: number) {
        const player = this.game.getPlayer();
        const cell = player.getCell();
        this.useClickHandler(x, y, cell, 'move');
    }

    /* GameInventory should add a callback which updates the GUI (via props) */
    public doInvCmd(cmd): void {
        this.game.update(cmd);
    }

    /* Calls a GUI command corresponding to the code.*/
    public doGUICommand(code, ...args) {
         if (this.gameState.useModeEnabled) {
            this.gameState.useModeEnabled = false;
            const item = this.state.selectedItem as ItemBase;
            if (item !== null) {

                const player = this.game.getPlayer();
                const cell = TopLogic.getAdjacentCell(player, code);
                if (cell !== null) {
                    this.game.update({
                        cmd: 'use', target: cell, item
                    });
                    if (item!.has('OneShot')) {
                        this.setState({selectedItem: null});
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
        else if (this.guiCommands.hasOwnProperty(code)) {
            this.guiCommands[code]();
        }
        else if (Keys.KeyMap.isGoto(code)) {
            this.GUIGoto(...args as [number, number]);
        }
        else {
            console.error('Unknown keycode for GUI command.');
        }
    }

    /* Called by GameInventory to change the message shown. */
    public setInventoryMsg(msg) {
        this.setState({invMsg: msg.invMsg, invMsgStyle: msg.msgStyle});
    }

    /* Brings up the inventory.*/
    public GUIInventory() {
        this.toggleScreen(INV_SCREEN);
    }

    /* Toggles the map view. */
    public GUIMap() {
      if (this.state.showMap) {
        this.setViewType(VIEW_PLAYER);
      }
      else {
        this.setViewType(VIEW_MAP);
      }
    }

    public GUIOverWorldMap() {
      this.toggleScreen('OWMap');
    }

    /* Finds the nearest enemy and shows its name when 'l' is pressed. */
    public GUILook() {
        if (this.gameState.isTargeting) {
            const nextCell = this.getNextTargetCell();
            if (nextCell) {
                const actor = nextCell.getActors()[0];
                const msg = `You see ${actor.getName()} nearby.`;
                this.screen.setSelectedCell(nextCell);
                RG.gameMsg(msg);
                this.setState({selectedCell: nextCell});
            }
            else {
                this.gameState.isTargeting = false;
                this.screen.setSelectedCell(null);
                this.setState({selectedCell: null});
            }
        }
        else {
            this.gameState.isTargeting = true;
            this.gameState.enemyCells = RG.findEnemyCellForActor(
                this.game.getPlayer(), this.gameState.visibleCells);
            this.gameState.numCurrCell = 0;
            let msg = 'You do not see any enemies nearby.';
            if (this.gameState.enemyCells.length > 0) {
                const cell = this.gameState.enemyCells[0];
                const actor = cell.getActors()[0];
                msg = `You see ${actor.getName()} nearby.`;
                this.screen.setSelectedCell(cell);
                RG.gameMsg(msg);
                this.setState({selectedCell: cell});
            }
            else {
                RG.gameMsg(msg);
            }
        }
    }

    public GUIUseItem() {
        if (!this.gameState.useModeEnabled) {
            this.gameState.useModeEnabled = true;
            if (this.state.selectedItem === null) {
                this.showScreen('Inventory');
            }
            RG.gameMsg('Select direction for using the item.');
        }
    }

    /* Selects next target when 'n' is pressed.*/
    public GUINextTarget() {
        if (this.gameState.isTargeting) {
            const nextCell = this.getNextTargetCell();
            this.screen.setSelectedCell(nextCell);
            this.setState({selectedCell: nextCell});
        }
    }

    public getNextTargetCell() {
        const numCells = this.gameState.enemyCells.length;
        if (numCells > 0) {
            let numNextCell = this.gameState.numCurrCell + 1;
            if (numNextCell >= numCells) {
                numNextCell = 0;
            }

            this.gameState.numCurrCell = numNextCell;
            return this.gameState.enemyCells[numNextCell];
        }
        return null;
    }

    public showScreen(type) {
        const key = 'show' + type;
        this.disableKeys();
        if (this.state.hasOwnProperty(key)) {
          this.setState({[key]: true});
        }
        else {
          console.error(`showScreen: key ${key} not found in state`);
        }
    }

    public hideScreen(type) {
        const key = 'show' + type;
        this.enableKeys();
        this.setState({[key]: false});
    }

    public toggleScreen(type) {
        const key = 'show' + type;
        const wasShown = this.state[key];
        if (wasShown) {this.enableKeys();}
        else {this.disableKeys();}
        this.setState({[key]: !wasShown});
    }

    public showStartScreen(): void {
        if (!this.state.showStartScreen) {
            this.setState({showStartScreen: true});
        }
    }

    public showLoadScreen(): void {
      this.setState({showLoadScreen: true});
    }

    //--------------------------------
    // GAME CONFIG RELATED FUNCTIONS
    //-------------------------------
    public setPlayerLevel(level): void {
        this.setGameSetting('playerLevel', level);
    }

    public setPlayerClass(className): void {
        this.setGameSetting('playerClass', className);
    }

    public setPlayerRace(raceName): void {
        this.setGameSetting('playerRace', raceName);
    }

    public setPlayMode(mode): void {
        this.setGameSetting('playMode', mode);
    }

    public setGameSetting(name, value): void {
        this.gameConf[name] = value;
        this.setState({[name]: value});
    }

    /* Can be used to call any class method from sub-component without
     * explicitly passing all possible callback functions as props. */
    public topMenuCallback(cmd, args) {
      if (typeof this[cmd] === 'function') {
          if (Array.isArray(args)) {
              if (args.length === 1) {
                  this[cmd](args);
              }
              else {
                  this[cmd](...args);
              }
          }
          else {
              this[cmd](args);
          }
      }
      else {
        console.error(`${cmd} not a function in Top`);
        console.error(`Called with args ${args}`);
      }
    }

    public showMsg(msg): void {
        RG.diag('showMsg:', msg);
        this.setState({msg});
    }

    /* Binds the callbacks. */
    public bindCallbacks(): void {
        this.newGame = this.newGame.bind(this);

        // GameStartScreen callbacks
        this.deleteGame = this.deleteGame.bind(this);
        this.loadGame = this.loadGame.bind(this);
        this.setPlayMode = this.setPlayMode.bind(this);
        this.setPlayerLevel = this.setPlayerLevel.bind(this);
        this.setPlayerName = this.setPlayerName.bind(this);
        this.setSeedName = this.setSeedName.bind(this);
        this.setPlayerClass = this.setPlayerClass.bind(this);
        this.setPlayerRace = this.setPlayerRace.bind(this);

        // GamePanel callbacks
        this.setViewSize = this.setViewSize.bind(this);
        this.saveGame = this.saveGame.bind(this);

        this.handleKeyDown = this.handleKeyDown.bind(this);

        this.mainLoop = this.mainLoop.bind(this);
        this.isGUICommand = this.isGUICommand.bind(this);
        this.doGUICommand = this.doGUICommand.bind(this);
        this.setViewType = this.setViewType.bind(this);


        // GameBoard callbacks
        this.onCellClick = this.onCellClick.bind(this);
        this.handleRightClick = this.handleRightClick.bind(this);
        this.onMouseOverCell = this.onMouseOverCell.bind(this);

        this.GUIHelp = this.GUIHelp.bind(this);
        this.GUIInventory = this.GUIInventory.bind(this);
        this.GUIMap = this.GUIMap.bind(this);
        this.GUIOverWorldMap = this.GUIOverWorldMap.bind(this);
        this.GUINextTarget = this.GUINextTarget.bind(this);
        this.GUILook = this.GUILook.bind(this);
        this.GUIUseItem = this.GUIUseItem.bind(this);

        this.gameToJSON = this.gameToJSON.bind(this);
        this.selectSaveGame = this.selectSaveGame.bind(this);

        // GameInventory callbacks
        this.setInventoryMsg = this.setInventoryMsg.bind(this);
        this.selectEquipTop = this.selectEquipTop.bind(this);
        this.selectItemTop = this.selectItemTop.bind(this);
        this.doInvCmd = this.doInvCmd.bind(this);

        this.setEditorData = this.setEditorData.bind(this);
        this.toggleEditor = this.toggleEditor.bind(this);
        this.toggleScreen = this.toggleScreen.bind(this);
        this.showScreen = this.showScreen.bind(this);
        this.hideScreen = this.hideScreen.bind(this);

        this.showStartScreen = this.showStartScreen.bind(this);
        this.showLoadScreen = this.showLoadScreen.bind(this);

        this.getNextTargetCell = this.getNextTargetCell.bind(this);

        this.onLoadCallback = this.onLoadCallback.bind(this);
        this.topMenuCallback = this.topMenuCallback.bind(this);
        // this.importJSON = this.importJSON.bind(this);
        this.menuItemClicked = this.menuItemClicked.bind(this);

        this.onLoadScript = this.onLoadScript.bind(this);
        this.loadScript = this.loadScript.bind(this);
        this.updatePluginList = this.updatePluginList.bind(this);
    }

}

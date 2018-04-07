'use strict';

import React, {Component} from 'react';

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

import GameStats, {VIEW_MAP, VIEW_PLAYER} from './game-stats';

const ROT = require('../../lib/rot');
const RG = require('../src/rg');
const Keys = require('../src/keymap');
RG.Game = require('../src/game');
RG.Verify = require('../src/verify');

const md5 = require('js-md5');

const Screen = require('../gui/screen');
const Persist = require('../src/persist');
const worldConf = require('../data/conf.world');

const INV_SCREEN = 'Inventory';

/* Contains logic that is not tightly coupled to the GUI.*/
class TopLogic {

  describeCell(cell, seenCells) {
    var index = seenCells.indexOf(cell);
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

  getAdjacentCell(player, code) {
    if (RG.KeyMap.inMoveCodeMap(code) || RG.KeyMap.isRest(code)) {
      const x = player.getX();
      const y = player.getY();
      const diffXY = RG.KeyMap.getDiff(code, x, y);
      if (diffXY !== null) {
        return player.getLevel().getMap().getCell(diffXY[0], diffXY[1]);
      }
    }
    return null;
  }

}

const ProxyListener = function(cbNotify) {
  this.hasNotify = true;

  this.notify = function(evtName, obj) {
    cbNotify(evtName, obj);
  };

};

/* Top-level Component for the Battles GUI.*/
class BattlesTop extends Component {

    constructor(props) {
        super(props);
        this.logic = new TopLogic();
        this.game = null;
        this.gameSave = new RG.Game.Save();

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

            playerLevel: 'Medium',
            gameLength: 'Medium',
            levelSize: 'Medium',
            monstType: 'Medium',
            lootType: 'Medium',
            playerClass: RG.ACTOR_CLASSES[0],
            playerRace: RG.ACTOR_RACES[0],

            sqrPerActor: 120,
            sqrPerItem: 120,
            playMode: 'OverWorld',
            loadedPlayer: null,
            loadedLevel: null,
            playerName: 'Player',
            world: worldConf,
            xMult: 4,
            yMult: 5
        };

        this.keysEnabled = false;
        this.keyPending = false;
        this.autoModeKeyBuffer = [];
        this.ctrlMode = 'MANUAL';

        this.hasNotify = true;
        this.notify = this.notify.bind(this);
        this.listener = new ProxyListener(this.notify);

        this.gameSave.setStorage(window.localStorage);
        this.savedPlayerList = this.gameSave.getPlayersAsList();

        this.state = {
            boardClassName: 'game-board-player-view',
            playMode: 'OverWorld',
            equipSelected: null,
            gameLength: 'Medium',
            invMsg: '',
            invMsgStyle: '',
            levelSize: 'Medium',
            loadInProgress: false,
            lootType: 'Medium',
            monstType: 'Medium',
            playerLevel: 'Medium',
            playerName: 'Player',
            render: true,
            saveInProgress: false,
            seedName: '',
            selectedCell: null,
            selectedGame: null,
            selectedItem: null,
            showEditor: false,
            showMap: false,
            showGameMenu: false,
            showStartScreen: true,
            showHelpScreen: false,
            showLoadScreen: false,
            showOWMap: false,
            showInventory: false,
            showCharInfo: false
        };

        // Binding of callbacks
        this.bindCallbacks();
        this.initGUICommandTable();
        RG.RAND.setSeed(1);
    }

    /* Toggles the game editor view. Need to terminate the existing
     * animation. */
    toggleEditor() {
        cancelAnimationFrame(this.frameID);
        const showStartScreen = this.state.showEditor;
        this.setState({showStartScreen,
            showEditor: !this.state.showEditor});
    }

    selectSaveGame(name) {
        this.setState({selectedGame: name});
    }

    /* Resets the GUI game state.*/
    resetGameState() {
        this.gameState = {
            autoTarget: false,
            visibleCells: [],
            useModeEnabled: false,
            isTargeting: false,
            targetInRange: false
        };
    }

    setPlayerName(name) {
        this.gameConf.playerName = name;
        this.setState({playerName: name});
    }

    setSeedName(name) {
        let seed = parseInt(name, 10);
        if (Number.isNaN(seed)) {
            const hash = md5(name);
            seed = parseInt(hash, 16);
        }
        RG.RAND.setSeed(seed);
        ROT.RNG.setSeed(seed);
        this.setState({seedName: name});
    }

    /* Sets the size of the shown map.*/
    setViewSize(obj, xOrY) {
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
    setViewType(type) {
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

    createNewGameAsync() {
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
    newGame() {
        this.enableKeys();
        const startTime = new Date().getTime();
        this.hideScreen('StartScreen');
        this.createNewGameAsync().then(() => {
            const dur = new Date().getTime() - startTime;
            console.log(`Creating game took ${dur} ms`);
            this.setState({render: true});
        });
    }

    /* Saves the game position.*/
    saveGame() {
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
    gameToJSON() {
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
    loadGame(playerName) {
        if (playerName) {
            this.setState({showLoadScreen: false, showStartScreen: false,
                loadInProgress: true});

            const persist = new Persist(playerName);
            persist.fromStorage().then(result => {
                const fromJSON = new RG.Game.FromJSON();

                // Pick JSON matching the selected player name
                const json = result;
                const restGame = fromJSON.createGame(json);
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
    initRestoredGame(game) {
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
        this.gameState.visibleCells = player.getLevel().exploreCells(player);
        RG.POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this.listener);
        RG.POOL.listenEvent(RG.EVT_DESTROY_ITEM, this.listener);
        this.enableKeys();
        this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
        this.setState({render: true, loadInProgress: false});
    }

    /* Deletes a saved game from the list. */
    deleteGame(name) {
        if (name) {
            const persist = new Persist(name);
            persist.deleteStorage(() => {
                this.gameSave.deletePlayer(name);
                this.savedPlayerList = this.gameSave.getPlayersAsList();
                this.setState({render: true, selectedGame: null});
            });
        }
    }

    restoreConf(obj) {
        const props = ['cols', 'rows', 'sqrPerActor', 'sqrPerItem', 'levels'];
        for (let i = 0; i < props.length; i++) {
            this.gameConf[props[i]] = obj[props[i]];
        }
    }

    /* Creates a new game instance.*/
    createNewGame() {
        if (this.frameID) {
            cancelAnimationFrame(this.frameID);
        }

        this.resetGameState();
        const gameFactory = new RG.Factory.Game();
        if (this.game !== null) {
            delete this.game;
            RG.FACT = new RG.Factory.Base();
        }

        this.game = gameFactory.createNewGame(this.gameConf);
        this.game.setGUICallbacks(this.isGUICommand, this.doGUICommand);
        this.game.setAnimationCallback(this.playAnimation.bind(this));
        this.setDebugRefsToWindow();

        const player = this.game.getPlayer();
        this.gameState.visibleCells = player.getLevel().exploreCells(player);
        RG.POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this.listener);
        RG.POOL.listenEvent(RG.EVT_DESTROY_ITEM, this.listener);
        this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
    }

    /* Sets some global variables which ease up the debugging with console.
     */
    setDebugRefsToWindow() {
        window.RG = RG;
        window.GAME = this.game; // For debugging
        const player = this.game.getPlayer();
        window.PLAYER = player; // For debugging
    }

    selectItemTop(item) {
        this.setState({selectedItem: item});
    }

    selectEquipTop(selection) {
        if (selection) {
            this.setState({selectedItem: selection.item,
                equipSelected: selection});
        }
        else {
            this.setState({selectedItem: null, equipSelected: null});
        }
    }

    setAutoMode() {
        this.ctrlMode = 'AUTOMATIC';
    }

    /* When a cell is clicked, perform a command/show debug info. */
    onCellClick(x, y) {
        const map = this.game.getPlayer().getLevel().getMap();
        if (map.hasXY(x, y)) {
            const cell = map.getCell(x, y);
            if (this.gameState.isTargeting) {
                this.game.update({cmd: 'missile', target: cell});
                this.gameState.visibleCells = this.game.visibleCells;
                this.screen.setSelectedCell(null);
                this.setState({selectedCell: null});
                this.gameState.isTargeting = false;
            }
            else {
                this.logic.describeCell(cell, this.gameState.visibleCells);
                this.setState({selectedCell: cell});
                this.clickHandler = new CellClickHandler(this.game);
                this.clickHandler.handleClick(x, y, cell);

                if (this.clickHandler.hasKeys()) {
                    this.setAutoMode();
                }
            }
            console.log(`Cell: ${JSON.stringify(cell)}`);
            if (cell.hasActors()) {
                const actors = cell.getActors();
                console.log(`Actors: ${JSON.stringify(actors)}`);
            }
            if (cell.hasConnection()) {
                const conns = cell.getPropType('connection');
                console.log(`Actors: ${JSON.stringify(conns)}`);
            }
        }
        else {
            RG.warn('BattlesTop', 'onCellClick',
                `No cell ${x},${y} in the map.`);
        }
    }

    /* When listening events, component gets notification via this
     * method.*/
    notify(evtName, obj) {
        if (evtName === RG.EVT_LEVEL_CHANGED) {
            const actor = obj.actor;
            if (actor.isPlayer()) {
                this.setState({render: true});
            }
        }
    }

    componentDidMount() {
      // document.addEventListener('keypress', this.handleKeyDown, true);
    }

    componentWillUnMount() {
      // document.removeEventListener('keypress', this.handleKeyDown);
    }

    enableKeys() {
      if (!this.keysEnabled) {
        document.addEventListener('keypress', this.handleKeyDown, true);
        this.keysEnabled = true;
      }
    }

    disableKeys() {
      if (this.keysEnabled) {
        document.removeEventListener('keypress', this.handleKeyDown);
        this.keysEnabled = false;
      }
    }

    isValidKey(keyCode) {
        return Keys.isValidKey(keyCode) ||
            this.guiCommands[keyCode] ||
            Keys.isNumeric(keyCode);
    }

    /* Listens for player key presses and handles them.*/
    handleKeyDown(evt) {
        const keyCode = typeof evt.which === 'number' ? evt.which : evt.keyCode;
        if (this.keyPending === false) {
            // if (this.isValidKey(keyCode)) {
                this.keyPending = true;
                this.nextCode = keyCode;
                if (!this.isGUICommand(keyCode)) {
                    this.gameState.isTargeting = false;
                }
            // }
        }
    }

    /* Returns the next key, either from player or from click handler. */
    getNextCode() {
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
    checkIfAutoModeDone() {
        if (this.clickHandler) {
            if (!this.clickHandler.hasKeys()) {
                this.ctrlMode = 'MANUAL';
            }
        }
    }

    mainLoop() {
        if (this.keyPending === true || this.ctrlMode === 'AUTOMATIC') {
            const code = this.getNextCode();
            this.game.update({code});
            this.gameState.visibleCells = this.game.visibleCells;

            if (this.game.isGameOver()) {
                this.setState({render: true, showGameMenu: false});
            }
            else {
                const player = this.game.getPlayer();
                const brain = player.getBrain();
                const updates = {render: true, showGameMenu: false};
                if (brain.hasTargetSelected()) {
                    updates.selectedCell = brain.getTarget();
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
    playAnimation() {
        if (this.game.hasAnimation()) {
            const anim = this.game.getAnimationFrame();
            this.setState({render: true, animation: anim});
            this.animationID = requestAnimationFrame(
                this.playAnimation.bind(this));
        }
        else {
            // Animation is finished, go back to mainLoop
            this.setState({render: true, animation: null});
            // this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
        }
    }

    onLoadCallback(data) {
        const fromJSON = new RG.Game.FromJSON();
        const restGame = fromJSON.createGame(data);
        const player = restGame.getPlayer();
        if (player !== null) {
            this.initRestoredGame(restGame);
        }
    }

    render() {
        let map = null;
        let player = null;
        let inv = null;
        let eq = null;
        let maxWeight = null;
        let message = [];
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
            playerLevel: this.state.playerLevel,
            gameLength: this.state.gameLength,
            levelSize: this.state.levelSize,
            monstType: this.state.monstType,
            lootType: this.state.lootType,
            playMode: this.state.playMode
        };

        const oneSelectedCell = this.getOneSelectedCell();

        return (
            <div className='container main-div' id='main-div' >
                <GameTopMenu menuCallback={this.topMenuCallback} />

                {(this.state.showStartScreen || this.state.showLoadScreen) &&
                <GameStartScreen
                    deleteGame={this.deleteGame}
                    loadGame={this.loadGame}
                    newGame={this.newGame}
                    playerName={this.state.playerName}
                    progress={this.state.progress}
                    savedPlayerList={this.savedPlayerList}
                    seedName={this.state.seedName}
                    selectedGame={this.state.selectedGame}
                    selectGame={this.selectSaveGame}
                    setGameLength={this.setGameLength}
                    setLevelSize={this.setLevelSize}
                    setLoot={this.setLoot}
                    setMonsters={this.setMonsters}
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
                            <LevelSaveLoad
                                objData={this.game}
                                onLoadCallback={this.onLoadCallback}
                                pretty={false}
                                savedObjName={'saveGame_' + player.getName()}
                                setMsg={this.showMsg}
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
                            <GameBoard
                                boardClassName={this.state.boardClassName}
                                charRows={charRows}
                                classRows={classRows}
                                endY={this.screen.endY}
                                onCellClick={this.onCellClick}
                                rowClass={rowClass}
                                sizeX={2 * this.screen.viewportX + 1}
                                startX={startX}
                                startY={this.screen.startY}
                                useRLE={true}
                            />
                            }
                            {showGameMenu &&
                            <GameMenu
                                height={28}
                                menuObj={this.game.getMenu()}
                                width={80}
                            />
                            }
                        </div>
                    </div>
                    }

                </div>
                }

                {this.state.showEditor &&
                  <GameEditor
                      toggleEditor={this.toggleEditor}
                  />
                }
            </div>
        );
    }

    getOneSelectedCell() {
        if (Array.isArray(this.state.selectedCell)) {
            return this.state.selectedCell[0];
        }
        return this.state.selectedCell;
    }

    //-------------------------------------------------------------
    // GUI-RELATED COMMANDS
    //-------------------------------------------------------------

    /* GUI command keybindings are specified here. */
    initGUICommandTable() {
        this.guiCommands = {};
        this.guiCommands[Keys.GUI.Help] = this.GUIHelp.bind(this);
        this.guiCommands[Keys.GUI.Inv] = this.GUIInventory;
        this.guiCommands[Keys.GUI.Map] = this.GUIMap;
        this.guiCommands[Keys.GUI.OwMap] = this.GUIOverWorldMap.bind(this);
        // this.guiCommands[Keys.VK_n] = this.GUINextTarget;
        this.guiCommands[Keys.GUI.Look] = this.GUILook;
        this.guiCommands[Keys.GUI.Use] = this.GUIUseItem;
        this.guiCommands[Keys.GUI.CharInfo] = this.GUICharInfo.bind(this);
    }

    /* Returns true if given command is a GUI command. */
    isGUICommand(code) {
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

    GUIHelp() {
      this.showScreen('HelpScreen');
    }

    GUICharInfo() {
      this.showScreen('CharInfo');
    }

    /* GameInventory should add a callback which updates the GUI (via props) */
    doInvCmd(cmd) {
        this.game.update(cmd);
    }

    /* Calls a GUI command corresponding to the code.*/
    doGUICommand(code) {
         if (this.gameState.useModeEnabled) {
            this.gameState.useModeEnabled = false;
            const item = this.state.selectedItem;
            if (item !== null) {

                const player = this.game.getPlayer();
                const cell = this.logic.getAdjacentCell(player, code);
                if (cell !== null) {
                    this.game.update({
                        cmd: 'use', target: cell, item
                    });
                    if (item.has('OneShot')) {
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
        else {
            console.error('Unknown keycode for GUI command.');
        }
    }

    /* Called by GameInventory to change the message shown. */
    setInventoryMsg(msg) {
        this.setState({invMsg: msg.invMsg, invMsgStyle: msg.msgStyle});
    }

    /* Brings up the inventory.*/
    GUIInventory() {
        this.toggleScreen(INV_SCREEN);
    }

    /* Toggles the map view. */
    GUIMap() {
      if (this.state.showMap) {
        this.setViewType(VIEW_PLAYER);
      }
      else {
        this.setViewType(VIEW_MAP);
      }
    }

    GUIOverWorldMap() {
      this.toggleScreen('OWMap');
    }

    /* Finds the nearest enemy and shows its name when 'l' is pressed. */
    GUILook() {
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

    GUIUseItem() {
        if (!this.gameState.useModeEnabled) {
            this.gameState.useModeEnabled = true;
            if (this.state.selectedItem === null) {
                this.showScreen('Inventory');
            }
            RG.gameMsg('Select direction for using the item.');
        }
    }

    /* Selects next target when 'n' is pressed.*/
    GUINextTarget() {
        if (this.gameState.isTargeting) {
            const nextCell = this.getNextTargetCell();
            this.screen.setSelectedCell(nextCell);
            this.setState({selectedCell: nextCell});
        }
    }

    getNextTargetCell() {
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

    showScreen(type) {
        const key = 'show' + type;
        this.disableKeys();
        if (this.state.hasOwnProperty(key)) {
          this.setState({[key]: true});
        }
        else {
          console.error(`showScreen: key ${key} not found in state`);
        }
    }

    hideScreen(type) {
        const key = 'show' + type;
        this.enableKeys();
        this.setState({[key]: false});
    }

    toggleScreen(type) {
        const key = 'show' + type;
        const wasShown = this.state[key];
        if (wasShown) {this.enableKeys();}
        else {this.disableKeys();}
        this.setState({[key]: !wasShown});
    }

    showStartScreen() {
        if (!this.state.showStartScreen) {
            this.setState({showStartScreen: true});
        }
    }

    showLoadScreen() {
      this.setState({showLoadScreen: true});
    }

    //--------------------------------
    // GAME CONFIG RELATED FUNCTIONS
    //-------------------------------

    setLoot(lootType) {
        switch (lootType) {
            case 'Sparse': this.gameConf.sqrPerItem = RG.LOOT_SPARSE_SQR; break;
            case 'Medium': this.gameConf.sqrPerItem = RG.LOOT_MEDIUM_SQR; break;
            case 'Abundant': {
                this.gameConf.sqrPerItem = RG.LOOT_ABUNDANT_SQR; break;
            }
            default: console.error('setLoot illegal lootType ' + lootType);
        }
        this.gameConf.lootType = lootType;
        this.setState({lootType});
    }

    setMonsters(monstType) {
        switch (monstType) {
            case 'Sparse': {
                this.gameConf.sqrPerActor = RG.ACTOR_SPARSE_SQR; break;
            }
            case 'Medium': {
                this.gameConf.sqrPerActor = RG.ACTOR_MEDIUM_SQR; break;
            }
            case 'Abundant': {
                this.gameConf.sqrPerActor = RG.ACTOR_ABUNDANT_SQR; break;
            }
            default:
                console.error('setMonsters illegal monstType ' + monstType);
        }
        this.gameConf.monstType = monstType;
        this.setState({monstType});
    }

    setLevelSize(levelSize) {
        switch (levelSize) {
            case 'Small': this.gameConf.cols = RG.LEVEL_SMALL_X;
                this.gameConf.rows = RG.LEVEL_SMALL_Y; break;
            case 'Medium': this.gameConf.cols = RG.LEVEL_MEDIUM_X;
                this.gameConf.rows = RG.LEVEL_MEDIUM_Y; break;
            case 'Large': this.gameConf.cols = RG.LEVEL_LARGE_X;
                this.gameConf.rows = RG.LEVEL_LARGE_Y; break;
            case 'Huge': this.gameConf.cols = RG.LEVEL_HUGE_X;
                this.gameConf.rows = RG.LEVEL_HUGE_Y; break;
            default: console.error('setLeveSize illegal size ' + levelSize);
        }
        this.gameConf.levelSize = levelSize;
        this.setState({levelSize});
    }

    setPlayerLevel(level) {
        this.gameConf.playerLevel = level;
        this.setState({playerLevel: level});
    }

    setPlayerClass(className) {
        this.gameConf.playerClass = className;
        this.setState({playerClass: className});
    }

    setPlayerRace(raceName) {
        this.gameConf.playerRace = raceName;
        this.setState({playerRace: raceName});
    }

    setGameLength(length) {
        switch (length) {
            case 'Short': this.gameConf.levels = 5; break;
            case 'Medium': this.gameConf.levels = 10; break;
            case 'Long': this.gameConf.levels = 15; break;
            case 'Epic': this.gameConf.levels = 30; break;
            default: console.error('setGameLength illegal length ' + length);
        }
        this.gameConf.gameLength = length;
        this.setState({gameLength: length});
    }

    setPlayMode(mode) {
        switch (mode) {
            case 'Arena': this.gameConf.playMode = 'Arena'; break;
            case 'Battle': this.gameConf.playMode = 'Battle'; break;
            case 'Creator': this.gameConf.playMode = 'Creator'; break;
            case 'Dungeon': this.gameConf.playMode = 'Dungeon'; break;
            case 'OverWorld': this.gameConf.playMode = 'OverWorld'; break;
            case 'World': this.gameConf.playMode = 'World'; break;
            default: console.error('setPlayMode illegal mode ' + mode);
        }
        this.setState({playMode: mode});
    }

    bindCallbacks() {
        this.newGame = this.newGame.bind(this);

        // GameStartScreen callbacks
        this.deleteGame = this.deleteGame.bind(this);
        this.loadGame = this.loadGame.bind(this);
        this.setPlayMode = this.setPlayMode.bind(this);
        this.setGameLength = this.setGameLength.bind(this);
        this.setLevelSize = this.setLevelSize.bind(this);
        this.setLoot = this.setLoot.bind(this);
        this.setMonsters = this.setMonsters.bind(this);
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

        this.toggleEditor = this.toggleEditor.bind(this);
        this.toggleScreen = this.toggleScreen.bind(this);
        this.showScreen = this.showScreen.bind(this);
        this.hideScreen = this.hideScreen.bind(this);

        this.showStartScreen = this.showStartScreen.bind(this);
        this.showLoadScreen = this.showLoadScreen.bind(this);

        this.getNextTargetCell = this.getNextTargetCell.bind(this);

        this.onLoadCallback = this.onLoadCallback.bind(this);
        this.topMenuCallback = this.topMenuCallback.bind(this);
    }

    topMenuCallback(cmd, args) {
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

    showMsg(msg) {
        console.log('showMsg:', msg);
    }

}


module.exports = BattlesTop;


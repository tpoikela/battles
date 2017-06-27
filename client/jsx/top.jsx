'use strict';
const React = require('react');

const ROT = require('../../lib/rot');
const RG = require('../src/rg.js');
RG.Game = require('../src/game.js');

const $ = require('jquery');

// Subcomponents
const GameStartScreen = require('./game-start-screen');
const GameHelpScreen = require('./game-help-screen');
const GameInventory = require('./game-inventory');
const GamePanel = require('./game-panel');
const GameMessages = require('./game-messages');
const GameStats = require('./game-stats');
const GameBoard = require('./game-board');

const Persist = require('../src/persist');

const worldConf = require('../data/conf.world');

/* Top-level component which renders all other components. Keeps also track
 * of the current game state.
 */

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
class BattlesTop extends React.Component {

    constructor(props) {
        super(props);
        this.logic = new TopLogic();
        this.game = null;
        this.gameSave = new RG.Game.Save();

        this.intervalID = null;
        // Holds game-state specific info for GUI (see resetGameState)
        this.gameState = {};

        this.viewportPlayerX = 35; // * 2
        this.viewportPlayerY = 12; // * 2
        this.viewportX = 35; // * 2
        this.viewportY = 12; // * 2

        // Simple configuration for the game
        this.gameConf = {
            cols: 80,
            rows: 60,
            levels: 2,
            playerLevel: 'Medium',
            sqrPerMonster: 40,
            sqrPerItem: 100,
            debugMode: false,
            loadedPlayer: null,
            loadedLevel: null,
            playerName: 'Player',
            world: worldConf
        };

        this.keyPending = false;

        this.hasNotify = true;
        this.notify = this.notify.bind(this);
        this.listener = new ProxyListener(this.notify);

        this.gameSave.setStorage(window.localStorage);
        this.savedPlayerList = this.gameSave.getPlayersAsList();
        this.createNewGame();

        this.state = {
            boardClassName: 'game-board-player-view',
            loadInProgress: false,
            mapShown: false,
            saveInProgress: false,
            selectedCell: null,
            selectedItem: null,
            render: true,
            renderFullScreen: false
        };

        // Binding of callbacks
        this.bindCallbacks();
        this.initGUICommandTable();
        ROT.RNG.setSeed(0); // TODO
        RG.RAND.setSeed(0);
    }

    /* Resets the GUI game state.*/
    resetGameState() {
        this.gameState = {
            autoTarget: false,
            visibleCells: [],
            useModeEnabled: false,
            isTargeting: false
        };
    }

    setPlayerName(name) {
        this.gameConf.playerName = name;
    }

    forceRender() {
        this.setState({render: true, renderFullScreen: true});
    }

    /* Sets the size of the shown map.*/
    setViewSize(evt, obj, xOrY) {
        if (obj === '+') {
            if (xOrY === 'X') {this.viewportX += 5;}
            else {this.viewportY += 2;}
        }
        if (obj === '-') {
            if (xOrY === 'X') {this.viewportX -= 5;}
            else {this.viewportY -= 2;}
        }
        this.setState({render: true, renderFullScreen: true});
    }

    /* Toggles view between normal view and zoomed out map view. */
    setViewType(type) {
        if (type === 'map') {
           this.viewportPlayerX = this.viewportX;
           this.viewportPlayerY = this.viewportY;
           this.viewportX = this.game.getPlayer().getLevel().getMap().cols;
           this.viewportY = this.game.getPlayer().getLevel().getMap().rows;
           this.setState({
               boardClassName: 'game-board-map-view',
                mapShown: true
           });
        }
        else if (type === 'player') {
            this.viewportX = this.viewportPlayerX;
            this.viewportY = this.viewportPlayerY;
            this.setState({
                boardClassName: 'game-board-player-view',
                mapShown: false
            });
        }
    }


    /* Called when "Start" button is clicked to create a new game.*/
    newGame() {
        this.createNewGame();
        this.setState({render: true, renderFullScreen: true});
    }

    /* Saves the game position.*/
    saveGame() {
        const name = this.game.getPlayer().getName();
        const persist = new Persist(window.indexedDB, name);
        this.setState({saveInProgress: true});

        this.gameToJSON().then(persist.toStorage)
            .then(() => {
                this.gameSave.save(this.game, this.gameConf);
                this.savedPlayerList = this.gameSave.getPlayersAsList();
                RG.gameMsg('Your progress has been saved.');
                this.setState({render: true,
                    saveInProgress: false, renderFullScreen: true});
            });
    }

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

    /* Loads a saved game.*/
    loadGame(name) {
        this.setState({loadInProgress: true});

        const persist = new Persist(window.indexedDB, name);
        persist.fromStorage().then(result => {
            const fromJSON = new RG.Game.FromJSON();
            let json = null;
            result.forEach(res => {
                if (res.player.name === name) {
                    json = res;
                }
            });

            const restGame = fromJSON.createGame(json);
            const player = restGame.getPlayer();
            if (player !== null) {
                this.gameConf.loadedPlayer = player;
                this.gameConf.loadedLevel = this.gameSave.getDungeonLevel();
                const confObj = this.gameSave.getPlayersAsObj()[name];
                this.restoreConf(confObj);
                this.initRestoredGame(restGame);
            }
        });
    }

    initRestoredGame(game) {
        if (this.intervalID !== null) {
            clearInterval(this.intervalID);
        }

        this.resetGameState();
        if (this.game !== null) {
            delete this.game;
            RG.FACT = new RG.Factory.Base();
        }
        this.game = game;
        this.game.setGUICallbacks(this.isGUICommand, this.doGUICommand);

        const player = this.game.getPlayer();
        this.gameState.visibleCells = player.getLevel().exploreCells(player);
        RG.POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this.listener);
        RG.POOL.listenEvent(RG.EVT_DESTROY_ITEM, this.listener);
        this.intervalID = setInterval(this.mainLoop, 1000.0 / 60);
        this.setState({render: true,
            loadInProgress: false, renderFullScreen: true});
    }

    deleteGame(name) {
        this.gameSave.deletePlayer(name);
        this.savedPlayerList = this.gameSave.getPlayersAsList();
        this.setState({render: true, renderFullScreen: true});
    }

    restoreConf(obj) {
        const props = ['cols', 'rows', 'sqrPerMonster', 'sqrPerItem', 'levels'];
        for (let i = 0; i < props.length; i++) {
            this.gameConf[props[i]] = obj[props[i]];
        }
    }

    /* Creates a new game instance.*/
    createNewGame() {
        if (this.intervalID !== null) {
            clearInterval(this.intervalID);
        }

        this.resetGameState();
        const fccGame = new RG.FCCGame();
        if (this.game !== null) {
            delete this.game;
            RG.FACT = new RG.Factory.Base();
        }
        this.game = fccGame.createNewGame(this.gameConf);
        this.game.setGUICallbacks(this.isGUICommand, this.doGUICommand);

        const player = this.game.getPlayer();
        this.gameState.visibleCells = player.getLevel().exploreCells(player);
        RG.POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this.listener);
        RG.POOL.listenEvent(RG.EVT_DESTROY_ITEM, this.listener);
        this.intervalID = setInterval(this.mainLoop, 1000.0 / 60);
    }

    selectItemTop(item) {
        this.setState({selectedItem: item});
    }

    /* When a cell is clicked, perform a command/show debug info. */
    onCellClick(x, y) {
        const cell = this.game.getPlayer().getLevel().getMap().getCell(x, y);
        if (this.gameState.isTargeting) {
            this.game.update({cmd: 'missile', target: cell});
            this.gameState.visibleCells = this.game.visibleCells;
            this.setState({render: true, renderFullScreen: false});
            this.gameState.isTargeting = false;
        }
        else {
            this.logic.describeCell(cell, this.gameState.visibleCells);
            this.setState({render: true, renderFullScreen: true});
        }
        console.log(`Cell: ${JSON.stringify(cell)}`);
    }

    /* When listening events, component gets notification via this
     * method.*/
    notify(evtName, obj) {
        if (evtName === RG.EVT_LEVEL_CHANGED) {
            const actor = obj.actor;
            if (actor.isPlayer()) {
                this.setState({render: true, renderFullScreen: true});
            }
        }
    }

    componentDidMount() {
      // $(document.body).on('keydown', this.handleKeyDown);
      document.addEventListener('keydown', this.handleKeyDown, true);
      $('#start-button').trigger('click');
    }

    componentWillUnMount() {
      document.removeEventListener('keydown', this.handleKeyDown);
        // $(document.body).off('keydown', this.handleKeyDown);
    }


    /* Listens for player key presses and handles them.*/
    handleKeyDown(evt) {
        if (this.keyPending === false) {
            this.keyPending = true;
            this.nextCode = evt.keyCode;
        }
    }

    mainLoop() {
        if (this.keyPending === true) {
            const code = this.nextCode;
            this.game.update({code});
            this.gameState.visibleCells = this.game.visibleCells;
            if (this.game.isGameOver()) {
                this.setState({render: true, renderFullScreen: true});
            }
            else {
                this.setState({render: true, renderFullScreen: false});
            }
            this.keyPending = false;
        }
    }

    render() {
        const map = this.game.getVisibleMap();
        const player = this.game.getPlayer();
        const inv = player.getInvEq().getInventory();
        const eq = player.getInvEq().getEquipment();
        const fullScreen = this.state.renderFullScreen;
        const maxWeight = player.getMaxWeight();

        let message = [];
        if (this.game.hasNewMessages()) {
            message = this.game.getMessages();
        }

        return (
            <div className='container main-div' id='main-div' >

                <GameStartScreen
                    deleteGame={this.deleteGame}
                    loadGame={this.loadGame}
                    newGame={this.newGame}
                    savedPlayerList={this.savedPlayerList}
                    setDebugMode={this.setDebugMode}
                    setGameLength={this.setGameLength}
                    setLevelSize={this.setLevelSize}
                    setLoot={this.setLoot}
                    setMonsters={this.setMonsters}
                    setPlayerLevel={this.setPlayerLevel}
                    setPlayerName={this.setPlayerName}
                />
                <GameHelpScreen />

                <GameInventory
                    eq={eq}
                    forceRender={this.forceRender}
                    inv={inv}
                    maxWeight={maxWeight}
                    player={player}
                    selectItemTop={this.selectItemTop}
                />

                <div className='row game-panel-div'>
                    <div className='col-md-2'>
                        <GamePanel
                            saveGame={this.saveGame}
                            setViewSize={this.setViewSize}
                        />
                    </div>
                    <div className='col-md-10 game-messages-div'>
                        <GameMessages
                            message={message}
                            saveInProgress={this.state.saveInProgress}
                            visibleCells={this.gameState.visibleCells}
                        />
                    </div>
                </div>
                <div className='row main-contents-div'>
                    <div className='text-left col-md-2 game-stats-div'>
                        <GameStats
                            player={player}
                            selectedCell={this.state.selectedCell}
                            selectedItem={this.state.selectedItem}
                            setViewType={this.setViewType}
                        />
                    </div>
                    <div className='col-md-10 game-board-div'>
                        <GameBoard
                            boardClassName={this.state.boardClassName}
                            map={map}
                            mapShown={this.mapShown}
                            onCellClick={this.onCellClick}
                            player={player}
                            renderFullScreen={fullScreen}
                            selectedCell={this.state.selectedCell}
                            viewportX={this.viewportX}
                            viewportY={this.viewportY}
                            visibleCells={this.gameState.visibleCells}
                        />
                    </div>
                </div>

            </div>
        );
    }


    //-------------------------------------------------------------
    // GUI-RELATED COMMANDS
    //-------------------------------------------------------------

    /* GUI command keybindings are specified here. */
    initGUICommandTable() {
        this.guiCommands = {};
        this.guiCommands[ROT.VK_I] = this.GUIInventory;
        this.guiCommands[ROT.VK_M] = this.GUIMap;
        this.guiCommands[ROT.VK_N] = this.GUINextTarget;
        this.guiCommands[ROT.VK_T] = this.GUITarget;
        this.guiCommands[ROT.VK_U] = this.GUIUseItem;

    }

    /* Returns true if given command is a GUI command. */
    isGUICommand(code) {
        if (this.gameState.autoTarget && code === ROT.VK_T) {
            return false;
        }
        else if (this.gameState.useModeEnabled) {
            return true;
        }
        else {
            return this.guiCommands.hasOwnProperty(code);
        }
    }

    /* Calls a GUI command corresponding to the code.*/
    doGUICommand(code) {
         if (this.gameState.useModeEnabled) {
            this.gameState.useModeEnabled = false;
            if (this.state.selectedItem !== null) {

                const player = this.game.getPlayer();
                const cell = this.logic.getAdjacentCell(player, code);
                if (cell !== null) {
                    this.game.update({
                        cmd: 'use', target: cell, item: this.state.selectedItem
                    });
                    this.setState({selectedItem: null});
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

    /* Brings up the inventory.*/
    GUIInventory() {
        $('#inventory-button').trigger('click');
    }

    /* Toggles the map view. */
    GUIMap() {
        $('#map-player-button').trigger('click');
    }

    GUITarget() {
        if (this.gameState.isTargeting) {
            if (this.state.selectedCell !== null) {
                const cell = this.state.selectedCell;
                this.gameState.autoTarget = true;
                this.game.update({cmd: 'missile', target: cell});
                this.gameState.visibleCells = this.game.visibleCells;
                this.setState({selectedCell: null});
            }
            this.gameState.autoTarget = false;
            this.gameState.isTargeting = false;
        }
        else {
            RG.gameWarn("Click on a cell to attack or press 't'");
            this.gameState.isTargeting = true;
            this.gameState.enemyCells = RG.findEnemyCellForPlayer(
                this.game.getPlayer(), this.gameState.visibleCells);
            this.gameState.numCurrCell = 0;

            if (this.gameState.enemyCells.length > 0) {
                const cell = this.gameState.enemyCells[0];
                this.setState({selectedCell: cell});
                console.log('GUITarget found selected cell');
            }

        }
        this.setState({render: true});
    }

    GUIUseItem() {
        if (!this.gameState.useModeEnabled) {
            this.gameState.useModeEnabled = true;
            if (this.state.selectedItem === null) {
                $('#inventory-button').trigger('click');
            }
            RG.gameMsg('Select direction for using the item.');
        }
    }

    /* Selects next target when 'n' is pressed.*/
    GUINextTarget() {
        if (this.gameState.isTargeting) {
            const numCells = this.gameState.enemyCells.length;
            if (numCells > 0) {
                let numNextCell = this.gameState.numCurrCell + 1;
                if (numNextCell >= numCells) {
                    numNextCell = 0;
                }

                const nextCell = this.gameState.enemyCells[numNextCell];
                this.setState({selectedCell: nextCell});
                this.gameState.numCurrCell = numNextCell;
            }
        }
    }

    //--------------------------------
    // GAME CONFIG RELATED FUNCTIONS
    //-------------------------------

    setLoot(lootType) {
        switch (lootType) {
            case 'Sparse': this.gameConf.sqrPerItem = 200; break;
            case 'Medium': this.gameConf.sqrPerItem = 120; break;
            case 'Abundant': this.gameConf.sqrPerItem = 50; break;
            default: console.error('setLoot illegal lootType ' + lootType);
        }
    }

    setMonsters(monstType) {
        switch (monstType) {
            case 'Sparse': this.gameConf.sqrPerMonster = 200; break;
            case 'Medium': this.gameConf.sqrPerMonster = 120; break;
            case 'Abundant': this.gameConf.sqrPerMonster = 50; break;
            default:
                console.error('setMonsters illegal monstType ' + monstType);
        }
    }

    setLevelSize(levelSize) {
        switch (levelSize) {
            case 'Small': this.gameConf.cols = 40;
                this.gameConf.rows = 20; break;
            case 'Medium': this.gameConf.cols = 60;
                this.gameConf.rows = 30; break;
            case 'Large': this.gameConf.cols = 80;
                this.gameConf.rows = 40; break;
            case 'Huge': this.gameConf.cols = 140;
                this.gameConf.rows = 60; break;
            default: console.error('setLeveSize illegal size ' + levelSize);
        }
        this.gameConf.levelSize = levelSize;
    }

    setPlayerLevel(level) {
        this.gameConf.playerLevel = level;
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
    }

    setDebugMode(mode) {
        switch (mode) {
            case 'Off': this.gameConf.debugMode = false; break;
            case 'Arena': this.gameConf.debugMode = 'Arena'; break;
            case 'Battle': this.gameConf.debugMode = 'Battle'; break;
            case 'Tiles': this.gameConf.debugMode = 'Tiles'; break;
            case 'World': this.gameConf.debugMode = 'World'; break;
            default: console.error('setDebugMode illegal mode ' + mode);
        }
    }

    bindCallbacks() {
        this.newGame = this.newGame.bind(this);

        // GameStartScreen callbacks
        this.deleteGame = this.deleteGame.bind(this);
        this.loadGame = this.loadGame.bind(this);
        this.setDebugMode = this.setDebugMode.bind(this);
        this.setGameLength = this.setGameLength.bind(this);
        this.setLevelSize = this.setLevelSize.bind(this);
        this.setLoot = this.setLoot.bind(this);
        this.setMonsters = this.setMonsters.bind(this);
        this.setPlayerLevel = this.setPlayerLevel.bind(this);
        this.setPlayerName = this.setPlayerName.bind(this);


        // GamePanel callbacks
        this.setViewSize = this.setViewSize.bind(this);
        this.saveGame = this.saveGame.bind(this);

        this.handleKeyDown = this.handleKeyDown.bind(this);

        this.mainLoop = this.mainLoop.bind(this);
        this.isGUICommand = this.isGUICommand.bind(this);
        this.doGUICommand = this.doGUICommand.bind(this);
        this.setViewType = this.setViewType.bind(this);

        this.selectItemTop = this.selectItemTop.bind(this);

        // GameBoard callbacks
        this.onCellClick = this.onCellClick.bind(this);

        this.GUIInventory = this.GUIInventory.bind(this);
        this.GUIMap = this.GUIMap.bind(this);
        this.GUINextTarget = this.GUINextTarget.bind(this);
        this.GUITarget = this.GUITarget.bind(this);
        this.GUIUseItem = this.GUIUseItem.bind(this);
        this.forceRender = this.forceRender.bind(this);

        this.gameToJSON = this.gameToJSON.bind(this);
    }

}

module.exports = BattlesTop;


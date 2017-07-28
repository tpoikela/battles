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
const GameEditor = require('./game-editor');

const Screen = require('../gui/screen');

const Persist = require('../src/persist');

const worldConf = require('../data/conf.world');

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

            sqrPerMonster: 120,
            sqrPerItem: 120,
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
        // this.createNewGame();

        this.state = {
            boardClassName: 'game-board-player-view',
            creatingGame: false,
            equipSelected: null,
            invMsg: '',
            loadInProgress: false,
            mapShown: false,
            invMsgStyle: '',
            playerName: 'Player',
            render: true,
            renderFullScreen: false,
            saveInProgress: false,
            selectedCell: null,
            selectedGame: null,
            selectedItem: null,
            showStartScreen: true,
            playerLevel: 'Medium',
            gameLength: 'Medium',
            levelSize: 'Medium',
            monstType: 'Medium',
            lootType: 'Medium',
            debugMode: 'Off',

            showEditor: false
        };

        // Binding of callbacks
        this.bindCallbacks();
        this.initGUICommandTable();
        ROT.RNG.setSeed(1); // TODO
        RG.RAND.setSeed(1);
    }

    /* Toggles the game editor view. Need to terminate the existing
     * animation. */
    toggleEditor() {
        cancelAnimationFrame(this.frameID);
        this.setState({showEditor: !this.state.showEditor});
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
            isTargeting: false
        };
    }

    setPlayerName(name) {
        this.gameConf.playerName = name;
        this.setState({playerName: name});
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
        this.screen.setViewportXY(this.viewportX, this.viewportY);
        this.setState({render: true, renderFullScreen: true});
    }

    /* Toggles view between normal view and zoomed out map view. */
    setViewType(type) {
        if (type === 'map') {
           this.viewportPlayerX = this.viewportX;
           this.viewportPlayerY = this.viewportY;
           this.viewportX = this.game.getPlayer().getLevel().getMap().cols;
           this.viewportY = this.game.getPlayer().getLevel().getMap().rows;
           this.screen.setMapShown(true);
           this.screen.setViewportXY(this.viewportX, this.viewportY);

           this.setState({
               render: true, renderFullScreen: true,
               boardClassName: 'game-board-map-view',
               mapShown: true
           });
        }
        else if (type === 'player') {
            this.viewportX = this.viewportPlayerX;
            this.viewportY = this.viewportPlayerY;
            this.screen.setMapShown(false);
            this.screen.setViewportXY(this.viewportX, this.viewportY);
            this.setState({
                render: true, renderFullScreen: true,
                boardClassName: 'game-board-player-view',
                mapShown: false
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
        this.setState({creatingGame: true, showStartScreen: false});
        this.createNewGameAsync().then(() => {
            this.setState({render: true, renderFullScreen: true,
                creatingGame: false});
        });
    }

    /* Saves the game position.*/
    saveGame() {
        const name = this.game.getPlayer().getName();
        const persist = new Persist(name);
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

    /* Loads a saved game from a JSON. */
    loadGame(playerName) {
        this.setState({loadInProgress: true});

        const persist = new Persist(playerName);
        persist.fromStorage().then(result => {
            const fromJSON = new RG.Game.FromJSON();

            // Pick JSON matching the selected player name
            let json = null;
            result.forEach(res => {
                if (res.player.name === playerName) {
                    json = res;
                }
            });

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

        const player = this.game.getPlayer();
        this.gameState.visibleCells = player.getLevel().exploreCells(player);
        RG.POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this.listener);
        RG.POOL.listenEvent(RG.EVT_DESTROY_ITEM, this.listener);
        this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
        this.setState({render: true,
            loadInProgress: false, renderFullScreen: true});
    }

    deleteGame(name) {
        this.gameSave.deletePlayer(name);
        this.savedPlayerList = this.gameSave.getPlayersAsList();
        this.setState({render: true, renderFullScreen: true,
            selectedGame: null});
    }

    restoreConf(obj) {
        const props = ['cols', 'rows', 'sqrPerMonster', 'sqrPerItem', 'levels'];
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

        const player = this.game.getPlayer();
        this.gameState.visibleCells = player.getLevel().exploreCells(player);
        RG.POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this.listener);
        RG.POOL.listenEvent(RG.EVT_DESTROY_ITEM, this.listener);
        this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
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
        this.frameID = requestAnimationFrame(this.mainLoop.bind(this));
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

        let gameValid = false;
        if (this.game) {
            map = this.game.getVisibleMap();
            player = this.game.getPlayer();
            inv = player.getInvEq().getInventory();
            eq = player.getInvEq().getEquipment();
            maxWeight = player.getMaxWeight();
            if (this.game.hasNewMessages()) {
                message = this.game.getMessages();
            }

            // All computations for the GameBoard
            const mapShown = this.state.mapShown;
            rowClass = 'cell-row-div-player-view';
            if (mapShown) {rowClass = 'cell-row-div-map-view';}

            const playX = player.getX();
            const playY = player.getY();
            if (map) {
                this.screen.renderWithRLE(
                    playX, playY, map, this.gameState.visibleCells);
            }
            else {
                console.log('map undefined');
            }
            charRows = this.screen.getCharRows();
            classRows = this.screen.getClassRows();
            startX = this.screen.getStartX();

            console.log('Setting gameValid to true!');
            gameValid = true;
        }

        const settings = {
            playerLevel: this.state.playerLevel,
            gameLength: this.state.gameLength,
            levelSize: this.state.levelSize,
            monstType: this.state.monstType,
            lootType: this.state.lootType,
            debugMode: this.state.debugMode
        };

        return (
            <div className='container main-div' id='main-div' >

                {this.state.showStartScreen &&
                <GameStartScreen
                    deleteGame={this.deleteGame}
                    loadGame={this.loadGame}
                    newGame={this.newGame}
                    playerName={this.state.playerName}
                    savedPlayerList={this.savedPlayerList}
                    selectedGame={this.state.selectedGame}
                    selectGame={this.selectSaveGame}
                    setDebugMode={this.setDebugMode}
                    setGameLength={this.setGameLength}
                    setLevelSize={this.setLevelSize}
                    setLoot={this.setLoot}
                    setMonsters={this.setMonsters}
                    setPlayerLevel={this.setPlayerLevel}
                    setPlayerName={this.setPlayerName}
                    settings={settings}
                    toggleEditor={this.toggleEditor}
                />
                }
                <GameHelpScreen />


                {gameValid && !this.state.showEditor &&
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
                />
                }

                {!this.state.showEditor &&
                <div className='row game-panel-div'>
                    <div className='col-md-2'>
                        <GamePanel
                            saveGame={this.saveGame}
                            setViewSize={this.setViewSize}
                            showLoadScreen={this.showLoadScreen}
                            showStartScreen={this.showStartScreen}
                        />
                        {gameValid &&
                        <div className='text-left game-stats-div'>
                            <GameStats
                                mapShown={this.state.mapShown}
                                player={player}
                                selectedCell={this.state.selectedCell}
                                selectedItem={this.state.selectedItem}
                                setViewType={this.setViewType}
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
                            <GameBoard
                                boardClassName={this.state.boardClassName}
                                charRows={charRows}
                                classRows={classRows}
                                endY={this.screen.endY}
                                onCellClick={this.onCellClick}
                                rowClass={rowClass}
                                startX={startX}
                                startY={this.screen.startY}
                                useRLE={true}
                            />
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
        if (this.gameState) {
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
        return false;
    }

    /* GameInventory should add a callback which updates the GUI (via props) */
    doInvCmd(cmd) {
        this.game.update(cmd);
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

    /* Called by GameInventory to change the message shown. */
    setInventoryMsg(msg) {
        this.setState({invMsg: msg.invMsg, invMsgStyle: msg.msgStyle});
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
                this.screen.setSelectedCell(null);
                this.setState({selectedCell: null});
                this.screen.setSelectedCell(null);
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
                this.screen.setSelectedCell(cell);
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
                this.screen.setSelectedCell(nextCell);
                this.setState({selectedCell: nextCell});
                this.gameState.numCurrCell = numNextCell;
            }
        }
    }

    showStartScreen() {
        if (!this.state.showStartScreen) {
            $('#start-button').trigger('click');
            this.setState({showStartScreen: true});
        }
    }

    showLoadScreen() {
        if (!this.state.showStartScreen) {
            $('#load-button').trigger('click');
            this.setState({showStartScreen: true});
        }
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
                this.gameConf.sqrPerMonster = RG.ACTOR_SPARSE_SQR; break;
            }
            case 'Medium': {
                this.gameConf.sqrPerMonster = RG.ACTOR_MEDIUM_SQR; break;
            }
            case 'Abundant': {
                this.gameConf.sqrPerMonster = RG.ACTOR_ABUNDANT_SQR; break;
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

    setDebugMode(mode) {
        switch (mode) {
            case 'Off': this.gameConf.debugMode = false; break;
            case 'Arena': this.gameConf.debugMode = 'Arena'; break;
            case 'Battle': this.gameConf.debugMode = 'Battle'; break;
            case 'Creator': this.gameConf.debugMode = 'Creator'; break;
            case 'World': this.gameConf.debugMode = 'World'; break;
            default: console.error('setDebugMode illegal mode ' + mode);
        }
        this.setState({debugMode: mode});
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


        // GameBoard callbacks
        this.onCellClick = this.onCellClick.bind(this);

        this.GUIInventory = this.GUIInventory.bind(this);
        this.GUIMap = this.GUIMap.bind(this);
        this.GUINextTarget = this.GUINextTarget.bind(this);
        this.GUITarget = this.GUITarget.bind(this);
        this.GUIUseItem = this.GUIUseItem.bind(this);

        this.gameToJSON = this.gameToJSON.bind(this);
        this.selectSaveGame = this.selectSaveGame.bind(this);

        // GameInventory callbacks
        this.setInventoryMsg = this.setInventoryMsg.bind(this);
        this.selectEquipTop = this.selectEquipTop.bind(this);
        this.selectItemTop = this.selectItemTop.bind(this);
        this.doInvCmd = this.doInvCmd.bind(this);

        this.toggleEditor = this.toggleEditor.bind(this);

        this.showStartScreen = this.showStartScreen.bind(this);
        this.showLoadScreen = this.showLoadScreen.bind(this);
    }

}

module.exports = BattlesTop;


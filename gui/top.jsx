
/** Top-level component which renders all other components. Keeps also track
 * of the current game state.
 */

/** Contains logic that is not tightly coupled to the GUI.*/
var TopLogic = function() {

    this.describeCell = function(cell, seenCells) {
        var index = seenCells.indexOf(cell);
        if (index !== -1) {
            if (cell.hasActors()) {
                var actor = cell.getProp("actors")[0];
                var msg = "You see " + actor.getName();
                RG.gameMsg(msg);
            }
            else {
                if (cell.hasProp("items")) {
                    var items = cell.getProp("items");
                    if (items.length > 1) {
                        RG.gameMsg("There are several items there");
                        RG.gameMsg("You see " + items[0].getName() + " on top");
                    }
                    else {
                        RG.gameMsg("You see " + items[0].getName() + " lying there.");
                    }
                }
                else if (cell.hasPropType("door")) {
                    RG.gameMsg("You see a door there.");
                }
                else {
                    RG.gameMsg("There is nothing there.");
                }
            }
        }
        else {
            RG.gameWarn("You cannot see there.");
        }
    };


    this.getAdjacentCell = function(player, code) {
        if (RG.KeyMap.inMoveCodeMap(code) || RG.KeyMap.isRest(code)) {
            var x = player.getX();
            var y = player.getY();
            var diffXY = RG.KeyMap.getDiff(code, x, y);
            if (diffXY !== null) {
                return player.getLevel().getMap().getCell(diffXY[0], diffXY[1]);
            }
        }
        return null;
    };

};

/** Top-level Component for the Battles GUI.*/
var BattlesTop = React.createClass({

    logic: new TopLogic(),
    game: null,
    gameSave: new RG.Game.Save(),

    // Holds game-state specific info for GUI (see resetGameState)
    gameState: {},

    viewportPlayerX: 35, // * 2
    viewportPlayerY: 12, // * 2
    viewportX: 35, // * 2
    viewportY: 12, // * 2

    // Simple configuration for the game
    gameConf: {
        cols: 80,
        rows: 60,
        levels : 2,
        playerLevel: "Medium",
        sqrPerMonster: 40,
        sqrPerItem: 100,
        debugMode: false,
        loadedPlayer: null,
        loadedLevel: null,
        playerName: "Player",
    },

    /** Resets the GUI game state.*/
    resetGameState: function() {
        this.gameState = {
            autoTarget: false,
            visibleCells: [],
            useModeEnabled: false,
            isTargeting: false,
        };
    },

    setPlayerName: function(name) {
        this.gameConf.playerName = name;
    },

    forceRender: function() {
        this.setState({render: true, renderFullScreen: true});
    },

    /** Sets the size of the shown map.*/
    setViewSize: function(evt, obj, xOrY) {
        if (obj === "+") {
            if (xOrY === "X") this.viewportX += 5;
            else this.viewportY += 2;
        };
        if (obj === "-") {
            if (xOrY === "X") this.viewportX -= 5;
            else this.viewportY -= 2;
        };
        this.setState({render: true, renderFullScreen: true});
    },

    setViewType: function(type) {
        if (type === "map") {
           this.viewportPlayerX = this.viewportX;
           this.viewportPlayerY = this.viewportY;
           this.viewportX = this.game.getPlayer().getLevel().getMap().cols;
           this.viewportY = this.game.getPlayer().getLevel().getMap().rows;
           this.setState({
               boardClassName: "game-board-map-view",
                mapShown: true,
           });
        }
        else if (type === "player") {
            this.viewportX = this.viewportPlayerX;
            this.viewportY = this.viewportPlayerY;
            this.setState({
                boardClassName: "game-board-player-view",
                mapShown: false,
            });
        }
    },

    getInitialState: function() {
        this.gameSave.setStorage(window.localStorage),
        this.savedPlayerList = this.gameSave.getPlayersAsList();
        this.initGUICommandTable();
        this.createNewGame();
        return {
            boardClassName: "game-board-player-view",
            mapShown: false,
            selectedCell: null,
            selectedItem: null,
            render: true,
            renderFullScreen: false,
        };
    },

    /** Called when "Start" button is clicked to create a new game.*/
    newGame: function(evt) {
        this.createNewGame();
        this.setState({render: true, renderFullScreen: true});
    },

    /** Saves the game position.*/
    saveGame: function() {
        var player = this.game.getPlayer();
        this.gameSave.save(this.game, this.gameConf);
        this.savedPlayerList = this.gameSave.getPlayersAsList();
        RG.gameMsg("Your progress has been saved.");
        this.setState({render: true, renderFullScreen: true});
    },

    /** Loads a saved game.*/
    loadGame: function(name) {
        var restoreObj = this.gameSave.restore(name);
        var player = restoreObj.player;
        if (player !== null) {
            this.gameConf.loadedPlayer = player;
            this.gameConf.loadedLevel = this.gameSave.getDungeonLevel();
            var confObj = this.gameSave.getPlayersAsObj()[name];
            this.restoreConf(confObj);

            this.newGame();
            //this.gameConf.loadedPlayer = null;
            //this.gameConf.loadedLevel = null;
        }
    },

    deleteGame: function(name) {
        this.gameSave.deletePlayer(name);
        this.savedPlayerList = this.gameSave.getPlayersAsList();
        this.setState({render: true, renderFullScreen: true});
    },

    restoreConf: function(obj) {
        var props = ["cols", "rows", "sqrPerMonster", "sqrPerItem", "levels"];
        for (var i = 0; i < props.length; i++) {
            this.gameConf[props[i]] = obj[props[i]];
        }
    },

    /** Creates a new game instance.*/
    createNewGame: function() {
        this.resetGameState();
        var fccGame = new RG.FCCGame();
        if (this.game !== null) {
            delete this.game;
            RG.FACT = new RG.Factory.Base();
        }
        this.game = fccGame.createFCCGame(this.gameConf);
        this.game.setGUICallbacks(this.isGUICommand, this.doGUICommand);
        var player = this.game.getPlayer();
        this.gameState.visibleCells = player.getLevel().exploreCells(player);
        RG.POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this);
        RG.POOL.listenEvent(RG.EVT_DESTROY_ITEM, this);
    },


    selectItemTop: function(item) {
        this.setState({selectedItem: item});
    },

    /** When a cell is clicked, perform a command/show debug info. */
    onCellClick: function(x, y) {
        var cell = this.game.getPlayer().getLevel().getMap().getCell(x, y);
        if (this.gameState.isTargeting) {
            this.game.update({cmd: "missile", target: cell});
            this.gameState.visibleCells = this.game.visibleCells;
            this.setState({render: true, renderFullScreen: false});
            this.gameState.isTargeting = false;
        }
        else {
            this.logic.describeCell(cell, this.gameState.visibleCells);
            this.setState({render: true, renderFullScreen: true});
        }
    },


    /** When listening events, component gets notification via this
     * method.*/
    notify: function(evtName, obj) {
        if (evtName === RG.EVT_LEVEL_CHANGED) {
            var actor = obj.actor;
            if (actor.isPlayer()) {
                this.setState({render: true, renderFullScreen: true});
            }
        }
    },

    componentDidMount: function() {
      $(document.body).on('keydown', this.handleKeyDown);
      $("#start-button").trigger("click");
    },

    componentWillUnMount: function() {
      $(document.body).off('keydown', this.handleKeyDown);
    },

    /** Listens for player key presses and handles them.*/
    handleKeyDown: function(evt) {
        this.game.update({evt: evt});
        this.gameState.visibleCells = this.game.visibleCells;
        if (this.game.isGameOver()) {
            this.setState({render: true, renderFullScreen: true});
        }
        else {
            this.setState({render: true, renderFullScreen: false});
        }
    },

    render: function() {
        var map = this.game.getVisibleMap();
        var player = this.game.getPlayer();
        var message = this.game.getMessages();
        var fullScreen = this.state.renderFullScreen;

        return (
            <div id="main-div" className="container main-div">

                <GameStartScreen newGame={this.newGame}
                    setPlayerName={this.setPlayerName}
                    savedPlayerList={this.savedPlayerList}
                    loadGame={this.loadGame}
                    deleteGame={this.deleteGame}
                    setGameLength={this.setGameLength}
                    setLoot={this.setLoot}
                    setMonsters={this.setMonsters}
                    setLevelSize={this.setLevelSize}
                    setPlayerLevel={this.setPlayerLevel}
                    setDebugMode={this.setDebugMode}
                />
                <GameHelpScreen />

                <GameInventory selectItemTop={this.selectItemTop} 
                    forceRender={this.forceRender} player={player}/>

                <div className="row game-panel-div">
                    <div className="col-md-2">
                        <GamePanel  setViewSize={this.setViewSize} saveGame={this.saveGame}/>
                    </div>
                    <div className="col-md-10 game-messages-div">
                        <GameMessages message={message}
                            visibleCells={this.gameState.visibleCells}
                        />
                    </div>
                </div>
                <div className="row main-contents-div">
                    <div className="text-left col-md-2 game-stats-div">
                        <GameStats player={player} setViewType={this.setViewType}
                            selectedItem={this.state.selectedItem}
                            selectedCell={this.state.selectedCell}
                        />
                    </div>
                    <div className="col-md-10 game-board-div">
                        <GameBoard player={player} map={map}
                            visibleCells={this.gameState.visibleCells}
                            onCellClick={this.onCellClick}
                            renderFullScreen={fullScreen}
                            viewportX={this.viewportX}
                            viewportY={this.viewportY}
                            boardClassName={this.state.boardClassName}
                            mapShown={this.mapShown}
                            selectedCell={this.state.selectedCell}
                        />
                    </div>
                </div>

            </div>
        );
    },


    //-------------------------------------------------------------
    // GUI-RELATED COMMANDS
    //-------------------------------------------------------------

    /** GUI command keybindings are specified here. */
    initGUICommandTable: function() {
        this.guiCommands = {};
        this.guiCommands[ROT.VK_I] = this.GUIInventory;
        this.guiCommands[ROT.VK_M] = this.GUIMap;
        this.guiCommands[ROT.VK_N] = this.GUINextTarget;
        this.guiCommands[ROT.VK_T] = this.GUITarget;
        this.guiCommands[ROT.VK_U] = this.GUIUseItem;

    },

    isGUICommand: function(code) {
        if (this.gameState.autoTarget && code === ROT.VK_T) {
            return false;
        }
        if (this.gameState.useModeEnabled) {
            return true;
        }
        else {
            return this.guiCommands.hasOwnProperty(code);
        }
        return false;
    },

    /** Calls a GUI command corresponding to the code.*/
    doGUICommand: function(code) {
         if (this.gameState.useModeEnabled) {
            this.gameState.useModeEnabled = false;
            if (this.state.selectedItem !== null) {

                var player = this.game.getPlayer();
                var cell = this.logic.getAdjacentCell(player, code);
                if (cell !== null) {
                    this.game.update({
                        cmd: "use", target: cell, item: this.state.selectedItem
                    });
                    this.setState({selectedItem: null});
                }
                else {
                    RG.gameWarn("There are no targets there.");
                }
            }
            else {
                RG.gameWarn("No item was selected for use!");
            }
        }
        else if (this.guiCommands.hasOwnProperty(code)) {
            this.guiCommands[code]();
        }
        else {
            console.error("Unknown keycode for GUI command.");
        }
    },

    /** Brings up the inventory.*/
    GUIInventory: function() {
        $("#inventory-button").trigger("click");
    },

    GUIMap: function() {
        $("#map-player-button").trigger("click");
    },

    GUITarget: function() {
        if (this.gameState.isTargeting) {
            if (this.state.selectedCell !== null) {
                var cell =this.state.selectedCell;
                this.gameState.autoTarget = true;
                this.game.update({cmd: "missile", target: cell});
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
                var cell = this.gameState.enemyCells[0];
                this.setState({selectedCell: cell});
                console.log("GUITarget found selected cell");
            }
        }
        this.setState({render: true});
    },

    GUIUseItem: function() {
        if (!this.gameState.useModeEnabled) {
            this.gameState.useModeEnabled = true;
            if (this.state.selectedItem === null) 
                $("#inventory-button").trigger("click");
            RG.gameMsg("Select direction for using the item.");
        }
    },

    /** Selects next target when 'n' is pressed.*/
    GUINextTarget: function() {
        if (this.gameState.isTargeting) {
            var numCells = this.gameState.enemyCells.length;
            if (numCells > 0) {
                var numNextCell = this.gameState.numCurrCell + 1;
                if (numNextCell >= numCells) {
                    numNextCell = 0;
                }

                var nextCell = this.gameState.enemyCells[numNextCell];
                this.setState({selectedCell: nextCell});
                this.gameState.numCurrCell = numNextCell;
            }
        }
    },

    //---------------------------------------------------------------------------
    // GAME CONFIG RELATED FUNCTIONS
    //---------------------------------------------------------------------------

    setLoot: function(lootType) {
        switch(lootType) {
            case "Sparse": this.gameConf.sqrPerItem = 200; break;
            case "Medium": this.gameConf.sqrPerItem = 120; break;
            case "Abundant": this.gameConf.sqrPerItem = 50; break;
        }
    },

    setMonsters: function(monstType) {
        switch(monstType) {
            case "Sparse": this.gameConf.sqrPerMonster = 200; break;
            case "Medium": this.gameConf.sqrPerMonster= 120; break;
            case "Abundant": this.gameConf.sqrPerMonster = 50; break;
        }
    },

    setLevelSize: function(levelSize) {
        switch(levelSize) {
            case "Small": this.gameConf.cols = 40; this.gameConf.rows = 20; break;
            case "Medium": this.gameConf.cols = 60; this.gameConf.rows = 30; break;
            case "Large": this.gameConf.cols = 80; this.gameConf.rows = 40; break;
            case "Huge": this.gameConf.cols = 140; this.gameConf.rows = 60; break;
        }
    },

    setPlayerLevel: function(level) {
        this.gameConf.playerLevel = level;
    },

    setGameLength: function(length) {
        switch(length) {
            case "Short": this.gameConf.levels = 5; break;
            case "Medium": this.gameConf.levels = 10; break;
            case "Long": this.gameConf.levels = 15; break;
            case "Epic": this.gameConf.levels = 30; break;
        }
    },

    setDebugMode: function(mode) {
        switch(mode) {
            case "Off": this.gameConf.debugMode = false; break;
            case "Arena": this.gameConf.debugMode = "Arena"; break;
            case "Battle": this.gameConf.debugMode = "Battle"; break;
        }
    },

});

window.BattlesTop = BattlesTop;


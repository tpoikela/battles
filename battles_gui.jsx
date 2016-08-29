
// Set to 1 for some debug information
var $DEBUG = 0;

// Titles for the buttons
var titles = {
    Next: "You can advance game by one state by pressing 'Next'.",
    Clear: "Clears the game board completely.",
    Random: "Generate a new starting pattern for the board.",
    Pause: "Pauses the game. You can push 'Next' or 'Start' for a paused game.",
};

var Actor = RG.RogueActor;

/** Top-level component which renders all other components. Keeps also track
 * of the current game state.
 */
var RoguelikeTop = React.createClass({

    /** Styles to change the cell size.*/
    cellSize: {
        small: {
            "font-size": "16px",
            "margin-bottom": "-7px",
        },

        medium: {
            "font-size": "20px",
            "margin-bottom": "-9px",
        },

        large: {
            "font-size": "24px",
            "margin-bottom": "-11px",
        },

    },

    nextActor : null,
    visibleCells: [],
    game: null,
    isTargeting: false,

    viewportCharX: 35, // * 2
    viewportCharY: 12, // * 2
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
           this.viewportCharX = this.viewportX;
           this.viewportCharY = this.viewportY;
           this.viewportX = this.game.getPlayer().getLevel().getMap().cols;
           this.viewportY = this.game.getPlayer().getLevel().getMap().rows;
           this.setState({
               boardClassName: "game-board-map-view",
                mapShown: true,
           });
        }
        else if (type === "char") {
            this.viewportX = this.viewportCharX;
            this.viewportY = this.viewportCharY;
            this.setState({
                boardClassName: "game-board-char-view",
                mapShown: false,
            });
        }
    },

    getInitialState: function() {
        this.initGUICommandTable();
        this.createNewGame();
        RG.POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this);
        return {
            render: true,
            renderFullScreen: false,
            boardClassName: "game-board-char-view",
            mapShown: false,
        };
    },

    createNewGame: function() {
        var fccGame = new RG.FCCGame();
        if (this.game !== null) {
            delete this.game;
            RG.POOL = new RG.EventPool();
            RG.FACT = new RG.Factory.Base();
        }
        this.game = fccGame.createFCCGame(this.gameConf);
        this.game.doGUICommand = this.doGUICommand;
        this.game.isGUICommand = this.isGUICommand;
        var player = this.game.getPlayer();
        this.visibleCells = player.getLevel().exploreCells(player);
    },

    /** When a cell is clicked, shows some debug info. */
    onCellClick: function(evt, x, y, cell) {
        if (this.isTargeting) {
            var player = this.game.getPlayer();
            var invEq = player.getInvEq();
            var missile = invEq.unequipAndGetItem("missile", 1);

            if (!RG.isNullOrUndef([missile])) {
                var mComp = new RG.Component.Missile(player);
                mComp.setTargetXY(x, y);
                mComp.setDamage(RG.getMissileDamage(player, missile));
                mComp.setAttack(RG.getMissileAttack(player, missile));
                mComp.setRange(missile.getAttackRange());
                missile.add("Missile", mComp);
                this.game.update({cmd: "missile"});
                this.visibleCells = this.game.visibleCells;
                this.setState({render: true, renderFullScreen: false});
                debug("<Top> Ranged attack to x: " + x + ", y:" + y);
            }
            else {
                RG.gameWarn("No missile equipped. Cannot shoot.");
                debug("<Top> No missile equipped. No ranged to x: " + x + ", y:" + y);
            }
            this.isTargeting = false;
        }
        else {
            debug("<Top> onCellClick with x: " + x + " y: " + y + " cell: " + cell);
        }
    },

    /** Called when "Start" button is clicked to create a new game.*/
    newGame: function(evt) {
        this.createNewGame();
        this.setState({render: true, renderFullScreen: true});
    },

    notify: function(evtName, obj) {
        var actor = obj.actor;
        if (actor.isPlayer()) {
            this.setState({render: true, renderFullScreen: true});
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
        this.visibleCells = this.game.visibleCells;
        this.setState({render: true, renderFullScreen: false});
    },

    render: function() {
        var map = this.game.getVisibleMap();
        var player = this.game.getPlayer();
        var message = this.game.getMessages();
        var fullScreen = this.state.renderFullScreen;
        //var numTurns = this.state.numTurns;
        return (
            <div id="main-div" className="container main-div">

                <GameStartScreen newGame={this.newGame}
                    setGameLength={this.setGameLength}
                    setLoot={this.setLoot}
                    setMonsters={this.setMonsters}
                    setLevelSize={this.setLevelSize}
                    setPlayerLevel={this.setPlayerLevel}
                    setDebugMode={this.setDebugMode}
                />
                <GameHelpScreen />

                <GameInventory forceRender={this.forceRender} player={player}/>

                <div className="row">
                    <div className="col-md-2">
                        <GamePanel  setViewSize={this.setViewSize}/>
                    </div>
                    <div className="col-md-10">
                        <GameMessages message={message}/>
                    </div>
                </div>
                <div className="row">
                    <div className="text-left col-md-2">
                        <GameStats player={player} setViewType={this.setViewType}/>
                        <ViewZoom player={player} map={map}/>
                    </div>
                    <div className="col-md-10">
                        <GameBoard player={player} map={map}
                            visibleCells={this.visibleCells}
                            onCellClick={this.onCellClick}
                            renderFullScreen={fullScreen}
                            viewportX={this.viewportX}
                            viewportY={this.viewportY}
                            boardClassName={this.state.boardClassName}
                            mapShown={this.mapShown}
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
        this.guiCommands[ROT.VK_T] = this.GUITarget;
    },

    isGUICommand: function(code) {
        if (this.isTargeting) {

        }
        else {
            return this.guiCommands.hasOwnProperty(code);
        }
        return false;
    },

    /** Calls a GUI command corresponding to the code.*/
    doGUICommand: function(code) {
        if (this.guiCommands.hasOwnProperty(code)) {
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
        $("#map-char-button").trigger("click");
    },

    GUITarget: function() {
        if (this.isTargeting) {
            this.isTargeting = false;
            console.log("Targeting cancelled...");
        }
        else {
            console.log("Targeting now...");
            RG.gameWarn("Click on a square to attack with missile weapon.");
            this.isTargeting = true;
        }
        this.setState({render: true});
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
        }
    },

});

var GameHelpScreen = React.createClass({

    render: function() {
        return (
            <div className="modal fade" role="dialog" id="gameHelpModal" tabIndex="-1" role="dialog" aria-labelledby="game-help-modal-label" aria-hidden="true">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                            <h4 className="modal-title" id="game-help-modal-label">{RG.gameTitle}</h4>
                        </div>

                        <div className="modal-body row">
                            <div className="col-md-6">
                                <p>To move around, use:</p>
                                <table id="mov-buttons-table">
                                    <theader></theader>
                                    <tbody>
                                        <tr><td>q</td><td>w</td><td>e</td></tr>
                                        <tr><td>a</td><td>s</td><td>d</td></tr>
                                        <tr><td>z</td><td>x</td><td>c</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="col-md-6">
                                <p>Use m to toggle the map/char view.</p>
                                <p>To fire a missile, press "t" and click on a square.</p>
                                <p>To view inventory, press "i"</p>
                                <p>To pick up an item, press "."</p>
                                <p>To use stairs, press ","</p>
                            </div>
                        </div>

                        <div className="modal-footer row">
                            <div className="col-md-6">
                                <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        );
    }

});

/** Component for the game startup screen Prints game title and gives some
 * customisation options for the game.
 */
var GameStartScreen = React.createClass({

    render: function() {
        var setLoot = this.props.setLoot;
        var setMonsters = this.props.setMonsters;
        var setLevelSize = this.props.setLevelSize;
        var setPlayerLevel = this.props.setPlayerLevel;
        var setGameLength = this.props.setGameLength;
        var setDebugMode = this.props.setDebugMode;

        var newGame = this.props.newGame;
        return (
            <div className="modal fade" role="dialog" id="gameStartModal" tabIndex="-1" role="dialog" aria-labelledby="game-start-modal-label" aria-hidden="true">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                            <h4 className="modal-title" id="game-start-modal-label">{RG.gameTitle}</h4>
                        </div>

                        <div className="modal-body row">
                            <div id="prologue-box" className="col-md-6">

                                <p>
                                    Welcome to the wintry realms!
                                    Winds are ever-blowing. Blowing off the
                                    glaciers.
                                    Are you ready to face the challenges of the
                                    icy north? Hunger, coldness, ravenous
                                    beasts, glacial chasms and forthcoming
                                    eternal winter are waiting for you in the
                                    darkness.
                                </p>

                                <p>
                                    You have come a long way from your homelands seeking
                                    the thrill of the adventure. Now, you must fight freezing 
                                    battles in
                                    the north against hordes of winter demons
                                    and blizzard beasts. Will you bring back the peace
                                    to the grim and frostbitten kingdoms. Or will you 
                                    bring the Winter of Ages upon its lands, reigning 
                                    your kingdom cold for all eternity? Or will you perish 
                                    nameless and forgotten on the icy wastes?
                                </p>

                        </div>

                            <div id="game-options-box" className="col-md-6">
                                <p>Customisation</p>
                                <RadioButtons buttons={["Short", "Medium", "Long", "Epic"]} callback={setGameLength} titleName="Game length" />
                                <RadioButtons buttons={["Sparse", "Medium", "Abundant"]} callback={setLoot} titleName="Loot" />
                                <RadioButtons buttons={["Sparse", "Medium", "Abundant"]} callback={setMonsters} titleName="Monsters" />
                                <RadioButtons buttons={["Small", "Medium", "Large", "Huge"]} callback={setLevelSize} titleName="Levels" />
                                <RadioButtons buttons={["Weak", "Medium", "Strong", "Inhuman"]} callback={setPlayerLevel} titleName="Player" />
                                <RadioButtons buttons={["Off", "Arena"]} callback={setDebugMode} titleName="Debug" />
                            </div>
                        </div>

                        <div className="modal-footer row">
                            <div className="col-md-6">
                                <button type="button" onClick={newGame} className="btn btn-secondary" data-dismiss="modal">Embark!</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

});

/** Can be used to create radio buttons for different types of selections.
 * Callback must be given, and the button name is passed into this callback.*/
var RadioButtons = React.createClass({

    getInitialState: function() {
        return {
            activeButton: ""
        };
    },

    onButtonClick: function(name) {
        this.props.callback(name);
        this.setState({activeButton: name});
    },

    render: function() {
        var onClick = this.onButtonClick;
        var buttons = this.props.buttons;
        var that = this; // For map

        // Generate buttons using map
        var buttonList = buttons.map(function(name, index) {
            var classes = "btn btn-primary";
            if (that.state.activeButton === name) classes = "btn btn-success active";
            return (
                <button onClick={that.onButtonClick.bind(that, name)} className={classes} key={index}>{name}</button>
            );
        });

        return (
            <div className="btn-group">
                <label className="select-label btn text-primary">{this.props.titleName}</label>
                {buttonList}
            </div>
        );
    }

});

/** This component contains non-game instance specific controls like starting
 * new game and changing screen size.*/
var GamePanel = React.createClass({

    setViewSizeXPlus: function(evt) {
        this.props.setViewSize(evt, "+", "X");
    },

    setViewSizeXNeg: function(evt) {
        this.props.setViewSize(evt, "-", "X");
    },

    setViewSizeYPlus: function(evt) {
        this.props.setViewSize(evt, "+", "Y");
    },

    setViewSizeYNeg: function(evt) {
        this.props.setViewSize(evt, "-", "Y");
    },

    render: function() {
        return (
            <div>
                <button id="start-button" className="btn btn-info" data-toggle="modal" data-target="#gameStartModal">Start</button>
                <button id="help-button" className="btn btn-info" data-toggle="modal" data-target="#gameHelpModal">Help</button>
                <button onClick={this.setViewSizeXPlus}>+X</button>
                <button onClick={this.setViewSizeXNeg}>-X</button>
                <button onClick={this.setViewSizeYPlus}>+Y</button>
                <button onClick={this.setViewSizeYNeg}>-Y</button>
            </div>
        );
    }

});

/** Component for displaying in-game messages.*/
var GameMessages = React.createClass({

    styleToClassName: {
        prim: "text-primary",
        info: "text-info",
        warn: "text-warning",
        danger: "text-danger",
        success: "text-success",
    },

    render: function() {
        var message = this.props.message;
        var styles = this.styleToClassName;

        var msgList = message.map( function(val, index) {
            var className = styles[val.style];
            return (<span key={index} className={className}>{val.msg}.</span>);
        });

        return (
            <div className="game-messages">{msgList}</div>
        );
    },

});

/** Component renders the player inventory.*/
var GameInventory = React.createClass({

    selectedItem: null,
    equipSelected: null,

    getInitialState: function() {
        return {
            invMsg: "",
            msgStyle: ""
        };
    },

    /** Called when "Drop" is clicked. Drops item to the ground.*/
    dropItem: function(evt) {
        if (this.selectedItem !== null) {
            var invEq = this.props.player.getInvEq();
            if (invEq.dropItem(this.selectedItem)) {
                this.setState({invMsg:  "Item dropped!",
                    msgStyle: "text-success"});
            }

        }
        else {
            this.setState({invMsg:  "No item selected!",
                msgStyle: "text-danger"});
        }
    },

    /** When "Equip" is clicked, equips the selected item, if any.*/
    equipItem: function(evt) {
        // Get item somehow
        var item = this.selectedItem;
        if (item !== null) {
            var invEq = this.props.player.getInvEq();

            if (item.getType() === "missile") {
                if (invEq.equipNItems(item, item.count)) {
                    this.setState({invMsg:  "Equipping succeeded!",
                        msgStyle: "text-success"});
                }
            }
            else if (invEq.equipItem(item)) {
                this.setState({invMsg:  "Equipping succeeded!",
                    msgStyle: "text-success"});
            }
        }
        else {
            this.setState({invMsg:  "No item selected!",
                msgStyle: "text-danger"});
        }
    },

    /** Called when "Remve" button is clicked to remove an equipped item.*/
    unequipItem: function(evt) {
        if (this.equipSelected !== null) {
            var invEq = this.props.player.getInvEq();
            var name = this.equipSelected.slotName;
            if (name === "missile") {
                var eqItem = invEq.getEquipment().getItem("missile");
                var ok = false;

                if (eqItem !== null) {
                    if (invEq.unequipItem(name, eqItem.count)) {
                        this.setState({invMsg: "Removing succeeded!",
                            msgStyle: "text-success"});
                        ok = true;
                    }
                }

                if (!ok) {
                    this.setState({invMsg: 
                        "Failed to remove the item from slot '" + name + "'!",
                        msgStyle: "text-danger"});
                }
            }
            else if (invEq.unequipItem(name)) {
                this.setState({invMsg:  "Removing succeeded!",
                    msgStyle: "text-success"});
            }
            else {
                this.setState({invMsg: 
                    "Failed to remove the item from slot '" + name + "'!",
                    msgStyle: "text-danger"});
            }
        }
        else {
            this.setState({invMsg:  "No equipment selected!",
                msgStyle: "text-danger"});
        }
    },

    useItem: function(evt) {
        if (this.selectedItem !== null) {
            if (this.selectedItem.hasOwnProperty("useItem")) {
                var invEq = this.props.player.getInvEq();
                var target = this.props.player;
                if (invEq.useItem(this.selectedItem, {target: target})) {
                    var itemName = this.selectedItem.getName();
                    this.setState({invMsg: "You used the " + itemName + ".",
                        msgStyle: "text-success"});
                    this.props.forceRender();
                }
                else {
                    this.setState({invMsg: "You failed to use the " + itemName + ".",
                        msgStyle: "text-danger"});
                }
            }
            else {
                this.setState({invMsg:  "Cannot use the chosen item!",
                    msgStyle: "text-danger"});
            }
        }
        else {
            this.setState({invMsg:  "You must choose item to use!",
                msgStyle: "text-danger"});
        }

    },

    setSelectedItem: function(item) {
        this.selectedItem = item;
        var msg = "Inventory Selected: " + item.toString();
        this.setState({invMsg: msg, msgStyle: "text-info"});
    },

    setEquipSelected: function(selection) {
        this.equipSelected = selection;
        var msg = "Equipment Selected: " + selection.item.toString();
        this.setState({invMsg: msg, msgStyle: "text-info"});
    },

    render: function() {
        var player = this.props.player;
        var inv = player.getInvEq().getInventory();
        var eq = player.getInvEq().getEquipment();
        return (
            <div className="modal fade" role="dialog" id="inventoryModal" tabIndex="-1" role="dialog" aria-labelledby="inventory-modal-label" aria-hidden="true">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                            <h4 className="modal-title" id="inventory-modal-label">Inventory</h4>
                        </div>
                        <div className="modal-body row">
                            <div id="items-box" className="col-md-6">
                                <GameItems setSelectedItem={this.setSelectedItem} inv={inv} />
                            </div>
                            <div id="equipment-box" className="col-md-6">
                                <GameEquipment setEquipSelected={this.setEquipSelected} eq={eq} />
                            </div>
                        </div>
                        <div className="modal-footer row">
                            <div className="col-md-6">
                                <p className={this.state.msgStyle}>{this.state.invMsg}</p>
                            </div>
                            <div className="col-md-6">
                                <button type="button" className="btn btn-secondary" onClick={this.dropItem}>Drop</button>
                                <button type="button" className="btn btn-secondary" onClick={this.equipItem}>Equip</button>
                                <button type="button" className="btn btn-secondary" onClick={this.unequipItem}>Remove</button>
                                <button type="button" className="btn btn-secondary" onClick={this.useItem}>Use</button>
                                <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

});

/** Component which shows the inventory items.*/
var GameItems = React.createClass({

    render: function() {
        var inv = this.props.inv;
        var item = inv.first();
        var items = [];
        var setSelectedItem = this.props.setSelectedItem;

        while (item !== null && typeof item !== "undefined") {
            var type = item.getType();
            var we = item.getWeight();
            items.push(<GameItemSlot setSelectedItem={setSelectedItem} item={item} />);
            item = inv.next();
        }
        return (
            <div>
                <p>Items</p>
                {items}
            </div>
        );
    }

});

/** Component stores one item, renders its description and selects it if
 * clicked.*/
var GameItemSlot = React.createClass({

    setSelectedItem: function() {
        this.props.setSelectedItem(this.props.item);
    },

    render: function() {
        var item = this.props.item;
        var itemString = item.toString();
        return (
            <div className="inv-item-slot" onClick={this.setSelectedItem}>{itemString}</div>
        );
    }

});

/** Component which shows the equipment of the player.*/
var GameEquipment = React.createClass({

    render: function() {
        var eq = this.props.eq;
        var slots = eq.getSlotTypes();
        var equipped = [];
        var setEquip = this.props.setEquipSelected;

        // Creates the equipment slots based on whether they have items or not.
        for (var i = 0; i < slots.length; i++) {
            var item = eq.getEquipped(slots[i]);
            var items = [];
            if (item !== null) items.push(item);

            if (items.length > 0) {
                for (var j = 0; j < items.length; j++) {
                    var key = i + "," + j;
                    equipped.push(
                        <GameEquipSlot setEquipSelected={setEquip} key={key} slotName={slots[i]} slotNumber={j} item={items[j]} />
                    );
                }
            }
            else {
                equipped.push(
                    <GameEquipSlot setEquipSelected={setEquip} slotName={slots[i]} slotNumber={j} item={null} />
                );
            }
        }

        return (
            <div>
                <p>Equipment</p>
                {equipped}
            </div>
        );
    }

});

/** Component for one equipment slot.*/
var GameEquipSlot = React.createClass({

    setEquipSelected: function(evt) {
        if (this.props.item !== null) {
            var selection = {
                slotName: this.props.slotName,
                slotNumber: this.props.slotNumber,
                item: this.props.item
            };
            this.props.setEquipSelected(selection);
        }
    },

    render: function() {
        var slotName = this.props.slotName;
        var item = this.props.item;
        var msg = "Empty";
        if (item !== null) msg = item.toString();
        return (
            <div onClick={this.setEquipSelected} className="inv-equip-slot">{slotName} {msg}</div>
        );
    }

});

/** Component for displaying character stats.*/
var GameStats = React.createClass({

    getInitialState: function() {
        return {
            mapShown: false,
        };
    },

    changeMapView: function(evt) {
        if (this.state.mapShown) {
            $("#map-char-button").text("Map View");
            this.setState({mapShown: false});
            this.props.setViewType("char");
        }
        else {
            $("#map-char-button").text("Char View");
            this.setState({mapShown: true});
            this.props.setViewType("map");
        }
    },

    render: function() {

        var player = this.props.player;
        var eq = player.getInvEq().getEquipment();
        var dungeonLevel = player.getLevel().getLevelNumber();

        var eqAtt = player.getEquipAttack();
        var eqDef = player.getEquipDefense();
        var eqProt = player.getEquipProtection();

        var eqStr = eq.getStrength();
        var eqAgi = eq.getAgility();
        var eqAcc = eq.getAccuracy();
        var eqWil = eq.getWillpower();

        var stats = {
            HP: player.get("Health").getHP() + "/" + player.get("Health").getMaxHP(),

            Att: player.get("Combat").getAttack() + eqAtt,
            Def: player.get("Combat").getDefense() + eqDef,
            Pro: player.get("Combat").getProtection() + eqProt,

            Str: player.get("Stats").getStrength() + eqStr,
            Agi: player.get("Stats").getAgility() + eqAgi,
            Acc: player.get("Stats").getAccuracy() + eqAcc,
            Wil: player.get("Stats").getWillpower() + eqWil,

            Speed: player.get("Stats").getSpeed(),
            XP: player.get("Experience").getExp(),
            XL: player.get("Experience").getExpLevel(),
            DL: dungeonLevel,
        };

        if (player.has("Hunger")) {
            stats.E = player.get("Hunger").getEnergy();
        }

        var moveStatus = "Walking";
        var moveClassName = "text-info";
        if (player.getBrain().isRunModeEnabled()) {
            moveStatus = "Running";
            moveClassName = "text-danger";
        }

        var statsHTML = [];
        var index = 0;
        for (var key in stats) {
            var val = stats[key];
            statsHTML.push(<li key={index}>{key}: {val}</li>);
            ++index;
        }

        return (
            <div className="game-stats">
                <ul className="game-stats-list">{statsHTML}</ul>
                <p className={moveClassName}>{moveStatus}</p>
                <button id="inventory-button" className="btn btn-info" data-toggle="modal" data-target="#inventoryModal">Inventory</button>
                <button id="map-char-button" className="btn btn-info" onClick={this.changeMapView}>Map View</button>
            </div>
        );
    }

});

/** Shows a zoom of the character surroundings in map mode.*/
var ViewZoom = React.createClass({

    render: function() {
        return (
            <div>

            </div>
        );
    }

});

/** Object which manages the shown part of the level.*/
var Viewport = function(viewportX, viewportY, map) {

    // Size of the viewport, feel free to adjust
    this.viewportX = viewportX;
    this.viewportY = viewportY;

    /** Returns an object containing all cells in viewport, and viewport
     * coordinates.
     */
    this.getCellsInViewPort = function(x, y, map) {
        var startX = x - this.viewportX;
        var endX = x + this.viewportX;
        var startY = y - this.viewportY;
        var endY = y + this.viewportY;
        var maxX = map.cols - 1;
        var maxY = map.rows - 1;

        // If player is too close to level edge, viewport must be expanded from
        // the other side.
        var leftStartX = this.viewportX - x;
        if (leftStartX > 0) {
            endX += leftStartX;
        }
        else {
            var leftEndX = x + this.viewportX - maxX;
            if (leftEndX > 0) startX -= leftEndX;
        }

        var leftStartY = this.viewportY - y;
        if (leftStartY > 0) {
            endY += leftStartY;
        }
        else {
            var leftEndY = y + this.viewportY - maxY;
            if (leftEndY > 0) startY -= leftEndY;
        }

        // Some sanity checks for level edges
        if (startX < 0) startX = 0;
        if (startY < 0) startY = 0;
        if (endX > map.cols-1) endX = map.cols - 1;
        if (endY > map.rows-1) endY = map.rows - 1;

        for (var yy = startY; yy <= endY; yy++) {
            this[yy] = [];
            for (var xx = startX; xx <= endX; xx++) {
                this[yy].push(map.getCell(xx, yy));
            }
        }

        this.startX = startX;
        this.endX = endX;
        this.startY = startY;
        this.endY = endY;
        this.rows = map.rows;
    },

    this.getCellRow = function(y) {return this[y];};

};

/** Component which renders the game rows. {{{2 */
var GameBoard = React.createClass({

    tableClasses: "",

    viewportX: 35, // * 2
    viewportY: 12, // * 2


    render: function() {

        var mapShown = this.props.mapShown;
        this.viewportX = this.props.viewportX;
        this.viewportY = this.props.viewportY;

        var player = this.props.player;
        var playX = player.getX();
        var playY = player.getY();
        var map = this.props.map;

        var shownCells = map;

        if (!mapShown) {
            var shownCells = new Viewport(this.viewportX, this.viewportY, map);
            shownCells.getCellsInViewPort(playX, playY, map);
        }

        var onCellClick = this.props.onCellClick;
        var visibleCells = this.props.visibleCells;
        var renderFullScreen = this.props.renderFullScreen;

        var rows = [];

        for (var i = shownCells.startY; i <= shownCells.endY; ++i) {
            var rowCellData = shownCells.getCellRow(i);
            rows.push(<GameRow
                y={i} onCellClick={onCellClick} renderFullScreen={renderFullScreen}
                visibleCells={visibleCells} rowCellData={rowCellData} key={i}
                    mapShown={mapShown}/>);
        }

        return (
            <div id="game-board" className={this.props.boardClassName}>
                <div id="game-table" className={this.tableClasses}>
                    {rows}
                </div>
            </div>
        );
    }

}); //}}} Gameboard

/** A row component which holds a number of cells. {{{2 */
var GameRow = React.createClass({

    render: function() {
        var renderFullScreen = this.props.renderFullScreen;
        var onCellClick = this.props.onCellClick;
        var y = this.props.y;
        var visibleCells = this.props.visibleCells;
        var mapShown = this.props.mapShown;
        var rowClass = "cell-row-div-char-view";
        if (mapShown) rowClass = "cell-row-div-map-view";

        var rowCells = this.props.rowCellData.map( function(cell, index) {
            var cellIndex = visibleCells.indexOf(cell);
            var visibleToPlayer = cellIndex < 0 ? false: true;
            var cellClass = RG.getClassName(cell, visibleToPlayer);
            var cellChar  = RG.getChar(cell, visibleToPlayer);
            var cellX = cell.getX();
            var render = true;

            if (renderFullScreen) render = true;
            if (mapShown) render = visibleToPlayer;

            return (<GameCell cell={cell} cellChar={cellChar} className={cellClass} x={cellX}
                    y={y} render={render} onCellClick={onCellClick} key={index}/>);
        });


        return (
            <div className={rowClass}>
                {rowCells}
            </div>
        );
    }

}); // }}} GameRow

/** This components represents one cell in game of life. {{{2 */
var GameCell = React.createClass({

    shouldComponentUpdate: function(nextProps, nextState) {
        return nextProps.render;
    },

    onCellClick: function(evt) {
        var x = this.props.x;
        var y = this.props.y;
        debug("<GameCell> onCellClick x: " + x + " y: " + y);
        this.props.onCellClick(evt, x, y, this.props.cell);
    },

    render: function() {
        var className = this.props.className;
        return (
            <span className={className} onClick={this.onCellClick}>
                {this.props.cellChar}
            </span>
        );
    }

}); // }}} GameCell


ReactDOM.render(
    <RoguelikeTop />,
    document.getElementById("mount-point")
);


function debug(msg) {
    if ($DEBUG) {
        console.log("DEBUG:" + msg);
    }
}


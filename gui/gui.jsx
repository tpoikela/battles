
// Set to 1 for some debug information
var $DEBUG = 0;

function debug(msg) {
    if ($DEBUG) {
        console.log("DEBUG:" + msg);
    }
}

var GUI = {};

/** Object which manages the shown part of the level.*/
GUI.Viewport = function(viewportX, viewportY, map) {

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

//---------------------------------------------------------------------------
// REACT COMPONENTS
//---------------------------------------------------------------------------

/** A row component which holds a number of cells. {{{2 */
var GameRow = React.createClass({

    onCellClick: function(x, y, cell) {
        this.props.onCellClick(x, y, cell);
    },

    render: function() {
        var y = this.props.y;
        var visibleCells = this.props.visibleCells;
        var mapShown = this.props.mapShown;
        var rowClass = "cell-row-div-player-view";
        if (mapShown) rowClass = "cell-row-div-map-view";

        var that = this;
        var rowCells = this.props.rowCellData.map( function(cell, index) {
            var cellIndex = visibleCells.indexOf(cell);
            var visibleToPlayer = cellIndex < 0 ? false: true;
            var cellClass = RG.getClassName(cell, visibleToPlayer);
            var cellChar  = RG.getChar(cell, visibleToPlayer);
            var cellX = cell.getX();

            return (
                <span key={index}
                    className={cellClass}
                    onClick={that.onCellClick.bind(that, cellX, y, cell)}>
                    {cellChar}
                </span>
            );
        });


        return (
            <div className={rowClass}>
                {rowCells}
            </div>
        );
    }

}); // }}} GameRow
window.GameRow = GameRow;

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
            var shownCells = new GUI.Viewport(this.viewportX, this.viewportY, map);
            shownCells.getCellsInViewPort(playX, playY, map);
        }

        var onCellClick = this.props.onCellClick;
        var visibleCells = this.props.visibleCells;
        var renderFullScreen = this.props.renderFullScreen;

        var rowsHTML = [];

        // Build the separate cell rows
        for (var y = shownCells.startY; y <= shownCells.endY; ++y) {
            var rowCellData = shownCells.getCellRow(y);
            rowsHTML.push(
                <GameRow
                    y={y} onCellClick={onCellClick}
                    visibleCells={visibleCells} 
                    rowCellData={rowCellData} key={y}
                    mapShown={mapShown}
                />);
        }

        // Finally return the full rendered board
        return (
            <div id="game-board" className={this.props.boardClassName}>
                <div id="game-table" className={this.tableClasses}>
                    {rowsHTML}
                </div>
            </div>
        );
    }

}); //}}} Gameboard
window.GameBoard = GameBoard;

/** This component contains short info on keys and how to play the game.*/
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
                                <table id="mov-buttons-table" className="table">
                                    <thead></thead>
                                    <tbody>
                                        <tr><td>Move NW: q</td><td> Move N: w</td><td>Move NE: e</td></tr>
                                        <tr><td>Move W: a</td><td>Rest: s</td><td>Move E: d</td></tr>
                                        <tr><td>Move SW: z</td><td>Move S: x</td><td>Move SE: c</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="col-md-6 help-info-buttons">
                                <p><span className="text-primary">m</span> - Toggle the map/player view.</p>
                                <p><span className="text-primary">i</span> - View inventory.</p>
                                <p><span className="text-primary">r</span> - Toggle run mode (1.5 x speed).</p>
                                <p><span className="text-primary">t</span> - Enter target mode. Click on a cell to fire.</p>
                                <p><span className="text-primary">.</span> - Pick up an item.</p>
                                <p><span className="text-primary">,</span> - Use stairs.</p>
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
window.GameHelpScreen = GameHelpScreen;

/** Component for the game startup screen Prints game title and gives some
 * customisation options for the game.
 */
var GameStartScreen = React.createClass({

    getInitialState: function() {
        return {
            selectedGame: null,
            playerName: "Player",
        };
    },

    onNameChange: function(evt) {
        var name = evt.target.value;
        this.props.setPlayerName(name);
        this.setState({playerName: evt.target.value});
    },

    /** Loads a saved game.*/
    loadGame: function() {
        this.props.loadGame(this.state.selectedGame);
    },

    selectGame: function(name) {
        this.setState({selectedGame:name});
    },

    render: function() {
        var setLoot = this.props.setLoot;
        var setMonsters = this.props.setMonsters;
        var setLevelSize = this.props.setLevelSize;
        var setPlayerLevel = this.props.setPlayerLevel;
        var setGameLength = this.props.setGameLength;
        var setDebugMode = this.props.setDebugMode;

        var that = this;
        var savedPlayerList = this.props.savedPlayerList;
        var playerListHTML = savedPlayerList.map(function(val, index) {
            return (<div className="player-list-item" key={index} onClick={that.selectGame.bind(that, val.name)}>Name: {val.name}, L: {val.expLevel} DL: {val.dungeonLevel}</div>);
        });

        var newGame = this.props.newGame;
        return (
            <div id="game-start-screen">

            <div className="modal fade" role="dialog" id="gameLoadModal" tabIndex="-1" role="dialog" aria-labelledby="game-load-modal-label" aria-hidden="true">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                            <h4 className="modal-title" id="game-load-modal-label">{RG.gameTitle} Load a game</h4>
                        </div>

                        <div className="modal-body row">
                            {playerListHTML}
                            <p>Selected game: {this.state.selectedGame}</p>
                        </div>
                        <div className="modal-footer row">
                            <button type="button" data-dismiss="modal" onClick={this.loadGame} className="btn btn-secondary btn-warning">
                                Load
                            </button>
                        </div>
                    </div>
                </div>
            </div>

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

                                <label>You'll be remembered as:
                                    <input type="text" value={this.state.playerName} onChange={this.onNameChange} />
                                </label>

                        </div>

                            <div id="game-options-box" className="col-md-6">
                                <p>Customisation</p>
                                <RadioButtons buttons={["Short", "Medium", "Long", "Epic"]} callback={setGameLength} titleName="Game length" />
                                <RadioButtons buttons={["Sparse", "Medium", "Abundant"]} callback={setLoot} titleName="Loot" />
                                <RadioButtons buttons={["Sparse", "Medium", "Abundant"]} callback={setMonsters} titleName="Monsters" />
                                <RadioButtons buttons={["Small", "Medium", "Large", "Huge"]} callback={setLevelSize} titleName="Levels" />
                                <RadioButtons buttons={["Weak", "Medium", "Strong", "Inhuman"]} callback={setPlayerLevel} titleName="Player" />
                                <RadioButtons buttons={["Off", "Arena", "Battle"]} callback={setDebugMode} titleName="Debug" />
                            </div>
                        </div>

                        <div className="modal-footer row">
                            <div className="col-md-6">
                                <button type="button" onClick={newGame} className="btn btn-secondary" data-dismiss="modal">Embark!</button>
                                <button type="button" data-toggle="modal" data-target="#gameLoadModal" data-dismiss="modal" className="btn btn-secondary btn-warning">
                                    Load
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        );
    }

});
window.GameStartScreen = GameStartScreen;

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
            <div className="radio-buttons btn-group">
                <label className="select-label btn text-primary">{this.props.titleName}</label>
                {buttonList}
            </div>
        );
    }

});
window.RadioButtons = RadioButtons;

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
                <button id="load-button" className="btn btn-info" data-toggle="modal" data-target="#gameLoadModal">Load</button>
                <button id="save-button" className="btn btn-info" onClick={this.props.saveGame}>Save</button>
                <button id="help-button" className="btn btn-info" data-toggle="modal" data-target="#gameHelpModal">Help</button>
                <button onClick={this.setViewSizeXPlus}>+X</button>
                <button onClick={this.setViewSizeXNeg}>-X</button>
                <button onClick={this.setViewSizeYPlus}>+Y</button>
                <button onClick={this.setViewSizeYNeg}>-Y</button>
            </div>
        );
    }

});
window.GamePanel = GamePanel;

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
window.GameMessages = GameMessages;

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

    getCurrentPlayerCell: function() {
        var player = this.props.player;
        var x = player.getX();
        var y = player.getY();
        return player.getLevel().getMap().getCell(x, y);
    },

    useItem: function(evt) {
        if (this.selectedItem !== null) {
            if (this.selectedItem.hasOwnProperty("useItem")) {
                var invEq = this.props.player.getInvEq();
                var target = this.getCurrentPlayerCell();
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
        this.props.selectItemTop(item);
        this.setState({invMsg: msg, msgStyle: "text-info"});
    },

    setEquipSelected: function(selection) {
        this.equipSelected = selection;
        var msg = "Equipment Selected: " + selection.item.toString();
        this.props.selectItemTop(selection.item);
        this.setState({invMsg: msg, msgStyle: "text-info"});
    },

    render: function() {
        var player = this.props.player;
        var inv = player.getInvEq().getInventory();
        var eq = player.getInvEq().getEquipment();
        var maxWeight = player.getMaxWeight();
        var eqWeight = eq.getWeight();
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
                                <GameItems eqWeight={eqWeight} maxWeight={maxWeight} setSelectedItem={this.setSelectedItem} inv={inv} />
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
window.GameInventory = GameInventory;

/** Component which shows the inventory items.*/
var GameItems = React.createClass({

    render: function() {
        var inv = this.props.inv;
        var item = inv.first();
        var items = [];
        var setSelectedItem = this.props.setSelectedItem;
        var totalWeight = inv.getWeight() + this.props.eqWeight;
        totalWeight = totalWeight.toFixed(2);
        var maxWeight = this.props.maxWeight;

        var key = 0;
        while (item !== null && typeof item !== "undefined") {
            var type = item.getType();
            var we = item.getWeight();
            items.push(<GameItemSlot key={key} setSelectedItem={setSelectedItem} item={item} />);
            item = inv.next();
            ++key;
        }
        return (
            <div>
                <p>Items: {totalWeight} kg (max {maxWeight} kg)</p>
                {items}
            </div>
        );
    }

});
window.GameItems = GameItems;

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
window.GameItemSlot = GameItemSlot;

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

            var key = i;
            if (items.length > 0) {
                for (var j = 0; j < items.length; j++) {
                    key += "," + j;
                    equipped.push(
                        <GameEquipSlot setEquipSelected={setEquip} key={key} slotName={slots[i]} slotNumber={j} item={items[j]} />
                    );
                }
            }
            else {
                equipped.push(
                    <GameEquipSlot setEquipSelected={setEquip} key={key} slotName={slots[i]} slotNumber={j} item={null} />
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
window.GameEquipment = GameEquipment;

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
window.GameEquipSlot = GameEquipSlot;

/** Component for displaying character stats.*/
var GameStats = React.createClass({

    getInitialState: function() {
        return {
            mapShown: false,
        };
    },

    changeMapView: function(evt) {
        if (this.state.mapShown) {
            $("#map-player-button").text("Map View");
            this.setState({mapShown: false});
            this.props.setViewType("player");
        }
        else {
            $("#map-player-button").text("Player View");
            this.setState({mapShown: true});
            this.props.setViewType("map");
        }
    },

    render: function() {

        var player = this.props.player;
        var eq = player.getInvEq().getEquipment();
        var dungeonLevel = player.getLevel().getLevelNumber();
        var selectedItem = this.props.selectedItem;
        var selItemName = "";
        if (selectedItem !== null) selItemName = "Selected: " + selectedItem.getName();

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
                <p className="text-primary">{selItemName}</p>
                <button id="inventory-button" className="btn btn-info" data-toggle="modal" data-target="#inventoryModal">Inventory</button>
                <button id="map-player-button" className="btn btn-info" onClick={this.changeMapView}>Map View</button>
            </div>
        );
    }

});
window.GameStats = GameStats;


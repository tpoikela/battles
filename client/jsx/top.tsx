
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
import GameTopMenu from './game-top-menu';
import GameCreatingScreen from './game-creating-screen';
import HiddenFileInput from './hidden-file-input';
import GamePlugins from './game-plugins';
import GameStats from './game-stats';

import GameContextMenu from './context-menu';
import {ContextMenuTrigger} from 'react-contextmenu';

import dbg = require('debug');
const debug = dbg('bitn:top');

import RG from '../src/rg';
import {Keys} from '../src/keymap';

import {ItemBase} from '../src/item';
import {GameManager, VIEW_MAP, VIEW_PLAYER} from '../browser/game-manager';
import {Cell} from '../src/map.cell';
import {IMessage} from '../src/interfaces';

const INV_SCREEN = 'Inventory';

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
    mouseOverCell: Cell;
    playerClass: string;
    playerRace: string;
    playerLevel: string;
    playerName: string;
    render: boolean;
    saveInProgress: boolean;
    seedName: string;
    selectedCell: Cell;
    selectedGame: any;
    selectedItem: ItemBase;
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

/* Top-level Component for the Battles GUI.*/
export class BattlesTop extends React.Component {

    public state: IBattlesTopState;
    public loadScriptId: string;
    public loadFromScriptId: string;
    public levelInputId: string;
    public gameManager: GameManager;

    constructor(props) {
        super(props);

        // Some IDs needed for this component
        this.loadScriptId = '#load-script-input';
        this.loadFromScriptId = '#load-from-script-input';
        this.levelInputId = '#level-file-input';

        this.gameManager = new GameManager(this.setState.bind(this));
        this.gameManager.progressCb = this.progress.bind(this);

        this.state = {
            animation: null,
            boardClassName: 'game-board-player-view',
            editorData: {}, // Data given to editor
            equipSelected: null,
            invMsg: '',
            invMsgStyle: '',
            levelSize: 'Medium',
            loadFromEditor: false,
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
        this.gameManager.cancelAnim();
        const showStartScreen = this.state.showEditor;
        this.setState({showStartScreen,
            showEditor: !this.state.showEditor});
    }

    public selectSaveGame(name: string): void {
        this.setState({selectedGame: name});
    }

    public setPlayerName(name: string): void {
        this.gameManager.setPlayerName(name);
        this.setState({playerName: name});
    }

    public setSeedName(name: string): void {
        this.gameManager.setSeedName(name);
        this.setState({seedName: name});
    }

    /* Sets the size of the shown map.*/
    public setViewSize(obj, xOrY): void {
        this.gameManager.setViewSize(obj, xOrY);
        this.setState({render: true});
    }

    /* Toggles view between normal view and zoomed out map view. */
    public setViewType(type: number): void {
        this.gameManager.setViewType(type);
        this.setState({
            render: true,
            boardClassName: this.gameManager.boardClassName,
            showMap: this.gameManager.showMap
        });
    }

    /* Called when "Embark" button is clicked to create a new game.*/
    public newGame(): void {
        this.gameManager.enableKeys();
        this.hideScreen('StartScreen');

        if (this.state.loadFromEditor) {
            this.createGameFromEditor();
        }
        else {
            this.createNewGame();
            this.setState({render: true});
        }
    }

    /* Creates game from editor data. */
    public createGameFromEditor(): void {
        const levels = this.state.editorData.levelsToPlay;
        this.gameManager.createGameFromLevels(levels);
    }

    /* Saves the game position.*/
    public saveGame(): void {
        this.gameManager.saveGame(() => {
            this.setState({saveInProgress: false});
        });
    }

    /* Loads a saved game from a JSON. */
    public loadGame(playerName: string): void {
        this.gameManager.loadGame(playerName, (restGame) => {
            this.gameManager.initRestoredGame(restGame);
        });
        // this.setState({showLoadScreen: false, showStartScreen: false,
    }

    /* Deletes a saved game from the list. */
    public deleteGame(name: string): void {
        this.gameManager.deleteGame(name, () => {
            this.setState({render: true, selectedGame: null});
        });
    }

    /* Creates a new game instance.*/
    public createNewGame(): void {
        this.gameManager.createNewGame(() => {
            this.showScreen('CreateScreen');
        });
    }

    public progress(msg): void {
        this.setState({progress: msg});
    }

    public loadFromScript(): void {
        const fInput = document.querySelector(this.loadFromScriptId);
        (fInput as HTMLInputElement).click();
    }

    public selectItemTop(item): void {
        this.setState({selectedItem: item});
    }

    public selectEquipTop(selection): void {
        if (selection) {
            this.setState({selectedItem: selection.item,
                equipSelected: selection});
        }
        else {
            this.setState({selectedItem: null, equipSelected: null});
        }
    }

    public onMouseOverCell(x, y): void {
        const cell = this.gameManager.getCellCurrMap(x, y);
        console.log('onMouseOverCell', x, y);
        if (cell) {
            this.setState({mouseOverCell: cell});
        }
    }

    /* Handles right clicks of the context menu. */
    public handleRightClick(evt, data, cell) {
        const [x, y] = cell.getXY();
        this.gameManager.useClickHandler(x, y, cell, data.type);
    }

    /* When a cell is clicked, perform a command/show debug info. */
    public onCellClick(x: number, y: number): void {
        this.gameManager.onCellClick(x, y);
    }

    public importJSON(): void {
        const fInput = document.querySelector(this.levelInputId);
        (fInput  as HTMLInputElement).click();
    }

    public loadScript(): void {
        const fInput = document.querySelector(this.loadScriptId);
        (fInput as HTMLInputElement).click();
    }

    public onLoadScript() {
        this.gameManager.onLoadScript(this.loadScriptId, () => {
            this.updatePluginList();
        });
    }

    public onLoadFromScript() {
        this.gameManager.onLoadFromScript(this.loadFromScriptId, () => {
            this.setState({render: true});
        });
    }

    public updatePluginList() {
        this.setState({showPlugins: true,
            plugins: this.gameManager.getPlugins()
        });
    }

    public setPlayerDriver(): void {
        this.gameManager.setPlayerDriver();
    }

    /* Called when a JSON file is imported. This can be a save game or a
     * plugin */
    public onLoadCallback(jsonData): void {
        this.gameManager.onLoadCallback(jsonData, () => {
            this.setState({render: true});
        });
    }

    /* Called when a JSON file is imported. This can be a save game or a
     * plugin */
    public onLoadRecordedKeys(jsonKeysArray): void {
        this.gameManager.onLoadRecordedKeys(jsonKeysArray);
    }

    public render() {
        const [overworld, playerOwPos] = this.gameManager.getOWAndPlayerPos();
        let rowClass = '';
        let player = null;
        let screen = null;
        let charRows = null;
        let classRows = null;
        let startX = null;
        const message: IMessage[] = this.gameManager.getMessages();
        const gameValid = this.gameManager.isGameValid();
        const showGameMenu = this.gameManager.isMenuShown();

        if (gameValid) {
            player = this.gameManager.getPlayer();
            this.gameManager.renderScreen();
            screen = this.gameManager.getScreen();
            charRows = screen.getCharRows();
            classRows = screen.getClassRows();
            startX = screen.getStartX();

            // All computations for the GameBoard
            const showMap = this.state.showMap;
            rowClass = 'cell-row-div-player-view';
            if (showMap) {rowClass = 'cell-row-div-map-view';}
        }

        const settings = {
            playerClass: this.state.playerClass,
            playerRace: this.state.playerRace,
            playMode: this.state.playMode,
            playerLevel: this.state.playerLevel,
            levelSize: this.state.levelSize
        };
        const oneSelectedCell: Cell = this.getOneSelectedCell();

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
                    savedPlayerList={this.gameManager.getPlayersAsList()}
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
                    equipSelected={this.state.equipSelected}
                    handleKeyDown={this.gameManager.handleKeyDown}
                    invMsg={this.state.invMsg}
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
                        pluginManager={this.gameManager.pluginManager}
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
                                visibleCells={this.gameManager.guiState('visibleCells')}
                            />
                        </div>
                        <div className='game-board-div'>
                            {!showGameMenu &&

                            <ContextMenuTrigger id='right-click-context-menu'>
                                <GameBoard
                                    boardClassName={this.state.boardClassName}
                                    charRows={charRows}
                                    classRows={classRows}
                                    endY={screen.endY}
                                    onCellClick={this.onCellClick}
                                    onMouseOverCell={this.onMouseOverCell}
                                    rowClass={rowClass}
                                    sizeX={2 * screen.viewportX + 1}
                                    startX={startX}
                                    startY={screen.startY}
                                    useRLE={true}
                                />
                            </ContextMenuTrigger>
                            }
                            {showGameMenu &&
                            <GameMenu
                                height={28}
                                menuItemClicked={this.menuItemClicked}
                                menuObj={this.gameManager.getMenu()}
                                width={80}
                            />
                            }
                        </div>
                    </div>
                    }

                </div>
                }

                {!this.state.showEditor &&
                  <React.Fragment>
                  <LevelSaveLoad
                    id=''
                    objData={this.gameManager.game}
                    onLoadCallback={this.onLoadCallback}
                    pretty={false}
                    savedObjName={player ? 'saveGame_' + player.getName() : ''}
                    saveButtonName='Save'
                    setMsg={this.showMsg}
                  />
                  <LevelSaveLoad
                    fNamePrefix='keys'
                    id='keys'
                    loadInputValue='Load keys'
                    objData={this.gameManager.getRecordedCommands()}
                    onLoadCallback={this.onLoadRecordedKeys}
                    pretty={false}
                    savedObjName={player ? 'recorded_cmds_' + player.getName() : ''}
                    saveButtonName='SaveKeys'
                    setMsg={this.showMsg}
                  />
                  </React.Fragment>
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
                <HiddenFileInput
                    inputId='load-from-script-input'
                    onLoadScript={this.onLoadFromScript}
                />
            </div>
        );
    }

    /* When an ASCII menu item is clicked, this function should be called. */
    public menuItemClicked(key): void {
        this.gameManager.menuItemClicked(key);
    }

    public setEditorData(levelsToPlay, allLevels) {
        const editorData = {
            levelsToPlay,
            allLevels
        };
        this.setPlayMode('Editor');
        this.setState({editorData, loadFromEditor: true});
    }

    public getOneSelectedCell(): Cell {
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
        const guiCommands: any = {};
        guiCommands[Keys.GUI.Help] = this.GUIHelp.bind(this);
        guiCommands[Keys.GUI.Help2] = this.GUIHelp.bind(this);
        guiCommands[Keys.GUI.Inv] = this.GUIInventory.bind(this);
        guiCommands[Keys.GUI.Map] = this.GUIMap.bind(this);
        guiCommands[Keys.GUI.OwMap] = this.GUIOverWorldMap.bind(this);
        guiCommands[Keys.GUI.Use] = this.GUIUseItem.bind(this);
        guiCommands[Keys.GUI.CharInfo] = this.GUICharInfo.bind(this);
        guiCommands.GOTO = this.GUIGoto.bind(this);
        this.gameManager.setGUICommands(guiCommands);
    }


    public GUIHelp() {
      this.showScreen('HelpScreen');
    }

    public GUICharInfo() {
      this.showScreen('CharInfo');
    }

    public GUIGoto(x: number, y: number) {
        const player = this.gameManager.getPlayer();
        const cell = player.getCell();
        this.gameManager.useClickHandler(x, y, cell, 'move');
    }

    /* GameInventory should add a callback which updates the GUI (via props) */
    public doInvCmd(cmd): void {
        this.gameManager.updateGame(cmd);
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
        this.gameManager.GUILook((updates) => {
            this.setState(updates);
        });
    }

    public GUIUseItem(code): void {
        if (!this.gameManager.guiState('useModeEnabled')) {
            this.gameManager.guiState('useModeEnabled', true);
            if (this.state.selectedItem === null) {
                this.showScreen('Inventory');
            }
            RG.gameMsg('Select direction for using the item.');
        }
        else {
            this.gameManager.useItem(code, this.state.selectedItem);
        }
    }

    /* Selects next target when 'n' is pressed.*/
    public GUINextTarget(): void {
        if (this.gameManager.guiState('isTargeting')) {
            const nextCell = this.gameManager.getNextTargetCell();
            this.gameManager.setSelectedCell(nextCell);
            this.setState({selectedCell: nextCell});
        }
    }


    public showScreen(type: string): void {
        const key = 'show' + type;
        this.gameManager.disableKeys();
        if (this.state.hasOwnProperty(key)) {
          this.setState({[key]: true});
        }
        else {
          const msg = `showScreen: key ${key} not found in state`;
          console.error(msg);
          RG.gameIntError(`Screen for ${key} not implemented yet`);
        }
    }

    public hideScreen(type: string): void {
        const key = 'show' + type;
        this.gameManager.enableKeys();
        this.setState({[key]: false});
    }

    public toggleScreen(type: string): void {
        const key = 'show' + type;
        const wasShown = this.state[key];
        if (wasShown) {this.gameManager.enableKeys();}
        else {this.gameManager.disableKeys();}
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
        this.gameManager.setGameSettings(name, value);
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

    public showMsg(msg: any): void {
        let msgText = msg;
        if (msg.errorMsg) {
            msgText = msg.errorMsg;
        }
        RG.diag('showMsg:', msgText);
        console.log('showMsg arg:', msg);
        this.setState({msg: msgText});
    }

    /* Binds the callbacks. */
    public bindCallbacks(): void {
        this.newGame = this.newGame.bind(this);

        this.showMsg = this.showMsg.bind(this);

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

        this.onLoadRecordedKeys = this.onLoadRecordedKeys.bind(this);
        this.onLoadCallback = this.onLoadCallback.bind(this);
        this.topMenuCallback = this.topMenuCallback.bind(this);
        // this.importJSON = this.importJSON.bind(this);
        this.menuItemClicked = this.menuItemClicked.bind(this);

        this.onLoadScript = this.onLoadScript.bind(this);
        this.onLoadFromScript = this.onLoadFromScript.bind(this);
        this.loadScript = this.loadScript.bind(this);
        this.updatePluginList = this.updatePluginList.bind(this);
    }

}

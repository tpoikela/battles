
import RG from '../src/rg';
import {Keys} from '../src/keymap';
import {GameMain} from '../src/game';
import {GameSave} from '../src/gamesave';
import {IMessage, IPlayerCmdInput, CmdInput} from '../src/interfaces';
import {ScreenBuffered} from '../gui/screen';

/* Contains top-level logic for managing instances of games. This is non-GUI
 * related functions like automating player movement etc, which are not
 * strictly related to Graphical things.
 */

export interface GameStateTop {
    visibleCells: Cell[];
    autoTarget: boolean;
    useModeEnabled: boolean;
    isTargeting: boolean;
    targetInRange: boolean;
    numCurrCell: number;
    enemyCells: Cell[];
}

export class GameManager {

    public game: any;
    public keyPending: boolean;
    public ctrlMode: string;
    public frameID: number;
    public gameGUIState: GameStateTop;
    public viewportX: number;
    public viewportY: number;
    public boardClassName: string;
    public showMap: boolean;
    public recordedCommands: CmdInput[];
    public screen: ScreenBuffered;

    constructor() {
        this.viewportPlayerX = 35; // * 2
        this.viewportPlayerY = 15; // * 2
        this.viewportX = 35; // * 2
        this.viewportY = 15; // * 2
        this.screen = new ScreenBuffered(this.viewportX, this.viewportY);

        this.gameSave.setStorage(window.localStorage);
        this.savedPlayerList = this.gameSave.getPlayersAsList();
    }


    public mainLoop(updateCb: (any) => void): void {
        if (this.keyPending === true || this.ctrlMode === 'AUTOMATIC') {
            const code = this.getNextCode();
            if ((code as IPlayerCmdInput).cmd) {
                this.game.update(code);
            }
            else {this.game.update({code});}
            this.recordedCommands.push(code);
            this.gameGUIState.visibleCells = this.game.visibleCells;

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
                    this.gameGUIState.isTargeting = true;
                }
                else {
                    this.gameGUIState.isTargeting = false;
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
    public setViewType(type: string): void {
        if (type === VIEW_MAP) {
           this.viewportPlayerX = this.viewportX;
           this.viewportPlayerY = this.viewportY;
           this.viewportX = this.game.getPlayer().getLevel().getMap().cols;
           this.viewportY = this.game.getPlayer().getLevel().getMap().rows;
           this.screen.setMapShown(true);
           this.screen.setViewportXY(this.viewportX, this.viewportY);

           boardClassName = 'game-board-map-view';
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
}

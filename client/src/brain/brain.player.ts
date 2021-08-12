
import RG from '../rg';
import {Menu, MenuWithState, SelectionObject} from '../menu';
import {Keys} from '../keymap';
import * as GoalsBattle from '../goals-battle';
import * as Cmd from '../cmd-player';
import * as Component from '../component/component';
import {Random} from '../random';
import {Geometry} from '../geometry';

import {Brain, BrainSentient} from './brain';
import {Memory} from './brain.memory';

import {IPlayerCmdInput} from '../interfaces';

type BaseActor = import('../actor').BaseActor;
type SentientActor = import('../actor').SentientActor;
type ActionCallback = import('../time').ActionCallback;
type BrainGoalOriented = import('./brain.goaloriented').BrainGoalOriented;
type ItemBase = import('../item').ItemBase;
type Cell = import('../map.cell').Cell;
type Level = import('../level').Level;
type CellMap = import('../map').CellMap;

type TVoidFunc = () => void;

const RNG = Random.getRNG();
const KeyMap = Keys.KeyMap;

const {
    ACTION_ALREADY_DONE,
    ACTION_ZERO_ENERGY } = Cmd;

const selectTargetMsg =
    'Select a target (all with "A"), then press "s" to choose it';
const lookCellMsg =
    'Select a target with movement keys, then press "s" to choose it';

const chatSelObject = player => {
    const msg = 'Select direction for chatting:';
    RG.gameMsg(msg);
    return {
        select: code => {
            const args = {
                dir: KeyMap.getDir(code),
                src: null
            };
            if (args.dir) {
                args.src = player;
                return () => {
                    const chatComp = new Component.Chat();
                    chatComp.setArgs(args);
                    player.add(chatComp);
                };
            }
            return null;
        },
        showMenu: () => false
    };
};


/* Memory object for the player .*/
export class MemoryPlayer extends Memory {

    private _player: SentientActor;

    constructor(player: SentientActor) {
        super();
        this._lastAttackedID = null;
        this._player = player;
    }

    /* Sets the last attacked actor. */
    public setLastAttacked(actor: BaseActor | number): void {
        if (Number.isInteger(actor as number)) {
            this._lastAttackedID = actor as number;
        }
        else if (actor) {
            this._lastAttackedID = (actor as BaseActor).getID();
        }
    }

    public getLastAttacked(): number {
        return this._lastAttackedID;
    }

    /* Returns true if the actor was the last attacked one. */
    public wasLastAttacked(actor: SentientActor): boolean {
        return this._lastAttackedID === actor.getID();
    }

    /* Returns true if the given actor is enemy of player. */
    public isEnemy(actor: BaseActor): boolean {
        if (actor.isPlayer()) {
            return false; // Needed for MindControl
        }
        if (actor.has('NonSentient')) {return false;}
        return actor.getBrain().getMemory().isEnemy(this._player);
    }

    public toJSON() {
        const json: any = {};
        if (!RG.isNullOrUndef([this._lastAttackedID])) {
            json.setLastAttacked = this._lastAttackedID;
        }
        return json;
    }

}


const S_IDLE = 'S_IDLE';
const S_TARGETING = 'S_TARGETING';
const S_LOOKING = 'S_LOOKING';

const FSM_NO_MATCH = 256;
const NO_SELECTED_CELLS = null;

/* A class to manage the targeting/looking state of the player. */
class TargetingFSM {

    public _brain: BrainPlayer;
    public _targetList: Cell[];
    public targetIndex: number;
    public _state: string;
    public selectedCells: Cell[] | null;

    constructor(brain: BrainPlayer) {
        this._brain = brain;
        this._targetList = [];
        this.targetIndex = -1;
        this._state = S_IDLE;
    }

    public getActor(): SentientActor {
        return this._brain._actor;
    }

    public isTargeting(): boolean {
        return this._state === S_TARGETING;
    }

    public isLooking(): boolean {
        return this._state === S_LOOKING;
    }

    public nextTarget(): void {
        if (this.hasTargets()) {
            ++this.targetIndex;
            if (this.targetIndex >= this._targetList.length) {
                this.targetIndex = 0;
            }
            this.setSelectedCells(this._targetList[this.targetIndex]);
        }
    }

    public prevTarget(): void {
        if (this.hasTargets()) {
            --this.targetIndex;
            if (this.targetIndex < 0) {
                this.targetIndex = this._targetList.length - 1;
            }
            this.setSelectedCells(this._targetList[this.targetIndex]);
        }
    }

    public startLooking(): void {
        this._state = S_LOOKING;
    }

    public stopLooking(): void {
        this._state = S_IDLE;
        this.selectedCells = NO_SELECTED_CELLS;
    }

    public startTargeting(): void {
        this._state = S_TARGETING;
        this._targetList = this.getTargetList();
        this.targetIndex = this.getCellIndexToTarget(this._targetList);
        this.setSelectedCells(this._targetList[this.targetIndex]);
    }

    public cancelTargeting(): void {
        this._targetList = [];
        this._state = S_IDLE;
        this.selectedCells = NO_SELECTED_CELLS;
        this.targetIndex = -1;
    }

    public getTargetList(): Cell[] {
        const mapXY = {};
        const visibleCells = this._brain.getSeenCells();
        const actor = this._brain._actor;
        const enemyCells = RG.findEnemyCellForActor(
            actor, visibleCells);
        enemyCells.forEach(cell => {
            mapXY[cell.getX() + ',' + cell.getY()] = cell;
        });
        return Object.values(mapXY);
    }


    public setSelectedCells(cells: Cell | Cell[]): void {
        if (cells) {
            if (!Array.isArray(cells)) {
                const cell = cells as Cell;
                this.selectedCells = [cell];
                if (this.isTargeting()) {
                    const actor = this.getActor();
                    const [tx, ty] = [cell.getX(), cell.getY()];
                    const [ax, ay] = [actor.getX(), actor.getY()];
                    const path = Geometry.getBresenham(ax, ay, tx, ty);
                    const pathCells = path.map(xy => (
                        actor.getLevel().getMap().getCell(xy[0], xy[1])
                    ));
                    this.selectedCells = this.selectedCells.concat(pathCells);
                }
            }
            else {
                this.selectedCells = cells as Cell[];
            }
        }
    }

    public getSelectedCells(): Cell[] {
        return this.selectedCells;
    }

    public getTarget(): Cell | Cell[] {
        if (this.isLooking() || this.isTargeting()) {
            if (this.selectedCells && this.selectedCells.length > 0) {
                return this.selectedCells[0];
            }
        }
        return this.selectedCells;
    }

    public getTargetCell(): Cell | null {
        if (this.selectedCells.length > 0) {
            return this.selectedCells[0];
        }
        return null;
    }

    public getCellIndexToTarget(cells): number {
        const memory = this._brain.getMemory();
        const lastID = memory.getLastAttacked();
        for (let i = 0; i < cells.length; i++) {
            const actors = cells[i].getProp('actors');
            for (let j = 0; j < actors.length; j++) {
                if (actors[j].getID() === lastID) {
                    return i;
                }
            }
        }
        return 0;
    }

    public selectCell(code?: number): void {
        const actor = this._brain._actor;
        const visibleCells = this._brain.getSeenCells();
        if (RG.isNullOrUndef([code])) {
            this.setSelectedCells(actor.getCell());
        }
        else if (code === Keys.KEY.SELECT_ALL) {
            const friends = Brain.findCellsWithFriends(actor,
                visibleCells);
            this.setSelectedCells(friends);
        }
        else {
            const cell = this.selectedCells[0];
            const map = actor.getLevel().getMap();
            const [x, y] = [cell.getX(), cell.getY()];
            const [newX, newY] = KeyMap.getDiff(code, x, y);
            if (map.hasXY(newX, newY)) {
                this.setSelectedCells(map.getCell(newX, newY));
            }
            if (this.isLooking()) {
                const tcell: Cell = this.getTarget() as Cell;
                const index = visibleCells.indexOf(tcell);
                let msg = 'You cannot see there.';
                if (index >= 0) {
                    const names = tcell.getPropNames();
                    msg = '';
                    names.forEach(name => {
                        msg += `You see ${name}. `;
                    });
                    RG.gameMsg(msg);
                }
                else {
                    RG.gameMsg(msg);
                }
            }
        }
    }

    /* Returns true if a player has target selected. */
    public hasTargetSelected(): boolean {
        if (this.selectedCells) {
            return true;
        }
        else if (this._targetList) {
            return this.hasTargets();
        }
        return false;
    }

    public hasTargets() {
        return this._targetList.length > 0;
    }

    public processKey(code: number) {
        if (KeyMap.isTargetMode(code)) {
            if (this.isTargeting()) {
                const cell = this.getTarget();
                this.cancelTargeting();
                if (cell) {
                    return this._brain.handleCommand(
                        {cmd: 'missile', target: cell});
                }
                RG.gameMsg('No valid targets to attack.');
                return this._brain.noAction();
            }
            else {
                const msg = 'Press [n/p] for next/prev target. [t] to fire.';
                RG.gameMsg(msg);
                this.startTargeting();
                return this._brain.noAction();
            }
        }
        else if (this.isTargeting()) {
            if (KeyMap.isNextTarget(code)) {
                this.nextTarget();
            }
            else if (KeyMap.isPrevTarget(code)) {
                this.prevTarget();
            }
            else {
                this.cancelTargeting();
            }
            return this._brain.noAction();
        }
        return FSM_NO_MATCH;
    }

    /* Returns true if chosen target is within attack range. */
    public isTargetInRange(): boolean {
        const cell = this.getTarget() as Cell;
        const actor = this._brain._actor;
        if (cell && cell.getX) {
            const [tx, ty] = [cell.getX(), cell.getY()];
            const [ax, ay] = [actor.getX(), actor.getY()];
            const path = Geometry.getBresenham(ax, ay, tx, ty);

            const invEq = actor.getInvEq();
            const missile = invEq.getMissile();
            if (missile) {
                const missRange = RG.getMissileRange(actor, missile);
                if ((path.length - 1) <= missRange) {
                    return true;
                }
            }
        }
        return false;
    }
}

interface MarkObject {
    id: number;
    x: number;
    y: number;
    tag?: string;
}

/* Used for marking player positions. */
class MarkList {

    public _brain: BrainPlayer;
    public _actor: SentientActor;
    public _marks: {[key: string]: MarkObject[]};

    constructor(brain: BrainPlayer) {
        this._brain = brain;
        this._actor = brain._actor;
        this._marks = {};
    }


    /* Adds a mark to current actor's location, and adds a tag, which
     * can be shown in the mark list. */
    public addMark(tag?: string): void {
        const [x, y] = this._actor.getXY();
        const level: Level = this._actor.getLevel();
        const id = level.getID();
        const markObj: MarkObject = {id, x, y};
        if (tag) {markObj.tag = tag;}
        if (!this._marks[id]) {this._marks[id] = [];}
        if (!this.markExists(id, x, y)) {
            this._marks[id].push(markObj);
            RG.gameMsg('Added a mark to the current location. Press "g" to view them');
        }
    }

    /* Should return a menu object with all possible marks shown. */
    public getMenu(): MenuWithState {
        const id = this._actor.getLevel().getID();
        const markList = this._marks[id] || [];
        const selectMenuArgs = markList.map(mark => {
            const {x, y} = mark;

            // GUI callback which moves the actor along path
            const cbFunc = this._brain._guiCallbacks.GOTO;
            // Bind to args, this is preserved in any case
            const boundFunc = cbFunc.bind(null, Keys.KEY.GOTO, x, y);

            const listMsg = this.getMarkListMsg(mark);
            return [listMsg, boundFunc];
        });

        const deleteMenuArgs = markList.map(mark => {
            const {x, y} = mark;
            const markID = mark.id;
            const listMsg = this.getMarkListMsg(mark);
            const boundFunc = this.deleteMark.bind(this, markID, x, y);
            return [listMsg, boundFunc];
        });

        const menu = new MenuWithState();
        menu.addPre('Choose a mark for travelling:');
        menu.addItem(Keys.KEY.DELETE, ['Delete mark', Menu.NEXT_STATE]);

        menu.addState('', selectMenuArgs);
        menu.addState('DELETE', deleteMenuArgs);
        menu.addTransition('DELETE', Keys.KEY.DELETE);
        menu.addPreState('Choose a mark to delete', 'DELETE');
        return menu;
    }

    /* Deletes a mark from the mark list. */
    public deleteMark(id: number, x: number, y: number): void {
        if (this._marks[id]) {
            const index = this._marks[id].findIndex(obj => (
                obj.id === id && obj.x === x && obj.y === y
            ));
            if (index >= 0) {
                this._marks[id].splice(index, 1);
            }
        }
    }

    /* //TODO remove
    public getMark(selectCode) {
        const index = Keys.codeToIndex(selectCode);
        if (this._marks.length <= index) {
            return this._marks[index];
        }
        return null;
    }
    */

    public getMarkListMsg(mark: MarkObject): string {
        const {x, y} = mark;
        let listMsg = `${x}, ${y}`;
        if (mark.tag) {listMsg += ` ${mark.tag}`;}
        else {
            // Determine tag from a cell
            const cell = this._actor.getLevel().getMap().getCell(x, y);
            if (cell.hasElements()) {
                const elem = cell.getElements()![0];
                listMsg += ' ' + elem.getName();
                if (cell.hasConnection()) {
                    const conn = cell.getConnection();
                    const targetLevel = conn!.getTargetLevel();
                    if (targetLevel) {
                        const level: Level = targetLevel as Level;
                        const parent = level.getParent();
                        if (parent) {
                            listMsg += ' - ' + parent.getName();
                        }
                    }
                }
            }
            else if (cell.hasItems()) {
                listMsg += ' ' + cell.getItems()![0].getName();
            }
        }
        return listMsg;
    }

    public markExists(id: number, x: number, y: number): boolean {
        const markList = this._marks[id];
        const index = markList.findIndex(m => (
            m.x === x && m.y === y
        ));
        return index >= 0;
    }

    public toJSON() {
        return this._marks;
    }

    public fromJSON(json) {
        this._marks = json;
    }

}

const CACHE_INVALID = null;

/* This brain is used by the player actor. It simply handles the player input
 * but by having brain, player actor looks like other actors.  */
export class BrainPlayer extends BrainSentient {

    public _actor: SentientActor;
    public energy: number; // Consumed energy per action
    public _type: string;

    public _guiCallbacks: {[key: string]: (number) => ActionCallback};
    protected _memory: MemoryPlayer;
    protected _cache: {[key: string]: Cell[] | null};

    private _confirmCallback = null;
    private _wantConfirm: boolean;
    private _confirmEnergy: number;

    private _wantSelection: boolean;
    private _selectionObject: SelectionObject | null;
    private _runModeEnabled: boolean;

    private _fightMode: number;

    private _fsm: TargetingFSM;
    private _markList: MarkList;


    // Not used to store anything, used only to map setters to components
    private _statBoosts: {[key: string]: {[key: string]: number}};

    constructor(actor: SentientActor) {
        super(actor);
        this._guiCallbacks = {}; // For attaching GUI callbacks
        this._type = 'Player';
        this._memory = new MemoryPlayer(actor);
        this.energy = 0; // Consumed energy per action

        this._confirmCallback = null;
        this._wantConfirm = false;
        this._confirmEnergy = 0;

        this._wantSelection = false;
        this._selectionObject = null;
        this._runModeEnabled = false;

        this._fightMode = RG.FMODE_NORMAL;

        this._fsm = new TargetingFSM(this);
        this._markList = new MarkList(this);

        this._cache = {seen: CACHE_INVALID};

        // Not used to store anything, used only to map setters to components
        this._statBoosts = {
            CombatMods: {
                setAttack: 0,
                setDefense: 0,
                setProtection: 0
            },
            StatsMods: {
                setAccuracy: 0,
                setAgility: 0,
                setMagic: 0,
                setPerception: 0,
                setSpeed: 0,
                setStrength: 0,
                setWillpower: 0
            }
        };
    }

    public getType() {return this._type;}
    public setType(type) {}

    public getActor() {
        return this._actor;
    }

    public setActor(actor) {
        this._actor = actor;
    }

    /* For given code, adds a GUI callback. When this keycode is given, a GUI
     * callback is called instead. */
    public addGUICallback(code, callback) {
        this._guiCallbacks[code] = callback;
    }

    public getMemory() {return this._memory;}

    /* Restores the base speed after run-mode.*/
    public _restoreBaseSpeed() {
        this._runModeEnabled = false;
        if (this._actor.has('StatsMods')) {
            this._actor.get('StatsMods').setSpeed(0);
        }
    }

    public isRunModeEnabled() {return this._runModeEnabled;}

    public cmdNotPossible(msg: string) {
        this.energy = 0;
        RG.gameWarn(msg);
        return ACTION_ZERO_ENERGY;
    }

    /* Returns true if a menu should be shown by the GUI. */
    public isMenuShown(): boolean {
        if (this._selectionObject) {
            return this._selectionObject.showMenu();
        }
        return false;
    }

    /* Returns the menu which should be shown. */
    public getMenu() {
        if (this._selectionObject) {
            if (this._selectionObject.showMenu()) {
                return this._selectionObject.getMenu();
            }
        }
        return null;
    }

    /* Returned for keypresses when no action is taken.*/
    public noAction() {
        // this.energy = 0;
        return ACTION_ZERO_ENERGY;
    }

    /* Returns current fighting mode.*/
    public getFightMode(): number {return this._fightMode;}

    /* Toggle between walking/running modes.*/
    public toggleRunMode(): void {
        this.energy = 0;
        if (this._runModeEnabled) {
            this._restoreBaseSpeed();
        }
        else {
            this._runModeEnabled = true;
            const baseSpeed = this._actor.get('Stats').getSpeed();
            const speedBoost = Math.floor(0.2 * baseSpeed);
            this._actor.get('StatsMods').setSpeed(speedBoost);
        }
    }

    /* Toggles between different fighting modes.*/
    public toggleFightMode(): void {
        this._fightMode += 1;
        if (this._fightMode >= RG.FMODES.length) {
          this._fightMode = RG.FMODE_NORMAL;
        }
    }

    /* Creates the callback for buying an item, and sets up the confirmation
     * request from player.*/
    public _createBuyConfirmCallback(currCell): void {
        const topItem = currCell.getProp('items')[0];
        const shopElem = currCell.getPropType('shop')[0];
        const nCoins = shopElem.getItemPriceForBuying(topItem);

        const buyItemCallback = () => {
            const trans = new Component.Transaction();
            trans.setArgs({item: topItem, buyer: this._actor,
              shop: shopElem, seller: shopElem.getShopkeeper()});
            this._actor.add(trans);
        };

        this._confirmEnergy = 0;
        this._wantConfirm = true;
        this._confirmCallback = buyItemCallback;
        RG.gameMsg('Press \'y\' to buy ' + topItem.getName() + ' for ' +
            nCoins + ' gold coins');
    }

    /* Sets the stats for attack for special modes.*/
    public _setAttackStats(): void {
        const stats = this._actor.get('Stats');
        const combat = this._actor.get('Combat');
        let speedBoost = 0;
        let attackBoost = 0;
        let damageBoost = 0;

        if (this._fightMode === RG.FMODE_FAST) {
            speedBoost = Math.round(0.2 * stats.getSpeed());
            attackBoost = -Math.round(0.2 * combat.getAttack());
            attackBoost = attackBoost <= 0 ? -1 : attackBoost;
            damageBoost = -1;
        }
        else if (this._fightMode === RG.FMODE_SLOW) {
            speedBoost = -Math.round(0.2 * stats.getSpeed());
            attackBoost = Math.round(0.2 * combat.getAttack());
            attackBoost = attackBoost === 0 ? 1 : attackBoost;
            damageBoost = 2;
        }
        this._actor.get('StatsMods').setSpeed(speedBoost);
        this._actor.get('CombatMods').setAttack(attackBoost);
        this._actor.get('CombatMods').setDamage(damageBoost);
    }

    /* Handles a complex command.
    * TODO remove if/else and use a dispatch table.*/
    public handleCommand(obj) {
        this._restoreBaseSpeed();
        switch (obj.cmd) {
            case 'attack': return new Cmd.CmdAttack(this).execute(obj);
            case 'craft': return new Cmd.CmdCraft(this).execute(obj);
            case 'missile': return new Cmd.CmdMissile(this).execute(obj);
            case 'use': return new Cmd.CmdUseItem(this).execute(obj);
            case 'drop': return new Cmd.CmdDropItem(this).execute(obj);
            case 'equip': return new Cmd.CmdEquipItem(this).execute(obj);
            case 'unequip':
                return new Cmd.CmdUnequipItem(this).execute(obj);
            case 'use-element':
                return new Cmd.CmdUseElement(this).execute(obj);
            default: return () => {};
        }
    }

    /* Returns all stats to their nominal values.*/
    public resetBoosts(): void {
        this.energy = 0;
        for (const compName in this._statBoosts) {
            if (compName) {
                const setters = this._statBoosts[compName];
                for (const setFunc in setters) {
                    if (setFunc) {
                        const baseStatVal = setters[setFunc];
                        if (this._actor.has(compName)) {
                            this._actor.get(compName)[setFunc](baseStatVal);
                        }
                    }
                }
            }
        }
    }

    /* Tries to open/close a door nearby the player. TODO: Handle multiple
     * doors. */
    public tryToToggleDoor() {
        const cellsAround: Cell[] = Brain.getCellsAroundActor(this._actor);
        const doorCells: Cell[] = cellsAround.filter(c => c.hasDoor());
        if (doorCells.length === 1) {
            return this.openDoorFromCell(doorCells[0]);
        }
        else if (doorCells.length > 1) {
            // TODO implement direction choice
            const doorCell = RNG.arrayGetRand(doorCells);
            return this.openDoorFromCell(doorCell);
        }

        return this.cmdNotPossible('There are no doors to open or close');
    }

    public openDoorFromCell(doorCell: Cell) {
        if (doorCell) {
            const door = doorCell.getPropType('door')[0];
            if (door) {
                const comp = new Component.OpenDoor();
                comp.setDoor(door);
                this._actor.add(comp);
                return ACTION_ALREADY_DONE;
            }
        }
        return this.cmdNotPossible('There are no doors to open or close');
    }


    public getSeenCells(): Cell[] {
        if (this._cache.seen === CACHE_INVALID) {
            let cells = this._actor.getLevel().exploreCells(this._actor);
            if (this._actor.has('Telepathy')) {
                const actorLevelID = this._actor.getLevel().getID();
                const tepathyComps = this._actor.getList('Telepathy');
                tepathyComps.forEach(teleComp => {
                    const target = teleComp.getTarget();
                    const targetLevel = target.getLevel();
                    if (RG.isActorActive(target)) {
                        if (targetLevel.getID() === actorLevelID) {
                            const newCells = targetLevel.exploreCells(target);
                            cells = cells.concat(newCells);
                        }
                    }
                });
            }
            this._cache.seen = cells;
        }
        return this._cache.seen;
    }


    public getTargetActor(): BaseActor | null {
        const targetCells = this.getTarget();
        if (Array.isArray(targetCells)) {
            const cells = targetCells as Cell[];
            if (cells.length > 0) {
                return cells[0].getFirstActor();
            }
        }
        else if (targetCells.getFirstActor) {
            return targetCells.getFirstActor();
        }
        return null;
    }


    /* Sets the selection object (for chats/trainers/etc) */
    public setSelectionObject(obj): void {
        this._wantSelection = true;
        this._selectionObject = obj;
    }

    public selectionDone(): void {
        this._wantSelection = false;
        this._selectionObject = null;
    }

    /* Main function which returns next action as function. TODO: Refactor into
     * something bearable. It's 150 lines now! */
    public decideNextAction(obj: IPlayerCmdInput): ActionCallback {
      this._cache.seen = CACHE_INVALID;

      // Workaround at the moment, because some commands are GUI-driven
      if (obj.hasOwnProperty('cmd')) {
        this.resetBoosts();
        return this.handleCommand(obj);
      }

      const code = obj.code!;
      if (RG.isNullOrUndef([code])) {
        RG.err('Brain.Player', 'decideNextAction',
          `obj.code or obj.cmd must exist. Got obj: ${JSON.stringify(obj)}`);
      }

      // Stop here, if action must be confirmed by player by pressing Y
      // TODO should be changed to use menu mechanism
      if (this._wantConfirm && this._confirmCallback !== null) {
          return this.processConfirm(code);
      }

      // A player must make a selection
      if (this._wantSelection) {
          return this.processMenuSelection(code);
      }

      const fsmValue = this._fsm.processKey(code);
      if (fsmValue !== FSM_NO_MATCH) {
          return fsmValue;
      }

      // Create a mark or goto a mark
      if (KeyMap.isMark(code)) {
          this._markList.addMark();
          return this.noAction();
      }
      else if (KeyMap.isGoto(code)) {
          this.setSelectionObject(this._markList.getMenu());
          return this.noAction();
      }

      // Invoke GUI callback with given code
      if (this._guiCallbacks.hasOwnProperty(code)) {
        return this._guiCallbacks[code](code);
      }

      // Enable/disable run mode
      if (KeyMap.isRunMode(code)) {
        this.toggleRunMode();
        return this.noAction();
      }

      // Enable/disable fight mode
      if (KeyMap.isFightMode(code)) {
        this.toggleFightMode();
        return this.noAction();
      }

      if (KeyMap.isIssueOrder(code)) {
          this.issueOrderCmd();
          return this.noAction();
      }

      if (KeyMap.isLook(code)) {
          this.lookCmd();
          return this.noAction();
      }

      if (KeyMap.isJump(code)) {
          this.jumpCmd();
          return this.noAction();
      }

      if (KeyMap.isUseAbility(code)) {
          this.useAbility();
          return this.noAction();
      }

      if (KeyMap.isGive(code)) {
          this.giveCmd();
          return this.noAction();
      }

      // Need existing position for move/attack commands
      const level = this._actor.getLevel();
      let x = this._actor.getX();
      let y = this._actor.getY();
      const currMap = level.getMap();
      const currCell = currMap.getCell(x, y);

      // For digging through item stack on curr cell
      if (KeyMap.isNextItem(code)) {
        getNextItemOnTop(currCell);
        return this.noAction();
      }

      let cmdType = 'NULL';
      if (KeyMap.inMoveCodeMap(code)) {
        const diffXY = KeyMap.getDiff(code, x, y);
        x = diffXY[0];
        y = diffXY[1];
        cmdType = 'MOVE';
      }
      else {
        this._restoreBaseSpeed(); // Speedup only during move
      }

      if (cmdType === 'NULL') { // Not a move command
        this.resetBoosts();

        if (KeyMap.isRest(code)) {cmdType = 'REST';}

        if (KeyMap.isPickup(code)) {
          cmdType = 'PICKUP';
          if (currCell.hasProp('items')) {
            if (currCell.hasShop()) {
              const shop = currCell.getShop();
              if (!shop.isAbandoned()) {
                this._createBuyConfirmCallback(currCell);
                return this.noAction();
              }
              else {
                this.energy = RG.energy.PICKUP;
                return () => {
                  const pickup = new Component.Pickup();
                  this._actor.add(pickup);
                };
              }
            }
            else {
              this.energy = RG.energy.PICKUP;
              return () => {
                const pickup = new Component.Pickup();
                this._actor.add(pickup);
              };
            }
          }
          else {
            return this.cmdNotPossible(
              'There are no items to pick up.');
          }
        }

        if (KeyMap.isUseStairs(code)) {
          cmdType = 'STAIRS';
          if (currCell.hasConnection()) {
            return () => {
                const stairsComp = new Component.UseStairs();
                this._actor.add(stairsComp);
            };
          }
          else {
            return this.cmdNotPossible(
              'There are no stairs or passage here.');
          }
        }

        if (KeyMap.isToggleDoor(code)) {
          return this.tryToToggleDoor();
        }

        if (KeyMap.isUsePower(code)) {
          if (this.hasPowers()) {
              this._wantSelection = true;
              this._selectionObject =
                this._actor.getBook().getSelectionObject();
              RG.gameMsg('Press 0-9 to make a selection.');
          }
          else {
              RG.gameMsg('You have no powers to use.');
          }
          return this.noAction();
        }

        if (KeyMap.isChat(code)) {
          this._wantSelection = true;
          this._selectionObject = chatSelObject(this._actor);
        }

        if (KeyMap.isRead(code)) {
            const readComp = new Component.Read();
            this._actor.add(readComp);
            return ACTION_ALREADY_DONE;
        }
      }

      if (cmdType === 'MOVE') {
          return this.moveCmd(level, currMap, x, y);
      }
      else if (cmdType === 'REST') {
        this.energy = RG.energy.REST;
        this._actor.add(new Component.Rest());
        return ACTION_ALREADY_DONE;
      }

      return this.noAction();
    }

    public hasPowers() {
        return !!this._actor.getBook();
    }

    /* Called when Y/N choice required from player. */
    public processConfirm(code) {
        this._wantConfirm = false;
        if (KeyMap.isConfirmYes(code)) {
          this.energy = this._confirmEnergy;
          // If confirmed, return action to be done
          return this._confirmCallback;
        }
        RG.gameMsg('You cancel the action.');
        return this.noAction();
    }

    public processMenuSelection(code) {
        if (Menu.isMenuItem(this._selectionObject)) {
          if (this._selectionObject.showMsg) {
              this._selectionObject.showMsg();
          }
          const selection = this._selectionObject.select(code);
          // function terminates the selection
          if (Menu.isSelectionDone(selection)) {
            this.selectionDone();
            return selection;
          } // object returns another selection
          else if (Menu.isMenuItem(selection)) {
            this._selectionObject = selection as SelectionObject;
            const selObj = selection as SelectionObject;
            if (selObj.funcToCall) {
              this.selectionDone();
              return selObj.funcToCall();
            }
            return this.noAction();
          }
        }
        this.selectionDone();
        RG.gameMsg('You cancel the action.');
        return this.noAction();
    }

    /* Executes the move command/attack command for the player. */
    public moveCmd(level: Level, currMap: CellMap, x: number, y: number) {
        if (!currMap.hasXY(x, y)) {
          if (this._actor.getCell().hasPassage()) {
              const cb = () => {
                  const stairsComp = new Component.UseStairs();
                  this._actor.add(stairsComp);
              };
              const msg = 'Press \'y\' to move to another area';
              this.setWantConfirm(RG.energy.MOVE, cb, msg);
              return this.noAction();
          }
          else {
              const msg = 'You cannot move there.';
              return this.cmdNotPossible(msg);
          }
        }

        const [aX, aY] = this._actor.getXY();

        // Cell exists in map, check if we can enter it, or if there's
        // something blocking the way
        if (currMap.isPassable(x, y, aX, aY)) {
          return this.moveToCell(x, y, level);
        }
        else if (currMap.getCell(x, y).hasClosedDoor()) {
          return this.tryToToggleDoor();
        }
        else if (currMap.getCell(x, y).hasActors()) {
          this._restoreBaseSpeed();
          const target = getAttackTarget(currMap, x, y);

          if (target === null) {
            RG.err('Brain.Player', 'decideNextAction',
              'Null target for attack x,y: ' + x + ',' + y);
          }

          const attackCallback = () => {
            this._setAttackStats();
            const attackComp = new Component.Attack({target});
            this._actor.add(attackComp);
          };

          if (target.isEnemy(this._actor)) {
            this.energy = RG.energy.ATTACK;
            return attackCallback;
          }
          else {
            const msg = `Press 'y' to attack non-hostile ${target.getName()}`;
            this.setWantConfirm(RG.energy.ATTACK, attackCallback, msg);
            return this.noAction();
          }
        }
        else if (this._actor.has('Flying') && currMap.isPassableByAir(x, y)) {
          this._restoreBaseSpeed();
          return this.moveToCell(x, y, level);
        }
        else {
          const msg = RG.getImpassableMsg(this._actor,
            currMap.getCell(x, y), 'You');
          return this.cmdNotPossible(msg);
        }
    }

    public moveToCell(x: number, y: number, level: Level): TVoidFunc {
        if (this._runModeEnabled) {this.energy = RG.energy.RUN;}
        else {
          this.resetBoosts();
          this.energy = RG.energy.MOVE;
        }

        return () => {
          const movComp = new Component.Movement(x, y, level);
          this._actor.add(movComp);
        };
    }

    public setWantConfirm(energy: number, callback: () => void, msg): void {
        this._confirmEnergy = energy;
        this._wantConfirm = true;
        this._confirmCallback = callback;
        if (msg) {RG.gameMsg(msg);}
    }

    public issueOrderCmd(): void {
        const orderMenuArgs = [
            ['Follow me', this.giveOrder.bind(this, 'Follow')],
            ['Attack enemy', this.giveOrder.bind(this, 'Attack')],
            ['Pickup an item', this.giveOrder.bind(this, 'Pickup')],
            ['Forget my orders', this.giveOrder.bind(this, 'Forget')]
        ];
        const orderMenuSelectOrder = new Menu.WithQuit(orderMenuArgs);
        orderMenuSelectOrder.onQuit = this.cancelTargeting.bind(this);
        const cellMenuArgs = [
            // When key is pressed, show the next menu
            {key: Keys.KEY.SELECT, menu: orderMenuSelectOrder}
        ];

        RG.gameMsg(selectTargetMsg);

        const orderMenuSelectCell = new Menu.SelectCell(cellMenuArgs);
        orderMenuSelectCell.enableSelectAll();
        orderMenuSelectCell.setCallback(this.selectCell.bind(this));
        this.setSelectionObject(orderMenuSelectCell);
        this.selectCell();
    }

    public lookCmd(): void {
        const cellMenuArgs = [
            // When key is pressed, calls func
            {key: Keys.KEY.SELECT,
                funcToCall: this.showSelectedCellInfo.bind(this)
            }
        ];
        RG.gameMsg(lookCellMsg);
        const orderMenuSelectCell = new Menu.SelectCell(cellMenuArgs);
        orderMenuSelectCell.setCallback(this.selectCell.bind(this));
        this.setSelectionObject(orderMenuSelectCell);
        this._fsm.startLooking();
        this.selectCell();
    }

    public giveCmd(): void {
        const menu = new Menu.SelectDir();
        menu.setCallback(this.giveCallback.bind(this));
        this.setSelectionObject(menu);
        RG.gameMsg('Please select direction to giving an item:');
    }

    public giveCallback(dXdY): void {
        const [tX, tY] = RG.newXYFromDir(dXdY, this._actor);
        const cell = this._actor.getLevel().getMap().getCell(tX, tY);
        if (cell.hasActors()) {
            const actor = cell.getFirstActor();
            const items = this._actor.getInvEq().getInventory().getItems();
            const itemMenuItems = items.map(item => (
                [
                    item.toString(),
                    this.giveItemToActor.bind(this, item, actor)
                ]
            ));
            const itemMenu = new Menu.WithQuit(itemMenuItems);
            itemMenu.addPre('Select an item to give:');
            this.setSelectionObject(itemMenu);
        }
        else {
            RG.gameDanger('There is no one there');
        }
    }

    public giveItemToActor(item, actor): void {
        const giveComp = new Component.Give();
        giveComp.setGiveTarget(actor);
        giveComp.setItem(item);
        this._actor.add(giveComp);
    }

    public jumpCmd(): void {
        const menu = new Menu.SelectDir();
        menu.setCallback(this.jumpCallback.bind(this));
        this.setSelectionObject(menu);
        RG.gameMsg('Please select direction to jump');
        this.energy = RG.energy.JUMP;
    }

    public jumpCallback(dXdY): void {
        const [x, y] = dXdY;
        const jumpCmp = new Component.Jump();
        jumpCmp.setX(x);
        jumpCmp.setY(y);
        this._actor.add(jumpCmp);
    }

    public giveOrder(orderType): void {
        const cells = this.getTarget() as Cell[];
        cells.forEach(cell => {
            if (cell.hasActors()) {
                const target = cell.getActors()![0];
                if (RG.isSentient(target)) {
                    const sentTarget = target as SentientActor;
                    const brain = sentTarget.getBrain() as BrainGoalOriented;
                    if (sentTarget && brain.getGoal) {
                        switch (orderType) {
                            case 'Follow': this.giveFollowOrder(sentTarget); break;
                            case 'Forget': this.forgetOrders(sentTarget); break;
                            case 'Attack': this.giveOrderAttack(sentTarget); break;
                            case 'Pickup': this.giveOrderPickup(sentTarget); break;
                            default: break;
                        }
                    }
                }
                else {
                    RG.gameDanger('This cell has no valid targets');
                }
            }
            else if (cells.length === 1) {
                RG.gameDanger('This cell has no valid targets');
            }
        });
        this.setSelectedCells(null);
    }

    public giveFollowOrder(target) {
        const name = target.getName();
        const args = {bias: 0.7, src: this._actor};
        GoalsBattle.giveFollowOrder(target, args);
        RG.gameMsg(`You tell ${name} to follow you`);
    }

    public forgetOrders(target) {
        const args = {bias: 0.7, src: this._actor};
        GoalsBattle.giveClearOrders(target, args);
        RG.gameMsg(`You tell ${name} to forget your orders`);
    }

    public giveOrderAttack(target) {
        const visibleCells = this.getSeenCells();
        const cells = RG.findEnemyCellForActor(
            this._actor, visibleCells);
        if (cells.length === 0) {
            RG.gameMsg('There are no enemies around.');
            return;
        }

        const cellIndex = this.getCellIndexToTarget(cells);
        const enemyCell = cells[cellIndex];

        if (enemyCell) {
            const name = target.getName();
            const enemy = enemyCell.getActors()[0];
            const enemyName = enemy.getName();
            const args = {bias: this.getOrderBias(), enemy, src: this._actor};
            GoalsBattle.giveAttackOrder(target, args);
            RG.gameMsg(`You tell ${name} to attack ${enemyName}`);
        }
        else {
            RG.gameMsg('There are no enemies around.');
        }
    }

    public giveOrderPickup(target: SentientActor): void {
        const item = this.getItemInSight();
        const name = target.getName();
        if (item) {
            const itemName = item.getName();
            const args = {bias: this.getOrderBias(), item, src: this._actor};
            GoalsBattle.givePickupOrder(target, args);
            RG.gameMsg(`You tell ${name} to pickup ${itemName}`);
        }
        else {
            RG.gameMsg(`There are no items for ${name} to pickup`);
        }
    }

    public getOrderBias(): number {
        if (this._actor.has('Leader')) {return 1.0;}
        if (this._actor.has('Commander')) {return 1.5;}
        return 0.7;
    }

    public useAbility(): void {
        if (this._actor.has('Abilities')) {
            const menu = this._actor.get('Abilities').createMenu();
            this.setSelectionObject(menu);
        }
        else {
            RG.gameMsg('You have no abilities to use');
        }
    }


    public addMark(tag?: string): void {
        this._markList.addMark(tag);
    }

    /* Returns one item in sight, or null if no items are seen. */
    public getItemInSight(): ItemBase {
        const seenCells = this.getSeenCells();
        const itemCells = seenCells.filter(cell => cell.hasItems());
        if (itemCells.length > 0) {
            const chosenCell = RNG.arrayGetRand(itemCells);
            return chosenCell.getItems()[0];
        }
        return null;
    }

    public toJSON() {
        return {
            type: this.getType(),
            memory: this._memory.toJSON(),
            markList: this._markList.toJSON()
        };
    }

    /* Required for various functions. Does nothing for the player.*/
    /* eslint-disable class-methods-use-this */
    public addEnemy() {}
    public addFriend() {}
    /* eslint-enable class-methods-use-this */

    //--------------------------------------
    // TARGETING FSM DELEGATED METHODS
    //--------------------------------------

    /* Returns true if a player has target selected. */
    public hasTargetSelected() {
        return this._fsm.hasTargetSelected();
    }

    public startTargeting() {
        this._fsm.startTargeting();
    }

    /* Moves to the next target. */
    public nextTarget() {
        this._fsm.nextTarget();
    }

    public getTargetList(): Cell[] {
        return this._fsm.getTargetList();
    }

    public getSelectedCells() {
        return this._fsm.getSelectedCells();
    }

    public prevTarget() {
        this._fsm.prevTarget();
    }

    /* Returns the current selected cell for targeting. */
    public getTarget(): Cell | Cell[] {
        return this._fsm.getTarget();
    }

    /* Returns true if chosen target is within attack range. */
    public isTargetInRange() {
        return this._fsm.isTargetInRange();
    }

    public cancelTargeting() {
        this._fsm.cancelTargeting();
    }

    public isTargeting() {
        return this._fsm.isTargeting();
    }

    /* Picks either last attacked actor, or the first found. */
    public getCellIndexToTarget(cells): number {
        return this._fsm.getCellIndexToTarget(cells);
    }

    public setSelectedCells(cells: Cell[]): void {
        if (!cells) {
            this.cancelTargeting();
        }
        else {
            this._fsm.setSelectedCells(cells);
        }
    }

    public selectCell(code?: number) {
        this._fsm.selectCell(code);
    }

    public showSelectedCellInfo() {
        // const cell = this.getTarget();
        // TODO show more info about the cell
        this._fsm.stopLooking();
    }

} // Brain.Player

/* Returns possible target for attack, or null if none are found.*/
function getAttackTarget(map, x, y) {
    const targets = map.getCell(x, y).getProp('actors');
    for (let i = 0; i < targets.length; i++) {
        if (!targets[i].has('Ethereal')) {return targets[i];}
    }
    return null;
}

/* If there are multiple items per cell, digs next item to the top.*/
function getNextItemOnTop(cell) {
    if (cell.hasItems()) {
        const items = cell.getItems();
        let name = items[0].getName();
        if (items.length > 1) {
            const firstItem = items.shift();
            items.push(firstItem);
            name = items[0].getName();
            RG.gameMsg('You see now ' + name + ' on top of the heap.');
        }
        else {
            RG.gameMsg('You see only ' + name + ' here');
        }
    }
    else {
        RG.gameMsg('There are no items here to look through');
    }
}

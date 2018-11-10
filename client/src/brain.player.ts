
import RG from './rg';
import {Menu, SelectionObject} from './menu';
import {Keys} from './keymap';
import {Cell} from './map.cell';
import * as GoalsBattle from './goals-battle';
import {Cmd} from './cmd-player';
import {BaseActor, SentientActor} from './actor';
import {Random} from './random';
import * as Item from './item';

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
                    const chatComp = new RG.Component.Chat();
                    chatComp.setArgs(args);
                    player.add(chatComp);
                };
            }
            return null;
        },
        showMenu: () => false
    };
};

interface PlayerCmdInput {
    code?: number;
    cmd?: string;
    target?: Cell;
    item?: any; // TODO add correct type
    count?: number;
}

/* Memory object for the player .*/
export class MemoryPlayer {
    
    private _lastAttackedID: number;
    private _player: SentientActor;

    constructor(player) {
        this._lastAttackedID = null;
        this._player = player;
    }

    /* Sets the last attacked actor. */
    setLastAttacked(actor): void {
        if (Number.isInteger(actor)) {
            this._lastAttackedID = actor;
        }
        else if (actor) {
            this._lastAttackedID = actor.getID();
        }
    }

    getLastAttacked(): number {
        return this._lastAttackedID;
    }

    /* Returns true if the actor was the last attacked one. */
    wasLastAttacked(actor: SentientActor): boolean {
        return this._lastAttackedID === actor.getID();
    }

    /* Returns true if the given actor is enemy of player. */
    isEnemy(actor): boolean {
        if (actor.isPlayer()) {
            return false; // Needed for MindControl
        }
        if (actor.has('NonSentient')) {return false;}
        return actor.getBrain().getMemory().isEnemy(this._player);
    }

    toJSON() {
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

/* A class to manage the targeting/looking state of the player. */
class TargetingFSM {

    public _brain: BrainPlayer;
    public _targetList: Cell[];
    public targetIndex: number;
    public _state: string;
    public selectedCells: Cell[] | null;

    constructor(brain) {
        this._brain = brain;
        this._targetList = [];
        this.targetIndex = -1;
        this._state = S_IDLE;
    }

    getActor(): SentientActor {
        return this._brain._actor;
    }

    isTargeting(): boolean {
        return this._state === S_TARGETING;
    }

    isLooking(): boolean {
        return this._state === S_LOOKING;
    }

    nextTarget(): void {
        if (this.hasTargets()) {
            ++this.targetIndex;
            if (this.targetIndex >= this._targetList.length) {
                this.targetIndex = 0;
            }
            this.setSelectedCells(this._targetList[this.targetIndex]);
        }
    }

    startLooking(): void {
        this._state = S_LOOKING;
    }

    stopLooking(): void {
        this._state = S_IDLE;
        this.selectedCells = null;
    }

    startTargeting(): void {
        this._state = S_TARGETING;
        this._targetList = this.getTargetList();
        this.targetIndex = this.getCellIndexToTarget(this._targetList);
        this.setSelectedCells(this._targetList[this.targetIndex]);
    }

    cancelTargeting(): void {
        this._targetList = [];
        this._state = S_IDLE;
        this.selectedCells = null;
        this.targetIndex = -1;
    }

    getTargetList(): Cell[] {
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

    prevTarget(): void {
        if (this.hasTargets()) {
            --this.targetIndex;
            if (this.targetIndex < 0) {
                this.targetIndex = this._targetList.length - 1;
            }
            this.setSelectedCells(this._targetList[this.targetIndex]);
        }
    }

    setSelectedCells(cells): void {
        if (cells) {
            if (!Array.isArray(cells)) {
                const cell = cells;
                this.selectedCells = [cell];
                if (this.isTargeting()) {
                    const actor = this.getActor();
                    const [tx, ty] = [cell.getX(), cell.getY()];
                    const [ax, ay] = [actor.getX(), actor.getY()];
                    const path = RG.Geometry.getBresenham(ax, ay, tx, ty);
                    const pathCells = path.map(xy => (
                        actor.getLevel().getMap().getCell(xy[0], xy[1])
                    ));
                    this.selectedCells = this.selectedCells.concat(pathCells);
                }
            }
            else {
                this.selectedCells = cells;
            }
        }
    }

    getSelectedCells(): Cell[] {
        return this.selectedCells;
    }

    getTarget(): Cell | Cell[] {
        if (this.isLooking() || this.isTargeting()) {
            if (this.selectedCells && this.selectedCells.length > 0) {
                return this.selectedCells[0];
            }
        }
        return this.selectedCells;
    }

    getTargetCell(): Cell | null {
        if (this.selectedCells.length > 0) {
            return this.selectedCells[0];
        }
        return null;
    }

    getCellIndexToTarget(cells): number {
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

    selectCell(code?: number): void {
        const actor = this._brain._actor;
        const visibleCells = this._brain.getSeenCells();
        if (RG.isNullOrUndef([code])) {
            this.setSelectedCells(actor.getCell());
        }
        else if (code === Keys.KEY.SELECT_ALL) {
            const friends = RG.Brain.findCellsWithFriends(actor,
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
                const cell: Cell = this.getTarget() as Cell;
                const index = visibleCells.indexOf(cell);
                let msg = 'You cannot see there.';
                if (index >= 0) {
                    const names = cell.getPropNames();
                    msg = '';
                    names.forEach(name => {
                        msg += `You see ${name} `;
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
    hasTargetSelected(): boolean {
        if (this.selectedCells) {
            return true;
        }
        else if (this._targetList) {
            return this.hasTargets();
        }
        return false;
    }

    hasTargets() {
        return this._targetList.length > 0;
    }

    processKey(code: number) {
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
    isTargetInRange(): boolean {
        const cell = this.getTarget() as Cell;
        const actor = this._brain._actor;
        if (cell && cell.getX) {
            const [tx, ty] = [cell.getX(), cell.getY()];
            const [ax, ay] = [actor.getX(), actor.getY()];
            const path = RG.Geometry.getBresenham(ax, ay, tx, ty);

            const invEq = actor.getInvEq();
            const missile = invEq.getEquipped('missile');
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

    constructor(brain) {
        this._brain = brain;
        this._actor = brain._actor;
        this._marks = {};
    }

    /* Adds a mark to current actor's location, and adds a tag, which
     * can be shown in the mark list. */
    addMark(tag?: string) {
        const [x, y] = this._actor.getXY();
        const level = this._actor.getLevel();
        const id = level.getID();
        const markObj: MarkObject = {id, x, y};
        if (tag) {markObj.tag = tag;}
        if (!this._marks[id]) {this._marks[id] = [];}
        if (!this.markExists(id, x, y)) {
            this._marks[id].push(markObj);
            RG.gameMsg('Added a mark to the current location.');
        }
    }

    /* Should return a menu object with all possible marks shown. */
    getMenu() {
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
            const {x, y, id} = mark;
            const listMsg = this.getMarkListMsg(mark);
            const boundFunc = this.deleteMark.bind(this, id, x, y);
            return [listMsg, boundFunc];
        });

        const menu = new Menu.WithState();
        menu.addItem(Keys.KEY.DELETE, ['Delete mark', Menu.NEXT_STATE]);

        menu.addState('', selectMenuArgs);
        menu.addState('DELETE', deleteMenuArgs);
        menu.addTransition('DELETE', Keys.KEY.DELETE);
        menu.addPre('Choose a mark to delete', 'DELETE');
        return menu;
    }

    /* Deletes a mark from the mark list. */
    deleteMark(id, x, y) {
        if (this._marks[id]) {
            const index = this._marks[id].findIndex(obj => (
                obj.id === id && obj.x === x && obj.y === y
            ));
            if (index >= 0) {
                this._marks[id].splice(index, 1);
            }
        }
    }

    getMark(selectCode) {
        const index = Keys.codeToIndex(selectCode);
        if (this._marks.length <= index) {
            return this._marks[index];
        }
        return null;
    }

    getMarkListMsg(mark) {
        const {x, y} = mark;
        let listMsg = `${x}, ${y}`;
        if (mark.tag) {listMsg += ` ${mark.tag}`;}
        else {
            // Determine tag from a cell
            const cell = this._actor.getLevel().getMap().getCell(x, y);
            if (cell.hasElements()) {
                const elem = cell.getElements()[0];
                listMsg += ' ' + elem.getName();
                if (cell.hasConnection()) {
                    const conn = cell.getConnection();
                    const targetLevel = conn.getTargetLevel();
                    if (targetLevel) {
                        const parent = targetLevel.getParent();
                        if (parent) {
                            listMsg += ' - ' + parent.getName();
                        }
                    }
                }
            }
            else if (cell.hasItems()) {
                listMsg += ' ' + cell.getItems()[0].getName();
            }
        }
        return listMsg;
    }

    markExists(id, x, y) {
        const markList = this._marks[id];
        const index = markList.findIndex(m => (
            m.x === x && m.y === y
        ));
        return index >= 0;
    }

    toJSON() {
        return this._marks;
    }

    fromJSON(json) {
        this._marks = json;
    }

}

const CACHE_INVALID = null;

/* This brain is used by the player actor. It simply handles the player input
 * but by having brain, player actor looks like other actors.  */
export class BrainPlayer {

    public  _actor: SentientActor;
    public energy: number; // Consumed energy per action
    private _type: string;
    private _memory: MemoryPlayer;

    public _guiCallbacks: {[key: string]: (number) => void};

    private _confirmCallback = null;
    private _wantConfirm: boolean;
    private _confirmEnergy: number;

    private _wantSelection: boolean;
    private _selectionObject: SelectionObject | null;
    private _runModeEnabled: boolean;

    private _fightMode: number;

    private _fsm: TargetingFSM;
    private _markList: MarkList;

    private _cache: {[key: string]: Cell[] | null};

    // Not used to store anything, used only to map setters to components
    private _statBoosts: {[key: string]: {[key: string]: number}};

    constructor(actor: SentientActor) {
        this._actor = actor;
        this._guiCallbacks = {}; // For attaching GUI callbacks
        this._type = 'Player';
        this._memory = new MemoryPlayer(actor);
        this.energy = 1; // Consumed energy per action

        this._confirmCallback = null;
        this._wantConfirm = false;
        this._confirmEnergy = 1;

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
                setSpeed: 0,
                setAccuracy: 0,
                setWillpower: 0,
                setStrength: 0,
                setAgility: 0,
                setMagic: 0
            }
        };
    }

    getActor() {
        return this._actor;
    }

    setActor(actor) {
        this._actor = actor;
    }

    /* For given code, adds a GUI callback. When this keycode is given, a GUI
     * callback is called instead. */
    addGUICallback(code, callback) {
        this._guiCallbacks[code] = callback;
    }

    getMemory() {return this._memory;}

    /* Restores the base speed after run-mode.*/
    _restoreBaseSpeed() {
        this._runModeEnabled = false;
        if (this._actor.has('StatsMods')) {
            this._actor.get('StatsMods').setSpeed(0);
        }
    }

    getType() {return this._type;}

    isRunModeEnabled() {return this._runModeEnabled;}

    cmdNotPossible(msg) {
        this.energy = 0;
        RG.gameWarn(msg);
        return ACTION_ZERO_ENERGY;
    }

    /* Returns true if a menu should be shown by the GUI. */
    isMenuShown(): boolean {
        if (this._selectionObject) {
            return this._selectionObject.showMenu();
        }
        return false;
    }

    /* Returns the menu which should be shown. */
    getMenu() {
        if (this._selectionObject) {
            if (this._selectionObject.showMenu()) {
                return this._selectionObject.getMenu();
            }
        }
        return null;
    }

    /* Returned for keypresses when no action is taken.*/
    noAction() {
        this.energy = 0;
        return ACTION_ZERO_ENERGY;
    }

    /* Returns current fighting mode.*/
    getFightMode(): number {return this._fightMode;}

    /* Toggle between walking/running modes.*/
    toggleRunMode(): void {
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
    toggleFightMode(): void {
        this._fightMode += 1;
        if (this._fightMode >= RG.FMODES.length) {
          this._fightMode = RG.FMODE_NORMAL;
        }
    }

    /* Creates the callback for buying an item, and sets up the confirmation
     * request from player.*/
    _createBuyConfirmCallback(currCell): void {
        const topItem = currCell.getProp('items')[0];
        const shopElem = currCell.getPropType('shop')[0];
        const nCoins = shopElem.getItemPriceForBuying(topItem);

        const buyItemCallback = () => {
            const trans = new RG.Component.Transaction();
            trans.setArgs({item: topItem, buyer: this._actor,
              shop: shopElem, seller: shopElem.getShopkeeper()});
            this._actor.add(trans);
        };

        this._confirmEnergy = 0;
        this._wantConfirm = true;
        this._confirmCallback = buyItemCallback;
        RG.gameMsg("Press 'y' to buy " + topItem.getName() + ' for ' +
            nCoins + ' gold coins');
    }

    /* Sets the stats for attack for special modes.*/
    _setAttackStats(): void {
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
    handleCommand(obj) {
        this._restoreBaseSpeed();
        switch (obj.cmd) {
            case 'attack': return new Cmd.CmdAttack(this).execute(obj);
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
    resetBoosts(): void {
        this.energy = 1;
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
    tryToToggleDoor() {
        const cellsAround = RG.Brain.getCellsAroundActor(this._actor);
        const doorCells = cellsAround.filter(c => c.hasDoor());
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

    openDoorFromCell(doorCell) {
        if (doorCell) {
            const door = doorCell.getPropType('door')[0];
            if (door) {
                const comp = new RG.Component.OpenDoor();
                comp.setDoor(door);
                this._actor.add(comp);
                return ACTION_ALREADY_DONE;
            }
        }
        return this.cmdNotPossible('There are no doors to open or close');
    }


    getSeenCells() {
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


    getTargetActor(): BaseActor | null {
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
    setSelectionObject(obj) {
        this._wantSelection = true;
        this._selectionObject = obj;
    }

    selectionDone() {
        this._wantSelection = false;
        this._selectionObject = null;
    }

    /* Main function which returns next action as function. TODO: Refactor into
     * something bearable. It's 150 lines now! */
    decideNextAction(obj: PlayerCmdInput) {
      this._cache.seen = CACHE_INVALID;

      // Workaround at the moment, because some commands are GUI-driven
      if (obj.hasOwnProperty('cmd')) {
        this.resetBoosts();
        return this.handleCommand(obj);
      }

      const code = obj.code;
      if (RG.isNullOrUndef([code])) {
        RG.err('Brain.Player', 'decideNextAction',
          `obj.code or obj.cmd must exist. Got obj: ${JSON.stringify(obj)}`);
      }

      // Stop here, if action must be confirmed by player by pressing Y
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
                  const pickup = new RG.Component.Pickup();
                  this._actor.add(pickup);
                };
              }
            }
            else {
              this.energy = RG.energy.PICKUP;
              return () => {
                const pickup = new RG.Component.Pickup();
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
                const stairsComp = new RG.Component.UseStairs();
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
            const readComp = new RG.Component.Read();
            this._actor.add(readComp);
            return ACTION_ALREADY_DONE;
        }
      }

      if (cmdType === 'MOVE') {
          return this.moveCmd(level, currMap, x, y);
      }
      else if (cmdType === 'REST') {
        this.energy = RG.energy.REST;
        return ACTION_ALREADY_DONE;
      }

      return this.noAction();
    }

    hasPowers() {
        return !!this._actor.getBook();
    }

    /* Called when Y/N choice required from player. */
    processConfirm(code) {
        this._wantConfirm = false;
        if (KeyMap.isConfirmYes(code)) {
          this.energy = this._confirmEnergy;
          // If confirmed, return action to be done
          return this._confirmCallback;
        }
        RG.gameMsg('You cancel the action.');
        return this.noAction();
    }

    processMenuSelection(code) {
        // if (this._selectionObject) {
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
    moveCmd(level, currMap, x, y) {
        if (!currMap.hasXY(x, y)) {
          if (this._actor.getCell().hasPassage()) {
              const cb = () => {
                  const stairsComp = new RG.Component.UseStairs();
                  this._actor.add(stairsComp);
              };
              const msg = "Press 'y' to move to another area";
              this.setWantConfirm(RG.energy.MOVE, cb, msg);
              return this.noAction();
          }
          else {
              const msg = 'You cannot move there.';
              return this.cmdNotPossible(msg);
          }
        }

        // Cell exists in map, check if we can enter it, or if there's
        // something blocking the way
        if (currMap.isPassable(x, y)) {
          return this.moveToCell(x, y, level);
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
            const attackComp = new RG.Component.Attack({target});
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

    moveToCell(x, y, level) {
        if (this._runModeEnabled) {this.energy = RG.energy.RUN;}
        else {
          this.resetBoosts();
          this.energy = RG.energy.MOVE;
        }

        return () => {
          const movComp = new RG.Component.Movement(x, y, level);
          this._actor.add(movComp);
        };
    }

    setWantConfirm(energy, callback, msg) {
        this._confirmEnergy = energy;
        this._wantConfirm = true;
        this._confirmCallback = callback;
        if (msg) {RG.gameMsg(msg);}
    }

    issueOrderCmd() {
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

    lookCmd() {
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

    giveCmd() {
        const menu = new Menu.SelectDir();
        menu.setCallback(this.giveCallback.bind(this));
        this.setSelectionObject(menu);
        RG.gameMsg('Please select direction to giving an item:');
    }

    giveCallback(dXdY) {
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

    giveItemToActor(item, actor) {
        const giveComp = new RG.Component.Give();
        giveComp.setGiveTarget(actor);
        giveComp.setItem(item);
        this._actor.add(giveComp);
    }

    jumpCmd() {
        const menu = new Menu.SelectDir();
        menu.setCallback(this.jumpCallback.bind(this));
        this.setSelectionObject(menu);
        RG.gameMsg('Please select direction to jump');
    }

    jumpCallback(dXdY) {
        this.energy = RG.energy.JUMP;
        const [x, y] = dXdY;
        const jumpCmp = new RG.Component.Jump();
        jumpCmp.setX(x);
        jumpCmp.setY(y);
        this._actor.add(jumpCmp);
    }

    giveOrder(orderType) {
        const cells = this.getTarget() as Cell[];
        cells.forEach(cell => {
            if (cell.hasActors()) {
                const target = cell.getActors()[0];
                if (target && target.getBrain().getGoal) {
                    switch (orderType) {
                        case 'Follow': this.giveFollowOrder(target); break;
                        case 'Forget': this.forgetOrders(target); break;
                        case 'Attack': this.giveOrderAttack(target); break;
                        case 'Pickup': this.giveOrderPickup(target); break;
                        default: break;
                    }
                }
            }
            else if (cells.length === 1) {
                RG.gameDanger('This cell has no valid targets');
            }
        });
        this.setSelectedCells(null);
    }

    giveFollowOrder(target) {
        const name = target.getName();
        const args = {bias: 0.7, src: this._actor};
        GoalsBattle.giveFollowOrder(target, args);
        RG.gameMsg(`You tell ${name} to follow you`);
    }

    forgetOrders(target) {
        const args = {bias: 0.7, src: this._actor};
        GoalsBattle.giveClearOrders(target, args);
        RG.gameMsg(`You tell ${name} to forget your orders`);
    }

    giveOrderAttack(target) {
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

    giveOrderPickup(target) {
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

    getOrderBias() {
        if (this._actor.has('Leader')) {return 1.0;}
        if (this._actor.has('Commander')) {return 1.5;}
        return 0.7;
    }

    useAbility() {
        if (this._actor.has('Abilities')) {
            const menu = this._actor.get('Abilities').createMenu();
            this.setSelectionObject(menu);
        }
        else {
            RG.gameMsg('You have no abilities to use');
        }
    }


    addMark(tag) {
        this._markList.addMark(tag);
    }

    /* Returns one item in sight, or null if no items are seen. */
    getItemInSight() {
        const seenCells = this.getSeenCells();
        const itemCells = seenCells.filter(cell => cell.hasItems());
        if (itemCells.length > 0) {
            const chosenCell = RNG.arrayGetRand(itemCells);
            return chosenCell.getItems()[0];
        }
        return null;
    }

    toJSON() {
        return {
            type: this.getType(),
            memory: this._memory.toJSON(),
            markList: this._markList.toJSON()
        };
    }

    /* Required for various functions. Does nothing for the player.*/
    /* eslint-disable class-methods-use-this */
    addEnemy() {}
    addFriend() {}
    /* eslint-enable class-methods-use-this */

    //--------------------------------------
    // TARGETING FSM DELEGATED METHODS
    //--------------------------------------

    /* Returns true if a player has target selected. */
    hasTargetSelected() {
        return this._fsm.hasTargetSelected();
    }

    startTargeting() {
        this._fsm.startTargeting();
    }

    /* Moves to the next target. */
    nextTarget() {
        this._fsm.nextTarget();
    }

    getTargetList() {
        return this._fsm.getTargetList();
    }

    getSelectedCells() {
        return this._fsm.getSelectedCells();
    }

    prevTarget() {
        this._fsm.prevTarget();
    }

    /* Returns the current selected cell for targeting. */
    getTarget() {
        return this._fsm.getTarget();
    }

    /* Returns true if chosen target is within attack range. */
    isTargetInRange() {
        return this._fsm.isTargetInRange();
    }

    cancelTargeting() {
        this._fsm.cancelTargeting();
    }

    isTargeting() {
        return this._fsm.isTargeting();
    }

    /* Picks either last attacked actor, or the first found. */
    getCellIndexToTarget(cells) {
        return this._fsm.getCellIndexToTarget(cells);
    }

    setSelectedCells(cells) {
        if (!cells) {
            this.cancelTargeting();
        }
        else {
            this._fsm.setSelectedCells(cells);
        }
    }

    selectCell(code?: number) {
        this._fsm.selectCell(code);
    }

    showSelectedCellInfo() {
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

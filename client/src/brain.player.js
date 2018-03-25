
const RG = require('./rg');
const Menu = require('./menu');
const Keys = require('./keymap');
const GoalsBattle = require('./goals-battle');
const Cmd = require('./cmd-player');

RG.KeyMap = Keys.KeyMap;

const {
    ACTION_ALREADY_DONE,
    ACTION_ZERO_ENERGY } = Cmd;

const selectTargetMsg =
    'Select a target (all with "A"), then press "s" to choose it';

const chatSelObject = player => {
    const msg = 'Select direction for chatting:';
    RG.gameMsg(msg);
    return {
        select: code => {
            const args = {};
            args.dir = RG.KeyMap.getDir(code);
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

/* Memory object for the player .*/
const MemoryPlayer = function(player) {
    let _lastAttackedID = null;

    /* Sets the last attacked actor. */
    this.setLastAttacked = actor => {
        if (Number.isInteger(actor)) {
            _lastAttackedID = actor;
        }
        else if (actor) {
            _lastAttackedID = actor.getID();
        }
    };

    this.getLastAttacked = () => _lastAttackedID;

    /* Returns true if the actor was the last attacked one. */
    this.wasLastAttacked = actor => _lastAttackedID === actor.getID();

    /* Returns true if the given actor is enemy of player. */
    this.isEnemy = actor => {
        if (actor.isPlayer()) {
            return false; // Needed for MindControl
        }
        return actor.getBrain().getMemory().isEnemy(player);
    };

    this.toJSON = () => {
        const json = {};
        if (!RG.isNullOrUndef([_lastAttackedID])) {
            json.setLastAttacked = _lastAttackedID;
        }
        return json;
    };

};


const S_IDLE = Symbol();
const S_TARGETING = Symbol();
const S_LOOKING = Symbol();

const FSM_NO_MATCH = 256;

/* A class to manage the targeting/looking state of the player. */
class TargetingFSM {

    constructor(brain) {
        this._brain = brain;
        this._targetList = [];
        this.targetIndex = -1;
    }

    isTargeting() {
        return this._state === S_TARGETING;
    }

    isLooking() {
        return this._state === S_LOOKING;
    }

    nextTarget() {
        if (this.hasTargets()) {
            ++this.targetIndex;
            if (this.targetIndex >= this._targetList.length) {
                this.targetIndex = 0;
            }
            this.setSelectedCells(this._targetList[this.targetIndex]);
        }
    }

    startTargeting() {
        this._state = S_TARGETING;
        this._targetList = this.getTargetList();
        this.targetIndex = this.getCellIndexToTarget(this._targetList);
        this.setSelectedCells(this._targetList[this.targetIndex]);
    }

    cancelTargeting() {
        this._targetList = [];
        this._state = S_IDLE;
        this.selectedCells = null;
        this.targetIndex = -1;
    }

    getTargetList() {
        const mapXY = {};
        const visibleCells = this._brain.getVisibleCells();
        const actor = this._brain._actor;
        const enemyCells = RG.findEnemyCellForActor(
            actor, visibleCells);
        console.log('n enemyCells: ' + enemyCells.length);
        enemyCells.forEach(cell => {
            mapXY[cell.getX() + ',' + cell.getY()] = cell;
        });
        return Object.values(mapXY);
    }

    prevTarget() {
        if (this.hasTargets()) {
            --this.targetIndex;
            if (this.targetIndex < 0) {
                this.targetIndex = this._targetList.length - 1;
            }
            this.setSelectedCells(this._targetList[this.targetIndex]);
        }
    }

    setSelectedCells(cells) {
        if (cells) {
            if (!Array.isArray(cells)) {
                this.selectedCells = [cells];
            }
            else {
                this.selectedCells = cells;
            }
        }
    }

    getTarget() {
        if (this.isTargeting()) {
            if (this.selectedCells.length > 0) {
                return this.selectedCells[0];
            }
        }
        return this.selectedCells;
    }

    getCellIndexToTarget(cells) {
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

    selectCell(code) {
        const actor = this._brain._actor;
        if (RG.isNullOrUndef([code])) {
            this.setSelectedCells(actor.getCell());
        }
        else if (code === Keys.KEY.SELECT_ALL) {
            const visibleCells = this._brain.getVisibleCells();
            const friends = RG.Brain.findCellsWithFriends(actor,
                visibleCells);
            this.setSelectedCells(friends);
        }
        else {
            const cell = this.selectedCells[0];
            const map = actor.getLevel().getMap();
            const [x, y] = [cell.getX(), cell.getY()];
            const [newX, newY] = RG.KeyMap.getDiff(code, x, y);
            if (map.hasXY(newX, newY)) {
                this.setSelectedCells(map.getCell(newX, newY));
            }
        }
    }

    /* Returns true if a player has target selected. */
    hasTargetSelected() {
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

    processKey(code) {
        if (RG.KeyMap.isTargetMode(code)) {
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
            if (RG.KeyMap.isNextTarget(code)) {
                this.nextTarget();
            }
            else if (RG.KeyMap.isPrevTarget(code)) {
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
    isTargetInRange() {
        const cell = this.getTarget();
        const actor = this._brain._actor;
        if (cell && cell.getX) {
            const [tx, ty] = [cell.getX(), cell.getY()];
            const [ax, ay] = [actor.getX(), actor.getY()];
            const path = RG.Geometry.getMissilePath(ax, ay, tx, ty);

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

/* This brain is used by the player actor. It simply handles the player input
 * but by having brain, player actor looks like other actors.  */
class BrainPlayer {

    constructor(actor) {
        this._actor = actor;
        this._guiCallbacks = {}; // For attaching GUI callbacks
        this._type = 'Player';
        this._memory = new MemoryPlayer(actor);
        this.energy = 1; // Consumed energy per action

        this._confirmCallback = null;
        this._wantConfirm = false;
        this._confirmEnergy = 1;

        this._wantSelection = false;
        this._selectionObject = false;
        this._runModeEnabled = false;

        this._fightMode = RG.FMODE_NORMAL;

        this._fsm = new TargetingFSM(this);

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

    isMenuShown() {
        if (this._selectionObject) {
            return this._selectionObject.showMenu();
        }
        return false;
    }

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
    getFightMode() {return this._fightMode;}

    /* Toggle between walking/running modes.*/
    toggleRunMode() {
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
    toggleFightMode() {
        this._fightMode += 1;
        if (this._fightMode >= RG.FMODES.length) {
          this._fightMode = RG.FMODE_NORMAL;
        }
    }

    /* Creates the callback for buying an item, and sets up the confirmation
     * request from player.*/
    _createBuyConfirmCallback(currCell) {
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
    _setAttackStats() {
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
        if (obj.cmd === 'missile') {
            return new Cmd.Missile().execute.call(this, obj);
        }
        else if (obj.cmd === 'use') {
            return new Cmd.UseItem().execute.call(this, obj);
        }
        else if (obj.cmd === 'drop') {
            return new Cmd.DropItem().execute.call(this, obj);
        }
        else if (obj.cmd === 'equip') {
            return new Cmd.EquipItem().execute.call(this, obj);
        }
        else if (obj.cmd === 'unequip') {
            return new Cmd.UnequipItem().execute.call(this, obj);
        }
        return () => {};
    }

    /* Returns all stats to their nominal values.*/
    resetBoosts() {
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

    /* Returns possible target for attack, or null if none are found.*/
    _getAttackTarget(map, x, y) {
        const targets = map.getCell(x, y).getProp('actors');
        for (let i = 0; i < targets.length; i++) {
            if (!targets[i].has('Ethereal')) {return targets[i];}
        }
        return null;
    }

    /* Tries to open/close a door nearby the player. TODO: Handle multiple
     * doors. */
    tryToToggleDoor() {
        const cellsAround = RG.Brain.getCellsAroundActor(this._actor);
        const doorCells = cellsAround.filter(c => c.hasDoor());
        let doorCell = null;
        if (doorCells.length === 1) {
            doorCell = doorCells[0];
        }
        else if (doorCells.length > 1) {
            // TODO implement direction choice
            doorCell = RG.RAND.arrayGetRand(doorCells);
        }

        if (doorCell) {
            const door = doorCells[0].getPropType('door')[0];
            const comp = new RG.Component.OpenDoor();
            comp.setDoor(door);
            this._actor.add(comp);
            return ACTION_ALREADY_DONE;
        }
        return this.cmdNotPossible('There are no doors to open or close');
    }

    /* Returns true if a player has target selected. */
    hasTargetSelected() {
        return this._fsm.hasTargetSelected();
    }

    getVisibleCells() {
        return this._actor.getLevel().exploreCells(this._actor);
    }

    /* Moves to the next target. */
    nextTarget() {
        this._fsm.nextTarget();
    }

    getTargetList() {
        return this._fsm.getTargetList();
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

    /* Required for various functions. Does nothing for the player.*/
    addEnemy() {}
    addFriend() {}

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
    decideNextAction(obj) {

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

      // Invoke GUI callback with given code
      if (this._guiCallbacks.hasOwnProperty(code)) {
        return this._guiCallbacks[code](code);
      }

      // Enable/disable run mode
      if (RG.KeyMap.isRunMode(code)) {
        this.toggleRunMode();
        return this.noAction();
      }

      // Enable/disable fight mode
      if (RG.KeyMap.isFightMode(code)) {
        this.toggleFightMode();
        return this.noAction();
      }

      if (RG.KeyMap.isIssueOrder(code)) {
          this.issueOrderCmd();
          return this.noAction();
      }

      // Need existing position for move/attack commands
      const level = this._actor.getLevel();
      let x = this._actor.getX();
      let y = this._actor.getY();
      const currMap = level.getMap();
      const currCell = currMap.getCell(x, y);

      // For digging through item stack on curr cell
      if (RG.KeyMap.isNextItem(code)) {
        this.getNextItemOnTop(currCell);
        return this.noAction();
      }

      let cmdType = 'NULL';
      if (RG.KeyMap.inMoveCodeMap(code)) {
        const diffXY = RG.KeyMap.getDiff(code, x, y);
        x = diffXY[0];
        y = diffXY[1];
        cmdType = 'MOVE';
      }
      else {
        this._restoreBaseSpeed(); // Speedup only during move
      }

      if (cmdType === 'NULL') { // Not a move command
        this.resetBoosts();

        if (RG.KeyMap.isRest(code)) {cmdType = 'REST';}

        if (RG.KeyMap.isPickup(code)) {
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

        if (RG.KeyMap.isUseStairs(code)) {
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

        if (RG.KeyMap.isToggleDoor(code)) {
          return this.tryToToggleDoor();
        }

        if (RG.KeyMap.isUsePower(code)) {
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

        if (RG.KeyMap.isChat(code)) {
          // RG.gameMsg('You try chatting around.');
          this._wantSelection = true;
          this._selectionObject = chatSelObject(this._actor);
        }
      }

      if (cmdType === 'MOVE') {
          return this.moveCmd(level, currMap, x, y);
      }
      else if (cmdType === 'REST') {
        this.energy = RG.energy.REST;
        return () => {};
      }

      return this.noAction();
    }

    hasPowers() {
        return !!this._actor.getBook();
    }

    /* Sets the action to be confirmed using callback. Emits an optional
     * messages to ask for confirmation. */
    setWantConfirm(confirmCallback, msg = '') {
        this._wantConfirm = true;
        this._confirmCallback = confirmCallback;
        if (msg !== '') {RG.gameMsg(msg);}
    }

    /* If there are multiple items per cell, digs next item to the top.*/
    getNextItemOnTop(cell) {
        if (cell.hasProp('items')) {
            const items = cell.getProp('items');
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

    /* Called when Y/N choice required from player. */
    processConfirm(code) {
        this._wantConfirm = false;
        if (RG.KeyMap.isConfirmYes(code)) {
          this.energy = this._confirmEnergy;
          // If confirmed, return action to be done
          return this._confirmCallback;
        }
        RG.gameMsg('You cancel the action.');
        return this.noAction();
    }

    processMenuSelection(code) {
        if (this._selectionObject !== null) {
          if (this._selectionObject.showMsg) {
              this._selectionObject.showMsg();
          }
          const selection = this._selectionObject.select(code);
          // function terminates the selection
          if (typeof selection === 'function') {
            this.selectionDone();
            return selection;
          } // object returns another selection
          else if (selection && typeof selection === 'object') {
            this._selectionObject = selection;
            return this.noAction();
          }
        }
        this.selectionDone();
        RG.gameMsg('You cancel the action.');
        return this.noAction();
    }

    /* Executes the move command/attack command for the player. */
    moveCmd(level, currMap, x, y) {
        if (currMap.hasXY(x, y)) {
          if (currMap.isPassable(x, y)) {

            if (this._runModeEnabled) {this.energy = RG.energy.RUN;}
            else {
              this.resetBoosts();
              this.energy = RG.energy.MOVE;
            }

            return () => {
              const movComp = new RG.Component.Movement(x, y, level);
              this._actor.add('Movement', movComp);
            };
          }
          else if (currMap.getCell(x, y).hasProp('actors')) {
            this._restoreBaseSpeed();
            const target = this._getAttackTarget(currMap, x, y);

            if (target === null) {
              RG.err('Brain.Player', 'decideNextAction',
                'Null target for attack x,y: ' + x + ',' + y);
            }

            const attackCallback = () => {
              this._setAttackStats();
              const attackComp = new RG.Component.Attack({target});
              this._actor.add('Attack', attackComp);
            };

            if (target.isEnemy(this._actor)) {
              this.energy = RG.energy.ATTACK;
              return attackCallback;
            }
            else {
              this._confirmEnergy = RG.energy.ATTACK;
              this._wantConfirm = true;
              this._confirmCallback = attackCallback;
              const msg = `Press 'y' to attack non-hostile ${target.getName()}`;
              RG.gameMsg(msg);
              return this.noAction();
            }
          }
          else if (this._actor.has('Flying') && currMap.isPassableByAir(x, y)) {
            this.resetBoosts();
            this.energy = RG.energy.MOVE;
            return () => {
              const movComp = new RG.Component.Movement(x, y, level);
              this._actor.add('Movement', movComp);
            };
          }
          else {
            const msg = RG.getImpassableMsg(this._actor,
              currMap.getCell(x, y), 'You');
            return this.cmdNotPossible(msg);
          }
        }
        else if (this._actor.getCell().hasPassage()) {
            this._confirmEnergy = RG.energy.MOVE;
            this._wantConfirm = true;
            this._confirmCallback = () => {
                const stairsComp = new RG.Component.UseStairs();
                this._actor.add(stairsComp);
            };
            const msg = "Press 'y' to move to another area";
            RG.gameMsg(msg);
            return this.noAction();
        }
        else {
            const msg = 'You cannot move there.';
            return this.cmdNotPossible(msg);
        }
    }

    issueOrderCmd() {
        const orderMenuArgs = [
            ['Follow me', this.giveOrder.bind(this, 'Follow')],
            ['Attack enemy', this.giveOrder.bind(this, 'Attack')],
            ['Forget my orders', this.giveOrder.bind(this, 'Forget')]
        ];
        const orderMenuSelectOrder = new Menu.WithQuit(orderMenuArgs);
        const cellMenuArgs = [
            {key: Keys.KEY.SELECT, menu: orderMenuSelectOrder}
        ];

        RG.gameMsg(selectTargetMsg);

        const orderMenuSelectCell = new Menu.SelectCell(cellMenuArgs);
        orderMenuSelectCell.enableSelectAll();
        orderMenuSelectCell.setCallback(this.selectCell.bind(this));
        this.setSelectionObject(orderMenuSelectCell);
        this.selectCell();
    }

    giveOrder(orderType) {
        const cells = this.getTarget();
        cells.forEach(cell => {
            if (cell.hasActors()) {
                const target = cell.getActors()[0];
                if (target && target.getBrain().getGoal) {
                    switch (orderType) {
                        case 'Follow': this.giveFollowOrder(target); break;
                        case 'Forget': this.forgetOrders(target); break;
                        case 'Attack': this.giveOrderAttack(target); break;
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
        const args = {bias: this.getOrderBias(), src: this._actor};
        GoalsBattle.giveFollowOrder(target, args);
        RG.gameMsg(`You tell ${name} to follow you`);
    }

    forgetOrders(target) {
        const topGoal = target.getBrain().getGoal();
        topGoal.clearOrders();
        RG.gameMsg(`You tell ${name} to forget your orders`);
    }

    giveOrderAttack(target) {
        const visibleCells = this.getVisibleCells();
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

    getOrderBias() {
        return 0.7;
    }

    setSelectedCells(cells) {
        this._fsm.setSelectedCells(cells);
    }

    selectCell(code) {
        this._fsm.selectCell(code);
    }

    toJSON() {
        return {
            type: this.getType(),
            memory: this._memory.toJSON()
        };
    }

} // Brain.Player

module.exports = BrainPlayer;

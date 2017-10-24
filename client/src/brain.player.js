
const RG = require('./rg');

const EMPTY_FUNC = () => {};

const chatSelObject = player => {
    const msg = 'Select direction for chatting:';
    RG.gameMsg(msg);
    return {
        select: (code) => {
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
        _lastAttackedID = actor.getID();
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

};

class CmdMissile {

    execute(obj) {
        const invEq = this._actor.getInvEq();
        // TODO changes to fire more than 1 missile
        const missile = invEq.unequipAndGetItem('missile', 1);

        if (!RG.isNullOrUndef([missile])) {

            // Check for missile weapon for ammunition
            if (missile.has('Ammo')) {
                const missWeapon = invEq.getEquipment()
                    .getEquipped('missileweapon');
                if (missWeapon === null) {
                    const msg = 'No missile weapon equipped.';
                    return this.cmdNotPossible(msg);
                }
                else { // Check ammo/weapon compatibility
                    const ammoType = missile.getAmmoType();
                    const weaponType = missWeapon.getWeaponType();
                    if (this._actor.has('MixedShot')) {
                        const re = /bow/;
                        if (!re.test(ammoType) || !re.test(weaponType)) {
                            if (ammoType !== weaponType) {
                                const msg = 'Ammo/weapon not compatible.';
                                return this.cmdNotPossible(msg);
                            }
                        }
                    }
                    else if (ammoType !== weaponType) {
                        const msg = 'Ammo/weapon not compatible.';
                        return this.cmdNotPossible(msg);
                    }
                }
            }

            if (!RG.isNullOrUndef([obj.target])) {
                const x = obj.target.getX();
                const y = obj.target.getY();
                const mComp = new RG.Component.Missile(this._actor);
                mComp.setTargetXY(x, y);
                mComp.setDamage(RG.getMissileDamage(this._actor, missile));
                mComp.setAttack(RG.getMissileAttack(this._actor, missile));
                mComp.setRange(RG.getMissileRange(this._actor, missile));
                missile.add('Missile', mComp);
                this.energy = RG.energy.MISSILE;
            }
            else {
                RG.err('Brain.Player', 'handleCommand',
                    'No x,y given for missile.');
            }
        }
        else {
            return this.cmdNotPossible('No missile equipped.');
        }
        return EMPTY_FUNC;
    }

}

/* Executed when player uses an item. */
class CmdUseItem {

    execute(obj) {
        if (obj.hasOwnProperty('item')) {
            const item = obj.item;
            let result = false;
            let msg = `You failed to use ${item.getName()}.`;
            if (typeof item.useItem === 'function') {
                this.energy = RG.energy.USE;
                item.useItem({target: obj.target});
                result = true;
            }

            if (obj.hasOwnProperty('callback')) {
                if (result) {
                    msg = `You used ${item.getName()}!`;
                }
                obj.callback({msg: msg, result});
            }
            else if (!result) {
                return this.cmdNotPossible('You cannot use that item.');
            }
        }
        else {
            RG.err('Brain.Player', 'handleCommand', 'obj has no item');
        }
        return EMPTY_FUNC;
    }

}

class CmdDropItem {

  execute(obj) {
      const invEq = this._actor.getInvEq();
      const actorCell = this._actor.getCell();
      let result = false;
      let msg = `Failed to drop ${obj.item.getName()}`;
      if (actorCell.hasShop()) {
          const shopElem = actorCell.getPropType('shop')[0];
          const price = shopElem.getItemPriceForSelling(obj.item);

          this._wantConfirm = true;
          this._confirmCallback = () => {
              const sellOk = shopElem.sellItem(obj.item, this._actor);
              if (obj.hasOwnProperty('callback')) {
                  if (sellOk) {
                      msg = `${obj.item.getName()} was sold.`;
                  }
                  else {
                      msg = `Cannot sell ${obj.item.getName()}.`;
                  }
                  obj.callback({msg: msg, result: sellOk});
              }
          };

          msg = `Press y to sell item for ${price} gold coins.`;
          if (obj.hasOwnProperty('callback')) {
              obj.callback({msg: msg, result});
          }
      }
      else if (invEq.dropItem(obj.item)) {
          result = true;
          msg = 'Item dropped!';
      }
      if (obj.hasOwnProperty('callback')) {
          obj.callback({msg: msg, result});
      }
      return EMPTY_FUNC;
  }

}

class CmdEquipItem {

    execute(obj) {
        const invEq = this._actor.getInvEq();
        const item = obj.item;
        let result = false;
        let msg = `Failed to equip ${item.getName()}`;
        if (item.getType() === 'missile') {
            if (invEq.equipNItems(item, item.count)) {
                result = true;
            }
        }
        else if (invEq.equipItem(item)) {
            result = true;
        }
        if (obj.hasOwnProperty('callback')) {
            if (result) {
                msg = `Equipping ${item.getName()} succeeded!`;
            }
            obj.callback({msg: msg, result});
        }
        return EMPTY_FUNC;
    }

}

/* Executed when an actor unequips an item. */
class CmdUnequipItem {

    execute(obj) {
        const name = obj.slot;
        const slotNumber = obj.slotNumber;
        const invEq = this._actor.getInvEq();
        let result = false;
        let msg = `Failed to remove item from slot ${name}.`;

        if (name === 'missile') {
            const eqItem = invEq.getEquipment().getItem('missile');

            if (eqItem !== null) {
                if (invEq.unequipItem(name, eqItem.count)) {
                    result = true;
                }
            }
        }
        else if (invEq.unequipItem(name, 1, slotNumber)) {
            result = true;
        }

        if (obj.hasOwnProperty('callback')) {
            if (result) {
                msg = `Unequipping from ${name} succeeded!`;
            }
            obj.callback({msg: msg, result});
        }
        return EMPTY_FUNC;
    }

}

/* This brain is used by the player actor. It simply handles the player input
 * but by having brain, player actor looks like other actors.  */
class BrainPlayer {
    constructor(actor) {
        this._actor = actor;
        this._guiCallbacks = {}; // For attaching GUI callbacks
        this._type = 'player';
        this._memory = new MemoryPlayer(actor);
        this.energy = 1; // Consumed energy per action

        this._confirmCallback = null;
        this._wantConfirm = false;
        this._confirmEnergy = 1;

        this._wantSelection = false;
        this._selectionObject = false;
        this._isTargeting = false;
        this._runModeEnabled = false;

        this._fightMode = RG.FMODE_NORMAL;

        this._enemyCells = [];

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
        return null;
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
        return null; // Null action
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
            const speedBoost = Math.floor( 0.5 * baseSpeed);
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
            shopElem.buyItem(topItem, this._actor);
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
            return new CmdMissile().execute.call(this, obj);
        }
        else if (obj.cmd === 'use') {
            return new CmdUseItem().execute.call(this, obj);
        }
        else if (obj.cmd === 'drop') {
            return new CmdDropItem().execute.call(this, obj);
        }
        else if (obj.cmd === 'equip') {
            return new CmdEquipItem().execute.call(this, obj);
        }
        else if (obj.cmd === 'unequip') {
            return new CmdUnequipItem().execute.call(this, obj);
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

    /* Tries to open/close a door nearby the player.*/
    tryToToggleDoor() {
        const cellsAround = RG.Brain.getCellsAroundActor(this._actor);
        for (let i = 0; i < cellsAround.length; i++) {
            if (cellsAround[i].hasDoor()) {
                const door = cellsAround[i].getPropType('door')[0];
                if (door.isOpen()) {
                    door.closeDoor();
                }
                else {
                    door.openDoor();
                }
                return () => {};
            }
        }
        return this.cmdNotPossible('There are no doors close by');

    }

    /* Returns true if a player has target selected. */
    hasTargetSelected() {
        if (this._enemyCells) {
            return this._enemyCells.length > 0;
        }
        return false;
    }

    /* Moves to the next target. */
    nextTarget() {
        if (this._enemyCells.length === 0) {
            this._isTargeting = true;
            const visibleCells =
                this._actor.getLevel().exploreCells(this._actor);
            this._enemyCells = RG.findEnemyCellForPlayer(
                this._actor, visibleCells);
            this.currEnemyCell = this.selectCellToTarget();
        }
        else {
            ++this.currEnemyCell;
            if (this.currEnemyCell >= this._enemyCells.length) {
                this.currEnemyCell = 0;
            }
        }
    }

    /* Returns the current selected cell for targeting. */
    getTarget() {
        if (this.currEnemyCell < this._enemyCells.length) {
            return this._enemyCells[this.currEnemyCell];
        }
        return null;
    }

    cancelTargeting() {
        this._enemyCells = [];
        this._isTargeting = false;
    }

    /* Picks either last attacked actor, or the first found. */
    selectCellToTarget() {
        const cells = this._enemyCells;
        const lastID = this.getMemory().getLastAttacked();
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

    /* Required for damage dealing. Does nothing for the player.*/
    addEnemy() {}

    /* Sets the selection object (for chats/trainers/etc) */
    setSelectionObject(obj) {
        this._wantSelection = true;
        this._selectionObject = obj;
    }

    toJSON() {
        return {
            type: this.getType()
        };
    }

    /* Main function which returns next action as function. TODO: Refactor into
    * something bearable. It's 150 lines now! */
    decideNextAction(obj) {

      // Workaround at the moment, because missile attacks are GUI-driven
      if (obj.hasOwnProperty('cmd')) {
        this.resetBoosts();
        return this.handleCommand(obj);
      }

      const code = obj.code;
      if (RG.isNullOrUndef([code])) {
        RG.err('Brain.Player', 'decideNextAction',
          `obj.code must exist. Got obj: ${JSON.stringify(obj)}`);
      }

      // Stop here, if action must be confirmed by player by pressing Y
      if (this._wantConfirm && this._confirmCallback !== null) {
        // Want y/n answer
        this._wantConfirm = false;
        if (RG.KeyMap.isConfirmYes(code)) {
          this.energy = this._confirmEnergy;
          // If confirmed, return action to be done
          return this._confirmCallback;
        }
        RG.gameMsg('You cancel the action.');
        return this.noAction();
      }

      // A player must make a selection
      if (this._wantSelection) {
        if (this._selectionObject !== null) {
          const selection = this._selectionObject.select(code);
          // function terminates the selection
          if (typeof selection === 'function') {
            this._wantSelection = false;
            this._selectionObject = null;
            return selection;
          } // object returns another selection
          else if (selection && typeof selection === 'object') {
            this._selectionObject = selection;
            return this.noAction();
          }
        }
        this._wantSelection = false;
        this._selectionObject = null;
        RG.gameMsg('You cancel the action.');
        return this.noAction();
      }

      // Targeting mode logic
      if (RG.KeyMap.isTargetMode(code)) {
        if (this._isTargeting) {
          const cell = this.getTarget();
          this.cancelTargeting();
          if (cell) {
            return this.handleCommand({cmd: 'missile', target: cell});
          }
          RG.gameMsg('No valid targets to attack.');
          return this.noAction();
        }
        else {
          this.nextTarget();
          return this.noAction();
        }
      }
      else if (RG.KeyMap.isNextTarget(code)) {
        if (this._isTargeting) {
          this.nextTarget();
          return this.noAction();
        }
      }
      else if (this._isTargeting) {
        this.cancelTargeting();
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
                  level.pickupItem(this._actor, x, y);
                };
              }
            }
            else {
              this.energy = RG.energy.PICKUP;
              return () => {
                level.pickupItem(this._actor, x, y);
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
          if (currCell.hasStairs()) {
            return () => {level.useStairs(this._actor);};
          }
          else if (currCell.hasPassage()) {
            return () => {level.useStairs(this._actor);};
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
              const attackComp = new RG.Component.Attack(target);
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
          else {
            const msg = RG.getImpassableMsg(this._actor,
              currMap.getCell(x, y), 'You');
            return this.cmdNotPossible(msg);
          }
        }
        else {
          // TODO add moving out of the map
          const msg = 'You cannot move there (Use < or > to change location).';
          return this.cmdNotPossible(msg);
        }
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

    /* If there are multiple items per cell, digs next item to the top.*/
    getNextItemOnTop(cell) {
        if (cell.hasProp('items')) {
            const items = cell.getProp('items');
            const name = items[0].getName();
            if (items.length > 1) {
                const firstItem = items.shift();
                items.push(firstItem);
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
} // Brain.Player

module.exports = BrainPlayer;


const RG = require('./rg');

/* Memory object for the player .*/
const MemoryPlayer = function(player) {
    let _lastAttackedID = null;

    /* Sets the last attacked actor. */
    this.setLastAttacked = function(actor) {
        _lastAttackedID = actor.getID();
    };

    this.getLastAttacked = () => _lastAttackedID;

    /* Returns true if the actor was the last attacked one. */
    this.wasLastAttacked = function(actor) {
        return _lastAttackedID === actor.getID();
    };

    /* Returns true if the given actor is enemy of player. */
    this.isEnemy = function(actor) {
        return actor.getBrain().getMemory().isEnemy(player);
    };

};


/* This brain is used by the player actor. It simply handles the player input
 * but by having brain, player actor looks like other actors.  */
const BrainPlayer = function(actor) {
    const _actor = actor;
    const _guiCallbacks = {}; // For attaching GUI callbacks
    const _type = 'player';
    const _memory = new MemoryPlayer(actor);

    /* For given code, adds a GUI callback. When this keycode is given, a GUI
     * callback is called instead. */
    this.addGUICallback = function(code, callback) {
        _guiCallbacks[code] = callback;
    };

    this.getMemory = () => _memory;

    this.energy = 1; // Consumed energy per action

    let _confirmCallback = null;
    let _wantConfirm = false;
    let _confirmEnergy = 1;

    let _wantSelection = false;
    let _selectionObject = false;
    let _isTargeting = false;
    let _runModeEnabled = false;

    let _fightMode = RG.FMODE_NORMAL;

    /* Restores the base speed after run-mode.*/
    const _restoreBaseSpeed = function() {
        _runModeEnabled = false;
        // this.energy = 1;
        _actor.get('StatsMods').setSpeed(0);
    };

    this.getType = function() {return _type;};

    this.isRunModeEnabled = function() {return _runModeEnabled;};

    this.cmdNotPossible = function(msg) {
        this.energy = 0;
        RG.gameWarn(msg);
        return null;
    };

    this.isMenuShown = function() {
        if (_selectionObject) {
            return _selectionObject.showMenu();
        }
        return false;
    };

    this.getMenu = function() {
        if (_selectionObject) {
            if (_selectionObject.showMenu()) {
                return _selectionObject.getMenu();
            }
        }
        return null;
    };

    /* Main function which returns next action as function. TODO: Refactor into
    * something bearable. It's 150 lines now! */
    this.decideNextAction = function(obj) {

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
        if (_wantConfirm && _confirmCallback !== null) {
            // Want y/n answer
            _wantConfirm = false;
            if (RG.KeyMap.isConfirmYes(code)) {
                this.energy = _confirmEnergy;
                // If confirmed, return action to be done
                return _confirmCallback;
            }
            RG.gameMsg('You cancel the action.');
            return this.noAction();
        }

        // A player must make a selection
        if (_wantSelection) {
            if (_selectionObject !== null) {
                const selection = _selectionObject.select(code);
                // function terminates the selection
                if (typeof selection === 'function') {
                    _wantSelection = false;
                    _selectionObject = null;
                    return selection;
                } // object returns another selection
                else if (selection && typeof selection === 'object') {
                    _selectionObject = selection;
                    return this.noAction();
                }
            }
            _wantSelection = false;
            _selectionObject = null;
            RG.gameMsg('You cancel the action.');
            return this.noAction();
        }

        // Targeting mode logic
        if (RG.KeyMap.isTargetMode(code)) {
            if (_isTargeting) {
                const cell = this.getTarget();
                this.cancelTargeting();
                if (cell) {
                    return this.handleCommand({cmd: 'missile', target: cell});
                }
                RG.gameMsg('No valid targets to attack.');
                return this.noAction();
            }
            else {
                _isTargeting = true;
                this.nextTarget();
                return this.noAction();
            }
        }
        else if (RG.KeyMap.isNextTarget(code)) {
            if (_isTargeting) {
                this.nextTarget();
                return this.noAction();
            }
        }
        else if (_isTargeting) {
            this.cancelTargeting();
        }

        // Invoke GUI callback with given code
        if (_guiCallbacks.hasOwnProperty(code)) {
            return _guiCallbacks[code](code);
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
        const level = _actor.getLevel();
        let x = _actor.getX();
        let y = _actor.getY();
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
            _restoreBaseSpeed(); // Speedup only during move
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
                            _createBuyConfirmCallback(currCell);
                            return this.noAction();
                        }
                        else {
                            this.energy = RG.energy.PICKUP;
                            return function() {
                                level.pickupItem(_actor, x, y);
                            };
                        }
                    }
                    else {
                        this.energy = RG.energy.PICKUP;
                        return function() {
                            level.pickupItem(_actor, x, y);
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
                    return function() {level.useStairs(_actor);};
                }
                else if (currCell.hasPassage()) {
                    return function() {level.useStairs(_actor);};
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
                _wantSelection = true;
                _selectionObject = _actor._spellbook.getSelectionObject();
                RG.gameMsg('Press 0-9 to make a selection.');
                return this.noAction();
            }
        }

        if (cmdType === 'MOVE') {
            if (currMap.hasXY(x, y)) {
                if (currMap.isPassable(x, y)) {

                    if (_runModeEnabled) {this.energy = RG.energy.RUN;}
                    else {
                        this.resetBoosts();
                        this.energy = RG.energy.MOVE;
                    }

                    return function() {
                        const movComp = new RG.Component.Movement(x, y, level);
                        _actor.add('Movement', movComp);
                    };
                }
                else if (currMap.getCell(x, y).hasProp('actors')) {
                    _restoreBaseSpeed();
                    const target = _getAttackTarget(currMap, x, y);

                    if (target === null) {
                        RG.err('Brain.Player', 'decideNextAction',
                            'Null target for attack x,y: ' + x + ',' + y);
                    }

                    const attackCallback = function() {
                        _setAttackStats();
                        const attackComp = new RG.Component.Attack(target);
                        _actor.add('Attack', attackComp);
                    };

                    if (target.isEnemy(_actor)) {
                        this.energy = RG.energy.ATTACK;
                        return attackCallback;
                    }
                    else {
                        _confirmEnergy = RG.energy.ATTACK;
                        _wantConfirm = true;
                        _confirmCallback = attackCallback;
                        RG.gameMsg("Press 'y' to attack non-hostile actor.");
                        return this.noAction();
                    }
                }
                else {
                    const msg = RG.getImpassableMsg(_actor,
                        currMap.getCell(x, y), 'You');
                    return this.cmdNotPossible(msg);
                }
            }
            else {
                // TODO add moving out of the map
                return this.cmdNotPossible('You cannot move that way.');
            }
        }
        else if (cmdType === 'REST') {
            this.energy = RG.energy.REST;
            return function() {};
        }

        return this.noAction();
    };

    /* Returned for keypresses when no action is taken.*/
    this.noAction = function() {
        this.energy = 0;
        return null; // Null action
    };

    /* Returns current fighting mode.*/
    this.getFightMode = function() {return _fightMode;};

    /* Toggle between walking/running modes.*/
    this.toggleRunMode = function() {
        if (_runModeEnabled) {
            _restoreBaseSpeed();
        }
        else {
            _runModeEnabled = true;
            const baseSpeed = _actor.get('Stats').getSpeed();
            const speedBoost = Math.floor( 0.5 * baseSpeed);
            _actor.get('StatsMods').setSpeed(speedBoost);
        }
    };

    /* Toggles between different fighting modes.*/
    this.toggleFightMode = function() {
        _fightMode += 1;
        if (_fightMode >= RG.FMODES.length) {_fightMode = RG.FMODE_NORMAL;}
    };

    /* If there are multiple items per cell, digs next item to the top.*/
    this.getNextItemOnTop = function(cell) {
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
    };


    /* Creates the callback for buying an item, and sets up the confirmation
     * request from player.*/
    const _createBuyConfirmCallback = function(currCell) {
        const topItem = currCell.getProp('items')[0];
        const shopElem = currCell.getPropType('shop')[0];
        const nCoins = shopElem.getItemPriceForBuying(topItem);

        const buyItemCallback = function() {
            shopElem.buyItem(topItem, _actor);
        };

        _confirmEnergy = 0;
        _wantConfirm = true;
        _confirmCallback = buyItemCallback;
        RG.gameMsg("Press 'y' to buy " + topItem.getName() + ' for ' +
            nCoins + ' gold coins');
    };

    /* Sets the stats for attack for special modes.*/
    const _setAttackStats = function() {
        const stats = _actor.get('Stats');
        const combat = _actor.get('Combat');
        let speedBoost = 0;
        let attackBoost = 0;
        let damageBoost = 0;

        if (_fightMode === RG.FMODE_FAST) {
            speedBoost = Math.round(0.2 * stats.getSpeed());
            attackBoost = -Math.round(0.2 * combat.getAttack());
            attackBoost = attackBoost <= 0 ? -1 : attackBoost;
            damageBoost = -1;
        }
        else if (_fightMode === RG.FMODE_SLOW) {
            speedBoost = -Math.round(0.2 * stats.getSpeed());
            attackBoost = Math.round(0.2 * combat.getAttack());
            attackBoost = attackBoost === 0 ? 1 : attackBoost;
            damageBoost = 2;
        }
        _actor.get('StatsMods').setSpeed(speedBoost);
        _actor.get('CombatMods').setAttack(attackBoost);
        _actor.get('CombatMods').setDamage(damageBoost);
    };

    /* Handles a complex command.
    * TODO remove if/else and use a dispatch table.*/
    this.handleCommand = function(obj) {
        _restoreBaseSpeed();
        if (obj.cmd === 'missile') {
            const invEq = _actor.getInvEq();
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
                }

                if (!RG.isNullOrUndef([obj.target])) {
                    const x = obj.target.getX();
                    const y = obj.target.getY();
                    const mComp = new RG.Component.Missile(_actor);
                    mComp.setTargetXY(x, y);
                    mComp.setDamage(RG.getMissileDamage(_actor, missile));
                    mComp.setAttack(RG.getMissileAttack(_actor, missile));
                    mComp.setRange(RG.getMissileRange(_actor, missile));
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
        }
        else if (obj.cmd === 'use') {
            if (obj.hasOwnProperty('item')) {
                const item = obj.item;
                let result = false;
                let msg = `You failed to use ${item.getName()}.`;
                if (item.hasOwnProperty('useItem')) {
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
        }
        else if (obj.cmd === 'drop') {
            const invEq = _actor.getInvEq();
            const actorCell = _actor.getCell();
            let result = false;
            let msg = `Failed to drop ${obj.item.getName()}`;
            if (actorCell.hasShop()) {
                const shopElem = actorCell.getPropType('shop')[0];
                const price = shopElem.getItemPriceForSelling(obj.item);

                _wantConfirm = true;
                _confirmCallback = function() {
                    const sellOk = shopElem.sellItem(obj.item, _actor);
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
        }
        else if (obj.cmd === 'equip') {
            const invEq = _actor.getInvEq();
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
        }
        else if (obj.cmd === 'unequip') {
            const name = obj.slot;
            const invEq = _actor.getInvEq();
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
            else if (invEq.unequipItem(name)) {
                result = true;
            }

            if (obj.hasOwnProperty('callback')) {
                if (result) {
                    msg = `Unequipping from ${name} succeeded!`;
                }
                obj.callback({msg: msg, result});
            }

        }
        return function() {};
    };

    // Not used to store anything, used only to map setters to components
    const _statBoosts = {
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
            setAgility: 0
        }
    };

    /* Returns all stats to their nominal values.*/
    this.resetBoosts = function() {
        this.energy = 1;
        for (const compName in _statBoosts) {
            if (compName) {
                const setters = _statBoosts[compName];
                for (const setFunc in setters) {
                    if (setFunc) {
                        const baseStatVal = setters[setFunc];
                        _actor.get(compName)[setFunc](baseStatVal);
                    }
                }
            }
        }
    };

    /* Returns possible target for attack, or null if none are found.*/
    const _getAttackTarget = function(map, x, y) {
        const targets = map.getCell(x, y).getProp('actors');
        for (let i = 0; i < targets.length; i++) {
            if (!targets[i].has('Ethereal')) {return targets[i];}
        }
        return null;
    };


    /* Tries to open/close a door nearby the player.*/
    this.tryToToggleDoor = function() {
        const cellsAround = RG.Brain.getCellsAroundActor(_actor);
        for (let i = 0; i < cellsAround.length; i++) {
            if (cellsAround[i].hasDoor()) {
                const door = cellsAround[i].getPropType('door')[0];
                if (door.isOpen()) {
                    door.closeDoor();
                }
                else {
                    door.openDoor();
                }
                return function() {};
            }
        }
        return this.cmdNotPossible('There are no doors close by');

    };

    this.enemyCells = [];

    /* Returns true if a player has target selected. */
    this.hasTargetSelected = function() {
        if (this.enemyCells) {
            return this.enemyCells.length > 0;
        }
        return false;
    };

    /* Moves to the next target. */
    this.nextTarget = function() {
        if (this.enemyCells.length === 0) {
            const visibleCells = _actor.getLevel().exploreCells(_actor);
            this.enemyCells = RG.findEnemyCellForPlayer(
                _actor, visibleCells);
            this.currEnemyCell = this.selectCellToTarget();
        }
        else {
            ++this.currEnemyCell;
            if (this.currEnemyCell >= this.enemyCells.length) {
                this.currEnemyCell = 0;
            }
        }
    };

    /* Returns the current selected cell for targeting. */
    this.getTarget = function() {
        if (this.currEnemyCell < this.enemyCells.length) {
            return this.enemyCells[this.currEnemyCell];
        }
        return null;
    };

    this.cancelTargeting = function() {
        console.log('Cancelled targeting in player brain');
        this.enemyCells = [];
        _isTargeting = false;
    };

    /* Picks either last attacked actor, or the first found. */
    this.selectCellToTarget = function() {
        const cells = this.enemyCells;
        const lastID = this.getMemory().getLastAttacked();
        for (let i = 0; i < cells.length; i++) {
            const actor = cells[i].getProp('actors')[0];
            if (actor.getID() === lastID) {return i;}
        }
        return 0;
    };

    /* Required for damage dealing. Does nothing for the player.*/
    this.addEnemy = function() {};

    this.toJSON = function() {
        return {
            type: this.getType()
        };
    };

}; // Brain.Player

module.exports = BrainPlayer;

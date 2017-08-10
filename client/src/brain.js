
const ROT = require('../../lib/rot.js');
const RG = require('./rg.js');
const BTree = require('./aisequence');

const Models = BTree.Models;

// Dummy callback to return, if the actor's action provides a state
// changing action without callback.
const ACTION_ALREADY_DONE = () => {};
const NO_ACTION_TAKEN = () => {};

/* Used for testing purposes only. */
const TestSelectionObj = function() {

    this.select = function(code) {
        if (code === ROT.VK_1) {
            RG.gameMsg('Please select now direction to fire.');
            // Returns another object for selection with function 'select'
            return {
                getMenu: function() {
                    return {
                        N: 'Move north',
                        S: 'Move south',
                        E: 'Move east',
                        W: 'Move west'
                    };
                },
                select: function(code) {
                    switch (code) {
                        case RG.KEY.MOVE_W: {
                            return () => {
                                RG.gameMsg('SubSelection west ' + code);
                            };
                        }
                        case RG.KEY.MOVE_E: {
                            return () => {
                                RG.gameMsg('SubSelection east ' + code);
                            };
                        }
                        case RG.KEY.MOVE_S: {
                            return () => {
                                RG.gameMsg('SubSelection south ' + code);
                            };
                        }
                        case RG.KEY.MOVE_N: {
                            return () => {
                                RG.gameMsg('SubSelection north ' + code);
                            };
                        }
                        default: {
                            console.log('Canceling the fire command..');
                            return null;
                        }
                    }
                }
            };
        }
        else {
            return function() {
                RG.gameMsg('You kick! You selected code ' + code);
            };
        }
    };

    this.getMenu = function() {
        return {
            0: 'Kick someone',
            1: 'Move around'
        };
    };

};

//---------------------------------------------------------------------------
// BRAINS
//---------------------------------------------------------------------------

RG.Brain = {};

/* Returns a list of cells in 3x3 around the actor with the brain.*/
RG.Brain.getCellsAround = function(actor) {
    const map = actor.getLevel().getMap();
    const x = actor.getX();
    const y = actor.getY();
    const cells = [];
    for (let xx = x - 1; xx <= x + 1; xx++) {
        for (let yy = y - 1; yy <= y + 1; yy++) {
            if (map.hasXY(xx, yy)) {cells.push(map.getCell(xx, yy));}
        }
    }
    return cells;
};

/* This brain is used by the player actor. It simply handles the player input
 * but by having brain, player actor looks like other actors.  */
RG.Brain.Player = function(actor) {
    const _actor = actor;
    const _guiCallbacks = {}; // For attaching GUI callbacks
    const _type = 'player';

    /* For given code, adds a GUI callback. When this keycode is given, a GUI
     * callback is called instead. */
    this.addGUICallback = function(code, callback) {
        _guiCallbacks[code] = callback;
    };

    this.energy = 1; // Consumed energy per action

    let _confirmCallback = null;
    let _wantConfirm = false;
    let _confirmEnergy = 1;

    let _wantSelection = false;
    let _selectionObject = false;

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
            // return _wantSelection;
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
                if (typeof selection === 'function') {
                    console.log('typeof selection is function');
                    _wantSelection = false;
                    _selectionObject = null;
                    return selection;
                }
                else if (selection && typeof selection === 'object') {
                    console.log('typeof selection is object');
                    _selectionObject = selection;
                    return this.noAction();
                }
                _wantSelection = false;
                _selectionObject = null;
                console.log('Setting wantSelection to false now.');
                RG.gameMsg('You cancel the action.');
                return this.noAction();
            }
            else {
                _wantSelection = false;
                _selectionObject = null;
                RG.gameMsg('You cancel the action.');
                return this.noAction();
            }
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
                // _selectionObject = new TestSelectionObj();
                _selectionObject = _actor._spells.getSelectionObject();
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
                    mComp.setRange(missile.getAttackRange());
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
        const cellsAround = RG.Brain.getCellsAround(_actor);
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

    /* Required for damage dealing. Does nothing for the player.*/
    this.addEnemy = function() {};

    this.toJSON = function() {
        return {
            type: this.getType()
        };
    };

}; // Brain.Player

/* Memory is used by the actor to hold information about enemies, items etc.
 * It's a separate object from decision-making brain.*/
RG.Brain.Memory = function() {

    const _enemies = []; // List of enemies for this actor
    const _enemyTypes = []; // List of enemy types for this actor
    let _communications = [];

    // TODO add memory of player closing a door/using stairs

    this.addEnemyType = function(type) {
        _enemyTypes.push(type);
    };

    /* Checks if given actor is an enemy. */
    this.isEnemy = function(actor) {
        let index = _enemies.indexOf(actor);
        if (index !== -1) {return true;}
        const type = actor.getType();
        index = _enemyTypes.indexOf(type);
        if (index !== -1) {return true;}
        return false;
    };

    /* Adds given actor as (personal) enemy.*/
    this.addEnemy = function(actor) {
        if (!this.isEnemy(actor)) {
            _enemies.push(actor);
            _communications = []; // Invalidate communications
        }
    };

    this.getEnemies = function() {return _enemies;};

    /* Adds a communication with given actor. */
    this.addCommunicationWith = function(actor) {
        if (!this.hasCommunicatedWith(actor)) {
            _communications.push(actor);
        }
    };

    /* Returns true if has communicated with given actor.*/
    this.hasCommunicatedWith = function(actor) {
        const index = _communications.indexOf(actor);
        return index !== -1;
    };

};

/* Brain is used by the AI to perform and decide on actions. Brain returns
 * actionable callbacks but doesn't know Action objects.  */
RG.Brain.Rogue = function(actor) {
    let _actor = actor; // Owner of the brain
    const _explored = {}; // Memory of explored cells
    let _type = 'rogue';

    const _memory = new RG.Brain.Memory(this);

    this.getType = function() {return _type;};
    this.setType = function(type) {_type = type;};

    this.getMemory = function() {return _memory;};

    this.setActor = function(actor) {_actor = actor;};
    this.getActor = function() {return _actor;};

    this.addEnemy = function(actor) {_memory.addEnemy(actor);};

    this._seenCached = null;

    /* Callback used for actor's path finding. */
    const _passableCallback = function(x, y) {
        const map = _actor.getLevel().getMap();
        const hasFlying = _actor.has('Flying');
        if (!RG.isNullOrUndef([map])) {
            let res = false;
            if (hasFlying) {
                res = map.isPassableByAir(x, y);
            }
            else {
                res = map.isPassable(x, y);
            }
            if (!res) {
                res = (x === _actor.getX()) && (y === _actor.getY());
            }
            return res;
        }
        else {
            RG.err('Brain.Rogue', '_passableCallback', 'map not well defined.');
        }
        return false;
    };

    // Returns cells seen by this actor
    this.getSeenCells = function() {
        if (this._seenCached) {
            return this._seenCached;
        }
        this._seenCached = _actor.getLevel().getMap().getVisibleCells(_actor);
        return this._seenCached;
    };

    /* Main function for retrieving the actionable callback. Acting actor must
     * be passed in. */
    this.decideNextAction = function() {
        this._seenCached = null;
        return BTree.startBehavTree(Models.Rogue.tree, _actor)[0];
    };

    /* Takes action towards given enemy cell.*/
    this.actionTowardsEnemy = function(enemyCell) {
        const level = _actor.getLevel();
        const playX = enemyCell.getX();
        const playY = enemyCell.getY();
        if (this.canAttack(playX, playY)) {
            return function() {
                const cell = level.getMap().getCell(playX, playY);
                const target = cell.getProp('actors')[0];
                const attackComp = new RG.Component.Attack(target);
                _actor.add('Attack', attackComp);
            };
        }
        else { // Move closer
            return this.tryToMoveTowardsCell(enemyCell);
        }
    };

    /* Based on seenCells, AI explores the unexplored free cells, or picks on
     * cell randomly, if everything's explored.*/
    this.exploreLevel = function(seenCells) {
        // Wander around exploring
        let index = -1;
        let perms = [];
        for (let j = 0; j < seenCells.length; j++) {perms.push(j);}
        perms = perms.randomize();

        for (let i = 0, ll = perms.length; i < ll; i++) {
            const ci = perms[i];
            const cell = seenCells[ci];
            if (cell.isFree()) {
                const xy = cell.getX() + ',' + cell.getY();
                if (!_explored.hasOwnProperty(xy)) {
                    _explored[xy] = true;
                    index = ci;
                    break;
                }
            }
            else if (cell.hasDoor()) {
                const door = cell.getPropType('door')[0];
                if (door.isClosed) {door.openDoor();}
            }
        }

        if (index === -1) { // Everything explored, choose random cell
            index = RG.RAND.randIndex(seenCells);
        }
        return this.tryToMoveTowardsCell(seenCells[index]);

    };

    this.tryToMoveTowardsCell = function(cell) {
        const pathCells = this.getShortestPathTo(cell);
        if (pathCells.length > 1) {
            const level = _actor.getLevel();
            const x = pathCells[1].getX();
            const y = pathCells[1].getY();
            return function() {
                const movComp = new RG.Component.Movement(x, y, level);
                _actor.add('Movement', movComp);
            };
        }
        else {
            return NO_ACTION_TAKEN; // Don't move, rest
        }
    };

    /* Checks if the actor can attack given x,y coordinate.*/
    this.canAttack = function(x, y) {
        const actorX = _actor.getX();
        const actorY = _actor.getY();
        const attackRange = _actor.get('Combat').getAttackRange();
        const getDist = RG.shortestDist(x, y, actorX, actorY);
        if (getDist <= attackRange) {return true;}
        return false;
    };

    /* Given a list of cells, returns a cell with an enemy in it or null.*/
    this.findEnemyCell = function(seenCells) {
        for (let i = 0, iMax = seenCells.length; i < iMax; i++) {
            if (seenCells[i].hasProp('actors')) {
                const actors = seenCells[i].getProp('actors');
                if (_memory.isEnemy(actors[0])) {return seenCells[i];}
            }
        }
        return null;
    };

    /* Finds a friend cell among seen cells.*/
    this.findFriendCell = function(seenCells) {
        const memory = this.getMemory();
        for (let i = 0, iMax = seenCells.length; i < iMax; i++) {
            if (seenCells[i].hasProp('actors')) {
                const actors = seenCells[i].getProp('actors');
                if (actors[0] !== _actor) { // Exclude itself
                    if (!memory.isEnemy(actors[0])) {return seenCells[i];}
                }
            }
        }
        return null;
    };

    /* Flees from the given cell or explores randomly if cannot. */
    this.fleeFromCell = function(cell, seenCells) {
        const x = cell.getX();
        const y = cell.getY();
        const thisX = _actor.getX();
        const thisY = _actor.getY();
        const deltaX = x - thisX;
        const deltaY = y - thisY;
        // delta determines the direction to flee
        const newX = thisX - deltaX;
        const newY = thisY - deltaY;
        if (_actor.getLevel().getMap().hasXY(newX, newY)) {
            const newCell = _actor.getLevel().getMap().getCell(newX, newY);
            if (newCell.isPassable()) {
                return this.tryToMoveTowardsCell(newCell);
            }
            else if (_actor.has('Flying') && newCell.isPassableByAir()) {
                return this.tryToMoveTowardsCell(newCell);
            }
        }
        return this.exploreLevel(seenCells);
    };

    /* Returns shortest path from actor to the given cell. Resulting cells are
     * returned in order: closest to the actor first. Thus moving to the
     * next cell can be done by taking the first returned cell.*/
    this.getShortestPathTo = function(cell) {
        const path = [];
        const toX = cell.getX();
        const toY = cell.getY();
        const pathFinder = new ROT.Path.AStar(toX, toY, _passableCallback);
        const map = _actor.getLevel().getMap();
        const sourceX = _actor.getX();
        const sourceY = _actor.getY();

        if (RG.isNullOrUndef([toX, toY, sourceX, sourceY])) {
            RG.err('Brain', 'getShortestPathTo', 'Null/undef coords.');
        }

        pathFinder.compute(sourceX, sourceY, function(x, y) {
            if (map.hasXY(x, y)) {
                path.push(map.getCell(x, y));
            }
        });
        return path;
    };

    this.toJSON = function() {
        return {
            type: this.getType()
        };
    };

}; // RogueBrain

/* Brain used by most of the animals. TODO: Add some corpse eating behaviour. */
RG.Brain.Animal = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('animal');

    const _memory = this.getMemory();
    _memory.addEnemyType('player');
    _memory.addEnemyType('human');

    this.findEnemyCell = function(seenCells) {
        for (let i = 0, iMax = seenCells.length; i < iMax; i++) {
            if (seenCells[i].hasProp('actors')) {
                const actors = seenCells[i].getProp('actors');
                if (_memory.isEnemy(actors[0])) {return seenCells[i];}
            }
        }
        return null;
    };

};
RG.extend2(RG.Brain.Animal, RG.Brain.Rogue);

/* Brain used by most of the animals. TODO: Add some corpse eating behaviour. */
RG.Brain.Demon = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('demon');

    const _memory = this.getMemory();
    _memory.addEnemyType('player');
    _memory.addEnemyType('human');

    this.findEnemyCell = function(seenCells) {
        const memory = this.getMemory();
        for (let i = 0, iMax = seenCells.length; i < iMax; i++) {
            if (seenCells[i].hasProp('actors')) {
                const actors = seenCells[i].getProp('actors');
                if (memory.isEnemy(actors[0])) {return seenCells[i];}
            }
        }
        return null;
    };

};
RG.extend2(RG.Brain.Demon, RG.Brain.Rogue);

RG.Brain.Zombie = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('zombie');
};
RG.extend2(RG.Brain.Zombie, RG.Brain.Rogue);

/* Brain object used by Undead. */
RG.Brain.Undead = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('undead');

    const _memory = this.getMemory();
    _memory.addEnemyType('player');
    _memory.addEnemyType('human');
    _memory.addEnemyType('dwarf');
};
RG.extend2(RG.Brain.Undead, RG.Brain.Rogue);

/* Brain used by summoners. */
RG.Brain.Summoner = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('summoner');

    const _actor = actor;
    this.numSummoned = 0;
    this.maxSummons = 20;
    this.summonProbability = 0.2;

    const _memory = this.getMemory();
    _memory.addEnemyType('player');

    this.decideNextAction = function() {
        this._seenCached = null;
        return BTree.startBehavTree(Models.Summoner.tree, _actor)[0];
    };

    /* Returns true if the summoner will summon on this action. */
    this.willSummon = function() {
        if (this.numSummoned === this.maxSummons) {return false;}
        const summon = RG.RAND.getUniform();
        if (summon > (1.0 - this.summonProbability)) {
            return true;
        }
        return false;
    };

    /* Tries to summon a monster to a nearby cell. Returns true if success.*/
    this.summonMonster = function() {
        const level = _actor.getLevel();
        const cellsAround = this.getFreeCellsAround();
        if (cellsAround.length > 0) {
            const freeX = cellsAround[0].getX();
            const freeY = cellsAround[0].getY();
            const summoned = RG.FACT.createActor('Summoned',
                {hp: 15, att: 7, def: 7});
            summoned.get('Experience').setExpLevel(5);
            level.addActor(summoned, freeX, freeY);
            RG.gameMsg(_actor.getName() + ' summons some help');
            this.numSummoned += 1;
        }
        else {
            const txt = ' screamed an incantation but nothing happened';
            RG.gameMsg(_actor.getName() + txt);
        }
        return ACTION_ALREADY_DONE;
    };

    /* Returns all free cells around the actor owning the brain.*/
    this.getFreeCellsAround = function() {
        const cellsAround = RG.Brain.getCellsAround(_actor);
        const freeCells = [];
        for (let i = 0; i < cellsAround.length; i++) {
            if (cellsAround[i].isFree()) {freeCells.push(cellsAround[i]);}
        }
        return freeCells;
    };

};
RG.extend2(RG.Brain.Summoner, RG.Brain.Rogue);

/* This brain is used by humans who are not hostile to the player.*/
RG.Brain.Human = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('human');

    this.commProbability = 0.5;

    this.getMemory().addEnemyType('demon');

    this.willCommunicate = function() {
        const communicateOrAttack = RG.RAND.getUniform();
        const seenCells = this.getSeenCells();
        // const enemyCell = this.findEnemyCell(seenCells);
        const friendCell = this.findFriendCell(seenCells);
        const memory = this.getMemory();

        let friendActor = null;
        if (RG.isNullOrUndef([friendCell])) {
            return false;
        }
        else {
            friendActor = friendCell.getProp('actors')[0];
            if (memory.hasCommunicatedWith(friendActor)) {
                return false;
            }
            else if (friendActor.has('Communication')) {
                return false;
            }
        }

        if (communicateOrAttack < (1.0 - this.commProbability)) {
            return false;
        }
        return true;

    };

    this.decideNextAction = function() {
        this._seenCached = null;
        return BTree.startBehavTree(Models.Human.tree, actor)[0];
    };

    this.communicateEnemies = function() {
        const memory = this.getMemory();
        const enemies = memory.getEnemies();
        const seenCells = this.getSeenCells();
        const friendCell = this.findFriendCell(seenCells);
        const friendActor = friendCell.getProp('actors')[0];

        const comComp = new RG.Component.Communication();
        const msg = {type: 'Enemies', enemies, src: this.getActor()};
        comComp.addMsg(msg);

        friendActor.add('Communication', comComp);
        memory.addCommunicationWith(friendActor);
        return ACTION_ALREADY_DONE;
    };

};
RG.extend2(RG.Brain.Human, RG.Brain.Rogue);

/* Brain object used by the bearfolk. */
RG.Brain.Bearfolk = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('bearfolk');
};
RG.extend2(RG.Brain.Bearfolk, RG.Brain.Rogue);

/* Brain object used by Spirit objects.*/
RG.Brain.Spirit = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    this.setType('spirit');

    /* Returns the next action for the spirit.*/
    this.decideNextAction = function() {
        this._seenCached = null;
        const seenCells = this.getSeenCells();
        return this.exploreLevel(seenCells);
    };
};
RG.extend2(RG.Brain.Spirit, RG.Brain.Rogue);

module.exports = RG.Brain;

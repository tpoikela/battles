
const ROT = require('../../lib/rot.js');
const RG = require('./rg.js');

//---------------------------------------------------------------------------
// BRAINS {{{1
//---------------------------------------------------------------------------

RG.Brain = {};

/* Returns a list of cells in 3x3 around the actor with the brain.*/
RG.Brain.getCellsAround = function(actor) {
    var map = actor.getLevel().getMap();
    var x = actor.getX();
    var y = actor.getY();
    var cells = [];
    for (var xx = x - 1; xx <= x + 1; xx++) {
        for (var yy = y - 1; yy <= y + 1; yy++) {
            if (map.hasXY(xx, yy)) {cells.push(map.getCell(xx, yy));}
        }
    }
    return cells;
};

/* This brain is used by the player actor. It simply handles the player input
 * but by having brain, player actor looks like other actors.  */
RG.Brain.Player = function(actor) { // {{{2
    var _actor = actor;
    var _guiCallbacks = {}; // For attaching GUI callbacks

    /* For given code, adds a GUI callback. When this keycode is given, a GUI
     * callback is called instead. */
    this.addGUICallback = function(code, callback) {
        _guiCallbacks[code] = callback;
    };

    this.energy = 1; // Consumed energy per action

    var _confirmCallback = null;
    var _wantConfirm = false;
    var _confirmEnergy = 1;

    var _runModeEnabled = false;

    var _fightMode = RG.FMODE_NORMAL;

    /* Restores the base speed after run-mode.*/
    var _restoreBaseSpeed = function() {
        _runModeEnabled = false;
        // this.energy = 1;
        _actor.get('StatsMods').setSpeed(0);
    };

    this.isRunModeEnabled = function() {return _runModeEnabled;};

    this.cmdNotPossible = function(msg) {
        this.energy = 0;
        RG.gameWarn(msg);
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

        var code = obj.code;

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
        var level = _actor.getLevel();
        var x = _actor.getX();
        var y = _actor.getY();
        var currMap = level.getMap();
        var currCell = currMap.getCell(x, y);

        // For digging through item stack on curr cell
        if (RG.KeyMap.isNextItem(code)) {
            this.getNextItemOnTop(currCell);
            return this.noAction();
        }

        var type = 'NULL';
        if (RG.KeyMap.inMoveCodeMap(code)) {
            var diffXY = RG.KeyMap.getDiff(code, x, y);
            x = diffXY[0];
            y = diffXY[1];
            type = 'MOVE';
        }
        else {
            _restoreBaseSpeed(); // Speedup only during move
        }

        if (type === 'NULL') { // Not a move command
            this.resetBoosts();

            if (RG.KeyMap.isRest(code)) {type = 'REST';}

            if (RG.KeyMap.isPickup(code)) {
                type = 'PICKUP';
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
                type = 'STAIRS';
                if (currCell.hasStairs()) {
                    return function() {level.useStairs(_actor);};
                }
                else {
                    return this.cmdNotPossible('There are no stairs here.');
                }
            }

            if (RG.KeyMap.isToggleDoor(code)) {
                return this.tryToToggleDoor();
            }
        }

        if (type === 'MOVE') {
            if (currMap.hasXY(x, y)) {
                if (currMap.isPassable(x, y)) {

                    if (_runModeEnabled) {this.energy = RG.energy.RUN;}
                    else {
                        this.resetBoosts();
                        this.energy = RG.energy.MOVE;
                    }

                    return function() {
                        var movComp = new RG.Component.Movement(x, y, level);
                        _actor.add('Movement', movComp);
                    };
                }
                else if (currMap.getCell(x, y).hasProp('actors')) {
                    _restoreBaseSpeed();
                    var target = _getAttackTarget(currMap, x, y);

                    if (target === null) {
                        RG.err('Brain.Player', 'decideNextAction',
                            'Null target for attack x,y: ' + x + ',' + y);
                    }

                    var attackCallback = function() {
                        _setAttackStats();
                        var attackComp = new RG.Component.Attack(target);
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
                    return this.cmdNotPossible('You cannot venture there.');
                }
            }
            else {
                // TODO add moving out of the map
                return this.cmdNotPossible('You cannot move that way.');
            }
        }
        else if (type === 'REST') {
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
            var baseSpeed = _actor.get('Stats').getSpeed();
            var speedBoost = Math.floor( 0.5 * baseSpeed);
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
            var items = cell.getProp('items');
            if (items.length > 1) {
                var firstItem = items.shift();
                items.push(firstItem);
                let name = items[0].getName();
                RG.gameMsg('You see now ' + name + ' on top of the heap.');
            }
            else {
                let name = items[0].getName();
                RG.gameMsg('You see only ' + name + ' here');
            }
        }
        else {
            RG.gameMsg('There are no items here to look through');
        }
    };


    /* Creates the callback for buying an item, and sets up the confirmation
     * request from player.*/
    var _createBuyConfirmCallback = function(currCell) {
        var topItem = currCell.getProp('items')[0];
        var shopElem = currCell.getPropType('shop')[0];
        var nCoins = shopElem.getItemPriceForBuying(topItem);

        var buyItemCallback = function() {
            shopElem.buyItem(topItem, _actor);
        };

        _confirmEnergy = 0;
        _wantConfirm = true;
        _confirmCallback = buyItemCallback;
        RG.gameMsg("Press 'y' to buy " + topItem.getName() + ' for ' +
            nCoins + ' gold coins');
    };

    /* Sets the stats for attack for special modes.*/
    var _setAttackStats = function() {
        var stats = _actor.get('Stats');
        var combat = _actor.get('Combat');
        var speedBoost = 0;
        var attackBoost = 0;
        var damageBoost = 0;

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
            var invEq = _actor.getInvEq();
            var missile = invEq.unequipAndGetItem('missile', 1);
            if (!RG.isNullOrUndef([missile])) {
                if (!RG.isNullOrUndef([obj.target])) {
                    var x = obj.target.getX();
                    var y = obj.target.getY();
                    var mComp = new RG.Component.Missile(_actor);
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
                var item = obj.item;
                if (item.hasOwnProperty('useItem')) {
                    this.energy = RG.energy.USE;
                    item.useItem({target: obj.target});
                }
                else {
                    return this.cmdNotPossible('You cannot use that item.');
                }
            }
            else {
                RG.err('Brain.Player', 'handleCommand', 'obj has no item');
            }
        }
        return function() {};
    };

    // Not used to store anything, used only to map setters to components
    var _statBoosts = {
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
        for (var compName in _statBoosts) {
            if (compName) {
                var setters = _statBoosts[compName];
                for (var setFunc in setters) {
                    if (setFunc) {
                        var baseStatVal = setters[setFunc];
                        _actor.get(compName)[setFunc](baseStatVal);
                    }
                }
            }
        }
    };

    /* Returns possible target for attack, or null if none are found.*/
    var _getAttackTarget = function(map, x, y) {
        var targets = map.getCell(x, y).getProp('actors');
        for (var i = 0; i < targets.length; i++) {
            if (!targets[i].has('Ethereal')) {return targets[i];}
        }
        return null;
    };


    /* Tries to open/close a door nearby the player.*/
    this.tryToToggleDoor = function() {
        var cellsAround = RG.Brain.getCellsAround(_actor);
        for (var i = 0; i < cellsAround.length; i++) {
            if (cellsAround[i].hasDoor()) {
                var door = cellsAround[i].getPropType('door')[0];
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

}; // }}} Brain.Player

/* Memory is used by the actor to hold information about enemies, items etc.
 * It's a separate object from decision-making brain.*/
RG.Brain.Memory = function() {

    var _enemies = []; // List of enemies for this actor
    var _enemyTypes = []; // List of enemy types for this actor
    var _communications = [];

    // TODO add memory of player closing a door/using stairs

    this.addEnemyType = function(type) {_enemyTypes.push(type);};

    /* Checks if given actor is an enemy. */
    this.isEnemy = function(actor) {
        var index = _enemies.indexOf(actor);
        if (index !== -1) {return true;}
        var type = actor.getType();
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
        var index = _communications.indexOf(actor);
        return index !== -1;
    };

};

/* Brain is used by the AI to perform and decide on actions. Brain returns
 * actionable callbacks but doesn't know Action objects.  */
RG.Brain.Rogue = function(actor) { // {{{2

    var _actor = actor; // Owner of the brain
    var _explored = {}; // Memory of explored cells

    var _memory = new RG.Brain.Memory(this);

    this.getMemory = function() {return _memory;};

    this.setActor = function(actor) {_actor = actor;};
    this.getActor = function() {return _actor;};

    this.addEnemy = function(actor) {_memory.addEnemy(actor);};

    var _passableCallback = function(x, y) {
        var map = _actor.getLevel().getMap();
        if (!RG.isNullOrUndef([map])) {
            var res = map.isPassable(x, y);
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

    // Convenience methods (for child classes)
    this.getSeenCells = function() {
        return _actor.getLevel().getMap().getVisibleCells(_actor);
    };

    /* Main function for retrieving the actionable callback. Acting actor must
     * be passed in. */
    this.decideNextAction = function() {
        var seenCells = this.getSeenCells();
        var playerCell = this.findEnemyCell(seenCells);

        // We have found the player
        if (!RG.isNullOrUndef([playerCell])) { // Move or attack
            return this.actionTowardsEnemy(playerCell);
        }
        return this.exploreLevel(seenCells);
    };

    /* Takes action towards given enemy cell.*/
    this.actionTowardsEnemy = function(enemyCell) {
        var level = _actor.getLevel();
        var playX = enemyCell.getX();
        var playY = enemyCell.getY();
        if (this.canAttack(playX, playY)) {
            return function() {
                var cell = level.getMap().getCell(playX, playY);
                var target = cell.getProp('actors')[0];
                var attackComp = new RG.Component.Attack(target);
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
        var index = -1;
        var perms = [];
        for (var j = 0; j < seenCells.length; j++) {perms.push(j);}
        perms = perms.randomize();

        for (var i = 0, ll = perms.length; i < ll; i++) {
            var ci = perms[i];
            var cell = seenCells[ci];
            if (cell.isFree()) {
                var xy = cell.getX() + ',' + cell.getY();
                if (!_explored.hasOwnProperty(xy)) {
                    _explored[xy] = true;
                    index = ci;
                    break;
                }
            }
            else if (cell.hasDoor()) {
                var door = cell.getPropType('door')[0];
                if (door.isClosed) {door.openDoor();}
            }
        }

        if (index === -1) { // Everything explored, choose random cell
            index = Math.floor(Math.random() * (seenCells.length));
        }
        return this.tryToMoveTowardsCell(seenCells[index]);

    };

    this.tryToMoveTowardsCell = function(cell) {
        var pathCells = this.getShortestPathTo(cell);
        if (pathCells.length > 1) {
            var level = _actor.getLevel();
            var x = pathCells[1].getX();
            var y = pathCells[1].getY();
            return function() {
                var movComp = new RG.Component.Movement(x, y, level);
                _actor.add('Movement', movComp);
            };
        }
        else {
            return function() {}; // Don't move, rest
        }
    };

    /* Checks if the actor can attack given x,y coordinate.*/
    this.canAttack = function(x, y) {
        var actorX = _actor.getX();
        var actorY = _actor.getY();
        var attackRange = _actor.get('Combat').getAttackRange();
        var getDist = RG.shortestDist(x, y, actorX, actorY);
        if (getDist <= attackRange) {return true;}
        return false;
    };

    /* Given a list of cells, returns a cell with an enemy in it or null.*/
    this.findEnemyCell = function(seenCells) {
        for (var i = 0, iMax = seenCells.length; i < iMax; i++) {
            if (seenCells[i].hasProp('actors')) {
                var actors = seenCells[i].getProp('actors');
                if (_memory.isEnemy(actors[0])) {return seenCells[i];}
            }
        }
        return null;
    };

    /* Finds a friend cell among seen cells.*/
    this.findFriendCell = function(seenCells) {
        var memory = this.getMemory();
        for (var i = 0, iMax = seenCells.length; i < iMax; i++) {
            if (seenCells[i].hasProp('actors')) {
                var actors = seenCells[i].getProp('actors');
                if (actors[0] !== _actor) { // Exclude itself
                    if (!memory.isEnemy(actors[0])) {return seenCells[i];}
                }
            }
        }
        return null;
    };

    /* Returns shortest path from actor to the given cell. Resulting cells are
     * returned in order: closest to the actor first. Thus moving to next cell
     * can be done by taking the first returned cell.*/
    this.getShortestPathTo = function(cell) {

        var path = [];
        var toX = cell.getX();
        var toY = cell.getY();
        var pathFinder = new ROT.Path.AStar(toX, toY, _passableCallback);
        var map = _actor.getLevel().getMap();
        var sourceX = _actor.getX();
        var sourceY = _actor.getY();

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

}; // }}} RogueBrain

/* Brain used by most of the animals. TODO: Add some corpse eating behaviour. */
RG.Brain.Animal = function(actor) {
    RG.Brain.Rogue.call(this, actor);

    var _memory = this.getMemory();
    _memory.addEnemyType('player');
    _memory.addEnemyType('human');

    this.findEnemyCell = function(seenCells) {
        for (var i = 0, iMax = seenCells.length; i < iMax; i++) {
            if (seenCells[i].hasProp('actors')) {
                var actors = seenCells[i].getProp('actors');
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

    var _memory = this.getMemory();
    _memory.addEnemyType('player');
    _memory.addEnemyType('human');

    this.findEnemyCell = function(seenCells) {
        var memory = this.getMemory();
        for (var i = 0, iMax = seenCells.length; i < iMax; i++) {
            if (seenCells[i].hasProp('actors')) {
                var actors = seenCells[i].getProp('actors');
                if (memory.isEnemy(actors[0])) {return seenCells[i];}
            }
        }
        return null;
    };

};
RG.extend2(RG.Brain.Demon, RG.Brain.Rogue);


RG.Brain.Zombie = function(actor) {
    RG.Brain.Rogue.call(this, actor);
};
RG.extend2(RG.Brain.Zombie, RG.Brain.Rogue);

/* Brain used by summoners. */
RG.Brain.Summoner = function(actor) {
    RG.Brain.Rogue.call(this, actor);

    var _actor = actor;
    this.numSummoned = 0;
    this.maxSummons = 20;

    var _memory = this.getMemory();
    _memory.addEnemyType('player');

    this.decideNextAction = function() {
        var seenCells = this.getSeenCells();
        var playerCell = this.findEnemyCell(seenCells);

        // We have found the player
        if (!RG.isNullOrUndef([playerCell])) { // Move or attack
            if (this.summonedMonster()) {
                return function() {};
            }
            else {
                return this.actionTowardsEnemy(playerCell);
            }
        }
        return this.exploreLevel(seenCells);

    };

    /* Tries to summon a monster to a nearby cell. Returns true if success.*/
    this.summonedMonster = function() {
        if (this.numSummoned === this.maxSummons) {return false;}

        var summon = Math.random();
        if (summon > 0.8) {
            var level = _actor.getLevel();
            var cellsAround = this.getFreeCellsAround();
            if (cellsAround.length > 0) {
                var freeX = cellsAround[0].getX();
                var freeY = cellsAround[0].getY();
                var summoned = RG.FACT.createActor('Summoned',
                    {hp: 15, att: 7, def: 7});
                summoned.get('Experience').setExpLevel(5);
                level.addActor(summoned, freeX, freeY);
                RG.gameMsg(_actor.getName() + ' summons some help');
                this.numSummoned += 1;
                return true;
            }
            else {
                var txt = ' screamed incantation but nothing happened';
                RG.gameMsg(_actor.getName() + txt);
            }
        }
        return false;

    };


    /* Returns all free cells around the actor owning the brain.*/
    this.getFreeCellsAround = function() {
        var cellsAround = RG.Brain.getCellsAround(_actor);
        var freeCells = [];
        for (var i = 0; i < cellsAround.length; i++) {
            if (cellsAround[i].isFree()) {freeCells.push(cellsAround[i]);}
        }
        return freeCells;
    };

};
RG.extend2(RG.Brain.Summoner, RG.Brain.Rogue);

/* This brain is used by humans who are not hostile to the player.*/
RG.Brain.Human = function(actor) {
    RG.Brain.Rogue.call(this, actor);
    // var _actor = actor;

    this.getMemory().addEnemyType('demon');

    this.decideNextAction = function() {
        var seenCells = this.getSeenCells();
        var enemyCell = this.findEnemyCell(seenCells);
        var friendCell = this.findFriendCell(seenCells);
        var friendActor = null;
        var memory = this.getMemory();

        // If actor cannot communicate, always attack if possible
        var comOrAttack = Math.random();
        if (RG.isNullOrUndef([friendCell])) {
            comOrAttack = 1.0;
        }
        else {
            friendActor = friendCell.getProp('actors')[0];
            if (memory.hasCommunicatedWith(friendActor)) {
                comOrAttack = 1.0;
            }
        }

        // We have found the enemy, move or attack
        if (!RG.isNullOrUndef([enemyCell]) && comOrAttack > 0.5) {
            return this.actionTowardsEnemy(enemyCell);
        }
        else if (friendActor !== null) { // Communicate enemies
                if (!memory.hasCommunicatedWith(friendActor)) {
                    var comComp = new RG.Component.Communication();
                    var enemies = memory.getEnemies();
                    var msg = {type: 'Enemies', enemies: enemies};
                    comComp.addMsg(msg);
                    if (!friendActor.has('Communication')) {
                        friendActor.add('Communication', comComp);
                        memory.addCommunicationWith(friendActor);
                        return function() {};
                    }
                }
            }
        return this.exploreLevel(seenCells);

    };


};
RG.extend2(RG.Brain.Human, RG.Brain.Rogue);

/* Brain object used by Spirit objects.*/
RG.Brain.Spirit = function(actor) {
    RG.Brain.Rogue.call(this, actor);

    /* Returns the next action for the spirit.*/
    this.decideNextAction = function() {
        var seenCells = this.getSeenCells();
        return this.exploreLevel(seenCells);
    };
};
RG.extend2(RG.Brain.Spirit, RG.Brain.Rogue);

// }}} BRAINS

module.exports = RG.Brain;

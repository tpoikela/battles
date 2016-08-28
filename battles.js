/*
 * Contains the main object "RoguelikeGame", the top-level game object.
 */

function getSource(keys, fname) {
    var has_require = typeof require !== 'undefined';

    if (typeof window !== 'undefined') {
        if (typeof keys === "object") {
            if (keys.length === 1)
                var src = window[keys[0]];
            else if (keys.length === 2)
                var src = window[keys[0]][keys[1]];
            else if (keys.length === 3)
                var src = window[keys[0]][keys[1]][keys[2]];
        }
        else {
            var src = window[keys];
        }
    }

    if (typeof src === 'undefined' ) {
        if (has_require) {
          src = require(fname);
        }
        else throw new Error('Module ' + keys + ' not found');
    }

    return src;
};

var ROT = getSource("ROT", "./lib/rot.js");
var RG  = getSource("RG", "./src/rg.js");
RG.Object = getSource(["RG", "Object"], "./src/object.js");
RG.Item = getSource(["RG","Item"], "./src/item.js");
RG.Component = getSource(["RG", "Component"], "./src/component.js");
RG.System = getSource(["RG", "System"], "./src/system.js");
RG.Brain = getSource(["RG", "Brain"], "./src/brain.js");

/** Object for the game levels. Contains map, actors and items.  */
RG.RogueLevel = function(cols, rows) { // {{{2
    var _map = null;

    // Assign unique ID for each level
    var _id = RG.RogueLevel.prototype.idCount++;

    // Level properties
    var _p = {
        actors: [],
        items:  [],
        elements: [],
        stairs: [],
    };

    var _levelNo = 0;
    this.setLevelNumber = function(no) {_levelNo = no;};
    this.getLevelNumber = function() {return _levelNo;};

    this.getID = function() {return _id;};

    this.getActors = function() {return _p.actors;};

    this.setMap = function(map) {_map = map;};
    this.getMap = function() {return _map;};

    /** Given a level, returns stairs which lead to that level.*/
    this.getStairs = function(level) {
        for (var i = 0; i < _p.stairs.length; i++) {
            if (_p.stairs[i].getTargetLevel() === level) {
                return _p.stairs[i];
            }
        }
    };

    //---------------------------------------------------------------------
    // STAIRS RELATED FUNCTIONS
    //---------------------------------------------------------------------

    /** Adds stairs for this level.*/
    this.addStairs = function(stairs, x, y) {
        stairs.setX(x);
        stairs.setY(y);
        if (stairs.getSrcLevel() !== this) stairs.setSrcLevel(this);
        _map.setProp(x, y, "elements", stairs);
        _p.elements.push(stairs);
        _p.stairs.push(stairs);
    };

    /** Uses stairs for given actor if it's on top of the stairs.*/
    this.useStairs = function(actor) {
        var cell = _map.getCell(actor.getX(), actor.getY());
        if (cell.hasStairs()) {
            var stairs = cell.getStairs();
            if (stairs.useStairs(actor)) {
                return true;
            }
            else {
                RG.err("Level", "useStairs", "Failed to use the stairs.");
            }
        }
        return false;
    };

    //---------------------------------------------------------------------
    // ITEM RELATED FUNCTIONS
    //---------------------------------------------------------------------

    this.addItem = function(item, x, y) {
        if (!RG.isNullOrUndef([x, y])) {
            return this._addPropToLevelXY(RG.TYPE_ITEM, item, x, y);
        }
        else {
            var freeCells = _map.getFree();
            if (freeCells.length > 0) {
                var xCell = freeCells[0].getX();
                var yCell = freeCells[0].getY();
                return this._addPropToLevelXY(RG.TYPE_ITEM, item, xCell, yCell);
            }

        }
        return false;
    };

    this.removeItem = function(item, x, y) {
        return _map.removeProp(x, y, RG.TYPE_ITEM, item);
    };

    this.pickupItem = function(actor, x, y) {
        var cell = _map.getCell(x, y);
        if (cell.hasProp(RG.TYPE_ITEM)) {
            var item = cell.getProp(RG.TYPE_ITEM)[0];
            actor.getInvEq().addItem(item);
            cell.removeProp(RG.TYPE_ITEM, item);
            RG.gameMsg(actor.getName() + " picked up " + item.getName());
        }
        else {
            RG.gameMsg("Nothing to pickup");
        }
    };

    //---------------------------------------------------------------------
    // ACTOR RELATED FUNCTIONS
    //---------------------------------------------------------------------

    /** Adds an actor to the level. If x,y is given, tries to add there. If not,
     * finds first free cells and adds there. Returns true on success.
     */
    this.addActor = function(actor, x, y) {
        RG.debug(this, "addActor called with x,y " + x + ", " + y);
        if (!RG.isNullOrUndef([x, y])) {
            if (_map.hasXY(x, y)) {
                this._addPropToLevelXY("actors", actor, x, y);
                RG.debug(this, "Added actor to map x: " + x + " y: " + y);
                return true;
            }
            else {
                RG.err("Level", "addActor", "No coordinates " + x + ", " + y + " in the map.");
                return false;
            }
        }
        else {
            RG.nullOrUndefError(this, "arg |x|", x);
            RG.nullOrUndefError(this, "arg |y|", y);
            return false;
        }
    };

    /** USing this method, actor can be added to a free cell without knowing the
     * exact x,y coordinates.*/
    this.addActorToFreeCell = function(actor) {
        RG.debug(this, "Adding actor to free slot");
        var freeCells = _map.getFree();
        if (freeCells.length > 0) {
            var xCell = freeCells[0].getX();
            var yCell = freeCells[0].getY();
            if (this._addPropToLevelXY("actors", actor, xCell, yCell)) {
                RG.debug(this, "Added actor to free cell in " + xCell + ", " + yCell);
                return true;
            }
        }
        else {
            RG.err("Level", "addActor", "No free cells for the actor.");
        }
        return false;
    };

    /** Adds a prop to level to location x,y. Returns true on success, false on
     * failure.*/
    this._addPropToLevelXY = function(propType, obj, x, y) {
        if (_p.hasOwnProperty(propType)) {
            _p[propType].push(obj);
            if (obj.hasOwnProperty("setXY")) {
                obj.setXY(x,y);
                obj.setLevel(this);
            }
            _map.setProp(x, y, propType, obj);
            RG.POOL.emitEvent(RG.EVT_LEVEL_PROP_ADDED, {level: this, obj: obj,
                propType: propType});
            return true;
        }
        else {
            RG.err("Level", "_addPropToLevelXY", "No property " + propType);
        }
        return false;
    };

    /** Removes given actor from level. Returns true if successful.*/
    this.removeActor = function(actor) {
        var index = _p.actors.indexOf(actor);
        var x = actor.getX();
        var y = actor.getY();
        if (_map.removeProp(x, y, "actors", actor)) {
            _p.actors.splice(index, 1);
            return true;
        }
        else {
            return false;
        }
    };

    /** Explores the level from given actor's viewpoint. Sets new cells as
     * explored. There's no exploration tracking per actor.*/
    this.exploreCells = function(actor) {
        var visibleCells = _map.getVisibleCells(actor);
        if (actor.isPlayer()) {
            for (var i = 0; i < visibleCells.length; i++) {
                visibleCells[i].setExplored();
            }
        }
        return visibleCells;
    };

    /** Returns all explored cells in the map.*/
    this.getExploredCells = function() {
        return _map.getExploredCells();
    };

    //---------------------------------------------------------------------------
    // CALLBACKS
    //---------------------------------------------------------------------------
    var _callbacks = {};

    // For setting the callbacks
    this.setOnEnter = function(cb) {_callbacks.OnEnter = cb;};
    this.setOnFirstEnter = function(cb) {_callbacks.OnFirstEnter = cb;};
    this.setOnExit = function(cb) {_callbacks.OnExit = cb;};
    this.setOnFirstExit = function(cb) {_callbacks.OnFirstExit = cb;};

    var _onFirstEnterDone = false;
    var _onFirstExitDone = false;

    this.onEnter = function() {
        if (_callbacks.hasOwnProperty("OnEnter")) _callbacks.OnEnter(this);
    };

    this.onFirstEnter = function() {
        if (!_onFirstEnterDone) {
            if (_callbacks.hasOwnProperty("OnFirstEnter")) 
                _callbacks.OnFirstEnter(this);
            _onFirstEnterDone = true;
        }
    };

    this.onExit = function() {
        if (_callbacks.hasOwnProperty("OnExit")) _callbacks.OnExit(this);
    };

    this.onFirstExit = function() {
        if (!_onFirstExitDone) {
            if (_callbacks.hasOwnProperty("OnFirstExit")) 
                _callbacks.OnFirstExit(this);
            _onFirstExitDone = true;
        }
    };

}; // }}} Level
RG.RogueLevel.prototype.idCount = 0;



//---------------------------------------------------------------------------
// EQUIPMENT AND INVENTORY
//---------------------------------------------------------------------------

/** Models one slot in the inventory. */
RG.RogueEquipSlot = function(eq, type, stacked) {
    RG.Object.Ownable.call(this, eq);
    var _eq = eq;
    var _type = type;
    var _item = null;

    var _hasItem = false;

    var _unequipped = null;

    var _stacked = false;
    if (!RG.isNullOrUndef([stacked])) _stacked = stacked;

    this.isStacked = function() {return _stacked;};

    this.getUnequipped = function() {
        return _unequipped;
    };

    /** Returns the equipped item for this slot.*/
    this.getItem = function() {
        if (_hasItem) return _item;
        //console.log("Slot: " + _type + " Returning null");
        return null;
    };

    /** Equips given item to first available place in slot.*/
    this.equipItem = function(item) {
        if (this.canEquip(item)) {
            if (!_stacked || !_hasItem) {
                item.setOwner(this);
                _item = item;
                _hasItem = true;
            }
            else {
                if (RG.addStackedItems(_item, item)) {
                    _hasItem = true;
                }
            }
            return _hasItem;
        }
        return false;
    };

    /** Unequips N items from the slot. */
    this.unequipItem = function(n) {
        if (_hasItem) {
            if (!_stacked) {
                _hasItem = false;
                _unequipped = _item;
                return true;
            }
            else {
                if (n > 0) {
                    _unequipped = RG.removeStackedItems(_item, n);
                    if (_item.count === 0) _hasItem = false;
                    return true;
                }
            }
        }
        return false;
    };

    this.canEquip = function(item) {
        if (!_hasItem) {
            return true;
        }
        else if (_stacked) { // Can only equip same items to the stack
            return item.equals(_item);
        }
        return false;
    };

};
RG.extend2(RG.RogueEquipSlot, RG.Object.Ownable);

/** Models equipment on an actor.*/
RG.RogueEquipment = function(actor) {
    RG.Object.Ownable.call(this, actor);

    var _equipped = [];

    var _slots = {
        hand: new RG.RogueEquipSlot(this, "hand"),
        head: new RG.RogueEquipSlot(this, "head"),
        chest: new RG.RogueEquipSlot(this, "chest"),
        neck: new RG.RogueEquipSlot(this, "neck"),
        feet: new RG.RogueEquipSlot(this, "feet"),
        missile: new RG.RogueEquipSlot(this, "missile", true),
        spirit: new RG.RogueEquipSlot(this, "spirit"),
    };

    var _hasSlot = function(slotType) {
        return _slots.hasOwnProperty(slotType);
    };

    this.getSlotTypes = function() {return Object.keys(_slots);};

    /** Returns last unequipped item for the slot.*/
    this.getUnequipped = function(slotType) {
        if (_hasSlot(slotType)) {
            return _slots[slotType].getUnequipped();
        }
        else {
            RG.err("Equipment", "getUnequipped", 
                "No slot type: " + slotType);
        }
        return null;
    };

    /** Returns an item in the given slot.*/
    this.getItem = function(slot) {
        if (_slots.hasOwnProperty(slot)) {
            return _slots[slot].getItem();
        }
        return null;
    };

    /** Equips given item. Slot is chosen automatically from suitable available
     * ones.*/
    this.equipItem = function(item) {
        if (item.hasOwnProperty("getArmourType")) {
            console.log("Equipping armour " + item.getArmourType());
            if (_slots[item.getArmourType()].equipItem(item)) {
                _equipped.push(item);
                return true;
            }
        }
        else { // No equip property, can only equip to hand
            if (item.getType() === "missile") {
                if (_slots.missile.equipItem(item)) {
                    _addStackedItem(item);
                    return true;
                }
            }
            else if (_slots.hand.equipItem(item)) {
                _equipped.push(item);
                return true;
            }
        }
        return false;
    };

    var _addStackedItem = function(item) {
        var matchFound = false;
        for (var i = 0; i < _equipped.length; i++) {
            if (_equipped[i].equals(item)) {
                console.log("_addStackedItem1 " + _equipped[i].count);
                console.log("_addStackedItem2 " + item.count);
                //RG.addStackedItems(_equipped[i], item);
                matchFound = true;
                break;
            }
        }
        if (!matchFound) _equipped.push(item);
    };

    /** Removes an item, or n items if specified.*/
    var _removeItem = function(item, n) {
        var index = _equipped.indexOf(item);
        if (index >= 0) {
            if (n > 0) {
                if (_equipped[index].hasOwnProperty("count")) {
                    if (_equipped[index].count === 0) _equipped.splice(index, 1);
                }
                return true;
            }
            else {
                _equipped.splice(index, 1);
                return true;
            }
        }
        else {
            RG.err("Equipment", "unequipItem", "Index < 0. Horribly wrong.");
        }
        return false;
    };

    /** Returns true if given item is equipped.*/
    this.isEquipped = function(item) {
        var index = _equipped.indexOf(item);
        return index !== -1;
    };

    this.getEquipped = function(slotType) {
        return this.getItem(slotType);
    };

    /** Unequips given slotType and index. */
    this.unequipItem = function(slotType, n) {
        if (_hasSlot(slotType)) {
            var item = _slots[slotType].getItem();
            if (_slots[slotType].unequipItem(n)) {
                return _removeItem(item, n);
            }
        }
        else {
            var msg = "Non-existing slot type " + slotType;
            RG.err("Equipment", "unequipItem", msg);
        }
        return false;
    };

    this.propertySum = function(funcname) {
        var result = 0;
        for (var slot in _slots) {
            var item = this.getItem(slot);
            if (item !== null) {
                if (item.hasOwnProperty(funcname)) {
                    result += item[funcname]();
                }
                else if (item.has("Stats")) {
                    var sComp = item.get("Stats");
                    if (sComp.hasOwnProperty(funcname)) {
                        result += sComp[funcname]();
                    }
                }
            }
        }
        return result;
    };

    // Dynamically generated accessors for different stats
    var _mods = ["getDefense", "getAttack", "getProtection", "getSpeed", "getWillpower",
        "getAccuracy", "getAgility", "getStrength"];

    var that = this;
    for (var i = 0; i < _mods.length; i++) {

        // Use closure to fix the function name
        var getFunc = function() {
            var privVar = _mods[i];
            return function() {
                return that.propertySum(privVar);
            };

        };

        this[_mods[i]] = getFunc();
    }

};
RG.extend2(RG.RogueEquipment, RG.Object.Ownable);

/** Object models inventory items and equipment on actor. This object handles
 * movement of items between inventory and equipment. */
RG.RogueInvAndEquip = function(actor) {
    RG.Object.Ownable.call(this, actor);
    var _actor = actor;

    var _inv = new RG.Item.Container(actor);
    var _eq  = new RG.RogueEquipment(actor);

    // Wrappers for container methods
    this.addItem = function(item) {_inv.addItem(item);};
    this.hasItem = function(item) {return _inv.hasItem(item);};
    this.removeItem = function(item) {return _inv.removeItem(item);};

    this.removeNItems = function(item, n) {
        return _inv.removeNItems(item, n);
    };

    this.getRemovedItem = function() {return _inv.getRemovedItem();};

    this.useItem = function(item, obj) {
        if (_inv.hasItem(item)) {
            if (item.hasOwnProperty("useItem")) {
                item.useItem(obj);
                return true;
            }
        }
        else {
            RG.err("InvAndEquip", "useItem", "Not in inventory, cannot use!");
        }
        return false;
    };

    /** Drops selected item to the actor's current location.*/
    this.dropItem = function(item) {
        if (_inv.removeItem(item)) {
            var level = _actor.getLevel();
            if (level.addItem(item, _actor.getX(), _actor.getY())) {
                return true;
            }
            else {
                _inv.addItem(item);
            }
        }
        return false;
    };

    this.getInventory = function() {return _inv;};
    this.getEquipment = function() {return _eq;};

    /** Removes item from inventory and equips it.*/
    this.equipItem = function(item) {
        if (_inv.hasItem(item)) {
            // If item has count > 2, can't use the same item ref
            var eqItem = _getItemToEquip(item);
            if (RG.isNullOrUndef[eqItem]) {
                console.log("SEEMS TO BE NULL. KOSH!");
                return false;
            }

            if (_eq.equipItem(eqItem)) {
                return true;
            }
            else {
                console.log("FAILED. Add back to inv.");
                _inv.addItem(eqItem); // Failed, add back to inv
            }
        }
        else {
            RG.err("InvAndEquip", "equipItem", "Cannot equip. Not in inventory.");
        }
        return false;
    };

    var _getItemToEquip = function(item) {
        var res = _inv.removeItem(item);
        if (res) {
            var rmvItem = _inv.getRemovedItem();
            return rmvItem;
        }
        return null;
    };

    /** Equips up to N items of given type. */
    this.equipNItems = function(item, n) {
        if (_inv.hasItem(item)) {
            var res = _inv.removeNItems(item, n);
            if (res) {
                var removedItem = _inv.getRemovedItem();
                if (_eq.equipItem(removedItem)) {
                    return true;
                }
                else {
                    _inv.addItem(removedItem);
                }
            }
        }
        return false;
    };

    /** Unequips item and puts it back to inventory.*/
    this.unequipItem = function(slotType, n) {
        var eqItem = _eq.getItem(slotType);
        if (!RG.isNullOrUndef([eqItem])) {
            if (_eq.unequipItem(slotType, n)) {
                var rmvItems = _eq.getUnequipped(slotType);
                if (rmvItems !== null) {
                    this.addItem(rmvItems);
                    return true;
                }
            }
        }
        return false;
    };

    /** Unequips and returns N items. Doesn't add to inv.*/
    this.unequipAndGetItem = function(slotType, n) {
        var eqItem = _eq.getItem(slotType);
        if (!RG.isNullOrUndef([eqItem])) {
            if (_eq.unequipItem(slotType, n)) {
                return _eq.getUnequipped(slotType);
            }
        }
        return null;
    };

    this.getWeapon = function() {
        var item = _eq.getItem("hand");
        if (!RG.isNullOrUndef([item])) return item;
        return null;
    };

    this.getEquipped = function(slotType) {
        return _eq.getItem(slotType);
    };


};
RG.extend2(RG.RogueInvAndEquip, RG.Object.Ownable);

/** Object representing a game actor who takes actions.  */
RG.RogueActor = function(name) { // {{{2
    RG.Object.Locatable.call(this);
    RG.Entity.call(this);
    this.setPropType("actors");

    // Member vars
    var _brain = new RG.Brain.Rogue(this);
    _brain.getMemory().addEnemyType("player");

    var _isPlayer = false;
    var _fovRange = RG.FOV_RANGE;
    var _name = name;
    var _invEq = new RG.RogueInvAndEquip(this);

    this.add("Action", new RG.Component.Action());
    this.add("Experience", new RG.Component.Experience());
    this.add("Combat", new RG.Component.Combat());
    this.add("Stats", new RG.Component.Stats());
    this.add("Health", new RG.Component.Health(50));

    this.setName = function(name) {_name = name;};
    this.getName = function() {return _name;};

    this.setIsPlayer = function(isPlayer) {
        _isPlayer = isPlayer;
        if (isPlayer) {
            _brain = new RG.Brain.Player(this);
        }
    };

    this.addEnemy = function(actor) {_brain.addEnemy(actor);};
    this.isEnemy = function(actor) {return _brain.getMemory().isEnemy(actor);};

    this.setBrain = function(brain) {
        _brain = brain;
        _brain.setActor(this);
    };

    /** Returns true if actor is a player.*/
    this.isPlayer = function() {
        return _isPlayer;
    };

    this.getWeapon = function() {
        return _invEq.getWeapon();
    };

    /** Returns missile equipped by the player.*/
    this.getMissile = function() {
        return _invEq.getEquipment().getItem("missile");
    };

    /** Returns the next action for this actor.*/
    this.nextAction = function(obj) {
        // Use actor brain to determine the action
        var cb = _brain.decideNextAction(obj);
        var action = null;

        if (cb !== null) {
            var speed = this.get("Stats").getSpeed();
            var duration = parseInt(RG.BASE_SPEED/speed * RG.ACTION_DUR);
            action = new RG.RogueAction(duration, cb, {});
        }
        else {
            action = new RG.RogueAction(0, function(){}, {});
        }

        if (action !== null) {
            if (_brain.hasOwnProperty("energy")) action.energy = _brain.energy;
            action.actor = this;
        }
        return action;
    };

    this.getFOVRange = function() { return _fovRange;};
    this.setFOVRange = function(range) {_fovRange = range;};

    this.getInvEq = function() {
        return _invEq;
    };

    this.getEquipAttack = function() {
        return _invEq.getEquipment().getAttack();
    };

    this.getEquipDefense = function() {
        return _invEq.getEquipment().getDefense();
    };

    this.getEquipProtection = function() {
        return _invEq.getEquipment().getProtection();
    };

};
RG.extend2(RG.RogueActor, RG.Object.Locatable);
RG.extend2(RG.RogueActor, RG.Entity);

// }}} Actor

/** Element is a wall or other obstacle or a feature in the map. It's not
 * necessarily blocking movement.  */
RG.RogueElement = function(elemType) { // {{{2
    RG.Object.Locatable.call(this);
    this.setPropType("elements");
    this.setType(elemType);

    var _elemType = elemType.toLowerCase();
    var _allowMove;

    switch(elemType) {
        case "wall": _allowMove = false; break;
        case "floor": _allowMove = true; break;
        default: _allowMove = true; break;
    }

    this.canMove = function() {
        return _allowMove;
    };

};
RG.extend2(RG.RogueElement, RG.Object.Locatable);
// }}} Element

/** Object models stairs connecting two levels. Stairs are one-way, thus
 * connecting 2 levels requires two stair objects. */
RG.RogueStairsElement = function(down, srcLevel, targetLevel) {
    if (down)
        RG.RogueElement.call(this, "stairsDown");
    else
        RG.RogueElement.call(this, "stairsUp");

    var _down = down;
    var _srcLevel = srcLevel;
    var _targetLevel = targetLevel;
    var _targetStairs = null;

    /** Target actor uses the stairs.*/
    this.useStairs = function(actor) {
        if (!RG.isNullOrUndef([_targetStairs, _targetLevel])) {
            var newLevel = _targetLevel;
            var newX = _targetStairs.getX();
            var newY = _targetStairs.getY();
            if (_srcLevel.removeActor(actor)) {
                if (_targetLevel.addActor(actor, newX, newY)) {
                    RG.POOL.emitEvent(RG.EVT_LEVEL_CHANGED,
                        {target: _targetLevel, src: _srcLevel, actor: actor});
                    RG.POOL.emitEvent(RG.EVT_LEVEL_ENTERED, {actor: actor, target:
                        targetLevel});
                    return true;
                }
            }
        }
        return false;
    };

    this.isDown = function() {return _down;};

    this.getSrcLevel = function() {return _srcLevel; };
    this.setSrcLevel = function(src) {_srcLevel = src;};

    this.getTargetLevel = function() {return _targetLevel; };
    this.setTargetLevel = function(target) {_targetLevel = target;};

    this.setTargetStairs = function(stairs) {_targetStairs = stairs;};
    this.getTargetStairs = function() {return _targetStairs;};

};
RG.extend2(RG.RogueStairsElement, RG.RogueElement);

/** Models an action. Each action has a duration and a callback.  */
RG.RogueAction = function(dur, cb, obj) { // {{{2

    var _duration = dur;
    var _cb = cb; // Action callback
    var _energy = 0;

    this.setEnergy = function(en) {_energy = en;};
    this.getEnergy = function() {return _energy;};


    this.getDuration = function() {
        return _duration;
    };

    this.doAction = function() {
        _cb(obj);
    };

}; // }}} Action





//---------------------------------------------------------------------------
// GAME EVENTS
//---------------------------------------------------------------------------

/** Event is something that is scheduled and takes place but it's not an actor.
 * An example is regeneration or poison effect.*/
RG.RogueGameEvent = function(dur, cb, repeat, offset) {

    var _cb = cb;
    var _repeat = repeat;
    var _nTimes = 1;
    var _offset = offset;

    var _level = null; // Level associated with the event, if null, global

    this.isEvent = true; // Needed for the scheduler

    /** Clunky for events, but must implement for the scheduler.*/
    this.isPlayer = function(){return false;};

    this.nextAction = function() {
        return new RG.RogueAction(dur, cb, {});
    };

    this.getRepeat = function() {return _repeat;};
    this.setRepeat = function(repeat) {_repeat = repeat;};

    this.getOffset = function() {return _offset;};
    this.setOffset = function(offset) {_offset = offset;};

    this.setLevel = function(level) {_level = level;};
    this.getLevel = function() {return _level;};

};

/** Regeneration event. Initialized with an actor. */
RG.RogueRegenEvent = function(actor, dur) {

    var _dur = dur; // Duration between events

    var _regenerate = function() {
        var maxHP = actor.get("Health").getMaxHP();
        var hp = actor.get("Health").getHP();
        hp += 1;
        if (hp <= maxHP) {
            actor.get("Health").setHP(hp);
            RG.gameSuccess(actor.getName() + " regenerates 1 HP");
        }
    };

    RG.RogueGameEvent.call(this, _dur, _regenerate, true);
};
RG.extend2(RG.RogueRegenEvent, RG.RogueGameEvent);

/** Event that is executed once after an offset.*/
RG.RogueOneShotEvent = function(cb, offset, msg) {

    // Wraps the callback into function and emits a message
    var _cb = function() {
        if (!RG.isNullOrUndef([msg])) {
            RG.gameMsg(msg);
        }
        cb();
    };

    RG.RogueGameEvent.call(this, 0, _cb, false, offset);
};
RG.extend2(RG.RogueOneShotEvent, RG.RogueGameEvent);


/** Scheduler for the game actions.  */
RG.RogueScheduler = function() { // {{{2

    // Internally use ROT scheduler
    var _scheduler = new ROT.Scheduler.Action();

    // Store the scheduled events
    var _events = [];
    var _actors = [];

    /** Adds an actor or event to the scheduler.*/
    this.add = function(actOrEvent, repeat, offset) {
        _scheduler.add(actOrEvent, repeat, offset);
        if (actOrEvent.hasOwnProperty("isEvent")) {
            _events.push(actOrEvent);

        }
        else {
            _actors.push(actOrEvent);
        }
    };

    // Returns next actor/event or null if no next actor exists.
    this.next = function() {
        return _scheduler.next();
    };

    /** Must be called after next() to re-schedule next slot for the
     * actor/event.*/
    this.setAction = function(action) {
        _scheduler.setDuration(action.getDuration());
    };

    /** Tries to remove an actor/event, Return true if success.*/
    this.remove = function(actOrEvent) {
        if (actOrEvent.hasOwnProperty("isEvent")) {
            return this.removeEvent(actOrEvent);
        }
        else {
            var index = _actors.indexOf(actOrEvent);
            if (index !== -1) _events.splice(index, 1);
        }
        return _scheduler.remove(actOrEvent);
    };

    /** Removes an event from the scheduler. Returns true on success.*/
    this.removeEvent = function(actOrEvent) {
        var index = - 1;
        if (actOrEvent.hasOwnProperty("isEvent")) {
            index = _events.indexOf(actOrEvent);
            if (index !== -1) _events.splice(index, 1);
        }
        return _scheduler.remove(actOrEvent);

    };

    this.getTime = function() {
        return _scheduler.getTime();
    };

    /** Hooks to the event system. When an actor is killed, removes it from the
     * scheduler.*/
    this.notify = function(evtName, args) {
        if (evtName === RG.EVT_ACTOR_KILLED) {
            if (args.hasOwnProperty("actor")) {
                this.remove(args.actor);
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);


}; // }}} Scheduler


//---------------------------------------------------------------------------
// MAP GENERATION SECTION {{{1
//---------------------------------------------------------------------------

/** Map generator for the roguelike game.  */
RG.RogueMapGen = function() { // {{{2

    this.cols = 50;
    this.rows = 30;
    var _mapGen = new ROT.Map.Arena(50, 30);

    var _types = ["arena", "cellular", "digger", "divided", "dungeon",
        "eller", "icey", "uniform", "rogue", "ruins", "rooms"];

    var _wall = 1;

    this.getRandType = function() {
        var len = _types.length;
        var nRand = Math.floor(Math.random() * len);
        return _types[nrand];
    };

    var _nHouses = 5;
    this.setNHouses = function(nHouses) {_nHouses = nHouses;};

    /** Sets the generator for room generation.*/
    this.setGen = function(type, cols, rows) {
        this.cols = cols;
        this.rows = rows;
        type = type.toLowerCase();
        switch(type) {
            case "arena":  _mapGen = new ROT.Map.Arena(cols, rows); break;
            case "cellular":  _mapGen = this.createCellular(cols, rows); break;
            case "digger":  _mapGen = new ROT.Map.Digger(cols, rows); break;
            case "divided":  _mapGen = new ROT.Map.DividedMaze(cols, rows); break;
            case "dungeon":  _mapGen = new ROT.Map.Dungeon(cols, rows); break;
            case "eller":  _mapGen = new ROT.Map.EllerMaze(cols, rows); break;
            case "icey":  _mapGen = new ROT.Map.IceyMaze(cols, rows); break;
            case "rogue":  _mapGen = new ROT.Map.Rogue(cols, rows); break;
            case "uniform":  _mapGen = new ROT.Map.Uniform(cols, rows); break;
            case "ruins": _mapGen = this.createRuins(cols, rows); break;
            case "rooms": _mapGen = this.createRooms(cols, rows); break;
            default: RG.err("MapGen", "setGen", "_mapGen type " + type + " is unknown");
        }
    };

    /** Returns a randomized map based on initialized generator settings.*/
    this.getMap = function() {
        var map = new RG.Map(this.cols, this.rows);
        _mapGen.create(function(x, y, val) {
            if (val === _wall) {
                map.setBaseElemXY(x, y, new RG.RogueElement("wall"));
            }
            else {
                map.setBaseElemXY(x, y, new RG.RogueElement("floor"));
            }
        });
        return map;
    };

    /** Creates "ruins" type level with open outer edges and inner fortress with
     * some tunnels. */
    this.createRuins = function(cols, rows) {
        var conf = {born: [4, 5, 6, 7, 8],
            survive: [2, 3, 4, 5], connected: true};
        var map = new ROT.Map.Cellular(cols, rows, conf);
        map.randomize(0.9);
        for (var i = 0; i < 5; i++) map.create();
        map.connect(null, 1);
        _wall = 0;
        return map;
    };

    /** Creates a cellular type dungeon and makes all areas connected.*/
    this.createCellular = function(cols, rows, gens) {
        var map = new ROT.Map.Cellular(cols, rows);
        map.randomize(0.5);
        for (var i = 0; i < 5; i++) map.create();
        map.connect(null, 1);
        _wall = 0;
        return map;
    };

    this.createRooms = function(cols, rows) {
        var map = new ROT.Map.Digger(cols, rows,
            {roomWidth: [5, 20], dugPercentage: 0.7});
        return map;
    };

    /** Creates a town level of size cols X rows. */
    this.createTown = function(cols, rows, conf) {
        var maxTriesHouse = 100;
        var doors = {};
        var wallsHalos = {};

        var nHouses = 5;
        var minX = 5;
        var maxX = 5;
        var minY = 5;
        var maxY = 5;

        if (conf.hasOwnProperty("nHouses")) nHouses = conf.nHouses;
        if (conf.hasOwnProperty("minHouseX")) minX = conf.minHouseX;
        if (conf.hasOwnProperty("minHouseY")) minY = conf.minHouseY;
        if (conf.hasOwnProperty("maxHouseX")) maxX = conf.maxHouseX;
        if (conf.hasOwnProperty("maxHouseY")) maxY = conf.maxHouseY;

        this.setGen("arena", cols, rows);
        var map = this.getMap();
        for (var i = 0; i < nHouses; i++) {

            var houseCreated = false;
            var tries = 0;
            var xSize = Math.floor(Math.random() * (maxX - minX)) + minX;
            var ySize = Math.floor(Math.random() * (maxY - minY)) + minY;

            while (!houseCreated && tries < maxTriesHouse) {
                var x0 = Math.floor(Math.random() * cols);
                var y0 = Math.floor(Math.random() * rows);
                houseCreated = this.createHouse(map, x0, y0, xSize, ySize, doors, wallsHalos);
                ++tries;
            }

        }
        return map;
    };

    /** Creates a house into a given map to a location x0,y0 with given
     * dimensions. Existing doors and walls must be passed to prevent
     * overlapping.*/
    this.createHouse = function(map, x0, y0, xDim, yDim, doors, wallsHalos) {
        var maxX = x0 + xDim;
        var maxY = y0 + yDim;
        var wallCoords = [];

        // House doesn't fit on the map
        if (maxX >= map.cols) return false;
        if (maxY >= map.rows) return false;

        var possibleRoom = [];
        var wallXY = RG.Geometry.getHollowBox(x0, y0, maxX, maxY);

        // Store x,y for house until failed
        for (var i = 0; i < wallXY.length; i++) {
            var x = wallXY[i][0];
            var y = wallXY[i][1];
            if (map.hasXY(x, y)) {
                if (wallsHalos.hasOwnProperty(x + "," + y)) {
                    return false;
                }
                else {
                    if (!doors.hasOwnProperty(x + "," + y)) {
                        possibleRoom.push([x, y]);
                        // Exclude map border from door generation
                        if (!map.isBorderXY(x, y)) wallCoords.push([x, y]);
                    }
                }
            }
        }

        // House generation has succeeded at this point, true will be returned

        // Didn't fail, now we can build the actual walls
        for (var i = 0; i < possibleRoom.length; i++) {
            var roomX = possibleRoom[i][0];
            var roomY = possibleRoom[i][1];
            map.setBaseElemXY(roomX, roomY, new RG.RogueElement("wall"));
        }

        // Create the halo, prevents houses being too close to each other
        var haloX0 = x0 - 1;
        var haloY0 = y0 - 1;
        var haloMaxX = maxX + 1;
        var haloMaxY = maxY + 1;
        var haloBox = RG.Geometry.getHollowBox(haloX0, haloY0, haloMaxX, haloMaxY);
        for (var i = 0; i < haloBox.length; i++) {
            var haloX = haloBox[i][0];
            var haloY = haloBox[i][1];
            wallsHalos[haloX + "," + haloY] = true;
        }

        // Finally randomly insert the door for the house
        var coordLength = wallCoords.length - 1;
        var doorIndex = Math.floor(Math.random() * coordLength);
        var doorX = wallCoords[doorIndex][0];
        var doorY = wallCoords[doorIndex][1];

        // At the moment, "door" is a hole in the wall
        map.setBaseElemXY(doorX, doorY, new RG.RogueElement("floor"));
        doors[doorX + "," + doorY] = true;

        for (var i = 0; i < wallCoords.length; i++) {
            var x = wallCoords[i][0];
            var y = wallCoords[i][1];
            wallsHalos[x + "," + y] = true;
        }
        return true;
    };

}; // }}} RogueMapGen



/** Object representing one game cell. It can hold actors, items, traps or
 * elements. */
RG.MapCell = function(x, y, elem) { // {{{2

    var _baseElem = elem;
    var _x   = x;
    var _y   = y;
    var _explored = false;

    // Cell can have different properties
    var _p = {
        items: [],
        actors   : [],
        elements : [],
        traps    : [],
    };

    this.getX = function() {return _x;};
    this.getY = function() {return _y;};

    /** Sets/gets the base element for this cell. There can be only one element.*/
    this.setBaseElem = function(elem) { _baseElem = elem; };
    this.getBaseElem = function() { return _baseElem; };

    /** Returns true if it's possible to move to this cell.*/
    this.isFree = function() {
        return _baseElem.getType() !== "wall" &&
            !this.hasProp("actors");
    };

    /** Add given obj has specified property.*/
    this.setProp = function(prop, obj) {
        if (_p.hasOwnProperty(prop)) {
            _p[prop].push(obj);
            if (obj.hasOwnProperty("setOwner")) {
                obj.setOwner(this);
            }
        }
        else {
            RG.err("MapCell", "setProp", "No property " + prop);
        }
    };

    /** Removes the given object from cell properties.*/
    this.removeProp = function(prop, obj) {
        if (this.hasProp(prop)) {
            var props = _p[prop];
            var index = props.indexOf(obj);
            if (index === -1) return false;
            _p[prop].splice(index, 1);
            return true;
        }
        return false;
    };

    this.hasProp = function(prop) {
        if (_p.hasOwnProperty(prop)) {
            return _p[prop].length > 0;
        }
        return false;
    };

    this.hasStairs = function() {
        return this.hasPropType("stairsUp") || this.hasPropType("stairsDown");
    };

    this.getStairs = function() {
        if (this.hasPropType("stairsUp")) return this.getPropType("stairsUp")[0];
        if (this.hasPropType("stairsDown")) return this.getPropType("stairsDown")[0];
    };

    /** Returns true if any cell property has the given type. Ie.
     * myCell.hasPropType("wall"). Doesn't check for basic props like "actors",
     * RG.TYPE_ITEM etc.
     */
    this.hasPropType = function(propType) {
        if (_baseElem.getType() === propType) return true;

        for (var prop in _p) {
            var arrProps = _p[prop];
            for (var i = 0; i < arrProps.length; i++) {
                if (arrProps[i].getType() === propType) {
                    return true;
                }
            }
        }
        return false;
    };

    /** Returns all props with given type in the cell.*/
    this.getPropType = function(propType) {
        var props = [];
        if (_baseElem.getType() === propType) return [_baseElem];
        for (var prop in _p) {
            var arrProps = _p[prop];
            for (var i = 0; i < arrProps.length; i++) {
                if (arrProps[i].getType() === propType) {
                    props.push(arrProps[i]);
                }
            }
        }
        return props;
    };

    this.getProp = function(prop) {
        if (_p.hasOwnProperty(prop)) {
            return _p[prop];
        }
        return null;
    };

    /** Returns true if light passes through this map cell.*/
    this.lightPasses = function() {
        if (_baseElem.getType() === "wall") return false;
        return true;
    };

    this.isPassable = function() {
        return this.isFree();
    };

    this.setExplored = function() {
        _explored = true;
    };

    this.isExplored = function() {
        return _explored;
    };

    /** Returns string representation of the cell.*/
    this.toString = function() {
        var str = "MapCell " + _x + ", " + _y;
        str += " explored: " + _explored;
        str += " passes light: " + this.lightPasses();
        for (var prop in _p) {
            var arrProps = _p[prop];
            for (var i = 0; i < arrProps.length; i++) {
                if (arrProps[i].hasOwnProperty("toString")) {
                    str += arrProps[i].toString();
                }
            }
        }
        return str;
    };

}; // }}} MapCell

/** Map object which contains a number of cells. A map is used for rendering
 * while the level contains actual information about game elements such as
 * monsters and items.  */
RG.Map = function(cols, rows) { //{{{2
    var map = [];
    this.cols = cols;
    this.rows = rows;

    var _cols = cols;
    var _rows = rows;

    for (var x = 0; x < this.cols; x++) {
        map.push([]);
        for (var y = 0; y < this.rows; y++) {
            var elem = new RG.RogueElement("floor");
            map[x].push(new RG.MapCell(x, y, elem));
        }
    }

    /** Returns true if x,y are in the map.*/
    this.hasXY = function(x, y) {
        return (x >= 0) && (x < this.cols) && (y >= 0) && (y < this.rows);
    };

    /** Sets a property for the underlying cell.*/
    this.setProp = function(x, y, prop, obj) {
        map[x][y].setProp(prop, obj);
    };

    this.removeProp = function(x, y, prop, obj) {
        return map[x][y].removeProp(prop, obj);
    };

    this.setBaseElemXY = function(x, y, elem) {
        map[x][y].setBaseElem(elem);
    };

    this.getBaseElemXY = function(x, y) {
        return map[x][y].getBaseElem();
    };

    this.getCell = function(x, y) {
        return map[x][y];
    };

    this.getBaseElemRow = function(y) {
        var row = [];
        for (var i = 0; i < this.cols; ++i) {
            row.push(map[i][y].getBaseElem());
        }
        return row;
    };

    this.getCellRow = function(y) {
        var row = [];
        for (var i = 0; i < this.cols; ++i) {
            row.push(map[i][y]);
        }
        return row;
    };

    /** Returns all free cells in the map.*/
    this.getFree = function() {
        var freeCells = [];
        for (var x = 0; x < this.cols; x++) {
            for (var y = 0; y < this.rows; y++) {
                if (map[x][y].isFree()) {
                    freeCells.push(map[x][y]);
                }
            }
        }
        return freeCells;
    };

    /** Returns true if the map has a cell in given x,y location.*/
    var _hasXY = function(x, y) {
        return (x >= 0) && (x < _cols) && (y >= 0) && (y < _rows);
    };

    /** Returns true if light passes through this cell.*/
    var lightPasses = function(x, y) {
        if (_hasXY(x, y)) {
            return map[x][y].lightPasses(); // delegate to cell
        }
        return false;
    };

    this.isPassable = function(x, y) {
        if (_hasXY(x, y)) {
            return map[x][y].isPassable();
        }
        return false;
    };

    var fov = new ROT.FOV.PreciseShadowcasting(lightPasses);

    /** Returns visible cells for given actor.*/
    this.getVisibleCells = function(actor) {
        var cells = [];
        var xActor = actor.getX();
        var yActor = actor.getY();
        if (actor.isLocated()) {
            if (actor.getLevel().getMap() === this) {
                var range = actor.getFOVRange();
                fov.compute(xActor, yActor, range, function(x, y, r, visibility) {
                    if (visibility) {
                        if (_hasXY(x, y)) {
                            cells.push(map[x][y]);
                        }
                    }
                });
            }
        }
        return cells;
    };

    /** Returns all cells explored by the player.*/
    this.getExploredCells = function() {
        var cells = [];
        for (var x = 0; x < this.cols; x++) {
            for (var y = 0; y < this.rows; y++) {
                if (map[x][y].isExplored()) {
                    cells.push(map[x][y]);
                }
            }
        }
    };

    /** Returns true if x,y is located at map border cells.*/
    this.isBorderXY = function(x, y) {
        if (x === 0) return true;
        if (y === 0) return true;
        if (x === this.cols-1) return true;
        if (y === this.rows-1) return true;
        return false;
    };

}; // }}} Map

// }}} MAP GENERATION

/** Factory object for creating some commonly used objects.*/
RG.Factory = function() { // {{{2

    /** Return zero int if given value is null or undef.*/
    var zeroIfNull = function(val) {
        if (!RG.isNullOrUndef[val]) {
            return val;
        }
        return 0;
    };

    var _initCombatant = function(comb, obj) {
        var hp = obj.hp;
        var att = obj.att;
        var def = obj.def;
        var prot = obj.prot;

        if (!RG.isNullOrUndef([hp])) {
            comb.add("Health", new RG.Component.Health(hp));
        }
        var combatComp = new RG.Component.Combat();

        if (!RG.isNullOrUndef([att])) combatComp.setAttack(att);
        if (!RG.isNullOrUndef([def])) combatComp.setDefense(def);
        if (!RG.isNullOrUndef([prot])) combatComp.setProtection(prot);

        comb.add("Combat", combatComp);
    };

    // Regexp for parsing dice like "3d3 + 2".
    var _dmgRe = /\s*(\d+)d(\d+)\s*(\+|-)?\s*(\d+)?/;

    this.createDie = function(strOrArray) {
        if (typeof strOrArray === "object") {
            if (strOrArray.length >= 3) {
                return new RG.Die(strOrArray[0]. strOrArray[1], strOrArray[2]);
            }
        }
        else {
            var match = _dmgRe.exec(strOrArray);
            if (match !== null) {
                var num = match[1];
                var dType = match[2];
                var mod;
                if (!RG.isNullOrUndef([match[3], match[4]])) {
                    if (match[3] === "+") mod = match[4];
                    else mod = -match[4];
                }
                else {
                    mod = 0;
                }
                return new RG.Die(num, dType, mod);
            }
            else {
                RG.err("DamageObject", "setDamage", "Cannot parse: " + strOrArray);
            }
        }
        return null;
    };

    /** Factory method for players.*/
    this.createPlayer = function(name, obj) {
        var player = new RG.RogueActor(name);
        player.setIsPlayer(true);
        _initCombatant(player, obj);
        return player;
    };

    /** Factory method for monsters.*/
    this.createMonster = function(name, obj) {
        var monster = new RG.RogueActor(name);
        if (RG.isNullOrUndef([obj])) obj = {};

        var brain = obj.brain;
        _initCombatant(monster, obj);
        if (!RG.isNullOrUndef([brain])) {
            if (typeof brain === "object") {
                monster.setBrain(brain);
            }
            else { // If brain is string, use factory to create a new one
                var newBrain = this.createBrain(monster, brain);
                monster.setBrain(newBrain);
            }
        }
        return monster;
    };

    /** Factory method for AI brain creation.*/
    this.createBrain = function(actor, brainName) {
        switch(brainName) {
            case "Animal": return new RG.Brain.Animal(actor);
            case "Demon": return new RG.Brain.Demon(actor);
            case "Human": return new RG.Brain.Human(actor);
            case "Summoner": return new RG.Brain.Summoner(actor);
            case "Zombie": return new RG.Brain.Zombie(actor);
            default: return new RG.Brain.Rogue(actor);
        }
    };

    this.createFloorCell = function(x, y) {
        var cell = new RG.MapCell(x, y, new RG.RogueElement("floor"));
        return cell;
    };

    this.createWallCell = function(x, y) {
        var cell = new RG.MapCell(x, y, new RG.RogueElement("wall"));
        return cell;
    };

    /** Factory method for creating levels.*/
    this.createLevel = function(levelType, cols, rows, conf) {
        var mapgen = new RG.RogueMapGen();
        var map = null;

        if (levelType === "town") map = mapgen.createTown(cols, rows, conf);
        else {
            mapgen.setGen(levelType, cols, rows);
            map = mapgen.getMap();
        }

        var level = new RG.RogueLevel(cols, rows);
        level.setMap(map);
        return level;
    };

    /** Creates a randomized level for the game. Danger level controls how the
     * randomization is done. */
    this.createRandLevel = function(cols, rows, danger) {
        var levelType = RG.RogueMapGen.getRandType();
        var level = this.createLevel(levelType, cols, rows);
    };

    this.createWorld = function(nlevels) {

    };

    /** Player stats based on user selection.*/
    this.playerStats = {
        Weak: {att: 1, def: 1, prot: 1, hp: 15, Weapon: "Dagger"},
        Medium: {att: 2, def: 4, prot: 2, hp: 25, Weapon: "Short sword"},
        Strong: {att: 5, def: 6, prot: 3, hp: 40, Weapon: "Tomahawk"},
        Inhuman: {att: 10, def: 10, prot: 4, hp: 80, Weapon: "Magic sword"},
    },


    /** Return random free cell on a given level.*/
    this.getFreeRandCell = function(level) {
        var freeCells = level.getMap().getFree();
        if (freeCells.length > 0) {
            var maxFree = freeCells.length;
            var randCell = Math.floor(Math.random() * maxFree);
            var cell = freeCells[randCell];
            return cell;
        }
        return null;
    };

    /** Adds N random items to the level based on maximum value.*/
    this.addNRandItems = function(parser, itemsPerLevel, level, maxVal) {
        // Generate the items randomly for this level
        for (var j = 0; j < itemsPerLevel; j++) {
            var item = parser.createRandomItem({
                func: function(item) {return item.value <= maxVal;}
            });
            var itemCell = this.getFreeRandCell(level);
            level.addItem(item, itemCell.getX(), itemCell.getY());
        }
    };

    /** Adds N random monsters to the level based on given danger level.*/
    this.addNRandMonsters = function(parser, monstersPerLevel, level, maxDanger) {
        // Generate the monsters randomly for this level
        for (var i = 0; i < monstersPerLevel; i++) {
            var cell = this.getFreeRandCell(level);
            var monster = parser.createRandomActor({
                func: function(actor){return actor.danger <= maxDanger;}
            });
            monster.get("Experience").setExpLevel(maxDanger);
            level.addActor(monster, cell.getX(), cell.getY());
        }
    };




    this.createHumanArmy = function(level, parser) {
        for (var y = 0; y < 2; y++) {
            for (var x = 0; x < 20; x++) {
                var human = parser.createActualObj("actors", "fighter");
                level.addActor(human, x + 1, 4+y);
            }

            var warlord = parser.createActualObj("actors", "warlord");
            level.addActor(warlord, 10, y + 7);
        }

    };

    this.spawnDemonArmy = function(level, parser) {
        for (var y = 0; y < 2; y++) {
            for (var i = 0; i < 10; i++) {
                var demon = parser.createActualObj("actors", "Winter demon");
                level.addActor(demon, i + 10, 14+y);
                RG.POOL.emitEvent(RG.EVT_ACTOR_CREATED, {actor: demon,
                    level: level, msg: "DemonSpawn"});
            }
        }
    };

    this.spawnBeastArmy = function(level, parser) {
        var x0 = level.getMap().cols / 2;
        var y0 = level.getMap().rows / 2;
        for (var y = y0; y < y0+2; y++) {
            for (var x = x0; x < x0+10; x++) {
                var beast = parser.createActualObj("actors", "Blizzard beast");
                level.addActor(beast, x + 10, 14+y);
                RG.POOL.emitEvent(RG.EVT_ACTOR_CREATED, {actor: beast,
                    level: level, msg: "DemonSpawn"});
            }
        }
        RG.debug(this, "Blizzard beasts should now appear.");
    };

};

RG.FACT = new RG.Factory();
// }}}

RG.FCCGame = function() {
    RG.Factory.call(this);

    var _parser = new RG.RogueObjectStubParser();

    /** Creates a player actor and starting inventory.*/
    this.createFCCPlayer = function(game, obj) {
        var pLevel = obj.playerLevel;
        var pConf = this.playerStats[pLevel];

        var player = this.createPlayer("Player", {
            att: pConf.att, def: pConf.def, prot: pConf.prot
        });

        player.setType("player");
        player.add("Health", new RG.Component.Health(pConf.hp));
        var startingWeapon = _parser.createActualObj("items", pConf.Weapon);
        player.getInvEq().addItem(startingWeapon);
        player.getInvEq().equipItem(startingWeapon);

        var regenPlayer = new RG.RogueRegenEvent(player, 20 * RG.ACTION_DUR);
        game.addEvent(regenPlayer);
        return player;
    };


    var that = this; // For private objects/functions

    // Private object for checking when battle is done
    var DemonKillListener = function(game, level) {

        // Needed for adding monsters and events
        var _game = game;
        var _level = level;

        var _maxBeasts = 0;
        var _maxDemons = 0;

        var _beastsKilled = 0;
        var _demonsKilled = 0;


        this.notify = function(evtName, obj) {
            if (evtName === RG.EVT_ACTOR_CREATED) {
                if (obj.hasOwnProperty("msg") && obj.msg === "DemonSpawn") {
                    var actor = obj.actor;
                    if (actor.getName() === "Winter demon") ++_maxDemons;
                    if (actor.getName() === "Blizzard beast") ++_maxBeasts;
                }
            }
            else if (evtName === RG.EVT_ACTOR_KILLED) {
                var actor = obj.actor;
                if (actor.getName() === "Winter demon") {
                    ++_demonsKilled;
                    if (_demonsKilled === _maxDemons) this.allDemonsKilled();
                    RG.debug(this, "A winter demon was slain! Count:" + _demonsKilled);
                    RG.debug(this, "Max demons: " + _maxDemons);
                }
                else if (actor.getName() === "Blizzard beast") {
                    ++_beastsKilled;
                    if (_beastsKilled === _maxBeasts) this.allBeastsKilled();
                }
            }
        };
        RG.POOL.listenEvent(RG.EVT_ACTOR_CREATED, this);
        RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);

        this.allDemonsKilled = function() {
            RG.gameMsg("Humans have vanquished all demons! But it's not over...");

            var windsEvent = new RG.RogueOneShotEvent( function(){}, 20*100,
                "Winds are blowing stronger. You feel it's getting freezing.");
            var beastEvent = new RG.RogueOneShotEvent(
                that.spawnBeastArmy.bind(that,_level, _parser), 50*100,
                "Winter spread by Blizzard Beasts! Hell seems to freeze.");
            _game.addEvent(beastEvent);
        };


        this.allBeastsKilled = function() {
            RG.gameMsg("All beasts have been slain. The blizzard seems to calm down.");
            // DO a final message of game over
            // Add random people to celebrate
            var msgEvent = new RG.RogueOneShotEvent(function() {}, 10*100,
                "All enemies are dead! You emerge victorious. Congratulations!");
            _game.addEvent(msgEvent);
            var msgEvent2 = new RG.RogueOneShotEvent(function() {}, 20*100,
                "But Battles in North will continue soon in larger scale...");
            _game.addEvent(msgEvent2);
        };
    };

    /** Creates the game for the FCC project.*/
    this.createFCCGame = function(obj) {
        _parser.parseStubData(RGObjects);
        var cols = obj.cols;
        var rows = obj.rows;
        var nLevels = obj.levels;
        var sqrPerMonster = obj.sqrPerMonster;
        var sqrPerItem = obj.sqrPerItem;

        var levelCount = 1;

        var game = new RG.Game();
        var player = this.createFCCPlayer(game, obj);

        if (obj.debugMode === "Arena") {
            return this.createFCCDebugGame(obj, game, player);
        }

        var levels = ["rooms", "rogue", "digger"];
        var maxLevelType = levels.length;

        // For storing stairs and levels
        var allStairsUp   = [];
        var allStairsDown = [];
        var allLevels     = [];

        // Generate all game levels
        for (var nl = 0; nl < nLevels; nl++) {

            var nLevelType = Math.floor(Math.random() * maxLevelType);
            var levelType = levels[nLevelType];
            if (nl === 0) levelType = "ruins";
            var level = this.createLevel(levelType, cols, rows);
            level.setLevelNumber(levelCount++);

            game.addLevel(level);
            if (nl === 0) {
                var hunger = new RG.Component.Hunger(2000);
                player.add("Hunger", hunger);
                game.addPlayer(player);
            }

            var numFree = level.getMap().getFree().length;
            var monstersPerLevel = Math.round(numFree / sqrPerMonster);
            var itemsPerLevel = Math.round(numFree / sqrPerItem);

            var potion = new RG.Item.Potion("Healing potion");
            level.addItem(potion);
            var missile = _parser.createActualObj("items", "Shuriken");
            missile.count = 20;
            level.addItem(missile);

            this.addNRandItems(_parser, itemsPerLevel, level, 20*(nl +1));
            this.addNRandMonsters(_parser, monstersPerLevel, level, nl + 1);

            allLevels.push(level);
        }

        // Create the final boss
        var lastLevel = allLevels.slice(-1)[0];
        var bossCell = this.getFreeRandCell(lastLevel);
        var summoner = this.createMonster("Summoner", {hp: 100, att: 10, def: 10});
        summoner.setType("summoner");
        summoner.get("Experience").setExpLevel(10);
        summoner.setBrain(new RG.Brain.Summoner(summoner));
        lastLevel.addActor(summoner, bossCell.getX(), bossCell.getY());

        var extraLevel = this.createLastBattle(game, {cols: 80, rows: 60});
        extraLevel.setLevelNumber(levelCount);

        // Connect levels with stairs
        for (nl = 0; nl < nLevels; nl++) {
            var src = allLevels[nl];

            var stairCell = null;
            if (nl < nLevels-1) {
                var targetDown = allLevels[nl+1];
                var stairsDown = new RG.RogueStairsElement(true, src, targetDown);
                stairCell = this.getFreeRandCell(src);
                src.addStairs(stairsDown, stairCell.getX(), stairCell.getY());
                allStairsDown.push(stairsDown);
            }
            else {
                var finalStairs = new RG.RogueStairsElement(true, src, extraLevel);
                var stairsLoot = new RG.Component.Loot(finalStairs);
                summoner.add("Loot", stairsLoot);
                allStairsDown.push(finalStairs);
            }

            if (nl > 0) {
                var targetUp = allLevels[nl-1];
                var stairsUp = new RG.RogueStairsElement(false, src, targetUp);
                stairCell = this.getFreeRandCell(src);
                src.addStairs(stairsUp, stairCell.getX(), stairCell.getY());
                allStairsUp.push(stairsUp);
            }
            else {
                allStairsUp.push(null);
            }
        }

        var lastStairsDown = allStairsDown.slice(-1)[0];
        var extraStairsUp = new RG.RogueStairsElement(false, extraLevel, lastLevel);
        var rStairCell = this.getFreeRandCell(extraLevel);
        extraLevel.addStairs(extraStairsUp, rStairCell.getX(), rStairCell.getY());
        extraStairsUp.setTargetStairs(lastStairsDown);
        lastStairsDown.setTargetStairs(extraStairsUp);

        // Create NPCs for the extra level
        var humansPerLevel = 2 * monstersPerLevel;
        for (var i = 0; i < 10; i++) {
            var name = "Townsman";
            var human = this.createMonster(name, {brain: "Human"});
            human.setType("human");
            var cell = this.getFreeRandCell(extraLevel);
            extraLevel.addActor(human, cell.getX(), cell.getY());
        }

        // Finally connect the stairs together
        for (nl = 0; nl < nLevels; nl++) {
            if (nl < nLevels-1)
                allStairsDown[nl].setTargetStairs(allStairsUp[nl+1]);
            if (nl > 0)
                allStairsUp[nl].setTargetStairs(allStairsDown[nl-1]);
        }

        return game;

    };

    var _playerFOV = RG.FOV_RANGE;

    /** Can be used to create a short debugging game for testing.*/
    this.createFCCDebugGame = function(obj, game, player) {
        var sqrPerMonster = obj.sqrPerMonster;
        var sqrPerItem = obj.sqrPerItem;
        var level = this.createLastBattle(game, obj);

        var spirit = new RG.Item.Spirit("Wolf spirit");
        spirit.get("Stats").setStrength(500);
        level.addItem(spirit, 2, 1);
        //spirit.get("Action").enable();

        //var numFree = level.getMap().getFree().length;
        //var monstersPerLevel = Math.round(numFree / sqrPerMonster);
        //var itemsPerLevel = Math.round(numFree / sqrPerItem);
        game.addPlayer(player);
        //player.setFOVRange(50);
        return game;
    };

    var _listener = null;

    this.createLastBattle = function(game, obj) {
        var level = this.createLevel("town", obj.cols, obj.rows,
            {nHouses: 10, minHouseX: 5, maxHouseX: 10, minHouseY: 5, maxHouseY: 10});
        _listener = new DemonKillListener(game, level);

        this.createHumanArmy(level, _parser);

        level.setOnFirstEnter(function() {
            var demonEvent = new RG.RogueOneShotEvent(
                that.spawnDemonArmy.bind(that, level, _parser), 100 * 20,
                "Demon hordes are unleashed from the unsilent abyss!");
            game.addEvent(demonEvent);
        });

        level.setOnEnter( function() {
            _playerFOV = game.getPlayer().getFOVRange();
            game.getPlayer().setFOVRange(20);
        });
        level.setOnExit( function() {
            game.getPlayer().setFOVRange(_playerFOV);
        });

        game.addLevel(level);
        return level;
    };

};
RG.extend2(RG.FCCGame, RG.Factory);

/** Object parser for reading game data. Game data is contained within stubs
 * which are simply object literals without functions etc. */
RG.RogueObjectStubParser = function() {

    var categ = ['actors', 'items', 'levels', 'dungeons'];

    // Stores the base objects
    var _base = {
        actors: {},
        items: {},
        levels: {},
        dungeons: {}
    };

    var _db = {
        actors: {},
        items: {},
        levels: {},
        dungeons: {}
    };

    var _db_danger = {}; // All entries indexed by danger
    var _db_by_name = {}; // All entries indexed by name

    /** Maps obj props to function calls. Essentially this maps bunch of setters
     * to different names. Following formats supported:
     *
     * 1. {factory: funcObj, func: "setter"}
     *  Call obj["setter"]( funcObj(stub.field) )
     *
     * 2. {comp: "CompName", func: "setter"}
     *  Create component comp of type "CompName".
     *  Call comp["setter"]( stub.field)
     *  Call obj.add("CompName", comp)
     *
     * 3. {comp: "CompName"}
     *  Create component comp of type "CompName" with new CompName(stub.field)
     *  Call obj.add("CompName", comp)
     *
     * 4. "setter"
     *   Call setter obj["setter"](stub.field)
     * */
    var _propToCall = {
        actors: {
            type: "setType",
            attack: {comp: "Combat", func: "setAttack"},
            defense: {comp: "Combat", func:"setDefense"},
            damage: {comp: "Combat", func:"setDamage"},
            speed: {comp: "Stats", func: "setSpeed"},
            hp: {comp: "Health"},
            danger: {comp: "Experience", func: "setDanger"},
            brain: {func: "setBrain", factory: RG.FACT.createBrain},
        },
        items: {
            // Generic item functions
            value: "setValue",
            weight: "setWeight",

            armour: {
                attack: "setAttack",
                defense: "setDefense",
                protection: "setProtection",
                armourType: "setArmourType",
            },

            weapon: {
                damage: "setDamage",
                attack: "setAttack",
                defense: "setDefense",
            },
            missile: {
                damage: "setDamage",
                attack: "setAttack",
                range: "setAttackRange",
            },
            food: {
                energy: "setEnergy",
            },
        },
        levels: {},
        dungeons: {}
    };

    //---------------------------------------------------------------------------
    // "PARSING" METHODS
    //---------------------------------------------------------------------------

    /** Parses all stub data, items, monsters, level etc.*/
    this.parseStubData = function(obj) {
        var keys = Object.keys(obj);
        for (var i = 0; i < keys.length; i++) {
            this.parseStubCateg(keys[i], obj[keys[i]]);
        }
    };

    /** Parses one specific stub category, ie items or monsters.*/
    this.parseStubCateg = function(categ, objsArray) {
        for (var i = 0; i < objsArray.length; i++) {
            this.parseObjStub(categ, objsArray[i]);
        }
    };

    /** Parses an object stub. Returns null for base objects, and
     * corresponding object for actual actors.*/
    this.parseObjStub = function(categ, obj) {
        if (this.validStubGiven(obj)) {
            // Get properties from base class
            if (obj.hasOwnProperty("base")) {
                var baseName = obj.base;
                if (this.baseExists(categ, baseName)) {
                    obj = this.extendObj(obj, this.getBase(categ, baseName));
                }
                else {
                    RG.err("ObjectParser", "parseObjStub",
                        "Unknown base " + baseName + " specified for " + obj);
                }
            }

            if (categ === "actors") this.addTypeIfUntyped(obj);

            this.storeIntoDb(categ, obj);
            return obj;
        }
        else {
            return null;
        }
    };

    /** Checks that the object stub given is correctly formed.*/
    this.validStubGiven = function(obj) {
        if (!obj.hasOwnProperty("name")) {
            RG.err("ObjectStubParser", "validStubGiven",
                "Stub doesn't have a name.");
            return false;
        }
        //console.log("validStub ==> " + obj.name);
        return true;
    };

    /** If an object doesn't have type, the name is chosen as its type.*/
    this.addTypeIfUntyped = function(obj) {
        if (!obj.hasOwnProperty("type")) {
            obj.type = obj.name;
        }
    };

    /** Returns an object stub given category and name.*/
    this.get = function(categ, name) {
        return _db[categ][name];
    };

    /** Return specified base stub.*/
    this.getBase = function(categ, name) {
        return _base[categ][name];
    };

    this.setAsBase = function(categ, obj) {
        _base[categ][obj.name] = obj;
    };

    /** Stores the object into given category.*/
    this.storeIntoDb = function(categ, obj) {
        if (_db.hasOwnProperty(categ)) {
            this.setAsBase(categ, obj);

            if (!obj.hasOwnProperty("dontCreate")) {
                _db[categ][obj.name] = obj;
                if (_db_by_name.hasOwnProperty(obj.name)) {
                    _db_by_name[obj.name].push(obj);
                }
                else {
                    var newArr = [];
                    newArr.push(obj);
                    _db_by_name[obj.name] = newArr;
                }
                if (obj.hasOwnProperty("danger")) {
                    var danger = obj.danger;
                    if (!_db_danger.hasOwnProperty(danger)) {
                        _db_danger[danger] = {};
                    }
                    if (!_db_danger[danger].hasOwnProperty(categ)) {
                        _db_danger[danger][categ] = {};
                    }
                    _db_danger[danger][categ][obj.name] = obj;
                }
            } // dontCreate
        }
        else {
            RG.err("ObjectParser", "storeIntoDb",
                "Unknown category: " + categ);
        }
        this.storeRenderingInfo(categ, obj);
    };

    /** Stores char/CSS className for the object for rendering purposes.*/
    this.storeRenderingInfo = function(categ, obj) {
        //console.log("\tStoring render information for " + obj.name);
        if (obj.hasOwnProperty("char")) {
            if (obj.hasOwnProperty("name")) {
                RG.addCharStyle(categ, obj.name, obj["char"]);
            }
            else {
                RG.addCharStyle(categ, obj.type, obj["char"]);
            }
        }
        if (obj.hasOwnProperty("className")) {
            if (obj.hasOwnProperty("name")) {
                RG.addCellStyle(categ, obj.name, obj.className);
            }
            else {
                RG.addCellStyle(categ, obj.type, obj.className);
            }
        }
    };

    /** Creates a component of specified type.*/
    this.createComponent = function(type, val) {
        switch(type) {
            case "Combat": return new RG.Component.Combat();
            case "Health": return new RG.Component.Health(val);
            case "Stats": return new RG.Component.Stats();
            default: RG.err("ObjectParser", "createComponent",
                "Unknown component " + type + " for the factory method.");
        }
    };

    /** Returns an actual game object when given category and name. Note that
     * the blueprint must exist already in the database (blueprints must have
     * been parser before). */
    this.createActualObj = function(categ, name) {
        if (!this.dbExists(categ, name)) {
            RG.err("ObjectParser", "createActualObj",
                "Categ: " + categ + " Name: " + name + " doesn't exist.");
            return null;
        }

        var stub = this.get(categ, name);
        var propCalls = _propToCall[categ];
        var newObj = this.createNewObject(categ, stub);

        // If propToCall table has the same key as stub property, call corresponding
        // function in _propToCall using the newly created object.
        for (var p in stub) {

            // Called for basic type: actors, items...
            if (propCalls.hasOwnProperty(p)) {
                var funcName = propCalls[p];
                if (typeof funcName === "object") {
                    if (funcName.hasOwnProperty("comp")) {
                        this.addCompToObj(newObj, funcName, stub[p]);
                    }
                    else if (funcName.hasOwnProperty("factory")) {
                        if (p === "brain") {
                            var createdObj = funcName.factory(newObj, stub[p]);
                            //console.log("Creatin brain: " + stub[p]);
                            newObj[funcName.func](createdObj);
                        }
                    }
                    else {
                        for (var f in funcName) {
                            var fName = funcName[f];
                            if (newObj.hasOwnProperty(fName)) {
                                newObj[fName](stub[p]);
                            }
                        }
                    }
                }
                else {
                    newObj[funcName](stub[p]);
                }
            }
            else { // Check for subtypes
                if (stub.hasOwnProperty("type")) {
                    if (propCalls.hasOwnProperty(stub.type)) {
                        var propTypeCalls = propCalls[stub.type];
                        if (propTypeCalls.hasOwnProperty(p)) {
                            var funcName2 = propTypeCalls[p];
                            if (typeof funcName2 === "object") {
                                for (var f2 in funcName2) {
                                    var fName2 = funcName2[f2];
                                    if (newObj.hasOwnProperty(fName)) {
                                        newObj[funcName2[f2]](stub[p]);
                                    }
                                }
                            }
                            else {
                                newObj[funcName2](stub[p]);
                            }
                        }
                    }
                }
            }
        }

        // TODO map different props to function calls
        return newObj;
    };

    /** Adds a component to the newly created object, or updates existing
     * component if it exists already.*/
    this.addCompToObj = function(newObj, compData, val) {
        if (compData.hasOwnProperty("func")) {
            var fname = compData.func;
            var compName = compData.comp;
            if (newObj.has(compName)) {
                newObj.get(compName)[fname](val);
            }
            else { // Have to create new component
                var comp = this.createComponent(compName);
                comp[fname](val);
            }
        }
        else {
            newObj.add(compData.comp,
                this.createComponent(compData.comp, val));
        }

    };

    this.createFromStub = function(categ, obj) {
        return this.createActualObj(categ, obj.name);
    };

    /** Factory-method for creating the actual objects.*/
    this.createNewObject = function(categ, obj) {
        switch(categ) {
            case "actors": return new RG.RogueActor(obj.name);
            case RG.TYPE_ITEM:
                var subtype = obj.type;
                switch(subtype) {
                    case "armour": return new RG.Item.Armour(obj.name);
                    case "weapon": return new RG.Item.Weapon(obj.name);
                    case "food": return new RG.Item.Food(obj.name);
                    case "missile": return new RG.Item.Missile(obj.name);
                    case "spirit": return new RG.Item.Spirit(obj.name);
                    case "tool": break;
                }
                return new RG.Item(obj.name); // generic, useless
                break;
            case "levels":
                return RG.FACT.createLevel(obj.type, obj.cols, obj.rows);
            case "dungeons": break;
            default: break;
        }
        return null;
    };

    /** Returns true if base exists.*/
    this.baseExists = function(categ, baseName) {
        if (_base.hasOwnProperty(categ)) {
            return _base[categ].hasOwnProperty(baseName);
        }
        return false;
    };

    /** Extends the given object stub with given base object.*/
    this.extendObj = function(obj, baseObj) {
        for (var prop in baseObj) {
            if (!obj.hasOwnProperty(prop)) {
                if (prop !== "dontCreate") {
                    //console.log("\textendObj: Added " + prop + " to " + obj.name);
                    obj[prop] = baseObj[prop];
                }
            }
        }
        return obj;
    };

    //---------------------------------------------------------------------------
    // Database get-methods
    //---------------------------------------------------------------------------

    this.dbExists = function(categ, name) {
        if (_db.hasOwnProperty(categ)) {
            if (_db[categ].hasOwnProperty(name)) return true;
        }
        return false;
    };

    /** Returns entries from db based on the query. Returns null if nothing
     * matches.*/
    this.dbGet = function(query) {

        var name   = query.name;
        var categ  = query.categ;
        var danger = query.danger;
        var type   = query.type;

        // Specifying name returns an array
        if (typeof name !== "undefined") {
            if (_db_by_name.hasOwnProperty(name))
                return _db_by_name[name];
            else
                return [];
        }

        if (typeof danger !== "undefined") {
            if (_db_danger.hasOwnProperty(danger)) {
                var entries = _db_danger[danger];
                if (typeof categ !== "undefined") {
                    if (entries.hasOwnProperty(categ)) {
                        return entries[categ];
                    }
                    else return {};
                }
                else {
                    return _db_danger[danger];
                }
            }
            else {
                return {};
            }
        }
        else { // Fetch all entries of given category
            if (typeof categ !== "undefined") {
                if (_db.hasOwnProperty(categ)) {
                    return _db[categ];
                }
            }
        }
        return {};

    };

    //---------------------------------------------------------------------------
    // RANDOMIZED METHODS for procedural generation
    //---------------------------------------------------------------------------

    /** Returns stuff randomly from db. For example, {categ: "actors", num: 2}
     * returns two random actors (can be the same). Ex2: {danger: 3, num:1}
     * returns randomly one entry which has danger 3.*/
    this.dbGetRand = function(query) {
        var danger = query.danger;
        var categ  = query.categ;
        if (typeof danger !== "undefined") {
            if (typeof categ !== "undefined") {
                var entries = _db_danger[danger][categ];
                return this.getRandFromObj(entries);
            }
        }
        return null;
    };

    /** Returns a property from an object, selected randomly. For example,
     * given object {a: 1, b: 2, c: 3}, may return 1,2 or 3 with equal probability.
     * */
    this.getRandFromObj = function(obj) {
        var keys = Object.keys(obj);
        var len = keys.length;
        var randIndex = Math.floor( Math.random() * len);
        return obj[keys[randIndex]];
    };

    /** Filters given category with a function. Func gets each object as arg,
     * and must return either true or false.*/
    this.filterCategWithFunc = function(categ, func) {
        var objects = this.dbGet({categ: categ});
        var res = [];
        var keys = Object.keys(objects);

        for (var i = 0; i < keys.length; i++) {
            var name = keys[i];
            var obj = objects[name];
            var acceptItem = func(obj);
            if (acceptItem) {
                res.push(obj);
            }
        }
        return res;

    };

    /** Creates a random actor based on danger value or a filter function.*/
    this.createRandomActor = function(obj) {
        if (obj.hasOwnProperty("danger")) {
            var danger = obj.danger;
            var randObj = this.dbGetRand({danger: danger, categ: "actors"});
            if (randObj !== null) {
                return this.createFromStub("actors", randObj);
            }
            else {
                return null;
            }
        }
        else if (obj.hasOwnProperty("func")) {
            var res = this.filterCategWithFunc("actors", obj.func);
            var randObj = this.arrayGetRand(res);
            return this.createFromStub("actors", randObj);
        }
    };

    /** Creates a random item based on selection function.*/
    this.createRandomItem = function(obj) {
        if (obj.hasOwnProperty("func")) {
            var res = this.filterCategWithFunc("items", obj.func);
            var randObj = this.arrayGetRand(res);
            return this.createFromStub("items", randObj);
        }
        else {
            RG.err("ObjectParser", "createRandomItem", "No function given.");
        }
    };

    /** Returns a random entry from the array.*/
    this.arrayGetRand = function(arr) {
        var len = arr.length;
        var randIndex = Math.floor(Math.random() * len);
        return arr[randIndex];
    };

};

if (typeof exports !== 'undefined' ) {
    if( typeof RG !== 'undefined' && module.exports ) {
        exports = module.exports = RG;
    }
    exports.RG = RG;
}
else {
    window.RG = RG;
}


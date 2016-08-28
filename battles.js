/*
 * Contains the main object "RoguelikeGame", the top-level game object.
 */

var GS = require("./getsource.js");

var ROT = GS.getSource("ROT", "./lib/rot.js");
var RG  = GS.getSource("RG", "./src/rg.js");
RG.Object = GS.getSource(["RG", "Object"], "./src/object.js");
RG.Item = GS.getSource(["RG","Item"], "./src/item.js");
RG.Component = GS.getSource(["RG", "Component"], "./src/component.js");
RG.System = GS.getSource(["RG", "System"], "./src/system.js");
RG.Brain = GS.getSource(["RG", "Brain"], "./src/brain.js");
RG.Map = GS.getSource(["RG", "Map"], "./src/map.js");
RG.Factory = GS.getSource(["RG", "Factory"], "./src/factory.js");

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


if (typeof exports !== 'undefined' ) {
    if( typeof RG !== 'undefined' && module.exports ) {
        exports = module.exports = RG;
    }
    exports.RG = RG;
}
else {
    window.RG = RG;
}


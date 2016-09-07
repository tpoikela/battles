

var GS = require("../getsource.js");
var ROT = GS.getSource(["ROT"], "./lib/rot.js");

/** Main object of the package for encapsulating all other objects. */
var RG = { // {{{2

    gameTitle: "Battles in the North (BitN)",

    cellRenderVisible: ['actors', 'items', 'traps', 'elements'],
    cellRenderAlways: ['items', 'traps', 'elements'],
    cellRenderArray: this.cellRenderVisible,

    getClassName: function(cell, isVisible) {
        if (isVisible) this.cellRenderArray = this.cellRenderVisible;
        else this.cellRenderArray = this.cellRenderAlways;
        var className = this.getStyleClassForCell(cell);
        this.cellRenderArray = this.cellRenderVisible;
        return className;
    },

    getChar: function(cell, isVisible) {
        if (isVisible) this.cellRenderArray = this.cellRenderVisible;
        else this.cellRenderArray = this.cellRenderAlways;
        var cellChar = this.getCellChar(cell);
        this.cellRenderArray = this.cellRenderVisible;
        return cellChar;
    },

    /** Maps a cell to specific object in stylesheet. For rendering purposes
     * only.*/
    getStyleClassForCell: function(cell) {
        if (!cell.isExplored()) return "cell-not-explored";

        for (var i = 0; i < this.cellRenderArray.length; i++) {
            var propType = this.cellRenderArray[i];
            if (cell.hasProp(propType)) {
                var props = cell.getProp(propType);
                var styles = this.cellStyles[propType];
                var propObj = props[0];
                return this.getPropClassOrChar(styles, propObj);
            }
        }

        var baseType = cell.getBaseElem().getType();
        return this.cellStyles.elements[baseType];
    },

    getPropClassOrChar: function(styles, propObj) {
        var objType = propObj.getType();

        if (propObj.hasOwnProperty("getName")) {
            var name = propObj.getName();
            if (styles.hasOwnProperty(name)) {
                return styles[name];
            }
        }

        if (styles.hasOwnProperty(objType)) {
            return styles[objType];
        }
        else {
            return styles["default"];
        }
    },

    /** Returns char which is rendered on the map cell based on cell contents.*/
    getCellChar: function(cell) {
        if (!cell.isExplored()) return "X";

        for (var i = 0; i < this.cellRenderArray.length; i++) {
            var propType = this.cellRenderArray[i];
            if (cell.hasProp(propType)) {
                var props = cell.getProp(propType);
                var styles = this.charStyles[propType];
                var propObj = props[0];
                return this.getPropClassOrChar(styles, propObj);
            }
        }

        var baseType = cell.getBaseElem().getType();
        return this.charStyles.elements[baseType];
    },

    /** Returns shortest path (array of x,y pairs) between two points.*/
    getShortestPath: function(x0, y0, x1, y1) {
        var coords = [];
        var passableCallback = function(x, y) {return true;};
        //var finder = new ROT.Path.Dijkstra(x1, y1, passableCallback);
        var finder = new ROT.Path.AStar(x1, y1, passableCallback);
        finder.compute(x0, y0, function(x, y) {
            coords.push({x: x, y: y});
        });
        return coords;
    },

    /** Returns shortest distance (in cells) between two points.*/
    shortestDist: function(x0, y0, x1, y1) {
        var coords = this.getShortestPath(x0, y0, x1, y1);
        return coords.length - 1; // Subtract one because starting cell included
    },

    /** Adds a CSS class for given prop and type. For example, "actors", "wolf",
     * "cell-actor-wolf" uses CSS class .cell-actor-wolf to style cells with
     * wolves in them. */
    addCellStyle: function(prop, type, className) {
        if (this.cellStyles.hasOwnProperty(prop)) {
            this.cellStyles[prop][type] = className;
        }
        else {
            this.err("RG", "addCellStyle", "Unknown prop type: " + prop);
        }
    },

    /** Adds a char to render for given prop and type. Example: "actors",
     * "wolf", "w" renders 'w' for cells containing wolves.*/
    addCharStyle: function(prop, type, charName) {
        if (this.charStyles.hasOwnProperty(prop)) {
            this.charStyles[prop][type] = charName;
        }
        else {
            this.err("RG", "addCharStyle", "Unknown prop type: " + prop);
        }
    },

    // These are used to select rendered characters for map cells.
    charStyles: {
        elements: {
            "default": ".",
            "wall": "#",
            "ice wall": "#",
            "floor": ".",
            "snow": ".",
            "stairsUp": "<",
            "stairsDown": ">",
            "water": "~",
        },
        actors: {
            "default": "X",
            "monster": "@",
            "player" : "@",
            "spirit" : "Q",
            "summoner" : "Z",
            "wolf"   : "w",
        },
        items: {
            "default": "(",
            "corpse" : "§",
            "potion" : "!",
            "spiritgem" : "*",
        },
        traps: {},
    },

    // These are used to select the CSS class for map cells.
    cellStyles: {
        elements: {
            "default": "cell-element-default",
            wall: "cell-element-wall",
            floor: "cell-element-floor",
            "ice wall": "cell-element-ice-wall",
            snow: "cell-element-snow",
        },
        actors: {
            "default": "cell-actor-default",
            "player": "cell-actor-player",
            "monster": "cell-actor-monster",
            "summoner": "cell-actor-summoner",
            "wolf": "cell-actor-animal",
            "spirit": "cell-actor-spirit",
        },
        items: {
            "potion": "cell-item-potion",
            "spiritgem": "cell-item-spiritgem",
            "default": "cell-item-default",
        },
        traps: {
            "default": "cell-traps",
        },
    },

    debug: function(obj, msg) {
        var inst = typeof obj;
        if (0) console.log("[DEBUG]: " + inst + " " + msg);
    },

    err: function(obj, fun, msg) {
        console.error("[ERROR]: " + obj + ": " + fun + " -> " + msg);
    },

    /** Used to inherit from a prototype. Supports multiple inheritance but
     * sacrifices instanceof.*/
    extend2: function(Child, Parent) {
        var p = Parent.prototype;
        var c = Child.prototype;
        for (var i in p) {
            if (!c.hasOwnProperty(i)) {
                c[i] = p[i];
            }
        }
        if (c.hasOwnProperty("uber")) {
            var ubers = [c.uber];
            ubers.push(p);
            c.uber = ubers;
        }
        else {
            c.uber = [];
            c.uber.push(p);
        }
    },

    /** Prints an error into console if 'val' is null or undefined.*/
    nullOrUndefError: function(name, msg, val) {
        if (this.isNullOrUndef([val])) {
            console.error("nullOrUndefError: " + name + ": " + msg);
        }
    },

    /** Returns true if anything in the list is null or undefined.*/
    isNullOrUndef: function(list) {
        for (var i = 0; i < list.length; i++) {
            if (list[i] === null || typeof list[i] === "undefined" ||
                list === undefined) {
                return true;
            }
        }
        return false;
    },

    gameDanger: function(msg) {
        this.emitMsgEvent("danger", msg);
    },

    gameMsg: function(msg) {
        this.emitMsgEvent("prim", msg);
    },

    gameSuccess: function(msg) {
        this.emitMsgEvent("success", msg);
    },

    gameWarn: function(msg) {
        this.emitMsgEvent("warn", msg);
    },

    emitMsgEvent: function(style, msg) {
        var newMsg = "";
        if (typeof msg === "object") {
            var cell = msg.cell;
            newMsg = msg.msg;
            newMsg = newMsg[0].toUpperCase() + newMsg.substring(1);
            this.POOL.emitEvent(this.EVT_MSG, {cell: cell, msg: newMsg, style: style});
        }
        else {
            newMsg = msg[0].toUpperCase() + msg.substring(1);
            this.POOL.emitEvent(this.EVT_MSG, {msg: newMsg, style: style});
        }

    },

    /** Tries to add item2 to item1 stack. Returns true on success.*/
    addStackedItems: function(item1, item2) {
        if (item1.equals(item2)) {
            var countToAdd = 1;
            if (item2.hasOwnProperty("count")) {
                countToAdd = item2.count;
            }

            // Check if item1 already stacked
            if (item1.hasOwnProperty("count")) {
                item1.count += countToAdd;
            }
            else {
                item1.count = 1 + countToAdd;
            }
            return true;
        }
        return false;
    },

    /** Removes N items from the stack and returns them. Returns null if the
     * stack is not changed.*/
    removeStackedItems: function(itemStack, n) {
        if (n > 0) {
            var rmvItem = null;
            if (itemStack.hasOwnProperty("count")) {
                if (n <= itemStack.count) {
                    itemStack.count -= n;
                    rmvItem = itemStack.clone();
                    rmvItem.count = n;
                    return rmvItem;
                }
                else {
                    rmvItem = itemStack.clone();
                    rmvItem.count = itemStack.count;
                    itemStack.count = 0;
                    return rmvItem;
                }
            }
            else { // Remove all
                itemStack.count = 0;
                rmvItem = itemStack.clone();
                rmvItem.count = 1;
                return rmvItem;
            }
        }
        return null;
    },

    //--------------------------------------------------------------
    // COMBAT-RELATED FUNCTIONS
    //--------------------------------------------------------------

    getMissileDamage: function(att, miss) {
        var dmg = miss.getDamage();
        dmg += Math.round(att.get("Stats").getAgility() / 3);
        return dmg;
    },

    getMissileAttack: function(att, miss) {
        var attack = att.get("Combat").getAttack();
        attack += att.getInvEq().getEquipment().getAttack();
        attack += att.get("Stats").getAccuracy() / 2;
        attack += att.getInvEq().getEquipment().getAccuracy() / 2;
        attack += miss.getAttack();

        return attack;
    },

    /** Given actor and cells it sees, returns first enemy cell found.*/
    findEnemyCellForPlayer: function(actor, seenCells) {
        var res =[];
        for (var i = 0; i < seenCells.length; i++) {
            if (seenCells[i].hasActors()) {
                var actors = seenCells[i].getProp("actors");
                for (var j = 0; j < actors.length; j++) {
                    if (actor !== actors[j]) {
                        if (actors[j].isEnemy(actor)) {
                            res.push(seenCells[i]);
                        }
                    }
                }
            }
        }
        return res;
    },

    strengthToDamage: function(str) {
        return Math.round(str / 4);
    },

    // Event pool -related stuff

    eventPools: [],
    POOL: null,

    resetEventPools: function() {
        this.eventPools = [];
        this.POOL = null;
    },

    // Event pool controls
    pushEventPool: function(pool) {
        this.eventPools.push(pool);
        this.POOL = pool;
    },

    popEventPool: function() {
        this.eventPools.pop();
        var nlen = this.eventPools.length;
        if (nlen > 0) {
            this.POOL = this.eventPools[nlen - 1];
        }
        else {
            RG.err("RG", "popEventPool", "No event pools left.");
        }
    },

    // Default FOV range for actors
    FOV_RANGE: 4,
    ROWS: 30,
    COLS: 50,
    ACTION_DUR: 100,
    BASE_SPEED: 100,
    DEFAULT_HP: 50,

    // How many levels are simulated at once
    MAX_ACTIVE_LEVELS: 3,

    // Different game events
    EVT_ACTOR_CREATED: "EVT_ACTOR_CREATED",
    EVT_ACTOR_KILLED: "EVT_ACTOR_KILLED",
    EVT_DESTROY_ITEM: "EVT_DESTROY_ITEM",
    EVT_MSG: "EVT_MSG",

    EVT_LEVEL_CHANGED: "EVT_LEVEL_CHANGED",
    EVT_LEVEL_ENTERED: "EVT_LEVEL_ENTERED",

    EVT_LEVEL_PROP_ADDED: "EVT_LEVEL_PROP_ADDED",

    EVT_ACT_COMP_ADDED: "EVT_ACT_COMP_ADDED",
    EVT_ACT_COMP_REMOVED: "EVT_ACT_COMP_REMOVED",
    EVT_ACT_COMP_ENABLED: "EVT_ACT_COMP_ENABLED",
    EVT_ACT_COMP_DISABLED: "EVT_ACT_COMP_DISABLED",

    // Different types
    TYPE_ACTOR: "actors",
    TYPE_ELEM: "elements",
    TYPE_ITEM: "items",
    TYPE_TRAP: "traps",


    // Energy per action
    energy: {
        REST: 1,
        USE: 1,
        PICKUP: 1,
        MISSILE: 2,
        MOVE: 2,
        ATTACK: 3,
        RUN: 4,
    },

    // 0.0 = uniform dist, higher number assigns more weight to median values
    DANGER_ADJ_FACTOR: 1.4,

}; /// }}} RG

RG.PROP_TYPES = [RG.TYPE_ACTOR, RG.TYPE_ELEM, RG.TYPE_ITEM, RG.TYPE_TRAP];
RG.cellRenderArray = RG.cellRenderVisible;

var ADJ_FACTOR = 0.0;

/** Returns danger probabilites for given level.*/
RG.getDangerProb = function(min, max) {
    if (min > max) return {};
    var level = max + 1;
    var arr = [];
    var sum = 0;
    for (var j = min; j <= level; j++) {
        arr.push(j);
        sum += j;
    }

    var last = arr.length - 1;
    var max  = arr[last];

    var highPoint = (max % 2 === 0) ? max / 2 : (max+1) / 2;
    var obj = {};

    arr.forEach( function(val) {
        var prob = max - Math.floor(RG.DANGER_ADJ_FACTOR*Math.abs(val - highPoint));
        prob = (prob === 0) ? prob + 1 : prob;
        obj[val] = prob;

    });

    return obj;
};

/** Given an actor, scales its attributes based on new experience level.*/
RG.levelUpActor = function(actor, newLevel) {
    if (actor.has("Experience")) {
        var currLevel = actor.get("Experience").getExpLevel();
        if (currLevel < newLevel) {
            while (currLevel < newLevel) {
                var nextLevel = currLevel + 1;

                // Level up the Combat component
                if (actor.has("Combat")) {
                    var combatComp = actor.get("Combat");
                    combatComp.setAttack(combatComp.getAttack() + 1);
                    combatComp.setDefense(combatComp.getDefense() + 1);
                    if (nextLevel % 3 === 0) {
                        var prot = combatComp.getProtection();
                        combatComp.setProtection(prot + 1);
                    }

                    // Upgrade damage die was well
                    var dmgDie = combatComp.getDamageDie();
                    dmgDie.setDice( dmgDie.getDice() + 1);
                    if (nextLevel % 3 === 0) {
                        dmgDie.setMod( dmgDie.getMod() + 1);
                    }
                }

                // Level up the Health
                if (actor.has("Health")) {
                    var hComp = actor.get("Health");
                    var incr = 2;
                    if (actor.isPlayer()) incr = 5;
                    hComp.setMaxHP(hComp.getMaxHP() + incr);
                    hComp.setHP(hComp.getHP() + incr);
                }
                ++currLevel;

            }
            actor.get("Experience").setExpLevel(newLevel);
        }
        else {
            RG.err("RG", "levelUpActor" , "New level must be > current level.");
        }
    }
    else {
        RG.err("RG", "levelUpActor" , "No exp. component found.");

    }
};

// Regexp for parsing dice expressions '2d4' or '1d6 + 1' etc.
RG.DIE_RE = /\s*(\d+)d(\d+)\s*(\+|-)?\s*(\d+)?/;

/** Parses die expression like '2d4' or '3d5 + 4' and returns it as an array [2,
 * 4, 0] or [3, 5, 4]. Returns empty array for invalid expressions.*/
RG.parseDieSpec = function(strOrArray) {
    if (typeof strOrArray === "object") {
        if (strOrArray.length >= 3) {
            return [strOrArray[0], strOrArray[1], strOrArray[2]];
        }
    }
    else {
        var match = RG.DIE_RE.exec(strOrArray);
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
            return [num, dType, mod];
        }
        else {
            RG.err("RG", "parseDieSpec", "Cannot parse: " + strOrArray);
        }
    }
    return [];
};

RG.ONE_SHOT_ITEMS = ["potion"];

/** Returns true if given item is one-shot use item by its type.*/
RG.isOneShotItem = function(item) {
    var itemType = item.getType();
    var index = RG.ONE_SHOT_ITEMS.indexOf(itemType);
    return index >= 0;
};

/** Destroys item (typically after use). */
RG.destroyItemIfNeeded = function(item) {
    if (RG.isOneShotItem(item)) {
        if (item.count === 1) {
            var msg = {item: item};
            RG.POOL.emitEvent(RG.EVT_DESTROY_ITEM, msg);
        }
        else {
            item.count -= 1;
        }
    }
};


/** Lookup table object for movement and actions keys.*/
RG.KeyMap = {

    moveKeyMap: { },

    // Start from W, go clock wise on keyboard
    initMap: function() {
        this.moveKeyMap[ROT.VK_W] = 0;
        this.moveKeyMap[ROT.VK_E] = 1;
        this.moveKeyMap[ROT.VK_D] = 2;
        this.moveKeyMap[ROT.VK_C] = 3;
        this.moveKeyMap[ROT.VK_X] = 4;
        this.moveKeyMap[ROT.VK_Z] = 5;
        this.moveKeyMap[ROT.VK_A] = 6;
        this.moveKeyMap[ROT.VK_Q] = 7;
    },

    inMoveCodeMap: function(code) {
        return this.moveKeyMap.hasOwnProperty(code);
    },

    isRest: function(code) {
        return code === ROT.VK_S;
    },

    /** Based on keycode, computes and returns a new x,y pair. If code is
     * invalid, returns null. */
    getDiff: function(code, x, y) {
        if (this.moveKeyMap.hasOwnProperty(code)) {
            var diff = ROT.DIRS[8][this.moveKeyMap[code]];
            var newX = x + diff[0];
            var newY = y + diff[1];
            return [newX, newY];
        }
        else if (code === ROT.VK_S) {
            return [x, y];
        }
        else {
            return null;
        }
    },

};
RG.KeyMap.initMap();



/** Contains generic 2D geometric functions for square/rectangle/etc
 * generation.*/
RG.Geometry = {

    /** Given start x,y and end x,y coordinates, returns all x,y coordinates in
     * the border of the rectangle.*/
    getHollowBox: function(x0, y0, maxX, maxY) {
        var res = [];
        for (var x = x0; x <= maxX; x++) {
            for (var y = y0; y <= maxY; y++) {
                if ((y === y0 || y === maxY || x === x0 || x === maxX) ) {
                    res.push([x, y]);
                }
            }
        }
        return res;
    },

};

/** Each die has number of throws, type of dice (d6, d20, d200...) and modifier
 * which is +/- X. */
RG.Die = function(num, dice, mod) {
    var _num = parseInt(num, 10);
    var _dice = parseInt(dice, 10);
    var _mod = parseInt(mod, 10);

    this.getNum = function() {return _num;};
    this.setNum = function(num) {_num = num;};
    this.getDice = function() {return _dice;};
    this.setDice = function(dice) {_dice = dice;};
    this.getMod = function() {return _mod;};
    this.setMod = function(mod) {_mod = mod;};

    this.roll = function() {
        var res = 0;
        for (var i = 0; i < _num; i++) {
            res += Math.floor(Math.random() * (_dice)) + 1;
        }
        return res + _mod;
    };

    this.toString = function() {
        var sign = "+";
        if (mod < 0) sign = "-";
        return _num + "d" + _dice + " " + sign + " " + _mod;
    };

    this.copy = function(rhs) {
        _num = rhs.getNum();
        _dice = rhs.getDice();
        _mod = rhs.getMod();
    };

    /** Returns true if dice are equal.*/
    this.equals = function(rhs) {
        res = _num === rhs.getNum();
        res = res && (_dice === rhs.getDice());
        res = res && (_mod === rhs.getMod());
        return res;
    };
};

/** Event pool can be used to emit events and register callbacks for listeners.
 * This decouples the emitter and listener from each other.  */
RG.EventPool = function() { // {{{2

    var _listeners = {};
    var _eventsNoListener = 0;

    /** Emits an event with given name. args must be in object-notation ie.
     * {data: "abcd"} */
    this.emitEvent = function (evtName, args) {
        if (!RG.isNullOrUndef([evtName])) {
            if (_listeners.hasOwnProperty(evtName)) {
                var called = _listeners[evtName];
                for (var i = 0; i < called.length; i++) {
                    called[i].notify(evtName, args);
                }
            }
            else {
                ++_eventsNoListener;
            }
        }
        else {
            RG.nullOrUndefError("EventPool: emitEvent", "Event name must be given.", evtName);
        }
    };

    /** Register an event listener. */
    this.listenEvent = function(evtName, obj) {
        if (!RG.isNullOrUndef([evtName])) {
            if (obj.hasOwnProperty("notify")) {
                if (_listeners.hasOwnProperty(evtName)) {
                    var index = _listeners[evtName].indexOf(obj);
                    if (index === -1) {
                        _listeners[evtName].push(obj);
                    }
                }
                else {
                    _listeners[evtName] = [];
                    _listeners[evtName].push(obj);
                }
            }
            else {
                console.error("Cannot add object. Listener must implement notify()!");
            }
        }
        else {
            RG.err("EventPool", "listenEvent", "Event name not well defined.");
        }
    };
};
RG.POOL = new RG.EventPool(); // Dangerous, global objects

/** Handles the game message listening and storing of the messages.  */
RG.MessageHandler = function() { // {{{2

    var _message = [];
    var _prevMessage = [];

    this.notify = function(evtName, msg) {
        if (evtName === RG.EVT_MSG) {
            if (msg.hasOwnProperty("msg")) {
                var msgObj = {msg: msg.msg, style: "prim"};

                if (msg.hasOwnProperty("cell")) {
                    msgObj.cell = msg.cell;
                }

                if (msg.hasOwnProperty("style")) {
                    msgObj.style = msg.style;
                }

                _message.push(msgObj);
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_MSG, this);

    this.getMessages = function() {
        if (_message.length > 0)
            return _message;
        else if (_prevMessage.length > 0)
            return _prevMessage;
        else
            return [];
    };

    this.clear = function() {
        if (_message.length > 0) _prevMessage = _message.slice();
        _message = [];
    };

}; // }}} Messages

//---------------------------------------------------------------------------
// ECS ENTITY
//---------------------------------------------------------------------------

RG.Entity = function() {

    var _id = RG.Entity.prototype.idCount++;

    var _comps = {};

    this.getID = function() {return _id;};

    this.get = function(name) {
        if (_comps.hasOwnProperty(name)) return _comps[name];
        return null;
    };

    this.add = function(name, comp) {
        _comps[name] = comp;
        comp.addCallback(this);
        RG.POOL.emitEvent(name, {entity: this, add: true});
    };

    this.has = function(name) {
        return _comps.hasOwnProperty(name);
    };

    this.remove = function(name) {
        if (_comps.hasOwnProperty(name)) {
            var comp = _comps[name];
            comp.removeCallback(this);
            delete _comps[name];
            RG.POOL.emitEvent(name, {entity: this, remove: true});
        }
    };

    this.getComponents = function() {return _comps;};

};
RG.Entity.prototype.idCount = 0;

if (typeof module !== "undefined" && typeof exports !== "undefined") {
    GS.exportSource(module, exports, ["RG"], [RG]);
}
else {
    GS.exportSource(undefined, undefined, ["RG"], [RG]);
}

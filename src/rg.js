

var GS = require("../getsource.js");
var ROT = GS.getSource(["ROT"], "./lib/rot.js");

/** Main object of the package for encapsulating all other objects. */
var RG = { // {{{2

    gameTitle: "Battles in the North (BitN)",

    IdCount: 0,

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
            //console.log("getPropClassOrChar XXX Name is |" + name + "|");
            if (styles.hasOwnProperty(name)) {
                return styles[name];
            }
            //console.log("getPropClassOrChar No name found for obj type " + objType);
            //for (var n in styles) console.log("\t\t===> " + n);
        }

        //console.log("getPropClassOrChar AFTER No name found for obj type " + objType);

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

    /** Returns shortest path between two points.*/
    getShortestPath: function(x0, y0, x1, y1) {
        var coords = [];
        var result = 0;
        var passableCallback = function(x, y) {return true;};
        var finder = new ROT.Path.Dijkstra(x1, y1, passableCallback);
        finder.compute(x0, y0, function(x, y) {
            coords.push({x: x, y: y});
            //console.log("PATH: " + x + ", " + y);
        });
        //console.log("Path is " + coords);
        return coords;
    },

    /** Returns shortest distance between two points.*/
    shortestDist: function(x0, y0, x1, y1) {
        var coords = this.getShortestPath(x0, y0, x1, y1);
        return coords.length - 1; // Subtract one because starting cell included
    },

    addCellStyle: function(prop, type, className) {
        if (this.cellStyles.hasOwnProperty(prop)) {
            this.cellStyles[prop][type] = className;
        }
        else {
            this.err("RG", "addCellStyle", "Unknown prop type: " + prop);
        }
    },

    addCharStyle: function(prop, type, charName) {
        if (this.charStyles.hasOwnProperty(prop)) {
            //console.log("Adding char for [" + prop + "][" + type + "] =" + charName);
            this.charStyles[prop][type] = charName;
        }
        else {
            this.err("RG", "addCharStyle", "Unknown prop type: " + prop);
        }
    },

    // These are used to select characters for map cells.
    charStyles: {
        elements: {
            "default": ".",
            "wall": "#",
            "ice wall": "#",
            "floor": ".",
            "stairsUp": "<",
            "stairsDown": ">",
            "water": "~",
        },
        actors: {
            "default": "X",
            "monster": "@",
            "player" : "@",
            "summoner" : "Z",
            "wolf"   : "w",
        },
        items: {
            "default": "(",
            "corpse" : "§",
            "potion" : "!",
            "spirit" : "*",
        },
        traps: {},
    },

    // These are used to select background and text color for map cells
    cellStyles: {
        elements: {
            "default": "cell-element-default",
            wall: "cell-element-wall",
            floor: "cell-element-floor",
            "ice wall": "cell-element-ice-wall",
        },
        actors: {
            "default": "cell-actor-default",
            "player": "cell-actor-player",
            "monster": "cell-actor-monster",
            "summoner": "cell-actor-summoner",
            "wolf": "cell-actor-animal",
        },
        items: {
            "potion": "cell-item-potion",
            "spirit": "cell-item-spirit",
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
    nullOrUndefError: function(obj, msg, val) {
        if (this.isNullOrUndef([val])) {
            var type = typeof obj;
            console.error("nullOrUndefError: " + type + ": " + msg);
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
        msg = msg[0].toUpperCase() + msg.substring(1);
        this.POOL.emitEvent(this.EVT_MSG, {msg: msg, style: "danger"});
    },

    gameMsg: function(msg) {
        msg = msg[0].toUpperCase() + msg.substring(1);
        this.POOL.emitEvent(this.EVT_MSG, {msg: msg, style: "prim"});
    },

    gameSuccess: function(msg) {
        msg = msg[0].toUpperCase() + msg.substring(1);
        this.POOL.emitEvent(this.EVT_MSG, {msg: msg, style: "success"});
    },

    gameWarn: function(msg) {
        msg = msg[0].toUpperCase() + msg.substring(1);
        this.POOL.emitEvent(this.EVT_MSG, {msg: msg, style: "warn"});
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

    strengthToDamage: function(str) {
        return Math.round(str / 4);
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
    TYPE_ITEM: "items",

}; /// }}} RG
RG.cellRenderArray = RG.cellRenderVisible;

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
            RG.nullOrUndefError(this, "Event name must be given.", evtName);
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
RG.POOL = new RG.EventPool(); // Global event pool for the game }}}

/** Handle the game message listening and storing of the messages.  */
RG.MessageHandler = function() { // {{{2

    var _message = [];
    var _prevMessage = [];

    this.notify = function(evtName, msg) {
        if (evtName === RG.EVT_MSG) {
            if (msg.hasOwnProperty("msg")) {
                if (msg.hasOwnProperty("style")) {
                    _message.push({msg: msg.msg, style: msg.style});
                }
                else {
                    _message.push({msg: msg.msg, style: "prim"});
                }
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

};
RG.Entity.prototype.idCount = 0;

if (typeof module !== "undefined" && typeof exports !== "undefined") {
    GS.exportSource(module, exports, ["RG"], [RG]);
}
else {
    GS.exportSource(undefined, undefined, ["RG"], [RG]);
}

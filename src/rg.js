
function getSource(key, fname) {
    var has_require = typeof require !== 'undefined';

    if (typeof window !== 'undefined') {
        var src = window[key];
    }

    if (typeof src === 'undefined' ) {
        if (has_require) {
          src = require(fname);
        }
        else throw new Error('Module ' + key + ' not found');
    }

    return src;
};

var ROT = getSource("ROT", "../lib/rot.js");

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

    /** Checks if actor's experience level can be increased.*/
    checkExp: function(actor) {
        var expLevel = actor.getExpLevel();
        var exp = actor.getExp();
        var nextLevel = expLevel + 1;
        var reqExp = 0;
        for (var i = 1; i <= nextLevel; i++) {
            reqExp += i * 10;
        }
        if (exp >= reqExp) {
            var hComp = actor.get("Health");
            actor.setExpLevel(nextLevel);

            hComp.setMaxHP(hComp.getMaxHP() + 5);
            hComp.setHP(hComp.getHP() + 5);

            actor.setAttack(actor.getAttack() + 1);
            actor.setDefense(actor.getDefense() + 1);
            RG.gameMsg(actor.getName() + " advanced to level " + nextLevel);
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
                item1["count"] = 1 + countToAdd;
            }
            return true;
        }
        return false;
    },

    /** Removes N items from the stack and returns them. Returns null if the
     * stack is not changed.*/
    removeStackedItems: function(itemStack, n) {
        if (n > 0) {
            if (itemStack.hasOwnProperty("count")) {
                if (n <= itemStack.count) {
                    itemStack.count -= n;
                    var rmvItem = itemStack.clone();
                    rmvItem.count = n;
                    return rmvItem;
                }
                else {
                    var rmvItem = itemStack.clone();
                    rmvItem.count = itemStack.count;
                    itemStack.count = 0;
                    return rmvItem;
                }
            }
            else { // Remove all
                itemStack.count = 0;
                var rmvItem = itemStack.clone();
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
        var dmg = missile.getDamage();
        dmg += Math.round(att.get("Stats").getAgility() / 3);
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

/** Typed objects should inherit from this. */
RG.TypedObject = function(propType, type) {

    var _type = type;
    var _propType = propType;

    this.setPropType = function(propType) {
        var index = this.types.indexOf(propType);
        if (index >= 0) {
            _propType = propType;
        }
        else {
            RG.err("TypedObject", "setPropType", "Unknown prop type: " + propType);
        }
    };

    this.getPropType = function() {return _propType;};

    this.setType = function(type) {
        _type = type;
        RG.nullOrUndefError(this, "arg |type|", type);
    };

    this.getType = function() {return _type;};

};

RG.TypedObject.prototype.types = ["actors", "items", "traps", "elements"];

/** This object is used by all locatable objects in the game.  */
RG.Locatable = function() { // {{{2
    RG.TypedObject.call(this, null);
    var _x = null;
    var _y = null;
    var _level = null;

    /** Simple getters/setters for coordinates.*/
    this.setX = function(x) {_x = x; };
    this.setY = function(y) {_y = y; };
    this.getX = function() {return _x;};
    this.getY = function() {return _y;};
    this.getXY = function() { return [_x, _y];};
    this.setXY = function(x,y) {
        _x = x;
        _y = y;
    };
    /** Sets the level of this locatable object.*/
    this.setLevel = function(level) {
        _level = level;
        RG.nullOrUndefError(this, "arg |level|", level);
    };

    this.getLevel = function() {
        return _level;
    };

    /** Returns true if object is located at a position on a level.*/
    this.isLocated = function() {
        return (_x !== null) && (_y !== null) && (_level !== null);
    };

    /** Returns true if locatables are in same position.*/
    this.isSamePos = function(obj) {
        if (_x !== obj.getX()) return false;
        if (_y !== obj.getY()) return false;
        if (_level !== obj.getLevel()) return false;
        return true;
    };



}; // }}} Locatable
RG.extend2(RG.Locatable, RG.TypedObject);

/** Ownable is sort of Locatable but it moves with its owner. This ensures that
 * for example item coordinates are up-to-date with the carrier.*/
RG.Ownable = function(owner) {
    RG.TypedObject.call(this, null);
    var _owner = owner;

    this.isSamePos = function(obj) {return _owner.isSamePos(obj);};

    this.getLevel = function() {return _owner.getLevel();};

    this.setOwner = function(owner) {
        if (RG.isNullOrUndef([owner])) {
            RG.err("Item", "setOwner", "Owner cannot be null.");
        }
        else {
            _owner = owner;
        }
    };
    this.getOwner = function() {return _owner;};

    this.getX = function() {
        if (_owner !== null) return _owner.getX();
        return null;
    };

    this.getY = function() {
        if (_owner !== null) return _owner.getY();
        return null;
    };

    this.getLevel = function() {
        if (_owner !== null) return _owner.getLevel();
        return null;
    };

};
RG.extend2(RG.Ownable, RG.TypedObject);

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

/** Top-level object for the game.  */
RG.RogueGame = function() { // {{{2

    var _cols = RG.COLS;
    var _rows = RG.ROWS;

    var _players      = [];
    var _levels       = [];
    var _activeLevels = [];
    var _shownLevel   = null;
    var _time         = "";
    var _gameOver     = false;

    var _mapGen = new RG.RogueMapGen();
    var _scheduler = new RG.RogueScheduler();
    var _msg = new RG.MessageHandler();

    // These systems updated after each action
    this.systemOrder = ["Attack", "Missile", "Movement", "Damage", "ExpPoints", "Communication"];
    this.systems = {};
    this.systems["Attack"] = new RG.AttackSystem("Attack", ["Attack"]);
    this.systems["Missile"] = new RG.MissileSystem("Missile", ["Missile"]);
    this.systems["Movement"] = new RG.MovementSystem("Movement", ["Movement"]);
    this.systems["Damage"] = new RG.DamageSystem("Damage", ["Damage", "Health"]);
    this.systems["ExpPoints"] = new RG.ExpPointsSystem("ExpPoints", 
        ["ExpPoints", "Experience"]);
    this.systems["Communication"] = new RG.CommunicationSystem("Communication",
        ["Communication"]);

    // Systems updated once each game loop
    this.loopSystems = {};
    this.loopSystems["Hunger"] = new RG.HungerSystem("Hunger", ["Action", "Hunger"]);

    this.getMessages = function() {
        return _msg.getMessages();
    };

    this.clearMessages = function() {
        _msg.clear();
    };

    this.shownLevel = function() {return _shownLevel;};
    this.setShownLevel = function(level) {_shownLevel = level;};

    this.doGUICommand = null;
    this.isGUICommand = null;
    this.nextActor = null;

    /** Returns next actor from the scheduling queue.*/
    this.getNextActor = function() {
        return _scheduler.next();
    };

    this.isGameOver = function() {
        return _gameOver;
    };

    /** Returns player(s) of the game.*/
    this.getPlayer = function() {
        if (_players.length === 1) {
            return _players[0];
        }
        else if (_players.length > 1) {
            return _players;
        }
        else {
            RG.err("Game", "getPlayer", "There are no players in the game.");
        }
    };

    /** Adds player to the game. By default, it's added to the first level.*/
    this.addPlayer = function(player) {
        if (_levels.length > 0) {
            if (_levels[0].addActorToFreeCell(player)) {
                _players.push(player);
                if (_shownLevel === null) {
                    _shownLevel = _levels[0];
                }
                RG.debug(this, "Added a player to the Game.");
                if (this.nextActor === null) this.nextActor = player;
                _levels[0].onEnter();
                _levels[0].onFirstEnter();
                return true;
            }
            else {
                RG.err("Game", "addPlayer", "Failed to add the player.");
                return false;
            }
        }
        else {
            RG.err("Game", "addPlayer", "No levels exist. Cannot add player.");
        }
        return false;
    };

    /** Adds an actor to scheduler.*/
    this.addActor = function(actor) {
        _scheduler.add(actor, true, 0);
    };

    /** Removes an actor from a scheduler.*/
    this.removeActor = function(actor) {
        _scheduler.remove(actor);
    };

    /** Adds an event to the scheduler.*/
    this.addEvent = function(gameEvent) {
        var repeat = gameEvent.getRepeat();
        var offset = gameEvent.getOffset();
        _scheduler.add(gameEvent, repeat, offset);
    };

    /** Performs one game action.*/
    this.doAction = function(action) {
        _scheduler.setAction(action);
        action.doAction();
        if (action.hasOwnProperty("energy")) {
            if (action.hasOwnProperty("actor")) {
                var actor = action.actor;
                if (actor.has("Action"))
                    actor.get("Action").addEnergy(action.energy);
            }
        }
    };

    var _levelMap = {};
    /** Adds one level to the game.*/
    this.addLevel = function(level) {
        _levels.push(level);
        if (!_levelMap.hasOwnProperty(level.getID())) {
            _levelMap[level.getID()] = level;
        }
        else {
            RG.err("Game", "addLevel", "Duplicate level ID " + level.getID());
        }
        if (_activeLevels.length === 0) this.addActiveLevel(level);
    };

    /** Sets which levels are actively simulated.*/
    this.addActiveLevel = function(level) {
        var levelID = level.getID();
        var index = _activeLevels.indexOf(levelID);

        // Check if a level must be removed
        if (_activeLevels.length === (RG.MAX_ACTIVE_LEVELS)) {
            if (index === -1) { // No room for new level, pop one
                var removedLevelID = _activeLevels.pop();
                var removedLevel = _levelMap[removedLevelID];
                var rmvActors = removedLevel.getActors();
                for (var i = 0; i < rmvActors.length; i++) {
                    rmvActors[i].get("Action").disable();
                }
                RG.debug(this, "Removed active level to make space...");
            }
            else { // Level already in actives, move to the front only
                _activeLevels.splice(index, 1);
                _activeLevels.unshift(levelID);
                RG.debug(this, "Moved level to the front of active levels.");
            }
        }

        // This is a new level, enable all actors
        if (index === -1) {
            _activeLevels.unshift(levelID);
            var actActors = level.getActors();
            for (var j = 0; j < actActors.length; j++) {
                actActors[j].get("Action").enable();
            }
        }
    };

    /* Returns the visible map to be rendered by GUI. */
    this.getVisibleMap = function() {
        var player = this.getPlayer();
        var map = player.getLevel().getMap();
        return map;
    };

    /** Must be called to advance the game by one player action. Non-player
     * actions are executed after the player action.*/
    this.update = function(obj) {
        if (!this.isGameOver()) {
            this.clearMessages();

            if (this.nextActor !== null) {
                if (obj.hasOwnProperty("evt")) {
                    var code = obj.evt.keyCode;
                    if (this.isGUICommand(code)) {
                        this.doGUICommand(code);
                    }
                    else {
                        this.updateGameLoop({code: code});
                    }
                }
                else {
                    this.updateGameLoop(obj);
                }
            }

        }
        else {
            this.clearMessages();
            RG.POOL.emitEvent(RG.EVT_MSG, {msg: "GAME OVER!"});

        }

    };

    /** Updates game for one player command, and a number of AI commands until
     * next player command.*/
    this.updateGameLoop = function(obj) {
        this.playerCommand(obj);
        this.nextActor = this.getNextActor();

        // Next/act until player found, then go back waiting for key...
        while (!this.nextActor.isPlayer() && !this.isGameOver()) {
            var action = this.nextActor.nextAction();
            this.doAction(action);

            for (var i = 0; i < this.systemOrder.length; i++) {
                var sysName = this.systemOrder[i];
                this.systems[sysName].update();
            }

            this.nextActor = this.getNextActor();
            if (RG.isNullOrUndef([this.nextActor])) {
                console.error("Game loop out of events! This is bad!");
                break;
            }
        }

        for (var s in this.loopSystems) this.loopSystems[s].update();

    };

    this.playerCommand = function(obj) {
        var action = this.nextActor.nextAction(obj);
        this.doAction(action);
        for (var i = 0; i < this.systemOrder.length; i++) {
            var sysName = this.systemOrder[i];
            this.systems[sysName].update();
        }
        this.visibleCells = this.shownLevel().exploreCells(this.nextActor);
    };

    this.isActiveLevel = function(level) {
        var index = _activeLevels.indexOf(level.getID());
        return index >= 0;

    };

    /** Used by the event pool. Game receives notifications about different
     * game events from child components. */
    this.notify = function(evtName, args) {
        if (evtName === RG.EVT_ACTOR_KILLED) {
            if (args.actor.isPlayer()) {
                if (_players.length === 1) {
                    _gameOver = true;
                    RG.gameMsg("GAME OVER!");
                }
            }
        }
        else if (evtName === RG.EVT_LEVEL_CHANGED) {
            var actor = args.actor;
            if (actor.isPlayer()) {
                _shownLevel = actor.getLevel();
                this.addActiveLevel(_shownLevel);
                args.src.onExit();
                args.src.onFirstExit();
                args.target.onEnter();
                args.target.onFirstEnter();
            }
        }
        else if (evtName === RG.EVT_DESTROY_ITEM) {
            var item = args.item;
            var owner = item.getOwner().getOwner(); // chaining due to inventory container
            if (!owner.getInvEq().removeItem(item)) {
                RG.err("Game", "notify - DESTROY_ITEM",
                    "Failed to remove item from inventory.");
            }
        }
        else if (evtName === RG.EVT_ACT_COMP_ADDED) {
            if (args.hasOwnProperty("actor")) {
                this.addActor(args.actor);
            }
            else {
                RG.err("Game", "notify - ACT_COMP_ADDED",
                    "No actor specified for the event.");
            }
        }
        else if (evtName === RG.EVT_ACT_COMP_REMOVED) {
            if (args.hasOwnProperty("actor")) {
                this.removeActor(args.actor);
            }
            else {
                RG.err("Game", "notify - ACT_COMP_ADDED",
                    "No actor specified for the event.");
            }
        }
        else if (evtName === RG.EVT_ACT_COMP_ENABLED) {
            if (args.hasOwnProperty("actor")) {
                this.addActor(args.actor);
            }
            else {
                RG.err("Game", "notify - ACT_COMP_ENABLED",
                    "No actor specified for the event.");
            }
        }
        else if (evtName === RG.EVT_ACT_COMP_DISABLED) {
            if (args.hasOwnProperty("actor")) {
                this.removeActor(args.actor);
            }
            else {
                RG.err("Game", "notify - ACT_COMP_DISABLED",
                    "No actor specified for the event.");
            }
        }
        else if (evtName === RG.EVT_LEVEL_PROP_ADDED) {
            if (args.propType === "actors") {
                if (this.isActiveLevel(args.level)) {
                    var actor = args.obj;
                    actor.get("Action").enable();
                }
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_ACTOR_CREATED, this);
    RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);
    RG.POOL.listenEvent(RG.EVT_LEVEL_CHANGED, this);
    RG.POOL.listenEvent(RG.EVT_DESTROY_ITEM, this);
    RG.POOL.listenEvent(RG.EVT_ACT_COMP_ADDED, this);
    RG.POOL.listenEvent(RG.EVT_ACT_COMP_REMOVED, this);
    RG.POOL.listenEvent(RG.EVT_ACT_COMP_ENABLED, this);
    RG.POOL.listenEvent(RG.EVT_ACT_COMP_DISABLED, this);
    RG.POOL.listenEvent(RG.EVT_LEVEL_PROP_ADDED, this);
}; // }}} Game


if ( typeof exports !== 'undefined' ) {
    if( typeof RG !== 'undefined' && module.exports ) {
        exports = module.exports = RG;
    }
    exports.RG = RG;
}
else {
    window.RG = RG;
}


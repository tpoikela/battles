
const $DEBUG = 0;


/* Main object of the package for encapsulating all other objects. */
const RG = {};

RG.gameTitle = 'Battles in the North (BitN)';

// Can be set to true for testing, when error conditions are checked
RG.suppressErrorMessages = false;

RG.cellRenderVisible = ['actors', 'items', 'traps', 'elements'];
RG.cellRenderAlways = ['items', 'traps', 'elements'];

/* Given Map.Cell, returns CSS classname used for styling that cell. */
RG.getCssClassForCell = function(cell, isVisible) {
    if (isVisible) {this.cellRenderArray = this.cellRenderVisible;}
    else {this.cellRenderArray = this.cellRenderAlways;}
    const className = this.getStyleClassForCell(cell);
    this.cellRenderArray = this.cellRenderVisible;
    return className;
};

/* Same as getClassName, but optimized for viewing the full map. */
RG.getCssClassFullMap = function(cell) {
    this.cellRenderArray = this.cellRenderVisible;

    if (!cell.hasProps()) {
        const baseType = cell.getBaseElem().getType();
        return this.cellStyles.elements[baseType];
    }

    for (let i = 0; i < 4; i++) {
        const propType = this.cellRenderVisible[i];
        if (cell.hasProp(propType)) {
            const props = cell.getProp(propType);
            const styles = this.cellStyles[propType];
            return this.getPropClassOrChar(styles, props[0]);
        }
    }
    return null;
};

/* Given Map.Cell, returns a char that is rendered for the cell. */
RG.getCharForCell = function(cell, isVisible) {
    if (isVisible) {this.cellRenderArray = this.cellRenderVisible;}
    else {this.cellRenderArray = this.cellRenderAlways;}
    const cellChar = this.getCellChar(cell);
    this.cellRenderArray = this.cellRenderVisible;
    return cellChar;
};

/* Same as getChar, but optimized for full map viewing. */
RG.getCharFullMap = function(cell) {
    this.cellRenderArray = this.cellRenderVisible;

    if (!cell.hasProps()) {
        const baseType = cell.getBaseElem().getType();
        return this.charStyles.elements[baseType];
    }

    for (let i = 0; i < 4; i++) {
        if (cell.hasProp(this.cellRenderVisible[i])) {
            const props = cell.getProp(this.cellRenderVisible[i]);
            const styles = this.charStyles[this.cellRenderVisible[i]];
            return this.getPropClassOrChar(styles, props[0]);
        }
    }
    return null;
};

/* Maps a cell to specific object in stylesheet. For rendering purposes
 * only.*/
RG.getStyleClassForCell = function(cell) {
    if (!cell.isExplored()) { return 'cell-not-explored';}

    for (let i = 0; i < this.cellRenderArray.length; i++) {
        const propType = this.cellRenderArray[i];
        if (cell.hasProp(propType)) {
            const props = cell.getProp(propType);
            const styles = this.cellStyles[propType];
            const propObj = props[0];
            return this.getPropClassOrChar(styles, propObj);
        }
    }

    const baseType = cell.getBaseElem().getType();
    return this.cellStyles.elements[baseType];
};

/* styles is either a LUT of chars or LUT of CSS classnames. */
RG.getPropClassOrChar = function(styles, propObj) {

    // Return by name, this is for object shells generally
    let lookupKey = null;
    if (propObj.getName) {
        lookupKey = propObj.getName();
        if (!styles.hasOwnProperty(lookupKey)) {
            lookupKey = propObj.getType();
        }
    }
    else {
        lookupKey = propObj.getType();
    }

    // By type is usually for basic elements
    if (styles.hasOwnProperty(lookupKey)) {
        if (typeof styles[lookupKey] === 'object') {
            // Invoke a state querying function
            for (const p in styles[lookupKey]) {
                if (p !== 'default') {
                    const funcToCall = p;
                    const res = propObj[funcToCall]();

                    if (res === true) {
                        return styles[lookupKey][p];
                    }
                    else if (res !== false) {
                        return res;
                    }
                }
            }
            return styles[lookupKey]['default'];

        }
        return styles[lookupKey];
    }
    else {
        return styles['default'];
    }
};

/* Returns char which is rendered on the map cell based on cell contents.*/
RG.getCellChar = function(cell) {
    if (!cell.isExplored()) {return 'X';}

    for (let i = 0; i < this.cellRenderArray.length; i++) {
        // const propType = this.cellRenderArray[i];
        if (cell.hasProp(this.cellRenderArray[i])) {
            const props = cell.getProp(this.cellRenderArray[i]);
            const styles = this.charStyles[this.cellRenderArray[i]];
            const propObj = props[0];
            return this.getPropClassOrChar(styles, propObj);
        }
    }

    const baseType = cell.getBaseElem().getType();
    return this.charStyles.elements[baseType];
};


/* Adds a CSS class for given prop and type. For example, "actors", "wolf",
 * "cell-actor-wolf" uses CSS class .cell-actor-wolf to style cells with
 * wolves in them. */
RG.addCellStyle = function(prop, type, className) {
    if (this.cellStyles.hasOwnProperty(prop)) {
        this.cellStyles[prop][type] = className;
    }
    else {
        this.err('RG', 'addCellStyle', 'Unknown prop type: ' + prop);
    }
};

/* Adds a char to render for given prop and type. Example: "actors",
 * "wolf", "w" renders 'w' for cells containing wolves.*/
RG.addCharStyle = function(prop, type, charName) {
    if (this.charStyles.hasOwnProperty(prop)) {
        this.charStyles[prop][type] = charName;
    }
    else {
        this.err('RG', 'addCharStyle', 'Unknown prop type: ' + prop);
    }
};

RG.getChar = function(prop, name, state = null) {
    if (this.charStyles.hasOwnProperty(prop)) {
        if (state) {
            return this.charStyles[prop][name][state];
        }
        return this.charStyles[prop][name];
    }
    return 'X';
};

RG.getCssClass = function(prop, name, state = null) {
    if (this.cellStyles.hasOwnProperty(prop)) {
        if (state) {
            return this.cellStyles[prop][name][state];
        }
        if (this.cellStyles[prop].hasOwnProperty(name)) {
            return this.cellStyles[prop][name];
        }
    }
    return '';
};

// These are used to select rendered characters for map cells.
RG.charStyles = {
    elements: {
        battle: 'X',
        bridge: '=',
        chasm: '~',
        default: '.',
        exit: '.',
        exploration: '?',
        floor: '.',
        floorcave: '.',
        floorcrypt: '.',
        floorhouse: '.',
        fort: '#',
        grass: '"',
        highrock: '^',
        lava: '~',
        lever: '&',
        leverdoor: {
            isClosed: '+', // if isClosed() returns true
            default: '/'
        },
        marker: {
            getChar: '', // use value from getChar()
            default: 'X'
        },
        mountain: '^',
        path: '.',
        passage: '.',
        placeholder: '?',
        sky: '~',
        road: '.',
        shop: ':',
        snow: '.',
        stairsDown: '>',
        stairsUp: '<',
        stone: '^',
        town: 'o',
        tree: 'T',
        wall: '#',
        wallcave: '#',
        wallcrypt: '#',
        wallice: '#',
        wallwooden: '#',
        wallmount: '^',
        water: '~',
        // Elements with different states
        door: {
            isClosed: '+', // if isClosed() returns true
            default: '/'
        }
    },
    actors: {
        default: 'X',
        monster: '@',
        player: '@',
        spirit: 'Q',
        summoner: 'Z',
        wolf: 'w'
    },
    items: {
        default: '?',
        corpse: '§',
        potion: '!',
        spiritgem: '*'
    },
    traps: {}
};

// These are used to select the CSS class for map cells.
RG.cellStyles = {
    elements: {
        battle: 'cell-element-battle',
        bridge: 'cell-element-bridge',
        chasm: 'cell-element-chasm',
        default: 'cell-element-default',
        door: 'cell-element-door',
        exit: 'cell-element-exit',
        exploration: 'cell-element-exploration',
        floor: 'cell-element-floor',
        floorcave: 'cell-element-floor-cave',
        floorcrypt: 'cell-element-floor-crypt',
        floorhouse: 'cell-element-floor-house',
        fort: 'cell-element-fort',
        grass: 'cell-element-grass',
        highrock: 'cell-element-highrock',
        marker: {
            getClassName: '', // Use value from get
            default: 'cell-element-marker'
        },
        mountain: 'cell-element-mountain',
        lava: 'cell-element-lava',
        lever: 'cell-element-door',
        leverdoor: 'cell-element-door',
        passage: 'cell-element-passage',
        path: 'cell-element-path',
        placeholder: 'cell-element-placeholder',
        road: 'cell-element-road',
        sky: 'cell-element-sky',
        shop: 'cell-element-shop',
        snow: 'cell-element-snow',
        stone: 'cell-element-stone',
        stairsDown: 'cell-element-stairs',
        stairsUp: 'cell-element-stairs',
        town: 'cell-element-town',
        tree: 'cell-element-tree',
        wall: 'cell-element-wall',
        wallcave: 'cell-element-wall-cave',
        wallcrypt: 'cell-element-wall-crypt',
        wallice: 'cell-element-wall-ice',
        wallwooden: 'cell-element-wall-wooden',
        wallmount: 'cell-element-wall-mount',
        water: 'cell-element-water'
    },
    actors: {
        default: 'cell-actor-default',
        player: 'cell-actor-player',
        monster: 'cell-actor-monster',
        summoner: 'cell-actor-summoner',
        wolf: 'cell-actor-animal',
        spirit: 'cell-actor-spirit'
    },
    items: {
        potion: 'cell-item-potion',
        spiritgem: 'cell-item-spiritgem',
        default: 'cell-item-default'
    },
    traps: {
        default: 'cell-traps'
    }
};

RG.debug = function(obj, msg) {
    if ($DEBUG) {
        const inst = typeof obj;
        const json = JSON.stringify(obj);
        console.log(`[DEBUG]: Type: ${inst} ${json} |${msg}|`);
    }
};

RG.err = function(obj, fun, msg) {
    if (!this.suppressErrorMessages) {
        const formattedMsg = `[ERROR]: ${obj} ${fun} -> |${msg}|`;
        console.error(formattedMsg);
        throw new Error(formattedMsg);
    }
};

RG.warn = function(obj, fun, msg) {
    if (!this.suppressWarningMessages) {
        const formattedMsg = `[WARN]: ${obj} ${fun} -> |${msg}|`;
        console.error(formattedMsg);
    }
};

RG.diag = function(obj) {
    if (!this.suppressDiagnosticMessages) {
        // Supposed to show the filename (of the caller)
        // With bundling, this does not work very well
        const split = new Error().stack.split('at ');
        if (split.length > 3) {
            const linfo = split[3].trim();
            console.info(linfo);
        }
        console.info(obj);
    }
};


/* Used to inherit from a prototype. Supports multiple inheritance but
 * sacrifices instanceof.*/
RG.extend2 = function(Child, Parent) {
    if (RG.isNullOrUndef([Child])) {
        RG.err('RG', 'extend2',
            `Child not defined. Parent: ${Parent}`);
    }
    if (RG.isNullOrUndef([Parent])) {
        RG.err('RG', 'extend2',
            `Parent not defined. Child: ${Child}`);
    }

    const p = Parent.prototype;
    const c = Child.prototype;
    for (const i in p) {
        if (!c.hasOwnProperty(i)) {
            c[i] = p[i];
        }
    }
    if (c.hasOwnProperty('uber')) {
        const ubers = [c.uber];
        ubers.push(p);
        c.uber = ubers;
    }
    else {
        c.uber = [];
        c.uber.push(p);
    }
};

/* Prints an error into console if 'val' is null or undefined.*/
RG.nullOrUndefError = function(name, msg, val) {
    if (this.isNullOrUndef([val])) {
        const formattedMsg = `nullOrUndef ${name} ${msg}`;
        console.error(formattedMsg);
        throw new Error(formattedMsg);
    }
};

/* Returns true if anything in the list is null or undefined.*/
RG.isNullOrUndef = function(list) {
    for (let i = 0; i < list.length; i++) {
        if (list[i] === null || typeof list[i] === 'undefined' ||
            typeof list === 'undefined') {
            return true;
        }
    }
    return false;
};

// -------------------------------------------------
// Functions for emitting in-game messages to player
// -------------------------------------------------

// Accepts 2 different arguments:
// 1. A simple string messages
// 2. {msg: "Your message", cell: Origin cell of messaage}
// Using 2. messages can be easily filtered by position.
RG.gameMsg = function(msg) {
    this.emitMsgEvent('prim', msg);
};

RG.gameInfo = function(msg) {
    this.emitMsgEvent('info', msg);
};

RG.gameDescr = function(msg) {
    this.emitMsgEvent('descr', msg);
};

RG.gameSuccess = function(msg) {
    this.emitMsgEvent('success', msg);
};

RG.gameWarn = function(msg) {
    this.emitMsgEvent('warn', msg);
};

RG.gameDanger = function(msg) {
    this.emitMsgEvent('danger', msg);
};

/* Emits message event with cell origin, style and message. */
RG.emitMsgEvent = function(style, msg) {
    let newMsg = '';
    if (typeof msg === 'object') {
        const cell = msg.cell;
        newMsg = msg.msg;
        newMsg = newMsg[0].toUpperCase() + newMsg.substring(1);

        const msgObject = {cell, msg: newMsg, style};
        this.POOL.emitEvent(this.EVT_MSG, msgObject);
    }
    else {
        newMsg = msg[0].toUpperCase() + msg.substring(1);
        this.POOL.emitEvent(this.EVT_MSG, {msg: newMsg, style});
    }

};

/* Tries to add item2 to item1 stack. Returns true on success.*/
RG.addStackedItems = function(item1, item2) {
    if (item1.equals(item2)) {
        let countToAdd = 1;
        if (item2.count) {
            countToAdd = item2.count;
        }

        // Check if item1 already stacked
        if (item1.count) {
            item1.count += countToAdd;
        }
        else {
            item1.count = 1 + countToAdd;
        }
        return true;
    }
    return false;
};

/* Removes N items from the stack and returns them. Returns null if the
 * stack is not changed.*/
RG.removeStackedItems = function(itemStack, n) {
    if (n > 0) {
        let rmvItem = null;
        if (itemStack.count) {
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
};

//--------------------------------------------------------------
// COMBAT-RELATED FUNCTIONS
//--------------------------------------------------------------

RG.getItemDamage = function(item) {
    if (item.rollDamage) {
        return item.rollDamage();
    }
    else {
        const weight = item.getWeight();
        return Math.ceil(weight / 1.1);
    }
};

RG.getMeleeAttack = function(att) {
    let attack = att.getAttack();
    const missile = att.getInvEq().getEquipment().getItem('missile');
    const missWeapon = att.getInvEq().getMissileWeapon();
    if (missile) {attack -= missile.getAttack();}
    if (missWeapon) {attack -= missWeapon.getAttack();}
    return attack;
};

RG.getMeleeDamage = function(att) {

};

RG.getMeleeDamageAdded = function(att) {
    let dmg = att.getCombatBonus('getDamage');
    dmg += RG.strengthToDamage(att.getStrength());
    return dmg;
};

RG.getMeleeAttackInfo = function(att) {
    let result = 'Att: ' + RG.getMeleeAttack(att);
    const weapon = att.getWeapon();
    if (weapon) {
        result += ' D: ' + weapon.getDamageDie().toString();
    }
    else {
        result += ' D: ' + att.get('Combat').getDamageDie().toString();
    }
    result += ' + ' + RG.getMeleeDamageAdded(att);
    return result;
};

RG.getMissileAgilityDmg = function(agi) {
    return Math.round(agi / 3);
};

RG.getMissileDamageAdded = function(att, miss) {
    let dmg = RG.getMissileAgilityDmg(att.get('Stats').getAgility());
    if (miss.has('Ammo')) {
        dmg += att.getMissileWeapon().rollDamage();
    }
    if (att.has('StrongShot')) {
        dmg += this.strengthToDamage(att.getStrength());
    }
    return dmg;
};

RG.getMissileDamage = function(att, miss) {
    let dmg = miss.rollDamage();
    dmg += RG.getMissileDamageAdded(att, miss);
    return dmg;
};

RG.getMissileAttack = function(att) {
    let attack = att.get('Combat').getAttack();
    attack += att.getInvEq().getEquipment().getAttack();
    attack += att.get('Stats').getAccuracy() / 2;
    attack += att.getInvEq().getEquipment().getAccuracy() / 2;

    // Subtract melee weapon
    const weapon = att.getWeapon();
    if (weapon) {
        if (weapon.getAttack) {
            attack -= weapon.getAttack();
        }
    }

    return attack;
};

/* Returns the missile attack info in a string. */
RG.getMissileAttackInfo = function(att) {
    const missWeapon = att.getMissileWeapon();
    const miss = att.getInvEq().getMissile();
    if (!miss) {
        return 'No missile equipped';
    }

    let result = 'Att: ' + RG.getMissileAttack(att);
    result += ' D: ' + miss.getDamageDie().toString();
    if (missWeapon) {
        const dmgDie = missWeapon.getDamageDie();
        result += ' + ' + dmgDie.toString() + ' (wpn)';
    }

    const dmg = RG.getMissileDamageAdded(att, miss);
    result += ' + ' + dmg;
    result += ' R: ' + RG.getMissileRange(att, miss);
    return result;
};

RG.getMissileRange = function(att, miss) {
    let range = miss.getAttackRange();
    if (miss.has('Ammo')) {
        const missWeapon = att.getMissileWeapon();
        if (missWeapon) {
            const weaponRange = missWeapon.getAttackRange();
            range += weaponRange;
        }
        else {
            return 0;
        }
    }
    if (att.has('LongRangeShot')) {range *= 2;}
    if (att.has('EagleEye')) {range += 2;}
    if (att.has('Skills')) {
        if (miss.has('Ammo')) {
            range += att.get('Skills').getLevel('Archery');
        }
        else {
            range += att.get('Skills').getLevel('Throwing');
        }
    }
    return range;
};

RG.strengthToDamage = function(str) {
    return Math.round(str / 4);
};

/* Given actor and cells it sees, returns first enemy cell found.*/
RG.findEnemyCellForActor = function(actor, seenCells) {
    const res = [];
    const actorCells = seenCells.filter(c => c.hasActors());
    actorCells.forEach(cell => {
        const actors = cell.getActors();
        let found = false;
        for (let j = 0; j < actors.length; j++) {
            if (actor !== actors[j]) {
                if (typeof actors[j].isEnemy === 'function') {
                    if (actors[j].isEnemy(actor)) {
                        found = true;
                    }
                }
            }
        }
        if (found) {res.push(cell);}
    });
    return res;
};

RG.POOL = null; // Global event pool

//--------------------------------------------------------------
// CONSTANTS
//--------------------------------------------------------------

RG.PLAYER_FOV_RANGE = 10;
RG.NPC_FOV_RANGE = 5; // Default FOV range for actor

RG.ACTION_DUR = 100; // Base duration of action
RG.BASE_SPEED = 100; // Base speed of actors
RG.DEFAULT_HP = 50;

// How many levels are simulated at once, having more adds realism
// but slows down the game, affects Game.Engine
RG.MAX_ACTIVE_LEVELS = 3;

//----------------------
// Different game events
//----------------------
RG.EVT_ACTOR_CREATED = Symbol();
RG.EVT_ACTOR_KILLED = Symbol();
RG.EVT_DESTROY_ITEM = Symbol();
RG.EVT_MSG = Symbol();

RG.EVT_LEVEL_CHANGED = Symbol();
RG.EVT_LEVEL_ENTERED = Symbol();
RG.EVT_TILE_CHANGED = Symbol();
RG.EVT_EXPLORED_ZONE_LEFT = Symbol();

RG.EVT_LEVEL_PROP_ADDED = Symbol();
RG.EVT_LEVEL_PROP_REMOVED = Symbol();

RG.EVT_ACT_COMP_ADDED = Symbol();
RG.EVT_ACT_COMP_REMOVED = Symbol();
RG.EVT_ACT_COMP_ENABLED = Symbol();
RG.EVT_ACT_COMP_DISABLED = Symbol();

RG.EVT_WIN_COND_TRUE = Symbol();

RG.EVT_ANIMATION = Symbol();

RG.EVT_BATTLE_OVER = Symbol();
RG.EVT_ARMY_EVENT = Symbol();

// Mostly used at low-level by System.Event
RG.EVT_ITEM_PICKED_UP = Symbol();
RG.EVT_ACTOR_DAMAGED = Symbol();
RG.EVT_ACTOR_ATTACKED = Symbol();
RG.EVT_ACTOR_USED_STAIRS = Symbol();

//----------------------------
// Different entity/prop types
//----------------------------
RG.TYPE_ACTOR = 'actors';
RG.TYPE_ELEM = 'elements';
RG.TYPE_ITEM = 'items';
RG.TYPE_TRAP = 'traps';

RG.ITEM_TYPES = ['ammo', 'armour', 'food', 'gold', 'goldcoin',
    'missile', 'missileweapon', 'potion', 'spiritgem', 'weapon'];

RG.USE = {
    DRINK: 'DRINK',
    DIG: 'DIG',
    LEVER: 'LEVER'
};

RG.LEVEL_ID_ADD = 1000000000;
RG.ENTITY_ID_ADD = 1000000000;

//----------------------------
// Different level types
//----------------------------

RG.LEVEL_EMPTY = 'empty';
RG.LEVEL_FOREST = 'forest';
RG.LEVEL_MOUNTAIN = 'mountain';

// Energy per action
RG.energy = {
    ATTACK: 15,
    DEFAULT: 5,
    JUMP: 50,
    MISSILE: 10,
    MOVE: 10,
    PICKUP: 5,
    REST: 5,
    RUN: 20,
    USE: 5
};

// Actor biases for different goals
RG.BIAS = {
    ALWAYS: 10.0,
    NOT_POSSIBLE: -10.0,
    Explore: 0.2,
    Flee: 0.2,
    Guard: 1.1,
    Order: 0.7,
    Patrol: 1.0
};

// Different fighting modes
RG.FMODE_NORMAL = 0;
RG.FMODE_FAST = 1;
RG.FMODE_SLOW = 2;

RG.PROT_BYPASS_CHANCE = 0.05;
RG.MISSILE_CRITICAL_SHOT = 0.1;

// 0.0 = uniform dist, higher number assigns more weight to median values
RG.DANGER_ADJ_FACTOR = 1.4;
RG.DAMAGE_ADJ_FACTOR = 2;
RG.PLAYER_HP_REGEN_PERIOD = 40;
RG.PLAYER_PP_REGEN_PERIOD = 40;
RG.MIN_VALUE = 30; // Min value for generated items.

RG.TRAINER_PROB = 0.2;
RG.EPIC_PROB = 0.05;

RG.GOLD_COIN_WEIGHT = 0.03; // kg
RG.GOLD_COIN_NAME = 'Gold coin';

RG.HUNGER_PROB = 0.10; // Prob. of starvation to cause damage every turn
RG.HUNGER_DMG = 1; // Damage caused by starvation kicking in

// This is a subset of ITEM_TYPES, excluding gold items
RG.SHOP_TYPES = ['ammo', 'armour', 'food',
    'missile', 'missileweapon', 'potion', 'rune', 'spiritgem', 'weapon'
];

// Alignments (TODO make more diverse)
RG.ALIGN_GOOD = 'ALIGN_GOOD';
RG.ALIGN_EVIL = 'ALIGN_EVIL';
RG.ALIGN_NEUTRAL = 'ALIGN_NEUTRAL';

RG.GOOD_RACES = ['human', 'spirit'];
RG.EVIL_RACES = ['catfolk', 'dogfolk', 'wolfclan', 'wildling', 'undead',
    'goblin'];
RG.NEUTRAL_RACES = ['dwarf', 'bearfolk', 'animal'];

RG.ACTOR_RACES = ['catfolk', 'dogfolk', 'wolfclan', 'wildling', 'goblin',
    'bearfolk', 'dwarf', 'human', 'hyrkhian'];

// Constants for movement directions
RG.CARDINAL_DIR = Object.freeze(['north', 'south', 'east', 'west']);
RG.CARDINAL_DIR_ABBR = Object.freeze(['N', 'S', 'E', 'W']);

RG.DIR = {
    N: [0, -1],
    S: [0, 1],
    E: [1, 0],
    W: [-1, 0],
    NE: [1, -1],
    SE: [1, 1],
    NW: [-1, -1],
    SW: [-1, 1]
};

RG.DIR_NSEW = [RG.DIR.N, RG.DIR.S, RG.DIR.E, RG.DIR.W];
RG.DIR_DIAG = [RG.DIR.NE, RG.DIR.SE, RG.DIR.NW, RG.DIR.SW];

RG.dirTodXdY = function(dir) {
    const ucDir = dir.toUpperCase();
    return RG.DIR[ucDir];
};

RG.dxdYToDir = function(dXdY) {
    const [dX, dY] = dXdY;
    let result = '';
    if (dY === 1) {result += 'S';}
    else if (dY === -1) {result += 'N';}
    if (dX === 1) {result += 'E';}
    else if (dX === -1) {result += 'W';}
    return result;
};

RG.DMG = {
    BLUNT: 'BLUNT',
    COLD: 'COLD',
    ENERGY: 'ENERGY',
    FIRE: 'FIRE',
    HUNGER: 'HUNGER',
    ICE: 'ICE',
    LIGHTNING: 'LIGHTNING',
    MAGIC: 'MAGIC',
    MELEE: 'MELEE',
    MISSILE: 'MISSILE',
    PIERCE: 'PIERCE',
    POISON: 'POISON',
    SLASH: 'SLASH'
};

RG.STATS = [
    'Accuracy', 'Agility', 'Magic', 'Perception', 'Strength', 'Willpower'
];

RG.STATS_LC = RG.STATS.map(stat => stat.toLowerCase());

// Load status when using chunk unloading
RG.LEVEL_NOT_LOADED = 'LEVEL_NOT_LOADED';
RG.TILE_NOT_LOADED = 'TILE_NOT_LOADED';

RG.ACTOR_RACES = RG.ACTOR_RACES.sort(); // Too lazy to manually order them

RG.STATS_ABBR = RG.STATS.map(stat => stat.substr(0, 3));
RG.GET_STATS = RG.STATS.map(stat => 'get' + stat);
RG.SET_STATS = RG.STATS.map(stat => 'set' + stat);

RG.getObjRef = (type, obj) => {
    if (type === 'entity') {
        return {objRef: {type, id: obj.getID()}};
    }
    const json = obj.toJSON();
    RG.err('RG', 'getObjRef',
        `Type ${type} not supported. Obj: ${json}`);
    return null;
};

/* Returns a forest level configuration scaled to the size of the level. */
RG.getForestConf = function(cols, rows) {
    const xMult = cols / RG.LEVEL_MEDIUM_X;
    const yMult = rows / RG.LEVEL_MEDIUM_Y;
    const mult = xMult * yMult;

    const levelConf = {
        ratio: 0.5,
        nForests: Math.floor(mult * 30),
        forestSize: 100
    };
    return levelConf;
};

RG.cellRenderArray = RG.cellRenderVisible;

RG.PROP_TYPES = [RG.TYPE_ACTOR, RG.TYPE_ELEM, RG.TYPE_ITEM, RG.TYPE_TRAP];
// Fighting modes
RG.FMODES = [RG.FMODE_NORMAL, RG.FMODE_FAST, RG.FMODE_SLOW];

RG.ALIGNMENTS = [RG.ALIGN_GOOD, RG.ALIGN_NEUTRAL, RG.ALIGN_EVIL];

RG.cellRenderArray = RG.cellRenderVisible;

/* Returns danger probabilites for given level.*/
RG.getDangerProb = (min, max) => {
    if (min > max) {
        console.error('RG.getDangerProb param order is min < max');
        console.error(`\tGot min: ${min}, max: ${max}`);
        return {};
    }
    const level = max + 1;
    const arr = [];
    for (let j = min; j <= level; j++) {
        arr.push(j);
    }

    const last = arr.length - 1;
    const maxArr = arr[last];

    const highPoint = (maxArr % 2 === 0) ? maxArr / 2 : (maxArr + 1) / 2;
    const obj = {};

    arr.forEach( val => {
        const absDiff = Math.abs(val - highPoint);
        let prob = maxArr - Math.floor(RG.DANGER_ADJ_FACTOR * absDiff);
        prob = (prob === 0) ? prob + 1 : prob;
        obj[val] = prob;

    });

    return obj;
};

RG.getMaxDanger = (xDiff, yDiff) => {
    let maxDanger = 2 * yDiff + xDiff;
    if (maxDanger < 2) {maxDanger = 2;}
    return maxDanger;
};

RG.getMaxValue = (xDiff, yDiff) => {
    let maxValue = 20 * yDiff + 10 * xDiff;
    if (maxValue <= RG.MIN_VALUE) {
        maxValue = RG.MIN_VALUE;
    }
    return maxValue;
};

/* Returns the weight distribution for foods. This is something like
 * {0.1: 10, 0.2: 7, 0.3: 5, 0.5: 1} etc.*/
RG.getFoodWeightDistr = () => ({
    0.1: 20,
    0.2: 10,
    0.3: 5,
    0.4: 3,
    0.5: 1
});

/* Returns the count distribution for gold coins. */
RG.getGoldCoinCountDistr = nLevel => {
    const maxVal = nLevel + 1;
    const dist = {};
    for (let i = 1; i <= maxVal; i++) {
        dist[i] = nLevel;
    }
    return dist;
};

RG.getRuneChargeDistr = () => ({
    1: 10,
    2: 30,
    3: 10,
    4: 5,
    5: 2
});

//--------------------------------
// Value/gold/buy/sell functions
//--------------------------------

/* Converts abstract value into gold weight. */
RG.valueToGoldWeight = value => {
    let currVal = value;
    let slope = 1;
    while (currVal >= 100) {
        currVal -= 100;
        ++slope;
    }
    const adjValue = slope * value + 10;
    return adjValue / 200;
};

/* Scales (up) the value of item if any extra bonuses or modifiers are added to
 * it. */
RG.scaleItemValue = (type, bonus, item) => {
    const currValue = item.getValue();
    let mult = 1;
    switch (type) {
        case 'combat': mult *= (1.0 + 0.1 * bonus); break;
        case 'stats': mult *= (1.0 + 0.2 * bonus); break;
        default: mult = 1;
    }
    const newValue = Math.floor(currValue * mult);
    item.setValue(newValue);
};

/* Returns true if given actor has gold at least equal to given gold weight. */
RG.hasEnoughGold = (actor, goldWeight) => {
    const ncoins = RG.getGoldInCoins(goldWeight);
    const items = actor.getInvEq().getInventory().getItems();
    for (let i = 0; i < items.length; i++) {
        if (items[i].getType() === 'goldcoin') {
            if (items[i].count >= ncoins) {
                // items[i].count -= ncoins;
                return true;
            }
        }
    }
    return false;
};

/* Tries to remove given amount of gold coins from the actor. Returns the number
 * of coins removed. */
RG.removeNCoins = (actor, ncoins) => {
    let ncoinsRemoved = 0;
    const items = actor.getInvEq().getInventory().getItems();
    let coinsFound = null;
    for (let i = 0; i < items.length; i++) {
        if (items[i].getType() === 'goldcoin') {
            if (items[i].count > ncoins) {
                ncoinsRemoved = ncoins;
                items[i].count -= ncoins;
            }
            else {
                coinsFound = items[i];
                ncoinsRemoved = coinsFound.count;
                coinsFound.count = 0;
            }
        }
    }
    // Need to remove coins item from buyer inventory
    if (coinsFound !== null) {
        actor.getInvEq().removeItem(coinsFound);
    }
    return ncoinsRemoved;
};

/* Trades the given gold weight from given to another actor. */
RG.tradeGoldWeightFromTo = (gw, actorFrom, actorTo) => {
    const nCoins = RG.getGoldInCoins(gw);
    const coins = new RG.Item.GoldCoin();
    coins.count = RG.removeNCoins(actorFrom, nCoins);
    actorTo.getInvEq().addItem(coins);
};

/* Returns the total stat value of the given stat. Note that stat must be given
 * in getter format ie 'getStrength', not Strength. */
RG.getItemStat = (getFuncName, item) => {
    if (!item) {return 0;}

    let result = 0;
    if (typeof item[getFuncName] === 'function') {
        result += item[getFuncName]();
    }
    if (item.has('Stats')) {
        const sComp = item.get('Stats');
        if (typeof sComp[getFuncName] === 'function') {
            result += sComp[getFuncName]();
        }
    }
    if (item.has('GemBound')) {
        const gem = item.get('GemBound').getGem();
        if (typeof gem[getFuncName] === 'function') {
            result += gem[getFuncName]();
        }
    }
    return result;

};

RG.getExpRequired = (newLevel) => {
    let reqExp = 0;
    for (let i = 1; i <= newLevel; i++) {
        reqExp += (i - 1) * 10;
    }
    return reqExp;
};

/* Returns the dX,dY of two coordinates or objects. */
RG.dXdY = (dest, src) => {
    let [xDest, yDest, xSrc, ySrc] = [0, 0, 0, 0];
    if (Array.isArray(dest)) {
        xDest = dest[0];
        yDest = dest[1];
    }
    else if (src.getX) {
        xDest = dest.getX();
        yDest = dest.getY();
    }

    if (Array.isArray(src)) {
        xSrc = src[0];
        ySrc = src[1];
    }
    else if (src.getX) {
        xSrc = src.getX();
        ySrc = src.getY();
    }

    return [xDest - xSrc, yDest - ySrc];
};

RG.dXdYAbs = (dest, src) => {
    const [dX, dY] = RG.dXdY(dest, src);
    return [Math.abs(dX), Math.abs(dY)];
};

/* Returns the unit vector for direction between two objects.
 * Examples:
 *   1. Given 2 objects at (0,0) and (2,3), returns [-1,-1].
 *   2. Given 2 objects at (2,3) and (0,0), returns [1,1].
 *   3. Given 2 objects at (0,4) and (0,1), returns [0,1].
 *   4. Given 2 objects at (4,0) and (2,0), returns [1,0].
 */
RG.dXdYUnit = (dest, src) => {
    const [dX, dY] = RG.dXdY(dest, src);
    const dXUnit = dX === 0 ? 0 : dX / Math.abs(dX);
    const dYUnit = dY === 0 ? 0 : dY / Math.abs(dY);
    return [dXUnit, dYUnit];
};

/* Given an actor, scales its attributes based on new experience level.*/
RG.levelUpActor = (actor, newLevel) => {
    if (actor.has('Experience')) {
        let currLevel = actor.get('Experience').getExpLevel();
        if (currLevel < newLevel) {
            while (currLevel < newLevel) {
                const nextLevel = currLevel + 1;
                ++currLevel;
                actor.get('Experience').setExpLevel(nextLevel);

                if (actor.has('ActorClass')) {
                    actor.get('ActorClass').getClass().advanceLevel();
                    continue; // Skip other functions
                }

                RG.levelUpStats(actor, nextLevel);

                // Level up the Combat component
                RG.levelUpCombatStats(actor, nextLevel);

                // Level up the Health
                if (actor.has('Health')) {
                    const hComp = actor.get('Health');
                    let incr = 2;
                    if (actor.isPlayer()) {incr = 5;}
                    hComp.setMaxHP(hComp.getMaxHP() + incr);
                    hComp.setHP(hComp.getHP() + incr);
                }

            }
        }
        else {
            let msg = `Curr: ${currLevel}, New: ${newLevel}`;
            msg += ' New level must be > current level.';
            RG.err('RG', 'levelUpActor', msg);
        }
    }
    else {
        RG.err('RG', 'levelUpActor', 'No exp. component found.');

    }
};

RG.levelUpStats = function(actor, nextLevel) {
    const randStat = RG.DIE_RNG.arrayGetRand(RG.STATS_LC);
    const stats = actor.get('Stats');
    stats.incrStat(randStat, 1);
};

RG.levelUpCombatStats = function(actor, nextLevel) {
    if (actor.has('Combat')) {
        const combatComp = actor.get('Combat');

        const incrAtt = 1;
        combatComp.setAttack(combatComp.getAttack() + incrAtt);

        const incrDef = 1;
        combatComp.setDefense(combatComp.getDefense() + incrDef);

        if (nextLevel % 3 === 0) {
            const prot = combatComp.getProtection();
            combatComp.setProtection(prot + 1);
        }

        // Upgrade damage die was well
        const dmgDie = combatComp.getDamageDie();
        dmgDie.setDice( dmgDie.getDice() + 1);
        if (nextLevel % 3 === 0) {
            dmgDie.setMod( dmgDie.getMod() + 1);
        }
    }
};

/* Prints the given object using console.log. Calls all accessor functions
 * given in 'funcs' list and prints their value. If no list is given, prints the
 * full object directly. */
RG.printObj = function(obj, funcs, linfo) {

    const printVal = (value, func) => {
        if (typeof value === 'object') {
            RG.diag('\t## ' + func, linfo);
            RG.diag(value, linfo);
        }
        else {
            RG.diag('\t## ' + func + ' -> ' + value, linfo);
        }
    };

    if (funcs) {
        if (Array.isArray(funcs)) {
            funcs.forEach(func => {
                if (typeof obj[func] === 'function') {
                    const value = obj[func]();
                    printVal(value, func);
                }
                else {
                    const json = JSON.stringify(obj);
                    RG.err('RG', 'printObjList',
                        `No func ${funcs} in object ${json}`);
                }

            });
        }
        else if (typeof funcs === 'string') {
            if (typeof obj[funcs] === 'function') {
                const value = obj[funcs]();
                printVal(value, funcs);
            }
            else {
                RG.err('RG', 'printObjList',
                    `No func ${funcs} in object ${JSON.stringify(obj)}`);
            }
        }
    }
    else {
        RG.diag(obj, linfo);
    }
};

/* Prints the given object list. For each object, calls all accessor functions
 * given in 'funcs' list and prints their value. If no list is given, prints the
 * full object directly using console.log(obj). filterFunc can be given to
 * filter the list. */
RG.printObjList = function(list, funcs, filterFunc) {
    const numObjs = list.length;
    console.log(`List has ${numObjs} objects`);

    list.forEach((obj, index) => {
        if (typeof filterFunc === 'function') {
            if (filterFunc(obj)) {
                console.log(`Object [${index}]: `);
                RG.printObj(obj, funcs);
            }
        }
        else {
            console.log(`Object [${index}]: `);
            RG.printObj(obj, funcs);
        }
    });
};

// To create player commands
RG.getUseCmd = function(item, target) {
    return {cmd: 'use', item, target};
};

RG.getDropCmd = function(item, count) {
    return {cmd: 'drop', item, count};
};

RG.getEquipCmd = function(item, count) {
    return {cmd: 'equip', item, count};
};

RG.getUnequipCmd = function(name, slotNumber, count) {
    return {cmd: 'unequip', slot: name, slotNumber, count};
};

// Regexp for parsing dice expressions '2d4' or '1d6 + 1' etc.
RG.DIE_RE = /\s*(\d+)d(\d+)\s*(\+|-)?\s*(\d+)?/;
RG.DIE_NUMBER = /^\s*(-?\d+)\s*$/;

/* Parses die expression like '2d4' or '3d5 + 4' and returns it as an array [2,
 * 4, 0] or [3, 5, 4]. Returns empty array for invalid expressions.*/
RG.parseDieSpec = strOrArray => {
    if (typeof strOrArray === 'object') {
        if (strOrArray.length >= 3) {
            return [strOrArray[0], strOrArray[1], strOrArray[2]];
        }
    }
    else {
        const match = RG.DIE_RE.exec(strOrArray);
        if (match !== null) {
            const num = match[1];
            const dType = match[2];
            let mod = null;
            if (!RG.isNullOrUndef([match[3], match[4]])) {
                if (match[3] === '+') {mod = match[4];}
                else {mod = '-' + match[4];}
            }
            else {
                mod = '0';
            }
            return [num, dType, mod];
        }
        else if (RG.DIE_NUMBER.test(strOrArray)) {
            return [0, 0, parseInt(strOrArray, 10)];
        }
        else {
            RG.err('RG', 'parseDieSpec', 'Cannot parse: ' + strOrArray);
        }
    }
    return [];
};

RG.ONE_SHOT_ITEMS = ['potion'];

/* Returns true if given item is one-shot use item by its type.*/
RG.isOneShotItem = item => {
    const itemType = item.getType();
    const index = RG.ONE_SHOT_ITEMS.indexOf(itemType);
    return index >= 0;
};

/* Destroys item (typically after use). */
RG.destroyItemIfNeeded = item => {
    if (RG.isOneShotItem(item)) {
        if (item.count === 1) {
            const msg = {item: item};
            RG.POOL.emitEvent(RG.EVT_DESTROY_ITEM, msg);
        }
        else {
            item.count -= 1;
        }
    }
};

RG.isActor = obj => {
    if (obj && obj.getPropType) {
        return obj.getPropType() === RG.TYPE_ACTOR;
    }
    return false;
};

RG.isElement = obj => {
    if (obj && obj.getPropType) {
        return obj.getPropType() === RG.TYPE_ELEM;
    }
    return false;
};

RG.isItem = obj => {
    if (obj && obj.getPropType) {
        return obj.getPropType() === RG.TYPE_ITEM;
    }
    return false;
};

/* Returns the use type (ie drink or dig or hit...) for a item/target pair. */
RG.getItemUseType = (item, target) => {
    const itemType = item.getType();
    switch (itemType) {
        case 'potion': {
            if (RG.isActor(target)) {
                return RG.USE.DRINK;
            }
            break;
        }
        default: return '';
    }
    return '';
};

/* Given gold weight, returns the equivalent in coins.*/
RG.getGoldInCoins = weight => Math.round(weight / RG.GOLD_COIN_WEIGHT);

// These determine the size of one block in a level. These numbers are important
// because they determine a sub-area used for procedural generation of shops,
// vaults and other special features.
RG.BLOCK_X = 20;
RG.BLOCK_Y = 7;

// Level size determined as function of BLOCK_X/Y. Note that due to different
// block size or x/y, levels are not square shaped, but x > y.
RG.LEVEL_SMALL_X = 3 * RG.BLOCK_X;
RG.LEVEL_SMALL_Y = 3 * RG.BLOCK_Y;
RG.LEVEL_MEDIUM_X = 4 * RG.BLOCK_X;
RG.LEVEL_MEDIUM_Y = 4 * RG.BLOCK_Y;
RG.LEVEL_LARGE_X = 5 * RG.BLOCK_X;
RG.LEVEL_LARGE_Y = 5 * RG.BLOCK_Y;
RG.LEVEL_HUGE_X = 7 * RG.BLOCK_X;
RG.LEVEL_HUGE_Y = 7 * RG.BLOCK_Y;

// Controls the number of items generated for each N squares
RG.LOOT_SPARSE_SQR = 200;
RG.LOOT_MEDIUM_SQR = 120;
RG.LOOT_ABUNDANT_SQR = 50;

// Controls the number of actors generated for each N squares
RG.ACTOR_SPARSE_SQR = 200;
RG.ACTOR_MEDIUM_SQR = 120;
RG.ACTOR_ABUNDANT_SQR = 50;

// Weakness levels of actors
RG.WEAKNESS = {};
RG.WEAKNESS.MINOR = 1;
RG.WEAKNESS.MEDIUM = 3;
RG.WEAKNESS.SEVERE = 7;
RG.WEAKNESS.FATAL = 10;

// Resistance levels of actor to different effects
RG.RESISTANCE = {};
RG.RESISTANCE.MINOR = 1;
RG.RESISTANCE.MEDIUM = 3;
RG.RESISTANCE.STRONG = 6;
RG.RESISTANCE.IMMUNITY = 10;
RG.RESISTANCE.ABSORB = 15;

RG.getCardinalDirection = (level, cell) => {
    const cols = level.getMap().cols;
    const rows = level.getMap().rows;
    const x = cell.getX();
    const y = cell.getY();
    if (y === 0) {return 'north';}
    if (y === rows - 1) {return 'south';}
    if (x === cols - 1) {return 'east';}
    if (x === 0) {return 'west';}
    return 'somewhere';
};

/* Debugging function for printing 2D map row-by-row. */
RG.printMap = map => {
    let rowByRow = null;
    if (Array.isArray(map)) {
        rowByRow = RG.colsToRows(map);
    }
    else if (map instanceof RG.Map.CellList) {
        rowByRow = RG.colsToRows(map._map);
    }
    if (rowByRow) {
        const sizeY = rowByRow.length;
        for (let y = 0; y < sizeY; y++) {
            console.log(rowByRow[y].join(''));
        }
    }

};

RG.colsToRows = arr => {
    const res = [];
    const sizeY = arr[0].length;
    const sizeX = arr.length;
    for (let y = 0; y < sizeY; y++) {
        res[y] = [];
        for (let x = 0; x < sizeX; x++) {
            res[y][x] = arr[x][y];
        }
    }
    return res;
};

/* Given 2D array of elements, flattens all arrays inside each [x][y]
 * positions. */
RG.flattenTo2D = arr => {
    const sizeY = arr.length;
    const res = [];
    for (let y = 0; y < sizeY; y++) {
        let row = arr[y];
        row = flat(row);
        res.push(row);
    }
	function flat(data) {
		var r = [];
        data.forEach(e => {
            if (Array.isArray(e)) {
                r = r.concat(flat(e));
            }
            else {
                r.push(e);
            }
        });
		return r;
	}
	return res;
};

RG.setAllExplored = (level, isExplored) => {
    const map = level.getMap();
    for (let x = 0; x < map.cols; x++) {
        for (let y = 0; y < map.rows; y++) {
            const cell = map._map[x][y];
            cell.setExplored(isExplored);
        }
    }
};

RG.inSameLevel = (ent1, ent2) => {
    return ent1.getLevel().getID() === ent2.getLevel().getID();
};

/* Returns a game message for cell which cannot be travelled. */
RG.getImpassableMsg = (actor, cell, str) => {
    const type = cell.getBaseElem().getType();
    const cellMsg = `cannot venture beyond ${type}`;
    return `${str} ${cellMsg}`;
};

RG.formatLocationName = level => {
    const feat = level.getParent();
    if (!feat) {return '';}
    switch (feat.getType()) {
        case 'branch': // Fall through
        case 'face': // Fall through
        case 'quarter': {
            const parent = feat.getParent();
            const subName = feat.getName();
            const zoneName = parent.getName();
            if (subName === zoneName) {
                return subName;
            }
            return `${subName} of ${zoneName}`;
        }
        default: return feat.getName();
    }
};

/* Each die has number of throws, type of dice (d6, d20, d200...) and modifier
 * which is +/- X. */
RG.Die = function(num, dice, mod) {
    this._num = parseInt(num, 10);
    this._dice = parseInt(dice, 10);
    this._mod = parseInt(mod, 10);
};

RG.Die.prototype.getNum = function() {return this._num;};
RG.Die.prototype.setNum = function(num) {this._num = num;};
RG.Die.prototype.getDice = function() {return this._dice;};
RG.Die.prototype.setDice = function(dice) {this._dice = dice;};
RG.Die.prototype.getMod = function() {return this._mod;};
RG.Die.prototype.setMod = function(mod) {this._mod = mod;};

RG.Die.prototype.roll = function() {
    let res = 0;
    for (let i = 0; i < this._num; i++) {
        res += RG.DIE_RNG.getUniformInt(1, this._dice);
    }
    return res + this._mod;
};

RG.Die.prototype.toString = function() {
    let modStr = '+ ' + this._mod;
    if (this._mod < 0) {modStr = '- ' + this._mod;}
    else if (this._mod === 0) {modStr = '';}
    return this._num + 'd' + this._dice + ' ' + modStr;
};

RG.Die.prototype.copy = function(rhs) {
    this._num = rhs.getNum();
    this._dice = rhs.getDice();
    this._mod = rhs.getMod();
};

RG.Die.prototype.clone = function() {
    return new RG.Die(this._num, this._dice, this._mod);
};

/* Returns true if dice are equal.*/
RG.Die.prototype.equals = function(rhs) {
    let res = this._num === rhs.getNum();
    res = res && (this._dice === rhs.getDice());
    res = res && (this._mod === rhs.getMod());
    return res;
};

RG.Die.prototype.toJSON = function() {
    return [this._num, this._dice, this._mod];
};

/* Function to check if given action succeeds given it's probability. */
RG.isSuccess = function(prob) {
    return RG.DIE_RNG.getUniform() <= prob;
};

//---------------------------------------------------------------------------
// MessageHandler
//---------------------------------------------------------------------------

/* Handles the game message listening and storing of the messages. */
RG.MessageHandler = function() { // {{{2

    let _lastMsg = null;

    let _messages = [];
    let _prevMessages = [];
    let _hasNew = false;

    this.hasNotify = true;
    this.notify = (evtName, msg) => {
        if (evtName === RG.EVT_MSG) {
            if (msg.hasOwnProperty('msg')) {
                const msgObj = {msg: msg.msg, style: 'prim', count: 1};

                if (msg.hasOwnProperty('cell')) {
                    msgObj.cell = msg.cell;
                }

                if (msg.hasOwnProperty('style')) {
                    msgObj.style = msg.style;
                }

                if (_lastMsg && _lastMsg.msg === msgObj.msg) {
                    _lastMsg.count += 1;
                }
                else {
                    _lastMsg = msgObj;
                    _messages.push(msgObj);
                }
                _hasNew = true;
            }
        }
    };
    RG.POOL.listenEvent(RG.EVT_MSG, this);

    this.hasNew = () => _hasNew;

    this.getMessages = () => {
        _hasNew = false;
        if (_messages.length > 0) {return _messages;}
        else if (_prevMessages.length > 0) {return _prevMessages;}
        else {return [];}
    };

    this.clear = () => {
        if (_messages.length > 0) {_prevMessages = _messages.slice();}
        _messages = [];
    };

}; // }}} Messages

/* A debug function which prints info about given entity. */
RG.ent = function(whatever) {
    if (window.PLAYER) {
        const level = window.PLAYER.getLevel();
        if (Number.isInteger(whatever)) {
            const actor = level.getActors().find(a => a.getID() === whatever);
            if (actor) {
                const name = actor.getName();
                RG.diag(`RG.ent: Found ${name} with ID ${whatever}`);
                RG.diag(JSON.stringify(actor));
                return actor;
            }
            const item = level.getItems().find(i => i.getID() === whatever);
            if (item) {
                const name = item.getName();
                RG.diag(`RG.ent: Item Found ${name} with ID ${whatever}`);
                RG.diag(JSON.stringify(item));
                return item;
            }
        }
    }
    return null;
};

RG.comp = function(compID, entID = -1) {
    let entity = null;
    if (entID >= 0) {
        entity = RG.ent(entID);
    }
    if (entity) {
        const comps = entity.getComponents();
        if (comps[compID]) {
            const comp = comps[compID];
            const type = comp.getType();
            console.log(`RG.comp: Found ${type} with ID ${compID}`);
            const json = comp.toJSON();
            if (json) {
                RG.diag(JSON.stringify(json));
            }
            else {
                RG.diag('Not serialisable');
                RG.diag(comp);
            }
            return comp;
        }
    }
    return null;
};

/* eslint no-unused-vars: 0 */
const ROT = require('../../lib/rot.js');

module.exports = RG;


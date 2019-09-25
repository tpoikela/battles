
const $DEBUG = 0;

/* Main object of the package for encapsulating all other objects. */
const RG: any = {};

import './utils';
import {TCardinalDir, TCoord, DestOrSrc, IPlayerCmdInput} from './interfaces';

// Import only types
type BaseActor = import('./actor').BaseActor;
type SentientActor = import('./actor').SentientActor;
type ItemBase = import('./item').ItemBase;
type ElementBase = import('./element').ElementBase;
type Entity = import('./entity').Entity;
type Cell = import('./map.cell').Cell;
type CellMap = import('./map').CellMap;
type Level = import('./level').Level;
type Damage = import('./mixin').Damage;
type BrainGoalOriented = import('./brain').BrainGoalOriented;
type BattleZone = import('./world').BattleZone;
type ZoneBase = import('./world').ZoneBase;

RG.gameTitle = 'Battles in the North (BitN)';

// Can be set to true for testing, when error conditions are checked
RG.suppressErrorMessages = false;
RG.suppressLogs = false;
RG.suppressWarningMessages = false;
RG.suppressDiagnosticMessages = false;

RG.cellRenderVisible = ['actors', 'items', 'elements'];
RG.cellRenderAlways = ['items', 'elements'];

/* Given Map.Cell, returns CSS classname used for styling that cell. */
RG.getCssClassForCell = function(cell: Cell, isVisible: boolean): string {
    if (isVisible) {this.cellRenderArray = this.cellRenderVisible;}
    else {this.cellRenderArray = this.cellRenderAlways;}
    const className = this.getStyleClassForCell(cell);
    this.cellRenderArray = this.cellRenderVisible;
    return className;
};

/* Same as getClassName, but optimized for viewing the full map. */
RG.getCssClassFullMap = function(cell: Cell): string {
    this.cellRenderArray = this.cellRenderVisible;

    if (!cell.hasProps()) {
        const baseType = cell.getBaseElem().getType();
        return this.cellStyles.elements[baseType];
    }

    for (let i = 0; i < 3; i++) {
        const propType = this.cellRenderVisible[i];
        if (cell.hasProp(propType)) {
            const props = cell.getProp(propType);
            const styles = this.cellStyles[propType];
            return this.getPropClassOrChar(styles, props![0]);
        }
    }
    return null;
};

/* Given Map.Cell, returns a char that is rendered for the cell. */
RG.getCharForCell = function(cell: Cell, isVisible: boolean): string {
    if (isVisible) {this.cellRenderArray = this.cellRenderVisible;}
    else {this.cellRenderArray = this.cellRenderAlways;}
    const cellChar = this.getCellChar(cell);
    this.cellRenderArray = this.cellRenderVisible;
    return cellChar;
};

/* Same as getChar, but optimized for full map viewing. */
RG.getCharFullMap = function(cell: Cell): string {
    this.cellRenderArray = this.cellRenderVisible;

    if (!cell.hasProps()) {
        const baseType = cell.getBaseElem().getType();
        return this.charStyles.elements[baseType];
    }

    for (let i = 0; i < 3; i++) {
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
RG.getStyleClassForCell = function(cell: Cell): string {
    if (!cell.isExplored()) { return 'cell-not-explored';}

    for (let i = 0; i < this.cellRenderArray.length; i++) {
        const propType = this.cellRenderArray[i];
        if (cell.hasProp(propType)) {
            const props = cell.getProp(propType);
            const styles = this.cellStyles[propType];
            const propObj = props![0];
            if (!propObj.has('DontRender')) {
                return this.getPropClassOrChar(styles, propObj);
            }
        }
    }

    const baseType = cell.getBaseElem().getType();
    return this.cellStyles.elements[baseType];
};

/* styles is either a LUT of chars or LUT of CSS classnames. */
RG.getPropClassOrChar = function(styles, propObj): string {

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

                    // If func returned true, use value ie
                    // isClosed: '+' returns '+' if isClosed() === true
                    if (res === true) {
                        return styles[lookupKey][p];
                    }
                    // Else if func returned non-false value, use the
                    // returned value, ie getChar() returned 'A'
                    else if (res !== false) {
                        return res; // If res not single char, messes things
                    }
                }
            }
            return styles[lookupKey].default;

        }
        return styles[lookupKey];
    }
    else {
        return styles.default;
    }
};

/* Returns char which is rendered on the map cell based on cell contents.*/
RG.getCellChar = function(cell: Cell): string {
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
RG.addCellStyle = function(prop: string, type: string, cName: string): void {
    if (this.cellStyles.hasOwnProperty(prop)) {
        this.cellStyles[prop][type] = cName;
    }
    else {
        this.err('RG', 'addCellStyle', 'Unknown prop type: ' + prop);
    }
};

RG.removeCellStyle = function(prop: string, type: string): void {
    if (this.cellStyles.hasOwnProperty(prop)) {
        delete this.cellStyles[prop][type];
    }
};

/* Adds a char to render for given prop and type. Example: "actors",
 * "wolf", "w" renders 'w' for cells containing wolves.*/
RG.addCharStyle = function(prop: string, type: string, charName: string): void {
    if (this.charStyles.hasOwnProperty(prop)) {
        this.charStyles[prop][type] = charName;
    }
    else {
        this.err('RG', 'addCharStyle', 'Unknown prop type: ' + prop);
    }
};

RG.removeCharStyle = function(prop: string, type: string): void {
    if (this.charStyles.hasOwnProperty(prop)) {
        delete this.charStyles[prop][type];
    }
};

RG.getChar = function(prop: string, name: string, state = null): string {
    if (this.charStyles.hasOwnProperty(prop)) {
        if (state) {
            return this.charStyles[prop][name][state];
        }
        return this.charStyles[prop][name];
    }
    return 'X';
};

RG.getCssClass = function(prop, name, state = null): string {
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
        default: '.',
        exit: '.',
        exploration: '?',
        lever: '&',
        leverdoor: {
            isClosed: '+', // if isClosed() returns true
            default: '/'
        },
        marker: {
            getChar: '', // use value from getChar()
            default: 'X'
        },
        passage: '.',
        placeholder: '?',
        shop: '.',
        stairsDown: '>',
        stairsUp: '<',
        wall: '#',
        wallcave: '#',
        wallcrypt: '#',
        wallice: '#',
        wallwooden: '#',
        wallmount: '^',
        door: {
            isClosed: '+', // if isClosed() returns true
            default: '/'
        }
    },
    actors: {
        default: 'X'
    },
    items: {
        default: '?',
        corpse: '§'
    }
};

// These are used to select the CSS class for map cells.
RG.cellStyles = {
    elements: {
        default: 'cell-element-default',
        door: 'cell-element-door',
        exit: 'cell-element-exit',
        exploration: 'cell-element-exploration',
        marker: {
            getClassName: '', // Use value from get
            default: 'cell-element-marker'
        },
        lever: 'cell-element-door',
        leverdoor: 'cell-element-door',
        passage: 'cell-element-passage',
        placeholder: 'cell-element-placeholder',
        shop: 'cell-element-shop',
        stairsDown: 'cell-element-stairs',
        stairsUp: 'cell-element-stairs',
        wall: 'cell-element-wall',
        wallcave: 'cell-element-wall-cave',
        wallcrypt: 'cell-element-wall-crypt',
        wallice: 'cell-element-wall-ice',
        wallwooden: 'cell-element-wall-wooden',
        wallmount: 'cell-element-wall-mount'
    },
    actors: {
        default: 'cell-actor-default',
        player: 'cell-actor-player',
        spirit: 'cell-actor-spirit'
    },
    items: {
        potion: 'cell-item-potion',
        spiritgem: 'cell-item-spiritgem',
        default: 'cell-item-default'
    }
};

RG.VERB = {
    NONE: 10,
    LOW: 20,
    MEDIUM: 30,
    HIGH: 40,
    FULL: 50,
    DEBUG: 100
};

RG.debug = function(obj: any, msg: string): void {
    if ($DEBUG) {
        const inst = typeof obj;
        const json = JSON.stringify(obj);
        console.log(`[DEBUG]: Type: ${inst} ${json} |${msg}|`);
    }
};

RG.err = function(obj: string, fun: string, msg: string) {
    if (!RG.suppressErrorMessages) {
        const formattedMsg = `[ERROR]: ${obj} ${fun} -> |${msg}|`;
        console.error(formattedMsg);
        throw new Error(formattedMsg);
    }
};

RG.warn = function(obj: string, fun: string, msg: string): void {
    if (!RG.suppressWarningMessages) {
        const formattedMsg = `[WARN]: ${obj} ${fun} -> |${msg}|`;
        console.error(formattedMsg);
    }
};

RG.diag = function(obj): void {
    if (!RG.suppressDiagnosticMessages) {
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

RG.log = function(...args) {
    if (!RG.suppressLogs) {
        console.log('[INFO]:', ...args);
    }
};

/* Checks that object has given type using getType() function. Throws error if
 * type does not match. */
RG.assertType = function(obj: any, typeStr: string): void {
    if (obj.getType) {
        if (obj.getType() !== typeStr) {
            RG.err('RG', 'assertType',
                `Exp: ${typeStr}, Got: ${obj.getType()}`);
        }
    }
    else {
        RG.err('RG', 'assertType', `object ${obj} has no getType()`);
    }
};

/* Used to inherit from a prototype. Supports multiple inheritance but
 * sacrifices instanceof.*/
RG.extend2 = function(Child: any, Parent: any): void {
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
RG.nullOrUndefError = function(name: string, msg: string, val: any): void {
    if (this.isNullOrUndef([val])) {
        const formattedMsg = `nullOrUndef ${name} ${msg}`;
        console.error(formattedMsg);
        throw new Error(formattedMsg);
    }
};

/* Returns true if anything in the list is null or undefined.*/
RG.isNullOrUndef = function(list: any[]): boolean {
    for (let i = 0; i < list.length; i++) {
        if (list[i] === null || typeof list[i] === 'undefined' ||
            typeof list === 'undefined') {
            return true;
        }
    }
    return false;
};

/* Tries to add item2 to item1 stack. Returns true on success.*/
RG.addStackedItems = function(item1: ItemBase, item2: ItemBase): boolean {
    if (item1.equals(item2)) {
        const countToAdd = item2.getCount();
        item1.incrCount(countToAdd);
        return true;
    }
    return false;
};

/* Removes N items from the stack and returns them. Returns null if the
 * stack is not changed.*/
RG.removeStackedItems = function(itemStack: ItemBase, n): ItemBase | null {
    if (n > 0) {
    let rmvItem = null;
    if (n === 1 && itemStack.getCount() === 1) {
            return itemStack;
        }
        else if (n < itemStack.getCount()) {
            itemStack.decrCount(n);
            rmvItem = itemStack.clone();
            rmvItem.setCount(n);
            return rmvItem;
        }
        else { // Remove all items
            return itemStack;
        }
    }
    return null;
};

//--------------------------------------------------------------
// COMBAT-RELATED FUNCTIONS
//--------------------------------------------------------------

RG.getItemDamage = function(item: ItemBase): number {
    if ((item as any).rollDamage) {
        return (item as any).rollDamage();
    }
    else {
        const weight = item.getWeight();
        return Math.ceil(weight / 1.1);
    }
};

RG.getMeleeAttack = function(att: SentientActor): number {
    let attack = att.getAttack();
    const missile = att.getInvEq().getMissile();
    const missWeapon = att.getInvEq().getMissileWeapon();
    if (missile) {attack -= missile.getAttack();}
    if (missWeapon) {attack -= missWeapon.getAttack();}
    return attack;
};

RG.getMeleeAttackRange = function(att: SentientActor): number {
    const attackRange = att.get('Combat').getAttackRange();
    const weapon: unknown = att.getWeapon();
    if (weapon && (weapon as Damage).getAttackRange) {
        const weaponRange = (weapon as Damage).getAttackRange();
        return weaponRange > attackRange ? weaponRange : attackRange;
    }
    return attackRange;
};

RG.getMeleeDamageAdded = function(att: SentientActor): number {
    let dmg = att.getCombatBonus('getDamage');
    dmg += RG.strengthToDamage(att.getStatVal('Strength'));
    return dmg;
};

RG.getMeleeAttackInfo = function(att: SentientActor): string {
    let result = 'Att: ' + RG.getMeleeAttack(att);
    const weapon: unknown = att.getWeapon();
    if (weapon && (weapon as Damage).getDamageDie) {
        result += ' D: ' + (weapon as Damage).getDamageDie().toString();
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

type MissType = Entity & Damage;

RG.getMissileDamageAdded = function(att: SentientActor, miss: MissType): number {
    let dmg = RG.getMissileAgilityDmg(att.get('Stats').getAgility());
    if (miss.has('Ammo')) {
        dmg += att.getMissileWeapon().rollDamage();
    }
    if (att.has('StrongShot')) {
        dmg += this.strengthToDamage(att.getStatVal('Strength'));
    }
    return dmg;
};

RG.getMissileDamage = function(att: SentientActor, miss: MissType): number {
    let dmg = miss.rollDamage();
    dmg += RG.getMissileDamageAdded(att, miss);
    return dmg;
};

RG.getMissileAttack = function(att: SentientActor): number {
    let attack = att.get('Combat').getAttack();
    attack += att.getInvEq().getEquipment().getAttack();
    attack += att.get('Stats').getAccuracy() / 2;
    attack += att.getInvEq().getEquipment().getAccuracy() / 2;

    // Subtract melee weapon
    const weapon: unknown = att.getWeapon();
    if (weapon && (weapon as Damage).getAttack) {
        attack -= (weapon as Damage).getAttack();
    }
    return attack;
};

/* Returns the missile attack info in a string. */
RG.getMissileAttackInfo = function(att: SentientActor): string {
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

RG.getMissileRange = function(att: SentientActor, miss: MissType): number {
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

RG.strengthToDamage = function(str: number): number {
    return Math.round(str / 4);
};

RG.accuracyToAttack = function(acc: number): number {
    return Math.floor(acc / 2);
};

RG.agilityToDefense = function(agi: number): number {
    return Math.floor(agi / 2);
};


/* Given actor and cells it sees, returns first enemy cell found.*/
RG.findEnemyCellForActor = function(actor, seenCells: Cell[]): Cell[] {
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
RG.EVT_ACTOR_CREATED = 'EVT_ACTOR_CREATED';
RG.EVT_ACTOR_KILLED = 'EVT_ACTOR_KILLED';
RG.EVT_PLAYER_KILLED = 'EVT_PLAYER_KILLED';
RG.EVT_DESTROY_ITEM = 'EVT_DESTROY_ITEM';
RG.EVT_MSG = 'EVT_MSG';

RG.EVT_LEVEL_CHANGED = 'EVT_LEVEL_CHANGED';
RG.EVT_LEVEL_ENTERED = 'EVT_LEVEL_ENTERED';
RG.EVT_TILE_CHANGED = 'EVT_TILE_CHANGED';
RG.EVT_TILE_ENTERED = 'EVT_TILE_ENTERED';
RG.EVT_TILE_LEFT = 'EVT_TILE_LEFT';
RG.EVT_EXPLORED_ZONE_LEFT = 'EVT_EXPLORED_ZONE_LEFT';

RG.EVT_LEVEL_PROP_ADDED = 'EVT_LEVEL_PROP_ADDED';
RG.EVT_LEVEL_PROP_REMOVED = 'EVT_LEVEL_PROP_REMOVED';

RG.EVT_ACT_COMP_ADDED = 'EVT_ACT_COMP_ADDED';
RG.EVT_ACT_COMP_REMOVED = 'EVT_ACT_COMP_REMOVED';
RG.EVT_ACT_COMP_ENABLED = 'EVT_ACT_COMP_ENABLED';
RG.EVT_ACT_COMP_DISABLED = 'EVT_ACT_COMP_DISABLED';

RG.EVT_WIN_COND_TRUE = 'EVT_WIN_COND_TRUE';

RG.EVT_ANIMATION = 'EVT_ANIMATION';

RG.EVT_CREATE_BATTLE = 'EVT_CREATE_BATTLE';
RG.EVT_BATTLE_OVER = 'EVT_BATTLE_OVER';
RG.EVT_ARMY_EVENT = 'EVT_ARMY_EVENT';

// Mostly used at low-level by System.Event
RG.EVT_ITEM_PICKED_UP = 'EVT_ITEM_PICKED_UP';
RG.EVT_ACTOR_DAMAGED = 'EVT_ACTOR_DAMAGED';
RG.EVT_ACTOR_ATTACKED = 'EVT_ACTOR_ATTACKED';
RG.EVT_ACTOR_USED_STAIRS = 'EVT_ACTOR_USED_STAIRS';

// Used for timing/simulating bigger events
RG.EVT_WEATHER_CHANGED = 'EVT_WEATHER_CHANGED';
RG.EVT_DAY_PHASE_CHANGED = 'EVT_DAY_PHASE_CHANGED';
RG.EVT_DAY_CHANGED = 'EVT_DAY_CHANGED';
RG.EVT_MONTH_CHANGED = 'EVT_MONTH_CHANGED';
RG.EVT_SEASON_CHANGED = 'EVT_SEASON_CHANGED';
RG.EVT_YEAR_CHANGED = 'EVT_YEAR_CHANGED';

//----------------------------
// Different entity/prop types
//----------------------------
RG.TYPE_ACTOR = 'actors';
RG.TYPE_ELEM = 'elements';
RG.TYPE_ITEM = 'items';

// Constants for different item types
RG.ITEM = {};
RG.ITEM.BASE = 'base';
RG.ITEM.FOOD = 'food';
RG.ITEM.BOOK = 'book';
RG.ITEM.CORPSE = 'corpse';
RG.ITEM.WEAPON = 'weapon';
RG.ITEM.ARMOUR = 'armour';
RG.ITEM.SPIRITGEM = 'spiritgem';
RG.ITEM.GOLD = 'gold';
RG.ITEM.MINERAL = 'mineral';
RG.ITEM.MISSILE = 'missile';
RG.ITEM.MISSILE_WEAPON = 'missileweapon';
RG.ITEM.AMMUNITION = 'ammo';
RG.ITEM.POTION = 'potion';
RG.ITEM.RUNE = 'rune';
RG.ITEM.GOLD_COIN = 'goldcoin';

// This is a subset of ITEM_TYPES, excluding gold items
RG.SHOP_TYPES = ['ammo', 'armour', 'food', 'mineral',
    'missile', 'missileweapon', 'potion', 'rune', 'spiritgem', 'weapon'
];

RG.USE = {
    DRINK: 'DRINK',
    DIG: 'DIG',
    LEVER: 'LEVER'
};

RG.LEVEL_ID_ADD = 1000000000;
RG.ENTITY_ID_ADD = 1000000000;

RG.WATCHDOG = 100; // Used mainly to terminate while-loops
RG.NO_TARGET = -1;

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
    USE: 5,
    SPELL: 15
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

RG.ITEM_SUFFIX_CHANCE = 0.1;
RG.ITEM_PREFIX_CHANCE = 0.1;

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


// Alignments (TODO make more diverse)
RG.ALIGN_GOOD = 'ALIGN_GOOD';
RG.ALIGN_EVIL = 'ALIGN_EVIL';
RG.ALIGN_NEUTRAL = 'ALIGN_NEUTRAL';

RG.EVIL_RACES = ['catfolk', 'dogfolk', 'wolfclan', 'wildling', 'undead',
    'goblin'];
RG.NEUTRAL_RACES = ['dwarf', 'bearfolk', 'animal'];

RG.ACTOR_RACES = ['catfolk', 'dogfolk', 'wolfclan', 'wildling', 'goblin',
    'bearfolk', 'dwarf', 'human', 'hyrkhian'];
RG.ACTOR_RACES = RG.ACTOR_RACES.sort(); // Too lazy to manually sort them

RG.ALL_RACES = ['avianfolk'].concat(RG.ACTOR_RACES);

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

RG.SEASON = {
    AUTUMN: 'AUTUMN',
    AUTUMN_WINTER: 'AUTUMN_WINTER',
    WINTER: 'WINTER',
    WINTER_SPRING: 'WINTER_SPRING',
    SPRING: 'SPRING',
    SPRING_SUMMER: 'SPRING_SUMMER',
    SUMMER: 'SUMMER',
    SUMMER_AUTUMN: 'SUMMER_AUTUMN',
};

RG.DAY = {
    DAWN: 'DAWN',
    MORNING: 'MORNING',
    NOON: 'NOON',
    AFTERNOON: 'AFTERNOON',
    EVENING: 'EVENING',
    DUSK: 'DUSK',
    NIGHT: 'NIGHT'
};

RG.AREA_LEVEL_COLS = 100;
RG.AREA_LEVEL_ROWS = 100;

RG.LETTERS = ['a', 'b', 'c', 'd', 'e', 'f',
    'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z'
];
RG.LETTERS_UC = RG.LETTERS.map((l: string) => l.toUpperCase());

/* Converts a direction (N, S, ...) to 2-d vector. If already,
 * a vector, returns it. */
RG.dirTodXdY = function(dir: TCoord | string): TCoord | null {
    if (Array.isArray(dir)) {
        return dir;
    }
    else if (RG.DIR.hasOwnProperty(dir)) {
        const ucDir = dir.toUpperCase();
        return RG.DIR[ucDir];
    }
    RG.err('RG', 'dirTodXdY',
        `Arg must be array/string (N,S,E,W..). Got: ${dir}`);
    return null;
};

RG.dXdYToDir = function(dXdY: TCoord): TCardinalDir {
    const [dX, dY] = dXdY;
    let result = '';
    if (dY === 1) {result += 'S';}
    else if (dY === -1) {result += 'N';}
    if (dX === 1) {result += 'E';}
    else if (dX === -1) {result += 'W';}
    if (dX === 0 && dY === 0) {
        RG.warn('RG', 'dXdYToDir', 'dXdY 0,0 passed in');
    }
    return result as TCardinalDir;
};


/* Convert direction into single character. Used mainly to create
 * directional beams for spells etc animations. */
RG.dirToChar = function(dir: TCoord): string {
    const [dX, dY] = dir;
    if (dX !== 0) {
        if (dY === 0) {return '-';}
        else if (dX === 1 && dY === 1) {
            return '\\';
        }
        else if (dX === -1 && dY === 1) {
            return '/';
        }
        else if (dX === -1 && dY === -1) {
            return '\\';
        }
        else {
            return '/';
        }
    }
    else {
        return '|';
    }

};

RG.DMG = {
    ACID: 'ACID',
    BLUNT: 'BLUNT',
    COLD: 'COLD',
    DIRECT: 'DIRECT',
    ENERGY: 'ENERGY',
    EFFECT: 'EFFECT',
    FIRE: 'FIRE',
    HUNGER: 'HUNGER',
    ICE: 'ICE',
    LIGHTNING: 'LIGHTNING',
    MAGIC: 'MAGIC',
    MELEE: 'MELEE',
    MISSILE: 'MISSILE',
    NECRO: 'NECRO',
    PIERCE: 'PIERCE',
    POISON: 'POISON',
    SLASH: 'SLASH',
    SLIME: 'SLIME',
    VOID: 'VOID',
    WATER: 'WATER'
};

RG.classNameDMG = {
    ACID: 'cell-damage-ACID',
    BLUNT: 'cell-damage-BLUNT',
    COLD: 'cell-damage-COLD',
    ENERGY: 'cell-damage-ENERGY',
    FIRE: 'cell-damage-FIRE',
    HUNGER: 'cell-damage-HUNGER',
    ICE: 'cell-damage-ICE',
    LIGHTNING: 'cell-damage-LIGHTNING',
    MAGIC: 'cell-damage-MAGIC',
    MELEE: 'cell-damage-MELEE',
    MISSILE: 'cell-damage-MISSILE',
    NECRO: 'cell-damage-NECRO',
    PIERCE: 'cell-damage-PIERCE',
    POISON: 'cell-damage-POISON',
    SLASH: 'cell-damage-SLASH',
    WATER: 'cell-damage-WATER',
    VOID: 'cell-damage-VOID'
};

RG.formatGetterName = function(propName: string): string {
    return 'get' + propName.capitalize();
};
RG.formatSetterName = function(propName: string): string {
    return 'set' + propName.capitalize();
};

RG.STATS = [
    'Accuracy', 'Agility', 'Magic', 'Perception', 'Strength', 'Willpower',
    'Spirituality'
] as string[];

/* Creates arrays for stat names, setters and getters, map for default values,
 * and LUT for mapping abbreviation (ie Acc => Accuracy). */
RG.initStats = function(statArr: string[]): void {
    RG.STATS_LC = statArr.map((stat: string) => stat.toLowerCase());

    RG.STATS_DEFAULTS = RG.STATS_LC.reduce((acc: {[key: string]: number}, curr: string) => {
        acc[curr] = 5;
        return acc;
    }, {});
    RG.STATS_DEFAULTS.speed = 100;

    RG.STATS_ABBR = statArr.map((stat: string) => stat.substr(0, 3));
    RG.GET_STATS = statArr.map((stat: string) => RG.formatGetterName(stat));
    RG.SET_STATS = statArr.map((stat: string) => RG.formatSetterName(stat));

    RG.STATS_ABBR2STAT = statArr.reduce((acc: {[key: string]: string}, curr: string) => {
        acc[curr.substr(0, 3)] = curr;
        return acc;
    }, {});
};
RG.initStats(RG.STATS);

/* Creates new stats object with given default value. */
RG.createStatsObj = function(
    defValue: number, isLower: boolean = true
): {[key: string]: number} {
    const res: any = {speed: defValue};
    if (isLower) {
        RG.STATS_LC.forEach((stat: string) => {
            res[stat] = defValue;
        });
    }
    else {
        RG.STATS.forEach((stat: string) => {
            res[stat] = defValue;
        });
    }
    return res;
};

// Load status when using chunk unloading
RG.LEVEL_NOT_LOADED = 'LEVEL_NOT_LOADED';
RG.TILE_NOT_LOADED = 'TILE_NOT_LOADED';

RG.getDmgClassName = function(dmgType: string): string {
    return RG.classNameDMG[dmgType];
};

/* Converts key of format X,Y to [X, Y]. */
RG.key2Num = function(key: string): [number, number] {
    const [x, y] = key.split(',');
    return [parseInt(x, 10), parseInt(y, 10)];
};

RG.isEmpty = (value: any): boolean => {
    if (RG.isNullOrUndef([value])) {
        return true;
    }
    else if (typeof value === 'string') {
        return value === '';
    }
    else if (Array.isArray(value)) {
        return value.length === 0;
    }
    return false;
};

/* Returns name of object, or its parent's if object has no name. */
RG.getName = (obj: any): string => {
    if (obj.getName) {
        return obj.getName();
    }
    else if (obj.getParent) {
        const parent = obj.getParent();
        return parent.getName();
    }
    return ''; // Should this be an error?
};

RG.getObjRefArray = (type, arr) => {
    const result = arr.map(targetObj => (
        RG.getObjRef(type, targetObj)
    ));
    result.$objRefArray = true;
    return result;
};

RG.getObjRef = (type, obj) => {
    if (type === 'entity') {
        // Refs to items are dangerous as cloning changes the entity ref,
        // cloning must be used in item stacking etc
        if (RG.isItem(obj)) {
            const msg = ' Got: |' + obj.getName() + '|';
            RG.err('RG', 'getObjRef', 'objRefs to items not supported.' + msg);
        }
        return {$objRef: {type, id: obj.getID()}};
    }
    else if (type === 'object') {
        if (obj.$objID) {
            return obj.getObjRef();
        }
        else if (obj.$objRef) {
            return {$objRef: {type: 'object', id: obj.$objRef}};
        }
    }
    else if (type === 'component') {
        return {$objRef: {type: 'component', id: obj.getID()}};
    }
    else if (type === 'place') {
        return {$objRef: {type: 'place', id: obj.getID()}};
    }
    else if (type === 'item') {
        return {$objRef: {type: 'item', id: obj.getID()}};
    }
    else if (type === 'element') {
        return {$objRef: {type: 'element', id: obj.getID()}};
    }
    RG.err('RG', 'getObjRef',
        `Type ${type} not supported. Obj: ${obj}`);
    return null;
};

/* Returns a forest level configuration scaled to the size of the level. */
RG.getForestConf = function(cols: number, rows: number): {[key: string]: any} {
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

RG.PROP_TYPES = [RG.TYPE_ACTOR, RG.TYPE_ELEM, RG.TYPE_ITEM];
// Fighting modes
RG.FMODES = [RG.FMODE_NORMAL, RG.FMODE_FAST, RG.FMODE_SLOW];

RG.ALIGNMENTS = [RG.ALIGN_GOOD, RG.ALIGN_NEUTRAL, RG.ALIGN_EVIL];

RG.cellRenderArray = RG.cellRenderVisible;

interface ProbDist {[key: string]: number;}

/* Returns danger probabilites for given level.*/
RG.getDangerProb = (min: number, max: number): ProbDist => {
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
RG.getFoodWeightDistr = (): ProbDist => ({
    0.1: 20,
    0.2: 10,
    0.3: 5,
    0.4: 3,
    0.5: 1
});

/* Returns the count distribution for gold coins. */
RG.getGoldCoinCountDistr = (nLevel: number): ProbDist => {
    const maxVal = nLevel + 1;
    const dist = {};
    for (let i = 1; i <= maxVal; i++) {
        dist[i] = nLevel;
    }
    return dist;
};

RG.getRuneChargeDistr = (): ProbDist => ({
    0: 2,
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
RG.valueToGoldWeight = (value: number): number => {
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
RG.scaleItemValue = (type: string, bonus: number, item: ItemBase) => {
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
RG.hasEnoughGold = (actor, goldWeight: number): boolean => {
    const ncoins = RG.getGoldInCoins(goldWeight);
    const items = actor.getInvEq().getInventory().getItems();
    for (let i = 0; i < items.length; i++) {
        if (items[i].getType() === 'goldcoin') {
            if (items[i].getCount() >= ncoins) {
                return true;
            }
        }
    }
    return false;
};

/* Tries to remove given amount of gold coins from the actor. Returns the number
 * of coins removed. */
RG.removeNCoins = (actor: SentientActor, ncoins: number): number => {
    let ncoinsRemoved = 0;
    const items = actor.getInvEq().getInventory().getItems();
    let coinsFound = null;
    for (let i = 0; i < items.length; i++) {
        if (items[i].getType() === 'goldcoin') {
            if (items[i].getCount() > ncoins) {
                ncoinsRemoved = ncoins;
                items[i].decrCount(ncoins);
            }
            else {
                coinsFound = items[i];
                ncoinsRemoved = coinsFound.getCount();
                coinsFound.setCount(0);
            }
        }
    }
    // Need to remove coins item from buyer inventory
    if (coinsFound !== null) {
        actor.getInvEq().removeItem(coinsFound);
    }
    return ncoinsRemoved;
};

/* Returns the total stat value of the given stat. Note that stat must be given
 * in getter format ie 'getStrength', not Strength. */
RG.getItemStat = (getFuncName: string, item): number => {
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

RG.getExpRequired = (newLevel: number): number => {
    let reqExp = 0;
    for (let i = 1; i <= newLevel; i++) {
        reqExp += (i - 1) * 10;
    }
    return reqExp;
};

/* Given direction vector and source, returns a new x,y coordinate. */
RG.newXYFromDir = (dir: TCoord, src: DestOrSrc): TCoord => {
    let [xSrc, ySrc] = [0, 0];
    if (Array.isArray(src)) {
        [xSrc, ySrc] = src;
    }
    else if (src.getXY) {
        [xSrc, ySrc] = src.getXY();
    }
    else {
        RG.err('RG', 'newXYFromDir',
            `src must be TCoord or have getXY function. Got ${src}`);
    }
    return [xSrc + dir[0], ySrc + dir[1]];
};

/* Returns the dX,dY of two coordinates or objects. */
RG.dXdY = (dest: DestOrSrc, src: DestOrSrc): TCoord => {
    let [xDest, yDest, xSrc, ySrc] = [0, 0, 0, 0];
    if (Array.isArray(dest)) {
        xDest = dest[0];
        yDest = dest[1];
    }
    else if (dest.getX) {
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

RG.dXdYAbs = (dest: DestOrSrc, src: DestOrSrc): TCoord => {
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
RG.dXdYUnit = (dest: DestOrSrc, src: DestOrSrc): TCoord => {
    const [dX, dY] = RG.dXdY(dest, src);
    const dXUnit = dX === 0 ? 0 : dX / Math.abs(dX);
    const dYUnit = dY === 0 ? 0 : dY / Math.abs(dY);
    return [dXUnit, dYUnit];
};

RG.withinRange = (r: number, dest: DestOrSrc, src: DestOrSrc): boolean => {
    const [dX, dY] = RG.dXdYAbs(dest, src);
    return dX <= r && dY <= r;
};

/* Given an actor, scales its attributes based on new experience level. Can advance
 * actor multiple levels also, if newLevel diff to current level is more than 1.*/
RG.levelUpActor = (actor: SentientActor, newLevel: number): void => {
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

RG.levelUpStats = function(actor: SentientActor, nextLevel: number): void {
    const rng = Random.getRNG();
    const randStat = rng.arrayGetRand(RG.STATS_LC);
    const stats = actor.get('Stats');
    stats.incrStat(randStat, 1);
};

RG.levelUpCombatStats = function(actor: SentientActor, nextLevel: number): void {
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
RG.printObj = function(obj: any, funcs: string | string[], linfo): void {

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
                    RG.err('RG', 'printObj',
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
                RG.err('RG', 'printObj',
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
RG.printObjList = function(list: any[], funcs: string | string[], filterFunc) {
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
RG.getUseCmd = function(item, target): IPlayerCmdInput {
    return {cmd: 'use', item, target};
};

RG.getDropCmd = function(item, count): IPlayerCmdInput {
    return {cmd: 'drop', item, count};
};

RG.getEquipCmd = function(item, count): IPlayerCmdInput {
    return {cmd: 'equip', item, count};
};

RG.getUnequipCmd = function(name, slotNumber, count): IPlayerCmdInput {
    return {cmd: 'unequip', slot: name, slotNumber, count};
};

RG.ONE_SHOT_ITEMS = ['potion'];

/* Returns true if given item is one-shot use item by its type.*/
RG.isOneShotItem = function(item: ItemBase): boolean {
    const itemType = item.getType();
    const index = RG.ONE_SHOT_ITEMS.indexOf(itemType);
    return index >= 0;
};


RG.isActor = function(obj: any): obj is BaseActor {
    if (obj && obj.getPropType) {
        return obj.getPropType() === RG.TYPE_ACTOR;
    }
    return false;
};

RG.toActor = function(ent: Entity): BaseActor {
    if (!RG.isActor(ent)) {
        RG.err('RG', 'toActor',
            `Given entity not an actor: ${JSON.stringify(ent)}`);
    }
    return ent as BaseActor;
};

RG.isElement = function(obj: any): obj is ElementBase {
    if (obj && obj.getPropType) {
        return obj.getPropType() === RG.TYPE_ELEM;
    }
    return false;
};

RG.isItem = function(obj: any): obj is ItemBase {
    if (obj && obj.getPropType) {
        return obj.getPropType() === RG.TYPE_ITEM;
    }
    return false;
};

/* Returns true if given object is an entity. Can return false results
 * sometimes. */
RG.isEntity = function(obj: any): obj is Entity {
    if (obj.comps && obj.compsByType && obj.add && obj.get) {
        return true;
    }
    return false;
};


RG.isSentient = function(target: BaseActor): target is SentientActor {
    if (target) {
        const brain = target.getBrain() as BrainGoalOriented;
        return (typeof brain.getGoal === 'function');
    }
    return false;
};

RG.isBattleZone = function(target: any): target is BattleZone {
    if (target) {
        if (target.setBattle && target.getType() === 'battlezone') {
            return true;
        }
    }
    return false;
};

/*
RG.isZone = function(target: any): target is ZoneBase {
    if (target) {
        return target instanceof ZoneBase;
    }
    return false;
};
*/

/* Can be queried if actor is still valid for serialisation or effects
 * like telepath or order giving. */
RG.isActorActive = (target: Entity): boolean => {
    return target && !target.has('Dead');
};

interface TargetWrapper {
    target: Target;
}
type Target = Cell | BaseActor | TargetWrapper;

/* Returns the use type (ie drink or dig or hit...) for a item/target pair. */
RG.getItemUseType = (item: ItemBase, targetOrObj: Target): string => {
    let target = targetOrObj;
    if ((targetOrObj as TargetWrapper).target) {
        const tWrap = targetOrObj as TargetWrapper;
        target = tWrap.target;
        if ((target as Cell).getActors) {
            const tCell = target as Cell;
            if (tCell.hasActors()) {
                target = tCell.getActors()[0];
            }
        }
    }
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
RG.getGoldInCoins = (weight: number): number => (
    Math.round(weight / RG.GOLD_COIN_WEIGHT)
);

/* Events for zones. */
const ZONE_EVT = {
    BATTLE_OVER: 'BATTLE_OVER',
    ZONE_EXPLORED: 'ZONE_EXPLORED',
    QUEST_COMPLETED: 'QUEST_COMPLETED',
    CITY_WIPED: 'CITY_WIPED',
    MOUNTAIN_CLIMBED: 'MOUNTAIN_CLIMBED',
    UNIQUE_KILLED: 'UNIQUE_KILLED'
};
RG.ZONE_EVT = ZONE_EVT;

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

//-----------------------------
// Systems used in the engine
//-----------------------------
RG.SYS = {};
RG.SYS.ANIMATION = Symbol('ANIMATION');
RG.SYS.AREA_EFFECTS = Symbol('AREA_EFFECTS');
RG.SYS.ATTACK = Symbol('ATTACK');
RG.SYS.ATTACK_RANGED = Symbol('ATTACK_RANGED');
RG.SYS.BATTLE = Symbol('BATTLE');
RG.SYS.BASE_ACTION = Symbol('BASE_ACTION');
RG.SYS.CHAT = Symbol('CHAT');
RG.SYS.COMMUNICATION = Symbol('COMMUNICATION');
RG.SYS.DAMAGE = Symbol('DAMAGE');
RG.SYS.DEATH = Symbol('DEATH');
RG.SYS.DISABILITY = Symbol('DISABILITY');
RG.SYS.DRAIN_STATS = Symbol('DRAIN_STATS');
RG.SYS.EQUIP = Symbol('EQUIP');
RG.SYS.EVENTS = Symbol('EVENTS');
RG.SYS.EXP_POINTS = Symbol('EXP_POINTS');
RG.SYS.HUNGER = Symbol('HUNGER');
RG.SYS.MISSILE = Symbol('MISSILE');
RG.SYS.MOVEMENT = Symbol('MOVEMENT');
RG.SYS.QUEST = Symbol('QUEST');
RG.SYS.SHOP = Symbol('SHOP');
RG.SYS.SKILLS = Symbol('SKILLS');
RG.SYS.SPELL_CAST = Symbol('SPELL_CAST');
RG.SYS.SPELL_EFFECT = Symbol('SPELL_EFFECT');
RG.SYS.SPIRIT = Symbol('SPIRIT');
RG.SYS.TIME_EFFECTS = Symbol('TIME_EFFECTS');
RG.SYS.ZONE_EVENTS = Symbol('ZONE_EVENTS');
RG.SYS.WEATHER = Symbol('WEATHER');

RG.NO_DAMAGE_SRC = null;

RG.getCardinalDirection = (level: Level, cell: Cell): string => {
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

/* Returns a textual (human-readable) interpretation of x,y difference between
 * to targets. */
RG.getTextualDir = (dest: DestOrSrc, src: DestOrSrc, tol = 10): string => {
    let res = '';
    const [dX, dY] = RG.dXdY(dest, src);
    const dXNew = dX / 10;
    const dYNew = dY / 10;
    if (dYNew > 0) {res += 'south';}
    else if (dYNew < 0) {res += 'north';}
    if (dXNew > 0) {res += 'east';}
    else if (dXNew < 0) {res += 'west';}

    if (res === '') {res = 'nearby from here';}
    return res;
};

//-------------------------------------------------------------
// RG ARRAY METHODS
//-------------------------------------------------------------

type Map2D = any[][];

/* Debugging function for printing 2D map row-by-row. */
RG.printMap = (map: Map2D | CellMap): void => {
    let rowByRow = null;
    if (Array.isArray(map)) {
        rowByRow = RG.colsToRows(map);
    }
    else if (Array.isArray((map as CellMap)._map)) {
        rowByRow = RG.colsToRows((map as CellMap)._map);
    }
    if (rowByRow) {
        const sizeY = rowByRow.length;
        for (let y = 0; y < sizeY; y++) {
            console.log(rowByRow[y].join(''));
        }
    }

};


type ForEachCb<T> = (x: number, y: number, val?: T) => void;
/* Iterates through 2D-array and calls the callback with (i, j, [i][j]) .*/
RG.forEach2D = <T>(arr: T[][], func: ForEachCb<T>): void => {
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr[i].length; j++) {
            func(i, j, arr[i][j]);
        }
    }
};

type MapCb<T> = (x: number, y: number, val?: T) => T;
/* Similar to Array.map, but maps a 2D array to an array of values. */
RG.map2D = <T>(arr: T[][], func: MapCb<T>): T[] => {
    const res = [];
    RG.forEach2D(arr, (i: number, j: number, val) => {
        res.push(func(i, j, val));
    });
    return res;
};

RG.copy2D = <T>(arr: T[][]): T[][] => {
    const copy = new Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
        copy[i] = new Array(arr[i].length);
        for (let j = 0; j < arr[i].length; j++) {
            copy[i][j] = arr[i][j];
        }
    }
    return copy;
};

RG.colsToRows = (arr: any[][]): any[][] => {
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
RG.flattenTo2D = (arr: any): any[][] => {
    const sizeY = arr.length;
    const res = [];
    for (let y = 0; y < sizeY; y++) {
        let row = arr[y];
        row = flat(row);
        res.push(row);
    }
    function flat(data: any): any[] {
        let r = [];
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

RG.uniquifyCoord = (arr: TCoord[]): TCoord[] => {
    const seen = {};
    const res = [];
    for (let i = 0; i < arr.length; i++) {
        const [x, y] = arr[i];
        const key = x + ',' + y;
        if (!seen[key]) {
            seen[key] = true;
            res.push(arr[i]);
        }
    }
    return res;
};

// ARRAY Funcs end

RG.setAllExplored = (level: Level): void => {
    const map = level.getMap();
    for (let x = 0; x < map.cols; x++) {
        for (let y = 0; y < map.rows; y++) {
            const cell = map._map[x][y];
            cell.setExplored();
        }
    }
};

RG.inSameLevel = (ent1, ent2): boolean => {
    return ent1.getLevel().getID() === ent2.getLevel().getID();
};

/* Returns a game message for cell which cannot be travelled. */
RG.getImpassableMsg = (actor, cell, str) => {
    const type = cell.getBaseElem().getType();
    const cellMsg = `cannot venture beyond ${type}`;
    return `${str} ${cellMsg}`;
};

RG.formatLocationName = (level): string => {
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
            // return `${subName} of ${zoneName}`;
            return `${zoneName}`;
        }
        default: return feat.getName();
    }
};

import {Random} from './random';

/* Function to check if given action succeeds given it's probability. */
RG.isSuccess = function(prob: number): boolean {
    const rng = Random.getRNG();
    return rng.getUniform() <= prob;
};


/* A debug function which prints info about given entity. */
RG.ent = function(whatever: any) {
    if ((window as any).PLAYER) {
        const level = (window as any).PLAYER.getLevel();
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

RG.while = function(testFunc: () => boolean, loopBody: () => void, timeout = -1) {
    let numTries = timeout;
    while (testFunc()) {
        loopBody();
        if (--numTries === 0) {
            return false;
        }
    }
    return true;
};

// -------------------------------------------------
// Functions for emitting in-game messages to player
// -------------------------------------------------

interface GameMsgObject {
    cell: Cell;
    msg: string;
}

type GameMsg = string | GameMsgObject;

import {EventPool} from './eventpool';
const POOL: EventPool = EventPool.getPool();

// Accepts 2 different arguments:
// 1. A simple string messages
// 2. {msg: "Your message", cell: Origin cell of messaage}
// Using 2. messages can be easily filtered by position.
RG.gameMsg = function(msg: GameMsg): void {
    this.emitMsgEvent('prim', msg);
};

RG.gameInfo = function(msg: GameMsg): void {
    this.emitMsgEvent('info', msg);
};

RG.gameDescr = function(msg: GameMsg): void {
    this.emitMsgEvent('descr', msg);
};

RG.gameSuccess = function(msg: GameMsg) {
    this.emitMsgEvent('success', msg);
};

RG.gameWarn = function(msg: GameMsg) {
    this.emitMsgEvent('warn', msg);
};

RG.gameDanger = function(msg: GameMsg) {
    this.emitMsgEvent('danger', msg);
};

/* To signal an internal error using the "normal" message interface */
RG.gameIntError = function(msg: GameMsg) {
    this.emitMsgEvent('bg-danger text-white', msg);
};

/* Emits message event with cell origin, style and message. */
RG.emitMsgEvent = function(style: string, msg: GameMsg): void {
    let newMsg = '';
    if (typeof msg === 'object') {
        const msgObj = msg as GameMsgObject;
        const cell = msgObj.cell;
        newMsg = msgObj.msg;
        newMsg = newMsg[0].toUpperCase() + newMsg.substring(1);

        const msgObject = {cell, msg: newMsg, style};
        POOL.emitEvent(this.EVT_MSG, msgObject);
    }
    else {
        newMsg = msg[0].toUpperCase() + msg.substring(1);
        POOL.emitEvent(this.EVT_MSG, {msg: newMsg, style});
    }

};

/* Destroys item (typically after use). */
RG.destroyItemIfNeeded = item => {
    if (RG.isOneShotItem(item)) {
        if (item.getCount() === 1) {
            const msg = {item};
            POOL.emitEvent(RG.EVT_DESTROY_ITEM, msg);
        }
        else {
            item.decrCount(1);
        }
    }
};

//-------------------------
// Functions for entities
//-------------------------

/* Returns the name for given entity. */
RG.getEntName = function(ent: Entity): string {
    if (ent.has('Named')) {
        return ent.get('Named').getFullName();
    }
    return '';
};

RG.getLevel = function(ent: Entity): Level | null {
    if (ent.has('Location')) {
        return ent.get('Location').getLevel();
    }
    return null;
};

/* eslint no-unused-vars: 0 */
export default RG;


const $DEBUG = 0;

/* Main object of the package for encapsulating all other objects. */

import './utils';
import {TCardinalDir, TCoord, DestOrSrc, IPlayerCmdInput, ICellDirMap,
    TPropType, AmmoOrMissile, TObjRefArray, IObjRef, CellPropMap, TCoord3D
} from './interfaces';
import {Random} from './random';
import {EventPool} from './eventpool';

interface GameMsgObject {
    cell: Cell;
    msg: string;
}

type GameMsg = string | GameMsgObject;

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
type ComponentBase = import('./component/component.base').ComponentBase;

// type MissType = (Entity & Damage) | ItemBase;
type MissType = AmmoOrMissile | ItemBase;
interface ProbDist {[key: string]: number;}

interface TargetWrapper {
    target: Target;
}
type Target = Cell | BaseActor | TargetWrapper;

type Map2D<T = any> = T[][];
type ForEachCb<T> = (x: number, y: number, val?: T) => void;
type MapCb<T> = (x: number, y: number, val?: T) => T;

interface GetChar {
    getChar: string;
    default: string;
}

interface GetClass {
    getClassName: string;
    default: string;
}

interface StateQuery {
    [key: string]: string;
    default: string;
}

type StyleEntry = GetChar | StateQuery | GetClass;

interface StyleEntryMap {
    [key: string]: StyleEntry | string;
    default: string;
}

class RGClass {

    public POOL: EventPool;

    public gameTitle: string = 'Battles in the North (BitN)';

    // Can be set to true for testing, when error conditions are checked
    public suppressErrorMessages: boolean = false;
    public suppressLogs: boolean = false;
    public suppressWarningMessages: boolean = false;
    public suppressDiagnosticMessages: boolean = false;

    public cellRenderVisible: TPropType[] = ['actors', 'items', 'elements'];
    public cellRenderAlways: TPropType[] = ['items', 'elements'];
    public cellRenderArray: TPropType[];

    //public charStyles: {[key: string]: any};
    public charStyles: CellPropMap<StyleEntryMap>;
    public cellStyles: CellPropMap<StyleEntryMap>;

    public COLORS: string[];
    public DMG: {[key: string]: string};
    public classNameDMG: {[key: string]: string};
    public STATS: string[];
    public STATS_LC: string[];
    public STATS_DEFAULTS: {[key: string]: number};
    public STATS_ABBR: string[];
    public GET_STATS: string[];
    public SET_STATS: string[];
    public STATS_ABBR2STAT: {[key: string]: string};

    public MAX_DRENCHED: number;

    public VERB: {[key: string]: number};

    public PLAYER_FOV_RANGE: number;
    public NPC_FOV_RANGE: number;
    public ACTION_DUR: number;
    public ACTION_OK: number;
    public ACTION_FAILED: number;
    public BASE_SPEED: number;
    public DEFAULT_HP: number;
    public MAX_ACTIVE_LEVELS: number;

    public EVT: {[key: string]: string};

    public TYPE_ACTOR: TPropType;
    public TYPE_ELEM: TPropType;
    public TYPE_ITEM: TPropType;

    public ITEM: {[key: string]: string};
    public SHOP_TYPES: string[];
    public USE: {[key: string]: string};

    public LEVEL_ID_ADD: number;
    public ENTITY_ID_ADD: number;
    public WATCHDOG: number;
    public NO_TARGET: number;

    public energy: {[key: string]: number};
    public BIAS: {[key: string]: number};

    public FMODE_NORMAL: number;
    public FMODE_FAST: number;
    public FMODE_SLOW: number;

    public ITEM_SUFFIX_CHANCE: number;
    public ITEM_PREFIX_CHANCE: number;

    public PROT_BYPASS_CHANCE: number;
    public MISSILE_CRITICAL_SHOT: number;

    // 0.0 = uniform dist, higher number assigns more weight to median values
    public DANGER_ADJ_FACTOR: number;
    public PLAYER_HP_REGEN_PERIOD: number;
    public PLAYER_PP_REGEN_PERIOD: number;
    public MIN_VALUE: number;
    public MIN_DANGER: number;

    public TRAINER_PROB: number;
    public EPIC_PROB: number;

    public GOLD_COIN_WEIGHT: number;
    public GOLD_COIN_NAME: string;
    public GOLD_WEIGHT_ADJUST: number;

    public HUNGER_PROB: number;
    public HUNGER_DMG: number;

    public ALIGN_GOOD: string;
    public ALIGN_EVIL: string;
    public ALIGN_NEUTRAL: string;

    public EVIL_RACES: string[];
    public NEUTRAL_RACES: string[];

    public ACTOR_RACES: string[];

    public ALL_RACES: string[];

    public CARDINAL_DIR: string[];
    public CARDINAL_DIR_ABBR: string[];

    public DIR: ICellDirMap<TCoord>;

    public DIR_NSEW: TCoord[];
    public DIR_DIAG: TCoord[];

    public SEASON: {[key: string]: string};
    public DAY: {[key: string]: string};

    public AREA_LEVEL_COLS: number;
    public AREA_LEVEL_ROWS: number;

    public LETTERS: string[];
    public LETTERS_UC: string[];

    public EVT_ACTOR_CREATED: string;
    public EVT_ACTOR_KILLED: string;
    public EVT_PLAYER_KILLED: string;
    public EVT_DESTROY_ITEM: string;
    public EVT_MSG: string;

    public EVT_LEVEL_CHANGED: string;
    public EVT_LEVEL_ENTERED: string;
    public EVT_TILE_CHANGED: string;
    public EVT_TILE_ENTERED: string;
    public EVT_TILE_LEFT: string;
    public EVT_EXPLORED_ZONE_LEFT: string;

    public EVT_LEVEL_PROP_ADDED: string;
    public EVT_LEVEL_PROP_REMOVED: string;

    public EVT_ACT_COMP_ENABLED: string;
    public EVT_ACT_COMP_DISABLED: string;
    public EVT_ON_ADD_COMP: string;
    public EVT_ON_REMOVE_COMP: string;

    public EVT_WIN_COND_TRUE: string;

    public EVT_ANIMATION: string;

    public EVT_CREATE_BATTLE: string;
    public EVT_BATTLE_OVER: string;
    public EVT_ARMY_EVENT: string;

    // Mostl_ used at low-level by System.Event
    public EVT_ITEM_PICKED_UP: string;
    public EVT_ACTOR_DAMAGED: string;
    public EVT_ACTOR_ATTACKED: string;
    public EVT_ACTOR_USED_STAIRS: string;

    // Used _or timing/simulating bigger events
    public EVT_WEATHER_CHANGED: string;
    public EVT_DAY_PHASE_CHANGED: string;
    public EVT_DAY_CHANGED: string;
    public EVT_MONTH_CHANGED: string;
    public EVT_SEASON_CHANGED: string;
    public EVT_YEAR_CHANGED: string;

    public WEAKNESS: {[key: string]: number};
    public RESISTANCE: {[key: string]: number};
    public SYS: {[key: string]: symbol};
    public ZONE_EVT: {[key: string]: string};

    public NO_DAMAGE_SRC: null;

    public LEVEL_NOT_LOADED: string;
    public TILE_NOT_LOADED: string;

    public PROP_TYPES: string[];
    public FMODES: number[];
    public ALIGNMENTS: string[];
    public ONE_SHOT_ITEMS: string[];

    public ACTOR_MEDIUM_SQR: number = 40;
    public LOOT_MEDIUM_SQR: number = 200;

    public LEVEL_MEDIUM_X: number = 80;
    public LEVEL_MEDIUM_Y: number = 40;

    public LEVEL_EMPTY: string;
    public LEVEL_FOREST: string;
    public LEVEL_MOUNTAIN: string;

    public CLICKED_ACTOR: any;
    public debugZoneEvents: boolean = false;

    public WORLD_ENTITY: string;


    constructor() {
        this.POOL = EventPool.getPool();
        // These are used to select rendered characters for map cells.
        this.charStyles = {
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
                default: '@'
            },
            items: {
                default: '?',
                corpse: '§'
            },
        };

        // These are used to select the CSS class for map cells.
        this.cellStyles = {
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

        this.VERB = {
            NONE: 10,
            LOW: 20,
            MEDIUM: 30,
            HIGH: 40,
            FULL: 50,
            DEBUG: 100
        };

        this.PLAYER_FOV_RANGE = 10;
        this.NPC_FOV_RANGE = 5; // Default FOV range for actor

        this.ACTION_DUR = 100; // Base duration of action
        this.BASE_SPEED = 100; // Base speed of actors
        this.DEFAULT_HP = 50;

        this.ACTION_OK = 1; // Action succeeded
        this.ACTION_FAILED = -1; // Action failed

        // How many levels are simulated at once, having more adds realism
        // but slows down the game, affects Game.Engine
        this.MAX_ACTIVE_LEVELS = 3;

        //----------------------
        // Different game events
        //----------------------
        this.EVT = {};
        this.EVT_ACTOR_CREATED = 'EVT_ACTOR_CREATED';
        this.EVT_ACTOR_KILLED = 'EVT_ACTOR_KILLED';
        this.EVT_PLAYER_KILLED = 'EVT_PLAYER_KILLED';
        this.EVT_DESTROY_ITEM = 'EVT_DESTROY_ITEM';
        this.EVT_MSG = 'EVT_MSG';

        this.EVT_LEVEL_CHANGED = 'EVT_LEVEL_CHANGED';
        this.EVT_LEVEL_ENTERED = 'EVT_LEVEL_ENTERED';
        this.EVT_TILE_CHANGED = 'EVT_TILE_CHANGED';
        this.EVT_TILE_ENTERED = 'EVT_TILE_ENTERED';
        this.EVT_TILE_LEFT = 'EVT_TILE_LEFT';
        this.EVT_EXPLORED_ZONE_LEFT = 'EVT_EXPLORED_ZONE_LEFT';

        this.EVT_LEVEL_PROP_ADDED = 'EVT_LEVEL_PROP_ADDED';
        this.EVT_LEVEL_PROP_REMOVED = 'EVT_LEVEL_PROP_REMOVED';

        this.EVT_ACT_COMP_ENABLED = 'EVT_ACT_COMP_ENABLED';
        this.EVT_ACT_COMP_DISABLED = 'EVT_ACT_COMP_DISABLED';
        this.EVT_ON_ADD_COMP = 'OnAddComponent';
        this.EVT_ON_REMOVE_COMP = 'OnRemoveComponent';

        this.EVT_WIN_COND_TRUE = 'EVT_WIN_COND_TRUE';

        this.EVT_ANIMATION = 'EVT_ANIMATION';

        this.EVT_CREATE_BATTLE = 'EVT_CREATE_BATTLE';
        this.EVT_BATTLE_OVER = 'EVT_BATTLE_OVER';
        this.EVT_ARMY_EVENT = 'EVT_ARMY_EVENT';

        // Mostl_ used at low-level by System.Event
        this.EVT_ITEM_PICKED_UP = 'EVT_ITEM_PICKED_UP';
        this.EVT_ACTOR_DAMAGED = 'EVT_ACTOR_DAMAGED';
        this.EVT_ACTOR_ATTACKED = 'EVT_ACTOR_ATTACKED';
        this.EVT_ACTOR_USED_STAIRS = 'EVT_ACTOR_USED_STAIRS';

        // Used _or timing/simulating bigger events
        this.EVT_WEATHER_CHANGED = 'EVT_WEATHER_CHANGED';
        this.EVT_DAY_PHASE_CHANGED = 'EVT_DAY_PHASE_CHANGED';
        this.EVT_DAY_CHANGED = 'EVT_DAY_CHANGED';
        this.EVT_MONTH_CHANGED = 'EVT_MONTH_CHANGED';
        this.EVT_SEASON_CHANGED = 'EVT_SEASON_CHANGED';
        this.EVT_YEAR_CHANGED = 'EVT_YEAR_CHANGED';

        //----------------------------
        // Different entity/prop types
        //----------------------------
        this.TYPE_ACTOR = 'actors';
        this.TYPE_ELEM = 'elements';
        this.TYPE_ITEM = 'items';

        // Constants for different item types
        this.ITEM = {};
        this.ITEM.BASE = 'base';
        this.ITEM.FOOD = 'food';
        this.ITEM.BOOK = 'book';
        this.ITEM.CORPSE = 'corpse';
        this.ITEM.WEAPON = 'weapon';
        this.ITEM.ARMOUR = 'armour';
        this.ITEM.SPIRITGEM = 'spiritgem';
        this.ITEM.GOLD = 'gold';
        this.ITEM.MINERAL = 'mineral';
        this.ITEM.MISSILE = 'missile';
        this.ITEM.MISSILE_WEAPON = 'missileweapon';
        this.ITEM.AMMUNITION = 'ammo';
        this.ITEM.POTION = 'potion';
        this.ITEM.RUNE = 'rune';
        this.ITEM.GOLD_COIN = 'goldcoin';

        // This is a subset of ITEM_TYPES, excluding gold items
        this.SHOP_TYPES = ['ammo', 'armour', 'food', 'mineral',
            'missile', 'missileweapon', 'potion', 'rune', 'spiritgem', 'weapon'
        ];

        this.USE = {
            DRINK: 'DRINK',
            DIG: 'DIG',
            LEVER: 'LEVER',
            SKILL: 'SKILL',  // For actors only
            DEFAULT: ''
        };

        this.LEVEL_ID_ADD = 1000000000;
        this.ENTITY_ID_ADD = 1000000000;

        this.WATCHDOG = 100; // Used mainly to terminate while-loops
        this.NO_TARGET = -1;

        this.LEVEL_EMPTY = 'empty';
        this.LEVEL_FOREST = 'forest';
        this.LEVEL_MOUNTAIN = 'mountain';

        // Energy per action
        this.energy = {
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
        this.BIAS = {
            ALWAYS: 10.0,
            NOT_POSSIBLE: -10.0,
            Explore: 0.2,
            Flee: 0.2,
            Guard: 1.1,
            Order: 0.7,
            Patrol: 1.0
        };

        // Different fighting modes
        this.FMODE_NORMAL = 0;
        this.FMODE_FAST = 1;
        this.FMODE_SLOW = 2;

        this.ITEM_SUFFIX_CHANCE = 0.1;
        this.ITEM_PREFIX_CHANCE = 0.1;

        this.PROT_BYPASS_CHANCE = 0.05;
        this.MISSILE_CRITICAL_SHOT = 0.1;

        // 0.0 = uniform dist, higher number assigns more weight to median values
        this.DANGER_ADJ_FACTOR = 1.4;
        this.PLAYER_HP_REGEN_PERIOD = 40;
        this.PLAYER_PP_REGEN_PERIOD = 40;
        this.MIN_VALUE = 30; // Min value for generated items.
        this.MIN_DANGER = 4; // Min danger for generated actors

        this.TRAINER_PROB = 0.2;
        this.EPIC_PROB = 0.05;

        this.GOLD_COIN_WEIGHT = 0.001; // kg
        this.GOLD_COIN_NAME = 'Gold coin';
        this.GOLD_WEIGHT_ADJUST = 600;

        this.HUNGER_PROB = 0.10; // Prob. of starvation to cause damage every turn
        this.HUNGER_DMG = 1; // Damage caused by starvation kicking in


        // Alignments (TODO make more diverse)
        this.ALIGN_GOOD = 'ALIGN_GOOD';
        this.ALIGN_EVIL = 'ALIGN_EVIL';
        this.ALIGN_NEUTRAL = 'ALIGN_NEUTRAL';

        this.EVIL_RACES = ['catfolk', 'dogfolk', 'wolfclan', 'wildling', 'undead',
            'goblin'];
        this.NEUTRAL_RACES = ['dwarf', 'bearfolk', 'animal'];

        this.ACTOR_RACES = ['catfolk', 'dogfolk', 'wolfclan', 'wildling', 'goblin',
            'bearfolk', 'dwarf', 'human', 'hyrkhian'];
        this.ACTOR_RACES = this.ACTOR_RACES.sort(); // Too lazy to manually sort them

        this.ALL_RACES = ['avianfolk'].concat(this.ACTOR_RACES);

        // Constants for movement directions
        this.CARDINAL_DIR = ['north', 'south', 'east', 'west'];
        this.CARDINAL_DIR_ABBR = ['N', 'S', 'E', 'W'];

        this.DIR = {
            N: [0, -1],
            S: [0, 1],
            E: [1, 0],
            W: [-1, 0],
            NE: [1, -1],
            SE: [1, 1],
            NW: [-1, -1],
            SW: [-1, 1]
        };

        this.DIR_NSEW = [this.DIR.N, this.DIR.S, this.DIR.E, this.DIR.W];
        this.DIR_DIAG = [this.DIR.NE, this.DIR.SE, this.DIR.NW, this.DIR.SW];

        this.SEASON = {
            AUTUMN: 'AUTUMN',
            AUTUMN_WINTER: 'AUTUMN_WINTER',
            WINTER: 'WINTER',
            WINTER_SPRING: 'WINTER_SPRING',
            SPRING: 'SPRING',
            SPRING_SUMMER: 'SPRING_SUMMER',
            SUMMER: 'SUMMER',
            SUMMER_AUTUMN: 'SUMMER_AUTUMN',
        };

        this.DAY = {
            DAWN: 'DAWN',
            MORNING: 'MORNING',
            NOON: 'NOON',
            AFTERNOON: 'AFTERNOON',
            EVENING: 'EVENING',
            DUSK: 'DUSK',
            NIGHT: 'NIGHT'
        };

        this.AREA_LEVEL_COLS = 100;
        this.AREA_LEVEL_ROWS = 100;

        this.LETTERS = ['a', 'b', 'c', 'd', 'e', 'f',
            'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
            'u', 'v', 'w', 'x', 'y', 'z'
        ];
        this.LETTERS_UC = this.LETTERS.map((l: string) => l.toUpperCase());

        this.DMG = {
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

        this.classNameDMG = {
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

        // You can add new stats for actors here. If you're lucky, adding will
        // be smooth and it will be seen correctly everywhere. Then you need to
        // implement System which exploits this stat
        this.STATS = [
            'Accuracy', 'Agility', 'Magic', 'Perception', 'Strength', 'Willpower',
            'Spirituality'
        ] as string[];

        /* Events for zones. */
        const ZONE_EVT = {
            BATTLE_OVER: 'BATTLE_OVER',
            ZONE_EXPLORED: 'ZONE_EXPLORED',
            QUEST_COMPLETED: 'QUEST_COMPLETED',
            CITY_WIPED: 'CITY_WIPED',
            MOUNTAIN_CLIMBED: 'MOUNTAIN_CLIMBED',
            UNIQUE_KILLED: 'UNIQUE_KILLED'
        };
        this.ZONE_EVT = ZONE_EVT;

        // Weakness levels of actors
        this.WEAKNESS = {};
        this.WEAKNESS.MINOR = 1;
        this.WEAKNESS.MEDIUM = 3;
        this.WEAKNESS.SEVERE = 7;
        this.WEAKNESS.FATAL = 10;

        // Resistance levels of actor to different effects
        this.RESISTANCE = {};
        this.RESISTANCE.MINOR = 1;
        this.RESISTANCE.MEDIUM = 3;
        this.RESISTANCE.STRONG = 6;
        this.RESISTANCE.IMMUNITY = 10;
        this.RESISTANCE.ABSORB = 15;

        //-----------------------------
        // Systems used in the engine
        //-----------------------------
        this.SYS = {};
        this.SYS.ANIMATION = Symbol('ANIMATION');
        this.SYS.AREA_EFFECTS = Symbol('AREA_EFFECTS');
        this.SYS.ATTACK = Symbol('ATTACK');
        this.SYS.ATTACK_RANGED = Symbol('ATTACK_RANGED');
        this.SYS.BATTLE = Symbol('BATTLE');
        this.SYS.BASE_ACTION = Symbol('BASE_ACTION');
        this.SYS.CHAT = Symbol('CHAT');
        this.SYS.COMMUNICATION = Symbol('COMMUNICATION');
        this.SYS.DAMAGE = Symbol('DAMAGE');
        this.SYS.DEATH = Symbol('DEATH');
        this.SYS.DISABILITY = Symbol('DISABILITY');
        this.SYS.DRAIN_STATS = Symbol('DRAIN_STATS');
        this.SYS.EQUIP = Symbol('EQUIP');
        this.SYS.EVENTS = Symbol('EVENTS');
        this.SYS.EXP_POINTS = Symbol('EXP_POINTS');
        this.SYS.HUNGER = Symbol('HUNGER');
        this.SYS.MISSILE = Symbol('MISSILE');
        this.SYS.MOVEMENT = Symbol('MOVEMENT');
        this.SYS.QUEST = Symbol('QUEST');
        this.SYS.SHOP = Symbol('SHOP');
        this.SYS.SKILLS = Symbol('SKILLS');
        this.SYS.SPELL_CAST = Symbol('SPELL_CAST');
        this.SYS.SPELL_EFFECT = Symbol('SPELL_EFFECT');
        this.SYS.SPIRIT = Symbol('SPIRIT');
        this.SYS.TIME_EFFECTS = Symbol('TIME_EFFECTS');
        this.SYS.ZONE_EVENTS = Symbol('ZONE_EVENTS');
        this.SYS.WEATHER = Symbol('WEATHER');
        this.SYS.ON_CBS = Symbol('ON_CBS');
        this.SYS.MINING = Symbol('MINING');

        this.NO_DAMAGE_SRC = null;

        this.initStats(this.STATS);

        // Load status when using chunk unloading
        this.LEVEL_NOT_LOADED = 'LEVEL_NOT_LOADED';
        this.TILE_NOT_LOADED = 'TILE_NOT_LOADED';

        this.cellRenderArray = this.cellRenderVisible;

        this.PROP_TYPES = [this.TYPE_ACTOR, this.TYPE_ELEM, this.TYPE_ITEM];
        // Fighting modes
        this.FMODES = [this.FMODE_NORMAL, this.FMODE_FAST, this.FMODE_SLOW];

        this.ALIGNMENTS = [this.ALIGN_GOOD, this.ALIGN_NEUTRAL, this.ALIGN_EVIL];

        this.cellRenderArray = this.cellRenderVisible;

        this.ONE_SHOT_ITEMS = ['potion'];
        this.WORLD_ENTITY = 'WorldEntity';

        this.MAX_DRENCHED = 10;
    }

    /* Given Map.Cell, returns CSS classname used for styling that cell. */
    public getCssClassForCell(cell: Cell, isVisible: boolean): string {
        if (isVisible) {this.cellRenderArray = this.cellRenderVisible;}
        else {this.cellRenderArray = this.cellRenderAlways;}
        const className = this.getStyleClassForCell(cell);
        this.cellRenderArray = this.cellRenderVisible;
        return className;
    }

    /* Same as getClassName, but optimized for viewing the full map. */
    public getCssClassFullMap(cell: Cell): string | null {
        this.cellRenderArray = this.cellRenderVisible;

        if (!cell.hasProps()) {
            const baseType = cell.getBaseElem().getType();
            return this.cellStyles.elements[baseType] as string;
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
    }

    /* Given Map.Cell, returns a char that is rendered for the cell. */
    public getCharForCell(cell: Cell, isVisible: boolean): string {
        if (isVisible) {this.cellRenderArray = this.cellRenderVisible;}
        else {this.cellRenderArray = this.cellRenderAlways;}
        const cellChar = this.getCellChar(cell);
        this.cellRenderArray = this.cellRenderVisible;
        return cellChar;
    }

    /* Same as getChar, but optimized for full map viewing. */
    public getCharFullMap(cell: Cell): string | null {
        this.cellRenderArray = this.cellRenderVisible;

        if (!cell.hasProps()) {
            const baseType = cell.getBaseElem().getType();
            return this.charStyles.elements[baseType] as string;
        }

        for (let i = 0; i < 3; i++) {
            if (cell.hasProp(this.cellRenderVisible[i])) {
                const props = cell.getProp(this.cellRenderVisible[i])!;
                const styles = this.charStyles[this.cellRenderVisible[i]];
                return this.getPropClassOrChar(styles, props[0]);
            }
        }
        return null;
    }

    /* Maps a cell to specific object in stylesheet. For rendering purposes
     * only.*/
    public getStyleClassForCell(cell: Cell): string {
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
        return this.cellStyles.elements[baseType] as string;
    }

    /* styles is either a LUT of chars or LUT of CSS classnames. */
    public getPropClassOrChar(styles: StyleEntryMap, propObj: any): string {

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
                const entry = styles[lookupKey] as StyleEntry;
                for (const p in entry) {
                    if (p !== 'default') {
                        const funcToCall = p;
                        const res = propObj[funcToCall]();

                        // If func returned true, use value ie
                        // isClosed: '+' returns '+' if isClosed() === true
                        if (res === true) {
                            return entry[p];
                        }
                        // Else if func returned non-false value, use the
                        // returned value, ie getChar() returned 'A'
                        else if (res !== false) {
                            return res; // If res not single char, messes things
                        }
                    }
                }
                return entry.default;

            }
            return styles[lookupKey] as string;
        }
        else {
            return styles.default;
        }
    }

    /* Returns char which is rendered on the map cell based on cell contents.*/
    public getCellChar(cell: Cell): string {
        if (!cell.isExplored()) {return 'X';}

        for (let i = 0; i < this.cellRenderArray.length; i++) {
            if (cell.hasProp(this.cellRenderArray[i])) {
                // Should exist due to hasProp
                const props = cell.getProp(this.cellRenderArray[i])!;

                const styles = this.charStyles[this.cellRenderArray[i]];
                const propObj = props[0];
                return this.getPropClassOrChar(styles, propObj);
            }
        }

        const baseType = cell.getBaseElem().getType();
        return this.charStyles.elements[baseType] as string;
    }


    /* Adds a CSS class for given prop and type. For example, "actors", "wolf",
     * "cell-actor-wolf" uses CSS class .cell-actor-wolf to style cells with
     * wolves in them. */
    public addCellStyle(prop: TPropType, type: string, cName: string): void {
        if (this.cellStyles.hasOwnProperty(prop)) {
            this.cellStyles[prop][type] = cName;
        }
        else {
            this.err('RG', 'addCellStyle', 'Unknown prop type: ' + prop);
        }
    }

    public removeCellStyle(prop: TPropType, type: string): void {
        if (this.cellStyles.hasOwnProperty(prop)) {
            delete this.cellStyles[prop][type];
        }
    }

    /* Adds a char to render for given prop and type. Example: "actors",
     * "wolf", "w" renders 'w' for cells containing wolves.*/
    public addCharStyle(prop: TPropType, type: string, charName: string): void {
        if (this.charStyles.hasOwnProperty(prop)) {
            this.charStyles[prop][type] = charName;
        }
        else {
            this.err('RG', 'addCharStyle', 'Unknown prop type: ' + prop);
        }
    }

    public removeCharStyle(prop: TPropType, type: string): void {
        if (this.charStyles.hasOwnProperty(prop)) {
            delete this.charStyles[prop][type];
        }
    }

    public getChar(prop: TPropType, name: string, state: string | null = null): string {
        if (this.charStyles.hasOwnProperty(prop)) {
            if (state) {
                const stateQuery: StateQuery = this.charStyles[prop][name] as StateQuery;
                return stateQuery[state] as string;
            }
            return this.charStyles[prop][name] as string; // TODO fix to safer
        }
        return 'X';
    }

    public getCssClass(prop: TPropType, name: string, state: string | null = null): string {
        if (this.cellStyles.hasOwnProperty(prop)) {
            if (state) {
                const stateQuery: StateQuery = this.cellStyles[prop][name] as StateQuery;
                return stateQuery[state] as string;
            }
            if (this.cellStyles[prop].hasOwnProperty(name)) {
                return this.cellStyles[prop][name] as string; // TODO fix to safer
            }
        }
        return '';
    }

    public debug(obj: any, msg: string): void {
        if ($DEBUG) {
            const inst = typeof obj;
            const json = JSON.stringify(obj);
            console.log(`[DEBUG]: Type: ${inst} ${json} |${msg}|`);
        }
    }

    public err(obj: string, fun: string, msg: string) {
        if (!this.suppressErrorMessages) {
            const formattedMsg = `[ERROR]: ${obj} ${fun} -> |${msg}|`;
            console.error(formattedMsg);
            throw new Error(formattedMsg);
        }
    }

    public warn(obj: string, fun: string, msg: string): void {
        if (!this.suppressWarningMessages) {
            const formattedMsg = `[WARN]: ${obj} ${fun} -> |${msg}|`;
            console.error(formattedMsg);
        }
    }

    public diag(obj: any): void {
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
    }

    public log(...args) {
        if (!this.suppressLogs) {
            console.log('[INFO]:', ...args);
        }
    }

    /* Checks that object has given type using getType() function. Throws error if
     * type does not match. */
    public assertType(obj: any, typeStr: string): void {
        if (obj.getType) {
            if (obj.getType() !== typeStr) {
                this.err('RG', 'assertType',
                    `Exp: ${typeStr}, Got: ${obj.getType()}`);
            }
        }
        else {
            this.err('RG', 'assertType', `object ${obj} has no getType()`);
        }
    }

    /* Used to inherit from a prototype. Supports multiple inheritance but
     * sacrifices instanceof.*/
    public extend2(Child: any, Parent: any): void {
        if (this.isNullOrUndef([Child])) {
            this.err('RG', 'extend2',
                `Child not defined. Parent: ${Parent}`);
        }
        if (this.isNullOrUndef([Parent])) {
            this.err('RG', 'extend2',
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
    }

    /* Prints an error into console if 'val' is null or undefined.*/
    public nullOrUndefError(name: string, msg: string, val: any): void {
        if (this.isNullOrUndef([val])) {
            const formattedMsg = `nullOrUndef ${name} ${msg}`;
            console.error(formattedMsg);
            throw new Error(formattedMsg);
        }
    }

    /* Returns true if anything in the list is null or undefined.*/
    public isNullOrUndef(list: any[]): boolean {
        for (let i = 0; i < list.length; i++) {
            if (list[i] === null || typeof list[i] === 'undefined' ||
                typeof list === 'undefined') {
                return true;
            }
        }
        return false;
    }

    /* Tries to add item2 to item1 stack. Returns true on success.*/
    public addStackedItems(item1: ItemBase, item2: ItemBase): boolean {
        if (item1.equals(item2)) {
            const countToAdd = item2.getCount();
            item1.incrCount(countToAdd);
            return true;
        }
        return false;
    }

    /* Removes N items from the stack and returns them. Returns null if the
     * stack is not changed.*/
    public removeStackedItems(itemStack: ItemBase, n): ItemBase | null {
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
    }

    /* Returns the FoV range for actor taking into account environment
     * effects etc. */
    public getFOVRange(actor: SentientActor): number {
        let range = actor.getFOVRange();
        if (actor.has('Location')) {
            const level = actor.get('Location').getLevel();
            if (level && level.has('Weather')) {
                const visib = level.get('Weather').getVisibility();
                range += visib;
            }
            // TODO other effects
        }

        // TODO light sources etc
        if (range < 1) {range = 1;}
        return range;
    }

//--------------------------------------------------------------
// COMBAT-RELATED FUNCTIONS
//--------------------------------------------------------------

    public getItemDamage(item: ItemBase): number {
        if ((item as any).rollDamage) {
            return (item as any).rollDamage();
        }
        else {
            const weight = item.getWeight();
            return Math.ceil(weight / 1.1);
        }
    }

    public getMeleeAttack(att: SentientActor): number {
        let attack = att.getAttack();
        const missile = att.getInvEq().getMissile();
        const missWeapon = att.getInvEq().getMissileWeapon();
        if (missile) {attack -= missile.getAttack();}
        if (missWeapon) {attack -= missWeapon.getAttack();}
        return attack;
    }

    public getMeleeAttackRange(att: SentientActor): number {
        const attackRange = att.get('Combat').getAttackRange();
        const weapon: unknown = att.getWeapon();
        if (weapon && (weapon as Damage).getAttackRange) {
            const weaponRange = (weapon as Damage).getAttackRange();
            return weaponRange > attackRange ? weaponRange : attackRange;
        }
        return attackRange;
    }

    public getMeleeDamageAdded(att: SentientActor): number {
        let dmg = att.getCombatBonus('getDamage');
        dmg += this.strengthToDamage(att.getStatVal('Strength'));
        return dmg;
    }

    public getMeleeAttackInfo(att: SentientActor): string {
        let result = 'Att: ' + this.getMeleeAttack(att);
        const weapon: unknown = att.getWeapon();
        if (weapon && (weapon as Damage).getDamageDie) {
            result += ' D: ' + (weapon as Damage).getDamageDie().toString();
        }
        else {
            result += ' D: ' + att.get('Combat').getDamageDie().toString();
        }
        result += ' + ' + this.getMeleeDamageAdded(att);
        return result;
    }

    public getMissileAgilityDmg(agi: number): number {
        return Math.round(agi / 3);
    }


    public getMissileDamageAdded(att: SentientActor, miss: MissType): number {
        let dmg = this.getMissileAgilityDmg(att.get('Stats').getAgility());
        if (miss.has('Ammo')) {
            const missWeapon = att.getMissileWeapon();
            if (missWeapon) {
                dmg += missWeapon.rollDamage();
            }
        }
        if (att.has('StrongShot')) {
            dmg += this.strengthToDamage(att.getStatVal('Strength'));
        }
        return dmg;
    }

    public getMissileDamage(att: SentientActor, miss: MissType): number {
        if (this.isAmmoOrMissile(miss)) {
            let dmg = miss.rollDamage();
            dmg += this.getMissileDamageAdded(att, miss);
            return dmg;
        }
        const weight = Math.round(miss.getWeight() / 1.5);
        return weight;
    }

    public getMissileAttack(att: SentientActor): number {
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
    }

/* Returns the missile attack info in a string. */
    public getMissileAttackInfo(att: SentientActor): string {
        const missWeapon = att.getMissileWeapon();
        const miss = att.getInvEq().getMissile();
        if (!miss) {
            return 'No missile equipped';
        }

        let result = 'Att: ' + this.getMissileAttack(att);
        result += ' D: ' + miss.getDamageDie().toString();
        if (missWeapon) {
            const dmgDie = missWeapon.getDamageDie();
            result += ' + ' + dmgDie.toString() + ' (wpn)';
        }

        const dmg = this.getMissileDamageAdded(att, miss);
        result += ' + ' + dmg;
        result += ' R: ' + this.getMissileRange(att, miss);
        return result;
    }

    public getMissileRange(att: SentientActor, miss: MissType): number {
        if (!this.isAmmoOrMissile(miss)) {
            return 2;
        }

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
    }

    public isAmmoOrMissile(obj: any): obj is (Entity & Damage) {
        if (obj.getAttackRange) {return true;}
        return false;
    }

    public strengthToDamage(str: number): number {
        return Math.round(str / 4);
    }

    public accuracyToAttack(acc: number): number {
        return Math.floor(acc / 2);
    }

    public agilityToDefense(agi: number): number {
        return Math.floor(agi / 2);
    }


/* Given actor and cells it sees, returns first enemy cell found.*/
    public findEnemyCellForActor(actor, seenCells: Cell[]): Cell[] {
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
    }

    //--------------------------------------------------------------
    // CONSTANTS
    //--------------------------------------------------------------
    public initVars(): void {

    }

/* Converts a direction (N, S, ...) to 2-d vector. If already,
 * a vector, returns it. */
    public dirTodXdY(dir: TCoord | string): TCoord | null {
        if (Array.isArray(dir)) {
            return dir;
        }
        else if (this.DIR.hasOwnProperty(dir)) {
            const ucDir = dir.toUpperCase();
            return this.DIR[ucDir];
        }
        this.err('RG', 'dirTodXdY',
            `Arg must be array/string (N,S,E,W..). Got: ${dir}`);
        return null;
    }

    public dXdYToDir(dXdY: TCoord): TCardinalDir {
        const [dX, dY] = dXdY;
        let result = '';
        if (dY === 1) {result += 'S';}
        else if (dY === -1) {result += 'N';}
        if (dX === 1) {result += 'E';}
        else if (dX === -1) {result += 'W';}
        if (dX === 0 && dY === 0) {
            this.warn('RG', 'dXdYToDir', 'dXdY 0,0 passed in');
        }
        return result as TCardinalDir;
    }


/* Convert direction into single character. Used mainly to create
 * directional beams for spells etc animations. */
    public dirToChar(dir: TCoord): string {
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

    }


    public formatGetterName(propName: string): string {
        return 'get' + propName.capitalize();
    }

    public formatSetterName(propName: string): string {
        return 'set' + propName.capitalize();
    }

    /* Creates arrays for stat names, setters and getters, map for default values,
     * and LUT for mapping abbreviation (ie Acc => Accuracy). */
    public initStats(statArr: string[]): void {
        this.STATS_LC = statArr.map((stat: string) => stat.toLowerCase());

        this.STATS_DEFAULTS = this.STATS_LC.reduce((acc: {[key: string]: number}, curr: string) => {
            acc[curr] = 5;
            return acc;
        }, {});
        this.STATS_DEFAULTS.speed = 100;

        this.STATS_ABBR = statArr.map((stat: string) => stat.substr(0, 3));
        this.GET_STATS = statArr.map((stat: string) => this.formatGetterName(stat));
        this.SET_STATS = statArr.map((stat: string) => this.formatSetterName(stat));

        this.STATS_ABBR2STAT = statArr.reduce((acc: {[key: string]: string}, curr: string) => {
            acc[curr.substr(0, 3)] = curr;
            return acc;
        }, {});
    }

    /* Creates new stats object with given default value. */
    public createStatsObj(defValue: number, isLower: boolean = true): {[key: string]: number} {
        const res: any = {speed: defValue};
        if (isLower) {
            this.STATS_LC.forEach((stat: string) => {
                res[stat] = defValue;
            });
        }
        else {
            this.STATS.forEach((stat: string) => {
                res[stat] = defValue;
            });
        }
        return res;
    }


    public getDmgClassName(dmgType: string): string {
        return this.classNameDMG[dmgType];
    }

    /* Converts key of format X,Y to [X, Y]. */
    public key2Num(key: string): [number, number] {
        const [x, y] = key.split(',');
        return [parseInt(x, 10), parseInt(y, 10)];
    }

    public isEmpty(value: any): boolean {
        if (this.isNullOrUndef([value])) {
            return true;
        }
        else if (typeof value === 'string') {
            return value === '';
        }
        else if (Array.isArray(value)) {
            return value.length === 0;
        }
        return false;
    }

    /* Returns name of object, or its parent's if object has no name. */
    public getName(obj: any): string {
        if (obj.getName) {
            return obj.getName();
        }
        else if (obj.getParentZone) {
            const name = this.formatLocationName(obj);
            return name;
        }
        else if (obj.getParent) {
            const parent = obj.getParent();
            return parent.getName();
        }
        return ''; // Should this be an error?
    }


    /* Returns a name that is used in quests to give info about the target. */
    public getNameForQuest(obj: any): string {
        const name = this.getName(obj);
        if (name === 'exploration') {
            return this.getName(obj.getLevel());
        }
        return name;
    }

    public getObjRefArray(type: string, arr: any[]): TObjRefArray {
        const result: IObjRef[] = arr.map(targetObj => (
            this.getObjRef(type, targetObj)
        ));
        (result as TObjRefArray).$objRefArray = true;
        return result as TObjRefArray;
    }

    public getObjRef(type: string, obj: any): IObjRef {
        if (type === 'entity') {
            // Refs to items are dangerous as cloning changes the entity ref,
            // cloning must be used in item stacking etc
            if (this.isItem(obj)) {
                const msg = ' Got: |' + obj.getName() + '|';
                this.err('RG', 'getObjRef', 'objRefs to items not supported.' + msg);
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
        this.err('RG', 'getObjRef',
            `Type ${type} not supported. Obj: ${obj}`);
        return null;
    }

/* Returns a forest level configuration scaled to the size of the level. */
    public getForestConf(cols: number, rows: number): {[key: string]: any} {
        const xMult = cols / this.LEVEL_MEDIUM_X;
        const yMult = rows / this.LEVEL_MEDIUM_Y;
        const mult = xMult * yMult;

        const levelConf = {
            ratio: 0.5,
            nForests: Math.floor(mult * 30),
            forestSize: 100
        };
        return levelConf;
    }


    /* Returns danger probabilites for given level.*/
    public getDangerProb(min: number, max: number): ProbDist {
        if (min > max) {
            console.error('this.getDangerProb param order is min < max');
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
        const obj: ProbDist = {};

        arr.forEach((val: number) => {
            const absDiff = Math.abs(val - highPoint);
            let prob = maxArr - Math.floor(this.DANGER_ADJ_FACTOR * absDiff);
            prob = (prob === 0) ? prob + 1 : prob;
            obj[val] = prob;

        });

        return obj;
    }

    public getMaxDanger(xDiff: number, yDiff: number): number {
        let maxDanger = Math.round(2.5 * yDiff) + xDiff + 3;
        if (maxDanger < this.MIN_DANGER) {maxDanger = this.MIN_DANGER;}
        return maxDanger;
    }

    public getMaxValue(xDiff: number, yDiff: number): number {
        let maxValue = 25 * yDiff + 10 * xDiff;
        if (maxValue <= this.MIN_VALUE) {
            maxValue = this.MIN_VALUE;
        }
        return maxValue;
    }

    /* Returns the weight distribution for foods. This is something like
     * {0.1: 10, 0.2: 7, 0.3: 5, 0.5: 1} etc.*/
    public getFoodWeightDistr(): ProbDist {
        return {
            0.1: 20,
            0.2: 10,
            0.3: 5,
            0.4: 3,
            0.5: 1
        };
    }

    /* Returns the count distribution for gold coins. */
    public getGoldCoinCountDistr(nLevel: number): ProbDist {
        const maxVal = nLevel + 1;
        const dist: ProbDist = {};
        for (let i = 1; i <= maxVal; i++) {
            dist[i] = nLevel;
        }
        return dist;
    }

    public getRuneChargeDistr(): ProbDist {
        return {
            0: 2,
            1: 10,
            2: 30,
            3: 10,
            4: 5,
            5: 2,
            6: 1
        };
    }

    //--------------------------------
    // Value/gold/buy/sell functions
    //--------------------------------

    /* Converts abstract value into gold weight. */
    public valueToGoldWeight(value: number): number {
        if (value === 1) {return RG.GOLD_COIN_WEIGHT;}
        /*
        let currVal = value;
        let slope = 1;
        while (currVal >= 100) {
            currVal -= 100;
            ++slope;
        }
        const adjValue = slope * value + 10;
        return adjValue / 200;
        */
       return value / RG.GOLD_WEIGHT_ADJUST;
    }

    /* Scales (up) the value of item if any extra bonuses or modifiers are added to
     * it. */
    public scaleItemValue(type: string, bonus: number, item: ItemBase) {
        const currValue = item.getValue();
        let mult = 1;
        switch (type) {
            case 'combat': mult *= (1.0 + 0.1 * bonus); break;
            case 'stats': mult *= (1.0 + 0.2 * bonus); break;
            default: mult = 1;
        }
        const newValue = Math.floor(currValue * mult);
        item.setValue(newValue);
    }

    /* Returns true if given actor has gold at least equal to given gold weight. */
    public hasEnoughGold(actor, goldWeight: number): boolean {
        const ncoins = this.getGoldInCoins(goldWeight);
        const items = actor.getInvEq().getInventory().getItems();
        for (let i = 0; i < items.length; i++) {
            if (items[i].getType() === 'goldcoin') {
                if (items[i].getCount() >= ncoins) {
                    return true;
                }
            }
        }
        return false;
    }

/* Tries to remove given amount of gold coins from the actor. Returns the number
 * of coins removed. */
    public removeNCoins(actor: SentientActor, ncoins: number): number {
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
    }

/* Returns the total stat value of the given stat. Note that stat must be given
 * in getter format ie 'getStrength', not Strength. */
    public getItemStat(getFuncName: string, item): number {
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

    }

    public getExpRequired(newLevel: number): number {
        let reqExp = 0;
        for (let i = 1; i <= newLevel; i++) {
            reqExp += (i - 1) * 10;
        }
        return reqExp;
    }

/* Given direction vector and source, returns a new x,y coordinate. */
    public newXYFromDir(dir: TCoord, src: DestOrSrc): TCoord {
        let [xSrc, ySrc] = [0, 0];
        if (Array.isArray(src)) {
            [xSrc, ySrc] = src;
        }
        else if (src.getXY) {
            [xSrc, ySrc] = src.getXY();
        }
        else {
            this.err('RG', 'newXYFromDir',
                `src must be TCoord or have getXY function. Got ${src}`);
        }
        return [xSrc + dir[0], ySrc + dir[1]];
    }

    /* Returns the dX,dY of two coordinates or objects. */
    public dXdY(dest: DestOrSrc, src: DestOrSrc): TCoord {
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
    }

    public dXdYAbs(dest: DestOrSrc, src: DestOrSrc): TCoord {
        const [dX, dY] = this.dXdY(dest, src);
        return [Math.abs(dX), Math.abs(dY)];
    }

/* Returns the unit vector for direction between two objects.
 * Examples:
 *   1. Given 2 objects at (0,0) and (2,3), returns [-1,-1].
 *   2. Given 2 objects at (2,3) and (0,0), returns [1,1].
 *   3. Given 2 objects at (0,4) and (0,1), returns [0,1].
 *   4. Given 2 objects at (4,0) and (2,0), returns [1,0].
 */
    public dXdYUnit(dest: DestOrSrc, src: DestOrSrc): TCoord {
        const [dX, dY] = this.dXdY(dest, src);
        const dXUnit = dX === 0 ? 0 : dX / Math.abs(dX);
        const dYUnit = dY === 0 ? 0 : dY / Math.abs(dY);
        return [dXUnit, dYUnit];
    }

    public withinRange(r: number, dest: DestOrSrc, src: DestOrSrc): boolean {
        const [dX, dY] = this.dXdYAbs(dest, src);
        return dX <= r && dY <= r;
    }

/* Given an actor, scales its attributes based on new experience level. Can advance
 * actor multiple levels also, if newLevel diff to current level is more than 1.*/
    public levelUpActor(actor: BaseActor, newLevel: number): void {
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

                    this.levelUpStats(actor, nextLevel);

                    // Level up the Combat component
                    this.levelUpCombatStats(actor, nextLevel);

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
                this.err('RG', 'levelUpActor', msg);
            }
        }
        else {
            this.err('RG', 'levelUpActor', 'No exp. component found.');
        }
    }

    public levelUpStats(actor: BaseActor, nextLevel: number): void {
        const rng = Random.getRNG();
        const randStat = rng.arrayGetRand(this.STATS_LC);
        const stats = actor.get('Stats');
        stats.incrStat(randStat, 1);
    }

    public levelUpCombatStats(actor: BaseActor, nextLevel: number): void {
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
    }

/* Prints the given object using console.log. Calls all accessor functions
 * given in 'funcs' list and prints their value. If no list is given, prints the
 * full object directly. */
    public printObj(obj: any, funcs: string | string[], linfo: string): void {

        const printVal = (value, func) => {
            if (typeof value === 'object') {
                console.debug('\t## ' + func + linfo);
                console.debug(value + linfo);
            }
            else {
                console.debug('\t## ' + func + ' -> ' + value + linfo);
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
                        this.err('RG', 'printObj',
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
                    this.err('RG', 'printObj',
                        `No func ${funcs} in object ${JSON.stringify(obj)}`);
                }
            }
        }
        else {
            console.debug(obj + linfo);
        }
    }

    /* Prints the given object list. For each object, calls all accessor functions
     * given in 'funcs' list and prints their value. If no list is given, prints the
     * full object directly using console.log(obj). filterFunc can be given to
     * filter the list. */
    public printObjList(list: any[], funcs: string | string[], filterFunc) {
        const numObjs = list.length;
        console.log(`List has ${numObjs} objects`);

        list.forEach((obj, index) => {
            if (typeof filterFunc === 'function') {
                if (filterFunc(obj)) {
                    console.log(`Object [${index}]: `);
                    this.printObj(obj, funcs, '');
                }
            }
            else {
                console.log(`Object [${index}]: `);
                this.printObj(obj, funcs, '');
            }
        });
    }

// To create player commands
    public getUseCmd(item: ItemBase, target): IPlayerCmdInput {
        return {cmd: 'use', item, target};
    }

    public getDropCmd(item: ItemBase, count: number): IPlayerCmdInput {
        return {cmd: 'drop', item, count};
    }

    public getEquipCmd(item: ItemBase, count: number): IPlayerCmdInput {
        return {cmd: 'equip', item, count};
    }

    public getUnequipCmd(name: string, slotNumber: number, count: number): IPlayerCmdInput {
        return {cmd: 'unequip', slot: name, slotNumber, count};
    }


/* Returns true if given item is one-shot use item by its type.*/
    public isOneShotItem(item: ItemBase): boolean {
        const itemType = item.getType();
        const index = this.ONE_SHOT_ITEMS.indexOf(itemType);
        return index >= 0;
    }


    public isActor(obj: any): obj is BaseActor {
        if (obj && obj.getPropType) {
            return obj.getPropType() === this.TYPE_ACTOR;
        }
        return false;
    }

    public toActor(ent: Entity): BaseActor {
        if (!this.isActor(ent)) {
            this.err('RG', 'toActor',
                `Given entity not an actor: ${JSON.stringify(ent)}`);
        }
        return ent as BaseActor;
    }

    public isElement(obj: any): obj is ElementBase {
        if (obj && obj.getPropType) {
            return obj.getPropType() === this.TYPE_ELEM;
        }
        return false;
    }

    public isItem(obj: any): obj is ItemBase {
        if (obj && obj.getPropType) {
            return obj.getPropType() === this.TYPE_ITEM;
        }
        return false;
    }

/* Returns true if given object is an entity. Can return false results
 * sometimes. */
    public isEntity(obj: any): obj is Entity {
        if (obj.comps && obj.compsByType && obj.add && obj.get) {
            return true;
        }
        return false;
    }


    public isSentient(target: BaseActor): target is SentientActor {
        if (target) {
            const brain = target.getBrain() as BrainGoalOriented;
            return (typeof brain.getGoal === 'function');
        }
        return false;
    }

    public isBattleZone(target: any): target is BattleZone {
        if (target) {
            if (target.setBattle && target.getType() === 'battlezone') {
                return true;
            }
        }
        return false;
    }

    /* Can be queried if actor is still valid for serialisation or effects
     * like telepath or order giving. */
    public isActorActive(target: Entity): boolean {
        return target && !target.has('Dead');
    }

/* Returns the use type (ie drink or dig or hit...) for a item/target pair. */
    public getEffectUseType(item: ItemBase|BaseActor, targetOrObj: Target): string {
        let target = targetOrObj;
        if ((targetOrObj as TargetWrapper).target) {
            const tWrap = targetOrObj as TargetWrapper;
            target = tWrap.target;
            if ((target as Cell).getActors) {
                const tCell = target as Cell;
                if (tCell.hasActors()) {
                    target = tCell.getFirstActor() as BaseActor;
                }
            }
        }

        const itemType = item.getType();
        if (RG.isActor(item)) {
            return this.USE.SKILL;
        }

        switch (itemType) {
            case 'potion': {
                if (this.isActor(target)) {
                    return this.USE.DRINK;
                }
                break;
            }
            default: return this.USE.DEFAULT;
        }
        return this.USE.DEFAULT;
    }

    /* Given gold weight, returns the equivalent in coins.*/
    public getGoldInCoins(weight: number): number {
        return Math.round(weight / this.GOLD_COIN_WEIGHT);
    }

    public getCardinalDirection(level: Level, cell: Cell): string {
        const cols = level.getMap().cols;
        const rows = level.getMap().rows;
        const x = cell.getX();
        const y = cell.getY();
        if (y === 0) {return 'north';}
        if (y === rows - 1) {return 'south';}
        if (x === cols - 1) {return 'east';}
        if (x === 0) {return 'west';}
        return 'somewhere';
    }

/* Returns a textual (human-readable) interpretation of x,y difference between
 * to targets. */
    public getTextualDir(dest: DestOrSrc, src: DestOrSrc, tol: number = 10): string {
        let res = '';
        const [dX, dY] = this.dXdY(dest, src);
        const dXNew = dX / tol;
        const dYNew = dY / tol;
        if (dYNew > 0) {res += 'south';}
        else if (dYNew < 0) {res += 'north';}
        if (dXNew > 0) {res += 'east';}
        else if (dXNew < 0) {res += 'west';}

        if (res === '') {res = 'nearby';}
        return res;
    }

//-------------------------------------------------------------
// RG ARRAY METHODS
//-------------------------------------------------------------


/* Debugging function for printing 2D map row-by-row. */
    public printMap(map: Map2D | CellMap): void {
        let rowByRow = null;
        if (Array.isArray(map)) {
            rowByRow = this.colsToRows(map);
        }
        else if (Array.isArray((map as CellMap)._map)) {
            rowByRow = this.colsToRows((map as CellMap)._map);
        }
        if (rowByRow) {
            const sizeY = rowByRow.length;
            for (let y = 0; y < sizeY; y++) {
                console.log(rowByRow[y].join(''));
            }
        }

    }

    /* Iterates through 2D-array and calls the callback with (i, j, [i][j]) .*/
    public forEach2D<T>(arr: T[][], func: ForEachCb<T>): void {
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr[i].length; j++) {
                func(i, j, arr[i][j]);
            }
        }
    }

/* Similar to Array.map, but maps a 2D array to an array of values. */
    public map2D<T>(arr: T[][], func: MapCb<T>): T[] {
        const res: T[] = [];
        this.forEach2D(arr, (i: number, j: number, val: T) => {
            res.push(func(i, j, val));
        });
        return res;
    }

    public copy2D<T>(arr: T[][]): T[][] {
        const copy = new Array(arr.length);
        for (let i = 0; i < arr.length; i++) {
            copy[i] = new Array(arr[i].length);
            for (let j = 0; j < arr[i].length; j++) {
                copy[i][j] = arr[i][j];
            }
        }
        return copy;
    }

    public colsToRows<T>(arr: T[][]): T[][] {
        const res: T[][] = [];
        const sizeY = arr[0].length;
        const sizeX = arr.length;
        for (let y = 0; y < sizeY; y++) {
            res[y] = [];
            for (let x = 0; x < sizeX; x++) {
                res[y][x] = arr[x][y];
            }
        }
        return res;
    }

/* Given 2D array of elements, flattens all arrays inside each [x][y]
 * positions. */
    public flattenTo2D(arr: any): any[][] {
        const sizeY = arr.length;
        const res: any[][] = [];
        for (let y = 0; y < sizeY; y++) {
            let row = arr[y];
            row = flat(row);
            res.push(row);
        }
        function flat(data: any): any[] {
            let r: any[] = [];
            data.forEach((e: any) => {
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
    }

    public uniquifyCoord(arr: TCoord[]): TCoord[] {
        const seen: {[key: string]: boolean} = {};
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
    }

// ARRAY Funcs end

    public setAllExplored(level: Level): void {
        const map = level.getMap();
        for (let x = 0; x < map.cols; x++) {
            for (let y = 0; y < map.rows; y++) {
                const cell = map._map[x][y];
                cell.setExplored();
            }
        }
    }

    public inSameLevel(ent1, ent2): boolean {
        return ent1.getLevel().getID() === ent2.getLevel().getID();
    }

    /* Returns a game message for cell which cannot be travelled. */
    public getImpassableMsg(actor: any, cell: Cell, str: string) {
        const type = cell.getBaseElem().getType();
        const cellMsg = `cannot venture beyond ${type}`;
        return `${str} ${cellMsg}`;
    }

    public formatLocationName(level: Level): string {
        const feat = level.getParent();
        if (!feat) {return '';}
        switch (feat.getType()) {
            case 'branch': // Fall through
            case 'face': // Fall through
            case 'quarter': {
                const parent = feat.getParent();
                if (parent) {
                    const subName = feat.getName();
                    const zoneName = parent.getName();
                    if (subName === zoneName) {
                        return subName;
                    }
                    // return `${subName} of ${zoneName}`;
                    return `${zoneName}`;
                }
                else {
                    this.err('RG', 'formatLocationName', 'parent is null');
                }
            }
            default: return feat.getName();
        }
    }


    /* Function to check if given action succeeds given it's probability. */
    public isSuccess(prob: number): boolean {
        const rng = Random.getRNG();
        return rng.getUniform() <= prob;
    }

    /* A debug function which prints info about given entity. */
    public ent(whatever: any): null | Entity {
        if ((window as any).PLAYER) {
            const level = (window as any).PLAYER.getLevel();
            if (Number.isInteger(whatever)) {
                const actor = level.getActors().find(a => a.getID() === whatever);
                if (actor) {
                    const name = actor.getName();
                    this.diag(`this.ent: Found ${name} with ID ${whatever}`);
                    this.diag(JSON.stringify(actor));
                    return actor;
                }
                const item = level.getItems().find(i => i.getID() === whatever);
                if (item) {
                    const name = item.getName();
                    this.diag(`RG.ent: Item Found ${name} with ID ${whatever}`);
                    this.diag(JSON.stringify(item));
                    return item;
                }
            }
        }
        return null;
    }

    /* Returns comp with given ID, from given entity. */
    public comp(compID: number, entID = -1): null | ComponentBase {
        let entity = null;
        if (entID >= 0) {
            entity = this.ent(entID);
        }
        if (entity) {
            const comps = entity.getComponents();
            if (comps[compID]) {
                const comp = comps[compID];
                const type = comp.getType();
                console.log(`this.comp: Found ${type} with ID ${compID}`);
                const json = comp.toJSON();
                if (json) {
                    this.diag(JSON.stringify(json));
                }
                else {
                    this.diag('Not serialisable');
                    this.diag(comp);
                }
                return comp;
            }
        }
        return null;
    }

    public while(testFunc: () => boolean, loopBody: () => void, timeout = -1) {
        let numTries = timeout;
        while (testFunc()) {
            loopBody();
            if (--numTries === 0) {
                return false;
            }
        }
        return true;
    }

    // -------------------------------------------------
    // Functions for emitting in-game messages to player
    // -------------------------------------------------

    // Accepts 2 different arguments:
    // 1. A simple string messages
    // 2. {msg: "Your message", cell: Origin cell of messaage}
    // Using 2. messages can be easily filtered by position.
    public gameMsg(msg: GameMsg): void {
        this.emitMsgEvent('prim', msg);
    }

    public gameInfo(msg: GameMsg): void {
        this.emitMsgEvent('info', msg);
    }

    public gameDescr(msg: GameMsg): void {
        this.emitMsgEvent('descr', msg);
    }

    public gameSuccess(msg: GameMsg) {
        this.emitMsgEvent('success', msg);
    }

    public gameWarn(msg: GameMsg) {
        this.emitMsgEvent('warn', msg);
    }

    public gameDanger(msg: GameMsg) {
        this.emitMsgEvent('danger', msg);
    }

    /* To signal an internal error using the "normal" message interface */
    public gameIntError(msg: GameMsg) {
        this.emitMsgEvent('bg-danger text-white', msg);
    }

    /* Emits message event with cell origin, style and message. */
    public emitMsgEvent(style: string, msg: GameMsg): void {
        let newMsg = '';
        if (typeof msg === 'object') {
            const msgObj = msg as GameMsgObject;
            const cell = msgObj.cell;
            newMsg = msgObj.msg;
            newMsg = newMsg[0].toUpperCase() + newMsg.substring(1);

            const msgObject = {cell, msg: newMsg, style};
            this.POOL.emitEvent(this.EVT_MSG, msgObject);
        }
        else {
            newMsg = msg[0].toUpperCase() + msg.substring(1);
            this.POOL.emitEvent(this.EVT_MSG, {msg: newMsg, style});
        }

    }

    /* Destroys item (typically after use). */
    public destroyItemIfNeeded(item: ItemBase): void {
        if (this.isOneShotItem(item)) {
            if (item.getCount() === 1) {
                const msg = {item};
                this.POOL.emitEvent(this.EVT_DESTROY_ITEM, msg);
            }
            else {
                item.decrCount(1);
            }
        }
    }

    //-------------------------
    // Functions for entities
    //-------------------------

    /* Returns the name for given entity. */
    public getEntName(ent: Entity): string {
        if (ent.has('Named')) {
            return ent.get('Named').getFullName();
        }
        return '';
    }

    public getLevel(ent: Entity): Level | null {
        if (ent.has('Location')) {
            return ent.get('Location').getLevel();
        }
        return null;
    }

    public toKey(xy: TCoord | TCoord3D): string {
        let res = xy[0] + ',' + xy[1];
        if (xy.length > 2) {res += ',' + xy[2];}
        return res;
    }

    public fromKey3D(key: string): TCoord3D {
        const arr = key.split(',');
        return [
            parseInt(arr[0], 10), parseInt(arr[1], 10), parseInt(arr[2], 10)
        ];
    }

    public fromKey(key: string): TCoord {
        const arr = key.split(',');
        return [parseInt(arr[0], 10), parseInt(arr[1], 10)];
    }


    public pluralize(name: string): string {
        return name + 's';
    }

}

/* eslint no-unused-vars: 0 */
const RG = new RGClass();

// CSS color names (defined in scss/_colors.scss) are listed here
RG.COLORS = [
    'AliceBlue', 'AntiqueWhite', 'Aqua', 'Aquamarine', 'Azure',
    'Beige', 'Bisque', 'Black', 'BlanchedAlmond', 'Blue', 'BlueViolet', 'Brown',
    'BurlyWood', 'CadetBlue', 'Chartreuse', 'Chocolate', 'Coral', 'CornflowerBlue',
    'Cornsilk', 'Crimson', 'Cyan', 'DarkBlue', 'DarkCyan', 'DarkGoldenRod', 'DarkGray',
    'DarkGrey', 'DarkGreen', 'DarkKhaki', 'DarkMagenta', 'DarkOliveGreen', 'Darkorange',
    'DarkOrchid', 'DarkRed', 'DarkSalmon', 'DarkSeaGreen', 'DarkSlateBlue',
    'DarkSlateGray', 'DarkSlateGrey', 'DarkTurquoise', 'DarkViolet', 'DeepPink',
    'DeepSkyBlue', 'DimGray', 'DimGrey', 'DodgerBlue', 'FireBrick', 'FloralWhite',
    'ForestGreen', 'Fuchsia', 'Gainsboro', 'GhostWhite', 'Gold', 'GoldenRod', 'Gray',
    'Grey', 'Green', 'GreenYellow', 'HoneyDew', 'HotPink', 'IndianRed', 'Indigo', 'Ivory',
    'Khaki', 'Lavender', 'LavenderBlush', 'LawnGreen', 'LemonChiffon', 'LightBlue',
    'LightCoral', 'LightCyan', 'LightGoldenRodYellow', 'LightGray', 'LightGrey',
    'LightGreen', 'LightPink', 'LightSalmon', 'LightSeaGreen', 'LightSkyBlue',
    'LightSlateGray', 'LightSlateGrey', 'LightSteelBlue', 'LightYellow', 'Lime',
    'LimeGreen', 'Linen', 'Magenta', 'Maroon', 'MediumAquaMarine', 'MediumBlue',
    'MediumOrchid', 'MediumPurple', 'MediumSeaGreen', 'MediumSlateBlue',
    'MediumSpringGreen', 'MediumTurquoise', 'MediumVioletRed', 'MidnightBlue',
    'MintCream', 'MistyRose', 'Moccasin', 'NavajoWhite', 'Navy', 'OldLace', 'Olive',
    'OliveDrab', 'Orange', 'OrangeRed', 'Orchid', 'PaleGoldenRod', 'PaleGreen',
    'PaleTurquoise', 'PaleVioletRed', 'PapayaWhip', 'PeachPuff', 'Peru', 'Pink', 'Plum',
    'PowderBlue', 'Purple', 'Red', 'RosyBrown', 'RoyalBlue', 'SaddleBrown', 'Salmon',
    'SandyBrown', 'SeaGreen', 'SeaShell', 'Sienna', 'Silver', 'SkyBlue', 'SlateBlue',
    'SlateGray', 'SlateGrey', 'Snow', 'SpringGreen', 'SteelBlue', 'Tan', 'Teal', 'Thistle',
    'Tomato', 'Turquoise', 'Violet', 'Wheat', 'White', 'WhiteSmoke', 'Yellow', 'YellowGreen',
];
export default RG;

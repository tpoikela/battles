/* Contains definitions for different interfaces.
 * DON'T add any imports from non-interface files. Everything here
 * should contain only primitive values or objects/arrays of them.
 * Use any in case of requiring something else or move the interface to
 * a file containing particular type.
 */

type Cell = import('./map.cell').Cell;
type Level = import('./level').Level;
type ElementStairs = import('./element').ElementStairs;
type ElementBase = import('./element').ElementBase;
type ElementXY = import('./element').ElementXY;
type Entity = import('./entity').Entity;

type ItemBase = import('./item').ItemBase;
type ItemAmmo = import('./item').Ammo;
type ItemMissile = import('./item').Missile;

type BaseActor = import('./actor').BaseActor;
type SentientActor = import('./actor').SentientActor;
type ElemTemplate = import('./template').ElemTemplate;
type WorldBase = import('./world').WorldBase;
type Dice = import('./dice').Dice;
type Parser = import('./objectshellparser').Parser;
type BBox = import('./bbox').BBox;

//---------------------------
// GENERIC type definitions
//---------------------------

export type Maybe<T> = T | null | undefined;

/* tslint:disable-next-line */
export type TNoFuncVal = Exclude<any, Function>;

export interface NoFunctionObject {
    [key: string]: TNoFuncVal;
}

export interface IObjRef {
    $objRef: {
        type: string;
        id: number;
    };
}

export type TObjRefArray = IObjRef[] & {$objRefArray: boolean};

export interface NoFunctionArray extends Array<TNoFuncVal> { }


export interface IColor {
    fg: string;
    bg: string;
}

//-------------------
// Dice definitions
//-------------------

// Can be either '1d6 + 4' or [1, 6, 4] for example
export type IDiceInputArg = number | string | [number, number, number];

export type DiceValue = Dice | IDiceInputArg;

//------------------------------------------------
// CellProps (actors,items,elements) definitions
//------------------------------------------------

export type TCellProp = ItemBase | BaseActor | ElementXY;

export interface CellPropMap<T> {
    actors: T;
    items: T;
    elements: T;
}

export type CellProps = Partial<CellPropMap<TCellProp[]>>;

export type TPropType = keyof CellProps;

export type ConstBaseElem = Readonly<ElementBase>;

//---------------------------
// Generic geometry type definitions
//---------------------------

export type TCoord = [number, number];
export type TCoord3D = [number, number, number];
export interface ICoordMap {[key: string]: any;}

export interface ICoordXY {
    x: number;
    y: number;
    level?: Level;
}

// Used for mapping coords between OW and AreaTile levels
export interface ICoordObj {
    xMap: number;
    yMap: number;
    nSubLevelsX: number;
    nSubLevelsY: number;
    x: number;
    y: number;
    slX: number;
    slY: number;
    aX: number;
    aY: number;
    subX: number;
    subY: number;
    // subLevel: Level;
}

export interface ILocatable {
    getX: () => number;
    getY: () => number;
    getXY: () => TCoord;
    getLevel: () => any; // Add typings
    getCell: () => Cell;
}


export type DestOrSrc = TCoord | ILocatable | Cell;
export type TLocatableElement = ElementBase & ILocatable;

/* Used to pass player input (keys/mouse) to the game */
export interface IPlayerCmdInput {
    callback?: (obj: any) => void;
    code?: number;
    cmd?: string;
    target?: Cell;
    item?: any; // TODO add correct type
    items?: ItemBase[]; // TODO add correct type
    count?: number;
    slot?: string;
    slotNumber?: number;
}
export type CmdInput = IPlayerCmdInput | number;

/* Used in message handler. */
export interface IMessage {
    msg: string;
    style?: string;
    count?: number;
    cell?: Cell;
    // cell?: ICoordXY;
    seen?: boolean;
}

export interface TemplateData {
    tiles?: {
        filler?: string;
        omni?: string[];
        corridor?: string[];
        start?: string[];
        term?: string[];
        corner?: string[];
        misc?: string[];
    };
    templates: {
        all: ElemTemplate[];
        start?: ElemTemplate[];
    };
    Models: {
        default: string[];
    };
    startRoomFunc?: () => void;

}

export interface IBBox {
    ulx: number;
    uly: number;
    lrx: number;
    lry: number;
}

export interface ICellDirMap<T = string> {
    N: T;
    S: T;
    E: T;
    W: T;
    NE: T;
    NW: T;
    SE: T;
    SW: T;
}

export type TCardinalDir = keyof ICellDirMap;

export interface ID2LevelMap {
    [key: number]: Level;
}

export interface Entrance {
    levelNumber: number;
    x: number;
    y: number;
}


export interface RandWeights {
    [key: string]: number;
}

export type LevelConnection = [string, string, number, number];

export interface LevelObj {
    nLevel: number;
    level: Level | LevelSpecStub;
}

export interface LevelSpecStub {
    stub: boolean;
    new: string;
    args: any[];
}

export interface PresetLevelSpec {
    nLevel: number;
    level?: LevelSpecStub;
    levelStub?: LevelSpecStub;
}

export interface StairsSpec {
    getStairs: number;
}

/* Used to connect zones to a connection in AreaTile Level. */
export interface AreaConnection {
    name?: string; // Name of sub-zone to connect
    nLevel?: number; // Level in that sub-zone to connect
    levelX?: number; // Connection x-pos in AreaTile Level
    levelY?: number; // Connection y-pos in AreaTile Level
    stairs?: StairsSpec | ElementStairs; // Existing Stairs to use
}

/* Used in procedural constraints to specify conditions. */
export type IConstraint = {
    op: string;
    value: string | number | boolean | string[] | number[] | boolean[];
    args?: any;
} & (
    | {prop: string; func?: never; comp?: never;}
    | {prop?: never; func: string; comp?: never;}
    | {prop?: never; func?: never; comp: string[];}
);

export interface ICreate {
    name: string;
    num?: number;
    nLevel: number;
}

export interface ConstraintMap {
    actor?: IConstraint[];
    shop?: IConstraint[];
    disposition?: {[key: string]: string};
    // cellsAround?: {[key: string]: string};
    cellsAround?: ICellDirMap;
}

export interface CreateMap {
    actor?: ICreate[];
}

export type TConstraintArg = IConstraint | IConstraint[];

export interface IWorldElemMap {
    [key: number]: WorldBase;
}

export interface GlobalConf {
    levelSize: string;
    dungeonX: number;
    dungeonY: number;
    sqrPerActor: number;
    sqrPerItem: number;
    set: boolean;
}


export interface ActorConf {
    maxDanger: number;
    actorsPerLevel?: number;
    actor?: TShellFunc;
    nActors?: number;
    actors?: BaseActor[];
}

/* Used for procgen of gold items. */
export interface GoldConf {
    maxValue: number;
    gold?: boolean | TShellFunc;
    goldPerLevel?: number;
    nGold?: number;
    nLevel?: number;
}

/* Used for procgen of any items. */
export interface ItemConf extends GoldConf {
    itemsPerLevel?: number;
    nItems?: number;
    item: TShellFunc;
    food?: boolean | TShellFunc;
    typeWeights?: RandWeights;
}

export interface LevelConf {
    maxDanger?: number;
    minValue?: number;
    maxValue?: number;
    maxRarity?: number;

    // TODO remove one of these
    x?: number;
    y?: number;
    cols?: number;
    rows?: number;

    alignment?: string;
    disposition?: {[key: string]: string};
    friendly?: boolean; // All actors are friendly
    actor?: TShellFunc;
    actorsPerLevel?: number;

    roomCount?: number; // In tile-based levels only
    dungeonType?: string;
    levelType?: string;
    wallType?: string;

    food?: boolean | TShellFunc;
    gold?: boolean | TShellFunc;
    item?: TShellFunc;
    itemsPerLevel?: number;
    sqrPerActor?: number;
    sqrPerItem?: number;
    nLevel?: number;
    markersPreserved?: boolean;

    nShops?: number;
    shopType?: string | string[];
    shopFunc?: TShellFunc[];
}

export interface ShopConf {
    parser: Parser;
    nShops: number;
    shopType?: string | string[];
    shopFunc?: TShellFunc[];
}


export type AmmoOrMissile = ItemMissile | ItemAmmo;

//-------------------------------------------------------------
// Interfaces used in actor classes to specify starting items
//-------------------------------------------------------------

export interface ItemConstr {
    name?: string;
    count?: number;
    func?: (item: IShell) => boolean;
}

export interface ItemConstrMap {
    [key: string]: ItemConstr[];
}

export interface IActorMods {
    description?: string;
    stats: {[key: string]: number};
    player: {
        startingItems?: ItemConstr[];
        equipment?: ItemConstr[];
        Adventurer?: any;
        Blademaster?: any;
        Cryomancer?: any;
        Spellsinger?: any;
        Marksman?: any;
    };
}

//-------------------------------------------------------------
// Interfaces in world generation
//-------------------------------------------------------------

export interface ZoneConf {
    addComp?: {[key: string]: any};
    connectLevels?: LevelConnection[];
    connectToAreaXY?: AreaConnection[];
    constraint?: ConstraintMap;
    connectEdges?: boolean; // Used to create connections to all edges of levels
    components?: object[];
    entrance?: string; // Name of entrance SubZone
    hasUniques?: boolean; // Set to true if zone has unique actors
    groupType?: string;
    friendly?: boolean;
    isEpic?: boolean; // Set to true for epic places
    levelX?: number; // Position inside AreaTile level
    levelY?: number; // Position inside AreaTile level

    maxDanger: number;
    maxValue?: number;
    maxRarity: number;

    name: string;
    owX?: number; // Position in OWMap
    owY?: number; // Position in OWMap
    presetLevels?: {[key: string]: PresetLevelSpec[]};
    uniqueName?: string;
    sqrPerActor?: number;
    sqrPerItem?: number;
    x?: number; // Position in area (tile x)
    y?: number; // Position in area (tile y)
    tags?: string[]; // Any extra data for proc generation
}

export interface SubZoneConf {
    name: string;
    nLevels: number;
    entranceLevel?: number;
    entrance?: Entrance;
    constraint?: ConstraintMap;
    maxDanger: number;
    maxValue?: number;
    createPresetLevels?: LevelSpecStub;
    create?: CreateMap;
}

export interface BranchConf extends SubZoneConf {
    [key: string]: any;
}

export interface SummitConf extends SubZoneConf {
    [key: string]: any;
}

export interface DungeonConf extends ZoneConf {
    branch: BranchConf[];
    nBranches: number;

    dungeonType?: string; // Used to select flavor during proc gen
    dungeonX?: number;
    dungeonY?: number;
}

export interface QuarterConf extends SubZoneConf {
    [key: string]: any;
}

export interface CityConf extends ZoneConf {
    nQuarters: number;
    alignment?: string;
    quarter: QuarterConf[];
}

export interface FaceConf extends SubZoneConf {
    [key: string]: any;
}

export interface MountainConf extends ZoneConf {
    face: FaceConf[];
    nFaces: number;

    // Summits are optional for mountains
    nSummits?: number;
    summit?: SummitConf[];
}

export interface AreaConf {
    maxX: number; // Number of area tiles in x-dir
    maxY: number; // Number of area tiles in y-dir
    name: string;
    cols: number; // Cols per each area tile level
    rows: number; // Rows per each area tile level

    city: CityConf[];
    dungeon: DungeonConf[];
    mountain: MountainConf[];
    nCities?: number;
    nDungeons?: number;
    nMountains?: number;
    presetLevels?: {[key: string]: Level[][]};
    zonesCreated?: boolean;
    biome?: {[key: string]: string};
}

export interface PlayerStart {
    place: string;
    x: number;
    y: number;
}

export interface WorldConf {
    area: AreaConf[];
    nAreas: number;
    name: string;

    createAllZones?: boolean; // If true, creates everything at once
    playerStart?: PlayerStart;
}

/* Used a first step conf for overworld OWMap generation. */
export interface OWMapConf {
    yFirst?: boolean;
    topToBottom?: boolean;
    printResult?: boolean;
    owTilesX?: number;
    owTilesY?: number;
    nHWalls?: number[];
    nVWalls?: number[];
    nLevelsX?: number;
    nLevelsY?: number;
    playerX?: number;
    playerY?: number;
    playerRace?: string;
    createTerritory?: boolean;
    nDungeonsSouth?: number;
    nDungeonsNorth?: number;
    nDungeonsCenter?: number;
    nMountainsNorth?: number;
    nMountainsMiddle?: number;
    nMountainsSouth?: number;
    nCitySouth?: number;
    nCityCenter?: number;
    nCityNorth?: number;
    verify?: boolean;
}

/* Used as a 2nd step conf for overworld Level generation. */
export interface OWLevelConf extends OWMapConf {
    worldX?:  number;
    worldY?:  number;
    nTilesX?: number;
    nTilesY?: number;
    addMainRoads?: boolean;
}

export interface IFactoryGameConf {
    seed?: number;
    sqrPerItem: number;
    sqrPerActor: number;
    playMode: string;
    playerLevel: string;
    playerName: string;
    playerRace: string;
    owMultiplier?: number;
    xMult?: number;
    yMult?: number;
    owConf?: OWMapConf;
}

//-----------------------------------------------
// enums for loading/storing game state to disk
//-----------------------------------------------

export enum LoadStat {
    EMPTY = 'EMPTY',
    LOADED = 'LOADED',
    JSON = 'JSON',
    ON_DISK = 'ON_DISK',

    // Transition states for debugging
    JSON2LOADED = 'JSON2LOADED',
    LOADED2JSON = 'LOADED2JSON',
    JSON2ON_DISK = 'JSON2ON_DISK',
    ON_DISK2JSON = 'ON_DISK2JSON'
}

export enum CreateStat {
    EMPTY = 'EMPTY',
    CREATED = 'CREATED',
    POPULATED = 'POPULATED'
}

//--------------------------------
// ITEM/ACTOR GENERATION, SHELLS
//--------------------------------

export interface IShell {
    // [key: string]: TNoFuncVal;
    [key: string]: any;
}

export interface ShellConstr {
    roleTypes?: string[];
    roles?: string[];
    rank?: string;
    race?: string;
    maxDanger?: number;
}

export interface StringMap<T> {
    [key: string]: T;
}

export type TShellFunc = (shell: IShell) => boolean;

// Allow val: {$$dice: '1d6} and val: {$$select: [1, 2, {$$dice: '1d6'}} in
// shell values
export interface DiceObj {
    $$dice: string;
}


export type ValOrDice<T> = T | DiceObj;

export interface SelectObj<T> {
    $$select: ValOrDice<T>[];
};

export type TShellValue<T> = T | SelectObj<T>;

//-------------
// COMPONENTS
//-------------

export interface ICompSetterObj {
    setter: string;
    value: TNoFuncVal;
}

export interface ICompSetterMap {
    [key: string]: TNoFuncVal;
}

export interface IAddCompObj {
    // These 3 are mutex, choose one to use
    addComp?: string;
    comp?: string;
    transientComp?: string; // Defers comp creation until needed

    anim?: IAnimArgs;
    applyToAllTargets?: boolean;
    area?: string;
    duration?: number | string;
    expireMsg?: string;
    func?: ICompSetterObj[] | ICompSetterMap;
    useOld?: boolean; // Uses existing component (if any) for calling the funcs
}

type AddCompType = string | IAddCompObj;

export type TAddCompSpec = AddCompType[];

//------------------
// Lore interfaces
//------------------

export interface ILoreOpt {
    xy?: TCoord;
    name?: string;
}

export type TLoreMsg = ILoreOpt | string | string[];

export interface ILoreEntry {
    topic: string;
    askMsg?: TLoreMsg;
    respMsg?: TLoreMsg;
    names?: string[];
    ids?: number[];
    revealNames?: string[];
    revealIds?: number[];
    cmd?: string;
}

//------------------------------
// Some types defined for JSON
//------------------------------

export type AnyJson =  boolean | number | string | null | JsonArray | JsonMap;
export interface JsonMap {  [key: string]: AnyJson; }
type JsonArray = AnyJson[];

//----------------------------
// Actor needs and schedules
//----------------------------

/* Passed as props to Evaluator object. */
export interface IEvaluatorArgs {
    isOneShot?: boolean;
    ammoType?: string;
    xy?: TCoord;
}

export type EvaluatorTuple = [string, number, IEvaluatorArgs?];


export type INeedEntry = {
    last?: boolean;
    only?: boolean;
    // constr: IConstraint;
    // func?: (args: any) => boolean;
    // script?: (actor: SentientActor, timeOfDay: number) => EvaluatorTuple[];
    evalName: string;
    bias: number;
} & (
    | {
        constr: IConstraint;
        func?: (args: any) => boolean;
        script?: never;
    }
    | {
        constr?: never;
        func?: never;
        script: (actor: SentientActor, timeOfDay: number) => EvaluatorTuple[];
    }
)

/* Defines one schedule entry between two different times. */
export interface ISchedEntry {
    from: number;
    to: number;
    in?: {bbox: BBox, levelID: number};
    needs: INeedEntry[];
};

//----------------------
// Quest-related items
//----------------------

export interface IQuestTarget {
    isCompleted: boolean;
    name: string;
    id: number;
    subQuestID: number;
    targetType: string;
}


//------------------------------------
// Map generation related interfaces
//------------------------------------

export interface IMiner {
    x: number;
    y: number;
    dirWeights: {[key: string]: number};
    dugCallback?: (x: number, y: number, miner: IMiner) => void;
}

//-----------------------------
// Terrain-related interfaces
//-----------------------------

export interface IPenaltyObj {
    value: number;
    srcComp: string;
    srcFunc: string;
    targetComp: string;
    targetFunc: string;
    dontApplyTo?: string[];
}


export interface IRecipeEntry {
    count: number;
    name: string;
}

export interface IRecipe {
    inputs: IRecipeEntry[];
    outputs: IRecipeEntry[];
}

export interface ISuccessQuery {
    has?: string;
    hasAll?: string[];
    hasNot?: string;
    hasNone?: string[];
}

export interface ISuccessCheck {
    items?: ISuccessQuery;
    actors?: ISuccessQuery;
    elements?: ISuccessQuery;
}

//-------------------------------------
// Used in Effects and system.effects
//-------------------------------------

export interface IAddEntity {
    entityName: string;
    count?: number;
    duration?: number | string;
}

export interface IRemoveEntity {
    target: string;
}

interface TargetObj {
    target: any;
}

interface Setters {
    [key: string]: any;
}

export interface IAnimArgs {
    cX?: number;
    cY?: number;
    cell?: boolean;
    className?: string;
    coord?: TCoord[];
    dir?: TCoord;
    from?: TCoord;
    level?: Level;
    range?: number;
    ray?: boolean;
}

export interface IEffArgs {
    addOnUser?: boolean; // Adds to the user
    all?: boolean;
    anim?: IAnimArgs;
    applyToAllTargets?: boolean; // If given, all targets are affected
    area?: string;
    duration?: number | string;
    effectSource?: any;
    effectType: string;
    entityName?: string;
    expireMsg?: string;
    level?: Level; // Optional level, if src entity already removed
    name?: string;
    setters?: Setters;
    target: TargetObj | Entity | string;
    targetType: string[];
}

export interface IEntCallbackObj {
    addComp?: TAddCompSpec;
    removeComp?: any[];
    removeEntity?: IRemoveEntity;
    addEntity?: IAddEntity;
    triggerCb?: string;
}

export interface IEntCallbacks {
    [key: string]: IEntCallbackObj;
}

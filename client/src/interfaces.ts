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
type ItemBase = import('./item').ItemBase;
type BaseActor = import('./actor').BaseActor;
type Locatable = import('./mixin').Locatable;
type ElemTemplate = import('./template').ElemTemplate;
type WorldBase = import('./world').WorldBase;
type Dice = import('./dice').Dice;

//---------------------------
// GENERIC type definitions
//---------------------------

export type Maybe<T> = T | null | undefined;

export type TNoFuncVal =
    boolean
    | string
    | number
    | null
    | undefined
    | NoFunctionObject
    | NoFunctionArray;

export interface NoFunctionObject {
    [key: string]: TNoFuncVal;
}

export interface NoFunctionArray extends Array<TNoFuncVal> { }

//---------------------------
// Generic geometry type definitions
//---------------------------
//
export interface IColor {
    fg: string;
    bg: string;
}

// Can be either '1d6 + 4' or [1, 6, 4] for example
export type IDiceInputArg = number | string | [number, number, number];

export type DiceValue = Dice | IDiceInputArg;

export type TCellProp = ItemBase | BaseActor | ElementXY;

export type ConstBaseElem = Readonly<ElementBase>;

export type TPrim = number | string | boolean;
export type TPrimArr = TPrim[];

export type TCoord = [number, number];
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
    subLevel: Level;
}

export type DestOrSrc = TCoord | Locatable;
export type TLocatableElement = ElementBase & Locatable;

/* Used to pass player input (keys/mouse) to the game */
export interface IPlayerCmdInput {
    code?: number;
    cmd?: string;
    target?: Cell;
    item?: any; // TODO add correct type
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

export interface ICellDirMap {
    N: string;
    S: string;
    E: string;
    W: string;
    NE: string;
    NW: string;
    SE: string;
    SW: string;
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

export interface SubZoneConf {
    name: string;
    nLevels: number;
    entranceLevel?: number;
    entrance?: Entrance;
    constraint?: ConstraintMap;
}

export interface RandWeights {
    [key: string]: number;
}

export type LevelConnection = [string, string, number, number];

export interface LevelObj {
    nLevel: number;
    level: Level;
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
export interface IConstraint {
    op: string;
    prop?: string;
    func?: string;
    comp?: string[];
    value: any;
    args?: any;
}

export interface ConstraintMap {
    actor?: IConstraint[];
    shop?: IConstraint[];
    disposition?: any;
    cellsAround?: {[key: string]: string};
}

export type TConstraintArg = IConstraint | IConstraint[];

export interface IWorldElemMap {
    [key: number]: WorldBase;
}

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
    maxDanger?: number;
    name: string;
    owX?: number; // Position in OWMap
    owY?: number; // Position in OWMap
    presetLevels?: {[key: string]: PresetLevelSpec[]};
    uniqueName?: string;
    sqrPerActor?: number;
    sqrPerItem?: number;
    x?: number; // Position in area (tile x)
    y?: number; // Position in area (tile y)
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

    city?: CityConf[];
    dungeon?: DungeonConf[];
    mountain?: MountainConf[];
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
}

export interface StringMap<T> {
    [key: string]: T;
}

export type TShellFunc = (shell: IShell) => boolean;

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
    comp?: string;
    transientComp?: string; // Defers comp creation until needed
    addComp?: string;
    expireMsg?: string;

    func?: ICompSetterObj[] | ICompSetterMap;
    duration?: number | string;
}

type AddCompType = string | IAddCompObj;

export type TAddCompSpec = AddCompType[];

//------------------
// Lore interfaces
//------------------

export interface ILoreData {
    topics: ILoreTopics;
}

export interface ILoreTopics {
    quests: any;
    places: any;
    shops: any;
    people: any;
    world: any;
}

export interface ILoreOpt {
    xy?: TCoord;
    name?: string;
}

//------------------------------
// Some types defined for JSON
//------------------------------

export type AnyJson =  boolean | number | string | null | JsonArray | JsonMap;
export interface JsonMap {  [key: string]: AnyJson; }
export interface JsonArray extends Array<AnyJson> {}

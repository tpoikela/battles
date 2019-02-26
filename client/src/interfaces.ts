/* Contains definitions for different interfaces.
 * DON'T add any imports from non-interface files. Everything here
 * should contain only primitive values or objects/arrays of them.
 * Use any in case of requiring something else or move the interface to
 * a file containing particular type.
 */

type Cell = import('./map.cell').Cell;
type Level = import('./level').Level;
type ElementStairs = import('./element').ElementStairs;

export type TCoord = [number, number];

export interface ICoordXY {
    x: number;
    y: number;
    level?: Level;
}

/* Defines a bounding box of coordinates. */
export interface BBox {
    ulx: number;
    uly: number;
    lrx: number;
    lry: number;
}

/* Used to pass player input (keys/mouse) to the game */
export interface PlayerCmdInput {
    code?: number;
    cmd?: string;
    target?: Cell;
    item?: any; // TODO add correct type
    count?: number;
}
export type CmdInput = PlayerCmdInput | number;

export interface SubZoneConf {
    name: string;
    nLevels: number;
    entranceLevel?: number;
    constraint?: ConstraintMap;
}

export type LevelConnection = [string, string, number, number];

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
    prop: string;
    value: any;
}

export interface ConstraintMap {
    actor?: IConstraint;
}

export interface ZoneConf {
    connectLevels?: LevelConnection[];
    connectToAreaXY?: AreaConnection[];
    constraint?: ConstraintMap;
    connectEdges?: boolean; // Used to create connections to all edges of levels
    entrance?: string; // Name of entrance SubZone
    levelX?: number; // Position inside AreaTile level
    levelY?: number; // Position inside AreaTile level
    maxDanger?: number;
    name: string;
    owX?: number; // Position in OWMap
    owY?: number; // Position in OWMap
    presetLevels?: {[key: string]: PresetLevelSpec[]};
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
    maxX: number;
    maxY: number;
    name: string;

    city?: CityConf[];
    dungeon?: DungeonConf[];
    mountain?: MountainConf[];
    nCities?: number;
    nDungeons?: number;
    nMountains?: number;
    presetLevels?: {[key: string]: Level[][]};
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
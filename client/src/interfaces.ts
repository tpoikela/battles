/* Contains definitions for different interfaces.
 * DON'T add any imports from non-interface files. Everything here
 * should contain only primitive values or objects/arrays of them.
 * Use any in case of requiring something else or move the interface to
 * a file containing particular type.
 */

type Level = import('./level').Level;

export type TCoord = [number, number];

export type ICoordXY = {
    x: number;
    y: number;
    level?: Level;
};

export interface SubZoneConf {
    name: string;
    nLevels: number;
    entranceLevel?: number;
    constraint?: ConstraintMap;
}


export interface LevelSpecStub {
    stub: boolean;
    new: string;
    args: any[];
}

export interface PresetLevelSpec {
    nLevel: number;
    level: LevelSpecStub;
}

export interface StairsSpec {
    getStairs: number;
}

export interface AreaConnection {
    stairs: StairsSpec;
}

export interface IConstraint {
    op: string;
    prop: string;
    value: any;
}

export interface ConstraintMap {
    actor?: IConstraint;
}

export interface ZoneConf {
    name: string;
    x?: number; // Size of the level in x (cols)
    y?: number; // Size of the level in y (rows)
    connectLevels?: any[];
    owX?: number; // Position in OWMap
    owY?: number; // Position in OWMap
    levelX?: number; // Position inside Area level
    levelY?: number; // Position inside Area level
    presetLevels?: {[key: string]: PresetLevelSpec[]};
    connectToAreaXY?: AreaConnection[];
    constraint?: ConstraintMap;
}

export interface BranchConf extends SubZoneConf {
    [key: string]: any;
}

export interface DungeonConf extends ZoneConf {
    nBranches: number;
    branch: BranchConf[];
    dungeonX?: number;
    dungeonY?: number;
    dungeonType?: string;
};

export interface QuarterConf extends SubZoneConf {
    [key: string]: any;
}

export interface CityConf extends ZoneConf {
    nQuarters: number;
    quarter: QuarterConf[];
};

export interface FaceConf extends SubZoneConf {
    [key: string]: any;
}

export interface MountainConf extends ZoneConf {
    nFaces: number;
    face: FaceConf[];
};

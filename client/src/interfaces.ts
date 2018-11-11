/* Contains definitions for different interfaces.
 * TO be refactored later.
 */

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

export interface Constraint {
    op: string;
    prop: string;
    value: any;
}

export interface ConstraintMap {
    actor?: Constraint;
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

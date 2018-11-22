/*
 * Contains objects related to the game world in Battles. This includes areas,
 * dungeons, dungeon branches etc.
 */

import dbg = require('debug');
const debug = dbg('bitn:world');

import RG from './rg';
import * as Element from './element';
import {GameObject} from './game-object';
import {EventPool} from './eventpool';
import {Random} from './random';
import {Level} from './level';
import {Cell} from './map.cell';
import {SentientActor} from './actor';
import {FactoryLevel} from './factory.level';
import * as Component from './component';
import {TCoord} from './interfaces';

const POOL: EventPool = EventPool.getPool();

type Stairs = Element.ElementStairs;
const ElementStairs = Element.ElementStairs;

export const World: any = {};

type SubZoneArg = SubZoneBase | string;
export type SubZoneConn = [SubZoneArg, SubZoneArg, number, number];

interface Entrance {
    levelNumber: number;
    x: number;
    y: number;
}

export interface AreaTileJSON {
    level: number;
    [key: string]: any;
    isJSON: boolean;
}

export type AreaTileObj = AreaTile | AreaTileJSON;

const RNG = Random.getRNG();

const oppositeEdge = {
    east: 'west',
    north: 'south',
    south: 'north',
    west: 'east'
};

function removeExistingConnection(level, x, y) {
    const cell = level.getMap().getCell(x, y);
    if (cell.hasConnection()) {
        const conn = cell.getConnection();
        debug(`world.js Removing conn@${x},${y}`);
        level.removeElement(conn, x, y);
    }
}

/* Adds exits (ie passages/stairs) to the given edge (or any edge) of the level.
 * Returns an array of created connections. */
export const addExitsToEdge = (
    level, exitType = 'passage', edge = 'any', overwrite = false): Stairs[] => {
    // level, exitType = 'passage', edge = 'any', overwrite = false) => {
    const map = level.getMap();
    const cols = map.cols;
    const rows = map.rows;
    const exitsAdded = [];
    for (let row = 1; row < rows - 1; row++) {
        if (edge === 'any' || edge === 'west') {
            if (map.isPassable(0, row) || overwrite) {
                const exitWest = new ElementStairs(exitType, level);
                removeExistingConnection(level, 0, row);
                if (!overwrite) {level.addElement(exitWest, 0, row);}
                else {level.addStairs(exitWest, 0, row);}
                exitsAdded.push(exitWest);
            }
        }
        if (edge === 'any' || edge === 'east') {
            if (map.isPassable(cols - 1, row) || overwrite) {
                const exitEast = new ElementStairs(exitType, level);
                removeExistingConnection(level, cols - 1, row);
                if (!overwrite) {level.addElement(exitEast, cols - 1, row);}
                else {level.addStairs(exitEast, cols - 1, row);}
                exitsAdded.push(exitEast);
            }
        }
    }
    for (let col = 1; col < cols - 1; col++) {
        if (edge === 'any' || edge === 'north') {
            if (map.isPassable(col, 0) || overwrite) {
                const exitNorth = new ElementStairs(exitType, level);
                removeExistingConnection(level, col, 0);
                if (!overwrite) {level.addElement(exitNorth, col, 0);}
                else {level.addStairs(exitNorth, col, 0);}
                exitsAdded.push(exitNorth);
            }
        }
        if (edge === 'any' || edge === 'south') {
            if (map.isPassable(col, rows - 1) || overwrite) {
                const exitSouth = new ElementStairs(exitType, level);
                removeExistingConnection(level, col, rows - 1);
                if (!overwrite) {level.addElement(exitSouth, col, rows - 1);}
                else {level.addStairs(exitSouth, col, rows - 1);}
                exitsAdded.push(exitSouth);
            }
        }
    }
    return exitsAdded;
};

/* Returns true if given level edge has any connections. If edge=any, then
 * checks all edges. */
export const edgeHasConnections = (level, edge) => {
    const map = level.getMap();
    const cols = map.cols;
    const rows = map.rows;
    for (let row = 1; row < rows - 1; row++) {
        if (edge === 'any' || edge === 'west') {
            if (map.getCell(0, row).hasConnection()) {
                return true;
            }
        }
        if (edge === 'any' || edge === 'east') {
            if (map.getCell(cols - 1, row).hasConnection()) {
                return true;
            }
        }
    }
    for (let col = 1; col < cols - 1; col++) {
        if (edge === 'any' || edge === 'north') {
            if (map.getCell(col, 0).hasConnection()) {
                return true;
            }
        }
        if (edge === 'any' || edge === 'south') {
            if (map.getCell(col, rows - 1).hasConnection()) {
                return true;
            }
        }
    }
    return false;
};

/* Returns stairs leading to other zones. Used only for testing
* purposes. */
function getStairsOther(name, levels): Stairs[] {
    const stairs = [];
    levels.forEach(level => {
        const sList = level.getStairs();
        sList.forEach(s => {
            const levelStair = s.getTargetLevel();
            if (levelStair) {
                if (levelStair.getParent() !== name) {
                    stairs.push(s);
                }
            }
        });
    });
    return stairs;
}

/* Finds a level from a named zone such as city quarter, dungeon branch or
 * mountain face. */
function findLevel(name, zones, nLevel) {
    const zone = zones.find(z => {
        return z.getName() === name;
    });
    if (zone) {
        const levels = zone.getLevels();
        if (levels.length > nLevel) {
            return levels[nLevel];
        }
        else {
            const msg = `Name: ${name}`;
            RG.err('world.js', 'findLevel',
                `${msg} nLev ${nLevel} out of bounds (${levels.length - 1})`);
        }
    }
    // If level null, issue warning
    return null;
}

function findSubZone(name, subZones) {
    const subZone = subZones.find(sz => (
        sz.getName() === name
    ));
    return subZone;
}

/* Returns a random free cell with any existing connections to avoid
 * piling up two connections. */
function getFreeCellWithoutConnection(level) {
    let stairCell = level.getFreeRandCell();
    while (stairCell.hasConnection()) {
        stairCell = level.getFreeRandCell();
    }
    return stairCell;
}

/* Does linear connection of levels to given direction. */
function connectLevelsLinear(levels) {
    const nLevels = levels.length;
    const arrStairsDown = [];
    const arrStairsUp = [];


    for (let nl = 0; nl < nLevels; nl++) {
        const src = levels[nl];

        let extrasSrc = null;
        if (src.hasExtras()) {extrasSrc = src.getExtras();}

        // Create stairs down
        if (nl < nLevels - 1) {
            const targetDown = levels[nl + 1];

            const stairsDown = new ElementStairs('stairsDown', src, targetDown);
            const stairCell = getFreeCellWithoutConnection(src);
            let [sX, sY] = [stairCell.getX(), stairCell.getY()];
            if (extrasSrc) {
                if (extrasSrc.endPoint) {
                    [sX, sY] = extrasSrc.endPoint;
                }
            }

            src.addStairs(stairsDown, sX, sY);
            arrStairsDown.push(stairsDown);
        }

        // Create stairs up
        if (nl > 0) {
            const targetUp = levels[nl - 1];
            const stairsUp = new ElementStairs('stairsUp', src, targetUp);

            const stairCell = getFreeCellWithoutConnection(src);
            let [sX, sY] = [stairCell.getX(), stairCell.getY()];
            if (extrasSrc) {
                if (extrasSrc.startPoint) {
                    [sX, sY] = extrasSrc.startPoint;
                }
            }

            src.addStairs(stairsUp, sX, sY);
            arrStairsUp.push(stairsUp);
        }
    }

    // Finally connect the stairs together
    for (let nl = 0; nl < nLevels; nl++) {
        if (nl < nLevels - 1) {
            arrStairsDown[nl].connect(arrStairsUp[nl]);
        }
    }
}
World.connectLevelsLinear = connectLevelsLinear;

/* Can be used to connect two levels and constraining the placement of the
 * connections with the level. */
function connectLevelsConstrained(conf1, conf2) {
    const level1 = conf1.level;
    const level2 = conf2.level;
    let x1 = Math.floor(level1.getMap().cols / 2);
    let y1 = conf1.y();

    // Iterate until we find cell without connection close to top of the
    // level
    const map1 = level1.getMap();
    let cell1 = map1.getCell(x1, y1);
    while (cell1.hasConnection()) {
        x1 += 1;
        if (x1 === map1.cols) {
            x1 = 0;
            if (y1 > 0) {--y1;}
        }
        cell1 = map1.getCell(x1, y1);
    }

    const cell2 = getFreeCellWithoutConnection(level2);
    const [x2, y2] = [cell2.getX(), cell2.getY()];

    const l1Stairs = new ElementStairs('stairsUp', level1, level2);
    const l2Stairs = new ElementStairs('stairsDown', level2, level1);
    l1Stairs.connect(l2Stairs);
    level1.addStairs(l1Stairs, x1, y1);
    level2.addStairs(l2Stairs, x2, y2);
}

/* Tries to connect stairs to level N in the given list of levels. This creates
 * a new connection element into the target level. */
function connectLevelToStairs(levels, nLevel, stairs) {
    if (nLevel < levels.length) {
        const level = levels[nLevel];
        const otherQuartLevel = stairs.getSrcLevel();

        if (!RG.isNullOrUndef([otherQuartLevel])) {
            const down = !stairs.isDown();
            const name = down ? 'stairsDown' : 'stairsUp';
            const newStairs = new ElementStairs(name,
                level, otherQuartLevel);

            const cell = getFreeCellWithoutConnection(level);
            level.addStairs(newStairs, cell.getX(), cell.getY());
            newStairs.connect(stairs);
            return true;
        }
    }
    else {
        RG.err('world.js', 'connectLevelToStairs',
            `nLevel: ${nLevel} out of bounds (${levels.length})`);

    }
    return false;
}

function getSubZoneArgs(subZones, sz1Arg, sz2Arg): [SubZoneBase, SubZoneBase] {
    let sz1 = sz1Arg;
    let sz2 = sz2Arg;

    // Lookup objects by name if they are string
    if (typeof sz1Arg === 'string' && typeof sz2Arg === 'string') {
        sz1 = subZones.find(sz => sz.getName() === sz1Arg);
        sz2 = subZones.find(sz => sz.getName() === sz2Arg);
    }
    return [sz1, sz2];
}

/* Connects 2 sub-zones like dungeon branch or city quarter together.*/
function connectSubZones(subZones: SubZoneBase[], sz1Arg, sz2Arg, l1, l2) {
    if (RG.isNullOrUndef([l1, l2])) {
        RG.err('World', 'connectSubZones',
            `l1 (${l1}) and l2 (${l2}) must be non-null and integers.`);
    }
    const [sz1, sz2] = getSubZoneArgs(subZones, sz1Arg, sz2Arg);

    if (RG.isNullOrUndef([sz1, sz2])) {
        RG.err('World', 'connectSubZones',
            'Cannot connect null subZones. Check the names/refs.');
    }

    let s2IsDown = true;
    if (l1 > l2) {s2IsDown = false;}
    const name = s2IsDown ? 'stairsDown' : 'stairsUp';
    const b2Stairs = new ElementStairs(name);
    const sz2Levels = sz2.getLevels();
    if (l2 < sz2Levels.length) {
        const cell = getFreeCellWithoutConnection(sz2Levels[l2]);
        sz2Levels[l2].addStairs(b2Stairs, cell.getX(), cell.getY());
        b2Stairs.setSrcLevel(sz2Levels[l2]);
        sz1.connectLevelToStairs(l1, b2Stairs);
    }
    else {
        RG.err('World', 'connectSubZones',
            'Level ' + l2 + ' doesn\'t exist in sub-zone ' + sz2.getName());
    }

}

/* Connects a random (unconnected) edge of two levels together. */
function connectSubZoneEdges(subZones, sz1Arg, sz2Arg, l1, l2): boolean {
    const edge1 = RNG.arrayGetRand(['north', 'south', 'east', 'west']);
    const edge2 = oppositeEdge[edge1];
    const [sz1, sz2] = getSubZoneArgs(subZones, sz1Arg, sz2Arg);

    const sz1Level = sz1.getLevel(l1);
    const sz2Level = sz2.getLevel(l2);

    /* sz1Level.getMap().debugPrintInASCII();
    sz2Level.getMap().debugPrintInASCII();*/

    const newExits1: Stairs[] = addExitsToEdge(sz1Level, 'exit', edge1, true);
    const newExits2: Stairs[] = addExitsToEdge(sz2Level, 'exit', edge2, true);

    /* sz1Level.getMap().debugPrintInASCII();
    sz2Level.getMap().debugPrintInASCII();*/

    if (newExits1.length === 0 || newExits2.length === 0) {
        return false;
    }

    const conn1 = newExits1;
    const conn2 = newExits2;

    const conn1Len = conn1.length;
    const conn2Len = conn2.length;
    const maxLen = conn1Len <= conn2Len ? conn1Len : conn2Len;

    for (let i = 0; i < maxLen; i++) {
        conn1[i].connect(conn2[i]);
    }
    return true;
}

function getEntrance(levels, entrance): Stairs {
    if (entrance === null) {return null;}
    const {x, y} = entrance;
    const entrLevel = levels[entrance.levelNumber];
    const entrCell = entrLevel.getMap().getCell(x, y);
    return entrCell.getStairs();
}

/* Connects given array of area tiles together. */
function connectTiles(tiles, sizeX, sizeY): void {
    if (sizeX === 1 || sizeY === 1) {
        RG.err('world.js', 'connectTiles',
            'sizeX or sizeY == 1 not implemented.');
    }
    for (let x = 0; x < sizeX; x++) {
        for (let y = 0; y < sizeY; y++) {
            debug(`Trying to connect tile ${x},${y} now`);
            if (x < sizeX - 1 && y < sizeY - 1) {
                debug(`>> Connecting tile ${x},${y} now`);
                tiles[x][y].connect(
                    tiles[x + 1][y], tiles[x][y + 1]);
            }
            else if (x < sizeX - 1) {
                debug(`>> Connecting tile ${x},${y} now`);
                tiles[x][y].connect(tiles[x + 1][y], null);
            }
            else if (y < sizeY - 1) {
                debug(`>> Connecting tile ${x},${y} now`);
                tiles[x][y].connect(null, tiles[x][y + 1]);
            }
        }
    }
}


World.addExitsToEdge = addExitsToEdge;
World.edgeHasConnections = edgeHasConnections;

//----------------
// WorldBase
//----------------

/* Base class for world places. Each place has name and type + full hierarchical
* name to trace where the place is in hierarchy. */
export class WorldBase extends GameObject {

    public name: string;
    public hierName: string;
    public type: string;
    public parent: WorldBase | null;

    constructor(name) {
        super();
        this.name = name;
        this.type = 'base';
        this.parent = null;
    }

    public getName() {
        return this.name;
    }

    public getHierName() {
        return this.hierName;
    }

    public setHierName(hierName) {
        this.hierName = hierName;
    }

    public getType() {
        return this.type;
    }

    public setType(type: string) {
        this.type = type;
    }

    public getParent(): WorldBase {
        return this.parent;
    }

    public setParent(parent: WorldBase) {
        this.parent = parent;
    }

    public toJSON() {
        const obj: any = { // TODO fix typings
            hierName: this.hierName,
            id: this.getID(),
            name: this.name,
            type: this.type
        };
        if (this.parent) {
            obj.parent = this.parent.getID();
        }
        return obj;
    }
}

World.Base = WorldBase;

//---------------------
// ZoneBase
//---------------------

export class ZoneBase extends WorldBase {
    public tileX: number;
    public tileY: number;
    protected _subZones: SubZoneBase[];

    constructor(name) {
        super(name);
        this._subZones = [];
    }

    public getSubZoneArgs(s1Arg, s2Arg) {
        return getSubZoneArgs(this._subZones, s1Arg, s2Arg);
    }

    public setTileXY(x, y): void {
        this.tileX = x;
        this.tileY = y;
    }

    public getTileXY(): TCoord {
        return [this.tileX, this.tileY];
    }

    public addSubZone(subZone: SubZoneBase): boolean {
        if (subZone.getID() === this.getID()) {
            RG.err('ZoneBase', 'addSubZone',
                'Tried to add itself as sub zone: ' + this.getName());
        }
        if (!RG.isNullOrUndef([subZone])) {
            subZone.setParent(this);
            this._subZones.push(subZone);
            return true;
        }
        return false;
    }

    public hasSubZone(subZone: SubZoneBase): boolean {
        const index = this._subZones.indexOf(subZone);
        return index >= 0;
    }

    public getLevels(): Level[] {
        let res = [];
        this._subZones.forEach(subFeat => {
            res = res.concat(subFeat.getLevels());
        });
        return res;
    }

    public connectSubZones(s1Arg, s2Arg, l1, l2): void {
        connectSubZones(this._subZones, s1Arg, s2Arg, l1, l2);
    }

    public findLevel(name: string, nLevel: number): Level {
        const level = findLevel(name, this._subZones, nLevel);
        return level;
    }

    public findSubZone(name) {
        const subZone = findSubZone(name, this._subZones);
        return subZone;
    }

    /* Returns each entrance in each subzone. */
    public getEntrances() {
        const entrances = [];
        this._subZones.forEach(sz => {
            const szEntr = sz.getEntrance();
            if (szEntr) {
                entrances.push(szEntr);
            }
        });
        return entrances;
    }

    public removeListeners(): void {
        this._subZones.forEach(sz => {
            sz.removeListeners();
        });
    }

    public toJSON() {
        const json = super.toJSON();
        json.x = this.tileX;
        json.y = this.tileY;
        return json;
    }

    public getID2Place() {
        const res: {[key: number]: WorldBase} = {[this.getID()]: this};
        this._subZones.forEach(sz => {
            res[sz.getID()] = sz;
        });
        return res;
    }
}

World.ZoneBase = ZoneBase;

//--------------------------
// SubZoneBase
//--------------------------
/* Base class for sub-zones like branches, quarters and mountain faces.
 * Mostly has logic to
 * manipulate level features like shops, armorers etc.
 */
export class SubZoneBase extends WorldBase {

    protected _levels: Level[];
    protected _entrance: Entrance | null;
    protected _levelFeatures: Map<string, any[]>;
    protected _levelCount: number;

    constructor(name) {
        super(name);
        this._levelFeatures = new Map();
        this._levels = [];
        this._levelCount = 0;
    }

    /* Returns entrance/exit for the branch.*/
    public getEntrance(): Stairs {
        return getEntrance(this._levels, this._entrance);
    }

    public getLevelN(nLevel: number): Level {
        if (nLevel < this._levels.length) {
            return this._levels[nLevel];
        }
        else {
            const nLevels = this._levels.length;
            RG.err('SubZoneBase', 'getLevels',
                `No nLevel ${nLevel} found. Max: ${nLevels}`);
        }
        return null;
    }

    public getLevels(): Level[] {
        return this._levels.slice()
    }

    public hasLevel(level: Level): boolean {
        const index = this._levels.indexOf(level);
        return index >= 0;
    }

    public connectLevelToStairs(nLevel: number, stairs: Stairs) {
        if (!connectLevelToStairs(this._levels, nLevel, stairs)) {
            RG.err('SubZoneBase', 'connectLevelToStairs',
                'Stairs must be first connected to other level.');
        }
    }

    /* Returns stairs leading to other sub-zones. Used only for testing
    * purposes. */
    public getStairsOther(): Stairs[] {
        return getStairsOther(this.getName(), this._levels);
    }

    public addLevelFeature(feat): void {
        const type = feat.getType();
        if (!this._levelFeatures.has(type)) {
            this._levelFeatures[type] = [];
        }
        this._levelFeatures[type].push(feat);
    }

    public removeListeners() {
        // Should be implemented in the derived class
        // Does nothing if there are no listeners to remove
    }

    public getLevel(nLevel: number): Level {
        if (nLevel < this._levels.length) {
            return this._levels[nLevel];
        }
        else {
            const info = `${this.getType()}, ${this.getName()}`;
            const hasLevels = `Has ${this._levels.length} levels`;
            RG.err('SubZoneBase', 'getLevel',
                `${info}, nLevel: ${nLevel}, ${hasLevels}`);
        }
        return null;
    }

    /* Adds one level into the sub-zone. Checks for various possible errors like
     * duplicate levels. */
    public addLevel(level: Level): void {
        if (!RG.isNullOrUndef([level])) {
            if (!this.hasLevel(level)) {
                level.setLevelNumber(this._levelCount++);
                this._levels.push(level);
                level.setParent(this);
            }
            else {
                let msg = 'Trying to add existing level. ';
                msg += ' ID: ' + level.getID();
                RG.err('SubZoneBase', 'addLevel', msg);
            }
        }
        else {
            RG.err('SubZoneBase', 'addLevel',
                'Level is not defined.');
        }
    }

    public toJSON() {
        const json = super.toJSON();
        json.nLevels = this._levels.length;
        json.levels = this._levels.map(level => level.getID());
        return json;
    }
}
World.SubZoneBase = SubZoneBase;

//------------------
// World.Branch
//------------------
/* World.Branch is a branch of dungeon. A branch is linear
 * progression of connected levels (usually with increasing difficulty).
 * A branch can have
 * entry points to other branches (or out of the dungeon). */
export class Branch extends SubZoneBase {

    constructor(name) {
        super(name);
        this.setType('branch');
        this._entrance = null;
    }

    public addEntrance(levelNumber: number): void {
        const entrStairs = new ElementStairs('stairsUp');
        this.setEntrance(entrStairs, levelNumber);
    }

    /* Adds entrance stairs for this branch. */
    public setEntrance(stairs: Stairs, levelNumber: number): void {
        if (levelNumber < this._levels.length) {
            const level = this._levels[levelNumber];

            const cell = getFreeCellWithoutConnection(level);
            let [x, y] = cell.getXY();
            if (level.hasExtras()) {
                const extras = level.getExtras();
                if (extras.startPoint) {
                    [x, y] = extras.startPoint;
                }
            }

            level.addStairs(stairs, x, y);
            this._entrance = {levelNumber, x, y};
        }
        else {
            RG.err('World.Branch', 'setEntrance',
                `Invalid level number. Must be < ${this._levels.length}`);
        }
    }

    public setEntranceLocation(entrance) {
        if (!RG.isNullOrUndef([entrance])) {
            this._entrance = entrance;
        }
        else {
            RG.err('World.Branch', 'setEntranceLocation',
                'Arg entrance is not defined.');
        }
    }

    /* Returns entrance/exit for the branch.*/
    public getEntrance(): Stairs {
        return getEntrance(this._levels, this._entrance);
    }


    /* Connects the added levels together.*/
    public connectLevels(): void {
        connectLevelsLinear(this._levels);
    }

    public toJSON() {
        const json = super.toJSON();
        const obj: any = {};
        if (this._entrance) {
            obj.entrance = this._entrance;
        }
        return Object.assign(obj, json);
    }

}
World.Branch = Branch;

//------------------
// World.Dungeon
//------------------
/* Dungeons is a collection of branches.*/
export class Dungeon extends ZoneBase {

    private _entranceNames: string[];

    constructor(name) {
        super(name);
        this.setType('dungeon');
        this._entranceNames = [];
    }


    /* Returns true if the dungeon has given branch.*/
    public hasBranch(branch): boolean {
        return this.hasSubZone(branch);
    }

    public getBranches(): Branch[] {
        return this._subZones as Branch[];
    }

    /* Sets the entry branch(es) for the dungeon. */
    public setEntrance(branchName): void {
        if (typeof branchName === 'string') {
            this._entranceNames = [branchName];
        }
        else {
            this._entranceNames = branchName;
        }
    }

    /* Adds one branch to the dungeon. Returns true if OK. */
    public addBranch(branch: Branch): boolean {
        if (!this.hasBranch(branch)) {
            this._subZones.push(branch);
            // branch.setDungeon(this);
            branch.setParent(this);

            // By default, have at least one entrance
            if (this._subZones.length === 1) {
                this.setEntrance(branch.getName());
            }
            return true;
        }
        return false;
    }

    /* Returns all entrances/exits for the dungeon.*/
    public getEntrances(): Stairs[] {
        const res = [];
        const nSubFeats = this._subZones.length;
        for (let i = 0; i < nSubFeats; i++) {
            const branch = this._subZones[i];
            if (this._entranceNames.indexOf(branch.getName()) >= 0) {
                const entr = branch.getEntrance();
                if (!RG.isNullOrUndef([entr])) {
                    res.push(entr);
                }
            }
        }
        return res;
    }

    public toJSON() {
        const json = super.toJSON();
        const obj = {
            branch: this._subZones.map(br => br.toJSON()),
            entranceNames: this._entranceNames,
            nBranches: this._subZones.length
        };
        return Object.assign(obj, json);
    }

}
World.Dungeon = Dungeon;

//------------------
// AreaTile
//------------------
/* Area-tile is a level which has entry/exit points on a number of edges.
 * It is also used as container for zones such as cities and dungeons. */
export class AreaTile {

    public cols: number;
    public rows: number;
    public zones: {[key: string]: ZoneBase[]};

    private _tileX: number;
    private _tileY: number;
    private _area: Area;

    private _level: Level;

    constructor(x, y, area) {
        this._tileX = x;
        this._tileY = y;
        this._area = area;

        this.cols = null;
        this.rows = null;

        this._level = null;


        // All zones inside this tile
        this.zones = {
            Dungeon: [],
            Mountain: [],
            City: [],
            BattleZone: []
        };

    }

    public getLevel(): Level {
        return this._level;
    }
    public getTileX(): number {
        return this._tileX;
    }
    public getTileY(): number {
        return this._tileY;
    }

    public isNorthEdge(): boolean {
        return this._tileY === 0;
    }
    public isSouthEdge(): boolean {
        return this._tileY === (this._area.getSizeY() - 1);
    }
    public isWestEdge(): boolean {
        return this._tileX === 0;
    }
    public isEastEdge(): boolean {
        return this._tileX === (this._area.getSizeX() - 1);
    }

    /* Returns true for edge tiles.*/
    public isEdge(): boolean {
        if (this.isNorthEdge()) {return true;}
        if (this.isSouthEdge()) {return true;}
        if (this.isWestEdge()) {return true;}
        if (this.isEastEdge()) {return true;}
        return false;
    }

    /* Sets the level for this tile.*/
    public setLevel(level: Level): void {
        this._level = level;
        this.cols = this._level.getMap().cols;
        this.rows = this._level.getMap().rows;
    }

    /* Connect this tile to east and south tiles */
    public connect(eastTile, southTile) {
        const lastX = this.cols - 1;
        const lastY = this.rows - 1;

        // Connect to east tile, in y-direction
        if (!RG.isNullOrUndef([eastTile])) {
            const levelEast = eastTile.getLevel();
            const map = this._level.getMap();
            const mapEast = levelEast.getMap();

            for (let y = 1; y <= lastY - 1; y++) {
                const cell = map.getCell(lastX, y);
                const cellEast = mapEast.getCell(0, y);

                if (cell.isFree() && cellEast.isFree()) {
                    const stairs = new ElementStairs('passage',
                        this._level, levelEast);
                    const stairsEast = new ElementStairs('passage',
                        levelEast, this._level);
                    stairs.setTargetStairs(stairsEast);
                    stairsEast.setTargetStairs(stairs);

                    this._level.addStairs(stairs, lastX, y);
                    levelEast.addStairs(stairsEast, 0, y);
                }
            }
        }

        // Connect to south tile, in x-direction
        if (!RG.isNullOrUndef([southTile])) {
            const levelSouth = southTile.getLevel();
            const map = this._level.getMap();
            const mapSouth = levelSouth.getMap();

            for (let x = 1; x <= lastX - 1; x++) {
                const cell = map.getCell(x, lastY);
                const cellSouth = mapSouth.getCell(x, 0);

                if (cell.isFree() && cellSouth.isFree()) {
                    const stairs = new ElementStairs('passage',
                        this._level, levelSouth);
                    const connSouth = new ElementStairs('passage',
                        levelSouth, this._level);
                    stairs.setTargetStairs(connSouth);
                    connSouth.setTargetStairs(stairs);

                    this._level.addStairs(stairs, x, lastY);
                    levelSouth.addStairs(connSouth, x, 0);
                }
            }
        }
    }

    public addZone(type: string, zone: ZoneBase): void {
        if (RG.isNullOrUndef([zone.tileX, zone.tileY])) {
            RG.err('AreaTile', 'addZone',
                'No tileX/tileY given!');
        }
        if (!this.zones[type]) {
            this.zones[type] = [];
        }
        this.zones[type].push(zone);
    }

    public getZones(type?: string): ZoneBase[] {
        if (type) {
            return this.zones[type];
        }
        let zones = [];
        Object.keys(this.zones).forEach((type: string) => {
            zones = zones.concat(this.zones[type]);
        });
        return zones;
    }

    public getLevels(): Level[] {
        let res = [this._level];
        Object.keys(this.zones).forEach(type => {
            this.zones[type].forEach(z => {res = res.concat(z.getLevels());});
        });

        if (debug.enabled) {
            let msg = this.toString();
            msg = ` Tile ${msg} has ${res.length} levels from toJSON()`;
            if (this._level.getID() === 1344) {
                msg += `\tLevels: ${res.map(l => l.getID())}`;
            }
            console.error(msg);
        }

        return res;
    }

    public toString(): string {
        let msg = `${this._tileX},${this._tileY}, ID: ${this._level.getID()}`;
        msg += ` nZones: ${this.getZones().length}`;
        return msg;
    }

    public toJSON() {
        return {
            x: this._tileX,
            y: this._tileY,
            level: this._level.getID(),
            levels: this.getLevels().map(l => l.toJSON()),
            // TODO split somehow between created/not created zones
            nDungeons: this.zones.Dungeon.length,
            dungeon: this.getZones('Dungeon').map(dg => dg.toJSON()),
            nMountains: this.zones.Mountain.length,
            mountain: this.getZones('Mountain').map(mt => mt.toJSON()),
            nCities: this.zones.City.length,
            city: this.getZones('City').map(city => city.toJSON()),
            nBattleZones: this.zones.BattleZone.length,
            battlezone: this.getZones('BattleZone').map(bz => bz.toJSON())
        };
    }

    public removeListeners(): void {
        Object.values(this.zones).forEach(zoneList => {
            zoneList.forEach(zone => {
                zone.removeListeners();
            });
        });
    }
}
World.AreaTile = AreaTile;

//------------------
// Area
//------------------
/* Area is N x M area of tiles, with no linear progression like in dungeons.
 * Moving between tiles of areas happens by travelling to the edges of a tile.
 * Each tile is a level with special edge tiles.
 * */
export class Area extends WorldBase {

    // Keeps track which tiles contains real AreaTile objects
    public tilesLoaded: boolean[][];

    // Control which tile has its zones created
    public zonesCreated: {[key: string]: boolean};

    private _sizeX: number;
    private _sizeY: number;
    private _cols: number;
    private _rows: number;

    private _tiles: AreaTileObj[][];

    private _conf: {[key: string]: any};

    constructor(name, sizeX, sizeY, cols, rows, levels?: Level[]) {
        super(name);
        this.setType('area');
        this._sizeX = parseInt(sizeX, 10);
        this._sizeY = parseInt(sizeY, 10);

        this._cols = cols || 30;
        this._rows = rows || 30;

        this._tiles = [];

        this._conf = {};

        // Control which tile has its zones created
        this.zonesCreated = {};

        // Keeps track which tiles contains real AreaTile objects
        this.tilesLoaded = [];

        // TODO move to class methods

        this._init(levels);

    }

    public getSizeX(): number {
        return this._sizeX;
    }
    public getSizeY(): number {
        return this._sizeY;
    }

    public isLoaded(x, y): boolean {
        return this.tilesLoaded[x][y];
    }

    public setLoaded(x, y): void {
        this.tilesLoaded[x][y] = true;
    }   

    public setUnloaded(x, y): void {
        this.tilesLoaded[x][y] = false;
    }

    public markAllZonesCreated(): void {
        Object.keys(this.zonesCreated).forEach(key => {
            this.zonesCreated[key] = true;
        });
    }

    public markTileZonesCreated(x, y): void {
        this.zonesCreated[x + ',' + y] = true;
    }

    public tileHasZonesCreated(x, y): boolean {
        return this.zonesCreated[x + ',' + y];
    }

    public getTiles(): AreaTileObj[][] {
        return this._tiles;
    }

    public setTile(x, y, tile: AreaTile) {
        this._tiles[x][y] = tile;
    }

    public setConf(conf) {
        this._conf = conf;
    }

    public getConf() {
        return this._conf;
    }

    public _init(levels?): void {
        // Create the tiles
        for (let x = 0; x < this._sizeX; x++) {
            const tileColumn = [];
            this.tilesLoaded.push([]);
            for (let y = 0; y < this._sizeY; y++) {
                this.zonesCreated[x + ',' + y] = false;
                const newTile = new AreaTile(x, y, this);

                // Scale the forest gen based on tile size
                const forestConf = RG.getForestConf(this._cols, this._rows);
                let level = null;
                if (levels) {
                    level = levels[x][y];
                }
                else {
                    const factLevel = new FactoryLevel();
                    level = factLevel.createLevel('forest',
                        this._cols, this._rows, forestConf);
                }

                if (level !== RG.LEVEL_NOT_LOADED) {
                    this.tilesLoaded[x][y] = true;
                    level.setParent(this);
                    newTile.setLevel(level);
                    tileColumn.push(newTile);
                }
                else {
                    this.tilesLoaded[x][y] = false;
                    tileColumn.push(RG.TILE_NOT_LOADED);
                }
            }
            this._tiles.push(tileColumn);
        }

        // Connect the tiles, unless levels already given (and connected)
        // If levels are not connect, need to call connectTiles() manually
        if (!levels) {
            this.connectTiles();
        }
    }

    /* Connects all tiles together from the sides. */
    public connectTiles() {
        connectTiles(this._tiles, this._sizeX, this._sizeY);
    }

    public getLevels(): Level[] {
        let res = [];
        for (let x = 0; x < this._tiles.length; x++) {
            for (let y = 0; y < this._tiles[x].length; y++) {
                // If tile is in-memory/not serialized, query levels
                if (this.tilesLoaded[x][y]) {
                    res = res.concat(this._tiles[x][y].getLevels());
                }
            }
        }
        return res;
    }

    /* Returns tile X,Y which has the level with given ID. */
    public findTileXYById(id): TCoord | null {
        for (let x = 0; x < this._tiles.length; x++) {
            for (let y = 0; y < this._tiles[x].length; y++) {
                if (this.tilesLoaded[x][y]) {
                    const currId = this._tiles[x][y].getLevel().getID();
                    try {
                        if (currId === id) {
                            return [x, y];
                        }
                    }
                    catch (e) {
                        let msg = `Area ${this.getID()} ERROR`;
                        msg += `\nFailed to call getLevel for tile ${x},${y}`;
                        msg += `Tile as JSON: ', this._tiles[x][y]`;
                        console.error(msg);
                        throw new Error(e);
                    }
                }
            }
        }
        this.printLevelIDs();
        return null;
    }

    /* Returns true if the area has given level as a tile level. */
    public hasTileWithId(id: number): boolean {
        for (let x = 0; x < this._tiles.length; x++) {
            for (let y = 0; y < this._tiles[x].length; y++) {
                if (this.tilesLoaded[x][y]) {
                    if (this._tiles[x][y].getLevel().getID() === id) {
                        return true;
                    }
                }
                else if ((this._tiles[x][y] as AreaTileJSON).level === id) {
                    return true;
                }
            }
        }
        return false;
    }

    /* Returns true if the area has tiles with given levels or level IDs. */
    public hasTiles(arr): boolean {
        let result = arr.length > 0;
        arr.forEach(level => {
            if (typeof level.getID === 'function') {
                result = result && this.hasTileWithId(level.getID());
            }
            else if (Number.isInteger(level)) {
                result = result && this.hasTileWithId(level);
            }
            else {
                const str = JSON.stringify(level);
                RG.err('Area', 'hasTiles',
                    `Invalid level given ${str}. Must be Map.Level/ID`);
            }
        });
        return result;
    }

    public getTileXY(x, y): AreaTileObj {
        if (x >= 0 && x < this.getSizeX() && y >= 0 && y < this.getSizeY()) {
            return this._tiles[x][y];
        }
        else {
            const sizeX = this.getSizeX();
            const sizeY = this.getSizeY();
            RG.err('Area', 'getTileXY',
                `Tile x,y (${x}, ${y}) is out of bounds (${sizeX}, ${sizeY}).`);
        }
        return null;
    }

    public addZone(type, zone: ZoneBase): void {
        if (RG.isNullOrUndef([zone.tileX, zone.tileY])) {
            RG.err('Area', 'addZone',
                'No tileX/tileY given!');
        }
        this._tiles[zone.tileX][zone.tileY].addZone(type, zone);
        zone.setParent(this);
    }

    public getZones(type): ZoneBase[] {
        let res = [];
        for (let x = 0; x < this._tiles.length; x++) {
            for (let y = 0; y < this._tiles[x].length; y++) {
                if (this.tilesLoaded[x][y]) {
                    res = res.concat(this._tiles[x][y].getZones(type));
                }
            }
        }
        return res;
    }

    public createAreaConfig() {
        return {
            name: this.getName(),
            maxX: this._sizeX,
            maxY: this._sizeY
        };
    }

    /* Serializes the Area into JSON. */
    public toJSON() {
        const json = super.toJSON();
        const tilesJSON = [];
        this._tiles.forEach((tileCol, x) => {
            const tileColJSON = tileCol.map((tile, y) => {
                if (this.tilesLoaded[x][y]) {
                    return tile.toJSON();
                }
                else {
                    return tile;
                }
            });
            tilesJSON.push(tileColJSON);
        });

        const obj = {
            isJSON: true,
            conf: this.getConf(),
            maxX: this._sizeX, maxY: this._sizeY,
            cols: this._cols, rows: this._rows,
            tiles: tilesJSON,
            tilesLoaded: this.tilesLoaded,
            zonesCreated: this.zonesCreated
        };
        return Object.assign(obj, json);
    }

    /* Execute function cb for each tile. */
    public forEachTileLoaded(cb) {
        for (let x = 0; x < this._tiles.length; x++) {
            for (let y = 0; y < this._tiles[x].length; y++) {
                if (this.tilesLoaded[x][y]) {
                    cb(x, y, this._tiles[x][y]);
                }
            }
        }
    }

    public forEachTile(cb: (x: number, y: number, tile: AreaTileObj) => void) {
        for (let x = 0; x < this._tiles.length; x++) {
            for (let y = 0; y < this._tiles[x].length; y++) {
                cb(x, y, this._tiles[x][y]);
            }
        }
    }

    public printLevelIDs(): void {
        const allIDs: number[] = [];
        this.forEachTile((x, y, tile) => {
            if (this.tilesLoaded[x][y]) {
                allIDs.push(this._tiles[x][y].getLevel().getID());
            }
            else {
                allIDs.push((this._tiles[x][y] as AreaTileJSON).level);
            }

        });
    }

    public printDebugInfo(): void {
        const tilesJSON: TCoord[] = [];
        const loadedTiles: TCoord[] = [];
        const tilesOther: TCoord[] = [];
        this.forEachTile((x, y, tile) => {
            if ((tile as AreaTileJSON).isJSON) {tilesJSON.push([x, y]);}
            else if (this.tilesLoaded[x][y]) {loadedTiles.push([x, y]);}
            else {tilesOther.push([x, y]);}
        });

        let msg = `Area ID ${this.getID()} debug info:\n`;
        msg += `\t\nTiles as JSON: ${tilesJSON.join(' | ')}`;
        msg += `\t\nTiles LOADED: ${loadedTiles.join(' | ')}`;
        msg += `\t\nTiles OTHER: ${tilesOther.join(' | ')}`;
        this.printLevelIDs();
        console.log('Tile[0][2]: ', this._tiles[0][2]);
        console.log(msg);
    }

}
World.Area = Area;

//------------------
// World.Mountain
//------------------
/* Mountains are places consisting of tiles and dungeons. Mountain has few
 * special tiles representing the summit.
 */
export class Mountain extends ZoneBase {

    constructor(name) {
        super(name);
        this.setType('mountain');

    /* MountainFace, 5 stages:
            |       <- Summit
           /|\
          /|||\
         /|||||\
        /|||||||\
       /|||||||||\

    4 tiletypes:
        1. Summit (connect to all faces)
        2. Left side tile (connect to face)
        3. Right side tile (connect to face)
        4. Central tiles (connect on all sides)

    Summit is top-down view, while face is more of climbing,
    from-the-angle view. Bit weird but should be fine.

    Not implemented yet.
    */

    }

    public findLevel(name, nLevel) {
        const faces = this.getFaces();
        const summits = this.getSummits();
        let level = findLevel(name, faces, nLevel);
        if (!level) {
            level = findLevel(name, summits, nLevel);
        }
        return level;
    }

    public addSummit(summit) {
        this.addSubZone(summit);
    }

    public addFace(face) {
        this.addSubZone(face);
    }

    public getFaces() {
        return this._subZones.filter(sz => sz.getType() === 'face');
    }

    public getSummits() {
        return this._subZones.filter(sz => sz.getType() === 'summit');
    }

    public connectFaceAndSummit(face, summit, l1, l2) {
        const [sz1, sz2] = this.getSubZoneArgs(face, summit);
        if (sz2.getType() !== 'summit') {
            const type = sz2.getType();
            RG.err('World.Mountain', 'connectFaceAndSummit',
                `Expected 2nd arg summit, got: ${type}`);
        }
        const level1 = sz1.getLevelN(l1);
        const level2 = sz2.getLevelN(l2);
        const connFace = {y: () => 0, level: level1};
        const connSummit = {level: level2};
        connectLevelsConstrained(connFace, connSummit);
    }

    public connectSubZones(s1Arg, s2Arg, l1, l2) {
        const [sz1, sz2] = this.getSubZoneArgs(s1Arg, s2Arg);
        // const sz1 = this.findSubZone(s1Arg);
        // const sz2 = this.findSubZone(s2Arg);
        if (sz1.getType() === 'face') {
            if (sz2.getType() === 'summit') {
                this.connectFaceAndSummit(sz1, sz2, l1, l2);
                return;
            }
        }
        else if (sz1.getType() === 'summit') {
            if (sz2.getType() === 'face') {
                // Note the re-ordered args here
                this.connectFaceAndSummit(sz2, sz1, l2, l1);
                return;
            }
        }
        // face-face and summit-summit connections done here
        super.connectSubZones(s1Arg, s2Arg, l1, l2);
    }

    /* Serializes the World.Mountain object. */
    public toJSON() {
        const json = super.toJSON();
        const obj = {
            nFaces: this.getFaces().length,
            face: this.getFaces().map(face => face.toJSON()),
            nSummits: this.getSummits().length,
            summit: this.getSummits().map(summit => summit.toJSON())
        };
        return Object.assign(obj, json);
    }
}
World.Mountain = Mountain;

//----------------------
// MountainFace
//----------------------
/* One side (face) of the mountain. Each side consists of stages, of X by 1
 * Areas. This is also re-used as a mountain summit because internally it's the
 * same. */
export class MountainFace extends SubZoneBase {

    constructor(name) {
        super(name);
        this.setType('face');
        this._entrance = null;
    }

    public setEntrance(stairs) {
        this._entrance = stairs;
    }

    public setEntranceLocation(entrance) {
        if (!RG.isNullOrUndef([entrance])) {
            this._entrance = entrance;
        }
        else {
            RG.err('MountainFace', 'setEntranceLocation',
                'Arg entrance is not defined.');
        }
    }

    public getEntrance() {
        return getEntrance(this._levels, this._entrance);
    }

    public toJSON() {
        const json = super.toJSON();
        const obj: any = {};
        if (this._entrance) {
            obj.entrance = this._entrance;
        }
        return Object.assign(obj, json);
    }

    /* Entrance is created at the bottom by default. */
    public addEntrance(levelNumber) {
        if (this._entrance === null) {
            const level = this._levels[levelNumber];
            const stairs = new ElementStairs('stairsDown', level);
            const map = level.getMap();
            const midX = Math.floor(map.cols / 2);
            const maxY = map.rows - 1;

            let x = midX;
            let y = maxY;
            // Verify that there's a path from these stairs. Start scanning from
            // bottom y, mid x. First scan the row to the left, then right. If
            // nothing free is found, go to the row above.
            while (!map.getCell(x, y).isFree()) {
                if (x === 0) {x = midX + 1;}
                if (x <= midX) {--x;}
                if (x > midX) {++x;}
                if (x === map.cols - 1) {
                    x = midX;
                    --y;
                }
            }

            level.addStairs(stairs, x, y);
            this._entrance = {levelNumber, x, y};
        }
        else {
            RG.err('MountainFace', 'addEntrance',
                'Entrance already added.');
        }
    }
}
World.MountainFace = MountainFace;

//-------------------------
// World.MountainSummit
//-------------------------
/* A summit of the mountain consisting of at least one Map.Level. */
export class MountainSummit extends SubZoneBase {
    constructor(name) {
        super(name);
        this.setType('summit');
    }

    public getEntrance() {
        return null;
    }

}

World.MountainSummit = MountainSummit;

//-------------------------
// World.City
//-------------------------
/* A city in the world. A special features of the city can be queried through
* this object. */
export class City extends ZoneBase {
    constructor(name) {
        super(name);
        this.setType('city');
    }

    public getQuarters() {
        return this._subZones;
    }

    public addQuarter(quarter) {
        if (!this.addSubZone(quarter)) {
            RG.err('World.City', 'addQuarter',
                `City ${this.getName()} quarter not defined.`);
        }
    }

    public abutQuarters(q1, q2, l1, l2) {
        const res = connectSubZoneEdges(this._subZones, q1, q2, l1, l2);
        return res;
    }

    public hasQuarter(q) {
        return this.hasSubZone(q);
    }

    public toJSON() {
        const json = super.toJSON();
        const obj = {
            nQuarters: this._subZones.length,
            quarter: this._subZones.map(q => q.toJSON())
        };
        return Object.assign(obj, json);
    }
}
World.City = City;

//-----------------------------
// CityQuarter
//-----------------------------
/* City quarter is a subset of the City. It contains the actual level and
 * special features for that level. */
export class CityQuarter extends SubZoneBase {

    private _shops: WorldShop[];

    constructor(name) {
        super(name);
        this.setType('quarter');
        this._entrance = null;
        this._shops = [];
    }

    public removeListeners() {
        this._shops.forEach(shop => {
            if (!shop.isAbandoned()) {
                // Must clean up these to avoid memory leaks
                POOL.removeListener(shop);
            }
        });
    }

    public addShop(shop) {
        this._shops.push(shop);
    }

    public getShops() {
        return this._shops;
    }

    public setEntranceLocation(entrance) {
        if (!RG.isNullOrUndef([entrance])) {
            this._entrance = entrance;
        }
        else {
            RG.err('CityQuarter', 'setEntranceLocation',
                'Arg entrance is not defined.');
        }
    }

    /* Returns entrance/exit for the quarter.*/
    public getEntrance() {
        return getEntrance(this._levels, this._entrance);
    }

    public addEntrance(levelNumber) {
        if (this._entrance === null) {
            const level = this._levels[levelNumber];
            const stairs = new ElementStairs('stairsDown', level);
            level.addStairs(stairs, 1, 1);
            this._entrance = {levelNumber, x: 1, y: 1};
        }
        else {
            RG.err('CityQuarter', 'addEntrance',
                'Entrance already added.');
        }
    }


    /* Connects levels in linear fashion 0->1->2->...->N. */
    public connectLevels() {
        connectLevelsLinear(this._levels);
    }

    public toJSON() {
        const json = super.toJSON();
        const obj: any = {
            shops: this._shops.map(shop => shop.toJSON())
        };
        if (this._entrance) {
            obj.entrance = this._entrance;
        }
        return Object.assign(obj, json);
    }
}
World.CityQuarter = CityQuarter;

//-------------------------
// World.BattleZone
//-------------------------
/* A battle zone encapsulates battle construct, armies and the battle level. */
export class BattleZone extends ZoneBase {
    private _levels: Level[];

    constructor(name) {
        super(name);
        this.setType('battlezone');
        this._levels = [];
    }

    public addLevel(level) {
        return this._levels.push(level);
    }

    public getLevels() {
        return this._levels;
    }

    public toJSON() {
        const json = super.toJSON();
        const nLevels = this._levels.length;
        const obj = {
          nLevels,
          levels: this._levels.map(l => l.getID())
        };
        if (nLevels === 0) {
            RG.err('World.BattleZone', 'toJSON',
                `Bz ${this.getName()} called without levels`);
        }
        return Object.assign(obj, json);
    }
}
World.BattleZone = BattleZone;

//-----------------------------
// WorldTop
//-----------------------------
/* Largest place at the top of hierarchy. Contains a number of areas,
 * mountains, dungeons and cities. */
export class WorldTop extends WorldBase {

    public currAreaIndex: number;

    private _areas: Area[];
    private _conf: {[key: string]: any};

    constructor(name) {
        super(name);
        this.setType('world');

        this._areas = [];

        this.currAreaIndex = 0; // Points to current area
        this._conf = {};
    }

    public getConf() {
        return this._conf;
    }

    public setConf(conf) {this._conf = conf;}

    /* Adds an area into the world. */
    public addArea(area: Area): void {
        area.setParent(this);
        this._areas.push(area);
    }

    public getLevels(): Level[] {
        let levels = [];
        this._areas.map(area => {
            levels = levels.concat(area.getLevels());
        });
        return levels;
    }

    public getAreas(): Area[] {
        return this._areas;
    }

    /* Returns all zones of given type. */
    public getZones(type?: string): ZoneBase[] {
        let zones = [];
        this._areas.forEach(a => {
            zones = zones.concat(a.getZones(type));
        });
        return zones;
    }

    /* Returns all stairs in the world. */
    public getStairs(): Stairs[] {
        const res = [];
        this.getZones().forEach(zone =>
            zone.getLevels().forEach(l =>
                l.getStairs().forEach(stair =>
                    res.push(stair)
                )
            )
        );
        return res;
    }

    public getCurrentArea(): Area {
        return this._areas[this.currAreaIndex];
    }

    public toJSON() {
        const json = super.toJSON();
        const area = this._areas.map(area => area.toJSON());
        let createAllZones = true;
        if (this.getConf().hasOwnProperty('createAllZones')) {
            createAllZones = this.getConf().createAllZones;
        }
        const obj = {
            conf: this.getConf(),
            nAreas: this._areas.length,
            area,
            createAllZones
        };
        if (!obj.conf.area) {
            obj.conf.area = this.createAreaConfig();
        }
        return Object.assign(obj, json);
    }

    /* Creates config for each area. This is mainly required for testing. */
    public createAreaConfig() {
        const areaConf = [];
        this._areas.forEach(function(area) {
            areaConf.push(area.createAreaConfig());
        });
        return areaConf;
    }

    public getID2Place() {
        let res: {[key: string]: WorldBase} = {[this.getID()]: this};
        this._areas.forEach(area => {
            res[area.getID()] = area;
        });
        const zones = this.getZones();
        zones.forEach(zone => {
            res[zone.getID()] = zone;
            const id2Place = zone.getID2Place();
            res = Object.assign(res, id2Place);
        });
        return res;
    }
}
World.WorldTop = WorldTop;

//---------------------------------------------------------------------------
// LEVEL FEATURES
//---------------------------------------------------------------------------

export class WorldShop {
    public hasNotify: boolean;

    private _shopkeeper: SentientActor;
    private _level: Level;
    private _coord: TCoord[];
    public _isAbandoned: boolean;

    constructor() {
        this._shopkeeper = null;
        this._level = null;
        this._coord = [];
        this._isAbandoned = false;


        this.hasNotify = true;
    }

    public setLevel(level: Level): void {
        this._level = level;
    }

    public setCoord(coord: TCoord[]): void {
        this._coord = coord;
    }

    public isAbandoned(): boolean {
        return this._isAbandoned;
    }

    /* Listens to shopkeeper killed event. */
    public notify(evtName, args) {
        if (this._shopkeeper) {
            if (args.actor.getID() === this._shopkeeper.getID()) {
                this.setShopAbandoned();
                POOL.removeListener(this);
            }
        }
    }

    public getLevel(): Level {
        return this._level;
    }

    public getShopkeeper(): SentientActor {
        return this._shopkeeper;
    }

    public setShopkeeper(keeper: SentientActor) {
        if (keeper) {
            this._shopkeeper = keeper;
            POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);
        }
        else {
            RG.err('WorldShop', 'setShopkeeper',
                'Tried to set null shopkeeper');
        }
    }

    public setShopAbandoned(): void {
        this._isAbandoned = true;
        this._shopkeeper = null;
        this._coord.forEach(xy => {
            const cell = this.getCell(xy);
            const shopElem = cell.getShop();
            shopElem.abandonShop();
            const items = cell.getItems();
            if (items) {
                items.forEach(item => {
                    if (item.has('Unpaid')) {
                        item.remove('Unpaid');
                    }
                });
            }
        });
    }

    public getCell(xy): Cell {
        return this._level.getMap().getCell(xy[0], xy[1]);
    }

    public reclaimShop(actor) {
        if (this._isAbandoned) {
            this._isAbandoned = false;
            this.setShopkeeper(actor);
            this._coord.forEach(xy => {
                const cell = this.getCell(xy);
                const shopElem = cell.getShop();
                shopElem.reclaim(actor);
                const items = cell.getItems();
                if (items) {
                    items.forEach(item => {
                        if (!item.has('Unpaid')) {
                            item.add(new Component.Unpaid());
                        }
                    });
                }
            });
        }
    }

    /* Get empty cells of the shop (no items in cells). */
    public emptyCells() {
        const result = [];
        this._coord.forEach(xy => {
            const cell = this._level.getMap().getCell(xy[0], xy[1]);
            if (!cell.hasItems()) {
                result.push(cell);
            }
        });
        return result;
    }

    /* Adds new items to the empty cells of the shop. */
    public refreshShopItems(newItems) {
        let nItem = 0;
        this._coord.forEach(xy => {
            const cell = this._level.getMap().getCell(xy[0], xy[1]);
            if (!cell.hasItems()) {
                if (nItem < newItems.length) {
                    newItems[nItem].add(new Component.Unpaid());
                    this._level.addItem(newItems[nItem], xy[0], xy[1]);
                    ++nItem;
                }
            }
        });
    }

    public toJSON() {
        const obj: any = {
            isAbandoned: this._isAbandoned,
            level: this._level.getID(),
            coord: this._coord
        };
        if (!this._isAbandoned) {
            obj.shopkeeper = this._shopkeeper.getID();
        }
        return obj;
    }
}

World.WorldShop = WorldShop;

World.isZone = function(feature: WorldBase): boolean {
    if (feature.getType) {
        const type = feature.getType();
        return (/(city|battlezone|mountain|dungeon)/).test(type);
    }
    return false;
};

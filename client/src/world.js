/*
 * Contains objects related to the game world in Battles. This includes areas,
 * dungeons, dungeon branches etc.
 */

const RG = require('./rg.js');
RG.Factory = require('./factory');
const debug = require('debug')('bitn:world');

RG.World = {};

const RNG = RG.Random.getRNG();

const oppositeEdge = {
    north: 'south', south: 'north', east: 'west', west: 'east'
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
const addExitsToEdge = (
    level, exitType = 'passage', edge = 'any', overwrite = false) => {
    const map = level.getMap();
    const cols = map.cols;
    const rows = map.rows;
    const exitsAdded = [];
    for (let row = 1; row < rows - 1; row++) {
        if (edge === 'any' || edge === 'west') {
            if (map.isPassable(0, row) || overwrite) {
                const exitWest = new RG.Element.Stairs(exitType, level);
                removeExistingConnection(level, 0, row);
                if (!overwrite) {level.addElement(exitWest, 0, row);}
                else {level.addStairs(exitWest, 0, row);}
                exitsAdded.push(exitWest);
            }
        }
        if (edge === 'any' || edge === 'east') {
            if (map.isPassable(cols - 1, row) || overwrite) {
                const exitEast = new RG.Element.Stairs(exitType, level);
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
                const exitNorth = new RG.Element.Stairs(exitType, level);
                removeExistingConnection(level, col, 0);
                if (!overwrite) {level.addElement(exitNorth, col, 0);}
                else {level.addStairs(exitNorth, col, 0);}
                exitsAdded.push(exitNorth);
            }
        }
        if (edge === 'any' || edge === 'south') {
            if (map.isPassable(col, rows - 1) || overwrite) {
                const exitSouth = new RG.Element.Stairs(exitType, level);
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
const edgeHasConnections = (level, edge) => {
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
function getStairsOther(name, levels) {
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
    const zone = zones.find(zone => {
        return zone.getName() === name;
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
    const subZone = subZones.find(subZone => (
        subZone.getName() === name
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

            const stairsDown = new Stairs('stairsDown', src, targetDown);
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
            const stairsUp = new Stairs('stairsUp', src, targetUp);

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
RG.World.connectLevelsLinear = connectLevelsLinear;

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

    const l1Stairs = new Stairs('stairsUp', level1, level2);
    const l2Stairs = new Stairs('stairsDown', level2, level1);
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
            const newStairs = new Stairs(name,
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

function getSubZoneArgs(subZones, sz1Arg, sz2Arg) {
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
function connectSubZones(subZones, sz1Arg, sz2Arg, l1, l2) {
    if (RG.isNullOrUndef([l1, l2])) {
        RG.err('RG.World', 'connectSubZones',
            `l1 (${l1}) and l2 (${l2}) must be non-null and integers.`);
    }
    const [sz1, sz2] = getSubZoneArgs(subZones, sz1Arg, sz2Arg);

    if (RG.isNullOrUndef([sz1, sz2])) {
        RG.err('RG.World', 'connectSubZones',
            'Cannot connect null subZones. Check the names/refs.');
    }

    let s2IsDown = true;
    if (l1 > l2) {s2IsDown = false;}
    const name = s2IsDown ? 'stairsDown' : 'stairsUp';
    const b2Stairs = new Stairs(name);
    const sz2Levels = sz2.getLevels();
    if (l2 < sz2Levels.length) {
        const cell = getFreeCellWithoutConnection(sz2Levels[l2]);
        sz2Levels[l2].addStairs(b2Stairs, cell.getX(), cell.getY());
        b2Stairs.setSrcLevel(sz2Levels[l2]);
        sz1.connectLevelToStairs(l1, b2Stairs);
    }
    else {
        RG.err('RG.World', 'connectSubZones',
            'Level ' + l2 + " doesn't exist in sub-zone " + sz2.getName());
    }

}

/* Connects a random (unconnected) edge of two levels together. */
function connectSubZoneEdges(subZones, sz1Arg, sz2Arg, l1, l2) {
    const edge1 = RNG.arrayGetRand(['north', 'south', 'east', 'west']);
    const edge2 = oppositeEdge[edge1];
    const [sz1, sz2] = getSubZoneArgs(subZones, sz1Arg, sz2Arg);

    const sz1Level = sz1.getLevel(l1);
    const sz2Level = sz2.getLevel(l2);

    /* sz1Level.getMap().debugPrintInASCII();
    sz2Level.getMap().debugPrintInASCII();*/

    const newExits1 = addExitsToEdge(sz1Level, 'exit', edge1, true);
    const newExits2 = addExitsToEdge(sz2Level, 'exit', edge2, true);

    /* sz1Level.getMap().debugPrintInASCII();
    sz2Level.getMap().debugPrintInASCII();*/

    if (newExits1 === 0 || newExits2 === 0) {
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

function getEntrance(levels, entrance) {
    if (entrance === null) {return null;}
    const {x, y} = entrance;
    const entrLevel = levels[entrance.levelNumber];
    const entrCell = entrLevel.getMap().getCell(x, y);
    return entrCell.getStairs();
}

/* Connects given array of area tiles together. */
function connectTiles(tiles, sizeX, sizeY) {
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

const Stairs = RG.Element.Stairs;

RG.World.addExitsToEdge = addExitsToEdge;
RG.World.edgeHasConnections = edgeHasConnections;

//----------------
// RG.World.Base
//----------------


/* Base class for world places. Each place has name and type + full hierarchical
* name to trace where the place is in hierarchy. */
RG.World.Base = function(name) {
    this.name = name;
    this.type = 'base';
    this.worldID = RG.World.Base.id++;
    this.parent = null;
};

RG.World.Base.prototype.getName = function() {
    return this.name;
};

RG.World.Base.prototype.getHierName = function() {
    return this.hierName;
};

RG.World.Base.prototype.setHierName = function(hierName) {
    this.hierName = hierName;
};

RG.World.Base.prototype.getType = function() {
    return this.type;
};

RG.World.Base.prototype.setType = function(type) {
    this.type = type;
};

RG.World.Base.prototype.getID = function() {
    return this.worldID;
};

RG.World.Base.prototype.setID = function(id) {
    this.worldID = id;
};

RG.World.Base.prototype.getParent = function() {
    return this.parent;
};

RG.World.Base.prototype.setParent = function(parent) {
    this.parent = parent;
};

RG.World.Base.prototype.toJSON = function() {
    const obj = {
        name: this.name,
        hierName: this.hierName,
        type: this.type,
        id: this.worldID
    };
    if (this.parent) {
        obj.parent = this.parent.getID();
    }
    return obj;
};

// ID counter for world elements
RG.World.Base.id = 0;

//---------------------
// RG.World.ZoneBase
//---------------------

RG.World.ZoneBase = function(name) {
    RG.World.Base.call(this, name);
    this._subZones = [];
};
RG.extend2(RG.World.ZoneBase, RG.World.Base);

RG.World.ZoneBase.prototype.getSubZoneArgs = function(s1Arg, s2Arg) {
    return getSubZoneArgs(this._subZones, s1Arg, s2Arg);
};

RG.World.ZoneBase.prototype.setTileXY = function(x, y) {
    this.tileX = x;
    this.tileY = y;
};

RG.World.ZoneBase.prototype.getTileXY = function() {
    return [this.tileX, this.tileY];
};

RG.World.ZoneBase.prototype.addSubZone = function(subZone) {
    if (!RG.isNullOrUndef([subZone])) {
        subZone.setParent(this);
        this._subZones.push(subZone);
        return true;
    }
    return false;
};

RG.World.ZoneBase.prototype.hasSubZone = function(subZone) {
    const index = this._subZones.indexOf(subZone);
    return index >= 0;
};

RG.World.ZoneBase.prototype.getLevels = function() {
    let res = [];
    this._subZones.forEach(subFeat => {
        res = res.concat(subFeat.getLevels());
    });
    return res;
};

RG.World.ZoneBase.prototype.connectSubZones = function(
    s1Arg, s2Arg, l1, l2) {
    connectSubZones(this._subZones, s1Arg, s2Arg, l1, l2);
};

RG.World.ZoneBase.prototype.findLevel = function(name, nLevel) {
    const level = findLevel(name, this._subZones, nLevel);
    return level;
};

RG.World.ZoneBase.prototype.findSubZone = function(name) {
    const subZone = findSubZone(name, this._subZones);
    return subZone;
};

/* Returns each entrance in each subzone. */
RG.World.ZoneBase.prototype.getEntrances = function() {
    const entrances = [];
    this._subZones.forEach(sz => {
        const szEntr = sz.getEntrance();
        if (szEntr) {
            entrances.push(szEntr);
        }
    });
    return entrances;
};

RG.World.ZoneBase.prototype.removeListeners = function() {
    this._subZones.forEach(sz => {
        sz.removeListeners();
    });
};

RG.World.ZoneBase.prototype.toJSON = function() {
    const json = RG.World.Base.prototype.toJSON.call(this);
    json.x = this.tileX;
    json.y = this.tileY;
    return json;
};

//--------------------------
// RG.World.SubZoneBase
//--------------------------
/* Base class for sub-zones like branches, quarters and mountain faces.
 * Mostly has logic to
 * manipulate level features like shops, armorers etc.
 */
RG.World.SubZoneBase = function(name) {
    RG.World.Base.call(this, name);
    this._levelFeatures = new Map();
    this._levels = [];
    this._levelCount = 0;
};
RG.extend2(RG.World.SubZoneBase, RG.World.Base);

RG.World.SubZoneBase.prototype.getLevels = function(nLevel) {
    if (RG.isNullOrUndef([nLevel])) {
        return this._levels;
    }
    else if (nLevel < this._levels.length) {
        return this._levels[nLevel];
    }
    else {
        const nLevels = this._levels.length;
        RG.err('World.SubZoneBase', 'getLevels',
            `No nLevel ${nLevel} found. Max: ${nLevels}`);
    }
    return null;
};

RG.World.SubZoneBase.prototype.hasLevel = function(level) {
    const index = this._levels.indexOf(level);
    return index >= 0;
};

/* Returns stairs leading to other sub-zones. Used only for testing
* purposes. */
RG.World.SubZoneBase.prototype.getStairsOther = function() {
    return getStairsOther(this.getName(), this._levels);
};

RG.World.SubZoneBase.prototype.addLevelFeature = function(feat) {
    const type = feat.getType();
    if (!this._levelFeatures.has(type)) {
        this._levelFeatures[type] = [];
    }
    this._levelFeatures[type].push(feat);
};

RG.World.SubZoneBase.prototype.removeListeners = function() {
    // Should be implemented in the derived class
    // Does nothing if there are no listeners to remove
};

RG.World.SubZoneBase.prototype.getLevel = function(nLevel) {
    if (nLevel < this._levels.length) {
        return this._levels[nLevel];
    }
    else {
        const info = `${this.getType()}, ${this.getName()}`;
        const hasLevels = `Has ${this._levels.length} levels`;
        RG.err('World.SubZoneBase', 'getLevel',
            `${info}, nLevel: ${nLevel}, ${hasLevels}`);
    }
    return null;
};

/* Adds one level into the sub-zone. Checks for various possible errors like
 * duplicate levels. */
RG.World.SubZoneBase.prototype.addLevel = function(level) {
    if (!RG.isNullOrUndef([level])) {
        if (!this.hasLevel(level)) {
            level.setLevelNumber(this._levelCount++);
            this._levels.push(level);
            level.setParent(this);
        }
        else {
            let msg = 'Trying to add existing level. ';
            msg += ' ID: ' + level.getID();
            RG.err('World.SubZoneBase', 'addLevel', msg);
        }
    }
    else {
        RG.err('SubZoneBase', 'addLevel',
            'Level is not defined.');
    }
};

RG.World.SubZoneBase.prototype.toJSON = function() {
    const json = RG.World.Base.prototype.toJSON.call(this);
    json.nLevels = this._levels.length;
    json.levels = this._levels.map(level => level.getID());
    return json;
};

//------------------
// RG.World.Branch
//------------------
/* World.Branch is a branch of dungeon. A branch is linear
 * progression of connected levels (usually with increasing difficulty).
 * A branch can have
 * entry points to other branches (or out of the dungeon). */
RG.World.Branch = function(name) {
    RG.World.SubZoneBase.call(this, name);
    this.setType('branch');
    this._entrance = null;

    this.addEntrance = function(levelNumber) {
        const entrStairs = new Stairs('stairsUp');
        this.setEntrance(entrStairs, levelNumber);
    };

    /* Adds entrance stairs for this branch. */
    this.setEntrance = (stairs, levelNumber) => {
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
    };

    this.setEntranceLocation = entrance => {
        if (!RG.isNullOrUndef([entrance])) {
            this._entrance = entrance;
        }
        else {
            RG.err('World.Branch', 'setEntranceLocation',
                'Arg entrance is not defined.');
        }
    };

    /* Returns entrance/exit for the branch.*/
    this.getEntrance = () => getEntrance(this._levels, this._entrance);

    /* Connects specified level to the given stairs (Usually external to this
     * branch) .*/
    this.connectLevelToStairs = (nLevel, stairs) => {
        if (!connectLevelToStairs(this._levels, nLevel, stairs)) {
            RG.err('World.Branch', 'connectLevelToStairs',
                'Stairs must be first connected to other level.');
        }
    };

    /* Connects the added levels together.*/
    this.connectLevels = () => {
        connectLevelsLinear(this._levels);
    };

    this.toJSON = function() {
        const json = RG.World.SubZoneBase.prototype.toJSON.call(this);
        const obj = {};
        if (this._entrance) {
            obj.entrance = this._entrance;
        }
        return Object.assign(obj, json);
    };

};
RG.extend2(RG.World.Branch, RG.World.SubZoneBase);

//------------------
// RG.World.Dungeon
//------------------
/* Dungeons is a collection of branches.*/
RG.World.Dungeon = function(name) {
    RG.World.ZoneBase.call(this, name);
    this.setType('dungeon');
    this._entranceNames = [];

    /* Returns true if the dungeon has given branch.*/
    this.hasBranch = function(branch) {
        return this.hasSubZone(branch);
    };

    this.getBranches = function() {
        return this._subZones;
    };

    /* Sets the entry branch(es) for the dungeon. */
    this.setEntrance = branchName => {
        if (typeof branchName === 'string') {
            this._entranceNames = [branchName];
        }
        else {
            this._entranceNames = branchName;
        }
    };

    /* Adds one branch to the dungeon. Returns true if OK. */
    this.addBranch = function(branch) {
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
    };

    /* Returns all entrances/exits for the dungeon.*/
    this.getEntrances = function() {
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
    };

    this.toJSON = function() {
        const json = RG.World.ZoneBase.prototype.toJSON.call(this);
        const obj = {
            entranceNames: this._entranceNames,
            nBranches: this._subZones.length,
            branch: this._subZones.map(br => br.toJSON())
        };
        return Object.assign(obj, json);
    };

};
RG.extend2(RG.World.Dungeon, RG.World.ZoneBase);

//------------------
// RG.World.AreaTile
//------------------
/* Area-tile is a level which has entry/exit points on a number of edges.*/
RG.World.AreaTile = function(x, y, area) {
    this._tileX = x;
    this._tileY = y;
    this._area = area;

    this.cols = null;
    this.rows = null;

    this._level = null;

    /* Sets the level for this tile.*/
    this.setLevel = function(level) {
        this._level = level;
        this.cols = this._level.getMap().cols;
        this.rows = this._level.getMap().rows;
    };

    this.getLevel = () => this._level;
    this.getTileX = () => this._tileX;
    this.getTileY = () => this._tileY;

    /* Returns true for edge tiles.*/
    this.isEdge = function() {
        if (this.isNorthEdge()) {return true;}
        if (this.isSouthEdge()) {return true;}
        if (this.isWestEdge()) {return true;}
        if (this.isEastEdge()) {return true;}
        return false;
    };

    this.isNorthEdge = () => this._tileY === 0;
    this.isSouthEdge = () => this._tileY === (this._area.getSizeY() - 1);
    this.isWestEdge = () => this._tileX === 0;
    this.isEastEdge = () => this._tileX === (this._area.getSizeX() - 1);

    /* Connect this tile to east and south tiles */
    this.connect = function(eastTile, southTile) {
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
                    const stairs = new Stairs('passage',
                        this._level, levelEast);
                    const stairsEast = new Stairs('passage',
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
                    const stairs = new Stairs('passage',
                        this._level, levelSouth);
                    const connSouth = new Stairs('passage',
                        levelSouth, this._level);
                    stairs.setTargetStairs(connSouth);
                    connSouth.setTargetStairs(stairs);

                    this._level.addStairs(stairs, x, lastY);
                    levelSouth.addStairs(connSouth, x, 0);
                }
            }
        }
    };

    this.addZone = function(type, zone) {
        if (RG.isNullOrUndef([zone.tileX, zone.tileY])) {
            RG.err('World.AreaTile', 'addZone',
                'No tileX/tileY given!');
        }
        if (!this.zones[type]) {
            this.zones[type] = [];
        }
        this.zones[type].push(zone);
    };

    this.getZones = function(type) {
        if (type) {
            return this.zones[type];
        }
        let zones = [];
        Object.keys(this.zones).forEach(type => {
            zones = zones.concat(this.zones[type]);
        });
        return zones;
    };

    this.getLevels = () => {
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
    };

    this.toString = () => {
        let msg = `${this._tileX},${this._tileY}, ID: ${this._level.getID()}`;
        msg += ` nZones: ${this.getZones().length}`;
        return msg;
    };

    // All zones inside this tile
    this.zones = {
        Dungeon: [],
        Mountain: [],
        City: [],
        BattleZone: []
    };

    this.toJSON = () => ({
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
    });
};

RG.World.AreaTile.prototype.removeListeners = function() {
    Object.values(this.zones).forEach(zoneList => {
        zoneList.forEach(zone => {
            zone.removeListeners();
        });
    });
};

//------------------
// RG.World.Area
//------------------
/* Area is N x M area of tiles, with no linear progression like in dungeons.
 * Moving between tiles of areas happens by travelling to the edges of a tile.
 * Each tile is a level with special edge tiles.
 * */
RG.World.Area = function(name, sizeX, sizeY, cols, rows, levels) {
    RG.World.Base.call(this, name);
    this.setType('area');
    this._sizeX = parseInt(sizeX, 10);
    this._sizeY = parseInt(sizeY, 10);

    this._cols = cols || 30;
    this._rows = rows || 30;

    this.getSizeX = () => this._sizeX;
    this.getSizeY = () => this._sizeY;
    this._tiles = [];

    this._conf = {};

    // Control which tile has its zones created
    this.zonesCreated = {};

    // Keeps track which tiles contains real AreaTile objects
    this.tilesLoaded = [];

    this.isLoaded = (x, y) => this.tilesLoaded[x][y];
    this.setLoaded = (x, y) => {this.tilesLoaded[x][y] = true;};
    this.setUnloaded = (x, y) => {this.tilesLoaded[x][y] = false;};

    this.markAllZonesCreated = () => {
        Object.keys(this.zonesCreated).forEach(key => {
            this.zonesCreated[key] = true;
        });
    };

    this.markTileZonesCreated = (x, y) => {
        this.zonesCreated[x + ',' + y] = true;
    };
    this.tileHasZonesCreated = (x, y) => this.zonesCreated[x + ',' + y];

    this._init(levels);

};
RG.extend2(RG.World.Area, RG.World.Base);

RG.World.Area.prototype.getTiles = function() {
    return this._tiles;
};

RG.World.Area.prototype.setConf = function(conf) {
    this._conf = conf;
};

RG.World.Area.prototype.getConf = function() {
    return this._conf;
};

RG.World.Area.prototype._init = function(levels) {
    // Create the tiles
    for (let x = 0; x < this._sizeX; x++) {
        const tileColumn = [];
        this.tilesLoaded.push([]);
        for (let y = 0; y < this._sizeY; y++) {
            this.zonesCreated[x + ',' + y] = false;
            const newTile = new RG.World.AreaTile(x, y, this);

            // Scale the forest gen based on tile size
            const forestConf = RG.getForestConf(this._cols, this._rows);
            let level = null;
            if (levels) {
                level = levels[x][y];
            }
            else {
                level = RG.FACT.createLevel('forest',
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
};

/* Connects all tiles together from the sides. */
RG.World.Area.prototype.connectTiles = function() {
    connectTiles(this._tiles, this._sizeX, this._sizeY);
};

RG.World.Area.prototype.getLevels = function() {
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
};

/* Returns tile X,Y which has the level with given ID. */
RG.World.Area.prototype.findTileXYById = function(id) {
    for (let x = 0; x < this._tiles.length; x++) {
        for (let y = 0; y < this._tiles[x].length; y++) {
            if (this.tilesLoaded[x][y]) {
                if (this._tiles[x][y].getLevel().getID() === id) {
                    return [x, y];
                }
            }
        }
    }
    return null;
};

/* Returns true if the area has given level as a tile level. */
RG.World.Area.prototype.hasTileWithId = function(id) {
    for (let x = 0; x < this._tiles.length; x++) {
        for (let y = 0; y < this._tiles[x].length; y++) {
            if (this.tilesLoaded[x][y]) {
                if (this._tiles[x][y].getLevel().getID() === id) {
                    return true;
                }
            }
            else if (this._tiles[x][y].level === id) {
                return true;
            }
        }
    }
    return false;
};

/* Returns true if the area has tiles with given levels or level IDs. */
RG.World.Area.prototype.hasTiles = function(arr) {
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
            RG.err('World.Area', 'hasTiles',
                `Invalid level given ${str}. Must be Map.Level/ID`);
        }
    });
    return result;
};

RG.World.Area.prototype.getTileXY = function(x, y) {
    if (x >= 0 && x < this.getSizeX() && y >= 0 && y < this.getSizeY()) {
        return this._tiles[x][y];
    }
    else {
        const sizeX = this.getSizeX();
        const sizeY = this.getSizeY();
        RG.err('World.Area', 'getTileXY',
            `Tile x,y (${x}, ${y}) is out of bounds (${sizeX}, ${sizeY}).`);
    }
    return null;
};

RG.World.Area.prototype.addZone = function(type, zone) {
    if (RG.isNullOrUndef([zone.tileX, zone.tileY])) {
        RG.err('World.Area', 'addZone',
            'No tileX/tileY given!');
    }
    this._tiles[zone.tileX][zone.tileY].addZone(type, zone);
    zone.setParent(this);
};

RG.World.Area.prototype.getZones = function(type) {
    let res = [];
    for (let x = 0; x < this._tiles.length; x++) {
        for (let y = 0; y < this._tiles[x].length; y++) {
            if (this.tilesLoaded[x][y]) {
                res = res.concat(this._tiles[x][y].getZones(type));
            }
        }
    }
    return res;
};

RG.World.Area.prototype.createAreaConfig = function() {
    return {
        name: this.getName(),
        maxX: this._sizeX,
        maxY: this._sizeY
    };
};

/* Serializes the Area into JSON. */
RG.World.Area.prototype.toJSON = function() {
    const json = RG.World.Base.prototype.toJSON.call(this);
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
        conf: this.getConf(),
        maxX: this._sizeX, maxY: this._sizeY,
        cols: this._cols, rows: this._rows,
        tiles: tilesJSON,
        tilesLoaded: this.tilesLoaded,
        zonesCreated: this.zonesCreated
    };
    return Object.assign(obj, json);
};


//------------------
// RG.World.Mountain
//------------------
/* Mountains are places consisting of tiles and dungeons. Mountain has few
 * special tiles representing the summit.
 */
RG.World.Mountain = function(name) {
    RG.World.ZoneBase.call(this, name);
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

    this.findLevel = (name, nLevel) => {
        const faces = this.getFaces();
        const summits = this.getSummits();
        let level = findLevel(name, faces, nLevel);
        if (!level) {
            level = findLevel(name, summits, nLevel);
        }
        return level;
    };

    this.addSummit = summit => {
        this.addSubZone(summit);
    };

    this.addFace = face => {
        this.addSubZone(face);
    };

    this.getFaces = () => (
        this._subZones.filter(sz => sz.getType() === 'face')
    );

    this.getSummits = () => (
        this._subZones.filter(sz => sz.getType() === 'summit')
    );

    this.connectFaceAndSummit = function(face, summit, l1, l2) {
        const [sz1, sz2] = this.getSubZoneArgs(face, summit);
        if (sz2.getType() !== 'summit') {
            const type = sz2.getType();
            RG.err('World.Mountain', 'connectFaceAndSummit',
                `Expected 2nd arg summit, got: ${type}`);
        }
        const level1 = sz1.getLevels(l1);
        const level2 = sz2.getLevels(l2);
        const connFace = {y: () => 0, level: level1};
        const connSummit = {level: level2};
        connectLevelsConstrained(connFace, connSummit);
    };

    this.connectSubZones = function(s1Arg, s2Arg, l1, l2) {
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
        RG.World.ZoneBase.prototype.connectSubZones.call(
            this, s1Arg, s2Arg, l1, l2);
    };

};
RG.extend2(RG.World.Mountain, RG.World.ZoneBase);

/* Serializes the World.Mountain object. */
RG.World.Mountain.prototype.toJSON = function() {
    const json = RG.World.ZoneBase.prototype.toJSON.call(this);
    const obj = {
        nFaces: this.getFaces().length,
        face: this.getFaces().map(face => face.toJSON()),
        nSummits: this.getSummits().length,
        summit: this.getSummits().map(summit => summit.toJSON())
    };
    return Object.assign(obj, json);
};

//----------------------
// RG.World.MountainFace
//----------------------
/* One side (face) of the mountain. Each side consists of stages, of X by 1
 * Areas. This is also re-used as a mountain summit because internally it's the
 * same. */
RG.World.MountainFace = function(name) {
    RG.World.SubZoneBase.call(this, name);
    this.setType('face');
    this._entrance = null;

    /* Entrance is created at the bottom by default. */
    this.addEntrance = levelNumber => {
        if (this._entrance === null) {
            const level = this._levels[levelNumber];
            const stairs = new Stairs('stairsDown', level);
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
            RG.err('World.MountainFace', 'addEntrance',
                'Entrance already added.');
        }
    };

    this.setEntrance = stairs => {
        this._entrance = stairs;
    };

    this.setEntranceLocation = entrance => {
        if (!RG.isNullOrUndef([entrance])) {
            this._entrance = entrance;
        }
        else {
            RG.err('World.MountainFace', 'setEntranceLocation',
                'Arg entrance is not defined.');
        }
    };

    this.getEntrance = () => getEntrance(this._levels, this._entrance);

    this.connectLevelToStairs = (nLevel, stairs) => {
        if (!connectLevelToStairs(this._levels, nLevel, stairs)) {
            RG.err('World.MountainFace', 'connectLevelToStairs',
                'Stairs must be first connected to other level.');
        }
    };

    this.toJSON = function() {
        const json = RG.World.SubZoneBase.prototype.toJSON.call(this);
        const obj = {};
        if (this._entrance) {
            obj.entrance = this._entrance;
        }
        return Object.assign(obj, json);
    };

};
RG.extend2(RG.World.MountainFace, RG.World.SubZoneBase);

//-------------------------
// RG.World.MountainSummit
//-------------------------
/* A summit of the mountain consisting of at least one Map.Level. */
RG.World.MountainSummit = function(name) {
    RG.World.SubZoneBase.call(this, name);
    this.setType('summit');

    this.getEntrance = () => null;

    this.connectLevelToStairs = (nLevel, stairs) => {
        if (!connectLevelToStairs(this._levels, nLevel, stairs)) {
            RG.err('World.MountainSummit', 'connectLevelToStairs',
                'Stairs must be first connected to other level.');
        }
    };

    this.toJSON = function() {
        return RG.World.SubZoneBase.prototype.toJSON.call(this);
    };

};
RG.extend2(RG.World.MountainSummit, RG.World.SubZoneBase);

//-------------------------
// RG.World.City
//-------------------------
/* A city in the world. A special features of the city can be queried through
* this object. */
RG.World.City = function(name) {
    RG.World.ZoneBase.call(this, name);
    this.setType('city');

    this.getQuarters = function() {
        return this._subZones;
    };

    this.addQuarter = function(quarter) {
        if (!this.addSubZone(quarter)) {
            RG.err('World.City', 'addQuarter',
                `City ${this.getName()} quarter not defined.`);
        }
    };

    this.abutQuarters = function(q1, q2, l1, l2) {
        const res = connectSubZoneEdges(this._subZones, q1, q2, l1, l2);
        return res;
    };

    this.hasQuarter = function(q) {
        return this.hasSubZone(q);
    };

    this.toJSON = function() {
        const json = RG.World.ZoneBase.prototype.toJSON.call(this);
        const obj = {
            nQuarters: this._subZones.length,
            quarter: this._subZones.map(q => q.toJSON())
        };
        return Object.assign(obj, json);
    };

};
RG.extend2(RG.World.City, RG.World.ZoneBase);

//-----------------------------
// RG.World.CityQuarter
//-----------------------------
/* City quarter is a subset of the City. It contains the actual level and
 * special features for that level. */
RG.World.CityQuarter = function(name) {
    RG.World.SubZoneBase.call(this, name);
    this.setType('quarter');
    this._entrance = null;

    this._shops = [];
    this.addShop = shop => this._shops.push(shop);
    this.getShops = () => this._shops;

    this.setEntranceLocation = entrance => {
        if (!RG.isNullOrUndef([entrance])) {
            this._entrance = entrance;
        }
        else {
            RG.err('World.CityQuarter', 'setEntranceLocation',
                'Arg entrance is not defined.');
        }
    };

    /* Returns entrance/exit for the quarter.*/
    this.getEntrance = () => getEntrance(this._levels, this._entrance);

    this.addEntrance = levelNumber => {
        if (this._entrance === null) {
            const level = this._levels[levelNumber];
            const stairs = new Stairs('stairsDown', level);
            level.addStairs(stairs, 1, 1);
            this._entrance = {levelNumber, x: 1, y: 1};
        }
        else {
            RG.err('World.CityQuarter', 'addEntrance',
                'Entrance already added.');
        }
    };

    /* Connects specified level to the given stairs (Usually external to this
     * quarter) .*/
    this.connectLevelToStairs = (nLevel, stairs) => {
        if (!connectLevelToStairs(this._levels, nLevel, stairs)) {
            RG.err('World.CityQuarter', 'connectLevelToStairs',
                'Stairs must be first connected to other level.');
        }
    };

    /* Connects levels in linear fashion 0->1->2->...->N. */
    this.connectLevels = () => {
        connectLevelsLinear(this._levels);
    };

    this.toJSON = function() {
        const json = RG.World.SubZoneBase.prototype.toJSON.call(this);
        const obj = {
            shops: this._shops.map(shop => shop.toJSON())
        };
        if (this._entrance) {
            obj.entrance = this._entrance;
        }
        return Object.assign(obj, json);
    };
};
RG.extend2(RG.World.CityQuarter, RG.World.SubZoneBase);

RG.World.CityQuarter.prototype.removeListeners = function() {
    this._shops.forEach(shop => {
        if (!shop.isAbandoned()) {
            // Must clean up these to avoid memory leaks
            RG.POOL.removeListener(shop);
        }
    });
};

//-------------------------
// RG.World.BattleZone
//-------------------------
/* A battle zone encapsulates battle construct, armies and the battle level. */
RG.World.BattleZone = function(name) {
    RG.World.ZoneBase.call(this, name);
    this.setType('battlezone');

    this._levels = [];

    this.addLevel = level => {this._levels.push(level);};
    this.getLevels = () => this._levels;

    this.toJSON = function() {
        const json = RG.World.ZoneBase.prototype.toJSON.call(this);
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
    };

};
RG.extend2(RG.World.BattleZone, RG.World.ZoneBase);

//-----------------------------
// RG.World.Top
//-----------------------------
/* Largest place at the top of hierarchy. Contains a number of areas,
 * mountains, dungeons and cities. */
RG.World.Top = function(name) {
    RG.World.Base.call(this, name);
    this.setType('world');

    // const _allLevels = {}; // Lookup table for all levels
    this._areas = [];

    this.currAreaIndex = 0;
    this._conf = {};
    this.getConf = () => this._conf;
    this.setConf = conf => {this._conf = conf;};

    /* Adds an area into the world. */
    this.addArea = function(area) {
        area.setParent(this);
        this._areas.push(area);
    };

    this.getLevels = () => {
        let levels = [];
        this._areas.map(area => {
            levels = levels.concat(area.getLevels());
        });
        return levels;
    };
    this.getAreas = () => (this._areas);

    /* Returns all zones of given type. */
    this.getZones = type => {
        let zones = [];
        this._areas.forEach(a => {
            zones = zones.concat(a.getZones(type));
        });
        return zones;
    };

    /* Returns all stairs in the world. */
    this.getStairs = () => {
        const res = [];
        this.getZones().forEach(zone =>
            zone.getLevels().forEach(l =>
                l.getStairs().forEach(stair =>
                    res.push(stair)
                )
            )
        );
        return res;
    };

    this.getCurrentArea = () => {
        return this._areas[this.currAreaIndex];
    };

    this.toJSON = function() {
        const json = RG.World.Base.prototype.toJSON.call(this);
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
    };

};
RG.extend2(RG.World.Top, RG.World.Base);

/* Creates config for each area. This is mainly required for testing. */
RG.World.Top.prototype.createAreaConfig = function() {
    const areaConf = [];
    this._areas.forEach(function(area) {
        areaConf.push(area.createAreaConfig());
    });
    return areaConf;
};

//---------------------------------------------------------------------------
// LEVEL FEATURES
//---------------------------------------------------------------------------

RG.World.Shop = function() {
    this._shopkeeper = null;
    this._level = null;
    this._coord = [];
    this._isAbandoned = false;

    this.setLevel = function(level) {
        this._level = level;
    };


    this.setCoord = function(coord) {
        this._coord = coord;
    };

    this.hasNotify = true;
};

RG.World.Shop.prototype.isAbandoned = function() {
    return this._isAbandoned;
};

/* Listens to shopkeeper killed event. */
RG.World.Shop.prototype.notify = function(evtName, args) {
    if (this._shopkeeper) {
        if (args.actor.getID() === this._shopkeeper.getID()) {
            this.setShopAbandoned();
            RG.POOL.removeListener(this);
        }
    }
};

RG.World.Shop.prototype.getLevel = function() {
    return this._level;
};

RG.World.Shop.prototype.getShopkeeper = function() {
    return this._shopkeeper;
};

RG.World.Shop.prototype.setShopkeeper = function(keeper) {
    this._shopkeeper = keeper;
    RG.POOL.listenEvent(RG.EVT_ACTOR_KILLED, this);
};

RG.World.Shop.prototype.setShopAbandoned = function() {
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
};

RG.World.Shop.prototype.getCell = function(xy) {
    return this._level.getMap().getCell(xy[0], xy[1]);
};

RG.World.Shop.prototype.reclaimShop = function(actor) {
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
                        item.add(new RG.Component.Unpaid());
                    }
                });
            }
        });
    }
};

/* Get empty cells of the shop (no items in cells). */
RG.World.Shop.prototype.emptyCells = function() {
    const result = [];
    this._coord.forEach(xy => {
        const cell = this._level.getMap().getCell(xy[0], xy[1]);
        if (!cell.hasItems()) {
            result.push(cell);
        }
    });
    return result;
};

/* Adds new items to the empty cells of the shop. */
RG.World.Shop.prototype.refreshShopItems = function(newItems) {
    let nItem = 0;
    this._coord.forEach(xy => {
        const cell = this._level.getMap().getCell(xy[0], xy[1]);
        if (!cell.hasItems()) {
            if (nItem < newItems.length) {
                newItems[nItem].add('Unpaid', new RG.Component.Unpaid());
                this._level.addItem(newItems[nItem], xy[0], xy[1]);
                ++nItem;
            }
        }
    });
};

RG.World.Shop.prototype.toJSON = function() {
    const obj = {
        isAbandoned: this._isAbandoned,
        level: this._level.getID(),
        coord: this._coord
    };
    if (!this._isAbandoned) {
        obj.shopkeeper = this._shopkeeper.getID();
    }
    return obj;
};

module.exports = RG.World;

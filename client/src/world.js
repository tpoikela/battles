/*
 * Contains objects related to the game world in Battles. This includes areas,
 * dungeons, dungeon branches etc.
 */

/* Returns stairs leading to other branches/features. Used only for testing
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

/* Tries to connect stairs to level N in given levels. */
function connectLevelToStairs(levels, nLevel, stairs) {
    if (nLevel < levels.length) {
        const level = levels[nLevel];
        const otherQuartLevel = stairs.getSrcLevel();

        if (!RG.isNullOrUndef([otherQuartLevel])) {
            const down = !stairs.isDown();
            const newStairs = new Stairs(down,
                level, otherQuartLevel);
            const cell = level.getFreeRandCell();
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

/* Connects 2 sub-features like dungeon branch or city quarter together.*/
function connectSubFeatures(features, q1Arg, q2Arg, l1, l2) {
    if (RG.isNullOrUndef([l1, l2])) {
        RG.err('RG.World', 'connectSubFeatures',
            `l1 (${l1}) and l2 (${l2}) must be non-null and integers.`);
    }
    let q1 = q1Arg;
    let q2 = q2Arg;

    // Lookup objects by name if they are string
    if (typeof q1Arg === 'string' && typeof q2Arg === 'string') {
        q1 = features.find(q => q.getName() === q1Arg);
        q2 = features.find(q => q.getName() === q2Arg);
    }

    if (RG.isNullOrUndef([q1, q2])) {
        RG.err('RG.World', 'connectSubFeatures',
            'Cannot connect null features. Check the names/refs.');
    }

    let s2IsDown = true;
    if (l1 > l2) {s2IsDown = false;}
    const b2Stairs = new Stairs(s2IsDown);
    const b2Levels = q2.getLevels();
    if (l2 < b2Levels.length) {
        const cell = b2Levels[l2].getFreeRandCell();
        b2Levels[l2].addStairs(b2Stairs, cell.getX(), cell.getY());
        b2Stairs.setSrcLevel(b2Levels[l2]);
        q1.connectLevelToStairs(l1, b2Stairs);
    }
    else {
        RG.err('RG.World', 'connectSubFeatures',
            'Level ' + l2 + " doesn't exist in sub-feature " + q2.getName());
    }

}


const RG = require('./rg.js');
RG.Factory = require('./factory');

const Stairs = RG.Element.Stairs;

RG.World = {};

/* Base class for world places. Each place has name and type + full hierarchical
* name to trace where the place is in hierarchy. */
RG.World.Base = function(name) {
    this.name = name;
    this.type = 'base';
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

/* World.Branch, is a branch of dungeon. A branch is linear
 * progression of connected levels (usually with increasing difficulty).
 * Branch can have
 * entry points to other branches (or out of the dungeon). */
RG.World.Branch = function(name) {
    RG.World.Base.call(this, name);
    this.setType('branch');
    const _levels = [];
    let _entrance = null;
    let _numCount = 1;
    let _dungeon = null;

    /* Sets/gets the dungeon where this branch is located. */
    this.setDungeon = function(dungeon) {_dungeon = dungeon;};
    this.getDungeon = function() {return _dungeon;};

    this.getLevels = function() {return _levels;};

    /* Returns stairs leading to other branches/features. Used only for testing
    * purposes. */
    this.getStairsOther = function() {
        return getStairsOther(this.getName(), _levels);
    };

    /* Adds entrance stairs for this branch. */
    this.setEntrance = function(stairs, levelNumber) {
        if (levelNumber < _levels.length) {
            const level = _levels[levelNumber];
            const cell = level.getFreeRandCell();
            const x = cell.getX();
            const y = cell.getY();
            level.addStairs(stairs, x, y);
            _entrance = {levelNumber, x, y};
        }
        else {
            RG.err('World.Branch', 'setEntrance',
                `Invalid level number. Must be < ${_levels.length}`);
        }
    };

    this.setEntranceLocation = function(entrance) {
        if (!RG.isNullOrUndef([entrance])) {
            _entrance = entrance;
        }
        else {
            RG.err('World.Branch', 'setEntranceLocation',
                'Arg entrance is not defined.');
        }
    };

    /* Returns entrance/exit for the branch.*/
    this.getEntrance = function() {
        if (_entrance === null) {return null;}
        const entrLevel = _levels[_entrance.levelNumber];
        const entrCell = entrLevel.getMap().getCell(_entrance.x, _entrance.y);
        return entrCell.getStairs();
    };

    /* Connects specified level to the given stairs (Usually external to this
     * branch) .*/
    this.connectLevelToStairs = function(nLevel, stairs) {
        if (!connectLevelToStairs(_levels, nLevel, stairs)) {
            RG.err('World.Branch', 'connectLevelToStairs',
                'Stairs must be first connected to other level.');
        }
    };

    this.hasLevel = function(level) {
        const index = _levels.indexOf(level);
        return index >= 0;
    };

    this.addLevel = function(level) {
        if (!this.hasLevel(level)) {
            level.setLevelNumber(_numCount++);
            _levels.push(level);
            level.setParent(this.getName());
        }
        else {
            RG.err('World.Branch', 'addLevel',
                'Trying to add existing level. ');
        }
    };

    /* Connects the added levels together.*/
    this.connectLevels = function() {
        const nLevels = _levels.length;
        const arrStairsDown = [];
        const arrStairsUp = [];

        for (let nl = 0; nl < nLevels; nl++) {
            const src = _levels[nl];

            // Create stairs down
            if (nl < nLevels - 1) {
                const targetDown = _levels[nl + 1];
                const stairsDown = new Stairs(true, src, targetDown);
                const stairCell = src.getFreeRandCell();
                src.addStairs(stairsDown, stairCell.getX(), stairCell.getY());
                arrStairsDown.push(stairsDown);
            }

            // Create stairs up
            if (nl > 0) {
                const targetUp = _levels[nl - 1];
                const stairsUp = new Stairs(false, src, targetUp);
                const stairCell = src.getFreeRandCell();
                src.addStairs(stairsUp, stairCell.getX(), stairCell.getY());
                arrStairsUp.push(stairsUp);
            }
        }

        // Finally connect the stairs together
        for (let nl = 0; nl < nLevels; nl++) {
            if (nl < nLevels - 1) {
                arrStairsDown[nl].connect(arrStairsUp[nl]);
            }
        }
    };

    this.toJSON = function() {
        const obj = {
            name: this.getName(),
            hierName: this.getHierName(),
            nLevels: _levels.length,
            levels: _levels.map(level => level.getID())
        };
        if (_entrance) {
            obj.entrance = _entrance;
        }
        return obj;
    };

};
RG.extend2(RG.World.Branch, RG.World.Base);

/* Dungeons is a collection of branches.*/
RG.World.Dungeon = function(name) {
    RG.World.Base.call(this, name);
    this.setType('dungeon');
    const _branches = [];
    let _entranceNames = [];

    /* Returns true if the dungeon has given branch.*/
    this.hasBranch = function(branch) {
        const index = _branches.indexOf(branch);
        return index >= 0;
    };

    this.getBranches = function() {
        return _branches;
    };

    /* Sets the entry branch(es) for the dungeon. */
    this.setEntrance = function(branchName) {
        if (typeof branchName === 'string') {
            _entranceNames = [branchName];
        }
        else {
            _entranceNames = branchName;
        }
    };

    /* Adds one branch to the dungeon. Returns true if OK. */
    this.addBranch = function(branch) {
        if (!this.hasBranch(branch)) {
            _branches.push(branch);
            branch.setDungeon(this);

            // By default, have at least one entrance
            if (_branches.length === 1) {
                this.setEntrance(branch.getName());
            }
            return true;
        }
        return false;
    };

    /* Get all levels for this dungeon. */
    this.getLevels = function() {
        let res = [];
        for (let i = 0; i < _branches.length; i++) {
            res = res.concat(_branches[i].getLevels());
        }
        return res;
    };

    /* Returns all entrances/exits for the dungeon.*/
    this.getEntrances = function() {
        const res = [];
        for (let i = 0; i < _branches.length; i++) {
            const branch = _branches[i];
            if (_entranceNames.indexOf(branch.getName()) >= 0) {
                res.push(branch.getEntrance());
            }
        }
        return res;
    };

    /* Connects two branches b1 and b2 together from specified level
     * numbers l1 and l2. */
    this.connectBranches = function(b1Arg, b2Arg, l1, l2) {
        connectSubFeatures(_branches, b1Arg, b2Arg, l1, l2);
    };

    this.toJSON = function() {
        const obj = {
            name: this.getName(),
            hierName: this.getHierName(),
            entranceNames: this._entranceNames,
            nBranches: _branches.length,
            branch: _branches.map(br => br.toJSON())
        };
        return obj;
    };

};
RG.extend2(RG.World.Dungeon, RG.World.Base);

/* Area-tile is a level which has entry/exit points on a number of edges.*/
RG.World.AreaTile = function(x, y, area) {
    const _tileX = x;
    const _tileY = y;
    const _area = area;

    this.cols = null;
    this.rows = null;

    let _level = null;

    /* Sets the level for this tile.*/
    this.setLevel = function(level) {
        _level = level;
        this.cols = _level.getMap().cols;
        this.rows = _level.getMap().rows;
    };

    this.getLevel = function() {return _level;};
    this.getTileX = function() {return _tileX;};
    this.getTileY = function() {return _tileY;};

    /* Returns true for edge tiles.*/
    this.isEdge = function() {
        if (this.isNorthEdge()) {return true;}
        if (this.isSouthEdge()) {return true;}
        if (this.isWestEdge()) {return true;}
        if (this.isEastEdge()) {return true;}
        return false;
    };

    this.isNorthEdge = function() {return _tileY === 0;};
    this.isSouthEdge = function() {return _tileY === (_area.getMaxY() - 1);};
    this.isWestEdge = function() {return _tileX === 0;};
    this.isEastEdge = function() {return _tileX === (_area.getMaxX() - 1);};

    /* Connect this tile to east and south tiles */
    this.connect = function(eastTile, southTile) {
        const lastX = this.cols - 1;
        const lastY = this.rows - 1;

        // Connect to east tile
        if (!RG.isNullOrUndef([eastTile])) {
            const levelEast = eastTile.getLevel();
            const map = _level.getMap();
            const mapEast = levelEast.getMap();

            for (let y = 1; y <= lastY - 1; y++) {
                const cell = map.getCell(lastX, y);
                const cellEast = mapEast.getCell(0, y);

                if (cell.isFree() && cellEast.isFree()) {
                    const stairs = new Stairs(true, _level, levelEast);
                    const stairsEast = new Stairs(false, levelEast, _level);
                    stairs.setTargetStairs(stairsEast);
                    stairsEast.setTargetStairs(stairs);

                    _level.addStairs(stairs, lastX, y);
                    levelEast.addStairs(stairsEast, 0, y);
                }
            }

        }

        // Connect to south tile
        if (!RG.isNullOrUndef([southTile])) {
            const levelSouth = southTile.getLevel();
            const map = _level.getMap();
            const mapSouth = levelSouth.getMap();

            for (let x = 1; x <= lastX - 1; x++) {
                const cell = map.getCell(x, lastY);
                const cellSouth = mapSouth.getCell(x, 0);

                if (cell.isFree() && cellSouth.isFree()) {
                    const stairs = new Stairs(true, _level, levelSouth);
                    const stairsSouth = new Stairs(false, levelSouth, _level);
                    stairs.setTargetStairs(stairsSouth);
                    stairsSouth.setTargetStairs(stairs);
                    _level.addStairs(stairs, x, lastY);
                    levelSouth.addStairs(stairsSouth, x, 0);
                }
            }
        }
    };

    this.toJSON = function() {
        return {
            x: _tileX, y: _tileY, level: _level.getID()
        };
    };
};

/* Area is N x M area of tiles, with no linear progression like in dungeons.
 * Moving between tiles of areas happens by travelling to the edges of a tile.
 * Each tile is a level with special edge tiles.
 * */
RG.World.Area = function(name, maxX, maxY, cols, rows, levels) {
    RG.World.Base.call(this, name);
    this.setType('area');
    const _maxX = maxX;
    const _maxY = maxY;

    const _cols = cols || 30;
    const _rows = rows || 30;

    this.getMaxX = () => (_maxX);
    this.getMaxY = () => (_maxY);
    const _tiles = [];

    // Subfeatures inside this tile
    this.dungeons = [];
    this.mountains = [];
    this.cities = [];

    this._init = function() {
        // Create the tiles
        for (let x = 0; x < _maxX; x++) {
            const tileColumn = [];
            for (let y = 0; y < _maxY; y++) {
                const newTile = new RG.World.AreaTile(x, y, this);

                // Scale the forest gen based on tile size
                const xMult = _cols / RG.LEVEL_MEDIUM_X;
                const yMult = _rows / RG.LEVEL_MEDIUM_Y;
                const mult = xMult * yMult;

                const levelConf = {
                    ratio: 0.5,
                    nForests: Math.floor(mult * 30),
                    forestSize: 100
                };
                let level = null;
                if (levels) {
                    level = levels[x][y];
                }
                else {
                    level = RG.FACT.createLevel('forest',
                        _cols, _rows, levelConf);
                }
                level.setParent(this.getName());
                newTile.setLevel(level);
                tileColumn.push(newTile);
            }
            _tiles.push(tileColumn);
        }

        // Connect the tiles, unless levels already given (and connected)
        if (!levels) {
            for (let x = 0; x < _maxX; x++) {
                for (let y = 0; y < _maxY; y++) {
                    if (x < _maxX - 1 && y < _maxY - 1) {
                        _tiles[x][y].connect(
                            _tiles[x + 1][y], _tiles[x][y + 1]);
                    }
                    else if (x < _maxX - 1) {
                        _tiles[x][y].connect(_tiles[x + 1][y], null);
                    }
                    else if (y < _maxY - 1) {
                        _tiles[x][y].connect(null, _tiles[x][y + 1]);
                    }
                }
            }
        }
    };

    this._init();

    this.getLevels = function() {
        let res = [];
        for (let x = 0; x < _tiles.length; x++) {
            for (let y = 0; y < _tiles[x].length; y++) {
                res.push(_tiles[x][y].getLevel());
            }
        }
        this.dungeons.forEach(d => {res = res.concat(d.getLevels());});
        this.mountains.forEach(d => {res = res.concat(d.getLevels());});
        this.cities.forEach(d => {res = res.concat(d.getLevels());});
        return res;
    };

    this.getTiles = function() {
        return _tiles;
    };

    this.getTileXY = function(x, y) {
        if (x >= 0 && x < this.getMaxX() && y >= 0 && y < this.getMaxY()) {
            return _tiles[x][y];
        }
        else {
            const maxX = this.getMaxX();
            const maxY = this.getMaxY();
            RG.err('World.Area', 'getTileXY',
                `Tile x,y (${x}, ${y}) is out of bounds (${maxX}, ${maxY}).`);
        }
        return null;
    };

    this.getDungeons = function() {return this.dungeons;};
    this.getMountains = function() {return this.mountains;};
    this.getCities = function() {return this.cities;};

    this.addDungeon = function(dungeon) {
        this.dungeons.push(dungeon);
    };

    this.addMountain = function(mountain) {
        this.mountains.push(mountain);
    };

    this.addCity = function(city) {
        this.cities.push(city);
    };

    this.toJSON = function() {
        const tilesJSON = [];
        _tiles.forEach(tileCol => {
            const tileColJSON = tileCol.map(tile => tile.toJSON());
            tilesJSON.push(tileColJSON);
        });

        return {
            name: this.getName(),
            hierName: this.getHierName(),
            maxX: _maxX, maxY: _maxY,
            cols: _cols, rows: _rows,
            tiles: tilesJSON,
            nDungeons: this.dungeons.length,
            dungeon: this.dungeons.map(dg => dg.toJSON()),
            nMountains: this.mountains.length,
            mountain: this.mountains.map(mt => mt.toJSON()),
            nCities: this.cities.length,
            city: this.cities.map(city => city.toJSON())
        };
    };

};
RG.extend2(RG.World.Area, RG.World.Base);

/* Mountains are places consisting of tiles and dungeons. Mountain has few
 * special * tiles representing the summit.
 */
RG.World.Mountain = function(name) {
    RG.World.Base.call(this, name);
    this.setType('mountain');

    const _summits = [];
    const _faces = [];

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
from-the-side view. Bit weird but should be fine.

*/
    this.getLevels = function() {
        let res = [];
        _faces.forEach(face => {
            res = res.concat(face.getLevels());

        });
        return res;
    };

    this.addSummit = (summit) => {
        _summits.push(summit);
    };

    this.addFace = (face) => {
        _faces.push(face);
    };

    this.getFaces = () => _faces;
    this.getSummits = () => _summits;

    this.getEntrances = () => {
        const res = [];
        _faces.forEach(face => {
            res.push(face.getEntrance());
        });
        return res;
    };

    /* Connects two faces b1 and b2 together from specified level
     * numbers l1 and l2. */
    this.connectFaces = function(f1Arg, f2Arg, l1, l2) {
        connectSubFeatures(_faces, f1Arg, f2Arg, l1, l2);
    };

    this.connectFaceAndSummit = function(face, summit, l1, l2) {
        const faceObj = _faces.find( f => f.getName() === face);
        const summitObj = _summits.find(s => s.getName() === summit);
        connectSubFeatures([faceObj, summitObj], face, summit, l1, l2);
    };

    this.toJSON = function() {
        const obj = {
            name: this.getName(),
            hierName: this.getHierName(),
            nFaces: _faces.length,
            face: _faces.map(face => face.toJSON()),
            nSummits: _summits.length,
            summit: _summits.map(summit => summit.toJSON())
        };
        return obj;
    };

};
RG.extend2(RG.World.Mountain, RG.World.Base);

/* One side (face) of the mountain. Each side consists of stages, of X by 1
 * Areas. This is also re-used as a mountain summit because internally it's the
 * same. */
RG.World.MountainFace = function(name) {
    RG.World.Base.call(this, name);
    this.setType('face');

    const _levels = [];
    let _entrance = null;

    this.addLevel = function(level) {
        _levels.push(level);
        level.setParent(this.getName());
    };

    /* Entrance is created at the bottom by default. */
    this.addEntrance = function(levelNumber) {
        if (_entrance === null) {
            const level = _levels[levelNumber];
            const stairs = new Stairs(true, level);
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
            _entrance = {levelNumber, x, y};
        }
        else {
            RG.err('World.MountainFace', 'addEntrance',
                'Entrance already added.');
        }
    };

    /* Needed for connectivity testing. */
    this.getStairsOther = function() {
        return getStairsOther(this.getName(), _levels);
    };

    this.getLevels = function() {
        return _levels;
    };

    this.setEntrance = function(stairs) {
        _entrance = stairs;
    };

    this.setEntranceLocation = function(entrance) {
        if (!RG.isNullOrUndef([entrance])) {
            _entrance = entrance;
        }
        else {
            RG.err('World.MountainFace', 'setEntranceLocation',
                'Arg entrance is not defined.');
        }
    };

    this.getEntrance = function() {
        if (_entrance === null) {return null;}
        const entrLevel = _levels[_entrance.levelNumber];
        const entrCell = entrLevel.getMap().getCell(_entrance.x, _entrance.y);
        return entrCell.getStairs();
    };

    this.connectLevelToStairs = function(nLevel, stairs) {
        if (!connectLevelToStairs(_levels, nLevel, stairs)) {
            RG.err('World.MountainFace', 'connectLevelToStairs',
                'Stairs must be first connected to other level.');
        }
    };

    this.toJSON = function() {
        const obj = {
            name: this.getName(),
            hierName: this.getHierName(),
            nLevels: _levels.length,
            levels: _levels.map(level => level.getID())
        };
        if (_entrance) {
            obj.entrance = _entrance;
        }
        return obj;
    };

};
RG.extend2(RG.World.MountainFace, RG.World.Base);

/* A city in the world. A special features of the city can be queried through
* this object. */
RG.World.City = function(name) {
    RG.World.Base.call(this, name);
    this.setType('city');
    const _quarters = [];

    this.getLevels = function() {
        let result = [];
        _quarters.forEach(q => {
            result = result.concat(q.getLevels());
        });
        return result;
    };

    this.getEntrances = function() {
        const entrances = [];
        _quarters.forEach(q => {
            const qEntr = q.getEntrance();
            if (qEntr) {
                entrances.push(qEntr);
            }
        });
        return entrances;
    };

    this.getQuarters = function() {
        return _quarters;
    };

    this.addQuarter = function(quarter) {
        if (!RG.isNullOrUndef([quarter])) {
            _quarters.push(quarter);
        }
        else {
            RG.err('World.City', 'addQuarter',
                `City ${this.getName()} quarter not defined.`);
        }
    };

    this.toJSON = function() {
        const obj = {
            name: this.getName(),
            hierName: this.getHierName(),
            // nLevels: _levels.length,
            // levels: _levels.map(level => level.getID()),
            // entrances: _entrances,
            nQuarters: _quarters.length,
            quarter: _quarters.map(q => q.toJSON())
        };
        return obj;
    };

    this.hasQuarter = function(q) {
        const index = _quarters.indexOf(q);
        return index >= 0;
    };

    /* Connects two city quarters together. */
    this.connectQuarters = function(q1Arg, q2Arg, l1, l2) {
        connectSubFeatures(_quarters, q1Arg, q2Arg, l1, l2);
    };

};
RG.extend2(RG.World.City, RG.World.Base);

/* City quarter is a subset of the City. It contains the actual level and
 * special features for that level. */
RG.World.CityQuarter = function(name) {
    RG.World.Base.call(this, name);
    this.setType('quarter');
    const _levels = [];
    let _entrance = null;

    this.getLevels = () => (_levels);

    this.addLevel = function(level) {
        _levels.push(level);
        level.setParent(this.getName());
    };

    this.getStairsOther = function() {
        return getStairsOther(this.getName(), _levels);
    };

    this.setEntranceLocation = function(entrance) {
        if (!RG.isNullOrUndef([entrance])) {
            _entrance = entrance;
        }
        else {
            RG.err('World.CityQuarter', 'setEntranceLocation',
                'Arg entrance is not defined.');
        }
    };

    /* Returns entrance/exit for the quarter.*/
    this.getEntrance = function() {
        if (_entrance === null) {return null;}
        const entrLevel = _levels[_entrance.levelNumber];
        const entrCell = entrLevel.getMap().getCell(_entrance.x, _entrance.y);
        return entrCell.getStairs();
    };

    this.addEntrance = function(levelNumber) {
        if (_entrance === null) {
            const level = _levels[levelNumber];
            const stairs = new Stairs(true, level);
            level.addStairs(stairs, 1, 1);
            _entrance = {levelNumber, x: 1, y: 1};
        }
        else {
            RG.err('World.CityQuarter', 'addEntrance',
                'Entrance already added.');
        }
    };

    /* Connects specified level to the given stairs (Usually external to this
     * quarter) .*/
    this.connectLevelToStairs = function(nLevel, stairs) {
        if (!connectLevelToStairs(_levels, nLevel, stairs)) {
            RG.err('World.CityQuarter', 'connectLevelToStairs',
                'Stairs must be first connected to other level.');
        }
    };

    this.toJSON = function() {
        const obj = {
            name: this.getName(),
            hierName: this.getHierName(),
            nLevels: _levels.length,
            levels: _levels.map(level => level.getID())
        };
        if (_entrance) {
            obj.entrance = _entrance;
        }
        return obj;
    };
};
RG.extend2(RG.World.CityQuarter, RG.World.Base);

/* Largest place at the top of hierarchy. Contains a number of areas,
 * mountains, dungeons and cities. */
RG.World.World = function(name) {
    RG.World.Base.call(this, name);
    this.setType('world');

    const _allLevels = {}; // Lookup table for all levels
    const _areas = [];
    let _dungeons = [];
    let _mountains = [];
    let _cities = [];

    /* Adds an area into the world. */
    this.addArea = function(area) {
        _areas.push(area);
        this.addLevels(area.getLevels());
        _dungeons = _dungeons.concat(area.getDungeons());
        _mountains = _mountains.concat(area.getMountains());
        _cities = _cities.concat(area.getCities());
    };

    /* Adds the array of levels to the global map. */
    this.addLevels = function(levels) {
        levels.forEach(level => {
            const id = level.getID();
            if (!_allLevels.hasOwnProperty(id)) {
                _allLevels[id] = level;
            }
            else {
                RG.err('World.World', 'addLevels',
                    `Level ID ${id} already exists.`);
            }
        });
    };

    this.getLevels = function() {
        return Object.keys(_allLevels).map(key => _allLevels[key]);
    };

    this.getAreas = () => (_areas);
    // TODO these functions should directly query the areas.
    this.getDungeons = () => (_dungeons);
    this.getMountains = () => (_mountains);
    this.getCities = () => (_cities);

    this.toJSON = function() {
        const area = _areas.map(area => area.toJSON());
        return {
            name: this.getName(),
            hierName: this.getHierName(),
            nAreas: _areas.length,
            area
        };
    };
};
RG.extend2(RG.World.World, RG.World.Base);

module.exports = RG.World;

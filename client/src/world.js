/*
 * Contains objects related to the game world in Battles. This includes areas,
 * dungeons, dungeon branches etc.
 */

const RG = require('./rg.js');
RG.Factory = require('./factory');

const Stairs = RG.Element.Stairs;

RG.World = {};

RG.World.Base = function(name) {
    this.name = name;
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

/* Branch, as name suggests, is a branch of dungeon. A branch is linear
 * progression of connected levels (usually with increasing difficulty).
 * Branch can have
 * entry points to other branches (or out of the dungeon). */
RG.World.Branch = function(name) {
    RG.World.Base.call(this, name);

    const _levels = [];
    const _stairsDown = [];
    const _stairsUp = [];
    const _stairsOther = [];
    let _entrance = null;

    let _numCount = 1;
    let _dungeon = null;

    /* Sets/gets the dungeon where this branch is located. */
    this.setDungeon = function(dungeon) {_dungeon = dungeon;};
    this.getDungeon = function() {return _dungeon;};

    this.getLevels = function() {return _levels;};
    this.getStairsUp = function() {return _stairsUp;};
    this.getStairsDown = function() {return _stairsDown;};

    /* Stairs leading to other branches.*/
    this.getStairsOther = function() {return _stairsOther;};
    this.addStairsOther = function(stairs) {
        _stairsOther.push(stairs);
    };

    /* Sets the entrance for this branch. */
    this.setEntrance = function(stairs, levelNumber) {
        if (levelNumber < _levels.length) {
            _entrance = stairs;
            _entrance.setSrcLevel(_levels[levelNumber]);
        }
        else {
            RG.err('World.Branch', 'setEntrance',
                `Invalid level number. Must be < ${_levels.length}`);
        }
    };

    /* Returns entrance/exit for the branch.*/
    this.getEntrance = function() {
        return _entrance;
    };

    /* Connects specified level to the given stairs (Usually external to this
     * branch) .*/
    this.connectLevelToStairs = function(nLevel, stairs) {
        const level = _levels[nLevel];
        const otherBranchLevel = stairs.getSrcLevel();

        console.log('connectLevelToStairs');
        if (!RG.isNullOrUndef([otherBranchLevel])) {
            const down = !stairs.isDown();
            const newStairs = new Stairs(down,
                level, otherBranchLevel);
            const cell = level.getFreeRandCell();
            level.addStairs(newStairs, cell.getX(), cell.getY());
            newStairs.connect(stairs);
            this.addStairsOther(newStairs);

            console.log('stairs: ' + JSON.stringify(stairs));
            console.log('newStairs: ' + JSON.stringify(newStairs));
        }
        else {
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
        }
        else {
            RG.err('World.Branch', 'addLevel',
                'Trying to add existing level. ');
        }
    };

    /* Connects the added levels together.*/
    this.connectLevels = function() {
        const nLevels = _levels.length;
        for (let nl = 0; nl < nLevels; nl++) {
            const src = _levels[nl];
            let stairCell = null;

            // Create stairs down
            if (nl < nLevels - 1) {
                const targetDown = _levels[nl + 1];
                const stairsDown = new Stairs(true, src, targetDown);
                stairCell = src.getFreeRandCell();
                src.addStairs(stairsDown, stairCell.getX(), stairCell.getY());
                _stairsDown.push(stairsDown);
            }

            // Create stairs up
            if (nl > 0) {
                const targetUp = _levels[nl - 1];
                const stairsUp = new Stairs(false, src, targetUp);
                stairCell = src.getFreeRandCell();
                src.addStairs(stairsUp, stairCell.getX(), stairCell.getY());
                _stairsUp.push(stairsUp);
            }
        }

        // Finally connect the stairs together
        for (let nl = 0; nl < nLevels; nl++) {
            if (nl < nLevels - 1) {
                // _stairsDown[nl].setTargetStairs(_stairsUp[nl + 1]);
                _stairsDown[nl].connect(_stairsUp[nl]);
            }

            // Don't connect first stairs up
            /* if (nl > 0) {
                _stairsUp[nl].setTargetStairs(_stairsDown[nl - 1]);
            }*/
        }
    };

};
RG.extend2(RG.World.Branch, RG.World.Base);

/* Dungeons is a collection of branches.*/
RG.World.Dungeon = function(name) {
    RG.World.Base.call(this, name);
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
        let b1 = b1Arg;
        let b2 = b2Arg;

        // Lookup objects by name
        if (typeof b1Arg === 'string' && typeof b2Arg === 'string') {
            b1 = _branches.find( br => br.getName() === b1Arg);
            b2 = _branches.find( br => br.getName() === b2Arg);
        }

        if (RG.isNullOrUndef([b1, b2])) {
            RG.err('World.Dungeon', 'connectBranches',
                'Cannot connect null branches. Check branch names.');
            return;
        }

        if (this.hasBranch(b1) && this.hasBranch(b2)) {
            let down = true;
            if (l1 > l2) {down = false;}
            const b2Stairs = new Stairs(down);
            const b2Levels = b2.getLevels();
            if (l2 < b2Levels.length) {
                const cell = b2Levels[l2].getFreeRandCell();
                b2Levels[l2].addStairs(b2Stairs, cell.getX(), cell.getY());
                b2Stairs.setSrcLevel(b2Levels[l2]);
                b2.addStairsOther(b2Stairs);
                b1.connectLevelToStairs(l1, b2Stairs);
            }
            else {
                RG.err('World.Dungeon', 'connectBranches',
                    'Level ' + l2 + " doesn't exist in branch " + b2.getName());
            }
        }
        else {
            RG.err('World.Dungeon', 'connectBranches',
                `Use addBranch ${b1} and ${b2} to dungeon before connection.`);
        }
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
};

/* Area is N x M area of tiles, with no linear progression like in dungeons.
 * Moving between tiles of areas happens by travelling to the edges of a tile.
 * Each tile is a level with special edge tiles.
 * */
RG.World.Area = function(name, maxX, maxY, cols, rows) {
    RG.World.Base.call(this, name);
    const _maxX = maxX;
    const _maxY = maxY;

    const _cols = cols || 30;
    const _rows = rows || 30;

    this.getMaxX = () => (_maxX);
    this.getMaxY = () => (_maxY);
    const _tiles = [];

    this._init = function() {
        // Create the tiles
        for (let x = 0; x < _maxX; x++) {
            const tileColumn = [];
            for (let y = 0; y < _maxY; y++) {
                const newTile = new RG.World.AreaTile(x, y, this);
                // const level = RG.FACT.createLevel('ruins', 30, 30, {});
                const levelConf = {
                    forest: {
                        ratio: 0.5,
                        shape: 'cellular'
                    }
                };
                const level = RG.FACT.createLevel('forest',
                    _cols, _rows, levelConf);
                newTile.setLevel(level);
                tileColumn.push(newTile);
            }
            _tiles.push(tileColumn);
        }

        // Connect the tiles
        for (let x = 0; x < _maxX; x++) {
            for (let y = 0; y < _maxY; y++) {
                if (x < _maxX - 1 && y < _maxY - 1) {
                    _tiles[x][y].connect(_tiles[x + 1][y], _tiles[x][y + 1]);
                }
                else if (x < _maxX - 1) {
                    _tiles[x][y].connect(_tiles[x + 1][y], null);
                }
                else if (y < _maxY - 1) {
                    _tiles[x][y].connect(null, _tiles[x][y + 1]);
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
            RG.err('World.Area', 'getTileXY',
                'Tile x,y is out of bounds.');
        }
        return null;
    };

    this.dungeons = [];
    this.mountains = [];
    this.cities = [];

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

};
RG.extend2(RG.World.Area, RG.World.Base);

/* Mountains are places consisting of tiles and dungeons. Mountain has few
 * special * tiles representing the summit.
 */
RG.World.Mountain = function(name) {
    RG.World.Base.call(this, name);
    let _summit = null;
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

Summit is above view, while face is more of climbing view.
Bit weird but should be fine.

*/
    this.getLevels = function() {
        let res = [];
        _faces.forEach(face => {
            res = res.concat(face.getLevels());

        });
        return res;
    };

    this.addSummit = (summit) => {
        _summit = summit;
    };

    this.addFace = (face) => {
        _faces.push(face);
    };

    this.getEntrances = () => {
        const res = [];
        _faces.forEach(face => {
            res.push(face.getEntrance());
        });
        return res;
    };

    this.connect = function() {
        this.connectFaces();
        this.connectCentralTiles();
        this.connectSummit();
    };

    /* Connects the mountain faces together. */
    this.connectFaces = () => {

    };

    this.connectCentralTiles = () => {

    };

    this.connectSummit = () => {
        console.log(`summit: ${_summit}`);

    };

};
RG.extend2(RG.World.Mountain, RG.World.Base);

/* One side (face) of the mountain. Each side consists of stages, of X by 1
* Areas. */
RG.World.MountainFace = function() {
    // const _stages = [];
    const _levels = [];
    let _entrance;

    this.addLevel = function(level) {
        _levels.push(level);
        if (!_entrance) {
            const stairs = new Stairs(true, level);
            const midX = Math.floor(level.getMap().cols / 2);
            const maxY = level.getMap().rows - 1;
            level.addStairs(stairs, midX, maxY);
            _entrance = stairs;
        }
    };

    this.getLevels = function() {
        return _levels;
    };

    this.setEntrance = function(stairs) {
        _entrance = stairs;
    };

    this.getEntrance = function() {
        return _entrance;
    };

};

/* A city in the world. A special features of the city can be queried through
* this object. */
RG.World.City = function(name) {
    RG.World.Base.call(this, name);
    const _levels = [];
    const _entrances = [];

    this.getLevels = () => (_levels);

    this.getEntrances = function() {
        return _entrances;
    };

    this.addLevel = function(level) {
        _levels.push(level);
        if (_levels.length === 1) {
            const stairs = new Stairs(false, level);
            level.addStairs(stairs, 0, 0);
            _entrances.push(stairs);
        }
    };

};
RG.extend2(RG.World.City, RG.World.Base);

/* Largest place. Contains a number of areas, mountains and dungeons. */
RG.World.World = function(name) {
    RG.World.Base.call(this, name);

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
    this.getDungeons = () => (_dungeons);
    this.getMountains = () => (_mountains);
    this.getCities = () => (_cities);

    this.toJSON = function() {
        const areas = _areas.map(area => area.toJSON());
        // const dungeons = _dungeons.map(dung => dung.toJSON());
        // const mountains = _mountains.map(mount => mount.toJSON());
        // const cities = _cities.map(city => city.toJSON());
        return {
            name: this.getName(),
            hierName: this.getHierName(),
            nAreas: _areas.length,
            areas
            // dungeons,
            // mountains,
            // cities
        };
    };
};
RG.extend2(RG.World.World, RG.World.Base);

module.exports = RG.World;

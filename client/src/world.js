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

    var _levels = [];

    var _stairsDown = [];
    var _stairsUp = [];
    var _stairsOther = [];

    var _numCount = 1;

    var _dungeon = null;

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

    /* Returns entrance/exit for the branch.*/
    this.getEntrance = function() {
        return _stairsUp[0];
    };

    /* Connects entrance to a stairs.*/
    this.connectEntrance = function(stairs) {
        if (_stairsUp.length > 0) {
            _stairsUp[0].setTargetStairs(stairs);
        }
        else {
            RG.err('World.Branch', 'connectEntrance',
                'No stairs for connection exist. Call connectLevels() first.');
        }
    };

    /* Connects specified level to the given stairs (Usually external to this
     * branch) .*/
    this.connectLevelToStairs = function(nLevel, stairs) {
        const level = _levels[nLevel];
        const otherBranchLevel = stairs.getSrcLevel();

        if (!RG.isNullOrUndef([otherBranchLevel])) {
            var down = !stairs.isDown();
            var newStairs = new Stairs(down,
                level, otherBranchLevel);
            var cell = level.getFreeRandCell();
            level.addStairs(newStairs, cell.getX(), cell.getY());
            newStairs.connect(stairs);
            this.addStairsOther(newStairs);
        }
        else {
            RG.err('World.Branch', 'connectLevelToStairs',
                'Stairs must be first connected to other level.');
        }
    };

    this.hasLevel = function(level) {
        var index = _levels.indexOf(level);
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
        var nLevels = _levels.length;
        for (let nl = 0; nl < nLevels; nl++) {
            var src = _levels[nl];
            var stairCell = null;

            // Create stairs down
            if (nl < nLevels - 1) {
                var targetDown = _levels[nl + 1];
                var stairsDown = new Stairs(true, src, targetDown);
                stairCell = src.getFreeRandCell();
                src.addStairs(stairsDown, stairCell.getX(), stairCell.getY());
                _stairsDown.push(stairsDown);
            }

            // Create stairs up
            if (nl >= 0) {
                var targetUp = _levels[nl - 1];
                var stairsUp = new Stairs(false, src, targetUp);
                stairCell = src.getFreeRandCell();
                src.addStairs(stairsUp, stairCell.getX(), stairCell.getY());
                _stairsUp.push(stairsUp);
            }
        }

        // Finally connect the stairs together
        for (let nl = 0; nl < nLevels; nl++) {
            if (nl < nLevels - 1) {
                _stairsDown[nl].setTargetStairs(_stairsUp[nl + 1]);
            }

            // Don't connect first stairs up
            if (nl > 0) {
                _stairsUp[nl].setTargetStairs(_stairsDown[nl - 1]);
            }
        }
    };

};
RG.extend2(RG.World.Branch, RG.World.Base);

/* Dungeons is a collection of branches.*/
RG.World.Dungeon = function(name) {
    RG.World.Base.call(this, name);
    var _branches = [];
    let _entranceNames = [];

    /* Returns true if the dungeon has given branch.*/
    this.hasBranch = function(branch) {
        var index = _branches.indexOf(branch);
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
                'Cannot connect null branches.');
            return;
        }

        if (this.hasBranch(b1) && this.hasBranch(b2)) {
            let down = true;
            if (l1 > l2) {down = false;}
            var b2Stairs = new Stairs(down);
            var b2Levels = b2.getLevels();
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
                'Branches must be added to dungeon before connection.');
        }
    };

};
RG.extend2(RG.World.Dungeon, RG.World.Base);

/* Area-tile is a level which has entry/exit points on a number of edges.*/
RG.World.AreaTile = function(x, y, area) {

    var _tileX = x;
    var _tileY = y;
    var _area = area;

    this.cols = null;
    this.rows = null;

    var _level = null;

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
        var lastX = this.cols - 1;
        var lastY = this.rows - 1;

        // Connect to east tile
        if (!RG.isNullOrUndef([eastTile])) {
            var levelEast = eastTile.getLevel();
            const map = _level.getMap();
            var mapEast = levelEast.getMap();

            for (var y = 1; y <= lastY - 1; y++) {
                const cell = map.getCell(lastX, y);
                var cellEast = mapEast.getCell(0, y);

                if (cell.isFree() && cellEast.isFree()) {
                    const stairs = new Stairs(true, _level, levelEast);
                    var stairsEast = new Stairs(false, levelEast, _level);
                    stairs.setTargetStairs(stairsEast);
                    stairsEast.setTargetStairs(stairs);

                    _level.addStairs(stairs, lastX, y);
                    levelEast.addStairs(stairsEast, 0, y);
                }
            }

        }

        // Connect to south tile
        if (!RG.isNullOrUndef([southTile])) {
            var levelSouth = southTile.getLevel();
            const map = _level.getMap();
            var mapSouth = levelSouth.getMap();

            for (var x = 1; x <= lastX - 1; x++) {
                const cell = map.getCell(x, lastY);
                var cellSouth = mapSouth.getCell(x, 0);

                if (cell.isFree() && cellSouth.isFree()) {
                    const stairs = new Stairs(true, _level, levelSouth);
                    var stairsSouth = new Stairs(false, levelSouth, _level);
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
RG.World.Area = function(name, maxX, maxY) {
    RG.World.Base.call(this, name);
    var _maxX = maxX;
    var _maxY = maxY;

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
                const level = RG.FACT.createLevel('forest', 30, 30, levelConf);
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
    const _levels = [];
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
    this.getLevels = () => (_levels);

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
};
RG.extend2(RG.World.World, RG.World.Base);

/* Factory object for creating worlds and features. Uses conf object which is
 * somewhat involved. For an example, see ../data/conf.world.js. This Factory
 * does not have any procedural generation. The configuration object can be
 * generated procedurally, and the factory will then use the configuration for
 * building the world. Separation of concerns, you know.
 */
RG.World.Factory = function() {

    this.featureFactory = new RG.Factory.Feature();

    this.scope = []; // Keeps track of hierarchical names of places

    this.pushScope = name => {
        this.scope.push(name);
    };

    this.popScope = name => {
        const poppedName = this.scope.pop();
        if (poppedName !== name) {
            RG.err('World.Factory', 'popScope',
                `Popped: ${poppedName}, Expected: ${name}`);
        }
    };

    /* Returns the full hierarchical name of feature. */
    this.getHierName = () => this.scope.join('.');

    /* Verifies that configuration contains all required keys.*/
    this.verifyConf = function(msg, conf, required) {
        let ok = true;
        required.forEach(req => {
            if (!conf.hasOwnProperty(req)) {
                ok = false;
                RG.err('World.Factory', 'verifyConf',
                    `Missing conf arg: ${req}`);
            }
        });
        if (!ok) {
            RG.err('World.Factory', 'verifyConf', msg);
        }
        return ok;
    };

    /* Creates a world using given configuration. */
    this.createWorld = function(conf) {
        this.verifyConf('createWorld', conf, ['name', 'nAreas']);
        this.pushScope(conf.name);
        const world = new RG.World.World(conf.name);
        for (let i = 0; i < conf.nAreas; i++) {
            const areaConf = conf.area[i];
            const area = this.createArea(areaConf);
            world.addArea(area);
        }
        this.popScope(conf.name);
        return world;
    };

    /* Creates an area which can be added to a world. */
    this.createArea = function(conf) {
        this.verifyConf('createArea', conf,
            ['name', 'maxX', 'maxY']);
        this.pushScope(conf.name);
        const area = new RG.World.Area(conf.name, conf.maxX, conf.maxY);
        area.setHierName(this.getHierName());
        const nDungeons = conf.nDungeons || 0;
        const nMountains = conf.nMountains || 0;
        const nCities = conf.nCities || 0;

        for (let i = 0; i < nDungeons; i++) {
            const dungeonConf = conf.dungeon[i];
            const dungeon = this.createDungeon(dungeonConf);
            area.addDungeon(dungeon);
            this.createConnection(area, dungeon, dungeonConf);
        }

        for (let i = 0; i < nMountains; i++) {
            const mountainConf = conf.mountain[i];
            const mountain = this.createMountain(mountainConf);
            area.addMountain(mountain);
            this.createConnection(area, mountain, mountainConf);
        }

        for (let i = 0; i < nCities; i++) {
            const cityConf = conf.city[i];
            const city = this.createCity(cityConf);
            area.addCity(city);
            this.createConnection(area, city, cityConf);
        }
        this.popScope(conf.name);
        return area;
    };


    this.createDungeon = function(conf) {
        this.verifyConf('createDungeon', conf,
            ['name', 'nBranches']);
        this.pushScope(conf.name);

        const dungeon = new RG.World.Dungeon(conf.name);
        dungeon.setHierName(this.getHierName());

        for (let i = 0; i < conf.nBranches; i++) {
            const branchConf = conf.branch[i];
            const branch = this.createBranch(branchConf);
            dungeon.addBranch(branch);
        }

        if (conf.entrance) {
            dungeon.setEntrance(conf.entrance);
        }

        // Connect branches according to configuration
        if (conf.nBranches > 1) {
            if (conf.connect) {
                conf.connect.forEach( conn => {
                    if (conn.length === 4) {
                        // conn has len 4, spread it out
                        dungeon.connectBranches(...conn);
                    }
                    else {
                        RG.err('World.Factory', 'createDungeon',
                            'Each connection.length must be 4.');
                    }
                });
            }
            else {
                RG.err('World.Factory', 'createDungeon',
                    'nBranches > 1, but no conf.connect.');
            }
        }

        this.popScope(conf.name);
        return dungeon;
    };

    /* Creates one dungeon branch and all levels inside it. */
    this.createBranch = function(conf) {
        this.verifyConf('createBranch', conf,
            ['name', 'nLevels']);
        this.pushScope(conf.name);
        const branch = new RG.World.Branch(conf.name);
        branch.setHierName(this.getHierName());
        for (let i = 0; i < conf.nLevels; i++) {
            // TODO: Level configuration can be quite complex. Support random
            // and customly created levels somehow
            // const level = RG.FACT.createLevel('cellular', 30, 30, {});
            const levelConf = {
                x: 40,
                y: 40,
                sqrPerMonster: 20,
                sqrPerItem: 20,
                maxValue: 20 * (i + 1),
                nLevel: i,
                special: [] // TODO for special levels
            };
            const level = this.featureFactory.createDungeonLevel(levelConf);
            branch.addLevel(level);
        }
        branch.connectLevels();
        this.popScope(conf.name);
        return branch;
    };

    this.createMountain = function(conf) {
        this.verifyConf('createMountain', conf, ['name']);
        this.pushScope(conf.name);
        const mountain = new RG.World.Mountain(conf.name);
        this.popScope(conf.name);
        return mountain;
    };

    this.createCity = function(conf) {
        this.verifyConf('createCity', conf, ['name']);
        this.pushScope(conf.name);
        const cityConf = {
            x: 100,
            y: 100
        };
        const city = new RG.World.City(conf.name);
        const level = this.featureFactory.createCityLevel(cityConf);
        city.addLevel(level);
        this.popScope(conf.name);
        return city;
    };

    /* Creates a connection between an area and a feature such as city, mountain
     * or dungeon. Unless configured, connects the feature entrance to a random
     * location in the area. */
    this.createConnection = function(area, feature, conf) {
        this.verifyConf('createConnection', conf, ['x', 'y']);

        const x = conf.x;
        const y = conf.y;
        const tile = area.getTileXY(x, y);
        const tileLevel = tile.getLevel();

        const freeAreaCell = tileLevel.getEmptyRandCell();
        const freeX = freeAreaCell.getX();
        const freeY = freeAreaCell.getY();

        if (feature.hasOwnProperty('getEntrances')) {
            const entrances = feature.getEntrances();
            if (entrances.length > 0) {
                const entranceStairs = entrances[0];
                const entranceLevel = entranceStairs.getSrcLevel();
                const tileStairs = new Stairs(true, tileLevel, entranceLevel);
                tileLevel.addStairs(tileStairs, freeX, freeY);
                tileStairs.connect(entranceStairs);
                // tileStairs.setTargetStairs(entranceStairs);
                // entranceStairs.setTargetStairs(tileStairs);
                // entranceStairs.setTargetLevel(tileLevel);
                console.log(
                    `Connected tile ${x}, ${y} to ${feature.getName()}`);
            }
            else {
                const msg = `No entrances in ${feature.getHierName()}.`;
                RG.err('World.Factory', 'createConnection',
                    `${msg}. Cannot connect to tile.`);
            }
        }
        else { // No entrance for feature, what to do?
            console.warn(
                'No getEntrances method for feature. Skipping connect');
        }
    };
};

module.exports = RG.World;

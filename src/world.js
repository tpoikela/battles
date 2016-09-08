/*
 * Contains objects related to the game world in Battles. This includes areas,
 * dungeons, dungeon branches etc.
 */

var GS = require("../getsource.js");
var ROT = GS.getSource("ROT", "./lib/rot.js");
var RG = GS.getSource("RG", "./src/rg.js");

RG.World = {};

/** Branch, as name suggests, is a branch of dungeon. A branch is linear
 * progression of connected levels (usually with increasing difficulty). Branch can have
 * entry points to other branches (or out of the dungeon). */
RG.World.Branch = function(name) {

    var _name = name;
    this.getName = function() {return _name;};

    var _levels = [];

    var _stairsDown = [];
    var _stairsUp = [];
    var _stairsOther = [];

    var _numCount = 1;

    var _dungeon = null;

    this.setDungeon = function(dungeon) {_dungeon = dungeon;};
    this.getDungeon = function() {return _dungeon;};

    this.getLevels = function() {return _levels;};
    this.getStairsUp = function() {return _stairs;};
    this.getStairsDown = function() {return _stairsDown;};

    /** Stairs leading to other branches.*/
    this.getStairsOther = function() {return _stairsOther;};

    /** Returns entrance/exit for the branch.*/
    this.getEntrance = function() {
        return _stairsUp[0];
    };

    /** Connects entrance to a stairs.*/
    this.connectEntrance = function(stairs) {
        if (_stairsUp.length > 0) {
            _stairsUp[0].setTargetStairs(stairs);
        }
        else {
            RG.err("World.Branch", "connectEntrance", 
                "No stairs for connection exist. Call connectLevels() first.");
        }
    };

    /** Connects specified level to the given stairs (Usually external to this
     * branch.*/
    this.connectLevelToStairs = function(nLevel, stairs) {
        var level = _levels[nLevel];
        var otherBranchLevel = stairs.getSrcLevel();
        if (!RG.isNullOrUndef([otherBranchLevel])) {
            var down = !stairs.isDown();
            var newStairs = new RG.Element.Stairs(down, level, otherBranchLevel);
            var cell = level.getFreeRandCell();
            level.addStairs(newStairs, cell.getX(), cell.getY());
            newStairs.setTargetStairs(stairs);
            _stairsOther.push(newStairs);
        }
        else {
            RG.err("World.Branch", "connectLevelToStairs",
                "Stairs must be first connected to other level.");
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
            RG.err("World.Branch", "addLevel", 
                "Trying to add existing level (in index " + index + " already)");

        }
    };

    /** Connects the added levels together.*/
    this.connectLevels = function() {
        var nLevels = _levels.length;
        for (nl = 0; nl < nLevels; nl++) {
            var src = _levels[nl];
            var stairCell = null;

            // Create stairs down
            if (nl < nLevels-1) {
                var targetDown = _levels[nl+1];
                var stairsDown = new RG.Element.Stairs(true, src, targetDown);
                stairCell = src.getFreeRandCell();
                src.addStairs(stairsDown, stairCell.getX(), stairCell.getY());
                _stairsDown.push(stairsDown);
            }

            // Create stairs up
            if (nl >= 0) {
                var targetUp = _levels[nl-1];
                var stairsUp = new RG.Element.Stairs(false, src, targetUp);
                stairCell = src.getFreeRandCell();
                src.addStairs(stairsUp, stairCell.getX(), stairCell.getY());
                _stairsUp.push(stairsUp);
            }
        }

        // Finally connect the stairs together
        for (nl = 0; nl < nLevels; nl++) {
            if (nl < nLevels-1)
                _stairsDown[nl].setTargetStairs(_stairsUp[nl+1]);
            if (nl > 0) // Don't connect first stairs up
                _stairsUp[nl].setTargetStairs(_stairsDown[nl-1]);
        }
    };

};

/** Dungeons is a collection of branches.*/
RG.World.Dungeon = function(name) {

    var _name = name;
    this.getName = function() {return _name;};

    var _branches = [];

    /** Returns true if the dungeon has given branch.*/
    this.hasBranch = function(branch) {
        var index = _branches.indexOf(branch);
        return index >= 0;
    };

    this.addBranch = function(branch) {
        if (!this.hasBranch(branch)) {
            _branches.push(branch);
            branch.setDungeon(this);
            return true;
        }
        return false;
    };

    this.getLevels = function() {
        var res = [];
        for (var i = 0; i < _branches.length; i++) {
            res = res.concat(_branches[i].getLevels());
        }
        return res;
    };

    /** Returns all entrances/exits for the dungeon.*/
    this.getEntrances = function() {
        var res = [];
        for (var i = 0; i < _branches.length; i++) {
            res.push(_branches[i].getEntrance());
        }
        return res;
    };

    /** Connects two branches b1 and b2 together from specified levels l1 and l2.
     * */
    this.connectBranches = function(b1, b2, l1, l2) {
        if (this.hasBranch(b1) && this.hasBranch(b2)) {
            var down = true;
            if (l1 > l2) down = false;
            var stairs = new RG.Element.Stairs(down);
            var b2Levels = b2.getLevels();
            if (l2 < b2Levels.length) {
                var cell = b2Levels[l2].getFreeRandCell();
                b2Levels[l2].addStairs(stairs, cell.getX(), cell.getY());
                b1.connectLevelToStairs(l1, stairs);
            }
            else {
                RG.err("World.Dungeon", "connectBranches",
                    "Level " + l2 + " doesn't exist in branch " + b2.getName());
            }
        }
        else {
            RG.err("World.Dungeon", "connectBranches",
                "Branches must be added to dungeon before connection.");
        }
    };

};

/** Area-tile is a level which has entry/exit points on a number of edges.*/
RG.World.AreaTile = function(x, y, area) {

    var _tileX = x;
    var _tileY = y;
    var _area  = area;

    this.cols = null;
    this.rows = null;

    var _level = null;

    /** Sets the level for this tile.*/
    this.setLevel = function(level) {
        _level = level;
        this.cols = _level.getMap().cols;
        this.rows = _level.getMap().rows;
    };

    this.getLevel = function() {return _level;};

    this.getLevel = function() {return _level;};
    this.getTileX = function() {return _x;};
    this.getTileY = function() {return _y;};

    /** Returns true for edge tiles.*/
    this.isEdge = function() {
        if (this.isNorthEdge()) return true;
        if (this.isSouthEdge()) return true;
        if (this.isWestEdge ()) return true;
        if (this.isEastEdge ()) return true;
        return false;
    };

    this.isNorthEdge = function() {return _tileY === 0;};
    this.isSouthEdge = function() {return _tileY === (_area.getMaxY() - 1);};
    this.isWestEdge = function() {return _tileX === 0;};
    this.isEastEdge = function() {return _tileY === (_area.getMaxY() - 1);};

    /* Connect this tile to east and south tiles */
    this.connect = function(eastTile, southTile) {
        var lastX = this.cols - 1;
        var lastY = this.rows - 1;

        // Connect to east tile
        if (!RG.isNullOrUndef([eastTile])) {

            var levelEast = eastTile.getLevel();
            var map = _level.getMap();
            var mapEast = levelEast.getMap();

            for (var y = 1; y <= lastY-1; y++) {
                var cell = map.getCell(lastX, y);
                var cellEast = mapEast.getCell(0, y);

                if (cell.isFree() && cellEast.isFree()) {
                    var stairs = new RG.Element.Stairs(true, _level, levelEast);
                    var stairsEast = new RG.Element.Stairs(false, levelEast, _level);
                    _level.addStairs(stairs, lastX, y);
                    levelEast.addStairs(stairsEast, 0, y);
                }
            }

        }

        // Connect to south tile
        if (!RG.isNullOrUndef([southTile])) {
            var levelSouth = southTile.getLevel();
            var map = _level.getMap();
            var mapSouth = levelSouth.getMap();

            for (var x = 1; x <= lastX-1; x++) {
                var cell = map.getCell(x, lastY);
                var cellSouth = mapSouth.getCell(x, 0);

                if (cell.isFree() && cellSouth.isFree()) {
                    var stairs = new RG.Element.Stairs(true, _level, levelSouth);
                    var stairsSouth = new RG.Element.Stairs(false, levelSouth, _level);
                    _level.addStairs(stairs, x, lastY);
                    levelSouth.addStairs(stairsSouth, x, 0);
                }
            }
        }
    };
};

/** Area is N x M area of tiles, with no linear progression like in dungeons.
 * Moving between tiles of areas happens by travelling to the edges of a tile.
 * Each tile is a level with special edge tiles.
 * */
RG.World.Area = function(name, maxX, maxY) {

    var _name = name;
    this.getName = function() {return _name;};

    var _maxX = maxX;
    var _maxY = maxY;
    var _tiles = [];

    this.getMaxX = function() {return _maxX;};
    this.getMaxY = function() {return _maxY;};

    this.getLevels = function() {
        var res = [];
        for (var x = 0; x < _tiles.length; x++) {
            for (var y = 0; y < _tiles[y].length; y++) {
                res.push(_tiles[x][y].getLevel());
            }
        }
        return res;
    };

};

/** Factory object for creating worlds and features. */
RG.World.Factory = function() {

    this.createArea = function(conf) {

    };

    this.createDungeon = function(conf) {

    };

};

/** Largest place structure. Contains a number of area and dungeons. */
RG.World.World = function(conf) {

    if (RG.isNullOrUndef([conf])) {
        RG.err("World.World", "", "No configuration given.");
        return;
    }

    var _fact = new RG.World.Factory();

    var _areas = [];
    var _dungeons = [];


    var nAreas = conf.nAreas;
    var nDungeons = conf.nDungeons;

    for (var i = 0; i < nAreas; i++) {
        var area = _fact.createArea(conf);
        _areas.push(area);
    }

    for (var j = 0; j < nDungeons; j++) {
        var dungeon = _fact.createDungeon(conf);
        _dungeons.push(dungeon);
    }

    // Connect areas and dungeons

};



if (typeof module !== "undefined" && typeof exports !== "undefined") {
    GS.exportSource(module, exports, ["RG", "World"], [RG, RG.World]);
}
else {
    GS.exportSource(undefined, undefined, ["RG", "World"], [RG, RG.World]);
}

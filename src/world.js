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
RG.World.Branch = function() {

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
        var down = !stairs.isDown();
        var newStairs = new RG.Element.Stairs(down, src, targetDown);
        var cell = level.getFreeRandCell();
        level.addStairs(newStairs, cell.getX(), cell.getY());
        newStairs.setTargetStairs(stairs);
        _stairsOther.push(newStairs);
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
                var targetDown = allLevels[nl+1];
                var stairsDown = new RG.Element.Stairs(true, src, targetDown);
                stairCell = src.getFreeRandCell();
                src.addStairs(stairsDown, stairCell.getX(), stairCell.getY());
                _stairsDown.push(stairsDown);
            }

            // Create stairs up
            if (nl >= 0) {
                var targetUp = allLevels[nl-1];
                var stairsUp = new RG.Element.Stairs(false, src, targetUp);
                stairCell = src.getFreeRandCell();
                src.addStairs(stairsUp, stairCell.getX(), stairCell.getY());
                _stairsUp.push(stairsUp);
            }
        }

        // Finally connect the stairs together
        for (nl = 0; nl < nLevels; nl++) {
            if (nl < nLevels-1)
                allStairsDown[nl].setTargetStairs(allStairsUp[nl+1]);
            if (nl > 0) // Don't connect first stairs up
                allStairsUp[nl].setTargetStairs(allStairsDown[nl-1]);
        }
    };

};

/** Dungeons is a collection of branches.*/
RG.World.Dungeon = function() {

    var _branches = [];

    /** Returns all entrances/exits for the dungeon.*/
    this.getEntrances = function() {

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

    };
};

/** Area is N x M area of tiles, with no linear progression like in dungeons.
 * Moving between tiles of areas happens by travelling to the edges of a tile.
 * Each tile is a level with special edge tiles.
 * */
RG.World.Area = function(maxX, maxY) {

    var _maxX = maxX;
    var _maxY = maxY;
    var _tiles = [];

    this.getMaxX = function() {return _maxX;};
    this.getMaxY = function() {return _maxY;};

};

RG.World.Factory = function() {

};

RG.World.World = function(conf) {

    var _fact = new RG.World.Factory();

    var _areas = [];
    var _dungeons = [];

    for (var i = 0; i < nAreas; i++) {
        var area = _fact.createArea(conf);
        _areas.push(area);
    }

    for (var j = 0; j < nAreas; j++) {
        var dungeon = _fact.createDungeon(conf);
        _dungeons.push(area);
    }

};


if (typeof module !== "undefined" && typeof exports !== "undefined") {
    GS.exportSource(module, exports, ["RG", "World"], [RG, RG.World]);
}
else {
    GS.exportSource(undefined, undefined, ["RG", "World"], [RG, RG.World]);
}


var GS = require("../getsource.js");
var ROT = GS.getSource("ROT", "./lib/rot.js");
var RG = GS.getSource("RG", "./src/rg.js");

RG.Element = GS.getSource(["RG", "Element"], "./src/element.js");

RG.Map = {};

/** Object representing one game cell. It can hold actors, items, traps or
 * elements. */
RG.Map.Cell = function(x, y, elem) { // {{{2

    this._baseElem = elem;
    this._x   = x;
    this._y   = y;
    this._explored = false;

    this._p = {}; // Cell properties are assigned here

}; // }}} Map.Cell

RG.Map.Cell.prototype.getX = function() {return this._x;};
RG.Map.Cell.prototype.getY = function() {return this._y;};

/** Sets/gets the base element for this cell. There can be only one element.*/
RG.Map.Cell.prototype.setBaseElem = function(elem) { this._baseElem = elem; };
RG.Map.Cell.prototype.getBaseElem = function() { return this._baseElem; };

/** Returns true if cell has any actors.*/
RG.Map.Cell.prototype.hasActors = function() {return this.hasProp("actors");};

/** Returns true if cell has stairs.*/
RG.Map.Cell.prototype.hasStairs = function() {
        return this.hasPropType("stairsUp") || this.hasPropType("stairsDown");
    };

/** Return stairs in this cell, or null if there are none.*/
RG.Map.Cell.prototype.getStairs = function() {
    if (this.hasPropType("stairsUp")) return this.getPropType("stairsUp")[0];
    if (this.hasPropType("stairsDown")) return this.getPropType("stairsDown")[0];
    return null;
};

RG.Map.Cell.prototype.hasShop = function() {
    return this.hasPropType("shop");
};

/** Returns true if light passes through this map cell.*/
RG.Map.Cell.prototype.lightPasses = function() {
    if (this._baseElem.getType() === "wall") return false;
    return true;
};

RG.Map.Cell.prototype.isPassable = function() {return this.isFree();};

RG.Map.Cell.prototype.setExplored = function() {this._explored = true;};

RG.Map.Cell.prototype.isExplored = function() {return this._explored;};

/** Returns true if it's possible to move to this cell.*/
RG.Map.Cell.prototype.isFree = function() {
    if (this.hasProp("actors")) {
        for (var i = 0; i < this._p.actors.length; i++) {
            if (!this._p.actors[i].has("Ethereal")) return false;
        }
        return true;
    }
    return this._baseElem.isPassable();
};

/** Add given obj with specified property type.*/
RG.Map.Cell.prototype.setProp = function(prop, obj) {
    if (!this._p.hasOwnProperty(prop)) this._p[prop] = [];
    if (this._p.hasOwnProperty(prop)) {
        this._p[prop].push(obj);
        if (obj.hasOwnProperty("setOwner")) {
            obj.setOwner(this);
        }
    }
    else {
        RG.err("Map.Cell", "setProp", "No property " + prop);
    }
};

/** Removes the given object from cell properties.*/
RG.Map.Cell.prototype.removeProp = function(prop, obj) {
    if (this.hasProp(prop)) {
        var props = this._p[prop];
        var index = props.indexOf(obj);
        if (index === -1) return false;
        this._p[prop].splice(index, 1);
        if (this._p[prop].length === 0) {
            delete this._p[prop];
        }
        return true;
    }
    return false;
};

/** Returns true if the cell has props of given type.*/
RG.Map.Cell.prototype.hasProp = function(prop) {
    return this._p.hasOwnProperty(prop);
};

/** Returns string representation of the cell.*/
RG.Map.Cell.prototype.toString = function() {
    var str = "Map.Cell " + this._x + ", " + this._y;
    str += " explored: " + this._explored;
    str += " passes light: " + this.lightPasses();
    for (var prop in this._p) {
        var arrProps = this._p[prop];
        for (var i = 0; i < arrProps.length; i++) {
            if (arrProps[i].hasOwnProperty("toString")) {
                str += arrProps[i].toString();
            }
        }
    }
    return str;
};

/** Returns true if any cell property has the given type. Ie.
 * myCell.hasPropType("wall"). Doesn't check for basic props like "actors",
 * RG.TYPE_ITEM etc.
 */
RG.Map.Cell.prototype.hasPropType = function(propType) {
    if (this._baseElem.getType() === propType) return true;

    for (var prop in this._p) {
        var arrProps = this._p[prop];
        for (var i = 0; i < arrProps.length; i++) {
            if (arrProps[i].getType() === propType) {
                return true;
            }
        }
    }
    return false;
};

/** Returns all props with given type in the cell.*/
RG.Map.Cell.prototype.getPropType = function(propType) {
    var props = [];
    if (this._baseElem.getType() === propType) return [this._baseElem];
    for (var prop in this._p) {
        var arrProps = this._p[prop];
        for (var i = 0; i < arrProps.length; i++) {
            if (arrProps[i].getType() === propType) {
                props.push(arrProps[i]);
            }
        }
    }
    return props;
};

RG.Map.Cell.prototype.getProp = function(prop) {
    if (this._p.hasOwnProperty(prop)) {
        return this._p[prop];
    }
    return null;
};

/** Map object which contains a number of cells. A map is used for rendering
 * while the level contains actual information about game elements such as
 * monsters and items.  */
RG.Map.CellList = function(cols, rows) { //{{{2
    var map = [];
    this.cols = cols;
    this.rows = rows;

    var _cols = cols;
    var _rows = rows;

    for (var x = 0; x < this.cols; x++) {
        map.push([]);
        for (var y = 0; y < this.rows; y++) {
            var elem = new RG.Element.Base("floor");
            map[x].push(new RG.Map.Cell(x, y, elem));
        }
    }

    /** Returns true if x,y are in the map.*/
    this.hasXY = function(x, y) {
        return (x >= 0) && (x < this.cols) && (y >= 0) && (y < this.rows);
    };

    /** Sets a property for the underlying cell.*/
    this.setProp = function(x, y, prop, obj) {
        map[x][y].setProp(prop, obj);
    };

    this.removeProp = function(x, y, prop, obj) {
        return map[x][y].removeProp(prop, obj);
    };

    this.setBaseElemXY = function(x, y, elem) {
        map[x][y].setBaseElem(elem);
    };

    this.getBaseElemXY = function(x, y) {
        return map[x][y].getBaseElem();
    };

    this.getCell = function(x, y) {
        return map[x][y];
    };

    this.getBaseElemRow = function(y) {
        var row = [];
        for (var i = 0; i < this.cols; ++i) {
            row.push(map[i][y].getBaseElem());
        }
        return row;
    };

    this.getCellRow = function(y) {
        var row = [];
        for (var i = 0; i < this.cols; ++i) {
            row.push(map[i][y]);
        }
        return row;
    };

    /** Returns all free cells in the map.*/
    this.getFree = function() {
        var freeCells = [];
        for (var x = 0; x < this.cols; x++) {
            for (var y = 0; y < this.rows; y++) {
                if (map[x][y].isFree()) {
                    freeCells.push(map[x][y]);
                }
            }
        }
        return freeCells;
    };

    /** Returns true if the map has a cell in given x,y location.*/
    var _hasXY = function(x, y) {
        return (x >= 0) && (x < _cols) && (y >= 0) && (y < _rows);
    };

    /** Returns true if light passes through this cell.*/
    var lightPasses = function(x, y) {
        if (_hasXY(x, y)) {
            return map[x][y].lightPasses(); // delegate to cell
        }
        return false;
    };

    this.isPassable = function(x, y) {
        if (_hasXY(x, y)) {
            return map[x][y].isPassable();
        }
        return false;
    };

    var fov = new ROT.FOV.PreciseShadowcasting(lightPasses);

    /** Returns visible cells for given actor.*/
    this.getVisibleCells = function(actor) {
        var cells = [];
        var xActor = actor.getX();
        var yActor = actor.getY();
        if (actor.isLocated()) {
            if (actor.getLevel().getMap() === this) {
                var range = actor.getFOVRange();
                fov.compute(xActor, yActor, range, function(x, y, r, visibility) {
                    if (visibility) {
                        if (_hasXY(x, y)) {
                            cells.push(map[x][y]);
                        }
                    }
                });
            }
        }
        return cells;
    };

    /** Returns all cells explored by the player.*/
    this.getExploredCells = function() {
        var cells = [];
        for (var x = 0; x < this.cols; x++) {
            for (var y = 0; y < this.rows; y++) {
                if (map[x][y].isExplored()) {
                    cells.push(map[x][y]);
                }
            }
        }
    };

    /** Returns true if x,y is located at map border cells.*/
    this.isBorderXY = function(x, y) {
        if (x === 0) return true;
        if (y === 0) return true;
        if (x === this.cols-1) return true;
        if (y === this.rows-1) return true;
        return false;
    };

    this.debugPrintInASCII = function() {
        var mapInASCII = "";
        for (var y = 0; y < this.rows; y++) {
            var row = "";
            for (var x = 0; x < this.cols; x++) {
                var cell = map[x][y];
                if (cell.getStairs() !== null) row += ">";
                else if (cell.getBaseElem().getType()  === "floor") row += ".";
                else row += "#";
            }
            mapInASCII += row + "\n";
        }
        console.log(mapInASCII);
    };


}; // }}} Map

/** Map generator for the roguelike game.  */
RG.Map.Generator = function() { // {{{2

    this.cols = 50;
    this.rows = 30;
    var _mapGen = new ROT.Map.Arena(50, 30);
    var _mapType = null;

    var _types = ["arena", "cellular", "digger", "divided", "dungeon",
        "eller", "icey", "uniform", "rogue", "ruins", "rooms"];

    var _wall = 1;

    this.getRandType = function() {
        var len = _types.length;
        var nRand = Math.floor(Math.random() * len);
        return _types[nrand];
    };

    var _nHouses = 5;
    this.setNHouses = function(nHouses) {_nHouses = nHouses;};

    /** Sets the generator for room generation.*/
    this.setGen = function(type, cols, rows) {
        this.cols = cols;
        this.rows = rows;
        type = type.toLowerCase();
        _mapType = type;
        switch(type) {
            case "arena":  _mapGen = new ROT.Map.Arena(cols, rows); break;
            case "cellular":  _mapGen = this.createCellular(cols, rows); break;
            case "digger":  _mapGen = new ROT.Map.Digger(cols, rows); break;
            case "divided":  _mapGen = new ROT.Map.DividedMaze(cols, rows); break;
            case "eller":  _mapGen = new ROT.Map.EllerMaze(cols, rows); break;
            case "icey":  _mapGen = new ROT.Map.IceyMaze(cols, rows); break;
            case "rogue":  _mapGen = new ROT.Map.Rogue(cols, rows); break;
            case "uniform":  _mapGen = new ROT.Map.Uniform(cols, rows); break;
            case "ruins": _mapGen = this.createRuins(cols, rows); break;
            case "rooms": _mapGen = this.createRooms(cols, rows); break;
            default: RG.err("MapGen", "setGen", "_mapGen type " + type + " is unknown");
        }
    };

    /** Returns an object containing randomized map + all special features
     * based on initialized generator settings. */
    this.getMap = function() {
        var map = new RG.Map.CellList(this.cols, this.rows);
        _mapGen.create(function(x, y, val) {
            if (val === _wall) {
                map.setBaseElemXY(x, y, new RG.Element.Base("wall"));
            }
            else {
                map.setBaseElemXY(x, y, new RG.Element.Base("floor"));
            }
        });
        var obj = {map: map};
        if (_mapType === "uniform" || _mapType === "digger") {
            obj.rooms = _mapGen.getRooms(); // ROT.Map.Feature.Room
            obj.corridors = _mapGen.getCorridors(); // ROT.Map.Feature.Corridor
        }

        return obj;
    };


    /** Creates "ruins" type level with open outer edges and inner "fortress" with
     * some tunnels. */
    this.createRuins = function(cols, rows) {
        var conf = {born: [4, 5, 6, 7, 8],
            survive: [2, 3, 4, 5], connected: true};
        var map = new ROT.Map.Cellular(cols, rows, conf);
        map.randomize(0.9);
        for (var i = 0; i < 5; i++) map.create();
        map.connect(null, 1);
        _wall = 0;
        return map;
    };

    /** Creates a cellular type dungeon and makes all areas connected.*/
    this.createCellular = function(cols, rows, gens) {
        var map = new ROT.Map.Cellular(cols, rows);
        map.randomize(0.5);
        for (var i = 0; i < 5; i++) map.create();
        map.connect(null, 1);
        _wall = 0;
        return map;
    };

    this.createRooms = function(cols, rows) {
        var map = new ROT.Map.Digger(cols, rows,
            {roomWidth: [5, 20], dugPercentage: 0.7});
        return map;
    };

    /** Creates a town level of size cols X rows. */
    this.createTown = function(cols, rows, conf) {
        var maxTriesHouse = 100;
        var doors = {};
        var wallsHalos = {};

        var nHouses = 5;
        var minX = 5;
        var maxX = 5;
        var minY = 5;
        var maxY = 5;

        if (conf.hasOwnProperty("nHouses")) nHouses = conf.nHouses;
        if (conf.hasOwnProperty("minHouseX")) minX = conf.minHouseX;
        if (conf.hasOwnProperty("minHouseY")) minY = conf.minHouseY;
        if (conf.hasOwnProperty("maxHouseX")) maxX = conf.maxHouseX;
        if (conf.hasOwnProperty("maxHouseY")) maxY = conf.maxHouseY;

        var houses = [];
        this.setGen("arena", cols, rows);
        var mapObj = this.getMap();
        var map = mapObj.map;

        for (var i = 0; i < nHouses; i++) {

            var houseCreated = false;
            var tries = 0;
            var xSize = Math.floor(Math.random() * (maxX - minX)) + minX;
            var ySize = Math.floor(Math.random() * (maxY - minY)) + minY;

            // Select random starting point, try to build house there
            while (!houseCreated && tries < maxTriesHouse) {
                var x0 = Math.floor(Math.random() * cols);
                var y0 = Math.floor(Math.random() * rows);
                houseCreated = this.createHouse(map, x0, y0, xSize, ySize, doors, wallsHalos);
                ++tries;
                if (typeof houseCreatd === "object") break;
            }
            if (houseCreated) houses.push(houseCreated);

        }
        return {map: map, houses: houses};
    };

    /** Creates a house into a given map to a location x0,y0 with given
     * dimensions. Existing doors and walls must be passed to prevent
     * overlapping.*/
    this.createHouse = function(map, x0, y0, xDim, yDim, doors, wallsHalos) {
        var maxX = x0 + xDim;
        var maxY = y0 + yDim;
        var wallCoords = [];

        // House doesn't fit on the map
        if (maxX >= map.cols) return false;
        if (maxY >= map.rows) return false;

        var possibleRoom = [];
        var wallXY = RG.Geometry.getHollowBox(x0, y0, maxX, maxY);

        var i;
        // Store x,y for house until failed
        for (i = 0; i < wallXY.length; i++) {
            var x = wallXY[i][0];
            var y = wallXY[i][1];
            if (map.hasXY(x, y)) {
                if (wallsHalos.hasOwnProperty(x + "," + y)) {
                    return false;
                }
                else {
                    if (!doors.hasOwnProperty(x + "," + y)) {
                        possibleRoom.push([x, y]);
                        // Exclude map border from door generation
                        if (!map.isBorderXY(x, y)) wallCoords.push([x, y]);
                    }
                }
            }
        }

        // House generation has succeeded at this point, true will be returned

        // Didn't fail, now we can build the actual walls
        for (i = 0; i < possibleRoom.length; i++) {
            var roomX = possibleRoom[i][0];
            var roomY = possibleRoom[i][1];
            map.setBaseElemXY(roomX, roomY, new RG.Element.Base("wall"));
        }

        // Create the halo, prevents houses being too close to each other
        var haloX0 = x0 - 1;
        var haloY0 = y0 - 1;
        var haloMaxX = maxX + 1;
        var haloMaxY = maxY + 1;
        var haloBox = RG.Geometry.getHollowBox(haloX0, haloY0, haloMaxX, haloMaxY);
        for (i = 0; i < haloBox.length; i++) {
            var haloX = haloBox[i][0];
            var haloY = haloBox[i][1];
            wallsHalos[haloX + "," + haloY] = true;
        }

        // Finally randomly insert the door for the house
        var coordLength = wallCoords.length - 1;
        var doorIndex = Math.floor(Math.random() * coordLength);
        var doorX = wallCoords[doorIndex][0];
        var doorY = wallCoords[doorIndex][1];
        wallCoords.slice(doorIndex, 1);

        // At the moment, "door" is a hole in the wall
        map.setBaseElemXY(doorX, doorY, new RG.Element.Base("floor"));
        doors[doorX + "," + doorY] = true;

        for (i = 0; i < wallCoords.length; i++) {
            var xHalo = wallCoords[i][0];
            var yHalo = wallCoords[i][1];
            wallsHalos[xHalo + "," + yHalo] = true;
        }

        var floorCoords = [];
        for (var x = x0 + 1; x < maxX; x++) {
            for (var y = y0 + 1; y < maxY; y++) {
                floorCoords.push([x, y]);
            }
        }

        // Return room object
        return {
            llx: x0, lly: y0, urx: maxX, ury: maxY,
            walls: wallCoords,
            floor: floorCoords,
            door: [doorX, doorY],
        };
    };

}; // }}} Map.Generator

/** Decorates given map with snow.*/
RG.Map.Generator.prototype.addRandomSnow = function(map, ratio) {
    var freeCells = map.getFree();
    for (var i = 0; i < freeCells.length; i++) {
        var addSnow = Math.random();
        if (addSnow <= ratio) {
            freeCells[i].setBaseElem(new RG.Element.Base("snow"));
        }
    }
};


/** Object for the game levels. Contains map, actors and items.  */
RG.Map.Level = function(cols, rows) { // {{{2
    var _map = null;

    // Assign unique ID for each level
    var _id = RG.Map.Level.prototype.idCount++;

    // Level properties
    var _p = {
        actors: [],
        items:  [],
        elements: [],
        stairs: [],
    };

    var _levelNo = 0;
    this.setLevelNumber = function(no) {_levelNo = no;};
    this.getLevelNumber = function() {return _levelNo;};

    this.getID = function() {return _id;};

    this.getActors = function() {return _p.actors;};

    this.setMap = function(map) {_map = map;};
    this.getMap = function() {return _map;};

    /** Given a level, returns stairs which lead to that level.*/
    this.getStairs = function(level) {
        if (RG.isNullOrUndef([level])) {
            RG.err("Map.Level", "getStairs", "arg |level| required.");
        }

        for (var i = 0; i < _p.stairs.length; i++) {
            if (_p.stairs[i].getTargetLevel() === level) {
                return _p.stairs[i];
            }
        }
        return null;
    };

    //---------------------------------------------------------------------
    // STAIRS RELATED FUNCTIONS
    //---------------------------------------------------------------------

    /** Adds stairs for this level.*/
    this.addStairs = function(stairs, x, y) {
        stairs.setX(x);
        stairs.setY(y);
        if (stairs.getSrcLevel() !== this) stairs.setSrcLevel(this);
        _map.setProp(x, y, "elements", stairs);
        _p.elements.push(stairs);
        _p.stairs.push(stairs);
    };

    /** Uses stairs for given actor if it's on top of the stairs.*/
    this.useStairs = function(actor) {
        var cell = _map.getCell(actor.getX(), actor.getY());
        if (cell.hasStairs()) {
            var stairs = cell.getStairs();
            if (stairs.useStairs(actor)) {
                return true;
            }
            else {
                RG.err("Level", "useStairs", "Failed to use the stairs.");
            }
        }
        return false;
    };

    //---------------------------------------------------------------------
    // ITEM RELATED FUNCTIONS
    //---------------------------------------------------------------------

    this.addItem = function(item, x, y) {
        if (!RG.isNullOrUndef([x, y])) {
            return this._addPropToLevelXY(RG.TYPE_ITEM, item, x, y);
        }
        else {
            var freeCells = _map.getFree();
            if (freeCells.length > 0) {
                var xCell = freeCells[0].getX();
                var yCell = freeCells[0].getY();
                return this._addPropToLevelXY(RG.TYPE_ITEM, item, xCell, yCell);
            }

        }
        return false;
    };

    this.removeItem = function(item, x, y) {
        return _map.removeProp(x, y, RG.TYPE_ITEM, item);
    };

    this.pickupItem = function(actor, x, y) {
        var cell = _map.getCell(x, y);
        if (cell.hasProp(RG.TYPE_ITEM)) {
            var item = cell.getProp(RG.TYPE_ITEM)[0];
            if (actor.getInvEq().canCarryItem(item)) {
                actor.getInvEq().addItem(item);
                cell.removeProp(RG.TYPE_ITEM, item);
                RG.gameMsg(actor.getName() + " picked up " + item.getName());
            }
            else {
                RG.gameMsg(actor.getName() + " cannot carry more weight");
            }
        }
    };

    //---------------------------------------------------------------------
    // ACTOR RELATED FUNCTIONS
    //---------------------------------------------------------------------

    /** Adds an actor to the level. If x,y is given, tries to add there. If not,
     * finds first free cells and adds there. Returns true on success.
     */
    this.addActor = function(actor, x, y) {
        RG.debug(this, "addActor called with x,y " + x + ", " + y);
        if (!RG.isNullOrUndef([x, y])) {
            if (_map.hasXY(x, y)) {
                this._addPropToLevelXY("actors", actor, x, y);
                RG.debug(this, "Added actor to map x: " + x + " y: " + y);
                return true;
            }
            else {
                RG.err("Level", "addActor", "No coordinates " + x + ", " + y + " in the map.");
                return false;
            }
        }
        else {
            RG.nullOrUndefError("Map.Level: addActor", "arg |x|", x);
            RG.nullOrUndefError("Map.Level: addActor", "arg |y|", y);
            return false;
        }
    };

    /** USing this method, actor can be added to a free cell without knowing the
     * exact x,y coordinates.*/
    this.addActorToFreeCell = function(actor) {
        RG.debug(this, "Adding actor to free slot");
        var freeCells = _map.getFree();
        if (freeCells.length > 0) {
            var xCell = freeCells[0].getX();
            var yCell = freeCells[0].getY();
            if (this._addPropToLevelXY("actors", actor, xCell, yCell)) {
                RG.debug(this, "Added actor to free cell in " + xCell + ", " + yCell);
                return true;
            }
        }
        else {
            RG.err("Level", "addActor", "No free cells for the actor.");
        }
        return false;
    };

    /** Adds a prop to level to location x,y. Returns true on success, false on
     * failure.*/
    this._addPropToLevelXY = function(propType, obj, x, y) {
        if (_p.hasOwnProperty(propType)) {
            _p[propType].push(obj);
            if (!obj.hasOwnProperty("getOwner")) {
                obj.setXY(x,y);
                obj.setLevel(this);
            }
            _map.setProp(x, y, propType, obj);
            RG.POOL.emitEvent(RG.EVT_LEVEL_PROP_ADDED, {level: this, obj: obj,
                propType: propType});
            return true;
        }
        else {
            RG.err("Level", "_addPropToLevelXY", "No property " + propType);
        }
        return false;
    };

    /** Removes given actor from level. Returns true if successful.*/
    this.removeActor = function(actor) {
        var index = _p.actors.indexOf(actor);
        var x = actor.getX();
        var y = actor.getY();
        if (_map.removeProp(x, y, "actors", actor)) {
            _p.actors.splice(index, 1);
            return true;
        }
        else {
            return false;
        }
    };

    /** Explores the level from given actor's viewpoint. Sets new cells as
     * explored. There's no exploration tracking per actor.*/
    this.exploreCells = function(actor) {
        var visibleCells = _map.getVisibleCells(actor);
        if (actor.isPlayer()) {
            for (var i = 0; i < visibleCells.length; i++) {
                visibleCells[i].setExplored();
            }
        }
        return visibleCells;
    };

    /** Returns all explored cells in the map.*/
    this.getExploredCells = function() {
        return _map.getExploredCells();
    };

    //---------------------------------------------------------------------------
    // CALLBACKS
    //---------------------------------------------------------------------------
    var _callbacks = {};

    // For setting the callbacks
    this.setOnEnter = function(cb) {_callbacks.OnEnter = cb;};
    this.setOnFirstEnter = function(cb) {_callbacks.OnFirstEnter = cb;};
    this.setOnExit = function(cb) {_callbacks.OnExit = cb;};
    this.setOnFirstExit = function(cb) {_callbacks.OnFirstExit = cb;};

    var _onFirstEnterDone = false;
    var _onFirstExitDone = false;

    this.onEnter = function() {
        if (_callbacks.hasOwnProperty("OnEnter")) _callbacks.OnEnter(this);
    };

    this.onFirstEnter = function() {
        if (!_onFirstEnterDone) {
            if (_callbacks.hasOwnProperty("OnFirstEnter")) 
                _callbacks.OnFirstEnter(this);
            _onFirstEnterDone = true;
        }
    };

    this.onExit = function() {
        if (_callbacks.hasOwnProperty("OnExit")) _callbacks.OnExit(this);
    };

    this.onFirstExit = function() {
        if (!_onFirstExitDone) {
            if (_callbacks.hasOwnProperty("OnFirstExit")) 
                _callbacks.OnFirstExit(this);
            _onFirstExitDone = true;
        }
    };

    /** Return random free cell on a given level.*/
    this.getFreeRandCell = function() {
        var freeCells = this.getMap().getFree();
        if (freeCells.length > 0) {
            var maxFree = freeCells.length;
            var randCell = Math.floor(Math.random() * maxFree);
            var cell = freeCells[randCell];
            return cell;
        }
        return null;
    };

}; // }}} Level
RG.Map.Level.prototype.idCount = 0;

/** Dungeon is a collection of levels.*/
RG.Map.Dungeon = function() {

    var _levels = [];
    var _stairs = [];

    var _conf = {
        cols: 80,
        rows: 60,
        levels: 10,
        levelTypes: ["rooms", "rogue", "digger"],
    };

    /** Given level number, returns the danger level.*/
    this.dangerFunction = function(nlevel) {

    };

    /** Givel level number, returns the value for that level.*/
    this.valueFunction = function(nlevel) {

    };

};

if (typeof module !== "undefined" && typeof exports !== "undefined") {
    GS.exportSource(module, exports, ["RG", "Map"], [RG, RG.Map]);
}
else {
    GS.exportSource(undefined, undefined, ["RG", "Map"], [RG, RG.Map]);
}

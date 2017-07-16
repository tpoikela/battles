
const ROT = require('../../lib/rot.js');
const RG = require('./rg.js');

ROT.Map.Forest = require('../../lib/map.forest');

RG.Element = require('./element.js');

RG.Map = {};

/* Object representing one game cell. It can hold actors, items, traps or
 * elements. */
RG.Map.Cell = function(x, y, elem) { // {{{2

    this._baseElem = elem;
    this._x = x;
    this._y = y;
    this._explored = false;

    this._p = {}; // Cell properties are assigned here

}; // }}} Map.Cell

RG.Map.Cell.prototype.getX = function() {return this._x;};
RG.Map.Cell.prototype.getY = function() {return this._y;};
RG.Map.Cell.prototype.setX = function(x) {this._x = x;};
RG.Map.Cell.prototype.setY = function(y) {this._y = y;};

/* Sets/gets the base element for this cell. There can be only one element.*/
RG.Map.Cell.prototype.setBaseElem = function(elem) { this._baseElem = elem; };
RG.Map.Cell.prototype.getBaseElem = function() { return this._baseElem; };

/* Returns true if cell has any actors.*/
RG.Map.Cell.prototype.hasActors = function() {return this.hasProp('actors');};

/* Returns true if cell has any props. */
RG.Map.Cell.prototype.hasProps = function() {
    return Object.keys(this._p).length > 0;
};

/* Returns true if cell has stairs.*/
RG.Map.Cell.prototype.hasStairs = function() {
    return this.hasPropType('stairsUp') || this.hasPropType('stairsDown');
};

RG.Map.Cell.prototype.hasShop = function() {
    return this.hasPropType('shop');
};

RG.Map.Cell.prototype.hasDoor = function() {
    return this.hasPropType('door');
};

/* Return stairs in this cell, or null if there are none.*/
RG.Map.Cell.prototype.getStairs = function() {
    if (this.hasPropType('stairsUp')) {
        return this.getPropType('stairsUp')[0];
    }
    else if (this.hasPropType('stairsDown')) {
        return this.getPropType('stairsDown')[0];
    }
    return null;
};


/* Returns true if light passes through this map cell.*/
RG.Map.Cell.prototype.lightPasses = function() {
    if (this._baseElem.getType() === 'wall') {return false;}
    else if (this.hasPropType('door')) {
        return this.getPropType('door')[0].isOpen();
    }
    return true;
};

RG.Map.Cell.prototype.isPassable = function() {return this.isFree();};

RG.Map.Cell.prototype.setExplored = function() {this._explored = true;};

RG.Map.Cell.prototype.isExplored = function() {return this._explored;};

/* Returns true if it's possible to move to this cell.*/
RG.Map.Cell.prototype.isFree = function() {
    if (this.hasProp('actors')) {
        for (let i = 0; i < this._p.actors.length; i++) {
            if (!this._p.actors[i].has('Ethereal')) {return false;}
        }
        return true;
    }
    else if (this.hasPropType('door')) {
        return this.getPropType('door')[0].isOpen();
    }
    return this._baseElem.isPassable();
};

/* Add given obj with specified property type.*/
RG.Map.Cell.prototype.setProp = function(prop, obj) {
    if (!this._p.hasOwnProperty(prop)) {this._p[prop] = [];}
    if (this._p.hasOwnProperty(prop)) {
        this._p[prop].push(obj);
        if (obj.hasOwnProperty('setOwner')) {
            obj.setOwner(this);
        }
    }
    else {
        RG.err('Map.Cell', 'setProp', 'No property ' + prop);
    }
};

/* Removes the given object from cell properties.*/
RG.Map.Cell.prototype.removeProp = function(prop, obj) {
    if (this.hasProp(prop)) {
        const props = this._p[prop];
        const index = props.indexOf(obj);
        if (index === -1) {return false;}
        this._p[prop].splice(index, 1);
        if (this._p[prop].length === 0) {
            delete this._p[prop];
        }
        return true;
    }
    return false;
};

/* Returns true if the cell has props of given type.*/
RG.Map.Cell.prototype.hasProp = function(prop) {
    return this._p.hasOwnProperty(prop);
};

/* Returns string representation of the cell.*/
RG.Map.Cell.prototype.toString = function() {
    let str = 'Map.Cell ' + this._x + ', ' + this._y;
    str += ' explored: ' + this._explored;
    str += ' passes light: ' + this.lightPasses();
    Object.keys(this._p).forEach(prop => {
        const arrProps = this._p[prop];
        for (let i = 0; i < arrProps.length; i++) {
            if (arrProps[i].hasOwnProperty('toString')) {
                str += arrProps[i].toString();
            }
            else if (arrProps[i].hasOwnProperty('toJSON')) {
                str += JSON.stringify(arrProps[i].toJSON());
            }
        }
    });
    return str;
};

RG.Map.Cell.prototype.toJSON = function() {
    const json = {
        type: this._baseElem.getType(),
        x: this._x,
        y: this._y,
        explored: this._explored
    };
    if (this._p.hasOwnProperty(RG.TYPE_ELEM)) {
        const elements = [];
        this._p[RG.TYPE_ELEM].forEach(elem => {
            if (/(snow|tree|grass|stone|water)/.test(elem.getType())) {
                elements.push(elem.toJSON());
            }
        });
        json.elements = elements;
    }
    return json;
};

/* Returns true if any cell property has the given type. Ie.
 * myCell.hasPropType("wall"). Doesn't check for basic props like "actors",
 * RG.TYPE_ITEM etc.
 */
RG.Map.Cell.prototype.hasPropType = function(propType) {
    if (this._baseElem.getType() === propType) {return true;}

    const keys = Object.keys(this._p);
    for (let i = 0; i < keys.length; i++) {
    // for (const prop in this._p) {
        // if (this._p.hasOwnProperty(prop)) {
            const prop = keys[i];
            const arrProps = this._p[prop];
            for (let i = 0; i < arrProps.length; i++) {
                if (arrProps[i].getType() === propType) {
                    return true;
                }
            }
        // }
    }
    return false;
};

/* Returns all props with given type in the cell.*/
RG.Map.Cell.prototype.getPropType = function(propType) {
    const props = [];
    if (this._baseElem.getType() === propType) {return [this._baseElem];}
    Object.keys(this._p).forEach(prop => {
        const arrProps = this._p[prop];
        for (let i = 0; i < arrProps.length; i++) {
            if (arrProps[i].getType() === propType) {
                props.push(arrProps[i]);
            }
        }
    });
    return props;
};

RG.Map.Cell.prototype.getProp = function(prop) {
    if (this._p.hasOwnProperty(prop)) {
        return this._p[prop];
    }
    return null;
};

/* Map cell list object which contains a number of cells. A map is used for
 * rendering
 * while the level contains actual information about game elements such as
 * monsters and items.  */
RG.Map.CellList = function(cols, rows) { // {{{2
    this._map = [];
    this.cols = cols;
    this.rows = rows;

    const _cols = cols;
    const _rows = rows;

    if (typeof _cols !== 'number' || typeof _rows !== 'number') {
        RG.err('Map.CellList', 'constructor',
            'Map.CellList(rows, cols) expects 2 integers.');
    }

    for (let x = 0; x < this.cols; x++) {
        this._map.push([]);
        for (let y = 0; y < this.rows; y++) {
            const elem = new RG.Element.Base('floor');
            this._map[x].push(new RG.Map.Cell(x, y, elem));
        }
    }

    /* Returns true if x,y are in the this._map.*/
    this.hasXY = function(x, y) {
        return (x >= 0) && (x < this.cols) && (y >= 0) && (y < this.rows);
    };

    /* Sets a property for the underlying cell.*/
    this.setProp = function(x, y, prop, obj) {
        this._map[x][y].setProp(prop, obj);
    };

    this.removeProp = function(x, y, prop, obj) {
        return this._map[x][y].removeProp(prop, obj);
    };

    this.setElemXY = function(x, y, obj) {
        this.setProp(x, y, RG.TYPE_ELEM, obj);
    };

    this.setBaseElemXY = function(x, y, elem) {
        this._map[x][y].setBaseElem(elem);
    };

    this.getBaseElemXY = function(x, y) {
        return this._map[x][y].getBaseElem();
    };

    this.getCell = function(x, y) {
        return this._map[x][y];
    };

    this.getBaseElemRow = function(y) {
        const row = [];
        for (let i = 0; i < this.cols; ++i) {
            row.push(this._map[i][y].getBaseElem());
        }
        return row;
    };

    this.getCellRow = function(y) {
        const row = [];
        for (let i = 0; i < this.cols; ++i) {
            row.push(this._map[i][y]);
        }
        return row;
    };

    /* Returns all free cells in the this._map. 'free' means that cell can be
    * traversed and is passable. */
    this.getFree = function() {
        const freeCells = [];
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                if (this._map[x][y].isFree()) {
                    freeCells.push(this._map[x][y]);
                }
            }
        }
        return freeCells;
    };

    /* Returns all empty cells. Cell is empty, if it has only the base
     * element, but no props. */
    this.getEmptyCells = function() {
        const emptyCells = [];
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                if (!this._map[x][y].hasProps()) {
                    emptyCells.push(this._map[x][y]);
                }
            }
        }
        return emptyCells;
    };

    /* Returns true if the this._map has a cell in given x,y location.*/
    const _hasXY = function(x, y) {
        return (x >= 0) && (x < _cols) && (y >= 0) && (y < _rows);
    };

    /* Returns true if light passes through this cell.*/
    const lightPasses = function(x, y) {
        if (_hasXY(x, y)) {
            return this._map[x][y].lightPasses(); // delegate to cell
        }
        return false;
    };

    this.isPassable = function(x, y) {
        if (_hasXY(x, y)) {
            return this._map[x][y].isPassable();
        }
        return false;
    };

    const fov = new ROT.FOV.PreciseShadowcasting(lightPasses.bind(this));

    /* Returns visible cells for given actor.*/
    this.getVisibleCells = function(actor) {
        const cells = [];
        const xActor = actor.getX();
        const yActor = actor.getY();
        if (actor.isLocated()) {
            if (actor.getLevel().getMap() === this) {
                const range = actor.getFOVRange();
                fov.compute(xActor, yActor, range, (x, y, r, visibility) => {
                    if (visibility) {
                        if (_hasXY(x, y)) {
                            cells.push(this._map[x][y]);
                        }
                    }
                });
            }
        }
        return cells;
    };

    /* Returns all cells explored by the player.*/
    this.getExploredCells = function() {
        const cells = [];
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                if (this._map[x][y].isExplored()) {
                    cells.push(this._map[x][y]);
                }
            }
        }
    };

    /* Returns true if x,y is located at this._map border cells.*/
    this.isBorderXY = function(x, y) {
        if (x === 0) {return true;}
        if (y === 0) {return true;}
        if (x === this.cols - 1) {return true;}
        if (y === this.rows - 1) {return true;}
        return false;
    };

    /* Prints the this._map in ASCII. */
    this.debugPrintInASCII = function() {
        let mapInASCII = '';
        for (let y = 0; y < this.rows; y++) {
            let row = '';
            for (let x = 0; x < this.cols; x++) {
                const cell = this._map[x][y];
                if (cell.getStairs() !== null) {row += '>';}
                else if (cell.getBaseElem().getType() === 'floor') {row += '.';}
                else {row += '#';}
            }
            mapInASCII += row + '\n';
        }
        console.log(mapInASCII);
    };


}; // }}} this._map.CellList

RG.Map.CellList.invertMap = function(map) {
    for (let x = 0; x < map.cols; x++) {
        for (let y = 0; y < map.rows; y++) {
            const type = map._map[x][y].getBaseElem().getType();
            if (type === 'wall') {
                map._map[x][y].setBaseElem(new RG.Element.Base('floor'));
            }
            else if (type === 'floor') {
                map._map[x][y].setBaseElem(new RG.Element.Base('wall'));
            }
        }
    }
};

RG.Map.CellList.prototype.toJSON = function() {
    const map = [];
    for (let x = 0; x < this.cols; x++) {
        map.push([]);
        for (let y = 0; y < this.rows; y++) {
            map[x][y] = this.getCell(x, y).toJSON();
        }
    }
    return {
        cols: this.cols,
        rows: this.rows,
        cells: map
    };
};

/* Map generator for the roguelike game.  */
RG.Map.Generator = function() { // {{{2

    this.cols = 50;
    this.rows = 30;
    let _mapGen = new ROT.Map.Arena(50, 30);
    let _mapType = null;

    const _types = ['arena', 'cellular', 'digger', 'divided', 'dungeon',
        'eller', 'icey', 'uniform', 'rogue', 'ruins', 'rooms'];

    let _wall = 1;

    this.getRandType = function() {
        const index = RG.RAND.randIndex(_types);
        return _types[index];
    };

    let _nHouses = 5;
    this.setNHouses = function(nHouses) {_nHouses = nHouses;};
    this.getNHouses = function() {return _nHouses;};

    /* Sets the generator for room generation.*/
    this.setGen = function(type, cols, rows) {
        this.cols = cols;
        this.rows = rows;
        type = type.toLowerCase();
        _mapType = type;
        switch (type) {
            case 'arena': _mapGen = new ROT.Map.Arena(cols, rows); break;
            case 'cellular': _mapGen = this.createCellular(cols, rows); break;
            case 'digger': _mapGen = new ROT.Map.Digger(cols, rows); break;
            case 'divided':
                _mapGen = new ROT.Map.DividedMaze(cols, rows); break;
            case 'empty': _mapGen = new ROT.Map.Dungeon(cols, rows); break;
            case 'eller': _mapGen = new ROT.Map.EllerMaze(cols, rows); break;
            case 'forest': _mapGen = new ROT.Map.Forest(cols, rows); break;
            case 'icey': _mapGen = new ROT.Map.IceyMaze(cols, rows); break;
            case 'rogue': _mapGen = new ROT.Map.Rogue(cols, rows); break;
            case 'uniform': _mapGen = new ROT.Map.Uniform(cols, rows); break;
            case 'ruins': _mapGen = this.createRuins(cols, rows); break;
            case 'rooms': _mapGen = this.createRooms(cols, rows); break;
            default: RG.err('MapGen',
                'setGen', '_mapGen type ' + type + ' is unknown');
        }
    };

    /* Returns an object containing randomized map + all special features
     * based on initialized generator settings. */
    this.getMap = function() {
        const map = new RG.Map.CellList(this.cols, this.rows);
        _mapGen.create(function(x, y, val) {
            if (val === _wall) {
                map.setBaseElemXY(x, y, new RG.Element.Base('wall'));
            }
            else {
                map.setBaseElemXY(x, y, new RG.Element.Base('floor'));
            }
        });
        const obj = {map};
        if (_mapType === 'uniform' || _mapType === 'digger') {
            obj.rooms = _mapGen.getRooms(); // ROT.Map.Feature.Room
            obj.corridors = _mapGen.getCorridors(); // ROT.Map.Feature.Corridor
        }

        return obj;
    };


    /* Creates "ruins" type level with open outer edges and inner
     * "fortress" with some tunnels. */
    this.createRuins = function(cols, rows) {
        const conf = {born: [4, 5, 6, 7, 8],
            survive: [2, 3, 4, 5], connected: true};
        const map = new ROT.Map.Cellular(cols, rows, conf);
        map.randomize(0.9);
        for (let i = 0; i < 5; i++) {map.create();}
        map.connect(null, 1);
        _wall = 0;
        return map;
    };

    /* Creates a cellular type dungeon and makes all areas connected.*/
    this.createCellular = function(cols, rows) {
        const map = new ROT.Map.Cellular(cols, rows,
            {connected: true});
        map.randomize(0.52);
        for (let i = 0; i < 5; i++) {map.create();}
        map.connect(null, 1);
        _wall = 0;
        return map;
    };

    this.createRooms = function(cols, rows) {
        const map = new ROT.Map.Digger(cols, rows,
            {roomWidth: [5, 20], dugPercentage: 0.7});
        return map;
    };

    /* Creates a town level of size cols X rows. */
    this.createTown = function(cols, rows, conf) {
        const maxTriesHouse = 100;
        const doors = {};
        const wallsHalos = {};

        let nHouses = 5;
        let minX = 5;
        let maxX = 5;
        let minY = 5;
        let maxY = 5;

        if (conf.hasOwnProperty('nHouses')) {nHouses = conf.nHouses;}
        if (conf.hasOwnProperty('minHouseX')) {minX = conf.minHouseX;}
        if (conf.hasOwnProperty('minHouseY')) {minY = conf.minHouseY;}
        if (conf.hasOwnProperty('maxHouseX')) {maxX = conf.maxHouseX;}
        if (conf.hasOwnProperty('maxHouseY')) {maxY = conf.maxHouseY;}

        const houses = [];
        this.setGen('arena', cols, rows);
        const mapObj = this.getMap();
        const map = mapObj.map;

        for (let i = 0; i < nHouses; i++) {

            let houseCreated = false;
            let tries = 0;
            const xSize = RG.RAND.getUniformInt(minX, maxX);
            const ySize = RG.RAND.getUniformInt(minY, maxY);

            // Select random starting point, try to build house there
            while (!houseCreated && tries < maxTriesHouse) {
                const x0 = RG.RAND.getUniformInt(0, cols - 1);
                const y0 = RG.RAND.getUniformInt(0, rows - 1);
                houseCreated = this.createHouse(
                    map, x0, y0, xSize, ySize, doors, wallsHalos);
                ++tries;
                if (typeof houseCreatd === 'object') {break;}
            }
            if (houseCreated) {houses.push(houseCreated);}

        }
        return {map, houses};
    };

    /* Creates a house into a given map to a location x0,y0 with given
     * dimensions. Existing doors and walls must be passed to prevent
     * overlapping.*/
    this.createHouse = function(map, x0, y0, xDim, yDim, doors, wallsHalos) {
        const maxX = x0 + xDim;
        const maxY = y0 + yDim;
        const wallCoords = [];

        // House doesn't fit on the map
        if (maxX >= map.cols) {return false;}
        if (maxY >= map.rows) {return false;}

        const possibleRoom = [];
        const wallXY = RG.Geometry.getHollowBox(x0, y0, maxX, maxY);

        // Store x,y for house until failed
        for (let i = 0; i < wallXY.length; i++) {
            const x = wallXY[i][0];
            const y = wallXY[i][1];
            if (map.hasXY(x, y)) {
                if (wallsHalos.hasOwnProperty(x + ',' + y)) {
                    return false;
                }
                else if (!doors.hasOwnProperty(x + ',' + y)) {
                        possibleRoom.push([x, y]);
                        // Exclude map border from door generation
                        if (!map.isBorderXY(x, y)) {wallCoords.push([x, y]);}
                    }
            }
        }

        // House generation has succeeded at this point, true will be returned

        // Didn't fail, now we can build the actual walls
        for (let i = 0; i < possibleRoom.length; i++) {
            const roomX = possibleRoom[i][0];
            const roomY = possibleRoom[i][1];
            map.setBaseElemXY(roomX, roomY, new RG.Element.Base('wall'));
        }

        // Create the halo, prevents houses being too close to each other
        const haloX0 = x0 - 1;
        const haloY0 = y0 - 1;
        const haloMaxX = maxX + 1;
        const haloMaxY = maxY + 1;
        const haloBox = RG.Geometry.getHollowBox(
            haloX0, haloY0, haloMaxX, haloMaxY);
        for (let i = 0; i < haloBox.length; i++) {
            const haloX = haloBox[i][0];
            const haloY = haloBox[i][1];
            wallsHalos[haloX + ',' + haloY] = true;
        }

        // Finally randomly insert the door for the house
        // const coordLength = wallCoords.length - 1;
        // const doorIndex = Math.floor(Math.random() * coordLength);
        const doorIndex = RG.RAND.randIndex(wallCoords);
        const doorX = wallCoords[doorIndex][0];
        const doorY = wallCoords[doorIndex][1];
        wallCoords.slice(doorIndex, 1);

        // At the moment, "door" is a hole in the wall
        map.setBaseElemXY(doorX, doorY, new RG.Element.Base('floor'));
        doors[doorX + ',' + doorY] = true;

        for (let i = 0; i < wallCoords.length; i++) {
            const xHalo = wallCoords[i][0];
            const yHalo = wallCoords[i][1];
            wallsHalos[xHalo + ',' + yHalo] = true;
        }

        const floorCoords = [];
        for (let x = x0 + 1; x < maxX; x++) {
            for (let y = y0 + 1; y < maxY; y++) {
                floorCoords.push([x, y]);
            }
        }

        // Return room object
        return {
            llx: x0, lly: y0, urx: maxX, ury: maxY,
            walls: wallCoords,
            floor: floorCoords,
            door: [doorX, doorY]
        };
    };

    /* Creates a forest map. Uses the same RNG but instead of walls, populates
     * using trees. Ratio is conversion ratio of walls to trees. For example,
     * 0.5 on average replaces half the walls with tree, and removes rest of
     * the walls. */
    this.createForest = function(conf) {
        const map = new RG.Map.CellList(this.cols, this.rows);
        const ratio = conf.ratio;
        _mapGen = new ROT.Map.Forest(this.cols, this.rows, conf);
        _mapGen.create(function(x, y, val) {
            map.setBaseElemXY(x, y, new RG.Element.Base('floor'));
            const createTree = RG.RAND.getUniform() <= ratio;
            if (val === 1 && createTree) {
                map.setElemXY(x, y, new RG.Element.Tree('tree'));
            }
            else if (val === 1) {
                map.setElemXY(x, y, new RG.Element.Grass('grass'));
            }
        });
        return {map};
    };

    this.createMountain = function() {
        const map = new RG.Map.CellList(this.cols, this.rows);
        _mapGen.create(function(x, y, val) {
            map.setBaseElemXY(x, y, new RG.Element.Base('floor'));
            if (val === _wall) {
                map.setElemXY(x, y, new RG.Element.Stone('stone'));
            }
        });
        return {map};
    };

}; // }}} Map.Generator

/* Decorates given map with snow.*/
RG.Map.Generator.prototype.addRandomSnow = function(map, ratio) {
    const freeCells = map.getFree();
    for (let i = 0; i < freeCells.length; i++) {
        const addSnow = RG.RAND.getUniform();
        if (addSnow <= ratio) {
            freeCells[i].setBaseElem(new RG.Element.Base('snow'));
        }
    }
};


/* Object for the game levels. Contains map, actors and items.  */
RG.Map.Level = function() { // {{{2
    let _map = null;
    let _id = RG.Map.Level.prototype.idCount++;
    let _parent = null; // Reference to dungeon,city,mountain...

    // Level properties
    const _p = {
        actors: [],
        items: [],
        elements: []
    };

    let _levelNo = 0;
    this.setLevelNumber = function(no) {_levelNo = no;};
    this.getLevelNumber = function() {return _levelNo;};

    this.getID = function() {return _id;};
    this.setID = function(id) {_id = id;};

    this.getParent = function() {return _parent;};
    this.setParent = function(parent) {
        if (!RG.isNullOrUndef([parent])) {
            _parent = parent;
        }
        else {
            RG.err('Map.Level', 'setParent',
                'Parent is not defined.');
        }
    };

    this.getActors = function() {return _p.actors;};
    this.getItems = function() {return _p.items;};
    this.getElements = function() {return _p.elements;};

    /* Returns all stairs elements. */
    this.getStairs = function() {
        const res = [];
        _p.elements.forEach(elem => {
            if (_isStairs(elem)) {
                res.push(elem);
            }
        });
        return res;
    };

    const _isStairs = function(elem) {
        return (/stairs(Down|Up)/).test(elem.getType());
    };

    this.setMap = function(map) {_map = map;};
    this.getMap = function() {return _map;};

    /* Given a level, returns stairs which lead to that level.*/
    this.getStairsToLevel = function(level) {
        if (RG.isNullOrUndef([level])) {
            RG.err('Map.Level', 'getStairs', 'arg |level| required.');
        }

        const allStairs = this.getStairs();
        for (let i = 0; i < allStairs.length; i++) {
            if (allStairs[i].getTargetLevel() === level) {
                return allStairs[i];
            }
        }
        return null;
    };

    //---------------------------------------------------------------------
    // GENERIC ADD METHOD
    //---------------------------------------------------------------------
    this.addToRandomCell = function(obj) {
        const cell = this.getFreeRandCell();
        switch (obj.getPropType()) {
            case RG.TYPE_ITEM:
                this.addItem(obj, cell.getX(), cell.getY());
                break;
            default: RG.err('Map.Level', 'addToRandomCell',
                `No known propType |${obj.getPropType()}|`);
        }
    };

    //---------------------------------------------------------------------
    // STAIRS RELATED FUNCTIONS
    //---------------------------------------------------------------------

    /* Adds stairs for this level.*/
    this.addStairs = function(stairs, x, y) {
        if (!RG.isNullOrUndef([x, y])) {
            stairs.setSrcLevel(this);
            return this._addPropToLevelXY(RG.TYPE_ELEM, stairs, x, y);
        }
        else {
            RG.err('Map.Level', 'addStairs',
                'Cannot add stairs. x, y missing.');
        }
        return false;
    };

    /* Uses stairs for given actor if it's on top of the stairs.*/
    this.useStairs = function(actor) {
        const cell = _map.getCell(actor.getX(), actor.getY());
        if (cell.hasStairs()) {
            const stairs = cell.getStairs();
            if (stairs.useStairs(actor)) {
                return true;
            }
            else {
                RG.err('Level', 'useStairs', 'Failed to use the stairs.');
            }
        }
        return false;
    };

    /* Adds one element into the level. */
    this.addElement = function(elem, x, y) {
        if (_isStairs(elem)) {
            return this.addStairs(elem, x, y);
        }
        return this._addPropToLevelXY(RG.TYPE_ELEM, elem, x, y);
    };

    //---------------------------------------------------------------------
    // ITEM RELATED FUNCTIONS
    //---------------------------------------------------------------------

    /* Adds one item to the given location on the level.*/
    this.addItem = function(item, x, y) {
        if (!RG.isNullOrUndef([x, y])) {
            return this._addPropToLevelXY(RG.TYPE_ITEM, item, x, y);
        }
        else {
            const freeCells = _map.getFree();
            if (freeCells.length > 0) {
                const xCell = freeCells[0].getX();
                const yCell = freeCells[0].getY();
                return this._addPropToLevelXY(RG.TYPE_ITEM, item, xCell, yCell);
            }

        }
        return false;
    };

    /* Removes an item from the level in x,y position.*/
    this.removeItem = function(item, x, y) {
        return this._removePropFromLevelXY(RG.TYPE_ITEM, item, x, y);
    };

    this.pickupItem = function(actor, x, y) {
        const cell = _map.getCell(x, y);
        if (cell.hasProp(RG.TYPE_ITEM)) {
            const item = cell.getProp(RG.TYPE_ITEM)[0];
            if (actor.getInvEq().canCarryItem(item)) {
                actor.getInvEq().addItem(item);
                this.removeItem(item, x, y);
                RG.gameMsg(actor.getName() + ' picked up ' + item.getName());
            }
            else {
                RG.gameMsg(actor.getName() + ' cannot carry more weight');
            }
        }
    };

    //---------------------------------------------------------------------
    // ACTOR RELATED FUNCTIONS
    //---------------------------------------------------------------------

    /* Adds an actor to the level. If x,y is given, tries to add there. If not,
     * finds first free cells and adds there. Returns true on success.
     */
    this.addActor = function(actor, x, y) {
        RG.debug(this, 'addActor called with x,y ' + x + ', ' + y);
        if (!RG.isNullOrUndef([x, y])) {
            if (_map.hasXY(x, y)) {
                this._addPropToLevelXY(RG.TYPE_ACTOR, actor, x, y);
                RG.debug(this, 'Added actor to map x: ' + x + ' y: ' + y);
                return true;
            }
            else {
                RG.err('Level', 'addActor',
                    'No coordinates ' + x + ', ' + y + ' in the map.');
                return false;
            }
        }
        else {
            RG.nullOrUndefError('Map.Level: addActor', 'arg |x|', x);
            RG.nullOrUndefError('Map.Level: addActor', 'arg |y|', y);
            return false;
        }
    };

    /* USing this method, actor can be added to a free cell without knowing the
     * exact x,y coordinates.*/
    this.addActorToFreeCell = function(actor) {
        RG.debug(this, 'Adding actor to free slot');
        const freeCells = _map.getFree();
        if (freeCells.length > 0) {
            const xCell = freeCells[0].getX();
            const yCell = freeCells[0].getY();
            if (this._addPropToLevelXY(RG.TYPE_ACTOR, actor, xCell, yCell)) {
                RG.debug(this,
                    'Added actor to free cell in ' + xCell + ', ' + yCell);
                return true;
            }
        }
        else {
            RG.err('Level', 'addActor', 'No free cells for the actor.');
        }
        return false;
    };

    /* Adds a prop 'obj' to level location x,y. Returns true on success,
     * false on failure.*/
    this._addPropToLevelXY = function(propType, obj, x, y) {
        if (_p.hasOwnProperty(propType)) {
            _p[propType].push(obj);
            if (!obj.hasOwnProperty('getOwner')) {
                obj.setXY(x, y);
                obj.setLevel(this);
            }
            _map.setProp(x, y, propType, obj);
            RG.POOL.emitEvent(RG.EVT_LEVEL_PROP_ADDED, {level: this, obj,
                propType});
            return true;
        }
        else {
            RG.err('Map.Level', '_addPropToLevelXY',
                `No prop ${propType} supported. Obj: ${JSON.stringify(obj)}`);
        }
        return false;
    };

    /* Removes a prop 'obj' to level location x,y. Returns true on success,
     * false on failure.*/
    this._removePropFromLevelXY = function(propType, obj, x, y) {
        if (_p.hasOwnProperty(propType)) {
            const index = _p[propType].indexOf(obj);

            if (index >= 0) {
                _p[propType].splice(index, 1);
                if (!obj.hasOwnProperty('getOwner')) {
                    obj.setXY(null, null);
                    obj.unsetLevel();
                }
                RG.POOL.emitEvent(RG.EVT_LEVEL_PROP_REMOVED,
                    {level: this, obj, propType});
                return _map.removeProp(x, y, propType, obj);
            }
            else {
                RG.err('Map.Level', '_removePropFromLevelXY',
                    `Obj index not found in list _p[${propType}]`);

            }
            return false;
        }
        else {
            RG.err('Map.Level', '_removePropFromLevelXY',
                `No prop ${propType} supported. Obj: ${JSON.stringify(obj)}`);
        }
        return false;
    };

    /* Removes given actor from level. Returns true if successful.*/
    this.removeActor = function(actor) {
        const index = _p.actors.indexOf(actor);
        const x = actor.getX();
        const y = actor.getY();
        if (_map.removeProp(x, y, RG.TYPE_ACTOR, actor)) {
            _p.actors.splice(index, 1);
            return true;
        }
        else {
            return false;
        }
    };

    /* Explores the level from given actor's viewpoint. Sets new cells as
     * explored. There's no exploration tracking per actor.*/
    this.exploreCells = function(actor) {
        const visibleCells = _map.getVisibleCells(actor);
        if (actor.isPlayer()) {
            for (let i = 0; i < visibleCells.length; i++) {
                visibleCells[i].setExplored();
            }
        }
        return visibleCells;
    };

    /* Returns all explored cells in the map.*/
    this.getExploredCells = function() {
        return _map.getExploredCells();
    };

    //-----------------------------------------------------------------
    // CALLBACKS
    //----------------------------------------------------------------
    const _callbacks = {};

    // For setting the callbacks
    this.setOnEnter = function(cb) {_callbacks.OnEnter = cb;};
    this.setOnFirstEnter = function(cb) {_callbacks.OnFirstEnter = cb;};
    this.setOnExit = function(cb) {_callbacks.OnExit = cb;};
    this.setOnFirstExit = function(cb) {_callbacks.OnFirstExit = cb;};

    const _cbState = {
        onFirstEnterDone: false,
        onFirstExitDone: false
    };

    this.onEnter = function() {
        if (_callbacks.hasOwnProperty('OnEnter')) {_callbacks.OnEnter(this);}
    };

    this.onFirstEnter = function() {
        if (!_cbState.onFirstEnterDone) {
            if (_callbacks.hasOwnProperty('OnFirstEnter')) {
                _callbacks.OnFirstEnter(this);
            }
            _cbState.onFirstEnterDone = true;
        }
    };

    this.onExit = function() {
        if (_callbacks.hasOwnProperty('OnExit')) {_callbacks.OnExit(this);}
    };

    this.onFirstExit = function() {
        if (!_cbState.onFirstExitDone) {
            if (_callbacks.hasOwnProperty('OnFirstExit')) {
                _callbacks.OnFirstExit(this);
            }
            _cbState.onFirstExitDone = true;
        }
    };

    /* Return random free cell on a given level.*/
    this.getFreeRandCell = function() {
        const freeCells = this.getMap().getFree();
        if (freeCells.length > 0) {
            const index = RG.RAND.randIndex(freeCells);
            return freeCells[index];
        }
        return null;
    };

    /* Returns random empty cells, or null if cannot find any.*/
    this.getEmptyRandCell = function() {
        const emptyCells = this.getMap().getEmptyCells();
        if (emptyCells.length > 0) {
            const index = RG.RAND.randIndex(emptyCells);
            return emptyCells[index];
        }
        return null;
    };

    /* Serializes the level object. */
    this.toJSON = function() {
        const obj = {
            id: this.getID(),
            levelNumber: this.getLevelNumber(),
            actors: [],
            items: [],
            elements: [],
            map: this.getMap().toJSON(),
            cbState: JSON.stringify(_cbState)
        };

        const parent = this.getParent();
        if (parent) {
            obj.parent = parent;
        }

        // Must store x, y for each prop as well
        const props = ['actors', 'items', 'elements'];
        props.forEach(propType => {
            _p[propType].forEach(prop => {
                const propObj = {
                    x: prop.getX(),
                    y: prop.getY(),
                    obj: prop.toJSON()
                };
                // Avoid storing player twice (stored in Game.Main already)
                if (!propType === 'actors') {
                    obj[propType].push(propObj);
                }
                else if (propObj.obj.type !== 'player') {
                    obj[propType].push(propObj);
                }
            });
        });

        return obj;
    };

}; // }}} Level
RG.Map.Level.prototype.idCount = 0;

RG.Map.Level.createLevelID = function() {
    const id = RG.Map.Level.prototype.idCount;
    RG.Map.Level.prototype.idCount += 1;
    return id;
};


module.exports = RG.Map;

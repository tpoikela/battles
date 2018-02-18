
const ROT = require('../../lib/rot.js');
const RG = require('./rg.js');

const {TYPE_ACTOR, TYPE_ELEM, TYPE_ITEM} = RG;

RG.Element = require('./element.js');

RG.Map = {};

/* Object representing one game cell. It can hold actors, items, traps or
 * elements. Cell has x,y for convenient access to coordinates.
 * */
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
RG.Map.Cell.prototype.isAtXY = function(x, y) {
    return x === this._x && y === this._y;
};

/* Sets/gets the base element for this cell. There can be only one element.*/
RG.Map.Cell.prototype.setBaseElem = function(elem) { this._baseElem = elem; };
RG.Map.Cell.prototype.getBaseElem = function() { return this._baseElem; };

/* Returns true if cell has any actors.*/
RG.Map.Cell.prototype.hasActors = function() {return this.hasProp(TYPE_ACTOR);};
RG.Map.Cell.prototype.getActors = function() {return this.getProp(TYPE_ACTOR);};
RG.Map.Cell.prototype.getFirstActor = function() {
    const actors = this.getProp(TYPE_ACTOR);
    if (actors && actors.length > 0) {
        return actors[0];
    }
    return null;
};

RG.Map.Cell.prototype.hasItems = function() {return this.hasProp(TYPE_ITEM);};
RG.Map.Cell.prototype.getItems = function() {return this.getProp(TYPE_ITEM);};

/* Returns true if cell has any props. */
RG.Map.Cell.prototype.hasProps = function() {
    return Object.keys(this._p).length > 0;
};

/* Returns true if cell has stairs.*/
RG.Map.Cell.prototype.hasStairs = function() {
    const propType = this.getConnection();
    if (propType) {
        const name = propType.getName();
        return (/stairs(Up|Down)/).test(name);
    }
    return false;
};

/* Returns true if cell has passage to another tile. */
RG.Map.Cell.prototype.hasPassage = function() {
    const propType = this.getConnection();
    if (propType) {return propType.getName() === 'passage';}
    return false;
};

RG.Map.Cell.prototype.hasShop = function() {
    return this.hasPropType('shop');
};

RG.Map.Cell.prototype.getShop = function() {
    return this.getPropType('shop')[0];
};

RG.Map.Cell.prototype.hasDoor = function() {
    return this.hasPropType('door');
};

RG.Map.Cell.prototype.hasConnection = function() {
    return this.hasPropType('connection');
};

/* Return stairs in this cell, or null if there are none.*/
RG.Map.Cell.prototype.getStairs = function() {
    if (this.hasStairs()) {
        return this.getConnection();
    }
    return null;
};

RG.Map.Cell.prototype.getConnection = function() {
    if (this.hasPropType('connection')) {
        return this.getPropType('connection')[0];
    }
    return null;
};

/* Returns passage in this cell, or null if not found. */
RG.Map.Cell.prototype.getPassage = function() {
    if (this.hasPassage()) {
        return this.getConnection();
    }
    return null;
};

/* Returns true if light passes through this map cell.*/
RG.Map.Cell.prototype.lightPasses = function() {
    if (!this._baseElem.lightPasses()) {return false;}
    if (this.hasPropType('door')) {
        return this.getPropType('door')[0].isOpen();
    }
    return true;
};

RG.Map.Cell.prototype.isPassable = function() {return this.isFree();};
RG.Map.Cell.prototype.isPassableByAir = function() {
    return this._baseElem.isPassableByAir();
};

RG.Map.Cell.prototype.hasObstacle = function() {
    this._baseElem.isObstacle();
};

RG.Map.Cell.prototype.isSpellPassable = function() {
    return this._baseElem.isSpellPassable();
};

RG.Map.Cell.prototype.setExplored = function() {this._explored = true;};

RG.Map.Cell.prototype.isExplored = function() {return this._explored;};

/* Returns true if it's possible to move to this cell.*/
RG.Map.Cell.prototype.isFree = function(isFlying = false) {
    if (this.hasProp(TYPE_ACTOR)) {
        for (let i = 0; i < this._p.actors.length; i++) {
            if (!this._p.actors[i].has('Ethereal')) {return false;}
        }
        return true;
    }
    else if (this.hasPropType('door')) {
        return this.getPropType('door')[0].isOpen();
    }
    // Handle flying/non-flying here
    if (!isFlying) {
        return this._baseElem.isPassable();
    }
    else {
        return this._baseElem.isPassableByAir();
    }
};

/* Add given obj with specified property type.*/
RG.Map.Cell.prototype.setProp = function(prop, obj) {
    if (!this._p.hasOwnProperty(prop)) {this._p[prop] = [];}
    if (this._p.hasOwnProperty(prop)) {
        this._p[prop].push(obj);
        if (obj.isOwnable) {
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
        y: this._y
    };

    if (this._explored) {
        json.ex = 1;
    }

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
        const prop = keys[i];
        const arrProps = this._p[prop];
        for (let j = 0; j < arrProps.length; j++) {
            if (arrProps[j].getType() === propType) {
                return true;
            }
        }
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

/* For debugging to find a given object. */
RG.Map.Cell.prototype.findObj = function(filterFunc) {
    const result = [];
    Object.keys(this._p).forEach(propType => {
        const props = this._p[propType];
        props.forEach(propObj => {
            if (filterFunc(propObj)) {
                result.push(propObj);
            }
        });
    });
    return result;
};

/* Map cell list object which contains a number of cells. A map is used for
 * rendering
 * while the level contains actual information about game elements such as
 * monsters and items.  */
RG.Map.CellList = function(cols, rows, baseElem = RG.ELEM.FLOOR) { // {{{2
    this._map = [];
    this.cols = cols;
    this.rows = rows;

    const _cols = cols;
    const _rows = rows;

    if (typeof _cols !== 'number' || typeof _rows !== 'number') {
        RG.err('Map.CellList', 'constructor',
            'Map.CellList(rows, cols) expects 2 integers.');
    }

    // Initialize cells with floor
    for (let x = 0; x < this.cols; x++) {
        this._map.push([]);
        for (let y = 0; y < this.rows; y++) {
            this._map[x].push(new RG.Map.Cell(x, y, baseElem));
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

    /* Returns the first free cell starting from right edge of the level.
    * Range of y-coord can be given, if not, searches all y-coordinates starting
    * from 0.
    */
    this.getFirstFreeFromRight = function(y0 = 0, y1 = this.rows - 1) {
        for (let x = this.cols - 1; x >= 0; x--) {
            for (let y = y0; y <= y1; y++) {
                if (this._map[x][y].isFree()) {
                    return this._map[x][y];
                }
            }
        }
        return null;
    };

    /* Returns all free cells in the given bounding box. */
    this.getFreeInBbox = function(bbox) {
        const freeCells = [];
        for (let x = bbox.ulx; x <= bbox.lrx; x++) {
            for (let y = bbox.uly; y < bbox.lry; y++) {
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
    const _hasXY = (x, y) => (x >= 0) && (x < _cols) && (y >= 0) && (y < _rows);

    /* Returns true if light passes through this cell.*/
    const lightPasses = function(x, y) {
        if (_hasXY(x, y)) {
            return this._map[x][y].lightPasses(); // delegate to cell
        }
        return false;
    };

    this.hasObstacle = function(x, y) {
        if (_hasXY(x, y)) {
            return this._map[x][y].hasObstacle();
        }
        return false;
    };

    this.isPassable = function(x, y) {
        if (_hasXY(x, y)) {
            return this._map[x][y].isPassable();
        }
        return false;
    };

    this.isPassableByAir = function(x, y) {
        if (_hasXY(x, y)) {
            return this._map[x][y].isPassableByAir();
        }
        return false;
    };

    const fov = new ROT.FOV.RecursiveShadowcasting(lightPasses.bind(this));

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
                const baseType = cell.getBaseElem().getType();
                if (cell.getStairs() !== null) {row += '>';}
                else if ((/floor/).test(baseType)) {row += '.';}
                else if ((/water/).test(baseType)) {row += '~';}
                else if ((/wall/).test(baseType)) {row += '#';}
                else {row += '?';}
            }
            mapInASCII += row + '\n';
        }
        console.log(mapInASCII);
    };

    /* Queries a row of cells. _optimizeForRowAccess must be called before this
     * function is used. */
    this.getCellRowFast = function(y) {
        return this._rowMap[y];
    };

    /* Slow find for debugging. Tries to find all objects matching the
     * filterFunc. */
    this.findObj = function(filterFunc) {
        let result = [];
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                result = result.concat(this._map[x][y].findObj(filterFunc));
            }
        }
        return result;
    };


}; // }}} this._map.CellList

/* Get cells that return true for the given filter function. For example:
 *   cell => cell.hasActors()
 * OR
 *   cell => cell.getBaseElem().getType() === 'floor'
 */
RG.Map.CellList.prototype.getCells = function(filter) {
    const result = [];
    for (let x = 0; x < this.cols; x++) {
        for (let y = 0; y < this.rows; y++) {
            if (filter(this._map[x][y])) {
                result.push(this._map[x][y]);
            }
        }
    }
    return result;
};

RG.Map.CellList.prototype.getCellsWithCoord = function(coord) {
    const result = [];
    coord.forEach(xy => {
        result.push(this._map[xy[0]][xy[1]]);
    });
    return result;
};

RG.Map.CellList.prototype.setBaseElems = function(coord, elem) {
    coord.forEach(xy => {
        this._map[xy[0]][xy[1]].setBaseElem(elem);
    });
};

RG.Map.CellList.invertMap = map => {
    for (let x = 0; x < map.cols; x++) {
        for (let y = 0; y < map.rows; y++) {
            const type = map._map[x][y].getBaseElem().getType();
            if (type === 'wall') {
                map._map[x][y].setBaseElem(RG.ELEM.FLOOR);
            }
            else if (type === 'floor') {
                map._map[x][y].setBaseElem(RG.ELEM.WALL);
            }
        }
    }
};

/* Creates another internal representation of the map. This can be used for fast
 * row access. */
RG.Map.CellList.prototype._optimizeForRowAccess = function() {
    this._rowMap = [];
    for (let y = 0; y < this.rows; y++) {
        this._rowMap[y] = [];
        for (let x = 0; x < this.cols; x++) {
            this._rowMap[y][x] = this._map[x][y];
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
    this.setLevelNumber = no => {_levelNo = no;};
    this.getLevelNumber = () => _levelNo;

    this.getID = () => _id;
    this.setID = id => {_id = id;};

    this.getParent = () => _parent;
    this.setParent = parent => {
        if (!RG.isNullOrUndef([parent])) {
            _parent = parent;
        }
        else {
            RG.err('Map.Level', 'setParent',
                'Parent is not defined.');
        }
    };

    this.getActors = () => _p.actors;
    this.getItems = () => _p.items;
    this.getElements = () => _p.elements;

    /* Returns all stairs elements. */
    this.getStairs = () => {
        const res = [];
        _p.elements.forEach(elem => {
            if (_isStairs(elem)) {
                res.push(elem);
            }
        });
        return res;
    };

    this.getPassages = () => {
        const res = [];
        _p.elements.forEach(elem => {
            if (elem.getName() === 'passage') {
                res.push(elem);
            }
        });
        return res;
    };

    this.getConnections = () => {
        const conn = [];
        _p.elements.forEach(elem => {
            if (elem.getType() === 'connection') {
                conn.push(elem);
            }
        });
        return conn;
    };

    const _isStairs = elem => (/stairs(Down|Up)/).test(elem.getName());

    this.setMap = map => {_map = map;};
    this.getMap = () => _map;

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
            if (_map.hasXY(x, y)) {
              stairs.setSrcLevel(this);
              // Prevents stairs on impassable squares
              _map.setBaseElemXY(x, y, RG.ELEM.FLOOR);
              return this._addPropToLevelXY(RG.TYPE_ELEM, stairs, x, y);
            }
            else {
              const msg = `x,y ${x},${y} out of map bounds.`;
                RG.err('Map.Level', 'addStairs',
                  `${msg}: cols ${_map.cols}, rows: ${_map.rows}`);
            }
        }
        else {
            RG.err('Map.Level', 'addStairs',
                'Cannot add stairs. x, y missing.');
        }
        return false;
    };

    /* Uses stairs for given actor if it's on top of the stairs.*/
    this.useStairs = actor => {
        const cell = _map.getCell(actor.getX(), actor.getY());
        if (cell.hasConnection()) {
            const connection = cell.getConnection();
            if (connection.useStairs(actor)) {
                return true;
            }
            else {
                RG.err('Level', 'useStairs', 'Failed to use connection.');
            }
        }
        return false;
    };

    /* Adds one element into the level. */
    this.addElement = function(elem, x, y) {
        if (elem.getType() === 'connection') {
            return this.addStairs(elem, x, y);
        }
        if (!RG.isNullOrUndef([x, y])) {
            return this._addPropToLevelXY(RG.TYPE_ELEM, elem, x, y);
        }
        const [xCell, yCell] = this._getFreeCellXY();
        return this._addPropToLevelXY(RG.TYPE_ELEM, elem, xCell, yCell);
    };

    this.removeElement = function(elem, x, y) {
        return this._removePropFromLevelXY(RG.TYPE_ELEM, elem, x, y);
    };

    //---------------------------------------------------------------------
    // ITEM RELATED FUNCTIONS
    //---------------------------------------------------------------------

    /* Adds one item to the given location on the level.*/
    this.addItem = function(item, x, y) {
        if (!RG.isNullOrUndef([x, y])) {
            return this._addPropToLevelXY(RG.TYPE_ITEM, item, x, y);
        }
        const [xCell, yCell] = this._getFreeCellXY();
        return this._addPropToLevelXY(RG.TYPE_ITEM, item, xCell, yCell);
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

                let itemStr = item.getName();
                if (item.count > 1) {
                    itemStr += ' x' + item.count;
                }
                RG.gameMsg(actor.getName() + ' picked up ' + itemStr);
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

    /* Using this method, actor can be added to a free cell without knowing the
     * exact x,y coordinates. This is not random, such that top-left (0,0) is
     * always preferred. */
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
            if (!obj.isOwnable) {
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

    /* Adds virtual prop not associated with x,y position or a cell. */
    this.addVirtualProp = function(propType, obj) {
        if (_p.hasOwnProperty(propType)) {
            _p[propType].push(obj);
            obj.setLevel(this);
            RG.POOL.emitEvent(RG.EVT_LEVEL_PROP_ADDED, {level: this, obj,
                propType});
            return true;
        }
        else {
            RG.err('Map.Level', 'addVirtualProp',
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
                if (!obj.getOwner) {
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

    /* Removes a virtual property (virtual prop has no x,y position). */
    this.removeVirtualProp = function(propType, obj) {
        if (_p.hasOwnProperty(propType)) {
            const index = _p[propType].indexOf(obj);
            if (index >= 0) {
                _p[propType].splice(index, 1);
                RG.POOL.emitEvent(RG.EVT_LEVEL_PROP_REMOVED,
                    {level: this, obj, propType});
                return true;
            }
        }
        return false;
    };

    /* Removes given actor from level. Returns true if successful.*/
    this.removeActor = actor => {
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
    this.exploreCells = actor => {
        const visibleCells = _map.getVisibleCells(actor);
        if (actor.isPlayer()) {
            for (let i = 0; i < visibleCells.length; i++) {
                visibleCells[i].setExplored();
            }
        }
        return visibleCells;
    };

    /* Returns all explored cells in the map.*/
    this.getExploredCells = () => _map.getExploredCells();

    //-----------------------------------------------------------------
    // CALLBACKS
    //----------------------------------------------------------------
    const _callbacks = {};

    // For setting the callbacks
    this.setOnEnter = cb => {_callbacks.OnEnter = cb;};
    this.setOnFirstEnter = cb => {_callbacks.OnFirstEnter = cb;};
    this.setOnExit = cb => {_callbacks.OnExit = cb;};
    this.setOnFirstExit = cb => {_callbacks.OnFirstExit = cb;};

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
            cbState: _cbState
        };

        if (_parent) {
            obj.parent = _parent.getName();
            if (typeof obj.parent !== 'string') {
                RG.err('Map.Level', 'toJSON',
                    'Parent name not a string');
            }
        }

        // Must store x, y for each prop as well
        const props = [TYPE_ACTOR, TYPE_ITEM, TYPE_ELEM];
        props.forEach(propType => {
            _p[propType].forEach(prop => {
                const propObj = {
                    x: prop.getX(),
                    y: prop.getY(),
                    obj: prop.toJSON()
                };
                // Avoid storing player twice (stored in Game.Main already)
                if (!propType === RG.TYPE_ACTOR) {
                    obj[propType].push(propObj);
                }
                else if (!propObj.obj.isPlayer) {
                    obj[propType].push(propObj);
                }
            });
        });

        return obj;
    };

    this._getFreeCellXY = function() {
        const freeCells = _map.getFree();
        if (freeCells.length > 0) {
            const xCell = freeCells[0].getX();
            const yCell = freeCells[0].getY();
            return [xCell, yCell];
        }
        return [null, null];
    };

}; // }}} Level
RG.Map.Level.prototype.idCount = 0;

RG.Map.Level.createLevelID = () => {
    const id = RG.Map.Level.prototype.idCount;
    RG.Map.Level.prototype.idCount += 1;
    return id;
};


module.exports = RG.Map;

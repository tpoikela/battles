
const ROT = require('../../lib/rot.js');
const RG = require('./rg.js');

const {TYPE_ACTOR, TYPE_ITEM, TYPE_ELEM} = RG;

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
RG.Map.Cell.prototype.getXY = function() {return [this._x, this._y];};
RG.Map.Cell.prototype.setX = function(x) {this._x = x;};
RG.Map.Cell.prototype.setY = function(y) {this._y = y;};
RG.Map.Cell.prototype.isAtXY = function(x, y) {
    return x === this._x && y === this._y;
};

RG.Map.Cell.prototype.getKeyXY = function() {
    return this._x + ',' + this._y;
};

/* Sets/gets the base element for this cell. There can be only one element.*/
RG.Map.Cell.prototype.setBaseElem = function(elem) { this._baseElem = elem; };
RG.Map.Cell.prototype.getBaseElem = function() { return this._baseElem; };

/* Returns true if the cell has props of given type.*/
RG.Map.Cell.prototype.hasProp = function(prop) {
    return this._p.hasOwnProperty(prop);
};

/* Returns the given type of props, or null if does not have any props of that
 * type. */
RG.Map.Cell.prototype.getProp = function(prop) {
    if (this._p.hasOwnProperty(prop)) {
        return this._p[prop];
    }
    return null;
};

/* Queries cell about possible elements. */
RG.Map.Cell.prototype.hasElements = function() {
    return this.hasProp(TYPE_ELEM);
};
RG.Map.Cell.prototype.getElements = function() {
    return this.getProp(TYPE_ELEM);
};

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

RG.Map.Cell.prototype.getSentientActors = function() {
    const actors = this.getActors();
    return actors.filter(actor => !actor.has('NonSentient'));
};

RG.Map.Cell.prototype.hasItems = function() {return this.hasProp(TYPE_ITEM);};
RG.Map.Cell.prototype.getItems = function() {return this.getProp(TYPE_ITEM);};

/* Checks if this cell has a marker with given tag. */
RG.Map.Cell.prototype.hasMarker = function(tag) {
    if (this.hasElements()) {
        const elems = this.getElements();
        for (let i = 0; i < elems.length; i++) {
            if (elems[i].getType() === 'marker') {
                if (elems[i].getTag() === tag) {
                    return true;
                }
            }
        }
    }
    return false;
};

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

RG.Map.Cell.prototype.hasConnectionType = function(type) {
    if (this.hasConnection()) {
        const connection = this.getConnection();
        return connection.getName() === type;
    }
    return false;
};

RG.Map.Cell.prototype.hasTown = function() {
    return this.hasConnectionType('town');
};

RG.Map.Cell.prototype.hasBattle = function() {
    return this.hasConnectionType('battle');
};

RG.Map.Cell.prototype.hasMountain = function() {
    return this.hasConnectionType('mountain');
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

RG.Map.Cell.prototype.isDangerous = function() {
    if (this._p[TYPE_ACTOR]) {
        const actors = this.getProp(TYPE_ACTOR);
        if (actors) {
            return actors[0].has('Damaging');
        }
    }
    return false;
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
        if (this.hasConnection() && obj.getType() === 'connection') {
            let msg = `${this._x},${this._y}`;
            msg += `\nExisting: ${JSON.stringify(this.getConnection())}`;
            msg += `\nTried to add: ${JSON.stringify(obj)}`;
            RG.err('Cell', 'setProp',
                `Tried to add 2nd connection: ${msg}`);
        }
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

/* Returns true if the cell has an usable element. */
RG.Map.Cell.prototype.hasUsable = function() {
    const elems = this.getProp(RG.TYPE_ELEM);
    if (elems) {
        for (let i = 0; i < elems.length; i++) {
            if (elems[i].onUse) {
                return true;
            }
        }
    }
    return false;
};

RG.Map.Cell.prototype.toJSON = function() {
    const json = {
        t: RG.elemTypeToIndex[this._baseElem.getType()]
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
        if (elements.length > 0) {
            json.elements = elements;
        }
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


    if (typeof this.cols !== 'number' || typeof this.rows !== 'number') {
        RG.err('Map.CellList', 'constructor',
            'Map.CellList(rows, cols) expects 2 integers.');
    }

    this._map = new Array(this.cols);
    // Initialize cells with floor
    for (let x = 0; x < this.cols; x++) {
        // this._map.push([]);
        this._map[x] = new Array(this.rows);
        for (let y = 0; y < this.rows; y++) {
            this._map[x][y] = new RG.Map.Cell(x, y, baseElem);
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

    this.isExplored = function(x, y) {
        return this._map[x][y].isExplored();
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

    this.getFreeNotOnEdge = function() {
        const freeCells = this.getFree();
        return freeCells.filter(c => (
            c._x > 0 && c._x < (this.cols - 1) &&
            c._y > 0 && c._y < (this.rows - 1)
        ));
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
    this._hasXY = (x, y) => (
        (x >= 0) && (x < this.cols) && (y >= 0) && (y < this.rows)
    );

    /* Returns true if light passes through this cell.*/
    this.lightPasses = function(x, y) {
        if (this._hasXY(x, y)) {
            return this._map[x][y].lightPasses(); // delegate to cell
        }
        return false;
    };

    this.hasObstacle = function(x, y) {
        if (this._hasXY(x, y)) {
            return this._map[x][y].hasObstacle();
        }
        return false;
    };

    this.isPassable = function(x, y) {
        if (this._hasXY(x, y)) {
            return this._map[x][y].isPassable();
        }
        return false;
    };

    this.isPassableByAir = function(x, y) {
        if (this._hasXY(x, y)) {
            return this._map[x][y].isPassableByAir();
        }
        return false;
    };

    this.fov = new ROT.FOV.RecursiveShadowcasting(
        this.lightPasses.bind(this));

    /* Returns visible cells for given actor.*/
    this.getVisibleCells = function(actor) {
        const cells = [];
        const [xA, yA] = actor.getXY();
        if (actor.isLocated()) {
            if (actor.getLevel().getMap() === this) {
                const range = actor.getFOVRange();
                this.fov.compute(xA, yA, range, (x, y, r, visibility) => {
                    if (visibility) {
                        if (this._hasXY(x, y)) {
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
                if (cell.hasActors()) {
                    if (cell.getFirstActor().isPlayer()) {
                        row += '@';
                    }
                    else {
                        row += 'A';
                    }
                }
                else if (cell.hasItems()) {row += 'I';}
                else if (cell.getStairs() !== null) {row += '>';}
                else if (cell.hasConnection()) {row += 'c';}
                else if (cell.hasElements()) {
                    const elem = cell.getElements()[0];
                    if (elem.getType() === 'marker') {
                        row += elem.char;
                    }
                    else if (elem.getType() === 'door') {
                        row += '+';
                    }
                    else {
                        row += 'E';
                    }
                }
                else if ((/floor/).test(baseType)) {row += '.';}
                else if ((/water|chasm|lava/).test(baseType)) {row += '~';}
                else if ((/wall/).test(baseType)) {row += '#';}
                else if ((/tree/).test(baseType)) {row += 'T';}
                else if ((/grass/).test(baseType)) {row += '"';}
                else {row += '?';}
            }
            mapInASCII += row + '\n';
        }
        RG.diag(mapInASCII);
    };

    /* Queries a row of cells. _optimizeForRowAccess must be called before this
     * function is used. */
    this.getCellRowFast = function(y) {
        if (!this._isRowOptimized) {this._optimizeForRowAccess();}
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
RG.Map.CellList.prototype.getCells = function(filter = () => true) {
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
        if (this._hasXY(xy[0], xy[1])) {
            result.push(this._map[xy[0]][xy[1]]);
        }
    });
    return result;
};

RG.Map.CellList.prototype.setBaseElems = function(coord, elem) {
    coord.forEach(xy => {
        this._map[xy[0]][xy[1]].setBaseElem(elem);
    });
};

RG.Map.CellList.prototype.has = function(xy, query) {
    const [x, y] = xy;
    if (this._hasXY(x, y)) {
        const cell = this.getCell(x, y);
        if (typeof query === 'string') {
            const baseElem = cell.getBaseElem();
            if (baseElem.getType() === query) {return true;}
        }
    }
    return false;
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
    this._isRowOptimized = true;
};

RG.Map.CellList.prototype.toJSON = function() {
    const map = new Array(this.cols);
    const elements = {};
    const explored = [];
    for (let x = 0; x < this.cols; x++) {
        map[x] = new Array(this.rows);
        for (let y = 0; y < this.rows; y++) {
            const json = this.getCell(x, y).toJSON();
            map[x][y] = json.t;
            if (json.ex) {explored.push([x, y]);}
            if (json.elements) {
                elements[x + ',' + y] = elements;
            }
        }
    }
    return {
        cols: this.cols,
        rows: this.rows,
        cells: map,
        explored,
        elements
    };
};

module.exports = RG.Map;


const RG = require('./rg');

const {TYPE_ACTOR, TYPE_ITEM, TYPE_ELEM} = RG;

/* Object representing one game cell. It can hold actors, items, traps or
 * elements. Cell has x,y for convenient access to coordinates.
 * */
const Cell = function(x, y, elem) { // {{{2

    this._baseElem = elem;
    this._x = x;
    this._y = y;
    this._explored = false;

    this._p = {}; // Cell properties are assigned here

}; // }}} Map.Cell

Cell.prototype.getX = function() {return this._x;};
Cell.prototype.getY = function() {return this._y;};
Cell.prototype.getXY = function() {return [this._x, this._y];};
Cell.prototype.setX = function(x) {this._x = x;};
Cell.prototype.setY = function(y) {this._y = y;};
Cell.prototype.isAtXY = function(x, y) {
    return x === this._x && y === this._y;
};

Cell.prototype.getKeyXY = function() {
    return this._x + ',' + this._y;
};

/* Sets/gets the base element for this cell. There can be only one element.*/
Cell.prototype.setBaseElem = function(elem) { this._baseElem = elem; };
Cell.prototype.getBaseElem = function() { return this._baseElem; };

/* Returns true if the cell has props of given type.*/
Cell.prototype.hasProp = function(prop) {
    return this._p.hasOwnProperty(prop);
};

/* Returns the given type of props, or null if does not have any props of that
 * type. */
Cell.prototype.getProp = function(prop) {
    if (this._p.hasOwnProperty(prop)) {
        return this._p[prop];
    }
    return null;
};

/* Queries cell about possible elements. */
Cell.prototype.hasElements = function() {
    return this.hasProp(TYPE_ELEM);
};
Cell.prototype.getElements = function() {
    return this.getProp(TYPE_ELEM);
};

/* Returns true if cell has any actors.*/
Cell.prototype.hasActors = function() {return this.hasProp(TYPE_ACTOR);};
Cell.prototype.getActors = function() {return this.getProp(TYPE_ACTOR);};
Cell.prototype.getFirstActor = function() {
    const actors = this.getProp(TYPE_ACTOR);
    if (actors && actors.length > 0) {
        return actors[0];
    }
    return null;
};

Cell.prototype.getSentientActors = function() {
    const actors = this.getActors();
    return actors.filter(actor => !actor.has('NonSentient'));
};

Cell.prototype.hasItems = function() {return this.hasProp(TYPE_ITEM);};
Cell.prototype.getItems = function() {return this.getProp(TYPE_ITEM);};

/* Checks if this cell has a marker with given tag. */
Cell.prototype.hasMarker = function(tag) {
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
Cell.prototype.hasProps = function() {
    return Object.keys(this._p).length > 0;
};

/* Returns true if cell has stairs.*/
Cell.prototype.hasStairs = function() {
    const propType = this.getConnection();
    if (propType) {
        const name = propType.getName();
        return (/stairs(Up|Down)/).test(name);
    }
    return false;
};

/* Returns true if cell has passage to another tile. */
Cell.prototype.hasPassage = function() {
    const propType = this.getConnection();
    if (propType) {return propType.getName() === 'passage';}
    return false;
};

Cell.prototype.hasShop = function() {
    return this.hasPropType('shop');
};

Cell.prototype.getShop = function() {
    return this.getPropType('shop')[0];
};

Cell.prototype.hasDoor = function() {
    return this.hasPropType('door');
};

Cell.prototype.hasConnection = function() {
    return this.hasPropType('connection');
};

Cell.prototype.hasConnectionType = function(type) {
    if (this.hasConnection()) {
        const connection = this.getConnection();
        return connection.getName() === type;
    }
    return false;
};

Cell.prototype.hasTown = function() {
    return this.hasConnectionType('town');
};

Cell.prototype.hasBattle = function() {
    return this.hasConnectionType('battle');
};

Cell.prototype.hasMountain = function() {
    return this.hasConnectionType('mountain');
};

/* Return stairs in this cell, or null if there are none.*/
Cell.prototype.getStairs = function() {
    if (this.hasStairs()) {
        return this.getConnection();
    }
    return null;
};

Cell.prototype.getConnection = function() {
    if (this.hasPropType('connection')) {
        return this.getPropType('connection')[0];
    }
    return null;
};

/* Returns passage in this cell, or null if not found. */
Cell.prototype.getPassage = function() {
    if (this.hasPassage()) {
        return this.getConnection();
    }
    return null;
};

/* Returns true if light passes through this map cell.*/
Cell.prototype.lightPasses = function() {
    if (!this._baseElem.lightPasses()) {return false;}
    if (this.hasPropType('door')) {
        return this.getPropType('door')[0].isOpen();
    }
    return true;
};

Cell.prototype.isPassable = function() {return this.isFree();};
Cell.prototype.isPassableByAir = function() {
    return this._baseElem.isPassableByAir();
};

Cell.prototype.isDangerous = function() {
    if (this._p[TYPE_ACTOR]) {
        const actors = this.getProp(TYPE_ACTOR);
        if (actors) {
            return actors[0].has('Damaging');
        }
    }
    return false;
};

Cell.prototype.hasObstacle = function() {
    this._baseElem.isObstacle();
};

Cell.prototype.isSpellPassable = function() {
    return this._baseElem.isSpellPassable();
};

Cell.prototype.setExplored = function() {this._explored = true;};

Cell.prototype.isExplored = function() {return this._explored;};

/* Returns true if it's possible to move to this cell.*/
Cell.prototype.isFree = function(isFlying = false) {
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
Cell.prototype.setProp = function(prop, obj) {
    if (obj.getType() === 'connection' && this.hasConnection()) {
        let msg = `${this._x},${this._y}`;
        msg += `\nExisting: ${JSON.stringify(this.getConnection())}`;
        msg += `\nTried to add: ${JSON.stringify(obj)}`;
        RG.err('Cell', 'setProp',
            `Tried to add 2nd connection: ${msg}`);
    }
    if (!this._p.hasOwnProperty(prop)) {
        this._p[prop] = [];
        this._p[prop].push(obj);
    }
    // Reorders actors to show them in specific order with GUI
    else if (prop === TYPE_ACTOR) {
        if (!obj.has('NonSentient') && !obj.has('Ethereal')) {
            this._p[prop].unshift(obj);
        }
        else {
            this._p[prop].push(obj);
        }
    }
    else {
        this._p[prop].push(obj);
    }

    if (obj.isOwnable) {
        obj.setOwner(this);
    }
};

Cell.prototype.removeProps = function(propType) {
    delete this._p[propType];
};

/* Removes the given object from cell properties.*/
Cell.prototype.removeProp = function(prop, obj) {
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
Cell.prototype.toString = function() {
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
Cell.prototype.hasUsable = function() {
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

Cell.prototype.toJSON = function() {
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

/* Returns name (or type if unnamed) for each prop in this cell, including the
 * base element type. */
Cell.prototype.getPropNames = function() {
    const result = [this._baseElem.getType()];
    const keys = Object.keys(this._p);
    keys.forEach(propType => {
        const props = this.getProp(propType);
        props.forEach(prop => {
            result.push(prop.getName());
        });
    });
    return result;
};

/* Returns true if any cell property has the given type. Ie.
 * myCell.hasPropType("wall"). Doesn't check for basic props like "actors",
 * RG.TYPE_ITEM etc.
 */
Cell.prototype.hasPropType = function(propType) {
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
Cell.prototype.getPropType = function(propType) {
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
Cell.prototype.findObj = function(filterFunc) {
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

module.exports = Cell;

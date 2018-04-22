
const RG = require('./rg.js');
require('./eventpool');

const {TYPE_ACTOR, TYPE_ELEM, TYPE_ITEM} = RG;

/* Possible callbacks:
 * showMsg: {msg: 'my msg'}
 */

/* Possible callbacks for entering/exiting levels. */
const LevelCallback = function(type) {
    this.cbType = type;
};

LevelCallback.prototype.execute = function() {
    RG.gameMsg(this.msg);
};

LevelCallback.prototype.toJSON = function() {
    return {
        cbType: this.getCbType(),
        msg: this.msg
    };
};

/* Object for the game levels. Contains map, actors and items.  */
const Level = function() {
    this._map = null;
    this._id = Level.idCount++;
    this._parent = null; // Reference to dungeon,city,mountain...

    // Level properties
    this._p = {
        actors: [],
        items: [],
        elements: []
    };

    this._levelNo = 0;

    //-----------------------------------------------------------------
    // CALLBACKS
    //----------------------------------------------------------------
    this._callbacks = {};

    this._cbState = {
        onFirstEnterDone: false,
        onFirstExitDone: false
    };

};
Level.idCount = 0;

Level.prototype.setLevelNumber = function(no) {this._levelNo = no;};
Level.prototype.getLevelNumber = function() {
    return this._levelNo;
};

Level.prototype.getID = function() {
    return this._id;
};

Level.prototype.setID = function(id) {this._id = id;};

Level.prototype.getParent = function() {
    return this._parent;
};

Level.prototype.setParent = function(parent) {
    if (!RG.isNullOrUndef([parent])) {
        this._parent = parent;
    }
    else {
        RG.err('Map.Level', 'setParent',
            'Parent is not defined.');
    }
};

Level.prototype.getActors = function() {return this._p.actors;};
Level.prototype.getItems = function() {return this._p.items;};
Level.prototype.getElements = function() {return this._p.elements;};

/* Returns all stairs elements. */
Level.prototype.getStairs = function() {
    const res = [];
    this._p.elements.forEach(elem => {
        if (this._isStairs(elem)) {
            res.push(elem);
        }
    });
    return res;
};

Level.prototype.getPassages = function() {
    const res = [];
    this._p.elements.forEach(elem => {
        if (elem.getName() === 'passage') {
            res.push(elem);
        }
    });
    return res;
};

Level.prototype.getConnections = function() {
    const conn = [];
    this._p.elements.forEach(elem => {
        if (elem.getType() === 'connection') {
            conn.push(elem);
        }
    });
    return conn;
};

Level.prototype._isStairs = function(elem) {
    return (/stairs(Down|Up)/).test(elem.getName());
};

Level.prototype.setMap = function(map) {this._map = map;};
Level.prototype.getMap = function() {return this._map;};

/* Given a level, returns stairs which lead to that level.*/
Level.prototype.getStairsToLevel = function(level) {
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
Level.prototype.addToRandomCell = function(obj) {
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
Level.prototype.addStairs = function(stairs, x, y) {
    if (!RG.isNullOrUndef([x, y])) {
        if (this._map.hasXY(x, y)) {
          stairs.setSrcLevel(this);
          // Prevents stairs on impassable squares
          this._map.setBaseElemXY(x, y, RG.ELEM.FLOOR);
          return this._addPropToLevelXY(RG.TYPE_ELEM, stairs, x, y);
        }
        else {
          const msg = `x,y ${x},${y} out of map bounds.`;
            RG.err('Map.Level', 'addStairs',
              `${msg}: cols ${this._map.cols}, rows: ${this._map.rows}`);
        }
    }
    else {
        RG.err('Map.Level', 'addStairs',
            'Cannot add stairs. x, y missing.');
    }
    return false;
};

/* Uses stairs for given actor if it's on top of the stairs.*/
Level.prototype.useStairs = function(actor) {
    const cell = this._map.getCell(actor.getX(), actor.getY());
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
Level.prototype.addElement = function(elem, x, y) {
    if (elem.getType() === 'connection') {
        return this.addStairs(elem, x, y);
    }
    if (!RG.isNullOrUndef([x, y])) {
        return this._addPropToLevelXY(RG.TYPE_ELEM, elem, x, y);
    }
    const [xCell, yCell] = this._getFreeCellXY();
    return this._addPropToLevelXY(RG.TYPE_ELEM, elem, xCell, yCell);
};

Level.prototype.removeElement = function(elem, x, y) {
    return this._removePropFromLevelXY(RG.TYPE_ELEM, elem, x, y);
};


Level.prototype.addEntity = function(ent, x, y) {
    if (ent.getPropType) {
        const type = ent.getPropType();
        if (type === RG.TYPE_ACTOR) {
            return this.addActor(ent, x, y);
        }
        else if (type === RG.TYPE_ITEM) {
              return this.addItem(ent, x, y);
        }
        else if (type === RG.TYPE_ELEM) {
              return this.addElement(ent, x, y);
        }
    }
    else {
        RG.err('Level', 'addEntity',
            'No support for ents without getPropType');
    }
    return false;
};

//---------------------------------------------------------------------
// ITEM RELATED FUNCTIONS
//---------------------------------------------------------------------

/* Adds one item to the given location on the level.*/
Level.prototype.addItem = function(item, x, y) {
    if (!RG.isNullOrUndef([x, y])) {
        return this._addPropToLevelXY(RG.TYPE_ITEM, item, x, y);
    }
    const [xCell, yCell] = this._getFreeCellXY();
    return this._addPropToLevelXY(RG.TYPE_ITEM, item, xCell, yCell);
};

/* Removes an item from the level in x,y position.*/
Level.prototype.removeItem = function(item, x, y) {
    return this._removePropFromLevelXY(RG.TYPE_ITEM, item, x, y);
};

Level.prototype.pickupItem = function(actor, x, y) {
    const cell = this._map.getCell(x, y);
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

/* Moves the given object to x,y. */
Level.prototype.moveActorTo = function(obj, x, y) {
    const level = obj.getLevel();
    const [oX, oY] = [obj.getX(), obj.getY()];
    const propType = obj.getPropType();
    if (level._removePropFromLevelXY(propType, obj, oX, oY)) {
        return this._addPropToLevelXY(propType, obj, x, y);
    }
    return false;
};

//---------------------------------------------------------------------
// ACTOR RELATED FUNCTIONS
//---------------------------------------------------------------------

/* Adds an actor to the level. If x,y is given, tries to add there. If not,
 * finds first free cells and adds there. Returns true on success.
 */
Level.prototype.addActor = function(actor, x, y) {
    RG.debug(this, 'addActor called with x,y ' + x + ', ' + y);
    if (!RG.isNullOrUndef([x, y])) {
        if (this._map.hasXY(x, y)) {
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
Level.prototype.addActorToFreeCell = function(actor) {
    RG.debug(this, 'Adding actor to free slot');
    const freeCells = this._map.getFree();
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
Level.prototype._addPropToLevelXY = function(propType, obj, x, y) {
    if (this._p.hasOwnProperty(propType)) {
        this._p[propType].push(obj);
        if (!obj.isOwnable) {
            obj.setXY(x, y);
            obj.setLevel(this);
        }
        this._map.setProp(x, y, propType, obj);
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
Level.prototype.addVirtualProp = function(propType, obj) {
    if (this._p.hasOwnProperty(propType)) {
        this._p[propType].push(obj);
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
Level.prototype._removePropFromLevelXY = function(propType, obj, x, y) {
    if (this._p.hasOwnProperty(propType)) {
        const index = this._p[propType].indexOf(obj);

        if (index >= 0) {
            this._p[propType].splice(index, 1);
            if (!obj.getOwner) {
                obj.setXY(null, null);
                obj.unsetLevel();
            }
            RG.POOL.emitEvent(RG.EVT_LEVEL_PROP_REMOVED,
                {level: this, obj, propType});
            return this._map.removeProp(x, y, propType, obj);
        }
        else {
            RG.err('Map.Level', '_removePropFromLevelXY',
                `Obj index not found in list this._p[${propType}]`);
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
Level.prototype.removeVirtualProp = function(propType, obj) {
    if (this._p.hasOwnProperty(propType)) {
        const index = this._p[propType].indexOf(obj);
        if (index >= 0) {
            this._p[propType].splice(index, 1);
            RG.POOL.emitEvent(RG.EVT_LEVEL_PROP_REMOVED,
                {level: this, obj, propType});
            return true;
        }
    }
    return false;
};

/* Removes given actor from level. Returns true if successful.*/
Level.prototype.removeActor = function(actor) {
    const index = this._p.actors.indexOf(actor);
    const x = actor.getX();
    const y = actor.getY();
    if (this._map.removeProp(x, y, RG.TYPE_ACTOR, actor)) {
        this._p.actors.splice(index, 1);
        return true;
    }
    else {
        return false;
    }
};

/* Explores the level from given actor's viewpoint. Sets new cells as
 * explored. There's no exploration tracking per actor.*/
Level.prototype.exploreCells = function(actor) {
    const visibleCells = this._map.getVisibleCells(actor);
    if (actor.isPlayer()) {
        for (let i = 0; i < visibleCells.length; i++) {
            visibleCells[i].setExplored();
        }
    }
    return visibleCells;
};

/* Returns all explored cells in the map.*/
Level.prototype.getExploredCells = function() {
    return this._map.getExploredCells();
};

/* Can be used to add additional data to the level. Currently, this is used in
 * level generation only. */
Level.prototype.setExtras = function(extras) {
    this._extras = extras;
};

Level.prototype.getExtras = function() {
    return this._extras;
};

Level.prototype.hasExtras = function() {
    return !RG.isNullOrUndef([this._extras]) &&
        Object.keys(this._extras).length > 0;
};

/* Returns the bounding box of the level (upper-left and lower-right
 * coordinates). */
Level.prototype.getBbox = function() {
    return {
        ulx: 0, uly: 0,
        lrx: this.getMap().cols - 1,
        lry: this.getMap().rows - 1
    };
};

Level.prototype.getColsRows = function() {
    return [
        this.getMap().cols,
        this.getMap().rows
    ];
};

Level.prototype.setOnEnter = function(cb) {
    this._callbacks.OnEnter = cb;
};
Level.prototype.setOnFirstEnter = function(cb) {
	this._callbacks.OnFirstEnter = cb;
};
Level.prototype.setOnExit = function(cb) {
	this._callbacks.OnExit = cb;
};
Level.prototype.setOnFirstExit = function(cb) {
	this._callbacks.OnFirstExit = cb;
};

Level.prototype.onEnter = function() {
	if (this._callbacks.hasOwnProperty('OnEnter')) {
		this._callbacks.OnEnter(this);
	}
};

Level.prototype.onFirstEnter = function() {
	if (!this._cbState.onFirstEnterDone) {
		if (this._callbacks.hasOwnProperty('OnFirstEnter')) {
			this._callbacks.OnFirstEnter(this);
		}
		this._cbState.onFirstEnterDone = true;
	}
};

Level.prototype.onExit = function() {
	if (this._callbacks.hasOwnProperty('OnExit')) {
		this._callbacks.OnExit(this);
	}
};

Level.prototype.onFirstExit = function() {
	if (!this._cbState.onFirstExitDone) {
		if (this._callbacks.hasOwnProperty('OnFirstExit')) {
			this._callbacks.OnFirstExit(this);
		}
		this._cbState.onFirstExitDone = true;
	}
};

/* Return random free cell on a given level.*/
Level.prototype.getFreeRandCell = function() {
	const freeCells = this.getMap().getFree();
	if (freeCells.length > 0) {
		const index = RG.RAND.randIndex(freeCells);
		return freeCells[index];
	}
	return null;
};

/* Returns random empty cells, or null if cannot find any.*/
Level.prototype.getEmptyRandCell = function() {
	const emptyCells = this.getMap().getEmptyCells();
	if (emptyCells.length > 0) {
		const index = RG.RAND.randIndex(emptyCells);
		return emptyCells[index];
	}
	return null;
};

Level.prototype._getFreeCellXY = function() {
	const freeCells = this._map.getFree();
	if (freeCells.length > 0) {
		const xCell = freeCells[0].getX();
		const yCell = freeCells[0].getY();
		return [xCell, yCell];
	}
	return [null, null];
};

Level.prototype.debugPrintInASCII = function() {
	this.getMap().debugPrintInASCII();
};

/* Removes all elements matching the given function. */
Level.prototype.removeElements = function(filter) {
    const toRemove = this._p.elements.filter(filter);
    toRemove.forEach(elem => {
      this.removeElement(elem, elem.getX(), elem.getY());
    });
};

Level.prototype.getCell = function(x, y) {
    return this._map.getCell(x, y);
};

/* Serializes the level object. */
Level.prototype.toJSON = function() {
    const obj = {
        isJSON: true,
        id: this.getID(),
        levelNumber: this.getLevelNumber(),
        actors: [],
        items: [],
        elements: [],
        map: this.getMap().toJSON(),
        cbState: this._cbState
    };

    if (this._parent) {
        obj.parent = this._parent.getName();
        if (typeof obj.parent !== 'string') {
            RG.err('Map.Level', 'toJSON',
                'Parent name not a string');
        }
    }

    // Must store x, y for each prop as well
    const props = [TYPE_ACTOR, TYPE_ITEM, TYPE_ELEM];
    props.forEach(propType => {
        this._p[propType].forEach(prop => {
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


Level.createLevelID = () => {
    const id = Level.idCount;
    Level.idCount += 1;
    return id;
};

module.exports = Level;

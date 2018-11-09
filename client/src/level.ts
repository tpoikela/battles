
import RG from './rg';
import {Entity} from './entity';
import * as Component from './component';
import {compsToJSON} from './component.base';
import {Random} from './random';
import {EventPool} from './eventpool';
import * as Mixin from './mixin';

const POOL = EventPool.getPool();
const {TYPE_ACTOR, TYPE_ELEM, TYPE_ITEM} = RG;

const RNG = Random.getRNG();

/* Possible callbacks:
 * showMsg: {msg: 'my msg'}
 */

/* Possible callbacks for entering/exiting levels. */
export class LevelCallback {
    public cbType: string;
    public msg: string;

    constructor(type) {
        this.cbType = type;
    }

    execute() {
        RG.gameMsg(this.msg);
    }

    getCbType() {
        return this.cbType;
    }

    toJSON() {
        return {
            cbType: this.getCbType(),
            msg: this.msg
        };
    }
}

export interface LevelExtras {
    [key: string]: any;
}


/* Object for the game levels. Contains map, actors and items.  */
// const Level = function() {
export class Level extends Entity {

    public static createLevelID() {
        return Entity.createEntityID();
    }

    private _map: any;
    private _parent: any;
    private _p: {[key: string]: any[]};
    private _levelNo: number;
    private _callbacks: {[key: string]: (any) => void};
    private _cbState: {[key: string]: boolean};

    private _extras: LevelExtras;

    constructor() {
        super();
        this._map = null;
        this._parent = null; // Reference to dungeon,city,mountain...

        // Level property cache (iteration through 100x100 cells is very
        // slow. This fails if cells are manipulated directly
        this._p = {
            actors: [],
            elements: [],
            items: []
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

    }

    setLevelNumber(no) {this._levelNo = no;}

    getLevelNumber() {
        return this._levelNo;
    }

    getParent() {
        return this._parent;
    }

    getParentZone() {
        const subZoneParent = this.getParent();
        if (subZoneParent) {
            if (subZoneParent.getParent) {
                return subZoneParent.getParent();
            }
            RG.err('Level', 'getParentZone',
                `No getParent() in ${JSON.stringify(subZoneParent)}`);
        }
        return null;
    }

    setParent(parent) {
        if (!RG.isNullOrUndef([parent])) {
            this._parent = parent;
        }
        else {
            RG.err('Map.Level', 'setParent',
                'Parent is not defined.');
        }
    }

    getActors() {return this._p.actors;}
    getItems() {return this._p.items;}
    getElements() {return this._p.elements;}

    /* Returns all stairs elements. */
    getStairs() {
        const res = [];
        this._p.elements.forEach(elem => {
            if (this._isStairs(elem)) {
                res.push(elem);
            }
        });
        return res;
    }

    getPassages() {
        const res = [];
        this._p.elements.forEach(elem => {
            if (elem.getName() === 'passage') {
                res.push(elem);
            }
        });
        return res;
    }

    getConnections() {
        const conn = [];
        this._p.elements.forEach(elem => {
            if (elem.getType() === 'connection') {
                conn.push(elem);
            }
        });
        return conn;
    }

    _isStairs(elem) {
        return (/stairs(Down|Up)/).test(elem.getName());
    }

    setMap(map) {this._map = map;}
    getMap() {return this._map;}

    /* Given a level, returns stairs which lead to that level.*/
    getStairsToLevel(level) {
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
    }

    //---------------------------------------------------------------------
    // GENERIC ADD METHOD
    //---------------------------------------------------------------------
    addToRandomCell(obj) {
        const cell = this.getFreeRandCell();
        switch (obj.getPropType()) {
            case RG.TYPE_ITEM:
                this.addItem(obj, cell.getX(), cell.getY());
                break;
            default: RG.err('Map.Level', 'addToRandomCell',
                `No known propType |${obj.getPropType()}|`);
        }
    }

    //---------------------------------------------------------------------
    // STAIRS RELATED FUNCTIONS
    //---------------------------------------------------------------------

    /* Adds stairs for this level.*/
    addStairs(stairs, x, y) {
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
    }

    /* Uses stairs for given actor if it's on top of the stairs.*/
    useStairs(actor) {
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
    }

    /* Adds one element into the level. */
    addElement(elem, x, y) {
        if (elem.getType() === 'connection') {
            return this.addStairs(elem, x, y);
        }
        if (!RG.isNullOrUndef([x, y])) {
            return this._addPropToLevelXY(RG.TYPE_ELEM, elem, x, y);
        }
        const [xCell, yCell] = this._getFreeCellXY();
        if (RG.isNullOrUndef([xCell, yCell])) {
            this.debugPrintInASCII();
            RG.err('Level', 'addElement',
                'Cannot add prop to null xy-coord');
        }
        return this._addPropToLevelXY(RG.TYPE_ELEM, elem, xCell, yCell);
    }

    removeElement(elem, x, y) {
        return this._removePropFromLevelXY(RG.TYPE_ELEM, elem, x, y);
    }

    addEntity(ent, x, y) {
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
    }

    //---------------------------------------------------------------------
    // ITEM RELATED FUNCTIONS
    //---------------------------------------------------------------------

    /* Adds one item to the given location on the level.*/
    addItem(item, x, y) {
        if (!RG.isNullOrUndef([x, y])) {
            return this._addPropToLevelXY(RG.TYPE_ITEM, item, x, y);
        }
        const [xCell, yCell] = this._getFreeCellXY();
        return this._addPropToLevelXY(RG.TYPE_ITEM, item, xCell, yCell);
    }

    /* Removes an item from the level in x,y position.*/
    removeItem(item, x, y) {
        return this._removePropFromLevelXY(RG.TYPE_ITEM, item, x, y);
    }

    pickupItem(actor) {
        const pickup = new Component.Pickup();
        actor.add(pickup);
    }

    /* Moves the given object to x,y. */
    moveActorTo(obj, x, y) {
        // Note that source level may be different than this level
        const level = obj.getLevel();
        const [oX, oY] = [obj.getX(), obj.getY()];
        const propType = obj.getPropType();
        if (level._removePropFromLevelXY(propType, obj, oX, oY)) {
            return this._addPropToLevelXY(propType, obj, x, y);
        }
        return false;
    }

    //---------------------------------------------------------------------
    // ACTOR RELATED FUNCTIONS
    //---------------------------------------------------------------------

    /* Adds an actor to the level. If x,y is given, tries to add there. If not,
     * finds first free cells and adds there. Returns true on success.
     */
    addActor(actor, x, y) {
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
    }

    /* Using this method, actor can be added to a free cell without knowing the
     * exact x,y coordinates. This is not random, such that top-left (0,0) is
     * always preferred. */
    addActorToFreeCell(actor) {
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
    }

    /* Adds a prop 'obj' to level location x,y. Returns true on success,
     * false on failure.*/
    _addPropToLevelXY(propType, obj, x, y) {
        if (this._p.hasOwnProperty(propType)) {
            this._p[propType].push(obj);
            if (!obj.isOwnable) {
                obj.setXY(x, y);
                obj.setLevel(this);
            }
            this._map.setProp(x, y, propType, obj);
            POOL.emitEvent(RG.EVT_LEVEL_PROP_ADDED, {level: this, obj,
                propType});
            return true;
        }
        else {
            RG.err('Map.Level', '_addPropToLevelXY',
                `No prop ${propType} supported. Obj: ${JSON.stringify(obj)}`);
        }
        return false;
    }

    /* Adds virtual prop not associated with x,y position or a cell. */
    addVirtualProp(propType, obj) {
        if (this._p.hasOwnProperty(propType)) {
            this._p[propType].push(obj);
            obj.setLevel(this);
            POOL.emitEvent(RG.EVT_LEVEL_PROP_ADDED, {level: this, obj,
                propType});
            return true;
        }
        else {
            RG.err('Map.Level', 'addVirtualProp',
                `No prop ${propType} supported. Obj: ${JSON.stringify(obj)}`);
        }
        return false;
    }

    /* Removes a prop 'obj' to level location x,y. Returns true on success,
     * false on failure.*/
    _removePropFromLevelXY(propType, obj, x, y) {
        if (this._p.hasOwnProperty(propType)) {
            const index = this._p[propType].indexOf(obj);

            if (index >= 0) {
                this._p[propType].splice(index, 1);
                if (!obj.getOwner) {
                    obj.setXY(null, null);
                    obj.unsetLevel();
                }
                POOL.emitEvent(RG.EVT_LEVEL_PROP_REMOVED,
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
    }

    /* Removes a virtual property (virtual prop has no x,y position). */
    removeVirtualProp(propType, obj) {
        if (this._p.hasOwnProperty(propType)) {
            const index = this._p[propType].indexOf(obj);
            if (index >= 0) {
                this._p[propType].splice(index, 1);
                POOL.emitEvent(RG.EVT_LEVEL_PROP_REMOVED,
                    {level: this, obj, propType});
                return true;
            }
        }
        return false;
    }

    /* Removes given actor from level. Returns true if successful.*/
    removeActor(actor) {
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
    }

    /* Explores the level from given actor's viewpoint. Sets new cells as
     * explored. There's no exploration tracking per actor. This is mainly called
     * from Brain.Player, as it marks cells as explored. */
    exploreCells(actor) {
        const visibleCells = this._map.getVisibleCells(actor);
        for (let i = 0; i < visibleCells.length; i++) {
            visibleCells[i].setExplored();
        }
        return visibleCells;
    }

    /* Returns all explored cells in the map.*/
    getExploredCells() {
        return this._map.getExploredCells();
    }

    /* Can be used to add additional data to the level. Currently, this is used in
     * level generation only, and extras are not serialized/stored persistently.
     * */
    setExtras(extras) {
        this._extras = extras;
    }

    getExtras() {
        if (!this._extras) {this._extras = {};}
        return this._extras;
    }

    hasExtras() {
        return !RG.isNullOrUndef([this._extras]) &&
            Object.keys(this._extras).length > 0;
    }

    addExtras(key, value) {
        if (!this._extras) {this._extras = {};}
        this._extras[key] = value;
    }

    /* Returns the bounding box of the level (upper-left and lower-right
     * coordinates). */
    getBbox() {
        return {
            ulx: 0, uly: 0,
            lrx: this.getMap().cols - 1,
            lry: this.getMap().rows - 1
        };
    }

    getColsRows() {
        return [
            this.getMap().cols,
            this.getMap().rows
        ];
    }

    setOnEnter(cb) {
        this._callbacks.OnEnter = cb;
    }

    setOnFirstEnter(cb) {
        this._callbacks.OnFirstEnter = cb;
    }

    setOnExit(cb) {
        this._callbacks.OnExit = cb;
    }

    setOnFirstExit(cb) {
        this._callbacks.OnFirstExit = cb;
    }

    onEnter() {
        if (this._callbacks.hasOwnProperty('OnEnter')) {
            this._callbacks.OnEnter(this);
        }
    }

    onFirstEnter() {
        if (!this._cbState.onFirstEnterDone) {
            if (this._callbacks.hasOwnProperty('OnFirstEnter')) {
                this._callbacks.OnFirstEnter(this);
            }
            this._cbState.onFirstEnterDone = true;
        }
    }

    onExit() {
        if (this._callbacks.hasOwnProperty('OnExit')) {
            this._callbacks.OnExit(this);
        }
    }

    onFirstExit() {
        if (!this._cbState.onFirstExitDone) {
            if (this._callbacks.hasOwnProperty('OnFirstExit')) {
                this._callbacks.OnFirstExit(this);
            }
            this._cbState.onFirstExitDone = true;
        }
    }

    /* Return random free cell on a given level.*/
    getFreeRandCell() {
        const freeCells = this.getMap().getFree();
        if (freeCells.length > 0) {
            const index = RNG.randIndex(freeCells);
            return freeCells[index];
        }
        return null;
    }

    /* Returns random empty cells, or null if cannot find any.*/
    getEmptyRandCell() {
        const emptyCells = this.getMap().getEmptyCells();
        if (emptyCells.length > 0) {
            const index = RNG.randIndex(emptyCells);
            return emptyCells[index];
        }
        return null;
    }

    _getFreeCellXY() {
        const freeCells = this._map.getFree();
        if (freeCells.length > 0) {
            const xCell = freeCells[0].getX();
            const yCell = freeCells[0].getY();
            return [xCell, yCell];
        }
        return [null, null];
    }

    debugPrintInASCII() {
        this.getMap().debugPrintInASCII();
    }

    /* Removes all elements matching the given function. */
    removeElements(filter) {
        const toRemove = this._p.elements.filter(filter);
        toRemove.forEach(elem => {
          const eX = (elem as Mixin.Locatable).getX();
          const eY = (elem as Mixin.Locatable).getY();
          this.removeElement(elem, eX, eY);
        });
    }

    getCell(x, y) {
        return this._map.getCell(x, y);
    }

    /* Serializes the level object. */
    toJSON() {
        const obj: any = {
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

        obj.components = compsToJSON(this);
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
    }
}


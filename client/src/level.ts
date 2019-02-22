
import RG from './rg';
import {Entity} from './entity';
import {Pickup} from './component/component';
import {compsToJSON} from './component/component.base';
import {Random} from './random';
import {EventPool} from './eventpool';
import {verifyLevelCache} from './verify';
import * as Mixin from './mixin';
import {ELEM} from '../data/elem-constants';
import * as Component from './component/component';

// Import types only
import {TCoord, BBox} from './interfaces';
type ZoneBase = import('./world').ZoneBase;
type SubZoneBase = import('./world').SubZoneBase;
type Battle = import('./game.battle').Battle;
type Cell = import('./map.cell').Cell;
type CellMap = import('./map').CellMap;
type House = import('./houses').House;
type WorldShop = import('./world').WorldShop;

type ItemBase = import('./item').ItemBase;
type ElementBase = import('./element').ElementBase;
type ElementStairs = import('./element').ElementStairs;
type BaseActor = import('./actor').BaseActor;
type SentientActor = import('./actor').BaseActor;

type CellOrNull = Cell | null;

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

    public execute(): void {
        RG.gameMsg(this.msg);
    }

    public getCbType() {
        return this.cbType;
    }

    public toJSON() {
        return {
            cbType: this.getCbType(),
            msg: this.msg
        };
    }
}

type LocatableElement = ElementBase & Mixin.Locatable;

type LevelParent = Battle | SubZoneBase;

export type LevelExtraType = number | string | boolean | {[key: string]: LevelExtraType | LevelExtraType[]};

interface Extras {
    [key: string]: LevelExtraType | LevelExtraType[];
}

export type LevelExtras = Extras & {
    points?: TCoord[];
    startPoints?: TCoord[];
    startPoint?: TCoord;
    houses?: House[];
    shops?: WorldShop[];
    /* connectEdges?: boolean;
    isCollapsed?: boolean;*/
};

interface LevelProps {
    actors: BaseActor[];
    elements: LocatableElement[];
    items: ItemBase[];
}

/* Object for the game levels. Contains map, actors and items.  */
// const Level = function() {
export class Level extends Entity {

    public static createLevelID() {
        return Entity.createEntityID();
    }

    private _map: CellMap;
    private _parent: any;
    private _p: LevelProps;
    private _levelNo: number;
    private _callbacks: {[key: string]: (any) => void};
    private _cbState: {[key: string]: boolean};

    // Non-serializable property used during PCG
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

        this.add(new Component.Lore());
    }

    public setLevelNumber(no: number): void {this._levelNo = no;}

    public getLevelNumber(): number {
        return this._levelNo;
    }

    public getParent(): SubZoneBase {
        return this._parent;
    }

    public getParentZone(): ZoneBase {
        const subZoneParent = this.getParent();
        if (subZoneParent) {
            if ((subZoneParent as SubZoneBase).getParent) {
                return subZoneParent.getParent() as ZoneBase;
            }
            RG.err('Level', 'getParentZone',
                `No getParent() in ${JSON.stringify(subZoneParent)}`);
        }
        return null;
    }

    public setParent(parent: LevelParent): void {
        if (!RG.isNullOrUndef([parent])) {
            this._parent = parent;
        }
        else {
            RG.err('Map.Level', 'setParent',
                'Parent is not defined.');
        }
    }

    public getActors(): BaseActor[] {return this._p.actors;}
    public getItems(): ItemBase[] {return this._p.items;}
    public getElements(): ElementBase[] {return this._p.elements;}

    /* Returns all stairs elements. */
    public getStairs(): ElementStairs[] {
        const res = [];
        this._p.elements.forEach(elem => {
            if (this._isStairs(elem)) {
                res.push(elem);
            }
        });
        return res;
    }

    public getPassages(): ElementStairs[] {
        const res = [];
        this._p.elements.forEach(elem => {
            if (elem.getName() === 'passage') {
                const elemStairs: unknown = elem;
                res.push(elemStairs as ElementStairs);
            }
        });
        return res;
    }

    public getConnections(): ElementStairs[] {
        const conn = [];
        this._p.elements.forEach(elem => {
            if (elem.getType() === 'connection') {
                const elemStairs: unknown = elem;
                conn.push(elemStairs as ElementStairs);
            }
        });
        return conn;
    }

    public _isStairs(elem): elem is ElementStairs {
        return (/stairs(Down|Up)/).test(elem.getName());
    }

    public setMap(map: CellMap): void {this._map = map;}
    public getMap(): CellMap {return this._map;}

    /* Given a level, returns stairs which lead to that level.*/
    public getStairsToLevel(level: Level): ElementStairs | null {
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
    // STAIRS RELATED FUNCTIONS
    //---------------------------------------------------------------------

    /* Adds stairs for this level.*/
    public addStairs(stairs: ElementStairs, x: number, y: number): boolean {
        if (!RG.isNullOrUndef([x, y])) {
            if (this._map.hasXY(x, y)) {
              stairs.setSrcLevel(this);
              // Prevents stairs on impassable squares
              this._map.setBaseElemXY(x, y, ELEM.FLOOR);
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
    public useStairs(actor: BaseActor): boolean {
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
    public addElement(elem, x: number, y: number): boolean {
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

    public removeElement(elem, x: number, y: number): boolean {
        return this._removePropFromLevelXY(RG.TYPE_ELEM, elem, x, y);
    }

    public addEntity(ent, x: number, y: number): boolean {
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

    /* Adds one item to the given location on the level. If x,y not given,
    *  adds it to random free cell. */
    public addItem(item, x?: number, y?: number): boolean {
        // verifyLevelCache(this);
        if (!RG.isNullOrUndef([x, y])) {
            return this._addPropToLevelXY(RG.TYPE_ITEM, item, x, y);
        }
        const [xCell, yCell] = this._getFreeCellXY();
        return this._addPropToLevelXY(RG.TYPE_ITEM, item, xCell, yCell);
    }

    /* Removes an item from the level in x,y position.*/
    public removeItem(item, x: number, y: number): boolean {
        const res = this._removePropFromLevelXY(RG.TYPE_ITEM, item, x, y);
        // verifyLevelCache(this);
        return res;
    }

    public pickupItem(actor: BaseActor): void {
        const pickup = new Pickup();
        actor.add(pickup);
    }

    /* Moves the given object to x,y of this level. Note that object can reside
    *  in another level before the move, and it's handled correctly. */
    public moveActorTo(obj: BaseActor, x: number, y: number): boolean {
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
    public addActor(actor, x: number, y: number): boolean {
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
            RG.nullOrUndefError('Level: addActor', 'arg |x|', x);
            RG.nullOrUndefError('Level: addActor', 'arg |y|', y);
            return false;
        }
    }

    /* Using this method, actor can be added to a free cell without knowing the
     * exact x,y coordinates. This is not random, such that top-left (0,0) is
     * always preferred. */
    public addActorToFreeCell(actor): boolean {
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
    public _addPropToLevelXY(propType, obj, x: number, y: number): boolean {
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
    public addVirtualProp(propType, obj): boolean {
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
    public _removePropFromLevelXY(
        propType, obj, x: number, y: number
    ): boolean {
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
    public removeVirtualProp(propType, obj): boolean {
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
    public removeActor(actor): boolean {
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
    public exploreCells(actor): Cell[] {
        const visibleCells = this._map.getVisibleCells(actor);
        for (let i = 0; i < visibleCells.length; i++) {
            visibleCells[i].setExplored();
        }
        return visibleCells;
    }

    /* Returns all explored cells in the map.*/
    public getExploredCells(): Cell[] {
        return this._map.getExploredCells();
    }

    /* Can be used to add additional data to the level. Currently, this is used in
     * proc gen only, and extras are not serialized/stored persistently.
     * */
    public setExtras(extras): void {
        this._extras = extras;
    }

    public getExtras(): LevelExtras {
        if (!this._extras) {this._extras = {};}
        return this._extras;
    }

    public hasExtras(): boolean {
        return !RG.isNullOrUndef([this._extras]) &&
            Object.keys(this._extras).length > 0;
    }

    public addExtras(key: string, value: any): void {
        if (!this._extras) {this._extras = {} as LevelExtras;}
        this._extras[key] = value;
    }

    /* Returns the bounding box of the level (upper-left and lower-right
     * coordinates). */
    public getBbox(): BBox {
        return {
            ulx: 0, uly: 0,
            lrx: this.getMap().cols - 1,
            lry: this.getMap().rows - 1
        };
    }

    public getColsRows(): [number, number] {
        return [
            this.getMap().cols,
            this.getMap().rows
        ];
    }

    public setOnEnter(cb): void {
        this._callbacks.OnEnter = cb;
    }

    public setOnFirstEnter(cb): void {
        this._callbacks.OnFirstEnter = cb;
    }

    public setOnExit(cb): void {
        this._callbacks.OnExit = cb;
    }

    public setOnFirstExit(cb): void {
        this._callbacks.OnFirstExit = cb;
    }

    public onEnter(): void {
        if (this._callbacks.hasOwnProperty('OnEnter')) {
            this._callbacks.OnEnter(this);
        }
    }

    public onFirstEnter(): void {
        if (!this._cbState.onFirstEnterDone) {
            if (this._callbacks.hasOwnProperty('OnFirstEnter')) {
                this._callbacks.OnFirstEnter(this);
            }
            this._cbState.onFirstEnterDone = true;
        }
    }

    public onExit(): void {
        if (this._callbacks.hasOwnProperty('OnExit')) {
            this._callbacks.OnExit(this);
        }
    }

    public onFirstExit(): void {
        if (!this._cbState.onFirstExitDone) {
            if (this._callbacks.hasOwnProperty('OnFirstExit')) {
                this._callbacks.OnFirstExit(this);
            }
            this._cbState.onFirstExitDone = true;
        }
    }

    /* Return random free cell on a given level.*/
    public getFreeRandCell(): CellOrNull {
        const freeCells = this.getMap().getFree();
        if (freeCells.length > 0) {
            const index = RNG.randIndex(freeCells);
            return freeCells[index];
        }
        return null;
    }

    /* Returns random empty cells, or null if cannot find any.*/
    public getEmptyRandCell(): CellOrNull {
        const emptyCells = this.getMap().getEmptyCells();
        if (emptyCells.length > 0) {
            const index = RNG.randIndex(emptyCells);
            return emptyCells[index];
        }
        return null;
    }

    public _getFreeCellXY(): [number, number] {
        const freeCells = this._map.getFree();
        if (freeCells.length > 0) {
            const xCell = freeCells[0].getX();
            const yCell = freeCells[0].getY();
            return [xCell, yCell];
        }
        return [null, null];
    }

    public debugPrintInASCII(): void {
        this.getMap().debugPrintInASCII();
    }

    /* Removes all elements matching the given function. */
    public removeElements(filter: (elem) => boolean): void {
        const toRemove = this._p.elements.filter(filter);
        toRemove.forEach(elem => {
          const eX = (elem as Mixin.Locatable).getX();
          const eY = (elem as Mixin.Locatable).getY();
          this.removeElement(elem, eX, eY);
        });
    }

    public getCell(x: number, y: number): Cell {
        return this._map.getCell(x, y);
    }

    /* Returns the player actor or null if player does not exist. */
    public getPlayer(): SentientActor | null {
        const pActor = this._p.actors.find(a => a.isPlayer && a.isPlayer());
        return pActor as SentientActor;
    }

    /* Serializes the level object. */
    public toJSON(): any {
        const obj: any = {
            isJSON: true,
            id: this.getID(),
            levelNumber: this.getLevelNumber(),
            actors: [],
            items: [],
            elements: [],
            map: this.getMap().toJSON(),
            // map: this.getMap().toJSONEncoded(),
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


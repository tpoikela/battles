
import RG from './rg';
import {Entity} from './entity';
import {Pickup} from './component/component';
import {compsToJSON} from './component/component.base';
import {Random} from './random';
import {EventPool} from './eventpool';
import {verifyLevelCache} from './verify';
import {ELEM} from '../data/elem-constants';
import * as Component from './component/component';
import {Element} from './element';
import {BBox} from './bbox';

// Import types only
import {TCoord, TCellProp, ICoordXY } from './interfaces';
type ZoneBase = import('./world').ZoneBase;
type SubZoneBase = import('./world').SubZoneBase;
type Area = import('./world').Area;
type Battle = import('./game.battle').Battle;

type Cell = import('./map.cell').Cell;
type CellMap = import('./map').CellMap;
type House = import('./generator').House;
type MapObj = import('./generator').MapObj;
type WorldShop = import('./world').WorldShop;

type ItemBase = import('./item').ItemBase;
type ElementXY = import('./element').ElementXY;
type ElementStairs = import('./element').ElementStairs;
type BaseActor = import('./actor').BaseActor;
type SentientActor = import('./actor').SentientActor;

type CellOrNull = Cell | null;

const POOL = EventPool.getPool();
const {TYPE_ACTOR, TYPE_ELEM, TYPE_ITEM} = RG;

const RNG = Random.getRNG();


/* Possible callbacks:
 * showMsg: {msg: 'my msg'}
 */

interface LevelCallbackJSON {
    msg: string;
    cbType: string;
}

/* Possible callbacks for entering/exiting levels. */
export class LevelCallback {
    public cbType: string;
    public msg: string;

    constructor(type: string) {
        this.cbType = type;
    }

    public execute(): void {
        RG.gameMsg(this.msg);
    }

    public getCbType(): string {
        return this.cbType;
    }

    public toJSON(): LevelCallbackJSON {
        return {
            cbType: this.getCbType(),
            msg: this.msg
        };
    }
}


export type LevelParent = Battle | SubZoneBase | Area;

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
    bigRooms?: any[];
    terms?: any[];
    rooms?: any[];
    endPoint?: TCoord;
    criticalPath?: ICoordXY[];
    /* connectEdges?: boolean;
    isCollapsed?: boolean;*/
};

type LevelExtrasKey = keyof LevelExtras;

interface LevelProps {
    actors: BaseActor[];
    elements: ElementXY[];
    items: ItemBase[];
}

type TLevelPropKey = keyof LevelProps;

/* Object for the game levels. Contains map, actors and items.  */
// const Level = function() {
export class Level extends Entity {

    public static createLevelID() {
        return Entity.createEntityID();
    }

    public editorID: number; // Used in editor only
    public actorWarnLimit: number;

    private _map: CellMap;
    private _parent: null | LevelParent;
    private _p: LevelProps;
    private _levelNo: number;
    private _callbacks: {[key: string]: (arg: any) => void};
    private _cbState: {[key: string]: boolean};

    // Non-serializable property used during PCG
    private _extras: LevelExtras;


    constructor(map: CellMap) {
        super();
        this._map = map;
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
        this.add(new Component.Place());
        // Prints console.warn when level has this many actors
        this.actorWarnLimit = 5000;
    }

    public setLevelNumber(no: number): void {this._levelNo = no;}

    public getLevelNumber(): number {
        return this._levelNo;
    }

    public getSizeXY(): [number, number] {
        return [this._map.cols, this._map.rows];
    }

    public getParent(): null | LevelParent {
        return this._parent;
    }

    public getParentZone(): null | ZoneBase {
        const subZoneParent = this.getParent();
        if (subZoneParent) {
            /*
            if ((subZoneParent as SubZoneBase).getParent) {
                return subZoneParent.getParent() as ZoneBase;
            }
            */
            if (subZoneParent.getParent) {
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
    public getElements(): ElementXY[] {return this._p.elements;}

    /* Returns all stairs elements. */
    public getStairs(): ElementStairs[] {
        const res: ElementStairs[] = [];
        this._p.elements.forEach(elem => {
            if (this._isStairs(elem)) {
                res.push(elem);
            }
        });
        return res;
    }

    public getPassages(): ElementStairs[] {
        const res: ElementStairs[] = [];
        this._p.elements.forEach(elem => {
            if (elem.getName() === 'passage') {
                const elemStairs: unknown = elem;
                res.push(elemStairs as ElementStairs);
            }
        });
        return res;
    }

    public getConnections(): ElementStairs[] {
        const conn: ElementStairs[] = [];
        this._p.elements.forEach(elem => {
            if (elem.getType() === 'connection') {
                const elemStairs: unknown = elem;
                conn.push(elemStairs as ElementStairs);
            }
        });
        return conn;
    }

    public _isStairs(elem: any): elem is ElementStairs {
        return (/stairs(Down|Up)/).test(elem.getName());
    }

    public setMap(map: CellMap, mapObj?: MapObj): void {
        this._map = map;
        if (mapObj) {
            if (mapObj.elements) {this._p.elements = mapObj.elements;}
            this._p.elements.forEach(elem => {elem.setLevel(this);});
        }
    }
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
              const baseElem = this._map.getBaseElemXY(x, y);
              if (baseElem.has('Impassable') || baseElem.getZ() === 0) {
                  this._map.setBaseElemXY(x, y, ELEM.FLOOR);
              }
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
            if (connection!.useStairs(actor)) {
                return true;
            }
            else {
                RG.err('Level', 'useStairs', 'Failed to use connection.');
            }
        }
        return false;
    }

    /* Adds one element into the level. */
    public addElement(elem: ElementXY, x: number, y: number): boolean {
        if (elem.getType() === 'connection') {
            const sElem: unknown = elem;
            return this.addStairs(sElem as ElementStairs, x, y);
        }
        if (!RG.isNullOrUndef([x, y])) {
            return this._addPropToLevelXY(RG.TYPE_ELEM, elem, x, y);
        }
        const cell = this._getFreeCell();
        if (!cell) {
            this.debugPrintInASCII();
            RG.err('Level', 'addElement',
                'Cannot add prop to null xy-coord');
            return false;
        }
        const [xCell, yCell] = cell.getXY();
        return this._addPropToLevelXY(RG.TYPE_ELEM, elem, xCell, yCell);
    }

    public removeElement(elem: ElementXY, x: number, y: number): boolean {
        return this._removePropFromLevelXY(RG.TYPE_ELEM, elem, x, y);
    }

    public addEntity(ent: TCellProp, x: number, y: number): boolean {
        if (RG.isActor(ent)) {
            return this.addActor(ent as BaseActor, x, y);
        }
        else if (RG.isItem(ent)) {
              return this.addItem(ent as ItemBase, x, y);
        }
        else if (RG.isElement(ent)) {
            return this.addElement(ent as ElementXY, x, y);
        }
        else {
            RG.err('Level', 'addEntity',
                'No support for ents without getPropType');
        }
        return false;
    }

    public removeEntity(ent: TCellProp, x: number, y: number): boolean {
        if (RG.isActor(ent)) {
            return this.removeActor(ent as BaseActor);
        }
        else if (RG.isItem(ent)) {
              return this.removeItem(ent as ItemBase, x, y);
        }
        else if (RG.isElement(ent)) {
            return this.removeElement(ent as ElementXY, x, y);
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
    public addItem(item: ItemBase, x?: number, y?: number): boolean {
        if (item.getWeight() === 0) {
            console.log(item);
            RG.err('Level', 'addItem', 'Item with zero-weight detected');
        }
        if (!RG.isNullOrUndef([x, y])) {
            return this._addPropToLevelXY(RG.TYPE_ITEM, item, x!, y!);
        }
        const cell = this._getFreeCell();
        if (cell) {
            const [xCell, yCell] = cell.getXY();
            return this._addPropToLevelXY(RG.TYPE_ITEM, item, xCell, yCell);
        }
        return false;
    }

    /* Removes an item from the level in x,y position.*/
    public removeItem(item: ItemBase, x: number, y: number): boolean {
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
    public addActor(actor: BaseActor, x: number, y: number): boolean {
        RG.debug(this, 'addActor called with x,y ' + x + ', ' + y);
        if (!RG.isNullOrUndef([x, y])) {
            if (this._map && this._map.hasXY(x, y)) {
                this._addPropToLevelXY(RG.TYPE_ACTOR, actor, x, y);
                RG.debug(this, 'Added actor to map x: ' + x + ' y: ' + y);
                if (this._p.actors.length > this.actorWarnLimit) {
                    RG.warn('Level', 'addActor',
                        `Over ${this.actorWarnLimit} actors. Last added: ${actor.getName()}`);
                }
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
    public addActorToFreeCell(actor: BaseActor): boolean {
        RG.debug(this, 'Adding actor to free slot');
        const freeCells: Cell[] = this._map.getFree();
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
    public _addPropToLevelXY(propType: TLevelPropKey, obj, x: number, y: number): boolean {
        if (this._p.hasOwnProperty(propType)) {
            this._p[propType].push(obj);
            //rm if (!obj.isOwnable) {
            obj.setXY(x, y);
            obj.setLevel(this);
            // }
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
    public addVirtualProp(propType: TLevelPropKey, obj: TCellProp): boolean {
        if (this._p.hasOwnProperty(propType)) {
            if (RG.isActor(obj)) {
                this._p[propType].push(obj as any);
                (obj as BaseActor).setLevel(this);
                POOL.emitEvent(RG.EVT_LEVEL_PROP_ADDED, {level: this, obj,
                    propType});
                return true;
            }
            else {
            RG.err('Level', 'addVirtualProp',
                 `Only virtual actors are supported. Got ${propType}`);
            }
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
        propType: TLevelPropKey, obj: TCellProp, x: number, y: number
    ): boolean {
        if (this._p.hasOwnProperty(propType)) {
            const index = this._p[propType].indexOf(obj as any);

            if (index >= 0) {
                this._p[propType].splice(index, 1);
                if (!RG.isItem(obj)) {
                    (obj as any).setXY(null, null);
                    (obj as any).unsetLevel();
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
    public removeVirtualProp(propType: TLevelPropKey, obj: TCellProp): boolean {
        if (this._p.hasOwnProperty(propType)) {
            const index = this._p[propType].indexOf(obj as any);
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
    public removeActor(actor: BaseActor): boolean {
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
    public exploreCells(actor: SentientActor): Cell[] {
        const visibleCells = this._map.getCellsInFOV(actor);
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
    public setExtras(extras: LevelExtras): void {
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

    public addExtras(key: LevelExtrasKey, value: any): void {
        if (!this._extras) {this._extras = {} as LevelExtras;}
        this._extras[key] = value;
    }

    /* Returns the bounding box of the level (upper-left and lower-right
     * coordinates). */
    public getBbox(): BBox {
        return BBox.fromBBox({
            ulx: 0, uly: 0,
            lrx: this.getMap().cols - 1,
            lry: this.getMap().rows - 1
        });
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

    public _getFreeCell(): CellOrNull {
        const freeCells = this._map.getFree();
        if (freeCells.length > 0) {
            return freeCells[0];
        }
        return null;
    }

    public debugPrintInASCII(): void {
        this.getMap().debugPrintInASCII();
    }

    /* Removes all elements matching the given function. */
    public removeElements(filter: (elem: ElementXY) => boolean): void {
        const toRemove = this._p.elements.filter(filter);
        toRemove.forEach(elem => {
          const [eX, eY] = elem.getXY();
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


    public getFreeEdgeCells(): Cell[] {
        const map = this.getMap();
        const edgeConns = this.getMap().getCells(c => (
            (c.getX() === 0 || c.getY() === 0 ||
            c.getX() === map.cols - 1 || c.getY() === map.rows - 1) &&
                !c.getBaseElem().has('Impassable')
        ));
        return edgeConns;
    }

    public getCellWithElem(elemType: string): null | ElementXY {
        const elems = this.getElements().filter(elem => (
            elem.getType() === elemType));
        return elems[0];
    }

    /* Can be used to update level props arrays from cells. This is useful if
    * CellMap is created, and there are some items, elements or actors already
    * existing. */
    public updateLevelFromMap(): void {
        this.getMap().getCells().forEach((cell: Cell) => {
            if (cell.hasProps()) {
                const props: TCellProp[] = cell.getProps();
                props.forEach((p: TCellProp) => {
                    const key = p.getPropType() as TLevelPropKey;
                    this._p[key].push(p as any);
                    if ((p as any).setXY) {
                        (p as any).setXY(cell.getX(), cell.getY());
                        (p as any).setLevel(this);
                    }
                });
            }
        });
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
        props.forEach((propType: TLevelPropKey) => {
            this._p[propType].forEach((prop: TCellProp) => {
                const propObj = {
                    x: prop.getX(),
                    y: prop.getY(),
                    obj: prop.toJSON()
                };

                // Avoid storing player twice (stored in Game.Main already)
                if (propType !== RG.TYPE_ACTOR) {
                    obj[propType].push(propObj);
                }
                else if (!propObj.obj.isPlayer) {
                    obj[propType].push(propObj);
                }
            });
        });

        return obj;
    }

    public verifyLevelCache(): void {
        verifyLevelCache(this);
    }

    /* Given Level l1 and l2, connect each Cell in their specified edges together using
     * an array of Element.Stairs. */
    public static connectLevels(l1: Level, l2: Level, edge1: string, edge2: string): void {
        const c1: Cell[] = l1.getCellsOnEdge(edge1);
        const c2: Cell[] = l2.getCellsOnEdge(edge2);
        if (c1.length !== c2.length) {
            RG.err('Level', 'connectLevels', 'Cell arrays not same length');
        }

        for (let i = 0; i < c1.length; i++) {
            const e1 = new Element.Stairs('stairs', l1, l2);
            const e2 = new Element.Stairs('stairs', l2, l1);
            l1.addElement(e1, c1[i].getX(), c1[i].getY());
            l2.addElement(e2, c2[i].getX(), c2[i].getY());
        }
    }

    /* Returns an array of cells on the given edge. */
    public getCellsOnEdge(edge: string): Cell[] {
        return this.getMap().getEdgeCells(edge);
    }


}


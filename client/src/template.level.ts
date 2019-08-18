
import RG from './rg';
import {Random} from './random';
import {Template, ElemTemplate} from './template';
import {Crypt} from '../data/tiles.crypt';
import {BBoxOld} from './geometry';
import './utils';
import {RandWeights} from './interfaces';

import dbg = require('debug');
const debug = dbg('bitn:TemplateLevel');
debug.enabled = true;

const FILLER_TEMPL = Crypt.tiles.filler;
const RNG = Random.getRNG();

const DEFAULT_CALLBACK = () => {};
const debugVerbosity = 20;

type GenParams = number[];

interface ParamsMap {
    [key: string]: GenParams;
}

type TList = ElemTemplate[];

export interface IRoomPlace {
    x: number;
    y: number;
    room: ElemTemplate;
}

interface PlacedTileData extends BBoxOld {
    tileX: number;
    tileY: number;
    name: string;
    type: string;
}

type Array2d<T> = T[][];

export type ConstraintFunc = (x: number, y: number, exits: string[]) => void;

/* This object can be used to create levels from ASCII-based templates. Each
 * template should be abuttable in a reasonable way, and connections between
 * tiles
 * should be described properly. See files in '../data/tiles.*'.
 *
    // Original algorithm can be found from "Procedural Generation in
    // Game Design" chapter 7, by Jim Shepard.
    */
export class TemplateLevel {

    public tilesX: number;
    public tilesY: number;
    public genParams: number[] | ParamsMap;
    public roomCount: number;

    public map: any[][];
    public mapExpanded: any[][];
    public templMap: ElemTemplate[][];
    public placedTileData: {[key: string]: PlacedTileData};

    public genParamsX: GenParams[];
    public genParamsY: GenParams[];

    public tryToMatchAllExits: boolean;
    public missingExitIsError: boolean;
    public weights: RandWeights;
    public callbacks: {[key: string]: (arg?: any) => void};
    public filler: ElemTemplate;
    public templates: ElemTemplate[];

    public constraintFunc: ConstraintFunc;
    public startRoomFunc: () => void;

    public matchMap: {[key: string]: string};
    public nsew2DirRemap: {[key: string]: string};
    public dir2NSEWRemap: {[key: string]: string};

    public noEdge: {[key: string]: boolean};

    public customMatchFilter: (
        tl: TemplateLevel,
        x: number, y: number, list: ElemTemplate[], prev: IRoomPlace
    ) => ElemTemplate[];

    private _ind: number;
    private _unusedExits: any[];
    private _sortedByExit: {[key: string]: ElemTemplate[]};
    private _possibleDirections: string[];
    private _freeExits: {[key: string]: string[]};
    private _sortedWithAllExits: {[key: string]: ElemTemplate[]};

    private lastPlaced: IRoomPlace | null;

    constructor(tilesX: number, tilesY: number) {
        this.tilesX = tilesX;
        this.tilesY = tilesY;

        // Generator parameters, used for tile scaling
        this.genParams = [1, 1, 1, 1];

        this.roomCount = 40;

        this.callbacks = {
            afterInit: DEFAULT_CALLBACK
        };

        this.filler = Template.createTemplate(FILLER_TEMPL);
        this.templates = [];

        // Finds always best match for exits
        this.tryToMatchAllExits = true;

        // Works only when tryToMatchAllExits = true. Throws error is required exits
        // are not found in tiles.
        this.missingExitIsError = false;

        //------------------------
        // PRIVATE VARIABLES
        //------------------------

        this._ind = 0; // Indentation for debug messages

        this._unusedExits = [];
        this._freeExits = {};

        this._possibleDirections = ['N', 'S', 'E', 'W'];

        this._sortedByExit = {
            N: [], S: [], E: [], W: []
        };

        this.noEdge = {};

        this.lastPlaced = null;

        // For sorting by including all possible exits
        this._sortedWithAllExits = {};
    }

    /* Sets the filler tile used to fill the map first. */
    public setFiller(fillerTempl): void {
        if (typeof fillerTempl === 'string') {
            this.filler = Template.createTemplate(fillerTempl);
            this.filler.setProp('name', 'FILLER');
        }
        else {
            this.filler = fillerTempl.clone();
            this.filler.setProp('name', 'FILLER');
        }
    }

    /* Sets the room templates that are used. */
    public setTemplates(asciiTiles): void {
        this.templates = [];
        if (typeof asciiTiles[0] === 'string') {
            this.templates = asciiTiles.map(t => Template.createTemplate(t));
        }
        else {
            this.templates = asciiTiles;
        }
    }

    /* Adds one ASCII/room template to the list of usable templates. */
    public addTemplate(asciiTile): void {
        if (typeof asciiTile === 'string') {
              this.templates.push(Template.createTemplate(asciiTile));
        }
        else if (asciiTile instanceof Template.ElemTemplate) {
            this.templates.push(asciiTile);
        }
    }

    /* Sets the generator parameters for expansion. */
    public setGenParams(arr): void {
        this.genParams = arr;
    }

    /* Sets the target room count. -1 fills until no more well-connected
     * rooms are possible. */
    public setRoomCount(count: number): void {
        this.roomCount = count;
    }

    /* Sets the callback for constraint. This callback is called with
     * (x, y, exitReqd), and exposes this._sortedByExit.
     */
    public setConstraintFunc(func: ConstraintFunc) {
        this.constraintFunc = func.bind(this);
    }

    /* Can be used to set a start room function, which picks the first room
     * to use. This function must return the room, and not place it. */
    public setStartRoomFunc(func) {
        this.startRoomFunc = func.bind(this);
    }

    /* Adds a callback to the generator. */
    public addCallback(name: string, cb): void {
        if (this.callbacks.hasOwnProperty(name)) {
            if (typeof cb === 'function') {
                this.callbacks[name] = cb;
            }
            else {
                RG.err('TemplateLevel', 'setCallback',
                    `Tried setting non-function as cb: ${cb}`);
            }
        }
        else {
            RG.err('TemplateLevel', 'setCallback',
                `No callback for ${name}`);
        }
    }

    /* Calls as many setters above as possible from given object. */
    public use(obj): void {
        const setterList = ['constraintFunc', 'startRoomFunc', 'roomCount',
        'genParams'];
        setterList.forEach(p => {
            if (obj.hasOwnProperty(p)) {
                const setter = 'set' + p.capitalize();
                this[setter](obj[p]);
            }
        });

        if (obj.tiles && obj.tiles.filler) {
            this.setFiller(obj.tiles.filler);
        }

        if (obj.Models && obj.Models.default) {
            this.setTemplates(obj.Models.default);
        }
    }

    /* Creates the level. Result is in this.map.
     * This is the Main function you want to call. */
    public create(): void {
        if (this.templates.length === 0) {
            RG.err('TemplateLevel', 'create',
                'No templates set. Use setTemplates() before create()');
        }

        this._sortDataIntoListsByLocation();

        // Initialize a map with filler cells
        this._initMapWithFillerCells();

        let levelInvalid = true;
        let maxLevelTries = 10;

        while (levelInvalid) {
            ++this._ind;
            this.dbg(`Dungeon not ready. Tries left  ${maxLevelTries}/10`);
            this._placeStartRoom();

            let roomCount = 0;
            const goalCount = this.roomCount;
            let numTries = 0;
            let hasExits = true;

            while (numTries < 1000 && hasExits) {

                // Get a room with unused exits or terminate
                const room = this._getRoomWithUnusedExits();
                if (room === null) {
                    hasExits = false;
                    break;
                }

                const {x, y} = room;
                this.dbg(`Current room in ${x},${y}`);
                const exits = this._getFreeExits(room);
                this.dbg(`It has free exits: ${exits}`);

                // Pick one exit randomly
                const chosen = RNG.arrayGetRand(exits);
                this.dbg(`Chose exit: ${chosen} for next room`);

                // Get required matching exit
                const exitReqd = this.getMatchingExit(chosen);
                const newX = this._getNewX(x, exitReqd);
                const newY = this._getNewY(y, exitReqd);

                if (newX === x && newY === y) {
                    let msg = `Illegal ${x},${y} -> ${newX},${newY}`;
                    msg += ` Exits: Chosen ${chosen} -> ${exitReqd}`;
                    RG.err('TemplateLevel', 'create', msg);
                }

                // Get a new room matching this exit
                const templMatch = this._getNextTemplate(newX, newY, exitReqd);

                // Make sure the new room is valid
                if (this._isRoomLegal(newX, newY)) {
                    this._placeRoom(
                        x, y, chosen, newX, newY, exitReqd, templMatch);
                    ++roomCount;
                    this.dbg('Room count incremented to ' + roomCount);
                }

                // Place the new room and incr roomCount
                ++numTries;

                if (goalCount !== -1 && roomCount >= goalCount) {
                    levelInvalid = false;
                    break;
                }
            }

            if (roomCount >= goalCount || goalCount === -1) {
                levelInvalid = false;
            }
            else if (--maxLevelTries === 0) {
                RG.warn('Level.Template', 'create',
                    'Max tries reached. No valid level created');
                break;
            }
            else {
                this._cleanupAndTryAgain();
            }
            --this._ind;
        }

        this.expandTemplates();
    }

    /* Sort data into lists based on different directions */
    public _sortDataIntoListsByLocation(): void {
        const dirRegex = this._possibleDirections.map(dir => new RegExp(dir));
        this.templates.forEach(templ => {
            const dir = templ.getProp('dir');
            if (dir) {
                this._possibleDirections.forEach((direction, i) => {
                    if (dirRegex[i].test(dir)) {
                        this._sortedByExit[direction].push(templ);
                    }
                });

                // Add to map including all possible exits
                const dirSorted = dir.split('').sort().join('');
                if (!this._sortedWithAllExits[dirSorted]) {
                    this._sortedWithAllExits[dirSorted] = [];
                }
                this._sortedWithAllExits[dirSorted].push(templ);
            }
            const noEdge = templ.getProp('noedge');
            if (noEdge && parseInt(noEdge, 10) > 0) {
                this.noEdge[templ.getProp('name')] = true;
            }
        });

    }

    /* Expands the templates with generator params and creates the final 2d-tile
     * map from the 2d template map. */
    public expandTemplates(): void {
        // Create gen params for each tile
        this.genParamsX = [];
        this.genParamsY = [];
        for (let x = 0; x < this.tilesX; x++) {
            if ((this.genParams as ParamsMap).x) {
                this.genParamsX.push((this.genParams as ParamsMap).x);
            }
            else {
                const paramsX = [this.genParams[0], this.genParams[1]];
                this.genParamsX.push(paramsX);
            }
        }
        for (let y = 0; y < this.tilesY; y++) {
            if ((this.genParams as ParamsMap).y) {
                this.genParamsY.push((this.genParams as ParamsMap).y);
            }
            else {
                const paramsY = [this.genParams[2], this.genParams[3]];
                this.genParamsY.push(paramsY);
            }
        }

        // Expand the tiles with parameters
        this.mapExpanded = [];
        for (let x = 0; x < this.tilesX; x++) {
            this.mapExpanded[x] = [];
            for (let y = 0; y < this.tilesY; y++) {
                const params = this.genParamsX[x].concat(this.genParamsY[y]);
                this.mapExpanded[x][y] = this.templMap[x][y].getChars(params);
            }
        }

        // Now we have an unflattened map: 4-dimensional arrays, the last part
        // is to convert this into 2-d array.
        this.map = [];
        this.placedTileData = {};
        let llx = 0;
        let urx = 0;
        for (let tileX = 0; tileX < this.tilesX; tileX++) {
            const numCols = this.mapExpanded[tileX][0].length;
            urx = llx + numCols - 1;

            for (let i = 0; i < numCols; i++) {
                let lly = 0;
                let ury = 0;
                let finalCol = [];
                for (let tileY = 0; tileY < this.tilesY; tileY++) {
                    const tileCol = this.mapExpanded[tileX][tileY][i];
                    const tileColLen = tileCol.length;
                    lly = ury + tileColLen - 1;
                    finalCol = finalCol.concat(tileCol);

                    this.placedTileData[tileX + ',' + tileY] = {
                        name: this.templMap[tileX][tileY].getProp('name'),
                        type: this.templMap[tileX][tileY].getProp('type'),
                        llx, urx, ury, lly, tileX, tileY
                    };
                    ury += tileColLen;
                }
                this.map.push(finalCol);
            }
            llx += numCols;
        }
    }

    public getPlacedData() {
        return this.placedTileData;
    }

    /* Returns the generated map (found also in this.map). */
    public getMap() {
        if (!this.map) {
            RG.warn('TemplateLevel', 'getMap',
                'Not not generated. Call create() first');
        }
        return this.map;
    }

    /* Finds a template based on prop name and val, and returns a random
     * template among the found templates. Returns null if none are found. */
    public findTemplate(query) {
        const result = [];
        Object.keys(query).forEach(key => {
            this.templates.forEach(t => {
                if (t.getProp(key) === query[key]) {
                    result.push(t);
                }
            });
        });
        if (result.length > 0) {
            return RNG.arrayGetRand(result);
        }
        return null;
    }

    /* Removes the templates matching the given query. This is useful, if for
     * example after starting conditions you want to remove some tiles. */
    public removeTemplate(query): void {
        const key = Object.keys(query)[0];
        const index = this.templates.findIndex(t => (
            t.getProp(key) === query[key]
        ));
        if (index >= 0) {
            this.templates.splice(index, 1);
        }
    }

    /* Adds a room (template) to fixed position. This can be called from user
     * callbacks. Can be used to place any amount of rooms prior to calling
     * create(). */
    public addRoom(templ: ElemTemplate, x: number, y: number): void {
        const room: IRoomPlace = {x, y, room: templ};
        this._addRoomData(room);
        this._removeExitsOfAbuttingRooms(room);
        this._removeBorderExits(room);
        this.templMap[x][y] = templ;
        this.lastPlaced = room;
    }

    //----------------------------------------------------------------
    // PRIVATE
    //----------------------------------------------------------------

    /* Important function to get the next (usually legal) template to be
     * placed.
     */
    public _getNextTemplate(x, y, exitReqd) {
        ++this._ind;
        let next = null;

        // Priority is on constraint func
        if (typeof this.constraintFunc === 'function') {
            next = this.constraintFunc(x, y, exitReqd);
        }

        // All exits are required to match
        if (!next && this.tryToMatchAllExits) {
            this.dbg(`_getNextTemplate: Compute required exits for ${x},${y}`);
            const exitsReqd = this.getAllRequiredExits(x, y);
            let listMatching = this._getMatchWithExits(exitsReqd);
            listMatching = this.filterOutNoEdge(x, y, listMatching);
            if (this.customMatchFilter) {
                listMatching = this.customMatchFilter(this, x, y, listMatching,
                    this.lastPlaced);
            }
            if (listMatching.length > 0) {
                --this._ind;
                return this._getRandTemplate(listMatching);
            }
            let msg = `x,y: ${x},${y}`;
            msg += `Required: ${exitsReqd[1]}, Excl: ${exitsReqd[2]}`;
            RG.warn('TemplateLevel', '_getNextTemplate',
                `Not all exits match. ${msg}`);

            if (this.missingExitIsError) {
                this.expandTemplates();
                RG.printMap(this.map);
                const str = `${x},${y} exitReqd: ${JSON.stringify(exitsReqd)}`;
                throw new Error(str);
            }
        }

        // If we get here, may produce unwanted results, such as non-matched
        // exits, or noedge cells on edges of maps
        if (!next) {
            let listMatching = this._sortedByExit[exitReqd];
            listMatching = this.filterOutNoEdge(x, y, listMatching);
            --this._ind;
            if (listMatching.length > 0) {
                return this._getRandTemplate(listMatching);
                // return RNG.arrayGetRand(listMatching);
            }
            return this._sortedByExit[exitReqd];
        }

        --this._ind;
        return next;
    }

    /* Returns random template from the given list. Uses random weights if any
     * are given. */
    public _getRandTemplate(list) {
        if (!this.weights) {
            return RNG.arrayGetRand(list);
        }
        const weights = {};
        const names = list.map(t => t.getProp('name'));
        const nameToIndex = {};
        names.forEach((name, i) => {
            nameToIndex[name] = i;
            if (this.weights.hasOwnProperty(name)) {
                weights[name] = this.weights[name];
            }
            else {
                weights[name] = 1;
            }
        });
        const chosenName = RNG.getWeighted(weights);
        return list[nameToIndex[chosenName]];
    }

    public _getRoomWithUnusedExits() {
        if (this._unusedExits.length > 0) {
            return RNG.arrayGetRand(this._unusedExits);
        }
        return null;
    }

    public _getFreeExits(room): string[] | null {
        const {x, y} = room;
        const key = x + ',' + y;
        if (this._freeExits[key]) {
            return this._freeExits[key];
        }
        else {
            RG.err('TemplateLevel', '_getFreeExits',
                `No ${key}, Room: ${JSON.stringify(room)}`);
        }
        return null;
    }

    public _removeChosenExit(x: number, y: number, chosen: string): void {
        const key = x + ',' + y;
        const exits = this._freeExits[key];
        this.dbg(JSON.stringify(this._freeExits));
        this.dbg(`${x},${y} removeChosenExit ${chosen}`);
        this.dbg(`nExits: ${exits.length}`);
        const index = exits.indexOf(chosen);
        if (index >= 0) {
            this._freeExits[key].splice(index, 1);
            if (this._freeExits[key].length === 0) {
                const unusedIndex = this._unusedExits.findIndex(room => {
                    return room.x === x && room.y === y;
                });
                if (unusedIndex >= 0) {
                    this._unusedExits.splice(unusedIndex, 1);
                    delete this._freeExits[key];
                    this.dbg(`${x},${y} has no unused exits anymore.`);
                }
                else {
                    RG.err('TemplateLevel', '_removeChosenExit',
                        `Cannot find ${x},${y} in unusedExits to remove.`);
                }
            }
            if (this._freeExits[key]) {
                this.dbg(`_freeExits [${key}] After remove: `
                    + JSON.stringify(this._freeExits[key]));
            }
        }
        else {
            const json = JSON.stringify(this.templMap[x][y]);
            RG.err('TemplateLevel', '_removeChosenExit',
                `${x},${y} dir: ${chosen} not found. Templ: ${json}`);
        }
    }

    public _isRoomLegal(x: number, y: number): boolean {
        if (x >= 0 && x < this.tilesX && y >= 0 && y < this.tilesY) {
            return true;
        }
        return false;
    }

    /* Places 1st room using startRoomFunc, or randomly if no function is
     * specified. */
    public _placeStartRoom(): void {
        ++this._ind;
        let room = null;
        // startRoomFunc takes priority
        if (typeof this.startRoomFunc === 'function') {
            room = this.startRoomFunc();
            const props = ['x', 'y', 'room'];
            props.forEach(p => {
                if (!room.hasOwnProperty(p)) {
                    const msg = 'room must have {x, y, room}.';
                    RG.err('TemplateLevel', '_placeStartRoom',
                        `Prop ${p} null/undef. ${msg}.`);
                }
            });
        }
        else {
            const x = RNG.getUniformInt(1, this.tilesX - 2);
            const y = RNG.getUniformInt(1, this.tilesY - 2);
            if (this.customMatchFilter) {
                const listMatching = this.customMatchFilter(this, x, y,
                    this.templates, null);
                room = {x, y, room: RNG.arrayGetRand(listMatching)};
            }
            else {
                room = {x, y, room: this.getRandomTemplate()};
            }
        }

        this.dbg('Start room: ' + JSON.stringify(room));
        this.templMap[room.x][room.y] = room.room;

        if (room !== null) {
            this._addRoomData(room);
            this._removeBorderExits(room);
        }
        else {
            RG.err('TemplateLevel', '_placeStartRoom',
                'Starting room was null. Oh no!');
        }
        --this._ind;
    }

    /* Places one room into the map. */
    public _placeRoom(x, y, chosen, newX, newY, exitReqd, templMatch) {
        // Remove chosen exit (old room) from unused exits
        this._removeChosenExit(x, y, chosen);

        // Add new room data to unused exits
        const room = {x: newX, y: newY, room: templMatch};
        this._addRoomData(room);

        // But remove chosen exit
        this._removeChosenExit(newX, newY, exitReqd);

        // Check for abutting rooms on other edges and remove any exits
        this._removeExitsOfAbuttingRooms(room);

        this._removeBorderExits(room);

        // Finally add new room to templMap
        this.templMap[newX][newY] = templMatch;

    }

    public _addRoomData(room: IRoomPlace) {
        const dirProp = room.room.getProp('dir');
        if (dirProp) {
            this._unusedExits.push(room);
            const exits = dirProp.split('');
            const key = room.x + ',' + room.y;
            this._freeExits[key] = exits;
            this.dbg('_addRoomData: Added room ' + JSON.stringify(room.room.elemPropMap), 20);
        }
    }

    /* Returns the matching (opposite) exit for the chosen exit. */
    public getMatchingExit(chosen) {
        if (this.matchMap) {
            if (this.matchMap.hasOwnProperty(chosen)) {
                return this.matchMap[chosen];
            }
        }
        switch (chosen) {
            case 'N': return 'S';
            case 'S': return 'N';
            case 'E': return 'W';
            case 'W': return 'E';
            default: return 'N';
        }
    }

    /* Returns new X value based on the direction. Remaps custom dir to NSEW
    * first. */
    public _getNewX(x, dir) {
        let remapped = dir;
        if (this.dir2NSEWRemap) {
            if (this.dir2NSEWRemap[dir]) {
                remapped = this.dir2NSEWRemap[dir];
            }
        }
        if (remapped === 'E') {return x - 1;}
        if (remapped === 'W') {return x + 1;}
        return x;

    }

    /* Returns new Y value based on the direction. Remaps custom dir to NSEW
    * first. */
    public _getNewY(y, dir) {
        let remapped = dir;
        if (this.dir2NSEWRemap) {
            if (this.dir2NSEWRemap[dir]) {
                remapped = this.dir2NSEWRemap[dir];
            }
        }
        if (remapped === 'N') {return y + 1;}
        if (remapped === 'S') {return y - 1;}
        return y;
    }

    public getRandomTemplate() {
        return RNG.arrayGetRand(this.templates);
    }

    /* Removes exits from tiles which are placed in any borders of the map.
     *  Prevents out-of-bounds expansion. */
    public _removeBorderExits(room: IRoomPlace) {
        const {x, y} = room;
        if (x === 0) {
            if (this._hasExit('W', x, y)) {
                this._removeChosenExit(x, y, 'W');
            }
            if (this.nsew2DirRemap) {
                this._removeExitsRemapped(x, y, 'W');
            }
        }

        if (x === this.tilesX - 1) {
            if (this._hasExit('E', x, y)) {
                this._removeChosenExit(x, y, 'E');
            }
            if (this.nsew2DirRemap) {
                this._removeExitsRemapped(x, y, 'E');
            }
        }

        if (y === 0) {
            if (this._hasExit('N', x, y)) {
                this._removeChosenExit(x, y, 'N');
            }
            if (this.nsew2DirRemap) {
                this._removeExitsRemapped(x, y, 'N');
            }
        }

        if (y === this.tilesY - 1) {
            if (this._hasExit('S', x, y)) {
                this._removeChosenExit(x, y, 'S');
            }
            if (this.nsew2DirRemap) {
                this._removeExitsRemapped(x, y, 'S');
            }
        }

    }

    /* Receives NSEW directions and uses nsew2DirRemap remapping to remove the
     * custom exits. */
    public _removeExitsRemapped(x, y, dir) {
        const remapped = this.nsew2DirRemap[dir];
        if (this._hasExit(remapped, x, y)) {
            this._removeChosenExit(x, y, remapped);
        }
    }

    /* Checks for rooms already in place around the placed room, and removes all
     * matching exits. */
    public _removeExitsOfAbuttingRooms(room: IRoomPlace) {
        const {x, y} = room;

        this.dbg(`CheckAbut ${x},${y}`);
        if (x > 0) {
            const nx = x - 1;
            if (!this._isFiller(nx, y)) {
                this._removeExitByXY('W', x, y);
                this._removeExitByXY('E', nx, y);
                if (this.nsew2DirRemap) {
                    this._removeExitByXY(this.nsew2DirRemap.W, x, y);
                    this._removeExitByXY(this.nsew2DirRemap.E, nx, y);
                }
            }
        }

        if (x < this.tilesX - 1) {
            const nx = x + 1;
            if (!this._isFiller(nx, y)) {
                this._removeExitByXY('E', x, y);
                this._removeExitByXY('W', nx, y);
                if (this.nsew2DirRemap) {
                    this._removeExitByXY(this.nsew2DirRemap.E, x, y);
                    this._removeExitByXY(this.nsew2DirRemap.W, nx, y);
                }
            }
        }

        if (y > 0) {
            const ny = y - 1;
            if (!this._isFiller(x, ny)) {
                this._removeExitByXY('N', x, y);
                this._removeExitByXY('S', x, ny);
                if (this.nsew2DirRemap) {
                    this._removeExitByXY(this.nsew2DirRemap.N, x, y);
                    this._removeExitByXY(this.nsew2DirRemap.S, x, ny);
                }
            }
        }

        if (y < this.tilesY - 1) {
            const ny = y + 1;
            if (!this._isFiller(x, ny)) {
                this._removeExitByXY('S', x, y);
                this._removeExitByXY('N', x, ny);
                if (this.nsew2DirRemap) {
                    this._removeExitByXY(this.nsew2DirRemap.S, x, y);
                    this._removeExitByXY(this.nsew2DirRemap.N, x, ny);
                }
            }
        }

    }

    public _isFiller(x: number, y: number): boolean {
        const filler = this.templMap[x][y].getProp('name') === 'FILLER';
        this.dbg(`isFiller x,y ${x},${y}: ${filler}`);
        return filler;
    }

    public _removeExitByXY(dir, x, y): void {
        if (this._hasExit(dir, x, y)) {
            this._removeChosenExit(x, y, dir);
        }
    }

    public _hasExit(dir, x, y) {
        const key = x + ',' + y;
        if (this._freeExits[key]) {
            return this._freeExits[key].indexOf(dir) >= 0;
        }
        return false;
    }

    public _cleanupAndTryAgain() {
        // Initialize a map with filler cells
        this._initMapWithFillerCells();
        this._freeExits = {};
        this._unusedExits = [];
    }

    public _initMapWithFillerCells(): void {
        this.templMap = [];
        for (let x = 0; x < this.tilesX; x++) {
            this.templMap[x] = [];
            for (let y = 0; y < this.tilesY; y++) {
                this.templMap[x][y] = this.filler;
            }
        }
        if (this.callbacks.afterInit) {
            this.callbacks.afterInit(this);
        }

    }

    /* Sets a new exit map instead of using the default 4-directional NSEW. You
    * must also provide remapping tables. For example, we'd like to remap
    * cardinal dirs NSEW to up/down/left/right UDLR:
    *   1. matchMap = {U: 'D', D: 'U', L: 'R', R: 'R'} - how to math new exits
    *   2. nsew2DirRemap = {N: 'U', S: 'D', W: 'L', E: 'R'}
    * */
    public setExitMap(matchMap, nsew2DirRemap) {
        this._possibleDirections = Object.keys(matchMap);
        this._sortedByExit = {};
        this._possibleDirections.forEach(dir => {
            this._sortedByExit[dir] = [];
        });
        this.matchMap = matchMap;
        this.nsew2DirRemap = nsew2DirRemap;

        // For mapping custom dir to NSEW. Some algorithms only operate on
        // NSEW, so we need a way to convert back to it from custom dirs
        const dir2NSEWRemap = {};
        Object.keys(this.nsew2DirRemap).forEach(key => {
            const val = this.nsew2DirRemap[key];
            dir2NSEWRemap[val] = key;
        });
        this.dir2NSEWRemap = dir2NSEWRemap;
    }

    /* Returns all exits which are required @x,y to match all surrounding
     * tiles. */
    public getAllRequiredExits(x, y) {
        ++this._ind;
        const any = [];
        const exits = [];
        const excluded = [];

        let remapped = null;
        let remapMatch = null;
        // N tile
        const nY = y - 1;
        if (this.nsew2DirRemap) {
            remapped = this.nsew2DirRemap.N;
            remapMatch = this.matchMap[remapped];
        }
        if (nY >= 0) {
            if (this._isFiller(x, nY)) {
                any.push('N');
            }
            else if (this._hasExit('S', x, nY)) {
                exits.push('N');
            }
            else {
                excluded.push('N');
            }

            if (remapped) {
                if (this._isFiller(x, nY)) {
                    any.push(remapped);
                }
                else if (this._hasExit(remapMatch, x, nY)) {
                    exits.push(remapped);
                }
                else {
                    excluded.push(remapped);
                }
            }

        }
        else {
            excluded.push('N');
            if (remapped) {excluded.push(remapped);}
        }

        // S tile
        const sY = y + 1;
        if (this.nsew2DirRemap) {
            remapped = this.nsew2DirRemap.S;
            remapMatch = this.matchMap[remapped];
        }

        if (sY < this.tilesY) {
            if (this._isFiller(x, sY)) {
                any.push('S');
            }
            else if (this._hasExit('N', x, sY)) {
                exits.push('S');
            }
            else {
                excluded.push('S');
            }

            if (remapped) {
                if (this._isFiller(x, sY)) {
                    any.push(remapped);
                }
                else if (this._hasExit(remapMatch, x, sY)) {
                    exits.push(remapped);
                }
                else {
                    excluded.push(remapped);
                }
            }
        }
        else {
            excluded.push('S');
            if (remapped) {excluded.push(remapped);}
        }

        // E tile
        const eX = x + 1;
        if (this.nsew2DirRemap) {
            remapped = this.nsew2DirRemap.E;
            remapMatch = this.matchMap[remapped];
        }
        if (eX < this.tilesX) {
            if (this._isFiller(eX, y)) {
                any.push('E');
            }
            else if (this._hasExit('W', eX, y)) {
                exits.push('E');
            }
            else {
                excluded.push('E');
            }

            if (remapped) {
                if (this._isFiller(eX, y)) {
                    any.push(remapped);
                }
                else if (this._hasExit(remapMatch, eX, y)) {
                    exits.push(remapped);
                }
                else {
                    excluded.push(remapped);
                }
            }
        }
        else {
            excluded.push('E');
            if (remapped) {excluded.push(remapped);}
        }

        // W tile
        const wX = x - 1;
        if (this.nsew2DirRemap) {
            remapped = this.nsew2DirRemap.W;
            remapMatch = this.matchMap[remapped];
        }
        if (wX >= 0) {
            if (this._isFiller(wX, y)) {
                any.push('W');
            }
            else if (this._hasExit('E', wX, y)) {
                exits.push('W');
            }
            else {
                excluded.push('W');
            }

            if (remapped) {
                if (this._isFiller(wX, y)) {
                    any.push(remapped);
                }
                else if (this._hasExit(remapMatch, wX, y)) {
                    exits.push(remapped);
                }
                else {
                    excluded.push(remapped);
                }
            }
        }
        else {
            excluded.push('W');
            if (remapped) {excluded.push(remapped);}
        }

        this.dbg('getAllRequired ' + exits);

        --this._ind;
        return [any, exits, excluded];
    }

    public _getMatchWithExits(exitsReqd) {
        const [any, exits, excluded] = exitsReqd;
        this.dbg(`_getMatchWithExits: GOT: any:${any}, req:${exits}, excl:${excluded}`);
        const keys = Object.keys(this._sortedWithAllExits);
        let validKeys = keys;

        // Exclude exits
        excluded.forEach(exit => {
            validKeys = validKeys.filter(key => (
                !new RegExp(exit).test(key)
            ));
        });


        // Check if required exits are contained in the keys
        let keysSplit = validKeys.map(key => key.split(''));
        keysSplit = keysSplit.filter(elem => (
            this._arrayContainsArray(elem, exits)
        ));

        validKeys = keysSplit.map(key => key.join(''));

        let result = [];
        validKeys.forEach(key => {
            result = result.concat(this._sortedWithAllExits[key]);
        });
        return result;
    }

    public _arrayContainsArray(superSet, subSet): boolean {
        return subSet.every(value => {
            return superSet.indexOf(value) >= 0;
        });
    }

    /* Prints the debug msg when debug() is enabled. Adds some verbosity options
     * for filtering some debug messages out. */
    public dbg(msg, verb = 10): void {
        if (debug.enabled) {
            if (debugVerbosity >= verb) {
                const _ind = ' '.repeat(this._ind);
                console.log(_ind + msg);
            }
        }
    }

    public printTile(x: number, y: number): void {
        if (x === 4 && y === 3) {
            const tile = this.templMap[x][y];
            console.log(`Tile @{x},${y}`);
            console.log(`Has exits: ${tile.getDir()}`);
            console.log(JSON.stringify(tile, null, 2));
        }
    }

    public isEdge(x: number, y: number): boolean {
        return (x === 0 || y === 0 ||
                x === this.tilesX - 1 || y === this.tilesY - 1);
    }

    public isCorner(x: number, y: number): boolean {
        return (x === 0 && y === 0 ||
                x === 0 && y === this.tilesY - 1 ||
                x === this.tilesX - 1 && y === 0 ||
                x === this.tilesX - 1 && y === this.tilesY - 1);
    }

    /* Filters out cells with noedge prop. */
    public filterOutNoEdge(x: number, y: number, listMatch: TList): TList {
        if (x === this.tilesX - 1 || x === 0 ||
            y === this.tilesY - 1 || y === 0) {
            return listMatch.filter(templ => (
                !this.noEdge.hasOwnProperty(templ.getProp('name'))
            ));
        }
        return listMatch;
    }
}

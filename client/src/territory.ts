
/* Code here is used to generate territories for different clans/races for the
 * overworld map.
 */

import RG from './rg';
import {Geometry} from './geometry';
import {Random} from './random';
import {TCoord} from './interfaces';

const RNG = Random.getRNG();
const EMPTY = '.';
const FULL = '#';
const FILL_ALL = -1;

interface TerrData {
    char: string;
    open: {[key: string]: TCoord};
    closed: {[key: string]: TCoord};
    occupied: {[key: string]: TCoord};
    currPos: number;
    maxNumPos: number;
    startX: number[];
    startY: number[];
    startSize: number;
    numOccupied?: number;
    numPos?: number;
    areas?: {[key: string]: TCoord[]};
}

interface RivalData {
    name: string;
    char: string;
    startX?: number | number[];
    startY?: number | number[];
    numPos?: number;
    maxNumPos?: number;
    startSize?: number;
}

interface TerrDataMap {
    [key: string]: TerrData;
}

export class Territory {

    public map: string[][];
    public cols: number;
    public rows: number;

    // Internal state of the generator
    public rivals: RivalData[];
    public currRivals: RivalData[];
    public empty: {[key: string]: TCoord};
    public occupied: {[key: string]: TCoord};
    public occupiedBy: {[key: string]: TCoord[]};
    public numEmpty: number;
    public numCells: number;

    // Generated territory data
    public terrData: TerrDataMap;

    // Config variables (can be set via conf)
    public rng: any;
    public doPostProcess: boolean;
    public maxNumPos: number;
    public startSize: number;
    public maxFillRatio: number;
    // By default, use only 4 directions
    public dirs: string[];

    constructor(cols, rows, conf = {}) {
        this.map = new Array(cols);
        this.cols = cols;
        this.rows = rows;

        // Internal state of the generator
        this.rivals = [];
        this.currRivals = [];
        this.empty = {};
        this.occupied = {};
        this.occupiedBy = {};
        this.numEmpty = 0;
        this.numCells = cols * rows;

        // Generated territory data
        this.terrData = {};

        // Config variables (can be set via conf)
        this.rng = RNG;
        this.doPostProcess = true; // Determine cont. regions using floodfill etc
        this.maxNumPos = 1; // How many start positions each rival has
        this.startSize = 1; // How many squares each rival gets on 1st move
        this.maxFillRatio = 1.0;
        // By default, use only 4 directions
        this.dirs = RG.DIR_NSEW.concat(RG.DIR_DIAG);

        // Set options passed in as a conf object
        const confVals = ['maxNumPos', 'startSize', 'dirs', 'doPostProcess',
            'maxFillRatio', 'rng'];
        confVals.forEach(key => {
            if (conf.hasOwnProperty(key)) {
                this[key] = conf[key];
            }
        });

        for (let i = 0; i < cols; i++) {
            this.map[i] = new Array(rows);
            for (let j = 0; j < rows; j++) {
                this._markEmpty(i, j);
            }
        }
    }

    setRNG(rng) {
        this.rng = rng;
    }

    getMap() {
        return this.map;
    }

    getData(): TerrDataMap {
        return this.terrData;
    }

    getRivalData(name: string): TerrData | null {
        if (this.terrData[name]) {return this.terrData[name];}
        return null;
    }

    _markEmpty(x, y) {
        this.map[x][y] = EMPTY;
        this.empty[x + ',' + y] = [x, y];
        ++this.numEmpty;
    }

    hasRival(xy) {
        return !this.isEmpty(xy) &&
            !this.isFull(xy);
    }

    /* Gets the rival name of x,y cell. */
    getRival(xy) {
        const [x, y] = xy;
        const char = this.map[x][y];
        return this.getName(char);
    }

    /* Given a 2d map, and cell info such as {'.': true, '#': false},
     * marks all cells in this.map as empty which have '.' in map,
     * and all cells full, which have '#' in given map.
     */
    useMap(map, cellInfo) {
        this.numEmpty = 0;
        for (let x = 0; x < map.length; x++) {
            for (let y = 0; y < map[0].length; y++) {
                if (cellInfo[map[x][y]]) {
                    this._markEmpty(x, y);
                }
                else {
                    this.map[x][y] = FULL;
                    delete this.empty[x + ',' + y];
                }
            }
        }
    }

    addRival(data: RivalData) {
        this._initRival(data);
    }

    generate(maxTurns = FILL_ALL) {
        this.currRivals = this.rivals.slice();
        this.rng.shuffle(this.currRivals);
        let numTurnsTaken = 0;

        while (this._hasTurnsLeftToProcess(numTurnsTaken, maxTurns)) {
            const next = this.currRivals.shift();
            // TODO Check if there is weight on the size

            const {name} = next;
            const contData: TerrData = this.terrData[name];
            const {open, currPos, maxNumPos} = contData;

            // If no cells occupied, pick one randomly
            if (currPos < maxNumPos) {
                const xy = this._getStartPosition(name);
                this._addStartPosition(name, xy);
                this.currRivals.push(next);
            }
            else if (Object.keys(open).length > 0) {
                const xy = this.getRandOpenXY(name);
                const emptyXY = this.getEmptyAdjacentXY(xy);
                if (emptyXY) {
                    this._addOccupied(name, emptyXY);
                    this.currRivals.push(next);
                }
                else {
                    this._closeCell(name, xy);
                    if (Object.keys(open).length > 0) {
                        this.currRivals.push(next);
                    }
                }
            }
            ++numTurnsTaken;
        }
        if (this.doPostProcess) {
            this.postProcessData();
        }
    }

    /* Given char representing a rival name on the map, returns name for that
     * rival. */
    getName(char) {
        const found = this.rivals.find(rival => rival.char === char);
        if (found) {return found.name;}
        return null;
    }

    getFillRatio() {
        return (this.numCells - this.numEmpty) / this.numCells;
    }

    _hasTurnsLeftToProcess(numTurns, maxTurns) {
        return (this.hasEmpty()
            && (this.currRivals.length > 0)
            && (numTurns !== maxTurns)
            && (this.getFillRatio() < this.maxFillRatio)
        );
    }

    /* Returns the starting position for given rival name. */
    _getStartPosition(name) {
        const contData: TerrData = this.terrData[name];
        const {currPos} = contData;
        const xy = this.getRandEmptyXY();
        if (contData.startX.length > currPos) {
            xy[0] = contData.startX[currPos];
        }
        else {
            contData.startX.push(xy[0]);
        }

        if (contData.startY.length > currPos) {
            xy[1] = contData.startY[currPos];
        }
        else {
            contData.startY.push(xy[1]);
        }

        const key = _key(xy);
        if (!this.empty.hasOwnProperty(key)) {
            if (this.map[xy[0]][xy[1]] !== FULL) {
                RG.warn('Territory', '_getStartPosition',
                    `${name} overriding another position @ ${xy}`);
            }
        }

        // TODO this can override starting points of other currRivals

        contData.currPos += 1;
        return xy;
    }

    _addOccupied(name, xy) {
        const key = _key(xy);
        this.occupied[key] = xy;
        this.occupiedBy[name].push(xy);
        this.terrData[name].open[key] = xy;
        this.terrData[name].occupied[key] = xy;
        this.map[xy[0]][xy[1]] = this.terrData[name].char;

        // 1st cell can be forced to be non-empty, but if not,
        // then clear the empty cell
        if (this.empty[key]) {
            --this.numEmpty;
            delete this.empty[key];
        }
    }

    _addStartPosition(name, xy) {
        const contData = this.getRivalData(name);
        const dSize = contData.startSize - 1;
        const startCoord = Geometry.getBoxAround(xy[0], xy[1], dSize, true);
        startCoord.forEach(xyStart => {
            if (this.isEmpty(xyStart)) {
                this._addOccupied(name, xyStart);
            }
        });

        if (startCoord.length === 0) {
            RG.err('Territory', '_addStartPosition',
                'No startCoord found!');
        }
    }

    getRandEmptyXY() {
        return this.rng.arrayGetRand(Object.values(this.empty));
    }

    isFull(xy) {
        const [x, y] = xy;
        return this.map[x][y] === FULL;
    }

    isEmpty(xy) {
        const key = _key(xy);
        return this.empty.hasOwnProperty(key);
    }

    getRandOpenXY(name) {
        const {open} = this.terrData[name];
        return this.rng.arrayGetRand(Object.values(open));
    }

    getEmptyAdjacentXY(xy) {
        const dirs = this.dirs.slice();
        this.rng.shuffle(dirs);
        while (dirs.length > 0) {
            const nextDir = dirs.shift();
            const [nX, nY] = RG.newXYFromDir(nextDir, xy);
            if (this.hasXY(nX, nY)) {
                if (this.map[nX][nY] === EMPTY) {
                    return [nX, nY];
                }
            }
        }
        return null;
    }

    hasXY(nX, nY) {
        return nX >= 0 && nY >= 0 &&
            nX < this.map.length && nY < this.map[0].length;
    }

    _closeCell(name, xy) {
        const key = _key(xy);
        this.terrData[name].closed[key] = xy;
        delete this.terrData[name].open[key];
    }

    hasEmpty() {
        return this.numEmpty > 0;
    }

    mapToString() {
        const sizeY = this.map[0].length;
        const sizeX = this.map.length;

        const lines = [];
        for (let y = 0; y < sizeY; y++) {
            const line = [];
            for (let x = 0; x < sizeX; x++) {
                line.push(this.map[x][y]);
            }
            lines.push(line);
        }
        return lines.map(line => line.join(''));
    }

    /* Histogram of how many cells each contestant occupies. */
    getAreaProportions() {
        const hist = {};
        Object.keys(this.occupiedBy).forEach(name => {
            hist[name] = this.occupiedBy[name].length;
        });
        return hist;
    }

    _initRival(data: RivalData) {
        this.rivals.push(data);
        const {name, char} = data;
        this.terrData[name] = {
            currPos: 0,
            maxNumPos: this.maxNumPos,
            char,
            occupied: {},
            closed: {}, // Cannot try anymore
            open: {}, // Available for trying
            startX: [],
            startY: [],
            startSize: this.startSize // How big is the starting region
        };

        if (Array.isArray(data.startX)) {
            this.terrData[name].startX = data.startX;
        }
        else if (data.startX >= 0) {
            this.terrData[name].startX = [data.startX];
        }

        if (Array.isArray(data.startY)) {
            this.terrData[name].startY = data.startY;
        }
        else if (data.startY >= 0) {
            this.terrData[name].startY = [data.startY];
        }

        if (data.numPos) {
            this.terrData[name].maxNumPos = data.numPos;
        }
        else if (data.maxNumPos) {
            this.terrData[name].maxNumPos = data.maxNumPos;
        }

        if (data.startSize) {
            this.terrData[name].startSize = data.startSize;
        }
        this.occupiedBy[name] = [];
    }

    /* Does processing like floodfilling the regions to find continuous areas for
     * different currRivals.
     */
    postProcessData() {
        const diag = this.dirs.length > 4 ? true : false;
        const names = Object.keys(this.terrData);
        names.forEach(name => {
            const contData = this.terrData[name];
            const {startX, startY, char} = contData;

            contData.numOccupied = Object.keys(contData.occupied).length;

            contData.areas = {};
            startX.forEach((x, i) => {
                const xy = [x, startY[i]];
                const lut = {};
                const coordXY = Geometry.floodfill2D(this.map, xy, char, lut, diag);
                contData.areas[_key(xy)] = coordXY;
            });

        });
    }

    /* To serialize the territory. */
    toJSON() {
        const json = {
            terrData: this.terrData,
            map: this.map,
            cols: this.cols,
            rows: this.rows,
            currRivals: this.currRivals,
            empty: this.empty,
            occupied: this.occupied,
            occupiedBy: this.occupiedBy,
            numEmpty: this.numEmpty,
            dirs: this.dirs
        };
        return json;
    }

    /* To-deserialize the territory. */
    static fromJSON(json) {
        const terrMap = new Territory(0, 0, {});
        Object.keys(json).forEach(key => {
            terrMap[key] = json[key];
        });
        return terrMap;
    }
}

function _key(xy) {
    return xy[0] + ',' + xy[1];
}


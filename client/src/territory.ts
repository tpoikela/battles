
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

    /* To-deserialize the territory. */
    public static fromJSON(json): Territory {
        const terrMap = new Territory(0, 0, {});
        Object.keys(json).forEach(key => {
            terrMap[key] = json[key];
        });
        return terrMap;
    }

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
    public rng: Random;
    public doPostProcess: boolean;
    public maxNumPos: number;
    public startSize: number;
    public maxFillRatio: number;

    // By default, use 8 directions to advance rivals
    public dirs: TCoord[];

    public infoTags: {[key: string]: string[]};

    constructor(cols: number, rows: number, conf = {}) {
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

        // By default, use 8 directions for advancing on the map
        this.dirs = RG.DIR_NSEW_XY.concat(RG.DIR_DIAG_XY);

        // Set options passed in as a conf object
        const confVals = ['maxNumPos', 'startSize', 'dirs', 'doPostProcess',
            'maxFillRatio', 'rng'];
        confVals.forEach(key => {
            if (conf.hasOwnProperty(key)) {
                this[key] = conf[key];
            }
        });

        // Initialize an empty territory map
        for (let i = 0; i < cols; i++) {
            this.map[i] = new Array(rows);
            for (let j = 0; j < rows; j++) {
                this._markEmpty(i, j);
            }
        }

        this.infoTags = {};
    }

    public setRNG(rng: Random): void {
        this.rng = rng;
    }

    public getMap(): string[][] {
        return this.map;
    }

    public getData(): TerrDataMap {
        return this.terrData;
    }

    public addTag(xy: TCoord, tag: string ): void {
        const key = RG.toKey(xy);
        if (!this.infoTags[key]) {
            this.infoTags[key] = [];
        }
        this.infoTags[key].push(tag);
    }

    public getRivalData(name: string): TerrData | null {
        if (this.terrData[name]) {return this.terrData[name];}
        return null;
    }

    public _markEmpty(x: number, y: number): void {
        this.map[x][y] = EMPTY;
        this.empty[x + ',' + y] = [x, y];
        ++this.numEmpty;
    }

    public hasRival(xy: TCoord): boolean {
        return !this.isEmpty(xy) &&
            !this.isFull(xy);
    }

    /* Gets the rival name of x,y cell. */
    public getRival(xy: TCoord): string | null {
        const [x, y] = xy;
        const char = this.map[x][y];
        return this.getName(char);
    }

    public findTag(tag: string): TCoord[] {
        const res: TCoord[] = [];
        Object.keys(this.infoTags).forEach((xy: string) => {
            const tags: string[] = this.infoTags[xy];
            if (tags.indexOf(tag) >= 0) {
                res.push(RG.fromKey(xy));
            }
        });
        return res;
    }

    /* Given a 2d map, and cell info such as {'.': true, '#': false},
     * marks all cells in this.map as empty which have '.' in map,
     * and all cells full, which have '#' in given map.
     */
    public useMap(map: any[][], cellInfo: {[key: string]: boolean}) {
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

    public addRival(data: RivalData): void {
        this._initRival(data);
    }

    public generate(maxTurns = FILL_ALL): void {
        this.currRivals = this.rivals.slice();
        this.rng.shuffle(this.currRivals);
        let numTurnsTaken = 0;

        while (this._hasTurnsLeftToProcess(numTurnsTaken, maxTurns)) {
            const next = this.currRivals.shift()!; // Always exists
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
            // RG.printMap(this.map);
        }
        if (this.doPostProcess) {
            this.postProcessData();
        }
    }

    /* Updates the territory map by simulating one turn per rival. */
    public update(): void {
        this.currRivals = this.rivals.slice();
        this.rng.shuffle(this.currRivals);
        this.currRivals.forEach((rival: RivalData) => {
            const {name} = rival;
            const xy = this.getRandOpenXY(name);
            const emptyXY = this.getEmptyAdjacentXY(xy);
            if (emptyXY) {
                this._addOccupied(name, emptyXY);
            }
            else {
                this._closeCell(name, xy);
            }
        });
        this.currRivals = [];
    }

    /* Given char representing a rival name on the map, returns name for that
     * rival. */
    public getName(char: string): string | null {
        const found = this.rivals.find(rival => rival.char === char);
        if (found) {return found.name;}
        return null;
    }

    public getFillRatio(): number {
        return (this.numCells - this.numEmpty) / this.numCells;
    }

    public _hasTurnsLeftToProcess(numTurns: number, maxTurns: number): boolean {
        return (this.hasEmpty()
            && (this.currRivals.length > 0)
            && (numTurns !== maxTurns)
            && (this.getFillRatio() < this.maxFillRatio)
        );
    }

    /* Returns the starting position for given rival name. */
    public _getStartPosition(name: string): TCoord {
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

        const key = RG.toKey(xy);
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

    public _addOccupied(name: string, xy: TCoord): void {
        const key = RG.toKey(xy);
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

    public _addStartPosition(name: string, xy: TCoord): void {
        const contData = this.getRivalData(name);
        if (!contData) {
            RG.err('Territory', '_addStartPosition',
                `TerrData for name |${name}| is null`);
            return;
        }
        const dSize = contData.startSize - 1;
        const startCoord: TCoord[] = Geometry.getBoxAround(xy[0], xy[1], dSize, true);
        startCoord.forEach((xyStart: TCoord) => {
            if (this.isEmpty(xyStart)) {
                this._addOccupied(name, xyStart);
            }
        });

        if (startCoord.length === 0) {
            RG.err('Territory', '_addStartPosition',
                'No startCoord found!');
        }
    }

    public getRandEmptyXY(): TCoord {
        return this.rng.arrayGetRand(Object.values(this.empty));
    }

    public isFull(xy: TCoord): boolean {
        const [x, y] = xy;
        return this.map[x][y] === FULL;
    }

    public isEmpty(xy: TCoord): boolean {
        const key = RG.toKey(xy);
        return this.empty.hasOwnProperty(key);
    }

    public getRandOpenXY(name: string): TCoord {
        const {open} = this.terrData[name];
        return this.rng.arrayGetRand(Object.values(open));
    }

    public getEmptyAdjacentXY(xy: TCoord): null | TCoord {
        const dirs: TCoord[] = this.dirs.slice();
        this.rng.shuffle(dirs);
        while (dirs.length > 0) {
            const nextDir: TCoord = dirs.shift()!; // Exists, due to len check
            const [nX, nY] = RG.newXYFromDir(nextDir, xy);
            if (this.hasXY(nX, nY)) {
                if (this.map[nX][nY] === EMPTY) {
                    return [nX, nY];
                }
            }
        }
        return null;
    }

    public hasXY(nX: number, nY: number): boolean {
        return nX >= 0 && nY >= 0 &&
            nX < this.map.length && nY < this.map[0].length;
    }

    public _closeCell(name: string, xy: TCoord): void {
        const key = RG.toKey(xy);
        this.terrData[name].closed[key] = xy;
        delete this.terrData[name].open[key];
    }

    public hasEmpty(): boolean {
        return this.numEmpty > 0;
    }

    public mapToString(): string[] {
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
    public getAreaProportions(): {[key: string]: number} {
        const hist: {[key: string]: number} = {};
        Object.keys(this.occupiedBy).forEach(name => {
            hist[name] = this.occupiedBy[name].length;
        });
        return hist;
    }

    public _initRival(data: RivalData): void {
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
    public postProcessData(): void {
        const diag = this.dirs.length > 4 ? true : false;
        const names = Object.keys(this.terrData);
        names.forEach(name => {
            const contData = this.terrData[name];
            const {startX, startY, char} = contData;

            contData.numOccupied = Object.keys(contData.occupied).length;

            contData.areas = {};
            startX.forEach((x, i) => {
                const xy: TCoord = [x, startY[i]];
                const lut = {};
                const coordXY = Geometry.floodfill2D(this.map, xy, char, lut, diag);
                // Can't be undef, created above
                contData.areas![RG.toKey(xy)] = coordXY;
            });

        });
    }

    /* To serialize the territory. */
    public toJSON() {
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
}

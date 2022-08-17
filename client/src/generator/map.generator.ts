/* Contains code for low-level map generation. This generates the base
 * elements and some other elements like doors. Items and actors are
 * not generated here. */

import RG from '../rg';
import {default as Map} from '../../../lib/rot-js/map';
import {CellMap} from '../map';
import {Path} from '../path';
import {Builder} from '../builder';
import {Geometry} from '../geometry';
import * as Element from '../element';
import {ConstBaseElem} from '../interfaces';
import {TemplateLevel, StartRoomFunc} from '../template.level';
import {Random} from '../random';
import {House, HouseGenerator} from './house-generator';
import {BBox} from '../bbox';
import {PlacedTileData} from '../template.level';

import {Crypt} from '../../data/tiles.crypt';
import {Castle} from '../../data/tiles.castle';
import {Nests} from '../../data/tiles.nests';
import {ELEM, snowElemMap, getElem} from '../../data/elem-constants';

import {BSP, MapForest, MapMiner, MapMountain, MapWall} from '../../../lib';

const ROT: any = {Map};

const ElementMarker = Element.ElementMarker;
type ElementBase = Element.ElementBase;
type ElementWall = Element.ElementWall;
type ElementXY = Element.ElementXY;

const RNG = Random.getRNG();

const inRange = function(val: number, min: number, max: number): boolean {
    if (val >= min && val <= max) {
        return true;
    }
    return false;
};

export interface GenParamsXY {
    x: number[];
    y: number[];
}

export interface MapConf {
    callbacks?: {[key: string]: () => void};
    constraintFunc?: () => void;
    floorType?: string;
    freeOnly?: boolean;
    genParams?: number[] | GenParamsXY;
    levelType?: string;
    models?: any;
    nGates?: number;
    roomCount?: number;
    ratio?: number;
    startRoomFunc?: StartRoomFunc;
    templates?: string;
    tilesX?: number;
    tilesY?: number;
    wallType?: string;
    snowRatio?: number;
    rng?: Random;
    preserveMarkers?: boolean;
}

export interface MapObj {
    map: CellMap;
    tiles?: {[key: string]: PlacedTileData};
    paths?: any[];
    mapGen?: any;
    houses?: House[];
    unused?: any[];
    elements?: ElementXY[];
}


type ElemMapFunc = (map: CellMap, x: number, y: number) => void;
interface ASCIIToElemMap {
    [key: string]: ElementBase | ElemMapFunc | ConstBaseElem;
}

interface AllowConf {
    exclude?: {
        bbox: BBox;
    };
    maxY?: number;
}

/* Returns true if given coordinates are in allowed area. */
const inAllowedArea = function(x0, y0, x1, y1, conf: AllowConf) {
    let ok = true;
    if (conf.exclude) {
        if (conf.exclude.bbox) {
            const {ulx, uly, lrx, lry} = conf.exclude.bbox;
            if (inRange(x0, ulx, lrx) && inRange(y0, uly, lry)) {
                ok = false;
            }
            if (inRange(x1, ulx, lrx) && inRange(y1, uly, lry)) {
                ok = false;
            }
        }
    }
    else if (conf.maxY) {
        ok = y1 <= conf.maxY;
    }
    return ok;
};

/* Map generator for the roguelike game.  */
export class MapGenerator {

    public static options: {[key: string]: any};

    public static getAndSetRNG(conf?: MapConf): Random {
        if (conf) {
            if (conf.rng) {return conf.rng;}
            else {conf.rng = RNG;}
        }
        return RNG;
    }

    /* Decorates the given map with snow. ratio is used to control how much
     * snow to put. */
    public static addRandomSnow(map: CellMap, ratio: number, conf?): number {
        const freeCells = map.getFree().filter(c => c.isOutdoors());
        const rng = MapGenerator.getAndSetRNG(conf);
        let numSnowCells = 0;

        for (let i = 0; i < freeCells.length; i++) {
            const addSnow = rng.getUniform();
            const cell = freeCells[i];
            if (addSnow <= ratio) {
                const baseType = cell.getBaseElem().getType();
                // let snowElem = MapGenerator.snowElemMap.default;
                if (snowElemMap[baseType]) {
                    const snowElem = snowElemMap[baseType];
                    ++numSnowCells;
                    freeCells[i].setBaseElem(snowElem);
                }
            }
        }
        return numSnowCells;
    }

    /* Given 2-d ascii map, and mapping from ascii to Element, constructs the
     * map of base elements, and returns it. */
    public static fromAsciiMap(
        asciiMap: string[][], asciiToElem: ASCIIToElemMap
    ): MapObj {
        const cols = asciiMap.length;
        const rows = asciiMap[0].length;
        const map = new CellMap(cols, rows);

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                const char = asciiMap[x][y];
                if (asciiToElem.hasOwnProperty(char)) {
                    const value = asciiToElem[char];
                    if (typeof value !== 'function') {
                        map.setBaseElemXY(x, y, value);
                    }
                    else {
                        // For non-base elems, we need to change floor to
                        // desired type first
                        map.setBaseElemXY(x, y, asciiToElem['.'] as ElementBase);
                        value(map, x, y);
                    }
                }
                else if (char === '+') {
                    const marker = new ElementMarker('+');
                    marker.setTag('door');
                    // door.setXY(x, y);
                    map.setBaseElemXY(x, y, asciiToElem['.'] as ElementBase);
                    map.setElemXY(x, y, marker);
                }
                else if (char === '?') {
                    const marker = new ElementMarker('?');
                    marker.setTag('loot');
                    map.setElemXY(x, y, marker);
                }
            }
        }
        return {
            map
        };
    }

    public static getWallElem(wallType: string): Readonly<ElementWall> {
        const elem = getElem(wallType);
        if (!elem) {return ELEM.WALL;}
        return elem;
    }

    public static getFloorElem(floorType: string): ConstBaseElem {
        const elem = getElem(floorType);
        if (!elem) {return ELEM.FLOOR;}
        return elem;
    }

    public static createSplashes(cols: number, rows: number, conf): MapObj {
        const elem = conf.elem || ELEM.WATER;
        const map = new CellMap(cols, rows);
        const mapGen = new MapForest(cols, rows, conf);
        mapGen.create((x, y, val) => {
            map.setBaseElemXY(x, y, ELEM.FLOOR);
            if (val === 1) {
                map.setBaseElemXY(x, y, elem);
            }
        });
        return {map};
    }

    /* Returns a clone of the requested level options. */
    public static getOptions(value) {
        if (MapGenerator.options[value]) {
            return Object.assign({}, MapGenerator.options[value]);
        }
        else {
            RG.warn('MapGenerator', 'getOptions',
                `Unknown map type ${value}`);
        }
        return {};
    }

    public cols: number;
    public rows: number;
    public defaultMapElem: ConstBaseElem;
    private _mapGen: any;
    private _mapType: string | null;
    private _wallID: number;

    constructor() { // {{{2
        this.cols = RG.LEVEL_MEDIUM_X;
        this.rows = RG.LEVEL_MEDIUM_Y;
        this._mapGen = new Map.Arena(this.cols, this.rows);
        this._mapType = null;
        this._wallID = 1;
        this.defaultMapElem = ELEM.FLOOR;
    }

    public createEmptyMap(): MapObj {
        const map = new CellMap(this.cols, this.rows, this.defaultMapElem);
        const obj = {map};
        return obj;
    }

    /* Returns an object containing randomized map + all special features
     * based on initialized generator settings. */
    public getMap(conf: MapConf = {}): MapObj {
        const obj: any = {};
        if (typeof this._mapGen === 'function') {
            obj.map = this._mapGen();
        }
        else {
            const wallElem = MapGenerator.getWallElem(conf.wallType);
            const floorElem = MapGenerator.getFloorElem(conf.floorType);
            const map = new CellMap(this.cols, this.rows, this.defaultMapElem);
            this._mapGen.create((x, y, val) => {
                if (val === this._wallID) {
                    map.setBaseElemXY(x, y, wallElem);
                }
                else {
                    map.setBaseElemXY(x, y, floorElem);
                }
            });
            obj.map = map;
            if (this._mapType === 'uniform' || this._mapType === 'digger') {
                obj.rooms = this._mapGen.getRooms();
                obj.corridors = this._mapGen.getCorridors();
            }
        }
        return obj;
    }

    /* Creates "ruins" type level with open outer edges and inner
     * "fortress" with some tunnels. */
    public createRuins(cols: number, rows: number, conf = {}) {
        let ruinsConf = {born: [4, 5, 6, 7, 8],
            survive: [2, 3, 4, 5], connected: true};
        ruinsConf = Object.assign(ruinsConf, conf);
        const map = new Map.Cellular(cols, rows, ruinsConf);
        map.randomize(0.9);
        for (let i = 0; i < 5; i++) {map.create();}
        map.connect(null, 1);
        this._wallID = 0;
        return map;
    }

    /* Creates a cellular type dungeon and makes all areas connected.*/
    public createCellular(cols: number, rows: number) {
        const map = new Map.Cellular(cols, rows, {});
        map.randomize(0.52);
        for (let i = 0; i < 5; i++) {map.create();}
        map.connect(null, 1);
        this._wallID = 0;
        return map;
    }

    public createRooms(cols: number, rows: number) {
        const map = new Map.Digger(cols, rows,
            {roomWidth: [5, 20], dugPercentage: 0.7});
        return map;
    }

    public createTownBSP(cols: number, rows: number, conf): MapObj {
        const maxHouseX = conf.maxHouseX || 100;
        const maxHouseY = conf.maxHouseY || 100;

        // Controls how big the slots for houses are, for bigger levels it
        // should be higher to generate small houses
        const bspIter = 7;

        const haloAroundX = 2; // Prevents house placement on edges
        const haloAroundY = 2; // Prevents house placement on edges

        const rng = MapGenerator.getAndSetRNG(conf);
        const bspGen = new BSP.BSPGen({rng});
        const bspX0 = haloAroundX - 1;
        const bspY0 = haloAroundY - 1;
        const bspCols = cols - 2 * bspX0;
        const bspRows = rows - 2 * bspY0;

        const mainContainer = new BSP.Container(0, 0, bspCols, bspRows);
        const containerTree = bspGen.splitContainer(mainContainer, bspIter);
        const leaves = containerTree.getLeafs();

        // Adjust leaves x,y based on bspX0,Y
        leaves.forEach(leaf => {
            leaf.x += bspX0;
            leaf.y += bspY0;
        });

        rng.shuffle(leaves); // Introduce some randomness

        const floorElem = MapGenerator.getFloorElem(conf.floorType);
        const map = new CellMap(cols, rows, floorElem);
        const freeLeaves = [];

        // Now each leaf can be safely used for placing a house in
        // non-colliding manner
        const houses: House[] = [];
        const houseGen = new HouseGenerator();
        leaves.forEach(leaf => {
            const {w, h} = leaf;
            let colsHouse = w - 1;
            let rowsHouse = h - 1;
            if (colsHouse > maxHouseX) {
                colsHouse = Math.round(colsHouse / 2);
            }
            if (rowsHouse > maxHouseY) {
                rowsHouse = Math.round(rowsHouse / 2);
            }
            if (leaf.x === bspX0) {
                leaf.x += 1;
                leaf.w -= 1;
                colsHouse -= 1;
            }
            else if (leaf.x === cols - 1) {
                leaf.x -= 1;
                leaf.w -= 1;
                colsHouse -= 1;
            }

            if (leaf.y === bspY0) {
                leaf.y += 1;
                leaf.h -= 1;
                rowsHouse -= 1;
            }
            else if (leaf.y === rows - 1) {
                leaf.y -= 1;
                leaf.h -= 1;
                rowsHouse -= 1;
            }
            // TODO place row/col of houses

            if (colsHouse >= 5 && rowsHouse >= 5) {
                if (colsHouse > 10 && colsHouse % 2 !== 0) {
                    colsHouse -= 1;
                }
                if (rowsHouse > 10 && rowsHouse % 2 !== 0) {
                    rowsHouse -= 1;
                }

                const houseConf: any = {cols: colsHouse, rows: rowsHouse};
                houseConf.addWindows = conf.addWindows;
                const house = houseGen.createHouse(houseConf);
                if (house) {
                        this.placeHouse(house, map, leaf.x, leaf.y, conf);
                        houses.push(house);
                    }
                }
                else {
                    freeLeaves.push(leaf);
                }
        });
        return {map, houses, unused: freeLeaves};
    }

    public placeHouse(house: House, map: CellMap, x, y, conf): void {
        const coord = house.coord;
        const keys = Object.keys(coord);
        const wallElem = MapGenerator.getWallElem(conf.wallType);
        keys.forEach(elemChar => {

            if (elemChar === '#') {
                coord[elemChar].forEach(xy => {
                    const x0 = xy[0] + x;
                    const y0 = xy[1] + y;
                    map.setBaseElemXY(x0, y0, wallElem);
                });
            }
            else if (elemChar === '+') {
                /* const doorXY = coord[elemChar][0];
                house.door = [doorXY[0] + x, doorXY[1] + y];*/
            }
            else if (elemChar === ':') {
                coord[elemChar].forEach(xy => {
                    const x0 = xy[0] + x;
                    const y0 = xy[1] + y;
                    map.setBaseElemXY(x0, y0, ELEM.FLOOR_HOUSE);
                });
            }
            else if (elemChar === 'windows') {
                coord[elemChar].forEach(xy => {
                    const x0 = xy[0] + x;
                    const y0 = xy[1] + y;
                    map.setBaseElemXY(x0, y0, ELEM.WINDOW);
                });
            }
        });
        house.adjustCoord(x, y);
    }

    /* Creates a forest map. Uses the same rng but instead of walls, populates
     * using trees. Ratio is conversion ratio of walls to trees. For example,
     * 0.5 on average replaces half the walls with tree, and removes rest of
     * the walls. */
    public createForest(conf?: MapConf): MapObj {
        const map = new CellMap(this.cols, this.rows, this.defaultMapElem);
        this.addForestToMap(map, conf);
        return {map};
    }

    public addForestToMap(map: CellMap, conf?: MapConf): void {
        const ratio = conf.ratio;
        const {freeOnly} = conf;
        const rng = MapGenerator.getAndSetRNG(conf);
        this._mapGen = new MapForest(this.cols, this.rows, conf);
        if (freeOnly) {
            this._mapGen.create((x, y, val) => {
                const createTree = rng.getUniform() <= ratio;
                if (val === 1 && createTree) {
                    if (map.getCell(x, y).isFree()) {
                        map.setBaseElemXY(x, y, ELEM.TREE);
                    }
                }
                else if (val === 1) {
                    if (map.getCell(x, y).isFree()) {
                        map.setBaseElemXY(x, y, ELEM.GRASS);
                    }
                }
            });
        }
        else {
            this._mapGen.create((x, y, val) => {
                const createTree = rng.getUniform() <= ratio;
                if (val === 1 && createTree) {
                    map.setBaseElemXY(x, y, ELEM.TREE);
                }
                else if (val === 1) {
                    map.setBaseElemXY(x, y, ELEM.GRASS);
                }
            });
        }
    }

    public createLakes(conf): MapObj {
        const map = new CellMap(this.cols, this.rows, this.defaultMapElem);
        this._mapGen = new MapForest(this.cols, this.rows, conf);
        this.addLakesToMap(map, conf);
        return {map};
    }

    public addLakesToMap(map: CellMap, conf): void {
        if (conf.freeOnly) {
            this._mapGen.create((x, y, val) => {
                if (val === 1 /* && createDeep */) {
                    if (map.getCell(x, y).isFree()) {
                        map.setBaseElemXY(x, y, ELEM.WATER);
                    }
                }
            });
        }
        else {
            this._mapGen.create((x, y, val) => {
                map.setBaseElemXY(x, y, ELEM.FLOOR);
                if (val === 1 /* && createDeep */) {
                    map.setBaseElemXY(x, y, ELEM.WATER);
                }
            });
        }
    }

    public addLakes(map: CellMap, conf, bbox: BBox): void {
        const cols = bbox.lrx - bbox.ulx;
        const rows = bbox.lry - bbox.uly;
        this.setGen('lakes', cols, rows);
        const lakeMap = this.createLakes(conf).map;
        this.addElementsToMap(map, lakeMap, 'water', conf, bbox);
    }

    public addForest(map: CellMap, conf, bbox: BBox): void {
        this.cols = bbox.lrx - bbox.ulx;
        this.rows = bbox.lry - bbox.uly;
        const forestMap = this.createForest(conf).map;
        this.addElementsToMap(map, forestMap, 'tree', conf, bbox);
    }

    public addSplashes(map: CellMap, conf, bbox: BBox, elems: string[]): void {
        this.cols = bbox.lrx - bbox.ulx;
        this.rows = bbox.lry - bbox.uly;
        this.setGen('splashes', this.cols, this.rows);
        this._mapGen = new MapForest(this.cols, this.rows, conf);
        const srcMap = new CellMap(this.cols, this.rows, this.defaultMapElem);
        const baseElems: ConstBaseElem[] = elems.map(e => getElem(e));

        this._mapGen.create((x, y, val) => {
            // const createTree = rng.getUniform() <= ratio;
            if (val === 1) {
                srcMap.setBaseElemXY(x, y, baseElems[0]);
            }
            else if (val === 1) {
                srcMap.setBaseElemXY(x, y, ELEM.GRASS);
            }
        });
        elems.forEach((elem: string) => {
            this.addElementsToMap(map, srcMap, elem, conf, bbox);
        });
    }

    public addCliffs(map: CellMap, conf, bbox: BBox): void {
        const cols = map.cols;
        const rows = map.rows;
        const mountMap = this.createMountain(cols, rows, conf).map;
        const elems = ['cliff', 'stone', 'steep cliff', 'highrock'];
        elems.forEach(elemType => {
            this.addElementsToMap(map, mountMap, elemType, conf, bbox);
        });
    }

    public addElementsToMap(
        map: CellMap, srcMap: CellMap, elem: string, conf, bbox: BBox
    ): void {
        RG.forEach2D(srcMap._map, (x, y) => {
            const nX = x + bbox.ulx;
            const nY = y + bbox.uly;
            if (Geometry.isInBbox(nX, nY, bbox) && map.hasXY(nX, nY)) {
                const baseElem = srcMap.getBaseElemXY(x, y);
                if (baseElem.getType() === elem) {
                    if (conf.skipTypes) {
                        const elemType = map.getBaseElemXY(nX, nY).getType();
                        if (!conf.skipTypes.hasOwnProperty(elemType)) {
                            map.setBaseElemXY(nX, nY, baseElem);
                        }
                    }
                    else {
                        map.setBaseElemXY(nX, nY, baseElem);
                    }
                }
            }
        });
    }


    public createWall(cols: number, rows: number, conf): MapObj {
        const map: CellMap = new CellMap(cols, rows, this.defaultMapElem);
        let wallElem = conf.wallElem || ELEM.WALL;
        if (conf.wallType) {
            wallElem = MapGenerator.getWallElem(conf.wallType);
        }
        this._mapGen = new MapWall(cols, rows, conf);
        this._mapGen.create((x, y, val) => {
            if (val === 1 /* && createDeep */) {
                map.setBaseElemXY(x, y, wallElem);
            }
        });
        return {map};
    }

    public createMountain(cols: number, rows: number, conf): MapObj {
        const map = new CellMap(cols, rows, this.defaultMapElem);
        if (!conf) {
            conf = MapGenerator.getOptions('mountain');
        }

        const highToStone = conf.highRockThr - conf.stoneThr;
        const gap = highToStone / 3;
        const rng = MapGenerator.getAndSetRNG(conf);
        //rm this._mapGen = new MapMountain(this.cols, this.rows, conf);
        this._mapGen = new MapMountain(cols, rows, conf);
        this._mapGen.create((x, y, val) => {
            if (val > conf.highRockThr) {
                map.setBaseElemXY(x, y, ELEM.HIGH_ROCK);
            }
            else if (val > conf.stoneThr) {
                if (val < (conf.stoneThr + gap)) {
                    map.setBaseElemXY(x, y, ELEM.CLIFF);
                }
                else if (val < (conf.stoneThr + 2* gap)) {
                    map.setBaseElemXY(x, y, ELEM.STONE);
                }
                else {
                    map.setBaseElemXY(x, y, ELEM.STEEP_CLIFF);
                }
            }
            else if (val < conf.chasmThr) {
                if (val < (conf.chasmThr - 0.4)) {
                    map.setBaseElemXY(x, y, ELEM.DEEP_CHASM);
                }
                else if (val < (conf.chasmThr - 0.2)) {
                    map.setBaseElemXY(x, y, ELEM.CHASM);
                }
                else {
                    map.setBaseElemXY(x, y, ELEM.SHALLOW_CHASM);
                }
            }
            else {
                const addSnow = rng.getUniform();
                if (addSnow < conf.snowRatio) {
                    map.setBaseElemXY(x, y, ELEM.SNOW);
                }
                else {
                    map.setBaseElemXY(x, y, ELEM.FLOOR);
                }
            }
        });
        let paths = [];
        if (conf.nRoadTurns > 0) {
            paths = this.createMountainPath(map, conf);
        }
        return {map, paths};
    }

        /* Creates a zig-zagging road across the level from south to north. */
    public createMountainPath(map: CellMap, conf) {
        const paths = [];
        const nTurns = conf.nRoadTurns || 10;
        let yPerTurn = Math.floor(map.rows / nTurns);
        if (conf.yPerTurn) {yPerTurn = conf.yPerTurn;}
        if (yPerTurn < 4) {
            yPerTurn = 4; // Prevents too little path progression
        }
        const xLeft = 2;
        const xRight = map.cols - 3;
        const xCenter = Math.floor(map.cols / 2);
        const xPoints = [xLeft, xRight, xCenter];

        let inBounds = true;
        let prevX = -1;
        let prevY = -1;

        const passableFuncs = [
            (x, y) => map.hasXY(x, y) && map.getCell(x, y).isFree(),
            (x, y) => (
                map.hasXY(x, y) &&
                map.getCell(x, y).getBaseElem().getZ() <= 1
            )
        ];

        const rng = MapGenerator.getAndSetRNG(conf);
        for (let i = 0; inBounds && i < nTurns; i++) {
            inBounds = false;

            let x0 = prevX;
            let y0 = prevY;
            if (i === 0) {
                x0 = Number.isInteger(conf.startX) ? conf.startX :
                    rng.arrayGetRand(xPoints);
                y0 = conf.startY ? conf.startY : 0;
            }
            const x1 = rng.arrayGetRand(xPoints);
            const y1 = (i + 1) * yPerTurn + y0;

            // Compute 2 paths: Shortest and shortest passable. Then calculate
            // weights. Choose one with lower weight.
            if (inAllowedArea(x0, y0, x1, y1, conf)) {
                const coord = Path.getMinWeightOrShortest(map, x0, y0, x1,
                    y1, passableFuncs);
                if (coord) {
                    const chosenCoord = Builder.addPathToMap(map, coord);
                    if (chosenCoord.length > 0) {inBounds = true;}
                    paths.push(chosenCoord);
                    prevX = x1;
                    prevY = y1;
                }
                else {
                    inBounds = true;
                }
            }
            else {
                inBounds = true;
            }
        }

        // If last point is not at maxY, create last path
        if (conf.maxY && paths.length > 0) {
            const lastPath = paths[paths.length - 1];
            if (lastPath.length > 0) {
                const lastXY = lastPath[lastPath.length - 1];
                const [x0, y0] = [lastXY.x, lastXY.y];
                let x1 = rng.arrayGetRand(xPoints);
                const y1 = conf.maxY;
                if (conf.endX) {x1 = conf.endX;}
                if (y1 > y0) {
                    if (inAllowedArea(x0, y0, x1, y1, conf)) {
                        const coord = Path.getMinWeightOrShortest(map, x0, y0,
                            x1, y1, passableFuncs);
                        if (coord) {
                            const chosenCoord = Builder.addPathToMap(map, coord);
                            paths.push(chosenCoord);
                        }
                    }
                }
            }
        }

        return paths;
    }

    /* Creates a mountain summit. */
    public createSummit(cols, rows, conf): MapObj {
        const map = new CellMap(cols, rows, ELEM.SKY);

        const ratio = conf.ratio || 0.3;
        let [cX, cY] = [Math.floor(cols / 2), Math.floor(rows / 2)];
        const totalCells = cols * rows;

        const placedCoord = [[cX, cY]];
        map.setBaseElemXY(cX, cY, ELEM.FLOOR);
        let placedCells = 1;

        const rng = MapGenerator.getAndSetRNG(conf);
        let watchdog = 10000;
        while ((placedCells / totalCells) < ratio) {
            [cX, cY] = rng.arrayGetRand(placedCoord);
            const [dX, dY] = rng.getRandDir();
            cX += dX;
            cY += dY;
            if (map.hasXY(cX, cY)) {
                if (map.getBaseElemXY(cX, cY).getType() === 'sky') {
                    placedCoord.push([cX, cY]);
                    ++placedCells;
                    map.setBaseElemXY(cX, cY, ELEM.FLOOR);
                }
            }
            --watchdog;
            if (watchdog <= 0) {break;}
        }

        const mountConf = MapGenerator.getOptions('mountain');
        mountConf.nRoadTurns = 0;
        mountConf.chasmThr = -10
        mountConf.stoneThr = 0.35;
        mountConf.snowRatio = RNG.getUniformRange(0.1, 0.4);

        const mountBase = this.createMountain(cols, rows, mountConf);

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                if (map._map[x][y].getBaseElem() !== ELEM.SKY) {
                    map._map[x][y].setBaseElem(mountBase.map._map[x][y].getBaseElem());
                }
            }
        }

        return {map};
    }

    /* Creates a single cave level. */
    public createCave(cols, rows, conf): MapObj {
        this._mapGen = new MapMiner(cols, rows, conf);
        const map = new CellMap(cols, rows, this.defaultMapElem);
        const wallElem = conf.wallElem || ELEM.WALL_CAVE;
        const floorElem = conf.floorElem || ELEM.FLOOR_CAVE;
        this._mapGen.create((x, y, val) => {
            if (val === 1) {
                map.setBaseElemXY(x, y, wallElem);
            }
            else {
                map.setBaseElemXY(x, y, floorElem);
            }
        });
        return {map, mapGen: this._mapGen};
    }

    /* Creates a single crypt level. */
    public createCryptNew(cols, rows, conf: MapConf = {}): MapObj {
        const tilesX = conf.tilesX || 12;
        const tilesY = conf.tilesY || 7;
        const level = new TemplateLevel(tilesX, tilesY);
        level.use(Crypt);

        // const genParams = conf.genParams || [1, 1, 1, 1];
        const genParams = conf.genParams || [2, 2, 2, 2];
        const roomCount = conf.roomCount || 40;
        level.setGenParams(genParams);
        level.setRoomCount(roomCount);
        level.create();

        const asciiToElem = {
            '#': ELEM.WALL_CRYPT,
            '.': ELEM.FLOOR_CRYPT
        };
        const mapObj: MapObj = MapGenerator.fromAsciiMap(level.map, asciiToElem);
        mapObj.tiles = level.getPlacedData();
        return mapObj;
    }

        /* Creates a single nest-type level. */
    public createNest(cols: number, rows: number, conf: MapConf = {}): MapObj {
        const tilesX = conf.tilesX || 12;
        const tilesY = conf.tilesY || 7;
        const level = new TemplateLevel(tilesX, tilesY);

        const genParams = conf.genParams || [1, 1, 1, 1, 1, 1];
        const roomCount = -1;
        level.weights = Nests.weights;
        level.customMatchFilter = Nests.matchFilter;
        level.setStartRoomFunc(Nests.startRoomFuncNx3);
        level.setTemplates(Nests.templates);
        level.setGenParams(genParams);
        level.setRoomCount(roomCount);
        level.create();

        let wallElem = ELEM.WALL;
        let floorElem = ELEM.FLOOR;
        if (conf.wallType) {
            wallElem = MapGenerator.getWallElem(conf.wallType);
        }
        if (conf.floorType) {
            floorElem = MapGenerator.getFloorElem(conf.floorType);
        }

        const asciiToElem = {
            '#': wallElem, '.': floorElem,
            '?': (map: CellMap, x: number, y: number) => {
                const marker = new ElementMarker('?');
                marker.setXY(x, y);
                marker.setTag('nest_loot');
                map.getCell(x, y).setProp(RG.TYPE_ELEM, marker);
            }
        };
        const mapObj: MapObj = MapGenerator.fromAsciiMap(level.map, asciiToElem);
        mapObj.tiles = level.getPlacedData();
        return mapObj;
    }

    /* Creates a castle map using Template.Level and castle tiles. */
    public createCastle(cols, rows, conf: MapConf = {}): MapObj {
        const genParams = conf.genParams || [1, 1, 1, 1];
        let tileSizeX = 5;
        let tileSizeY = 5;
        if (Array.isArray(genParams)) {
            genParams.forEach((val: number, i: number) => {
                if (i < genParams.length / 2) {
                    tileSizeX += val;
                }
                else {
                    tileSizeY += val;
                }
            });
        }
        else {
            RG.err('MapGenerator', 'createCastle',
                'GenParamsXY {x: [...], y: [...]} not supported yet!');
        }
        const tilesX = conf.tilesX || Math.ceil(cols / tileSizeX);
        const tilesY = conf.tilesY || Math.ceil(rows / tileSizeY);

        const level = new TemplateLevel(tilesX, tilesY);
        level.use(Castle);
        if (!conf.models && !conf.templates) {
            level.setTemplates(Castle.Models.full);
        }
        else if (typeof conf.models === 'string') {
            level.setTemplates(Castle.Models[conf.models]);
        }
        else if (typeof conf.templates === 'string') {
            level.setTemplates(Castle.templates[conf.templates]);
        }
        else {
            level.setTemplates(conf.models);
        }

        if (conf.nGates === 2) {
          level.setStartRoomFunc(Castle.startFuncTwoGates!);
        }
        else if (conf.nGates === 4) {
          level.setStartRoomFunc(Castle.startFuncFourGates!);
        }
        else if (conf.startRoomFunc) {
          level.setStartRoomFunc(conf.startRoomFunc);
        }

        if (conf.constraintFunc) {
            level.setConstraintFunc(conf.constraintFunc);
        }

        const roomCount = conf.roomCount || 40;
        level.setGenParams(genParams);
        level.setRoomCount(roomCount);
        level.tryToMatchAllExits = true;

        if (conf.callbacks) {
            Object.keys(conf.callbacks).forEach(name => {
                level.addCallback(name, conf.callbacks[name]);
            });
        }

        level.create();
        const mapObj = this.createCastleMapObj(level, conf);
        return mapObj;
    }

    /* Constructs only outer castle wall. Can be used for fortified cities etc.
     * */
    public createCastleWall(cols, rows, conf: MapConf = {}): MapObj {
        const tilesX = conf.tilesX || Math.ceil(cols / 7);
        const tilesY = conf.tilesY || Math.ceil(rows / 7);

        const level = new TemplateLevel(tilesX, tilesY);
        level.use(Castle);
        level.setTemplates(Castle.Models.outerWall);
        level.setFiller(Castle.tiles.fillerFloor);

        if (conf.nGates === 2) {
          level.setStartRoomFunc(Castle.startFuncTwoGates);
        }
        else if (conf.startRoomFunc) {
          level.setStartRoomFunc(conf.startRoomFunc);
        }

        if (conf.constraintFunc) {
            level.setConstraintFunc(conf.constraintFunc);
        }
        level.create();

        const wallElem = MapGenerator.getWallElem(conf.wallType);
        const floorElem = MapGenerator.getFloorElem(conf.floorType);
        const asciiToElem = {
            '#': wallElem,
            '.': floorElem
        };
        const castleMapObj: MapObj = MapGenerator.fromAsciiMap(level.map, asciiToElem);
        castleMapObj.tiles = level.getPlacedData();
        return castleMapObj;
    }

    /* Creates the actual castle Map.CellList after ascii has been generated from
     * the template. */
    public createCastleMapObj(level: TemplateLevel, conf): MapObj {
        const elements: ElementXY[] = [];
        const createLeverMarker = (map, x, y) => {
            map.setBaseElemXY(x, y, MapGenerator.getFloorElem(conf.floorType));
            if (conf.preserveMarkers) {
                const marker = new ElementMarker('&');
                marker.setTag('lever');
                map.getCell(x, y).setProp(RG.TYPE_ELEM, marker);
                marker.setXY(x, y);
                elements.push(marker);
            }
        };

        const createLeverDoorMarker = (map, x, y) => {
            map.setBaseElemXY(x, y, MapGenerator.getFloorElem(conf.floorType));
            if (conf.preserveMarkers) {
                const marker = new ElementMarker('|');
                marker.setTag('leverdoor');
                map.getCell(x, y).setProp(RG.TYPE_ELEM, marker);
                marker.setXY(x, y);
                elements.push(marker);
            }
        };

        const createLivingQuarterMarker = (map, x, y) => {
            map.setBaseElemXY(x, y, ELEM.FLOOR_HOUSE);
            if (conf.preserveMarkers) {
                const marker = new ElementMarker(':');
                marker.setTag('living_quarter');
                map.getCell(x, y).setProp(RG.TYPE_ELEM, marker);
                marker.setXY(x, y);
                elements.push(marker);
            }
        };

        const createDoor = (map, x, y) => {
            map.setBaseElemXY(x, y, MapGenerator.getFloorElem(conf.floorType));
            if (conf.preserveMarkers) {
                const marker = new ElementMarker('+');
                marker.setTag('door');
                map.getCell(x, y).setProp(RG.TYPE_ELEM, marker);
                marker.setXY(x, y);
                elements.push(marker);
            }
        };

        const asciiToElem = {
            '#': MapGenerator.getWallElem(conf.wallType),
            '.': MapGenerator.getFloorElem(conf.floorType),
            '&': createLeverMarker,
            '|': createLeverDoorMarker,
            ':': createLivingQuarterMarker,
            '+': createDoor
        };
        const mapObj: MapObj = MapGenerator.fromAsciiMap(level.map, asciiToElem);
        mapObj.tiles = level.getPlacedData();
        mapObj.elements = elements;
        return mapObj;
    }

    public createTownWithWall(cols, rows, conf: MapConf = {}): MapObj {
        const tileSize = 7;
        const tilesX = Math.ceil(cols / tileSize);
        const tilesY = Math.ceil(rows / tileSize);
        const castleMapObj = this.createCastleWall(cols, rows, conf);

        conf.levelType = 'empty' || conf.levelType;
        const colsTown = (tilesX - 2) * tileSize;
        const rowsTown = (tilesY - 2) * tileSize;
        const townMapObj = this.createTownBSP(colsTown, rowsTown, conf);

        const finalMap = castleMapObj.map;
        Geometry.mergeMapBaseElems(finalMap, townMapObj.map,
            tileSize, tileSize);

        // Adjust house coordinates due to map merging
        const houses = townMapObj.houses;
        houses.forEach(house => {
            house.moveHouse(tileSize, tileSize);
        });

        const unused = townMapObj.unused;
        if (unused) {
            unused.forEach(leaf => {
                leaf.x += tileSize;
                leaf.y += tileSize;
            });
        }

        return {
            map: finalMap,
            houses,
            unused,
            tiles: castleMapObj.tiles
        };
    }

    public createArctic(cols, rows, conf: MapConf = {}): MapObj {
        const snowRatio = conf.snowRatio || 1.0;
        this.setGen('empty', cols, rows);
        const map = new CellMap(cols, rows, this.defaultMapElem);
        MapGenerator.addRandomSnow(map, snowRatio);
        return {map};
    }

    /* Sets the generator for room generation.*/
    public setGen(type: string, cols: number, rows: number, conf={}): void {
        this.cols = cols;
        this.rows = rows;
        type = type.toLowerCase();
        this._mapType = type;
        switch (type) {
            case 'arctic': this._mapGen = this.createEmptyFunc('arctic', cols, rows); break;
            case 'arena': this._mapGen = new Map.Arena(cols, rows); break;
            case 'cave': this._mapGen = new MapMiner(cols, rows); break;
            case 'cellular': this._mapGen = this.createCellular(cols, rows); break;
            case 'castle': break;
            case 'crypt': this._mapGen = new Map.Uniform(cols, rows, conf); break;
            case 'digger': this._mapGen = new Map.Digger(cols, rows); break;
            case 'divided':
                this._mapGen = new Map.DividedMaze(cols, rows); break;
            case 'dungeon': this._mapGen = new Map.Rogue(cols, rows, conf); break;
            case 'empty': this._mapGen = this.createEmptyFunc('empty', cols, rows); break;
            case 'eller': this._mapGen = new Map.EllerMaze(cols, rows); break;
            case 'forest': this._mapGen = new MapForest(cols, rows); break;
            case 'lakes': this._mapGen = new MapForest(cols, rows); break;
            case 'labyrinth':
                this._mapGen = new Map.DividedMaze(cols, rows); break;
            case 'miner': this._mapGen = new MapMiner(cols, rows); break;
            case 'mountain': this._mapGen = new MapMountain(cols, rows); break;
            case 'icey': this._mapGen = new Map.IceyMaze(cols, rows); break;
            case 'rogue': this._mapGen = new Map.Rogue(cols, rows, conf); break;
            case 'uniform': this._mapGen = new Map.Uniform(cols, rows, conf); break;
            case 'ruins': this._mapGen = this.createRuins(cols, rows); break;
            case 'rooms': this._mapGen = this.createRooms(cols, rows); break;
            case 'town': this._mapGen = new Map.Arena(cols, rows); break;
            case 'townwithwall': break;
            case 'summit': break;
            case 'splashes': this._mapGen = new MapForest(cols, rows); break;
            case 'wall': this._mapGen = new MapWall(cols, rows); break;
            default: RG.err('MapGen',
                'setGen', 'this._mapGen type ' + type + ' is unknown');
        }
    }

    public createEmptyFunc(type: string, cols: number, rows: number): () => void {
        if (type === 'empty') {
            this.defaultMapElem = ELEM.FLOOR;
        }
        return () => {
            const obj = this.createEmptyMap();
            return obj.map;
        };
    }

}

MapGenerator.options = {};
MapGenerator.options.mountain = Object.freeze({
    noiseMult: 1,
    noiseDivider: 20,
    highRockThr: 0.75,
    stoneThr: 0.5,
    chasmThr: -0.4,
    nRoadTurns: 8,
    snowRatio: 0.0
});


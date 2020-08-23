
/* This file contains the first layer of overworld generation. It generates tile
 * map where each tile represents an area of Map.Cells, for example 10x10.
 * This tile map has one feature (town/mountain/dungeon) per tile, to keep the
 * overworld map useful for navigation and seeing details.
 */
import dbg = require('debug');
const debug = dbg('bitn:OW');

import RG from './rg';
import {TCoord, OWMapConf, ICoordXY} from './interfaces';

import {BBox} from './bbox';
import {CellMap} from './map';
import {Path} from './path';
import {Geometry} from './geometry';
import {OW} from './ow-constants';
import {Random} from './random';
import {TerritoryMap} from '../data/territory-map';
import {Territory} from './territory';
import {ElementMarker} from './element';

type OWSubLevel = import('./overworld').OWSubLevel;

const getRNG = Random.getRNG;

//---------------------------------------------
/* OWMap: Data struct for overworld. */
//---------------------------------------------

interface FeatData {
    type?: string;
    tags?: string[];
}

interface OWWall {
    x: number | number[];
    y: number | number[];
    type: string;
}

interface IOWPaths {
    [key: string]: ICoordXY[];
}

type FilterFunc = (x: number, y: number, feats: string[], isWall: boolean) => boolean;

export class OWMap {

    public static isPassable: (ow: OWMap, x: number, y: number) => boolean;
    public static createOverWorld: (conf) => OWMap;
    public static getPath: (ow: OWMap, xy0: TCoord, xy1: TCoord) => ICoordXY[];

    public static fromJSON(json): OWMap {
        const ow = new OWMap();
        ow.setMap(json.baseMap);
        ow._features = json.features;
        ow._featuresByXY = json.featuresByXY;
        ow._vWalls = json.vWalls;
        ow._hWalls = json.hWalls;
        ow._biomeMap = json.biomeMap;
        ow._explored = json.explored;
        ow._paths = json.paths;
        if (json.terrMap) {
            ow._terrMap = Territory.fromJSON(json.terrMap);
        }
        return ow;
    }

    public coordMap: any;

    // Anything assigned here will be printed as last
    public debugMap: {[key: string]: string};

    protected _baseMap: string[][];
    protected _explored: {[key: string]: boolean};
    protected _subLevels: OWSubLevel[][];

    protected _hWalls: OWWall[];
    protected _vWalls: OWWall[];

    protected _features: {[key: string]: TCoord[]};
    protected _featureData: {[key: string]: FeatData[]};
    protected _featuresByXY: {[key: string]: string[]};

    protected _biomeMap: {[key: string]: string};
    protected _terrMap: Territory;
    protected _paths: IOWPaths;
    protected _pathsXY: {[key: string]: ICoordXY[]};

    constructor() {
        this._baseMap = [];
        this._explored = {};
        this._subLevels = [];

        this._hWalls = [];
        this._vWalls = [];

        this._features = {};
        this._featureData = {};
        this._featuresByXY = {};

        this._biomeMap = {};

        this._terrMap = null;

        this.debugMap = {};
        this._paths = {};
        this._pathsXY = {};
    }

    public hasTerrMap(): boolean {return !!this._terrMap;}

    public getSizeXY(): TCoord {
        return [this.getSizeX(), this.getSizeY()];
    }

    public getCenterX(): number {
        return Math.round(this.getSizeX() / 2);
    }

    public getCenterY(): number {
        return Math.round(this.getSizeY() / 2);
    }

    public isWallTile(x: number, y: number): boolean {
        const tile = this._baseMap[x][y];
        return OW.ALL_WALLS_LUT.hasOwnProperty(tile);
    }

    public isTerm(x: number, y: number): boolean {
        return this._baseMap[x][y] === OW.TERM;
    }

    public numTiles(tile: string): number {
        let numFound = 0;
        const [sizeX, sizeY] = this.getSizeXY();
        for (let x = 0; x < sizeX; x++) {
            for (let y = 0; y < sizeY; y++) {
                if (this._baseMap[x][y] === tile) {
                    ++numFound;
                }
            }
        }
        return numFound;
    }

    public numWallTiles(): number {
        let numWalls = 0;
        const [sizeX, sizeY] = this.getSizeXY();
        for (let x = 0; x < sizeX; x++) {
            for (let y = 0; y < sizeY; y++) {
                if (this.isWallTile(x, y)) {
                    ++numWalls;
                }
            }
        }
        return numWalls;
    }

    public getBiomeMap(): {[key: string]: string} {
        return this._biomeMap;
    }

    public getBiome(x: number, y: number): string {
        const key = x + ',' + y;
        if (this._biomeMap.hasOwnProperty(key)) {
            return this._biomeMap[x + ',' + y];
        }
        else {
            RG.err('OWMap', 'getBiome',
                `No biome set for x,y ${x},${y}`);
        }
        return '';
    }

    public getMap(): string[][] {
        return this._baseMap;
    }

    public getCell(xy: TCoord): string {
        return this._baseMap[xy[0]][xy[1]];
    }

    public numHWalls(): number {
        return this._hWalls.length;
    }

    public numVWalls(): number {
        return this._vWalls.length;
    }

    public getHWall(i: number): OWWall | null {
        if (i < this._hWalls.length) {
            return this._hWalls[i];
        }
        return null;
    }

    public getVWall(i: number): OWWall | null {
        if (i < this._vWalls.length) {
            return this._vWalls[i];
        }
        return null;
    }

    public getHWalls(): OWWall[] {
        return this._hWalls;
    }

    public getVWalls(): OWWall[] {
        return this._vWalls;
    }

    public setMap(map: string[][]): void {
        const sizeX = map.length;
        this._baseMap = map;
        for (let x = 0; x < sizeX; x++) {
            this._subLevels[x] = [];
        }
    }

    public setTerrMap(terrMap: Territory): void {
        this._terrMap = terrMap;
    }

    public getTerrMap(): Territory {
        return this._terrMap;
    }

    public addBiome(x: number, y: number, biomeType: string): void {
        const key = x + ',' + y;
        this._biomeMap[key] = biomeType;
    }

    public addVWall(wall: OWWall): void {
        wall.type = 'vertical';
        this._vWalls.push(wall);
    }

    public addHWall(wall: OWWall): void {
        wall.type = 'horizontal';
        this._hWalls.push(wall);
    }

    public hasFeatureAt(xy: TCoord): boolean {
        const keyXY = RG.toKey(xy);
        return this._featuresByXY.hasOwnProperty(keyXY);
    }

    public addFeature(xy: TCoord, type: string): void {
        const keyXY = xy[0] + ',' + xy[1];
        if (!this._features.hasOwnProperty(type)) {
            this._features[type] = [];
        }
        if (!this._featuresByXY.hasOwnProperty(keyXY)) {
            this._featuresByXY[keyXY] = [];
        }
        this._features[type].push(xy);
        this._featuresByXY[keyXY].push(type);
    }

    public getFeatureData(xy: TCoord): FeatData[] {
        if (this.hasFeatureData(xy)) {
            return this._featureData[RG.toKey(xy)];
        }
        return [];
    }

    public addFeatureData(xy: TCoord, data: FeatData): void {
        const keyXY = RG.toKey(xy);
        if (!this._featureData.hasOwnProperty(keyXY)) {
            this._featureData[keyXY] = [];
        }
        this._featureData[keyXY].push(data);
    }

    public hasFeatureData(xy: TCoord): boolean {
        const keyXY = RG.toKey(xy);
        return !!this._featureData[keyXY];
    }

    public hasFeatureDataWith(xy: TCoord, tag: string): boolean {
        if (this.hasFeatureData(xy)) {
            const keyXY = RG.toKey(xy);
            const fdList: FeatData[] = this._featureData[keyXY];
            for (let i = 0; i < fdList.length; i++) {
                if (fdList[i].tags) {
                    const tags: string[] = fdList[i].tags!;
                    if (tags.indexOf(tag) >= 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public getXYForFeatureDataWith(key: keyof FeatData, val: string): null | TCoord {
        let res: null | TCoord = null;
        Object.keys(this._featureData).forEach((keyXY: string) => {
            const fdList: FeatData[] = this._featureData[keyXY];
            fdList.forEach((fd: FeatData) => {
                if (!res && fd[key]) {
                    const dataVal = fd[key];
                    // Value can directly match, or match in array
                    if (dataVal === val) {
                        res = RG.fromKey(keyXY);
                    }
                    else if (Array.isArray(dataVal)) {
                        if (dataVal.indexOf(val) >= 0) {
                            res = RG.fromKey(keyXY);
                        }
                    }
                }
            });
        });
        return res;
    }


    public getFeaturesByType(type: string): TCoord[] {
        if (!this._features.hasOwnProperty(type)) {
            return [];
        }
        return this._features[type];
    }

    public getFeaturesByXY(xy: TCoord): null | string[] {
        const keyXY = RG.toKey(xy);
        return this._featuresByXY[keyXY];
    }

    public addPath(name: string, path: ICoordXY[]): void {
        this._paths[name] = path;
        path.forEach((xy: ICoordXY) => {
            this._pathsXY[xy.x + ',' + xy.y] = path;
        });
    }

    public getPathAtXY(xy: TCoord): null | ICoordXY[] {
        if (this.hasPathAt(xy)) {
            const keyXY = RG.toKey(xy);
            return this._pathsXY[keyXY];
        }
        return null;
    }

    public hasPathAt(xy: TCoord): boolean {
        const [x, y] = xy;
        const key = x + ',' + y;
        return this._pathsXY.hasOwnProperty(key);
    }

    public getFeaturesOnPath(path: ICoordXY[]): {[key: string]: string[]} {
        const res = {};
        path.forEach((xy: ICoordXY) => {
            const {x, y} = xy;
            if (this.hasFeatureAt([x, y])) {
                res[x + ',' + y] = this.getFeaturesByXY([x, y]);
            }
        });
        return res;
    }

    public addSubLevel(xy: TCoord, level: OWSubLevel): void {
        this._subLevels[xy[0]][xy[1]] = level;
    }

    public getSubLevel(xy: TCoord): OWSubLevel {
        return this._subLevels[xy[0]][xy[1]];
    }

    public clearSubLevels(): void {
        this._subLevels = [];
    }

    public getSubLevelsWithFeature(type: string): OWSubLevel[] {
        const featXY = this.getFeaturesByType(type);
        return featXY.map(xy => this.getSubLevel(xy));
    }

    public getAreaXY(): number {
        return this.getSizeX() * this.getSizeY();
    }

    public getSizeX(): number {
        return this._baseMap.length;
    }

    public getSizeY(): number {
        if (this._baseMap[0].length > 0) {
            return this._baseMap[0].length;
        }
        else {
            RG.warn('OWMap', 'getSizeY',
                'Y-size requested but returning zero value');
            return 0;
        }
    }

    public setExplored(xy: TCoord): void {
        this._explored[RG.toKey(xy)] = true;
    }

    public isExplored(xy: TCoord): boolean {
        return this._explored[RG.toKey(xy)];
    }

    public toJSON(): any {
        const json: any = {
            baseMap: this._baseMap,
            biomeMap: this._biomeMap,
            features: this._features,
            featuresByXY: this._featuresByXY,
            vWalls: this._vWalls,
            hWalls: this._hWalls,
            explored: this._explored,
            paths: this._paths
        };
        if (this.coordMap) {
            json.coordMap = this.coordMap.toJSON();
        }
        if (this._terrMap) {
            json.terrMap = this._terrMap.toJSON();
        }
        return json;
    }

    public getOWMap(useExplored = false): string[][] {
        const map = JSON.parse(JSON.stringify(this._baseMap));
        const sizeY = map[0].length;
        const sizeX = map.length;

        // Add features on top of the base map, for overlapping features,
        // this shows only the first one added
        Object.keys(this._features).forEach(type => {
            this._features[type].forEach(xy => {
                map[xy[0]][xy[1]] = type;
            });
        });

        if (useExplored) {
          for (let x = 0; x < sizeX; x++) {
            for (let y = 0; y < sizeY; y++) {
              if (!this._explored[x + ',' + y]) {
                map[x][y] = '?';
              }
            }
          }
        }

        Object.keys(this.debugMap).forEach(xy => {
            console.log('key is ' + xy);
            const [x, y] = xy.split(',');
            const xx = parseInt(x, 10);
            const yy = parseInt(y, 10);
            map[xx][yy] = this.debugMap[xy];
        });
        return map;
    }

    /* Returns the OWMap represented as Map.CellMap. Marker elements are used to
     * show the visible cells. */
    public getCellMap(): CellMap {
        const map: string[][] = this.getOWMap();
        const sizeY = map[0].length;
        const sizeX = map.length;

        const cellList = new CellMap(sizeX, sizeY);
        for (let x = 0; x < sizeX; x++) {
            for (let y = 0; y < sizeY; y++) {
                const marker = new ElementMarker(map[x][y]);
                if (OW.classNames[map[x][y]]) {
                    marker.setClassName(OW.classNames[map[x][y]]);
                }
                else {
                    marker.setClassName(OW.classNames.default);
                }
                cellList.setProp(x, y, RG.TYPE_ELEM, marker);
            }
        }
        return cellList;
    }

    /* Converts the OWMap into string. */
    public mapToString(useExplored = false): string[] {
        const map = this.getOWMap(useExplored);
        const sizeY = map[0].length;
        const sizeX = map.length;

        const lines = [];
        for (let y = 0; y < sizeY; y++) {
            const line = [];
            for (let x = 0; x < sizeX; x++) {
                line.push(map[x][y]);
            }
            lines.push(line);
        }
        return lines.map(line => line.join(''));
    }

    /* Prints the map of biomes and a legend explaining the numbers. */
    public biomeMapToString() {
        const sizeX = this.getSizeX() - 1;
        const sizeY = this.getSizeY() - 1;

        // Build a legend ie: 0 - arctic, 1 - alpine, 2 - forest etc
        const keys = Object.keys(OW.biomeTypeMap);
        const name2Num = {};
        const legend = keys.map((key, index) => {
            name2Num[key] = '' + index;
            return `${index} - ${key}`;
        });

        let result = '';
        for (let y = 0; y < sizeY; y++) {
            let rowStr = '';
            for (let x = 0; x < sizeX; x++) {
                const key = x + ',' + y;
                rowStr += ',' + name2Num[this._biomeMap[key]];
            }
            rowStr += '\n';
            result += rowStr;
        }
        result += '\n' + legend.join('\n');
        return result;
    }

    public filter(func: FilterFunc): {[key: string]: string[]} {
        const res = {};
        const [sizeX, sizeY] = this.getSizeXY();
        for (let x = 0; x < sizeX; x++) {
            for (let y = 0; y < sizeY; y++) {
                const isWall = this.isWallTile(x, y);
                const feats = this.getFeaturesByXY([x, y]);
                if (func(x, y, feats, isWall)) {
                    res[x + ',' + y] = feats;
                }
            }
        }
        return res;
    }

    public addPathToDebug(path: ICoordXY[]): void {
        path.forEach((xy, i) => {
            if (i === 0) {
                this.debugMap[xy.x + ',' + xy.y] = 'X';
            }
            else if (i === path.length - 1) {
                this.debugMap[xy.x + ',' + xy.y] = '0';
            }
            else {
                this.debugMap[xy.x + ',' + xy.y] = '*';
            }
        });
    }

    public getPaths(): IOWPaths {
        return this._paths;
    }

    public getPath(name: string): ICoordXY[] {
        if (this._paths[name]) {
            return this._paths[name];
        }
        return [];
    }
}

//---------------------------------------------------------------------------
// HELPERS
//---------------------------------------------------------------------------

/* Creates an empty map. */
function createEmptyMap(sizeX: number, sizeY: number): string[][] {
    const map = [];
    for (let x = 0; x < sizeX; x++) {
        map[x] = [];
        for (let y = 0; y < sizeY; y++) {
            map[x][y] = OW.EMPTY;
        }
    }
    return map;
}

/* Randomizes map border using valid border cells. Valid cells are ones
 * which do not have connections outside the map, and abut to neighbouring
 * cells correctly. */
function randomizeBorders(map) {
    const sizeY = map[0].length;
    const sizeX = map.length;

    // Set map corners
    map[0][0] = OW.CC_NW;
    map[0][sizeY - 1] = OW.CC_SW;
    map[sizeX - 1][sizeY - 1] = OW.CC_SE;
    map[sizeX - 1][0] = OW.CC_NE;

    // N border, y = 0, vary x
    for (let x = 1; x < sizeX - 1; x++) {
        map[x][0] = getRNG().arrayGetRand(OW.N_BORDER);
    }

    // S border, y = max, vary x
    for (let x = 1; x < sizeX - 1; x++) {
        map[x][sizeY - 1] = getRNG().arrayGetRand(OW.S_BORDER);
    }

    // E border, x = max, vary y
    for (let y = 1; y < sizeY - 1; y++) {
        map[sizeX - 1][y] = getRNG().arrayGetRand(OW.E_BORDER);
    }

    // W border, x = 0, vary y
    for (let y = 1; y < sizeY - 1; y++) {
        map[0][y] = getRNG().arrayGetRand(OW.W_BORDER);
    }

}

/* Adds the large-scale walls into the overworld map. */
function addWallsIfAny(ow, map, conf) {
    const sizeY = map[0].length;
    const sizeX = map.length;

    let nHWalls = typeof conf.nHWalls !== 'undefined'
        ? conf.nHWalls : [0.3, 0.5];
    let nVWalls = typeof conf.nVWalls !== 'undefined'
        ? conf.nVWalls : [];
    const stopOnWall = typeof conf.stopOnWall !== 'undefined'
        ? conf.stopOnWall : false;

    // If only integers are given, randomize positions of walls.
    if (Number.isInteger(conf.nHWalls)) {
        nHWalls = [];
        for (let i = 0; i < conf.nHWalls; i++) {
            const pos = getRNG().getUniformInt(1, 19);
            nHWalls.push(pos * 0.05);
        }
        nHWalls = nHWalls.sort();
    }
    if (Number.isInteger(conf.nVWalls)) {
        nVWalls = [];
        for (let i = 0; i < conf.nVWalls; i++) {
            const pos = getRNG().getUniformInt(1, 19);
            nVWalls.push(pos * 0.05);
        }
        nVWalls = nHWalls.sort();
    }

    // Add horizontal and vertical "walls"
    for (let i = 0; i < nHWalls.length; i++) {
        let stop = stopOnWall;
        if (stopOnWall === 'random') {
            stop = getRNG().getUniform() >= 0.5;
        }
        addHorizontalWallWestToEast(ow,
            Math.floor(sizeY * nHWalls[i]), map, stop);
    }
    for (let i = 0; i < nVWalls.length; i++) {
        let stop = stopOnWall;
        if (stopOnWall === 'random') {
            stop = getRNG().getUniform() >= 0.5;
        }
        addVerticalWallNorthToSouth(ow,
            Math.floor(sizeX * nVWalls[i]), map, stop);
    }

}

/* Adds a horizontal wall travelling from E -> W. */
function addHorizontalWallWestToEast(ow, y, map, stopOnWall = false) {
    const sizeX = map.length;
    let didStopToWall = false;
    const wall = {y, x: [1]};
    map[0][y] = OW.TT_W;
    if (!stopOnWall) {map[sizeX - 1][y] = OW.TT_E;}
    for (let x = 1; x < sizeX - 1; x++) {
        if (!didStopToWall) {
            if (map[x][y] !== OW.EMPTY) {
                if (!stopOnWall) {
                    map[x][y] = OW.XX; // Push through wall
                }
                else { // Add ╣ and finish
                    didStopToWall = true;
                    map[x][y] = OW.TT_E;
                    wall.x.push(x);
                }
            }
            else {
                map[x][y] = getRNG().getWeighted(OW.LINE_WE_WEIGHT);
            }
        }
    }
    if (!didStopToWall) { // Didn't stop to wall
        if (stopOnWall) { // But we wanted, so add ending piece
            map[sizeX - 1][y] = OW.TT_E;
        }
        wall.x.push(sizeX - 1);
    }
    ow.addHWall(wall);
}

/* Adds a horizontal wall travelling from E -> W. */
function addVerticalWallNorthToSouth(ow, x, map, stopOnWall = false) {
    const sizeY = map[0].length;
    let didStopToWall = false;
    const wall = {x, y: [1]};
    map[x][0] = OW.TT_N;
    if (!stopOnWall) {map[x][sizeY - 1] = OW.TT_S;}
    for (let y = 1; y < sizeY - 1; y++) {
        if (!didStopToWall) {
            if (map[x][y] !== OW.EMPTY) {
                if (!stopOnWall) {
                    map[x][y] = OW.XX; // Push through wall
                }
                else { // Add ╩ and finish
                    didStopToWall = true;
                    map[x][y] = OW.TT_S;
                    wall.y.push(y);
                }
            }
            else {
                map[x][y] = getRNG().getWeighted(OW.LINE_NS_WEIGHT);
            }
        }
    }
    if (!didStopToWall) {
        if (stopOnWall) { // But we wanted, so add ending piece
            map[x][sizeY - 1] = OW.TT_S;
        }
        wall.y.push(sizeY - 1);
    }
    ow.addVWall(wall);
}

function addRandomInnerWalls(overworld, map, conf) {
    const sizeY = map[0].length;
    const sizeX = map.length;

    const ratio = conf.innerWallRatio || 0.05;
    const nTiles = Math.floor(sizeX * sizeY * ratio);

    for (let i = 0; i < nTiles; i++) {
        const x = getRNG().getUniformInt(2, sizeX - 2);
        const y = getRNG().getUniformInt(2, sizeY - 2);
        if (map[x][y] === OW.EMPTY) {
            map[x][y] = getRNG().arrayGetRand(OW.ALL_WALLS);
        }
    }
}

/* Connects all unconnected tiles by starting from 0,0 -> 0,N, then
 * moving to 1,0 -> 1,N, and so on.
 * */
function connectUnconnectedTopBottom(map, yFirst = true) {
    const sizeY = map[0].length;
    const sizeX = map.length;

    if (yFirst) {
        for (let x = 0; x < sizeX; x++) {
            for (let y = 0; y < sizeY; y++) {
                connectEmptyCell(x, y, map);
            }
        }
    }
    else {
        for (let y = 0; y < sizeY; y++) {
            for (let x = 0; x < sizeX; x++) {
                connectEmptyCell(x, y, map);
            }
        }
    }
}

/* Connects all unconnected tiles by starting from 0,N -> 0,0, then
 * moving to 1,N -> 1,0, and so on.
 * */
function connectUnconnectedBottomTop(map, yFirst = true) {
    const sizeY = map[0].length;
    const sizeX = map.length;

    if (yFirst) {
        for (let x = 0; x < sizeX; x++) {
            for (let y = sizeY - 1; y >= 0; y--) {
                connectEmptyCell(x, y, map);
            }
        }
    }
    else {
        for (let y = sizeY - 1; y >= 0; y--) {
            for (let x = 0; x < sizeX; x++) {
                connectEmptyCell(x, y, map);
            }
        }
    }
}

function connectEmptyCell(x: number, y: number, map: string[][]): void {
    if (map[x][y] === OW.EMPTY) {
        const neighbours = getValidNeighbours(x, y, map);
        const validNeighbours = neighbours.filter(n =>
            n[0] !== OW.EMPTY && n[0] !== OW.TERM
        );
        if (validNeighbours.length === 1) {
            if (validNeighbours[0][1].length > 0) {
                map[x][y] = getRNG().arrayGetRand(validNeighbours[0][1]);
            }
            else {
                map[x][y] = OW.TERM;
            }
        }
        else {
            map[x][y] = OW.TERM;
        }
    }
}

/* Returns valid neighbouring tiles for the given x,y. */
function getValidNeighbours(x: number, y: number, map: string[][]): any[] {
    const sizeY = map[0].length;
    const sizeX = map.length;
    const tiles = [];
    // N
    if (y > 0) {
        const conn = OW.CAN_CONNECT[map[x][y - 1]].N;
        tiles.push([map[x][y - 1], conn]);
    }
    // S
    if (y < sizeY - 1) {
        const conn = OW.CAN_CONNECT[map[x][y + 1]].S;
        tiles.push([map[x][y + 1], conn]);
    }
    // E
    if (x < sizeX - 1) {
        const conn = OW.CAN_CONNECT[map[x + 1][y]].E;
        tiles.push([map[x + 1][y], conn]);
    }
    // W
    if (x > 0) {
        const conn = OW.CAN_CONNECT[map[x - 1][y]].W;
        tiles.push([map[x - 1][y], conn]);
    }
    return tiles;
}

/* Creates the territories for settlements like cities. */
function createOverWorldTerritories(ow: OWMap, conf): void {
    const {playerRace} = conf;
    addHomeTownTag(ow, conf);
    const owXY = ow.getXYForFeatureDataWith('tags', 'hometown');
    if (!owXY) {
        RG.err('overworld.map.ts', 'createOverWorldTerritories',
            `Unable to find owX/Y for player hometown`);
        return;
    }
    const terr = TerritoryMap.create(ow, playerRace, owXY);
    ow.setTerrMap(terr);
}

function addHomeTownTag(ow: OWMap, conf): void {
    const {playerX, playerY} = conf;
    const [xMap, yMap] = getMappingToOWXY(conf);
    if (RG.isNullOrUndef([playerX, playerY, xMap, yMap])) {
        RG.warn('OWMap', 'addHomeTownTag',
            'playerX/Y not found in OWMapConf: ' + JSON.stringify(conf));
        return;
    }

    const ulx = playerX! * xMap;
    const uly = playerY! * yMap;
    const lrx = ulx + xMap - 1;
    const lry = uly + yMap - 1;
    let chosen = false;
    let maxTries = xMap * yMap * 2;
    let coord: TCoord | null = null;

    while (!chosen) {
        coord = getRNG().getRandInBbox(new BBox(ulx, uly, lrx, lry));

        if (!ow.isWallTile(coord[0], coord[1])) {
            ow.addFeatureData(coord as TCoord, {tags: ['hometown']});
            chosen = true;
        }

        if (--maxTries === 0) {
            console.log('Generated OWMap\n:' + ow.mapToString().join('\n'));
            RG.err('overworld.map.ts', 'addHomeTownTag',
               'Failed to find owTileX/Y for player. Conf: ' + JSON.stringify(conf));
        }
    }
}

/* Adds features like water, cities etc into the world. This feature only
 * designates the x,y coordinate on overworld map, but does not give details
 * for the Map.Level sublevels. */
function addOverWorldFeatures(ow: OWMap, conf: OWMapConf): void {
    const sizeX = ow.getSizeX();
    const sizeY = ow.getSizeY();
    const area = sizeX * sizeY;

    const numFlatTiles = ow.numTiles(OW.TERM);
    const numWallTiles = ow.numWallTiles();

    const nDungeonsSouth = conf.nDungeonsSouth || Math.floor(numWallTiles / 12);
    const nDungeonsCenter = conf.nDungeonsCenter ||
        Math.floor(numWallTiles / 24);
    const nDungeonsNorth = conf.nDungeonsNorth || Math.floor(numWallTiles / 24);

    const nMountainsNorth = conf.nMountainsNorth || Math.floor(area / 40);
    const nMountainsMiddle = conf.nMountainsMiddle || Math.floor(area / 60);
    const nMountainsSouth = conf.nMountainsSouth || Math.floor(area / 80);

    // Add final tower
    addFeatureToAreaByDir(ow, 'NE', 0.5, OW.BTOWER);
    const numHorWalls = ow.numHWalls();

    // City of B, + other wall fortresses
    if (numHorWalls > 1) {
        addFeatureToWall(ow, ow.getHWall(1), OW.WCAPITAL);
        addFeatureToWall(ow, ow.getHWall(0), OW.WTOWER);
    }
    if (numHorWalls > 2) {
        for (let i = 2; i < numHorWalls; i++) {
            addFeatureToWall(ow, ow.getHWall(i), OW.VTUNNEL);
        }
    }

    const numVerWalls = ow.numVWalls();
    if (numVerWalls > 0) {
        addFeatureToWall(ow, ow.getVWall(numVerWalls - 1), OW.BTOWER);
        addFeatureToWall(ow, ow.getVWall(numVerWalls - 1), OW.BCAPITAL);
    }

    const cmdBetweenHWalls = {y: {start: ['wall', 0], end: ['wall', 1]}};
    const cmdAboveNorthWall = {y: {start: 'N', end: 'wall'}};
    const cmdSouthernArea = {y: {start: ['wall', 1], end: 'S'}};

    // Create biomes for actor generation of overworld
    addBiomeToOverWorld(ow, cmdAboveNorthWall, OW.BIOME.ALPINE);
    addBiomeToOverWorld(ow, {x: {start: ['wall', 0], end: 'E'}},
        OW.BIOME.ARCTIC);
    addBiomeToOverWorld(ow, cmdBetweenHWalls, OW.BIOME.TUNDRA);
    addBiomeToOverWorld(ow, cmdSouthernArea, OW.BIOME.TAIGA);

    // Create forests and lakes (sort of done in sub-level generation)

    // Distribute dungeons
    // const bBoxSouth = bBox(1, sizeY - 2, sizeX - 2, sizeY - 10);
    addDungeonsToOverWorld(ow, nDungeonsSouth, cmdSouthernArea);
    addDungeonsToOverWorld(ow, nDungeonsCenter, cmdBetweenHWalls);
    addDungeonsToOverWorld(ow, nDungeonsNorth, cmdAboveNorthWall);

    const nCitySouth = conf.nCitySouth || Math.floor(numFlatTiles * 0.5 / 80);
    const nCityCenter = conf.nCityCenter || Math.floor(numFlatTiles * 0.2 / 100);
    const nCityNorth = conf.nCityNorth || Math.floor(numFlatTiles * 0.2 / 80);

    // Distribute mountains
    addMountainsToOverWorld(ow, nMountainsSouth, cmdSouthernArea);
    addMountainsToOverWorld(ow, nMountainsMiddle, cmdBetweenHWalls);
    addMountainsToOverWorld(ow, nMountainsNorth, cmdAboveNorthWall);

    // Should probably generate the terrain map here, and place cities
    // based on it

    // Distribute cities and villages etc settlements
    if (!conf.createTerritory) {
        addVillagesToOverWorld(ow, nCitySouth, cmdSouthernArea);
        addVillagesToOverWorld(ow, nCityCenter, cmdBetweenHWalls);
        addVillagesToOverWorld(ow, nCityNorth, cmdAboveNorthWall);
    }
    else {
        createOverWorldTerritories(ow, conf);
        addCitiesBasedOnTerritories(ow);
    }

    // Adds roads for created features
}

function addOverWorldPaths(ow: OWMap, conf: OWMapConf): void {
    const xyBT = ow.getFeaturesByType(OW.BTOWER);
    const xyWC = ow.getFeaturesByType(OW.WCAPITAL);
    const path = OWMap.getPath(ow, xyWC[0], xyBT[0]);
    ow.addPath(OW.PATH_WCAP_BTOWER, path);

    const featsOnPath = ow.getFeaturesOnPath(path);
    const ratio = path.length / Object.keys(featsOnPath).length;
    // console.log('OW_CAP->BTOWER Path/feats ratio is ' + ratio);

    // const xyBegin: TCoord = [1, ow.getSizeY() - 2];
    const featsByXY = ow.filter((x, y, feats, isWall) => {
        if (!feats) {return false;}
        if (y === (ow.getSizeY() - 2)) {
            if (cellMatches(OW.WVILLAGE, feats)) {
                return true;
            }
            if (cellMatches(OW.BVILLAGE, feats)) {
                return true;
            }
            if (ow.isTerm(x, y)) {
                return true;
            }
        }
        return false;
    });
    let key: string = getRNG().arrayGetRand(Object.keys(featsByXY));
    if (!key) {
        const terms = ow.filter((x, y, feats, isWall) => {
            if (y < ow.getSizeY() - 1 && y >= ow.getSizeY() - 3) {
                if (ow.isTerm(x, y)) {return true;}
            }
            return false;
        });
        key = getRNG().arrayGetRand(Object.keys(terms));
    }
    if (key) {
        const [xStr, yStr] = key.split(',');
        const xyBegin: TCoord = [parseInt(xStr, 10), parseInt(yStr, 10)];
        // console.log('OW.Path', xyBegin, ' -> ', xyWC[0]);
        const pathBegin = OWMap.getPath(ow, xyBegin, xyWC[0]);
        ow.addPath(OW.PATH_BEGIN_WCAP, pathBegin);
    }
}

/* Adds a feature to the map based on the cardinal direction. */
function addFeatureToAreaByDir(ow: OWMap, loc, shrink, type) {
    const map = ow.getMap();
    const sizeY = map[0].length;
    const sizeX = map.length;

    let xy = getRandLoc(loc, shrink, sizeX, sizeY);
    let watchdog = 1000;
    while (map[xy[0]][xy[1]] !== OW.TERM) {
        xy = getRandLoc(loc, shrink, sizeX, sizeY);
        if (watchdog === 0) {
            RG.warn('OverWorld', 'addFeature',
                'No empty cell to add ' + type + ', ' + loc);
            break;
        }
        --watchdog;
    }

    // Finally add the feature
    ow.addFeature(xy, type);
}

/* Adds given feature on top of given wall to random position. */
function addFeatureToWall(ow: OWMap, wall, type) {
    const map = ow.getMap();
    let xy = null;

    if (wall.type === 'horizontal') { // y will be fixed
        const ulx = wall.x[0];
        const lrx = wall.x[wall.x.length - 1];
        xy = findCellRandXYInBox(map, new BBox(ulx, wall.y, lrx, wall.y), OW.LL_WE);
    }
    if (wall.type === 'vertical') { // y will be fixed
        const uly = wall.y[0];
        const lry = wall.y[wall.y.length - 1];
        xy = findCellRandXYInBox(map, new BBox(wall.x, uly, wall.x, lry), OW.LL_NS);
    }

    debug(`Placed feature ${type} to ${xy}`);
    ow.addFeature(xy, type);
}

/* Adds a biome zone to the overworld map. These zones can be used to generate
 * terrain props + different actors based on the zone type. */
function addBiomeToOverWorld(ow: OWMap, cmd, biomeType: string): void {
    const bbox = getBoundingBox(ow, cmd);
    // Apply given type on the found range
    for (let x = bbox.ulx; x <= bbox.lrx; x++) {
        for (let y = bbox.uly; y <= bbox.lry; y++) {
            ow.addBiome(x, y, biomeType);
        }
    }
}

/* Adds dungeons into the overworld. Can be bounded using using coordinates. */
function addDungeonsToOverWorld(ow: OWMap, nDungeons, cmd): void {
    const bbox = getBoundingBox(ow, cmd);
    for (let i = 0; i < nDungeons; i++) {
        const xy = findCellRandXYInBox(ow.getMap(), bbox, OW.ALL_WALLS);
        ow.addFeature(xy, OW.WDUNGEON);
    }
}

function addMountainsToOverWorld(ow: OWMap, nMountains, cmd): void {
    const bbox = getBoundingBox(ow, cmd);
    for (let i = 0; i < nMountains; i++) {
        const xy = findCellRandXYInBox(ow.getMap(), bbox, [OW.TERM]);
        ow.addFeature(xy, OW.MOUNTAIN);
    }

}

/* Adds villages into the overworld. Can be bounded using using coordinates. */
function addVillagesToOverWorld(ow: OWMap, nVillages, cmd): void {
    const bbox = getBoundingBox(ow, cmd);
    for (let i = 0; i < nVillages; i++) {
        const xy = findCellRandXYInBox(ow.getMap(), bbox, [OW.TERM]);
        placeCityFeature(ow, xy, false);
    }
}

/* Adds the cities and settlements to the map based on territories, instead
 * of directly specifying the number of cities etc. */
function addCitiesBasedOnTerritories(ow: OWMap): void {
    const cityProb = 0.13;
    const fortProb = 0.09;
    const terrObj = ow.getTerrMap();
    const map = terrObj.getMap();

    RG.forEach2D(map, (x: number, y: number) => {
        const xy = [x, y] as TCoord;
        const name = terrObj.getRival(xy);
        let isHome = false;

        if (ow.hasFeatureDataWith(xy, 'hometown')) {
            console.log('DBG addCitiesBasedOnTerritories found hometown at', xy);
            isHome = true;
        }

        if (terrObj.hasRival(xy)) {
            if (RG.isSuccess(cityProb) || isHome) {
                placeCityFeature(ow, xy, isHome);
                const featName = name + '_city';
                ow.addFeatureData(xy, {type: featName});
            }
            else {
                const box: TCoord[] = Geometry.getBoxAround(x, y, 1);
                let placed = false;
                box.forEach((bXY: TCoord) => {
                    if (!placed && ow.isWallTile(bXY[0], bXY[1])) {
                        if (RG.isSuccess(fortProb)) {
                            ow.addFeature(bXY, OW.MFORT);
                            const featName = name + '_fort';
                            ow.addFeatureData(bXY, {type: featName});
                            placed = true;
                        }
                    }
                });
            }
        }
        else {
            if (isHome) {
                RG.err('overworld.map.ts', 'addCitiesBasedOnTerritories',
                    `isHome=true but no rival found at ${xy}`);
            }
        }
    });
}

function placeCityFeature(ow: OWMap, xy: TCoord, isHome: boolean): void {
    if (!isHome && RG.isSuccess(OW.PROB_BVILLAGE)) {
        ow.addFeature(xy, OW.BVILLAGE);
    }
    else {
        ow.addFeature(xy, OW.WVILLAGE);
    }
}

/* Checks if given cell type matches any in the array. If there's OW.CELL_ANY,
 * in the list, then returns always true regardless of type. */
function cellMatches(type: string, listOrStr): boolean {
    let list = listOrStr;
    if (typeof listOrStr === 'string') {
        list = [listOrStr];
    }
    const matchAny = list.indexOf(OW.CELL_ANY);
    if (matchAny >= 0) {return true;}

    const matchFound = list.indexOf(type);
    return matchFound >= 0;
}

/* Finds a random cell of given type from the box of coordinates. listOrStr
 * should contain cells which are allowed. */
function findCellRandXYInBox(map: string[][], bbox: BBox, listOrStr): TCoord {
    const {ulx, uly, lrx, lry} = bbox;

    let x = ulx === lrx ? ulx : getRNG().getUniformInt(ulx, lrx);
    let y = lry === uly ? lry : getRNG().getUniformInt(uly, lry);
    let watchdog = 100 * (lrx - ulx + 1) * (lry - uly + 1);

    let match = cellMatches(map[x][y], listOrStr);
    while (!match) {
        x = ulx === lrx ? ulx : getRNG().getUniformInt(ulx, lrx);
        y = lry === uly ? lry : getRNG().getUniformInt(uly, lry);
        match = cellMatches(map[x][y], listOrStr);
        if (watchdog === 0) {
            const box = `(${ulx},${lry}) -> (${lrx},${uly})`;
            RG.warn('OverWorld', 'findCellRandXYInBox',
                `No cells of type ${listOrStr} in ${box}`);
            break;
        }
        --watchdog;
    }
    return [x, y];
}

/* Given location like 'NE' (northeast), and shrink 0 - 1, plus maximum size,
 * returns a random x,y coordinate bounded by these conditions.
 */
function getRandLoc(loc, shrink, sizeX, sizeY): TCoord {
    let ulx = 0;
    let lry = 0;
    let lrx = 0;
    let uly = 0;

    // Determine the bounding coordinates for random location
    if (loc.match(/N/)) {
        uly = 0;
        lry = Math.floor(shrink * 0.25 * sizeY);
    }
    if (loc.match(/S/)) {
        lry = sizeY - 1;
        uly = 0.75 * sizeY;
        uly = Math.floor(uly + (1 - shrink) * (lry - uly));
    }
    if (loc.match(/E/)) {
        lrx = sizeX - 1;
        ulx = 0.75 * sizeX;
        ulx = Math.floor(ulx + (1 - shrink) * (lrx - ulx));
    }
    if (loc.match(/W/)) {
        ulx = 0;
        lrx = Math.floor(shrink * 0.25 * sizeX);
    }

    return [
        getRNG().getUniformInt(ulx, lrx),
        getRNG().getUniformInt(uly, lry)
    ];
}

/* Returns a bounding box object of given coordinates. */
function bBox(ulx, lry, lrx, uly) {
    if (RG.isNullOrUndef([ulx, lry, lrx, uly])) {
        RG.err('overworld.map.js', 'bBox',
            `bBox coord(s) undef/null: ${ulx},${lry},${lrx},${uly}`);
    }
    return {isBox: true, ulx, lry, lrx, uly};
}

/* Returns a bounding box (ulx, lry, lrx, uly) based on the command.
 * Formats:
 *   1. cmd: {[x|y]: {start: 'wall'|['wall', Nwall]}}
 *   2.
 * */

function getBoundingBox(ow, cmd) {
    if (cmd.isBox) {
        return cmd;
    }

    let xStart = 0;
    let xEnd = ow.getSizeX() - 1;
    let yStart = 0;
    let yEnd = ow.getSizeY() - 1;

    if (cmd.x) {
        const start = cmd.x.start;
        const end = cmd.x.end;

        // Find start position for X
        if (start === 'W') {xStart = 0;}
        else if (start === 'wall') {
            const walls = ow.getVWalls();
            if (walls.length > 0) {
                xStart = walls[0].x;
            }
        }
        else if (Array.isArray(start)) {
            if (start[0] === 'wall') {
                const walls = ow.getVWalls();
                if (walls.length > start[1]) {
                    xStart = walls[start[1]].x;
                }
            }
        }

        // Find end position for X
        if (end === 'E') {xEnd = ow.getSizeX() - 1;}
        else if (end === 'wall') {
            const walls = ow.getVWalls();
            if (walls.length > 0) {
                xEnd = walls[0].x;
            }
        }
        else if (Array.isArray(end)) {
            if (end[0] === 'wall') {
                const walls = ow.getVWalls();
                if (walls.length > end[1]) {
                    xEnd = walls[end[1]].x;
                }
            }
        }
    }

    if (cmd.y) {
        const start = cmd.y.start;
        const end = cmd.y.end;

        // Find start position for Y
        if (start === 'N') {yStart = 0;}
        else if (start === 'wall') {
            // Find first horizontal wall
            const walls = ow.getHWalls();
            if (walls.length > 0) {
                yStart = walls[0].y;
            }
        }
        else if (Array.isArray(start)) {
            if (start[0] === 'wall') {
                const walls = ow.getHWalls();
                if (walls.length > start[1]) {
                    yStart = walls[start[1]].y;
                }
            }
        }

        // Find end position for Y
        if (end === 'S') {yEnd = ow.getSizeY() - 1;}
        else if (end === 'wall') {
            const walls = ow.getHWalls();
            if (walls.length > 0) {
                yEnd = walls[0].y;
            }
        }
        else if (Array.isArray(end)) {
            if (end[0] === 'wall') {
                const walls = ow.getHWalls();
                if (walls.length > end[1]) {
                    yEnd = walls[end[1]].y;
                }
            }
        }

    } // cmd.y

    return {
        ulx: xStart, lrx: xEnd,
        uly: yStart, lry: yEnd
    };


}

OWMap.isPassable = function(ow: OWMap, x: number, y: number): boolean {
    if (x < 0 || x >= ow.getSizeX()) {return false;}
    if (y < 0 || y >= ow.getSizeY()) {return false;}
    if (ow.isWallTile(x, y)) {
        let found = false;
        if (ow.hasFeatureAt([x, y])) {
            const feats: string[] = ow.getFeaturesByXY([x, y]);
            const passable = OW.PASSABLE_FORT;
            feats.forEach((feat: string) => {
                found = found || passable.indexOf(feat) >= 0;
            });
        }
        return found;
    }
    return true;
};

OWMap.getPath = function(ow: OWMap, xy0: TCoord, xy1: TCoord): ICoordXY[] {
    const [x0, y0] = xy0;
    const [x1, y1] = xy1;

    const passableCb = (x, y) => {
        return OWMap.isPassable(ow, x, y);
    };
    const path = Path.getShortestPath(x0, y0, x1, y1, passableCb);
    return path;
};

/* Creates the overworld map and returns the created map. */
OWMap.createOverWorld = function(conf: OWMapConf = {}): OWMap {
    const yFirst = typeof conf.yFirst !== 'undefined' ? conf.yFirst : true;

    const topToBottom = typeof conf.topToBottom !== 'undefined'
        ? conf.topToBottom : true;

    const printResult = typeof conf.printResult !== 'undefined'
        ? conf.printResult : false;

    // Size of the high-level feature map
    const owTilesX = conf.owTilesX || 40;
    const owTilesY = conf.owTilesY || 20;
    const overworld = new OWMap();

    const owMap = createEmptyMap(owTilesX, owTilesY);
    randomizeBorders(owMap);
    addWallsIfAny(overworld, owMap, conf);

    addRandomInnerWalls(overworld, owMap, conf);

    if (topToBottom) {
        connectUnconnectedTopBottom(owMap, yFirst);
    }
    else {
        connectUnconnectedBottomTop(owMap, yFirst);
    }

    if (conf.printResult) {
        RG.printMap(owMap); // For debugging, keep
    }
    overworld.setMap(owMap);

    addOverWorldFeatures(overworld, conf);
    addOverWorldPaths(overworld, conf);

    // High-level overworld generation ends here

    if (printResult) {
        RG.log('\n', overworld.mapToString().join('\n')); // Print result
    }
    if (conf.verify) {
        verifyOverWorld(overworld);
    }
    return overworld;
};

/* Checks that overworld can be completed, ie there's path from start to end. */
function verifyOverWorld(ow: OWMap): void {
    let errMsg = '';
    const verifyPaths = [OW.PATH_WCAP_BTOWER, OW.PATH_BEGIN_WCAP];
    verifyPaths.forEach((name: string) => {
        const path: ICoordXY[] = ow.getPath(name);
        if (!path || path.length === 0) {
            errMsg += `Path ${name} not OK: |${JSON.stringify(path)}|\n`;
        }
    });

    if (errMsg !== '') {
        verifyPaths.forEach((name: string) => {
            const path: ICoordXY[] = ow.getPath(name);
            ow.addPathToDebug(path);
        });
        console.log(ow.mapToString());
        RG.err('overworld.map.ts', 'verifyOverWorld', errMsg);
    }
}

function getMappingToOWXY(conf: OWMapConf): [number, number] {
    const xMap = conf.owTilesX! / conf.nLevelsX!;
    const yMap = conf.owTilesY! / conf.nLevelsY!;
    return [xMap, yMap];
}

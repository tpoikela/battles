/* Contains code for generating different types of houses. This builds on
 * top of houses tiles that use Template.templ.
 */

import RG from './rg';
import {TemplateLevel} from './template.level';
import {Houses5x5} from '../data/tiles.houses';
import {Random} from './random';
import {TCoord, BBox} from './interfaces';
import {Geometry} from './geometry';

const RNG = Random.getRNG();

const WALL = '#';
const FLOOR = ':';
const DOOR = '+';

export class House {

    public coord: {[key: string]: TCoord[]};
    public map: any[][];
    public x: number;
    public y: number;
    public cX: number;
    public cY: number;
    public w: number;
    public numFloor: number;
    public h: number;
    public door: TCoord;
    public floor: TCoord[];
    public walls: TCoord[];

    constructor(map) {
        this.coord = {};
        this.map = RG.copy2D(map);
        this.trimEmpty();
        this.x = 0;
        this.y = 0;
        // Note that w,h take into account also empty space
        this.w = map.length;
        this.h = map[0].length;

        let totalX = 0;
        let totalY = 0;
        RG.forEach2D(map, (x, y, val) => {
            if (!this.coord[val]) {this.coord[val] = [];}
            this.coord[val].push([x, y]);
            if (val === FLOOR) {
                totalX += x;
                totalY += y;
            }
            else if (val === DOOR) {
                this.door = [x, y];
            }
        });

        this.floor = this.coord[FLOOR];
        this.walls = this.coord[WALL];

        const numFloor = Object.values(this.coord[WALL]).length;
        this.cX = Math.round(totalX / numFloor);
        this.cY = Math.round(totalY / numFloor);
        this.numFloor = numFloor;
    }

    public getCenter(): TCoord {
        return [this.cX, this.cY];
    }

    /* Returns the bounding box taken by this house. */
    public getBbox(): BBox {
        return {
            ulx: this.x, uly: this.y,
            lrx: this.x + this.w - 1,
            lry: this.y + this.h - 1
        };
    }

    /* Remove empty rows from the house map. */
    public trimEmpty(): void {

    }

    /* Adjusts the house coordinates based on new x,y of the house. */
    public adjustCoord(x: number, y: number): void {
        const dX = x - this.x;
        const dY = y - this.y;
        // this.x = x;
        // this.y = y;
        this.moveHouse(dX, dY);
    }

    /* Same as adjustCoord() but args must be difference in x,y, not a
     * new absolute location. */
    public moveHouse(dX: number, dY: number): void {
        this.x += dX;
        this.y += dY;
        Object.keys(this.coord).forEach(key => {
            const coord = this.coord[key];
            coord.forEach(xy => {
                xy[0] += dX;
                xy[1] += dY;
            });
        });
        this.cX += dX;
        this.cY += dY;
        this.door = [this.door[0] + dX, this.door[1] + dY];
    }

    /* Tries to add given number of windows to the house. Returns the number
     * of windows actually added. */
    public addWindows(nWindows: number): number {
        this.coord.windows = [];
        const walls = this.coord[WALL].slice();
        let nCreated = 0;
        RNG.shuffle(walls);
        const wallLut: any = {};
        walls.forEach(xy => {
            wallLut[xy[0] + ',' + xy[1]] = true;
        });
        this.coord[DOOR].forEach(xy => {
            wallLut[xy[0] + ',' + xy[1]] = false;
        });

        for (let i = 0; i < walls.length; i++) {
            if (nCreated === nWindows) {break;} // We're already done
            const xy = walls[i];
            const nFound = [];
            const box: TCoord[] = Geometry.getBoxAround(xy[0], xy[1], 1);
            box.forEach((nXY: TCoord) => {
                if (wallLut[nXY[0] + ',' + nXY[1]]) {
                    nFound.push(nXY);
                }
            });

            // If there are exactly 2 walls adjacent, add a window
            if (nFound.length === 2 && ((nCreated < nWindows) || nWindows === -1)) {
                if (this.windowPosOk(xy, nFound)) {
                    this.coord.windows.push(xy);
                    wallLut[xy[0] + ',' + xy[1]] = false;
                    ++nCreated;
                }
            }
        }

        this.coord.windows.forEach(xy => {
            const index = this.walls.findIndex(sXY => (
                sXY[0] === xy[0] && sXY[1] === xy[1]
            ));
            this.walls.splice(index, 1);
        });
        return nCreated;
    }

    /* Returns true if window position is OK for the wall. */
    public windowPosOk(xy: TCoord, coord: TCoord[]): boolean {
        const [x, y] = xy;
        const [x1, y1] = coord[0];
        const [x2, y2] = coord[1];
        if (x === x1) {
            return Math.abs(y1 - y2) === 2;
        }
        else if (y === y1) {
            return Math.abs(x1 - x2) === 2;
        }
        return false;
    }
}

export class HouseGenerator {
    public baseSizeX: number;
    public baseSizeY: number;

    constructor() {
        // For a 5x5 house tiles
        this.baseSizeX = 2 + 1;
        this.baseSizeY = 2 + 1;
    }

    public createHouse(conf): House {
        const {cols, rows} = conf;
        const {fullHouse} = conf;
        const params = this.getGenParams(cols, rows);
        const {genParamsX, genParamsY} = params;
        let {tilesX, tilesY} = params;

        if (!Number.isInteger(tilesX) || !Number.isInteger(tilesY)) {
            // Could not solve good value for tile sizes
            if (tilesX > 1) {tilesX = Math.floor(tilesX);}
            else {return null;}

            if (tilesY > 1) {tilesY = Math.floor(tilesY);}
            else {return null;}
        }

        const templ = new TemplateLevel(tilesX, tilesY);

        templ.setFiller(Houses5x5.tiles.filler);
        templ.setTemplates(Houses5x5.templates.all);

        templ.setGenParams({x: genParamsX, y: genParamsY});

        templ.roomCount = -1; // Any number of tiles OK
        if (fullHouse) {
            templ.roomCount = tilesX * tilesY;
            templ.roomCount -= 1; // Entrance
        }
        templ.setStartRoomFunc(Houses5x5.startRoomFunc);
        templ.create();

        // RG.printMap(templ.map);
        const createdHouse = new House(templ.map);
        if (conf.addWindows) {
            const nWindows = tilesX * tilesY;
            createdHouse.addWindows(RNG.getUniformInt(1, nWindows));
        }

        return createdHouse;
    }

    /* Returns the params needed to generate the house, such as number of
     * tiles and generator params. */
    public getGenParams(cols, rows) {
        const sizeX = this.baseSizeX;
        const sizeY = this.baseSizeY;
        let x0 = RNG.getUniformInt(1, 3);
        let x2 = RNG.getUniformInt(1, 3);

        let currSizeX = sizeX + x0 + x2;
        let watchdogX = 100;
        while (cols % currSizeX !== 0) {
            x0 = RNG.getUniformInt(1, 3);
            x2 = RNG.getUniformInt(1, 3);
            currSizeX = sizeX + x0 + x2;
            if (--watchdogX === 0) {break;}
        }
        const tilesX = cols / currSizeX;
        const genParamsX = [x0, 1, x2];

        let y0 = RNG.getUniformInt(1, 3);
        let y2 = RNG.getUniformInt(1, 3);
        let currSizeY = sizeY + y0 + y2;
        let watchdogY = 100;
        while (rows % currSizeY !== 0) {
            y0 = RNG.getUniformInt(1, 3);
            y2 = RNG.getUniformInt(1, 3);
            currSizeY = sizeY + y0 + y2;
            if (--watchdogY === 0) {break;}
        }
        const tilesY = rows / currSizeY;
        const genParamsY = [y0, 1, y2];

        return {
            tilesX, tilesY, genParamsX, genParamsY
        };
    }
}

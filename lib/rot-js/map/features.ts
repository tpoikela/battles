import RNG from '../rng';

import {Graph} from 'graphlib';

interface RoomOptions {
    roomWidth: [number, number];
    roomHeight: [number, number];
}

interface CorridorOptions {
    corridorLength: [number, number];
}

interface FeatureOptions extends RoomOptions, CorridorOptions {};

export interface FeatureConstructor {
    createRandomAt: (x: number, y: number, dx: number, dy: number, options: FeatureOptions) => Feature;
}

type DigCallback = (x: number, y: number, value: number) => void;
type TestPositionCallback = (x: number, y: number) => boolean;

/**
 * @class Dungeon feature; has own .create() method
 */
abstract class Feature {
    abstract isValid(isWallCallback: TestPositionCallback,
                     canBeDugCallback: TestPositionCallback): boolean;
    abstract create(digCallback: DigCallback): void;
    abstract debug(): void;

    abstract getID(): number;
    abstract getName(): string;
}

/**
 * @class Room
 * @augments ROT.Map.Feature
 * @param {int} x1
 * @param {int} y1
 * @param {int} x2
 * @param {int} y2
 * @param {int} [doorX]
 * @param {int} [doorY]
 */
export class Room extends Feature {

    static id: number;

    _x1: number;
    _y1: number;
    _x2: number;
    _y2: number;
    _doors: { [key:string]: number };
    _feats: { [key:string]: string[] };
    _stairs: { [key:string]: boolean };
    _roomID: number;

    constructor(x1: number, y1: number, x2: number, y2: number, doorX?: number, doorY?: number) {
        super();
        this._x1 = x1;
        this._y1 = y1;
        this._x2 = x2;
        this._y2 = y2;

        this._doors = {};
        this._feats = {};
        this._stairs = {};

        if (doorX !== undefined && doorY !== undefined) {
            this.addDoor(doorX, doorY);
        }
        this._roomID = Room.id++;
    };

    /**
	 * Room of random size, with a given doors and direction
	 */
    static createRandomAt(x:number, y:number, dx:number, dy:number, options: RoomOptions): Room {
        let min = options.roomWidth[0];
        let max = options.roomWidth[1];
        const width = RNG.getUniformInt(min, max);

        min = options.roomHeight[0];
        max = options.roomHeight[1];
        const height = RNG.getUniformInt(min, max);

        if (dx === 1) { /* to the right */
            const y2 = y - Math.floor(RNG.getUniform() * height);
            return new this(x+1, y2, x+width, y2+height-1, x, y);
        }

        if (dx === -1) { /* to the left */
            const y2 = y - Math.floor(RNG.getUniform() * height);
            return new this(x-width, y2, x-1, y2+height-1, x, y);
        }

        if (dy === 1) { /* to the bottom */
            const x2 = x - Math.floor(RNG.getUniform() * width);
            return new this(x2, y+1, x2+width-1, y+height, x, y);
        }

        if (dy === -1) { /* to the top */
            const x2 = x - Math.floor(RNG.getUniform() * width);
            return new this(x2, y-height, x2+width-1, y-1, x, y);
        }

        throw new Error('dx or dy must be 1 or -1');
    }

    /*
     * Room of specified size, positioned exactly at center coords
     */
    static createCenter(cx: number, cy: number, options: RoomOptions): Room {
        let min = options.roomWidth[0];
        let max = options.roomWidth[1];
        const width = RNG.getUniformInt(min, max);

        min = options.roomHeight[0];
        max = options.roomHeight[1];
        const height = RNG.getUniformInt(min, max);

        const x1 = cx - Math.floor(width / 2);
        const y1 = cy - Math.floor(height / 2);
        const x2 = x1 + width - 1;
        const y2 = y1 + height - 1;

        return new this(x1, y1, x2, y2);
    };

    /**
	 * Room of random size, positioned around center coords
	 */
    static createRandomCenter(cx: number, cy: number, options: RoomOptions): Room {
        let min = options.roomWidth[0];
        let max = options.roomWidth[1];
        const width = RNG.getUniformInt(min, max);

        min = options.roomHeight[0];
        max = options.roomHeight[1];
        const height = RNG.getUniformInt(min, max);

        const x1 = cx - Math.floor(RNG.getUniform()*width);
        const y1 = cy - Math.floor(RNG.getUniform()*height);
        const x2 = x1 + width - 1;
        const y2 = y1 + height - 1;

        return new this(x1, y1, x2, y2);
    }

    /**
	 * Room of random size within a given dimensions
	 */
    static createRandom(availWidth: number, availHeight: number, options: RoomOptions) {
        let min = options.roomWidth[0];
        let max = options.roomWidth[1];
        const width = RNG.getUniformInt(min, max);

        min = options.roomHeight[0];
        max = options.roomHeight[1];
        const height = RNG.getUniformInt(min, max);

        const left = availWidth - width - 1;
        const top = availHeight - height - 1;

        const x1 = 1 + Math.floor(RNG.getUniform()*left);
        const y1 = 1 + Math.floor(RNG.getUniform()*top);
        const x2 = x1 + width - 1;
        const y2 = y1 + height - 1;

        return new this(x1, y1, x2, y2);
    }

    addDoor(x: number, y: number) {
        this._doors[x+','+y] = 1;
        return this;
    }

    addStairs (x, y, isDown: boolean) {
        this._stairs[x + ',' + y] = isDown;
        return this;
    }

    hasStairs(x, y) {
        return Object.keys(this._stairs).length > 0;
    }

    hasStairsUp(x, y) {
        const vals = Object.values(this._stairs);
        for (let i = 0; i < vals.length; i++) {
            if (vals[i] === false) {
                return true;
            }
        }
        return false;
    }

    /* Adds a feature to the room. */
    add(name: string, x, y): void {
        if (!this._feats[x + ',' + y]) {
            this._feats[x + ',' + y] = [];
        }
        this._feats[x + ',' + y].push(name);
    }

    /**
	 * @param {function}
	 */
    getDoors(cb: (x:number, y:number) => void) {
        for (const key in this._doors) {
            const parts = key.split(',');
            cb(parseInt(parts[0]), parseInt(parts[1]));
        }
        return this;
    }

    clearDoors() {
        this._doors = {};
        return this;
    }

    addDoors(isWallCallback: TestPositionCallback) {
        const left = this._x1-1;
        const right = this._x2+1;
        const top = this._y1-1;
        const bottom = this._y2+1;

        for (let x=left; x<=right; x++) {
            for (let y=top; y<=bottom; y++) {
                if (x != left && x != right && y != top && y != bottom) { continue; }
                if (isWallCallback(x, y)) { continue; }

                this.addDoor(x, y);
            }
        }

        return this;
    }

    debug() {
        console.log('room', this._x1, this._y1, this._x2, this._y2);
    }

    isValid(isWallCallback: TestPositionCallback, canBeDugCallback: TestPositionCallback) {
        const left = this._x1-1;
        const right = this._x2+1;
        const top = this._y1-1;
        const bottom = this._y2+1;

        for (let x=left; x<=right; x++) {
            for (let y=top; y<=bottom; y++) {
                if (x === left || x === right || y === top || y === bottom) {
                    if (!isWallCallback(x, y)) { return false; }
                } else {
                    if (!canBeDugCallback(x, y)) { return false; }
                }
            }
        }

        return true;
    }

    /**
	 * @param {function} digCallback Dig callback with a signature (x, y, value). Values: 0 = empty, 1 = wall, 2 = door. Multiple doors are allowed.
	 */
    create(digCallback: DigCallback) {
        const left = this._x1-1;
        const right = this._x2+1;
        const top = this._y1-1;
        const bottom = this._y2+1;

        let value = 0;
        for (let x=left; x<=right; x++) {
            for (let y=top; y<=bottom; y++) {
                if (x+','+y in this._doors) {
                    value = 2;
                } else if (x == left || x == right || y == top || y == bottom) {
                    value = 1;
                } else {
                    value = 0;
                }
                digCallback(x, y, value);
            }
        }
    }

    getCenter() {
        return [Math.round((this._x1 + this._x2)/2), Math.round((this._y1 + this._y2)/2)];
    }

    getLeft() { return this._x1; }
    getRight() { return this._x2; }
    getTop() { return this._y1; }
    getBottom() { return this._y2; }

    // NOTE: These 2 functions have bug, and should have +1 in them
    getWidth() {
        return this._x2 - this._x1;
    }

    getHeight(): number {
        return this._y2 - this._y1;
    }

    getCorners() {
        return {
            nw: [this._x1, this._y1],
            ne: [this._x2, this._y1],
            sw: [this._x1, this._y2],
            se: [this._x2, this._y2]
        };
    }

    isTerm(): boolean {
        return Object.keys(this._doors).length === 1;
    }

    getName(): string {
        return 'room_' + this._roomID;
    }

    getID(): number {
        return this._roomID;
    }

    setID(id: number): void {
        this._roomID = id;
    }

/* tpoikela: Returns the bounding box of the room. */
    getBbox() {
        return {
            ulx: this._x1, uly: this._y1,
            lrx: this._x2, lry: this._y2
        };
    }

    getOuterBbox() {
        return {
            ulx: this._x1 - 1, uly: this._y1 - 1,
            lrx: this._x2 + 1, lry: this._y2 + 1
        };
    }

    /* Returns the inner bounding box (thus excluding walls of the room). */
    getInnerBbox(halo = 1) {
        const ulx = this._x1 + halo;
        const lrx = this._x2 - halo;
        if (ulx > lrx) {return {};}
        const uly = this._y1 + halo;
        const lry = this._y2 - halo;
        if (uly > lry) {return {};}
        return {ulx, uly, lrx, lry};
    }

    getXY(): [number, number][] {
        const res = [];
        const {ulx, uly, lrx, lry} = this.getInnerBbox(1);
        for (let x = ulx;  x <= lrx; ++x) {
            for (let y = uly;  y <= lry; ++y) {
                res.push([x, y]);
            }
        }
        // Need to add also door tiles for better connectivity info
        Object.keys(this._doors).forEach((xyStr: string) => {
            const [x, y] = xyStr.split(',');
            res.push([x, y]);
        });
        return res;
    }

    getAreaSize(): number {
        return (this._x2 - this._x1) * (this._y2 - this._y1);
    }
}

/**
 * @class Corridor
 * @augments ROT.Map.Feature
 * @param {int} startX
 * @param {int} startY
 * @param {int} endX
 * @param {int} endY
 */
export class Corridor extends Feature {

    static id: number;

    _startX: number;
    _startY: number;
    _endX: number;
    _endY: number;
    _endsWithAWall: boolean;
    _corrID: number;

    constructor(startX: number, startY: number, endX: number, endY: number) {
        super();
        this._startX = startX;
        this._startY = startY;
        this._endX = endX;
        this._endY = endY;
        this._endsWithAWall = true;
        this._corrID = Corridor.id++;
    }

    getID(): number {
        return this._corrID;
    }

    getName(): string {
        return 'corr_' + this._corrID;
    }

    static createRandomAt(x: number, y: number, dx: number, dy: number, options: CorridorOptions) {
        const min = options.corridorLength[0];
        const max = options.corridorLength[1];
        const length = RNG.getUniformInt(min, max);

        return new this(x, y, x + dx*length, y + dy*length);
    }

    debug() {
        console.log('corridor', this._startX, this._startY, this._endX, this._endY);
    }

    isValid(isWallCallback: TestPositionCallback, canBeDugCallback: TestPositionCallback){
        const sx = this._startX;
        const sy = this._startY;
        let dx = this._endX-sx;
        let dy = this._endY-sy;
        let length = 1 + Math.max(Math.abs(dx), Math.abs(dy));

        if (dx) { dx = dx/Math.abs(dx); }
        if (dy) { dy = dy/Math.abs(dy); }
        const nx = dy;
        const ny = -dx;

        let ok = true;
        for (let i=0; i<length; i++) {
            const x = sx + i*dx;
            const y = sy + i*dy;

            if (!canBeDugCallback(     x,      y)) { ok = false; }
            if (!isWallCallback  (x + nx, y + ny)) { ok = false; }
            if (!isWallCallback  (x - nx, y - ny)) { ok = false; }

            if (!ok) {
                length = i;
                this._endX = x-dx;
                this._endY = y-dy;
                break;
            }
        }

        /**
		 * If the length degenerated, this corridor might be invalid
		 */

        /* not supported */
        if (length == 0) { return false; }

         /* length 1 allowed only if the next space is empty */
        if (length == 1 && isWallCallback(this._endX + dx, this._endY + dy)) { return false; }

        /**
		 * We do not want the corridor to crash into a corner of a room;
		 * if any of the ending corners is empty, the N+1th cell of this corridor must be empty too.
		 *
		 * Situation:
		 * #######1
		 * .......?
		 * #######2
		 *
		 * The corridor was dug from left to right.
		 * 1, 2 - problematic corners, ? = N+1th cell (not dug)
		 */
        const firstCornerBad = !isWallCallback(this._endX + dx + nx, this._endY + dy + ny);
        const secondCornerBad = !isWallCallback(this._endX + dx - nx, this._endY + dy - ny);
        this._endsWithAWall = isWallCallback(this._endX + dx, this._endY + dy);
        if ((firstCornerBad || secondCornerBad) && this._endsWithAWall) { return false; }

        return true;
    }

    /**
	 * @param {function} digCallback Dig callback with a signature (x, y, value). Values: 0 = empty.
	 */
    create(digCallback: DigCallback) {
        /*
        const sx = this._startX;
        const sy = this._startY;
        let dx = this._endX-sx;
        let dy = this._endY-sy;
        const length = 1+Math.max(Math.abs(dx), Math.abs(dy));

        if (dx) { dx = dx/Math.abs(dx); }
        if (dy) { dy = dy/Math.abs(dy); }

        for (let i=0; i<length; i++) {
            const x = sx + i*dx;
            const y = sy + i*dy;
            digCallback(x, y, 0);
        }
        */

        const xy: [number, number][] = this.getXY();
        for (let i=0; i<xy.length; i++) {
            const [x, y] = xy[i];
            digCallback(x, y, 0);
        }

        return true;
    }

    /* Returns x,y coordinates belonging into this corridor. */
    getXY(): [number, number][] {
        const res = [];
        const sx = this._startX;
        const sy = this._startY;
        let dx = this._endX-sx;
        let dy = this._endY-sy;
        const length = 1+Math.max(Math.abs(dx), Math.abs(dy));

        if (dx) { dx = dx/Math.abs(dx); }
        if (dy) { dy = dy/Math.abs(dy); }

        for (let i=0; i<length; i++) {
            const x = sx + i*dx;
            const y = sy + i*dy;
            res.push([x, y]);
        }
        return res;
    }

    createPriorityWalls(priorityWallCallback: (x:number, y:number) => void) {
        if (!this._endsWithAWall) { return; }

        const sx = this._startX;
        const sy = this._startY;

        let dx = this._endX-sx;
        let dy = this._endY-sy;
        if (dx) { dx = dx/Math.abs(dx); }
        if (dy) { dy = dy/Math.abs(dy); }
        const nx = dy;
        const ny = -dx;

        priorityWallCallback(this._endX + dx, this._endY + dy);
        priorityWallCallback(this._endX + nx, this._endY + ny);
        priorityWallCallback(this._endX - nx, this._endY - ny);
    }
}

Room.id = 0;
Corridor.id = 0;

export class RoomGraph {

    public graph: Graph;

    constructor() {
        // Rooms can be travelled to both directions
        this.graph = new Graph({directed: false});
    }

    addRoom(room: Room): void {
        this.graph.setNode(room.getName(), room);
    }

    connectRooms(r1: Room, r2: Room): void {
        this.graph.setEdge(r1.getName(), r2.getName());
    }

    isTerm(room: Room): boolean {
        const edges = this.graph.nodeEdges(room.getName());
        if (edges) {
            return edges.length === 1;
        }
        return false;
    }

}

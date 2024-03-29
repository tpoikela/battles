
/* Code for generating a binary space partition (BSP) tree.
 * Modified for roguelike level generation. Added few utility methods and
 * removed all canvas-related code.
 *
 * Original code can be found from: https://eskerda.com/bsp-dungeon-generation/
 */
// import * as ROT from './rot-js';

import {Random} from '../client/src/random';

const RNG = Random.getRNG();

export const BSP: any = {};

type ArrayCoord = ([number, number])[];

const OPTS = {
    discardByRatio: true,
    hRatio: 0.35,
    wRatio: 0.35,
    vertSplit: 0.5,
    minSplitW: 8,
    minSplitH: 8,
    discardBySize: true,
    minRoomW: 3,
    minRoomH: 2
};

type TLeaf = any;

export class Tree {

    public lchild: Tree | null;
    public rchild: Tree | null;
    public leaf: TLeaf;

    constructor(leaf: TLeaf) {
        this.leaf = leaf;
        this.lchild = null;
        this.rchild = null;
    }

    public getLeafs(): TLeaf[] {
        if (this.lchild === null && this.rchild === null) {
            return [this.leaf];
        }
        else {
            return [].concat(this.lchild.getLeafs(),
                this.rchild.getLeafs());
        }
    }

    public getLevel(level: number, queue) {
        if (!queue) {
            queue = [];
        }

        if (level === 1) {
            queue.push(this);
        }
        else {
            if (this.lchild !== null) {
                this.lchild.getLevel(level - 1, queue);
            }
            if (this.rchild !== null) {
                this.rchild.getLevel(level - 1, queue);
            }
        }
        return queue;
    }
}

BSP.Tree = Tree;

export class Point {
    constructor(public x: number, public y: number) {
    }
}

export class Container {
    public x: number;
    public y: number;
    public w: number;
    public h: number;
    public center: Point;

    constructor(x: number, y: number, w: number, h: number) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.center = new Point(
            this.x + Math.floor(this.w / 2),
            this.y + Math.floor(this.h / 2)
        );
    }
}
BSP.Container = Container;

//--------------
// Room object
//--------------
export class Room {
    public static rng: any;

    public x: number;
    public y: number;
    public h: number;
    public w: number;

    constructor(container: Container) {
        this.x = container.x + Room.rng.getUniformInt(1, Math.floor(container.w / 3));
        this.y = container.y + Room.rng.getUniformInt(1, Math.floor(container.h / 3));
        this.w = container.w - (this.x - container.x) - 1;
        this.h = container.h - (this.y - container.y) - 1;
        this.w -= Room.rng.getUniformInt(0, this.w / 3);
        this.h -= Room.rng.getUniformInt(0, this.h / 3);
        if (this.w < OPTS.minRoomW) {this.w = OPTS.minRoomW;}
        if (this.h < OPTS.minRoomH) {this.h = OPTS.minRoomH;}
        return this;
    }

    /* Returns all x,y coordinates occupied by the room. */
    public getCoord(): ArrayCoord {
        const coord: ([number, number])[] = [];
        const startX = this.x;
        const endX = startX + (this.w - 1);
        const startY = this.y;
        const endY = startY + (this.h - 1);
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                coord.push([x, y]);
            }
        }
        return coord;
    }

    /* Returns coordinates directly outside the room. */
    public getOuterBorder() {
        const [x0, y0] = [this.x - 1, this.y - 1];
        const [maxX, maxY] = [this.x + this.w + 1, this.y + this.h + 1];
        return getHollowBox(x0, y0, maxX, maxY);
    }

    /* Returns the coordinates of the outmost free space of the room. */
    public getInnerBorder() {
        const [x0, y0] = [this.x, this.y];
        const [maxX, maxY] = [this.x + this.w - 1, this.y + this.h - 1];
        return getHollowBox(x0, y0, maxX, maxY);
    }
}
Room.rng = RNG;

BSP.Room = Room;

function getHollowBox(x0, y0, maxX, maxY) {
    const res = [];
    for (let x = x0; x <= maxX; x++) {
        for (let y = y0; y <= maxY; y++) {
            if ((y === y0 || y === maxY || x === x0 || x === maxX) ) {
                res.push([x, y]);
            }
        }
    }
    return res;

}

/* Main class of the BSP. Used to generate the tree and the features. */
export class BSPGen {
    public rng: any;
    public generated: any;
    private _opts: {[key: string]: any};

    constructor(opts = {}) {
        this._opts = OPTS;
        Object.keys(opts).forEach(key => {
            if (this._opts.hasOwnProperty(key)) {
                this._opts[key] = opts;
            }
        });
        this.rng = this._opts.rng || RNG;
    }

    /* Creates and returns coordinates for path between containers c1 and c2. */
    public createPath(c1: Container, c2: Container): ArrayCoord {
        const path: ArrayCoord = [];
        const center1 = c1.center;
        const center2 = c2.center;
        if (center1.x === center2.x) { // vertical
            const startY = center1.y > center2.y ? center2.y : center1.y;
            const endY = center1.y < center2.y ? center2.y : center1.y;
            // TODO randomize x
            for (let y = startY; y <= endY; y++) {
                path.push([center1.x, y]);
            }
        }
        else { // horizontal path
            const startX = center1.x > center2.x ? center2.x : center1.x;
            const endX = center1.x < center2.x ? center2.x : center1.x;
            // TODO randomize y
            for (let x = startX; x <= endX; x++) {
                path.push([x, center1.y]);
            }
        }
        return path;
    }

    public splitContainer(container, iter) {
        const root = new Tree(container);
        if (this.isLargeEnough(container)) {
            if (iter !== 0) {
                const sr = this.randomSplit(container);
                root.lchild = this.splitContainer(sr[0], iter - 1);
                root.rchild = this.splitContainer(sr[1], iter - 1);
            }
        }
        return root;
    }

    public isLargeEnough(cont) {
        if (this._opts.discardBySize) {
            return cont.w >= this._opts.minSplitW && cont.h >= this._opts.minSplitH;
        }
        return true;
    }

    public randomSplit(container) {
        let r1;
        let r2;
        if (this.rng.getUniform() <= this._opts.vertSplit) {
            // Vertical
            r1 = new Container(
                container.x, container.y, // r1.x, r1.y
                this.rng.getUniformInt(1, container.w), container.h // r1.w, r1.h
            );
            r2 = new Container(
                container.x + r1.w, container.y, // r2.x, r2.y
                container.w - r1.w, container.h // r2.w, r2.h
            );

            if (this._opts.discardByRatio) {
                if (this.isVRatioTooSmall(r1, r2)) {
                    return this.randomSplit(container);
                }
            }
        }
        else {
            // Horizontal
            r1 = new Container(
                container.x, container.y, // r1.x, r1.y
                container.w, this.rng.getUniformInt(1, container.h) // r1.w, r1.h
            );
            r2 = new Container(
                container.x, container.y + r1.h, // r2.x, r2.y
                container.w, container.h - r1.h // r2.w, r2.h
            );

            if (this._opts.discardByRatio) {
                if (this.isHRatioTooSmall(r1, r2)) {
                    return this.randomSplit(container);
                }
            }
        }
        return [r1, r2];
    }

    public isVRatioTooSmall(r1, r2) {
        const r1Wratio = r1.w / r1.h;
        const r2Wratio = r2.w / r2.h;
        return r1Wratio < this._opts.wRatio || r2Wratio < this._opts.wRatio;
    }

    public isHRatioTooSmall(r1, r2) {
        const r1Hratio = r1.h / r1.w;
        const r2Hratio = r2.h / r2.w;
        return r1Hratio < this._opts.hRatio || r2Hratio < this._opts.hRatio;
    }

    /* Creates a tree container with BSP and generates rooms based on the tree.
     * Each room is surrounded by wall, so now room spaces are merged together
     */
    public createWithRooms(cols, rows, iter = 5) {
        const mainContainer = new Container(0, 0, cols, rows);
        const containerTree = this.splitContainer(mainContainer, iter);

        const leafs = containerTree.getLeafs();
        const rooms = [];
        leafs.forEach(leaf => {
            rooms.push(new Room(leaf));
        });

        this.generated = {
            tree: containerTree, rooms
        };

        return [containerTree, rooms];
    }

    public createWithRoomsAndPaths(cols: number, rows: number, iter = 5) {
        const mainContainer = new Container(0, 0, cols, rows);
        const containerTree = this.splitContainer(mainContainer, iter);

        const leafs = containerTree.getLeafs();
        const rooms: Room[] = [];
        leafs.forEach(leaf => {
            rooms.push(new Room(leaf));
        });

        const paths: ArrayCoord[] = [];
        this.createPaths(containerTree, paths);

        this.generated = {
            tree: containerTree, rooms, paths
        };
        return [containerTree, rooms, paths];
    }

    /* Creates paths between the nodes of the tree. These paths are placed into
     * paths variable. Each path is an array of coordinates.
     */
    public createPaths(tree: Tree, paths: ArrayCoord[]): ArrayCoord[] {
        if (tree.lchild === null || tree.rchild === null) {
            return [];
        }
        const path: ArrayCoord = this.createPath(tree.lchild.leaf, tree.rchild.leaf);
        if (path.length > 0) {
            paths.push(path);
        }
        this.createPaths(tree.lchild, paths);
        this.createPaths(tree.rchild, paths);
        return paths;
    }

    public get(prop: string): any {
        if (this.generated.hasOwnProperty(prop)) {
            return this.generated[prop];
        }
        return null;
    }
}

BSP.BSPGen = BSPGen;

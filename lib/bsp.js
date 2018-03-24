
/* Code for generating a binary space partition (BSP) tree.
 * Modified for roguelike level generation. Added few utility methods and
 * removed all canvas-related code.
 *
 * Original code can be found from: https://eskerda.com/bsp-dungeon-generation/
 */
const ROT = require('./rot');

const rng = ROT.RNG;
const BSP = {};

const DISCARD_BY_RATIO = true;
const H_RATIO = 0.2;
const W_RATIO = 0.2;
const VERT_SPLIT = 0.4;

const MIN_SPLIT_W = 20;
const MIN_SPLIT_H = 20;

const Tree = function( leaf ) {
    this.leaf = leaf;
    this.lchild = null;
    this.rchild = null;
};
BSP.Tree = Tree;

Tree.prototype.getLeafs = function() {
    if (this.lchild === null && this.rchild === null) {
        return [this.leaf];
    }
    else {
        return [].concat(this.lchild.getLeafs(),
            this.rchild.getLeafs());
    }
};

Tree.prototype.getLevel = function(level, queue) {
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
};

const Point = function(x, y) {
    this.x = x;
    this.y = y;
};


const Container = function(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.center = new Point(
        this.x + Math.floor(this.w / 2),
        this.y + Math.floor(this.h / 2)
    );
};
BSP.Container = Container;

/* Creates and returns coordinates for path between containers c1 and c2. */
Container.createPath = function(c1, c2) {
    const path = [];
    const center1 = c1.center;
    const center2 = c2.center;
    if (center1.x === center2.x) { // vertical
        const startY = center1.y > center2.y ? center2.y : center1.y;
        const endY = center1.y < center2.y ? center2.y : center1.y;
        for (let y = startY; y <= endY; y++) {
            path.push([center1.x, y]);
        }
    }
    else { // horizontal path
        const startX = center1.x > center2.x ? center2.x : center1.x;
        const endX = center1.x < center2.x ? center2.x : center1.x;
        for (let x = startX; x <= endX; x++) {
            path.push([x, center1.y]);
        }
    }
    return path;
};

function splitContainer(container, iter) {
    const root = new Tree(container);
    if (isLargeEnough(container)) {
        if (iter !== 0) {
            const sr = randomSplit(container);
            root.lchild = splitContainer(sr[0], iter - 1);
            root.rchild = splitContainer(sr[1], iter - 1);
        }
    }
    return root;
}
BSP.splitContainer = splitContainer;

function isLargeEnough(cont) {
    return cont.w >= MIN_SPLIT_W && cont.h >= MIN_SPLIT_H;
}

function randomSplit(container) {
    let r1, r2;
    if (rng.getUniform() <= VERT_SPLIT) {
        // Vertical
        r1 = new Container(
            container.x, container.y, // r1.x, r1.y
            rng.getUniformInt(1, container.w), container.h // r1.w, r1.h
        );
        r2 = new Container(
            container.x + r1.w, container.y, // r2.x, r2.y
            container.w - r1.w, container.h // r2.w, r2.h
        );

        if (DISCARD_BY_RATIO) {
            const r1Wratio = r1.w / r1.h;
            const r2Wratio = r2.w / r2.h;
            if (r1Wratio < W_RATIO || r2Wratio < W_RATIO) {
                return randomSplit(container);
            }
        }
    }
    else {
        // Horizontal
        r1 = new Container(
            container.x, container.y, // r1.x, r1.y
            container.w, rng.getUniformInt(1, container.h) // r1.w, r1.h
        );
        r2 = new Container(
            container.x, container.y + r1.h, // r2.x, r2.y
            container.w, container.h - r1.h // r2.w, r2.h
        );

        if (DISCARD_BY_RATIO) {
            const r1Hratio = r1.h / r1.w;
            const r2Hratio = r2.h / r2.w;
            if (r1Hratio < H_RATIO || r2Hratio < H_RATIO) {
                return randomSplit(container);
            }
        }
    }
    return [r1, r2];
}

//--------------
// Room object
//--------------
const Room = function( container ) {
    this.x = container.x + rng.getUniformInt(1, Math.floor(container.w / 3));
    this.y = container.y + rng.getUniformInt(1, Math.floor(container.h / 3));
    this.w = container.w - (this.x - container.x) - 1;
    this.h = container.h - (this.y - container.y) - 1;
    this.w -= rng.getUniformInt(0, this.w / 3);
    this.h -= rng.getUniformInt(0, this.h / 3);
    return this;
};

/* Returns all x,y coordinates occupied by the room. */
Room.prototype.getCoord = function() {
    const coord = [];
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
};

/* Creates a tree container with BSP and generates rooms based on the tree. 
 * Each room is surrounded by wall, so now room spaces are merged together 
 */
function createWithRooms(cols, rows, iter = 5) {
    const mainContainer = new Container(0, 0, cols, rows);
    const containerTree = splitContainer(mainContainer, iter);

    const leafs = containerTree.getLeafs();
    const rooms = [];
    leafs.forEach(leaf => {
        rooms.push(new Room(leaf));
    });

    return [containerTree, rooms];
}
BSP.createWithRooms = createWithRooms;

function createWithRoomsAndPaths(cols, rows, iter = 5) {
    const mainContainer = new Container(0, 0, cols, rows);
    const containerTree = splitContainer(mainContainer, iter);

    const leafs = containerTree.getLeafs();
    const rooms = [];
    leafs.forEach(leaf => {
        rooms.push(new Room(leaf));
    });

    const paths = [];
    createPaths(containerTree, paths);

    return [containerTree, rooms, paths];
}
BSP.createWithRoomsAndPaths = createWithRoomsAndPaths;

/* Creates paths between the nodes of the tree. These paths are placed into
 * paths variable. Each path is an array of coordinates.
 */
const createPaths = function(tree, paths) {
    if (tree.lchild === null || tree.rchild === null) {
        return [];
    }
    const path = Container.createPath(tree.lchild.leaf, tree.rchild.leaf);
    if (path.length > 0) {
        paths.push(path);
    }
    createPaths(tree.lchild, paths);
    createPaths(tree.rchild, paths);
    return paths;
};
BSP.createPaths = createPaths;

module.exports = BSP;

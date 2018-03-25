
/* Code for generating a binary space partition (BSP) tree.
 * Modified for roguelike level generation. Added few utility methods and
 * removed all canvas-related code.
 *
 * Original code can be found from: https://eskerda.com/bsp-dungeon-generation/
 */
const ROT = require('./rot');

const rng = ROT.RNG;
const BSP = {};

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
    if (this.w < OPTS.minRoomW) {this.w = OPTS.minRoomW;}
    if (this.h < OPTS.minRoomH) {this.h = OPTS.minRoomH;}
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

/* Returns coordinates directly outside the room. */
Room.prototype.getOuterBorder = function() {
    const [x0, y0] = [this.x - 1, this.y - 1];
    const [maxX, maxY] = [this.x + this.w + 1, this.y + this.h + 1];
    return getHollowBox(x0, y0, maxX, maxY);
};

/* Returns the coordinates of the outmost free space of the room. */
Room.prototype.getInnerBorder = function() {
    const [x0, y0] = [this.x, this.y];
    const [maxX, maxY] = [this.x + this.w - 1, this.y + this.h - 1];
    return getHollowBox(x0, y0, maxX, maxY);
};

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
const BSPGen = function(opts = {}) {
    this._opts = OPTS;
    Object.keys(opts).forEach(key => {
        if (this._opts.hasOwnProperty(key)) {
            this._opts[key] = opts;
        }
    });
};
BSP.BSPGen = BSPGen;

/* Creates and returns coordinates for path between containers c1 and c2. */
BSPGen.prototype.createPath = function(c1, c2) {
    const path = [];
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
};

BSPGen.prototype.splitContainer = function(container, iter) {
    const root = new Tree(container);
    if (this.isLargeEnough(container)) {
        if (iter !== 0) {
            const sr = this.randomSplit(container);
            root.lchild = this.splitContainer(sr[0], iter - 1);
            root.rchild = this.splitContainer(sr[1], iter - 1);
        }
    }
    return root;
};

BSPGen.prototype.isLargeEnough = function(cont) {
    if (this._opts.discardBySize) {
        return cont.w >= this._opts.minSplitW && cont.h >= this._opts.minSplitH;
    }
    return true;
};

BSPGen.prototype.randomSplit = function(container) {
    let r1, r2;
    if (rng.getUniform() <= this._opts.vertSplit) {
        // Vertical
        r1 = new Container(
            container.x, container.y, // r1.x, r1.y
            rng.getUniformInt(1, container.w), container.h // r1.w, r1.h
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
            container.w, rng.getUniformInt(1, container.h) // r1.w, r1.h
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
};

BSPGen.prototype.isVRatioTooSmall = function(r1, r2) {
    const r1Wratio = r1.w / r1.h;
    const r2Wratio = r2.w / r2.h;
    return r1Wratio < this._opts.wRatio || r2Wratio < this._opts.wRatio;
};

BSPGen.prototype.isHRatioTooSmall = function(r1, r2) {
    const r1Hratio = r1.h / r1.w;
    const r2Hratio = r2.h / r2.w;
    return r1Hratio < this._opts.hRatio || r2Hratio < this._opts.hRatio;
};
/* Creates a tree container with BSP and generates rooms based on the tree.
 * Each room is surrounded by wall, so now room spaces are merged together
 */
BSPGen.prototype.createWithRooms = function(cols, rows, iter = 5) {
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
};

BSPGen.prototype.createWithRoomsAndPaths = function(cols, rows, iter = 5) {
    const mainContainer = new Container(0, 0, cols, rows);
    const containerTree = this.splitContainer(mainContainer, iter);

    const leafs = containerTree.getLeafs();
    const rooms = [];
    leafs.forEach(leaf => {
        rooms.push(new Room(leaf));
    });

    const paths = [];
    this.createPaths(containerTree, paths);

    this.generated = {
        tree: containerTree, rooms, paths
    };
    return [containerTree, rooms, paths];
};

/* Creates paths between the nodes of the tree. These paths are placed into
 * paths variable. Each path is an array of coordinates.
 */
BSPGen.prototype.createPaths = function(tree, paths) {
    if (tree.lchild === null || tree.rchild === null) {
        return [];
    }
    const path = this.createPath(tree.lchild.leaf, tree.rchild.leaf);
    if (path.length > 0) {
        paths.push(path);
    }
    this.createPaths(tree.lchild, paths);
    this.createPaths(tree.rchild, paths);
    return paths;
};

BSPGen.prototype.get = function(prop) {
    if (this.generated.hasOwnProperty(prop)) {
        return this.generated[prop];
    }
    return null;
};

module.exports = BSP;

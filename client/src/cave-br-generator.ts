/* Original python version can be found from
 * https://github.com/Gazhole/python3-tdl-cavegenerator/blob/master/make_map.py
 */

import {CellMap} from './map';
import {Level} from './level';
import {Random} from './random';
import {ELEM} from '../data/elem-constants';
import {TCoord} from './interfaces';

const dbgReq = require('debug');
const debug = dbgReq('bitn:cave-br');

// debug.enabled = true;

const RNG = Random.getRNG();

// These can be adjusted for different results, but defaults are OK
const BR_SCALE = 0.75;
const [MIN_WIDTH, MAX_WIDTH] = [3, 32];
const [BR_WIDTH_MIN, BR_WIDTH_MAX] = [4, 8];
const [ROUGH_MIN, ROUGH_MAX] = [40, 80];
const [WIND_MIN, WIND_MAX] = [40, 80];
const [STEP_MIN, STEP_MAX] = [2, 4];

const NO_COORDS = []; // Dummy empty list

interface Conf {
    connectedRatio: number;
    numBranches: number;
    mapWidth: number;
    mapHeight: number;
    nActorsBranch: number;
    nItemsBranch: number;
    allowUnconnected: boolean;
}

/* Creates a cave level and returns Level object. */
export function createCaveLevel(cols: number, rows: number, conf: any): Level {
    const level = new Level();
    const map = new CellMap(cols, rows, ELEM.WALL);
    if (!conf.mapWidth) {conf.mapWidth = cols;}
    if (!conf.mapHeight) {conf.mapHeight = rows;}
    conf.randBranches = false;
    conf.connectedRatio = conf.connectedRatio || 1.00;
    createCaveMap(map, conf);
    level.setMap(map);
    return level;
}

let IND = 0; // Used for indenting debug messages

/* Top-level function to generate a cave map. Carve out a series of
 * branches which connect to each other.
 * Few arguments to determine how this works, but generally its pretty simple. */
function createCaveMap(gameMap: CellMap, mapConfig: Conf, monsterConfig?, entities?): void {
    ++IND;
    let {mapWidth, mapHeight} = mapConfig;
    const {nActorsBranch, nItemsBranch} = mapConfig;
    mapWidth -= 1;
    mapHeight -= 1;

    // Random seeds for the cave parameters
    let numBranches = Math.floor(((mapWidth + mapHeight) / 2) / 10);
    if (mapConfig.numBranches) {numBranches = mapConfig.numBranches;}

    dbg('Creating', numBranches, 'branches for level',
        `${mapWidth + 1}x${mapHeight + 1}`);

    // The extent that the branch position will move a lot.
    const windyness = RNG.getUniformInt(WIND_MIN, WIND_MAX);
    // The extent that the branch width will vary
    const roughness = RNG.getUniformInt(ROUGH_MIN, ROUGH_MAX);
    // The step value for branch path movement.
    const magnitude = RNG.getUniformInt(STEP_MIN, STEP_MAX);

    // Set the boundaries so branches occur within the map size.
    // Ultimate actual boundaries of the map are width and height - 1 tile.
    const branchMinX = 2;
    const branchMaxX = mapWidth - 1;
    const branchMinY = 2;
    const branchMaxY = mapHeight - 1;

    // To make sure a large portion of the cave is reachable, 75% of the
    // branches will be joined together.
    const connectedBranches = Math.floor(numBranches * mapConfig.connectedRatio);

    // List to store viable coordinates for item, monster, player placement.
    let caveCoords: TCoord[] = [];

    // Main loop to create branches.
    for (let branch = 0; branch < connectedBranches; ++branch) {
        dbg('Creating connected branch', branch);
        ++IND;

        // First we need to randomly decide whether this branch is horizontal or vertical.
        if (RNG.getUniformInt(0, 1) === 0) {
            dbg('Creating vertical connected branch', branch);

            // The create_?_cave_branch functions also return the list of
            // coordinates carved out, which we will append to the coords for
            // the entire cave. This is true for connected branches, as in this
            // way we will ensure that all branches start or intersect an
            // already used point on the map.

            const currentBranchCoords = createVerCaveBranch(gameMap, branchMinX,
                 branchMaxX, branchMinY, branchMaxY,
                 magnitude, windyness, roughness, caveCoords);

            caveCoords = caveCoords.concat(currentBranchCoords);
        }
        else {
            dbg('\tCreating horizontal connected branch', branch);
            const currentBranchCoords = createHorCaveBranch(gameMap, branchMinX,
                 branchMaxX, branchMinY, branchMaxY,
                 magnitude, windyness, roughness, caveCoords);

            caveCoords = caveCoords.concat(currentBranchCoords);
        }
        --IND;
    }

    // Unconnected branches are placed randomly, they will likely be connected
    // with the rest of the map, but not necessarily. Because of the algorithm
    // used for connected branches i've found doing a few random branches makes
    // the map a lot more interesting.

    const unconnectedBranches = numBranches - connectedBranches;
    for (let branch = 0; branch < unconnectedBranches; ++branch) {
        if (RNG.getUniformInt(0, 1) === 0) {

            // Make sure the branches aren't connected by using empty
            // coordinate list, and also don't assign a var to return the list
            // of new branch coordinates to.

            createVerCaveBranch(gameMap,
                                 branchMinX, branchMaxX, branchMinY, branchMaxY,
                                 magnitude, windyness, roughness, NO_COORDS);

        }
        else {
            createHorCaveBranch(gameMap,
                                 branchMinX, branchMaxX, branchMinY, branchMaxY,
                                 magnitude, windyness, roughness, NO_COORDS);
        }

    }

    addBordersToMap(gameMap, mapWidth, mapHeight);
    --IND;
}

//# Set all the required parameters for a new cave branch
function setupBranch(
    caveCoords: TCoord[], branchMinX, branchMinY, branchMaxX, branchMaxY, branchType
): [number, number, number, number] {

    ++IND;
    let branchStartWidth = RNG.getUniformInt(BR_WIDTH_MIN, BR_WIDTH_MAX);
    let [branchStartX, branchStartY, branchLength] = [0, 0, 0];

    if (branchType === 'h') {  // Horizontal, obviously.
        // If this list isn't populated, it means this is the first branch, or unconnected.
        if (caveCoords.length > 0) {
            // Set a random seed coordinate for this branch, connecting to the rest
            const [seedX, seedY] = RNG.arrayGetRand(caveCoords);
            dbg('Branch will start from', seedX, seedY, 'type', branchType);

            /* If the seed coordinates are in the left or top half of the
             * screen, we should be fine to start the new
             * branch where it is. However, if in the case of a horizontal branch
             * starting in the right half of the map if we did this, the branch
             * would be very short and things would cluster to one side.  The
             * solution in the horizontal branch example, is to keep Y the same,
             * but shift X to a coordinate mirrored on the left side of the
             * screen (e.g. with a map width of 100 an x of 60 changes to 40, 80
             * to 20..
            */

            // If in the right half of the map
            branchStartY = seedY;
            branchStartX = getAdjustedVal(seedX, branchMaxX);

            branchLength = (branchMaxX - branchStartX) - 3;
            dbg('xs, ys, blen', branchStartX, branchStartY, branchLength);

            [branchStartWidth, branchStartX, branchStartY] =
            checkValidCoords(branchMinX, branchMaxX, branchMinY, branchMaxY,
                               branchStartX, branchStartY, branchStartWidth, branchType);
            dbg('ADJ xs, ys, blen', branchStartX, branchStartY, branchLength);

        }
        // If we don't have a seed coord, just pick some random coordinates
        // skewed to the left / top.
        else {
            branchStartX = getBranchStart(branchMinX, branchMaxX, BR_SCALE);
            branchStartY = getBranchStart(branchMinY, branchMaxY, BR_SCALE);
            branchLength = (branchMaxX - branchStartX) - 3;
            dbg('no caveCoord xs, ys, blen', branchStartX, branchStartY, branchLength);
        }

        branchLength = Math.floor(branchLength / 4);
        return [branchStartX, branchStartY, branchLength, branchStartWidth];
    }

    if (branchType === 'v') {
        if (caveCoords.length > 0) {
            const [seedX, seedY] = RNG.arrayGetRand(caveCoords);
            dbg('Branch will start from', seedX, seedY, 'type', branchType);

            branchStartX = seedX;
            branchStartY = getAdjustedVal(seedY, branchMaxY);
            branchLength = Math.floor(branchMaxY - branchStartY - 3);
            dbg('xs, ys, blen', branchStartX, branchStartY, branchLength);

            [branchStartWidth, branchStartX, branchStartY] =
            checkValidCoords(branchMinX, branchMaxX, branchMinY, branchMaxY,
                               branchStartX, branchStartY, branchStartWidth, branchType);

            dbg('ADJ xs, ys, blen', branchStartX, branchStartY, branchLength);
        }
        else {
            branchStartX = getBranchStart(branchMinX, branchMaxX, BR_SCALE);
            branchStartY = getBranchStart(branchMinY, branchMaxY, BR_SCALE);
            branchLength = (branchMaxY - branchStartY) - 3;
            dbg('no caveCoord xs, ys, blen', branchStartX, branchStartY, branchLength);
        }

        branchLength = Math.floor(branchLength / 4);
        return [branchStartX, branchStartY, branchLength, branchStartWidth];
    }

    --IND;
}

// Just some checking to make sure the iterative part of the cave generation
// doesn't go outside the boundaries of the map
function checkValidCoords(
    branchMinX: number, branchMaxX: number, branchMinY: number, branchMaxY: number,
    currentX: number, currentY: number, currentWidth: number, branchType: string
): [number, number, number] {
    ++IND;

    if (currentWidth < MIN_WIDTH) {
        currentWidth = MIN_WIDTH;
    }
    else if (currentWidth > MAX_WIDTH) {
        currentWidth = MAX_WIDTH;
    }

    if (branchType === 'v') {
        if (currentX <= branchMinX) {
            currentX = branchMinX + 1;
        }

        if (currentX + currentWidth >= branchMaxX) {
            currentX = branchMaxX - currentWidth - 1;
            currentWidth = branchMaxX - currentX;
        }
    }

    if (branchType === 'h') {
        if (currentY < branchMinY) {
            currentY = branchMinY + 1;
        }

        if (currentY + currentWidth >= branchMaxY) {
            currentY = branchMaxY - currentWidth - 1;
            currentWidth = branchMaxY - currentY;
        }
    }

    --IND;
    return [currentWidth, currentX, currentY];
}


/* Once the branches have been set up, this is the function which actually
 * iterates through and carves out a dungeon
 * */
function createVerCaveBranch(
    gameMap: CellMap, branchMinX, branchMaxX, branchMinY, branchMaxY,
    magnitude, windyness, roughness, caveCoords: TCoord[]
): TCoord[] {
    ++IND;

    const branchCoords: TCoord[] = [];  //Empty# Empty list to store coords

    // # Get all the configuration values from the setup function
    const [branchStartX, branchStartY, branchLength, branchStartWidth] =
        setupBranch(caveCoords, branchMinX, branchMinY, branchMaxX, branchMaxY, 'v');

    //# Carve out the first slice (a vertical branch is essentially a stack of
    //horizontal slices/tunnels).

    const branchStopX = branchStartX + branchStartWidth;
    createHoriSlice(gameMap, branchStartX, branchStopX, branchStartY);

    let currentX = branchStartX;
    let currentY = branchStartY;
    let currentWidth = branchStartWidth;

    dbg('createVerCaveBranch magn:', magnitude, 'brLen', branchLength);

    const widthDeltaRange = range(-magnitude, magnitude).filter(v => v !== 0);
    const currentXDeltaRange = range(-magnitude, magnitude).filter(v => v !== 0);

    for (let i = 0; i < branchLength; ++i) {
        currentY += 1;  //# Move down one row / slice.

        // The higher the roughness, the more likely this bit will be called.
        // This is how often the width will change.

        if (RNG.getUniformInt(1, 100) <= roughness) {
            const widthDelta = RNG.arrayGetRand(widthDeltaRange);
            currentWidth += widthDelta;
        }

        // The windyness is how much the starting position of the slice will move.
        if (RNG.getUniformInt(1, 100) <= windyness) {
            const currentXDelta = RNG.arrayGetRand(currentXDeltaRange);
            currentX += currentXDelta;
        }

        // Check whether this new slice is valid within the map.
        [currentWidth, currentX, currentY] = checkValidCoords(branchMinX,
             branchMaxX, branchMinY, branchMaxY, currentX, currentY,
             currentWidth, 'v');

        // Create the slice across x-dir, on a fixed y-position
        const maxX = currentX + currentWidth;
        createHoriSlice(gameMap, currentX, maxX, currentY);

        for (let x = currentX; x <= maxX; x++) {
            branchCoords.push([x, currentY]);
        }
    }

    //# Round off the end of the branch (no flat edges)
    if (currentWidth > 3) {
        dbg('Ver br starting to round, width:', currentWidth);

        while ((branchMinY < currentY) && (currentY < branchMaxY - 1)) {
            currentY += 1;
            currentX += 1;
            currentWidth = adjustWidth(currentWidth, magnitude);

            const stopX = currentX + currentWidth;
            createHoriSlice(gameMap, currentX, stopX, currentY);
            for (let x = currentX; x <= stopX; ++x) {
                branchCoords.push([x, currentY]);
            }

            if (currentWidth < 3) {break;}
        }
    }

    --IND;
    return branchCoords;
}

function createHorCaveBranch(
    gameMap: CellMap, branchMinX, branchMaxX, branchMinY, branchMaxY,
    magnitude, windyness, roughness, caveCoords: TCoord[]
): TCoord[] {
    ++IND;

    const [branchStartX, branchStartY, branchLength, branchStartWidth] =
        setupBranch(caveCoords, branchMinX, branchMinY,
                    branchMaxX, branchMaxY, 'h');

    const branchStopY = branchStartY + branchStartWidth;
    createVertSlice(gameMap, branchStartY, branchStopY, branchStartX);

    let currentX = branchStartX;
    let currentY = branchStartY;
    let currentWidth = branchStartWidth;

    const widthDeltaRange = range(-magnitude, magnitude).filter(v => v !== 0);
    const currentYDeltaRange = range(-magnitude, magnitude).filter(v => v !== 0);

    const branchCoords: TCoord[] = [];
    dbg('Hor branch Magnitude is ', magnitude, 'brLen', branchLength);
    for (let i = 0; i < branchLength; ++i) {
        currentX += 1;

        if (RNG.getUniformInt(1, 100) <= roughness) {
            const widthDelta = RNG.arrayGetRand(widthDeltaRange);
            currentWidth += widthDelta;
        }

        if (RNG.getUniformInt(1, 100) <= windyness) {
            const currentYDelta = RNG.arrayGetRand(currentYDeltaRange);
            currentY += currentYDelta;
        }

        [currentWidth, currentX, currentY] = checkValidCoords(
            branchMinX, branchMaxX, branchMinY, branchMaxY,
            currentX, currentY, currentWidth, 'h');

        const maxY = currentY + currentWidth;
        createVertSlice(gameMap, currentY, maxY, currentX);

        for (let y = currentY; y <= maxY; ++y) {
            branchCoords.push([currentX, y]);
        }
    }

    if (currentWidth > 3) {
        dbg('Hor br starting to round, width:', currentWidth);
        while ((branchMinX < currentX) && (currentX < branchMaxX - 1)) {
            currentY += 1;
            currentX += 1;
            currentWidth = adjustWidth(currentWidth, magnitude);

            const stopY = currentY + currentWidth;
            createVertSlice(gameMap, currentY, stopY, currentX);

            for (let y = currentY; y <= stopY; ++y) {
                branchCoords.push([currentX, y]);
            }

            if (currentWidth < 3) {break;}
        }
     }

    --IND;
    return branchCoords;
}

// This creates a horizontal slice (moves in x dir) on a vertical branch
function createHoriSlice(gameMap: CellMap, x1: number, x2: number, y: number): void {
    ++IND;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    dbg('createHoriSlice x:', minX, '->', maxX, 'y:', y);
    for (let x = minX; x <= maxX; ++x) {
        if (gameMap.hasXY(x, y)) {
            gameMap.setBaseElemXY(x, y, ELEM.FLOOR);
        }
        else {
            // console.warn(`${x},${y} out of range`);
        }
    }
    --IND;
}

// This creates a vertical slice (moves in y dir) on a horizontal branch
function createVertSlice(gameMap: CellMap, y1: number, y2: number, x: number): void {
    ++IND;
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    dbg('createVertSlice x:', x, 'y:', minY, '->', maxY);
    for (let y = minY; y <= maxY; ++y) {
        if (gameMap.hasXY(x, y)) {
            gameMap.setBaseElemXY(x, y, ELEM.FLOOR);
        }
    }
    --IND;
}

// Creates the surrounding wall to map edges
function addBordersToMap(gameMap: CellMap, mapWidth: number, mapHeight: number): void {
    for (let x = 0; x <= mapWidth; ++x) {
        gameMap.setBaseElemXY(x, 0, ELEM.WALL);
        gameMap.setBaseElemXY(x, mapHeight, ELEM.WALL);
    }

    for (let y = 0; y <= mapHeight; ++y) {
        gameMap.setBaseElemXY(0, y, ELEM.WALL);
        gameMap.setBaseElemXY(mapWidth, y, ELEM.WALL);
    }
}

function dbg(...args): void {
    if (debug.enabled) {
        const ind = ' '.repeat(IND);
        console.log(ind + '[DBG]', ...args);
    }
}

/* Impl. Python range function. */
function range(v1: number, v2?: number, step?: number): number[] {
    if (!step) {step = 1;}
    const res = [];
    if (v2 < v1 || step < 1) {return [];} // Args don't make sense

    if (typeof v2 === 'undefined') {
        for (let i = 0; i < v1; i += step) {
            res.push(i);
        }
    }
    else {
        for (let i = v1; i < v2; i += step) {
            res.push(i);
        }
    }
    return res;
}

function getBranchStart(min, max, scale): number {
    return min + RNG.getUniformInt(min, Math.floor(max * scale));
}

function getAdjustedVal(seedX, branchMaxX): number {
    const halfAvailSpace = Math.floor(branchMaxX * 0.5);
    if (seedX > Math.floor(branchMaxX * 0.5)) {
        // # This is the important calculation
        return seedX - ((seedX - halfAvailSpace) * 2);
    }
    return seedX;
}

function adjustWidth(currentWidth, magnitude): number {
    if (currentWidth - magnitude <= 1) {
        return 1;
    }
    else {
        return currentWidth - magnitude;
    }
}


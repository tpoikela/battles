/* Original python version can be found from
 * https://github.com/Gazhole/python3-tdl-cavegenerator/blob/master/make_map.py
 */

import {CellMap} from './map';
import {Level} from './level';
import {Random} from './random';
import {ELEM} from '../data/elem-constants';
import {TCoord} from './interfaces';

const RNG = Random.getRNG();

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

export function createCaveLevel(cols: number, rows: number, conf: any): Level {
    const level = new Level();
    const map = new CellMap(cols, rows, ELEM.WALL);
    if (!conf.mapWidth) {conf.mapWidth = cols;}
    if (!conf.mapHeight) {conf.mapHeight = rows;}
    conf.randBranches = false;
    createCaveMap(map, conf);
    level.setMap(map);
    return level;
}

/* At the moment this is the game map, based off the map class in TDL with
 * some additions (much easier than using a Tile)
 * */

/* This is the top level function to generate a cave map. Carve out a series of branches which interlink with eachohter.
# Few arguments to determine how this works but generally its pretty simple. */
function createCaveMap(gameMap: CellMap, mapConfig, monsterConfig?, entities?): void {

    let {mapWidth, mapHeight} = mapConfig;
    const {nActorsBranch, nItemsBranch} = mapConfig;
    mapWidth -= 1;
    mapHeight -= 1;

    // Random seeds for the cave parameters
    const numBranches = Math.floor(((mapWidth + mapHeight) / 2) / 10);
    // const numBranches = 4;
    const windyness = RNG.getUniformInt(40, 80); // The extent that the branch position will move a lot.
    const roughness = RNG.getUniformInt(40, 80); // The extent that the branch width will vary
    const magnitude = RNG.getUniformInt(2, 4);  // The step value for branch path movement.

    // Set the boundaries so branches occur within the map size.
    // Ultimate actual boundaries of the map are width and height - 1 tile.
    const branchMinX = 2;
    const branchMaxX = mapWidth - 1;
    const branchMinY = 2;
    const branchMaxY = mapHeight - 1;

    // To make sure a large portion of the cave is reachable, 75% of the
    // branches will be joined together.
    const connectedBranches = Math.floor(numBranches * 0.75);

    // List to store viable coordinates for item, monster, player placement.
    let caveCoords: TCoord[] = [];

    // Main loop to create branches.
    for (let branch = 0; branch < connectedBranches; ++branch) {
        console.log('Creating connected branch', branch);

        // First we need to randomly decide whether this branch is horizontal or vertical.
        if (RNG.getUniformInt(0, 1) === 0) {
            console.log('\tCreating vertical connected branch', branch);

            // The create_?_cave_branch functions also return the list of
            // coordinates carved out, which we will append to the coords for
            // the entire cave. This is true for connected branches, as in this
            // way we will ensure that all branches start or intersect an
            // already used point on the map.

            const currentBranchCoords = createVerCaveBranch(gameMap, branchMinX,
                 branchMaxX, branchMinY, branchMaxY,
                 magnitude, windyness, roughness, caveCoords);

            //# Place entities (monsters, items) in the newly created branch.
            placeEntities(currentBranchCoords, entities, nActorsBranch, nItemsBranch,
                           monsterConfig);

            caveCoords = caveCoords.concat(currentBranchCoords);
        }
        else {
            console.log('\tCreating horizontal connected branch', branch);
            const currentBranchCoords = createHorCaveBranch(gameMap, branchMinX,
                 branchMaxX, branchMinY, branchMaxY,
                 magnitude, windyness, roughness, caveCoords);

            placeEntities(currentBranchCoords, entities, nActorsBranch, nItemsBranch,
                           monsterConfig);
            caveCoords = caveCoords.concat(currentBranchCoords);
        }
    }

    // Once all the connected branches have been created, pop a coordinate off
    // the list and put the player there.
    //[player.x, player.y] = caveCoords.pop();

    // if (mapConfig.randBranches === false) {return;}

    // Unconnected branches are placed randomly, they will likely be connected
    // with the rest of the map, but not necessarily. Because of the algorithm
    // used for connected branches i've found doing a few random branches makes
    // the map a lot more interesting.

    // const unconnectedBranches = numBranches - connectedBranches;
    const unconnectedBranches = 0;

    for (let branch = 0; branch < unconnectedBranches; ++branch) {
        if (RNG.getUniformInt(0, 1) === 0) {

            // Make sure the branches aren't connected by clearing the cave
            // coordinate list, and also don't assign a var to return the list
            // of new branch coordinates to.

            caveCoords = [];
            createVerCaveBranch(gameMap,
                                 branchMinX, branchMaxX, branchMinY, branchMaxY,
                                 magnitude, windyness, roughness, caveCoords);

        }
        else {
            caveCoords = [];
            createHorCaveBranch(gameMap,
                                 branchMinX, branchMaxX, branchMinY, branchMaxY,
                                 magnitude, windyness, roughness, caveCoords);
        }

    }

    addBordersToMap(gameMap, mapWidth, mapHeight);

    /* The following code is optional, and is used for debugging purposes only - prints out some info on the map, and
    dumps a basic ASCII image to a txt file to view the whole map without FOV getting in the way.

    count_monsters = 0
    count_items = 0
    for entity in entities:
        if entity.name.lower() != "player":
            count_monsters += 1
        # if entity.name.lower() != "player" and entity.item:
        #     count_items += 1

    draw_cave(gameMap, mapWidth, mapHeight, numBranches, connectedBranches, unconnectedBranches,
              windyness, roughness, magnitude, count_monsters, count_items, entities)
    */
}

//# Set all the required parameters for a new cave branch
function setupBranch(
    caveCoords: TCoord[], branchMinX, branchMinY, branchMaxX, branchMaxY, branchType
): [number, number, number, number] {

    let branchStartWidth = RNG.getUniformInt(4, 8);
    let [branchStartX, branchStartY, branchLength] = [0, 0, 0];

    if (branchType === 'h') {  // Horizontal, obviously.
        // If this list isn't populated, it means this is the first branch, or unconnected.
        if (caveCoords.length > 0) {
            RNG.shuffle(caveCoords);
             // Set a random seed coordinate for this branch, connecting to the rest
            const [seedX, seedY] = caveCoords.pop();

            /*# If the seed coordinates are in the left or top half of the
             * screen, we should be fine to start the new
            # branch where it is. However, if in the case of a horizontal branch
            # starting in the right half of the map if we did this, the branch
            # would be very short and things would cluster to one side.  The
            # solution in the horizontal branch example, is to keep Y the same,
            # but shift X to a coordinate mirrored on the left side of the
            # screen (e.g. with a map width of 100 an x of 60 changes to 40, 80
            # to 20..
            */

            const halfAvailSpace = Math.floor(branchMaxX * 0.5);
            //# If in the right half of the map
            if (seedX > Math.floor(branchMaxX * 0.5)) {
                // # This is the important calculation
                branchStartX = seedX - ((seedX - halfAvailSpace) * 2);
                branchStartY = Math.floor(seedY);
            }
            else {
                branchStartX = Math.floor(seedX);
                branchStartY = Math.floor(seedY);
            }

            branchLength = (branchMaxX - branchStartX) - 3;
            console.log('xs, ys, blen', branchStartX, branchStartY, branchLength);

            [branchStartWidth, branchStartX, branchStartY] =
            checkValidCoords(branchMinX, branchMaxX, branchMinY, branchMaxY,
                               branchStartX, branchStartY, branchStartWidth, branchType);
            console.log('ADJ xs, ys, blen', branchStartX, branchStartY, branchLength);

        }
        // # If we don't have a seed coord, just pick some random coordinates skewed to the left / top.
        else {
            branchStartX = branchMinX + RNG.getUniformInt(branchMinX, Math.floor(branchMaxX * 0.75));
            branchStartY = branchMinY + RNG.getUniformInt(branchMinY, Math.floor(branchMaxY * 0.75));
            branchLength = (branchMaxX - branchStartX) - 3;
            console.log('no caveCoord xs, ys, blen', branchStartX, branchStartY, branchLength);
        }

        branchLength = Math.floor(branchLength / 4);
        return [branchStartX, branchStartY, branchLength, branchStartWidth];
    }

    if (branchType === 'v') {
        if (caveCoords.length > 0) {
            RNG.shuffle(caveCoords);
            const [seedX, seedY] = caveCoords.pop();
            const halfAvailSpace = Math.floor(branchMaxY * 0.5);

            if (seedY > Math.floor(branchMaxY * 0.5)) {
                branchStartY = seedY - ((seedY - halfAvailSpace) * 2);
                branchStartX = seedX;
            }
            else {
                branchStartY = seedY;
                branchStartX = seedX;
            }

            branchLength = Math.floor(branchMaxY - branchStartY - 3);
            console.log('xs, ys, blen', branchStartX, branchStartY, branchLength);

            [branchStartWidth, branchStartX, branchStartY] =
            checkValidCoords(branchMinX, branchMaxX, branchMinY, branchMaxY,
                               branchStartX, branchStartY, branchStartWidth, branchType);

            console.log('ADJ xs, ys, blen', branchStartX, branchStartY, branchLength);
        }
        else {
            branchStartX = branchMinX + RNG.getUniformInt(branchMinX, Math.floor(branchMaxX * 0.75));
            branchStartY = branchMinY + RNG.getUniformInt(branchMinY, Math.floor(branchMaxY * 0.75));
            branchLength = (branchMaxY - branchStartY) - 3;
        }

        branchLength = Math.floor(branchLength / 4);
        return [branchStartX, branchStartY, branchLength, branchStartWidth];
    }
}

// Just some checking to make sure the iterative part of the cave generation
// doesn't go outside the boundaries of the map
function checkValidCoords(
    branchMinX: number, branchMaxX: number, branchMinY: number, branchMaxY: number,
    currentX: number, currentY: number, currentWidth: number, branchType: string
): [number, number, number] {

    if (currentWidth < 3) {
        currentWidth = 3;
    }
    else if (currentWidth > 16) {
        currentWidth = 16;
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

    return [currentWidth, currentX, currentY];
}


/* Once the branches have been set up, this is the function which actually
 * iterates through and carves out a dungeon
 * */
function createVerCaveBranch(
    gameMap: CellMap, branchMinX, branchMaxX, branchMinY, branchMaxY,
    magnitude, windyness, roughness, caveCoords: TCoord[]
): TCoord[] {

    const branchCoords: TCoord[] = [];  //Empty# Empty list to store coords

    // # Get all the configuration values from the setup function
    const [branchStartX, branchStartY, branchLength, branchStartWidth] =
        setupBranch(caveCoords, branchMinX, branchMinY, branchMaxX, branchMaxY, 'v');

    //# Carve out the first slice (a vertical branch is essentially a stack of
    //horizontal slices/tunnels).

    const branchStopX = branchStartX + branchStartWidth;
    createHorTunnel(gameMap, branchStartX, branchStopX, branchStartY);

    let currentX = branchStartX;
    let currentY = branchStartY;
    let currentWidth = branchStartWidth;

    console.log('\t\tVert branch Magnitude is ',
                magnitude, 'brLen', branchLength);

    for (let i = 0; i < branchLength; ++i) {
        currentY += 1;  //# Move down one row / slice.

        //# The higher the roughness, the more likely this bit will be called.
        //This is how often the width will change.

        if (RNG.getUniformInt(1, 100) <= roughness) {
              // # make a list of potential deltas
            const widthDeltaRange = range(-magnitude, magnitude).filter(v => v !== 0);
            RNG.shuffle(widthDeltaRange);

            const widthDelta = widthDeltaRange.pop();
            currentWidth += widthDelta;
        }

        //# The windyness is how much the starting position of the slice will move.
        if (RNG.getUniformInt(1, 100) <= windyness) {
            const currentXDeltaRange = range(-magnitude, magnitude).filter(v => v !== 0);
            RNG.shuffle(currentXDeltaRange);

            const currentXDelta = currentXDeltaRange.pop();
            currentX += currentXDelta;
        }

        //# Check whether this new slice is valid within the map.
        [currentWidth, currentX, currentY] = checkValidCoords(branchMinX,
             branchMaxX, branchMinY, branchMaxY, currentX, currentY,
             currentWidth, 'v');

        // # Create the slice by carving out from the x, on the y, with a length of width.
        createHorTunnel(gameMap, currentX, currentX + currentWidth, currentY);

        // # Append the coords.
        const maxX = currentX + currentWidth + 1;
        for (let x = currentX; x < maxX; x++) {
            branchCoords.push([x, currentY]);
        }
    }

    //# Round off the end of the branch (no flat edges)
    if (currentWidth > 3) {
        while ((branchMinY < currentY) && (currentY < branchMaxY - 1)) {
            currentY += 1;
            currentX += 1;

            if (currentWidth - magnitude <= 1) {
                currentWidth = 1;
            }
            else {
                currentWidth -= magnitude;
            }

            createHorTunnel(gameMap, currentX, currentX + currentWidth, currentY);

            //# Append the coords.
            const maxX = currentX + currentWidth + 1;
            for (let x = currentX; x <= maxX; ++x) {
                branchCoords.push([x, currentY]);
            }
        }
    }

    return branchCoords;
}


function createHorCaveBranch(
    gameMap: CellMap, branchMinX, branchMaxX, branchMinY, branchMaxY,
    magnitude, windyness, roughness, caveCoords: TCoord[]
): TCoord[] {

    const branchCoords: TCoord[] = [];

    const [branchStartX, branchStartY, branchLength, branchStartWidth] =
        setupBranch(caveCoords, branchMinX, branchMinY,
                    branchMaxX, branchMaxY, 'h');

    const branchStopY = branchStartY + branchStartWidth;
    createVerTunnel(gameMap, branchStartY, branchStopY, branchStartX);

    let currentX = Math.floor(branchStartX);
    let currentY = Math.floor(branchStartY);
    let currentWidth = Math.floor(branchStartWidth);

    for (let i = 0; i < branchLength; ++i) {
        currentX += 1;

        if (RNG.getUniformInt(1, 100) <= roughness) {
            const widthDeltaRange = range(-magnitude, magnitude).filter(v => v !== 0);
            RNG.shuffle(widthDeltaRange);

            const widthDelta = widthDeltaRange.pop();
            currentWidth += widthDelta;
        }

        if (RNG.getUniformInt(1, 100) <= windyness) {
            const currentYDeltaRange = range(-magnitude, magnitude).filter(v => v !== 0);
            RNG.shuffle(currentYDeltaRange);

            const currentYDelta = currentYDeltaRange.pop();
            currentY += currentYDelta;
        }

        [currentWidth, currentX, currentY] = checkValidCoords(
            branchMinX, branchMaxX, branchMinY, branchMaxY,
            currentX, currentY, currentWidth, 'h');

        createVerTunnel(gameMap, currentY, currentY + currentWidth, currentX);

        const maxY = currentY + currentWidth + 1;
        for (let y = currentY; y < maxY; ++y) {
            branchCoords.push([currentX, y]);
        }
    }

    if (currentWidth > 3) {
        while ((branchMinX < currentX) && (currentX < branchMaxX - 1)) {
            currentY += 1;
            currentX += 1;

            if (currentWidth - magnitude <= 1) {
                currentWidth = 1;
            }
            else {
                currentWidth -= magnitude;
            }

            createVerTunnel(gameMap, currentY, currentY + currentWidth, currentX);

            for (let y = currentY; y < currentY + currentWidth + 1; ++y) {
                branchCoords.push([currentX, y]);
            }
        }
     }

    return branchCoords;
}


function placeEntities(branchCoords, entities, nActorsBranch, nItemsBranch, monsterConfig) {
    const nMonsters = RNG.getUniformInt(0, nActorsBranch);

    for (let i = 0; i < nMonsters; ++i) {
        //# Choose a random location in the branch, and pop that off the list of potential coordinates.
        RNG.shuffle(branchCoords);
        const [x, y] = branchCoords.pop();

        // if (not any([entity for entity in entities if entity.x == x and entity.y == y]):
            //# Is there anything there?
            // monster = pick_monster(x, y, monsterConfig)

            // entities.push(monster)  # This is that list from engine with just the player in it.

    }

}

//# This creates a horizontal slice on a vertical branch
function createHorTunnel(gameMap: CellMap, x1: number, x2: number, y: number): void {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2) + 1;
    console.log('createHorTunnel x:', minX, '->', maxX, 'y:', y);
    for (let x = minX; x < maxX; ++x) {
        if (gameMap.hasXY(x, y)) {
            gameMap.setBaseElemXY(x, y, ELEM.FLOOR);
        }
        else {
            // console.warn(`${x},${y} out of range`);
        }
    }
}


//# This creates a vertical slice on a horizontal branch
function createVerTunnel(gameMap: CellMap, y1: number, y2: number, x: number): void {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2) + 1;
    for (let y = minY; y < maxY; ++y) {
        if (gameMap.hasXY(x, y)) {
            gameMap.setBaseElemXY(x, y, ELEM.FLOOR);
        }
        else {
            // console.warn(`${x},${y} out of range`);
        }
    }
}

function addBordersToMap(gameMap: CellMap, mapWidth: number, mapHeight: number): void {
    //# Make sure there's a border all the way around the map.
    for (let x = 0; x <= mapWidth; ++x) {
        gameMap.setBaseElemXY(x, 0, ELEM.WALL);
        gameMap.setBaseElemXY(x, mapHeight, ELEM.WALL);
    }

    for (let y = 0; y <= mapHeight; ++y) {
        gameMap.setBaseElemXY(0, y, ELEM.WALL);
        gameMap.setBaseElemXY(mapWidth, y, ELEM.WALL);
    }
}

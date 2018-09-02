
const RG = require('./rg.js');
const ROT = require('../../lib/rot.js');
RG.Map = require('./map');
const Path = require('./path');

const TemplateLevel = require('./template.level');
const Crypt = require('../data/tiles.crypt');
const Castle = require('../data/tiles.castle');

ROT.Map.Forest = require('../../lib/map.forest');
ROT.Map.Miner = require('../../lib/map.miner');
ROT.Map.Mountain = require('../../lib/map.mountain');
ROT.Map.Wall = require('../../lib/map.wall');

const RNG = RG.Random.getRNG();

const inRange = function(val, min, max) {
    if (val >= min && val <= max) {
        return true;
    }
    return false;
};

/* Returns true if given coordinates are in allowed area. */
const inAllowedArea = function(x0, y0, x1, y1, conf) {
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
const MapGenerator = function() { // {{{2

    this.cols = RG.LEVEL_MEDIUM_X;
    this.rows = RG.LEVEL_MEDIUM_Y;
    this._mapGen = new ROT.Map.Arena(this.cols, this.rows);
    this._mapType = null;

    this._types = ['arena', 'cellular', 'digger', 'divided', 'dungeon',
        'eller', 'icey', 'uniform', 'rogue', 'ruins', 'rooms'];

    this._wall = 1;

};
RG.Map.Generator = MapGenerator;

MapGenerator.prototype.getRandType = function() {
    const index = RNG.randIndex(this._types);
    return this._types[index];
};

MapGenerator.prototype.createEmptyMap = function() {
    const map = new RG.Map.CellList(this.cols, this.rows);
    const obj = {map};
    return obj;
};

/* Returns an object containing randomized map + all special features
 * based on initialized generator settings. */
MapGenerator.prototype.getMap = function() {
    const obj = {};
    if (typeof this._mapGen === 'function') {
        obj.map = this._mapGen();
    }
    else {
        const map = new RG.Map.CellList(this.cols, this.rows);
        this._mapGen.create((x, y, val) => {
            if (val === this._wall) {
                map.setBaseElemXY(x, y, RG.ELEM.WALL);
            }
            else {
                map.setBaseElemXY(x, y, RG.ELEM.FLOOR);
            }
        });
        obj.map = map;
        if (this._mapType === 'uniform' || this._mapType === 'digger') {
            obj.rooms = this._mapGen.getRooms();
            obj.corridors = this._mapGen.getCorridors();
        }
    }
    return obj;
};

/* Creates "ruins" type level with open outer edges and inner
 * "fortress" with some tunnels. */
RG.Map.Generator.prototype.createRuins = function(cols, rows) {
    const conf = {born: [4, 5, 6, 7, 8],
        survive: [2, 3, 4, 5], connected: true};
    const map = new ROT.Map.Cellular(cols, rows, conf);
    map.randomize(0.9);
    for (let i = 0; i < 5; i++) {map.create();}
    map.connect(null, 1);
    this._wall = 0;
    return map;
};

    /* Creates a cellular type dungeon and makes all areas connected.*/
MapGenerator.prototype.createCellular = function(cols, rows) {
    const map = new ROT.Map.Cellular(cols, rows,
        {connected: true});
    map.randomize(0.52);
    for (let i = 0; i < 5; i++) {map.create();}
    map.connect(null, 1);
    this._wall = 0;
    return map;
};

MapGenerator.prototype.createRooms = function(cols, rows) {
    const map = new ROT.Map.Digger(cols, rows,
        {roomWidth: [5, 20], dugPercentage: 0.7});
    return map;
};

    /* Creates a town level of size cols X rows. */
MapGenerator.prototype.createTown = function(cols, rows, conf) {
    const maxTriesHouse = 100;
    const doors = {};
    const wallsHalos = {};

    let nHouses = 5;
    let minX = 5;
    let maxX = 5;
    let minY = 5;
    let maxY = 5;

    if (conf.hasOwnProperty('nHouses')) {nHouses = conf.nHouses;}
    if (conf.hasOwnProperty('minHouseX')) {minX = conf.minHouseX;}
    if (conf.hasOwnProperty('minHouseY')) {minY = conf.minHouseY;}
    if (conf.hasOwnProperty('maxHouseX')) {maxX = conf.maxHouseX;}
    if (conf.hasOwnProperty('maxHouseY')) {maxY = conf.maxHouseY;}

    const houses = [];
    const levelType = conf.levelType || 'arena';
    this.setGen(levelType, cols, rows);
    const mapObj = this.getMap();
    const map = mapObj.map;

    const freeCells = map.getFree();
    const freeCoord = freeCells.map(cell => [cell.getX(), cell.getY()]);

    const getHollowBox = RG.Geometry.getHollowBox;
    let border = getHollowBox(0, 0, cols - 1, rows - 1);
    border = border.concat(getHollowBox(1, 1, cols - 2, rows - 2));

    if (!freeCoord.length) {
      RG.warn('Map.Generator', 'createTown',
        'No free coordinates');
    }

    const coordObj = freeCoord.reduce((acc, item) => {
        acc[item[0] + ',' + item[1]] = item;
        return acc;
    }, {});

    RG.Geometry.removeMatching(coordObj, border);

    for (let i = 0; i < nHouses; i++) {

        let houseCreated = false;
        let tries = 0;
        const xSize = RNG.getUniformInt(minX, maxX);
        const ySize = RNG.getUniformInt(minY, maxY);

        const currCoord = Object.values(coordObj);
        // Select random starting point, try to build house there
        while (!houseCreated && tries < maxTriesHouse) {
            const xy = RNG.arrayGetRand(currCoord);
            const x0 = xy[0];
            const y0 = xy[1];
            houseCreated = this.createHouse(
                map, x0, y0, xSize, ySize, doors, wallsHalos, coordObj,
                conf.wallType);
            ++tries;
        }

        if (houseCreated) {
            houses.push(houseCreated);
            const {ulx, lrx, uly, lry} = houseCreated;
            const wallCoord = RG.Geometry.getBox(ulx, uly, lrx, lry);
            const nFound = RG.Geometry.removeMatching(coordObj, wallCoord);
            if (!nFound) {
                const msg = `in box ${ulx},${uly},${lrx},${lry}`;
                RG.warn('Map.Generator', 'createTown',
                    `No free cells modified for house ${msg}`);
            }
        }

    }
    return {map, houses};
};

/* Creates a house into a given map to a location x0,y0 with given
 * dimensions. Existing doors and walls must be passed to prevent
 * overlapping.*/
MapGenerator.prototype.createHouse = function(
    map, x0, y0, xDim, yDim, doors, wallsHalos, freeCoord, wallType
) {

    const maxX = x0 + xDim;
    const maxY = y0 + yDim;

    if (!freeCoord.hasOwnProperty(maxX + ',' + maxY)) {
        return false;
    }

    const wallCoords = [];

    // House doesn't fit on the map
    if (maxX >= map.cols) {return false;}
    if (maxY >= map.rows) {return false;}

    const possibleRoom = [];
    const wallXY = RG.Geometry.getHollowBox(x0, y0, maxX, maxY);

    // Store x,y for house until failed
    for (let i = 0; i < wallXY.length; i++) {
        const x = wallXY[i][0];
        const y = wallXY[i][1];
        if (map.hasXY(x, y)) {
            if (wallsHalos.hasOwnProperty(x + ',' + y)) {
                return false;
            }
            else if (!doors.hasOwnProperty(x + ',' + y)) {
                possibleRoom.push([x, y]);
                // Exclude map border from door generation
                if (!map.isBorderXY(x, y)) {wallCoords.push([x, y]);}
            }
        }
    }

    const floorCoords = [];
    for (let x = x0 + 1; x < maxX; x++) {
        for (let y = y0 + 1; y < maxY; y++) {
            if (freeCoord.hasOwnProperty(x + ',' + y)) {
                floorCoords.push([x, y]);
            }
            else {
                return false;
            }
        }
    }

    const wallElem = MapGenerator.getWallElem(wallType);
    map.setBaseElems(possibleRoom, wallElem);
    map.setBaseElems(floorCoords, RG.ELEM.FLOOR_HOUSE);

    // Create the halo, prevents houses being too close to each other
    const haloX0 = x0 - 1;
    const haloY0 = y0 - 1;
    const haloMaxX = maxX + 1;
    const haloMaxY = maxY + 1;
    const haloBox = RG.Geometry.getHollowBox(
        haloX0, haloY0, haloMaxX, haloMaxY);
    for (let i = 0; i < haloBox.length; i++) {
        const haloX = haloBox[i][0];
        const haloY = haloBox[i][1];
        wallsHalos[haloX + ',' + haloY] = true;
    }

    // Finally randomly insert the door for the house, excluding corners
    let doorIndex = RNG.randIndex(wallCoords);
    let doorX = wallCoords[doorIndex][0];
    let doorY = wallCoords[doorIndex][1];
    let watchdog = 1000;
    while (RG.Geometry.isCorner(doorX, doorY, x0, y0, maxX, maxY)) {
        doorIndex = RNG.randIndex(wallCoords);
        doorX = wallCoords[doorIndex][0];
        doorY = wallCoords[doorIndex][1];
        --watchdog;
        if (watchdog === 0) {
            console.log(`Timed out with len ${wallCoords.length}`);
            break;
        }
    }
    wallCoords.slice(doorIndex, 1);

    // At the moment, "door" is a hole in the wall
    map.setBaseElemXY(doorX, doorY, RG.ELEM.FLOOR);
    doors[doorX + ',' + doorY] = true;

    for (let i = 0; i < wallCoords.length; i++) {
        const xHalo = wallCoords[i][0];
        const yHalo = wallCoords[i][1];
        wallsHalos[xHalo + ',' + yHalo] = true;
    }

    // Return room object
    return {
        ulx: x0, uly: y0, lrx: maxX, lry: maxY,
        walls: wallCoords,
        floor: floorCoords,
        door: [doorX, doorY]
    };
};

    /* Creates a forest map. Uses the same RNG but instead of walls, populates
     * using trees. Ratio is conversion ratio of walls to trees. For example,
     * 0.5 on average replaces half the walls with tree, and removes rest of
     * the walls. */
MapGenerator.prototype.createForest = function(conf) {
    const map = new RG.Map.CellList(this.cols, this.rows);
    const ratio = conf.ratio;
    this._mapGen = new ROT.Map.Forest(this.cols, this.rows, conf);
    this._mapGen.create((x, y, val) => {
        map.setBaseElemXY(x, y, RG.ELEM.FLOOR);
        const createTree = RNG.getUniform() <= ratio;
        if (val === 1 && createTree) {
            map.setBaseElemXY(x, y, RG.ELEM.TREE);
        }
        else if (val === 1) {
            map.setBaseElemXY(x, y, RG.ELEM.GRASS);
        }
    });
    return {map};
};

MapGenerator.prototype.createLakes = function(conf) {
    const map = new RG.Map.CellList(this.cols, this.rows);
    this._mapGen = new ROT.Map.Forest(this.cols, this.rows, conf);
    this._mapGen.create((x, y, val) => {
        map.setBaseElemXY(x, y, RG.ELEM.FLOOR);
        if (val === 1 /* && createDeep */) {
            map.setBaseElemXY(x, y, RG.ELEM.WATER);
        }
    });
    return {map};
};


MapGenerator.prototype.createWall = function(cols, rows, conf) {
    const map = new RG.Map.CellList(this.cols, this.rows);
    const wallElem = conf.wallElem || RG.ELEM.WALL;
    this._mapGen = new ROT.Map.Wall(cols, rows, conf);
    this._mapGen.create((x, y, val) => {
        if (val === 1 /* && createDeep */) {
            map.setBaseElemXY(x, y, wallElem);
        }
    });
    return {map};
};

MapGenerator.prototype.createMountain = function(cols, rows, conf) {
    const map = new RG.Map.CellList(cols, rows);
    if (!conf) {
        conf = MapGenerator.getOptions('mountain');
    }

    this._mapGen = new ROT.Map.Mountain(this.cols, this.rows, conf);
    this._mapGen.create((x, y, val) => {
        if (val > conf.highRockThr) {
            map.setBaseElemXY(x, y, RG.ELEM.HIGH_ROCK);
        }
        else if (val > conf.stoneThr) {
            map.setBaseElemXY(x, y, RG.ELEM.STONE);
        }
        else if (val < conf.chasmThr) {
            map.setBaseElemXY(x, y, RG.ELEM.CHASM);
        }
        else {
            const addSnow = RNG.getUniform();
            if (addSnow < conf.snowRatio) {
                map.setBaseElemXY(x, y, RG.ELEM.SNOW);
            }
            else {
                map.setBaseElemXY(x, y, RG.ELEM.FLOOR);
            }
        }
    });
    let paths = [];
    if (conf.nRoadTurns > 0) {
        paths = this.createMountainPath(map, conf);
    }
    return {map, paths};
};

    /* Creates a zig-zagging road across the level from south to north. */
MapGenerator.prototype.createMountainPath = function(map, conf) {
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
            map.getCell(x, y).getBaseElem().getType() !== 'highrock'
        )
    ];

    for (let i = 0; inBounds && i < nTurns; i++) {
        inBounds = false;

        let x0 = prevX;
        let y0 = prevY;
        if (i === 0) {
            x0 = Number.isInteger(conf.startX) ? conf.startX :
                RNG.arrayGetRand(xPoints);
            y0 = conf.startY ? conf.startY : 0;
        }
        const x1 = RNG.arrayGetRand(xPoints);
        const y1 = (i + 1) * yPerTurn + y0;

        // Compute 2 paths: Shortest and shortest passable. Then calculate
        // weights. Choose one with lower weight.
        if (inAllowedArea(x0, y0, x1, y1, conf)) {
            const coord = Path.getMinWeightOrShortest(map, x0, y0, x1,
                y1, passableFuncs);
            if (coord) {
                const chosenCoord = Path.addPathToMap(map, coord);
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
            let x1 = RNG.arrayGetRand(xPoints);
            const y1 = conf.maxY;
            if (conf.endX) {x1 = conf.endX;}
            if (y1 > y0) {
                if (inAllowedArea(x0, y0, x1, y1, conf)) {
                    const coord = Path.getMinWeightOrShortest(map, x0, y0,
                        x1, y1, passableFuncs);
                    if (coord) {
                        const chosenCoord = Path.addPathToMap(map, coord);
                        paths.push(chosenCoord);
                    }
                }
            }
        }
    }

    return paths;

};

    /* Creates a mountain summit. */
MapGenerator.prototype.createSummit = function(cols, rows, conf) {
    const map = new RG.Map.CellList(cols, rows, RG.ELEM.SKY);

    const ratio = conf.ratio || 0.3;
    let [cX, cY] = [Math.floor(cols / 2), Math.floor(rows / 2)];
    const totalCells = cols * rows;

    const placedCoord = [[cX, cY]];
    map.setBaseElemXY(cX, cY, RG.ELEM.FLOOR);
    let placedCells = 1;

    let watchdog = 10000;
    while (placedCells / totalCells < ratio) {
        [cX, cY] = RNG.arrayGetRand(placedCoord);
        const [dX, dY] = RNG.getRandDir();
        cX += dX;
        cY += dY;
        if (map.hasXY(cX, cY)) {
            if (map.getBaseElemXY(cX, cY).getType() === 'sky') {
                placedCoord.push([cX, cY]);
                ++placedCells;
                map.setBaseElemXY(cX, cY, RG.ELEM.FLOOR);
            }
        }
        --watchdog;
        if (watchdog <= 0) {break;}
    }

    return {map};
};

/* Creates a single cave level. */
RG.Map.Generator.prototype.createCave = function(cols, rows, conf) {
    this._mapGen = new ROT.Map.Miner(cols, rows, conf);
    const map = new RG.Map.CellList(cols, rows);
    const wallElem = conf.wallElem || RG.ELEM.WALL_CAVE;
    const floorElem = conf.floorElem || RG.ELEM.FLOOR_CAVE;
    this._mapGen.create((x, y, val) => {
        if (val === 1) {
            map.setBaseElemXY(x, y, wallElem);
        }
        else {
            map.setBaseElemXY(x, y, floorElem);
        }
    });
    return {map, mapGen: this._mapGen};
};

/* Creates a single crypt level. */
MapGenerator.prototype.createCryptNew = function(cols, rows, conf = {}) {
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
        '#': RG.ELEM.WALL_CRYPT,
        '.': RG.ELEM.FLOOR_CRYPT
    };
    const mapObj = MapGenerator.fromAsciiMap(level.map, asciiToElem);
    mapObj.tiles = level.getPlacedData();
    return mapObj;
};

MapGenerator.prototype.createCastle = function(cols, rows, conf = {}) {
    const tilesX = conf.tilesX || Math.ceil(cols / 7);
    const tilesY = conf.tilesY || Math.ceil(rows / 7);

    const level = new TemplateLevel(tilesX, tilesY);
    level.use(Castle);
    if (!conf.models && !conf.templates) {
        level.setTemplates(Castle.Models.full);
    }
    else if (typeof conf.models === 'string') {
        level.setTemplates(Castle.Models[conf.models]);
    }
    else if (typeof conf.templates === 'string') {
        console.log('using templates ' + conf.templates);
        level.setTemplates(Castle.templates[conf.templates]);
    }
    else {
        level.setTemplates(conf.models);
    }

    if (conf.nGates === 2) {
      level.setStartRoomFunc(Castle.startFuncTwoGates);
    }
    else if (conf.startRoomFunc) {
      level.setStartRoomFunc(conf.startRoomFunc);
    }

    if (conf.constraintFunc) {
        level.setConstraintFunc(conf.constraintFunc);
    }

    const genParams = conf.genParams || [1, 1, 1, 1];
    const roomCount = conf.roomCount || 40;
    level.setGenParams(genParams);
    level.setRoomCount(roomCount);

    if (conf.callbacks) {
        Object.keys(conf.callbacks).forEach(name => {
            level.addCallback(name, conf.callbacks[name]);
        });
    }

    level.create();
    const mapObj = this.createCastleMapObj(level, conf);
    return mapObj;
};

/* Constructs only outer castle wall. Can be used for fortified cities etc.
 * */
MapGenerator.prototype.createCastleWall = function(cols, rows, conf = {}) {
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

    const asciiToElem = {
        '#': RG.ELEM.WALL,
        '.': RG.ELEM.FLOOR
    };
    const castleMapObj = MapGenerator.fromAsciiMap(level.map, asciiToElem);
    castleMapObj.tiles = level.getPlacedData();
    return castleMapObj;
};

/* Creates the actual castle Map.CellList after ascii has been generated from
 * the template. */
MapGenerator.prototype.createCastleMapObj = function(level, conf) {
    const createLeverMarker = (map, x, y) => {
        map.setBaseElemXY(x, y, MapGenerator.getFloorElem(conf.floorType));
        if (conf.preserveMarkers) {
            const marker = new RG.Element.Marker('&');
            marker.setTag('lever');
            map.getCell(x, y).setProp(RG.TYPE_ELEM, marker);
        }
    };

    const createLeverDoorMarker = (map, x, y) => {
        map.setBaseElemXY(x, y, MapGenerator.getFloorElem(conf.floorType));
        if (conf.preserveMarkers) {
            const marker = new RG.Element.Marker('|');
            marker.setTag('leverdoor');
            map.getCell(x, y).setProp(RG.TYPE_ELEM, marker);
        }
    };

    const createLivingQuarterMarker = (map, x, y) => {
        map.setBaseElemXY(x, y, RG.ELEM.FLOOR_HOUSE);
        if (conf.preserveMarkers) {
            const marker = new RG.Element.Marker(':');
            marker.setTag('living_quarter');
            map.getCell(x, y).setProp(RG.TYPE_ELEM, marker);
        }
    };

    const asciiToElem = {
        '#': MapGenerator.getWallElem(conf.wallType),
        '.': MapGenerator.getFloorElem(conf.floorType),
        '&': createLeverMarker,
        '|': createLeverDoorMarker,
        ':': createLivingQuarterMarker
    };
    const mapObj = MapGenerator.fromAsciiMap(level.map, asciiToElem);
    mapObj.tiles = level.getPlacedData();
    return mapObj;
};

MapGenerator.prototype.createTownWithWall = function(cols, rows, conf = {}) {
    const tileSize = 7;
    const tilesX = Math.ceil(cols / tileSize);
    const tilesY = Math.ceil(rows / tileSize);
    const castleMapObj = this.createCastleWall(cols, rows, conf);

    conf.levelType = 'empty' || conf.levelType;
    const colsTown = (tilesX - 2) * tileSize;
    const rowsTown = (tilesY - 2) * tileSize;
    const townMapObj = this.createTown(colsTown, rowsTown, conf);

    const finalMap = castleMapObj.map;
    RG.Geometry.mergeMapBaseElems(finalMap, townMapObj.map,
        tileSize, tileSize);

    // Adjust house coordinates due to map merging
    const houses = townMapObj.houses;
    houses.forEach(house => {
        house.ulx += tileSize;
        house.uly += tileSize;
        house.lrx += tileSize;
        house.lry += tileSize;
        house.walls = house.walls.map(w => {
            w[0] += tileSize; w[1] += tileSize;
            return w;
        });
        house.floor = house.floor.map(f => {
            f[0] += tileSize; f[1] += tileSize;
            return f;
        });
        house.door[0] += tileSize; house.door[1] += tileSize;
    });

    return {
        map: finalMap,
        houses,
        tiles: castleMapObj.tiles
    };
};

MapGenerator.prototype.createArctic = function(cols, rows, conf = {}) {
    const snowRatio = conf.snowRatio || 1.0;
    this.setGen('empty', cols, rows);
    const map = new RG.Map.CellList(cols, rows);
    MapGenerator.addRandomSnow(map, snowRatio);
    return {map};
};

/* Sets the generator for room generation.*/
MapGenerator.prototype.setGen = function(type, cols, rows) {
    this.cols = cols;
    this.rows = rows;
    type = type.toLowerCase();
    this._mapType = type;
    switch (type) {
        case 'arctic': this._mapGen = new ROT.Map.Dungeon(cols, rows); break;
        case 'arena': this._mapGen = new ROT.Map.Arena(cols, rows); break;
        case 'cave': this._mapGen = new ROT.Map.Miner(cols, rows); break;
        case 'cellular': this._mapGen = this.createCellular(cols, rows); break;
        case 'castle': break;
        case 'crypt': this._mapGen = new ROT.Map.Uniform(cols, rows); break;
        case 'digger': this._mapGen = new ROT.Map.Digger(cols, rows); break;
        case 'divided':
            this._mapGen = new ROT.Map.DividedMaze(cols, rows); break;
        case 'dungeon': this._mapGen = new ROT.Map.Rogue(cols, rows); break;
        case 'empty': this._mapGen = new ROT.Map.Dungeon(cols, rows); break;
        case 'eller': this._mapGen = new ROT.Map.EllerMaze(cols, rows); break;
        case 'forest': this._mapGen = new ROT.Map.Forest(cols, rows); break;
        case 'lakes': this._mapGen = new ROT.Map.Forest(cols, rows); break;
        case 'labyrinth':
            this._mapGen = new ROT.Map.DividedMaze(cols, rows); break;
        case 'miner': this._mapGen = new ROT.Map.Miner(cols, rows); break;
        case 'mountain': this._mapGen = new ROT.Map.Mountain(cols, rows); break;
        case 'icey': this._mapGen = new ROT.Map.IceyMaze(cols, rows); break;
        case 'rogue': this._mapGen = new ROT.Map.Rogue(cols, rows); break;
        case 'uniform': this._mapGen = new ROT.Map.Uniform(cols, rows); break;
        case 'ruins': this._mapGen = this.createRuins(cols, rows); break;
        case 'rooms': this._mapGen = this.createRooms(cols, rows); break;
        case 'town': this._mapGen = new ROT.Map.Arena(cols, rows); break;
        case 'townwithwall': break;
        case 'summit': break;
        case 'wall': this._mapGen = new ROT.Map.Wall(cols, rows); break;
        default: RG.err('MapGen',
            'setGen', 'this._mapGen type ' + type + ' is unknown');
    }
};

/* Given 2-d ascii map, and mapping from ascii to Element, constructs the
 * map of base elements, and returns it. */
MapGenerator.fromAsciiMap = function(asciiMap, asciiToElem) {
    const cols = asciiMap.length;
    const rows = asciiMap[0].length;
    const map = new RG.Map.CellList(cols, rows);
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            const char = asciiMap[x][y];
            if (char === '+') {
                const marker = new RG.Element.Marker('+');
                marker.setTag('door');
                // door.setXY(x, y);
                map.setBaseElemXY(x, y, asciiToElem['.']);
                map.setElemXY(x, y, marker);
            }
            else if (asciiToElem.hasOwnProperty(char)) {
                const value = asciiToElem[char];
                if (typeof value !== 'function') {
                    map.setBaseElemXY(x, y, value);
                }
                else {
                    value(map, x, y);
                }
            }
        }
    }
    return {
        map
    };
};

MapGenerator.getWallElem = function(wallType) {
    switch (wallType) {
        case 'wallcave': return RG.ELEM.WALL_CAVE;
        case 'wallcrypt': return RG.ELEM.WALL_CRYPT;
        case 'wallice': return RG.ELEM.WALL_ICE;
        case 'wallwooden': return RG.ELEM.WALL_WOODEN;
        default: return RG.ELEM.WALL;
    }
};

MapGenerator.getFloorElem = function(floorType) {
    switch (floorType) {
        case 'floorcave': return RG.ELEM.FLOOR_CAVE;
        case 'floorcrypt': return RG.ELEM.FLOOR_CRYPT;
        case 'floorice': return RG.ELEM.FLOOR_ICE;
        case 'floorwooden': return RG.ELEM.FLOOR_WOODEN;
        default: return RG.ELEM.FLOOR;
    }
};


MapGenerator.createSplashes = function(cols, rows, conf) {
    const elem = conf.elem || RG.ELEM.WATER;
    const map = new RG.Map.CellList(cols, rows);
    const mapGen = new ROT.Map.Forest(cols, rows, conf);
    mapGen.create((x, y, val) => {
        map.setBaseElemXY(x, y, RG.ELEM.FLOOR);
        if (val === 1) {
            map.setBaseElemXY(x, y, elem);
        }
    });
    return {map};
};

/* Decorates the given map with snow. ratio is used to control how much
 * snow to put. */
MapGenerator.addRandomSnow = (map, ratio) => {
    const freeCells = map.getFree();
    for (let i = 0; i < freeCells.length; i++) {
        const addSnow = RNG.getUniform();
        if (addSnow <= ratio) {
            freeCells[i].setBaseElem(RG.ELEM.SNOW);
        }
    }
};

/* Returns a clone of the requested level options. */
MapGenerator.getOptions = function(value) {
    if (MapGenerator.options[value]) {
        return Object.assign({}, MapGenerator.options[value]);
    }
    else {
        RG.warn('MapGenerator', 'getOptions',
            `Unknown map type ${value}`);
    }
    return {};
};

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

module.exports = MapGenerator;

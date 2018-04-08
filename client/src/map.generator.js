
const RG = require('./rg.js');
const ROT = require('../../lib/rot.js');
RG.Map = require('./map');
RG.Path = require('./path');

const TemplateLevel = require('./template.level');
const Crypt = require('../data/tiles.crypt');
const Castle = require('../data/tiles.castle');

ROT.Map.Forest = require('../../lib/map.forest');
ROT.Map.Miner = require('../../lib/map.miner');
ROT.Map.Mountain = require('../../lib/map.mountain');
ROT.Map.Wall = require('../../lib/map.wall');

/* Map generator for the roguelike game.  */
RG.Map.Generator = function() { // {{{2

    this.cols = RG.LEVEL_MEDIUM_X;
    this.rows = RG.LEVEL_MEDIUM_Y;
    let _mapGen = new ROT.Map.Arena(this.cols, this.rows);
    let _mapType = null;

    const _types = ['arena', 'cellular', 'digger', 'divided', 'dungeon',
        'eller', 'icey', 'uniform', 'rogue', 'ruins', 'rooms'];

    let _wall = 1;

    this.getRandType = () => {
        const index = RG.RAND.randIndex(_types);
        return _types[index];
    };

    let _nHouses = 5;
    this.setNHouses = nHouses => {_nHouses = nHouses;};
    this.getNHouses = () => _nHouses;

    /* Sets the generator for room generation.*/
    this.setGen = function(type, cols, rows) {
        this.cols = cols;
        this.rows = rows;
        type = type.toLowerCase();
        _mapType = type;
        switch (type) {
            case 'arctic': _mapGen = new ROT.Map.Dungeon(cols, rows); break;
            case 'arena': _mapGen = new ROT.Map.Arena(cols, rows); break;
            case 'cave': _mapGen = new ROT.Map.Miner(cols, rows); break;
            case 'cellular': _mapGen = this.createCellular(cols, rows); break;
            case 'castle': break;
            case 'crypt': _mapGen = new ROT.Map.Uniform(cols, rows); break;
            case 'digger': _mapGen = new ROT.Map.Digger(cols, rows); break;
            case 'divided':
                _mapGen = new ROT.Map.DividedMaze(cols, rows); break;
            case 'dungeon': _mapGen = new ROT.Map.Rogue(cols, rows); break;
            case 'empty': _mapGen = new ROT.Map.Dungeon(cols, rows); break;
            case 'eller': _mapGen = new ROT.Map.EllerMaze(cols, rows); break;
            case 'forest': _mapGen = new ROT.Map.Forest(cols, rows); break;
            case 'lakes': _mapGen = new ROT.Map.Forest(cols, rows); break;
            case 'labyrinth':
                _mapGen = new ROT.Map.DividedMaze(cols, rows); break;
            case 'miner': _mapGen = new ROT.Map.Miner(cols, rows); break;
            case 'mountain': _mapGen = new ROT.Map.Mountain(cols, rows); break;
            case 'icey': _mapGen = new ROT.Map.IceyMaze(cols, rows); break;
            case 'rogue': _mapGen = new ROT.Map.Rogue(cols, rows); break;
            case 'uniform': _mapGen = new ROT.Map.Uniform(cols, rows); break;
            case 'ruins': _mapGen = this.createRuins(cols, rows); break;
            case 'rooms': _mapGen = this.createRooms(cols, rows); break;
            case 'town': _mapGen = new ROT.Map.Arena(cols, rows); break;
            case 'townwithwall': break;
            case 'summit': break;
            case 'wall': _mapGen = new ROT.Map.Wall(cols, rows); break;
            default: RG.err('MapGen',
                'setGen', '_mapGen type ' + type + ' is unknown');
        }
    };

	this.createEmptyMap = function() {
        const map = new RG.Map.CellList(this.cols, this.rows);
        const obj = {map};
        return obj;
	};

    /* Returns an object containing randomized map + all special features
     * based on initialized generator settings. */
    this.getMap = function() {
        const obj = {};
        if (typeof _mapGen === 'function') {
            obj.map = _mapGen();
        }
        else {
            const map = new RG.Map.CellList(this.cols, this.rows);
            _mapGen.create((x, y, val) => {
                if (val === _wall) {
                    map.setBaseElemXY(x, y, RG.ELEM.WALL);
                }
                else {
                    map.setBaseElemXY(x, y, RG.ELEM.FLOOR);
                }
            });
            obj.map = map;
            if (_mapType === 'uniform' || _mapType === 'digger') {
                obj.rooms = _mapGen.getRooms();
                obj.corridors = _mapGen.getCorridors();
            }
        }
        return obj;
    };

    /* For adding special features to the levels. Works only with types digger
    * and uniform at the moment. */
    this.addSpecialRoom = function() {
        if (_mapType === 'digger' /* || _mapType === 'uniform'*/ ) {
            // const room = new ROT.Map.Feature.Room(1, 1, 20, this.rows - 2);
            const room = new ROT.Map.Feature.Room(1, 10, this.cols - 2, 15);
            _mapGen._options.dugPercentage = 0.4;
            _mapGen._options.roomDugPercentage = 0.1;
            _mapGen.startRoom(room);

            // const room2 = new ROT.Map.Feature.Room(1, 30, this.cols - 2, 35);
            const room2 = new ROT.Map.Feature.Room(50, 1, 55, this.rows - 2);
            _mapGen.addRoom(room2);
        }
    };

    /* Creates "ruins" type level with open outer edges and inner
     * "fortress" with some tunnels. */
    this.createRuins = (cols, rows) => {
        const conf = {born: [4, 5, 6, 7, 8],
            survive: [2, 3, 4, 5], connected: true};
        const map = new ROT.Map.Cellular(cols, rows, conf);
        map.randomize(0.9);
        for (let i = 0; i < 5; i++) {map.create();}
        map.connect(null, 1);
        _wall = 0;
        return map;
    };

    /* Creates a cellular type dungeon and makes all areas connected.*/
    this.createCellular = (cols, rows) => {
        const map = new ROT.Map.Cellular(cols, rows,
            {connected: true});
        map.randomize(0.52);
        for (let i = 0; i < 5; i++) {map.create();}
        map.connect(null, 1);
        _wall = 0;
        return map;
    };

    this.createRooms = (cols, rows) => {
        const map = new ROT.Map.Digger(cols, rows,
            {roomWidth: [5, 20], dugPercentage: 0.7});
        return map;
    };

    /* Creates a town level of size cols X rows. */
    this.createTown = function(cols, rows, conf) {
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
            const xSize = RG.RAND.getUniformInt(minX, maxX);
            const ySize = RG.RAND.getUniformInt(minY, maxY);

            const currCoord = Object.values(coordObj);
            // Select random starting point, try to build house there
            while (!houseCreated && tries < maxTriesHouse) {
                const xy = RG.RAND.arrayGetRand(currCoord);
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
    this.createHouse = function(
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

        const wallElem = this.getWallElem(wallType);
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
        let doorIndex = RG.RAND.randIndex(wallCoords);
        let doorX = wallCoords[doorIndex][0];
        let doorY = wallCoords[doorIndex][1];
        let watchdog = 1000;
        while (RG.Geometry.isCorner(doorX, doorY, x0, y0, maxX, maxY)) {
            doorIndex = RG.RAND.randIndex(wallCoords);
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
    this.createForest = function(conf) {
        const map = new RG.Map.CellList(this.cols, this.rows);
        const ratio = conf.ratio;
        _mapGen = new ROT.Map.Forest(this.cols, this.rows, conf);
        _mapGen.create((x, y, val) => {
            map.setBaseElemXY(x, y, RG.ELEM.FLOOR);
            const createTree = RG.RAND.getUniform() <= ratio;
            if (val === 1 && createTree) {
                map.setBaseElemXY(x, y, RG.ELEM.TREE);
            }
            else if (val === 1) {
                map.setBaseElemXY(x, y, RG.ELEM.GRASS);
            }
        });
        return {map};
    };

    this.createLakes = function(conf) {
        const map = new RG.Map.CellList(this.cols, this.rows);
        _mapGen = new ROT.Map.Forest(this.cols, this.rows, conf);
        _mapGen.create((x, y, val) => {
            map.setBaseElemXY(x, y, RG.ELEM.FLOOR);
            if (val === 1 /* && createDeep */) {
                map.setBaseElemXY(x, y, RG.ELEM.WATER);
            }
        });
        return {map};
    };


    this.createWall = function(cols, rows, conf) {
        const map = new RG.Map.CellList(this.cols, this.rows);
        _mapGen = new ROT.Map.Wall(cols, rows, conf);
        _mapGen.create((x, y, val) => {
            if (val === 1 /* && createDeep */) {
                map.setBaseElemXY(x, y, RG.ELEM.WALL);
            }
        });
        return {map};
    };

    this.createMountain = function(cols, rows, conf) {
        const map = new RG.Map.CellList(cols, rows);
        if (!conf) {
            conf = {};
        }
        if (!conf.hasOwnProperty('highRockThr')) {conf.highRockThr = 0.75;}
        if (!conf.hasOwnProperty('stoneThr')) {conf.stoneThr = 0.4;}
        if (!conf.hasOwnProperty('chasmThr')) {conf.chasmThr = -0.3;}
        if (!conf.hasOwnProperty('nRoadTurns')) {conf.nRoadTurns = 4;}
        if (!conf.hasOwnProperty('snowRatio')) {conf.nSnowRatio = 0.0;}

        _mapGen = new ROT.Map.Mountain(this.cols, this.rows, conf);
        _mapGen.create((x, y, val) => {
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
                const addSnow = RG.RAND.getUniform();
                if (addSnow < conf.snowRatio) {
                    map.setBaseElemXY(x, y, RG.ELEM.SNOW);
                }
                else {
                    map.setBaseElemXY(x, y, RG.ELEM.FLOOR);
                }
            }
        });
        const paths = [];
        if (conf.nRoadTurns > 0) {
            this.createMountainPath(map, paths, conf);
        }
        return {map, paths};
    };

    /* Creates a zig-zagging road across the level from south to north. */
    this.createMountainPath = function(map, paths, conf) {
        const nTurns = conf.nRoadTurns || 10;
        let yPerTurn = Math.floor(map.rows / nTurns);
        if (yPerTurn < 4) {yPerTurn = 4;} // Prevent too little path progression
        const xLeft = 2;
        const xRight = map.cols - 3;

        let inBounds = true;
        for (let i = 0; inBounds && i < nTurns; i++) {
            inBounds = false;
            const x0 = i % 2 === 0 ? xLeft : xRight;
            const x1 = i % 2 === 1 ? xLeft : xRight;
            const yLow = i * yPerTurn;
            const yHigh = (i + 1) * yPerTurn;

            // Compute 2 paths: Shortest and shortest passable. Then calculate
            // weights. Choose one with lower weight.
            const coord = RG.Path.getMinWeightPath(map, x0, yLow, x1, yHigh);
            const chosenCoord = RG.Path.addPathToMap(map, coord);
            if (chosenCoord.length > 0) {inBounds = true;}
            paths.push(chosenCoord);
        }

    };

    /* Creates a mountain summit. */
    this.createSummit = function(cols, rows, conf) {
        const map = new RG.Map.CellList(cols, rows, RG.ELEM.SKY);

        const ratio = conf.ratio || 0.3;
        let [cX, cY] = [Math.floor(cols / 2), Math.floor(rows / 2)];
        const totalCells = cols * rows;

        const placedCoord = [[cX, cY]];
        map.setBaseElemXY(cX, cY, RG.ELEM.FLOOR);
        let placedCells = 1;

        let watchdog = 10000;
        while (placedCells / totalCells < ratio) {
            [cX, cY] = RG.RAND.arrayGetRand(placedCoord);
            const [dX, dY] = RG.RAND.getRandDir();
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
    this.createCave = (cols, rows, conf) => {
        _mapGen = new ROT.Map.Miner(cols, rows, conf);
        const map = new RG.Map.CellList(cols, rows);
        _mapGen.create((x, y, val) => {
            if (val === 1) {
                map.setBaseElemXY(x, y, RG.ELEM.WALL_CAVE);
            }
            else {
                map.setBaseElemXY(x, y, RG.ELEM.FLOOR_CAVE);
            }
        });
        return {map};
    };

    /* Creates a single crypt level. */
    this.createCryptNew = function(cols, rows, conf = {}) {
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
        const mapObj = this.createMapFromAsciiMap(level.map, asciiToElem);
        mapObj.tiles = level.xyToBbox;
        return mapObj;

    };

    this.createCastle = function(cols, rows, conf = {}) {
        const tilesX = conf.tilesX || Math.ceil(cols / 7);
        const tilesY = conf.tilesY || Math.ceil(rows / 7);

        const level = new TemplateLevel(tilesX, tilesY);
        level.use(Castle);
        level.setTemplates(Castle.Models.full);

        if (conf.nGates === 2) {
          level.setStartRoomFunc(Castle.startFuncTwoGates);
        }
        else if (conf.startRoomFunc) {
          level.setStartRoomFunc(conf.startRoomFunc);
        }

        const genParams = conf.genParams || [1, 1, 1, 1];
        const roomCount = conf.roomCount || 40;
        level.setGenParams(genParams);
        level.setRoomCount(roomCount);
        level.create();

        const asciiToElem = {
            '#': this.getWallElem(conf.wallType),
            '.': this.getFloorElem(conf.floorType)
        };
        const mapObj = this.createMapFromAsciiMap(level.map, asciiToElem);
        mapObj.tiles = level.xyToBbox;
        return mapObj;
    };

    this.createCastleWall = function(cols, rows, conf = {}) {
        const tilesX = Math.ceil(cols / 7);
        const tilesY = Math.ceil(rows / 7);
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
        level.create();

        const asciiToElem = {
            '#': RG.ELEM.WALL,
            '.': RG.ELEM.FLOOR
        };
        const castleMapObj = this.createMapFromAsciiMap(level.map, asciiToElem);
        castleMapObj.tiles = level.xyToBbox;
        return castleMapObj;
    };

    this.createTownWithWall = function(cols, rows, conf = {}) {
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

    this.createArctic = function(cols, rows, conf = {}) {
        const snowRatio = conf.snowRatio || 1.0;
        this.setGen('empty', cols, rows);
        const map = new RG.Map.CellList(cols, rows);
        RG.Map.Generator.addRandomSnow(map, snowRatio);
        return {map};
    };

    /* Given 2-d ascii map, and mapping from ascii to Element, constructs the
     * map of base elements, and returns it. */
    this.createMapFromAsciiMap = (asciiMap, asciiToElem) => {
        const cols = asciiMap.length;
        const rows = asciiMap[0].length;
        const map = new RG.Map.CellList(cols, rows);
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                if (asciiMap[x][y] === '+') {
                    const door = new RG.Element.Door();
                    map.setBaseElemXY(x, y, asciiToElem['.']);
                    map.setElemXY(x, y, door);
                }
                else {
                    const baseElem = asciiToElem[asciiMap[x][y]];
                    map.setBaseElemXY(x, y, baseElem);
                }
            }
        }
        return {
            map
        };
    };

    this.getWallElem = wallType => {
        switch (wallType) {
            case 'wallcave': return RG.ELEM.WALL_CAVE;
            case 'wallcrypt': return RG.ELEM.WALL_CRYPT;
            case 'wallice': return RG.ELEM.WALL_ICE;
            case 'wallwooden': return RG.ELEM.WALL_WOODEN;
            default: return RG.ELEM.WALL;
        }

    };

    this.getFloorElem = floorType => {
        switch (floorType) {
            case 'floorcave': return RG.ELEM.FLOOR_CAVE;
            case 'floorcrypt': return RG.ELEM.FLOOR_CRYPT;
            case 'floorice': return RG.ELEM.FLOOR_ICE;
            case 'floorwooden': return RG.ELEM.FLOOR_WOODEN;
            default: return RG.ELEM.FLOOR;
        }
    };


}; // }}} Map.Generator

/* Decorates the given map with snow. ratio is used to control how much
 * snow to put. */
RG.Map.Generator.addRandomSnow = (map, ratio) => {
    const freeCells = map.getFree();
    for (let i = 0; i < freeCells.length; i++) {
        const addSnow = RG.RAND.getUniform();
        if (addSnow <= ratio) {
            freeCells[i].setBaseElem(RG.ELEM.SNOW);
        }
    }
};

module.exports = RG.Map.Generator;

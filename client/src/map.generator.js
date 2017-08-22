
const RG = require('./rg.js');
const ROT = require('../../lib/rot.js');
RG.Map = require('./map');

const TemplateLevel = require('./template.level');
const Crypt = require('../data/tiles.crypt');
const Castle = require('../data/tiles.castle');

/* Map generator for the roguelike game.  */
RG.Map.Generator = function() { // {{{2

    this.cols = RG.LEVEL_MEDIUM_X;
    this.rows = RG.LEVEL_MEDIUM_Y;
    let _mapGen = new ROT.Map.Arena(this.cols, this.rows);
    let _mapType = null;

    const _types = ['arena', 'cellular', 'digger', 'divided', 'dungeon',
        'eller', 'icey', 'uniform', 'rogue', 'ruins', 'rooms'];

    let _wall = 1;

    this.getRandType = function() {
        const index = RG.RAND.randIndex(_types);
        return _types[index];
    };

    let _nHouses = 5;
    this.setNHouses = function(nHouses) {_nHouses = nHouses;};
    this.getNHouses = function() {return _nHouses;};

    /* Sets the generator for room generation.*/
    this.setGen = function(type, cols, rows) {
        this.cols = cols;
        this.rows = rows;
        type = type.toLowerCase();
        _mapType = type;
        switch (type) {
            case 'arena': _mapGen = new ROT.Map.Arena(cols, rows); break;
            case 'cave': _mapGen = new ROT.Map.Miner(cols, rows); break;
            case 'cellular': _mapGen = this.createCellular(cols, rows); break;
            case 'castle': _mapGen = this.createCastle.bind(this, cols, rows); break;
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
            default: RG.err('MapGen',
                'setGen', '_mapGen type ' + type + ' is unknown');
        }
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
            _mapGen.create(function(x, y, val) {
                if (val === _wall) {
                    map.setBaseElemXY(x, y, RG.WALL_ELEM);
                }
                else {
                    map.setBaseElemXY(x, y, RG.FLOOR_ELEM);
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

    /* Creates "ruins" type level with open outer edges and inner
     * "fortress" with some tunnels. */
    this.createRuins = function(cols, rows) {
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
    this.createCellular = function(cols, rows) {
        const map = new ROT.Map.Cellular(cols, rows,
            {connected: true});
        map.randomize(0.52);
        for (let i = 0; i < 5; i++) {map.create();}
        map.connect(null, 1);
        _wall = 0;
        return map;
    };

    this.createRooms = function(cols, rows) {
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

        RG.Geometry.removeMatching(freeCoord, border);

        for (let i = 0; i < nHouses; i++) {

            let houseCreated = false;
            let tries = 0;
            const xSize = RG.RAND.getUniformInt(minX, maxX);
            const ySize = RG.RAND.getUniformInt(minY, maxY);

            // Select random starting point, try to build house there
            while (!houseCreated && tries < maxTriesHouse) {
                const xy = RG.RAND.arrayGetRand(freeCoord);
                // const x0 = RG.RAND.getUniformInt(2, cols - 1 - maxX - 1);
                // const y0 = RG.RAND.getUniformInt(2, rows - 1 - maxY - 1);
                const x0 = xy[0];
                const y0 = xy[1];
                houseCreated = this.createHouse(
                    map, x0, y0, xSize, ySize, doors, wallsHalos, freeCoord,
                    conf.wallType);
                ++tries;
            }
            if (houseCreated) {
                houses.push(houseCreated);
                const {llx, urx, lly, ury} = houseCreated;
                const wallCoord = RG.Geometry.getBox(llx, lly, urx, ury);
                const nFound = RG.Geometry.removeMatching(freeCoord, wallCoord);
                if (!nFound) {
                    const msg = `in box ${llx},${lly},${urx},${ury}`;
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

        const freeIndex = freeCoord.findIndex(xy => (
            xy[0] === maxX && xy[1] === maxY
        ));
        if (freeIndex < 0) {return false;}

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
                const index = freeCoord.findIndex(xy => (
                    xy[0] === x && xy[1] === y
                ));
                if (index >= 0) {
                    floorCoords.push([x, y]);
                }
                else {
                    return false;
                }
            }
        }

        // House generation has succeeded at this point
        if (!wallType) {
            map.setBaseElems(possibleRoom, RG.WALL_ELEM);
        }
        else {
            map.setBaseElems(possibleRoom, RG.WALL_WOODEN_ELEM);
        }

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
        map.setBaseElemXY(doorX, doorY, RG.FLOOR_ELEM);
        doors[doorX + ',' + doorY] = true;

        for (let i = 0; i < wallCoords.length; i++) {
            const xHalo = wallCoords[i][0];
            const yHalo = wallCoords[i][1];
            wallsHalos[xHalo + ',' + yHalo] = true;
        }


        // Return room object
        return {
            llx: x0, lly: y0, urx: maxX, ury: maxY,
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
        _mapGen.create(function(x, y, val) {
            map.setBaseElemXY(x, y, RG.FLOOR_ELEM);
            const createTree = RG.RAND.getUniform() <= ratio;
            if (val === 1 && createTree) {
                map.setBaseElemXY(x, y, RG.TREE_ELEM);
            }
            else if (val === 1) {
                map.setBaseElemXY(x, y, RG.GRASS_ELEM);
            }
        });
        return {map};
    };

    this.createLakes = function(conf) {
        const map = new RG.Map.CellList(this.cols, this.rows);
        // const ratio = conf.ratio;
        _mapGen = new ROT.Map.Forest(this.cols, this.rows, conf);
        _mapGen.create(function(x, y, val) {
            map.setBaseElemXY(x, y, RG.FLOOR_ELEM);
            // const createDeep = RG.RAND.getUniform() <= ratio;
            if (val === 1 /* && createDeep */) {
                map.setBaseElemXY(x, y, RG.WATER_ELEM);
            }
            /* else if (val === 1) {
                map.setBaseElemXY(x, y, RG.GRASS_ELEM);
            }*/
        });
        return {map};
    };

    this.createMountain = function(conf) {
        const map = new RG.Map.CellList(this.cols, this.rows);
        if (!conf) {
            conf = {};
        }
        if (!conf.hasOwnProperty('highRockThr')) {conf.highRockThr = 0.75;}
        if (!conf.hasOwnProperty('stoneThr')) {conf.stoneThr = 0.4;}
        if (!conf.hasOwnProperty('chasmThr')) {conf.chasmThr = -0.3;}
        if (!conf.hasOwnProperty('nRoadTurns')) {conf.nRoadTurns = 4;}

        _mapGen = new ROT.Map.Mountain(this.cols, this.rows, conf);
        _mapGen.create(function(x, y, val) {
            if (val > conf.highRockThr) {
                map.setBaseElemXY(x, y, RG.HIGH_ROCK_ELEM);
            }
            else if (val > conf.stoneThr) {
                map.setBaseElemXY(x, y, RG.STONE_ELEM);
            }
            else if (val < conf.chasmThr) {
                map.setBaseElemXY(x, y, RG.CHASM_ELEM);
            }
            else {
                map.setBaseElemXY(x, y, RG.FLOOR_ELEM);
            }
        });
        const paths = [];
        this.createMountainPath(map, paths, conf);
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
            const coordPassable = RG.getShortestPassablePath(map,
                x0, yLow, x1, yHigh);
            const coordShortest = RG.getShortestPath(x0, yLow, x1, yHigh);
            const passableWeight = this.getPathWeight(map, coordPassable);
            const shortestWeight = this.getPathWeight(map, coordShortest);

            let coord = null;
            if (coordPassable.length === 0) {
                coord = coordShortest;
            }
            else {
                coord = passableWeight >= shortestWeight ? coordShortest
                    : coordPassable;
            }

            const chosenCoord = [];
            for (let j = 0; j < coord.length; j++) {
                const c = coord[j];
                if (map.hasXY(c.x, c.y)) {
                    const baseElem = map.getBaseElemXY(c.x, c.y);
                    if (baseElem.getType() === 'chasm') {
                        map.setBaseElemXY(c.x, c.y, RG.BRIDGE_ELEM);
                    }
                    else if (baseElem.getType() === 'stone') {
                        // TODO add mountain path
                        map.setBaseElemXY(c.x, c.y, RG.ROAD_ELEM);
                    }
                    else {
                        map.setBaseElemXY(c.x, c.y, RG.ROAD_ELEM);
                    }
                    inBounds = true;
                    chosenCoord.push(c);
                }
            }
            paths.push(chosenCoord);
        }

    };

    this.getPathWeight = function(map, coord) {
        let w = 0;
        coord.forEach(c => {
            if (map.hasXY(c.x, c.y)) {
                const elem = map.getBaseElemXY(c.x, c.y);
                switch (elem.getType()) {
                    case 'floor': w += 1; break;
                    case 'stone': w += 2; break;
                    case 'highrock': w += 4; break;
                    case 'chasm': w += 5; break;
                    default: w += 0; break;
                }
            }
        });
        return w;
    };

    /* Creates a single cave level. */
    this.createCave = function(cols, rows, conf) {
        _mapGen = new ROT.Map.Miner(cols, rows, conf);
        const map = new RG.Map.CellList(cols, rows);
        _mapGen.create(function(x, y, val) {
            if (val === 1) {
                map.setBaseElemXY(x, y, RG.WALL_CAVE_ELEM);
            }
            else {
                map.setBaseElemXY(x, y, RG.FLOOR_CAVE_ELEM);
            }
        });
        return {map};
    };

    /* Creates a single crypt level. */
    this.createCryptNew = function(cols, rows, conf = {}) {
        const tilesX = conf.tilesX || 12;
        const tilesY = conf.tilesY || 8;
        const level = new TemplateLevel(tilesX, tilesY);
        level.use(Crypt);

        const genParams = conf.genParams || [1, 1, 1, 1];
        const roomCount = conf.roomCount || 40;
        level.setGenParams(genParams);
        level.setRoomCount(roomCount);
        level.create();

        const asciiToElem = {
            '#': RG.WALL_CRYPT_ELEM,
            '.': RG.FLOOR_CRYPT_ELEM
        };
        const mapObj = this.createMapFromAsciiMap(level.map, asciiToElem);
        mapObj.tiles = level.xyToBbox;
        return mapObj;

    };

    this.createCastle = function(cols, rows, conf = {}) {
        const tilesX = conf.tilesX || 12;
        const tilesY = conf.tilesY || 8;
        const level = new TemplateLevel(tilesX, tilesY);
        level.use(Castle);
        level.setTemplates(Castle.Models.full);

        const genParams = conf.genParams || [1, 1, 1, 1];
        const roomCount = conf.roomCount || 40;
        level.setGenParams(genParams);
        level.setRoomCount(roomCount);
        level.create();

        const asciiToElem = {
            '#': RG.WALL_ELEM,
            '.': RG.FLOOR_ELEM
        };
        const mapObj = this.createMapFromAsciiMap(level.map, asciiToElem);
        mapObj.tiles = level.xyToBbox;
        return mapObj;
    };

    /* Given 2-d ascii map, and mapping from ascii to Element, constructs the
     * map of base elements, and returns it. */
    this.createMapFromAsciiMap = function(asciiMap, asciiToElem) {
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

}; // }}} Map.Generator

/* Decorates the given map with snow. ratio is used to control how much
 * snow to put. */
RG.Map.Generator.addRandomSnow = function(map, ratio) {
    const freeCells = map.getFree();
    for (let i = 0; i < freeCells.length; i++) {
        const addSnow = RG.RAND.getUniform();
        if (addSnow <= ratio) {
            freeCells[i].setBaseElem(RG.SNOW_ELEM);
        }
    }
};

module.exports = RG.Map.Generator;

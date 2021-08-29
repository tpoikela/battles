
import RG from '../rg';
import Digger from '../../../lib/rot-js/map/digger';
import Uniform from '../../../lib/rot-js/map/uniform';
import {Room} from '../../../lib/rot-js/map/features';
import dbg from 'debug';

import {LevelGenerator, ILevelGenOpts} from './level-generator';
import {CellMap} from '../map';
import {Level} from '../level';
import {Geometry} from '../geometry';
import {MapGenerator} from './map.generator';
import {Path} from '../path';
import {DungeonPopulate} from '../dungeon-populate';
import {Random} from '../random';
import {ELEM, getElem} from '../../data/elem-constants';
import {ObjectShell} from '../objectshellparser';
import {ElementMarker, ElementDoor} from '../element';
import {ICoordXY, TCoord} from '../interfaces';
import {NestGenerator, NestOpts} from './nest-generator';
import {BBox} from '../bbox';

type Cell = import('../map.cell').Cell;

type NumPair = [number, number];

const WALL = 1;
const debug = dbg('bitn:dungeon');
// debug.enabled = true;

const MapDigger = Digger;
const MapUniform = Uniform;
const FeatRoom = Room;
const RNG = Random.getRNG();

const shortestPath = Path.getShortestPath;
// Number of cells allowed to be unreachable
const maxUnreachable = 10;

const NEST_TILE_X = 7;
const NEST_TILE_Y = 7;
const NEST_GENPARAMS = {x: [1, 1, 1], y: [1, 1, 1]};

// Used for testing connectivity with floodfill
const FILL_FUNC = (c: Cell): boolean => !c.hasObstacle() || c.hasDoor();

const SPLASH_THEMES = {
    chasm: {
        elem: ELEM.CHASM
    },
    water: {
        elem: ELEM.WATER
    },
    snow: {
        elem: ELEM.SNOW
    },
    forest: {
        elem: ELEM.TREE
    },
    fire: {
        elem: ELEM.LAVA
    }
};

const DUG_MAX = 0.75;
const PROB = {
    BIG_VAULT: 0.07,
    // BIG_VAULT: 0.00,
    BIG_ROOM: 0.5,
    bigRoomWeights: {
        cross: 1,
        corridor: 1,
        vault: 1,
        center: 1,
        nest: 5
    }
};

/* Maps a big room to different possible features. The key is matched using
* regular expression. This means the keys must be uniquely matchable. */
const bigRoomType2Feature = {
    'cross': {
        special: ['splashes']
    },
    'small vault': {},
    'large vault': {},
    'large corridor': {
        special: ['splashes']
    },
    'center': {
    },
    'nest': {
    }
};

/* Data struct for big rooms. */
class BigRoom {
    constructor(public type: string, public room: any) {
    }
}

export interface DungeonOpts extends ILevelGenOpts {
    levelType: string;
    dungeonType: string;
    nBigRooms: number;
    bigRooms: {
        bigRoomX: string[];
        bigRoomY: string[];
        bigRoomWidth: number[];
        bigRoomHeight: number[];
    };
    minNumRooms: number;
    options: {[key: string]: any};
    rerunOnFailure: boolean;
    errorOnFailure: boolean;
}

export type PartialDungeonOpts = Partial<DungeonOpts>;

/* This class is used to generate different dungeon levels. */
export class DungeonGenerator extends LevelGenerator {

    public static mapOptions: {[key: string]: any}; // TODO fix typings

    /* Returns the default options for dungeon level generation. */
    public static getOptions(type = 'digger'): DungeonOpts {
        const opts = LevelGenerator.getOptions();
        const levelOpts = {
            levelType: type, nBigRooms: 1,
            dungeonType: '',
            wallType: 'walldungeon',
            floorType: 'floordungeon',
            bigRooms: {
                bigRoomX: ['cen'], bigRoomY: ['cen'],
                bigRoomWidth: [10], bigRoomHeight: [10],
            },
            minNumRooms: 3,
            rerunOnFailure: true, errorOnFailure: false
        };
        // Options specific to map gen (ie digger or uniform)
        const mapOpts = {options: mapOptions[type]};
        return Object.assign(levelOpts, mapOpts, opts);
    }

    public static addStairsToTwoRooms(level: Level): void {
        // Default is to find rooms that are far away from each other
        const extras = level.getExtras();
        let watchdog = RG.WATCHDOG;
        if (extras.rooms) {

            // 1. Find 2 different rooms with maximum center distance
            let [room1, room2] = RNG.getUniqueItems(extras.rooms, 2);
            let chosenRoom1 = null;
            let chosenRoom2 = null;
            let dist = 0;
            let largestDist = 0;
            const minRoomDistance = Math.floor(level.getMap().cols / 2)
                + Math.floor(level.getMap().rows / 2);

            while (dist < minRoomDistance) {
                [room1, room2] = RNG.getUniqueItems(extras.rooms, 2);
                dist = getRoomDist(level, room1, room2);
                if (dist > largestDist) {
                    largestDist = dist;
                    chosenRoom1 = room1;
                    chosenRoom2 = room2;
                }
                if (--watchdog === 0) {break;}
            }
            room1 = chosenRoom1;
            room2 = chosenRoom2;

            debug('Rooms for stairs locations', room1, room2);

            // const [cx1, cy1] = room1.getCenter();
            // const [cx2, cy2] = room2.getCenter();

            const freeCells1 = level.getMap().getFreeInBbox(room1.getBbox());
            const freeCells2 = level.getMap().getFreeInBbox(room2.getBbox());
            const freeCell1 = RNG.arrayGetRand(freeCells1);
            const freeCell2 = RNG.arrayGetRand(freeCells2);

            if (!freeCell1) {
                RG.err('DungeonGenerator', 'addStairsLocation',
                   `Failed to find free place for Stairs@room1`);
            }
            if (!freeCell2) {
                RG.err('DungeonGenerator', 'addStairsLocation',
                   `Failed to find free place for Stairs@room2`);
            }

            // Store the points to extras
            extras.startPoint = freeCell2.getXY(); //[cx2, cy2];
            extras.endPoint = freeCell1.getXY(); // [cx1, cy1];

            const {startPoint, endPoint} = extras;
            LevelGenerator.addStartAndEndPointMarker(level, startPoint, endPoint);

            // Place markers to later identify the points from the level
            room1.addStairs(...extras.endPoint, true);
            room2.addStairs(...extras.startPoint, false);
            // level.debugPrintInASCII();
        }
        else {
            // Resort to random placement, no worthwhile rooms, although this
            // raises the question if the whole level should be discarded
            const msg = 'rooms must be set as level extras';
            RG.err('DungeonGenerator', 'addStairsToTwoRooms',
                'Not enough rooms to add stairs. ' + msg);
        }
    }

    public addDoors: boolean;

    constructor() {
        super();
        this.addDoors = true;
        this.shouldRemoveMarkers = true;
        this._debug = this._debug || debug.enabled;
    }

    /* Creates the actual Map.Level. User should call this function with desired
     * size (X * Y) and configuration. */
    public create(cols: number, rows: number, conf: PartialDungeonOpts): Level {
        // Creates the Map.Level with rooms, walls and floor
        const level: Level = this._createLevel(cols, rows, conf);

        // Add things like water, chasms, bridges
        this.addSpecialFeatures(level);

        // Determine stairs locations
        DungeonGenerator.addStairsToTwoRooms(level);

        // Add critical path (player must pass through this, usually), not entirely
        // true as there are usually many paths from start to end
        DungeonGenerator.addCriticalPath(level);

        // Optional verification of connectivity etc.
        if (conf.rerunOnFailure || conf.errorOnFailure) {
            // const fillDiag = true;
            if (!this.verifyLevel(level, conf)) {
                console.log('verifyLevel failed. Re-running');
                this.create(cols, rows, conf);
            }
        }

        if (!conf.maxRarity) {
            RG.err('DungeonGenerator', 'create',
                'No maxRarity given in the config');
        }

        const populate = new DungeonPopulate({
            theme: '',
            maxDanger: conf.maxDanger, maxValue: conf.maxValue,
            itemFunc: shell => shell.type !== 'food',
        });
        // Finally, we could populate the level with items/actors here
        populate.populateLevel(level);

        const markerConf: any = {};
        if (conf.shouldRemoveMarkers || this.shouldRemoveMarkers) {
            markerConf.shouldRemoveMarkers = true;
            markerConf.markersPreserved = false;
            console.log('KKK xyz should remove dungeon markers');
        }
        this.removeMarkers(level, markerConf);
        return level;
    }

    /* Creates the Map.Level with extras (such as rooms) added. */
    public _createLevel(cols: number, rows: number, conf: PartialDungeonOpts): Level {
        if (!cols) {
            cols = RNG.getUniformInt(80, 120);
        }
        if (!rows) {
            rows = RNG.getUniformInt(28, 56);
        }
        const minNumRooms = conf.minNumRooms || 3;
        let mapGen = null;
        let map: null | CellMap = null;
        const createCb = (x: number, y: number, val: number): void => {
            if (val === WALL) {
                map!.setBaseElemXY(x, y, getElem(conf.wallType) || ELEM.WALL);
            }
            else {
                map!.setBaseElemXY(x, y, getElem(conf.floorType) || ELEM.FLOOR_CAVE);
            }
        };

        // Generate new base map until we have enough rooms
        let watchdog = 10;
        while (!mapGen || mapGen.getRooms().length < minNumRooms) {
            mapGen = this.getMapGen(cols, rows, conf);
            map = new CellMap(cols, rows);
            mapGen.create(createCb);
            if (--watchdog === 0) {
                break;
            }
        }

        const level = new Level(map!);
        const extras: any = { // TODO fix typing
            rooms: mapGen.getRooms(),
            corridors: mapGen.getCorridors()
        };
        if ((mapGen as any).bigRooms) {
            extras.bigRooms = (mapGen as any).bigRooms;
        }
        level.setExtras(extras);
        this.addNestIntoLevel(level);
        return level;
    }

    public getMapGen(cols: number, rows: number, conf: PartialDungeonOpts) {
        let levelType = getRandMapType();
        if (conf.dungeonType && conf.dungeonType !== '') {
            levelType = conf.dungeonType;
        }

        const mapOpts = conf.options || mapOptions[levelType];
        if (mapOpts && !mapOpts.roomDugPercentage) {
            mapOpts.roomDugPercentage = mapOpts.dugPercentage;
        }
        // const mapGen = new MapDigger(cols, rows, mapOpts);
        const mapGen = new MapUniform(cols, rows, mapOpts);
        // Here we need to add special rooms etc
        const bigRooms = this.addBigRooms(mapGen, conf);
        if (bigRooms.length > 0) {
            (mapGen as any).bigRooms = bigRooms;
        }
        return mapGen;
    }

    /* Creates 'big' rooms for the map. Rooms can be used a normal room as it is, or
     * as a container for other special feature like vault. The first big room is
     * always guaranteed to be connected by the algorith. 2nd room may not be
     * connected, but this can be checked if necessary.
     */
    public addBigRooms(mapGen, conf: PartialDungeonOpts): BigRoom[] {
        let bigRoomsCreated: BigRoom[] = [];

        // Generate different options for big rooms:
        //   1. Left/right big corridor [X]
        //   2. Center hor/ver corridor [X]
        //   3. Top/bottom big corridor [X]
        //   4. Small vault 1/4 of level [X]
        //   5. Big vault 2/4 of level -> 2 orientations [X]
        //   6. Cross or H or I or Z
        //   7. 2 rooms on opposite corners
        //   8. Big center room (add stairs far away) [X]

        // Customly specified big rooms
        if (conf.nBigRooms && conf.nBigRooms > 0 && conf.bigRooms) {
            bigRoomsCreated = this.addCustomBigRooms(mapGen, conf);
        }

        const createBigRoom = RNG.getUniform() <= PROB.BIG_ROOM;
        if (createBigRoom && conf.nBigRooms === 0) {
            const bigRoomType = this.getBigRoomType();
            if (/center/.test(bigRoomType)) {
                bigRoomsCreated = this.addBigCenterRoom(mapGen);
            }
            if (/large corridor/.test(bigRoomType)) {
                bigRoomsCreated = this.addLargeCorridorRoom(mapGen);
            }
            if (/cross/.test(bigRoomType)) {
                bigRoomsCreated = this.addLargeCross(mapGen);
            }
            if (/vault/.test(bigRoomType)) {
                bigRoomsCreated = this.addVault(mapGen);
            }
            if (/nest/.test(bigRoomType)) {
                bigRoomsCreated = this.addRoomForNest(mapGen);
            }
        }
        return bigRoomsCreated;
    }

    public getBigRoomType(): string {
        //return 'nest'; // TODO add back the random gen
        return RNG.arrayGetRand(Object.keys(bigRoomType2Feature));
    }

    /* Adds manually specified custom rooms into the level. */
    public addCustomBigRooms(mapGen, conf): BigRoom[] {
        const [cx, cy] = mapGen.getCenterXY();
        const [cols, rows] = [mapGen.getCols(), mapGen.getRows()];
        const nBigRooms = conf.nBigRooms || 0;
        const bigRoomsCreated = [];
        for (let i = 0; i < nBigRooms; i++) {
            let width = Math.floor(cols / 4);
            if (conf.bigRoomWidth) {
                if (conf.bigRoomWidth[i]) {
                    width = conf.bigRoomWidth[i];
                }
            }

            let height = Math.floor(rows / 4);
            if (conf.bigRoomHeight) {
                if (conf.bigRoomHeight[i]) {
                    height = conf.bigRoomHeight[i];
                }
            }

            const maxX = cols - 2 - width;
            let x = RNG.getUniformInt(1, maxX);
            let xConf = '';
            if (conf.bigRoomX) {
                xConf = conf.bigRoomX[i];
            }

            if (/cen/.test(xConf)) {
                x = cx - Math.floor(width / 2);
            }

            const maxY = rows - 2 - height;
            let y = RNG.getUniformInt(1, maxY);
            let yConf = '';
            if (conf.bigRoomY) {
                yConf = conf.bigRoomY[i];
            }
            if (/cen/.test(yConf)) {
                y = cy - Math.floor(height / 2);
            }

            const x2 = x + (width - 1);
            const y2 = y + (height - 1);
            const room = new FeatRoom(x, y, x2, y2);
            mapGen._options.dugPercentage += 0.1;
            // mapGen._options.roomDugPercentage = 0.1;
            mapGen.addRoom(room);
            bigRoomsCreated.push(new BigRoom('custom', room));
        }
        return bigRoomsCreated;
    }

    /* Adds a big room aligned to the center of the level. */
    public addBigCenterRoom(mapGen): BigRoom[] {
        const [cols, rows] = [mapGen.getCols(), mapGen.getRows()];
        const [cx, cy] = mapGen.getCenterXY();

        const yDiv = RNG.getUniformInt(2, 5);
        const xDiv = RNG.getUniformInt(2, 6);
        const roomWidth: NumPair = [Math.floor(cols / (xDiv + 1 )),
            Math.floor(cols / xDiv)];
        const roomHeight: NumPair = [Math.floor(rows / yDiv), Math.floor(rows / yDiv)];

        const opts = {roomWidth, roomHeight};
        const room = FeatRoom.createCenter(cx, cy, opts);
        mapGen._options.dugPercentage += 0.2;
        mapGen.addRoom(room);
        return [new BigRoom('center', room)];
    }

    public addLargeCorridorRoom(mapGen): BigRoom[] {
        const [cols, rows] = [mapGen.getCols(), mapGen.getRows()];
        const cardinalDir = RNG.getCardinalDirLetter();
        const roomName = 'large corridor ' + cardinalDir;

        // Large east side corridor
        let room = null;
        if (cardinalDir === 'E') {
            const xDiv = RNG.getUniformInt(2, 6);
            const width = Math.floor(cols / xDiv);
            room = new FeatRoom(1, 1, width, rows - 2);
        }

        // Large west side corridor
        if (cardinalDir === 'W') {
            const xDiv = RNG.getUniformInt(2, 6);
            const width = Math.floor(cols / xDiv);
            const x0 = cols - 2 - width;
            room = new FeatRoom(x0, 1, cols - 2, rows - 2);
        }

        // Large north side corridor
        if (cardinalDir === 'N') {
            const yDiv = RNG.getUniformInt(2, 5);
            const height = Math.floor(rows / yDiv);
            room = new FeatRoom(1, 1, cols - 2, height);
        }

        // Large south side corridor
        if (cardinalDir === 'S') {
            const yDiv = RNG.getUniformInt(2, 5);
            const height = Math.floor(rows / yDiv);
            const y0 = rows - 2 - height;
            room = new FeatRoom(1, y0, cols - 2, rows - 2);
        }

        if (!room) {
            RG.err('DungeonGenerator', 'addLargeCorridorRoom',
                'room null something went wrong');
        }

        mapGen._options.dugPercentage += 0.20;
        mapGen.addRoom(room);
        return [new BigRoom(roomName, room)];
    }

    public addLargeCross(mapGen): BigRoom[] {
        const [cols, rows] = [mapGen.getCols(), mapGen.getRows()];
        const [cx, cy] = mapGen.getCenterXY();

        const div = RNG.getUniformInt(3, 8);
        const width = Math.floor(cols / div);
        const height = Math.floor(rows / div);
        const horOpts = {
            roomWidth: [cols - 2, cols - 2] as NumPair,
            roomHeight: [height, height] as NumPair
        };
        const verOpts = {
            roomHeight: [rows - 2, rows - 2] as NumPair,
            roomWidth: [width, width] as NumPair
        };
        const roomHor = FeatRoom.createCenter(cx, cy, horOpts);
        const roomVer = FeatRoom.createCenter(cx, cy, verOpts);
        mapGen.addRoom(roomHor);
        mapGen.addRoom(roomVer);

        const areaHor = roomHor.getAreaSize();
        const areaVer = roomVer.getAreaSize();
        const dug = (areaHor + areaVer) / (cols * rows);

        mapGen._options.dugPercentage += 1.6 * dug;
        if (mapGen._options.dugPercentage >= DUG_MAX) {
            mapGen._options.dugPercentage = DUG_MAX;
        }

        return [
            new BigRoom('crossHor', roomHor),
            new BigRoom('crossVer', roomVer)
        ];
    }

    public addVault(mapGen): BigRoom[] {
        // Small vault 1/4 of level
        // Big vault 1/2 of level
        const [cols, rows] = [mapGen.getCols(), mapGen.getRows()];
        const big = RNG.getUniform() <= PROB.BIG_VAULT;
        let width = Math.floor(cols / 2);
        let height = Math.floor(rows / 2);
        let corners = ['NE', 'NW', 'SW', 'SE'];
        let type = 'small vault';
        if (big) {
            if (RNG.getUniform() <= 0.5) {
                corners = ['NE', 'NW'];
                width = Math.floor(cols / 2);
                height = rows - 2;
            }
            else {
                corners = ['NW', 'SW'];
                width = cols - 2;
                height = Math.floor(rows / 2);
            }
            mapGen._options.dugPercentage += 0.25;
            type = 'large vault';
        }
        const [x0, y0] = this.getRandCorner(width, height, cols, rows, corners);
        const x1 = x0 + width - 1;
        const y1 = y0 + height - 1;
        const room = new FeatRoom(x0, y0, x1, y1);
        mapGen._options.dugPercentage += 0.20;
        mapGen.addRoom(room);
        return [new BigRoom(type, room)];
    }

    /* Allocates a room for constructing a nest into the level. */
    public addRoomForNest(mapGen): BigRoom[] {
        const tilesX = RNG.getUniformInt(2, 5);
        const tilesY = RNG.getUniformInt(2, 5);
        let width = NEST_TILE_X * tilesX;
        let height = NEST_TILE_Y * tilesY;

        const [cols, rows] = [mapGen.getCols(), mapGen.getRows()];
        while (width > (cols - 2)) {
            width -= NEST_TILE_X;
        }
        while (height > (rows - 2)) {
            height -= NEST_TILE_Y;
        }
        const corners = ['NE', 'NW', 'SW', 'SE'];
        const [x0, y0] = this.getRandCorner(width, height, cols, rows, corners);
        const x1 = x0 + width - 1;
        const y1 = y0 + height - 1;
        const room = new FeatRoom(x0, y0, x1, y1);
        mapGen._options.dugPercentage += 0.20;
        mapGen.addRoom(room);
        return [new BigRoom('nest', room)];
    }

    /* Returns a random corner for a feature. */
    public getRandCorner(w, h, cols, rows, corners) {
        const corner = RNG.arrayGetRand(corners);
        let [x, y] = [1, 1];
        switch (corner) {
            case 'NW': x = 1; y = 1; break;
            case 'NE': x = cols - 2 - w; y = 1; break;
            case 'SW': x = 1; y = rows - 2 - h; break;
            case 'SE': x = cols - 2 - w; y = rows - 2 - h; break;
            default: break;
        }
        return [x, y];
    }

    /* Function adds features like chasms, bridges, rivers etc. */
    public addSpecialFeatures(level: Level): void {
        const extras = level.getExtras();
        const map = level.getMap();

        // Adds a random special feature to the big room
        if (extras.bigRooms) {
            const room = extras.bigRooms[0];
            let features: any = {}; // TODO fix typings
            Object.keys(bigRoomType2Feature).forEach(key => {
                if (new RegExp(key).test(room.type)) {
                    features = bigRoomType2Feature[key];
                }
            });

            if (features.special) {
                const randSpecial = RNG.arrayGetRand(features.special);
                this.addBigRoomSpecialFeat(level, randSpecial, extras.bigRooms);
            }
        }

        /*
        if (extras.corridors) {
            extras.corridors.forEach((corr, i) => {
                const index = i % 10;
                corr.create((x, y) => {
                    const marker = new RG.Element.Marker(index);
                    marker.setTag('corridor');
                    // level.addElement(marker, x, y);
                });
            });
        }
        */

        if (extras.rooms) {
            const fireRoom = RNG.arrayGetRand(extras.rooms);
            const terms: Room[] = [];
            this.addFireToRoom(level, fireRoom);

            extras.rooms.forEach((room, id) => {
                room.setID(id); // Add ID to identify rooms
                let numDoors = 0;
                const bbox: BBox = BBox.fromBBox(room.getOuterBbox());
                const coord = Geometry.getBorderForBbox(bbox);
                coord.forEach(xy => {
                    if (level.getMap().hasXY(xy[0], xy[1])) {
                        if (!map.has(xy, 'floor')) {
                            const marker = new ElementMarker('w');
                            marker.setTag('room wall');
                            level.addElement(marker, xy[0], xy[1]);
                        }
                        else {
                            /* const marker = new RG.Element.Marker('D');
                            marker.setTag('room door');
                            level.addElement(marker, xy[0], xy[1]);*/
                            ++numDoors;
                        }
                    }
                });

                this.addDoorsForRoom(level, room);

                if (numDoors === 1) {
                    terms.push(room);
                }
            });

            terms.forEach((room: Room) => {
                const bbox = room.getInnerBbox();
                if (bbox !== null) {
                    const coord = Geometry.getCoordBbox(bbox);
                    coord.forEach(xy => {
                        const marker = new ElementMarker('t');
                        marker.setTag('term');
                        level.addElement(marker, xy[0], xy[1]);
                    });
                }
            });

            extras.terms = terms;
        }
    }

    /* Adds a special feature to a big room. This can be obstructions or some
     * structures like temples etc. */
    public addBigRoomSpecialFeat(level: Level, randSpecial, bigRooms): void {
        bigRooms.forEach(bigRoom => {
            const room: Room = bigRoom.room; // Unwrap Feature.Room from BigRoom
            if (!room) {
                RG.err('DungeonGenerator', 'addBigRoomSpecialFeat',
                    'room is null for ' + JSON.stringify(bigRoom));
            }
            switch (randSpecial) {
                case 'splashes': {
                    this.addElemSplashes(level, room); break;
                }
                default: break;
            }
        });
    }

    /* Adds door elements for the given room. */
    public addDoorsForRoom(level: Level, room: Room) {
        if (this.addDoors) {
            room.getDoors((x, y) => {
                const cell = level.getMap().getCell(x, y);
                if (!cell.hasDoor()) {
                    const door = new ElementDoor(true);
                    level.addElement(door, x, y);
                }
            });
        }
    }

    /* Different options for splashes:
     * 1. water - amphibious
     * 2. chasms - flying
     * 3. forest - animals
     * Make sure  this is same for all rooms.
     */
    public addElemSplashes(level: Level, room: Room): void {
        const themeName = RNG.arrayGetRand(Object.keys(SPLASH_THEMES));
        const theme = SPLASH_THEMES[themeName];
        const elem = theme.elem;
        level.getExtras().theme = theme;
        debug('Adding splashes with theme', themeName);

        const x0 = room.getLeft() + 1;
        const y0 = room.getTop() + 1;
        const fCols = room.getWidth();
        const fRows = room.getHeight();
        const {map} = MapGenerator.createSplashes(fCols, fRows,
            {nForests: 10, elem});
        Geometry.mergeMapBaseElems(level.getMap(), map, x0, y0);
    }

    /* Decorates the room corners with fire. */
    public addFireToRoom(level: Level, room: Room): void {
        const parser = ObjectShell.getParser();
        const corners = Object.values(room.getCorners());
        corners.forEach(xy => {
            const fire = parser.createActor('Fire');
            level.addActor(fire, xy[0], xy[1]);
        });
    }


    /* Adds a critical path to the level. The path is denoted with markers 'critical
     * path' to retrieve it later. */
    public static addCriticalPath(level: Level): void {
        const extras = level.getExtras();
        if (!extras.startPoint || !extras.endPoint) {
            return;
        }

        const [cx2, cy2] = extras.startPoint;
        const [cx1, cy1] = extras.endPoint;

        const map = level.getMap();
        const pathFunc = (x: number, y: number, cx, cy): boolean => {
            return map.isPassable(x, y, cx, cy) || map.hasXY(x, y) && map.getCell(x, y).hasDoor();
        };

        debug('Critical path', cx2, cy2, '=>', cx1, cy1);
        // level.debugPrintInASCII();

        let criticalPath: ICoordXY[] = Path.getShortestPath(cx2, cy2, cx1, cy1, pathFunc);
        if (criticalPath.length === 0) {
            const newPathFunc = (x: number, y: number) => {
                //if (map.hasXY(x, y)) {
                console.log('newPathFunc x,y ', x, y);
                    return !(/wall/).test(map.getCell(x, y).getBaseElem().getType());
                //}
                return false;
            };
            criticalPath = Path.getShortestPath(cx2, cy2, cx1, cy1, newPathFunc);
            if (criticalPath.length === 0) {
                RG.err('DungeonGenerator', 'addCriticalPath',
                    'No path found between stairs');
            }
            else {
                // Need to traverse, and add bridges/passages on obstacles
                for (let i = 1; i < criticalPath.length; i++) {
                    const cXY = criticalPath[i - 1];
                    const {x, y} = criticalPath[i];
                    if (!map.isPassable(x, y, cXY.x, cXY.y)) {
                        map.setBaseElemXY(x, y, ELEM.BRIDGE);
                    }
                }
                /*
                criticalPath.forEach((xy: ICoordXY) => {
                    const {x, y} = xy;
                    if (!map.isPassable(x, y)) {
                        map.setBaseElemXY(x, y, ELEM.BRIDGE);
                    }
                });
                */
            }
        }

        const pathBrokenFunc = (x: number, y: number, cx, cy) => {
            return pathFunc(x, y, cx, cy) &&
                !map.getCell(x, y).hasMarker('path broken');

        };
        const minPathLen = 50;
        let prevPath = criticalPath;
        while (criticalPath.length < minPathLen) {

            // Break the existing path
            const pathBroken = DungeonGenerator._breakPath(level, criticalPath);
            if (!pathBroken) {
                // Could not break, might be in a big room
                break;
            }

            // Break OK, find the next path which is shortest
            criticalPath = shortestPath(cx2, cy2, cx1, cy1, pathBrokenFunc);
            if (criticalPath.length === 0) {
                DungeonGenerator.restorePath(level, prevPath);
                criticalPath = prevPath;
                break;
            }
            else {
                prevPath = criticalPath;
            }
        }

        // For each path broken marker, we need to add walls to physicall break
        // that path
        DungeonGenerator._addWallsToBrokenPath(level);

        criticalPath.forEach((xy: ICoordXY) => {
            const critPathElem = new ElementMarker('*');
            critPathElem.setTag('critical_path');
            level.addElement(critPathElem, xy.x, xy.y);
        });

        extras.criticalPath = criticalPath;
    }

    /* This breaks the path with a wall and by placing a 'path broken' marker to
     * locate the element later. */
    public static _breakPath(level: Level, path): boolean {
        for (let i = 0; i < path.length; i++) {
            const {x, y} = path[i];
            const cell = level.getMap().getCell(x, y);
            if (cell.hasDoor()) {
                const marker = new ElementMarker('X');
                marker.setTag('path broken');
                level.addElement(marker, x, y);
                return true;
            }
        }
        return false;
    }

    public static _addWallsToBrokenPath(level: Level): void {
        const markers = level.getElements().filter(
            e => e.getType() === 'marker' &&
                (e as ElementMarker).getTag() === 'path broken'
        );
        markers.forEach(marker => {
            const [x, y] = marker.getXY();
            level.getMap().setBaseElemXY(x, y, ELEM.WALL);
        });
    }

    /* Restores previous broken path in case no sufficiently long new path is found.
     * */
    public static restorePath(level: Level, path: ICoordXY[]): void {
        for (let i = 0; i < path.length; i++) {
            const {x, y} = path[i];
            const cell = level.getMap().getCell(x, y);
            if (cell.hasMarker('path broken')) {
                const elements = level.getElements();
                const thisXY = elements.filter(e => e.isAtXY(x, y));
                thisXY.forEach(elem => {
                    if (elem.getType() === 'marker') {
                        if ((elem as ElementMarker).getTag() === 'path broken') {
                            level.removeElement(elem, x, y);
                        }
                    }
                });
            }
        }
    }

    public addNestIntoLevel(level: Level): void {
        const {bigRooms} = level.getExtras();
        if (!bigRooms) {
            return;
        }
        const nestRoom = bigRooms.filter((bg: BigRoom) => /nest/.test(bg.type))[0];
        if (nestRoom) {
            const {room} = nestRoom;
            const bbox: BBox = BBox.fromBBox(room.getBbox());

            debug('Adding nest to dungeon now using room bbox', bbox);
            debug('level cols/rows', level.getMap().cols, level.getMap().rows);

            const nestGen = new NestGenerator();
            const tilesX = room.getWidth() / NEST_TILE_X;
            const tilesY = room.getHeight() / NEST_TILE_Y;

            const nestConf: Partial<NestOpts> = {
                mapConf: {
                    tilesX, tilesY,
                    genParams: NEST_GENPARAMS
                },
                embedOpts: {
                    level, bbox
                }
            };
            // console.log('Level before the nest');
            // level.debugPrintInASCII();
            // nestConf.removeBorderWall = true;
            nestConf.scanForDoors = true;
            nestGen.createAndEmbed(1, 1, nestConf);
        }
    }

    /* Right now, use a floodfill to check the connectivity. Returns true if the
     * level is rejected. If conf.errorOnFailure is set, throws error immediately.
     * */
    public verifyLevel(level: Level, conf): boolean {
        const map = level.getMap();
        const floorCells = map.getCells(FILL_FUNC);
        // const cell = floorCells[0];
        // Accept also diagonal connectivity
        const floorCellsFilled = Geometry.floodfillPassable(map, true);

        const numTotal = floorCells.length;
        const numFilled = floorCellsFilled.length;

        // TODO we can try connecting some unreachable cells

        if (numFilled !== numTotal) {
            const diff = numTotal - numFilled;
            if (diff > maxUnreachable) {
                this.tryToFillUnreachable(level);
                const retry = this.verifyLevel(level, conf);
                if (!retry && conf.errorOnFailure) {
                    level.debugPrintInASCII(); // DON'T REMOVE
                    const msg = `Max: ${maxUnreachable}, got: ${diff}`;
                    RG.err('DungeonGenerator', 'verifyLevel',
                        'Too many unreachable cells ' + msg);
                }
                return retry;
            }
        }


        return true;
    }


    public tryToFillUnreachable(level: Level): void {
        const map = level.getMap();
        const regions = Geometry.floodfillRegions(map, true);
        // const regLens = regions.map(rr => rr.length);

        // Check that critical path is not on filled regions
        const {startPoint, endPoint} = level.getExtras();
        const startCell = map.getCell(startPoint[0], startPoint[1]);
        const endCell = map.getCell(endPoint[0], endPoint[1]);
        const startFill = Geometry.floodfill(map, startCell, FILL_FUNC, true);
        const endFill = Geometry.floodfill(map, endCell, FILL_FUNC, true);

        if (startFill.length === endFill.length) {
            regions.forEach((region: TCoord[]) => {
                if (region.length !== startFill.length) {
                    map.setBaseElems(region, ELEM.WALL);
                }
            });
        }
        else {
            RG.err('DungeonGenerator', 'tryToFillUnreachable',
                'floodfill sizes for start/endFill differ. They are not connected!');
        }
    }
}

/* Contain the default options for various level types. */
DungeonGenerator.mapOptions = {
    digger: {
        roomWidth: [3, 9],
        roomHeight: [3, 5],
        corridorLength: [3, 10],
        dugPercentage: 0.2
    },
    uniform: {
        roomWidth: [3, 9],
        roomHeight: [3, 5],
        roomDugPercentage: 0.1
    }
};
const mapOptions = DungeonGenerator.mapOptions;

/* Returns random supported level type. */
const getRandMapType = () => {
    return RNG.arrayGetRand(['uniform', 'digger']);
};

function getRoomDist(level: Level, r1, r2): number {
    const map = level.getMap();
    const [cx1, cy1] = r1.getCenter();
    const [cx2, cy2] = r2.getCenter();
    const path = Path.getShortestPassablePathWithDoors(map, cx1, cy1, cx2, cy2);
    return path.length;
}


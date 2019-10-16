
import RG from '../rg';
import ROT from '../../../lib/rot';

import {LevelGenerator, ILevelGenOpts} from './level-generator';
import {CellMap} from '../map';
import {Level} from '../level';
import {Geometry} from '../geometry';
import {MapGenerator} from './map.generator';
import {Path} from '../path';
import {DungeonPopulate} from '../dungeon-populate';
import {Random} from '../random';
import {ELEM} from '../../data/elem-constants';
import {ObjectShell} from '../objectshellparser';
import {ElementMarker, ElementDoor} from '../element';
import {ICoordXY} from '../interfaces';
import {NestGenerator, NestOpts} from './nest-generator';
import {BBox} from '../bbox';

type Cell = import('../map.cell').Cell;

const WALL = 1;

const MapDigger = (ROT as any).Map.Digger;
const FeatRoom = (ROT as any).Map.Feature.Room;
const RNG = Random.getRNG();

const shortestPath = Path.getShortestPath;
// Number of cells allowed to be unreachable
const maxUnreachable = 10;

const SPLASH_THEMES = {
    chasm: {
        elem: ELEM.CHASM
    },
    water: {
        elem: ELEM.WATER
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
    BIG_ROOM: 0.25,
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

type PartialDungeonOpts = Partial<DungeonOpts>;

/* This class is used to generate different dungeon levels. */
export class DungeonGenerator extends LevelGenerator {

    public static mapOptions: {[key: string]: any}; // TODO fix typings

    /* Returns the default options for dungeon level generation. */
    public static getOptions(type = 'digger'): DungeonOpts {
        const opts = LevelGenerator.getOptions();
        const levelOpts = {
            levelType: type, nBigRooms: 1,
            dungeonType: '',
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

    public addDoors: boolean;

    constructor() {
        super();
        this.addDoors = true;
        this.shouldRemoveMarkers = true;
    }

    /* Creates the actual Map.Level. User should call this function with desired
     * size (X * Y) and configuration. */
    public create(cols: number, rows: number, conf: PartialDungeonOpts): Level {
        // Creates the Map.Level with rooms, walls and floor
        const level = this._createLevel(cols, rows, conf);

        // Add things like water, chasms, bridges
        this.addSpecialFeatures(level);

        // Determine stairs locations
        this.addStairsLocations(level);

        // Add critical path (player must pass through this, usually), not entirely
        // true as there are usually many paths from start to end
        this.addCriticalPath(level);

        const populate = new DungeonPopulate({theme: ''});
        // Finally, we could populate the level with items/actors here
        populate.populateLevel(level);

        // Optional verification of connectivity etc.
        if (conf.rerunOnFailure || conf.errorOnFailure) {
            // const fillDiag = true;
            if (!this.verifyLevel(level, conf)) {
                console.log('verifyLevel failed. Re-running');
                this.create(cols, rows, conf);
            }
        }

        this.removeMarkers(level, conf);
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
        const createCb = (x, y, val) => {
            if (val === WALL) {
                map!.setBaseElemXY(x, y, ELEM.WALL);
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
        if (mapGen.bigRooms) {
            extras.bigRooms = mapGen.bigRooms;
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
        const mapGen = new MapDigger(cols, rows, mapOpts);
        // Here we need to add special rooms etc
        const bigRooms = this.addBigRooms(mapGen, conf);
        if (bigRooms.length > 0) {
            mapGen.bigRooms = bigRooms;
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
        const roomWidth = [Math.floor(cols / (xDiv + 1 )),
            Math.floor(cols / xDiv)];
        const roomHeight = [Math.floor(rows / yDiv), Math.floor(rows / yDiv)];

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
            roomWidth: [cols - 2, cols - 2], roomHeight: [height, height]
        };
        const verOpts = {
            roomHeight: [rows - 2, rows - 2], roomWidth: [width, width]
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
        const width = 7 * tilesX;
        const height = 7 * tilesY;
        const [cols, rows] = [mapGen.getCols(), mapGen.getRows()];
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
    public addSpecialFeatures(level) {
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
            const terms = [];
            this.addFireToRoom(level, fireRoom);

            extras.rooms.forEach((room, id) => {
                room.setID(id); // Add ID to identify rooms
                let numDoors = 0;
                const bbox: BBox = BBox.fromBBox(room.getOuterBbox());
                const coord = Geometry.getBorderForBbox(bbox);
                coord.forEach(xy => {
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
                });

                this.addDoorsForRoom(level, room);

                if (numDoors === 1) {
                    terms.push(room);
                }
            });

            terms.forEach(room => {
                const bbox = room.getInnerBbox();
                const coord = Geometry.getCoordBbox(bbox);
                coord.forEach(xy => {
                    const marker = new ElementMarker('t');
                    marker.setTag('term');
                    level.addElement(marker, xy[0], xy[1]);
                });
            });

            extras.terms = terms;
        }
    }

    /* Adds a special feature to a big room. This can be obstructions or some
     * structures like temples etc. */
    public addBigRoomSpecialFeat(level, randSpecial, bigRooms) {
        bigRooms.forEach(bigRoom => {
            const room = bigRoom.room; // Unwrap Feature.Room from BigRoom
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
    public addDoorsForRoom(level, room) {
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
    public addElemSplashes(level: Level, room) {
        const themeName = RNG.arrayGetRand(Object.keys(SPLASH_THEMES));
        const theme = SPLASH_THEMES[themeName];
        const elem = theme.elem;
        level.getExtras().theme = theme;

        const x0 = room.getLeft() + 1;
        const y0 = room.getTop() + 1;
        const fCols = room.getWidth();
        const fRows = room.getHeight();
        const {map} = MapGenerator.createSplashes(fCols, fRows,
            {nForests: 10, elem});
        Geometry.mergeMapBaseElems(level.getMap(), map, x0, y0);
    }

    /* Decorates the room corners with fire. */
    public addFireToRoom(level, room) {
        const parser = ObjectShell.getParser();
        const corners = Object.values(room.getCorners());
        corners.forEach(xy => {
            const fire = parser.createActor('Fire');
            level.addActor(fire, xy[0], xy[1]);
        });
    }

    public addStairsLocations(level) {
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

            const [cx1, cy1] = room1.getCenter();
            const [cx2, cy2] = room2.getCenter();

            // Store the points to extras
            extras.startPoint = [cx2, cy2];
            extras.endPoint = [cx1, cy1];

            const {startPoint, endPoint} = extras;
            this.addStartAndEndPoint(level, startPoint, endPoint);

            // Place markers to later identify the points from the level
            room1.addStairs(cx1, cy1, true);
            room2.addStairs(cx2, cy2, false);

        }
        else {
            // Resort to random placement, no worthwhile rooms, although this
            // raises the question if the whole level should be discarded
            const msg = 'rooms must be set as level extras';
            RG.err('DungeonGenerator', 'addStairsLocations',
                'Not enough rooms to add stairs. ' + msg);
        }
    }

    /* Adds a critical path to the level. The path is denoted with markers 'critical
     * path' to retrieve it later. */
    public addCriticalPath(level: Level): void {
        const extras = level.getExtras();
        if (!extras.startPoint || !extras.endPoint) {
            return;
        }

        const [cx2, cy2] = extras.startPoint;
        const [cx1, cy1] = extras.endPoint;

        const map = level.getMap();
        const pathFunc = (x: number, y: number): boolean => {
            return map.isPassable(x, y) || map.getCell(x, y).hasDoor();
        };

        let criticalPath: ICoordXY[] = Path.getShortestPath(cx2, cy2, cx1, cy1, pathFunc);
        if (criticalPath.length === 0) {
            const newPathFunc = (x: number, y: number) => {
                return !(/wall/).test(map.getCell(x, y).getBaseElem().getType());
            };
            criticalPath = Path.getShortestPath(cx2, cy2, cx1, cy1, newPathFunc);
            if (criticalPath.length === 0) {
                RG.err('DungeonGenerator', 'addCriticalPath',
                    'No path found between stairs');
            }
            else {
                // Need to traverse, and add bridges/passages on obstacles
                criticalPath.forEach((xy: ICoordXY) => {
                    const {x, y} = xy;
                    if (!map.isPassable(x, y)) {
                        map.setBaseElemXY(x, y, ELEM.BRIDGE);
                    }
                });
            }
        }

        const pathBrokenFunc = (x: number, y: number) => {
            return pathFunc(x, y) &&
                !map.getCell(x, y).hasMarker('path broken');

        };
        const minPathLen = 50;
        let prevPath = criticalPath;
        while (criticalPath.length < minPathLen) {

            // Break the existing path
            const pathBroken = this._breakPath(level, criticalPath);
            if (!pathBroken) {
                // Could not break, might be in a big room
                break;
            }

            // Break OK, find the next path which is shortest
            criticalPath = shortestPath(cx2, cy2, cx1, cy1, pathBrokenFunc);
            if (criticalPath.length === 0) {
                this.restorePath(level, prevPath);
                criticalPath = prevPath;
                break;
            }
            else {
                prevPath = criticalPath;
            }
        }

        // For each path broken marker, we need to add walls to physicall break
        // that path
        this._addWallsToBrokenPath(level);

        criticalPath.forEach((xy: ICoordXY) => {
            const critPathElem = new ElementMarker('*');
            critPathElem.setTag('critical_path');
            level.addElement(critPathElem, xy.x, xy.y);
        });

        extras.criticalPath = criticalPath;
    }

    /* This breaks the path with a wall and by placing a 'path broken' marker to
     * locate the element later. */
    public _breakPath(level, path) {
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

    public _addWallsToBrokenPath(level: Level): void {
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
    public restorePath(level: Level, path: ICoordXY[]): void {
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
            const nestGen = new NestGenerator();
            const nestConf: Partial<NestOpts> = {
                mapConf: {
                    tilesX: room.getWidth() / 7,
                    tilesY: room.getHeight() / 7,
                    genParams: {x: [1, 1, 1], y: [1, 1, 1]},
                },
                embedOpts: {
                    level, bbox
                }
            };
            nestGen.createAndEmbed(1, 1, nestConf);
        }
    }

    /* Right now, use a floodfill to check the connectivity. Returns true if the
     * level is rejected. If conf.errorOnFailure is set, throws error immediately.
     * */
    public verifyLevel(level: Level, conf): boolean {
        const map = level.getMap();
        const fillFilter = (c: Cell): boolean => !c.hasObstacle() || c.hasDoor();
        const floorCells = map.getCells(fillFilter);
        // const cell = floorCells[0];
        const floorCellsFilled = Geometry.floodfillPassable(map);

        const numTotal = floorCells.length;
        const numFilled = floorCellsFilled.length;

        if (numFilled !== numTotal) {
            const diff = numTotal - numFilled;
            if (diff > maxUnreachable) {
                if (conf.errorOnFailure) {
                    level.debugPrintInASCII(); // DON'T REMOVE
                    const msg = `Max: ${maxUnreachable}, got: ${diff}`;
                    RG.err('DungeonGenerator', 'verifyLevel',
                        'Too many unreachable cells ' + msg);
                }
                level.debugPrintInASCII();
                return false;
            }
        }

        return true;
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


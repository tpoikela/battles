
/* THis file contains code to generate castles of different types
 * and contents.
 */

import RG from '../rg';
import {Room} from '../../../lib/rot-js/map/features';

import * as Element from '../element';
import {LevelGenerator, ILevelGenOpts} from './level-generator';
import {MapGenerator} from './map.generator';
import {Level, LevelExtraType} from '../level';
import {DungeonPopulate} from '../dungeon-populate';
import {Castle} from '../../data/tiles.castle';
import {LevelSurroundings} from '../level-surroundings';
import {FactoryItem} from '../factory.items';
import {Placer} from '../placer';
import {Random} from '../random';
import {Geometry} from '../geometry';
import {Path} from '../path';
import {ELEM} from '../../data/elem-constants';

const RNG = Random.getRNG();

import {TCoord, ICoordXY, ItemConf} from '../interfaces';
type CellMap = import('../map').CellMap;
type Cell = import('../map.cell').Cell;
type ElementLever = Element.ElementLever;

interface CastleOpts extends ILevelGenOpts {
    roomCount: number;
    centralCorridors: boolean;
    templates?: any;
}

type GateFunc = () => void;

type PartialCastleOpts = Partial<CastleOpts>;

/* This class is used to generate different dungeon levels. */
export class CastleGenerator extends LevelGenerator {

    /* Return default options for castle generation. Used in editor mainly. */
    public static getOptions(): CastleOpts {
        const opts = LevelGenerator.getOptions() as CastleOpts;
        opts.centralCorridors = false;
        opts.roomCount = -1;
        return opts;
    }

    public static carvePathFromEdge(level: Level, elemType: string): ICoordXY[] {
        const edgeConns = level.getFreeEdgeCells();
        const map = level.getMap();
        const foundElem = level.getCellWithElem(elemType);

        const randConn = edgeConns[0];
        const [x0, y0] = randConn.getXY();
        const [x1, y1] = foundElem.getXY();

        const passCb = (x: number, y: number): boolean => (
            map.hasXY(x, y) &&
            map.getCell(x, y).getBaseElem().getType() !== 'wallcastle'
        );
        const path: ICoordXY[] = Path.getShortestPath(x0, y0, x1, y1, passCb);
        path.forEach((xy: ICoordXY) => {
            const cell = map.getCell(xy.x, xy.y);
            if (!cell.isFree()) {
                cell.setBaseElem(ELEM.FLOOR);
            }
        });
        return path;
    }

    public addDoors: boolean;
    public shouldRemoveMarkers: boolean;
    public nItemsAdded: number;

    constructor() {
        super();
        this.addDoors = true;
        this.shouldRemoveMarkers = true;
        this.nItemsAdded = 0;
    }

    /* Returns a fully populated castle-level. */
    public create(cols: number, rows: number, conf: PartialCastleOpts): Level {
        const castleLevel = this.createLevel(cols, rows, conf);
        this.removeMarkers(castleLevel, conf);

        if (conf.addItems) {
            this.nItemsAdded = this.addItemsToCastle(castleLevel, conf);
        }

        this.populateStoreRooms(castleLevel, conf);

        // TODO populate level with actors based on conf
        if (conf.addActors) {
            RG.err('CastleGenerator', 'create',
               'addActors == true not supported yet');
        }
        return castleLevel;
    }

    /* Returns a castle level without populating it. */
    public createLevel(
        cols: number, rows: number, conf: PartialCastleOpts
    ): Level {
        const levelConf: any = Object.assign({
            dungeonType: 'castle',
            wallType: 'wallcastle',
            floorType: 'floorcastle',
            }, conf
        );
        levelConf.preserveMarkers = true;
        const mapgen = new MapGenerator();

        // Determine direction of castle exit
        const gateFunc = getGateDirFunction(conf);
        if (gateFunc) {
            levelConf.startRoomFunc = gateFunc;
        }

        if (conf.centralCorridors) {
            levelConf.constraintFunc = Castle.constraintFuncCross;
        }

        const mapObj = mapgen.createCastle(cols, rows, levelConf);
        let level = new Level(mapObj.map);
        level.setMap(mapObj.map, mapObj);
        this.addMarkersFromTiles(level, mapObj.tiles);

        if (conf.cellsAround) {
            level = this.createCastleSurroundings(level, conf);
            if (!level) {
                RG.err('CastleGenerator', 'createLevel',
                    'Got null level from surround. Something went wrong');
            }
        }

        // Note that markers must be preserved in MapGenerator for this to work
        this.createDoorsAndLevers(level);
        return level;
    }

    public addItemsToCastle(level: Level, conf: PartialCastleOpts): number {
        // Storerooms contain better loot
        let nAdded = 0;
        const extras = level.getExtras();
        const storerooms = extras.storeroom as LevelExtraType[];

        const {maxValue} = conf;
        if (!maxValue) {
            RG.err('CastleGenerator', 'addItemsToCastle',
                'maxValue was not given in conf ' + JSON.stringify(conf));
            return 0;
        }

        const itemFunc = item => ((
            (item.value <= (2 * maxValue)) && (item.value >= maxValue)
        ));
        const itemConf: ItemConf = {
            item: itemFunc, maxValue, nItems: 1
        };
        const factItem = new FactoryItem();
        storerooms.forEach(room => {
            const itemsPlaced = factItem.generateItems(itemConf);
            if (Placer.addPropsToRoom(level, room, itemsPlaced)) {
                nAdded += itemsPlaced.length;
            }
        });

        // One of the storerooms can contain gold as well
        if (RG.isSuccess(GOLD_VAULT_CHANCE)) {
            const goldRoom = RNG.arrayGetRand(storerooms);
            const wealth = RNG.getUniformInt(6, 12);
            const goldItems = factItem.generateGold({nGold: 5, nLevel: wealth, maxValue});
            if (Placer.addPropsToRoom(level, goldRoom, goldItems)) {
                nAdded += goldItems.length;
            }
        }

        const normalRooms = extras.room as LevelExtraType[];
        itemConf.nItems = normalRooms.length;
        const items = factItem.generateItems(itemConf);
        items.forEach(item => {
            const room = RNG.arrayGetRand(normalRooms);
            if (Placer.addPropsToRoom(level, room, [item])) {
                nAdded += 1;
            }
        });
        return nAdded;
    }

    public addMarkersFromTiles(level: Level, tiles): void {
        const extras = {
            corridor: [],
            entrance: [],
            room: [],
            storeroom: [],
            vault: []
        };
        level.setExtras(extras);

        Object.values(tiles).forEach((tile: any) => {
            if (re.storeroom.test(tile.name)) {
                this.addToExtras(level, tile, 'storeroom');
            }
            else if (re.vault.test(tile.name)) {
                this.addToExtras(level, tile, 'vault');
            }
            else if (re.entrance.test(tile.name)) {
                this.addToExtras(level, tile, 'entrance');
            }
            else if (re.corridor.test(tile.name)) {
                this.addToExtras(level, tile, 'corridor');
            }
            else if (!re.filler.test(tile.name)) {
                this.addToExtras(level, tile, 'room');
            }
        });
    }

    public addToExtras(level: Level, tile, name: MarkerKey): void {
        const bbox = Geometry.convertBbox(tile);
        const cells = level.getMap().getFreeInBbox(bbox);
        cells.forEach((cell: Cell) => {
            const [x, y] = cell.getXY();
            const marker = new Element.ElementMarker(markers[name]);
            marker.setTag(name);
            level.addElement(marker, x, y);
        });
        const room = new Room(bbox.ulx, bbox.uly, bbox.lrx, bbox.lry);
        const extras = level.getExtras();
        (extras[name] as LevelExtraType[]).push(room as any);
    }

    /* Links (and first creates) levers and lever doors based on markers. */
    public createDoorsAndLevers(level: Level): void {
        const map: CellMap = level.getMap();
        const cells: Cell[] = map.getCells();
        const doorPos: {[key: string]: Element.ElementLeverDoor} = {};
        const levers: ElementLever[] = [];

        // Note that markers must be preserved in MapGenerator for this to work
        cells.forEach(cell => {
            if (cell.hasElements()) {
                const [x, y] = cell.getXY();

                if (cell.hasMarker('leverdoor')) {
                    const door = new Element.ElementLeverDoor();
                    map.getCell(x, y).removeProps(RG.TYPE_ELEM);
                    level.addElement(door, x, y);
                    doorPos[cell.getKeyXY()] = door;
                }
                else if (cell.hasMarker('lever')) {
                    const lever = new Element.ElementLever();
                    map.getCell(x, y).removeProps(RG.TYPE_ELEM);
                    level.addElement(lever, x, y);
                    levers.push(lever);
                }
                else if (cell.hasMarker('door')) {
                    const door = new Element.ElementDoor(true);
                    map.getCell(x, y).removeProps(RG.TYPE_ELEM);
                    level.addElement(door, x, y);
                }
            }
        });

        // Finally connect lever to its door
        levers.forEach(lever => {
            const [x, y] = lever.getXY();
            const xyAround = Geometry.getBoxAround(x, y, 1);
            xyAround.forEach((xy: TCoord) => {
                const keyXY = xy[0] + ',' + xy[1];
                if (doorPos[keyXY]) {
                    let door: any = map.getCell(xy[0], xy[1]).getPropType('leverdoor');
                    if (door) {door = door[0];}
                    else {
                        RG.err('CastleGenerator', 'createDoorsAndLevers',
                        `No door found for lever@${x},${y}`);
                    }
                    lever.addTarget(door);
                }
            });

        });

    }

    public populateStoreRooms(level: Level, conf): void {
        const dungPopul = new DungeonPopulate();
        if (conf.actorFunc) {
            dungPopul.setActorFunc(conf.actorFunc);
        }
        const maxDanger = conf.maxDanger;
        const extras = level.getExtras();
        if (extras.storeroom) {
            const storerooms = extras.storeroom as LevelExtraType[];
            storerooms.forEach((room: any) => {
                const cPoint: TCoord = room.getCenter();
                dungPopul.addPointGuardian(level, cPoint, maxDanger);
            });

            // Add another main loot + guardian
            const mainLootRoom: any = RNG.arrayGetRand(storerooms);
            if (mainLootRoom) {
                const cMain: TCoord = mainLootRoom.getCenter();
                if (dungPopul.addMainLoot(level, cMain, conf.maxValue)) {
                    dungPopul.addPointGuardian(level, cMain, maxDanger + 4);
                }
            }
        }
    }

    public createCastleSurroundings(level: Level, conf): null | Level {
        const levelSurround = new LevelSurroundings();
        const extras = level.getExtras();
        const newLevel = levelSurround.surround(level, conf);
        if (newLevel) {
            newLevel.setExtras(extras);
            levelSurround.scaleExtras(newLevel);
            return newLevel;
        }
        return null;
    }
}

const GOLD_VAULT_CHANCE = 0.10;

const re = {
    corridor: /(corridor|corner)/,
    entrance: /entrance/,
    storeroom: /storeroom/,
    vault: /vault/,
    filler: /filler/i
};

const markers = {
    corridor: 'C',
    room: 'R',
    entrance: 'E',
    storeroom: 'S',
    vault: 'V'
};

type MarkerKey = keyof (typeof markers);

/* Returns the function to generate castle cased based on surrounding
 * cells. */
function getGateDirFunction(conf): GateFunc | null {
    if (conf.cellsAround) {
        const {cellsAround} = conf;
        const funcs = [];
        const levelSurround = new LevelSurroundings();
        const dirBlocked: string[] = levelSurround.getNonBlockedDirs(cellsAround);
        dirBlocked.forEach((dir: string) => {
            funcs.push(Castle.startFuncs[dir]);
        });

        if (funcs.length === 0) {
            RG.warn('CastleGenerator', 'getGateDirFunction',
                'No free cellsAround ' + JSON.stringify(cellsAround));
        }
        else {
            return RNG.arrayGetRand(funcs);
        }
    }
    return null;
}


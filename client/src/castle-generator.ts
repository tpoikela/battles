
/* THis file contains code to generate castles of different types
 * and contents.
 */

import RG from './rg';
import ROT from '../../lib/rot';

import * as Element from './element';
import {LevelGenerator} from './level-generator';
import {MapGenerator} from './map.generator';
import {Level, LevelExtraType} from './level';
import {DungeonPopulate} from './dungeon-populate';
import {Castle} from '../data/tiles.castle';
import {LevelSurroundings} from './level-surroundings';
import {FactoryItem} from './factory.items';
import {Placer} from './placer';
import {Random} from './random';
import { Geometry } from './geometry';

const RNG = Random.getRNG();
const Room = ROT.Map.Feature.Room;

import {TCoord} from './interfaces';
type CellList = import('./map').CellMap;
type Cell = import('./map.cell').Cell;

interface CastleOpts {
    addItems: boolean;
    roomCount: number;
    cellsAround: {[key: string]: string};
    surroundX: number;
    surroundY: number;
    maxValue: number;
    preserveMarkers: boolean;
    centralCorridors: boolean;
}

type GateFunc = () => void;

type PartialCastleOpts = Partial<CastleOpts>;

/* This class is used to generate different dungeon levels. */
export class CastleGenerator extends LevelGenerator {

    public static getOptions(): CastleOpts {
        return {
            addItems: true,
            roomCount: -1,
            centralCorridors: false,
            cellsAround: {
                N: 'wallmount',
                S: 'tree',
                E: 'grass',
                W: 'snow',
                NW: 'water',
                SE: 'water'
            },
            surroundX: 10,
            surroundY: 10,
            maxValue: 100,
            preserveMarkers: false
        };
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
    public create(cols, rows, conf: PartialCastleOpts): Level {
        let castleLevel = this.createLevel(cols, rows, conf);
        conf.preserveMarkers = false;
        this.removeMarkers(castleLevel, conf);

        if (conf.addItems) {
            this.nItemsAdded = this.addItemsToCastle(castleLevel, conf);
        }

        if (conf.cellsAround) {
            castleLevel = this.createCastleSurroundings(castleLevel, conf);
        }

        // TODO populate level with actors based on conf
        return castleLevel;
    }

    /* Returns a castle level without populating it. */
    public createLevel(
        cols: number, rows: number, conf: PartialCastleOpts
    ): Level {
        const levelConf: any = Object.assign({
            dungeonType: 'castle',
            preserveMarkers: true,
            wallType: 'wallcastle'
            }, conf
        );
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

        const level = new Level();
        level.setMap(mapObj.map);
        this.addMarkersFromTiles(level, mapObj.tiles);

        this.createDoorsAndLevers(level);
        return level;
    }

    public addItemsToCastle(level: Level, conf: PartialCastleOpts): number {
        // Storerooms contain better loot
        let nAdded = 0;
        const extras = level.getExtras();
        const storerooms = extras.storeroom as LevelExtraType[];
        const {maxValue} = conf;
        const itemFunc = item => ((
            (item.value <= (2 * maxValue)) && (item.value >= maxValue)
        ));
        const itemConf = {
            func: itemFunc, maxValue, nItems: 1
        };
        const factItem = new FactoryItem();
        storerooms.forEach(room => {
            const itemsPlaced = factItem.generateItems(itemConf);
            Placer.addPropsToRoom(level, room, itemsPlaced);
            nAdded += itemsPlaced.length;
        });

        // One of the storerooms can contain gold as well
        if (RG.isSuccess(GOLD_VAULT_CHANCE)) {
            const goldRoom = RNG.arrayGetRand(storerooms);
            const wealth = RNG.getUniformInt(1, 6);
            const goldItems = factItem.generateGold({nGold: 5, nLevel: wealth});
            Placer.addPropsToRoom(level, goldRoom, goldItems);
            nAdded += goldItems.length;
        }

        const normalRooms = extras.room as LevelExtraType[];
        itemConf.nItems = normalRooms.length;
        const items = factItem.generateItems(itemConf);
        items.forEach(item => {
            const room = RNG.arrayGetRand(normalRooms);
            Placer.addPropsToRoom(level, room, [item]);
            nAdded += 1;
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
            else {
                this.addToExtras(level, tile, 'room');
            }
        });
    }

    public addToExtras(level: Level, tile, name): void {
        const bbox = Geometry.convertBbox(tile);
        const cells = level.getMap().getFreeInBbox(bbox);
        cells.forEach(cell => {
            const [x, y] = cell.getXY();
            const marker = new Element.ElementMarker(markers[name]);
            marker.setTag(name);
            level.addElement(marker, x, y);
        });
        const room = new Room(bbox.ulx, bbox.uly, bbox.lrx, bbox.lry);
        const extras = level.getExtras();
        (extras[name] as LevelExtraType[]).push(room);
    }

    /* Links (and first creates) levers and lever doors based on markers. */
    public createDoorsAndLevers(level: Level): void {
        const map: CellList = level.getMap();
        const cells: Cell[] = map.getCells();
        const doorPos = {};
        const levers = [];

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
            xyAround.forEach(xy => {
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
        }
    }

    public createCastleSurroundings(level, conf) {
        const levelSurround = new LevelSurroundings();
        return levelSurround.surround(level, conf);
    }
}

RG.extend2(CastleGenerator, LevelGenerator);

const GOLD_VAULT_CHANCE = 0.10;

const re = {
    corridor: /(corridor|corner)/,
    entrance: /entrance/,
    storeroom: /storeroom/,
    vault: /vault/
};

const markers = {
    corridor: 'C',
    room: 'R',
    entrance: 'E',
    storeroom: 'S',
    vault: 'V'
};

/* Returns the function to generate castle cased based on surrounding
 * cells. */
function getGateDirFunction(conf): GateFunc | null {
    if (conf.cellsAround) {
        const {cellsAround} = conf;
        // TODO should randomize the entrace direction
        if (!cellBlocked(cellsAround.N)) {
            return Castle.startRoomFuncNorth;
        }
        else if (!cellBlocked(cellsAround.S)) {
            return Castle.startRoomFuncSouth;
        }
        else if (!cellBlocked(cellsAround.E)) {
            return Castle.startRoomFuncEast;
        }
        else if (!cellBlocked(cellsAround.W)) {
            return Castle.startRoomFuncWest;
        }
        else if (!cellBlocked(cellsAround.NE)) {
            return Castle.startRoomFuncNorthEast;
        }
        else if (!cellBlocked(cellsAround.NW)) {
            return Castle.startRoomFuncNorthWest;
        }
        else if (!cellBlocked(cellsAround.SE)) {
            return Castle.startRoomFuncSouthEast;
        }
        else if (!cellBlocked(cellsAround.SW)) {
            return Castle.startRoomFuncSouthWest;
        }
        RG.warn('CastleGenerator', 'getGateDirFunction',
            'No free cellsAround ' + JSON.stringify(cellsAround));
    }
    return null;
}

function cellBlocked(type): boolean {
    switch (type) {
        case 'wallmount': return true;
        case 'water': return true;
        default: return false;
    }
}

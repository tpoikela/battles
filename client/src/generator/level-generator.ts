
/* Contains the code for base class of level generator. */
import RG from '../rg';
import {ElementMarker, ElementDoor} from '../element';
import {Level} from '../level';
//rm import {Random} from '../random';
import {Room} from '../../../lib/rot-js/map/features';
import {PlacedTileData} from '../template.level';
import {MapObj} from './map.generator';

//rm const RNG = Random.getRNG();

import {ConstBaseElem, TCoord, TShellFunc} from '../interfaces';
type CellMap = import('../map').CellMap;
type Cell = import('../map.cell').Cell;
type ElementXY = import('../element').ElementXY;

export interface ILevelGenOpts {
    addActors: boolean;
    actorFunc: TShellFunc;
    addItems: boolean;
    cellsAround: {[key: string]: string};
    surroundX: number;
    surroundY: number;
    maxValue: number;
    maxDanger: number;
    maxRarity: number;
    shouldRemoveMarkers: boolean;
    preserveMarkers: boolean;
    wallType?: string;
    floorType?: string;
    nestProbability?: number;
}


export abstract class LevelGenerator {

    public static getOptions(): ILevelGenOpts {
        return {
            addActors: false,
            actorFunc: (shell) => shell.danger <= 5,
            addItems: true,
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
            maxDanger: 5,
            maxRarity: 1,
            shouldRemoveMarkers: true,
            preserveMarkers: false,
            nestProbability: 0.2,
        };
    }

    public shouldRemoveMarkers: boolean;
    public _debug: boolean;

    constructor() {
        this.shouldRemoveMarkers = true;
        this._debug = false;
    }

    public abstract create(cols: number, rows: number, conf: ILevelGenOpts): Level;

    /* Adds markers for start and endpoint for given level. */
    public static addStartAndEndPointMarker(level: Level, start: TCoord, end: TCoord): void {
        if (start) {
            const [sX, sY] = start;
            const startPointElem = new ElementMarker('<');
            startPointElem.setTag('start_point');
            level.addElement(startPointElem, sX, sY);
        }
        else {
            RG.err('LevelGenerator', 'addStartAndEndPointMarker',
                'start point coord not defined');
        }

        if (end) {
            const [eX, eY] = end;
            const goalPoint = new ElementMarker('>');
            goalPoint.setTag('end_point');
            level.addElement(goalPoint, eX, eY);
        }
    }

    /* Converst door markers to actual doors. Returns the coordinates of created
     * doors as TCoord[]. */
    public static markersToDoor(level: Level): TCoord[] {
        const map: CellMap = level.getMap();
        const cells: Cell[] = map.getCells((c => c.hasElements()));
        const res: TCoord[] = [];
        cells.forEach((cell: Cell) => {
            if (cell.hasMarker('door')) {
                const [x, y] = cell.getXY();
                const door = new ElementDoor(true);
                map.getCell(x, y).removeProps(RG.TYPE_ELEM);
                level.addElement(door, x, y);
                res.push([x, y]);
            }
        });
        return res;
    }

    /* Removes given marker type with matching char/tag, removes the coordinates
     * of removed markers. */
    public static removeOneMarkerType(level: Level, char: string, tag: string): TCoord[] {
        const map: CellMap = level.getMap();
        const cells: Cell[] = map.getCells((c => c.hasElements()));
        const res: TCoord[] = [];
        cells.forEach((cell: Cell) => {
            if (cell.hasMarker(tag)) {
                const markers = cell.getMarkers();
                markers.forEach((em: ElementMarker) => {
                    if (em.getChar() === char) {
                        const [x, y] = em.getXY();
                        level.removeElement(em, x, y);
                        res.push([x, y]);
                    }
                });
            }
        });
        return res;
    }


    public static tilesToRooms(level: Level, mapObj: MapObj): void {
        const rooms: Room[] = [];
        const terms: Room[] = [];
        const tileMap: {[key: string]: PlacedTileData} = mapObj.tiles;
        Object.values(tileMap).forEach((tile: PlacedTileData) => {
            if (tile.name !== 'FILLER') {
                const room = new Room(tile.llx, tile.ury, tile.urx, tile.lly);
                rooms.push(room);
                if (tile.name === 'term') {
                    terms.push(room);
                }
            }
        });

        level.addExtras('rooms', rooms);
        level.addExtras('terms', terms);
    }


    /* Removes the markers which are used during PCG, but should not be visible
     * to player. */
    public removeMarkers(level: Level, conf): number {
        let nRemoved = 0;
        let markersPreserved = ['start_point', 'end_point', 'critical_path'];
        if (conf.markersPreserved) {
            markersPreserved = markersPreserved.concat(conf.markersPreserved);
        }
        else if (conf.markersPreserved === false) {
            markersPreserved = [];
        }

        if (!RG.isNullOrUndef([conf.shouldRemoveMarkers])) {
            this.shouldRemoveMarkers = conf.shouldRemoveMarkers;
        }

        if (this.shouldRemoveMarkers) {
            level.removeElements((e: ElementXY) => {
                if ((e as ElementMarker).getTag) {
                    const tag = (e as ElementMarker).getTag();
                    if (markersPreserved.indexOf(tag) < 0) {
                        ++nRemoved;
                        return true;
                    }
                }
                return false;
            });
        }
        return nRemoved;
    }
}

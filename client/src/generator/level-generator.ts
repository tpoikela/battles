
/* Contains the code for base class of level generator. */
import RG from '../rg';
import {ElementMarker, ElementDoor} from '../element';
import {Level} from '../level';

import {TCoord, TShellFunc} from '../interfaces';
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
    shouldRemoveMarkers: boolean;
    preserveMarkers: boolean;
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
            shouldRemoveMarkers: true,
            preserveMarkers: false
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
    public addStartAndEndPoint(level: Level, start: TCoord, end: TCoord): void {
        if (start) {
            const [sX, sY] = start;
            const startPointElem = new ElementMarker('<');
            startPointElem.setTag('start_point');
            level.addElement(startPointElem, sX, sY);
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
    public markersToDoor(level: Level): TCoord[] {
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
    public removeOneMarkerType(level: Level, char: string, tag: string): TCoord[] {
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

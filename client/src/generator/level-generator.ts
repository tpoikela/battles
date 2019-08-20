
/* Contains the code for base class of level generator. */
import RG from '../rg';
import {ElementMarker, ElementBase} from '../element';
import {Level} from '../level';

import {TCoord, TShellFunc} from '../interfaces';

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

    constructor() {
        this.shouldRemoveMarkers = true;
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
            level.removeElements(e => {
                if (e.getTag) {
                    const tag = e.getTag();
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

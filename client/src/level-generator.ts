
/* Contains the code for base class of level generator. */
import RG from './rg';
import {ElementMarker, ElementDoor} from './element';

export class LevelGenerator {
    public shouldRemoveMarkers: boolean;

    constructor() {
        this.shouldRemoveMarkers = true;
    }

    addStartAndEndPoint(level, start, end) {
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

    removeMarkers(level, conf) {
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
                        return true;
                    }
                }
                return false;
            });
        }

    }
}

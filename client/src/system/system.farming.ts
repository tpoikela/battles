/*
 * Farming system handles the following things:
 *   1. Tilling the soil
 *   2. Planting the seeds
 *     - Using seeds on TilledSoil
 *   3. Growing the seeds
 *     - Respond to 'Day changed' events
 *   4. Harvesting the grown plants
 *     - Using a sharp tool (scythe) yields the item
 */

import RG from '../rg';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import {WS_EVENT} from '../world.simulation';
import {ObjectShell} from '../objectshellparser';
import {Level} from '../level';

type Entity = import('../entity').Entity;

export class SystemFarming extends SystemBase {

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.FARMING, compTypes, pool);
        this.compTypesAny = true;
    }

    public updateEntity(ent: Entity): void {
        if (ent.has('WorldSimEvent')) {
            const worldEvtList = ent.getList('WorldSimEvent');
            worldEvtList.forEach(worldEvt => {
                const evtType: WS_EVENT = worldEvt.getEventType();
                if (evtType === WS_EVENT.PHASE_CHANGED) {
                    this._processPhaseChanged(ent);
                }
            });
        }
        else {
        }
    }

    protected _processPhaseChanged(ent: any): void {
        const level: Level = ent.getLevel();
        if (!level) {return;} // Added for unit tests
        const elems = level.getElements().slice();
        elems.forEach(elem => {
            if (elem.has('PlantedSoil')) {
                const planted = elem.get('PlantedSoil');
                planted.timeLeftToGrow -= 1;
                if (planted.timeLeftToGrow === 0) {
                    const parser = ObjectShell.getParser();
                    const growsInto = planted.getGrowsInto();
                    const item = parser.createItem(growsInto);
                    const [x, y] = elem.getXY();
                    level.addItem(item, x, y);
                    const msg = `${growsInto} is ready for harvesting`;
                    RG.gameMsg({cell: elem.getCell(), msg});
                    level.removeElement(elem, x, y);
                }
            }
        });
    }

}

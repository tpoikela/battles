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

type Entity = import('../entity').Entity;

export class SystemFarming extends SystemBase {

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.FARMING, compTypes, pool);
    }

    public updateEntity(ent: Entity): void {
    }

}

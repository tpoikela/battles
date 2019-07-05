
/* System which manages the simulation of the game world. System has no idea
 * about the current level, and thus can only affect the world at higher level.
 */

import RG from '../rg';
import {SystemBase} from './system.base';

type WorldTop = import('../world').WorldTop;
type OWMap = import('../overworld.map').OWMap;
type WorldSimulation = import('../world.simulation').WorldSimulation;
type Territory = import('../territory').Territory;

export class SystemWorldSim extends SystemBase {

    protected owMap: OWMap;
    protected worldSim: WorldSimulation;
    protected worldTop: WorldTop;
    protected territory: Territory;

    constructor(compTypes, pool?) {
        super(RG.SYS.WORLD_SIM, compTypes, pool);
        this.legalArgs = ['owMap', 'worldSim', 'worldTop', 'territory'];
    }

    public updateEntity(ent): void {
        const worldEvt = ent.get('WorldSimEvent');
        this._checkEntityValid(ent);
        console.log('WorldEvent was processed OK');
        console.log(this.worldSim.toString());
        ent.remove(worldEvt);
    }

    protected _checkEntityValid(ent): void {
        if (ent.getName() !== 'WorldEntity') {
            const name = ent.getName();
            RG.err('System.WorldSim', 'updateEntity',
                `Only WorldEntity can be added to System.WorldSim. Got: ${name}`);
        }
    }

}

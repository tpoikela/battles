
/* System which manages the simulation of the game world. System has no idea
 * about the current level, and thus can only affect the world at higher level.
 */

import RG from '../rg';
import {SystemBase} from './system.base';
import {WS_EVENT} from '../world.simulation';

type WorldTop = import('../world').WorldTop;
type OWMap = import('../overworld.map').OWMap;
type WorldSimulation = import('../world.simulation').WorldSimulation;
type Territory = import('../territory').Territory;
type EventPool = import('../eventpool').EventPool;
type Entity = import('../entity').Entity;

export class SystemWorldSim extends SystemBase {

    protected owMap: OWMap;
    protected worldSim: WorldSimulation;
    protected worldTop: WorldTop;
    protected territory: Territory;

    protected _dtable: {[key: string]: (ent, wsEvent) => void};

    constructor(compTypes: string[], pool?: EventPool) {
        super(RG.SYS.WORLD_SIM, compTypes, pool);
        this.legalArgs = ['owMap', 'worldSim', 'worldTop', 'territory'];
        this._dtable = {};
        this._dtable[WS_EVENT.PHASE_CHANGED] = this._processPhaseChanged.bind(this);
        this._dtable[WS_EVENT.DAY_CHANGED] = this._processDayChanged.bind(this);
    }

    public updateEntity(ent: Entity): void {
        const worldEvtList = ent.getList('WorldSimEvent');
        worldEvtList.forEach(worldEvt => {
            this._checkEntityValid(ent);
            this._processEvent(ent, worldEvt);
            ent.remove(worldEvt);
        });
    }

    protected _checkEntityValid(ent: Entity): void {
        const entName = RG.getEntName(ent);
        if (entName !== 'WorldEntity') {
            const name = entName;
            RG.err('System.WorldSim', 'updateEntity',
                `Only WorldEntity can be added to System.WorldSim. Got: ${name}`);
        }
    }

    protected _processEvent(ent: Entity, wsEvent): void {
        const evtType: string = wsEvent.getEventType();
        if (this._dtable.hasOwnProperty(evtType)) {
            this._dtable[evtType](ent, wsEvent);
        }
    }

    // Callbacks for events
    protected _processPhaseChanged(ent: Entity, wsEvent): void {
        const evtData = wsEvent.getEventData();
        RG.gameMsg(`It is ${evtData.currPhase} now.`);
    }

    protected _processDayChanged(ent: Entity, wsEvent): void {
    }

}

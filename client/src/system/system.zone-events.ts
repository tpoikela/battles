
import RG, {ZONE_EVT} from '../rg';
import {SystemBase} from './system.base';

type Entity = import('../entity').Entity;
type OWMap = import('../overworld.map').OWMap;
type EventPool = import('../eventpool').EventPool;
type WorldTop = import('../world').WorldTop;
type ZoneBase = import('../world').ZoneBase;

export class SystemZoneEvents extends SystemBase {

    protected owMap: OWMap;
    protected worldTop: WorldTop;

    // Contains dispatch table for functions to call for different events
    protected _dtable: {[key: string]: (ent, wsEvent) => void};

    constructor(compTypes: string[], pool?: EventPool) {
        super(RG.SYS.ZONE_EVENTS, compTypes, pool);
        this.legalArgs = ['owMap', 'worldTop'];
        this._dtable = {};
        this._dtable[RG.ZONE_EVT.ZONE_EXPLORED] = this._processZoneExplored.bind(this);
    }

    public updateEntity(ent: Entity): void {
        const zoneEvtList = ent.getList('ZoneEvent');
        zoneEvtList.forEach(zoneEvent => {
            this._processEvent(ent, zoneEvent);
            ent.remove(zoneEvent);
        });
    }

    protected _processEvent(ent: Entity, zoneEvent): void {
        const evtType = zoneEvent.getEventType();
        if (this._dtable.hasOwnProperty[evtType]) {
            this._dtable[evtType](ent, zoneEvent);
        }
        else {
            RG.warn('SystemZoneEvents', '_processEvent',
                `No callback function for evtType ${evtType}`);
        }
    }

    protected _processZoneExplored(ent: Entity, zoneEvent): void {
        const zone = ent as ZoneBase;
        const [tileX, tileY] = zone.getTileXY();

        // TODO list of possible actions after exploring the zone
    }
}

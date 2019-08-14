
import RG from '../rg';
import {SystemBase} from './system.base';
import {RandWeights} from '../interfaces';
import {Placer} from '../placer';
import {FactoryActor} from '../factory.actors';

type Cell = import('../map.cell').Cell;
type Level = import('../level').Level;
type Entity = import('../entity').Entity;
type OWMap = import('../overworld.map').OWMap;
type EventPool = import('../eventpool').EventPool;
type WorldTop = import('../world').WorldTop;
type AreaTile = import('../world').AreaTile;
type ZoneBase = import('../world').ZoneBase;

interface ZoneEvent {
    getEventType(): string;
    getEventData(): {[key: string]: any};
}

const zoneActionWeights: RandWeights = {
    NECROMANCER: 1
};

type EventFunc = (sys: SystemZoneEvents, ent: Entity, zoneEvent: ZoneEvent) => void;

/*
 * System processes different zone events and modifies the world based on these
 * events.
 */

export class SystemZoneEvents extends SystemBase {

    public zoneActionWeights: RandWeights;
    protected owMap: OWMap;
    protected worldTop: WorldTop;

    // Contains dispatch table for functions to call for different events
    protected _dtable: {[key: string]: EventFunc};

    constructor(compTypes: string[], pool?: EventPool) {
        super(RG.SYS.ZONE_EVENTS, compTypes, pool);
        this.legalArgs = ['owMap', 'worldTop'];
        this._dtable = {};
        this._dtable[RG.ZONE_EVT.ZONE_EXPLORED] = this._processZoneExplored.bind(this);
        this.zoneActionWeights = zoneActionWeights;
    }

    /* Sets the weights for different items. */
    public setWeights(ws: RandWeights): void {
        this.zoneActionWeights = ws;
    }

    /* Adds processor function for new event. */
    public addEventProcessor(key: string, func: EventFunc): void {
        this._dtable[key] = func;
    }

    /* Required update function for System. */
    public updateEntity(ent: Entity): void {
        const zoneEvtList = ent.getList('ZoneEvent');
        zoneEvtList.forEach(zoneEvent => {
            this._processEvent(ent, zoneEvent);
            ent.remove(zoneEvent);
        });
    }

    public getAreaTile(zone: ZoneBase): AreaTile {
        const [tX, tY] = zone.getTileXY();
        return this.worldTop.getCurrentArea().getTileXY(tX, tY) as AreaTile;
    }

    public getNewZoneAction(): string {
        return this.rng.getWeighted(this.zoneActionWeights);
    }

    protected _processEvent(ent: Entity, zoneEvent: ZoneEvent): void {
        const evtType = zoneEvent.getEventType();
        if (this._dtable.hasOwnProperty(evtType)) {
            this._dtable[evtType](this, ent, zoneEvent);
        }
        else {
            const keys = Object.keys(this._dtable).join(',');
            const msg = `Registered funcs: ${keys}`;
            RG.warn('SystemZoneEvents', '_processEvent',
                `No callback function for evtType ${evtType}, ${msg}`);
        }
    }

    protected _processZoneExplored(sys, ent: Entity, zoneEvent: ZoneEvent): void {
        const zone = ent as ZoneBase;
        const areaTile = sys.getAreaTile(zone);
        const level = areaTile.getLevel();
        addActorToLevel(level, {name: 'necromancer', levelUp: 5});
        // TODO list of possible actions after exploring the zone
    }
}

function addActorToLevel(level: Level, opts: {[key: string]: any}): boolean {
    const factActor = new FactoryActor();
    const actor = factActor.createActorByName(opts.name);
    if (!actor) {
        RG.err('system.zone-events.ts', 'addActorToLevel',
           `Failed to create actor with ${JSON.stringify(opts)}`);
    }
    if (opts.levelUp) {
        const expLevel = actor.get('Experience').getExpLevel() + opts.levelUp;
        RG.levelUpActor(actor, expLevel);
    }
    return Placer.addEntityToCellType(actor, level, (c: Cell) => c.isFree());
}

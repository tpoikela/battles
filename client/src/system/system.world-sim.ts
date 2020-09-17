
/* System which manages the simulation of the game world. System has no idea
 * about the current level, and thus can only affect the world at higher level.
 */

import RG from '../rg';
import {SystemBase} from './system.base';
import {WS_EVENT} from '../world.simulation';
import * as Component from '../component';
import {WeatherActor} from '../actor.virtual';

type WorldTop = import('../world').WorldTop;
type OWMap = import('../overworld.map').OWMap;
type WorldSimulation = import('../world.simulation').WorldSimulation;
type Territory = import('../territory').Territory;
type EventPool = import('../eventpool').EventPool;
type Entity = import('../entity').Entity;
type Level = import('../level').Level;

export class SystemWorldSim extends SystemBase {

    protected owMap: OWMap;
    protected worldSim: WorldSimulation;
    protected worldTop: WorldTop;
    protected territory: Territory;

    // Dispatch table for event processing functions
    protected _dtable: {[key: string]: (ent, wsEvent) => void};

    public dayCount: number;

    constructor(compTypes: string[], pool?: EventPool) {
        super(RG.SYS.WORLD_SIM, compTypes, pool);
        this.legalArgs = ['owMap', 'worldSim', 'worldTop', 'territory'];
        this._dtable = {};
        this._dtable[WS_EVENT.PHASE_CHANGED] = this._processPhaseChanged.bind(this);
        this._dtable[WS_EVENT.DAY_CHANGED] = this._processDayChanged.bind(this);
        this._dtable[WS_EVENT.MONTH_CHANGED] = this._processMonthChanged.bind(this);
        this._dtable[WS_EVENT.SEASON_CHANGED] = this._processSeasonChanged.bind(this);
        this._dtable[WS_EVENT.YEAR_CHANGED] = this._processYearChanged.bind(this);
        this.dayCount = 0;
    }

    // Entity here is usually 'worldEntity'
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
        if (entName !== RG.WORLD_ENTITY) {
            const name = entName;
            RG.err('System.WorldSim', 'updateEntity',
                `Only actor WorldEntity can be added to System.WorldSim. Got: ${name}`);
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
        const level: Level = ent.get('Location').getLevel();
        const summerDays = 4;
        if (!level.has('Weather')) {
            level.add(new Component.Weather());
        }

        if (level.getActors().findIndex(a => a.getName() === 'WeatherActor') < 0) {
            const weatherActor = new WeatherActor('WeatherActor');
            level.addVirtualProp(RG.TYPE_ACTOR, weatherActor);
        }

        const weatherComp = level.get('Weather');
        if (this.dayCount < summerDays) {
            RG.gameMsg('It is summer time now');
            weatherComp.setWeatherType('warm');
        }
        else {
            RG.gameMsg('Winter has arrived!');
            weatherComp.setWeatherType('snowStorm');
        }
        ++this.dayCount;
        if (this.dayCount === (2*summerDays)) {
            this.dayCount = 0;
        }
    }


    protected _processMonthChanged(ent: Entity, wsEvent): void {
    }

    protected _processSeasonChanged(ent: Entity, wsEvent): void {
    }

    protected _processYearChanged(ent: Entity, wsEvent): void {
    }

}

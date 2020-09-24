/* This file contains logic needed to do the world simulation. The simulation
 * consists of several parts:
 *   1. Weather simulation
 *   2. War simulation between factions
 *   3.
 */

import dbg from 'debug';
const debug = dbg('bitn:WorldSimulation');

import RG from './rg';
import {SeasonManager} from './season-manager';
import {DayManager} from './day-manager';
import * as Component from './component/component';
import {EventPool} from './eventpool';
import {BaseActor} from './actor';
import {TCoord} from './interfaces';
import {WeatherActor} from './actor.virtual';

type OWMap = import('./overworld.map').OWMap;
type Level = import('./level').Level;

const WORLD_ENTITY = 'WorldEntity';

export enum WS_EVENT {
    'PHASE_CHANGED',
    'DAY_CHANGED',
    'MONTH_CHANGED',
    'SEASON_CHANGED',
    'YEAR_CHANGED',
}

debug.enabled = true;

export class WorldSimulation {

    public static fromJSON: (json: any) => WorldSimulation;

    public seasonMan: SeasonManager;
    public dayMan: DayManager;
    public updateCount: number;

    protected currLevel: Level;
    protected pool: EventPool;
    protected worldEntity: BaseActor;

    constructor(pool?: EventPool) {
        this.dayMan = new DayManager(pool);
        this.seasonMan = new SeasonManager(pool);
        this.seasonMan._debug = debug.enabled;
        this.worldEntity = new BaseActor(WORLD_ENTITY);
        this.worldEntity.add(new Component.Location());
        this.updateCount = 0;
    }

    public setLevel(level: Level): void {
        if (!level) {
            throw new Error('WorldSim: Tried to set null level');
        }
        // this.currLevel = level;
        this.worldEntity.get('Location').setLevel(level);
    }

    public getLevel(): Level | null {
        return this.worldEntity.get('Location').getLevel();
    }

    /* Sets the current OW position of interest. Usually where player is. */
    public setOwPos(xy: TCoord): void {
        this.seasonMan.setOwPos(xy);
    }

    /* Updates all sub-components. */
    public update(): void {
        this.dayMan.update();

        if (this.dayMan.phaseChanged()) {
            const wsEvent = new Component.WorldSimEvent();
            wsEvent.setEventType(WS_EVENT.PHASE_CHANGED);

            const entry = this.dayMan.getPhaseEntry();
            wsEvent.setEventData({
                currPhase: this.dayMan.getCurrPhase(),
                entry
            });
            this.dbg('updateCount:', this.updateCount, 'phaseChange detected', entry);
            this.worldEntity.add(wsEvent);
            this.seasonMan.changeWeather();
        }

        if (this.dayMan.dayChanged()) {
            this.dbg(this.updateCount, 'dayChange detected');
            this.seasonMan.update();

            const wsEvent = new Component.WorldSimEvent();
            wsEvent.setEventType(WS_EVENT.DAY_CHANGED);
            this.worldEntity.add(wsEvent);

            if (this.seasonMan.monthChanged()) {
                this.emitMonthChanged();
                this.dbg(this.updateCount, 'monthChange detected');
                // TODO update world situation, ie do some battles
                // Progress the territory situations
                if (this.seasonMan.seasonChanged()) {
                    this.emitSeasonChanged();
                    // Simulate one bigger event in the world
                    if (this.seasonMan.yearChanged()) {
                        this.emitYearChanged();
                        // Simulate huge event happening, although it's somewhat
                        // predictable that it happens at year change
                    }
                }
            }

        }

        if (this.changed('weather')) {
            this.seasonMan.resetWeatherChanged();
            this.processWeatherChanged();
        }

        ++this.updateCount;
    }

    /* Returns time of day in minutes. */
    public getTimeOfDayMins(): number {
        return this.dayMan.getTimeMins();
    }

    public getSeason(): string {
        return this.seasonMan.getSeason();
    }

    public getWeather(): string {
        return this.seasonMan.getWeather();
    }

    public getTemperature(): number {
        return this.seasonMan.getTemperature();
    }

    public setUpdateRates(rate: number): void {
        this.dayMan.setUpdateRate(rate);
    }

    public setPool(pool: EventPool): void {
        this.dayMan.setPool(pool);
        this.seasonMan.setPool(pool);
    }

    public setOverWorld(ow: OWMap): void {
        this.seasonMan.setBiomeMap(ow.getBiomeMap());
    }

    public toJSON(): any {
        return {
            dayManager: this.dayMan.toJSON(),
            seasonManager: this.seasonMan.toJSON(),
            updateCount: this.updateCount,
        };
    }

    public toString(): string {
        return (
            'Day:    ' + this.dayMan.toString() + '\n' +
            'Season: ' + this.seasonMan.toString()
        );
    }

    public dbg(...args): void {
        if (debug.enabled) {
            const season = this.getSeason();
            const temp = this.getTemperature();
            const msg = `|${season}, T${temp}`;
            debug(msg, ...args);
        }
    }

    protected emitMonthChanged(): void {
        const wsEvent = new Component.WorldSimEvent();
        wsEvent.setEventType(WS_EVENT.MONTH_CHANGED);
        wsEvent.setEventData({season: this.seasonMan.getSeason()});
        this.worldEntity.add(wsEvent);
    }

    protected emitSeasonChanged(): void {
        const wsEvent = new Component.WorldSimEvent();
        wsEvent.setEventType(WS_EVENT.SEASON_CHANGED);
        wsEvent.setEventData({season: this.seasonMan.getSeason()});
        this.worldEntity.add(wsEvent);
    }

    protected emitYearChanged(): void {
        const wsEvent = new Component.WorldSimEvent();
        wsEvent.setEventType(WS_EVENT.YEAR_CHANGED);
        wsEvent.setEventData({season: this.seasonMan.getSeason()});
        this.worldEntity.add(wsEvent);
    }

    /* Returns true if any changes were in the world simulation */
    protected changed(prop: string): boolean {
        switch (prop) {
            case 'day': return this.dayMan.dayChanged();
            case 'month': return this.seasonMan.monthChanged();
            case 'season': return this.seasonMan.seasonChanged();
            case 'year': return this.seasonMan.yearChanged();
            case 'weather': return this.seasonMan.weatherChanged();
            default: throw new Error('No change for ' + prop);
        }
        return false;
    }

    /* Changes the Weather comp on the current level. Adds WeatherActor if
     * needed. */
    protected processWeatherChanged(): void {
        const weather = this.getWeather();
        const currLevel = this.getLevel();
        // Level might not be set before update() is called
        if (currLevel) {
            this.dbg(this.updateCount, 'weather change detected -> ', weather);
            currLevel.removeAll('Weather');

            const weatherComp = new Component.Weather();
            weatherComp.setWeatherType(weather);
            weatherComp.setTemperature(this.getTemperature());

            if (currLevel.getActors().findIndex(a => a.getName() === 'WeatherActor') < 0) {
                const weatherActor = new WeatherActor('WeatherActor');
                currLevel.addVirtualProp(RG.TYPE_ACTOR, weatherActor);
            }

            currLevel.add(weatherComp);
        }
    }

}

WorldSimulation.fromJSON = function(json: any): WorldSimulation {
    const ws = new WorldSimulation();
    ws.dayMan = DayManager.fromJSON(json.dayManager);
    ws.seasonMan = SeasonManager.fromJSON(json.seasonManager);
    ws.updateCount = json.updateCount;
    return ws;
};

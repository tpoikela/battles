/* This file contains logic needed to do the world simulation. The simulation
 * consists of several parts:
 *   1. Weather simulation
 *   2. War simulation between factions
 *   3.
 */

import {SeasonManager} from './season-manager';
import {DayManager} from './day-manager';
import * as Component from './component/component';
import {EventPool} from './eventpool';
import {BaseActor} from './actor';
import {TCoord} from './interfaces';

type OWMap = import('./overworld.map').OWMap;
type Level = import('./level').Level;

export class WorldSimulation {

    public static fromJSON: (json: any) => WorldSimulation;

    public seasonMan: SeasonManager;
    public dayMan: DayManager;
    protected currLevel: Level;
    protected pool: EventPool;
    protected worldEntity: BaseActor;

    constructor(pool?: EventPool) {
        this.dayMan = new DayManager(pool);
        this.seasonMan = new SeasonManager(pool);
        this.worldEntity = new BaseActor('WorldEntity');
    }

    public setLevel(level: Level): void {
        this.currLevel = level;
    }

    /* Sets the current OW position of interest. Usually where player is. */
    public setOwPos(xy: TCoord): void {
        this.seasonMan.setOwPos(xy);
    }

    /* Updates all sub-components. */
    public update(): void {
        this.dayMan.update();
        this.worldEntity.add(new Component.WorldSimEvent());

        if (this.dayMan.phaseChanged()) {
            this.seasonMan.changeWeather();
        }

        if (this.dayMan.dayChanged()) {
            this.seasonMan.update();

            if (this.seasonMan.monthChanged()) {
                // TODO update world situation, ie do some battles
                // Progress the territory situations
                if (this.seasonMan.seasonChanged()) {
                    // Simulate one bigger event in the world
                    if (this.seasonMan.yearChanged()) {
                        // Simulate huge event happening, although it's somewhat
                        // predictable that it happens at year change
                    }
                }
            }

        }

        if (this.changed('weather')) {
            const weather = this.seasonMan.getWeather();
            // Level might not be set before update() is called
            if (this.currLevel) {
                this.currLevel.removeAll('Weather');
                const weatherComp = new Component.Weather();
                weatherComp.setWeatherType(weather);
                this.currLevel.add(weatherComp);
            }
        }

    }

    public getSeason(): string {
        return this.seasonMan.getSeason();
    }

    public getWeather(): string {
        return this.seasonMan.getWeather();
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
            seasonManager: this.seasonMan.toJSON()
        };
    }

    public toString(): string {
        return (
            'Day:    ' + this.dayMan.toString() + '\n' +
            'Season: ' + this.seasonMan.toString()
        );
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

}

WorldSimulation.fromJSON = function(json: any): WorldSimulation {
    const ws = new WorldSimulation();
    ws.dayMan = DayManager.fromJSON(json.dayManager);
    ws.seasonMan = SeasonManager.fromJSON(json.seasonManager);
    return ws;
};

/* This file contains logic needed to do the world simulation. The simulation
 * consists of several parts:
 *   1. Weather simulation
 *   2. War simulation between factions
 *   3.
 */

import {SeasonManager} from './season-manager';
import {DayManager} from './day-manager';
import * as Component from './component/component';

type OWMap = import('./overworld.map').OWMap;
type Level = import('./level').Level;

export class WorldSimulation {

    protected seasonMan: SeasonManager;
    protected dayMan: DayManager;
    protected currLevel: Level;

    constructor() {
        this.dayMan = new DayManager();
        this.seasonMan = new SeasonManager();
    }

    public setLevel(level: Level): void {
        this.currLevel = level;
    }

    public setOwPos(xy): void {
        this.seasonMan.setOwPos(xy);
    }

    /* Updates all sub-components. */
    public update(): void {
        this.dayMan.update();

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

    public changed(prop: string): boolean {
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

    public setOverWorld(ow: OWMap): void {
        this.seasonMan.setBiomeMap(ow.getBiomeMap());
    }

}

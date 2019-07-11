/* Season manager handles scheduling of 4 seasons and
 * also manages internal game time/calender + time of day.
 */

import RG from './rg';
import {Random} from './random';
import {TCoord} from './interfaces';
import {EventPool} from './eventpool';

const RNG = Random.getRNG();

export interface SeasonEntry {
    dur: number;
    temp: [number, number]; // Min/max temperature
    weather: string[];
    index: number; // Determines order of season in 'seasonal wheel'
}

// Default weathers on any season are sunny, cloudy
//
const defaultWeather = ['sunny', 'cloudy'];
const specialThr = 0.1;
const sameWeatherProb = 0.5;
const daysInMonth = 32;

export const seasonConfig: {[key: string]: SeasonEntry} = {
    AUTUMN: {dur: 2.0, temp: [0, 15], weather: [], index: 0},
    AUTUMN_WINTER: {
        dur: 1.0, temp: [-10, 10], weather: ['snowFall', 'coldRain'], index: 1
    },
    WINTER: {
        dur: 4.0, temp: [-35, 3], weather: ['snowFall', 'snowStorm', 'hailStorm'],
        index: 2
    },
    WINTER_SPRING: {dur: 1.0, temp: [-10, 10], weather: ['snowFall'], index: 3},
    SPRING: {dur: 1.0, temp: [7, 15], weather: [], index: 4},
    SPRING_SUMMER: {dur: 1.0, temp: [10, 20], weather: [], index: 5},
    SUMMER: {dur: 1.0, temp: [15, 25], weather: [], index: 6},
    SUMMER_AUTUMN: {dur: 1.0, temp: [10, 20], weather: ['rain'], index: 7},
};

/* Stores possible weathers for each biome. */
export const biomePossibleSeasons: {[key: string]: string[]} = {
    arctic: ['WINTER'],
    alpine: ['WINTER', 'WINTER_SPRING'],
    tundra: ['AUTUMN_WINTER', 'WINTER', 'WINTER_SPRING'],
    taiga: ['all'],
    forest: ['all'],
    grassland: ['all']
};

/* Returns a "distance" between two seasons */
export function getSeasonDist(s1, s2): number {
    const i1 = seasonConfig[s1].index;
    const i2 = seasonConfig[s2].index;
    return Math.abs(i1 - i2);
}

interface StringMap {
    [key: string]: string;
}

export class SeasonManager {

    public static fromJSON(json: any): SeasonManager {
        const seasonMan = new SeasonManager();
        seasonMan._currSeason = json.currSeason;
        seasonMan._currWeather = json.currWeather;
        seasonMan._monthLeft = json.monthLeft;
        seasonMan._seasonLeft = json.seasonLeft;
        seasonMan._seasonChanged = json.seasonChanged;
        seasonMan._weatherChanged = json.weatherChanged;
        seasonMan._monthChanged = json.monthChanged;
        seasonMan._yearChanged = json.yearChanged;
        seasonMan._owPos = json.owPos;
        seasonMan._biomeMap = json.biomeMap;
        return seasonMan;
    }

    public pool: EventPool;

    protected _currSeason: string;
    protected _currWeather: string;
    protected _monthLeft: number;
    protected _seasonLeft: number;

    protected _seasonChanged: boolean;
    protected _weatherChanged: boolean;
    protected _monthChanged: boolean;
    protected _yearChanged: boolean;

    protected _owPos: TCoord;
    protected _biomeMap: StringMap;

    constructor(pool?: EventPool) {
        this._currSeason = RG.SEASON.AUTUMN;
        this._monthLeft = daysInMonth;
        this._seasonLeft = seasonConfig[this._currSeason].dur;
        this._currWeather = 'sunny';

        this._seasonChanged = false;
        this._weatherChanged = false;
        this._monthChanged = false;
        this._yearChanged = false;
        this.pool = pool;
    }

    /* Sets the player position in overworld map to find the correct biomes etc. */
    public setOwPos(xy: TCoord): void {
        this._owPos = xy;
    }

    public setBiomeMap(biomeMap: StringMap): void {
        this._biomeMap = biomeMap;
    }

    public seasonChanged(): boolean {
        return this._seasonChanged;
    }

    public monthChanged(): boolean {
        return this._monthChanged;
    }

    public yearChanged(): boolean {
        return this._yearChanged;
    }

    public weatherChanged(): boolean {
        return this._weatherChanged;
    }

    /* Updates season progress. */
    public update(): void {
        --this._monthLeft;
        this._seasonChanged = false;
        this._monthChanged = false;
        this._yearChanged = false;

        if (this._monthLeft === 0) {
            this._seasonLeft -= 1;
            this._monthLeft = daysInMonth;
            this._monthChanged = true;
        }

        if (this._seasonLeft <= 0) {
            this.nextSeason();
            this._seasonChanged = true;
            this._checkMsgEmits();
        }
    }

    public nextSeason(): void {
        const seasons = Object.keys(seasonConfig);
        const currIndex= seasons.indexOf(this._currSeason);
        let nextIndex = currIndex + 1;
        if (nextIndex >= seasons.length) {
            nextIndex = 0;
            this._yearChanged = true;
            this.pool.emitEvent(RG.EVT_YEAR_CHANGED, {
                prevSeason: this._currSeason,
                nextSeason: seasons[nextIndex]
            });
        }
        this.pool.emitEvent(RG.EVT_SEASON_CHANGED, {
            prevSeason: this._currSeason,
            nextSeason: seasons[nextIndex]
        });
        this._currSeason = seasons[nextIndex];
        // TODO emit event SEASON_CHANGED
    }

    /* Returns the current weather. */
    public getWeather(): string {
        return this._currWeather;
    }

    /* Changes the weather (possibly), and returns the new (or old) weather. */
    public changeWeather(): string {
        this._weatherChanged = false;
        if (RG.isSuccess(sameWeatherProb)) {
            return this._currWeather;
        }

        const seasonModified = this.getSeasonModified();

        let weather = this._currWeather;
        if (RG.isSuccess(specialThr)) {
            const specialWeathers = seasonConfig[seasonModified].weather;
            if (specialWeathers.length > 0) {
                weather = RNG.arrayGetRand(specialWeathers);
            }
        }
        else {
            weather = RNG.arrayGetRand(defaultWeather);
        }
        if (weather !== this._currWeather) {
            this._weatherChanged = true;
        }

        this.pool.emitEvent(RG.EVT_WEATHER_CHANGED, {
            prevWeather: this._currWeather,
            nextWeather: weather
        });
        this._currWeather = weather;
        return this._currWeather;
    }

    /* Updates all seasons. */
    public getSeason(): string {
        return this._currSeason;
    }

    public getSeasonModified(): string {
        if (!this._biomeMap) {return this._currSeason;}
        if (!this._owPos) {return this._currSeason;}

        const key = this._owPos[0] + ',' + this._owPos[1];
        const currBiome = this._biomeMap[key];
        if (currBiome) {
            console.log('currBiome found was ' + currBiome);
            const possibleSeason = biomePossibleSeasons[currBiome];

            if (possibleSeason[0] === 'all') {return this._currSeason;}
            else {
                const index = possibleSeason.indexOf(this._currSeason);
                if (index >= 0) {return this._currSeason;}
                // TODO Compute distance between actual season and one from the list
                return possibleSeason[0];
            }
        }
        else {
            RG.err('SeasonManager', 'getSeasonModified',
                `currBiome not found with key ${key}`);
        }
    }

    public setPool(pool?: EventPool): void {
        this.pool = pool;
    }

    public toJSON(): any {
        return {
            currSeason: this._currSeason,
            currWeather: this._currWeather,
            monthLeft: this._monthLeft,
            seasonLeft: this._seasonLeft,

            seasonChanged: this._seasonChanged,
            weatherChanged: this._weatherChanged,
            monthChanged: this._monthChanged,
            yearChanged: this._yearChanged,
            owPos: this._owPos,
            biomeMap: this._biomeMap
        };
    }

    public toString(): string {
        return (
            'Weather: ' + this._currWeather + ',' +
            'Month left: ' + this._monthLeft + ',' +
            'Season: ' + this._currSeason + '(' + this._seasonLeft + ')'
        );
    }

    protected _checkMsgEmits(): void {
        if (this.seasonChanged()) {
            if (this._currSeason === RG.SEASON.AUTUMN_WINTER) {
                RG.gameMsg('Winter is approaching quickly!');
            }
            else if (this._currSeason === RG.SEASON.WINTER) {
                RG.gameMsg('The call of Winter has arrived!');
            }
        }
    }

}


import RG from '../rg';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import {MapGenerator} from '../generator';
import {snowMeltMap} from '../../data/elem-constants';
import * as Component from '../component/component';

type CellMap = import('../map').CellMap;
type Cell = import('../map.cell').Cell;
type Level = import('../level').Level;
type Entity = import('../entity').Entity;
type BaseActor = import('../actor').BaseActor;

const tempFreezing = -15;
const tempCold = 0;
const tempWarming = 15;
const tempDrying = 15;

const humidityWarming = 50;

const compsForHeat = ['Coldness', 'Drenched'];

/* Handles WeatherEffect components and has handler functions for
 * different types of weather effects. */
export class SystemWeather extends SystemBase {

    private _effTable: {[key: string]: (ent: Entity, comp) => void};

    constructor(compTypes: string[], pool: EventPool) {
        super(RG.SYS.WEATHER, compTypes, pool);

        // TODO: Proper weather. Just a simplified model here.
        this._effTable = {
            // Winter
            snowStorm: this.handleSnowStorm = this.handleSnowStorm.bind(this),
            hailStorm: this.handleSnowStorm = this.handleSnowStorm.bind(this),
            snowFall: this.handleSnowFall = this.handleSnowFall.bind(this),
            // Summer/Spring
            warm: this.handleWarm = this.handleWarm.bind(this),
            // Autumn
            rain: this.handleRain = this.handleRain.bind(this),
            coldRain: this.handleRain = this.handleRain.bind(this),
            'heavy rain': this.handleRain = this.handleRain.bind(this),
            // Any
            clear: this.handleClear = this.handleClear.bind(this),
            sunny: this.handleClear = this.handleClear.bind(this),
            cloudy: this.handleClear = this.handleClear.bind(this)
        };
    }

    public updateEntity(ent: Entity): void {
        if (ent.has('WeatherEffect')) {
            const eff = ent.get('WeatherEffect');
            const effName = eff.getEffectType();
            if (this._effTable[effName]) {
                this._effTable[effName](ent, eff);
                this.handleTemperature(ent, eff);
            }
            ent.removeAll('WeatherEffect');
        }
    }

    protected handleTemperature(ent: Entity, eff): void {
        const level: Level = RG.getLevel(ent);
        const tempOutdoor = eff.getTemperature();
        const humidityOutdoor = eff.getHumidity();

        // 1st step, we apply temp only to outdoors, this will be expanded to
        // make houses warmer than dungeons etc. Best would be to have some temp
        // in each baseElement.
        const actors = level.getActors();
        actors.forEach((actor: BaseActor): void => {
            if (actor.has('Location') && actor.get('Location').isValid()) {
                let currTemp = tempOutdoor;
                let currHumidity = humidityOutdoor;
                const elem = actor.getCell()!.getBaseElem();

                if (elem.has('Indoor')) {
                    currTemp += 5;
                    currHumidity = humidityWarming;
                    if (elem.getName() === 'floorhouse') {
                        currTemp += 15;
                    }

                    // Set indoor temp based on outdoor temp
                    if (tempOutdoor >= 15) {
                        currTemp = tempOutdoor;
                    }
                    else if (currTemp > 15) {
                        currTemp = 15;
                    }
                }

                if (currTemp < tempFreezing) {
                    const coldList = actor.getList('Coldness');
                    if (coldList.length < 2) {
                        actor.add(new Component.Coldness());
                    }
                }
                else if (currTemp < tempCold && !actor.has('Coldness')) {
                    actor.add(new Component.Coldness());
                }

                if (currHumidity <= humidityWarming) {
                    if (currTemp >= tempWarming && actor.hasAny(compsForHeat)) {
                        actor.add(new Component.Heat());
                    }
                }
            }
        });
    }

    /* In snowfall, apply small visibility penalty. */
    protected handleSnowFall(ent: Entity, comp): void {
        this.handleSnowStorm(ent, comp);
    }

    /* In clear weather, check only if temp has changed. */
    protected handleClear(ent: Entity, comp): void {
    }

    /* In storm, apply extra visibility penalty and coldness factor. */
    protected handleSnowStorm(ent: Entity, comp): void {
        const level = RG.getLevel(ent);
        if (level) {
            const map = level.getMap();
            const nonSnowCells = map.getFree().filter(
                c => !c.getBaseElem().has('Snowy'));
            const numSnow = MapGenerator.addRandomSnow(map, 0.1, nonSnowCells);
            if (numSnow > 5) {
                RG.gameMsg('It is snowing heavily!');
            }
        }
        else {
            RG.err('SystemWeather', 'handleSnowStorm',
                `Null level for ent: ${JSON.stringify(ent)}`);
        }
    }

    /* Here we need to add some Wet components to actors. */
    protected handleRain(ent: Entity, comp): void {
        const level = RG.getLevel(ent);
        const map = level.getMap();
        // MapGenerator.addRandomSnow(map, 0.1);
        const actors = level.getActors();
        actors.forEach((actor: BaseActor): void => {
            if (actor.has('Ethereal')) {return;}
            if (actor.has('Location') && actor.get('Location').isValid()) {
                const baseElem = actor.getCell()!.getBaseElem();
                if (!baseElem.has('Indoor')) {
                    if (!actor.has('Drenched')) {
                        actor.add(new Component.Drenched());
                        const msg = `${actor.getName()} is drenched by the heavy rain!`;
                        RG.gameInfo({cell: actor.getCell(), msg});
                    }
                    actor.get('Drenched').incrLevel();
                }
            }
        });
        RG.gameMsg('It is raining heavily outdoors');
    }

    protected handleWarm(ent, comp): void {
        this.handleMeltSnow(ent, comp);
    }

    /* Melts down the snow located in the level with the entity. */
    protected handleMeltSnow(ent, comp): void {
        const ratio = 0.10;
        const map: CellMap = ent.getLevel().getMap();
        const snowCells = map.getFree().filter(c => c.getBaseElem().has('Snowy'));

        snowCells.forEach((cell: Cell) => {
            const meltSnow = this.rng.getUniform();
            if (meltSnow < ratio) {
                const baseType = cell.getBaseElem().getType();
                const newElem = snowMeltMap[baseType];
                cell.setBaseElem(newElem);
            }
        });
        if (snowCells.length > 0) {
            RG.gameMsg('It is getting warmer. Snow and ice are melting');
        }
    }

}

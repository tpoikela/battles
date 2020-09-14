
import RG from '../rg';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import {MapGenerator} from '../generator';
import {snowMeltMap} from '../../data/elem-constants';

type CellMap = import('../map').CellMap;
type Cell = import('../map.cell').Cell;
type Entity = import('../entity').Entity;

/* Handles WeatherEffect components and has handler functions for
 * different types of weather effects. */
export class SystemWeather extends SystemBase {

    private _effTable: {[key: string]: (ent: Entity, comp) => void};

    constructor(compTypes: string[], pool?: EventPool) {
        super(RG.SYS.WEATHER, compTypes, pool);

        // TODO: Proper weather. Just a simplified model here.
        this._effTable = {
            // Winter
            snowStorm: this.handleSnowStorm = this.handleSnowStorm.bind(this),
            // Summer/Spring
            warm: this.handleMeltSnow = this.handleMeltSnow.bind(this),
            // Autumn
            rain: this.handleRain = this.handleRain.bind(this)
        };
    }

    public updateEntity(ent: Entity): void {
        if (ent.has('WeatherEffect')) {
            const eff = ent.get('WeatherEffect');
            const effName = eff.getEffectType();
            if (this._effTable[effName]) {
                this._effTable[effName](ent, eff);
            }
            ent.removeAll('WeatherEffect');
        }
    }

    protected handleSnowStorm(ent: Entity, comp): void {
        const level = RG.getLevel(ent);
        if (level) {
            const map = level.getMap();
            const nonSnowCells = map.getFree().filter(
                c => !c.getBaseElem().has('Snowy'));
            MapGenerator.addRandomSnow(map, 0.1, nonSnowCells);
            RG.gameMsg('It is snowing heavily!');
        }
        else {
            RG.err('SystemWeather', 'handleSnowStorm',
                `Null level for ent: ${JSON.stringify(ent)}`);
        }
    }

    protected handleRain(ent: Entity, comp): void {
        const level = RG.getLevel(ent);
        const map = level.getMap();
        // MapGenerator.addRandomSnow(map, 0.1);
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
        RG.gameMsg('It is getting warmer. Snow and ice are melting');
    }

}

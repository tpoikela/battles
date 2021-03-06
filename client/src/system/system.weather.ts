
import RG from '../rg';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import {MapGenerator} from '../generator';
import {Random} from '../random';

const RNG = Random.getRNG();

/* Handles WeatherEffect components and has handler functions for
 * different types of weather effects. */
export class SystemWeather extends SystemBase {

    private _effTable: {[key: string]: (ent, comp) => void};

    constructor(compTypes, pool?: EventPool) {
        super(RG.SYS.WEATHER, compTypes, pool);

        this._effTable = {
            snowStorm: this.handleSnowStorm = this.handleSnowStorm.bind(this),
            warm: this.handleMeltSnow = this.handleMeltSnow.bind(this)
        };
    }

    public updateEntity(ent): void {
        if (ent.has('WeatherEffect')) {
            const eff = ent.get('WeatherEffect');
            const effName = eff.getEffectType();
            if (this._effTable[effName]) {
                this._effTable[effName](ent, eff);
            }
            ent.removeAll('WeatherEffect');
        }
    }

    protected handleSnowStorm(ent, comp): void {
        const level = ent.getLevel();
        const map = level.getMap();
        MapGenerator.addRandomSnow(map, 0.1);
    }

    /* Melts down the snow located in the level with the entity. */
    protected handleMeltSnow(ent, comp): void {
        const ratio = 0.10;
        const map = ent.getLevel().getMap();
        const snowCells = map.getFree().filter(c => c.getBaseElem().has('Snowy'));
        snowCells.forEach(cell => {
            const meltSnow = RNG.getUniform();
            if (meltSnow < ratio) {
                const baseType = cell.getBaseElem().getType();
                const newElem = MapGenerator.snowMeltMap[baseType];
                cell.setBaseElem(newElem);
            }
        });
    }

}

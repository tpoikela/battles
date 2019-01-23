
import RG from '../rg';
import * as Component from '../component';
import {SystemBase} from './system.base';
import {EventPool} from '../eventpool';
import {MapGenerator} from '../map.generator';

export class SystemWeather extends SystemBase {

    private _effTable: {[key: string]: (ent, comp) => void};

    constructor(compTypes, pool?: EventPool) {
        super(RG.SYS.WEATHER, compTypes, pool);

        this._effTable = {
            snowStorm: this.handleSnowStorm = this.handleSnowStorm.bind(this)
        };
    }

    public updateEntity(ent): void {
        if (ent.has('WeatherEffect')) {
            const eff = ent.get('WeatherEffect');
            const effName = eff.getEffectType();
            if (this._effTable[effName]) {
                this._effTable[effName](ent, eff);
            }
            ent.remove(eff);
        }
    }

    protected handleSnowStorm(ent, comp): void {
        const level = ent.getLevel();
        const map = level.getMap();
        MapGenerator.addRandomSnow(map, 0.1);
    }

}

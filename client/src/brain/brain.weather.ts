
import RG from '../rg';
import {ACTION_ALREADY_DONE} from './brain';
import {BrainBase} from './brain.base';
import * as Component from '../component/component';

type ActionCallback = import('../time').ActionCallback;

export class BrainWeather extends BrainBase {

    protected updateFreq: number;

    constructor(actor) {
        super(actor);
        this.setType('Weather');
        this.updateFreq = 10;
    }

    public decideNextAction(obj?: any): ActionCallback {
        --this.updateFreq;
        const level = this._actor.getLevel();
        if (this.updateFreq === 0 && level.has('Weather')) {
            const weather = level.get('Weather');
            const wType = weather.getWeatherType();
            const wEffect = new Component.WeatherEffect();
            wEffect.setEffectType(wType);
            wEffect.setTemperature(weather.getTemperature());
            this._actor.add(wEffect);
            this.updateFreq = 10;
        }
        return ACTION_ALREADY_DONE;
    }
}

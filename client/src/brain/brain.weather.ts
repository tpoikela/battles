
import RG from '../rg';
import {ACTION_ALREADY_DONE} from './brain';
import {BrainBase} from './brain.base';
import * as Component from '../component/component';

type ActionCallback = import('../time').ActionCallback;

export class BrainWeather extends BrainBase {

    constructor(actor) {
        super(actor);
        this.setType('Weather');
    }

    public decideNextAction(obj?: any): ActionCallback {
        const level = this._actor.getLevel();
        if (level.has('Weather')) {
            const weather = level.get('Weather');
            const wType = weather.getWeatherType();
            const wEffect = new Component.WeatherEffect();
            wEffect.setEffectType(wType);
            this._actor.add(wEffect);
        }
        return ACTION_ALREADY_DONE;
    }
}

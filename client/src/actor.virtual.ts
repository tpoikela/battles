
import {BaseActor, ACTOR_NO_ACTION} from './actor';
import {BrainVirtual} from './brain/brain.virtual';
import {BrainWeather} from './brain/brain.weather';
import * as Time from './time';

/* Virtual actor can be used to spawn more entities or for AI-like effects
 * inside a level. */
export class VirtualActor extends BaseActor {

    constructor(name) { // {{{2
        super(name);
        this._brain = new BrainVirtual(this);
    }

}

export class WeatherActor extends BaseActor {

    constructor(name: string) { // {{{2
        super(name);
        this._brain = new BrainWeather(this);
    }

}

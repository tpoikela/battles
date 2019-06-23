
import {BaseActor, ACTOR_NO_ACTION} from './actor';
import {BrainVirtual, BrainSpawner} from './brain/brain.virtual';
import {BrainWeather} from './brain/brain.weather';
import * as Component from './component/component';

/* Virtual actor can be used to spawn more entities or for AI-like effects
 * inside a level. */
export class VirtualActor extends BaseActor {

    constructor(name: string) {
        super(name);
        this._brain = new BrainVirtual(this);
    }

}

export class WeatherActor extends BaseActor {

    constructor(name: string) {
        super(name);
        this._brain = new BrainWeather(this);
    }

}

export class SpawnerActor extends BaseActor {

    constructor(name: string) { // {{{2
        super(name);
        this._brain = new BrainSpawner(this);
        this.add(new Component.Stats());
        this.get('Stats').setSpeed(10);
    }

    public getSpeed(): number {
        return this.get('Stats').getSpeed();
    }

}

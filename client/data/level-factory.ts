
import {AbandonedFort} from './abandoned-fort';
import {BlackTower} from './black-tower';
import {Capital} from './capital';
import {DwarvenCity} from './dwarven-city';
import {Level} from '../src/level';

import RG from '../src/rg';

type LevelArgs = [number, number, any];

interface LevelObj {
    nLevel: number;
    level: Level;
}

/* Factory for creating levels by specifying their name. */
export class LevelFactory {

    public fact: any;
    public createFunc: {[key: string]: (...args) => Level | LevelObj[]};

    constructor(fact) {
        this.fact = fact;
        this.createFunc = {};
    }

    addFunction(name, createFunc) {
        this.createFunc[name] = createFunc;
    }

    create(name, args: LevelArgs): Level | LevelObj[] {
        switch (name) {
            case 'Capital': return new Capital(...args).getLevel();
            case 'DwarvenCity': return new DwarvenCity(...args).getLevel();
            case 'AbandonedFort': return new AbandonedFort(...args).getLevel();
            case 'BlackTower': return new BlackTower(...args).getLevels();
            default: {
                if (this.createFunc.hasOwnProperty(name)) {
                    return this.createFunc[name](...args);
                }
                if (this.fact) {
                    return this.fact.createLevel(name, ...args);
                }
                else {
                    RG.err('LevelFactory', 'create',
                        'No factory/factory function given. Name: ' + name);
                }
                return null;
            }
        }
    }

}

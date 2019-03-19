
import {AbandonedFort} from './abandoned-fort';
import {BlackTower} from './black-tower';
import {Capital} from './capital';
import {DwarvenCity} from './dwarven-city';
import {Level} from '../src/level';
import {LevelObj} from '../src/interfaces';

import RG from '../src/rg';

type LevelArgs = [number, number, any];


/* Factory for creating levels by specifying their name. */
export class LevelFactory {

    public static levels: {[key: string]: (...args: any[]) => Level | LevelObj[]};

    public fact: any;
    public createFunc: {[key: string]: (...args: any[]) => Level | LevelObj[]};

    constructor(fact) {
        this.fact = fact;
        this.createFunc = {};
    }

    public addFunction(name: string, createFunc): void {
        this.createFunc[name] = createFunc;
    }

    public create(name, args: LevelArgs): Level | LevelObj[] {
        // Check if this is a default level
        if (LevelFactory.levels.hasOwnProperty(name)) {
            return LevelFactory.levels[name](...args);
        }
        else if (this.createFunc.hasOwnProperty(name)) {
            return this.createFunc[name](...args);
        }
        else if (this.fact) {
            return this.fact.createLevel(name, ...args);
        }
        else {
            RG.err('LevelFactory', 'create',
                'No factory/factory function given. Name: ' + name);
        }
        return null;
    }

}

LevelFactory.levels = {
    Capital: (...args) => new Capital(...args as LevelArgs).getLevel(),
    DwarvenCity: (...args) => new DwarvenCity(...args as LevelArgs).getLevel(),
    AbandonedFort: (...args) => new AbandonedFort(...args as LevelArgs).getLevel(),
    BlackTower: (...args) => new BlackTower(...args as LevelArgs).getLevels()
};

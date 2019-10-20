
import {AbandonedFort} from './abandoned-fort';
import {BlackTower} from './black-tower';
import {Capital} from './capital';
import {DwarvenCity} from './dwarven-city';
import {Level} from '../src/level';
import {LevelObj} from '../src/interfaces';

import RG from '../src/rg';

type LevelArgs = [number, number, any];

interface IFactory {
    createLevel(name: string, ...args: any[]): Level;
}

type CreateLevelFunc = (...args: any[]) => Level | LevelObj[];

/* Factory for creating levels by specifying their name. */
export class LevelFactory {

    public static levels: {[key: string]: CreateLevelFunc};

    public fact: IFactory;
    public createFunc: {[key: string]: CreateLevelFunc};

    constructor(fact: IFactory) {
        this.fact = fact;
        this.createFunc = {};
    }

    public addFunction(name: string, createFunc: CreateLevelFunc): void {
        this.createFunc[name] = createFunc;
    }

    /* Always returns an array of level (unless null), which contains nLevel and
     * level object together. */
    public create(name: string, args: LevelArgs): null | LevelObj[] {
        // Check if this is a default level
        if (LevelFactory.levels.hasOwnProperty(name)) {
            const levels = LevelFactory.levels[name](...args);
            if (Array.isArray(levels)) {
                return levels;
            }
            return [{level: levels, nLevel: 0}];
        }
        else if (this.createFunc.hasOwnProperty(name)) {
            const levels = this.createFunc[name](...args);
            if (Array.isArray(levels)) {
                return levels;
            }
            return [{level: levels, nLevel: 0}];

        }
        else if (this.fact) {
            const level = this.fact.createLevel(name, ...args);
            return [{level, nLevel: 0}];
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

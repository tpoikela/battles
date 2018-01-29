
import AbandonedFort from './abandoned-fort';
import Capital from './capital';
import DwarvenCity from './dwarven-city';

// const RG = require('../src/rg');

export default class LevelFactory {

    constructor(fact) {
      this.fact = fact;
    }

    create(name, args) {
        switch (name) {
            case 'Capital': return new Capital(...args).getLevel();
            case 'DwarvenCity': return new DwarvenCity(...args).getLevel();
            case 'AbandonedFort': return new AbandonedFort(...args).getLevel();
            default: return this.fact.createLevel(name, ...args);
            /* default: RG.err('LevelFactory', 'create',
                `No constructor found for ${name}`);*/
        }
        // return null;
    }

}


import AbandonedFort from './abandoned-fort';
import Capital from './capital';
import DwarvenCity from './dwarven-city';

const RG = require('../src/rg');

export default class LevelFactory {

    create(name, args) {
        switch (name) {
            case 'Capital': return new Capital(...args).getLevel();
            case 'DwarvenCity': return new DwarvenCity(...args).getLevel();
            case 'AbandonedFort': return new AbandonedFort(...args).getLevel();
            default: RG.err('LevelFactory', 'create',
                `No constructor found for ${name}`);
        }
        return null;
    }

}

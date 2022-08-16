

import {LevelSurroundings} from '../../../client/src/level-surroundings';
import {RGUnitTests} from '../../rg.unit-tests';

describe('LevelSurroundings', () => {

    it('surrounds the given level with elems based on surrounding cells', () => {
        let level = RGUnitTests.wrapIntoLevel([], 40, 40);
        const surround = new LevelSurroundings();
        const conf = {
            cellsAround: {
                S: 'wallmount', N: 'wallmount',
                W: 'wallmount', E: 'wallmount',
            }
        };

        level = surround.surround(level, conf);
        console.log('Final level:');
        level.debugPrintInASCII();

    });

    it('leaves a gap on the corner correctly', () => {
        let level = RGUnitTests.wrapIntoLevel([], 40, 40);
        const surround = new LevelSurroundings();
        const conf = {
            cellsAround: {
                S: 'wallmount', N: 'wallmount',
                W: 'wallmount', E: 'wallmount',
                SE: 'floor', NE: 'wallmount',
                SW: 'wallmount', NW: 'wallmount',
            }
        };

        level = surround.surround(level, conf);
        console.log('Final level:');
        level.debugPrintInASCII();

    });
});

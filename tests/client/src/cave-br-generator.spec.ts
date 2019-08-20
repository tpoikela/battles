
import { expect } from 'chai';
import {createCaveLevel} from '../../../client/src/generator';
import {Level} from '../../../client/src/level';

describe('createCaveLevel', function() {

    it('creates cave levels', () => {
        for (let i = 0; i < 5; i++) {
            const conf: any = {
                appendConnected: false,
                connectAll: true,
                numBranches: 20,
                connectedRatio: 0.10
            };
            const n = 2;
            const level: Level = createCaveLevel(n * 80, n * 80, conf);
            //level.debugPrintInASCII();
        }
    });
});

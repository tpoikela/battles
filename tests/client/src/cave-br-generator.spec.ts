
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {createCaveLevel} from '../../../client/src/cave-br-generator';
import {Level} from '../../../client/src/level';
import {Random} from '../../../client/src/random';

describe('createCaveLevel', function() {
    this.timeout(5000);

    it('creates cave levels', () => {
        for (let i = 0; i < 200; i++) {
            const conf: any = {
                connectAll: true,
                numBranches: 30,
                connectedRatio: 0.50
            };
            const n = 1;
            const level: Level = createCaveLevel(n * 120, n * 120, conf);
            // level.debugPrintInASCII();
        }
    });
});

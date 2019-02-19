
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {createCaveLevel} from '../../../client/src/cave-br-generator';
import {Level} from '../../../client/src/level';
import {Random} from '../../../client/src/random';

describe('createCaveLevel', function() {
    this.timeout(5000);

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
            level.debugPrintInASCII();
        }
    });
});

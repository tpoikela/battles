
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {createCaveLevel} from '../../../client/src/cave-br-generator';
import {Level} from '../../../client/src/level';


describe('createCaveLevel', () => {
    it('creates cave levels', () => {
        const conf: any = {
        };
        const n = 1;
        const level: Level = createCaveLevel(n * 150, n * 50, conf);
        level.debugPrintInASCII();
    });
});


import { expect } from 'chai';

import RG from '../../../client/src/rg';
import {Random} from '../../../client/src/random';
import {MountainGenerator} from '../../../client/src/mountain-generator';

describe('MountainGenerator', () => {
    it('generates mountain levels', () => {
        const gen = new MountainGenerator();
        const [cols, rows] = [80, 150];
        const conf = MountainGenerator.getFaceOptions();
        const level = gen.createFace(cols, rows, conf);
        expect(level).to.exist;
        // level.debugPrintInASCII();
    });


});

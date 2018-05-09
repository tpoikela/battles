
import { expect } from 'chai';

const RG = require('../../../client/src/battles');
RG.Random = require('../../../client/src/random');
const MountainGenerator = require('../../../client/src/mountain-generator');

describe('MountainGenerator', () => {
    it('generates mountain levels', () => {
        const gen = new MountainGenerator();
        const [cols, rows] = [80, 150];
        const conf = MountainGenerator.getFaceOptions();
        const level = gen.createFace(cols, rows, conf);
        expect(level).to.exist;
        level.debugPrintInASCII();
    });


});

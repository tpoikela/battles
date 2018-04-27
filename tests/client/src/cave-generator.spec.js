
import { expect } from 'chai';

const RG = require('../../../client/src/battles');
const {CaveGenerator} = require('../../../client/src/cave-generator');

describe('CaveGenerator', () => {
    it('it can generate cave level', () => {
        const caveGen = new CaveGenerator();
        const conf = {};
        const level = caveGen.create(100, 50, conf);
        expect(level).to.exist;
        level.debugPrintInASCII();
    });
});

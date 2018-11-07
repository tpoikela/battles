
import { expect } from 'chai';

const RG = require('../../../client/src/battles');
const CastleGenerator = require('../../../client/src/castle-generator');

describe('CastleGenerator', () => {

    let castleGen = null;

    beforeEach(() => {
        castleGen = new CastleGenerator();
    });

    it('can create castle levels with default config', () => {
        const conf = CastleGenerator.getOptions();
        const level = castleGen.create(80, 50, conf);
        expect(level).not.to.be.empty;

        const items = level.getItems();
        expect(items.length).to.be.above(5);
    });
});

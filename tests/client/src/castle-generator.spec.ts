
import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {CastleGenerator} from '../../../client/src/castle-generator';

describe('CastleGenerator', () => {

    let castleGen = null;

    beforeEach(() => {
        castleGen = new CastleGenerator();
    });

    it('can create castle levels with default config', () => {
        const conf = CastleGenerator.getOptions();
        const level = castleGen.create(80, 50, conf);
        expect(level).not.to.be.empty;

        const elements = level.getElements();
        expect(elements.length).to.be.above(0);

        const items = level.getItems();
        console.log(items);
        expect(items.length).to.be.above(4);

        expect(castleGen.nItemsAdded).to.be.above(2);
    });
});

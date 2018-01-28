
import { expect } from 'chai';

const RG = require('../../../client/src/battles');
const Path = require('../../../client/src/path');

describe('Path', () => {
    it('it computes passable paths', () => {
        const level = RG.FACT.createLevel('arena', 10, 10);
        const map = level.getMap();

        let path = Path.getShortestPassablePath(map, 1, 1, 9, 9);
        expect(path.length).to.be.above(5);

        path = Path.getShortestPassablePath(map, 0, 0, 9, 9);
        expect(path.length).to.equal(0);

    });
});

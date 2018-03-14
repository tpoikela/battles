
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

    it('has function to compute segmented path lengths', () => {
        const segments1 = RG.Path.getPathSeg(16, 4);
        expect(segments1).deep.to.equal([4, 4, 4, 4]);

        const segments2 = RG.Path.getPathSeg(15, 4);
        expect(segments2).deep.to.equal([3, 3, 3, 6]);

        const segments3 = RG.Path.getPathSeg(17, 4);
        expect(segments3).deep.to.equal([4, 4, 4, 5]);

    });

    it('has function to compute segmented paths', () => {
        const map = RG.FACT.createLevel('arena', 30, 30).getMap();
        const [x0, y0, x1, y1] = [1, 1, 10, 10];
        for (let i = 1; i < 10; i++) {
            const nSeg = i;
            const path = Path.getWeightPathSegmented(map, x0, y0, x1, y1, nSeg);
            expect(path.length).to.be.above(7);

            const lastCoord = path[path.length - 1];
            expect(lastCoord).deep.to.equal({x: 10, y: 10});
        }

    });

});

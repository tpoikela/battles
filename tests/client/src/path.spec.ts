
import { expect } from 'chai';

import RG from '../../../client/src/rg';
import {Path} from '../../../client/src/path';
import {FactoryLevel} from '../../../client/src/factory.level';
import {ELEM} from '../../../client/data/elem-constants';

describe('Path', () => {
    it('it computes shortest passable paths', () => {
        const factLevel = new FactoryLevel();
        const level = factLevel.createLevel('arena', 10, 10);
        const map = level.getMap();

        let path = Path.getShortestPassablePath(map, 1, 1, 9, 9);
        expect(path.length).to.be.above(5);

        path = Path.getShortestPassablePath(map, 0, 0, 9, 9);
        expect(path.length).to.equal(0);

    });

    it('has function to compute segmented path lengths', () => {
        const segments1 = Path.getPathSeg(16, 4);
        expect(segments1).to.deep.equal([4, 4, 4, 4]);

        const segments2 = Path.getPathSeg(15, 4);
        expect(segments2).to.deep.equal([3, 3, 3, 6]);

        const segments3 = Path.getPathSeg(17, 4);
        expect(segments3).to.deep.equal([4, 4, 4, 5]);

    });

    it('has function to compute segmented paths', () => {
        const factLevel = new FactoryLevel();
        const map = factLevel.createLevel('arena', 30, 30).getMap();
        const [x0, y0, x1, y1] = [1, 1, 10, 10];
        for (let i = 1; i < 10; i++) {
            const nSeg = i;
            const path = Path.getWeightPathSegmented(map, x0, y0, x1, y1, nSeg);
            expect(path.length).to.be.above(7);

            const lastCoord = path[path.length - 1];
            expect(lastCoord).to.deep.equal({x: 10, y: 10});
        }

    });

    it('works also with 3d terrain with gradients', function() {
        const factLevel = new FactoryLevel();
        const level = factLevel.createLevel('arena', 10, 10);
        const map = level.getMap();
        const elems = [
            ELEM.FLOOR, ELEM.CLIFF, ELEM.STONE, ELEM.STEEP_CLIFF, ELEM.STONE,
            ELEM.CLIFF, ELEM.FLOOR, ELEM.STEEP_CLIFF, ELEM.STONE, ELEM.CLIFF];
        for (let x = 1; x < 9; x++) {
            for (let y = 1; y < 8; y++) {
                if (x < 8) {
                    map.setBaseElemXY(x, y, elems[y]);
                }
            }
        }
        //dbg level.debugPrintInASCII();

        let path = [];

        path = Path.getShortestPassablePath(map, 1, 1, 9, 9);
        expect(path.length).to.be.above(5);

        path = Path.getShortestPassablePath(map, 1, 1, 1, 8);
        // console.log(path);
        expect(path.length).to.equal(15);

        const x0 = 7;
        const y0 = 3;
        const x1 = x0 + 1;
        path = Path.getShortestPassablePath(map, x0, y0, x1, y0);
        expect(path.length).to.equal(5);

        path = Path.getShortestActorPath(map, x0-1, y0, x1, y0);
        expect(path.length).to.equal(4);

        path = Path.getShortestActorPath(map, x0, y0, x1, y0);
        expect(path.length).to.equal(4);

    });


});

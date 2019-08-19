import { expect } from 'chai';
import {MapGenerator} from '../../../client/src/generator';
import {CellMap} from '../../../client/src/map';
import {Random} from '../../../client/src/random';

//---------------------------------------------------------------------------
// MAP GENERATOR
//---------------------------------------------------------------------------

describe('MapGenerator', () => {
    it('can generate forest levels with trees', () => {
        const mapgen = new MapGenerator();
        mapgen.setGen('digger', 20, 20);
        const rng = new Random();
        rng.setSeed(1234);
        const obj = mapgen.createForest({ratio: 0.5, rng});
        const map = obj.map;
        expect(map).to.be.an.instanceof(CellMap);
        // map.debugPrintInASCII();
    });

    it('can generate mountain levels with zig-zag paths', () => {
        const mapgen = new MapGenerator();
        mapgen.setGen('mountain', 50, 200);
        const conf = {
            chasmThr: -0.3,
            stoneThr: 0.4,
            highRockThr: 0.6,
            nRoadTurns: 6
        };

        for (let i = 0; i < 1; i++) {
            const obj = mapgen.createMountain(50, 200, conf);
            const map = obj.map;
            expect(map).to.be.an.instanceof(CellMap);
            expect(map.cols).to.equal(50);
            expect(map.rows).to.equal(200);

            const cells = map.getCells();
            const cell = cells[0];
            const baseElem = cell.getBaseElem();
            expect(baseElem.getType()).to.not.equal('');
        }

    });
});

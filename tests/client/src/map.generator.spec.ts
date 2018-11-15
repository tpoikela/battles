import { expect } from 'chai';
import RG from '../../../client/src/rg';
import {MapGenerator} from '../../../client/src/map.generator';

//---------------------------------------------------------------------------
// MAP GENERATOR
//---------------------------------------------------------------------------

describe('MapGenerator', () => {
    it('can generate forest levels with trees', () => {
        const mapgen = new MapGenerator();
        mapgen.setGen('digger', 20, 20);
        const obj = mapgen.createForest(0.5);
        const map = obj.map;
        expect(map).to.not.be.empty;
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
            expect(map).to.exist;
            expect(map.cols).to.equal(50);
            expect(map.rows).to.equal(200);

            const cells = map.getCells();
            const cell= cells[0];
            const baseElem = cell.getBaseElem();
            expect(baseElem.getType()).to.not.equal('');
        }

    });
});

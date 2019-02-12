
import {expect} from 'chai';
import RG from '../../../client/src/rg';
import {CellMap} from '../../../client/src/map';
import {Viewport} from '../../../client/gui/viewport';

describe('Viewport', () => {
    it('should have correct number of rows', () => {
        const map = new CellMap(10, 10);
        const viewport = new Viewport(2, 2);
        viewport.initCellsInViewPort(0, 0, map);

        let keys = Object.keys(viewport.coord);
        expect(keys).to.have.length(5);
        expect(keys).to.deep.equal(['0', '1', '2', '3', '4']);

        viewport.setViewportXY(3, 3);
        viewport.initCellsInViewPort(1, 1, map);
        keys = Object.keys(viewport.coord);
        expect(keys).to.have.length(7);
        expect(keys).to.deep.equal(['0', '1', '2', '3', '4', '5', '6']);

        viewport.setViewportXY(1, 1);
        viewport.initCellsInViewPort(9, 9, map);
        keys = Object.keys(viewport.coord);
        expect(keys).to.have.length(3);
        expect(keys).to.deep.equal(['7', '8', '9']);
    });
});

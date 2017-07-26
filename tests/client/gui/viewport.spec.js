
const expect = require('chai').expect;
const Viewport = require('../../../client/gui/viewport');

const RG = require('../../../client/src/battles');

const Map = RG.Map.CellList;

describe('Viewport', () => {
    it('should have correct number of rows', () => {
        const map = new Map(10, 10);
        const viewport = new Viewport(2, 2);
        viewport.getCellsInViewPort(0, 0, map);

        let keys = Object.keys(viewport.coord);
        expect(keys).to.have.length(5);
        expect(keys).to.deep.equal(['0', '1', '2', '3', '4']);

        viewport.setViewportXY(3, 3);
        viewport.getCellsInViewPort(1, 1, map);
        keys = Object.keys(viewport.coord);
        expect(keys).to.have.length(7);
        expect(keys).to.deep.equal(['0', '1', '2', '3', '4', '5', '6']);

        viewport.setViewportXY(1, 1);
        viewport.getCellsInViewPort(9, 9, map);
        keys = Object.keys(viewport.coord);
        expect(keys).to.have.length(3);
        expect(keys).to.deep.equal(['7', '8', '9']);
    });
});

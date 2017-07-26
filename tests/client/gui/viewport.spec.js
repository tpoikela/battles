
const expect = require('chai').expect;
const Viewport = require('../../../client/gui/viewport');

const RG = require('../../../client/src/battles');

const Map = RG.Map.CellList;

describe('Viewport', () => {
    it('should have correct number of rows', () => {
        const map = new Map(10, 10);
        const viewport = new Viewport(2, 2);
        viewport.getCellsInViewPort(0, 0, map);

        const keys = Object.keys(viewport.coord);
        expect(keys).to.have.length(5);
        expect(keys).to.deep.equal([0, 1, 2, 3, 4]);
    });
});


const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
RG.Geometry = require('../../../client/src/geometry');

describe('RG.Geometry', () => {

    let levels = null;
    let superLevel = null;

    beforeEach(() => {
        levels = [];
        for (let i = 0; i < 3; i++) {
            const level = RG.FACT.createLevel('arena', 10 + i, 10 + i);
            levels.push(level);
        }
        superLevel = RG.FACT.createLevel('empty', 40, 40);
    });

    it('can tile several levels into a super level', () => {
        const conf = {x: 2, y: 1, alignLeft: true};
        RG.Geometry.tileLevels(superLevel, levels, conf);

        const cellType = superLevel.getMap().getBaseElemXY(2, 1).getType();
        expect(cellType).to.equal('wall');

        const x2 = 1 + 10;
        const y2 = 1 + 10 + 10;
        const cellType2 = superLevel.getMap().getBaseElemXY(x2, y2).getType();
        superLevel.getMap().debugPrintInASCII();
        expect(cellType2).to.equal('wall');
    });

    it('can center the tiled levels.', () => {
        const conf = {x: 1, y: 1, centerX: true};
        RG.Geometry.tileLevels(superLevel, levels, conf);
        superLevel.getMap().debugPrintInASCII();
    });

    it('can generate "straight" paths for missiles', () => {
        const [x0, y0] = [0, 0];
        const [x1, y1] = [4, 4];
        let path = RG.Geometry.getMissilePath(x0, y0, x1, y1);
        expect(path).to.have.length(5);

        path = RG.Geometry.getMissilePath(x0, y0, x1, y1, false);
        expect(path).to.have.length(3);

        const [x, y] = [0, 0];
        const [xEnd, yEnd] = [2, 6];
        path = RG.Geometry.getMissilePath(x, y, xEnd, yEnd);

        expect(path).to.have.length(7);

        const [xx, yy] = [1, 7];
        const [xxEnd, yyEnd] = [8, 3];
        path = RG.Geometry.getMissilePath(xx, yy, xxEnd, yyEnd);
        expect(path).to.have.length(8 - 1 + 1);
    });
});

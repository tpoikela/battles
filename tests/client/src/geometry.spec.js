
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');
RG.Geometry = require('../../../client/src/geometry');

describe('RG.Geometry', () => {
    it('can tile several levels into a super level', () => {
        const levels = [];
        for (let i = 0; i < 3; i++) {
            const level = RG.FACT.createLevel('arena', 10 + i, 10 + i);
            levels.push(level);
        }

        const superLevel = RG.FACT.createLevel('empty', 40, 40);
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
});

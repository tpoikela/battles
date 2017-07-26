
const expect = require('chai').expect;
const RG = require('../../../client/src/battles');

describe('RG.Geometry', () => {
    describe('splitLevels()', () => {
        it('can split levels into two', () => {
            const l1 = RG.FACT.createLevel('arena', 20, 10);

            const actor1 = new RG.Actor.Rogue('rogue1');
            const actor2 = new RG.Actor.Rogue('rogue2');
            const actor3 = new RG.Actor.Rogue('rogue2');

            l1.addActor(actor1, 0, 0);
            l1.addActor(actor2, 19, 9);
            l1.addActor(actor3, 10, 9);

            const conf = {nLevelsX: 2, nLevelsY: 1};
            const levels = RG.Geometry.splitLevel(l1, conf);

            expect(levels).to.have.length(2);

            const subLevel1 = levels[0][0];
            const subLevel2 = levels[1][0];

            const map1 = subLevel1.getMap();
            const map2 = subLevel2.getMap();
            expect(map1.getCell(0, 0).getBaseElem().getType())
                .to.equal('wall');
            expect(map2.getCell(9, 9).getBaseElem().getType())
                .to.equal('wall');
        });
    });
});

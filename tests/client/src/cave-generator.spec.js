
import { expect } from 'chai';

//  const RG = require('../../../client/src/battles');
const {CaveGenerator} = require('../../../client/src/cave-generator');

describe('CaveGenerator', () => {
    it('can generate simple cave levels', () => {
        const caveGen = new CaveGenerator();
        const conf = {dungeonType: 'Cave', isCollapsed: false};
        const level = caveGen.create(100, 50, conf);
        expect(level).to.exist;

        const cells = level.getMap().getCells(c => (
            (/floor/).test(c.getBaseElem().getType())
        ));
        expect(cells.length).to.be.at.least(50);
    });


    it('it can generate collapsed cave level', () => {
        const caveGen = new CaveGenerator();
        const conf = {
            dungeonType: 'Lair', isCollapsed: true
        };
        const level = caveGen.create(100, 50, conf);
        expect(level).to.exist;
        level.debugPrintInASCII();
    });
});

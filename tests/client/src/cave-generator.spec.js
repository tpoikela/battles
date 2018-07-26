
import { expect } from 'chai';

//  const RG = require('../../../client/src/battles');
const {CaveGenerator} = require('../../../client/src/cave-generator');

describe('CaveGenerator', () => {
    it('can create Cave-like levels', () => {
        const caveGen = new CaveGenerator();
        const level = caveGen.create(80, 50, {dungeonType: 'Cave'});
        expect(level).to.exist;
    });

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

    it('can create Lair-like levels', () => {
        for (let i = 0; i < 1; i++) {
            const caveGen = new CaveGenerator();
            const level = caveGen.create(100, 50,
                {dungeonType: 'Lair', isCollapsed: true});
            expect(level).to.exist;

            const extras = level.getExtras();
            expect(extras).to.have.property('startPoint');
            expect(extras).to.have.property('endPoint');
        }
    });

    it('can create Cavern-like levels', () => {
        for (let i = 0; i < 1; i++) {
            const caveGen = new CaveGenerator();
            const level = caveGen.create(150, 80,
                {dungeonType: 'Cavern', isCollapsed: false});
            expect(level).to.exist;

            const extras = level.getExtras();
            expect(extras).to.have.property('startPoint');
            expect(extras).to.have.property('endPoint');
        }
    });


    it('it can generate collapsed cave level', () => {
        const caveGen = new CaveGenerator();
        const conf = {
            dungeonType: 'Lair', isCollapsed: true
        };
        const level = caveGen.create(100, 50, conf);
        expect(level).to.exist;
        // level.debugPrintInASCII();
    });
});
